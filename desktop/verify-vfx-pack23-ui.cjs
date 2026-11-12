// Packs 2 and 3 in the app: tracking dialog applied to an effect, a drawn mask and a title; drawn mask editor and rendering;
// stabilization dialog and playback path; animated shapes (ellipse/line, draw effect, no fill) in the title editor.
// Usage: electron desktop\verify-vfx-pack23-ui.cjs
const {app,BrowserWindow}=require('electron'),path=require('node:path'),fs=require('node:fs/promises'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const root=path.join(app.getPath('temp'),'lqtac-vfx23-'+process.pid);app.setPath('userData',path.join(root,'profile'));
app.on('browser-window-created',(_e,w)=>w.webContents.setBackgroundThrottling(false));require('./main.cjs');
app.whenReady().then(async()=>{const timer=setTimeout(()=>{console.error('VFX 2/3 UI timeout');app.exit(1);},360000);timer.unref();try{
  await fs.mkdir(root,{recursive:true});const ff=require('./render-engine.cjs').ffmpegPath(),moving=path.join(root,'moving.mp4');
  await run(ff,['-v','error','-y','-f','lavfi','-i','nullsrc=s=640x360:d=3:r=30,geq=lum=128+60*sin(X/7)*cos(Y/9):cb=128:cr=128','-f','lavfi','-i','testsrc=s=60x60:d=3:r=30','-filter_complex',"[0][1]overlay=x='100+t*100':y='100+t*33.333':shortest=1,format=yuv420p",'-c:v','libx264','-crf','16',moving],{windowsHide:true});
  const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
  const js=c=>win.webContents.executeJavaScript(c,true);await js('demoReady');
  const r=await js(`(async()=>{const r={},wait=ms=>new Promise(x=>setTimeout(x,ms)),until=async(f,ms=60000)=>{const t=performance.now();while(!f()){if(performance.now()-t>ms)throw Error('timeout');await wait(100);}};
    const title=LQTACTitleTemplates.build('lower-modern');title.duration=3;for(const o of title.objects)delete o.anim;
    await restoreProject({format:'LQTAC Studio',version:1,name:'VFX',library:[],tracks:[
      {id:'V2',name:'Títulos',kind:'video',envelope:[],clips:[{generator:title,name:'Título',kind:'video',filePath:'',startSeconds:0,durationSeconds:3,sourceOffsetSeconds:0,playbackRate:1}]},
      {id:'V1',name:'Vídeo',kind:'video',envelope:[],clips:[{name:'moving',kind:'video',filePath:${JSON.stringify(moving)},startSeconds:0,durationSeconds:3,sourceOffsetSeconds:0,playbackRate:1}]}]});
    await wait(500);const clip=timelineClips().find(c=>c.dataset.filePath&&!c.dataset.generator),titleClip=timelineClips().find(c=>c.dataset.generator);r.clips=[!!clip,!!titleClip];
    r.cards=['stabilize','tracking','shapeMask'].every(k=>$('#effectsCatalog [data-fx-key="'+k+'"]'));
    // Drawn mask: square around the top-left area, moved at 2 s, cut mode.
    LQTACFxTools.shapeMask(clip);await until(()=>window.maskSession?.dialog?.open);await wait(800);const m=maskSession;for(const [x,y] of [[.1,.1],[.4,.1],[.4,.5],[.1,.5]])m.click(x,y);m.close();
    await m.seek(2);m.setKey([[.5,.3],[.8,.3],[.8,.7],[.5,.7]]);await m.apply();const fx1=clipEffectsState(clip,'video');r.mask=[fx1.shapeMask?.keys.length,fx1.shapeMask?.mode,fx1.enabled];
    // Mask rendering on a white frame: inside opaque, outside transparent; halfway the polygon has moved.
    {const src=document.createElement('canvas');src.width=320;src.height=180;const c=src.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,320,180);const a=(t,x,y)=>{const out=LQTACVideoEffects.draw(src,fx1,t),k=document.createElement('canvas');k.width=320;k.height=180;k.getContext('2d').drawImage(out,0,0);return k.getContext('2d').getImageData(x,y,1,1).data[3];};
      r.maskPixels=[a(0,80,50),a(0,250,150),a(2,200,90),a(2,40,30)];const inv={...fx1,shapeMask:{...fx1.shapeMask,invert:true}};r.maskInvert=LQTACVideoEffects.draw(src,inv,0)&&(()=>{const k=document.createElement('canvas');k.width=320;k.height=180;k.getContext('2d').drawImage(LQTACVideoEffects.draw(src,inv,0),0,0);return k.getContext('2d').getImageData(80,50,1,1).data[3];})();}
    // Tracking: box on the moving pattern at 0 s, analysed, applied to the flare, the mask and the title.
    LQTACFxTools.tracking(clip);await until(()=>window.trackingSession?.dialog?.open);await wait(800);const s=trackingSession;await s.seek(0);s.setBox({x:100/640,y:100/360,w:60/640,h:60/360});await s.analyze();if(!s.points)throw Error('analysis: '+s.dialog.querySelector('#trkStatus').textContent);r.track=[s.points.length,+s.points.at(-1).x.toFixed(3)];
    await s.apply('fx:flare');const fx2=clipEffectsState(clip,'video');r.flare=[fx2.flare,fx2.animation.flareX?.length,+fx2.animation.flareX?.at(-1).value.toFixed(2),+fx2.animation.flareY?.at(-1).value.toFixed(2)];
    await s.apply('mask');const fx3=clipEffectsState(clip,'video');r.trackedMask=[fx3.shapeMask.keys.length,+(fx3.shapeMask.keys.at(-1).points[0][0]-fx3.shapeMask.keys[0].points[0][0]).toFixed(2)];
    const titleTarget=[...s.dialog.querySelector('#trkTarget').options].find(o=>o.value.startsWith('title:')).value;await s.apply(titleTarget);r.applied=[...s.applied];r.appliedList=s.dialog.querySelectorAll('#trkApplied li[data-id]').length;const g=JSON.parse(titleClip.dataset.generator);r.titleKeys=[g.keys.length,Math.round(g.keys.at(-1).x-g.keys[0].x),Math.round(g.keys.at(-1).y-g.keys[0].y)];
    // Removing a destination deletes its curves and updates the list.
    await s.remove('fx:flare');const fx4=clipEffectsState(clip,'video');r.removed=[!!fx4.animation.flareX,fx4.tracking.applied.includes('fx:flare'),s.dialog.querySelectorAll('#trkApplied li[data-id]').length];
    s.dialog.querySelector('#trkClose').click();await wait(200);
    // Reopening restores the saved analysis; a new range analyses only that part.
    LQTACFxTools.tracking(clip);await until(()=>window.trackingSession?.dialog?.open);await wait(800);const s2=trackingSession;r.restored=[s2.points?.length,s2.applied.length,/Analizado/.test(s2.dialog.querySelector('#trkAnalysisState').textContent)];
    s2.setRange(.5,2);await s2.seek(.5);s2.setBox({x:150/640,y:116.7/360,w:60/640,h:60/360});await s2.analyze();if(!(s2.points&&s2.points[0].time>=.49))throw Error('range analysis: '+s2.dialog.querySelector('#trkStatus').textContent+' | '+JSON.stringify(s2.range)+' | '+s2.dialog.querySelector('#trkBoxState').textContent);r.range=[s2.points[0].time,s2.points.at(-1).time,+s2.points.at(-1).x.toFixed(3)];
    s2.dialog.querySelector('#trkClose').click();await wait(200);
    // Stabilization dialog: prepares the cached copy, stores the setting and switches the playback path.
    LQTACFxTools.stabilize(clip);await until(()=>document.querySelector('#stabilizeDialog')?.open);document.querySelector('#stabSmoothing').value='20';document.querySelector('#stabGo').click();await until(()=>clipEffectsState(clip,'video').stabilize,120000);
    r.stab=[clipEffectsState(clip,'video').stabilize.smoothing,/stabilize-cache/.test(await clipPlaybackPath(clip))];
    // Animated shapes in the title editor.
    void LQTACGenerators.edit('title');await until(()=>window.generatorEditorSession?.dialog?.open&&generatorEditorSession!==null);await wait(300);const e=generatorEditorSession,q=id=>e.dialog.querySelector('#'+id);
    q('genAddEllipse').click();q('genAddLine').click();const objs=LQTACGenerators.serialize(e.design);r.shapes=[objs.at(-2).type,objs.at(-2).fill,objs.at(-1).type,objs.at(-1).fill,typeof objs.at(-1).x1];LQTACGeneratorModel.validate({...e.g,objects:objs});e.dialog.querySelector('#genCancel').click();
    {const g=LQTACTitleTemplates.build('strokes'),ink=async t=>{const c=document.createElement('canvas');await LQTACGenerators.draw(g,t,c);const d=c.getContext('2d').getImageData(0,0,1920,1080).data;let n=0;for(let i=3;i<d.length;i+=4)n+=d[i];return Math.round(n/255);};r.draw=[await ink(.35),await ink(.7),await ink(3)];}
    return r;})()`);
  console.log(JSON.stringify(r));
  assert.deepEqual(r.clips,[true,true]);assert(r.cards);assert.deepEqual(r.mask,[2,'cut',true]);
  assert(r.maskPixels[0]>240&&r.maskPixels[1]<10&&r.maskPixels[2]>240&&r.maskPixels[3]<10,'mask cut and keyframed motion');assert(r.maskInvert<10,'inverted mask');
  assert(r.track[0]>=40&&Math.abs(r.track[1]-(430/640))<.02,'tracked end position');
  assert(r.flare[0]>0&&r.flare[1]>=40&&Math.abs(r.flare[2]-.67)<.03&&Math.abs(r.flare[3]-.64)<.03,'flare follows the track');
  assert(r.trackedMask[0]>=40&&Math.abs(r.trackedMask[1]-.45)<.04,'mask follows the track');
  assert(r.titleKeys[0]>=40&&Math.abs(r.titleKeys[1]-863)<40&&Math.abs(r.titleKeys[2]-288)<25,'title follows the track');
  assert.equal(r.applied.length,3);assert.equal(r.appliedList,3);assert.deepEqual(r.removed,[false,false,2],'remove destination');
  assert(r.restored[0]>=40&&r.restored[1]===2&&r.restored[2],'saved analysis restored');assert(Math.abs(r.range[0]-.5)<1e-6&&r.range[1]<=2+1e-6&&r.range[1]>1.9&&Math.abs(r.range[2]-(330/640))<.02,'tracking range start/end');
  assert.deepEqual(r.stab,[20,true]);assert.deepEqual(r.shapes,['ellipse',null,'line',null,'number']);
  assert(r.draw[0]<r.draw[1]&&r.draw[1]<r.draw[2],'shapes draw progressively');
  console.log('VFX PACK 2/3 UI VERIFICATION PASSED');app.exit(0);
}catch(e){console.error(e);app.exit(1);}});
