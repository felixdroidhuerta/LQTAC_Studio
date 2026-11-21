// Optional Qbit assistant module. Lives in <root>/qbit (next to the portable executable, or the repository in development):
//   qbit.json            {version, runtime, model, sprite}
//   runtime/             llama.cpp server (llama-server.exe + DLLs)
//   models/              GGUF model
//   assets/              optional spritesheet (the editor ships its own in dist/assets)
// Installed on demand from GitHub releases (see install below); copying the portable folder carries it along.
// The local model only proposes actions from qbit-actions.cjs; they reach the project through the same
// validated cinema_edit / cinema_history path as the MCP, and only after the user confirms them.
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),net=require('node:net'),crypto=require('node:crypto'),{spawn,execFile}=require('node:child_process');
const actions=require('./qbit-actions.cjs'),{compareVersions}=require('./ai-pro-service.cjs');
const REPOSITORY='felixdroidhuerta/LQTAC_Studio',TAG_PREFIX='qbit-v',MANIFEST='qbit-manifest.json';
// Reasoning models (Qwen3) would think before the JSON: slower and, in tests, less accurate. Ignored by other templates.
const NO_THINKING={chat_template_kwargs:{enable_thinking:false}};
const ALLOWED_HOSTS=/(^|\.)(github\.com|githubusercontent\.com)$/i;

function createQbitService({root,bridge,threads=Math.max(2,Math.min(8,(require('node:os').availableParallelism?.()||4)-1)),fetchImpl=fetch,httpImpl,appVersion='0.0.0'}){
 const directory=path.join(root,'qbit');
 let child=null,port=0,state='stopped',lastError='',starting=null,log='';
 const history=[],proposals=new Map();
 // Never leave the engine running after the editor goes away. app.exit or a crash skip before-quit, so the PID is also
 // recorded and a leftover engine (still llama-server, same module) is closed on the next start.
 process.once('exit',()=>{if(child)child.kill();});
 const pidFile=path.join(require('node:os').tmpdir(),'lqtac-qbit-'+crypto.createHash('sha1').update(directory.toLowerCase()).digest('hex').slice(0,12)+'.pid');
 async function killOrphan(){
  let pid;try{pid=Number(fs.readFileSync(pidFile,'utf8'));}catch{return;}
  if(!(pid>0)||pid===child?.pid)return;
  if(process.platform==='win32'){
   const out=await new Promise(r=>require('node:child_process').execFile('tasklist',['/FI','PID eq '+pid,'/FO','CSV','/NH'],{windowsHide:true},(e,so)=>r(e?'':so)));
   if(!/^"llama-server\.exe"/i.test(out.trim()))return;
  }
  try{process.kill(pid);}catch{}
 }
 function readManifest(folder=directory){
  try{
   const info=JSON.parse(fs.readFileSync(path.join(folder,'qbit.json'),'utf8').replace(/^﻿/,''));
   const inside=p=>{if(typeof p!=='string'||!p||path.isAbsolute(p)||p.split(/[\\/]/).includes('..'))return null;const f=path.join(folder,p);return fs.existsSync(f)?f:null;};
   const runtime=inside(info.runtime),model=inside(info.model),sprite=inside(info.sprite);
   return {info,runtime,model,sprite,ok:!!(runtime&&model)};
  }catch{return null;}
 }
 function status(){
  const m=readManifest();
  return {installed:!!m?.ok,broken:!!m&&!m.ok,version:m?.info.version||null,engine:m?.info.engine||null,state,error:lastError,path:directory,busy:!!job,
   sprite:m?.sprite?require('node:url').pathToFileURL(m.sprite).href:null};
 }
 const freePort=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 async function waitHealthy(timeoutMs){
  const until=Date.now()+timeoutMs;
  while(Date.now()<until){
   if(!child)throw Error('El motor de Qbit se cerró al arrancar'+(log?': '+log.trim().split('\n').slice(-2).join(' '):''));
   try{const r=await fetchImpl(`http://127.0.0.1:${port}/health`);if(r.ok&&(await r.json()).status==='ok')return;}catch{}
   await new Promise(r=>setTimeout(r,400));
  }
  throw Error('El motor de Qbit no respondió a tiempo');
 }
 async function start(){
  if(state==='ready')return status();
  if(starting)return starting;
  starting=(async()=>{
   const m=readManifest();if(!m?.ok)throw Error('El asistente Qbit no está instalado');
   state='starting';lastError='';log='';port=await freePort();
   await killOrphan();
   child=spawn(m.runtime,['-m',m.model,'--host','127.0.0.1','--port',String(port),'-c','8192','-np','1','-t',String(threads),'--no-webui'],{cwd:path.dirname(m.runtime),windowsHide:true,stdio:['ignore','pipe','pipe']});
   try{fs.writeFileSync(pidFile,String(child.pid));}catch{}
   const keep=d=>{log=(log+d).slice(-4000);};child.stdout.on('data',keep);child.stderr.on('data',keep);
   child.once('exit',()=>{child=null;if(state!=='stopped'){state='stopped';lastError=lastError||'El motor de Qbit se ha detenido';}});
   try{await waitHealthy(120000);state='ready';}
   catch(e){stop();lastError=e.message;throw e;}
   finally{starting=null;}
   return status();
  })();
  return starting;
 }
 function stop(){state='stopped';warmed=null;proposals.clear();if(child){child.kill();child=null;}}
 // Windows keeps the engine's DLLs locked until the process is gone: wait for it before touching the folder.
 async function stopAndWait(){const c=child;stop();if(c&&c.exitCode===null&&c.signalCode===null)await new Promise(r=>{c.once('exit',r);setTimeout(r,10000);});}

 async function complete(messages,schema){
  const r=await fetchImpl(`http://127.0.0.1:${port}/v1/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({messages,cache_prompt:true,temperature:0.1,max_tokens:320,...NO_THINKING,response_format:{type:'json_schema',json_schema:{name:'qbit',schema}}})});
  const j=await r.json().catch(()=>null);if(!r.ok||!j?.choices)throw Error('El motor de Qbit respondió con un error'+(j?.error?.message?': '+j.error.message:''));
  return JSON.parse(j.choices[0].message.content);
 }
 // Fills the prompt cache with the fixed part (rules, catalog, examples) so the first real question is fast.
 // Runs once per engine start; the panel keeps saying "Despertando…" until it ends instead of making the first question slow.
 let warmed=null;
 function warmUp(){
  if(state!=='ready')return Promise.resolve();
  return warmed||=(async()=>{try{const {project}=await bridge.call('cinema_project',{}),{transitions}=await bridge.call('cinema_effects',{});
   await fetchImpl(`http://127.0.0.1:${port}/v1/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:actions.buildMessages({project,transitions,question:'hola'}),cache_prompt:true,max_tokens:1,...NO_THINKING})});}catch{}})();
 }

 async function ask({question,selection=[]}){
  if(typeof question!=='string'||!question.trim())throw Error('Escribe una pregunta');
  question=question.trim().slice(0,600);
  if(state!=='ready')await start();
  const {project,revision}=await bridge.call('cinema_project',{}),{transitions}=await bridge.call('cinema_effects',{});
  const refs=new Set(actions.clipList(project).map(x=>x.ref));selection=(Array.isArray(selection)?selection:[]).filter(r=>refs.has(r));
  const answer=actions.interpret(await complete(actions.buildMessages({project,selection,transitions,question,history}),actions.responseSchema({project,transitions})));
  answer.actions=actions.normalize({question,project,actions:answer.actions,transitions});
  const result=actions.plan(project,answer.actions,{transitions});
  history.push({role:'user',content:'PETICIÓN: '+question},{role:'assistant',content:JSON.stringify({intent:answer.intent,reply:answer.reply,actions:answer.actions})});history.splice(0,Math.max(0,history.length-4));
  let id=null;
  if(result.history||result.operations.length){id=crypto.randomUUID();proposals.clear();proposals.set(id,{revision,operations:result.operations,history:result.history});}
  return {id,intent:answer.intent,reply:answer.reply,steps:result.steps,errors:result.errors};
 }
 async function apply(id){
  const p=proposals.get(id);if(!p)throw Error('Esta propuesta ya no está disponible. Vuelve a pedírmelo');
  proposals.delete(id);
  if(p.history)return bridge.call('cinema_history',{action:p.history}).then(()=>({ok:true}));
  await bridge.call('cinema_edit',{revision:p.revision,operations:p.operations});
  return {ok:true};
 }
 function reset(){history.length=0;proposals.clear();}

 // --- Installation from the project's GitHub releases ---------------------------------------------------------
 // Release tag qbit-vX.Y.Z with qbit-manifest.json and the ZIP split in parts (GitHub caps each asset at 2 GiB):
 //   {version, minAppVersion, engine, size, sha256, parts:[{name,size,sha256}], notes}
 // The ZIP holds qbit.json, runtime/ and models/ at its root. Nothing is executed during installation.
 let job=null;
 const http=httpImpl||((url,options)=>require('electron').net.fetch(url,options));
 const checkUrl=url=>{const u=new URL(url);if(u.protocol!=='https:'||!ALLOWED_HOSTS.test(u.hostname))throw Error('Origen de descarga no permitido: '+u.hostname);return u.href;};
 async function getJson(url,signal){const r=await http(checkUrl(url),{signal,headers:{Accept:'application/vnd.github+json','User-Agent':'CinemaStudio-Qbit'}});if(!r.ok)throw Error(`GitHub respondió ${r.status} al consultar Qbit`);return r.json();}
 async function check(){
  const releases=await getJson(`https://api.github.com/repos/${REPOSITORY}/releases?per_page=50`);
  const candidates=releases.filter(r=>!r.draft&&!r.prerelease&&String(r.tag_name).startsWith(TAG_PREFIX)).sort((a,b)=>compareVersions(b.tag_name.slice(TAG_PREFIX.length),a.tag_name.slice(TAG_PREFIX.length)));
  for(const release of candidates){
   const manifestAsset=release.assets.find(a=>a.name===MANIFEST);if(!manifestAsset)continue;
   const m=await getJson(manifestAsset.browser_download_url),sha=v=>/^[0-9a-f]{64}$/i.test(v||''),size=v=>Number.isSafeInteger(v)&&v>0;
   if(!m||typeof m.version!=='string'||!sha(m.sha256)||!size(m.size)||!Array.isArray(m.parts)||!m.parts.length||m.parts.length>16||!m.parts.every(p=>typeof p?.name==='string'&&sha(p.sha256)&&size(p.size))||m.parts.reduce((t,p)=>t+p.size,0)!==m.size)throw Error('Manifiesto de Qbit no válido');
   const parts=m.parts.map(p=>{const a=release.assets.find(x=>x.name===p.name);if(!a)throw Error('La publicación no contiene '+p.name);if(a.size!==p.size)throw Error('El tamaño publicado de '+p.name+' no coincide con el manifiesto');return {name:p.name,size:p.size,sha256:p.sha256.toLowerCase(),url:a.browser_download_url};});
   const compatible=!m.minAppVersion||compareVersions(appVersion,m.minAppVersion)>=0;
   return {available:true,compatible,minAppVersion:m.minAppVersion||null,version:m.version,engine:String(m.engine||''),size:m.size,sha256:m.sha256.toLowerCase(),parts,tag:release.tag_name,notes:String(m.notes||'').slice(0,2000)};
  }
  return {available:false,reason:'Todavía no hay ninguna versión de Qbit publicada en GitHub.'};
 }
 async function freeSpace(){try{const s=await fsp.statfs(root);return s.bavail*s.bsize;}catch{return Infinity;}}
 async function install(progress=()=>{}){
  if(job)throw Error('Ya hay una instalación en curso');
  const controller=new AbortController();job={controller};
  const temporary=path.join(root,'qbit.download'),zip=temporary+'.zip',extracted=path.join(temporary,'files');
  try{
   progress({phase:'check'});const release=await check();
   if(!release.available)throw Error(release.reason);if(!release.compatible)throw Error(`Qbit ${release.version} necesita Cinema Studio ${release.minAppVersion} o superior`);
   if(await freeSpace()<release.size*2.2)throw Error('No hay espacio suficiente: se necesitan unos '+Math.ceil(release.size*2.2/1e9*10)/10+' GB libres');
   await fsp.rm(temporary,{recursive:true,force:true});await fsp.rm(zip,{force:true});await fsp.mkdir(extracted,{recursive:true});
   const total=crypto.createHash('sha256'),out=fs.createWriteStream(zip);let received=0;
   try{
    for(const part of release.parts){
     const r=await http(checkUrl(part.url),{signal:controller.signal,headers:{'User-Agent':'CinemaStudio-Qbit'}});if(!r.ok||!r.body)throw Error(`La descarga respondió ${r.status}`);
     const hash=crypto.createHash('sha256');let got=0;const reader=r.body.getReader();
     for(;;){const {done,value}=await reader.read();if(done)break;got+=value.length;if(got>part.size)throw Error('La descarga supera el tamaño publicado');hash.update(value);total.update(value);received+=value.length;if(!out.write(value))await new Promise(res=>out.once('drain',res));progress({phase:'download',received,total:release.size});}
     if(got!==part.size)throw Error('Descarga incompleta');
     if(hash.digest('hex')!==part.sha256)throw Error('La comprobación SHA-256 de '+part.name+' no coincide; el paquete se ha descartado');
    }
   }finally{await new Promise(res=>out.end(res));}
   if(total.digest('hex')!==release.sha256)throw Error('La comprobación SHA-256 del paquete no coincide; se ha descartado');
   progress({phase:'extract'});
   await new Promise((resolve,reject)=>{const c=execFile(path.join(process.env.SystemRoot||'C:\\Windows','System32','tar.exe'),['-xf',zip,'-C',extracted],{windowsHide:true},e=>e?reject(Error('No se pudo descomprimir Qbit: '+e.message)):resolve());controller.signal.addEventListener('abort',()=>c.kill(),{once:true});});
   if(controller.signal.aborted)throw Error('Instalación cancelada');
   const m=readManifest(extracted);if(!m?.ok||m.info.version!==release.version)throw Error('El paquete descargado no contiene un Qbit válido');
   progress({phase:'activate'});await stopAndWait();const old=directory+'.old';await fsp.rm(old,{recursive:true,force:true});
   if(fs.existsSync(directory))await fsp.rename(directory,old);
   try{await fsp.rename(extracted,directory);}catch(e){if(fs.existsSync(old))await fsp.rename(old,directory);throw e;}
   await fsp.rm(old,{recursive:true,force:true});progress({phase:'done'});return status();
  }catch(e){if(controller.signal.aborted)throw Error('Instalación cancelada');throw e;}
  finally{job=null;await fsp.rm(temporary,{recursive:true,force:true}).catch(()=>{});await fsp.rm(zip,{force:true}).catch(()=>{});}
 }
 function cancel(){job?.controller.abort();}
 async function uninstall(){if(job)throw Error('Hay una instalación en curso');await stopAndWait();await fsp.rm(directory,{recursive:true,force:true});return status();}
 return {status,start,stop,stopAndWait,warmUp,ask,apply,reset,check,install,cancel,uninstall,directory};
}
module.exports={createQbitService,REPOSITORY,TAG_PREFIX,MANIFEST};
