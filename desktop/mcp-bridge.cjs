const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const {tools,validate}=require('./mcp-tools.cjs'),model=require('./mcp-edit.cjs'),io=require('./project-io.cjs');
const engine=require('./render-engine.cjs');
function createBridge({directory,getWindow,isBusy=()=>false,setProjectPath=()=>{},authorizeRender,subtitles,authorizeRecording,queueDialog=()=>{},clearDialogs=()=>{},captureSources,captureThumbnail}){
 let server=null,token='',enabled=false,queue=Promise.resolve(),job=null,recordingAllowed=false;
 const connections=new Set(),descriptor=path.join(directory,'connection.json'),settings=path.join(directory,'settings.json');
 const evaluate=async(method,args)=>{
  const win=getWindow();if(!win||win.isDestroyed())throw Error('Cinema Studio no está abierto');
  if(win.webContents.isLoading())await new Promise((resolve,reject)=>{const done=()=>{clearTimeout(timer);resolve();};const timer=setTimeout(()=>{win.webContents.removeListener('did-finish-load',done);reject(Error('Cinema Studio aún está cargando'));},30000);win.webContents.once('did-finish-load',done);});
  return win.webContents.executeJavaScript(`window.CinemaAutomation[${JSON.stringify(method)}](${JSON.stringify(args??{})})`,true);
 };
 const current=()=>evaluate('snapshot');
 const idle=async()=>{if(isBusy()||job?.state==='running')throw Error('Hay una grabación, exportación o trabajo MCP en curso');await evaluate('assertIdle');};
 const canonical=p=>JSON.stringify({...p,time:0,zoom:0,zoomStart:0});
 const subtitleClips=cues=>cues.map(c=>({...c,kind:'subtitle',filePath:'',name:c.subtitleText,autoCrossfade:false}));
 const apply=async(p,old)=>{io.validateProject(p);await evaluate('apply',{project:p,expected:canonical(old)});return model.describe(await current());};
 const absolute=p=>{if(typeof p!=='string'||!path.isAbsolute(p))throw Error('Se requiere una ruta local absoluta');return path.resolve(p);};
 async function destination(p,overwrite,extension){p=absolute(p);if(extension&&path.extname(p).toLowerCase()!=='.'+extension)throw Error('La extensión de destino debe ser .'+extension);if(!overwrite&&await fs.stat(p).catch(()=>null))throw Error('El destino ya existe. Usa overwrite=true para reemplazarlo');return p;}
 async function probe(file){
  file=absolute(file);if(!(await fs.stat(file)).isFile())throw Error('El medio no es un archivo');
  if(!/\.(mp4|mov|mkv|webm|avi|m4v|mpeg|mpg|wmv|wav|mp3|m4a|aac|flac|ogg|opus|aiff?|wma|png|jpe?g|webp|bmp|tiff?)$/i.test(file))throw Error('Formato de medio no admitido');
  if(/\.(png|jpe?g|webp|bmp|tiff?)$/i.test(file))return {path:file,name:path.basename(file),kind:'image',duration:5,hasAudio:false};
  let info='';try{await run(engine.ffmpegPath(),['-hide_banner','-i',file],{windowsHide:true,timeout:30000,maxBuffer:2*1024*1024});}catch(e){info=String(e.stderr||'');}
  const d=info.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/),hasVideo=/Stream .*Video:/.test(info),hasAudio=/Stream .*Audio:/.test(info);
  const duration=d?+d[1]*3600 + +d[2]*60 + +d[3]:0;if(!duration||!hasVideo&&!hasAudio)throw Error('No se pudo leer la duración o las pistas de '+path.basename(file));
  return {path:file,name:path.basename(file),kind:hasVideo?'video':'audio',duration,hasAudio};
 }
 function startJob(kind,operation){
  job={id:crypto.randomUUID(),kind,state:'running',progress:0,startedAt:new Date().toISOString()};const active=job;
  Promise.resolve().then(operation).then(result=>{active.result=result;active.state='completed';active.progress=1;},e=>{active.error=e.message;active.state=active.cancelRequested?'cancelled':'failed';}).finally(()=>{active.finishedAt=new Date().toISOString();});return {...active};
 }
 async function call(name,a){
  const spec=tools.find(t=>t.name===name);if(!spec)throw Error('Herramienta no admitida');validate(spec.inputSchema,a);
  if(name==='cinema_guide')return {content:[{type:'text',text:require('./mcp-guide.cjs').guide(a.topic||'inicio')}]};
  if(name==='cinema_status'){const editor=await evaluate('status');if(job?.state==='running'&&job.kind==='render')job.progress=editor.renderProgress;
   // Word lists can be long: the status reports how many; cinema_transcript returns them.
   const shown=job?.result?.words?{...job,result:{...job.result,words:undefined,wordCount:job.result.words.length,note:'Palabras con tiempos: cinema_transcript'}}:job;
   return {enabled,version:require('./branding.cjs').version(),job:shown,editor,recordingAllowed,recording:await evaluate('recordStatus')};}
  if(name==='cinema_transcript'){
   if(job?.kind!=='subtitles'||job.state!=='completed')throw Error('No hay una transcripción terminada. Usa cinema_transcribe y espera a que cinema_status indique completed');
   const r=job.result,from=a.from??-Infinity,to=a.to??Infinity,inside=x=>x.startSeconds+x.durationSeconds>from&&x.startSeconds<to;
   const fold=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
   const words=(r.words||[]).filter(inside),cues=r.cues.filter(inside).map(c=>({text:c.subtitleText,startSeconds:c.startSeconds,durationSeconds:c.durationSeconds}));
   let matches;if(a.query){const q=fold(a.query).split(' ').filter(Boolean),all=r.words||[],norm=all.map(w=>fold(w.text));matches=[];
    for(let i=0;i+q.length<=all.length;i++)if(q.every((p,k)=>norm[i+k]===p||k===q.length-1&&norm[i+k].startsWith(p))){const last=all[i+q.length-1];if(inside(all[i]))matches.push({text:all.slice(i,i+q.length).map(w=>w.text).join(' '),startSeconds:all[i].startSeconds,endSeconds:+(last.startSeconds+last.durationSeconds).toFixed(3)});}}
   return {engine:r.engine,wordTiming:r.wordTiming||'estimated',cues,words,...(matches?{matches}:{})};
  }
  // Interface access: works with dialogs open, so it does not require an idle editor.
  if(name==='cinema_ui_snapshot')return evaluate('uiSnapshot',a);
  if(name==='cinema_ui_screenshot'){
   const win=getWindow();if(!win||win.isDestroyed())throw Error('Cinema Studio no está abierto');let image=await win.webContents.capturePage();
   const size=image.getSize(),max=a.maxWidth||1600;if(size.width>max)image=image.resize({width:max,quality:'good'});
   return {content:[{type:'image',data:image.toPNG().toString('base64'),mimeType:'image/png'},{type:'text',text:JSON.stringify(image.getSize())}]};
  }
  if(name==='cinema_ui_action'){
   if(a.files)queueDialog({paths:a.files.map(absolute)});
   if(a.dialogButton!==undefined)queueDialog({button:/^\d+$/.test(a.dialogButton)?Number(a.dialogButton):a.dialogButton});
   // Unused answers never outlive the action that asked for them.
   try{const {files,dialogButton,...rest}=a;return await evaluate('uiAction',rest);}finally{clearDialogs();}
  }
  if(name.startsWith('cinema_record_')){
   if(!recordingAllowed)throw Error('La grabación mediante MCP está desactivada. En Cinema Studio: Opciones → Control MCP local → Permitir grabación de pantalla');
   if(name==='cinema_record_sources')return {sources:await captureSources(),devices:await evaluate('devices'),note:'region en píxeles se mide sobre pixelWidth × pixelHeight de la pantalla; en ventanas, sobre el tamaño capturado.'};
   if(name==='cinema_record_thumbnail'){const t=await captureThumbnail(a.sourceId,a.width||1280);return {content:[{type:'image',data:t.data,mimeType:'image/png'},{type:'text',text:JSON.stringify({sourceId:a.sourceId,width:t.width,height:t.height})}]};}
   if(name==='cinema_record_control'){
    if(a.action==='snapshot'){if(!a.path)throw Error('snapshot requiere path .png');queueDialog({paths:[await destination(a.path,a.overwrite,'png')]});}
    try{return await evaluate('recordControl',{action:a.action});}finally{clearDialogs();}
   }
   if(name==='cinema_record_start'){
    await idle();const file=await destination(a.path,a.overwrite,'webm');
    const source=(await captureSources()).find(s=>s.id===a.sourceId);if(!source)throw Error('Fuente no encontrada. Consulta cinema_record_sources');
    const nativeSize=source.display?{width:source.display.pixelWidth,height:source.display.pixelHeight}:null;
    if(a.region&&(a.regionUnit||'pixels')==='pixels'&&nativeSize&&(a.region.x+a.region.width>nativeSize.width+1||a.region.y+a.region.height>nativeSize.height+1))throw Error('La zona sale de la pantalla ('+nativeSize.width+' × '+nativeSize.height+' px)');
    const {path:_,overwrite,...options}=a;return evaluate('recordStart',{...options,nativeSize,ticket:authorizeRecording(file)});
   }
  }
  if(name==='cinema_project')return model.describe(await current());
  if(name==='cinema_effects'){const fx=require('../dist/assets/effects-model.js');return {video:fx.videoDefaults,audio:fx.audioDefaults,ranges:fx.ranges,transitions:await evaluate('transitions')};}
  if(name==='cinema_cancel'){if(job?.state==='running'){job.cancelRequested=true;if(job.kind==='subtitles')subtitles.cancel();else await evaluate('cancel');}return {job};}
  if(name==='cinema_preview'){
   await idle();const image=await evaluate('preview',{time:a.time,width:a.width||640,height:a.height||360});if(a.path){const file=await destination(a.path,a.overwrite,'png');await fs.writeFile(file,Buffer.from(image,'base64'),{flag:a.overwrite?'w':'wx'});}return {content:[{type:'image',data:image,mimeType:'image/png'},{type:'text',text:JSON.stringify({time:a.time,path:a.path||null})}]};
  }
  if(name==='cinema_save'){await idle();const file=await destination(a.path,a.overwrite,'lqts'),p=await current();await io.saveProject(file,p);setProjectPath(file);return {path:file,revision:model.revision(p)};}
  await idle();const old=await current();
  if(name==='cinema_new'||name==='cinema_open'){
   if((old.tracks.some(t=>t.clips.length)||old.library.length)&&!a.discardCurrent)throw Error('Hay contenido en el proyecto actual. Guarda primero o indica discardCurrent=true');
   const loaded=name==='cinema_open'?await io.openProject(absolute(a.path)):{project:{format:'LQTAC Studio',version:1,name:a.name,library:[],tracks:[],time:0},missing:[]};
   const result=await apply(loaded.project,old);setProjectPath(name==='cinema_open'?absolute(a.path):null);return {...result,missing:loaded.missing};
  }
  if(name==='cinema_import'){
   const media=[];for(const file of a.paths)media.push(await probe(file));
   const p=structuredClone(old);for(const m of media)if(!p.library.some(x=>x.filePath===m.path))p.library.push({name:m.name,kind:m.kind==='audio'?'audio':'video',filePath:m.path});return {...await apply(p,old),media};
  }
  if(name==='cinema_edit'){
   if(a.revision!==model.revision(old))throw Error('El proyecto ha cambiado. Lee cinema_project y utiliza su revisión actual');
   return apply(await model.edit(old,a.operations,probe),old);
  }
  if(name==='cinema_range'){const p=structuredClone(old);p.renderRange=a.clear?null:{start:a.start,end:a.end};return apply(p,old);}
  if(name==='cinema_history'){await evaluate('history',{redo:a.action==='redo'});return model.describe(await current());}
  if(name==='cinema_subtitle_import'){
   const file=absolute(a.path);if((await fs.stat(file)).size>8*1024*1024)throw Error('SRT demasiado grande');const cues=require('../dist/assets/subtitle-model.js').parse(await fs.readFile(file,'utf8'));
   const p=structuredClone(old);p.tracks.push({id:'sub-'+crypto.randomUUID(),kind:'subtitle',name:a.name||path.basename(file),envelope:[],clips:subtitleClips(cues)});return apply(p,old);
  }
  if(name==='cinema_render'){
   const output=await destination(a.path,a.overwrite,a.profile),options={profile:a.profile,width:a.width||1280,height:a.height||720,fps:a.fps||24,output};
   const ticket=authorizeRender(options);return startJob('render',()=>evaluate('render',{...options,ticket}));
  }
  if(name==='cinema_transcribe'){
   const trackIndex=old.tracks.findIndex(t=>t.id===a.trackId);if(trackIndex<0||old.tracks[trackIndex].kind!=='audio')throw Error('Selecciona una pista de audio, incluida la asociada a un vídeo');
   return startJob('subtitles',()=>subtitles.transcribe({project:{...old,renderRange:null},trackIndex,clipIndex:null,engine:a.engine||'faster-int8',language:a.language||'es'},p=>{if(job?.state==='running')job.progress=p;}));
  }
  if(name==='cinema_apply_subtitles'){
   if(job?.kind!=='subtitles'||job.state!=='completed'||job.applied)throw Error('No hay subtítulos terminados pendientes de insertar');if(a.revision!==model.revision(old))throw Error('Lee la revisión actual antes de insertar');
   const p=structuredClone(old);p.tracks.push({id:'sub-'+crypto.randomUUID(),kind:'subtitle',name:a.name||'Subtítulos MCP',envelope:[],clips:subtitleClips(job.result.cues)});const result=await apply(p,old);job.applied=true;return result;
  }
  throw Error('Herramienta no implementada');
 }
 async function setEnabled(value){
  if(typeof value!=='boolean')throw Error('Estado MCP no válido');
  if(value===enabled)return status();
  await fs.mkdir(directory,{recursive:true});
  if(!value){enabled=false;for(const socket of connections)socket.destroy();if(server){server.close();server=null;}await fs.rm(descriptor,{force:true});if(job?.state==='running'){job.cancelRequested=true;subtitles.cancel();await evaluate('cancel').catch(()=>{});}}
  else{
   token=crypto.randomBytes(32).toString('hex');server=http.createServer(async(req,res)=>{
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    if(req.headers.origin||req.headers.authorization!=='Bearer '+token||req.method!=='POST'||req.url!=='/call'){res.writeHead(403);return res.end(JSON.stringify({error:'Acceso local no autorizado'}));}
    try{
     let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>16*1024*1024){res.writeHead(413);return res.end('{}');}chunks.push(chunk);}
     const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));const next=queue.then(()=>{if(!enabled||req.headers.authorization!=='Bearer '+token)throw Error('MCP desactivado o sesión caducada');return call(data.name,data.arguments||{});});queue=next.catch(()=>{});const result=await next;res.end(JSON.stringify({result}));
    }catch(e){if(!res.destroyed)res.end(JSON.stringify({error:e.message}));}
   });server.on('connection',s=>{connections.add(s);s.on('close',()=>connections.delete(s));});
   await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});enabled=true;
   await fs.writeFile(descriptor,JSON.stringify({port:server.address().port,token,pid:process.pid}),{mode:0o600});
  }
  await fs.writeFile(settings,JSON.stringify({enabled,recording:recordingAllowed}));return status();
 }
 // Screen recording by an MCP client is a separate, explicit opt-in (off by default).
 async function setRecordingAllowed(value){if(typeof value!=='boolean')throw Error('Permiso de grabación no válido');recordingAllowed=value;await fs.mkdir(directory,{recursive:true});await fs.writeFile(settings,JSON.stringify({enabled,recording:recordingAllowed}));return status();}
 function status(){return {enabled,recordingAllowed,directory,transport:'stdio',job:job?{id:job.id,state:job.state,kind:job.kind}:null};}
 async function initialize(){try{const saved=JSON.parse(await fs.readFile(settings,'utf8'));recordingAllowed=saved.recording===true;if(saved.enabled)await setEnabled(true);}catch(e){if(e.code!=='ENOENT')console.warn('MCP local:',e.message);}}
 function close(){enabled=false;for(const s of connections)s.destroy();server?.close();server=null;try{require('node:fs').unlinkSync(descriptor);}catch{}}
 return {initialize,setEnabled,setRecordingAllowed,status,close,call,probe};
}
module.exports={createBridge};
