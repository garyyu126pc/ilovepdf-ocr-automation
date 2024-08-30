const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");
const ILovePDFApi = require("@ilovepdf/ilovepdf-nodejs");
const ILovePDFFile = require("@ilovepdf/ilovepdf-nodejs/ILovePDFFile");

const instance = new ILovePDFApi(
  "project_public_fcfc07ee61f5a1f15f91f73ec3b1dbc4_hrBYsc7035487740aa05ec5c30cc26d4854cb",
  "secret_key_df9f993612c93c58904a5951fd66459e_Yx6laa2c1f059e7adf2e637e3852d7a75dc59"
);

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

ipcMain.handle("process-pdfs", async (event, filePaths, saveToOriginalDir) => {
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

    const outputFolder = saveToOriginalDir ? null : path.join(__dirname, "output");
    if (!saveToOriginalDir && !fs.existsSync(outputFolder)) {
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
      const filePath = outputFolder ? path.join(outputFolder, entry.entryName) : filePaths[i];
      fs.writeFileSync(filePath, entry.getData());

      i++;
      const progress = Math.floor((i / totalFiles) * 100);
      event.sender.send("progress-update", progress);
    }
  });
}
