// Titles: per-letter/word animation, easing, gradient, glow, object entrances (wipe), templates and the editor controls.
// Usage: electron desktop\verify-titles.cjs
const {app,BrowserWindow}=require('electron'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(app.getPath('temp'),'lqtac-titles-'+process.pid);app.setPath('userData',path.join(root,'profile'));
app.on('browser-window-created',(_e,w)=>w.webContents.setBackgroundThrottling(false));require('./main.cjs');
app.whenReady().then(async()=>{const timer=setTimeout(()=>{console.error('Titles timeout');app.exit(1);},240000);timer.unref();try{
  // Pure parts in Node: model, motion and every template.
  const model=require('../dist/assets/generator-model.js'),M=require('../dist/assets/title-motion.js'),T=require('../dist/assets/title-templates.js');
  for(const t of T.list)model.validate(T.build(t.id));assert(T.list.length>=12);
  for(const e of M.easingNames){assert(Math.abs(M.ease(e,0))<1e-9&&Math.abs(M.ease(e,1)-1)<1e-9,e);}assert(M.ease('back',.6)>1,'back overshoots');
  const a={in:{effect:'fade',by:'letter',duration:.4,stagger:.2,delay:0,easing:'linear'}};assert.equal(M.unitState(a,0,3,.4,5,80).alpha,1);assert.equal(M.unitState(a,2,3,.39,5,80).alpha,0);
  assert.deepEqual(M.unitMap([['a','b',' ','c']],'word'),{map:[[0,0,-1,1]],count:2});
  console.log('Title model, motion and templates OK');
  const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
  const js=c=>win.webContents.executeJavaScript(c,true);await js('demoReady');
  const r=await js(`(async()=>{
    const r={},canvas=()=>document.createElement('canvas'),px=(c,x0,y0,x1,y1)=>{const d=c.getContext('2d').getImageData(x0,y0,x1-x0,y1-y0).data;let n=0;for(let i=3;i<d.length;i+=4)n+=d[i];return n/255;};
    const base=extra=>({version:1,type:'title',name:'t',duration:6,background:null,motion:{preset:'none',in:0,out:0,easing:'smooth'},keys:[],objects:[{type:'textbox',text:'ABCDEFGH',left:160,top:440,width:1600,fontSize:150,fontFamily:'Segoe UI',fontWeight:'bold',fill:'#ffffff',textAlign:'center',scaleX:1,scaleY:1,opacity:1,angle:0,...extra}]});
    const draw=async(g,t)=>{const c=canvas();await LQTACGenerators.draw(g,t,c);return c;};
    // Per-letter layout matches the static text once the entrance has finished.
    const still=await draw(base({}),3),done=await draw(base({anim:{in:{effect:'rise',by:'letter',duration:.3,stagger:.05,delay:0,easing:'out'}}}),3);
    {const A=still.getContext('2d').getImageData(0,0,1920,1080).data,B=done.getContext('2d').getImageData(0,0,1920,1080).data;let diff=0,ink=0;for(let i=3;i<A.length;i+=4){diff+=Math.abs(A[i]-B[i]);ink+=A[i];}r.layoutDiff=diff/ink;}
    // Mid-entrance: left letters already in, right letters still hidden.
    const mid=await draw(base({anim:{in:{effect:'fade',by:'letter',duration:.2,stagger:.2,delay:0,easing:'linear'}}}),.8);r.letters=[px(mid,0,380,960,700),px(mid,960,380,1920,700)];
    r.wordStart=px(await draw(base({text:'UNO DOS',anim:{in:{effect:'scale',by:'word',duration:.5,stagger:1,delay:0,easing:'bounce'}}}),.6),0,0,1920,1080);
    // Exit by object fades the whole text before the end.
    r.exit=[px(await draw(base({anim:{out:{effect:'fade',by:'object',duration:1,stagger:0,delay:0,easing:'linear'}}}),5.9),0,0,1920,1080),px(still,0,0,1920,1080),px(await draw(base({anim:{out:{effect:'fade',by:'object',duration:1,stagger:0,delay:0,easing:'linear'}}}),6),0,0,1920,1080)];
    // Gradient top-to-bottom: red at the top of the glyphs, blue at the bottom.
    {const c=await draw(base({text:'IIIIIIII',gradient:{angle:90,stops:[{offset:0,color:'#ff0000'},{offset:1,color:'#0000ff'}]}}),3),ctx=c.getContext('2d');let top=null,bottom=null,x=-1;const row=ctx.getImageData(0,560,1920,1).data;for(let i=0;i<1920;i++)if(row[i*4+3]>250){x=i+2;break;}for(let y=380;y<760&&!top&&x>=0;y++){const d=ctx.getImageData(x,y,1,1).data;if(d[3]>250)top=[...d];}for(let y=760;y>380&&!bottom&&x>=0;y--){const d=ctx.getImageData(x,y,1,1).data;if(d[3]>250)bottom=[...d];}r.gradient=[top,bottom];}
    // Glow adds light around the glyphs.
    r.glow=[px(still,0,0,1920,1080),px(await draw(base({glow:{color:'#00e5ff',size:40,strength:3}}),3),0,0,1920,1080)];
    // Wipe on a rectangle reveals it left to right.
    {const g=base({});g.objects=[{type:'rect',left:200,top:200,width:1000,height:200,fill:'#ffffff',scaleX:1,scaleY:1,opacity:1,angle:0,anim:{in:{effect:'wipe',by:'object',duration:1,stagger:0,delay:0,easing:'linear'}}}];const c=await draw(g,.5);r.wipe=[px(c,200,200,700,400),px(c,700,200,1200,400)];}
    // Loop (wave) moves letters over time.
    {const g=base({anim:{loop:{effect:'wave',amount:1,speed:1}}});const c1=await draw(g,0),c2=await draw(g,.25);r.wave=px(c1,0,0,1920,440)!==px(c2,0,0,1920,440);}
    // Every template draws something halfway through.
    r.templates={};for(const t of LQTACTitleTemplates.list){const g=LQTACTitleTemplates.build(t.id);r.templates[t.id]=Math.round(px(await draw(g,g.type==='credits'?g.duration*.3:g.duration/2),0,0,1920,1080));}
    // Perspective crawl (no stars, transparent): intro fixed on screen before the delay, text enters at the bottom, recedes narrower, fades out at the end.
    {const g=LQTACTitleTemplates.build('crawl');g.crawl.stars=false;g.background=null;const ext=(c,y0,y1)=>{const d=c.getContext('2d').getImageData(0,y0,1920,y1-y0).data;let lo=1920,hi=-1;for(let y=0;y<y1-y0;y++)for(let x=0;x<1920;x++)if(d[(y*1920+x)*4+3]>128){lo=Math.min(lo,x);hi=Math.max(hi,x);}return hi-lo;};
      const early=await draw(g,1.5),start=await draw(g,g.crawl.delay+4),mid=await draw(g,40),end=await draw(g,g.duration);
      r.crawl={intro:px(early,0,0,1920,1080),introBottom:px(early,0,800,1920,1080),startBottom:px(start,0,800,1920,1080),startTop:px(start,0,0,1920,300),end:px(end,0,0,1920,1080),near:ext(mid,850,1080),far:ext(mid,0,600)};}
    // Editor: template, style and animation controls write the design; the result goes to the timeline.
    void LQTACGenerators.edit('title');for(let i=0;i<50&&!window.generatorEditorSession?.dialog?.open;i++)await new Promise(x=>setTimeout(x,100));const s=generatorEditorSession,q=id=>s.dialog.querySelector('#'+id);
    r.tabs=['genTemplate','genGradient','genGlow','genInEffect','genLoop'].every(id=>q(id)&&q(id).closest('.gen-inspector, header'));
    q('genTemplate').value='neon';q('genTemplate').dispatchEvent(new Event('change'));r.templateApplied=[s.design.getObjects().length,q('genName').value];
    const o=s.design.getObjects()[0];s.design.setActiveObject(o);s.design.fire('selection:created',{selected:[o]});r.fields=[q('genGlow').checked,q('genLoop').value,q('genInEffect').value];
    q('genInEffect').value='drop';q('genInBy').value='word';q('genInEffect').dispatchEvent(new Event('input'));q('genGradient').checked=true;q('genGradient2').value='#ff0000';q('genGradient').dispatchEvent(new Event('input'));
    const saved=LQTACGenerators.serialize(s.design)[0];r.serialized=[saved.anim.in.effect,saved.anim.in.by,saved.gradient.stops.at(-1).color,saved.fill,saved.glow.size];
    q('genEase').value='elastic';q('genEase').dispatchEvent(new Event('input'));r.ease=s.g.motion.easing;
    // Crawl template in the editor: scene fields appear, edit the plane, fixed intro and justified body survive serialisation.
    {q('genTemplate').value='crawl';q('genTemplate').dispatchEvent(new Event('change'));const shown=!q('genCrawlTilt').closest('label').hidden&&q('genCrawlStars').checked;q('genCrawlTilt').value='45';q('genCrawlTilt').dispatchEvent(new Event('input'));const objs=LQTACGenerators.serialize(s.design);
      r.crawlEditor=[shown,s.g.crawl.tilt,objs[0].fixed===true,objs.at(-1).textAlign,!!q('genAlign').querySelector('option[value=justify-left]')];LQTACGeneratorModel.validate({...s.g,objects:objs});
      q('genTemplate').value='neon';q('genTemplate').dispatchEvent(new Event('change'));r.crawlCleared=[s.g.crawl===undefined,q('genCrawlTilt').closest('label').hidden]}
    {const o=s.design.getObjects()[0];s.design.setActiveObject(o);s.design.fire('selection:created',{selected:[o]});q('genInEffect').value='drop';q('genInBy').value='word';q('genInEffect').dispatchEvent(new Event('input'));}
    const track=$$('.track').find(t=>t.dataset.kind==='video');const before=timelineClips().length;s.save(true);await new Promise(x=>setTimeout(x,600));const clip=timelineClips().find(c=>c.dataset.generator&&JSON.parse(c.dataset.generator).objects[0].anim?.in?.effect==='drop');r.timeline=[timelineClips().length>before||!!clip,!!clip];
    return r;})()`);
  console.log(JSON.stringify(r));
  assert(r.layoutDiff<.02,'per-letter layout drifts from static text: '+r.layoutDiff);
  assert(r.letters[0]>r.letters[1]*3,'letter stagger');assert(r.wordStart>0);
  assert(r.exit[0]<r.exit[1]*.2&&r.exit[2]<1,'object exit fade');
  assert(r.gradient[0]&&r.gradient[1]&&r.gradient[0][0]>r.gradient[0][2]&&r.gradient[1][2]>r.gradient[1][0],'vertical gradient');
  assert(r.glow[1]>r.glow[0]+1000,'glow halo');assert(r.wipe[0]>90000&&r.wipe[1]<1000,'wipe reveal');assert(r.wave,'wave loop');
  for(const [id,ink] of Object.entries(r.templates))assert(ink>1000,'template draws nothing: '+id);
  assert(r.crawl.intro>1000&&r.crawl.introBottom<1,'intro fixed before the crawl');assert(r.crawl.startBottom>1000&&r.crawl.startTop<1,'crawl enters at the bottom');assert(r.crawl.end<1,'crawl faded at the end');assert(r.crawl.far>0&&r.crawl.far<r.crawl.near*.8,'perspective narrows with distance');
  assert.deepEqual(r.crawlEditor,[true,45,true,'justify-left',true]);assert.deepEqual(r.crawlCleared,[true,true]);assert.equal(T.list.length,14);
  assert(r.tabs,'new fields placed in the inspector');assert.deepEqual(r.templateApplied,[2,'Neón']);assert.deepEqual(r.fields,[true,'pulse','fade']);
  assert.deepEqual(r.serialized,['drop','word','#ff0000','#e8fbff',30]);assert.equal(r.ease,'elastic');assert(r.timeline[1],'title with animation on the timeline');
  console.log('TITLES VERIFICATION PASSED');app.exit(0);
}catch(e){console.error(e);app.exit(1);}});
