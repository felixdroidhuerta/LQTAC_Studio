const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const root=path.join(app.getPath('temp'),'lqtac-effects-test-'+process.pid);app.setPath('userData',path.join(root,'profile'));
app.on('browser-window-created',(_event,win)=>win.webContents.setBackgroundThrottling(false));require('./main.cjs');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{console.error('Effects verification timeout');app.exit(1);},120000);timeout.unref();
  try{
    await fs.mkdir(root,{recursive:true});const engine=require('./render-engine.cjs'),model=require('../dist/assets/effects-model.js'),service=require('./effects-audio.cjs');
    const source=path.join(root,'source.mp4');await run(engine.ffmpegPath(),['-v','error','-y','-f','lavfi','-i','color=c=0x404040:s=160x90:r=24:d=1','-f','lavfi','-i','sine=frequency=120:duration=1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-ac','2','-shortest',source],{windowsHide:true});
    const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));const js=code=>win.webContents.executeJavaScript(code);await js('demoReady');
    console.log(await js(`(()=>{
      applyTimelineSelection([]);const tab=$$('.dock-panel-item').find(b=>$('strong',b)?.textContent==='FX');tab.click();if(effectsPanel.hidden||!$('#mediaList').hidden||$$('#effectsCatalog button').length<15)throw Error('FX tab did not replace library without selection');
      $$('.dock-panel-item').find(b=>$('strong',b)?.textContent==='Project Media').click();if(!effectsPanel.hidden||$('#mediaList').hidden)throw Error('Returning to library failed');
      const source=document.createElement('canvas');source.width=source.height=32;const ctx=source.getContext('2d');ctx.fillStyle='rgb(64,64,64)';ctx.fillRect(0,0,32,32);
      const read=(fx,x=16,y=16)=>{const out=LQTACVideoEffects.draw(source,{enabled:true,...fx}),c=document.createElement('canvas');c.width=c.height=32;c.getContext('2d').drawImage(out,0,0);return c.getContext('2d').getImageData(x,y,1,1).data;};
      if(Math.abs(read({})[0]-64)>2)throw Error('Neutral video effects changed pixel');if(read({brightness:.25})[0]<125)throw Error('Brightness failed');
      const warm=read({temperature:1});if(warm[0]<=warm[2]+40)throw Error('Temperature failed');
      ctx.fillStyle='red';ctx.fillRect(0,0,32,32);const gray=read({saturation:0});if(Math.abs(gray[0]-gray[1])>2||Math.abs(gray[1]-gray[2])>2)throw Error('Saturation failed');
      ctx.fillStyle='#00ff00';ctx.fillRect(0,0,32,32);if(read({chroma:true})[3]>2)throw Error('Chroma alpha failed');
      ctx.fillStyle='white';ctx.fillRect(0,0,32,32);if(read({vignette:1},1,1)[0]>=read({vignette:1})[0]-40)throw Error('Vignette failed');
      const values=[];for(let b=0;b<2;b++)for(let g=0;g<2;g++)for(let r=0;r<2;r++)values.push([1-r,1-g,1-b].join(' '));const lut=LQTACEffects.parseCube('LUT_3D_SIZE 2\\n'+values.join('\\n'),'Invert.cube');
      ctx.fillStyle='black';ctx.fillRect(0,0,32,32);if(read({lut})[0]<250)throw Error('Embedded LUT failed');
      for(const fx of [{blur:4},{sharpen:1},{contrast:1.5}])read(fx);
      return 'Video pixels: neutral, brightness, temperature, saturation, vignette, chroma, LUT, blur and sharpen OK';
    })()`));
    const fx={...model.audioDefaults,enabled:true,bass:6,compressor:true,limiter:true,denoise:true,normalize:true,echo:true,reverb:true};
    const prepared=await service.prepare(source,fx,path.join(root,'cache'));assert.equal(await service.prepare(source,fx,path.join(root,'cache')),prepared);await run(engine.ffmpegPath(),['-v','error','-i',prepared,'-f','null','-'],{windowsHide:true});console.log('All audio filters, float WAV cache, cache reuse and decode OK');
    console.log(await js(`(async()=>{
      const project={format:'LQTAC Studio',version:1,name:'FX test',library:[],tracks:[{id:'V1',kind:'video',envelope:[{time:0,value:1}],clips:[{kind:'video',name:'Video',filePath:${JSON.stringify(source)},startSeconds:0,durationSeconds:1,groupId:'pair',videoFx:{enabled:true,brightness:.25}}]},{id:'A1',kind:'audio',envelope:[{time:0,value:1}],clips:[{kind:'audio',name:'Audio',filePath:${JSON.stringify(source)},startSeconds:0,durationSeconds:1,groupId:'pair',audioFx:${JSON.stringify(fx)}}]}]};
      await restoreProject(project);const video=timelineClips().find(c=>c.dataset.kind==='video'),audio=timelineClips().find(c=>c.dataset.kind==='audio');
      await renderTimelineAt(.25);const media=timelineAudioPool.get(audio);await waitMedia(media,()=>media.readyState>=2);if(media.error||media.dataset.source===audio.dataset.filePath)throw Error('Processed audio preview missing');
      resetEditHistory();openClipEffects(video);document.querySelector('#fx-brightness').value='.5';document.querySelector('#fxApply').click();while(effectsBusy)await new Promise(r=>setTimeout(r,10));
      if(clipEffectsState(video,'video').brightness!==.5)throw Error('Effects UI apply failed');await navigateHistory(false);if(clipEffectsState(timelineClips()[0],'video').brightness!==.25)throw Error('Effects undo failed');await navigateHistory(true);
      selectTimelineClip(timelineClips().find(c=>c.dataset.kind==='video'));$$('.dock-panel-item').find(b=>$('strong',b)?.textContent==='FX').click();$('#effectsCatalog [data-fx-kind="video"][data-fx-key="brightness"]').click();if(!effectEditor.open)throw Error('FX catalog does not open video configuration');effectEditor.close();
      const snapshot=projectSnapshot();await restoreProject(snapshot);if(clipEffectsState(timelineClips()[0],'video').brightness!==.5)throw Error('Effects roundtrip failed');
      selectTimelineClip(timelineClips()[0]);copySelectedClips();timelineTime=2;await pasteCopiedClips();if(!selectedTimelineClips.some(c=>clipEffectsState(c,'video').brightness===.5))throw Error('Paste lost effects');
      exportSize={width:640,height:360};const png=await captureProjectFrame(.25,640,360);exportSize=null;
      const img=new Image();img.src='data:image/png;base64,'+png;await img.decode();const c=document.createElement('canvas');c.width=640;c.height=360;c.getContext('2d').drawImage(img,0,0);if(c.getContext('2d').getImageData(320,180,1,1).data[0]<170)throw Error('Export frame lost effects');
      selectTimelineClip(timelineClips()[0]);timelineTime=.5;splitSelectedClips();if(!selectedTimelineClips.some(c=>clipEffectsState(c,'video').brightness===.5))throw Error('Split lost video effects');if(!selectedTimelineClips.some(c=>clipEffectsState(c,'audio').enabled))throw Error('Split lost audio effects');
      return 'Audio preview, UI, undo/redo, persistence, copy/paste, split and video export pixels OK';
    })()`));
    console.log(await js(`(async()=>{const audio=timelineClips().find(c=>c.dataset.kind==='audio');openAudioEffectEditor(audio,'compressor');if(!audioEffectEditor.open||!$('#audioValue-thresholdDb')||$('#audioValue-bass'))throw Error('Audio individual controls failed');await audioEditorSession.prepare();if(!audioEditorSession.ready)throw Error('Audio clip preview preparation failed: '+$('#audioEditorStatus').textContent);audioEffectEditor.close();await new Promise(r=>setTimeout(r,20));return 'Individual audio filter and local clip listening prepared OK';})()`));
    const project=await js('projectSnapshot()'),output=path.join(root,'effects.wav');await(await engine.startRender({project,profile:'wav',output,effectsDirectory:path.join(root,'cache')})).finish();await run(engine.ffmpegPath(),['-v','error','-i',output,'-f','null','-'],{windowsHide:true});
    await js("openEffectsPanel();new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");await fs.writeFile(path.join(root,'effects-panel.png'),(await win.webContents.capturePage()).toPNG());
    console.log('Processed project audio export OK');console.log('ALL EFFECTS TESTS PASSED '+root);app.exit(0);
  }catch(error){console.error(error.stack);app.exit(1);}
});
