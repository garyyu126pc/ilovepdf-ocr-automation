const { ipcRenderer } = require("electron");

let filePaths = [];

document.addEventListener("DOMContentLoaded", async () => {
  const { publicKey, secretKey } = await ipcRenderer.invoke("get-keys");
  if (publicKey) document.getElementById("public-key").value = publicKey;
  if (secretKey) document.getElementById("secret-key").value = secretKey;
});

document.getElementById("select-files").addEventListener("click", async () => {
  const newFilePaths = await ipcRenderer.invoke("select-files");
  filePaths = [...filePaths, ...newFilePaths];
  updateFileListUI();
});

document.getElementById("clear-all").addEventListener("click", () => {
  filePaths = [];
  updateFileListUI();
});

document.getElementById("save-original-directory").addEventListener("change", () => {
  const isChecked = document.getElementById("save-original-directory").checked;
  document.getElementById("select-output-folder").style.display = isChecked ? "none" : "block";
  document.getElementById("output-folder-path").textContent = "";
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

  await ipcRenderer.invoke("save-keys", publicKey, secretKey);

  const validationResponse = await ipcRenderer.invoke("validate-keys", publicKey, secretKey);
  if (!validationResponse.valid) {
    alert("Invalid API keys: " + validationResponse.error);
    return;
  }

  if (filePaths.length > 0) {
    document.getElementById("progress-overlay").style.display = "block";
    ipcRenderer.invoke("process-pdfs", filePaths, saveToOriginalDir, outputFolder, publicKey, secretKey);
  } else {
    alert("Please select PDF files to process.");
  }
});

ipcRenderer.on("progress-update", (event, progress) => {
  document.getElementById("progress-bar").value = progress;
  document.getElementById("progress-text").textContent = `Progress: ${progress}%`;
});

ipcRenderer.on("processing-complete", () => {
  alert("Processing complete!");
  resetProgressUI();
});

ipcRenderer.on("hide-progress-overlay", resetProgressUI);

function updateFileListUI() {
  const fileListElement = document.getElementById("file-list");
  fileListElement.innerHTML = "";

  filePaths.forEach((filePath, index) => {
    const fileDiv = document.createElement("div");
    fileDiv.classList.add("file-item");

    const fileNameSpan = document.createElement("span");
    fileNameSpan.textContent = filePath;

    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.classList.add("remove-button");
    removeButton.addEventListener("click", () => {
      filePaths.splice(index, 1);
      updateFileListUI();
    });

    fileDiv.appendChild(fileNameSpan);
    fileDiv.appendChild(removeButton);
    fileListElement.appendChild(fileDiv);
  });
}

function resetProgressUI() {
  document.getElementById("progress-overlay").style.display = "none";
  document.getElementById("progress-bar").value = 0;
  document.getElementById("progress-text").textContent = "Progress: 0%";
}
