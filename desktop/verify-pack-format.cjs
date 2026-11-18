// Content packs: signing, tamper and foreign-key rejection, manifest validation, install/update/downgrade/remove.
// Usage: node verify-pack-format.cjs
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const format=require('./pack-format.cjs'),{createPacksStore}=require('./packs-store.cjs');
function png(w,h,rgba=[255,255,255,255]){
  const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  const crc=b=>{let c=~0;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return (~c)>>>0;};
  const chunk=(type,data)=>{const t=Buffer.from(type),len=Buffer.alloc(4),c=Buffer.alloc(4);len.writeUInt32BE(data.length);c.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([len,t,data,c]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
  const raw=Buffer.alloc((w*4+1)*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)raw.set(rgba,y*(w*4+1)+1+x*4);
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
function manifest(version='1.0.0'){return {id:'lqtac.prueba',name:'Pack de prueba',version,author:'LQTAC',description:'Prueba',minAppVersion:'0.24.0',cover:'cover.png',content:{
  subtitleFrames:[{id:'marco',name:'Marco',image:'frames/marco.png',slice:{top:20,right:20,bottom:20,left:20},padding:{x:.8,y:.4},fit:'text',opacity:1,fade:.3,style:{color:'#fff8e1',y:.88}}],
  images:[{id:'estrella',name:'Estrella',file:'images/estrella.png'}],
  titles:[{id:'rotulo',name:'Rótulo',category:'Navidad',generator:{version:1,type:'lower-third',name:'Rótulo',duration:6,background:null,objects:[{type:'image',asset:'lqtac.prueba:images/estrella.png',left:100,top:100,width:64,height:64,scaleX:1,scaleY:1,opacity:1,angle:0},{type:'textbox',text:'Hola',left:200,top:100,width:600,fontSize:60,fontFamily:'Segoe UI',fontWeight:'normal',fill:'#ffffff',textAlign:'center',scaleX:1,scaleY:1,opacity:1,angle:0}],motion:{preset:'fade',in:1,out:1,easing:'smooth'},keys:[]}}],
  masks:[{id:'copo',name:'Copo',image:'masks/copo.png',softness:.2,invert:false,motion:'zoomIn',amount:.6,blur:4,rotation:360}],
  presets:[{id:'calido',name:'Cálido',kind:'video',key:'color',values:{temperature:20}}]}};}
const files=()=>({'cover.png':png(32,18),'frames/marco.png':png(64,64,[10,30,60,200]),'images/estrella.png':png(16,16,[255,215,0,255]),'masks/copo.png':png(32,32)});
(async()=>{
  const official=format.generateKeys(),stranger=format.generateKeys();const trustedKeys=[{id:official.id,name:'LQTAC (oficial)',publicKey:official.publicKey}];
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'lqpack-'));
  const built=format.build(manifest(),files(),official.privateKey,{appVersion:'0.24.0'});
  assert.deepEqual(built.summary.counts,{subtitleFrames:1,titles:1,images:1,masks:1,presets:1});
  const verified=format.verify(built.buffer,{trustedKeys,appVersion:'0.24.0'});assert.equal(verified.signer.name,'LQTAC (oficial)');
  // Tampering: a changed byte in an image or in the manifest breaks the signature.
  const data=JSON.parse(built.buffer);const changed=Buffer.from(data.files['images/estrella.png'],'base64');changed[changed.length-20]^=1;
  assert.throws(()=>format.verify(Buffer.from(JSON.stringify({...data,files:{...data.files,'images/estrella.png':changed.toString('base64')}})),{trustedKeys}),/firma no coincide/);
  assert.throws(()=>format.verify(Buffer.from(JSON.stringify({...data,manifest:{...data.manifest,name:'Otro'}})),{trustedKeys}),/firma no coincide/);
  assert.throws(()=>format.verify(Buffer.from(JSON.stringify({...data,signature:undefined})),{trustedKeys}),/no está firmado/);
  // Someone else's key: a perfectly valid pack is still refused.
  assert.throws(()=>format.verify(format.build(manifest(),files(),stranger.privateKey).buffer,{trustedKeys}),/clave desconocida/);
  // Manifest validation at build time.
  const bad=(edit,re)=>{const m=manifest(),f=files();edit(m,f);assert.throws(()=>format.build(m,f,official.privateKey),re);};
  bad(m=>{m.id='Pack';},/Identificador de paquete/);
  bad((m,f)=>{f['../fuera.png']=png(2,2);},/Ruta de archivo/);
  bad((m,f)=>{f['extra.png']=png(2,2);},/no usado/);
  bad(m=>{m.content.subtitleFrames[0].slice.left=50;},/zona central/);
  bad(m=>{m.content.titles[0].generator.objects[0].asset='otro.pack:images/estrella.png';},/de este paquete/);
  bad(m=>{m.content.masks[0].motion='spin';},/Movimiento/);
  bad(m=>{m.content.titles[0].generator.objects[1].onclick='x';},/no válido/);
  bad((m,f)=>{f['images/estrella.png']=Buffer.from('<script>');},/PNG/);
  assert.throws(()=>format.build({...manifest(),minAppVersion:'0.25.0'},files(),official.privateKey,{appVersion:'0.24.0'}),/0\.25\.0/);
  // Store: install, update, refuse downgrade, enable/disable, asset, remove.
  const store=createPacksStore({directory:path.join(root,'packs'),appVersion:'0.24.0',trustedKeys});
  const write=async(name,buffer)=>{const p=path.join(root,name);await fs.writeFile(p,buffer);return p;};
  const v1=await write('v1.lqpack',built.buffer),v2=await write('v2.lqpack',format.build(manifest('1.1.0'),files(),official.privateKey).buffer);
  assert.equal((await store.install(v1)).version,'1.0.0');assert.equal((await store.list())[0].enabled,true);
  const up=await store.install(v2);assert.equal(up.previousVersion,'1.0.0');assert.equal((await store.list())[0].version,'1.1.0');
  await assert.rejects(store.install(v1),/más nueva/);assert.equal((await store.install(v1,{allowDowngrade:true})).version,'1.0.0');
  await store.setEnabled('lqtac.prueba',false);assert.equal((await store.list())[0].enabled,false);await store.install(v2);assert.equal((await store.list())[0].enabled,true);
  assert.match(await store.asset('lqtac.prueba','frames/marco.png'),/^data:image\/png;base64,iVBOR/);
  await assert.rejects(store.asset('lqtac.prueba','../manifest.json'),/no válido/);await assert.rejects(store.asset('..','x.png'),/no válido/);
  const forged=await write('forged.lqpack',format.build(manifest(),files(),stranger.privateKey).buffer);await assert.rejects(store.install(forged),/clave desconocida/);
  await assert.rejects(store.install(path.join(root,'v1.zip')),/lqpack/);
  await store.remove('lqtac.prueba');assert.equal((await store.list()).length,0);
  assert.deepEqual((await fs.readdir(path.join(root,'packs'))).filter(n=>n!=='state.json'),[]);
  await fs.rm(root,{recursive:true,force:true});
  console.log(JSON.stringify({passed:true,bytes:built.buffer.length,key:official.id}));
})().catch(e=>{console.error(e.stack);process.exit(1);});
