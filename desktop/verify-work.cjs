const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {promisify}=require('node:util');
const run=promisify(require('node:child_process').execFile);
const root=path.join(app.getPath('temp'),'lqtac-work-test-'+process.pid);
app.setPath('userData',path.join(root,'profile'));
require('./main.cjs');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>app.exit(1),120000);timeout.unref();
  try{
    await fs.mkdir(root,{recursive:true});const engine=require('./render-engine.cjs'),io=require('./project-io.cjs');
    const media=path.join(root,'source.mp4');
    await run(engine.ffmpegPath(),['-hide_banner','-y','-f','lavfi','-i','testsrc2=s=320x180:r=24:d=3','-f','lavfi','-i','sine=frequency=440:duration=3','-ac','2','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',media],{windowsHide:true});
    const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
    const js=c=>win.webContents.executeJavaScript(c);
    const crop=[{time:0,x:.25,y:.5,width:.5,height:1,rotation:0},{time:1,x:.75,y:.5,width:.5,height:1,rotation:0}];
    const clip={name:'source',kind:'video',filePath:media,startSeconds:0,durationSeconds:1,sourceDurationSeconds:3,sourceOffsetSeconds:.25,playbackRate:2,gain:.8,panCrop:crop};
    const project={format:'LQTAC Studio',version:1,name:'Work controls',library:[],tracks:[
      {id:'V1',name:'Video',kind:'video',mute:false,solo:false,gain:1,pan:0,envelope:[],clips:[clip]},
      {id:'A1',name:'Left',kind:'audio',gain:.5,pan:-1,solo:true,envelope:[],clips:[{...clip,kind:'audio',gain:.5,panCrop:[]}]},
      {id:'A2',name:'Muted',kind:'audio',gain:4,pan:1,mute:true,envelope:[],clips:[{...clip,kind:'audio',panCrop:[]}]}
    ]};
    io.validateProject(project);
    await js(`(async()=>{await demoReady;await restoreProject(${JSON.stringify(project)});resetEditHistory();})()`);
    let snapshot=await js('projectSnapshot()');assert.equal(snapshot.tracks[1].pan,-1);assert.equal(snapshot.tracks[2].mute,true);assert.deepEqual(snapshot.tracks[0].clips[0].panCrop,crop);
    const saved=path.join(root,'work.LQTS');await io.saveProject(saved,snapshot);const reopened=await io.openProject(saved);assert.deepEqual(reopened.project.tracks[0].clips[0].panCrop,crop);assert.equal(reopened.project.tracks[0].clips[0].playbackRate,2);
    console.log('Persistence / validation of work properties OK');
    for(const invalid of [NaN,0,5]){const p=structuredClone(project);p.tracks[0].clips[0].playbackRate=invalid;assert.throws(()=>io.validateProject(p));}
    const bad=structuredClone(project);bad.tracks[0].clips[0].panCrop[0].width=0;assert.throws(()=>io.validateProject(bad));
    console.log(await js(`(async()=>{
      const rows=$$('.track'),v=timelineClips().find(c=>c.dataset.kind==='video');
      if(clipLocalTime(v,.5)!==1.25)throw Error('Rate/source offset');
      if(!trackIsEnabled(rows[0])||!trackIsEnabled(rows[1])||trackIsEnabled(rows[2]))throw Error('Solo per media type');
      $$('.track-header-buttons button')[0].click();if(trackIsEnabled(rows[0]))throw Error('Mute button');await navigateHistory(false);if(!trackIsEnabled($$('.track')[0]))throw Error('Mute undo');
      await renderTimelineAt(.5);const a=[...timelineAudioPool.values()][0],g=audioGraphs.get(a);if(!g||g.right.gain.value!==0||Math.abs(g.left.gain.value-.25)>.001)throw Error('Preview balance / gain');
      openWorkControls($$('.track')[1]);$('#workPan',workDialog).value='.5';$('form',workDialog).requestSubmit();if(Number($$('.track')[1].dataset.pan)!==.5)throw Error('Pan controls');await navigateHistory(false);
      openWorkControls($$('.track')[1]);$('#trackUp',workDialog).click();if($$('.track')[0].dataset.track!=='A1')throw Error('Track reorder');await navigateHistory(false);
      const c=timelineClips().find(c=>c.dataset.kind==='video');applyTimelineSelection([c]);timelineTime=.5;splitSelectedClips();
      const parts=timelineClips().filter(c=>c.dataset.kind==='video').sort((a,b)=>clipTiming(a).startSeconds-clipTiming(b).startSeconds);
      if(parts.length!==2||Number(parts[1].dataset.sourceOffsetSeconds)!==1.25||Number(parts[1].dataset.playbackRate)!==2)throw Error('Speed split');
      if(Math.abs(LQTACWork.cropAt(clipCropFrames(parts[0]),.5).x-LQTACWork.cropAt(clipCropFrames(parts[1]),0).x)>.00001)throw Error('Crop discontinuity');
      await navigateHistory(false);return 'Buttons, gain/balance preview, undo, reorder, speed split and crop continuity OK';
    })()`));
    const output=path.join(root,'left.wav'),job=await engine.startRender({project,profile:'wav',output});await job.finish();
    const decoded=await run(engine.ffmpegPath(),['-v','error','-i',output,'-f','f32le','-ac','2','-ar','48000','pipe:1'],{windowsHide:true,encoding:'buffer',maxBuffer:5*1024*1024});
    let left=0,right=0;const b=decoded.stdout;for(let i=0;i+7<b.length;i+=8){left+=b.readFloatLE(i)**2;right+=b.readFloatLE(i+4)**2;}
    assert(left>1,'Left channel silent');assert(right<left*1e-8,'Muted/panned audio leaked to right');assert(Math.abs(b.length/8/48000-1)<.03);
    const unity=structuredClone(project);unity.tracks[1].gain=1;unity.tracks[1].clips[0].gain=1;
    const unityOut=path.join(root,'unity.wav');await(await engine.startRender({project:unity,profile:'wav',output:unityOut})).finish();
    const raw=await run(engine.ffmpegPath(),['-v','error','-i',unityOut,'-f','f32le','-ac','2','-ar','48000','pipe:1'],{windowsHide:true,encoding:'buffer',maxBuffer:5*1024*1024});let energy=0;for(let i=0;i+7<raw.stdout.length;i+=8)energy+=raw.stdout.readFloatLE(i)**2;
    assert(Math.abs(Math.sqrt(left/energy)-.25)<.002,'Export gain mismatch');
    console.log('FFmpeg stereo channel measurement, mute/solo, gain and 2x speed OK');
    console.log(await js(`(()=>{const c=document.createElement('canvas');c.width=200;c.height=100;const s=c.getContext('2d');s.fillStyle='red';s.fillRect(0,0,100,100);s.fillStyle='blue';s.fillRect(100,0,100,100);const out=document.createElement('canvas');out.width=out.height=100;const ctx=out.getContext('2d');LQTACWork.drawCrop(ctx,c,100,100,{x:.25,y:.5,width:.5,height:1,rotation:0});const p=ctx.getImageData(50,50,1,1).data;if(p[0]<250||p[2]>5)throw Error('Crop pixel mismatch');if(LQTACWork.cropAt([{time:0,x:0,y:0,width:1,height:1,rotation:0},{time:1,x:1,y:1,width:1,height:1,rotation:90}],.5).rotation!==45)throw Error('Keyframe interpolation');return 'Pan/Crop pixels and animation interpolation OK';})()`));
    const png=await js(`(async()=>{await restoreProject(${JSON.stringify(project)});exportSize={width:640,height:360};const frame=await captureProjectFrame(.5,640,360);exportSize=null;return frame;})()`);assert(Buffer.from(png,'base64').length>1000);
    console.log('Transformed frame export captured OK');
    console.log('ALL WORK TESTS PASSED '+root);app.exit(0);
  }catch(e){console.error(e.stack);app.exit(1);}
});
