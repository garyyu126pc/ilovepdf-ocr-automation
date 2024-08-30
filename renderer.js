const { ipcRenderer } = require("electron");

document.getElementById("select-files").addEventListener("click", async () => {
  const filePaths = await ipcRenderer.invoke("select-files");
  document.getElementById("file-list").textContent = filePaths.join("\n");
});

document.getElementById("process-files").addEventListener("click", async () => {
  const filePaths = document.getElementById("file-list").textContent.split("\n");
  const saveToOriginalDir = document.getElementById("save-original-directory").checked;

  if (filePaths.length > 0 && filePaths[0]) {
    const message = await ipcRenderer.invoke("process-pdfs", filePaths, saveToOriginalDir);
    alert(message);
  } else {
    alert("Please select PDF files to process.");
  }
});
