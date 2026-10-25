const {BrowserWindow,ipcMain,screen}=require('electron');
const path=require('node:path');

// An independent window stays visible even when the editor is minimized.
function createCaptureToolbox(getEditor){
  let window=null,state=null;
  const live=()=>window&&!window.isDestroyed();
  const editor=()=>{const w=getEditor();return w&&!w.isDestroyed()?w:null;};
  function send(){if(live()&&!window.webContents.isLoading()){
    const area=screen.getDisplayMatching(window.getBounds()).workArea;
    const height=Math.max(420,Math.min(state?.cameraAvailable?720:490,area.height-30));
    if(window.getBounds().height!==height)window.setSize(360,height);
    window.webContents.send('capture-toolbox-state',state);
  }}
  async function show(value){
    state=value;
    if(live()){send();window.showInactive();return;}
    const area=screen.getPrimaryDisplay().workArea;
    window=new BrowserWindow({width:360,height:490,x:area.x+area.width-380,y:area.y+20,
      minWidth:360,minHeight:420,resizable:false,frame:false,show:false,alwaysOnTop:true,skipTaskbar:true,
      title:'LQTAC · Captura',backgroundColor:'#07162c',icon:path.join(__dirname,'assets','lqtac-studio.ico'),
      webPreferences:{preload:path.join(__dirname,'capture-toolbox-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
    window.setContentProtection(true);
    window.setAlwaysOnTop(true,'screen-saver');
    window.setMenu(null);
    window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    window.webContents.on('will-navigate',event=>event.preventDefault());
    function returnToEditor(){const w=editor();if(w){w.restore();w.show();w.focus();w.webContents.send('capture-toolbox-command',{action:'return'});}}
    window.on('close',event=>{event.preventDefault();returnToEditor();});
    window.on('closed',()=>{window=null;});
    await window.loadFile(path.join(__dirname,'capture-toolbox.html'));
    send();window.showInactive();
  }
  function close(){state=null;if(live()){window.removeAllListeners('close');window.destroy();}window=null;}
  ipcMain.handle('capture-toolbox-action',(event,action,value)=>{
    if(!live()||event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)throw Error('Origen de Toolbox no permitido');
    if(!['record','stop','pause','snapshot','microphone','system','camera','position','size','return'].includes(action))throw Error('Control no permitido');
    if(['microphone','system','camera'].includes(action)&&typeof value!=='boolean')throw Error('Estado no válido');
    if(action==='position'&&!['top-left','top-center','top-right','center-left','center-center','center-right','bottom-left','bottom-center','bottom-right'].includes(value))throw Error('Posición no válida');
    if(action==='size'&&(!Number.isFinite(value)||value<15||value>40))throw Error('Tamaño no válido');
    const w=editor();if(!w)return;
    if(action==='return'){w.restore();w.show();w.focus();}
    w.webContents.send('capture-toolbox-command',{action,value});
  });
  return {show,update(value){state=value;send();},close,window:()=>live()?window:null};
}
module.exports={createCaptureToolbox};
