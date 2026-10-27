const fs=require('node:fs/promises'),sync=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const engine=require('./render-engine.cjs');let current=null;
function status(){const root=path.join(__dirname,'stems'),exe=path.join(root,'bin','lqtac-stems.exe'),models=path.join(root,'models');let manifest;try{manifest=JSON.parse(sync.readFileSync(path.join(root,'bin','runtime-manifest.json'),'utf8'));}catch{}return {ready:manifest?.engine==='demucs-cpu'&&sync.existsSync(exe)&&sync.existsSync(path.join(models,'htdemucs.yaml'))&&sync.existsSync(path.join(models,'955717e8-8726e21a.th')),exe,models,name:'Demucs · 4 pistas · CPU · offline',active:!!current};}
function cancel(){if(current){current.cancelled=true;current.child?.kill();current.render?.cancel();}}
async function sources(project){
 require('./project-io.cjs').validateProject(project);const found=[],files=new Map();
 for(const [trackIndex,track] of project.tracks.entries()){
  const clips=[];for(const [clipIndex,clip] of track.clips.entries()){
   if(clip.kind!=='audio'||!clip.filePath||!Number.isFinite(clip.durationSeconds)||clip.durationSeconds<=0||clip.durationSeconds>1800)continue;
   if(!files.has(clip.filePath))files.set(clip.filePath,fs.stat(clip.filePath).then(s=>s.isFile()).catch(()=>false));
   if(await files.get(clip.filePath))clips.push({clipIndex,name:clip.name||'Audio',startSeconds:clip.startSeconds,durationSeconds:clip.durationSeconds});
  }
  if(clips.length)found.push({trackIndex,name:track.name||track.id||'Pista de audio',clips});
 }return found;
}
function run(job,exe,args,progress,json=false){return new Promise((resolve,reject)=>{if(job.cancelled)return reject(Error('Separación cancelada'));const child=spawn(exe,args,{windowsHide:true,cwd:path.dirname(exe),env:{...process.env,HF_HUB_OFFLINE:'1'}});job.child=child;let stderr='',pending='';child.stdout.on('data',data=>{if(!json)return;pending+=data;const lines=pending.split('\n');pending=lines.pop().slice(-65536);for(const line of lines)try{const p=JSON.parse(line);if(typeof p.stage==='string'&&Number.isFinite(p.progress))progress({stage:p.stage,progress:Math.max(0,Math.min(1,p.progress))});}catch{}});child.stderr.on('data',d=>stderr=(stderr+d.toString()).slice(-8000));child.on('error',reject);child.on('close',code=>{job.child=null;if(job.cancelled)reject(Error('Separación cancelada'));else if(code)reject(Error(stderr||'El motor de separación ha fallado'));else resolve();});});}
function plan(options){
 require('./project-io.cjs').validateProject(options.project);const track=options.project.tracks[options.trackIndex],clip=track?.clips[options.clipIndex];
 if(!clip?.filePath||clip.kind==='subtitle'||clip.generator)throw Error('Selecciona un evento con audio');
 if(clip.durationSeconds>1800)throw Error('La prueba admite un máximo de 30 minutos por evento');
 const at=t=>{const a=track.envelope;if(!a.length)return 1;if(t<=a[0].time)return a[0].value;for(let i=1;i<a.length;i++)if(t<=a[i].time){const l=a[i-1],r=a[i];return l.value+(r.value-l.value)*(t-l.time)/(r.time-l.time);}return a.at(-1).value;};
 const start=clip.startSeconds,end=start+clip.durationSeconds,audioTrack=track.kind==='audio';
 const source={...structuredClone(clip),kind:'audio',mute:false,startSeconds:0};
 const isolated={...structuredClone(options.project),time:0,renderRange:null,tracks:[{...structuredClone(track),kind:'audio',mute:false,solo:false,gain:audioTrack?(track.gain??1):1,pan:audioTrack?(track.pan??0):0,karaokeSync:undefined,karaokeEnabled:undefined,envelope:audioTrack?[{time:0,value:at(start)},...track.envelope.filter(p=>p.time>start&&p.time<end).map(p=>({time:p.time-start,value:p.value})),{time:clip.durationSeconds,value:at(end)}]:[],clips:[source]}]};
 return {project:isolated,start,duration:clip.durationSeconds,name:clip.name||'Audio'};
}
async function separate(options,progress=()=>{}){
 if(current)throw Error('Ya hay una separación en curso');const runtime=status();if(!runtime.ready)throw Error('Falta el motor Demucs local o su modelo. No se descarga nada al utilizar esta herramienta.');
 const source=plan(options);if(typeof options.outputDirectory!=='string'||!path.isAbsolute(options.outputDirectory))throw Error('Elige una carpeta de destino');
 const parent=await fs.realpath(options.outputDirectory);if(!(await fs.stat(parent)).isDirectory())throw Error('El destino no es una carpeta');
 const job={cancelled:false};current=job;let folder,temporary,success=false;
 try{
  folder=await fs.mkdtemp(path.join(parent,'LQTAC_Stems_'));temporary=await fs.mkdtemp(path.join(os.tmpdir(),'lqtac-stems-'));
  progress({stage:'Preparando audio editado',progress:0});job.render=await engine.startRender({project:source.project,range:null,profile:'wav',output:path.join(temporary,'mix.wav')},p=>progress({stage:'Preparando audio editado',progress:p*.1}));if(job.cancelled)job.render.cancel();await job.render.finish();job.render=null;
  await run(job,engine.ffmpegPath(),['-v','error','-y','-i',path.join(temporary,'mix.wav'),'-ar','44100','-ac','2','-c:a','pcm_f32le',path.join(temporary,'input.wav')],progress);
  await run(job,runtime.exe,['--input',path.join(temporary,'input.wav'),'--output',folder,'--models',runtime.models,'--threads',String(Math.min(4,os.availableParallelism?.()||4))],p=>progress({...p,progress:.1+.9*p.progress}),true);
  const result=JSON.parse(await fs.readFile(path.join(folder,'result.json'),'utf8'));
  if(result.model!=='htdemucs'||result.sampleRate!==44100||result.channels!==2||!Number.isFinite(result.durationSeconds)||Math.abs(result.durationSeconds-source.duration)>.01||!Number.isFinite(result.gain)||result.gain<=0||result.gain>1||!Array.isArray(result.files)||result.files.length!==4)throw Error('El resultado del motor no es válido');
  const expected=['vocals','drums','bass','other'];if(expected.some(s=>result.files.filter(f=>f.stem===s&&f.name===s+'.wav').length!==1))throw Error('Falta alguna de las cuatro pistas');
  for(const f of result.files){f.filePath=path.join(folder,f.name);if((await fs.stat(f.filePath)).size<44)throw Error('Pista de salida vacía');}
  if(job.cancelled)throw Error('Separación cancelada');success=true;return {...result,folder,startSeconds:source.start,durationSeconds:source.duration,sourceName:source.name};
 }finally{current=null;if(temporary)await fs.rm(temporary,{recursive:true,force:true}).catch(()=>{});if(folder&&!success)await fs.rm(folder,{recursive:true,force:true}).catch(()=>{});}
}
module.exports={status,cancel,sources,plan,separate};
