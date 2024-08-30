const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");
const ILovePDFApi = require("@ilovepdf/ilovepdf-nodejs");
const ILovePDFFile = require("@ilovepdf/ilovepdf-nodejs/ILovePDFFile");
const Store = require("electron-store");

// Load environment variables from .env in development
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const store = new Store();

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "renderer.js"),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("index.html");
}

app.whenReady().then(createWindow);

// Function to get API keys, either from .env (development) or Store (production)
ipcMain.handle("get-keys", () => {
  const publicKey = process.env.ILOVEPDF_PROJECT_PUBLIC_KEY || store.get("publicKey", "");
  const secretKey = process.env.ILOVEPDF_SECRET_KEY || store.get("secretKey", "");
  return { publicKey, secretKey };
});

// Function to save API keys in production mode
ipcMain.handle("save-keys", (event, publicKey, secretKey) => {
  if (process.env.NODE_ENV === "production") {
    store.set("publicKey", publicKey);
    store.set("secretKey", secretKey);
  }
});

ipcMain.handle("select-files", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
  });

  if (canceled) {
    return [];
  } else {
    return filePaths;
  }
});

ipcMain.handle("select-output-folder", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  if (canceled) {
    return "";
  } else {
    return filePaths[0];
  }
});

ipcMain.handle("validate-keys", async (event, publicKey, secretKey) => {
  try {
    const instance = new ILovePDFApi(publicKey, secretKey);
    await instance.newTask("pdfocr"); // Attempt to create a new task
    return { valid: true };
  } catch (error) {
    dialog.showMessageBox({
      type: "error",
      title: "Invalid API Keys",
      message: `The API keys you entered are invalid. Please check your keys and try again.\n\nError: ${error.message}`,
    });
    return { valid: false, error: error.message };
  }
});

ipcMain.handle("process-pdfs", async (event, filePaths, saveToOriginalDir, outputFolder, publicKey, secretKey) => {
  try {
    const instance = new ILovePDFApi(publicKey, secretKey);
    const task = instance.newTask("pdfocr");
    await task.start();

    const totalFiles = filePaths.length;
    let processedFiles = 0;

    for (const filePath of filePaths) {
      await task.addFile(new ILovePDFFile(filePath));
      processedFiles++;
      const progress = Math.floor((processedFiles / totalFiles) * 100);
      event.sender.send("progress-update", progress);
    }

    await task.process();
    const arrayBuffer = await task.download();

    if (saveToOriginalDir) {
      outputFolder = null;
    } else if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder);
    }

    if (filePaths.length === 1) {
      const originalFilePath = filePaths[0];
      const fileName = path.basename(originalFilePath);
      const filePath = saveToOriginalDir ? originalFilePath : path.join(outputFolder, fileName);
      await savePDFFile(arrayBuffer, filePath);
    } else {
      await savePDFFiles(arrayBuffer, filePaths, outputFolder, event);
    }

    event.sender.send("processing-complete");
  } catch (error) {
    if (error.response && error.response.status === 400) {
      // Specific handling for API-related errors
      dialog.showMessageBox({
        type: "error",
        title: "PDF Processing Error",
        message: `There was an issue processing your request. This is likely due to an issue on the ILovePDF API side. Please try again later.`,
      });
    } else {
      dialog.showMessageBox({
        type: "error",
        title: "Processing Error",
        message: `An error occurred while processing the PDF files.\n\nError: ${error.message}`,
      });
    }
    throw error; // Re-throw the error to ensure it’s logged or handled further if necessary
  }
});

async function savePDFFile(arrayBuffer, filePath) {
  const buffer = Buffer.from(arrayBuffer);
  await fs.promises.writeFile(filePath, buffer);
}

async function savePDFFiles(arrayBuffer, filePaths, outputFolder, event) {
  const buffer = Buffer.from(arrayBuffer);
  const zip = new AdmZip(buffer);
  let i = 0;
  const totalFiles = filePaths.length;

  zip.getEntries().forEach((entry) => {
    if (entry.entryName.endsWith(".pdf")) {
      const originalFilePath = filePaths[i];
      const fileName = path.basename(originalFilePath);
      const filePath = outputFolder ? path.join(outputFolder, fileName) : originalFilePath;
      fs.writeFileSync(filePath, entry.getData());

      i++;
      const progress = Math.floor((i / totalFiles) * 100);
      event.sender.send("progress-update", progress);
    }
  });
}
