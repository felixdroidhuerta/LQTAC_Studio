// Title text animation: easing curves and per-unit (letter / word / line / whole object) entrance, exit and loop effects.
// Pure math shared by the title renderer (page) and the Node tests. Times are seconds of the generator's own timeline.
(function(root){
  const clamp=v=>Math.max(0,Math.min(1,v));
  const easings={
    linear:t=>t,
    smooth:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,
    out:t=>1-Math.pow(1-t,3),
    in:t=>t*t*t,
    back:t=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);},
    bounce:t=>{const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d)return n*(t-=1.5/d)*t+.75;if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;return n*(t-=2.625/d)*t+.984375;},
    elastic:t=>t===0||t===1?t:Math.pow(2,-10*t)*Math.sin((t*10-.75)*(2*Math.PI)/3)+1
  };
  const easingNames=Object.keys(easings);
  const easingLabels={linear:'Lineal',smooth:'Suave',out:'Frenada (sale rápido)',in:'Acelerada (entra lenta)',back:'Con rebase',bounce:'Rebote',elastic:'Elástica'};
  const effects=['none','fade','rise','drop','slideLeft','slideRight','scale','blur','spin','wipe','typewriter','draw'];
  const effectLabels={none:'Ninguna',fade:'Fundido',rise:'Subir',drop:'Caer',slideLeft:'Desde la izquierda',slideRight:'Desde la derecha',scale:'Escalar (pop)',blur:'Desenfoque',spin:'Girar',wipe:'Barrido (revelar)',typewriter:'Máquina de escribir',draw:'Dibujar el trazo (formas)'};
  const units=['letter','word','line','object'],unitLabels={letter:'Letra a letra',word:'Palabra a palabra',line:'Línea a línea',object:'Objeto completo'};
  const loops=['none','wave','pulse','shake'],loopLabels={none:'Ninguno',wave:'Ola',pulse:'Latido',shake:'Temblor'};
  const ease=(name,t)=>(easings[name]||easings.smooth)(clamp(t));
  // Appearance for an effect at progress e (0 = hidden, 1 = in place). size = font size (or object height) in px.
  function look(effect,e,size){
    const s={alpha:1,dx:0,dy:0,scale:1,rotate:0,blur:0,reveal:1,draw:1};const k=1-e;
    switch(effect){
      case 'fade':s.alpha=e;break;
      case 'rise':s.alpha=clamp(e*1.5);s.dy=k*size*.8;break;
      case 'drop':s.alpha=clamp(e*1.5);s.dy=-k*size*.8;break;
      case 'slideLeft':s.alpha=clamp(e*1.5);s.dx=-k*size*2;break;
      case 'slideRight':s.alpha=clamp(e*1.5);s.dx=k*size*2;break;
      case 'scale':s.alpha=clamp(e*3);s.scale=Math.max(0,e);break;
      case 'blur':s.alpha=e;s.blur=k*size*.35;break;
      case 'spin':s.alpha=clamp(e*1.5);s.rotate=-k*Math.PI/2;s.scale=.5+.5*e;break;
      case 'wipe':s.reveal=clamp(e);break;
      case 'typewriter':s.alpha=e>0?1:0;break;
      case 'draw':s.draw=clamp(e);break;
    }
    return s;
  }
  function combine(a,b){return {alpha:a.alpha*b.alpha,dx:a.dx+b.dx,dy:a.dy+b.dy,scale:a.scale*b.scale,rotate:a.rotate+b.rotate,blur:a.blur+b.blur,reveal:Math.min(a.reveal,b.reveal),draw:Math.min(a.draw??1,b.draw??1)};}
  // Time the whole entrance takes (last unit finished).
  const span=(phase,count)=>phase?(phase.delay||0)+phase.duration+Math.max(0,count-1)*phase.stagger:0;
  // State of unit `index` of `count` at time t. anim = {in,out,loop}; each phase {effect,by,duration,stagger,delay,easing}.
  // The exit finishes at out.end (seconds) when given, otherwise at the end of the title.
  function unitState(anim,index,count,t,total,size){
    let s={alpha:1,dx:0,dy:0,scale:1,rotate:0,blur:0,reveal:1,draw:1};if(!anim)return s;
    const p=anim.in;if(p&&p.effect!=='none'){const raw=(t-(p.delay||0)-index*p.stagger)/p.duration;const e=p.effect==='typewriter'?(raw>=0?1:0):ease(p.easing,raw);s=combine(s,look(p.effect,raw<0&&p.effect!=='typewriter'?0:e,size));}
    const o=anim.out;if(o&&o.effect!=='none'){const start=(o.end??total)-span(o,count);const raw=(t-start-index*o.stagger)/o.duration;if(raw>0){const e=o.effect==='typewriter'?(raw>=1?0:1):1-ease(o.easing,raw);s=combine(s,look(o.effect,e,size));}}
    const l=anim.loop;if(l&&l.effect!=='none'){const w=2*Math.PI*l.speed*t-index*.6,a=l.amount;
      if(l.effect==='wave')s.dy+=Math.sin(w)*size*.25*a;
      else if(l.effect==='pulse')s.scale*=1+.15*a*(.5+.5*Math.sin(2*Math.PI*l.speed*t));
      else if(l.effect==='shake'){const r=x=>Math.sin(x*12.9898+index*78.233)*.5;s.dx+=r(Math.floor(t*l.speed*12))*size*.1*a;s.dy+=r(Math.floor(t*l.speed*12)+.5)*size*.1*a;}}
    return s;
  }
  // Animation unit of every grapheme: lines = array of arrays of graphemes. Spaces belong to no unit (-1) except in 'object' mode.
  function unitMap(lines,by){
    let unit=-1,map=[];const object=by==='object';
    for(let li=0;li<lines.length;li++){const row=[];let inWord=false;if(by==='line')unit++;
      for(const ch of lines[li]){const space=/\s/.test(ch);
        if(object){row.push(0);continue;}
        if(by==='letter'){row.push(space?-1:++unit);continue;}
        if(by==='word'){if(space){inWord=false;row.push(-1);}else{if(!inWord){unit++;inWord=true;}row.push(unit);}continue;}
        row.push(space?-1:unit);}
      map.push(row);}
    return {map,count:object?1:unit+1};
  }
  function validatePhase(p,name){
    if(p===null||p===undefined)return;
    if(typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['effect','by','duration','stagger','delay','easing','end'].includes(k)))throw Error('Animación de texto no válida: '+name);
    if(!effects.includes(p.effect)||!units.includes(p.by)||!easingNames.includes(p.easing))throw Error('Efecto de texto no válido: '+name);
    if(!Number.isFinite(p.duration)||p.duration<.02||p.duration>60||!Number.isFinite(p.stagger)||p.stagger<0||p.stagger>10||p.delay!==undefined&&(!Number.isFinite(p.delay)||p.delay<0||p.delay>3600)||p.end!==undefined&&(!Number.isFinite(p.end)||p.end<0||p.end>3600))throw Error('Tiempos de animación de texto no válidos: '+name);
  }
  function validate(anim){
    if(anim===null||anim===undefined)return;
    if(typeof anim!=='object'||Array.isArray(anim)||Object.keys(anim).some(k=>!['in','out','loop'].includes(k)))throw Error('Animación de texto no válida');
    validatePhase(anim.in,'entrada');validatePhase(anim.out,'salida');
    const l=anim.loop;if(l!==null&&l!==undefined&&(typeof l!=='object'||Object.keys(l).some(k=>!['effect','amount','speed'].includes(k))||!loops.includes(l.effect)||!Number.isFinite(l.amount)||l.amount<0||l.amount>1||!Number.isFinite(l.speed)||l.speed<.05||l.speed>10))throw Error('Bucle de texto no válido');
  }
  const api={easings,easingNames,easingLabels,ease,effects,effectLabels,units,unitLabels,loops,loopLabels,look,combine,unitState,unitMap,span,validate};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.LQTACTitleMotion=api;
})(typeof globalThis==='object'?globalThis:this);
