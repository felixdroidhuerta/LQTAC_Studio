// Cinema Studio content packs (.lqpack): signed, data-only bundles of subtitle frames, title templates, images,
// transition masks and effect presets. Shared by the app (verify/install) and the private LQTAC Pack Studio (build/sign).
//
// File layout (UTF-8 JSON):
//   {format:'LQTAC Pack',formatVersion:1,manifest:{...},files:{'path':'<base64>'},signature:{key,algorithm:'ed25519',value}}
// Signed bytes: 'LQTAC Pack v1\n' + canonical(manifest) + '\n' + one 'path sha256' line per file, sorted by path.
// Nothing in a pack is executed: every entry is validated against the same models the editor uses.
const crypto=require('node:crypto'),path=require('node:path');
const FORMAT='LQTAC Pack',FORMAT_VERSION=1;
const LIMITS={file:20*1024*1024,total:200*1024*1024,files:1000,manifest:4*1024*1024};
const ID=/^[a-z0-9]+(?:\.[a-z0-9][a-z0-9-]{0,40}){1,3}$/,ITEM=/^[a-z0-9][a-z0-9-]{0,47}$/,FILE=/^[A-Za-z0-9][A-Za-z0-9_-]*(?:\/[A-Za-z0-9][A-Za-z0-9_.-]*)*\.(png|jpe?g)$/i;
const SEMVER=/^(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})$/;
const MASK_MOTIONS=['none','zoomIn','zoomOut','left','right','up','down','shake'];
const model=name=>require(path.join(__dirname,'..','dist','assets',name));

function canonical(value){
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
function compareVersions(a,b){const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]<y[i]?-1:1;return 0;}
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function signedBytes(manifest,files){
  const lines=Object.keys(files).sort().map(p=>p+' '+sha256(files[p]));
  return Buffer.from('LQTAC Pack v1\n'+canonical(manifest)+'\n'+lines.join('\n'),'utf8');
}
function keyId(publicKeyPem){return sha256(crypto.createPublicKey(publicKeyPem).export({type:'spki',format:'der'})).slice(0,16);}

function imageInfo(bytes,file){
  if(/\.png$/i.test(file)){if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error(file+': no es un PNG válido');return {type:'png',width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};}
  if(bytes.length<4||bytes[0]!==0xff||bytes[1]!==0xd8)throw Error(file+': no es un JPEG válido');
  // Walk JPEG segments to the frame header for the size.
  for(let i=2;i+9<bytes.length;){if(bytes[i]!==0xff){i++;continue;}const m=bytes[i+1],len=bytes.readUInt16BE(i+2);if(m>=0xc0&&m<=0xcf&&![0xc4,0xc8,0xcc].includes(m))return {type:'jpeg',width:bytes.readUInt16BE(i+7),height:bytes.readUInt16BE(i+5)};i+=2+len;}
  throw Error(file+': JPEG sin tamaño');
}
const text=(v,max,label,optional=false)=>{if(optional&&(v===undefined||v===''))return;if(typeof v!=='string'||!v.trim()||v.length>max||/[\u0000-\u001f]/.test(v.replace(/\n/g,'')))throw Error(label+' no válido');};
const num=(v,min,max,label)=>{if(!Number.isFinite(v)||v<min||v>max)throw Error(label+' fuera de rango ('+min+' a '+max+')');};
const only=(o,keys,label)=>{if(!o||typeof o!=='object'||Array.isArray(o))throw Error(label+' no válido');const extra=Object.keys(o).filter(k=>!keys.includes(k));if(extra.length)throw Error(label+': campo no admitido «'+extra[0]+'»');};
function uniqueIds(list,label){const seen=new Set();for(const item of list){if(!ITEM.test(item?.id||''))throw Error(label+': identificador no válido «'+(item?.id??'')+'»');if(seen.has(item.id))throw Error(label+': identificador repetido «'+item.id+'»');seen.add(item.id);}}

// Validates the manifest and its references. files: {path: Buffer}. Returns a summary.
function validateManifest(manifest,files,{appVersion}={}){
  only(manifest,['id','name','version','author','description','minAppVersion','cover','content'],'Manifiesto');
  if(!ID.test(manifest.id||''))throw Error('Identificador de paquete no válido (ejemplo: lqtac.navidad)');
  text(manifest.name,80,'Nombre del paquete');text(manifest.author,80,'Autor');text(manifest.description,600,'Descripción',true);
  if(!SEMVER.test(manifest.version||''))throw Error('Versión del paquete no válida (formato 1.0.0)');
  if(manifest.minAppVersion!==undefined&&!SEMVER.test(manifest.minAppVersion))throw Error('Versión mínima de Cinema Studio no válida');
  if(appVersion&&manifest.minAppVersion&&compareVersions(appVersion,manifest.minAppVersion)<0)throw Error('Este paquete necesita Cinema Studio '+manifest.minAppVersion+' o posterior');
  const paths=Object.keys(files);if(paths.length>LIMITS.files)throw Error('Demasiados archivos en el paquete');
  let total=0;const info={};
  for(const p of paths){if(!FILE.test(p)||p.split('/').some(s=>s==='.'||s==='..'))throw Error('Ruta de archivo no admitida: '+p);const bytes=files[p];if(!Buffer.isBuffer(bytes)||!bytes.length)throw Error('Archivo vacío: '+p);if(bytes.length>LIMITS.file)throw Error(p+' supera 20 MB');total+=bytes.length;info[p]=imageInfo(bytes,p);if(info[p].width<1||info[p].height<1||info[p].width>8192||info[p].height>8192)throw Error(p+': tamaño de imagen no admitido');}
  if(total>LIMITS.total)throw Error('El paquete supera 200 MB');
  const used=new Set(),file=(p,label,png=false)=>{if(typeof p!=='string'||!info[p])throw Error(label+': falta el archivo «'+p+'»');if(png&&info[p].type!=='png')throw Error(label+': debe ser PNG');used.add(p);return info[p];};
  if(manifest.cover!==undefined)file(manifest.cover,'Portada');
  const c=manifest.content;only(c,['subtitleFrames','titles','images','masks','presets'],'Contenido');
  const lists={subtitleFrames:c.subtitleFrames||[],titles:c.titles||[],images:c.images||[],masks:c.masks||[],presets:c.presets||[]};
  for(const [k,v] of Object.entries(lists))if(!Array.isArray(v)||v.length>500)throw Error('Lista '+k+' no válida');
  if(!Object.values(lists).some(v=>v.length))throw Error('El paquete no contiene nada');
  const subtitle=model('subtitle-model.js'),fonts=model('font-model.js'),generator=model('generator-model.js');
  uniqueIds(lists.subtitleFrames,'Marco');
  for(const f of lists.subtitleFrames){
    only(f,['id','name','image','slice','padding','fit','width','offsetY','scale','opacity','fade','style'],'Marco «'+f.id+'»');text(f.name,80,'Nombre del marco');
    const img=file(f.image,'Marco «'+f.name+'»',true);only(f.slice,['top','right','bottom','left'],'Cortes del marco');
    for(const k of ['top','right','bottom','left'])if(!Number.isInteger(f.slice[k])||f.slice[k]<0)throw Error('Cortes del marco «'+f.name+'» no válidos');
    if(f.slice.left+f.slice.right>=img.width||f.slice.top+f.slice.bottom>=img.height)throw Error('Los cortes del marco «'+f.name+'» no dejan zona central');
    only(f.padding,['x','y'],'Margen del marco');num(f.padding.x,0,6,'Margen horizontal');num(f.padding.y,0,6,'Margen vertical');
    if(!['text','wide'].includes(f.fit))throw Error('Ajuste del marco no válido (text o wide)');
    if(f.width!==undefined)num(f.width,.2,1,'Ancho del marco');num(f.offsetY??0,-3,3,'Desplazamiento vertical');num(f.scale??1,.1,4,'Escala de esquinas');num(f.opacity??1,0,1,'Opacidad');num(f.fade??0,0,3,'Fundido');
    if(f.style!==undefined){only(f.style,['font','size','color','outline','stroke','y'],'Estilo del marco');const s={...subtitle.defaults,...f.style};subtitle.validate({subtitleText:'Prueba',subtitleStyle:s});if(f.style.font!==undefined&&!fonts.valid(f.style.font))throw Error('Fuente no válida');}
  }
  uniqueIds(lists.images,'Imagen');
  for(const i of lists.images){only(i,['id','name','file'],'Imagen «'+i.id+'»');text(i.name,80,'Nombre de imagen');file(i.file,'Imagen «'+i.name+'»');}
  uniqueIds(lists.titles,'Rótulo');
  for(const t of lists.titles){
    only(t,['id','name','category','generator'],'Rótulo «'+t.id+'»');text(t.name,80,'Nombre del rótulo');text(t.category,40,'Categoría',true);
    generator.validate(structuredClone(t.generator));
    for(const o of t.generator.objects)if(o.type==='image'){const [pack,ref]=o.asset.split(':');if(pack!==manifest.id)throw Error('Rótulo «'+t.name+'»: la imagen debe ser de este paquete');file(ref,'Rótulo «'+t.name+'»');}
  }
  uniqueIds(lists.masks,'Máscara');
  for(const m of lists.masks){
    only(m,['id','name','image','softness','invert','motion','amount','blur','rotation'],'Máscara «'+m.id+'»');text(m.name,80,'Nombre de máscara');file(m.image,'Máscara «'+m.name+'»');
    num(m.softness??.15,0,1,'Suavidad');if(m.invert!==undefined&&typeof m.invert!=='boolean')throw Error('Invertir no válido');if(m.motion!==undefined&&!MASK_MOTIONS.includes(m.motion))throw Error('Movimiento de máscara no válido');num(m.amount??.5,0,1,'Cantidad');num(m.blur??0,0,50,'Desenfoque');num(m.rotation??0,-720,720,'Giro');
  }
  uniqueIds(lists.presets,'Preset');
  for(const p of lists.presets){only(p,['id','name','kind','key','values','animation'],'Preset «'+p.id+'»');text(p.name,80,'Nombre del preset');if(!['video','audio'].includes(p.kind)||typeof p.key!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(p.key)||!p.values||typeof p.values!=='object'||Array.isArray(p.values))throw Error('Preset «'+p.name+'» no válido');if(JSON.stringify(p).length>200000)throw Error('Preset demasiado grande');}
  const unused=paths.filter(p=>!used.has(p));if(unused.length)throw Error('Archivo no usado en el paquete: '+unused[0]);
  if(Buffer.byteLength(JSON.stringify(manifest))>LIMITS.manifest)throw Error('Manifiesto demasiado grande');
  return {id:manifest.id,version:manifest.version,counts:Object.fromEntries(Object.entries(lists).map(([k,v])=>[k,v.length])),bytes:total};
}

// Parses and verifies a .lqpack. trustedKeys: [{id,name,publicKey}]. Throws with a user-facing message.
function verify(buffer,{trustedKeys,appVersion}){
  if(!Buffer.isBuffer(buffer)||buffer.length>LIMITS.total*1.4+LIMITS.manifest)throw Error('Archivo de paquete demasiado grande');
  let data;try{data=JSON.parse(buffer.toString('utf8').replace(/^﻿/,''));}catch{throw Error('El archivo no es un paquete de Cinema Studio');}
  if(data?.format!==FORMAT)throw Error('El archivo no es un paquete de Cinema Studio');
  if(data.formatVersion!==FORMAT_VERSION)throw Error('Formato de paquete no compatible con esta versión de Cinema Studio');
  only(data,['format','formatVersion','manifest','files','signature'],'Paquete');
  if(!data.files||typeof data.files!=='object'||Array.isArray(data.files))throw Error('Paquete dañado');
  const files={};for(const [p,b64] of Object.entries(data.files)){if(typeof b64!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(b64))throw Error('Paquete dañado');files[p]=Buffer.from(b64,'base64');}
  const sig=data.signature;if(!sig||sig.algorithm!=='ed25519'||typeof sig.key!=='string'||typeof sig.value!=='string')throw Error('Paquete no oficial: no está firmado');
  const key=(trustedKeys||[]).find(k=>k.id===sig.key);if(!key)throw Error('Paquete no oficial: firmado con una clave desconocida');
  let ok=false;try{ok=crypto.verify(null,signedBytes(data.manifest,files),crypto.createPublicKey(key.publicKey),Buffer.from(sig.value,'base64'));}catch{}
  if(!ok)throw Error('Paquete dañado o modificado: la firma no coincide');
  const summary=validateManifest(data.manifest,files,{appVersion});
  return {manifest:data.manifest,files,signer:{id:key.id,name:key.name},summary};
}

// Builds a signed .lqpack (used only by LQTAC Pack Studio, which holds the private key).
function build(manifest,files,privateKeyPem,{appVersion}={}){
  const summary=validateManifest(manifest,files,{appVersion});
  const privateKey=crypto.createPrivateKey(privateKeyPem),publicKey=crypto.createPublicKey(privateKey).export({type:'spki',format:'pem'});
  const value=crypto.sign(null,signedBytes(manifest,files),privateKey).toString('base64');
  const body={format:FORMAT,formatVersion:FORMAT_VERSION,manifest,files:Object.fromEntries(Object.keys(files).sort().map(p=>[p,files[p].toString('base64')])),signature:{key:keyId(publicKey),algorithm:'ed25519',value}};
  return {buffer:Buffer.from(JSON.stringify(body),'utf8'),summary,keyId:body.signature.key};
}
function generateKeys(){const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519');const pub=publicKey.export({type:'spki',format:'pem'});return {publicKey:pub,privateKey:privateKey.export({type:'pkcs8',format:'pem'}),id:keyId(pub)};}

module.exports={FORMAT,FORMAT_VERSION,LIMITS,ID,ITEM,FILE,MASK_MOTIONS,canonical,compareVersions,imageInfo,validateManifest,verify,build,generateKeys,keyId,signedBytes};
