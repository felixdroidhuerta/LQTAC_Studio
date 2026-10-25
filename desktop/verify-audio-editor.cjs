const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const root=path.join(app.getPath('temp'),'lqtac-audio-editor-test-'+process.pid);app.setPath('userData',path.join(root,'profile'));app.on('browser-window-created',(_e,win)=>win.webContents.setBackgroundThrottling(false));require('./main.cjs');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{console.error('Audio editor timeout');app.exit(1);},120000);timeout.unref();
  try{
    await fs.mkdir(root,{recursive:true});const engine=require('./render-engine.cjs'),io=require('./project-io.cjs');const source=path.join(root,'tone.wav');
    await run(engine.ffmpegPath(),['-v','error','-y','-f','lavfi','-i','sine=frequency=120:duration=4','-ac','2',source],{windowsHide:true});
    const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));const js=code=>win.webContents.executeJavaScript(code);await js('demoReady');
    console.log(await js(`(async()=>{
      await restoreProject({format:'LQTAC Studio',version:1,name:'Audio animado',library:[],tracks:[{id:'A1',kind:'audio',envelope:[{time:0,value:1}],clips:[{kind:'audio',name:'Tono',filePath:${JSON.stringify(source)},startSeconds:2,durationSeconds:2,sourceOffsetSeconds:.25,sourceDurationSeconds:4,playbackRate:1.5}]}]});
      const clip=timelineClips()[0];selectTimelineClip(clip);resetEditHistory();$('#effectsCatalog [data-fx-kind="audio"][data-fx-key="bass"]').click();if(!audioEffectEditor.open)throw Error('Audio catalog did not open editor');
      const input=$('#audioValue-bass');input.value='-12';input.dispatchEvent(new Event('input'));$('#audioEditorAnimate').checked=true;$('#audioEditorAnimate').dispatchEvent(new Event('change'));audioEditorSession.setTime(2);input.value='12';input.dispatchEvent(new Event('input'));input.blur();if(LQTACEffects.at(audioEditorSession.draft,1,'audio').bass!==0)throw Error('Audio interpolation failed');
      if(!await audioEditorSession.prepare())throw Error($('#audioEditorStatus').textContent);if(!audioEditorSession.ready||$('#audioEditorPlay').disabled)throw Error('Audio preview not ready');audioEditorSession.setTime(1);await waitMedia(audioEditorSession.media,()=>!audioEditorSession.media.seeking);if(Math.abs(audioEditorSession.media.currentTime-1)>.01||audioEditorSession.media.playbackRate!==1)throw Error('Preview processed speed/offset duplicated');
      $('#audioEditorApply').click();await new Promise(r=>setTimeout(r,80));if(audioEffectEditor.open)throw Error('Audio apply failed');
      await renderTimelineAt(2.5);const media=timelineAudioPool.get(clip);await waitMedia(media,()=>media.readyState>=2&&!media.seeking);if(media.playbackRate!==1||Math.abs(media.currentTime-.5)>.05)throw Error('Project processed speed/offset duplicated');
      if(Number(clip.dataset.sourceOffsetSeconds)!==.25||Number(clip.dataset.playbackRate)!==1.5)throw Error('Original metadata changed');
      return 'Audio editor curve, prepared listening, seek, project preview and non-destructive offset/speed OK';
    })()`));
    const project=await js('projectSnapshot()'),output=path.join(root,'animated.wav');await(await engine.startRender({project,profile:'wav',output,effectsDirectory:path.join(app.getPath('userData'),'effects-cache')})).finish();
    const {stdout}=await run(engine.ffmpegPath(),['-v','error','-i',output,'-ac','1','-ar','48000','-f','f32le','pipe:1'],{windowsHide:true,encoding:'buffer',maxBuffer:2*1024*1024});
    const rms=(a,b)=>{let sum=0,n=0;for(let i=Math.floor(a*48000);i<Math.min(stdout.length/4,b*48000);i++){const v=stdout.readFloatLE(i*4);sum+=v*v;n++;}return Math.sqrt(sum/n);};assert(rms(1.5,1.9)>rms(.1,.5)*3);assert.equal(stdout.length/4/48000,2);console.log('Final export measured ramp, active range without leading silence, source offset and 1.5x speed OK');
    const lqts=path.join(root,'animation.LQTS');await io.saveProject(lqts,project);const loaded=await io.openProject(lqts);assert.equal(loaded.project.tracks[0].clips[0].audioFx.animation.bass[1].value,12);
    console.log(await js(`(async()=>{
      await navigateHistory(false);if(clipEffectsState(timelineClips()[0],'audio').animation?.bass)throw Error('Audio undo failed');await navigateHistory(true);
      const first=timelineClips()[0];selectTimelineClip(first);timelineTime=3;splitSelectedClips();const left=timelineClips()[0],right=selectedTimelineClips[0];if(Math.abs(LQTACEffects.at(clipEffectsState(left,'audio'),1,'audio').bass)>.001||Math.abs(LQTACEffects.at(clipEffectsState(right,'audio'),0,'audio').bass)>.001)throw Error('Audio split discontinuity');
      selectTimelineClip(right);copySelectedClips();timelineTime=5;await pasteCopiedClips();if(LQTACEffects.at(clipEffectsState(selectedTimelineClips[0],'audio'),1,'audio').bass!==12)throw Error('Audio copy lost curve');
      openAudioEffectEditor(left,'bass');audioEditorSession.setTime(.5);await audioEditorSession.prepare();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      return 'Audio disk persistence, undo/redo, split continuity and copy OK';
    })()`));
    console.log(await js(`(()=>{
      if(document.querySelectorAll('#audioEditorLegend button').length!==3)throw Error('Missing EQ legend');
      const draft=audioEditorSession.draft;draft.animation.mid=[{time:0,value:6},{time:1,value:6}];draft.animation.treble=[{time:0,value:-9},{time:1,value:-9}];
      document.querySelector('#audioEditorLegend [data-parameter=bass]').click();
      const canvas=$('#audioEditorCurve'),r=canvas.getBoundingClientRect(),x=r.left+r.width*.5,y=r.top+(140-(6+18)/36*130)/150*r.height;
      canvas.dispatchEvent(new PointerEvent('pointerdown',{button:0,clientX:x,clientY:y,bubbles:true}));
      if($('#audioEditorParameter').value!=='mid')throw Error('Curve hit failed to select mid');
      window.dispatchEvent(new PointerEvent('pointermove',{clientX:x,clientY:y-10,bubbles:true}));window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
      if(draft.animation.mid.length!==3||draft.animation.mid[1].value<=6||draft.animation.treble[0].value!==-9)throw Error('Independent EQ curve edit failed');
      return 'Three EQ curves, color legend, automatic band hit and independent drag OK';
    })()`));
    await fs.writeFile(path.join(root,'audio-editor.png'),(await win.webContents.capturePage()).toPNG());console.log('ALL AUDIO EDITOR TESTS PASSED '+root);app.exit(0);
  }catch(error){console.error(error.stack);app.exit(1);}
});
