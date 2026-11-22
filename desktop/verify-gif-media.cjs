// Animated GIF with transparency (Trayectoria phase 3): conversion to WebM VP9 alpha, cache reuse,
// duration, alpha kept by the compositor, and a Lítera GIF doing the loop over a sky (MP4 + poses).
// Run: electron desktop\verify-gif-media.cjs [carpetaSalida]
const {app,BrowserWindow}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const M=require('../dist/assets/motion-path.js'),gif=require('./gif-media.cjs');
const root=path.join(app.getPath('temp'),'lqtac-gif-test-'+process.pid);app.setPath('userData',path.join(root,'profile'));
const outDir=process.argv.slice(2).find(a=>!a.startsWith('-')&&a!=='.'&&!a.endsWith('.cjs'));
const litera=path.join(app.getPath('documents'),'LQTAC Pack Studio','paquetes','colegio-litterator','images','pose-vuelo.png');
app.on('browser-window-created',(_e,w)=>w.webContents.setBackgroundThrottling(false));require('./main.cjs');
function loopRoute(){const W=1920,H=1080,cx=.5*W,cy=.43*H,R=.27*H,k=.5523*R,b=cy+R,n=(x,y)=>({x:x/W,y:y/H}),node=(p,i,o)=>({...n(...p),...(i?{in:n(...i)}:{}),...(o?{out:n(...o)}:{})});
  return [node([-.15*W,b],null,[-.15*W+300,b]),node([cx,b],[cx-k,b],[cx+k,b]),node([cx+R,cy],[cx+R,cy+k],[cx+R,cy-k]),node([cx,cy-R],[cx+k,cy-R],[cx-k,cy-R]),node([cx-R,cy],[cx-R,cy-k],[cx-R,cy+k]),node([cx,b],[cx-k,b],[cx+k,b]),node([1.15*W,b],[1.15*W-300,b],null)];}
app.whenReady().then(async()=>{
  const timer=setTimeout(()=>{console.error('GIF test timeout');app.exit(1)},600000);timer.unref();
  try{
    await fs.mkdir(root,{recursive:true});const engine=require('./render-engine.cjs'),ff=engine.ffmpegPath(),cache=path.join(root,'profile','gif-cache');
    // Source: transparent GIF, 8 frames at 8 fps (1 s). Lítera squashes and stretches like a wing beat; a red square stands in without Lítera.
    const src=require('node:fs').existsSync(litera)?litera:null,gifFile=path.join(root,'litera-aleteo.gif');
    const base=src?['-loop','1','-t','1','-i',src]:['-f','lavfi','-i','color=c=red@1:s=200x100:d=1,format=rgba,pad=444:222:122:61:color=black@0'];
    await run(ff,['-v','error','-y',...base,'-t','1','-filter_complex',"[0:v]fps=8,format=rgba,scale=444:222,scale=w=444:h='trunc(222*(1-0.18*abs(sin(n*PI/4)))/2)*2':eval=frame,pad=444:222:0:(oh-ih)/2:color=black@0,split[a][b];[b]palettegen=reserve_transparent=1[p];[a][p]paletteuse=alpha_threshold=128",'-loop','0',gifFile],{windowsHide:true});
    // Conversion: WebM VP9 with alpha, reused from cache, 8 frames, ~1 s.
    const t0=Date.now(),webm=await gif.prepare(gifFile,cache),first=Date.now()-t0;assert.match(webm,/\.webm$/);
    const t1=Date.now();assert.equal(await gif.prepare(gifFile,cache),webm);assert.ok(Date.now()-t1<first,'cache reused');
    const dur=await gif.duration(gifFile,cache);assert.ok(Math.abs(dur-1)<.15,'duration ~1 s, got '+dur);
    const rgba=(await run(ff,['-v','error','-c:v','libvpx-vp9','-i',webm,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-'],{encoding:'buffer',windowsHide:true,maxBuffer:1<<26})).stdout;
    const px=(x,y)=>rgba[(y*444+x)*4+3];assert.equal(rgba.length,444*222*4);assert.ok(px(2,2)<10,'transparent corner');assert.ok(px(222,111)>240||px(250,80)>240,'opaque body');
    const frames=(await run(ff,['-v','info','-c:v','libvpx-vp9','-i',webm,'-f','null','-'],{windowsHide:true})).stderr.match(/frame=\s*(\d+)/g)?.at(-1);assert.ok(Number(frames?.match(/\d+/)[0])>=8,'animated: '+frames);
    console.log('GIF → WebM alpha OK ·',(first/1000).toFixed(1),'s ·',dur.toFixed(2),'s ·',frames);
    // In the app: duration, then 8 repeats of the 1 s GIF following the loop over a sky (as «Repetir» would do).
    const sky=path.join(root,'cielo.mp4');await run(ff,['-v','error','-y','-f','lavfi','-i','color=c=0x9fd6ee:s=1280x720:r=24:d=9','-c:v','libx264','-pix_fmt','yuv420p',sky],{windowsHide:true});
    const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));const js=code=>win.webContents.executeJavaScript(code);await js('demoReady');
    assert.ok(Math.abs(await js(`window.lqtacDesktop.mediaDuration(${JSON.stringify(gifFile)})`)-1)<.15,'app duration');
    const s=Math.min(16/444,9/222),anchor={x:((16-444*s)/2+.575*444*s)/16,y:((9-222*s)/2+.33*222*s)/9};
    const motion={anchor,nodes:loopRoute(),start:0,end:8,inertia:.5,orient:'path',scale:.24};M.validate(motion);
    const clips=Array.from({length:8},(_,i)=>({name:'Lítera GIF',kind:'video',filePath:gifFile,startSeconds:i,durationSeconds:1,sourceDurationSeconds:1,sourceOffsetSeconds:0,motionPath:M.shift(motion,i)}));
    const project={format:'LQTAC Studio',version:1,name:'GIF trayectoria',library:[],tracks:[{id:'V1',kind:'video',envelope:[{time:0,value:1}],clips},{id:'V2',kind:'video',envelope:[{time:0,value:1}],clips:[{name:'Cielo',kind:'video',filePath:sky,startSeconds:0,durationSeconds:8,sourceDurationSeconds:9,sourceOffsetSeconds:0}]}]};
    require('./project-io.cjs').validateProject(project);await js(`restoreProject(${JSON.stringify(project)})`);
    // Alpha survives the compositor: no black box around the bird, only sky and bird pixels.
    for(const t of [1.5,4,6.2]){const black=await js(`(async()=>{exportSize={width:640,height:360};const b=await captureProjectFrame(${t},640,360);exportSize=null;const i=new Image();i.src='data:image/png;base64,'+b;await i.decode();const c=document.createElement('canvas');c.width=640;c.height=360;const x=c.getContext('2d');x.drawImage(i,0,0);const d=x.getImageData(0,0,640,360).data;let n=0;for(let k=0;k<d.length;k+=4)if(d[k]+d[k+1]+d[k+2]<40)n++;return n;})()`);assert.ok(black<640*360*.004,`black box at ${t}s: ${black} px`);}
    // Animation: the same pose instant in two repeats shows a different wing-beat frame only if frames change inside a repeat.
    const diff=await js(`(async()=>{const grab=async t=>{const v=document.createElement('video');v.muted=true;v.src=await window.lqtacDesktop.mediaFileUrl(${JSON.stringify(gifFile)});await new Promise(r=>v.onloadeddata=r);v.currentTime=t;await new Promise(r=>v.onseeked=r);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const c=document.createElement('canvas');c.width=444;c.height=222;const x=c.getContext('2d');x.drawImage(v,0,0);const d=x.getImageData(0,0,444,222).data;return {d,corner:d[3]};};const a=await grab(0.01),b=await grab(0.26);let n=0;for(let k=3;k<a.d.length;k+=4)if(Math.abs(a.d[k]-b.d[k])>100)n++;return {n,corner:a.corner};})()`);
    assert.ok(diff.corner<10,'video element keeps alpha');assert.ok(diff.n>500,'frames animate: '+diff.n);
    console.log('Compositor alpha OK · animated pixels',diff.n);
    if(outDir){
      await fs.mkdir(outDir,{recursive:true});await fs.copyFile(gifFile,path.join(outDir,'litera-aleteo.gif'));const output=path.join(outDir,'litera-gif-looping.mp4'),snapshot=await js('projectSnapshot()');
      const job=await engine.startRender({project:snapshot,profile:'mp4',width:1280,height:720,fps:24,output});await js('exporting=true;exportSize={width:1280,height:720};void 0');
      for(let i=0;i<8*24;i++)await job.frame(await js(`captureProjectFrame(${i/24},1280,720)`));await job.finish();await js('exporting=false;exportSize=null;void 0');
      await run(ff,['-v','error','-i',output,'-f','null','-'],{windowsHide:true});
      const sheet=await js(`(async()=>{const times=[1.8,2.4,3,3.5,4,4.5,5,5.6],c=document.createElement('canvas');c.width=1280;c.height=360;const x=c.getContext('2d');x.font='bold 16px sans-serif';exportSize={width:640,height:360};for(const [i,t] of times.entries()){const img=new Image();img.src='data:image/png;base64,'+await captureProjectFrame(t,640,360);await img.decode();const gx=(i%4)*320,gy=Math.floor(i/4)*180;x.drawImage(img,gx,gy,320,180);x.fillStyle='#000';x.fillText(t.toFixed(1)+' s',gx+8,gy+20);}exportSize=null;return c.toDataURL('image/png').split(',')[1];})()`);
      await fs.writeFile(path.join(outDir,'litera-gif-looping-poses.png'),Buffer.from(sheet,'base64'));await require('./project-io.cjs').saveProject(path.join(outDir,'litera-gif-looping.LQTS'),snapshot);
      console.log('Rendered',output);
    }
    console.log('GIF media test OK');app.exit(0);
  }catch(error){console.error(error);app.exit(1);}
});
