const {app,BrowserWindow}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const root=path.join(app.getPath('temp'),'lqtac-pan-crop-test-'+process.pid);app.setPath('userData',path.join(root,'profile'));
app.on('browser-window-created',(_e,w)=>w.webContents.setBackgroundThrottling(false));require('./main.cjs');
app.whenReady().then(async()=>{
  const timer=setTimeout(()=>{console.error('PanCrop test timeout');app.exit(1)},90000);timer.unref();
  try{
    await fs.mkdir(root,{recursive:true});const engine=require('./render-engine.cjs'),io=require('./project-io.cjs');
    const source=path.join(root,'pattern.mp4');await run(engine.ffmpegPath(),['-v','error','-y','-f','lavfi','-i','testsrc2=s=320x180:r=24:d=4','-c:v','libx264','-pix_fmt','yuv420p',source],{windowsHide:true});
    const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));const js=code=>win.webContents.executeJavaScript(code);await js('demoReady');
    console.log(await js(`(async()=>{
      await restoreProject({format:'LQTAC Studio',version:1,name:'Cámara visual',library:[],tracks:[{id:'V1',kind:'video',envelope:[{time:0,value:1}],clips:[{name:'Patrón',kind:'video',filePath:${JSON.stringify(source)},startSeconds:1,durationSeconds:2,sourceDurationSeconds:4,sourceOffsetSeconds:.25,playbackRate:1.5}]}]});
      const clip=timelineClips()[0];selectTimelineClip(clip);resetEditHistory();timelineTime=1;$('#openVisualCrop').click();if(!panCropDialog.open)throw Error('Cannot open visual crop');await waitMedia(panCropSession.video,()=>panCropSession.video.readyState>=2&&!panCropSession.video.seeking);await new Promise(r=>setTimeout(r,100));
      const session=panCropSession;if(![...$('#pcAspect').options].some(o=>o.textContent==='15:9'))throw Error('Missing aspect preset');
      const set=(id,v)=>{const f=$('#'+id);f.value=String(v);f.dispatchEvent(new Event(f.tagName==='SELECT'?'change':'input'));f.blur();};
      set('pcAspect',4/3);set('pc-width',.6);if(Math.abs(session.crop.height-.8)>.00001)throw Error('Aspect or locked width failed');
      if(clipCropFrames(clip).length)throw Error('Draft modified clip');session.setTime(2);set('pc-x',.65);await waitMedia(session.video,()=>session.video.readyState>=2&&!session.video.seeking);await new Promise(r=>setTimeout(r,80));
      const desk=$('#pcDesktop'),rect=desk.getBoundingClientRect(),s=Math.min(800/320,500/180)*Number($('#pcWorkspace').value),ox=400-320*s/2,oy=250-180*s/2;
      const pointer=(type,x,y,shiftKey=false)=>new PointerEvent(type,{button:0,bubbles:true,shiftKey,clientX:rect.left+x/800*rect.width,clientY:rect.top+y/500*rect.height});
      let v=session.crop,x=ox+(v.x+v.width/2)*320*s,y=oy+(v.y+v.height/2)*180*s;const opposite={x:v.x-v.width/2,y:v.y-v.height/2};
      desk.dispatchEvent(pointer('pointerdown',x,y));window.dispatchEvent(pointer('pointermove',x-30,y-20));window.dispatchEvent(pointer('pointerup',x-30,y-20));v=session.crop;
      if(Math.abs(v.width/v.height-.75)>.00001||Math.abs(v.x-v.width/2-opposite.x)>.00001||Math.abs(v.y-v.height/2-opposite.y)>.00001)throw Error('Corner ratio/anchor failed');
      x=ox+v.x*320*s;y=oy+v.y*180*s;const oldX=v.x;desk.dispatchEvent(pointer('pointerdown',x,y));window.dispatchEvent(pointer('pointermove',x+25,y));window.dispatchEvent(pointer('pointerup',x+25,y));if(Math.abs(session.crop.x-oldX-25/(320*s))>.00001)throw Error('Camera drag failed '+JSON.stringify({before:oldX,after:session.crop.x,expected:25/(320*s),rect:desk.getBoundingClientRect().toJSON()}));
      $('#pcLock').checked=false;$('#pcLock').dispatchEvent(new Event('change'));const width=session.crop.width;set('pc-height',.5);if(session.crop.width!==width||session.crop.height!==.5)throw Error('Unlocked resize failed');
      set('pc-rotation',20);
      for(const direction of ['x','y']){const before=session.crop,cx=ox+before.x*320*s,cy=oy+before.y*180*s;desk.dispatchEvent(pointer('pointerdown',cx,cy,true));window.dispatchEvent(pointer('pointermove',cx+(direction==='x'?20:2),cy+(direction==='y'?20:2),true));window.dispatchEvent(pointer('pointermove',cx+(direction==='x'?24:28),cy+(direction==='y'?24:28),true));window.dispatchEvent(pointer('pointerup',cx+24,cy+24,true));const after=session.crop;if(direction==='x'&&(after.y!==before.y||after.x===before.x)||direction==='y'&&(after.x!==before.x||after.y===before.y))throw Error('Shift axis lock failed '+direction);}
      const before=session.crop,cx=ox+before.x*320*s,cy=oy+before.y*180*s;desk.dispatchEvent(pointer('pointerdown',cx,cy));window.dispatchEvent(pointer('pointermove',cx+10,cy+5));const free=session.crop;window.dispatchEvent(pointer('pointermove',cx+20,cy+6,true));const locked=session.crop;if(locked.y!==free.y)throw Error('Pressing Shift mid-drag jumped perpendicular axis');window.dispatchEvent(pointer('pointermove',cx+21,cy+16,false));const released=session.crop;if(Math.abs(released.y-locked.y-10/(180*s))>.00001)throw Error('Shift release did not resume smoothly');window.dispatchEvent(pointer('pointerup',cx+21,cy+16));
      session.setTime(1);if(Math.abs(session.crop.rotation-10)>.00001)throw Error('Keyframe interpolation failed');await waitMedia(session.video,()=>!session.video.seeking);await new Promise(r=>setTimeout(r,150));session.render();
      if(Math.abs(session.video.currentTime-1.75)>.03||timelineTime!==1)throw Error('Source offset/rate or project clock incorrect');
      window.pcPreviewData=$('#pcPreview').toDataURL();window.pcDraft=structuredClone(session.draft);return 'Visual editor: presets, corner anchor, camera drag, ratio lock, draft, interpolation and source timing OK';
    })()`));
    await fs.writeFile(path.join(root,'editor.png'),(await win.webContents.capturePage()).toPNG());
    console.log(await js(`(async()=>{
      const clip=timelineClips()[0];$('#pcApply').click();await new Promise(r=>setTimeout(r,100));if(panCropDialog.open||JSON.stringify(clipCropFrames(clip))!==JSON.stringify(pcDraft))throw Error('Apply failed');
      exportSize={width:480,height:270};const result=await captureProjectFrame(2,480,270);exportSize=null;const img=new Image();img.src='data:image/png;base64,'+result;await img.decode();const c=document.createElement('canvas');c.width=480;c.height=270;c.getContext('2d').drawImage(img,0,0);const a=c.getContext('2d').getImageData(0,0,480,270).data;const prev=new Image();prev.src=pcPreviewData;await prev.decode();c.getContext('2d').clearRect(0,0,480,270);c.getContext('2d').drawImage(prev,0,0);const b=c.getContext('2d').getImageData(0,0,480,270).data;let error=0;for(let i=0;i<a.length;i++)error+=Math.abs(a[i]-b[i]);if(error/a.length>2)throw Error('Preview/export mismatch '+error/a.length);
      await navigateHistory(false);if(clipCropFrames(timelineClips()[0]).length)throw Error('Undo failed');await navigateHistory(true);if(clipCropFrames(timelineClips()[0]).length!==pcDraft.length)throw Error('Redo failed');
      openPanCropEditor(timelineClips()[0]);await waitMedia(panCropSession.video,()=>panCropSession.video.readyState>=2);$('#pcReset').click();$('#pcCancel').click();if(clipCropFrames(timelineClips()[0]).length!==pcDraft.length)throw Error('Cancel changed clip');
      selectTimelineClip(timelineClips()[0]);timelineTime=2;splitSelectedClips();const clips=timelineClips(),left=LQTACWork.cropAt(clipCropFrames(clips[0]),1),right=LQTACWork.cropAt(clipCropFrames(clips[1]),0);if(Math.abs(left.x-right.x)>.000001||Math.abs(left.width-right.width)>.000001)throw Error('Split discontinuity');
      return 'Apply, preview/export pixels, undo/redo, cancel and split continuity OK';
    })()`));
    const snap=await js('projectSnapshot()');await io.saveProject(path.join(root,'camera.LQTS'),snap);const loaded=await io.openProject(path.join(root,'camera.LQTS'));assert.deepEqual(loaded.project.tracks[0].clips[0].panCrop,snap.tracks[0].clips[0].panCrop);console.log('LQTS disk round-trip OK');console.log('ALL PAN CROP EDITOR TESTS PASSED '+root);app.exit(0);
  }catch(e){console.error(e.stack);app.exit(1);}
});
