const {app,BrowserWindow,dialog}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const root=path.join(app.getPath('temp'),'lqtac-vegas-test-'+process.pid);app.setPath('userData',path.join(root,'profile'));
app.on('browser-window-created',(_event,win)=>win.webContents.setBackgroundThrottling(false));
require('./main.cjs');
app.whenReady().then(async()=>{
  const timer=setTimeout(()=>app.exit(1),180000);timer.unref();
  try{
    await fs.mkdir(root,{recursive:true});const engine=require('./render-engine.cjs'),bridge=require('./vegas-bridge.cjs'),io=require('./project-io.cjs'),work=require('../dist/assets/work-model.js');
    const media=path.join(root,'vídeo test.mp4'),veg=path.join(root,'Proyecto ü.veg');
    await run(engine.ffmpegPath(),['-v','error','-y','-f','lavfi','-i','testsrc2=s=320x180:r=24:d=3','-f','lavfi','-i','sine=frequency=440:duration=3','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-ac','2','-shortest',media],{windowsHide:true});
    await fs.writeFile(veg,'RIFF synthetic test only');
    const curves=Object.fromEntries(['Linear','Fast','Slow','Smooth','Sharp','None'].map(type=>[type,Array.from({length:257},(_,i)=>work.curveFormula(type,i/256))]));
    const stream={Index:0,MediaType:'Video',Width:320,Height:180,PixelAspectRatio:1},audio={Index:1,MediaType:'Audio',Channels:2};
    const fade={Length:.125,Curve:'Smooth',ReciprocalCurve:'Smooth',Gain:.8,transition:null};
    const event={id:'event-v',Name:'Video',MediaType:'Video',Start:.1234567,Length:.75,PlaybackRate:2,Mute:false,Loop:true,MaintainAspectRatio:true,groupId:'sync',fadeIn:fade,fadeOut:fade,effects:[],envelopes:[],
      takes:[{IsActive:true,Name:'Video',MediaPath:media,Offset:.25,FirstAudioChannelIndex:0,AudioChannelCount:2,stream,media:{Length:3,IsOffline:false,fileExists:true,IsGenerated:false,IsSubclip:false,streams:[stream,audio],effects:[]}}],
      motion:{keyframes:[{Position:0,Type:'Linear',Smoothness:0,Rotation:0,bounds:{TopLeft:{X:0,Y:0},TopRight:{X:320,Y:0},BottomLeft:{X:0,Y:180},BottomRight:{X:320,Y:180}}}]}};
    const ae=structuredClone(event);ae.id='event-a';ae.MediaType='Audio';ae.PlaybackRate=1;ae.Channels='None';ae.PitchLock=true;ae.takes[0].stream=audio;
    const d={format:'LQTAC VEGAS bridge',version:1,exporterVersion:'0.5.0',vegasVersion:'Synthetic fixture',sourceSha256:crypto.createHash('sha256').update(await fs.readFile(veg)).digest('hex'),project:{FilePath:veg},video:{FrameRate:24,PixelAspectRatio:1,FieldOrder:'ProgressiveScan'},audio:{MasterBusMode:'Stereo'},nativeCurves:curves,readErrors:[],modifiedBefore:false,modifiedAfter:false,
      tracks:[{id:'V1',Index:0,MediaType:'Video',CompositeMode:'SrcAlpha',CompositeLevel:1,effects:[],envelopes:[],events:[event]},{id:'A1',Index:1,MediaType:'Audio',Volume:.5,PanX:0,bus:{Name:'Master',PanType:'Add'},effects:[{Bypass:false,plugin:{Name:'Explicitly omitted test FX'}}],envelopes:[],events:[ae]}]};
    const converted=bridge.convertBridge(d);assert.deepEqual(converted.report.errors,[]);assert.equal(converted.project.tracks[0].clips[0].startSeconds,.1234567);assert.equal(converted.project.tracks[0].clips[0].sourceOffsetSeconds,.25);assert(converted.report.warnings.some(w=>w.code==='OMITTED_PLUGIN'));
    for(const mutate of [x=>x.video.FrameRate=29.97,x=>x.tracks[0].events[0].PlaybackRate=-1,x=>x.tracks[0].events[0].motion.keyframes[0].Rotation=.2,x=>x.tracks[1].PanX=.5,x=>x.readErrors.push('unread field'),x=>x.tracks[0].events[0].takes.push(structuredClone(x.tracks[0].events[0].takes[0]))]){const bad=structuredClone(d);mutate(bad);assert.equal(bridge.convertBridge(bad).project,null);}
    const sidecar=veg+'.20990101.lqtac.json';await fs.writeFile(sidecar,JSON.stringify(d));assert.equal((await bridge.openVegas(veg)).report.errors.length,0);
    await fs.appendFile(veg,'changed');await assert.rejects(()=>bridge.openVegas(veg),/no corresponde/);await fs.writeFile(veg,'RIFF synthetic test only');
    console.log('Strict mapping, Unicode paths, omissions and stale VEG rejection OK');
    const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));const js=s=>win.webContents.executeJavaScript(s);
    dialog.showOpenDialog=async()=>({canceled:false,filePaths:[veg]});const imported=await js('lqtacDesktop.openVegasProject()');assert.equal(imported.report.mapping.length,2);
    assert.equal((await js(`lqtacDesktop.openVegasProject(${JSON.stringify(veg)})`)).report.mapping.length,2);
    await js(`(async()=>{await demoReady;await restoreProject(${JSON.stringify(imported.project)});})()`);
    let snapshot=await js('projectSnapshot()');assert.equal(snapshot.tracks[0].vegasMix,true);assert.equal(snapshot.tracks[0].clips[0].autoCrossfade,false);assert.equal(snapshot.tracks[0].clips[0].fadeInCurve,'Smooth');assert.equal(snapshot.tracks[0].clips[0].startSeconds,.1234567);
    const saved=path.join(root,'converted.LQTS');await io.saveProject(saved,snapshot);snapshot=(await io.openProject(saved)).project;assert.deepEqual(snapshot.compatibility,imported.report);assert.deepEqual(snapshot.tracks[0].clips[0].vegasCurves,curves);
    console.log('VEG IPC opening and LQTS round-trip with curves / provenance OK');
    const output=path.join(root,'audio.wav');await(await engine.startRender({project:snapshot,profile:'wav',output})).finish();await run(engine.ffmpegPath(),['-v','error','-i',output,'-f','null','-'],{windowsHide:true});
    console.log('Calibrated audio curves export decoded OK');
    const image=await js(`(async()=>{exportSize={width:640,height:360};const png=await captureProjectFrame(.4,640,360);exportSize=null;return png;})()`);assert(Buffer.from(image,'base64').length>1000);
    console.log('VEGAS track compositor frame export OK');
    const actual=process.argv.find(x=>x.endsWith('current-bridge.json'));
    if(actual){const real=await bridge.readBridge(actual);assert.deepEqual(real.report.errors,[]);await js(`restoreProject(${JSON.stringify(real.project)})`);
      const restored=await js('projectSnapshot()');assert.equal(restored.tracks.length,real.project.tracks.length);assert.equal(restored.tracks.flatMap(t=>t.clips).length,real.report.mapping.length);
      for(let t=0;t<real.project.tracks.length;t++)for(let c=0;c<real.project.tracks[t].clips.length;c++){for(const key of ['startSeconds','durationSeconds','sourceOffsetSeconds','playbackRate','groupId'])assert.equal(restored.tracks[t].clips[c][key],real.project.tracks[t].clips[c][key]);}
      const comparison=[],refArg=process.argv.find(x=>x.startsWith('--reference=')),reference=refArg?.slice('--reference='.length);
      for(const time of [0,4.5,13.5,58,77]){const png=await js(`(async()=>{exportSize={width:640,height:360};const png=await captureProjectFrame(${time},640,360);exportSize=null;return png;})()`);await fs.writeFile(path.join(root,'real-'+time+'.png'),Buffer.from(png,'base64'));
        if(reference){const ref=(await fs.readFile(path.join(reference,'frame-'+time+'.png'))).toString('base64');const metrics=await js(`(async()=>{
          const read=async(data)=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const c=document.createElement('canvas');c.width=64;c.height=36;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,64,36);return ctx.getImageData(0,0,64,36).data;};
          const a=await read(${JSON.stringify(ref)}),b=await read(${JSON.stringify(png)});let mae=0,rmse=0,n=0;for(let i=0;i<a.length;i++)if(i%4!==3){mae+=Math.abs(a[i]-b[i]);rmse+=(a[i]-b[i])**2;n++;}return {mae:mae/n,rmse:Math.sqrt(rmse/n)};
        })()`);comparison.push({time,...metrics});assert(metrics.mae<15,'Referencia VEGAS fuera de tolerancia visual en '+time+' s');}
      }
      if(comparison.length){await fs.writeFile(path.join(root,'comparison.json'),JSON.stringify(comparison,null,2));console.log('VEGAS reference comparison RGB/255: '+JSON.stringify(comparison));}
      console.log('Actual project: '+real.project.tracks.length+' tracks / '+real.report.mapping.length+' events; exact numeric round-trip and five captured frames OK');
    }
    console.log('ALL VEGAS BRIDGE TESTS PASSED '+root);app.exit(0);
  }catch(e){console.error(e.stack);app.exit(1);}
});
