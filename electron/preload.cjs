const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  printReceipt: (payload) => ipcRenderer.invoke("print-receipt", payload),
  printHTML: (html, options) => ipcRenderer.invoke("print-html", { html, options }),
  getPrinters: () => ipcRenderer.invoke("get-printers"),
});
