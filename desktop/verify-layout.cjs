const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(app.getPath('temp'),'lqtac-layout-test-'+process.pid);
app.setPath('userData',path.join(root,'profile'));
require('./main.cjs');
app.whenReady().then(async()=>{
  const timer=setTimeout(()=>app.exit(1),60000);timer.unref();
  try {
    const win=BrowserWindow.getAllWindows()[0];
    win.webContents.setBackgroundThrottling(false);
    console.log('Layout test window ready');
    if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
    const js=code=>win.webContents.executeJavaScript(code);
    await js('demoReady');
    const fixture={format:'LQTAC Studio',version:1,name:'Prueba de alineación',library:[],time:0,zoom:1,zoomStart:0,tracks:Array.from({length:18},(_,i)=>({id:'T'+i,name:'Pista '+i+' con nombre largo',kind:i%2?'audio':'video',envelope:[],clips:[{name:'Evento '+i,kind:i%2?'audio':'video',filePath:'',startSeconds:1,durationSeconds:10}]}))};
    for(const width of [1540,1250,1180,1120]) {
      win.setContentSize(width,850);
      for(const zoom of [1,4,1]) {
        await js(`restoreProject(${JSON.stringify({...fixture,zoom,zoomStart:zoom>1?.2:0})})`);
        const state=await js(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
          const rows=$$('.track'),labels=$$('#trackLabels .track-label'),body=$('.timeline-body');
          resolve({rulers:$$('#tracks > .ruler').length,ticks:$$('.ruler span').length,scrollTop:body.scrollTop,pageTop:window.scrollY,
            alignment:rows.map((row,i)=>row.getBoundingClientRect().top-labels[i].getBoundingClientRect().top),
            bodyRight:body.getBoundingClientRect().right,windowWidth:innerWidth,
            rulerVisible:$('.ruler').getBoundingClientRect().top>=body.getBoundingClientRect().top-1,
            panelsSeparated:$('.side-panel').getBoundingClientRect().right<=$('.monitor').getBoundingClientRect().left});
        })))`);
        assert.equal(state.rulers,1);assert(state.ticks>1);assert.equal(state.scrollTop,0);assert.equal(state.pageTop,0);
        assert(state.alignment.every(delta=>Math.abs(delta)<1),JSON.stringify(state));assert(state.rulerVisible);
        assert(state.panelsSeparated,'Media and preview overlap');
        assert(state.bodyRight<=state.windowWidth+1,'Timeline outside window: '+JSON.stringify(state));
        console.log('Layout OK',width,zoom);
      }
    }
    await fs.mkdir(root,{recursive:true});await fs.writeFile(path.join(root,'layout.png'),(await win.webContents.capturePage()).toPNG());
    console.log('ALL LAYOUT TESTS PASSED '+root);app.exit(0);
  }catch(error){console.error(error.stack);app.exit(1);}
});
