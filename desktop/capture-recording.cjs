// One capture session can own a screen take and a synchronized, silent camera take.
// Keep completed paths across a partial save failure: retry never overwrites a take.
const path=require('node:path'),{createCameraRecording}=require('./camera-recording.cjs');
const primary=createCameraRecording(),camera=createCameraRecording();let group=null;
function get(id){if(!group||group.id!==id)throw Error('La captura no está activa');return group;}
const cameraPath=file=>path.join(path.dirname(file),path.basename(file,'.webm')+'_camara.webm');
async function start(file,separate=false){
  if(group)throw Error('Hay una captura pendiente');
  try{const main=await primary.start(file);group={...main,separate};
    if(separate){const second=await camera.start(cameraPath(file));group.cameraId=second.id;group.cameraFilePath=second.filePath;}
    return {...group};
  }catch(e){await Promise.all([primary.abort(),camera.abort()]);group=null;throw e;}
}
function append(id,data){if(group?.cameraId===id)return camera.append(id,data);get(id);return primary.append(id,data);}
async function finish(id,newPath){
  const g=get(id);if(g.saving)throw Error('La captura ya se está guardando');g.saving=true;
  try{
    if(!g.mainSaved)g.mainSaved=await primary.finish(g.id,newPath);
    if(g.separate&&!g.cameraSaved)g.cameraSaved=await camera.finish(g.cameraId,newPath?cameraPath(newPath):undefined);
    const result={...g.mainSaved,...(g.cameraSaved?{camera:g.cameraSaved}:{})};group=null;return result;
  }catch(e){throw Error(e.message+(g.mainSaved?' · Pantalla ya guardada en '+g.mainSaved.filePath+'. La cámara sigue pendiente.':''));}
  finally{g.saving=false;}
}
async function abort(id){if(id)get(id);await Promise.all([primary.abort(),camera.abort()]);group=null;}
module.exports={active:()=>!!group||primary.active()||camera.active(),start,append,finish,abort};
