// Ready-made title designs (1920×1080 coordinates). Each build() returns a complete generator (generator-model.js format).
(function(root){
  const T=(text,left,top,width,fontSize,extra={})=>({type:'textbox',text,left,top,width,fontSize,fontFamily:'Segoe UI',fontWeight:'normal',fill:'#ffffff',textAlign:'center',scaleX:1,scaleY:1,opacity:1,angle:0,...extra});
  const R=(left,top,width,height,fill,extra={})=>({type:'rect',left,top,width,height,fill,scaleX:1,scaleY:1,opacity:1,angle:0,...extra});
  const phase=(effect,by,duration,stagger=0,easing='out',delay=0)=>({effect,by,duration,stagger,delay,easing});
  const fadeOut=(duration=.8)=>phase('fade','object',duration,0,'smooth');
  const G=(type,name,duration,objects,motion={preset:'none',in:0,out:0,easing:'smooth'},background=null)=>({version:1,type,name,duration,background,objects,motion,keys:[]});
  const roles=['Dirección','Guion','Producción','Fotografía','Montaje','Música','Sonido','Dirección de arte'];
  const people=['Nombre Apellido','Nombre Apellido','Nombre Apellido','Nombre Apellido','Nombre Apellido','Nombre Apellido','Nombre Apellido','Nombre Apellido'];
  const list=[
    {id:'cinema',name:'Título de cine',category:'Títulos',build:()=>G('title','Título de cine',8,[
      T('TU TÍTULO',160,380,1600,130,{fontFamily:'Georgia',fill:'#f4ead5',anim:{in:phase('blur','letter',1.2,.08,'out'),out:fadeOut(1)}}),
      T('Una historia que merece ser contada',260,580,1400,42,{fontFamily:'Georgia',fill:'#c9b98f',anim:{in:phase('fade','word',.8,.15,'smooth',1.6),out:fadeOut(1)}})])},
    {id:'neon',name:'Neón',category:'Títulos',build:()=>G('title','Neón',8,[
      T('NEÓN',160,400,1600,170,{fontWeight:'bold',fill:'#e8fbff',stroke:'#00e5ff',strokeWidth:3,glow:{color:'#00e5ff',size:30,strength:3},anim:{in:phase('fade','letter',.12,.14,'linear'),out:fadeOut(.6),loop:{effect:'pulse',amount:.4,speed:.8}}}),
      T('luces de la ciudad',360,640,1200,48,{fill:'#ff6ad5',glow:{color:'#ff2bc2',size:18,strength:2},anim:{in:phase('fade','object',1,0,'smooth',1.2),out:fadeOut(.6)}})])},
    {id:'gold',name:'Degradado dorado',category:'Títulos',build:()=>G('title','Degradado dorado',8,[
      T('TÍTULO DORADO',160,390,1600,140,{fontWeight:'bold',fill:'#f2b233',gradient:{angle:90,stops:[{offset:0,color:'#fff4c2'},{offset:.5,color:'#f2b233'},{offset:1,color:'#a86412'}]},glow:{color:'#ffb300',size:14,strength:1},anim:{in:phase('rise','letter',.6,.05,'back'),out:phase('fade','letter',.4,.03,'smooth')}}),
      T('Edición especial',460,600,1000,44,{fill:'#f6e3b0',anim:{in:phase('fade','word',.6,.2,'smooth',1.2),out:fadeOut(.6)}})])},
    {id:'impact',name:'Impacto',category:'Títulos',build:()=>G('title','Impacto',6,[
      T('¡GRAN ESTRENO!',110,400,1700,170,{fontFamily:'Impact',fill:'#ffffff',stroke:'#000000',strokeWidth:6,anim:{in:phase('scale','word',.7,.3,'bounce'),out:phase('scale','word',.3,.1,'in'),loop:{effect:'shake',amount:.25,speed:1}}})])},
    {id:'typewriter',name:'Máquina de escribir',category:'Títulos',build:()=>G('title','Máquina de escribir',8,[
      T('Había una vez, en un lugar muy lejano...',200,440,1520,72,{fontFamily:'Consolas',fill:'#e6e6e6',textAlign:'left',anim:{in:phase('typewriter','letter',.05,.07,'linear',.3),out:fadeOut(.8)}})])},
    {id:'chapter',name:'Capítulo',category:'Títulos',build:()=>G('title','Capítulo',7,[
      R(660,520,600,4,'#f2b233',{anim:{in:phase('wipe','object',.8,0,'smooth'),out:fadeOut(.6)}}),
      T('CAPÍTULO 1',560,430,800,36,{fill:'#9fb6d6',anim:{in:phase('fade','letter',.4,.05,'smooth',.5),out:fadeOut(.6)}}),
      T('El comienzo',260,550,1400,110,{fontFamily:'Georgia',anim:{in:phase('rise','word',.8,.25,'out',.9),out:fadeOut(.6)}})])},
    {id:'quote',name:'Frase palabra a palabra',category:'Títulos',build:()=>G('title','Frase palabra a palabra',8,[
      T('Las grandes historias empiezan con una sola palabra',260,420,1400,76,{fontFamily:'Georgia',anim:{in:phase('fade','word',.5,.3,'smooth',.2),out:phase('blur','object',.8,0,'in')}})])},
    {id:'crawl',name:'Crawl galáctico (texto en perspectiva)',category:'Títulos',build:()=>({...G('title','Crawl galáctico',90,[
      T('Hace mucho tiempo, en una sala de montaje\nmuy, muy lejana....',360,420,1200,56,{fontFamily:'Franklin Gothic Medium',fill:'#4bd5ee',textAlign:'left',fixed:true,anim:{in:phase('fade','object',1.2,0,'smooth',.6),out:{...phase('fade','object',1.2,0,'smooth'),end:6}}}),
      T('EPISODIO I',360,60,1200,72,{fontFamily:'Franklin Gothic Medium',fill:'#ffd54a'}),
      T('UNA NUEVA EDICIÓN',260,160,1400,112,{fontFamily:'Franklin Gothic Medium',fontWeight:'bold',fill:'#ffd54a'}),
      T('Es un periodo de grandes cambios en la galaxia. Un pequeño equipo de montadores, armados solo con un ordenador portátil y mucha paciencia, ha conseguido terminar su primera película.\n\nDurante la batalla, los rebeldes del cine independiente han logrado robar los planos secretos del arma definitiva: el render final, con poder suficiente para exportar un planeta entero en 4K.\n\nPerseguida por los agentes siniestros de la fecha de entrega, la directora corre hacia su casa a bordo de su viejo coche, custodiando los archivos que pueden salvar su proyecto y devolver la libertad a la galaxia....',360,360,1200,64,{fontFamily:'Franklin Gothic Medium',fill:'#ffd54a',textAlign:'justify-left'})],
      {preset:'crawl',in:0,out:0,easing:'linear'},'#000000'),crawl:{tilt:62,horizon:.08,fade:.55,stars:true,delay:7}})},
    {id:'strokes',name:'Trazos que se dibujan',category:'Títulos',build:()=>G('title','Trazos que se dibujan',7,[
      {type:'ellipse',left:690,top:270,rx:270,ry:270,fill:null,stroke:'#69dcf0',strokeWidth:10,scaleX:1,scaleY:1,opacity:1,angle:0,glow:{color:'#00b7ff',size:18,strength:1},anim:{in:phase('draw','object',1.4,0,'smooth'),out:fadeOut(.6)}},
      {type:'line',x1:560,y1:700,x2:1360,y2:700,fill:null,stroke:'#ffcc70',strokeWidth:6,scaleX:1,scaleY:1,opacity:1,angle:0,anim:{in:phase('draw','object',.9,0,'out',1),out:fadeOut(.6)}},
      T('TU MARCA',360,470,1200,120,{fontWeight:'bold',anim:{in:phase('fade','letter',.3,.06,'smooth',.9),out:fadeOut(.6)}}),
      T('subtítulo o lema',460,730,1000,44,{fill:'#ffcc70',anim:{in:phase('rise','word',.5,.15,'out',1.6),out:fadeOut(.6)}})])},
    {id:'lower-classic',name:'Rótulo clásico',category:'Rótulos',build:()=>G('lower-third','Rótulo clásico',7,[
      R(120,800,1000,170,'#0b203d',{opacity:.92,anim:{in:phase('slideLeft','object',.6,0,'out'),out:phase('slideLeft','object',.5,0,'in')}}),
      R(120,800,12,170,'#f2b233',{anim:{in:phase('fade','object',.3,0,'smooth',.3),out:fadeOut(.4)}}),
      T('Nombre Apellido',170,818,920,64,{fontWeight:'bold',textAlign:'left',anim:{in:phase('rise','letter',.4,.025,'out',.4),out:fadeOut(.4)}}),
      T('Cargo · Descripción',172,900,920,36,{fill:'#a9c4e8',textAlign:'left',anim:{in:phase('fade','word',.5,.12,'smooth',.8),out:fadeOut(.4)}})])},
    {id:'lower-modern',name:'Rótulo moderno',category:'Rótulos',build:()=>G('lower-third','Rótulo moderno',7,[
      R(140,915,560,6,'#7fd7ff',{anim:{in:phase('wipe','object',.7,0,'out'),out:phase('wipe','object',.5,0,'in')}}),
      T('Nombre Apellido',140,820,1200,72,{fontWeight:'bold',textAlign:'left',shadow:{color:'#000000',blur:12,offsetX:2,offsetY:2},anim:{in:phase('slideLeft','word',.6,.15,'out',.2),out:fadeOut(.4)}}),
      T('Cargo · Descripción',142,935,1200,36,{fill:'#7fd7ff',textAlign:'left',anim:{in:phase('fade','object',.6,0,'smooth',.7),out:fadeOut(.4)}})])},
    {id:'lower-gradient',name:'Rótulo degradado',category:'Rótulos',build:()=>G('lower-third','Rótulo degradado',7,[
      R(100,810,1100,160,'#1d4ed8',{opacity:.95,gradient:{angle:0,stops:[{offset:0,color:'#1d4ed8'},{offset:1,color:'#7c3aed'}]},anim:{in:phase('wipe','object',.7,0,'out'),out:phase('fade','object',.5,0,'smooth')}}),
      T('Nombre Apellido',140,826,1020,62,{fontWeight:'bold',textAlign:'left',anim:{in:phase('drop','letter',.4,.03,'back',.4),out:fadeOut(.4)}}),
      T('Cargo · Descripción',142,904,1020,34,{fill:'#e0e7ff',textAlign:'left',anim:{in:phase('fade','object',.5,0,'smooth',.9),out:fadeOut(.4)}})])},
    {id:'credits-columns',name:'Créditos a dos columnas',category:'Créditos',build:()=>G('credits','Créditos a dos columnas',24,[
      T('REPARTO TÉCNICO',260,140,1400,72,{fontWeight:'bold'}),
      T(roles.join('\n\n'),120,300,800,48,{fill:'#9fb6d6',textAlign:'right'}),
      T(people.join('\n\n'),1000,300,800,48,{textAlign:'left'}),
      T('Gracias por acompañarnos',260,300+roles.length*2*48*1.16+120,1400,56,{fontFamily:'Georgia'})],{preset:'credits',in:1,out:1,easing:'linear'})},
    {id:'credits-centered',name:'Créditos centrados',category:'Créditos',build:()=>G('credits','Créditos centrados',20,[
      T(roles.map((r,i)=>r.toUpperCase()+'\n'+people[i]).join('\n\n'),260,160,1400,52,{}),
      T('FIN',660,160+roles.length*3*52*1.16+160,600,110,{fontFamily:'Georgia',fill:'#f4ead5'})],{preset:'credits',in:1,out:1,easing:'linear'})}
  ];
  function build(id){const t=list.find(x=>x.id===id);if(!t)throw Error('Plantilla no encontrada');return t.build();}
  const api={list:list.map(({id,name,category})=>({id,name,category})),build};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.LQTACTitleTemplates=api;
})(typeof globalThis==='object'?globalThis:this);
