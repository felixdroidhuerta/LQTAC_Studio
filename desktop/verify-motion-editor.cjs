// Trayectoria visual editor: marks Lítera's head as weight zone, draws a loop with the mouse
// (pointer events on the canvas), inserts a node with Ctrl+click, applies, undoes and saves screenshots.
// Run: electron desktop\verify-motion-editor.cjs [carpetaSalida]
const {app,BrowserWindow}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(app.getPath('temp'),'lqtac-motion-editor-'+process.pid);app.setPath('userData',path.join(root,'profile'));
const outDir=process.argv.slice(2).find(a=>!a.startsWith('-')&&a!=='.'&&!a.endsWith('.cjs'));
const litera=path.join(app.getPath('documents'),'LQTAC Pack Studio','paquetes','colegio-litterator','images','pose-vuelo.png');
app.on('browser-window-created',(_e,w)=>w.webContents.setBackgroundThrottling(false));require('./main.cjs');
app.whenReady().then(async()=>{
  const timer=setTimeout(()=>{console.error('Motion editor test timeout');app.exit(1)},300000);timer.unref();
  try{
    const image=require('node:fs').existsSync(litera)?litera:null;if(!image){console.log('Lítera image not found, skipped');app.exit(0);return;}
    const dest=outDir||root;await fs.mkdir(dest,{recursive:true});
    const win=BrowserWindow.getAllWindows()[0];win.setSize(1600,1000);if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));const js=code=>win.webContents.executeJavaScript(code);await js('demoReady');
    const project={format:'LQTAC Studio',version:1,name:'Editor trayectoria',library:[],tracks:[{id:'V1',kind:'video',envelope:[{time:0,value:1}],clips:[{name:'Lítera',kind:'video',filePath:image,startSeconds:0,durationSeconds:8,sourceOffsetSeconds:0}]}]};
    await js(`restoreProject(${JSON.stringify(project)})`);
    await js(`openMotionPathEditor(document.querySelector('.clip[data-kind=video]'));motionPathSession.rendered()`);
    assert.equal(await js(`document.querySelector('#motionPathDialog').open`),true,'dialog opens');
    // Pointer helper in canvas pixels (frame-normalized coords → client coords).
    await js(`window.mpPoint=(type,x,y,extra={})=>{const s=motionPathSession,c=s.canvas,r=c.getBoundingClientRect(),p=s.pointer(x,y);c.dispatchEvent(new PointerEvent(type,{bubbles:true,button:0,pointerId:1,clientX:r.left+p.x/1200*r.width,clientY:r.top+p.y/675*r.height,...extra}));};void 0`);
    // Weight zone on the head: image point (0.575, 0.33) letterboxed into 16:9.
    const s=Math.min(16/1774,9/887),ax=((16-1774*s)/2+.575*1774*s)/16,ay=((9-887*s)/2+.33*887*s)/9;
    await js(`mpPoint('pointerdown',${ax},${ay});mpPoint('pointerup',${ax},${ay});motionPathSession.rendered()`);
    if(outDir){await new Promise(r=>setTimeout(r,800));}if(outDir)await fs.writeFile(path.join(dest,'editor-zona-de-peso.png'),(await win.webContents.capturePage()).toPNG());
    // Loop drawn with the mouse: click each node and drag out its right-hand tangent handle.
    const W=1920,H=1080,cx=.5*W,cy=.43*H,R=.27*H,k=.5523*R,b=cy+R;
    const nodes=[[-.15*W,b,300,0],[cx,b,k,0],[cx+R,cy,0,-k],[cx,cy-R,-k,0],[cx-R,cy,0,k],[cx,b,k,0],[1.15*W,b,300,0]];
    await js(`motionPathSession.setMode('route')`);
    for(const [x,y,dx,dy] of nodes)await js(`mpPoint('pointerdown',${x/W},${y/H},{shiftKey:true});mpPoint('pointermove',${(x+dx)/W},${(y+dy)/H});mpPoint('pointerup',${(x+dx)/W},${(y+dy)/H})`);
    // Ctrl+click on the straight exit line inserts a node; double click deletes it again.
    const before=await js('motionPathSession.model.nodes.length');const mid=[(cx+1.15*W)/2/W,b/H];
    await js(`mpPoint('pointerdown',${mid[0]},${mid[1]},{ctrlKey:true});mpPoint('pointerup',${mid[0]},${mid[1]})`);assert.equal(await js('motionPathSession.model.nodes.length'),before+1,'ctrl+click inserts');
    await js(`(()=>{const s=motionPathSession,c=s.canvas,r=c.getBoundingClientRect(),n=s.model.nodes[${before-1}],p=s.pointer(n.x,n.y);c.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,clientX:r.left+p.x/1200*r.width,clientY:r.top+p.y/675*r.height}));})()`);
    assert.equal(await js('motionPathSession.model.nodes.length'),before,'double click deletes');
    await js(`(()=>{const o=document.querySelector('#mpOrient');o.value='path';o.onchange({target:o});const i=document.querySelector('#mpInertia');i.value='0.5';i.oninput({target:i});const sc=document.querySelector('#mpScale');sc.value='0.24';sc.oninput({target:sc});motionPathSession.setTime(4);})()`);
    await js('motionPathSession.rendered()');
    if(outDir){await new Promise(r=>setTimeout(r,800));}if(outDir)await fs.writeFile(path.join(dest,'editor-ruta-looping.png'),(await win.webContents.capturePage()).toPNG());
    // Apply: stored on the clip, valid, anchor on the head and the loop still turns −360°.
    await js(`document.querySelector('#mpApply').click()`);const motion=await js(`clipMotionPath(document.querySelector('.clip[data-kind=video]'))`);
    const M=require('../dist/assets/motion-path.js');M.validate(motion);assert.ok(Math.abs(motion.anchor.x-ax)<.002&&Math.abs(motion.anchor.y-ay)<.002,'anchor stored');assert.equal(motion.nodes.length,7);assert.equal(motion.orient,'path');
    let prev=M.at({...motion,inertia:0},0,1280,720).rotation,total=0;for(let t=.02;t<=8;t+=.02){const r=M.at({...motion,inertia:0},t,1280,720).rotation;let d=r-prev;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;total+=d;prev=r;}
    assert.ok(Math.abs(total+2*Math.PI)<.1,'drawn loop turns −360°, got '+(total*180/Math.PI).toFixed(1));
    assert.equal(await js('window.motionPathDraft===undefined'),true,'draft cleared on close');
    // The menu entry and toolbar button exist.
    assert.ok(await js(`[...document.querySelectorAll('button,[role=menuitem]')].some(b=>b.textContent.includes('Trayectoria · ruta de movimiento'))||!!document.querySelector('#openMotionPath')`),'menu/button');
    console.log('Motion editor OK · nodes',motion.nodes.length,'· loop',(total*180/Math.PI).toFixed(1)+'°');app.exit(0);
  }catch(error){console.error(error);app.exit(1);}
});
