// Content packs in the app: install from the manager IPC, subtitle frame drawing and editor (apply to the whole track),
// title template with a pack image, image picker, pack masks and presets, disable/remove, refused forged packs.
// Usage: electron desktop\verify-packs.cjs   (development build: trusts a throw-away test key)
const {app,BrowserWindow,dialog}=require('electron'),path=require('node:path'),fs=require('node:fs/promises'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const format=require('./pack-format.cjs');
const testKey=format.generateKeys(),stranger=format.generateKeys();process.env.LQTAC_PACK_TEST_PUBLIC_KEY=testKey.publicKey;
const root=path.join(app.getPath('temp'),'lqtac-packs-test-'+process.pid);app.setPath('userData',path.join(root,'profile'));
app.on('browser-window-created',(_e,w)=>w.webContents.setBackgroundThrottling(false));
let answers=[];dialog.showMessageBox=async(a,b)=>{answers.push((b||a).message);return {response:0};};
require('./main.cjs');
function png(w,h,paint){
  const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  const crc=b=>{let c=~0;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return (~c)>>>0;};
  const chunk=(type,data)=>{const t=Buffer.from(type),len=Buffer.alloc(4),c=Buffer.alloc(4);len.writeUInt32BE(data.length);c.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([len,t,data,c]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
  const raw=Buffer.alloc((w*4+1)*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)raw.set(paint(x,y),y*(w*4+1)+1+x*4);
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const files={'cover.png':png(64,36,()=>[120,20,30,255]),
  'frames/panel.png':png(96,96,(x,y)=>x<8||y<8||x>87||y>87?[230,190,90,255]:[20,60,120,255]),
  'images/estrella.png':png(32,32,()=>[255,215,0,255]),'masks/radial.png':png(64,64,(x,y)=>{const v=Math.max(0,255-Math.hypot(x-32,y-32)*8)|0;return [v,v,v,255];})};
const manifest={id:'lqtac.prueba',name:'Navidad de prueba',version:'1.0.0',author:'LQTAC',description:'Paquete de pruebas',minAppVersion:'0.24.0',cover:'cover.png',content:{
  subtitleFrames:[{id:'panel',name:'Panel azul',image:'frames/panel.png',slice:{top:16,right:16,bottom:16,left:16},padding:{x:1,y:.5},fit:'wide',width:.8,opacity:1,fade:0,style:{color:'#fff8e1',size:30,y:.86}}],
  images:[{id:'estrella',name:'Estrella dorada',file:'images/estrella.png'}],
  titles:[{id:'cartel',name:'Cartel con estrella',category:'Navidad',generator:{version:1,type:'lower-third',name:'Cartel con estrella',duration:6,background:null,objects:[{type:'image',asset:'lqtac.prueba:images/estrella.png',left:100,top:100,width:200,height:200,scaleX:1,scaleY:1,opacity:1,angle:0},{type:'textbox',text:'FELIZ NAVIDAD',left:400,top:150,width:1200,fontSize:90,fontFamily:'Segoe UI',fontWeight:'bold',fill:'#ffffff',textAlign:'left',scaleX:1,scaleY:1,opacity:1,angle:0}],motion:{preset:'fade',in:.5,out:.5,easing:'smooth'},keys:[]}}],
  masks:[{id:'radial',name:'Círculo nevado',image:'masks/radial.png',softness:.3,invert:true,motion:'zoomIn',amount:.4,blur:2,rotation:180}],
  presets:[{id:'invierno',name:'Invierno',kind:'video',key:'color',values:{temperature:-30}}]}};
app.whenReady().then(async()=>{
 const watchdog=setTimeout(()=>{console.error('Packs test timeout');app.exit(1);},120000);
 try{
  await fs.mkdir(root,{recursive:true});
  const good=path.join(root,'navidad.lqpack'),forged=path.join(root,'falso.lqpack'),tampered=path.join(root,'tocado.lqpack');
  const built=format.build(manifest,files,testKey.privateKey,{appVersion:'0.24.0'});await fs.writeFile(good,built.buffer);
  await fs.writeFile(forged,format.build(manifest,files,stranger.privateKey).buffer);
  const data=JSON.parse(built.buffer);data.manifest.name='Otro nombre';await fs.writeFile(tampered,JSON.stringify(data));
  const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
  const js=code=>win.webContents.executeJavaScript(code,true);await js('demoReady');
  // Refused packs never reach the store.
  for(const file of [forged,tampered]){const r=await js('window.lqtacDesktop.packsInstall('+JSON.stringify(file)+')');assert.match(r.error,/no oficial|modificado/,JSON.stringify(r));}
  assert.equal((await js('window.lqtacDesktop.packsList()')).length,0);
  // Install through the manager path (confirmation answered by the stub) and wait for the editor to reload packs.
  answers=[];const installed=await js('window.lqtacDesktop.packsInstall('+JSON.stringify(good)+')');assert.equal(installed.version,'1.0.0');assert.match(answers[0],/Instalar «Navidad de prueba»/);
  for(let i=0;i<50&&!(await js('LQTACPacks.list().length'));i++)await new Promise(r=>setTimeout(r,100));await js('LQTACPacks.ready()');
  assert.equal(await js('!!LQTACPacks.frame("lqtac.prueba","panel")'),true,'frame image loaded');
  // Subtitle frame drawing: the panel colour appears behind the text only when the style names the frame.
  const sample=await js(`(()=>{const c=document.createElement('canvas');c.width=640;c.height=360;const ctx=c.getContext('2d'),cue=f=>({startSeconds:0,durationSeconds:3,subtitleText:'Noche de paz',subtitleStyle:{size:30,y:.86,...(f?{frame:{pack:'lqtac.prueba',id:'panel'}}:{})}});
   const at=(f,x,y)=>{ctx.fillStyle='#000';ctx.fillRect(0,0,640,360);LQTACSubtitleModel.draw(ctx,640,360,[cue(f)],1);return [...ctx.getImageData(x,y,1,1).data];};
   return {with:at(true,90,300),without:at(false,90,300),border:at(true,66,300)};})()`);
  assert.deepEqual(sample.without.slice(0,3),[0,0,0]);assert(sample.with[2]>90&&sample.with[0]<60,'frame interior '+sample.with);assert(sample.border[0]>150,'frame border '+sample.border);
  // Subtitle editor: frame options, suggested style, apply to the whole track keeping each text.
  const editor=await js(`(async()=>{await restoreProject({format:'LQTAC Studio',version:1,name:'Packs',library:[],tracks:[{id:'S1',kind:'subtitle',envelope:[],clips:[
     {name:'Uno',kind:'subtitle',filePath:'',startSeconds:0,durationSeconds:2,subtitleText:'Dulce Navidad',subtitleStyle:{size:36}},
     {name:'Dos',kind:'subtitle',filePath:'',startSeconds:2,durationSeconds:2,subtitleText:'Noche de paz',subtitleStyle:{size:36,karaoke:{mode:'word',color:'#ffd54f',offset:0,words:[{start:0,end:.5},{start:.5,end:1},{start:1,end:1.5}]}}}]}]});
    const [a,b]=$$('.clip').filter(c=>c.dataset.kind==='subtitle');openSubtitleEditor(a);const options=[...$('#subFrame').options].map(o=>o.value);
    $('#subFrame').value='lqtac.prueba|panel';$('#subFrame').dispatchEvent(new Event('change'));const suggested=$('#subColor').value;$('#subFrameOpacity').value='0.7';$('#subApplyAll').checked=true;
    $('form',subtitleDialog).dispatchEvent(new Event('submit',{cancelable:true}));const sa=JSON.parse(a.dataset.subtitleStyle),sb=JSON.parse(b.dataset.subtitleStyle);
    return {options,suggested,sa,sb,textB:b.dataset.subtitleText,open:subtitleDialog.open,snapshot:projectSnapshot()};})()`);
  assert(editor.options.includes('lqtac.prueba|panel'));assert.equal(editor.suggested,'#fff8e1');assert.equal(editor.open,false);
  assert.deepEqual(editor.sa.frame,{pack:'lqtac.prueba',id:'panel',opacity:.7});assert.deepEqual(editor.sb.frame,editor.sa.frame);assert.equal(editor.sb.color,'#fff8e1');assert.equal(editor.sb.karaoke.mode,'word','karaoke kept');assert.equal(editor.textB,'Noche de paz');
  assert(editor.snapshot.tracks[0].clips.every(c=>c.subtitleStyle.frame?.id==='panel'),'frame saved in the project');
  // Karaoke blocks fold the style grid: the frame row must stay outside the folded section and visible.
  const visible=await js(`(()=>{const b=$$('.clip').filter(c=>c.dataset.kind==='subtitle')[1];openSubtitleEditor(b);const row=$('#subFrameRow'),r=row.getBoundingClientRect();const out={inDetails:!!row.closest('details'),height:r.height,value:$('#subFrame').value};subtitleDialog.close();return out;})()`);
  assert.equal(visible.inDetails,false);assert(visible.height>20,'frame row visible');assert.equal(visible.value,'lqtac.prueba|panel');
  // Track properties (track FX button): remove the frame from every block, then apply it again with the suggested lettering.
  const track=await js(`(async()=>{const T=()=>$('.track[data-kind="subtitle"]'),clips=()=>$$('.clip',T()).map(c=>JSON.parse(c.dataset.subtitleStyle));const H=()=>$$('#trackLabels .track-label')[$$('.track').indexOf(T())];let header=H();$$('.track-header-buttons button',header).at(-1).click();
    const box=!!$('#trackFrameBox',workDialog),initial=$('#trackFrame',workDialog).value;$('#trackFrame',workDialog).value='';$('#trackFrame',workDialog).dispatchEvent(new Event('change'));$('form',workDialog).dispatchEvent(new Event('submit',{cancelable:true}));const removed=clips().map(s=>s.frame||null);
    await navigateHistory(false);const undone=clips().map(s=>s.frame?.id||null);await navigateHistory(true);
    header=H();$$('.track-header-buttons button',header).at(-1).click();$('#trackFrame',workDialog).value='lqtac.prueba|panel';$('#trackFrame',workDialog).dispatchEvent(new Event('change'));const styleChecked=$('#trackFrameStyle',workDialog).checked;$('#trackFrameOpacity',workDialog).value='0.5';$('#trackFrameOpacity',workDialog).dispatchEvent(new Event('input'));$('form',workDialog).dispatchEvent(new Event('submit',{cancelable:true}));
    return {box,initial,removed,undone,styleChecked,after:clips(),open:workDialog.open};})()`);
  assert(track.box,'track frame fieldset');assert.equal(track.initial,'lqtac.prueba|panel');assert.deepEqual(track.removed,[null,null]);assert.deepEqual(track.undone,['panel','panel'],'undo restores frames');
  assert.equal(track.styleChecked,true);assert.equal(track.open,false);assert(track.after.every(s=>s.frame?.opacity===.5&&s.color==='#fff8e1'&&s.y===.86));assert.equal(track.after[1].karaoke.mode,'word','karaoke kept on track apply');
  // Export path: the frame is burnt into captured frames.
  const burnt=await js(`(async()=>{exportSize={width:640,height:360};try{const on=await captureProjectFrame(1,640,360);$('#renderSubtitles').checked=false;const off=await captureProjectFrame(1,640,360);$('#renderSubtitles').checked=true;return on!==off;}finally{exportSize=null;}})()`);assert(burnt);
  // Title template from the pack: option listed, image drawn in the rendered title.
  const title=await js(`(async()=>{const g=LQTACPacks.buildTitle('pack:lqtac.prueba:cartel');const c=document.createElement('canvas');await LQTACGenerators.draw(g,2,c);const px=[...c.getContext('2d').getImageData(200,200,1,1).data];return {px,options:LQTACPacks.templateOptions(),images:LQTACPacks.imageOptions()};})()`);
  assert.deepEqual(title.px,[255,215,0,255]);assert.match(title.options,/pack:lqtac.prueba:cartel/);assert.match(title.images,/lqtac.prueba:images\/estrella.png/);
  // Title editor: apply the pack template, add a pack image, save to the timeline; serialized objects keep the asset.
  const edited=await js(`(async()=>{await restoreProject({format:'LQTAC Studio',version:1,name:'Packs',library:[],tracks:[{id:'V1',kind:'video',envelope:[],clips:[]}]});
    const done=LQTACGenerators.edit('lower-third');for(let i=0;i<50&&!document.querySelector('#generatorEditor[open]');i++)await new Promise(r=>setTimeout(r,50));const d=document.querySelector('#generatorEditor'),q=id=>d.querySelector('#'+id);
    if(![...q('genTemplate').options].some(o=>o.value==='pack:lqtac.prueba:cartel'))throw Error('pack template not listed');if(q('genTemplate').options[1].value!=='pack:lqtac.prueba:cartel')throw Error('pack templates must come first');
    q('genTemplate').value='pack:lqtac.prueba:cartel';await q('genTemplate').onchange();q('genAddImage').value='lqtac.prueba:images/estrella.png';await q('genAddImage').onchange();
    const layer=d.querySelector('#genLayers .gen-layer');if(layer?.querySelector('.gen-layer-name').textContent!=='Estrella dorada'||layer.querySelector('.gen-layer-kind').textContent!=='Imagen')throw Error('pack image layer name: '+layer?.textContent);
    const buttons=[...d.querySelectorAll('footer button')].map(b=>b.textContent);const insert=d.querySelector('#genApply');insert.click();await done;await new Promise(r=>setTimeout(r,300));
    const clip=$$('.clip').find(c=>c.dataset.generator);return {buttons,objects:clip?JSON.parse(clip.dataset.generator).objects:null};})()`);
  assert(edited.objects,'generator inserted: '+edited.buttons);assert.equal(edited.objects.filter(o=>o.type==='image').length,2);assert(edited.objects.every(o=>o.type!=='image'||o.asset==='lqtac.prueba:images/estrella.png'));
  // Pack masks in the transition mask dialog; presets offered under "Paquetes".
  const mask=await js(`(async()=>{const s=document.getElementById('maskPackSelect');const values=[...s.options].map(o=>o.value);s.value='lqtac.prueba:radial';s.dispatchEvent(new Event('change'));for(let i=0;i<50&&!/Círculo/.test(document.getElementById('maskFileName').textContent);i++)await new Promise(r=>setTimeout(r,50));
    return {values,name:document.getElementById('maskFileName').textContent,invert:document.getElementById('maskInvert').checked,motion:document.getElementById('maskMotion').value,rotation:document.getElementById('maskRotation').value,presets:LQTACPacks.presets('video','color').map(p=>p.name)};})()`);
  assert(mask.values.includes('lqtac.prueba:radial'));assert.match(mask.name,/Círculo nevado/);assert.equal(mask.invert,true);assert.equal(mask.motion,'zoomIn');assert.equal(mask.rotation,'180');assert.deepEqual(mask.presets,['Invierno']);
  // Manager dialog lists the pack; disabling hides its content; removing deletes it.
  const manager=await js(`(async()=>{await LQTACPacks.open();const card=document.querySelector('#packsDialog .pack-card');const text=card.textContent;document.getElementById('packsDialog').close();return text;})()`);
  assert.match(manager,/Navidad de prueba/);assert.match(manager,/1 marco de subtítulos/);assert.match(manager,/Clave de pruebas/);
  await win.webContents.capturePage().then(i=>fs.writeFile(path.join(root,'manager.png'),i.toPNG()));
  await js('window.lqtacDesktop.packsEnable("lqtac.prueba",false)');for(let i=0;i<50&&await js('LQTACPacks.list()[0]?.enabled');i++)await new Promise(r=>setTimeout(r,100));
  assert.equal(await js('LQTACPacks.frame("lqtac.prueba","panel")'),null);assert.equal(await js('LQTACPacks.templateOptions()'),'');
  const missing=await js(`(()=>{const c=document.createElement('canvas');c.width=640;c.height=360;const ctx=c.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,640,360);LQTACSubtitleModel.draw(ctx,640,360,[{startSeconds:0,durationSeconds:3,subtitleText:'Noche',subtitleStyle:{frame:{pack:'lqtac.prueba',id:'panel'}}}],1);return [...ctx.getImageData(90,300,1,1).data];})()`);
  assert.deepEqual(missing.slice(0,3),[0,0,0],'disabled pack draws no frame');
  answers=[];assert.equal(await js('window.lqtacDesktop.packsRemove("lqtac.prueba")'),true);assert.match(answers[0],/Desinstalar/);
  for(let i=0;i<50&&await js('LQTACPacks.list().length');i++)await new Promise(r=>setTimeout(r,100));assert.equal(await js('LQTACPacks.list().length'),0);
  console.log(JSON.stringify({passed:true,root,sample,title:title.px}));clearTimeout(watchdog);app.exit(0);
 }catch(e){console.error(e.stack);clearTimeout(watchdog);app.exit(1);}
});
