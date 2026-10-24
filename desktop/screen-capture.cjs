// A one-use, short-lived source selection; getDisplayMedia never picks a source implicitly.
function createScreenCapture({desktopCapturer,getWindow,platform=process.platform,expectedUrl}){
  let known=new Set(),pending=null;
  const localFrame=frame=>{const w=getWindow();return !!w&&!w.isDestroyed()&&frame===w.webContents.mainFrame&&(!expectedUrl||frame.url.split('#')[0]===expectedUrl);};
  async function list(){pending=null;const sources=await desktopCapturer.getSources({types:['screen','window'],thumbnailSize:{width:0,height:0},fetchWindowIcons:false});known=new Set(sources.map(s=>s.id));return sources.map(s=>({id:s.id,name:s.name,kind:s.id.startsWith('screen:')?'screen':'window'}));}
  function select(id,systemAudio){pending=null;if(typeof id!=='string'||!known.has(id))throw Error('Actualiza y selecciona una pantalla o ventana válida');if(typeof systemAudio!=='boolean')throw Error('Opción de audio no válida');if(systemAudio&&platform!=='win32')throw Error('El audio del sistema requiere Windows');pending={id,systemAudio,expires:Date.now()+30000};}
  function permitted(frame){return localFrame(frame)&&!!pending&&pending.expires>Date.now();}
  async function handle(request,callback){const selection=pending;pending=null;if(!localFrame(request.frame)||!request.videoRequested||!selection||selection.expires<Date.now()){callback(null);return;}try{const sources=await desktopCapturer.getSources({types:['screen','window'],thumbnailSize:{width:0,height:0},fetchWindowIcons:false});const source=sources.find(s=>s.id===selection.id);if(!source||!localFrame(request.frame)){callback(null);return;}callback({video:source,...(selection.systemAudio&&request.audioRequested?{audio:'loopback'}:{})});}catch{callback(null);}}
  function cancel(){pending=null;}
  return {list,select,permitted,handle,cancel};
}
module.exports={createScreenCapture};
