const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('lqtacDesktop', {
  pathForFile: (file) => webUtils.getPathForFile(file),
  openVegasProject: () => ipcRenderer.invoke('open-vegas-project'),
  openMedia: () => ipcRenderer.invoke('open-media'),
  readFileText: (filePath) => ipcRenderer.invoke('read-file-text', filePath),
  getDemoMedia: () => ipcRenderer.invoke('get-demo-media'),
  mediaFileUrl: (filePath) => ipcRenderer.invoke('media-file-url', filePath),
  mediaDuration: (filePath) => ipcRenderer.invoke('media-duration', filePath)
});
