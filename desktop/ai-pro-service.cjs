// Optional "IA precisa" module: installed on demand from the project's GitHub releases.
// Release tag ai-pro-vX.Y.Z with two assets: ai-pro-manifest.json and the ZIP named in that manifest.
// The ZIP must contain ai-pro.json at its root. Nothing is executed during installation.
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {execFile}=require('node:child_process');
const REPOSITORY='felixdroidhuerta/LQTAC_Studio',TAG_PREFIX='ai-pro-v',MANIFEST='ai-pro-manifest.json';
const ALLOWED_HOSTS=/(^|\.)(github\.com|githubusercontent\.com)$/i;
function compareVersions(a,b){const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);for(let i=0;i<3;i++){const d=(x[i]||0)-(y[i]||0);if(d)return d;}return 0;}
function createAiProService({root,appVersion,fetchImpl,cacheDirectory,ffmpegPath=()=>require('./render-engine.cjs').ffmpegPath()}){
  const directory=path.join(root,'ai-pro');let job=null;
  const http=fetchImpl||((url,options)=>require('electron').net.fetch(url,options));
  function checkUrl(url){const u=new URL(url);if(u.protocol!=='https:'||!ALLOWED_HOSTS.test(u.hostname))throw Error('Origen de descarga no permitido: '+u.hostname);return u.href;}
  async function getJson(url,signal){const r=await http(checkUrl(url),{signal,headers:{Accept:'application/vnd.github+json','User-Agent':'CinemaStudio-AiPro'}});if(!r.ok)throw Error(`GitHub respondió ${r.status} al consultar el módulo`);return r.json();}
  function readInstalled(){try{const info=JSON.parse(fs.readFileSync(path.join(directory,'ai-pro.json'),'utf8').replace(/^﻿/,''));const entry=path.join(directory,info.entry||'');return {info,entry,ok:!!info.entry&&fs.existsSync(entry)};}catch{return null;}}
  function status(){const installed=readInstalled();return {installed:!!installed?.ok,version:installed?.info.version||null,engine:installed?.info.engine||null,path:directory,busy:!!job,broken:!!installed&&!installed.ok};}
  async function check(){
    const releases=await getJson(`https://api.github.com/repos/${REPOSITORY}/releases?per_page=50`);
    const candidates=releases.filter(r=>!r.draft&&!r.prerelease&&String(r.tag_name).startsWith(TAG_PREFIX)).sort((a,b)=>compareVersions(b.tag_name.slice(TAG_PREFIX.length),a.tag_name.slice(TAG_PREFIX.length)));
    for(const release of candidates){
      const manifestAsset=release.assets.find(a=>a.name===MANIFEST);if(!manifestAsset)continue;
      const manifest=await getJson(manifestAsset.browser_download_url);
      if(!manifest||typeof manifest.version!=='string'||typeof manifest.package!=='string'||!/^[0-9a-f]{64}$/i.test(manifest.sha256||'')||!Number.isSafeInteger(manifest.size)||manifest.size<=0)throw Error('Manifiesto del módulo IA pro no válido');
      const asset=release.assets.find(a=>a.name===manifest.package);if(!asset)throw Error('La release no contiene el paquete '+manifest.package);
      if(asset.size!==manifest.size)throw Error('El tamaño publicado no coincide con el manifiesto');
      const compatible=!manifest.minAppVersion||compareVersions(appVersion,manifest.minAppVersion)>=0;
      return {available:true,compatible,minAppVersion:manifest.minAppVersion||null,version:manifest.version,engine:manifest.engine||'',size:manifest.size,sha256:manifest.sha256.toLowerCase(),url:asset.browser_download_url,tag:release.tag_name,notes:String(manifest.notes||'').slice(0,2000)};
    }
    return {available:false,reason:'Todavía no hay ninguna versión del módulo IA pro publicada en GitHub ('+REPOSITORY+').'};
  }
  async function freeSpace(){try{const s=await fsp.statfs(root);return s.bavail*s.bsize;}catch{return Infinity;}}
  async function install(progress=()=>{}){
    if(job)throw Error('Ya hay una instalación en curso');
    const controller=new AbortController();job={controller};
    const temporary=path.join(root,'ai-pro.download'),zip=temporary+'.zip',extracted=path.join(temporary,'files');
    try{
      progress({phase:'check'});const release=await check();
      if(!release.available)throw Error(release.reason);if(!release.compatible)throw Error(`El módulo ${release.version} necesita Cinema Studio ${release.minAppVersion} o superior`);
      if(await freeSpace()<release.size*3)throw Error('No hay espacio suficiente: se necesitan unos '+Math.ceil(release.size*3/1e6)+' MB libres');
      await fsp.rm(temporary,{recursive:true,force:true});await fsp.rm(zip,{force:true});await fsp.mkdir(extracted,{recursive:true});
      const response=await http(checkUrl(release.url),{signal:controller.signal,headers:{'User-Agent':'CinemaStudio-AiPro'}});if(!response.ok||!response.body)throw Error(`La descarga respondió ${response.status}`);
      const hash=crypto.createHash('sha256'),out=fs.createWriteStream(zip);let received=0;
      try{const reader=response.body.getReader();for(;;){const {done,value}=await reader.read();if(done)break;received+=value.length;if(received>release.size)throw Error('La descarga supera el tamaño publicado');hash.update(value);if(!out.write(value))await new Promise(r=>out.once('drain',r));progress({phase:'download',received,total:release.size});}}
      finally{await new Promise(r=>out.end(r));}
      if(received!==release.size)throw Error('Descarga incompleta');
      if(hash.digest('hex')!==release.sha256)throw Error('La comprobación SHA-256 no coincide; el paquete se ha descartado');
      progress({phase:'extract'});
      await new Promise((resolve,reject)=>{const child=execFile(path.join(process.env.SystemRoot||'C:\\Windows','System32','tar.exe'),['-xf',zip,'-C',extracted],{windowsHide:true},error=>error?reject(Error('No se pudo descomprimir el módulo: '+error.message)):resolve());controller.signal.addEventListener('abort',()=>child.kill(),{once:true});});
      if(controller.signal.aborted)throw Error('Instalación cancelada');
      const info=JSON.parse((await fsp.readFile(path.join(extracted,'ai-pro.json'),'utf8')).replace(/^﻿/,''));
      if(info.version!==release.version||!info.entry||path.isAbsolute(info.entry)||info.entry.includes('..')||!fs.existsSync(path.join(extracted,info.entry)))throw Error('El paquete descargado no contiene un módulo IA pro válido');
      progress({phase:'activate'});const old=directory+'.old';await fsp.rm(old,{recursive:true,force:true});
      if(fs.existsSync(directory))await fsp.rename(directory,old);
      try{await fsp.rename(extracted,directory);}catch(error){if(fs.existsSync(old))await fsp.rename(old,directory);throw error;}
      await fsp.rm(old,{recursive:true,force:true});progress({phase:'done'});return {...status(),busy:false};
    }catch(error){if(controller.signal.aborted)throw Error('Instalación cancelada');throw error;}
    finally{job=null;await fsp.rm(temporary,{recursive:true,force:true}).catch(()=>{});await fsp.rm(zip,{force:true}).catch(()=>{});}
  }
  function cancel(){job?.controller.abort();}
  async function uninstall(){if(job)throw Error('Hay una instalación en curso');await fsp.rm(directory,{recursive:true,force:true});return status();}
  // ---- Analysis: clip frames → SAM 2 worker → one PNG mask per frame, cached by content hash.
  let analysis=null;
  const cacheRoot=cacheDirectory||path.join(root,'ai-pro-cache');
  function validId(id){return typeof id==='string'&&/^[0-9a-f]{64}$/.test(id);}
  function runProcess(exe,args,onLine,job){return new Promise((resolve,reject)=>{
    if(job.cancelled)return reject(Error('Análisis cancelado'));
    const child=require('node:child_process').spawn(exe,args,{windowsHide:true,cwd:path.dirname(exe)});job.child=child;let stderr='',pending='';
    child.stdout.on('data',d=>{pending+=d;const lines=pending.split('\n');pending=lines.pop();for(const l of lines){if(!l.trim())continue;try{onLine?.(JSON.parse(l));}catch{}}});
    child.stderr.on('data',d=>{stderr=(stderr+d).slice(-4000);});child.once('error',reject);
    child.once('close',code=>{job.child=null;if(job.cancelled)reject(Error('Análisis cancelado'));else if(code===0)resolve();else reject(Error(stderr.trim().split('\n').pop()||'El motor IA pro ha fallado'));});
  });}
  async function analyze(options,progress=()=>{}){
    if(analysis)throw Error('Ya hay un análisis en curso');
    const installed=readInstalled();if(!installed?.ok)throw Error('El módulo IA pro no está instalado');
    const {filePath,offset=0,rate=1,duration,fps=12,objects}=options||{};
    if(typeof filePath!=='string'||!path.isAbsolute(filePath))throw Error('Fuente no válida');
    if(![offset,rate,duration,fps].every(Number.isFinite)||offset<0||rate<=0||duration<=0||duration>1800||fps<1||fps>30)throw Error('Tramo de análisis no válido');
    if(!Array.isArray(objects)||!objects.length||objects.length>8)throw Error('Marca entre 1 y 8 objetos');
    const points=[];for(const o of objects){if(!Array.isArray(o.points)||o.points.length>64)throw Error('Puntos no válidos');for(const p of o.points)if(![p.time,p.x,p.y].every(Number.isFinite)||p.time<0||p.time>duration||p.x<0||p.x>1||p.y<0||p.y>1)throw Error('Punto fuera del clip');}
    const stat=await fsp.stat(filePath);const frameCount=Math.max(1,Math.round(duration*fps));
    const prompts={objects:objects.map(o=>({points:o.points.map(p=>({frame:Math.min(frameCount-1,Math.round(p.time*fps)),x:p.x,y:p.y,label:p.label?1:0}))}))};
    const id=crypto.createHash('sha256').update(JSON.stringify({filePath,size:stat.size,mtime:stat.mtimeMs,offset,rate,duration,fps,prompts,engine:installed.info.version})).digest('hex');
    const folder=path.join(cacheRoot,id),done=path.join(folder,'result.json');
    if(fs.existsSync(done)){progress({phase:'done',progress:1,cached:true});return {id,fps,frames:frameCount,cached:true};}
    const job={cancelled:false,child:null};analysis=job;const work=path.join(cacheRoot,id+'.work');
    try{
      await fsp.rm(work,{recursive:true,force:true});await fsp.mkdir(path.join(work,'frames'),{recursive:true});
      progress({phase:'frames',progress:0});
      // Same mapping as the timeline: local time t → source time offset + t·rate.
      await runProcess(ffmpegPath(),['-v','error','-y','-ss',String(offset),'-t',String(duration*rate),'-i',filePath,'-an','-vf',`setpts=(PTS-STARTPTS)/${rate},fps=${fps},scale=-2:360`,'-frames:v',String(frameCount),'-start_number','0','-q:v','3',path.join(work,'frames','%05d.jpg')],null,job);
      await fsp.writeFile(path.join(work,'prompts.json'),JSON.stringify(prompts));
      const started=Date.now();
      await runProcess(installed.entry,['analyze','--frames',path.join(work,'frames'),'--prompts',path.join(work,'prompts.json'),'--output',path.join(work,'masks'),'--models',path.join(directory,'models'),'--threads',String(Math.min(8,require('node:os').availableParallelism?.()||4))],
        line=>{if(line.phase==='track'){const elapsed=(Date.now()-started)/1000,remaining=line.done>3?elapsed/line.done*(line.total-line.done):null;progress({phase:'track',progress:line.progress,done:line.done,total:line.total,remaining});}else if(line.phase)progress({phase:line.phase,progress:line.progress||0});},job);
      const result=JSON.parse(await fsp.readFile(path.join(work,'masks','result.json'),'utf8'));
      await fsp.rm(folder,{recursive:true,force:true});await fsp.rename(path.join(work,'masks'),folder);
      progress({phase:'done',progress:1});return {id,fps,frames:result.frames,cached:false,seconds:result.seconds};
    }finally{analysis=null;await fsp.rm(work,{recursive:true,force:true}).catch(()=>{});}
  }
  function cancelAnalysis(){if(analysis){analysis.cancelled=true;analysis.child?.kill();}}
  function maskInfo(id){if(!validId(id))throw Error('Análisis no válido');const folder=path.join(cacheRoot,id);return {available:fs.existsSync(path.join(folder,'result.json')),url:require('node:url').pathToFileURL(folder).href+'/'};}
  return {status,check,install,cancel,uninstall,directory,analyze,cancelAnalysis,maskInfo};
}
module.exports={createAiProService,compareVersions,REPOSITORY,TAG_PREFIX,MANIFEST};
