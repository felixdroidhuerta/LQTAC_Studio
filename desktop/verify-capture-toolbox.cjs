const {app,BrowserWindow,dialog,desktopCapturer,screen,nativeImage}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const root=path.join(app.getPath('temp'),'lqtac-toolbox-test-'+process.pid);
app.setPath('userData',path.join(root,'profile'));require('./main.cjs');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{const timeout=setTimeout(()=>app.exit(1),150000);timeout.unref();let cover;
try{
  await fs.mkdir(root,{recursive:true});const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
  const js=c=>win.webContents.executeJavaScript(c,true);await js('demoReady');
  let target=path.join(root,'embedded.webm');dialog.showMessageBox=async()=>({response:0});dialog.showSaveDialog=async()=>({canceled:false,filePath:target});
  const nativeSources=desktopCapturer.getSources.bind(desktopCapturer);
  desktopCapturer.getSources=async()=>[{id:'window:test:0',name:'Owned synthetic video'}];
  await js(`(async()=>{
    await restoreProject({format:'LQTAC Studio',version:1,name:'Toolbox test',library:[],tracks:[]});resetEditHistory();
    window.captureTestOriginal={display:navigator.mediaDevices.getDisplayMedia,media:navigator.mediaDevices.getUserMedia};window.captureTestIntervals=[];window.captureTestContexts=[];window.captureTestTracks=[];
    function tone(f){const c=new AudioContext();captureTestContexts.push(c);const o=c.createOscillator(),g=c.createGain(),d=c.createMediaStreamDestination();o.frequency.value=f;g.gain.value=.2;o.connect(g).connect(d);o.start();c.resume();captureTestTracks.push(...d.stream.getTracks());return d.stream;}
    function image(color,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');let n=0;function draw(){ctx.fillStyle=color;ctx.fillRect(0,0,w,h);ctx.fillStyle='white';ctx.fillRect((n++*3)%(w-12),h-8,10,5);}draw();captureTestIntervals.push(setInterval(draw,30));const s=c.captureStream(30);captureTestTracks.push(...s.getTracks());return s;}
    navigator.mediaDevices.getDisplayMedia=async opts=>{const s=image('#164fa8',640,360);if(opts.audio)s.addTrack(tone(440).getAudioTracks()[0]);return s;};
    navigator.mediaDevices.getUserMedia=async opts=>opts.video?image('#00e040',160,120):tone(880);
    await openScreenRecorder();$('#screenSystemAudio').checked=true;$('#cameraUseAudio').checked=true;$('#screenCameraMode').value='embedded';$('#cameraPosition').value='6';
    await $('#cameraPrepare').onclick();if(cameraSession.state!=='ready')throw Error($('#cameraStatus').textContent);
  })()`);
  const toolbox=()=>BrowserWindow.getAllWindows().find(w=>w.getTitle()==='LQTAC · Captura');
  assert(toolbox()?.isAlwaysOnTop());assert(toolbox().isContentProtected());
  const tool=c=>toolbox().webContents.executeJavaScript(c,true);
  async function waitState(state){for(let i=0;i<100;i++){if(await js('cameraSession?.state')===state)return;await delay(100);}throw Error('Expected '+state+': '+await js("$('#cameraStatus').textContent"));}
  const positionNames=['top-left','top-center','top-right','center-left','center-center','center-right','bottom-left','bottom-center','bottom-right'];
  assert.equal(await tool("document.querySelectorAll('[data-position]').length"),9);assert.equal(await tool("document.querySelectorAll('select,[title]').length"),0);
  assert.equal(await js("$('#screenCameraPosition').options.length"),9);
  for(const position of positionNames){
    await tool(`document.querySelector('[data-position="${position}"]').click()`);
    for(let i=0;i<50;i++){if(await js('cameraSession.capture.state.position')===position)break;await delay(10);}
    const image=nativeImage.createFromBuffer(Buffer.from(await js('cameraSession.capture.snapshot()'),'base64')),bytes=image.toBitmap();
    const [vertical,horizontal]=position.split('-'),x=horizontal==='left'?8:horizontal==='right'?472:240,y=vertical==='top'?8:vertical==='bottom'?232:120;
    const index=((y+60)*640+x+80)*4;assert(bytes[index+1]>180&&bytes[index+2]<60,'Wrong camera position '+position);
    assert.equal(await js("$('#screenCameraPosition').value"),position);
  }
  await delay(300);await fs.writeFile(path.join(root,'toolbox-modern.png'),(await toolbox().webContents.capturePage()).toPNG());
  assert.equal(await tool("document.querySelector('footer').getBoundingClientRect().bottom<=innerHeight"),true,'Toolbox footer clipped');
  await js("window.captureTestSession=cameraSession;$('#cameraClose').onclick()");
  assert.equal(await js("!cameraDialog.open&&!$('.workspace').inert&&cameraSession===captureTestSession&&cameraSession.state==='ready'&&cameraSession.stream.getTracks().every(t=>t.readyState==='live')"),true,'Closing ready panel destroyed capture');
  assert(toolbox().isVisible());
  await tool("document.getElementById('record').click()");await waitState('recording');await delay(1000);
  await tool("document.getElementById('return').click()");for(let i=0;i<50;i++){if(await js('cameraDialog.open'))break;await delay(10);}
  assert.equal(await js('cameraDialog.open'),true,'Toolbox Editor did not reopen panel');
  await js("window.captureTestId=cameraSession.id;$('#cameraClose').onclick()");
  assert.equal(await js("!cameraDialog.open&&cameraSession.id===captureTestId&&cameraSession.state==='recording'&&cameraSession.recorders.every(e=>e.recorder.state==='recording')"),true,'Closing recording panel stopped take');
  await tool("document.getElementById('microphone').click()");await delay(150);assert.equal(await js('cameraSession.capture.state.microphoneMuted'),true);
  const onlySystemStart=await js('(performance.now()-cameraSession.started)/1000');await delay(900);
  await tool("document.getElementById('system').click()");await delay(100);const silenceStart=await js('(performance.now()-cameraSession.started)/1000');await delay(800);
  await tool("document.querySelector('[data-position=top-left]').click();document.getElementById('size').value='35';document.getElementById('size').dispatchEvent(new Event('input'))");
  await delay(150);target=path.join(root,'snapshot.png');await tool("document.getElementById('snapshot').click()");
  for(let i=0;i<50;i++){if(await fs.stat(target).catch(()=>null))break;await delay(100);}
  const snapshot=nativeImage.createFromPath(target);assert.equal(snapshot.getSize().width,640);
  const bitmap=snapshot.toBitmap(),at=(x,y)=>[...bitmap.subarray((y*640+x)*4,(y*640+x)*4+3)];
  assert(at(30,30)[1]>180&&at(30,30)[2]<60,'Camera not composited into top-left snapshot');
  assert(at(500,200)[0]>130&&at(500,200)[1]<110,'Screen pixels missing');
  await tool("document.getElementById('pause').click()");await waitState('paused');const frozen=await js('cameraSession.pausedMs');await delay(900);assert.equal(await js('cameraSession.pausedMs'),frozen);assert.equal(await js("cameraSession.recorders.every(x=>x.recorder.state==='paused')"),true);
  await tool("document.getElementById('pause').click()");await waitState('recording');
  await tool("document.getElementById('microphone').click();document.getElementById('system').click();document.getElementById('camera').click()");await delay(800);
  await fs.writeFile(path.join(root,'toolbox.png'),(await toolbox().webContents.capturePage()).toPNG());
  assert.equal(await js('cameraSession.capture.state.cameraMuted'),true);const withoutCamera=await js('cameraSession.capture.snapshot()');const off=nativeImage.createFromBuffer(Buffer.from(withoutCamera,'base64')).toBitmap();assert(off[(30*640+30)*4]>130&&off[(30*640+30)*4+1]<110,'Camera toggle left overlay visible');
  await tool("document.getElementById('stop').click()");await waitState('done');assert(!toolbox(),'Toolbox not destroyed on finish');
  assert.equal(await js('cameraDialog.open'),true,'Finished hidden recording did not show saved result');
  const saved=await js('cameraSession.saved');assert(saved.durationSeconds>3&&saved.durationSeconds<5.8);assert.equal(await js("timelineClips().length"),2);assert.equal(await js("timelineClips().every(c=>c.dataset.groupId===timelineClips()[0].dataset.groupId)"),true);
  assert.equal(await js("captureTestTracks.every(t=>t.readyState==='ended')"),true);await js("$('#cameraClose').onclick()");
  const ffmpeg=require('./render-engine.cjs').ffmpegPath();
  async function tones(file,start){const r=await run(ffmpeg,['-v','error','-ss',String(start),'-i',file,'-t','0.45','-vn','-ar','48000','-ac','1','-f','f32le','pipe:1'],{windowsHide:true,encoding:'buffer',maxBuffer:8*1024**2});const b=r.stdout,n=Math.floor(b.length/4);return [440,880].map(f=>{let a=0,c=0;for(let i=0;i<n;i++){const v=b.readFloatLE(i*4);a+=v*Math.cos(2*Math.PI*f*i/48000);c+=v*Math.sin(2*Math.PI*f*i/48000);}return 2*Math.hypot(a,c)/n;});}
  let magnitudes=await tones(saved.filePath,.25);assert(magnitudes.every(x=>x>.04),'Initial mix missing a tone');
  magnitudes=await tones(saved.filePath,onlySystemStart+.15);assert(magnitudes[0]>.04&&magnitudes[1]<.005,'Microphone mute did not reach saved audio');
  magnitudes=await tones(saved.filePath,silenceStart+.15);assert(magnitudes.every(x=>x<.005),'System mute did not reach saved audio');
  console.log('Nine camera anchors verified by pixels; no native selects/tooltips; close panel preserves ready/recording take; Editor reopens same session; finish shows result. Toolbox controls, decoded mutes, PNG, grouped tracks and cleanup OK');
  target=path.join(root,'separate.webm');
  await js("(async()=>{await restoreProject({format:'LQTAC Studio',version:1,name:'Separate',library:[],tracks:[]});resetEditHistory();await openScreenRecorder();$('#screenCameraMode').value='separate';$('#cameraUseAudio').checked=true;$('#cameraPosition').value='3';await $('#cameraPrepare').onclick();await $('#cameraRecord').onclick();})()");await waitState('recording');await delay(1300);
  await tool("document.getElementById('pause').click()");await waitState('paused');await delay(600);await tool("document.getElementById('pause').click()");await waitState('recording');await delay(700);await tool("document.getElementById('stop').click()");await waitState('done');
  const separate=await js('cameraSession.saved');console.log('Separate timing '+JSON.stringify({root,screen:separate.durationSeconds,camera:separate.camera?.durationSeconds,offset:separate.camera?.startOffsetSeconds}));assert(separate.camera);assert(Math.abs(separate.durationSeconds-separate.camera.durationSeconds)<.15,'Camera duration drift');assert(separate.camera.startOffsetSeconds<.05);
  assert.equal(await js('timelineClips().length'),3);assert.equal(await js('undoHistory.length'),1);
  assert.equal(await js("timelineClips().every(c=>c.dataset.groupId===timelineClips()[0].dataset.groupId)"),true);
  assert.equal(await js("timelineClips().every(c=>Math.abs(clipTiming(c).startSeconds-3)<.05)"),true);
  const io=require('./project-io.cjs');await io.saveProject(path.join(root,'capture.LQTS'),await js('projectSnapshot()'));assert.equal((await io.openProject(path.join(root,'capture.LQTS'))).missing.length,0);
  async function pixel(file){const r=await run(ffmpeg,['-v','error','-ss','0.5','-i',file,'-frames:v','1','-vf','scale=1:1','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{encoding:'buffer',windowsHide:true});return [...r.stdout];}
  assert((await pixel(separate.filePath))[2]>120);assert((await pixel(separate.camera.filePath))[1]>160);
  const decoded=await run(ffmpeg,['-hide_banner','-i',separate.camera.filePath,'-t','0.1','-f','null','-'],{windowsHide:true});assert(!/Audio:/.test(decoded.stderr),'Camera should not duplicate audio');
  await js("$('#cameraClose').onclick()");
  console.log('Separate screen/camera WebM decode, common pause, <150 ms duration difference, synchronized linked tracks, one undo and LQTS roundtrip OK');
  // A companion failure preserves the already saved primary; retry saves only the pending companion.
  const recorder=require('./capture-recording.cjs');const partial=await recorder.start(path.join(root,'partial.webm'),true);
  await recorder.append(partial.id,await fs.readFile(separate.filePath));await recorder.append(partial.cameraId,await fs.readFile(separate.camera.filePath));await fs.writeFile(partial.cameraFilePath,'occupied',{flag:'wx'});
  await assert.rejects(recorder.finish(partial.id),/Pantalla ya guardada/);assert((await fs.stat(partial.filePath)).size>0);assert(recorder.active());
  const retried=await recorder.finish(partial.id,path.join(root,'retry.webm'));assert.equal(retried.filePath,partial.filePath);assert.equal(retried.camera.filePath,path.join(root,'retry_camara.webm'));assert(!recorder.active());assert.equal(await fs.readFile(partial.cameraFilePath,'utf8'),'occupied');
  console.log('Partial save failure preserves screen, no overwrite; retry completes only the camera OK');
  await js(`(async()=>{navigator.mediaDevices.getDisplayMedia=captureTestOriginal.display;navigator.mediaDevices.getUserMedia=captureTestOriginal.media;captureTestIntervals.forEach(clearInterval);await Promise.all(captureTestContexts.map(c=>c.close()));})()`);
  // Cover an entire monitor with our own fixture before capturing the desktop; no personal content is captured.
  const display=screen.getPrimaryDisplay();cover=new BrowserWindow({...display.bounds,frame:false,fullscreen:true,alwaysOnTop:true,skipTaskbar:true,backgroundColor:'#164fa8',webPreferences:{backgroundThrottling:false}});
  await cover.loadURL('data:text/html,'+encodeURIComponent('<body style="margin:0;background:#164fa8;overflow:hidden"><canvas></canvas><script>const c=document.querySelector("canvas");c.width=innerWidth;c.height=innerHeight;const ctx=c.getContext("2d");let n=0;setInterval(()=>{ctx.fillStyle="#164fa8";ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle="#ffbf55";ctx.fillRect((n++*5)%(c.width-20),c.height-20,15,10)},33)</script>'));
  cover.show();cover.setFullScreen(true);cover.moveTop();win.hide();await delay(800);
  const screens=await nativeSources({types:['screen'],thumbnailSize:{width:0,height:0}});const source=screens.find(s=>s.display_id===String(display.id));assert(source,'Monitor source missing');desktopCapturer.getSources=async()=>[source];
  target=path.join(root,'excluded.webm');await js(`(async()=>{navigator.mediaDevices.getUserMedia=async()=>{const canvas=document.createElement('canvas');canvas.width=160;canvas.height=120;const ctx=canvas.getContext('2d');window.exclusionCameraTimer=setInterval(()=>{ctx.fillStyle='#00e040';ctx.fillRect(0,0,160,120)},30);return canvas.captureStream(30);};await openScreenRecorder();$('#screenCameraMode').value='embedded';await $('#cameraPrepare').onclick();if(cameraSession.state!=='ready')throw Error($('#cameraStatus').textContent);})()`);
  await tool("document.getElementById('camera').click()");await delay(200);await js("$('#cameraClose').onclick()");
  assert(toolbox().isVisible()&&toolbox().isAlwaysOnTop()&&toolbox().isContentProtected());const bounds=toolbox().getBounds();await delay(800);
  await tool("document.getElementById('record').click()");await waitState('recording');await delay(400);
  for(const position of positionNames){await tool(`document.querySelector('[data-position="${position}"]').click()`);await delay(90);}
  await delay(500);
  const screenSnapshot=await js('cameraSession.capture.snapshot()');const image=nativeImage.createFromBuffer(Buffer.from(screenSnapshot,'base64')),dim=image.getSize(),data=image.toBitmap();
  const checkExclusion=(buffer,width,height)=>{
    const sx=width/display.bounds.width,sy=height/display.bounds.height;let blue=0,count=0;
    for(let y=Math.round((bounds.y-display.bounds.y+50)*sy);y<Math.min(height,(bounds.y-display.bounds.y+bounds.height-25)*sy);y+=7)for(let x=Math.round((bounds.x-display.bounds.x+20)*sx);x<Math.min(width,(bounds.x-display.bounds.x+bounds.width-20)*sx);x+=7){const i=(y*width+x)*4;if(Math.abs(buffer[i]-168)<15&&Math.abs(buffer[i+1]-79)<15&&Math.abs(buffer[i+2]-22)<15)blue++;count++;}
    assert(count>50&&blue/count>.98,'Toolbox pixels or black rectangle present in captured desktop: '+blue+'/'+count);
  };
  checkExclusion(data,dim.width,dim.height);await tool("document.getElementById('stop').click()");await waitState('done');
  const actual=await js('cameraSession.saved');const frameFile=path.join(root,'excluded-frame.png');await run(ffmpeg,['-v','error','-ss','0.7','-i',actual.filePath,'-frames:v','1',frameFile],{windowsHide:true});const frame=nativeImage.createFromPath(frameFile),frameSize=frame.getSize();checkExclusion(frame.toBitmap(),frameSize.width,frameSize.height);
  const sx=frameSize.width/display.bounds.width,sy=frameSize.height/display.bounds.height,crop=[Math.floor((bounds.width-40)*sx),Math.floor((bounds.height-75)*sy),Math.floor((bounds.x-display.bounds.x+20)*sx),Math.floor((bounds.y-display.bounds.y+50)*sy)].join(':');
  // Small lossy VP8/chroma and cursor-shadow differences are allowed, unlike a dark popup/panel.
  const frames=await run(ffmpeg,['-v','error','-i',actual.filePath,'-vf','crop='+crop+',scale=8:8','-pix_fmt','bgra','-f','rawvideo','pipe:1'],{windowsHide:true,encoding:'buffer',maxBuffer:8*1024**2});assert(frames.stdout.length>256*10);for(let i=0;i<frames.stdout.length;i+=4)assert(Math.abs(frames.stdout[i]-168)<25&&Math.abs(frames.stdout[i+1]-79)<25&&Math.abs(frames.stdout[i+2]-22)<25,'Visible native popup/control in encoded frame: '+[...frames.stdout.subarray(i,i+3)]);
  await js("$('#cameraClose').onclick();clearInterval(exclusionCameraTimer);navigator.mediaDevices.getUserMedia=captureTestOriginal.media;void 0");cover.destroy();cover=null;
  console.log('Real desktop capture of covered owned monitor: Toolbox and all nine position controls excluded from PNG and EVERY decoded WebM frame while clicking anchors OK');
  console.log('ALL TOOLBOX TESTS PASSED '+root);app.exit(0);
}catch(e){cover?.destroy();console.error(e.stack);app.exit(1)}
});
