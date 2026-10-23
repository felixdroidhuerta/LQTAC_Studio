const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const root=path.join(app.getPath('temp'),'lqtac-keyframes-test-'+process.pid);app.setPath('userData',path.join(root,'profile'));
app.on('browser-window-created',(_e,win)=>win.webContents.setBackgroundThrottling(false));require('./main.cjs');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{console.error('Editor timeout');app.exit(1);},90000);timeout.unref();
  try{
    await fs.mkdir(root,{recursive:true});const engine=require('./render-engine.cjs'),model=require('../dist/assets/effects-model.js'),io=require('./project-io.cjs');
    const source=path.join(root,'red.mp4');await run(engine.ffmpegPath(),['-v','error','-y','-f','lavfi','-i','color=c=red:s=160x90:r=24:d=2','-c:v','libx264','-pix_fmt','yuv420p',source],{windowsHide:true});
    const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));const js=code=>win.webContents.executeJavaScript(code);await js('demoReady');
    console.log(await js(`(async()=>{
      await restoreProject({format:'LQTAC Studio',version:1,name:'Animación FX',library:[],tracks:[{id:'V1',kind:'video',envelope:[{time:0,value:1}],clips:[{name:'Rojo',kind:'video',filePath:${JSON.stringify(source)},startSeconds:0,durationSeconds:2,sourceDurationSeconds:2}]}]});
      const clip=timelineClips()[0];selectTimelineClip(clip);resetEditHistory();$('#effectsCatalog [data-fx-key="saturation"]').click();
      if(!effectEditor.open||$('#editor-brightness'))throw Error('Not an individual editor');
      const session=effectEditorSession;$('#editorAnimate').checked=true;$('#editorAnimate').dispatchEvent(new Event('change'));session.setTime(2);const field=$('#editor-saturation');field.value='0';field.dispatchEvent(new Event('input'));field.blur();
      if(Math.abs(LQTACEffects.at(session.draft,1).saturation-.5)>.001)throw Error('Interpolation failed');
      await waitMedia(session.video,()=>session.video.readyState>=2);session.setTime(1);await new Promise(r=>setTimeout(r,150));session.render();
      const data=$('#editorPreview').getContext('2d').getImageData(320,180,1,1).data;if(data[0]<=data[1]+30)throw Error('Clip preview missing');
      $('#editorSave').click();await new Promise(r=>setTimeout(r,60));if(effectEditor.open)throw Error('Editor apply failed');
      const curve=clipEffectsState(clip,'video').animation.saturation;if(curve[0].value!==1||curve.at(-1).value!==0)throw Error('Curve not saved');
      const pixel=async t=>{exportSize={width:640,height:360};const png=await captureProjectFrame(t,640,360);exportSize=null;const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();const c=document.createElement('canvas');c.width=640;c.height=360;c.getContext('2d').drawImage(image,0,0);return [...c.getContext('2d').getImageData(320,180,1,1).data];};
      const color=await pixel(0),gray=await pixel(1.99);if(color[0]-color[1]<150||Math.abs(gray[0]-gray[1])>4)throw Error('Animated export pixels incorrect '+color+' '+gray);
      const snapshot=projectSnapshot();await restoreProject(snapshot);if(LQTACEffects.at(clipEffectsState(timelineClips()[0],'video'),1).saturation!==.5)throw Error('Roundtrip lost animation');
      await navigateHistory(false);if(clipEffectsState(timelineClips()[0],'video').animation?.saturation)throw Error('Undo animation failed');await navigateHistory(true);
      selectTimelineClip(timelineClips()[0]);timelineTime=1;splitSelectedClips();const left=timelineClips()[0],right=selectedTimelineClips[0];if(Math.abs(LQTACEffects.at(clipEffectsState(left,'video'),1).saturation-.5)>.001||Math.abs(LQTACEffects.at(clipEffectsState(right,'video'),0).saturation-.5)>.001)throw Error('Split curve discontinuity');
      selectTimelineClip(right);copySelectedClips();timelineTime=4;await pasteCopiedClips();if(Math.abs(LQTACEffects.at(clipEffectsState(selectedTimelineClips[0],'video'),0).saturation-.5)>.001)throw Error('Copy lost animation');
      openEffectEditor(left,'saturation');effectEditorSession.setTime(.5);await waitMedia(effectEditorSession.video,()=>effectEditorSession.video.readyState>=2&&!effectEditorSession.video.seeking);await new Promise(r=>setTimeout(r,150));effectEditorSession.render();await new Promise(r=>requestAnimationFrame(r));
      return 'Individual editor, clip preview, color-to-gray interpolation/export, persistence, undo/redo, split continuity and copy OK';
    })()`));
    await fs.writeFile(path.join(root,'effect-editor.png'),(await win.webContents.capturePage()).toPNG());
    const project=await js('projectSnapshot()');io.validateProject(project);const lqts=path.join(root,'animation.LQTS');await io.saveProject(lqts,project);const opened=await io.openProject(lqts);assert(opened.project.tracks[0].clips[0].videoFx.animation.saturation.length>=2);
    const segment=model.slice({saturation:1,animation:{saturation:[{time:0,value:1},{time:2,value:0}]}},.5,1);assert.equal(model.at(segment,0).saturation,.75);assert.equal(model.at(segment,1).saturation,.25);
    console.log(await js(`(async()=>{
      const canvas=$('#editorCurve'),rect=canvas.getBoundingClientRect(),before=effectEditorSession.draft.animation.saturation.length;
      const pointer=(type,t,v)=>new PointerEvent(type,{button:0,bubbles:true,clientX:rect.left+t*rect.width,clientY:rect.top+(140-v/2*130)/150*rect.height});
      canvas.dispatchEvent(pointer('pointerdown',.25,.9));window.dispatchEvent(pointer('pointermove',.3,.8));window.dispatchEvent(pointer('pointerup',.3,.8));
      if(effectEditorSession.draft.animation.saturation.length!==before+1||!effectEditorSession.draft.animation.saturation.some(p=>Math.abs(p.time-.3)<.002))throw Error('Curve point creation/drag failed');
      effectEditor.close();await new Promise(r=>setTimeout(r,20));return 'Curve point creation/drag and editor cancel OK';
    })()`));
    console.log('Disk persistence and trim curve boundaries OK');console.log('ALL EFFECT EDITOR TESTS PASSED '+root);app.exit(0);
  }catch(error){console.error(error.stack);app.exit(1);}
});
