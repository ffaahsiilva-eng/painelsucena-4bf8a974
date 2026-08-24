const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApp", {
  isElectron: true,
  reloadToLatest: () => ipcRenderer.invoke("desktop:reload-latest"),
  listScreenSources: () => ipcRenderer.invoke("desktop:list-screen-sources"),
});