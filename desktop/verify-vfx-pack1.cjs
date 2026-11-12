// Pack 1 video effects: particles, lens flare, rays, light leaks, flicker, ripple, swirl, fisheye, heat haze, mirror/kaleidoscope, echo/motion blur.
// Usage: electron desktop\verify-vfx-pack1.cjs
const {app,BrowserWindow}=require('electron'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(app.getPath('temp'),'lqtac-vfx1-'+process.pid);app.setPath('userData',path.join(root,'profile'));
app.on('browser-window-created',(_e,w)=>w.webContents.setBackgroundThrottling(false));require('./main.cjs');
app.whenReady().then(async()=>{const timer=setTimeout(()=>{console.error('VFX pack 1 timeout');app.exit(1);},240000);timer.unref();try{
  const model=require('../dist/assets/effects-model.js');assert(['particles','flare','rays','leak','flicker','ripple','swirl','fisheye','heat','mirror','echo'].every(k=>model.creative.some(e=>e[0]===k)));
  assert.deepEqual(model.videoStatic,['particleType','mirrorMode','echoMode']);assert.throws(()=>model.validate({animation:{particleType:[{time:0,value:1}]}},'video'));
  const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
  const js=c=>win.webContents.executeJavaScript(c,true);await js('demoReady');
  const r=await js(`(async()=>{const r={};
    const W=640,H=360,src=document.createElement('canvas');src.width=W;src.height=H;const sc=src.getContext('2d');
    const paint=(sx=80)=>{const g=sc.createLinearGradient(0,0,W,0);g.addColorStop(0,'#203050');g.addColorStop(1,'#806040');sc.fillStyle=g;sc.fillRect(0,0,W,H);sc.fillStyle='#ffffff';sc.fillRect(sx,120,60,60);for(let x=0;x<W;x+=40)for(let y=0;y<H;y+=40)if((x+y)/40%2){sc.fillStyle='rgba(0,0,0,.25)';sc.fillRect(x,y,40,40);}};paint();
    const grab=(fx,t=1,s=src)=>{const out=LQTACVideoEffects.draw(s,{enabled:true,...fx},t),c=document.createElement('canvas');c.width=W;c.height=H;c.getContext('2d').drawImage(out,0,0);return c.getContext('2d').getImageData(0,0,W,H).data;};
    const diff=(a,b)=>{let d=0;for(let i=0;i<a.length;i++)d+=Math.abs(a[i]-b[i]);return d/(a.length);};
    const base=grab({});r.zero=diff(base,grab({particles:0,flare:0,rays:0,leak:0,flicker:0,ripple:0,swirl:0,fisheye:0,heat:0,mirror:0,echo:0}));
    const cases={particles:{particles:1},flare:{flare:1},rays:{rays:1.5,raysThreshold:.5},leak:{leak:.8},flicker:{flicker:1},ripple:{ripple:1},swirl:{swirl:1},fisheye:{fisheye:.8},heat:{heat:1},mirror:{mirror:1,mirrorMode:0},kaleido:{mirror:1,mirrorMode:3,mirrorSegments:8}};
    r.changes={};for(const [k,fx] of Object.entries(cases))r.changes[k]=+diff(base,grab(fx,1.3)).toFixed(2);
    // Particles over a transparent source give coverage; every type draws; same time is repeatable; time moves them.
    const clear=document.createElement('canvas');clear.width=W;clear.height=H;const cover=d=>{let n=0;for(let i=3;i<d.length;i+=4)n+=d[i]>20;return n;};
    r.types=[0,1,2,3,4,5,6].map(t=>cover(grab({particles:1,particleType:t,particleDensity:.8},2,clear)));
    r.repeat=diff(grab({particles:1},2,clear),grab({particles:1},2,clear));r.moves=diff(grab({particles:1},2,clear),grab({particles:1},2.5,clear));
    // Flare brightens around its position (x .25, y .25 from the top).
    {const d=grab({flare:1,flareX:.25,flareY:.25},1),px=(x,y,a)=>{const i=(y*W+x)*4;return a[i]+a[i+1]+a[i+2];};r.flare=[px(160,90,d)-px(160,90,base),px(560,320,d)-px(560,320,base)];}
    // Mirror left→right: right half repeats the left half.
    {const d=grab({mirror:1,mirrorMode:0},1);let e=0;for(let y=0;y<H;y+=7)for(let x=0;x<W/2;x+=7){const a=(y*W+x)*4,b=(y*W+(W-1-x))*4;e+=Math.abs(d[a]-d[b]);}r.mirrorError=e/((H/7)*(W/14));}
    // Echo: the white square moves right; with a trail the old position stays lit, after a seek it does not.
    {const s2=document.createElement('canvas');s2.width=W;s2.height=H;const c2=s2.getContext('2d'),at=(x)=>{c2.fillStyle='#000';c2.fillRect(0,0,W,H);c2.fillStyle='#fff';c2.fillRect(x,150,40,40);};
      const lum=(d,x,y)=>{const i=(y*W+x)*4;return d[i];};
      at(100);grab({echo:.9},0,s2);at(300);const trail=grab({echo:.9},1/24,s2);at(300);const blur=(at(100),grab({echo:.6,echoMode:1},5,s2),at(300),grab({echo:.6,echoMode:1},5+1/24,s2));
      at(300);const seek=grab({echo:.9},20,s2);r.echo=[lum(trail,120,170),lum(trail,320,170),lum(blur,120,170),lum(seek,120,170)];}
    // Editor and form: selects for fixed choices, presets present.
    const clip=timelineClips().find(c=>c.dataset.kind==='video'&&c.dataset.filePath);r.clip=!!clip;
    if(clip){openEffectEditor(clip,'particles');await new Promise(x=>setTimeout(x,300));r.editor=[$('#editor-particleType')?.tagName,[...$('#editorParameter').options].map(o=>o.value).includes('particleType'),$('#effectEditor .fxp-select').options.length-1];
      const sel=$('#editor-particleType');sel.value='4';sel.dispatchEvent(new Event('input'));r.editorValue=effectEditorSession.draft.particleType;$('#effectEditor footer button')?.click();if(effectEditor.open)effectEditor.close();await new Promise(x=>setTimeout(x,100));
      openClipEffects(clip);await new Promise(x=>setTimeout(x,200));r.form=['fx-particleType','fx-mirrorMode','fx-echoMode'].every(id=>$('#'+id,effectsDialog)?.tagName==='SELECT')&&!!$('#fx-flareX',effectsDialog);if(effectsDialog.open)effectsDialog.close();}
    r.cards=['particles','flare','rays','leak','flicker','ripple','swirl','fisheye','heat','mirror','echo'].filter(k=>$('#effectsCatalog [data-fx-kind="video"][data-fx-key="'+k+'"]')).length;
    return r;})()`);
  console.log(JSON.stringify(r));
  assert.equal(r.zero,0,'all effects at 0 must leave the image untouched');
  for(const [k,v] of Object.entries(r.changes))assert(v>.5,'effect has no visible result: '+k);
  r.types.forEach((n,i)=>assert(n>200,'particle type '+i+' draws nothing'));assert.equal(r.repeat,0);assert(r.moves>.05,'particles do not move');
  assert(r.flare[0]>150&&r.flare[0]>r.flare[1]*2,'flare centred on its position');assert(r.mirrorError<3,'mirror symmetry');
  assert(r.echo[0]>150&&r.echo[1]>240,'trail keeps the old position');assert(r.echo[2]>40,'motion blur mixes frames');assert(r.echo[3]<10,'history resets after a seek');
  assert(r.clip,'demo has a video clip');assert.deepEqual(r.editor.slice(0,2),['SELECT',false]);assert(r.editor[2]>=8,'particle presets');assert.equal(r.editorValue,4);assert(r.form);assert.equal(r.cards,11);
  console.log('VFX PACK 1 VERIFICATION PASSED');app.exit(0);
}catch(e){console.error(e);app.exit(1);}});
