const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");
const ILovePDFApi = require("@ilovepdf/ilovepdf-nodejs");
const ILovePDFFile = require("@ilovepdf/ilovepdf-nodejs/ILovePDFFile");
const Store = require("electron-store");

// Initialize electron-store
const store = new Store();

// Load environment variables in development
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    webPreferences: {
      preload: path.join(__dirname, "renderer.js"),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("index.html");
}

app.whenReady().then(createWindow);

// Fetch API keys
ipcMain.handle("get-keys", () => {
  const publicKey = process.env.ILOVEPDF_PROJECT_PUBLIC_KEY || store.get("publicKey", "");
  const secretKey = process.env.ILOVEPDF_SECRET_KEY || store.get("secretKey", "");
  return { publicKey, secretKey };
});

// Save API keys
ipcMain.handle("save-keys", (event, publicKey, secretKey) => {
  store.set("publicKey", publicKey);
  store.set("secretKey", secretKey);
});

// File selection dialog
ipcMain.handle("select-files", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
  });
  return canceled ? [] : filePaths;
});

// Output folder selection dialog
ipcMain.handle("select-output-folder", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  return canceled ? "" : filePaths[0];
});

// Validate API keys
ipcMain.handle("validate-keys", async (event, publicKey, secretKey) => {
  try {
    const instance = new ILovePDFApi(publicKey, secretKey);
    await instance.newTask("pdfocr");
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

// Process PDF files
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

    if (!saveToOriginalDir && !fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder);
    }

    if (filePaths.length === 1) {
      await savePDFFile(
        arrayBuffer,
        saveToOriginalDir ? filePaths[0] : path.join(outputFolder, path.basename(filePaths[0]))
      );
    } else {
      await savePDFFiles(arrayBuffer, filePaths, saveToOriginalDir ? null : outputFolder, event);
    }

    event.sender.send("processing-complete");
  } catch (error) {
    event.sender.send("hide-progress-overlay");
    dialog.showMessageBox({
      type: "error",
      title: "Processing Error",
      message: `An error occurred while processing the PDF files.\n\nError: ${error.message}`,
    });
    throw error;
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

  zip.getEntries().forEach((entry) => {
    if (entry.entryName.endsWith(".pdf")) {
      const filePath = outputFolder ? path.join(outputFolder, path.basename(filePaths[i])) : filePaths[i];
      fs.writeFileSync(filePath, entry.getData());

      i++;
      const progress = Math.floor((i / filePaths.length) * 100);
      event.sender.send("progress-update", progress);
    }
  });
}
