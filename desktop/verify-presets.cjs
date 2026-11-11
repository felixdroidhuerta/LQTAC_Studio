// Verifies factory and user effect presets in the video and audio editors, persistence and .lqfx exchange.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(app.getPath('temp'),'lqtac-presets-test-'+process.pid);app.setPath('userData',path.join(root,'profile'));
app.on('browser-window-created',(_e,win)=>win.webContents.setBackgroundThrottling(false));require('./main.cjs');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{console.error('Presets verification timeout');app.exit(1);},180000);timeout.unref();
  try{
    // Store: export/import with stubbed dialogs.
    const exported=path.join(root,'mine.lqfx');await fs.mkdir(root,{recursive:true});
    const store=require('./presets-store.cjs').createPresetsStore({directory:path.join(root,'store'),dialog:{showSaveDialog:async()=>({canceled:false,filePath:exported}),showOpenDialog:async()=>({canceled:false,filePaths:[exported]})},getWindow:()=>null});
    const sample=[{id:'a',name:'Prueba',kind:'video',key:'saturation',values:{saturation:.5},animation:null}];
    await store.save(sample);assert.deepEqual(await store.load(),sample);await store.exportPresets(sample,'x');assert.deepEqual((await store.importPresets()).presets,sample);
    await assert.rejects(store.save([{name:'',kind:'video',key:'x',values:{}}]));await fs.writeFile(exported,'{"format":"otro"}');await assert.rejects(store.importPresets(),/no contiene presets/);
    console.log('Store save/load, export/import and rejection OK');

    const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
    const js=code=>win.webContents.executeJavaScript(code);await js('demoReady');
    const out=await js(`(async()=>{
      const wait=ms=>new Promise(r=>setTimeout(r,ms)),r={};
      const clip=timelineClips().find(c=>c.dataset.kind==='video'),duration=clipTiming(clip).durationSeconds;
      const pick=label=>{const s=$('#effectEditor .fxp-select'),o=[...s.options].find(x=>x.textContent===label);if(!o)throw Error('Preset no encontrado: '+label);s.value=o.value;s.dispatchEvent(new Event('change'));};
      openEffectEditor(clip,'saturation');await wait(300);
      r.factoryCount=$('#effectEditor .fxp-select').options.length-1;
      pick('Blanco y negro');r.bw=effectEditorSession.draft.saturation;r.field=$('#editor-saturation').value;
      pick('Color → blanco y negro (animado)');const curve=effectEditorSession.draft.animation.saturation;r.anim=[curve.length,curve[0].value,curve.at(-1).value,Math.abs(curve.at(-1).time-duration)<.002];
      // Invalid preset is rejected and the draft is untouched.
      const before=JSON.stringify(effectEditorSession.draft);let rejected=false;try{LQTACPresets.applyTo(effectEditorSession.draft,{values:{saturation:9}},{kind:'video',key:'saturation',parameters:['saturation'],duration});}catch{rejected=true;}r.invalidRejected=rejected&&JSON.stringify(effectEditorSession.draft)===before;
      // Keys outside the effect are ignored (a saturation preset cannot change brightness).
      LQTACPresets.applyTo(effectEditorSession.draft,{values:{saturation:.8,brightness:.9}},{kind:'video',key:'saturation',parameters:['saturation'],duration});r.foreignIgnored=effectEditorSession.draft.brightness===0;
      // Save a user preset with animation.
      $('#effectEditor .fxp-save').click();$('#effectEditor .fxp-name').value='Mi desaturado';$('#effectEditor .fxp-anim').checked=true;
      effectEditorSession.draft.animation.saturation=[{time:0,value:1},{time:duration/2,value:.2}];$('#effectEditor .fxp-ok').click();await wait(300);
      r.saved=(await window.lqtacDesktop.presetsLoad()).map(p=>[p.name,p.key,p.animation?.saturation?.[1]?.t]);
      $('#editorSave').click();await wait(300);r.appliedToClip=JSON.parse(clip.dataset.videoFx).animation.saturation.length;
      // Reopen: the user preset is listed and reapplies with times scaled to the clip.
      openEffectEditor(clip,'saturation');await wait(300);r.listed=[...$('#effectEditor .fxp-select').options].some(o=>o.textContent==='Mi desaturado · animado');
      effectEditorSession.draft.animation={};pick('Mi desaturado · animado');r.reapplied=effectEditorSession.draft.animation.saturation.map(p=>[+p.time.toFixed(2),p.value]);
      $('#editorCancel').click();await wait(100);
      // Chroma preset drives the zone selector.
      openEffectEditor(clip,'chroma');await wait(400);pick('Fondo verde · proteger personas (IA rápida)');r.chroma=[effectEditorSession.draft.chromaZone,$('#editorChroma').checked,$('#effectEditor input[name=chromaZone][value=people]').checked];$('#editorCancel').click();await wait(100);
      // Audio editor.
      const audio=timelineClips().find(c=>c.dataset.kind==='audio');openAudioEffectEditor(audio,'bass');await wait(500);
      const s=$('#audioEffectEditor .fxp-select'),o=[...s.options].find(x=>x.textContent==='Teléfono / radio');s.value=o.value;s.dispatchEvent(new Event('change'));
      r.audio=[audioEditorSession.draft.bass,audioEditorSession.draft.mid,audioEditorSession.draft.treble,$('#audioValue-bass').value];
      $('#audioEditorCancel').click();await wait(100);
      openAudioEffectEditor(audio,'compressor');await wait(500);const s2=$('#audioEffectEditor .fxp-select'),o2=[...s2.options].find(x=>x.textContent==='Voz de podcast');s2.value=o2.value;s2.dispatchEvent(new Event('change'));r.compressor=[audioEditorSession.draft.compressor,audioEditorSession.draft.thresholdDb,audioEditorSession.draft.ratio];$('#audioEditorCancel').click();
      return r;
    })()`);
    console.log(JSON.stringify(out));
    assert(out.factoryCount>=4);assert.equal(out.bw,0);assert.equal(Number(out.field),0);assert.deepEqual(out.anim,[2,1,0,true]);
    assert(out.invalidRejected,'invalid preset applied');assert(out.foreignIgnored,'foreign key applied');
    assert.deepEqual(out.saved,[['Mi desaturado','saturation',.5]]);assert.equal(out.appliedToClip,2);assert(out.listed);
    assert.equal(out.reapplied[1][1],.2);assert.deepEqual(out.chroma,['people',true,true]);
    assert.deepEqual(out.audio.slice(0,3),[-18,6,-12]);assert.deepEqual(out.compressor,[true,-20,3]);
    console.log('Video/audio presets, animation scaling, validation, user presets and chroma zone OK');app.exit(0);
  }catch(error){console.error(error);app.exit(1);}
});
