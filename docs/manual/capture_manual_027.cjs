// Screenshots for the pages added in the 0.27 edition (features from 0.20 to 0.27). Same isolated profile and
// synthetic media as capture_manual.cjs (run that one first). Never starts recording or downloads modules.
// Run: desktop\node_modules\electron\dist\electron.exe docs\manual\capture_manual_027.cjs [--probe]
const path=require('node:path'),fs=require('node:fs');
const {execFile}=require('node:child_process');const run=require('node:util').promisify(execFile);
const {app,BrowserWindow}=require('electron');
const root=path.resolve(__dirname,'../..'),assets=path.join(__dirname,'assets'),media=path.join(root,'.openai/manual/media');
app.setPath('userData',path.join(root,'.openai/manual/profile'));
app.on('browser-window-created',(_e,w)=>{w.webContents.setBackgroundThrottling(false);});
require(path.join(root,'desktop/main.cjs'));
const wait=ms=>new Promise(r=>setTimeout(r,ms)),probe=process.argv.includes('--probe');
(async()=>{try{
  await app.whenReady();let win;for(let i=0;i<100&&!win;i++){win=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('index.html'));await wait(100);}
  if(!win)throw Error('No main window');win.setContentSize(1500,1000);
  const js=async s=>{const r=await win.webContents.executeJavaScript(`(async()=>{try{return {ok:true,value:await(async()=>{${s}\n})()};}catch(e){return {ok:false,error:e.stack}}})()`,true);if(!r.ok)throw Error(r.error);return r.value;};
  for(let i=0;i<150;i++){try{if(await js("return typeof demoReady!=='undefined'"))break;}catch{}await wait(100);}await js('return demoReady');
  // Helpers in the page: click a menu entry or button by its visible text; close every open dialog.
  await js(`window.mClick=label=>{const el=[...document.querySelectorAll('button,[role=menuitem],[role=tab],summary,label')].find(b=>b.textContent.replace(/\\s+/g,' ').trim().startsWith(label));if(!el)throw Error('No encuentro '+label);el.click();return true;};window.mClose=()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();};`);
  if(probe){console.log(JSON.stringify(await js(`return [...document.querySelectorAll('[role=menuitem],button')].map(b=>b.textContent.replace(/\\s+/g,' ').trim()).filter(Boolean)`)));app.exit(0);return;}
  const shot=async(name,selector)=>{await wait(700);const rect=selector?await js(`const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('No ${selector}');const r=e.getBoundingClientRect();return {x:Math.max(0,Math.floor(r.x)),y:Math.max(0,Math.floor(r.y)),width:Math.ceil(r.width),height:Math.ceil(r.height)};`):undefined;const img=await win.webContents.capturePage(rect);fs.writeFileSync(path.join(assets,name+'.png'),img.toPNG());console.log('CAPTURE',name);};
  const files=['Plano inicial.mp4','Plano detalle.mp4','Ambiente.wav'].map(n=>path.join(media,n));
  const litera=path.join(app.getPath('documents'),'LQTAC Pack Studio','paquetes','colegio-litterator','images','pose-vuelo.png');
  const sky=path.join(media,'Cielo.mp4');if(!fs.existsSync(sky))await run(path.join(root,'desktop/node_modules/ffmpeg-static/ffmpeg.exe'),['-y','-f','lavfi','-i','gradients=s=960x540:r=24:c0=0x7fc4ea:c1=0xcfeaf7:n=2:seed=4:speed=0.01:d=10','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',sky],{windowsHide:true});
  const base={format:'LQTAC Studio',version:1,name:'Mi primer montaje',fps:24,time:3,library:files.map((filePath,i)=>({filePath,name:path.basename(filePath),kind:i===2?'audio':'video'})),tracks:[
    {id:'V1',name:'V1 · Vídeo',kind:'video',envelope:[],clips:[{name:'Plano inicial.mp4',kind:'video',filePath:files[0],startSeconds:0,durationSeconds:12,sourceDurationSeconds:20},{name:'Plano detalle.mp4',kind:'video',filePath:files[1],startSeconds:12,durationSeconds:8,sourceDurationSeconds:20}]},
    {id:'A1',name:'A1 · Ambiente',kind:'audio',envelope:[],clips:[{name:'Ambiente.wav',kind:'audio',filePath:files[2],startSeconds:0,durationSeconds:20,sourceDurationSeconds:24}]}]};
  await js(`await restoreProject(${JSON.stringify(base)});applyTimelineSelection([document.querySelector('.clip[data-kind=video]')]);`);
  // Opciones › Preferencias.
  await js("mClick('Preferencias…')");await shot('30-preferencias','dialog[open]');await js('mClose()');
  
  // Herramientas › Efectos de vídeo › Estabilizar imagen…, and Ver › Tema claro.
  await js(`mClick('Estabilizar imagen…')`);await shot('31-estabilizar','dialog[open]');await js('mClose()');
  await js(`mClick('Tema claro')`);await shot('39-tema-claro');await js(`mClick('Tema oscuro')`);
  // Ayuda › Paquetes… and Asistente Qbit… (module not installed: shows the installer screen).
  await js(`mClick('Paquetes…');`);await shot('32-paquetes','dialog[open]');await js('mClose()');
  await js(`mClick('Asistente Qbit…');`);await shot('33-qbit');await js("document.querySelector('#qbitClose')?.click()");
  // Opciones › Control MCP local….
  await js(`mClick('Control MCP local…');`);await shot('34-mcp','dialog[open]');await js('mClose()');
  // Title editor: Capas tab and Animación tab of a template title.
  await js(`const g=LQTACGeneratorModel.create('title');g.name='Título de apertura';g.objects[0].text='Empieza tu historia';g.objects[1].text='Proyecto de ejemplo';const c=await window.LQTACGenerators.insert(document.querySelector('.track[data-kind=video]')||document.querySelector('.track'),{generator:g,name:g.name},0);window.manualTitle=c||document.querySelector('.clip[data-generator]');`).catch(e=>console.log('title insert',e.message));
  await js(`const c=document.querySelector('.clip[data-generator]');if(!c)throw Error('sin título');c.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));`).catch(e=>console.log('title open',e.message));
  await wait(600);await js(`mClick('Capas')`).catch(e=>console.log(e.message));await shot('35-titulo-capas','dialog[open]').catch(e=>console.log(e.message));
  await js(`mClick('Animación')`).catch(e=>console.log(e.message));await shot('36-titulo-animacion','dialog[open]').catch(e=>console.log(e.message));await js('mClose()');
  await js("mClick('Acerca de…')");await shot('24-acerca-cinema','dialog[open]');await js('mClose()');
  // Trayectoria: Lítera over a sky, weight zone and drawn loop.
  if(fs.existsSync(litera)){
    const W=1920,H=1080,cx=.5*W,cy=.43*H,R=.27*H,k=.5523*R,b=cy+R,n=(x,y)=>({x:x/W,y:y/H}),node=(p,i,o)=>({...n(...p),...(i?{in:n(...i)}:{}),...(o?{out:n(...o)}:{})});
    const nodes=[node([-.15*W,b],null,[-.15*W+300,b]),node([cx,b],[cx-k,b],[cx+k,b]),node([cx+R,cy],[cx+R,cy+k],[cx+R,cy-k]),node([cx,cy-R],[cx+k,cy-R],[cx-k,cy-R]),node([cx-R,cy],[cx-R,cy-k],[cx-R,cy+k]),node([cx,b],[cx-k,b],[cx+k,b]),node([1.15*W,b],[1.15*W-300,b],null)];
    const s=Math.min(16/1774,9/887),anchor={x:((16-1774*s)/2+.575*1774*s)/16,y:((9-887*s)/2+.33*887*s)/9};
    const proj={format:'LQTAC Studio',version:1,name:'Lítera en vuelo',fps:24,time:4,library:[],tracks:[{id:'V1',name:'V1 · Lítera',kind:'video',envelope:[],clips:[{name:'Lítera',kind:'video',filePath:litera,startSeconds:0,durationSeconds:8,sourceOffsetSeconds:0}]},{id:'V2',name:'V2 · Cielo',kind:'video',envelope:[],clips:[{name:'Cielo.mp4',kind:'video',filePath:sky,startSeconds:0,durationSeconds:8,sourceDurationSeconds:10}]}]};
    await js(`await restoreProject(${JSON.stringify(proj)});openMotionPathEditor(document.querySelector('.clip[data-kind=video]'));await motionPathSession.rendered();const m=motionPathSession.model;m.anchor=${JSON.stringify(anchor)};motionPathSession.setMode('anchor');await motionPathSession.rendered();`);
    await shot('37-trayectoria-zona','#motionPathDialog');
    await js(`const m=motionPathSession.model;m.nodes=${JSON.stringify(nodes)};m.orient='path';m.inertia=.5;m.scale=.24;motionPathSession.setMode('route');motionPathSession.setTime(4);await motionPathSession.rendered();`);
    await shot('38-trayectoria-ruta','#motionPathDialog');await js('mClose()');
  }else console.log('Lítera no encontrada, sin capturas de Trayectoria');
  fs.writeFileSync(path.join(assets,'capture-info-027.json'),JSON.stringify({version:'0.27.0',date:new Date().toISOString(),synthetic:true},null,2));
  app.exit(0);
}catch(error){console.error(error);app.exit(1);}})();
