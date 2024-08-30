const { app, ipcMain, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const chai = require("chai");
const { expect } = chai;
const { exec } = require("child_process");

describe("PDF OCR Processing Tests", function () {
  this.timeout(60000); // Set timeout to 60 seconds

  let win;

  before(async () => {
    await app.whenReady();
    win = new BrowserWindow({
      show: false, // Hide the window during testing
      webPreferences: {
        preload: path.join(__dirname, "renderer.js"),
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    await win.loadFile("index.html");
  });

  after(async () => {
    await app.quit();
  });

  function testFilePath(fileName) {
    return path.join(__dirname, fileName);
  }

  async function processPDFs(filePaths, saveToOriginalDir, outputFolder) {
    const publicKey = process.env.ILOVEPDF_PROJECT_PUBLIC_KEY;
    const secretKey = process.env.ILOVEPDF_SECRET_KEY;

    // Simulate processing PDFs through IPC
    await win.webContents.send("process-pdfs", filePaths, saveToOriginalDir, outputFolder, publicKey, secretKey);

    return new Promise((resolve, reject) => {
      ipcMain.once("processing-complete", () => {
        resolve(true);
      });

      ipcMain.once("processing-error", (event, error) => {
        reject(new Error(error));
      });
    });
  }

  it("should process a single PDF file and save it in its original file path", async () => {
    const filePath = testFilePath("NOOCRA.pdf");
    await processPDFs([filePath], true, "");

    expect(fs.existsSync(filePath)).to.be.true;
  });

  it("should process a single PDF file and save it in the given file path", async () => {
    const filePath = testFilePath("NOOCRA.pdf");
    const outputFolder = testFilePath("output");
    await processPDFs([filePath], false, outputFolder);

    const outputFilePath = path.join(outputFolder, path.basename(filePath));
    expect(fs.existsSync(outputFilePath)).to.be.true;
  });

  it("should process two PDF files and save them in their original file paths", async () => {
    const filePaths = [testFilePath("NOOCRA.pdf"), testFilePath("NOOCRB.pdf")];
    await processPDFs(filePaths, true, "");

    filePaths.forEach((filePath) => {
      expect(fs.existsSync(filePath)).to.be.true;
    });
  });

  it("should process two PDF files and save them in the given file path", async () => {
    const filePaths = [testFilePath("NOOCRA.pdf"), testFilePath("NOOCRB.pdf")];
    const outputFolder = testFilePath("output");
    await processPDFs(filePaths, false, outputFolder);

    filePaths.forEach((filePath) => {
      const outputFilePath = path.join(outputFolder, path.basename(filePath));
      expect(fs.existsSync(outputFilePath)).to.be.true;
    });
  });
});
