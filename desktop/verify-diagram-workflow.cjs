// End-to-end «explainer video» workflow driven like an assistant would, over the real stdio MCP:
// import a vertical talking-head video → transcribe with word timing → find the words → insert step-by-step diagrams at those
// words → camera to the lower half (Pan/Crop + fixed Trajectory) → previews → 1080×1920 MP4.
// Run: electron.exe desktop\verify-diagram-workflow.cjs [portableFolder] --video=<mp4 with speech> [--out=<folder>]
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const arg=k=>process.argv.find(a=>a.startsWith('--'+k+'='))?.slice(k.length+3);
const root=path.join(app.getPath('temp'),'cinema-workflow-'+process.pid),video=arg('video'),out=arg('out')||path.join(root,'out');
const portable=process.argv.slice(2).find(a=>!a.startsWith('--')&&!a.endsWith('.cjs'));
const pack=portable?path.join(path.resolve(portable),'resources','app','desktop'):__dirname;
app.setPath('userData',path.join(root,'profile'));require(path.join(pack,'main.cjs'));
let client;
app.whenReady().then(async()=>{
 const watchdog=setTimeout(()=>{console.error('Workflow timeout');app.exit(1);},900000);
 try{
  if(!video)throw Error('Falta --video=<ruta de un vídeo con voz>');await fs.mkdir(root,{recursive:true});await fs.mkdir(out,{recursive:true});
  const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
  const js=code=>win.webContents.executeJavaScript(code,true);await js('demoReady');
  const config=await js('window.lqtacDesktop.mcpConfig()'),env={...process.env,...config.configuration.mcpServers['cinema-studio'].env};
  client=spawn(process.execPath,[path.join(pack,'mcp-server.cjs')],{env,stdio:['pipe','pipe','pipe'],windowsHide:true});
  const waiting=new Map();let seq=0,buffer='',stderr='';client.stderr.on('data',d=>stderr+=d);client.stdout.on('data',d=>{buffer+=d;const lines=buffer.split('\n');buffer=lines.pop();for(const line of lines){const m=JSON.parse(line),w=waiting.get(m.id);if(w){waiting.delete(m.id);w(m);}}});
  const request=(method,params)=>new Promise(r=>{const id=++seq;waiting.set(id,r);client.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
  const call=async(name,args={})=>{const r=await request('tools/call',{name,arguments:args});if(r.result?.isError)throw Error(name+': '+r.result.content[0].text);const c=r.result.content;return c[0].type==='image'?r.result:c[0].text.startsWith('{')||c[0].text.startsWith('[')?JSON.parse(c[0].text):c[0].text;};
  await request('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'workflow-test',version:'1'}});client.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  const names=(await request('tools/list')).result.tools.map(t=>t.name);for(const t of ['cinema_guide','cinema_transcript'])assert(names.includes(t),t);
  assert.match(await call('cinema_guide',{topic:'diagramas'}),/cinema_transcript/);
  await js('window.lqtacDesktop.mcpEnable(true)');
  const wait=async(label)=>{let s;for(let i=0;i<3000;i++){s=await call('cinema_status');if(s.job?.state!=='running')break;await new Promise(r=>setTimeout(r,200));}assert.equal(s.job.state,'completed',label+': '+JSON.stringify(s.job));return s;};
  // 1. Project with the talking-head video.
  await call('cinema_new',{name:'Explicativo',discardCurrent:true});const media=(await call('cinema_import',{paths:[path.resolve(video)]})).media[0];
  let p=await call('cinema_project');p=await call('cinema_edit',{revision:p.revision,operations:[{op:'addTrack',id:'CAM',kind:'video',name:'Cámara'},{op:'insertClip',trackId:'CAM',path:media.path,start:0,duration:media.duration}]});
  const audio=p.project.tracks.find(t=>t.kind==='audio');assert(audio,'audio track from splitAudio');
  // 2. Transcription with word timing.
  await call('cinema_transcribe',{trackId:audio.id,engine:'whisper-cpp',language:'es'});const st=await wait('transcribe');assert(st.job.result.wordCount>20&&st.job.result.words===undefined,'status reports a count, not the list');
  const tr=await call('cinema_transcript');assert.equal(tr.wordTiming,'exact');assert(tr.words.length>20);
  for(let i=1;i<tr.words.length;i++)assert(tr.words[i].startSeconds>=tr.words[i-1].startSeconds-.05,'words in order');
  const first=tr.cues[1]||tr.cues[0],findWord=async(q,from)=>(await call('cinema_transcript',{query:q,from})).matches?.find(m=>m.startSeconds>=from);
  // Scene anchors in speaking order: each one searched after the previous; fall back to the next word when a query is not found.
  const pick=async(qs,from)=>{for(const q of qs){const m=await findWord(q,from);if(m)return m;}const w=tr.words.find(x=>x.startSeconds>from+.3)||tr.words.at(-1);return {text:w.text,startSeconds:w.startSeconds,endSeconds:w.startSeconds+w.durationSeconds};};
  const a1=await pick(['recompilada','versión'],0),a2=await pick(['PC'],a1.endSeconds),a3=await pick(['contrario','camino'],a2.endSeconds);
  assert(a1.startSeconds<a2.startSeconds&&a2.startSeconds<a3.startSeconds,'anchors in order');
  console.log('Anchors:',JSON.stringify([a1,a2,a3]));
  const sceneStart=Math.max(0,a1.startSeconds-.25),d=t=>+Math.max(0,t-sceneStart).toFixed(2),neon=(color,top,text,delay)=>[
   {type:'rect',left:190,top,width:700,height:160,rx:22,ry:22,fill:'#0d1330',stroke:color,strokeWidth:5,glow:{color,size:24,strength:2},anim:{in:{effect:'scale',by:'object',duration:.45,stagger:0,delay,easing:'back'},out:{effect:'fade',by:'object',duration:.4,stagger:0,easing:'smooth'},loop:null}},
   {type:'textbox',text,left:190,top:top+48,width:700,fontSize:52,fontFamily:'Segoe UI',fontWeight:'bold',fill:'#ffffff',textAlign:'center',anim:{in:{effect:'rise',by:'word',duration:.35,stagger:.06,delay:delay+.12,easing:'out'},out:{effect:'fade',by:'object',duration:.4,stagger:0,easing:'smooth'},loop:null}}];
  const duration=+Math.max(3,a3.endSeconds+1-sceneStart).toFixed(2);
  const diagram={version:1,type:'title',name:'Escena PS5 → PC',duration,background:null,canvas:{width:1080,height:1920},objects:[
   {type:'rect',left:0,top:0,width:1080,height:960,fill:'#0b0820',anim:{in:{effect:'fade',by:'object',duration:.25,stagger:0,delay:0,easing:'out'},out:{effect:'fade',by:'object',duration:.4,stagger:0,easing:'smooth'},loop:null}},
   ...neon('#33d6ff',140,'versión de PS5',d(a1.startSeconds)),
   {type:'path',path:'M0 0 C 150 60 150 140 0 200',left:540,top:320,stroke:'#ffffff',strokeWidth:8,fill:null,arrow:'end',glow:{color:'#33d6ff',size:14,strength:1},anim:{in:{effect:'draw',by:'object',duration:.5,stagger:0,delay:Math.max(0,d(a2.startSeconds)-.1),easing:'out'},out:{effect:'fade',by:'object',duration:.4,stagger:0,easing:'smooth'},loop:null}},
   ...neon('#b26bff',540,'PC',d(a2.startSeconds)+.2),
   {type:'path',path:'M0 0 L100 100 M100 0 L0 100',left:910,top:570,stroke:'#ff3d6e',strokeWidth:14,fill:null,glow:{color:'#ff3d6e',size:16,strength:2},anim:{in:{effect:'draw',by:'object',duration:.4,stagger:0,delay:d(a3.startSeconds),easing:'out'},out:{effect:'fade',by:'object',duration:.4,stagger:0,easing:'smooth'},loop:null}},
   {type:'textbox',text:'proyectos · {n}',count:{from:0,to:26503,duration:1,delay:d(a3.startSeconds)},left:140,top:770,width:800,fontSize:50,fontFamily:'Consolas',fontWeight:'bold',fill:'#3df5a0',textAlign:'center',anim:{in:{effect:'fade',by:'object',duration:.3,stagger:0,delay:d(a3.startSeconds),easing:'out'},out:{effect:'fade',by:'object',duration:.4,stagger:0,easing:'smooth'},loop:null}}],
   motion:{preset:'none',in:0,out:0,easing:'smooth'},keys:[]};
  // 3. Graphics track on top, diagram at the first word, camera in the lower half while it plays.
  p=await call('cinema_project');p=await call('cinema_edit',{revision:p.revision,operations:[{op:'addTrack',id:'GFX',kind:'video',name:'Gráficos'},{op:'reorderTrack',trackId:'GFX',index:0},{op:'title',trackId:'GFX',start:+sceneStart.toFixed(2),generator:diagram}]});
  assert.equal(p.project.tracks[0].id,'GFX');const cam=p.references.find(r=>r.trackId==='CAM');
  p=await call('cinema_edit',{revision:p.revision,operations:[{op:'updateClip',ref:cam.ref,patch:{panCrop:[{time:0,x:.5,y:.4,width:1,height:.5,rotation:0}],motionPath:{anchor:{x:.5,y:.5},nodes:[{x:.5,y:.75},{x:.5,y:.75}],start:0,end:+media.duration.toFixed(2),orient:'none',inertia:0,scale:1}},includeGroup:false}]});
  // 4. Previews: before the diagram, while it builds, when complete.
  const times=[Math.max(0,sceneStart-.5),a1.startSeconds+.3,a2.startSeconds+.6,a3.startSeconds+1.2].map(t=>+Math.min(media.duration-.05,t).toFixed(2));
  for(const t of times){const r=await call('cinema_preview',{time:t,width:540,height:960,path:path.join(out,'workflow-'+t.toFixed(2)+'s.png'),overwrite:true});assert(r.content[0].data.length>5000);}
  // 5. Vertical render of the scene.
  await call('cinema_range',{start:Math.max(0,sceneStart-.5),end:Math.min(media.duration,sceneStart+duration+.3)});
  await call('cinema_render',{path:path.join(out,'workflow.mp4'),profile:'mp4',width:1080,height:1920,fps:30,overwrite:true});await wait('render');
  const size=(await fs.stat(path.join(out,'workflow.mp4'))).size;assert(size>100000,'render size '+size);
  await call('cinema_save',{path:path.join(out,'workflow.lqts'),overwrite:true});
  console.log(JSON.stringify({passed:true,out,words:tr.words.length,scene:{start:sceneStart,duration},previews:times,mp4:size}));
  clearTimeout(watchdog);client.kill();app.exit(0);
 }catch(e){console.error(e);client?.kill();app.exit(1);}
});
