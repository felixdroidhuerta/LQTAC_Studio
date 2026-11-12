// Pack 2 services: motion tracking on a synthetic moving target and vid.stab stabilization of a shaky synthetic clip.
// Usage: node desktop\verify-vfx-pack2.cjs <image for the shaky clip (optional)>
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),{execFile,spawn}=require('node:child_process'),run=promisify(execFile);
const engine=require('./render-engine.cjs'),tracker=require('./tracking-service.cjs'),stabilizer=require('./stabilize-service.cjs');
function grey(ff,file,W,H){return new Promise((resolve,reject)=>{const c=spawn(ff,['-v','error','-i',file,'-vf',`scale=${W}:${H},format=gray`,'-f','rawvideo','pipe:1'],{windowsHide:true});const chunks=[];c.stdout.on('data',d=>chunks.push(d));c.once('error',reject);c.once('close',code=>{if(code)return reject(Error('decode'));const b=Buffer.concat(chunks),n=W*H,frames=[];for(let i=0;i+n<=b.length;i+=n)frames.push(b.subarray(i,i+n));resolve(frames);});});}
// Jitter: mean absolute difference between consecutive frames (static scene, so it measures camera shake).
const jitter=frames=>{let s=0;for(let i=1;i<frames.length;i++){let d=0;const a=frames[i-1],b=frames[i];for(let j=0;j<a.length;j+=7)d+=Math.abs(a[j]-b[j]);s+=d/(a.length/7);}return s/(frames.length-1);};
(async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'lqtac-vfx2-')),ff=engine.ffmpegPath();
  // Tracking: a 60×60 test pattern moves from (100,100) to (400,200) over 3 s on a static noisy background.
  const moving=path.join(root,'moving.mp4');
  await run(ff,['-v','error','-y','-f','lavfi','-i','nullsrc=s=640x360:d=3:r=30,geq=lum=128+60*sin(X/7)*cos(Y/9):cb=128:cr=128','-f','lavfi','-i','testsrc=s=60x60:d=3:r=30','-filter_complex',"[0][1]overlay=x='100+t*100':y='100+t*33.333':shortest=1,format=yuv420p",'-c:v','libx264','-crf','16',moving],{windowsHide:true});
  let last=0;const result=await tracker.track({filePath:moving,offset:0,duration:3,rate:1,start:0,box:{x:100/640,y:100/360,w:60/640,h:60/360}},p=>last=p.fraction);
  const err=result.points.map(p=>{const ex=(130+p.time*100)/640,ey=(130+p.time*33.333)/360;return Math.hypot((p.x-ex)*640,(p.y-ey)*360);});
  const maxErr=Math.max(...err),meanErr=err.reduce((a,b)=>a+b,0)/err.length;console.log('tracking',result.points.length,'points · mean error',meanErr.toFixed(2),'px · max',maxErr.toFixed(2),'px · progress',last);
  assert(result.points.length>=40&&meanErr<3&&maxErr<8,'tracking error too large');
  // Start later and at half speed: times stay clip-local and the source is read at the right place.
  const later=await tracker.track({filePath:moving,offset:0,duration:6,rate:.5,start:2,box:{x:(100+100)/640,y:(100+33.333)/360,w:60/640,h:60/360}});
  const e2=later.points.map(p=>Math.abs(p.x*640-(130+p.time*.5*100)));console.log('half speed mean x error',(e2.reduce((a,b)=>a+b,0)/e2.length).toFixed(2));assert(later.points[0].time===2&&e2.reduce((a,b)=>a+b,0)/e2.length<4,'clip-local timing with speed');
  assert.throws(()=>tracker.check({filePath:moving,offset:0,duration:3,rate:1,start:5,box:{x:.1,y:.1,w:.1,h:.1}}));assert.throws(()=>tracker.check({filePath:moving,offset:0,duration:3,rate:1,start:1,end:1,box:{x:.1,y:.1,w:.1,h:.1}}));
  const ranged=await tracker.track({filePath:moving,offset:0,duration:3,rate:1,start:1,end:2,box:{x:200/640,y:133.333/360,w:60/640,h:60/360}});console.log('range',ranged.points[0].time,ranged.points.at(-1).time,ranged.points.length);assert(ranged.points[0].time===1&&ranged.points.at(-1).time<=2&&ranged.points.length>=14&&ranged.points.length<=16,'tracking end time');
  // Stabilization: still image with synthetic camera shake; consecutive-frame difference must drop clearly.
  const image=process.argv[2],shaky=path.join(root,'shaky.mp4');
  const input=image?['-loop','1','-t','4','-i',image]:['-f','lavfi','-i','testsrc2=s=720x420:d=4:r=30'];
  await run(ff,['-v','error','-y',...input,'-vf',"scale=720:420,crop=640:360:x='40+30*sin(t*17)+12*sin(t*5)':y='30+20*cos(t*13)',fps=30,format=yuv420p",'-t','4','-c:v','libx264','-crf','16',shaky],{windowsHide:true});
  const cache=path.join(root,'stab');let stages=new Set();const out=await stabilizer.prepare({filePath:shaky,smoothing:30,crop:'zoom'},cache,p=>p.stage&&stages.add(p.stage));
  const before=jitter(await grey(ff,shaky,160,90)),after=jitter(await grey(ff,out,160,90));console.log('jitter before',before.toFixed(2),'after',after.toFixed(2),[...stages]);
  assert(after<before*.6,'stabilization did not reduce shake');
  const again=await stabilizer.prepare({filePath:shaky,smoothing:30,crop:'zoom'},cache);assert.equal(again,out,'cached result reused');
  const probe=await run(ff,['-hide_banner','-i',out],{windowsHide:true}).catch(e=>e);assert(/Duration: 00:00:0[34]/.test(probe.stderr),'duration kept');
  assert.throws(()=>stabilizer.check({filePath:shaky,smoothing:0,crop:'zoom'}));
  await fs.rm(root,{recursive:true,force:true});console.log('VFX PACK 2 SERVICES PASSED');
})().catch(e=>{console.error(e);process.exit(1);});
