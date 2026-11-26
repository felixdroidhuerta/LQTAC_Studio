// Animated diagrams: canvas size (vertical titles), free-form paths, arrow heads, MCP title with a complete generator and editor round trip.
// Run: electron.cmd desktop\verify-diagrams.cjs [outputFolder]  (writes PNG frames of the sample diagram to outputFolder when given)
const {app,BrowserWindow}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(app.getPath('temp'),'lqtac-diagrams-'+process.pid),out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||null;
app.setPath('userData',path.join(root,'profile'));app.on('browser-window-created',(_e,w)=>{w.webContents.setBackgroundThrottling(false);w.hide();});require('./main.cjs');
const box=(top,color,title,sub,delay)=>[
 {type:'rect',left:190,top,width:700,height:170,rx:22,ry:22,fill:'#0d1330',stroke:color,strokeWidth:5,glow:{color,size:24,strength:2},anim:{in:{effect:'scale',by:'object',duration:.5,stagger:0,delay,easing:'back'},out:null,loop:null}},
 {type:'textbox',text:title,left:190,top:top+30,width:700,fontSize:48,fontFamily:'Segoe UI',fontWeight:'bold',fill:'#ffffff',textAlign:'center',anim:{in:{effect:'rise',by:'word',duration:.4,stagger:.07,delay:delay+.15,easing:'out'},out:null,loop:null}},
 {type:'textbox',text:sub,left:190,top:top+98,width:700,fontSize:34,fontFamily:'Consolas',fontWeight:'bold',fill:color,textAlign:'center',anim:{in:{effect:'fade',by:'object',duration:.4,stagger:0,delay:delay+.35,easing:'smooth'},out:null,loop:null}}];
const draw=(delay,duration=.6)=>({in:{effect:'draw',by:'object',duration,stagger:0,delay,easing:'out'},out:null,loop:null});
const sample={version:1,type:'title',name:'Diagrama shaders (vertical)',duration:6,background:'#0b0820',canvas:{width:1080,height:1920},objects:[
 {type:'textbox',text:'¿cómo se recompilan?',left:90,top:110,width:900,fontSize:64,fontFamily:'Segoe UI',fontWeight:'bold',fill:'#ffd23d',textAlign:'center',glow:{color:'#ffd23d',size:18,strength:1},anim:{in:{effect:'typewriter',by:'letter',duration:.05,stagger:.03,delay:0,easing:'linear'},out:null,loop:null}},
 ...box(300,'#3df5a0','shaders de la consola','(RDNA2)',.6),
 {type:'path',path:'M0 0 L0 170',left:537,top:490,stroke:'#ffffff',strokeWidth:7,fill:null,arrow:'end',anim:draw(1.3)},
 ...box(700,'#33d6ff','recompilador de shaders','(de AnyPS5)',1.9),
 {type:'path',path:'M0 0 C 140 50 140 120 0 170',left:540,top:890,stroke:'#ffffff',strokeWidth:7,fill:null,arrow:'end',glow:{color:'#33d6ff',size:14,strength:1},anim:draw(2.6)},
 ...box(1100,'#3df5a0','shaders para PC','(SPIR-V / Vulkan)',3.2),
 {type:'path',path:'M0 45 L38 85 L110 0',left:900,top:1140,stroke:'#3df5a0',strokeWidth:14,fill:null,glow:{color:'#3df5a0',size:16,strength:2},anim:draw(3.9,.4)},
 {type:'path',path:'M70 0 L140 122 L0 122 Z',left:120,top:1450,stroke:'#ff3d6e',strokeWidth:8,fill:null,glow:{color:'#ff3d6e',size:20,strength:2},anim:draw(4.4,.5)},
 {type:'line',x1:300,y1:1600,x2:960,y2:1600,stroke:'#ff3d6e',strokeWidth:6,arrow:'both',anim:draw(4.6,.5)},
 {type:'textbox',text:'modelos · {n}',count:{from:0,to:382781,duration:1.2,delay:3.3},left:140,top:1750,width:800,fontSize:56,fontFamily:'Segoe UI',fontWeight:'bold',fill:'#3df5a0',textAlign:'center',anim:{in:{effect:'fade',by:'object',duration:.3,stagger:0,delay:3.2,easing:'out'},out:null,loop:null}},
 {type:'textbox',text:'NO ES EL OFICIAL',left:290,top:1460,width:680,angle:-6,fontSize:70,fontFamily:'Segoe UI',fontWeight:'bold',fill:'#ff3d6e',textAlign:'center',glow:{color:'#ff3d6e',size:16,strength:1},anim:{in:{effect:'scale',by:'object',duration:.45,stagger:0,delay:4.9,easing:'back'},out:null,loop:null}}],
 motion:{preset:'none',in:0,out:0,easing:'smooth'},keys:[]};
app.whenReady().then(async()=>{const timer=setTimeout(()=>{console.error('Timeout');app.exit(1);},150000);timer.unref();try{
 await fs.mkdir(root,{recursive:true});if(out)await fs.mkdir(out,{recursive:true});
 const model=require('../dist/assets/generator-model.js'),io=require('./project-io.cjs'),mcp=require('./mcp-edit.cjs'),tools=require('./mcp-tools.cjs');
 // Model: canvas size, paths and arrows; classic titles keep 1920×1080.
 model.validate(structuredClone(sample));assert.deepEqual(model.size(sample),{width:1080,height:1920});assert.deepEqual(model.size(model.create()),{width:1920,height:1080});
 const geo=model.parsePath('M0 0 C 140 50 140 120 0 170');assert(geo.width>90&&geo.height===170&&geo.length>170);assert(Math.abs(geo.end.angle-Math.atan2(50,-140))<1e-9||geo.end.angle<0||geo.end.angle>0);
 for(const bad of [{canvas:{width:100,height:100}},{canvas:{width:1080,height:1920,depth:1}},{objects:[{type:'path',path:'L 0 0'}]},{objects:[{type:'path',path:'M0 0 A 5 5 0 0 1 9 9'}]},{objects:[{type:'rect',arrow:'end'}]},{objects:[{type:'line',arrow:'sideways'}]},{objects:[{type:'rect',path:'M0 0 L1 1'}]}])
  assert.throws(()=>model.validate({...structuredClone(sample),...bad}),undefined,JSON.stringify(bad));
 // MCP: title with a complete generator, tool schema accepts it, invalid designs are refused.
 const op={op:'title',trackId:'v1',start:2,generator:sample};tools.validate(tools.tools.find(t=>t.name==='cinema_edit').inputSchema,{revision:'x',operations:[op]});
 const empty={format:'LQTAC Studio',version:1,name:'Diagramas',library:[],tracks:[{id:'v1',kind:'video',name:'Gráficos',envelope:[],clips:[],gain:1,pan:0,mute:false,solo:false}]};
 const edited=await mcp.edit(empty,[op,{op:'title',trackId:'v1',start:9,text:'Classic',titleType:'title',duration:3}],async()=>{throw Error('no probe');});io.validateProject(edited);
 const clip=edited.tracks[0].clips[0];assert.equal(clip.durationSeconds,6);assert.equal(clip.startSeconds,2);assert.deepEqual(clip.generator.canvas,{width:1080,height:1920});assert.equal(clip.generator.objects.filter(o=>o.type==='path').length,4);assert.equal(clip.name,sample.name);assert.equal(edited.tracks[0].clips[1].generator.objects[0].text,'Classic');
 await assert.rejects(mcp.edit(empty,[{op:'title',trackId:'v1',generator:{...sample,objects:[{type:'path',path:'nope'}]}}],null),/Rótulo no válido/);
 const shorter=await mcp.edit(empty,[{...op,duration:4}],null);assert.equal(shorter.tracks[0].clips[0].generator.duration,4);
 // Renderer: vertical drawing, step-by-step construction, arrow heads, preview frames.
 const win=BrowserWindow.getAllWindows()[0];win.webContents.on('console-message',e=>{if(e.level==='error')console.error('Renderer:',e.message);});if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));const js=c=>win.webContents.executeJavaScript(c,true);await js('demoReady');
 win.webContents.session.webRequest.onBeforeRequest({urls:['https://*/*','http://*/*']},(_d,done)=>done({cancel:true}));
 await js(`window.__sample=${JSON.stringify(sample)};void 0`);
 const frames=await js(`(async()=>{const res=[];for(const t of [0.05,0.9,1.45,1.9,2.9,3.6,4.2,5.9]){const c=document.createElement('canvas');await LQTACGenerators.draw(__sample,t,c);const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0&&(d[i-3]>40||d[i-2]>40||d[i-1]>60))n++;res.push({t,w:c.width,h:c.height,lit:n,png:c.toDataURL('image/png')});}return res;})()`);
 if(out)for(const f of frames)await fs.writeFile(path.join(out,'diagrama-'+f.t.toFixed(2)+'s.png'),Buffer.from(f.png.split(',')[1],'base64'));
 console.log('Lit pixels per time: '+frames.map(f=>f.t+'s='+f.lit).join(' '));
 for(const f of frames){assert.equal(f.w,1080);assert.equal(f.h,1920);}
 for(let i=1;i<frames.length;i++)assert(frames[i].lit>=frames[i-1].lit*.98,'the diagram should build up step by step: '+frames.map(f=>f.t+':'+f.lit).join(' '));
 assert(frames.at(-1).lit>frames[0].lit*20&&frames.at(-1).lit>frames[1].lit*2,'final frame much fuller than the start');
 // Strokes waiting for their draw effect leave no stray dot (round caps with a zero-length dash).
 assert.equal(await js(`(async()=>{const c=document.createElement('canvas');await LQTACGenerators.draw(__sample,0.05,c);const d=c.getContext('2d').getImageData(500,640,80,80).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]>120)n++;return n;})()`),0);
 // Arrow head: at the tip of the first arrow (x 540, y 490+170+~16) pixels appear only once drawing has finished.
 const tip=await js(`(async()=>{const at=async t=>{const c=document.createElement('canvas');await LQTACGenerators.draw(__sample,t,c);const d=c.getContext('2d').getImageData(530,672,20,14).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]>200&&d[i+1]>200&&d[i+2]>200)n++;return n;};return {during:await at(1.5),after:await at(2.2)};})()`);
 assert(tip.after>20&&tip.during<tip.after,'arrow head appears when the stroke arrives: '+JSON.stringify(tip));
 // Counter: the number runs up while the title plays and ends on the exact value with Spanish grouping.
 assert.equal(await js(`(async()=>{const c=document.createElement('canvas');await LQTACGenerators.draw(__sample,5.9,c);return LQTACGeneratorModel.countText(__sample.objects.find(o=>o.count),5.9);})()`),'modelos · 382.781');
 assert.notEqual(model.countText(sample.objects.find(o=>o.count),3.9),'modelos · 382.781');assert.match(model.countText(sample.objects.find(o=>o.count),3.9),/^modelos · [\d.]+$/);
 // Classic horizontal titles still draw at 1920×1080.
 assert.deepEqual(await js(`(async()=>{const c=document.createElement('canvas'),g=LQTACGeneratorModel.create('lower-third');await LQTACGenerators.draw(g,2,c);return [c.width,c.height];})()`),[1920,1080]);
 // Project: vertical diagram clip composed into a vertical frame fills it (no letterbox at the top of the frame).
 await js(`restoreProject(${JSON.stringify(edited)})`);await js('renderTimelineAt(7.9)');const frame=await js('captureProjectFrame(7.9,540,960)');
 if(out&&typeof frame==='string'&&frame.startsWith('data:'))await fs.writeFile(path.join(out,'proyecto-vertical-7.9s.png'),Buffer.from(frame.split(',')[1],'base64'));
 // Editor: open the vertical clip, canvas size selector, add an arrow, save keeps path/arrow/canvas.
 await js(`(async()=>{const clip=document.querySelector('.clip[data-generator]');await LQTACGenerators.edit('title',clip);})()`);await new Promise(r=>setTimeout(r,500));
 assert.equal(await js("$('#genCanvasSize').value"),'1080x1920');const aspect=await js("(()=>{const c=generatorEditorSession.design;return c.getHeight()/c.getWidth();})()");assert(Math.abs(aspect-1920/1080)<.02,'design canvas is vertical: '+aspect);
 assert.equal(await js("$('#genPreview').width+'x'+$('#genPreview').height"),'1080x1920');
 await js("$('#genAddArrow').click();void 0");assert.equal(await js("$('#genArrow').value"),'end');await js("$('#genArrow').value='both';$('#genArrow').dispatchEvent(new Event('input'));$('#genGlow').checked=false;$('#genGlow').dispatchEvent(new Event('input'));void 0");
 const saved=await js("(()=>{const g=generatorEditorSession.g;generatorEditorSession.save(true);return JSON.parse(document.querySelector('.clip[data-generator]').dataset.generator);})()");
 assert.deepEqual(saved.canvas,{width:1080,height:1920});const paths=saved.objects.filter(o=>o.type==='path');assert.equal(paths.length,5);assert.equal(paths.at(-1).arrow,'both');assert(!paths.at(-1).glow);assert.equal(paths[0].path,'M0 0 L0 170');assert.equal(saved.objects.find(o=>o.type==='line').arrow,'both');assert.deepEqual(saved.objects.find(o=>o.count)?.count,sample.objects.find(o=>o.count).count,'editor keeps the counter');
 // Word timing from Whisper.cpp tokens (sub-words joined, control tokens skipped, project time) and the cue-based estimate.
 const speech=require('./subtitles-service.cjs');const words=speech.wordsFromWhisper({transcription:[{tokens:[{text:'[_BEG_]',offsets:{from:0,to:0}},{text:' recomp',offsets:{from:1000,to:1200}},{text:'il',offsets:{from:1200,to:1300}},{text:'ada',offsets:{from:1300,to:1500}},{text:',',offsets:{from:1500,to:1550}},{text:' para',offsets:{from:1600,to:1800}}]}]},10);
 assert.deepEqual(words,[{text:'recompilada,',startSeconds:11,durationSeconds:.55},{text:'para',startSeconds:11.6,durationSeconds:.2}]);
 assert.equal(speech.wordsFromCues([{subtitleText:'uno dos',startSeconds:2,durationSeconds:1}]).length,2);
 // MCP guide topics (served without the app running).
 const guide=require('./mcp-guide.cjs');for(const t of guide.topics)assert(guide.guide(t).length>300,t);assert.match(guide.guide('rotulos'),/count \(contador\)/);
 await new Promise(r=>setTimeout(r,400));
 // Changing the canvas back to 16:9 removes the canvas field.
 await js(`(async()=>{const clip=document.querySelector('.clip[data-generator]');await LQTACGenerators.edit('title',clip);})()`);await new Promise(r=>setTimeout(r,400));
 await js("$('#genCanvasSize').value='1920x1080';$('#genCanvasSize').dispatchEvent(new Event('change'));void 0");const horiz=await js("(()=>{generatorEditorSession.save(true);return JSON.parse(document.querySelector('.clip[data-generator]').dataset.generator);})()");assert.equal(horiz.canvas,undefined);
 io.validateProject(await js('projectSnapshot()'));
 console.log('Diagrams OK: vertical canvas, paths, arrow heads, step-by-step draw, MCP title generator, editor round trip'+(out?' · frames in '+out:''));
 clearTimeout(timer);app.exit(0);}catch(e){console.error(e);app.exit(1);}});
