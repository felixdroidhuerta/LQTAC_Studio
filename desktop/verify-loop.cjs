// Bucle (clip loop): a looped video/GIF clip repeats its media while stretching only lengthens the same event.
const {app,BrowserWindow,nativeImage}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const run=require('node:util').promisify(require('node:child_process').execFile);
const root=path.join(app.getPath('temp'),'lqtac-loop-test-'+process.pid);app.setPath('userData',path.join(root,'profile'));require('./main.cjs');
app.whenReady().then(async()=>{const timeout=setTimeout(()=>app.exit(1),180000);timeout.unref();try{
  await fs.mkdir(root,{recursive:true});const engine=require('./render-engine.cjs'),io=require('./project-io.cjs'),mcp=require('./mcp-edit.cjs');const file=path.join(root,'spin.gif');
  await run(engine.ffmpegPath(),['-v','error','-f','lavfi','-i','testsrc2=s=160x90:r=10:d=2',file],{windowsHide:true});
  const clip={name:'Spin',kind:'video',filePath:file,startSeconds:0,durationSeconds:2,sourceDurationSeconds:2,sourceOffsetSeconds:0,playbackRate:1,fadeInSeconds:0,fadeOutSeconds:0,videoFx:{enabled:true,saturation:1,animation:{saturation:[{time:0,value:1},{time:4,value:.4}]}}};
  const project={format:'LQTAC Studio',version:1,name:'Loop',library:[],tracks:[{id:'V1',kind:'video',envelope:[],clips:[clip]}]};
  const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));const js=code=>win.webContents.executeJavaScript(code,true);await js('demoReady');await js("LQTACAppOptions.set('snap',false)");
  await js(`window.loopBase=${JSON.stringify(project)};window.loopReset=async p=>{await restoreProject(p||loopBase);resetEditHistory();};window.loopGesture=(clip,edge,delta)=>{const r=clip.getBoundingClientRect(),x=edge==='start'?r.left+2:r.right-2,pixels=delta*clip.parentElement.getBoundingClientRect().width/timelineDurationSeconds;clip.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,buttons:1,pointerId:67,clientX:x,clientY:r.top+18}));window.dispatchEvent(new PointerEvent('pointermove',{buttons:1,pointerId:67,clientX:x+pixels,clientY:r.top+18}));window.dispatchEvent(new PointerEvent('pointerup',{pointerId:67}));};void 0`);
  console.log(await js(`(async()=>{
    const near=(a,b,e=.000001)=>Math.abs(a-b)<e;await loopReset();let c=timelineClips()[0];
    showClipContextMenu(new MouseEvent('contextmenu',{clientX:200,clientY:200}),c);const item=$('[data-action="loop-clip"]',clipContextMenu);if(item.style.display!=='block'||item.textContent!=='Bucle')throw Error('Menu item missing');
    item.click();for(let i=0;i<50&&c.dataset.loop!=='true';i++)await new Promise(r=>setTimeout(r,20));if(c.dataset.loop!=='true'||!c.querySelector('.clip-loop-badge'))throw Error('Loop not enabled from menu');
    showClipContextMenu(new MouseEvent('contextmenu',{clientX:200,clientY:200}),c);if(item.textContent!=='✓ Bucle (quitar)'||$('[data-action="reverse-clip"]',clipContextMenu).style.display!=='none')throw Error('Menu state with loop');hideClipContextMenu();
    const undoBefore=undoHistory.length;loopGesture(c,'end',3);
    if(timelineClips().length!==1||!near(clipTiming(c).durationSeconds,5,.001)||c.dataset.repeatIndex||!c.querySelector('.clip-loop-marks'))throw Error('Stretch created copies or wrong length: '+timelineClips().length+' '+clipTiming(c).durationSeconds);
    if(undoHistory.length!==undoBefore+1)throw Error('Stretch not one undo step');
    const d=Number(c.dataset.durationSeconds);if(!near(clipLocalTime(c,2.5),.5)||!near(clipLocalTime(c,4.5),.5)||!near(clipLocalTime(c,1.5),1.5))throw Error('Loop clock wrong');
    for(let i=0;i<80;i++){await renderTimelineAt(4.5);await new Promise(r=>setTimeout(r,30));if(near(videoPool.get(c)?.currentTime,.5,.05))break;}
    if(!near(videoPool.get(c)?.currentTime,.5,.05)||!videoPool.get(c).loop)throw Error('Preview not looping: '+videoPool.get(c)?.currentTime);
    window.loopSaved=projectSnapshot();if(loopSaved.tracks[0].clips[0].loop!==true)throw Error('Snapshot lost loop');
    await navigateHistory(false);c=timelineClips()[0];if(!near(clipTiming(c).durationSeconds,2,.001)||c.dataset.loop!=='true')throw Error('Undo stretch');await navigateHistory(true);c=timelineClips()[0];if(!near(clipTiming(c).durationSeconds,d,.001))throw Error('Redo stretch');
    if(await LQTACReverse.invert(c,false)!==false||c.dataset.reverse==='true')throw Error('Reverse allowed on loop');
    timelineTime=3;selectTimelineClip(c);splitSelectedClips();const parts=timelineClips().sort((a,b)=>clipTiming(a).startSeconds-clipTiming(b).startSeconds);if(parts.length!==2||parts[1].dataset.loop!=='true'||!near(Number(parts[1].dataset.sourceOffsetSeconds),1,.001))throw Error('Split lost loop/phase');
    await navigateHistory(false);c=timelineClips()[0];
    await LQTACLoop.toggle(c);const off=timelineClips().sort((a,b)=>clipTiming(a).startSeconds-clipTiming(b).startSeconds);if(off.length!==3||off.some(x=>x.dataset.loop)||!off.every((x,i)=>Number(x.dataset.repeatIndex)===i+1)||!near(clipTiming(off[2]).durationSeconds,1,.001))throw Error('Loop off did not keep length as repeats');
    return 'Menu toggles loop; stretch lengthens one event (no copies) with loop marks and one undo; preview and clock wrap; reverse blocked; split keeps phase; loop off becomes repeats';
  })()`));
  const left=structuredClone(project);Object.assign(left.tracks[0].clips[0],{startSeconds:3,loop:true});
  await js(`(async()=>{await loopReset(${JSON.stringify(left)});loopGesture(timelineClips()[0],'start',-2.5);})()`);const lp=await js('projectSnapshot()');assert.equal(lp.tracks[0].clips.length,1);const lc=lp.tracks[0].clips[0];assert(Math.abs(lc.startSeconds-.5)<.001&&Math.abs(lc.durationSeconds-4.5)<.001&&Math.abs(lc.sourceOffsetSeconds-1.5)<.001,'Left-edge loop phase '+JSON.stringify(lc));io.validateProject(lp);
  const saved=await js('loopSaved');io.validateProject(saved);await io.saveProject(path.join(root,'loop.LQTS'),saved);const reopened=await io.openProject(path.join(root,'loop.LQTS'));assert.equal(reopened.project.tracks[0].clips[0].loop,true);assert(Math.abs(reopened.project.tracks[0].clips[0].durationSeconds-5)<.001);
  assert.throws(()=>io.validateProject({...saved,tracks:[{...saved.tracks[0],clips:[{...saved.tracks[0].clips[0],loop:false}]}]}),/Recorte fuera/);
  assert.throws(()=>io.validateProject({...saved,tracks:[{...saved.tracks[0],clips:[{...saved.tracks[0].clips[0],reverse:true}]}]}),/Bucle no válido/);
  const edited=await mcp.edit(project,[{op:'updateClip',ref:'V1:0',patch:{loop:true,durationSeconds:6}}],async()=>{throw Error('no probe');});const ec=(edited.project||edited).tracks[0].clips[0];assert.equal(ec.loop,true);assert.equal(ec.durationSeconds,6);
  await js(`(async()=>{await restoreProject(${JSON.stringify(reopened.project)});exportSize={width:640,height:360};})()`);
  const plain={...reopened.project,tracks:[{...reopened.project.tracks[0],clips:[{...reopened.project.tracks[0].clips[0],videoFx:{}}]}]};await js(`restoreProject(${JSON.stringify(plain)})`);
  const frames=[];for(const time of [.5,2.5,4.5])frames.push(nativeImage.createFromBuffer(Buffer.from(await js('captureProjectFrame('+time+',640,360)'),'base64')).toBitmap());
  for(const b of frames.slice(1)){let error=0;for(let i=0;i<b.length;i++)error+=Math.abs(b[i]-frames[0][i]);assert(error/b.length<2,'Looped GIF frame did not restart');}
  let blank=0;for(let i=0;i<frames[0].length;i+=4)blank+=frames[0][i]+frames[0][i+1]+frames[0][i+2];assert(blank>0,'Black frame');
  const out=path.join(root,'loop.mp4'),job=await engine.startRender({project:plain,profile:'mp4',output:out,fps:10,width:640,height:360});for(let i=0;i<50;i++)await job.frame(await js('captureProjectFrame('+(i/10)+',640,360)'));await job.finish();await run(engine.ffmpegPath(),['-v','error','-i',out,'-t','0.1','-f','null','-'],{windowsHide:true});
  console.log('Left-edge loop phase, LQTS roundtrip, validation, MCP patch; identical frames at 0.5/2.5/4.5 s and 5-second MP4 export OK');
  await js('exportSize=null;updateTimelineViewport(8,0);timelineTime=0;renderTimelineAt(0);new Promise(r=>setTimeout(r,2500))');await fs.writeFile(path.join(root,'loop-timeline.png'),(await win.webContents.capturePage()).toPNG());
  console.log('ALL LOOP TESTS PASSED '+root);app.exit(0);
}catch(e){console.error(e.stack);app.exit(1)}});
