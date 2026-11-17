// End-to-end: real stdio client -> authenticated bridge -> editor -> LQTS + PNG + FFmpeg.
const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),http=require('node:http');
const {spawn,execFile}=require('node:child_process'),run=require('node:util').promisify(execFile);
const root=path.join(app.getPath('temp'),'cinema-mcp-test-'+process.pid);
const pack=process.argv[2]?path.join(path.resolve(process.argv[2]),'resources','app','desktop'):__dirname;
app.setPath('userData',path.join(root,'profile'));
require(path.join(pack,'main.cjs'));
let client;
app.whenReady().then(async()=>{
 const watchdog=setTimeout(()=>{console.error('MCP test timeout');app.exit(1);},180000);
 try{
  await fs.mkdir(root,{recursive:true});
  const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
  const js=code=>win.webContents.executeJavaScript(code,true);await js('demoReady');
  assert(await js('!!window.CinemaAutomation'));
  const config=await js('window.lqtacDesktop.mcpConfig()');
  const env={...process.env,...config.configuration.mcpServers['cinema-studio'].env};
  client=spawn(process.execPath,[path.join(pack,'mcp-server.cjs')],{env,stdio:['pipe','pipe','pipe'],windowsHide:true});
  const waiting=new Map();let seq=0,buffer='',stderr='';client.stderr.on('data',d=>stderr+=d);client.stdout.on('data',d=>{buffer+=d;const lines=buffer.split('\n');buffer=lines.pop();for(const line of lines){let m;try{m=JSON.parse(line);}catch{throw Error('Non-JSON stdout: '+line);}const w=waiting.get(m.id);if(w){waiting.delete(m.id);w.resolve(m);}}});
  client.on('exit',code=>{for(const w of waiting.values())w.reject(Error('stdio exited '+code+' '+stderr));});
  function request(method,params){const id=++seq;return new Promise((resolve,reject)=>{waiting.set(id,{resolve,reject});client.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});}
  async function call(name,args={},expectError=false){const r=await request('tools/call',{name,arguments:args});assert(!r.error,JSON.stringify(r));if(expectError){assert(r.result.isError);return r.result.content[0].text;}assert(!r.result.isError,r.result.content?.[0]?.text);if(r.result.content[0].type==='image')return r.result;return JSON.parse(r.result.content[0].text);}
  const init=await request('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'cinema-test',version:'1'}});assert.equal(init.result.protocolVersion,'2025-11-25');client.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  assert((await request('tools/list')).result.tools.length>=15);
  assert.match(await call('cinema_status',{},true),/activa/);
  await js('window.lqtacDesktop.mcpEnable(true)');
  await js("document.querySelector('[data-mcp-control=open]').click()");
  for(let i=0;i<40&&!await js("document.querySelector('#mcpDialog').open");i++)await new Promise(r=>setTimeout(r,25));
  assert(await js("document.querySelector('#mcpDialog').open"));
  await new Promise(r=>setTimeout(r,100));await fs.writeFile(path.join(root,'mcp-dialog.png'),(await win.webContents.capturePage()).toPNG());await js("document.querySelector('#mcpClose').click()");
  const connection=JSON.parse(await fs.readFile(path.join(root,'profile','mcp','connection.json'),'utf8'));
  const rejected=await new Promise((resolve,reject)=>{const q=http.request({host:'127.0.0.1',port:connection.port,path:'/call',method:'POST'},r=>{r.resume();resolve(r.statusCode);});q.on('error',reject);q.end('{}');});assert.equal(rejected,403);
  await call('cinema_new',{name:'Prueba MCP funcional',discardCurrent:true});
  const ffmpeg=require(path.join(pack,'render-engine.cjs')).ffmpegPath(),media=path.join(root,'video y audio.mp4');
  await run(ffmpeg,['-v','error','-y','-f','lavfi','-i','testsrc2=size=320x180:rate=10:duration=2','-f','lavfi','-i','sine=frequency=440:duration=2','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',media],{windowsHide:true});
  const imported=await call('cinema_import',{paths:[media]});assert.equal(imported.media[0].hasAudio,true);assert(imported.media[0].duration>=2);
  let p=await call('cinema_edit',{revision:imported.revision,operations:[{op:'addTrack',id:'V1',kind:'video',name:'Vídeo MCP'},{op:'insertClip',trackId:'V1',path:media,start:0,duration:2}]});
  assert.equal(p.project.tracks.length,2);assert.equal(p.project.tracks[0].clips[0].groupId,p.project.tracks[1].clips[0].groupId);
  const audioId=p.project.tracks[1].id;
  assert.match(await call('cinema_edit',{revision:'obsolete',operations:[{op:'removeTrack',trackId:'V1'}]},true),/cambiado/);
  const old=p.revision;
  assert.match(await call('cinema_edit',{revision:p.revision,operations:[{op:'addTrack',id:'invalid-atomic',kind:'audio'},{op:'insertClip',trackId:'does-not-exist',path:media}]},true),/pista/);
  assert.equal((await call('cinema_project')).revision,old);
  p=await call('cinema_edit',{revision:p.revision,operations:[{op:'updateClip',ref:'V1:0',patch:{startSeconds:.25,fadeInSeconds:.2,fadeOutSeconds:.2,videoFx:{enabled:true,saturation:0,animation:{saturation:[{time:0,value:1},{time:2,value:0}]}}}},{op:'envelope',trackId:audioId,points:[{time:0,value:1},{time:2,value:.5}]},{op:'addTrack',id:'titles',kind:'video',name:'Títulos'},{op:'title',trackId:'titles',text:'MCP FUNCIONA',start:.25,duration:2},{op:'addTrack',id:'subs',kind:'subtitle'},{op:'subtitle',trackId:'subs',text:'Subtítulos de prueba',start:.25,duration:1.5}]});
  assert.equal(p.project.tracks[1].clips[0].startSeconds,.25);
  assert.equal(p.project.tracks[2].clips[0].generator.objects[0].text,'MCP FUNCIONA');
  await call('cinema_history',{action:'undo'});assert.equal((await call('cinema_project')).project.tracks.length,2);
  await call('cinema_history',{action:'redo'});assert.equal((await call('cinema_project')).project.tracks.length,4);
  p=await call('cinema_project');
  await call('cinema_edit',{revision:p.revision,operations:[{op:'reorderTrack',trackId:'titles',index:0}]});
  const saved=path.join(root,'Montaje.LQTS');await call('cinema_save',{path:saved});await fs.stat(saved);
  assert.match(await call('cinema_save',{path:saved},true),/existe/);
  await call('cinema_new',{name:'Temporal',discardCurrent:true});await call('cinema_open',{path:saved});
  const preview=await call('cinema_preview',{time:1,path:path.join(root,'preview.png')});assert.equal(preview.content[0].type,'image');assert((await fs.stat(path.join(root,'preview.png'))).size>2000);
  await call('cinema_range',{start:.5,end:1.5});assert.deepEqual((await call('cinema_project')).project.renderRange,{start:.5,end:1.5});
  const output=path.join(root,'Render.mp4');await call('cinema_render',{path:output,profile:'mp4',width:640,height:360,fps:10});
  let status;for(let i=0;i<600;i++){status=await call('cinema_status');if(status.job.state!=='running')break;await new Promise(r=>setTimeout(r,100));}
  assert.equal(status.job.state,'completed',JSON.stringify(status.job));assert((await fs.stat(output)).size>5000);
  let info='';try{await run(ffmpeg,['-hide_banner','-i',output],{windowsHide:true});}catch(e){info=e.stderr;}assert.match(info,/Video:/);assert.match(info,/Audio:/);assert.match(info,/640x360/);
  assert.match(info,/Duration: 00:00:01\./);
  await call('cinema_render',{path:path.join(root,'Cancel.mp4'),profile:'mp4',width:1920,height:1080,fps:30});await call('cinema_cancel');
  for(let i=0;i<100;i++){status=await call('cinema_status');if(status.job.state!=='running')break;await new Promise(r=>setTimeout(r,50));}assert.equal(status.job.state,'cancelled',JSON.stringify(status.job));
  const srt=path.join(root,'Import.srt');await fs.writeFile(srt,'1\n00:00:00,250 --> 00:00:01,250\nImportado mediante MCP\n');await call('cinema_subtitle_import',{path:srt});
  assert.equal((await call('cinema_project')).project.tracks.at(-1).clips[0].subtitleText,'Importado mediante MCP');
  if(process.argv.includes('--speech')){
   await call('cinema_transcribe',{trackId:audioId,engine:'faster-int8',language:'es'});
   for(let i=0;i<1200;i++){status=await call('cinema_status');if(status.job.state!=='running')break;await new Promise(r=>setTimeout(r,100));}
   assert.equal(status.job.state,'completed',JSON.stringify(status.job));
   const before=await call('cinema_project');await call('cinema_apply_subtitles',{revision:before.revision,name:'Transcripción offline MCP'});assert.equal((await call('cinema_project')).project.tracks.at(-1).name,'Transcripción offline MCP');
   console.log('PASS real Faster INT8 transcription job and explicit subtitle insertion');
  }
  // --- Whole-program access through the interface.
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let ui=await call('cinema_ui_snapshot',{scope:'menus'});
  assert(ui.menus.length>30,'menus '+ui.menus.length);
  const about=ui.menus.find(m=>/^Acerca de/.test(m.label));assert(about,'about command');
  const capture=ui.menus.find(m=>m.blocked&&/Grabar|Capturar/.test(m.label));assert(capture,'capture commands flagged');
  assert(!ui.menus.some(m=>/Control MCP/.test(m.label)&&!m.blocked),'MCP panel not reachable');
  await call('cinema_ui_action',{action:'command',target:about.ref});
  ui=await call('cinema_ui_snapshot');assert(ui.dialogs.some(d=>d.modal)&&ui.focus==='dialog'&&ui.controls.length>0,JSON.stringify(ui.dialogs));
  await call('cinema_ui_action',{action:'close'});
  ui=await call('cinema_ui_snapshot');assert(!ui.dialogs.some(d=>d.modal),JSON.stringify(ui.dialogs));
  assert.match(await call('cinema_ui_action',{action:'command',target:capture.ref},true),/grabaci/i);
  assert.match(await call('cinema_ui_action',{action:'click',target:'#mcpEnabled'},true),/grabaci|MCP/i);
  const shot=await call('cinema_ui_screenshot',{maxWidth:800});assert.equal(shot.content[0].type,'image');
  // Native dialogs answered in advance: open a LQTS through the File menu.
  await call('cinema_new',{name:'Temporal UI',discardCurrent:true});
  const openCommand=ui.menus.find(m=>/Abrir proyecto \.LQTS/.test(m.label));
  await call('cinema_ui_action',{action:'command',target:openCommand.ref,files:[saved],accept:true,waitMs:2500});
  for(let i=0;i<40&&(await call('cinema_project')).project.name!=='Prueba MCP funcional';i++)await sleep(100);
  assert.equal((await call('cinema_project')).project.name,'Prueba MCP funcional');
  // Settings in a dialog: clip context menu and a field change.
  await call('cinema_ui_action',{action:'contextmenu',target:'clip:V1:0'});
  ui=await call('cinema_ui_snapshot',{scope:'all'});assert(ui.controls.length>0);
  await call('cinema_ui_action',{action:'menus'});
  // --- Screen recording: opt-in, sources, thumbnail, region take inserted in the project.
  assert.match(await call('cinema_record_sources',{},true),/desactivada/);
  await js('window.lqtacDesktop.mcpRecording(true)');
  const sources=await call('cinema_record_sources');const screenSource=sources.sources.find(s=>s.kind==='screen');
  assert(screenSource&&screenSource.display.pixelWidth>=640,JSON.stringify(sources.sources.slice(0,3)));
  const thumb=await call('cinema_record_thumbnail',{sourceId:screenSource.id,width:640});assert.equal(thumb.content[0].type,'image');
  assert.match(await call('cinema_record_start',{sourceId:screenSource.id,path:path.join(root,'Fuera.webm'),region:{x:0,y:0,width:screenSource.display.pixelWidth+500,height:100}},true),/sale de la pantalla/);
  const tracksBefore=(await call('cinema_project')).project.tracks.length;
  const take=path.join(root,'Zona pantalla.webm');
  const started=await call('cinema_record_start',{sourceId:screenSource.id,path:take,region:{x:100,y:80,width:640,height:360},quality:1080});
  assert.equal(started.state,'recording',JSON.stringify(started));assert(started.region?.fraction,JSON.stringify(started.region));
  await sleep(1500);status=await call('cinema_status');assert.equal(status.recording.state,'recording');
  await call('cinema_record_control',{action:'pause'});await sleep(300);await call('cinema_record_control',{action:'resume'});await sleep(1200);
  const stopped=await call('cinema_record_control',{action:'stop'});
  assert.equal(stopped.result.saved.filePath,take,JSON.stringify(stopped));
  let takeInfo='';try{await run(ffmpeg,['-hide_banner','-i',take],{windowsHide:true});}catch(e){takeInfo=e.stderr;}
  const px=started.region.pixels;assert.match(takeInfo,new RegExp(px.width+'x'+px.height),takeInfo.slice(-400));
  assert.equal((await call('cinema_project')).project.tracks.length,tracksBefore+1,'take inserted');
  assert.equal((await call('cinema_status')).recording.state,'none');
  await js('window.lqtacDesktop.mcpRecording(false)');assert.match(await call('cinema_record_sources',{},true),/desactivada/);
  const configs=await js('window.lqtacDesktop.mcpConfig()');assert.match(configs.codex,/\[mcp_servers\.cinema-studio\]/);assert.match(configs.claudeCommand,/^claude mcp add cinema-studio/);
  await js('window.lqtacDesktop.mcpEnable(false)');assert.match(await call('cinema_status',{},true),/activa/);
  console.log(JSON.stringify({passed:true,root,tools:(await request('tools/list')).result.tools.length,checks:['stdio negotiation','opt-in','unauthenticated denied','import AV','group sync','atomic failure','stale revision','title + subtitles + animated FX + envelope','undo redo','LQTS save/open','PNG preview','MP4 video+audio render','render range','cancel render','SRT import','UI menus/dialogs/close','capture + MCP panel blocked in UI','native file + message dialog answers','window screenshot','recording opt-in','screen region take inserted','Claude/Codex configs','disable']}));
  client.stdin.end();client.kill();clearTimeout(watchdog);app.exit(0);
 }catch(e){console.error(e.stack);client?.kill();clearTimeout(watchdog);app.exit(1);}
});
