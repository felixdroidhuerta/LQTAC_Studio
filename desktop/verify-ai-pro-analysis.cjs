// End-to-end: install the IA pro module from GitHub Releases (or reuse it), analyse a clip and key around the tracked subject.
// env LQTAC_TEST_VIDEO = MP4 with a person; LQTAC_TEST_POINT = "x,y" normalized on frame 0 over the person; LQTAC_KEY = colour to key (#rrggbb) present on the person.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(app.getPath('temp'),'lqtac-ai-pro-e2e-'+process.pid);app.setPath('userData',path.join(root,'profile'));
app.on('browser-window-created',(_e,win)=>win.webContents.setBackgroundThrottling(false));require('./main.cjs');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{console.error('IA pro e2e timeout');app.exit(1);},3600000);timeout.unref();
  try{
    const video=process.env.LQTAC_TEST_VIDEO,[px,py]=(process.env.LQTAC_TEST_POINT||'0.74,0.86').split(',').map(Number),key=process.env.LQTAC_KEY||'#2f2b2b';
    assert(video,'Define LQTAC_TEST_VIDEO');
    const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
    const js=code=>win.webContents.executeJavaScript(code);await js('demoReady');
    const out=await js(`(async()=>{
      const r={};let s=await window.lqtacDesktop.aiProStatus();r.before=s;
      if(!s.installed){const c=await window.lqtacDesktop.aiProCheck();r.release=c;if(!c.available)throw Error(c.reason);const t=performance.now();s=await window.lqtacDesktop.aiProInstall();r.installSeconds=Math.round((performance.now()-t)/1000);}
      r.installed=s;
      const t=performance.now();const res=await window.lqtacDesktop.aiProAnalyze({filePath:${JSON.stringify(video)},offset:0,rate:1,duration:2,fps:6,objects:[{points:[{time:0,x:${px},y:${py},label:1}]}]});
      r.analysis={...res,seconds:Math.round((performance.now()-t)/1000)};
      const again=await window.lqtacDesktop.aiProAnalyze({filePath:${JSON.stringify(video)},offset:0,rate:1,duration:2,fps:6,objects:[{points:[{time:0,x:${px},y:${py},label:1}]}]});r.cached=again.cached;
      // Key a colour present on the person: without zone it disappears, with the pro matte it stays.
      const v=document.createElement('video');v.muted=true;v.src=await mediaUrlForTimeline(${JSON.stringify(video)});await new Promise((ok,ko)=>{v.onloadeddata=ok;v.onerror=()=>ko(Error('video'));});v.currentTime=0;await new Promise(ok=>v.onseeked=ok);
      const fx={enabled:true,chroma:true,chromaColor:${JSON.stringify(key)},chromaTolerance:.18,chromaSoftness:.05,chromaZone:'pro',chromaProMatte:{id:res.id,fps:res.fps,frames:res.frames}};
      LQTACEffects.validate(fx,'video');
      const alpha=f=>{const c=LQTACVideoEffects.draw(v,f,0),k=document.createElement('canvas');k.width=v.videoWidth;k.height=v.videoHeight;const x=k.getContext('2d');x.drawImage(c,0,0);return x.getImageData(Math.round(${px}*k.width),Math.round(${py}*k.height),1,1).data[3];};
      r.alphaAll=alpha({...fx,chromaZone:'all'});LQTACVideoEffects.draw(v,fx,0);await LQTACAiMatte.prepareFrame(0);await new Promise(ok=>setTimeout(ok,300));
      r.alphaPro=alpha(fx);r.matteUsed=LQTACVideoEffects.matteUsed;
      return r;
    })()`);
    console.log(JSON.stringify(out,null,1));
    assert(out.installed.installed,'Module not installed');assert(out.analysis.frames>=10,'Too few frames');assert.equal(out.cached,true);
    assert(out.alphaAll<40,'Zone all should key the subject colour');assert(out.matteUsed&&out.alphaPro>200,'Pro matte should protect the subject');
    console.log('IA pro end-to-end verification OK');app.exit(0);
  }catch(error){console.error(error);app.exit(1);}
});
