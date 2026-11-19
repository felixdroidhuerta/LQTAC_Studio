// Title editor layers (0.24.1): list top to bottom, select from the list, move up/down/front/back with buttons and
// Ctrl+[ / Ctrl+], order kept when saving. Usage: electron desktop\verify-title-layers.cjs
const {app,BrowserWindow}=require('electron'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(app.getPath('temp'),'lqtac-title-layers-'+process.pid);app.setPath('userData',path.join(root,'profile'));
app.on('browser-window-created',(_e,w)=>{w.hide();w.webContents.setBackgroundThrottling(false);});require('./main.cjs');
app.whenReady().then(async()=>{setTimeout(()=>{console.error('timeout');app.exit(1);},90000).unref();try{
 const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
 const js=c=>win.webContents.executeJavaScript(c,true);await js('demoReady');
 await js("restoreProject({format:'LQTAC Studio',version:1,name:'Capas',library:[],tracks:[{id:'V1',kind:'video',envelope:[],clips:[]}]})");
 await js("LQTACGenerators.edit('lower-third');void 0");
 for(let i=0;i<50&&!(await js("!!document.querySelector('#generatorEditor[open]')&&!!window.generatorEditorSession?.design"));i++)await new Promise(r=>setTimeout(r,100));
 // Template list: only the family being edited (lower third here), built-in groups marked «· de serie».
 const groups=await js("[...document.querySelectorAll('#genTemplate optgroup')].map(g=>g.label+':'+[...g.children].map(o=>o.value).join(','))");
 assert.deepEqual(groups,['Rótulos · de serie:lower-classic,lower-modern,lower-gradient'],'lower-third templates only');
 const names=()=>js("[...document.querySelectorAll('#genLayers .gen-layer')].map(li=>li.querySelector('.gen-layer-kind').textContent+':'+li.querySelector('.gen-layer-name').textContent)");
 const order=()=>js("generatorEditorSession.design.getObjects().map(o=>o.type.toLowerCase()==='textbox'?o.text:o.type.toLowerCase())");
 // Tab and initial list: lower third = rectangle, name, role (the last object is drawn on top and listed first).
 assert.equal(await js("!!document.querySelector('#genTab-layers')&&!!document.querySelector('#genPane-layers #genLayersBox')"),true,'Capas tab');
 await js("document.querySelector('#genTab-layers').click()");
 assert.deepEqual(await names(),['Texto:Cargo · Descripción','Texto:Nombre Apellido','Forma:Rectángulo']);
 // The editor opens with an object selected; with none selected the order tools are disabled.
 await js("generatorEditorSession.design.discardActiveObject();generatorEditorSession.design.fire('selection:cleared',{deselected:[]});void 0");
 assert.equal(await js("document.querySelector('#genLayerFront').disabled&&document.querySelector('#genLayerBack').disabled&&!document.querySelector('#genLayers .selected')"),true,'no selection: tools disabled');
 // Select the rectangle from the list, bring it to the front.
 await js("document.querySelectorAll('#genLayers .gen-layer')[2].click()");
 assert.equal(await js("generatorEditorSession.design.getActiveObject()?.type.toLowerCase()"),'rect');
 assert.equal(await js("document.querySelectorAll('#genLayers .gen-layer.selected').length"),1);
 await js("document.querySelector('#genLayerFront').click()");
 assert.deepEqual(await order(),['Nombre Apellido','Cargo · Descripción','rect']);
 assert.equal((await names())[0],'Forma:Rectángulo');
 // Down one, back to the bottom.
 await js("document.querySelector('#genLayerDown').click()");assert.deepEqual(await order(),['Nombre Apellido','rect','Cargo · Descripción']);
 await js("document.querySelector('#genLayerBack').click()");assert.deepEqual(await order(),['rect','Nombre Apellido','Cargo · Descripción']);
 // Keyboard: Ctrl+] up one, Ctrl+Shift+] front, Ctrl+[ down, Ctrl+Shift+[ back.
 const key=(code,shift)=>js(`document.querySelector('#genDesign').dispatchEvent(new KeyboardEvent('keydown',{key:'${code==='BracketRight'?']':'['}',code:'${code}',ctrlKey:true,shiftKey:${shift},bubbles:true}))`);
 await key('BracketRight',false);assert.deepEqual(await order(),['Nombre Apellido','rect','Cargo · Descripción']);
 await key('BracketRight',true);assert.deepEqual(await order(),['Nombre Apellido','Cargo · Descripción','rect']);
 await key('BracketLeft',false);assert.deepEqual(await order(),['Nombre Apellido','rect','Cargo · Descripción']);
 await key('BracketLeft',true);assert.deepEqual(await order(),['rect','Nombre Apellido','Cargo · Descripción']);
 // New objects appear in the list; deleting removes them.
 await js("document.querySelector('#genAddText').click()");assert.equal((await names()).length,4);
 await js("document.querySelector('#genDeleteObject').click()");assert.equal((await names()).length,3);
 // Save to the timeline: the generator keeps the chosen order.
 await js("generatorEditorSession.design.setActiveObject(generatorEditorSession.design.getObjects()[0]);document.querySelector('#genLayerFront').click()");
 await js("document.querySelector('#genApply').click()");
 for(let i=0;i<50&&(await js("!!document.querySelector('#generatorEditor[open]')"));i++)await new Promise(r=>setTimeout(r,100));
 const saved=await js("(()=>{const c=document.querySelector('.clip');return c?JSON.parse(c.dataset.generator).objects.map(o=>o.type==='textbox'?o.text:o.type):null;})()");
 assert.deepEqual(saved,['Nombre Apellido','Cargo · Descripción','rect'],'saved order');
 // Title and credits editors list their own families.
 for(const [type,label,count] of [['title','Títulos · de serie',9],['credits','Créditos · de serie',2],['text','Títulos · de serie',9]]){
  // The previous editor finishes closing asynchronously: retry until this one opens.
  for(let i=0;i<50&&!(await js("!!document.querySelector('#generatorEditor[open]')"));i++){await js("LQTACGenerators.edit('"+type+"');void 0");await new Promise(r=>setTimeout(r,150));}
  const g=await js("[...document.querySelectorAll('#genTemplate optgroup')].map(g=>[g.label,g.children.length])");assert.deepEqual(g,[[label,count]],type);
  await js("document.querySelector('#genCancel').click()");for(let i=0;i<50&&(await js("!!document.querySelector('#generatorEditor[open]')"));i++)await new Promise(r=>setTimeout(r,100));
 }
 console.log('TITLE LAYERS VERIFIED');app.exit(0);
}catch(e){console.error(e.stack||e);app.exit(1);}});
