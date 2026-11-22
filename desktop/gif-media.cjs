// Animated GIF → WebM VP9 with alpha, cached by file/size/mtime. Chromium's <video> keeps VP9 alpha, so
// the GIF then follows the normal video path (preview, compositor, effects, Trayectoria, export).
// The project keeps the original .gif path; the WebM is a regenerable local cache.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{execFile}=require('node:child_process');
const pending=new Map();
const isGif=filePath=>typeof filePath==='string'&&/\.gif$/i.test(filePath);
function ffmpeg(args){return new Promise((resolve,reject)=>{execFile(require('./render-engine.cjs').ffmpegPath(),['-hide_banner','-nostdin',...args],{windowsHide:true,maxBuffer:16*1024*1024,timeout:600000},(error,_stdout,stderr)=>{if(error)reject(Error(String(stderr||error.message).trim().split(/\r?\n/).slice(-3).join('\n')||'No se pudo convertir el GIF'));else resolve(String(stderr));});});}
async function prepare(filePath,directory){
  if(!isGif(filePath)||!path.isAbsolute(filePath))throw Error('GIF no válido');
  const stat=await fs.stat(filePath);if(!stat.isFile())throw Error('El GIF no es un archivo');
  const key=crypto.createHash('sha256').update(JSON.stringify({file:filePath,size:stat.size,mtime:stat.mtimeMs,version:1})).digest('hex');
  const output=path.join(directory,key+'.webm');
  if((await fs.stat(output).catch(()=>null))?.size>0)return output;
  if(pending.has(key))return pending.get(key);
  const task=(async()=>{
    await fs.mkdir(directory,{recursive:true});const temp=path.join(directory,'.'+key+'-'+process.pid+'.webm');
    try{
      // Even dimensions for yuva420p; GIF frame delays are kept as variable timestamps (no -r).
      await ffmpeg(['-v','error','-y','-i',filePath,'-map','0:v:0','-an','-vf','format=rgba,pad=ceil(iw/2)*2:ceil(ih/2)*2:0:0:color=black@0,format=yuva420p','-c:v','libvpx-vp9','-pix_fmt','yuva420p','-auto-alt-ref','0','-b:v','0','-crf','20','-row-mt','1','-deadline','good','-cpu-used','4','-f','webm',temp]);
      await fs.rename(temp,output);return output;
    }catch(error){await fs.rm(temp,{force:true}).catch(()=>{});throw error;}
  })().finally(()=>pending.delete(key));
  pending.set(key,task);return task;
}
// Duration in seconds from the converted file (the Windows shell does not report GIF durations).
async function duration(filePath,directory){const out=await prepare(filePath,directory);const info=await ffmpeg(['-i',out,'-f','null','-']).catch(e=>e.message);const head=String(info).match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);if(head)return Number(head[1])*3600+Number(head[2])*60+Number(head[3]);const all=[...String(info).matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)].at(-1);return all?Number(all[1])*3600+Number(all[2])*60+Number(all[3]):0;}
module.exports={isGif,prepare,duration};
