const { ipcRenderer } = require("electron");

document.getElementById("select-files").addEventListener("click", async () => {
  const filePaths = await ipcRenderer.invoke("select-files");
  document.getElementById("file-list").textContent = filePaths.join("\n");
});

document.getElementById("process-files").addEventListener("click", async () => {
  const filePaths = document.getElementById("file-list").textContent.split("\n");
  const saveToOriginalDir = document.getElementById("save-original-directory").checked;

  if (filePaths.length > 0 && filePaths[0]) {
    ipcRenderer.invoke("process-pdfs", filePaths, saveToOriginalDir);
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
