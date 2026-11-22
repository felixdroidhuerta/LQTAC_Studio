// Trayectoria (motion path): math, compositor placement, LQTS round trip, editing helpers and a real
// Lítera loop render. Run: desktop\node_modules\.bin\electron.cmd desktop\verify-motion-path.cjs [carpetaSalida]
const {app,BrowserWindow}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const M=require('../dist/assets/motion-path.js'),work=require('../dist/assets/work-model.js');
const root=path.join(app.getPath('temp'),'lqtac-motion-test-'+process.pid);app.setPath('userData',path.join(root,'profile'));
const outDir=process.argv.slice(2).find(a=>!a.startsWith('-')&&a!=='.'&&!a.endsWith('.cjs'));
const litera=path.join(app.getPath('documents'),'LQTAC Pack Studio','paquetes','colegio-litterator','images','pose-vuelo.png');
app.on('browser-window-created',(_e,w)=>w.webContents.setBackgroundThrottling(false));require('./main.cjs');

// A vertical loop (rizo): enter from the left, loop counter-clockwise on screen, leave to the right.
function loopRoute(){const W=1920,H=1080,cx=.5*W,cy=.43*H,R=.27*H,k=.5523*R,b=cy+R,n=(x,y)=>({x:x/W,y:y/H}),node=(p,i,o)=>({...n(...p),...(i?{in:n(...i)}:{}),...(o?{out:n(...o)}:{})});
  return [node([-.15*W,b],null,[-.15*W+300,b]),node([cx,b],[cx-k,b],[cx+k,b]),node([cx+R,cy],[cx+R,cy+k],[cx+R,cy-k]),node([cx,cy-R],[cx+k,cy-R],[cx-k,cy-R]),node([cx-R,cy],[cx-R,cy-k],[cx-R,cy+k]),node([cx,b],[cx-k,b],[cx+k,b]),node([1.15*W,b],[1.15*W-300,b],null)];}
// Anchor on the layer for an image point: the still is fitted (letterboxed) into the frame by Pan/Crop.
const anchorFor=(iw,ih,ix,iy,W=16,H=9)=>{const s=Math.min(W/iw,H/ih),ox=(W-iw*s)/2,oy=(H-ih*s)/2;return {x:(ox+ix*iw*s)/W,y:(oy+iy*ih*s)/H};};

function mathChecks(){
  const m={anchor:{x:.5,y:.5},nodes:loopRoute(),start:0,end:8,inertia:.5,orient:'path'};M.validate(m);
  const W=1280,H=720,first=M.at(m,0,W,H),last=M.at(m,8,W,H);
  assert.ok(Math.abs(first.x-m.nodes[0].x*W)<.5&&Math.abs(first.y-m.nodes[0].y*H)<.5,'start on first node');
  assert.ok(Math.abs(last.x-m.nodes.at(-1).x*W)<.5&&Math.abs(last.y-m.nodes.at(-1).y*H)<.5,'end on last node');
  const steps=[];for(let t=0;t<8-1e-9;t+=.04){const a=M.at(m,t,W,H),b=M.at(m,Math.min(8,t+.04),W,H);steps.push(Math.hypot(b.x-a.x,b.y-a.y));}
  const mean=steps.reduce((a,b)=>a+b)/steps.length;assert.ok(steps.every(s=>Math.abs(s-mean)/mean<.03),'uniform speed ±3 %');
  const order=[5.1,0.3,7.7,2.2,5.1],poses=order.map(t=>JSON.stringify(M.at(m,t,W,H)));assert.equal(poses[0],poses[4],'deterministic pose');
  // Full loop: the unwrapped heading turns −360° (counter-clockwise on screen) and the body lags the tangent.
  let prev=M.at({...m,inertia:0},0,W,H).rotation,total=0;for(let t=.02;t<=8;t+=.02){const r=M.at({...m,inertia:0},t,W,H).rotation;let d=r-prev;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;total+=d;prev=r;}
  assert.ok(Math.abs(total+2*Math.PI)<.05,'loop turns one full revolution, got '+(total*180/Math.PI).toFixed(1));
  const top=4,tan=M.at({...m,inertia:0},top,W,H).rotation,lag=M.at(m,top,W,H).rotation;assert.ok(Math.abs(lag-tan)>.05,'inertia delays the body');
  // Flip: heading left mirrors instead of flying upside down; heading right is unmirrored.
  const left={...m,nodes:[{x:.9,y:.5},{x:.1,y:.5}],orient:'flip',inertia:0},right={...left,nodes:[{x:.1,y:.5},{x:.9,y:.5}]};
  const l=M.at(left,4,W,H),r=M.at(right,4,W,H);assert.ok(l.flipX&&Math.abs(l.rotation)<1e-9&&!r.flipX&&Math.abs(r.rotation)<1e-9,'flip mode');
  // Editing: split shift and stretch keep the pose at the same absolute instant.
  const shifted=M.shift(m,3);assert.equal(JSON.stringify(M.at(shifted,2,W,H)),JSON.stringify(M.at(m,5,W,H)),'split/trim shift');
  const plan=work.stretchClips([{startSeconds:10,durationSeconds:8,playbackRate:1,motionPath:m}],0,'end',8);assert.equal(plan.clips[0].motionPath.end,16,'stretch scales the path');
  for(const bad of [{...m,nodes:[m.nodes[0]]},{...m,inertia:2},{...m,end:0},{...m,anchor:{x:2,y:0}},{...m,extra:1}])assert.throws(()=>M.validate(bad));
  console.log('Math checks OK · loop', (total*180/Math.PI).toFixed(1)+'°');
  return m;
}

app.whenReady().then(async()=>{
  const timer=setTimeout(()=>{console.error('Motion path test timeout');app.exit(1)},600000);timer.unref();
  try{
    const loop=mathChecks();
    await fs.mkdir(root,{recursive:true});const engine=require('./render-engine.cjs'),io=require('./project-io.cjs');
    const sky=path.join(root,'cielo.mp4');await run(engine.ffmpegPath(),['-v','error','-y','-f','lavfi','-i','color=c=0x9fd6ee:s=1280x720:r=24:d=9','-c:v','libx264','-pix_fmt','yuv420p',sky],{windowsHide:true});
    const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));const js=code=>win.webContents.executeJavaScript(code);await js('demoReady');
    // Marker sprite: transparent 400×200 PNG with a red dot at image point (0.57, 0.35).
    const marker=path.join(root,'marca.png');await fs.writeFile(marker,Buffer.from(await js(`(()=>{const c=document.createElement('canvas');c.width=400;c.height=200;const x=c.getContext('2d');x.fillStyle='#ff0000';x.beginPath();x.arc(228,70,7,0,Math.PI*2);x.fill();x.fillStyle='#0000ff';x.fillRect(40,120,120,30);return c.toDataURL('image/png').split(',')[1];})()`),'base64'));
    const project=(file,motion)=>({format:'LQTAC Studio',version:1,name:'Trayectoria',library:[],tracks:[
      {id:'V1',kind:'video',envelope:[{time:0,value:1}],clips:[{name:path.basename(file),kind:'video',filePath:file,startSeconds:0,durationSeconds:8,sourceOffsetSeconds:0,motionPath:motion}]},
      {id:'V2',kind:'video',envelope:[{time:0,value:1}],clips:[{name:'Cielo',kind:'video',filePath:sky,startSeconds:0,durationSeconds:8,sourceDurationSeconds:9,sourceOffsetSeconds:0}]}]});
    const markerMotion={...loop,anchor:anchorFor(400,200,.57,.35),scale:.5};io.validateProject(project(marker,markerMotion));
    assert.throws(()=>io.validateProject(project(marker,{...markerMotion,orient:'spin'})),/Trayectoria no válida/);
    await js(`restoreProject(${JSON.stringify(project(marker,markerMotion))})`);
    // The red dot (anchor) must sit on the route in exported frames.
    const W=640,H=360;let worst=0;
    for(const t of [.5,2,3,3.6,4.2,5,6,7.5]){
      const hit=await js(`(async()=>{exportSize={width:${W},height:${H}};const b64=await captureProjectFrame(${t},${W},${H});exportSize=null;const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();const c=document.createElement('canvas');c.width=${W};c.height=${H};const x=c.getContext('2d');x.drawImage(img,0,0);const d=x.getImageData(0,0,${W},${H}).data;let sx=0,sy=0,n=0;for(let i=0;i<d.length;i+=4)if(d[i]>200&&d[i+1]<60&&d[i+2]<60){const p=i/4;sx+=p%${W};sy+=Math.floor(p/${W});n++;}return n?{x:sx/n,y:sy/n,n}:null;})()`);
      const want=M.at(markerMotion,t,W,H);if(want.x<0||want.x>W||want.y<0||want.y>H)continue;
      assert.ok(hit,'anchor marker missing at '+t);const err=Math.hypot(hit.x-want.x,hit.y-want.y);worst=Math.max(worst,err);assert.ok(err<2.5,`anchor off route at ${t}s by ${err.toFixed(2)} px`);
    }
    console.log('Compositor anchor OK · max error',worst.toFixed(2),'px');
    // LQTS round trip.
    const snap=await js('projectSnapshot()');assert.deepEqual(snap.tracks[0].clips[0].motionPath,markerMotion);const lqts=path.join(root,'trayectoria.LQTS');await io.saveProject(lqts,snap);
    const reopened=await io.openProject(lqts);assert.deepEqual((reopened.project||reopened).tracks[0].clips[0].motionPath,markerMotion);console.log('LQTS round trip OK');
    // Lítera doing a loop over the sky: real MP4 + contact sheet for visual review.
    if(require('node:fs').existsSync(litera)){
      const motion={...loop,anchor:anchorFor(1774,887,.575,.33),scale:.24,inertia:.5,forward:0,orient:'path'},proj=project(litera,motion);io.validateProject(proj);await js(`restoreProject(${JSON.stringify(proj)})`);
      const dest=outDir||root;await fs.mkdir(dest,{recursive:true});const output=path.join(dest,'litera-looping.mp4');const snapshot=await js('projectSnapshot()');
      const job=await engine.startRender({project:snapshot,profile:'mp4',width:1280,height:720,fps:24,output});await js('exporting=true;exportSize={width:1280,height:720};void 0');
      for(let i=0;i<8*24;i++)await job.frame(await js(`captureProjectFrame(${i/24},1280,720)`));await job.finish();await js('exporting=false;exportSize=null;void 0');
      await run(engine.ffmpegPath(),['-v','error','-i',output,'-f','null','-'],{windowsHide:true});
      const sheet=await js(`(async()=>{const times=[1.8,2.4,3,3.5,4,4.5,5,5.6],c=document.createElement('canvas');c.width=1280;c.height=360;const x=c.getContext('2d');x.font='bold 16px sans-serif';exportSize={width:640,height:360};for(const [i,t] of times.entries()){const img=new Image();img.src='data:image/png;base64,'+await captureProjectFrame(t,640,360);await img.decode();const gx=(i%4)*320,gy=Math.floor(i/4)*180;x.drawImage(img,gx,gy,320,180);x.fillStyle='#000';x.fillText(t.toFixed(1)+' s',gx+8,gy+20);}exportSize=null;return c.toDataURL('image/png').split(',')[1];})()`);
      await fs.writeFile(path.join(dest,'litera-looping-poses.png'),Buffer.from(sheet,'base64'));await io.saveProject(path.join(dest,'litera-looping.LQTS'),snapshot);
      console.log('Lítera loop rendered:',output);
    }else console.log('Lítera image not found, skipped:',litera);
    console.log('Motion path test OK');app.exit(0);
  }catch(error){console.error(error);app.exit(1);}
});
