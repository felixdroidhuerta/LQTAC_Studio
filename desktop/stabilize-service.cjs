// Video stabilization: two-pass FFmpeg vid.stab on the whole source file (timing identical to the original, so trims,
// splits and speed changes keep working). The result is a regenerable local cache; the project keeps the original path.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const pending=new Map(),children=new Set();let epoch=0;
function cancel(){epoch++;for(const child of children)child.kill();}
function check(o){if(!o||typeof o.filePath!=='string'||!path.isAbsolute(o.filePath)||!Number.isInteger(o.smoothing)||o.smoothing<1||o.smoothing>100||!['zoom','borders'].includes(o.crop))throw Error('Ajustes de estabilización no válidos');return {filePath:o.filePath,smoothing:o.smoothing,crop:o.crop};}
function run(args,cwd,version,onTime){
  return new Promise((resolve,reject)=>{
    if(version!==epoch)return reject(Error('Estabilización cancelada'));
    const child=spawn(require('./render-engine.cjs').ffmpegPath(),['-hide_banner','-nostdin',...args],{windowsHide:true,cwd,stdio:['ignore','ignore','pipe']});children.add(child);let tail='',duration=0;
    child.stderr.on('data',chunk=>{const text=String(chunk);tail=(tail+text).slice(-12000);const d=text.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);if(d)duration=+d[1]*3600+ +d[2]*60+ +d[3];const t=[...text.matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop();if(t&&duration>0)onTime(Math.min(1,(+t[1]*3600+ +t[2]*60+ +t[3])/duration));});
    child.once('error',e=>{children.delete(child);reject(e);});
    child.once('close',code=>{children.delete(child);if(version!==epoch)reject(Error('Estabilización cancelada'));else if(code!==0)reject(Error('No se pudo estabilizar: '+tail.slice(-1500)));else resolve();});
  });
}
async function prepare(options,directory,progress=()=>{}){
  const o=check(options),stat=await fs.stat(o.filePath);if(!stat.isFile())throw Error('El medio no es un archivo');
  const key=crypto.createHash('sha256').update(JSON.stringify({file:o.filePath,size:stat.size,mtime:stat.mtimeMs,smoothing:o.smoothing,crop:o.crop,version:1})).digest('hex');
  await fs.mkdir(directory,{recursive:true});const output=path.join(directory,key+'.mp4');
  if((await fs.stat(output).catch(()=>null))?.size>0){progress({fraction:1});return output;}
  if(pending.has(key))return pending.get(key);
  const version=epoch,task=(async()=>{
    const temp=await fs.mkdtemp(path.join(path.resolve(directory),'.stab-'));
    try{
      // Relative names inside the working folder: Windows drive colons would break the filter arguments.
      await run(['-v','info','-i',o.filePath,'-map','0:v:0','-vf','vidstabdetect=shakiness=6:accuracy=15:result=transforms.trf','-f','null','-'],temp,version,f=>progress({fraction:f*.4,stage:'Analizando movimiento'}));
      await run(['-v','info','-y','-i',o.filePath,'-map','0:v:0','-map','0:a:0?','-vf',`vidstabtransform=input=transforms.trf:smoothing=${o.smoothing}:optzoom=${o.crop==='zoom'?1:0}:interpol=bicubic:crop=black,unsharp=5:5:0.6:3:3:0.3,pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p`,'-c:v','libx264','-preset','fast','-crf','17','-c:a','aac','-b:a','192k','-movflags','+faststart','stabilized.mp4'],temp,version,f=>progress({fraction:.4+f*.6,stage:'Estabilizando'}));
      await fs.rename(path.join(temp,'stabilized.mp4'),output);progress({fraction:1});return output;
    }finally{await fs.rm(temp,{recursive:true,force:true}).catch(()=>{});}
  })();
  pending.set(key,task);try{return await task;}finally{pending.delete(key);}
}
module.exports={prepare,cancel,check};
