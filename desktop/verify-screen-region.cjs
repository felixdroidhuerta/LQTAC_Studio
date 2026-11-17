// Screen recorder region picker: drag a zone on the still, numeric fields, aspect lock, apply and reset.
const {app,BrowserWindow}=require('electron');
const path=require('node:path'),fs=require('node:fs/promises'),assert=require('node:assert/strict');
const root=path.join(app.getPath('temp'),'cinema-region-test-'+process.pid);
app.setPath('userData',path.join(root,'profile'));
require('./main.cjs');
app.whenReady().then(async()=>{
 const watchdog=setTimeout(()=>{console.error('Region test timeout');app.exit(1);},90000);
 try{
  await fs.mkdir(root,{recursive:true});
  const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
  const js=code=>win.webContents.executeJavaScript(code,true);await js('demoReady');
  const shot=async name=>fs.writeFile(path.join(root,name),(await win.webContents.capturePage()).toPNG());
  // Pure validation of region fractions.
  assert.equal(await js('LQTACScreenCapture.normalizeRegion(null)'),null);
  assert.equal(await js('LQTACScreenCapture.normalizeRegion({x:0,y:0,width:1,height:1})'),null);
  assert.match(await js('(()=>{try{LQTACScreenCapture.normalizeRegion({x:.8,y:0,width:.5,height:.5});return "no"}catch(e){return e.message}})()'),/dentro/);
  // Open the recorder, prepare the first screen and pick a region with the pointer.
  await js('openScreenRecorder()');await new Promise(r=>setTimeout(r,800));
  const source=await js("(()=>{const s=[...document.querySelector('#cameraDevice').options].find(o=>o.value.startsWith('screen:'));document.querySelector('#cameraDevice').value=s.value;return s.value})()");
  assert(source,'screen source');
  await js("document.querySelector('#cameraPrepare').click()");
  for(let i=0;i<60&&!await js("!document.querySelector('#screenRegionPick').disabled");i++)await new Promise(r=>setTimeout(r,100));
  assert(await js("!document.querySelector('#screenRegionPick').disabled"),'region button enabled when ready');
  assert.match(await js("document.querySelector('#screenRegionInfo').textContent"),/fuente completa/);
  await js("document.querySelector('#screenRegionPick').click()");await new Promise(r=>setTimeout(r,300));
  assert(await js("!!document.querySelector('.region-picker canvas')"),'picker shows the still');
  const drag=await js(`(()=>{const f=document.querySelector('.region-frame'),c=f.querySelector('canvas').getBoundingClientRect();const o=(x,y)=>({bubbles:true,clientX:c.left+c.width*x,clientY:c.top+c.height*y,pointerId:1});
   f.dispatchEvent(new PointerEvent('pointerdown',o(.25,.25)));f.dispatchEvent(new PointerEvent('pointermove',o(.75,.75)));f.dispatchEvent(new PointerEvent('pointerup',o(.75,.75)));
   return ['regionX','regionY','regionW','regionH'].map(id=>Number(document.getElementById(id).value));})()`);
  const sourceSize=await js("cameraSession.capture.region()");
  assert(Math.abs(drag[0]-sourceSize.sourceWidth*.25)<4&&Math.abs(drag[2]-sourceSize.sourceWidth*.5)<4,JSON.stringify({drag,sourceSize}));
  await shot('region-picker.png');
  // Aspect 1:1 adjusts the drawn zone; then a numeric edit; then apply.
  await js("(()=>{const a=document.getElementById('regionAspect');a.value='1';a.dispatchEvent(new Event('change'))})()");
  const square=await js("[Number(document.getElementById('regionW').value),Number(document.getElementById('regionH').value)]");assert.equal(square[0],square[1]);
  await js("(()=>{const x=document.getElementById('regionX');x.value='10';x.dispatchEvent(new Event('input'))})()");
  await js("document.getElementById('regionOk').click()");
  const applied=await js("cameraSession.capture.region()");
  assert(applied.region&&applied.pixels.x===10&&Math.abs(applied.pixels.width-applied.pixels.height)<=2,JSON.stringify(applied));
  assert.equal(applied.width%2,0);assert.equal(applied.height%2,0);
  assert.match(await js("document.querySelector('#screenRegionInfo').textContent"),/Zona: \d+ × \d+ px/);
  const track=await js("(()=>{const s=document.querySelector('#cameraPreview').srcObject.getVideoTracks()[0].getSettings();return [s.width,s.height]})()");
  await new Promise(r=>setTimeout(r,500));await shot('region-applied.png');
  // Escape inside the picker closes only the picker.
  await js("document.querySelector('#screenRegionPick').click()");await new Promise(r=>setTimeout(r,200));
  await js("document.querySelector('#cameraDialog').dispatchEvent(new Event('cancel',{cancelable:true}))");
  assert(await js("!document.querySelector('.region-picker')&&document.querySelector('#cameraDialog').open"),'escape closes picker only');
  await js("document.querySelector('#screenRegionFull').click()");
  assert.equal(await js("cameraSession.capture.region().region"),null);
  await js("cameraSession.automation.control('close')");
  console.log(JSON.stringify({passed:true,root,source,picked:drag,applied:applied.pixels,previewTrack:track}));
  clearTimeout(watchdog);app.exit(0);
 }catch(e){console.error(e.stack);clearTimeout(watchdog);app.exit(1);}
});
