// Real screenshots, isolated profile and synthetic media. Never starts recording.
const path=require('node:path'),fs=require('node:fs');
const {execFile}=require('node:child_process');const run=require('node:util').promisify(execFile);
const {app,BrowserWindow}=require('electron');
const root=path.resolve(__dirname,'../..'),assets=path.join(__dirname,'assets'),media=path.join(root,'.openai/manual/media');
fs.mkdirSync(assets,{recursive:true});fs.mkdirSync(media,{recursive:true});
app.setPath('userData',path.join(root,'.openai/manual/profile'));
app.on('browser-window-created',(_e,w)=>{w.webContents.setBackgroundThrottling(false);w.hide();});
require(path.join(root,'desktop/main.cjs'));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
 const ff=path.join(root,'desktop/node_modules/ffmpeg-static/ffmpeg.exe');
 for(const [name,color,frequency] of [['Plano inicial.mp4','0x13799f',220],['Plano detalle.mp4','0xb66d56',330]]){
  const file=path.join(media,name);if(!fs.existsSync(file))await run(ff,['-y','-f','lavfi','-i',`gradients=s=960x540:r=24:c0=0x06152b:c1=${color}:c2=0x79e5f5:n=3:seed=12:speed=0.03:d=20`,'-f','lavfi','-i',`sine=frequency=${frequency}:sample_rate=48000:duration=20`,'-vf',"drawgrid=w=120:h=90:t=1:c=white@0.12",'-c:v','libx264','-preset','ultrafast','-crf','24','-pix_fmt','yuv420p','-af','volume=0.08','-c:a','aac','-shortest',file],{windowsHide:true});
 }
 const wav=path.join(media,'Ambiente.wav');if(!fs.existsSync(wav))await run(ff,['-y','-f','lavfi','-i','sine=frequency=146.83:duration=24:sample_rate=48000','-af','volume=0.12,tremolo=f=2:d=0.6','-ac','2',wav],{windowsHide:true});
 await app.whenReady();let win;for(let i=0;i<100&&!win;i++){win=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('index.html'));await wait(100);}
 if(!win)throw Error('No main window');win.setContentSize(1500,1000);const js=async s=>{const source=`(async()=>{try{return {ok:true,value:await(async()=>{${s.startsWith('typeof ')?'return '+s:s==='demoReady'?'return demoReady':s}\n})()};}catch(e){return {ok:false,error:e.stack}}})()`;const r=await win.webContents.executeJavaScript(source,true);if(!r.ok)throw Error(r.error);return r.value;};
 for(let i=0;i<150;i++){try{if(await js("typeof demoReady!=='undefined'"))break;}catch{}await wait(100);}
 await js('demoReady');
 const files=['Plano inicial.mp4','Plano detalle.mp4','Ambiente.wav'].map(n=>path.join(media,n));
 await js(`window.manualFiles=${JSON.stringify(files)};window.manualG=LQTACGeneratorModel.create('title');manualG.name='Título de apertura';manualG.objects[0].text='Empieza tu historia';manualG.objects[1].text='LQTAC Studio · Proyecto de ejemplo';manualG.keys=[{time:0,x:0,y:60,scale:0.9,opacity:0},{time:1.5,x:0,y:0,scale:1,opacity:1},{time:6,x:0,y:0,scale:1,opacity:1},{time:8,x:0,y:-30,scale:1.05,opacity:0}];
 window.manualProject={format:'LQTAC Studio',version:1,name:'Mi primer montaje',fps:24,time:3,zoom:3,zoomStart:0,library:manualFiles.map((filePath,i)=>({filePath,name:filePath.split(/[\\\\/]/).pop(),kind:i===2?'audio':'video'})),tracks:[
 {id:'T1',name:'T1 · Título',kind:'video',role:'generated',envelope:[],clips:[{name:'Título de apertura',kind:'video',generator:manualG,startSeconds:0,durationSeconds:8,sourceDurationSeconds:8}]},
 {id:'V1',name:'V1 · Vídeo',kind:'video',role:'video',envelope:[],clips:[{name:'Plano inicial.mp4',kind:'video',filePath:manualFiles[0],startSeconds:0,durationSeconds:12,sourceDurationSeconds:20,groupId:'av-1',groupType:'av'},{name:'Plano detalle.mp4',kind:'video',filePath:manualFiles[1],startSeconds:10,durationSeconds:10,sourceDurationSeconds:20,groupId:'av-2',groupType:'av'}]},
 {id:'A1',name:'A1 · Sonido del vídeo',kind:'audio',role:'video-audio',envelope:[],clips:[{name:'Plano inicial · audio',kind:'audio',filePath:manualFiles[0],startSeconds:0,durationSeconds:12,sourceDurationSeconds:20,groupId:'av-1',groupType:'av'},{name:'Plano detalle · audio',kind:'audio',filePath:manualFiles[1],startSeconds:10,durationSeconds:10,sourceDurationSeconds:20,groupId:'av-2',groupType:'av'}]},
 {id:'A2',name:'A2 · Ambiente',kind:'audio',role:'music',gain:0.5,envelope:[],clips:[{name:'Ambiente.wav',kind:'audio',filePath:manualFiles[2],startSeconds:0,durationSeconds:20,sourceDurationSeconds:24}]},
 {id:'S1',name:'S1 · Subtítulos',kind:'subtitle',role:'subtitle',envelope:[],clips:[['Cada historia empieza con una idea',0,5.5],['Elige tus imágenes y encuentra tu ritmo',5.5,5.5],['Da forma a tu voz',11,4],['Y comparte lo que has creado',15,5]].map(([subtitleText,startSeconds,durationSeconds])=>({name:subtitleText,subtitleText,kind:'subtitle',startSeconds,durationSeconds,subtitleStyle:{font:'Segoe UI',size:36,color:'#ffffff',outline:'#000000',stroke:2,x:0.5,y:0.9}}))}]};await restoreProject(manualProject);window.manualVideo=timelineClips().find(c=>c.parentElement.dataset.track==='V1');window.manualAudio=timelineClips().find(c=>c.parentElement.dataset.track==='A2');window.manualTitle=timelineClips().find(c=>c.dataset.generator);window.manualSub=timelineClips().find(c=>c.dataset.kind==='subtitle');selectTimelineClip(manualVideo);`);
 await wait(4000);await js('await renderTimelineAt(11)');
 async function snap(name,selector){await wait(600);await js('return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');let rect;if(selector)rect=await js(`return (()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();const x=Math.max(0,Math.floor(r.x)),y=Math.max(0,Math.floor(r.y));return {x,y,width:Math.min(innerWidth-x,Math.ceil(r.width)),height:Math.min(innerHeight-y,Math.ceil(r.height))};})()`);if(rect){const z=win.webContents.getZoomFactor();rect=Object.fromEntries(Object.entries(rect).map(([k,v])=>[k,Math.round(v*z)]));}const img=await win.webContents.capturePage(rect);fs.writeFileSync(path.join(assets,name+'.png'),img.toPNG());console.log('CAPTURE',name);}
 async function close(){await js("document.querySelectorAll('dialog[open]').forEach(d=>d.close())");await wait(200);}
 await snap('01-interfaz');await snap('logo','.brand-logo');await snap('02-timeline','.timeline');
 for(const [mode,name] of [['audio','16-espacio-audio'],['color','17-espacio-color'],['text','18-espacio-texto']]){await js(`LQTACWorkspaces.activate('${mode}')`);await snap(name);}await js("LQTACWorkspaces.activate('edit')");
 win.webContents.setZoomFactor(0.85);
 await js('openEffectEditor(manualVideo,"saturation");effectEditorSession.draft.animation.saturation=[{time:0,value:1},{time:4,value:1},{time:10,value:0}];effectEditorSession.setTime(7);');await snap('03-fx-video','#effectEditor');await close();
 await js('openPanCropEditor(manualVideo)');await snap('04-pan','#panCropDialog');await close();
 await js('await LQTACGenerators.edit("title",manualTitle)');await wait(1000);await snap('05-generador','dialog[open]');await js('generatorEditorSession.layout.showTab("motion");generatorEditorSession.setTime(1.5)');await snap('06-animacion-titulo','dialog[open]');await close();
 await js('openAnimatedAudioEditor(manualAudio,"bass");audioEditorSession.draft.animation.bass=[{time:0,value:0},{time:8,value:6},{time:20,value:0}];audioEditorSession.draft.animation.mid=[{time:0,value:0},{time:12,value:-4},{time:20,value:0}];audioEditorSession.draft.animation.treble=[{time:0,value:0},{time:15,value:3}];await audioEditorSession.prepare();audioEditorSession.setTime(8)');await snap('07-fx-audio','dialog[open]');await close();
 await js('openSubtitleEditor(manualSub)');await snap('08-subtitulos','dialog[open]');await close();
 await js("openTrackKaraokeSync(manualSub.parentElement)");await snap('09-karaoke','dialog[open]');await close();
 await js('openMicrophoneRecorder()');await snap('10-microfono','dialog[open]');await js("document.querySelector('#micClose').click()");await wait(200);
 await js('openCameraRecorder()');await snap('11-camara','dialog[open]');await js("document.querySelector('#cameraClose').click()");await wait(200);
 await js('LQTACTimelineTools.setRange({start:2,end:16});openRenderDialog()');await snap('12-render','dialog[open]');await close();await js('LQTACTimelineTools.setRange(null)');
 win.webContents.setZoomFactor(1);await js('openTransitionPanel();await renderTimelineAt(11)');await snap('13-transiciones');
 await js("const tr=manualAudio.parentElement;envelopePoints.set(tr,[{time:0,value:0.8},{time:4,value:0.8},{time:6,value:0.3},{time:13,value:0.3},{time:15,value:0.8},{time:25,value:0.8}]);tr.classList.add('envelope-visible');drawEnvelope(tr)");await snap('14-envolventes','.timeline');
 const maskData='data:image/png;base64,'+fs.readFileSync(path.join(root,'Shapes/LQTAC-negro-fondo-blanco.png')).toString('base64');
 win.webContents.setZoomFactor(0.75);
 await js(`customMask=await decodeProjectMask({dataUrl:${JSON.stringify(maskData)},name:'LQTAC-negro-fondo-blanco.png',motion:'zoomIn',amount:0.5,softness:0.15,invert:false,blur:8});openMaskDialog()`);await snap('15-mascara','dialog[open]');await close();
 win.webContents.setZoomFactor(3);await snap('logo','.brand-logo');win.webContents.setZoomFactor(1);
 fs.writeFileSync(path.join(assets,'capture-info.json'),JSON.stringify({version:'0.17.0',date:new Date().toISOString(),synthetic:true},null,2));
 app.exit(0);
 }catch(e){console.error(e.stack);app.exit(1);}})();
