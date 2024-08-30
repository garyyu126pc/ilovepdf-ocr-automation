const { ipcRenderer } = require("electron");

// Initialize an empty array to store file paths
let filePaths = [];

document.addEventListener("DOMContentLoaded", async () => {
  const { publicKey, secretKey } = await ipcRenderer.invoke("get-keys");
  if (publicKey) document.getElementById("public-key").value = publicKey;
  if (secretKey) document.getElementById("secret-key").value = secretKey;
});

document.getElementById("select-files").addEventListener("click", async () => {
  const newFilePaths = await ipcRenderer.invoke("select-files");

  // Append new file paths to the existing array
  filePaths = [...filePaths, ...newFilePaths];

  // Update the UI to show all selected files
  document.getElementById("file-list").textContent = filePaths.join("\n");
});

document.getElementById("save-original-directory").addEventListener("change", () => {
  const isChecked = document.getElementById("save-original-directory").checked;
  const outputFolderButton = document.getElementById("select-output-folder");
  const outputFolderPath = document.getElementById("output-folder-path");

  if (isChecked) {
    outputFolderButton.style.display = "none";
    outputFolderPath.textContent = "";
  } else {
    outputFolderButton.style.display = "block";
  }
});

document.getElementById("select-output-folder").addEventListener("click", async () => {
  const outputFolder = await ipcRenderer.invoke("select-output-folder");
  document.getElementById("output-folder-path").textContent = outputFolder;
});

document.getElementById("process-files").addEventListener("click", async () => {
  const saveToOriginalDir = document.getElementById("save-original-directory").checked;
  const outputFolder = document.getElementById("output-folder-path").textContent;

  const publicKey = document.getElementById("public-key").value;
  const secretKey = document.getElementById("secret-key").value;

  // Save the keys in production mode
  await ipcRenderer.invoke("save-keys", publicKey, secretKey);

  // Validate API keys before proceeding
  const validationResponse = await ipcRenderer.invoke("validate-keys", publicKey, secretKey);
  if (!validationResponse.valid) {
    alert("Invalid API keys: " + validationResponse.error);
    return;
  }

  if (filePaths.length > 0) {
    ipcRenderer.invoke("process-pdfs", filePaths, saveToOriginalDir, outputFolder, publicKey, secretKey);
  } else {
    alert("Please select PDF files to process.");
  }
});

ipcRenderer.on("progress-update", (event, progress) => {
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  progressBar.value = progress;
  progressText.textContent = `Progress: ${progress}%`;
});

ipcRenderer.on("processing-complete", () => {
  alert("Processing complete!");
  document.getElementById("progress-bar").value = 0;
  document.getElementById("progress-text").textContent = "Progress: 0%";
});
