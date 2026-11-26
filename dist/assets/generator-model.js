(function(root){
const types=['text','title','lower-third','credits','poster'],motions=['none','fade','slide','zoom','typewriter','credits','crawl'];
// Image objects reference a file of an installed content pack: 'pack.id:folder/file.png'.
const ASSET=/^[a-z0-9]+(?:\.[a-z0-9][a-z0-9-]{0,40}){1,3}:[A-Za-z0-9][A-Za-z0-9_\/.-]{0,200}\.(png|jpe?g)$/i;
const props=['left','top','width','height','fontSize','angle','scaleX','scaleY','opacity','strokeWidth','rx','ry'];
const motion=()=>root.LQTACTitleMotion||(typeof module==='object'?require('./title-motion.js'):null);
// Canvas size: optional g.canvas {width,height}; titles without it keep the classic 1920×1080 design space.
const SIZES={'1920x1080':'Horizontal 16:9 · 1920×1080','1080x1920':'Vertical 9:16 · 1080×1920','1080x1080':'Cuadrado 1:1 · 1080×1080','1080x1350':'Vertical 4:5 · 1080×1350','1440x1080':'Clásico 4:3 · 1440×1080'};
function size(g){const c=g&&g.canvas;return c&&Number.isFinite(c.width)&&Number.isFinite(c.height)?{width:c.width,height:c.height}:{width:1920,height:1080};}
const ARROWS=['none','start','end','both'];
// Animated counter on a textbox: {n} in the text shows a number going from `from` to `to` between delay and delay+duration.
const COUNT_KEYS=['from','to','decimals','delay','duration','easing','separator','decimal'];
function validateCount(c,text){
 const n=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
 if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!COUNT_KEYS.includes(k)))throw Error('Contador no válido: campos from, to, decimals, delay, duration, easing, separator, decimal');
 if(!n(c.from,-1e12,1e12)||!n(c.to,-1e12,1e12))throw Error('Contador no válido: from y to son números');
 if(c.decimals!==undefined&&!(Number.isInteger(c.decimals)&&c.decimals>=0&&c.decimals<=4))throw Error('Contador no válido: decimals entero de 0 a 4');
 if(c.delay!==undefined&&!n(c.delay,0,3600))throw Error('Contador no válido: delay de 0 a 3600 s');
 if(!n(c.duration,.05,60))throw Error('Contador no válido: duration de 0,05 a 60 s');
 if(c.easing!==undefined&&!motion().easingNames.includes(c.easing))throw Error('Contador no válido: easing');
 if(c.separator!==undefined&&!['.',',',' ',' ',"'",''].includes(c.separator))throw Error('Contador no válido: separator');
 if(c.decimal!==undefined&&![',','.'].includes(c.decimal))throw Error('Contador no válido: decimal');
 if(typeof text!=='string'||!text.includes('{n}'))throw Error('Contador no válido: el texto debe incluir {n} donde va el número');
}
function formatCount(c,value){const d=c.decimals||0,sep=c.separator??'.',dec=c.decimal??',';const [i,f]=Math.abs(value).toFixed(d).split('.');return (value<0&&Number(Math.abs(value).toFixed(d))?'-':'')+i.replace(/\B(?=(\d{3})+(?!\d))/g,sep)+(f?dec+f:'');}
function countText(o,time){const c=o.count;if(!c)return o.text;const M=motion(),e=(M.easings[c.easing||'out']||M.easings.out)(Math.max(0,Math.min(1,(time-(c.delay||0))/c.duration))),v=c.from+(c.to-c.from)*e;return o.text.split('{n}').join(formatCount(c,v));}
// Free-form strokes ('path' objects): SVG path data limited to M L H V C Q Z (absolute or relative), local coordinates.
// Returns absolute segments plus bounding box, length and the start/end points with their travel direction (for arrow heads and the draw effect).
function parsePath(d){
 if(typeof d!=='string'||!d.trim()||d.length>20000||!/^[MmLlHhVvCcQqZz0-9eE.,+\-\s]+$/.test(d))throw Error('Trazo no válido: usa solo M L H V C Q Z y números');
 const tokens=d.match(/[MmLlHhVvCcQqZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g)||[],need={M:2,L:2,H:1,V:1,C:6,Q:4},segs=[];
 let i=0,cmd=null,x=0,y=0,sx=0,sy=0;const num=()=>{const t=tokens[i++],v=Number(t);if(t===undefined||/[A-Za-z]/.test(t.replace(/e/i,''))||!Number.isFinite(v)||Math.abs(v)>20000)throw Error('Trazo no válido: faltan números o sobran');return v;};
 while(i<tokens.length){
  if(/^[A-Za-z]$/.test(tokens[i]))cmd=tokens[i++];else if(!cmd||/z/i.test(cmd))throw Error('Trazo no válido: número sin orden');
  const U=cmd.toUpperCase(),ox=cmd!==U?x:0,oy=cmd!==U?y:0;
  if(!segs.length&&U!=='M')throw Error('Trazo no válido: debe empezar por M');
  if(U==='Z'){segs.push(['Z']);x=sx;y=sy;continue;}
  if(i+need[U]>tokens.length)throw Error('Trazo no válido: faltan números');
  if(U==='M'){x=num()+ox;y=num()+oy;sx=x;sy=y;segs.push(['M',x,y]);cmd=cmd==='m'?'l':'L';}
  else if(U==='L'){x=num()+ox;y=num()+oy;segs.push(['L',x,y]);}
  else if(U==='H'){x=num()+ox;segs.push(['L',x,y]);}
  else if(U==='V'){y=num()+oy;segs.push(['L',x,y]);}
  else if(U==='C'){const a=[num()+ox,num()+oy,num()+ox,num()+oy,num()+ox,num()+oy];x=a[4];y=a[5];segs.push(['C',...a]);}
  else{const a=[num()+ox,num()+oy,num()+ox,num()+oy];x=a[2];y=a[3];segs.push(['Q',...a]);}
  if(segs.length>2000)throw Error('Trazo demasiado largo (máximo 2000 tramos)');}
 if(!segs.some(s=>s[0]!=='M'))throw Error('Trazo no válido: necesita al menos un tramo después de M');
 let px=0,py=0,mx=0,my=0,length=0,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,start=null,end=null;
 const box=(a,b)=>{minX=Math.min(minX,a);maxX=Math.max(maxX,a);minY=Math.min(minY,b);maxY=Math.max(maxY,b);},ang=(ax,ay,bx,by)=>Math.atan2(by-ay,bx-ax);
 for(const s of segs){const k=s[0];if(k==='M'){px=mx=s[1];py=my=s[2];box(px,py);continue;}
  const pts=k==='L'?[[s[1],s[2]]]:k==='Z'?[[mx,my]]:[];
  if(k==='C'||k==='Q')for(let n=1;n<=24;n++){const t=n/24,u=1-t;pts.push(k==='C'?[u*u*u*px+3*u*u*t*s[1]+3*u*t*t*s[3]+t*t*t*s[5],u*u*u*py+3*u*u*t*s[2]+3*u*t*t*s[4]+t*t*t*s[6]]:[u*u*px+2*u*t*s[1]+t*t*s[3],u*u*py+2*u*t*s[2]+t*t*s[4]]);}
  const c1=k==='C'||k==='Q'?[s[1],s[2]]:pts[0],ex=pts.at(-1)[0],ey=pts.at(-1)[1],c2=k==='C'?[s[3],s[4]]:k==='Q'?[s[1],s[2]]:[px,py];
  if(!start){const [tx,ty]=Math.hypot(c1[0]-px,c1[1]-py)>1e-6?c1:[ex,ey];start={x:px,y:py,angle:ang(px,py,tx,ty)};}
  const [fx,fy]=Math.hypot(ex-c2[0],ey-c2[1])>1e-6?c2:[px,py];end={x:ex,y:ey,angle:ang(fx,fy,ex,ey)};
  let lx=px,ly=py;for(const [a,b] of pts){length+=Math.hypot(a-lx,b-ly);box(a,b);lx=a;ly=b;}px=ex;py=ey;}
 return {segs,minX,minY,maxX,maxY,width:maxX-minX,height:maxY-minY,length,start,end};
}
function create(type='title'){
 const text=(value,top,size=84)=>({type:'textbox',text:value,left:180,top,width:1560,fontSize:size,fontFamily:'Segoe UI',fontWeight:'normal',fill:'#ffffff',textAlign:'center',scaleX:1,scaleY:1,opacity:1,angle:0});
 const objects=type==='credits'?[text('CRÉDITOS\n\nDirección\nNombre Apellido\n\nProducción\nCinema Studio by LQTAC\n\nGracias por acompañarnos',120,64)]:[text(type==='poster'?'PRÓXIMAMENTE':type==='lower-third'?'Nombre Apellido':type==='text'?'Tu texto aquí':'TU TÍTULO',type==='lower-third'?810:400)];
 if(type==='title'||type==='poster')objects.push(text('Una historia que merece ser contada',540,42));
 if(type==='lower-third'){objects.unshift({type:'rect',left:120,top:780,width:1680,height:210,fill:'#0b203d',opacity:0.9});objects.push(text('Cargo · Descripción',915,40));}
 return {version:1,type,name:{text:'Texto',title:'Título','lower-third':'Rótulo',credits:'Créditos',poster:'Cartel'}[type],duration:type==='credits'?20:8,background:type==='poster'?'#081a32':null,objects,motion:{preset:type==='credits'?'credits':'fade',in:1,out:1,easing:'smooth'},keys:[]};
}
function validate(g){
 if(!g||g.version!==1||!types.includes(g.type)||typeof g.name!=='string'||g.name.length>200||!Number.isFinite(g.duration)||g.duration<0.1||g.duration>3600||!Array.isArray(g.objects)||g.objects.length>100||JSON.stringify(g).length>250000)throw Error('Diseño generado no válido');
 const color=v=>v==null||/^#[0-9a-f]{6}$/i.test(v);if(!color(g.background))throw Error('Fondo generado no válido');
 if(g.canvas!==undefined&&g.canvas!==null){const c=g.canvas;if(typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!['width','height'].includes(k))||!Number.isInteger(c.width)||!Number.isInteger(c.height)||c.width<320||c.width>3840||c.height<320||c.height>3840)throw Error('Lienzo no válido: width y height enteros de 320 a 3840');}
 for(const o of g.objects){
  if(o&&o.type==='path')parsePath(o.path);else if(o&&o.path!==undefined)throw Error('Solo los trazos (path) llevan path');
  if(o&&o.count!==undefined){if(o.type!=='textbox')throw Error('Solo los textos (textbox) llevan contador');validateCount(o.count,o.text);}
  if(o&&o.arrow!==undefined&&(!['line','path'].includes(o.type)||!ARROWS.includes(o.arrow)))throw Error('Punta de flecha no válida: none, start, end o both, solo en line o path');
  if(!['textbox','rect','ellipse','line','image','path'].includes(o.type)||o.type==='image'&&(typeof o.asset!=='string'||!ASSET.test(o.asset)||o.asset.split(':')[1].split('/').some(p=>p==='..'))||o.type!=='image'&&o.asset!==undefined||Object.keys(o).some(k=>!['type','text','asset','path','arrow','count','fontFamily','fontWeight','fill','stroke','textAlign','shadow','gradient','glow','anim','fixed','x1','y1','x2','y2',...props].includes(k))||typeof o.text==='string'&&o.text.length>20000||o.type==='textbox'&&typeof o.text!=='string'||['x1','y1','x2','y2'].some(k=>o[k]!==undefined&&(!Number.isFinite(o[k])||Math.abs(o[k])>20000))||!color(o.fill)||!color(o.stroke)||o.fontFamily!==undefined&&!(root.LQTACFontModel||(typeof module==='object'?require('./font-model.js'):null)).valid(o.fontFamily)||o.fontWeight&&!['normal','bold'].includes(o.fontWeight)||o.textAlign&&!['left','center','right','justify-left'].includes(o.textAlign)||o.fixed!==undefined&&typeof o.fixed!=='boolean')throw Error('Objeto generado no válido');if(o.shadow&&(Object.keys(o.shadow).some(k=>!['color','blur','offsetX','offsetY'].includes(k))||!color(o.shadow.color)||!Number.isFinite(o.shadow.blur)||o.shadow.blur<0||o.shadow.blur>100||!Number.isFinite(o.shadow.offsetX)||Math.abs(o.shadow.offsetX)>200||!Number.isFinite(o.shadow.offsetY)||Math.abs(o.shadow.offsetY)>200))throw Error('Sombra generada no válida');
  // Title styling: linear gradient fill, glow and per-object text animation (see title-motion.js).
  if(o.gradient!==undefined&&o.gradient!==null){const gr=o.gradient;if(typeof gr!=='object'||Array.isArray(gr)||Object.keys(gr).some(k=>!['angle','stops'].includes(k))||!Number.isFinite(gr.angle)||gr.angle<0||gr.angle>360||!Array.isArray(gr.stops)||gr.stops.length<2||gr.stops.length>5)throw Error('Degradado no válido');let at=-1;for(const st of gr.stops){if(!st||!Number.isFinite(st.offset)||st.offset<0||st.offset>1||st.offset<at||!/^#[0-9a-f]{6}$/i.test(st.color||''))throw Error('Color del degradado no válido');at=st.offset;}}
  if(o.glow!==undefined&&o.glow!==null){const gl=o.glow;if(typeof gl!=='object'||Array.isArray(gl)||Object.keys(gl).some(k=>!['color','size','strength'].includes(k))||!/^#[0-9a-f]{6}$/i.test(gl.color||'')||!Number.isFinite(gl.size)||gl.size<0||gl.size>200||!Number.isInteger(gl.strength)||gl.strength<1||gl.strength>5)throw Error('Brillo no válido');}
  motion().validate(o.anim);
  for(const p of props)if(o[p]!==undefined&&(!Number.isFinite(o[p])||Math.abs(o[p])>20000))throw Error('Geometría generada no válida');if((o.fontSize??1)<=0||(o.width??1)<=0||(o.scaleX??1)<=0||(o.scaleY??1)<=0)throw Error('Tamaño generado no válido');}
 if(!g.motion||!motions.includes(g.motion.preset)||!motion().easingNames.includes(g.motion.easing)||!Number.isFinite(g.motion.in)||!Number.isFinite(g.motion.out)||g.motion.in<0||g.motion.out<0||g.motion.in>g.duration||g.motion.out>g.duration)throw Error('Animación generada no válida');
 // Perspective crawl: text plane tilted towards a horizon; objects marked fixed stay flat on screen.
 if(g.crawl!==undefined&&g.crawl!==null){const c=g.crawl;if(typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!['tilt','horizon','fade','stars','delay'].includes(k))||!Number.isFinite(c.tilt)||c.tilt<20||c.tilt>80||!Number.isFinite(c.horizon)||c.horizon<0||c.horizon>.6||!Number.isFinite(c.fade)||c.fade<0||c.fade>1||typeof c.stars!=='boolean'||!Number.isFinite(c.delay)||c.delay<0||c.delay>=g.duration)throw Error('Texto en perspectiva no válido');}
 if(!Array.isArray(g.keys)||g.keys.length>1000)throw Error('Puntos generados no válidos');let last=-1;for(const k of g.keys){if(!Number.isFinite(k.time)||k.time<0||k.time>g.duration||k.time<=last||!Number.isFinite(k.x)||Math.abs(k.x)>3840||!Number.isFinite(k.y)||Math.abs(k.y)>2160||!Number.isFinite(k.scale)||k.scale<0.01||k.scale>10||!Number.isFinite(k.opacity)||k.opacity<0||k.opacity>1)throw Error('Punto generado no válido');last=k.time;}return g;
}
const api={create,validate,types,motions,props,ASSET,size,SIZES,ARROWS,parsePath,COUNT_KEYS,formatCount,countText};if(typeof module==='object'&&module.exports)module.exports=api;else root.LQTACGeneratorModel=api;
})(typeof globalThis==='object'?globalThis:this);
