const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const root=path.join(app.getPath('temp'),'lqtac-creative-test-'+process.pid);app.setPath('userData',path.join(root,'profile'));
app.on('browser-window-created',(_e,win)=>win.webContents.setBackgroundThrottling(false));require('./main.cjs');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{console.error('Creative FX timeout');app.exit(1)},90000);timeout.unref();
  try{
    await fs.mkdir(root,{recursive:true});const engine=require('./render-engine.cjs'),io=require('./project-io.cjs'),model=require('../dist/assets/effects-model.js');
    const source=path.join(root,'pattern.mp4');await run(engine.ffmpegPath(),['-v','error','-y','-f','lavfi','-i','testsrc2=s=320x180:r=24:d=2','-c:v','libx264','-pix_fmt','yuv420p',source],{windowsHide:true});
    const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));const js=code=>win.webContents.executeJavaScript(code);await js('demoReady');
    console.log(await js(`(async()=>{
      const src=document.createElement('canvas');src.width=320;src.height=180;const ctx=src.getContext('2d'),gradient=ctx.createLinearGradient(0,0,320,180);gradient.addColorStop(0,'#090318');gradient.addColorStop(.5,'#ff8844');gradient.addColorStop(1,'white');ctx.fillStyle=gradient;ctx.fillRect(0,0,320,180);ctx.fillStyle='black';ctx.fillRect(100,50,60,60);
      const pixels=(fx,t)=>{const out=LQTACVideoEffects.draw(src,fx,t),c=document.createElement('canvas');c.width=320;c.height=180;c.getContext('2d').drawImage(out,0,0);return c.getContext('2d').getImageData(0,0,320,180).data;};
      const baseline=pixels({enabled:true},0),diff=(a,b)=>a.reduce((n,v,i)=>n+Math.abs(v-b[i]),0);window.creativeResults=[];
      const sheet=document.createElement('canvas');sheet.width=960;sheet.height=600;const sc=sheet.getContext('2d');sc.fillStyle='#08182e';sc.fillRect(0,0,960,600);let tile=0;
      for(const [key,title] of [['original','Original'],...LQTACEffects.creative]){const x=tile%3*320,y=Math.floor(tile/3)*200;sc.drawImage(LQTACVideoEffects.draw(src,key==='original'?{enabled:false}:{enabled:true,[key]:.8},.75),x,y,320,180);sc.fillStyle='#bcd5f5';sc.fillText(title,x+8,y+194);tile++;}window.creativeSheet=sheet.toDataURL('image/png').split(',')[1];
      for(const [key] of LQTACEffects.creative){const fx={enabled:true,[key]:.8},a=pixels(fx,.25),b=pixels(fx,.75),repeat=pixels(fx,.25);if(diff(a,baseline)<500)throw Error(key+' did not change pixels');if(diff(a,repeat)!==0)throw Error(key+' is not deterministic');if(['crt','vhs','glitch','film'].includes(key)&&diff(a,b)<50)throw Error(key+' does not evolve');if(diff(pixels({enabled:true,[key]:0},.25),baseline)!==0)throw Error(key+' zero is not neutral');creativeResults.push(key+' pixels / repeatability / zero OK');}
      const transparent=document.createElement('canvas');transparent.width=320;transparent.height=180;const alpha=pixels({enabled:true},0)[3];const out=LQTACVideoEffects.draw(transparent,{enabled:true,glow:1,bloom:1},0),copy=document.createElement('canvas');copy.width=320;copy.height=180;copy.getContext('2d').drawImage(out,0,0);if(copy.getContext('2d').getImageData(160,90,1,1).data[3]!==0)throw Error('Alpha lost');
      await restoreProject({format:'LQTAC Studio',version:1,name:'Creativos',library:[],tracks:[{id:'V1',kind:'video',envelope:[{time:0,value:1}],clips:[{name:'Patrón',kind:'video',filePath:${JSON.stringify(source)},startSeconds:0,durationSeconds:2,sourceDurationSeconds:2}]}]});const clip=timelineClips()[0];selectTimelineClip(clip);resetEditHistory();
      for(const [key,,fields] of LQTACEffects.creative){$('#effectsCatalog [data-fx-key="'+key+'"]').click();if(!effectEditor.open||fields.some(([p])=>!$('#editor-'+p)))throw Error('Missing editor '+key);effectEditor.close();}
      openEffectEditor(clip,'glitch');$('#editorAnimate').checked=true;$('#editorAnimate').dispatchEvent(new Event('change'));effectEditorSession.setTime(2);$('#editor-glitch').value='.8';$('#editor-glitch').dispatchEvent(new Event('input'));$('#editorSave').click();await new Promise(r=>setTimeout(r,100));if(effectEditor.open)throw Error('Cannot save creative effect');
      exportSize={width:320,height:180};window.creativeExport=await captureProjectFrame(.75,320,180);const again=await captureProjectFrame(.75,320,180);exportSize=null;if(creativeExport!==again)throw Error('Export not deterministic');
      const before=projectSnapshot();await navigateHistory(false);if(clipEffectsState(timelineClips()[0],'video').animation?.glitch)throw Error('Undo failed');await navigateHistory(true);await restoreProject(before);if(Math.abs(LQTACEffects.at(clipEffectsState(timelineClips()[0],'video'),1).glitch-.4)>.001)throw Error('Creative animation lost');
      openClipEffects(timelineClips()[0]);if(!$('#fx-film')||!$('#fx-glow'))throw Error('General editor missing creative controls');effectsDialog.close();
      return creativeResults.join('\\n')+'\\nSix individual editors, general controls, animation, history and export OK';
    })()`));
    const snapshot=await js('projectSnapshot()');await io.saveProject(path.join(root,'creative.LQTS'),snapshot);const loaded=await io.openProject(path.join(root,'creative.LQTS'));assert.equal(model.at(loaded.project.tracks[0].clips[0].videoFx,1).glitch,.4);
    await fs.writeFile(path.join(root,'export.png'),Buffer.from(await js('creativeExport'),'base64'));
    await fs.writeFile(path.join(root,'creative-sheet.png'),Buffer.from(await js('creativeSheet'),'base64'));
    console.log('ALL CREATIVE FX TESTS PASSED '+root);app.exit(0);
  }catch(error){console.error(error.stack);app.exit(1);}
});
