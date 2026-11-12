// Motion tracking: FFmpeg decodes the clip between the chosen start and end (clip-local seconds, clip speed applied) to grey 15 fps frames; a worker thread
// runs tracking-core and returns normalised centre positions in clip-local seconds.
const path=require('node:path'),fs=require('node:fs/promises'),{spawn}=require('node:child_process');
const FPS=15,children=new Set();let epoch=0;
function cancel(){epoch++;for(const c of children)c.terminate?void c.terminate():c.kill();}
function check(o){const n=v=>Number.isFinite(v);if(!o||typeof o.filePath!=='string'||!path.isAbsolute(o.filePath)||!n(o.offset)||o.offset<0||!n(o.duration)||o.duration<=0||o.duration>14400||!n(o.rate)||o.rate<.25||o.rate>4||!n(o.start)||o.start<0||o.start>=o.duration||o.end!==undefined&&(!n(o.end)||o.end<=o.start+.05||o.end>o.duration+1e-6)||!o.box||!['x','y','w','h'].every(k=>n(o.box[k])&&o.box[k]>=0&&o.box[k]<=1)||o.box.w<.005||o.box.h<.005)throw Error('Datos de seguimiento no válidos');return o;}
async function size(filePath,version){
  return new Promise((resolve,reject)=>{const child=spawn(require('./render-engine.cjs').ffmpegPath(),['-hide_banner','-i',filePath],{windowsHide:true,stdio:['ignore','ignore','pipe']});children.add(child);let text='';child.stderr.on('data',d=>text+=d);child.once('error',reject);
    child.once('close',()=>{children.delete(child);if(version!==epoch)return reject(Error('Seguimiento cancelado'));const m=text.match(/Video:.*?(\d{2,5})x(\d{2,5})/);if(!m)return reject(Error('El medio no tiene vídeo'));const r=text.match(/rotate\s*:\s*(-?\d+)/);let w=+m[1],h=+m[2];if(r&&Math.abs(+r[1])%180===90)[w,h]=[h,w];resolve({w,h});});});
}
async function track(options,progress=()=>{}){
  const o=check(options),version=epoch;await fs.access(o.filePath);const src=await size(o.filePath,version);
  let W=480,H=Math.max(2,Math.round(480*src.h/src.w/2)*2);if(H>480){H=480;W=Math.max(2,Math.round(480*src.w/src.h/2)*2);}
  const span=(o.end??o.duration)-o.start,total=Math.max(1,Math.ceil(span*FPS));
  const {Worker}=require('node:worker_threads'),worker=new Worker(`const {parentPort,workerData:w}=require('node:worker_threads');const t=require(w.core).createTracker(w.W,w.H,w.box);let i=0;const out=[];
    parentPort.on('message',m=>{if(m.done){parentPort.postMessage({points:out});return;}const f=new Uint8Array(m.frame);const p=i===0?t.start(f):t.next(f);out.push({time:+(w.start+i/w.fps).toFixed(4),x:+p.x.toFixed(5),y:+p.y.toFixed(5),score:+p.score.toFixed(2)});i++;if(i%5===0)parentPort.postMessage({progress:i});});`,
    {eval:true,workerData:{core:require.resolve('./tracking-core.cjs'),W,H,fps:FPS,start:o.start,box:{x:o.box.x*W,y:o.box.y*H,w:o.box.w*W,h:o.box.h*H}}});children.add(worker);
  const result=new Promise((resolve,reject)=>{worker.on('message',m=>{if(m.progress)progress({fraction:Math.min(1,m.progress/total)});if(m.points)resolve(m.points);});worker.once('error',reject);worker.once('exit',()=>{children.delete(worker);reject(Error(version!==epoch?'Seguimiento cancelado':'El análisis de seguimiento terminó sin resultado'));});});
  await new Promise((resolve,reject)=>{
    const child=spawn(require('./render-engine.cjs').ffmpegPath(),['-v','error','-ss',(o.offset+o.start*o.rate).toFixed(4),'-t',(span*o.rate).toFixed(4),'-i',o.filePath,'-map','0:v:0','-an','-vf',`setpts=(PTS-STARTPTS)/${o.rate},fps=${FPS},scale=${W}:${H},format=gray`,'-f','rawvideo','pipe:1'],{windowsHide:true,stdio:['ignore','pipe','pipe']});children.add(child);
    const size=W*H;let pending=Buffer.alloc(0),err='';child.stderr.on('data',d=>err=(err+d).slice(-3000));
    child.stdout.on('data',chunk=>{pending=Buffer.concat([pending,chunk]);while(pending.length>=size){const frame=new Uint8Array(size);frame.set(pending.subarray(0,size));pending=pending.subarray(size);worker.postMessage({frame:frame.buffer},[frame.buffer]);}});
    child.once('error',reject);child.once('close',code=>{children.delete(child);if(version!==epoch)reject(Error('Seguimiento cancelado'));else if(code!==0)reject(Error('No se pudo decodificar el vídeo: '+err));else resolve();});
  }).catch(e=>{void worker.terminate();throw e;});
  worker.postMessage({done:true});const points=await result;void worker.terminate();
  if(version!==epoch)throw Error('Seguimiento cancelado');if(!points.length)throw Error('No hay fotogramas para seguir');progress({fraction:1});return {fps:FPS,width:W,height:H,points};
}
module.exports={track,cancel,check,FPS};
