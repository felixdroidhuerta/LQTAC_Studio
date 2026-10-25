const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('captureControls',{
  action:(action,value)=>ipcRenderer.invoke('capture-toolbox-action',action,value),
  onState:listener=>ipcRenderer.on('capture-toolbox-state',(_event,state)=>listener(state))
});
