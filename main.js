const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");
const ILovePDFApi = require("@ilovepdf/ilovepdf-nodejs");
const ILovePDFFile = require("@ilovepdf/ilovepdf-nodejs/ILovePDFFile");

// Load environment variables from .env file
require("dotenv").config();

const instance = new ILovePDFApi(process.env.ILOVEPDF_PROJECT_PUBLIC_KEY, process.env.ILOVEPDF_SECRET_KEY);

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

ipcMain.handle("process-pdfs", async (event, filePaths, saveToOriginalDir, outputFolder) => {
  try {
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
      const filePath = saveToOriginalDir ? filePaths[0] : path.join(outputFolder, path.basename(filePaths[0]));
      await savePDFFile(arrayBuffer, filePath);
    } else {
      await savePDFFiles(arrayBuffer, filePaths, outputFolder, event);
    }

    event.sender.send("processing-complete");
  } catch (error) {
    console.error("Error processing the PDF files:", error);
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
  const totalFiles = filePaths.length;

  zip.getEntries().forEach((entry) => {
    if (entry.entryName.endsWith(".pdf")) {
      const originalFilePath = filePaths[i];
      const fileName = path.basename(originalFilePath); // Extract only the file name
      const filePath = outputFolder ? path.join(outputFolder, fileName) : originalFilePath;
      fs.writeFileSync(filePath, entry.getData());

      i++;
      const progress = Math.floor((i / totalFiles) * 100);
      event.sender.send("progress-update", progress);
    }
  });
}
