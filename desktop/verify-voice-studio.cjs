// "Voz de estudio": analysis, report, listening copy, apply (managed keys only), undo, effects panel with the new fields.
// Usage: desktop\node_modules\.bin\electron.cmd desktop\verify-voice-studio.cjs
const {app,BrowserWindow}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const root=path.join(app.getPath('temp'),'lqtac-voice-studio-test-'+process.pid);app.setPath('userData',path.join(root,'profile'));
require('./main.cjs');
app.whenReady().then(async()=>{const timeout=setTimeout(()=>app.exit(1),180000);timeout.unref();try{
  await fs.mkdir(root,{recursive:true});const ff=require('./render-engine.cjs').ffmpegPath(),take=path.join(root,'toma voz.wav'),mp4=path.join(root,'plano.mp4'),bed=path.join(root,'base.wav');
  // Speech-like bursts, too hot (clipped in 16 bit), over a constant noise floor.
  await run(ff,['-v','error','-y','-f','lavfi','-i',"anoisesrc=c=pink:a=0.3:d=10,lowpass=f=6000,volume='if(lt(mod(t,1.3),0.9),5,0)':eval=frame",'-f','lavfi','-i','anoisesrc=c=white:a=0.006:d=10','-filter_complex','[0][1]amix=inputs=2:normalize=0','-ar','48000','-ac','1','-c:a','pcm_s16le',take],{windowsHide:true});
  await run(ff,['-v','error','-y','-f','lavfi','-i','testsrc2=s=320x180:d=4:r=25','-pix_fmt','yuv420p',mp4],{windowsHide:true});
  // Backing that sits on the voice's clarity zone (2.5–5 kHz).
  await run(ff,['-v','error','-y','-f','lavfi','-i','anoisesrc=c=white:a=0.5:d=10,bandpass=f=3500:width_type=h:w=2500','-ar','48000','-ac','2','-c:a','pcm_s16le',bed],{windowsHide:true});
  const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));const js=c=>win.webContents.executeJavaScript(c,true);await js('demoReady');
  const wait=(cond,ms=60000)=>js(`(async()=>{const end=Date.now()+${ms};while(Date.now()<end){if(${cond})return true;await new Promise(r=>setTimeout(r,100));}return false;})()`);
  const before=JSON.parse(await js(`(async()=>{await restoreProject({format:'LQTAC Studio',version:1,name:'Voz de estudio',library:[],tracks:[]});resetEditHistory();
    const a=createTimelineClip(addTimelineTrack('audio'),{kind:'audio',name:'toma voz.wav',filePath:${JSON.stringify(take)},durationSeconds:10,sourceDurationSeconds:10,sourceOffsetSeconds:0},0);
    const v=createTimelineClip(addTimelineTrack('video'),{kind:'video',name:'plano.mp4',filePath:${JSON.stringify(mp4)},durationSeconds:4,sourceDurationSeconds:4,sourceOffsetSeconds:0},0);const bt=addTimelineTrack('audio');createTimelineClip(bt,{kind:'audio',name:'base.wav',filePath:${JSON.stringify(bed)},durationSeconds:10,sourceDurationSeconds:10,sourceOffsetSeconds:0},0);refreshTimelineScale();
    a.dataset.audioFx=JSON.stringify({...LQTACEffects.audioDefaults,enabled:true,reverb:true,reverbMix:.3,presence:2,animation:{presence:[{time:0,value:0},{time:5,value:4}],reverbMix:[{time:0,value:.1},{time:9,value:.3}]}});
    const menu=()=>document.querySelector('.clip-context-menu'),open=clip=>{const b=clip.getBoundingClientRect();clip.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:b.left+5,clientY:b.top+5}));},btn=()=>menu().querySelector('[data-action="voice-studio"]');
    open(v);const onVideo=btn().style.display;document.body.click();open(a);const onAudio=btn().style.display;btn().click();
    return JSON.stringify({onVideo,onAudio,dialog:document.querySelector('#voiceStudioDialog').open});})()`));
  assert.deepEqual(before,{onVideo:'none',onAudio:'block',dialog:true});
  await js(`$('#vsAnalyze').click()`);assert(await wait(`!$('#vsApply').disabled&&$$('#vsReport li').length>5`),'analysis finished: '+await js(`$('#vsStatus').textContent`));
  const report=JSON.parse(await js(`JSON.stringify({items:$$('#vsReport li').map(li=>[li.dataset.status,li.querySelector('b').textContent]),status:$('#vsStatus').textContent,settings:LQTACVoiceStudio.session.result.settings})`));
  console.log(JSON.stringify(report));
  await fs.writeFile(path.join(root,'dialog.png'),(await win.webContents.capturePage()).toPNG());
  const titles=report.items.map(i=>i[1]);
  assert(titles.includes('Saturación')&&report.items.find(i=>i[1]==='Saturación')[0]!=='ok','clipping found');
  assert.equal(report.items.find(i=>i[1]==='Ruido de fondo')[0],'fix','noise found');
  assert.equal(report.settings.declip,true);assert.equal(report.settings.voiceDeep,true);assert.notEqual(report.settings.voiceAi,true);assert.equal(report.settings.normalize,true);assert.equal(report.settings.targetLufs,-16);
  // Song profile: no speech AI (neither model), classic denoise instead, −14 LUFS.
  await js(`(()=>{const s=$('#vsProfile');s.value='song';s.dispatchEvent(new Event('change'));})()`);assert(await wait(`LQTACVoiceStudio.session.result.profile==='song'`,10000));
  const song=JSON.parse(await js(`JSON.stringify(LQTACVoiceStudio.session.result.settings)`));assert.equal(song.voiceAi,false);assert.equal(song.voiceDeep,false);assert.equal(song.denoise,true);assert.equal(song.targetLufs,-14);
  await js(`(()=>{const s=$('#vsProfile');s.value='podcast';s.dispatchEvent(new Event('change'));})()`);assert(await wait(`LQTACVoiceStudio.session.result.profile==='podcast'`,10000));
  // Listening copy, then apply.
  await js(`$('#vsStudio').click()`);assert(await wait(`/Escuchando la voz de estudio/.test($('#vsStatus').textContent)`,90000),'studio preview: '+await js(`$('#vsStatus').textContent`));
  await js(`$('#vsApply').click()`);assert(await wait(`!$('#voiceStudioDialog').open`,90000),'apply: '+await js(`$('#vsStatus').textContent`));
  const applied=JSON.parse(await js(`JSON.stringify(clipEffectsState(timelineClips().find(c=>c.dataset.kind==='audio'),'audio'))`));
  assert.equal(applied.enabled,true);assert.equal(applied.voiceDeep,true);assert.equal(applied.declip,true);assert.equal(applied.limiter,true);
  assert.equal(applied.reverb,true,'creative effects kept');assert.equal(applied.reverbMix,.3);assert(applied.animation.reverbMix,'unmanaged curve kept');assert(!applied.animation.presence,'managed curve removed');
  await js(`navigateHistory(false)`);const undone=JSON.parse(await js(`JSON.stringify(clipEffectsState(timelineClips().find(c=>c.dataset.kind==='audio'),'audio'))`));assert.equal(undone.voiceDeep,false);assert(undone.animation.presence,'undo restores the curve');
  await js(`navigateHistory(true)`);
  // Effects panel shows and keeps the new fields.
  const panel=JSON.parse(await js(`(async()=>{const clip=timelineClips().find(c=>c.dataset.kind==='audio');applyTimelineSelection([clip]);openClipEffects(clip);await new Promise(r=>setTimeout(r,200));const out={voiceDeep:$('#fx-voiceDeep').checked,declip:$('#fx-declip').checked,lowMid:$('#fx-lowMid').value,presence:$('#fx-presence').value};$('#fx-voiceDeepDb').value='30';$('#effectsDialog form').requestSubmit();return JSON.stringify(out);})()`));
  assert.deepEqual([panel.voiceDeep,panel.declip],[true,true]);
  assert(await wait(`!$('#effectsDialog').open`,90000),'effects panel apply');
  assert.equal(JSON.parse(await js(`JSON.stringify(clipEffectsState(timelineClips().find(c=>c.dataset.kind==='audio'),'audio').voiceDeepDb)`)),30);
  await fs.writeFile(path.join(root,'voice.png'),(await win.webContents.capturePage()).toPNG());
  // Fit with the backing: track list, mix style, tuning request, optional backing cut, one undo step for everything.
  const fit=JSON.parse(await js(`(()=>{const clip=timelineClips().find(c=>c.dataset.kind==='audio'&&c.dataset.filePath.endsWith('toma voz.wav'));LQTACVoiceStudio.open(clip);const boxes=$$('#vsTracks input');boxes.forEach(b=>{if(!b.disabled)b.checked=true;});$('#vsTracks').dispatchEvent(new Event('change',{bubbles:true}));$('#vsTune').checked=true;$('#vsStyle').value='front';$('#vsAnalyze').click();return JSON.stringify({boxes:boxes.length,enabled:boxes.filter(b=>!b.disabled).length});})()`));
  assert.deepEqual(fit,{boxes:1,enabled:1});
  assert(await wait(`!$('#vsApply').disabled&&$$('#vsReport li').length>5`,120000),'backing analysis: '+await js(`$('#vsStatus').textContent`));
  const fitReport=JSON.parse(await js(`JSON.stringify({items:$$('#vsReport li').map(li=>[li.dataset.status,li.querySelector('b').textContent,li.querySelector('span').textContent]),cut:LQTACVoiceStudio.session.result.backingCut,cutShown:!$('#vsCutRow').hidden,status:$('#vsStatus').textContent})`));console.log(JSON.stringify(fitReport));
  assert(fitReport.items.some(i=>i[1]==='La música tapa la voz'),'masking found');assert(fitReport.cut<0&&fitReport.cutShown,'cut offered');
  assert(fitReport.items.some(i=>i[1]==='Volumen final'&&/sobre la base/.test(i[2])),'level set against the backing');assert(fitReport.items.some(i=>i[1]==='Afinación'),'tuning reported');assert(/pista de base/.test(fitReport.status));
  await fs.writeFile(path.join(root,'fit.png'),(await win.webContents.capturePage()).toPNG());
  await js(`$('#vsCut').checked=true;$('#vsApply').click()`);assert(await wait(`!$('#voiceStudioDialog').open`,120000),'apply with cut: '+await js(`$('#vsStatus').textContent`));
  const after=JSON.parse(await js(`JSON.stringify(timelineClips().filter(c=>c.dataset.kind==='audio').map(c=>{const f=clipEffectsState(c,'audio');return [c.dataset.name||c.dataset.filePath.slice(-8),f.enabled,f.presence,f.targetLufs];}))`));console.log(JSON.stringify(after));
  const bedFx=JSON.parse(await js(`JSON.stringify(clipEffectsState(timelineClips().find(c=>c.dataset.filePath.endsWith('base.wav')),'audio'))`));assert(bedFx.enabled===true&&bedFx.presence===fitReport.cut,'backing cut applied');
  await js(`navigateHistory(false)`);const back=JSON.parse(await js(`JSON.stringify(clipEffectsState(timelineClips().find(c=>c.dataset.filePath.endsWith('base.wav')),'audio'))`));assert(!back.enabled,'one undo restores the backing');
  console.log('Backing fit, cut and undo OK');
  console.log('VOICE STUDIO PASSED '+root);app.exit(0);
}catch(e){console.error(e.stack);app.exit(1)}});
