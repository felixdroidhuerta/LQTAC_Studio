const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('lqtacDesktop', {
  saveProject: (data,saveAs=false) => ipcRenderer.invoke('save-lqts',data,saveAs),
  openProject: () => ipcRenderer.invoke('open-lqts'),
  renderStart: options => ipcRenderer.invoke('render-start',options),
  renderFrame: base64 => ipcRenderer.invoke('render-frame',base64),
  renderFinish: () => ipcRenderer.invoke('render-finish'),
  renderCancel: () => ipcRenderer.invoke('render-cancel'),
  onRenderProgress: listener => { const handler=(_event,value)=>listener(value);ipcRenderer.on('render-progress',handler);return ()=>ipcRenderer.removeListener('render-progress',handler); },
  pathForFile: (file) => webUtils.getPathForFile(file),
  saveTransitionMask: (dataUrl) => ipcRenderer.invoke('save-transition-mask', dataUrl),
  openVegasProject: () => ipcRenderer.invoke('open-vegas-project'),
  openMedia: () => ipcRenderer.invoke('open-media'),
  openTransitionMask: () => ipcRenderer.invoke('open-transition-mask'),
  readFileText: (filePath) => ipcRenderer.invoke('read-file-text', filePath),
  getDemoMedia: () => ipcRenderer.invoke('get-demo-media'),
  mediaFileUrl: (filePath) => ipcRenderer.invoke('media-file-url', filePath),
  mediaDuration: (filePath) => ipcRenderer.invoke('media-duration', filePath)
});
