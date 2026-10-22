const {app,BrowserWindow,dialog}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {promisify}=require('node:util');
const {execFile}=require('node:child_process');
const root=path.join(app.getPath('temp'),'lqtac-project-test-'+process.pid);
app.setPath('userData',path.join(root,'profile'));
require('./main.cjs');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{console.error('TEST TIMEOUT');app.exit(1);},180000);timeout.unref();
  try {
    await fs.mkdir(root,{recursive:true});
    const ffmpeg=require('./render-engine.cjs').ffmpegPath();
    const run=promisify(execFile);
    const media=path.join(root,'test-source.mp4');
    await run(ffmpeg,['-hide_banner','-y','-f','lavfi','-i','testsrc2=s=320x180:r=24:d=2','-f','lavfi','-i','sine=frequency=440:duration=2','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',media],{windowsHide:true});
    const win=BrowserWindow.getAllWindows()[0];
    win.webContents.setBackgroundThrottling(false);
    if(win.webContents.isLoading())await new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
    const js=code=>win.webContents.executeJavaScript(code);
    await js(`(async()=>{
      await demoReady;
      const mask=document.createElement('canvas');mask.width=mask.height=32;const ctx=mask.getContext('2d');ctx.fillStyle='black';ctx.fillRect(0,0,32,32);ctx.fillStyle='white';ctx.fillRect(0,0,16,32);
      const clip={name:'Real source',kind:'video',filePath:${JSON.stringify(media)},startSeconds:0,durationSeconds:1,groupId:'sync',groupType:'media',transition:'fade'};
      const project={format:'LQTAC Studio',version:1,name:'Prueba LQTS',time:0,zoom:2,zoomStart:0,library:[{name:'Source.mp4',kind:'video',filePath:clip.filePath}],tracks:[
        {id:'V1',name:'Vídeo',kind:'video',role:'video',envelopeVisible:true,envelope:[{time:0,value:1},{time:1.5,value:.5}],clips:[clip,{...clip,name:'Incoming',startSeconds:.5,groupId:'pair2',transition:'lumaMask',mask:{dataUrl:mask.toDataURL(),name:'Mask',motion:'zoomIn',amount:.2,blur:3,softness:.1,invert:false}}]},
        {id:'A1',name:'Audio',kind:'audio',envelopeVisible:true,envelope:[{time:0,value:.1},{time:1.5,value:.2}],clips:[{...clip,kind:'audio'},{...clip,kind:'audio',startSeconds:.5,groupId:'pair2'}]}
      ]};await restoreProject(project);return JSON.stringify(projectSnapshot());
    })()`);
    const lqts=path.join(root,'saved.LQTS');
    dialog.showSaveDialog=async()=>({canceled:false,filePath:lqts});
    await js('saveLqts()');
    const saved=JSON.parse(await fs.readFile(lqts,'utf8'));
    if(path.isAbsolute(saved.tracks[0].clips[0].filePath))throw new Error('Paths not relative');
    dialog.showOpenDialog=async()=>({canceled:false,filePaths:[lqts]});
    console.log(await js(`(async()=>{const r=await lqtacDesktop.openProject();await restoreProject(r.project);const p=projectSnapshot();if(p.tracks.length!==2||p.tracks[0].clips.length!==2||p.tracks[1].clips[0].groupId!=='sync'||p.tracks[0].clips[1].mask.blur!==3||p.tracks[1].envelope[0].value!==.1)throw Error('Roundtrip mismatch');return 'LQTS roundtrip groups / envelopes / embedded mask / timeline OK';})()`));
    const io=require('./project-io.cjs');
    try{io.validateProject({format:'Other'});throw Error('accepted invalid project');}catch(e){if(e.message==='accepted invalid project')throw e;}
    const missingData=structuredClone(saved);missingData.tracks[0].clips[0].filePath='not-present.mp4';delete missingData.tracks[0].clips[0].originalPath;
    const missingPath=path.join(root,'missing.LQTS');await fs.writeFile(missingPath,JSON.stringify(missingData));
    const missing=await io.openProject(missingPath);if(missing.missing.length!==1||missing.project.tracks[0].clips.length!==2)throw Error('Missing media recovery failed');
    console.log('Missing media retains events; invalid schema rejected OK');
    for(const profile of ['wav','mp3','flac','m4a','mp4','webm']){
      const output=path.join(root,'render.'+profile);dialog.showSaveDialog=async()=>({canceled:false,filePath:output});
      console.log(await js(`(async()=>{
        stopTimelinePlayback();exporting=true;exportSize={width:640,height:360};
        try{const r=await lqtacDesktop.renderStart({project:projectSnapshot(),profile:${JSON.stringify(profile)},width:640,height:360,fps:24});
          if(r.video){for(let i=0;i<Math.ceil(r.duration*24);i++)await lqtacDesktop.renderFrame(await captureProjectFrame(i/24,640,360));}
          await lqtacDesktop.renderFinish();return 'Export ${profile} OK';
        }finally{exporting=false;exportSize=null;}
      })()`));
      const stat=await fs.stat(output);if(stat.size<500)throw new Error('Empty output '+profile);
      await run(ffmpeg,['-v','error','-i',output,'-f','null','-'],{windowsHide:true});
      if(['mp4','webm'].includes(profile)){
        const decode=await run(ffmpeg,['-hide_banner','-i',output,'-map','0:v','-f','null','-'],{windowsHide:true});
        if(!/frame=\s*36\b/.test(decode.stderr))throw Error('Incorrect video frame count '+profile);
      }
      const stats=await run(ffmpeg,['-hide_banner','-i',output,'-vn','-af','astats=metadata=0:reset=0','-f','null','-'],{windowsHide:true});
      const rms=Number(stats.stderr.match(/RMS level dB: (-?[\d.]+)/)?.[1]);if(!Number.isFinite(rms)||rms < -60 || rms > -20)throw Error('Audio mix/envelope level incorrect '+profile+' '+rms);
      console.log('Decoded '+profile+' '+stat.size+' bytes');
    }
    const engine=require('./render-engine.cjs'), sentinel=path.join(root,'cancel.wav');await fs.writeFile(sentinel,'existing destination');
    const project=await js('projectSnapshot()');const job=await engine.startRender({project,profile:'wav',output:sentinel});job.cancel();
    try{await job.done;throw Error('Cancellation did not reject');}catch(e){if(e.message==='Cancellation did not reject')throw e;}
    if(await fs.readFile(sentinel,'utf8')!=='existing destination')throw Error('Cancelled render overwrote existing file');
    console.log('Cancellation preserves existing destination OK');
    console.log(await js(`(async()=>{
      const video=timelineClips().find(c=>c.dataset.kind==='video'&&c.dataset.groupId==='sync');
      const audio=groupMembers(video).find(c=>c.dataset.kind==='audio');
      for(const c of timelineClips())c.dataset.sourceDurationSeconds='2';
      const scale=video.parentElement.getBoundingClientRect().width/timelineDurationSeconds;
      const drag=(edge,delta)=>{beginClipTrim({preventDefault(){},stopPropagation(){},clientX:100},video,edge);window.dispatchEvent(new PointerEvent('pointermove',{clientX:100+delta*scale}));window.dispatchEvent(new PointerEvent('pointerup'));};
      drag('start',.25);drag('end',-.25);
      for(const c of [video,audio])if(Math.abs(clipTiming(c).startSeconds-.25)>.002||Math.abs(clipTiming(c).durationSeconds-.5)>.002||Math.abs(Number(c.dataset.sourceOffsetSeconds)-.25)>.002)throw Error('Grouped trim mismatch');
      selectTimelineClip(video);timelineTime=.5;document.dispatchEvent(new KeyboardEvent('keydown',{key:'s',code:'KeyS',bubbles:true}));
      const rights=selectedTimelineClips;
      if(rights.length!==2||rights[0].dataset.groupId!==rights[1].dataset.groupId||rights[0].dataset.groupId===video.dataset.groupId)throw Error('Split groups mismatch');
      for(const c of rights)if(Math.abs(Number(c.dataset.sourceOffsetSeconds)-.5)>.002||Math.abs(clipTiming(c).durationSeconds-.25)>.002)throw Error('Split offset mismatch');
      if(Math.abs(clipLocalTime(rights[0],.6)-.6)>.002)throw Error('Wrong source playback offset');
      const snapshot=projectSnapshot();await restoreProject(snapshot);
      if(!timelineClips().some(c=>Math.abs(Number(c.dataset.sourceOffsetSeconds)-.5)<.002))throw Error('Trim restoration failed');
      return 'Grouped head/tail trim, split, source offsets and restore OK';
    })()`));
    console.log(await js(`(async()=>{
      resetEditHistory();
      const original=timelineClips().length;
      const pair=timelineClips().filter(c=>c.dataset.groupId===timelineClips()[0].dataset.groupId);
      applyTimelineSelection(pair);copySelectedClips();timelineTime=3;
      await pasteCopiedClips();
      if(timelineClips().length!==original+2||selectedTimelineClips.length!==2)throw Error('Paste count mismatch');
      const pasted=selectedTimelineClips;
      if(pasted.some(c=>Math.abs(clipTiming(c).startSeconds-3)>.002)||pasted[0].dataset.groupId===pair[0].dataset.groupId||pasted[0].dataset.groupId!==pasted[1].dataset.groupId)throw Error('Paste timing/groups mismatch');
      if(Math.abs(Number(pasted[0].dataset.sourceOffsetSeconds)-.25)>.002)throw Error('Paste lost trim');
      await navigateHistory(false);if(timelineClips().length!==original)throw Error('Undo paste failed');
      await navigateHistory(true);if(timelineClips().length!==original+2)throw Error('Redo paste failed');
      removeTimelineClip(selectedTimelineClip);if(timelineClips().length!==original)throw Error('Delete failed');
      await navigateHistory(false);if(timelineClips().length!==original+2)throw Error('Undo delete failed');
      await navigateHistory(false);if(timelineClips().length!==original)throw Error('Multi undo failed');
      addTimelineTrack('audio');if(redoHistory.length)throw Error('New edit did not clear redo');
      await navigateHistory(false);if($$('.track').length!==2)throw Error('Undo add track failed');
      const before=undoHistory.length,input=document.createElement('input');document.body.append(input);input.focus();document.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true}));input.remove();
      if(undoHistory.length!==before)throw Error('Text editing intercepted');
      resetEditHistory();const count=timelineClips().length;selectTimelineClip(timelineClips()[0]);timelineTime=5;
      const key=async letter=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:letter,ctrlKey:true,bubbles:true,cancelable:true}));const until=Date.now()+4000;while(historyBusy&&Date.now()<until)await new Promise(r=>setTimeout(r,10));if(historyBusy)throw Error('Shortcut timed out');};
      await key('c');await key('v');if(timelineClips().length!==count+2)throw Error('Ctrl+C/V keyboard failed');
      await key('z');if(timelineClips().length!==count)throw Error('Ctrl+Z keyboard failed');
      await key('y');if(timelineClips().length!==count+2)throw Error('Ctrl+Y keyboard failed');
      await key('z');resetEditHistory();const first=timelineClips()[0],length=clipTiming(first).durationSeconds;
      selectTimelineClip(first);timelineTime=clipTiming(first).startSeconds+length/2;splitSelectedClips();
      if(timelineClips().length!==count+2)throw Error('Split before undo failed');await key('z');if(timelineClips().length!==count)throw Error('Undo split failed');
      return 'Copy/paste trimmed AV, independent groups, undo/redo paste/delete/track and native text shortcuts OK';
    })()`));
    console.log(await js(`(async()=>{
      const clip=timelineClips().find(c=>c.dataset.kind==='video'),peer=groupMembers(clip).find(c=>c.dataset.kind==='audio');selectTimelineClip(clip);resetEditHistory();
      const duration=clipTiming(clip).durationSeconds;
      const fade=(side,seconds)=>{const x=100,width=clip.getBoundingClientRect().width;beginClipFade({clientX:x,preventDefault(){},stopPropagation(){}},clip,side);window.dispatchEvent(new PointerEvent('pointermove',{clientX:x+(side==='in'?1:-1)*seconds/duration*width}));window.dispatchEvent(new PointerEvent('pointerup'));};
      fade('in',duration/2);fade('out',duration/2);
      if(Math.abs(Number(clip.dataset.fadeInSeconds)-duration/2)>.002||Math.abs(Number(clip.dataset.fadeOutSeconds)-duration/2)>.002)throw Error('Corner fade drag failed');
      if(Number(peer.dataset.fadeInSeconds)||Number(peer.dataset.fadeOutSeconds))throw Error('Fade affected grouped peer');
      const start=clipTiming(clip).startSeconds;
      if(Math.abs(clipFadeGain(clip,start+duration/4)-.5)>.002||clipFadeGain(clip,start)!==0||Math.abs(clipFadeGain(clip,start+duration*.75)-.5)>.002)throw Error('Fade gain wrong');
      const snapshot=projectSnapshot();await restoreProject(snapshot);const restored=timelineClips().find(c=>c.dataset.kind==='video');if(Math.abs(Number(restored.dataset.fadeInSeconds)-duration/2)>.002)throw Error('Fade persistence failed');
      await navigateHistory(false);const undone=timelineClips().find(c=>c.dataset.kind==='video');if(Number(undone.dataset.fadeOutSeconds)!==0||!Number(undone.dataset.fadeInSeconds))throw Error('Undo fade failed');
      await navigateHistory(true);
      const canvas=document.createElement('canvas');canvas.width=canvas.height=16;const ctx=canvas.getContext('2d');ctx.fillStyle='red';ctx.fillRect(0,0,16,16);const result=document.createElement('canvas');result.width=result.height=16;const renderer=new LQTACTransitions.Renderer(result);renderer.draw('wipeLeft',canvas,canvas,0,{fromOpacity:.25,toOpacity:1});const rgba=new Uint8Array(4);renderer.gl.readPixels(8,8,1,1,renderer.gl.RGBA,renderer.gl.UNSIGNED_BYTE,rgba);renderer.dispose();if(Math.abs(rgba[3]-64)>2)throw Error('Transition did not respect clip fade');
      return 'Independent corner fades, gains, persistence, undo/redo and WebGL alpha OK';
    })()`));
    const fadedProject=await js('projectSnapshot()');
    for(const track of fadedProject.tracks)for(const clip of track.clips.filter(c=>c.kind==='audio')){clip.fadeInSeconds=clip.durationSeconds/2;clip.fadeOutSeconds=clip.durationSeconds/2;}
    const fadedOutput=path.join(root,'faded-audio.wav');const fadedJob=await engine.startRender({project:fadedProject,profile:'wav',output:fadedOutput});await fadedJob.finish();
    await run(ffmpeg,['-v','error','-i',fadedOutput,'-f','null','-'],{windowsHide:true});console.log('Audio fade export decoded OK');
    console.log(await js(`(async()=>{
      updateTimelineViewport(4,.2);await renderTimelineAt(.3);const head=ensureTimelinePlayhead(),grip=head.querySelector('.timeline-playhead-grip'),rect=$('#tracks').getBoundingClientRect(),count=timelineClips().length,history=undoHistory.length;
      const pointer=(type,x)=>new PointerEvent(type,{clientX:x,button:0,pointerId:42,bubbles:true,cancelable:true});
      grip.dispatchEvent(pointer('pointerdown',rect.left+rect.width*.1));window.dispatchEvent(pointer('pointermove',rect.left+rect.width*.4));window.dispatchEvent(pointer('pointerup',rect.left+rect.width*.4));
      if(Math.abs(timelineTime-timelineDurationSeconds*.4)>.001||head.classList.contains('dragging'))throw Error('Playhead drag failed at zoom');
      grip.dispatchEvent(pointer('pointerdown',rect.left));window.dispatchEvent(pointer('pointerup',rect.left-100));if(timelineTime!==0)throw Error('Playhead lower bound failed');
      grip.dispatchEvent(pointer('pointerdown',rect.left));window.dispatchEvent(pointer('pointerup',rect.right+100));if(timelineTime!==timelineDurationSeconds)throw Error('Playhead upper bound failed');
      if(timelineClips().length!==count||undoHistory.length!==history)throw Error('Playhead drag edited clips/history');
      return 'Playhead drag at 400% zoom, scroll, bounds and unchanged edit history OK';
    })()`));
    console.log('ALL PROJECT / EXPORT TESTS PASSED '+root);app.exit(0);
  }catch(error){console.error(error.stack);app.exit(1);}
});
