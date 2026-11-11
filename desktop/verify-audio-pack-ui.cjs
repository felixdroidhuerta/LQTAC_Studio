// Audio pack in the app: catalog, editors (animatable chorus/tremolo/de-esser, one curve per parameter, pitch timbre switch), live graph and pitch, pan, exact preparation,
// apply to clip, general form and processed-audio cache.
const {app,BrowserWindow}=require('electron');
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(app.getPath('temp'),'lqtac-audio-pack-ui-'+process.pid);app.setPath('userData',path.join(root,'profile'));
app.on('browser-window-created',(_e,win)=>win.webContents.setBackgroundThrottling(false));require('./main.cjs');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{console.error('Audio pack UI timeout');app.exit(1);},400000);timeout.unref();
  try{
    const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
    const js=code=>win.webContents.executeJavaScript(code);await js('demoReady');
    const out=await js(`(async()=>{
      const wait=ms=>new Promise(r=>setTimeout(r,ms)),r={};const keys=['convReverb','highpass','lowpass','gate','deesser','pitch','chorus','tremolo','lofi','widen','pan','autotune'];
      r.cards=keys.filter(k=>$('#effectsCatalog [data-fx-kind="audio"][data-fx-key="'+k+'"]')).length;
      const audio=timelineClips().find(c=>c.dataset.kind==='audio');r.editors={};
      for(const key of keys){openAudioEffectEditor(audio,key);await wait(250);const s=audioEditorSession;const params=[...$('#audioEditorParameter').options].map(o=>o.value);
        const fixed=params.map(p=>{$('#audioEditorParameter').value=p;$('#audioEditorParameter').dispatchEvent(new Event('change'));return $('#audioEditorAnimate').disabled;});
        const presets=$('#audioEffectEditor .fxp-select').options.length-1;s.live.update({...s.draft},false);
        r.editors[key]={on:s.draft[key]===true,params,fixed,presets,formant:!!$('#audioPitchFormant'),legend:!!$('#audioEditorLegend'),selects:!!$('#audio-autotuneKey')&&!!$('#audio-autotuneScale')};$('#audioEditorCancel').click();await wait(80);}
      // Live worklet exposes the new parameters.
      openAudioEffectEditor(audio,'gate');await wait(300);await audioEditorSession.live.ready;const w=audioEditorSession.live.worklet;r.worklet=w?['autotune','autotuneKey','autotuneScale','autotuneSpeed','autotuneAmount','pitch','pitchSemitones','gate','gateDb','lofi','lofiAmount','widen','widenAmount'].every(p=>w.parameters.get(p)):'sin worklet';r.panner=!!audioEditorSession.live.panner;$('#audioEditorCancel').click();await wait(80);
      // Live pitch shifter: +12 semitones on a 440 Hz tone rendered offline through the same worklet.
      {const oc=new OfflineAudioContext(2,48000,48000);await oc.audioWorklet.addModule(new URL('assets/audio-preview-worklet.js',location.href).href);const o=oc.createOscillator();o.frequency.value=440;const node=new AudioWorkletNode(oc,'lqtac-audition',{outputChannelCount:[2]});node.parameters.get('pitch').value=1;node.parameters.get('pitchSemitones').value=12;o.connect(node);node.connect(oc.destination);o.start();const data=(await oc.startRendering()).getChannelData(0);let z=0;for(let i=12001;i<48000;i++)if(data[i-1]<=0&&data[i]>0)z++;r.livePitchHz=z/(36000/48000);}
      // Live autotune: a 450 Hz tone (A4 +0.39 st) must be pulled to 440 Hz by the worklet.
      {const oc=new OfflineAudioContext(2,48000,48000);await oc.audioWorklet.addModule(new URL('assets/autotune-core.js',location.href).href);await oc.audioWorklet.addModule(new URL('assets/audio-preview-worklet.js',location.href).href);const o=oc.createOscillator();o.frequency.value=450;const node=new AudioWorkletNode(oc,'lqtac-audition',{outputChannelCount:[2]});node.parameters.get('autotune').value=1;node.parameters.get('autotuneSpeed').value=0;o.connect(node);node.connect(oc.destination);o.start();const data=(await oc.startRendering()).getChannelData(0);let z=0;for(let i=24001;i<48000;i++)if(data[i-1]<=0&&data[i]>0)z++;r.liveAutotuneHz=z/(24000/48000);}
      // Exact preparation of the autotune (pitch analysis + Rubber Band curve) with key/scale chosen in the editor.
      {openAudioEffectEditor(audio,'autotune');await wait(300);const k=$('#audio-autotuneKey'),sc=$('#audio-autotuneScale');k.value='7';k.dispatchEvent(new Event('change'));sc.value='major';sc.dispatchEvent(new Event('change'));r.autotuneDraft=[audioEditorSession.draft.autotuneKey,audioEditorSession.draft.autotuneScale];r.autotunePrepared=await audioEditorSession.prepare();$('#audioEditorCancel').click();await wait(80);}
      // Guide track: a copy of the clip on another audio track becomes the guide; the editor lists it, analyses it for live listening and prepares with it.
      {const guideTrack=$$('.track').find(t=>t.dataset.kind==='audio'&&t!==audio.parentElement);r.guideTrack=!!guideTrack;
        if(guideTrack){const copy=audio.cloneNode(true);copy.dataset.mute='true';guideTrack.append(copy);
          openAudioEffectEditor(audio,'autotune');await wait(300);const sel=$('#audio-autotuneGuideTrack');r.guideFields=['autotuneGuideTrack','autotuneGuideMode','autotuneGuideFallback','autotuneGuideOffset','autotuneRange'].every(k=>$('#audio-'+k));
          r.guideOptions=[...sel.options].map(o=>o.value);sel.value=guideTrack.dataset.track;sel.dispatchEvent(new Event('change'));const range=$('#audio-autotuneRange');range.value='7';range.dispatchEvent(new Event('input'));
          for(let i=0;i<150&&!audioEditorSession.live.guide;i++)await wait(100);r.guideLive=!!audioEditorSession.live.guide&&audioEditorSession.live.guide.melody.length>0;r.guideStatus=$('#audioEditorStatus').textContent;
          r.guideSegment=audioFxSegment(audio,audioEditorSession.draft).guide?.length;r.guideDraft=[audioEditorSession.draft.autotuneGuideTrack,audioEditorSession.draft.autotuneRange];r.guidePrepared=await audioEditorSession.prepare();$('#audioEditorCancel').click();await wait(80);
          openClipEffects(audio);await wait(200);r.guideForm=['autotuneGuideTrack','autotuneGuideMode','autotuneGuideFallback','autotuneGuideOffset','autotuneRange'].every(k=>$('#fx-'+k,effectsDialog))&&[...$('#fx-autotuneGuideTrack',effectsDialog).options].some(o=>o.value===guideTrack.dataset.track);if(effectsDialog.open)effectsDialog.close();await wait(80);copy.remove();}}
      // Live guide in the worklet: 450 Hz pulled to the guide note C5 (MIDI 72) = 523 Hz.
      {const oc=new OfflineAudioContext(2,48000,48000);await oc.audioWorklet.addModule(new URL('assets/autotune-core.js',location.href).href);await oc.audioWorklet.addModule(new URL('assets/audio-preview-worklet.js',location.href).href);const o=oc.createOscillator();o.frequency.value=450;const node=new AudioWorkletNode(oc,'lqtac-audition',{outputChannelCount:[2]});for(const [k,v] of Object.entries({autotune:1,autotuneSpeed:0,autotuneRange:7,guideActive:1,guideMidi:72}))node.parameters.get(k).value=v;o.connect(node);node.connect(oc.destination);o.start();const data=(await oc.startRendering()).getChannelData(0);let z=0;for(let i=24001;i<48000;i++)if(data[i-1]<=0&&data[i]>0)z++;r.liveGuideHz=z/(24000/48000);}
      // Exact preparation + apply for the convolution reverb with an animated mix (segment path).
      openAudioEffectEditor(audio,'convReverb');await wait(300);const s=audioEditorSession,d=Math.min(2,clipTiming(audio).durationSeconds);s.draft.convMix=.4;s.draft.animation.convMix=[{time:0,value:0},{time:d,value:.6}];
      r.prepared=await s.prepare();$('#audioEditorApply').click();await wait(800);const applied=JSON.parse(audio.dataset.audioFx||'{}');r.applied=[applied.convReverb,applied.animation?.convMix?.length];
      // General form with the new switches.
      openClipEffects(audio);await wait(200);r.form=['highpass','pitchFormant','convReverb','lofiAmount','widenAmount','pan','panPosition','autotune','autotuneAmount','autotuneKey','autotuneScale'].every(k=>$('#fx-'+k,effectsDialog));$('#fx-enabled',effectsDialog).checked=true;$('#fx-highpass',effectsDialog).checked=true;$('#fx-highpassHz',effectsDialog).value='150';
      $('#fxApply',effectsDialog).click();for(let i=0;i<200&&effectsDialog.open;i++)await wait(100);const g=JSON.parse(audio.dataset.audioFx);r.formApplied=[g.highpass,g.highpassHz];
      // Cache info and purge.
      const before=await window.lqtacDesktop.audioCacheInfo();const cleared=await window.lqtacDesktop.audioCacheClear();effectAudioCache.clear();const after=await window.lqtacDesktop.audioCacheInfo();r.cache=[before.files>0,cleared.removed+cleared.busy===before.files,after.files===cleared.busy];
      $$('.dock-panel-item').find(b=>$('strong',b)?.textContent.trim()==='FX')?.click();await wait(300);r.cacheUi=!!$('#audioCacheBox')&&$('#audioCacheInfo').textContent;{const b=$('#audioCacheClear');b.disabled=false;const cs=getComputedStyle(b);r.cacheButton=[b.classList.contains('ghost-btn'),cs.backgroundColor,cs.color];}
      return r;
    })()`);
    console.log(JSON.stringify(out,null,1));
    assert.equal(out.cards,12);assert(out.editors.autotune.selects&&out.editors.autotune.legend,'autotune editor');assert(Math.abs(out.liveAutotuneHz-440)<6,'live autotune not near 440 Hz: '+out.liveAutotuneHz);assert.deepEqual(out.autotuneDraft,[7,'major']);assert.equal(out.autotunePrepared,true);
    for(const [k,e] of Object.entries(out.editors)){assert(e.on,k+' not enabled');assert(e.presets>=2,k+' presets');}
    assert.deepEqual(out.editors.chorus.fixed,[false,false]);assert.deepEqual(out.editors.tremolo.fixed,[false,false]);assert.deepEqual(out.editors.deesser.fixed,[false]);assert.deepEqual(out.editors.pan.fixed,[false]);assert(out.editors.chorus.legend&&out.editors.tremolo.legend&&!out.editors.pan.legend,'one curve per parameter');assert(Math.abs(out.livePitchHz-880)<30,'live pitch +12 not near 880 Hz');assert(out.panner);assert(out.cacheButton[0]&&out.cacheButton[1]!=='rgb(239, 239, 239)','cache button style');assert.deepEqual(out.editors.convReverb.fixed,[false,true]);assert.deepEqual(out.editors.highpass.fixed,[false]);
    assert(out.editors.pitch.formant);assert.equal(out.worklet,true);assert.equal(out.prepared,true);assert.deepEqual(out.applied,[true,2]);
    assert(out.form);assert.deepEqual(out.formApplied,[true,150]);assert.deepEqual(out.cache,[true,true,true]);assert(out.cacheUi);
    assert(out.guideTrack,'demo needs a second audio track');assert(out.guideFields&&out.guideForm,'guide fields');assert(out.guideLive,'guide melody for live listening: '+out.guideStatus);assert(out.guideSegment>0);assert.equal(out.guidePrepared,true);assert.equal(out.guideDraft[1],7);assert(Math.abs(out.liveGuideHz-523.25)<8,'live guide not near 523 Hz: '+out.liveGuideHz);
    console.log('AUDIO PACK UI VERIFICATION PASSED');app.exit(0);
  }catch(error){console.error(error);app.exit(1);}
});
