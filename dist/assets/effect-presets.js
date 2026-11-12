// Effect presets: factory presets + user presets (saved by the desktop process) for each FX editor.
// A preset only touches the parameters of its own effect. Animation is stored relative to the clip
// duration (t = 0…1), so it adapts to any clip length when applied.
(function(){
  const F=(name,values,animation)=>({name,values,animation:animation||null,factory:true});
  const factory={
    video:{
      brightness:[F('Más contraste',{brightness:0,contrast:1.25}),F('Suave y luminoso',{brightness:.06,contrast:.88}),F('Oscuro dramático',{brightness:-.08,contrast:1.3})],
      saturation:[F('Blanco y negro',{saturation:0}),F('Colores vivos',{saturation:1.45}),F('Desaturado de cine',{saturation:.7}),F('Color → blanco y negro (animado)',{saturation:1},{saturation:[{t:0,value:1},{t:1,value:0}]})],
      temperature:[F('Cálido atardecer',{temperature:.45}),F('Frío azulado',{temperature:-.45})],
      blur:[F('Desenfoque suave',{blur:2}),F('Desenfoque fuerte',{blur:8}),F('Enfocar al empezar (animado)',{blur:0},{blur:[{t:0,value:10},{t:.3,value:0},{t:1,value:0}]})],
      sharpen:[F('Enfoque ligero',{sharpen:.3}),F('Enfoque intenso',{sharpen:.8})],
      vignette:[F('Viñeta sutil',{vignette:.3}),F('Viñeta marcada',{vignette:.7})],
      chroma:[F('Fondo verde',{chroma:true,chromaColor:'#00ff00',chromaTolerance:.15,chromaSoftness:.08,chromaZone:'all'}),F('Fondo azul',{chroma:true,chromaColor:'#0047ff',chromaTolerance:.15,chromaSoftness:.08,chromaZone:'all'}),F('Fondo verde · proteger personas (IA rápida)',{chroma:true,chromaColor:'#00ff00',chromaTolerance:.2,chromaSoftness:.08,chromaZone:'people',chromaMatteModel:'fast',chromaProtect:.5,chromaMatteSoftness:.15})],
      crt:[F('TV suave',{crt:.4,crtCurve:.3,crtLines:.4}),F('TV antigua fuerte',{crt:.9,crtCurve:.6,crtLines:.8})],
      vhs:[F('VHS ligero',{vhs:.35,vhsNoise:.2}),F('VHS gastado',{vhs:.85,vhsNoise:.6})],
      glitch:[F('Glitch sutil',{glitch:.25,glitchSpeed:6}),F('Glitch fuerte',{glitch:.8,glitchSpeed:14})],
      glow:[F('Resplandor suave',{glow:.5,glowRadius:10,glowThreshold:.6}),F('Sueño',{glow:1.2,glowRadius:30,glowThreshold:.45})],
      bloom:[F('Bloom suave',{bloom:.4,bloomRadius:20,bloomThreshold:.7}),F('Bloom intenso',{bloom:1.2,bloomRadius:50,bloomThreshold:.55})],
      film:[F('Película antigua',{film:.6,filmGrain:.35,filmScratches:.3}),F('Cine mudo',{film:1,filmGrain:.6,filmScratches:.6})],
      particles:[F('Nieve suave',{"particles":0.85,"particleType":0,"particleDensity":0.5,"particleSize":1,"particleSpeed":0.8,"particleWind":0.1}),F('Tormenta de nieve',{"particles":1,"particleType":0,"particleDensity":1,"particleSize":1.3,"particleSpeed":2,"particleWind":0.8}),F('Lluvia',{"particles":0.85,"particleType":1,"particleDensity":0.8,"particleSize":1,"particleSpeed":1,"particleWind":0.2}),F('Chispas de hoguera',{"particles":1,"particleType":2,"particleDensity":0.5,"particleSize":1,"particleSpeed":1,"particleWind":0.1}),F('Polvo en el aire',{"particles":0.7,"particleType":3,"particleDensity":0.6,"particleSize":0.8,"particleSpeed":0.6,"particleWind":0}),F('Confeti de fiesta',{"particles":1,"particleType":4,"particleDensity":0.8,"particleSize":1.2,"particleSpeed":1,"particleWind":0}),F('Burbujas',{"particles":0.85,"particleType":5,"particleDensity":0.4,"particleSize":1.2,"particleSpeed":0.7,"particleWind":0}),F('Bokeh nocturno',{"particles":0.8,"particleType":6,"particleDensity":0.4,"particleSize":1.5,"particleSpeed":0.4,"particleWind":0})],
      flare:[F('Destello cálido',{flare:1,flareX:.25,flareY:.25,flareSize:1,flareHue:0}),F('Destello frío anamórfico',{flare:1.2,flareX:.7,flareY:.3,flareSize:1.3,flareHue:1}),F('Destello que cruza (animado)',{flare:1,flareX:.1,flareY:.3,flareSize:1,flareHue:.2},{flareX:[{t:0,value:.05},{t:1,value:.95}]})],
      rays:[F('Rayos de sol',{rays:1.2,raysThreshold:.55,raysLength:.6,raysX:.5,raysY:.1}),F('Luz de ventana lateral',{rays:1,raysThreshold:.6,raysLength:.8,raysX:.05,raysY:.2})],
      leak:[F('Fugas de luz cálidas',{leak:.6,leakSpeed:.5,leakHue:.1}),F('Fugas de luz mágicas',{leak:.7,leakSpeed:1,leakHue:.9})],
      flicker:[F('Luz de vela',{flicker:.4,flickerSpeed:6}),F('Fluorescente averiado',{flicker:.9,flickerSpeed:20})],
      ripple:[F('Gota en el agua',{ripple:.6,rippleFreq:14,rippleSpeed:2,rippleX:.5,rippleY:.5}),F('Onda expansiva (animada)',{ripple:1,rippleFreq:8,rippleSpeed:3},{ripple:[{t:0,value:1},{t:1,value:0}]})],
      swirl:[F('Remolino suave',{swirl:.5,swirlRadius:.5}),F('Remolino de entrada (animado)',{swirl:2,swirlRadius:.7},{swirl:[{t:0,value:2},{t:.5,value:0},{t:1,value:0}]})],
      fisheye:[F('Lente gran angular',{fisheye:.6}),F('Encoger el centro',{fisheye:-.5})],
      heat:[F('Calor del desierto',{heat:.4,heatSpeed:1,heatScale:10}),F('Espejismo intenso',{heat:.9,heatSpeed:2,heatScale:16})],
      mirror:[F('Espejo horizontal',{mirror:1,mirrorMode:0}),F('Cuatro cuadrantes',{mirror:1,mirrorMode:2}),F('Caleidoscopio girando (animado)',{mirror:1,mirrorMode:3,mirrorSegments:8,mirrorRotate:0},{mirrorRotate:[{t:0,value:0},{t:1,value:1}]})],
      echo:[F('Estela fantasma',{echo:.85,echoMode:0}),F('Desenfoque de movimiento',{echo:.6,echoMode:1})]
    },
    audio:{
      bass:[F('Voz clara',{bass:-3,mid:2,treble:3}),F('Más graves',{bass:6,mid:0,treble:0}),F('Teléfono / radio',{bass:-18,mid:6,treble:-12}),F('Más brillo',{bass:0,mid:0,treble:5})],
      compressor:[F('Voz de podcast',{compressor:true,thresholdDb:-20,ratio:3}),F('Música suave',{compressor:true,thresholdDb:-14,ratio:2}),F('Compresión fuerte',{compressor:true,thresholdDb:-30,ratio:8})],
      limiter:[F('Seguridad −1 dB',{limiter:true,limiterCeiling:.89}),F('Seguridad −3 dB',{limiter:true,limiterCeiling:.708})],
      denoise:[F('Ruido ligero',{denoise:true,denoiseDb:8}),F('Ruido intenso',{denoise:true,denoiseDb:20})],
      normalize:[F('Podcast y redes (−16 LUFS)',{normalize:true,targetLufs:-16}),F('Música en streaming (−14 LUFS)',{normalize:true,targetLufs:-14}),F('Televisión (−23 LUFS)',{normalize:true,targetLufs:-23})],
      echo:[F('Eco corto',{echo:true,echoMs:120,echoMix:.2}),F('Eco largo',{echo:true,echoMs:450,echoMix:.35})],
      reverb:[F('Sala pequeña',{reverb:true,reverbMix:.15}),F('Sala grande',{reverb:true,reverbMix:.4})],
      convReverb:[F('Habitación',{convReverb:true,convSize:.5,convMix:.25}),F('Sala de conciertos',{convReverb:true,convSize:2.2,convMix:.35}),F('Catedral',{convReverb:true,convSize:4.5,convMix:.45}),F('Entrada de sala (animado)',{convReverb:true,convSize:2,convMix:0},{convMix:[{t:0,value:0},{t:1,value:.5}]})],
      highpass:[F('Quitar retumbe (80 Hz)',{highpass:true,highpassHz:80}),F('Voz fina (200 Hz)',{highpass:true,highpassHz:200}),F('Barrido de graves (animado)',{highpass:true,highpassHz:20},{highpassHz:[{t:0,value:20},{t:1,value:800}]})],
      lowpass:[F('Suavizar agudos',{lowpass:true,lowpassHz:9000}),F('Tras la pared',{lowpass:true,lowpassHz:700}),F('Barrido de agudos (animado)',{lowpass:true,lowpassHz:20000},{lowpassHz:[{t:0,value:20000},{t:1,value:600}]})],
      gate:[F('Puerta suave',{gate:true,gateDb:-50}),F('Puerta estricta',{gate:true,gateDb:-35})],
      deesser:[F('De-esser suave',{deesser:true,deesserAmount:.4}),F('De-esser fuerte',{deesser:true,deesserAmount:.9}),F('De-esser progresivo (animado)',{deesser:true,deesserAmount:0},{deesserAmount:[{t:0,value:0},{t:1,value:.9}]})],
      pitch:[F('Voz más grave',{pitch:true,pitchSemitones:-4,pitchFormant:true}),F('Voz más aguda',{pitch:true,pitchSemitones:4,pitchFormant:true}),F('Ardilla',{pitch:true,pitchSemitones:12,pitchFormant:false}),F('Monstruo',{pitch:true,pitchSemitones:-12,pitchFormant:false}),F('Una octava arriba',{pitch:true,pitchSemitones:12,pitchFormant:true})],
      chorus:[F('Chorus suave',{chorus:true,chorusDepth:.3,chorusMix:.4}),F('Chorus intenso',{chorus:true,chorusDepth:.9,chorusMix:.8}),F('Entrada del chorus (animado)',{chorus:true,chorusDepth:.6,chorusMix:0},{chorusMix:[{t:0,value:0},{t:1,value:.8}]})],
      tremolo:[F('Trémolo lento',{tremolo:true,tremoloHz:3,tremoloDepth:.5}),F('Trémolo rápido',{tremolo:true,tremoloHz:9,tremoloDepth:.8}),F('Helicóptero',{tremolo:true,tremoloHz:14,tremoloDepth:1}),F('Acelerando (animado)',{tremolo:true,tremoloHz:2,tremoloDepth:.7},{tremoloHz:[{t:0,value:2},{t:1,value:14}]})],
      lofi:[F('Lo-fi suave',{lofi:true,lofiAmount:.3}),F('Radio vieja',{lofi:true,lofiAmount:.7}),F('Consola de 8 bits',{lofi:true,lofiAmount:1})],
      widen:[F('Más ancho',{widen:true,widenAmount:1.8}),F('Muy ancho',{widen:true,widenAmount:2.5}),F('Mono',{widen:true,widenAmount:0})],
      autotune:[F('Corrección natural',{autotune:true,autotuneKey:0,autotuneScale:'chromatic',autotuneSpeed:.45,autotuneAmount:.8}),F('Corrección firme',{autotune:true,autotuneKey:0,autotuneScale:'chromatic',autotuneSpeed:.2,autotuneAmount:1}),F('Efecto robótico',{autotune:true,autotuneKey:0,autotuneScale:'chromatic',autotuneSpeed:0,autotuneAmount:1}),F('Robótico en Do mayor / La menor',{autotune:true,autotuneKey:0,autotuneScale:'major',autotuneSpeed:0,autotuneAmount:1}),F('Pop en Sol mayor',{autotune:true,autotuneKey:7,autotuneScale:'major',autotuneSpeed:.15,autotuneAmount:1}),F('Pista guía · seguir notas (elige la pista guía)',{autotune:true,autotuneGuideMode:'notes',autotuneGuideFallback:'scale',autotuneRange:7,autotuneSpeed:.25,autotuneAmount:1}),F('Pista guía · copiar entonación (elige la pista guía)',{autotune:true,autotuneGuideMode:'contour',autotuneGuideFallback:'none',autotuneRange:7,autotuneSpeed:.05,autotuneAmount:1}),F('Entrada del efecto robótico (animado)',{autotune:true,autotuneKey:0,autotuneScale:'chromatic',autotuneSpeed:0,autotuneAmount:0},{autotuneAmount:[{t:0,value:0},{t:.5,value:0},{t:.6,value:1},{t:1,value:1}]})],
      pan:[F('A la izquierda',{pan:true,panPosition:-.7}),F('A la derecha',{pan:true,panPosition:.7}),F('Centrado',{pan:true,panPosition:0}),F('De izquierda a derecha (animado)',{pan:true,panPosition:-1},{panPosition:[{t:0,value:-1},{t:1,value:1}]}),F('Vaivén (animado)',{pan:true,panPosition:-.8},{panPosition:[{t:0,value:-.8},{t:.25,value:.8},{t:.5,value:-.8},{t:.75,value:.8},{t:1,value:-.8}]})]
    }
  };
  // Keys a preset of each editor may set. Clip-specific data (IA pro analysis) is never part of a preset.
  function ownedKeys(kind,key,parameters){
    if(kind==='video'){if(key==='chroma')return [...parameters,'chroma','chromaColor','chromaZone','chromaMatteModel'];if(key==='lut')return ['lut'];return [...parameters];}
    return key==='bass'?[...parameters]:key==='pitch'?[...parameters,key,'pitchFormant']:key==='autotune'?[...parameters,key,'autotuneKey','autotuneScale','autotuneRange','autotuneGuideMode','autotuneGuideFallback']:[...parameters,key];
  }
  let userPresets=null;
  async function loadUser(){if(!userPresets)userPresets=await window.lqtacDesktop.presetsLoad().catch(()=>[]);return userPresets;}
  async function saveUser(list){await window.lqtacDesktop.presetsSave(list);userPresets=list;}
  function sanitize(preset,kind,key,parameters){
    const owned=new Set(ownedKeys(kind,key,parameters)),values={},animation={};
    for(const [k,v] of Object.entries(preset.values||{}))if(owned.has(k))values[k]=v;
    for(const [k,points] of Object.entries(preset.animation||{})){if(!parameters.includes(k)||!Array.isArray(points)||!points.length||points.length>1000)continue;const clean=points.filter(p=>Number.isFinite(p.t)&&p.t>=0&&p.t<=1&&Number.isFinite(p.value)).sort((a,b)=>a.t-b.t);if(clean.length)animation[k]=clean;}
    return {values,animation};
  }
  // Applies a preset to a draft. Throws (leaving the draft untouched) if the result is not a valid effect.
  function applyTo(draft,preset,{kind,key,parameters,duration}){
    const {values,animation}=sanitize(preset,kind,key,parameters),next=structuredClone(draft);next.animation={...next.animation};
    Object.assign(next,structuredClone(values));
    for(const p of parameters){delete next.animation[p];const curve=animation[p];if(curve){const pts=[];for(const q of curve){const time=Math.round(q.t*duration*1000)/1000;if(pts.length&&time<=pts.at(-1).time)continue;pts.push({time,value:q.value});}if(pts.length)next.animation[p]=pts;}}
    LQTACEffects.validate(next,kind);
    for(const k of Object.keys(draft))delete draft[k];Object.assign(draft,next);return draft;
  }
  function capture(draft,{kind,key,parameters,duration},includeAnimation){
    const values={};for(const k of ownedKeys(kind,key,parameters))if(k in draft)values[k]=structuredClone(draft[k]);
    const animation={};if(includeAnimation&&duration>0)for(const p of parameters){const curve=draft.animation?.[p];if(curve?.length)animation[p]=curve.map(q=>({t:Math.min(1,Math.max(0,q.time/duration)),value:q.value}));}
    return {values,animation:Object.keys(animation).length?animation:null};
  }
  const style=document.createElement('style');style.textContent=`
  .fx-presets{border:1px solid var(--line,#24456b);border-radius:8px;padding:8px 10px;margin:0 0 12px;display:grid;gap:6px}
  .fx-presets .fxp-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
  .fx-presets label.fxp-pick{display:grid!important;grid-template-columns:auto minmax(0,1fr);gap:8px;align-items:center;margin:0}
  .fx-presets select{width:100%;min-width:0}
  .fx-presets button{font-size:12px;padding:4px 9px}
  .fx-presets .fxp-form{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
  .fx-presets .fxp-form input[type=text]{flex:1;min-width:140px}
  .fx-presets .fxp-form label{display:inline-flex!important;gap:4px;align-items:center;margin:0;font-size:12px}
  .fx-presets .fxp-form input[type=checkbox]{width:auto!important}
  .fx-presets .fxp-status{font-size:11px;color:var(--muted,#8aa4c4);margin:0;min-height:1em}`;
  document.head.append(style);
  // options: {kind,key,parameters,duration,draft,onApply()}
  function mount(container,options){
    const {kind,key}=options,box=document.createElement('div');box.className='fx-presets';
    box.innerHTML=`<label class="fxp-pick">Preset<select class="fxp-select" aria-label="Preset del efecto"></select></label>
      <div class="fxp-row"><button type="button" class="fxp-save">Guardar como preset…</button><button type="button" class="fxp-delete" disabled>Eliminar</button><button type="button" class="fxp-export">Exportar mis presets…</button><button type="button" class="fxp-import">Importar…</button></div>
      <div class="fxp-form" hidden><input type="text" class="fxp-name" maxlength="80" placeholder="Nombre del preset"><label><input type="checkbox" class="fxp-anim" checked> Incluir animación</label><button type="button" class="fxp-ok">Guardar</button><button type="button" class="fxp-cancel">Cancelar</button></div>
      <p class="fxp-status" role="status"></p>`;
    container.prepend(box);
    const q=s=>box.querySelector(s),select=q('.fxp-select'),statusLine=q('.fxp-status'),form=q('.fxp-form'),name=q('.fxp-name');
    const own=()=>userPresets.filter(p=>p.kind===kind&&p.key===key);
    function render(selected=''){
      const groups=[['De fábrica',(factory[kind][key]||[]).map((p,i)=>['f:'+i,p.name])],['Mis presets',own().map(p=>['u:'+p.id,p.name+(p.animation?' · animado':'')])]];
      select.innerHTML='<option value="">— Elegir preset —</option>'+groups.filter(([,items])=>items.length).map(([label,items])=>`<optgroup label="${label}">${items.map(([v,n])=>`<option value="${v}"></option>`).join('')}</optgroup>`).join('');
      const options=[...select.querySelectorAll('option[value]:not([value=""])')],labels=groups.flatMap(([,items])=>items);options.forEach((o,i)=>o.textContent=labels[i][1]);
      select.value=selected;q('.fxp-delete').disabled=!select.value.startsWith('u:');q('.fxp-export').disabled=!userPresets.some(p=>p.kind===kind);
    }
    function find(value){if(value.startsWith('f:'))return factory[kind][key][Number(value.slice(2))];if(value.startsWith('u:'))return userPresets.find(p=>p.id===value.slice(2));return null;}
    select.onchange=()=>{const preset=find(select.value);q('.fxp-delete').disabled=!select.value.startsWith('u:');if(!preset)return;
      try{applyTo(options.draft,preset,options);options.onApply?.();statusLine.textContent=`Aplicado «${preset.name}». Pulsa Aplicar al clip para confirmarlo o Cancelar para descartarlo.`;}catch(error){statusLine.textContent='No se pudo aplicar: '+error.message;}};
    q('.fxp-save').onclick=()=>{form.hidden=false;name.value='';q('.fxp-anim').checked=Object.keys(options.draft.animation||{}).some(p=>options.parameters.includes(p));name.focus();};
    q('.fxp-cancel').onclick=()=>{form.hidden=true;};
    name.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();q('.fxp-ok').click();}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();form.hidden=true;}};
    q('.fxp-ok').onclick=async()=>{
      const title=name.value.trim();if(!title){statusLine.textContent='Escribe un nombre para el preset.';return;}
      const data=capture(options.draft,options,q('.fxp-anim').checked),list=[...userPresets],existing=list.find(p=>p.kind===kind&&p.key===key&&p.name.toLowerCase()===title.toLowerCase());
      if(existing&&!confirm(`Ya existe «${existing.name}». ¿Sustituirlo?`))return;
      const preset={id:existing?.id||crypto.randomUUID(),name:title,kind,key,values:data.values,animation:data.animation,created:existing?.created||new Date().toISOString(),version:1};
      try{await saveUser(existing?list.map(p=>p===existing?preset:p):[...list,preset]);form.hidden=true;render('u:'+preset.id);statusLine.textContent=`Preset «${title}» guardado.`;}catch(error){statusLine.textContent=error.message;}
    };
    q('.fxp-delete').onclick=async()=>{const preset=find(select.value);if(!preset||preset.factory)return;if(!confirm(`¿Eliminar el preset «${preset.name}»?`))return;try{await saveUser(userPresets.filter(p=>p!==preset));render();statusLine.textContent='Preset eliminado.';}catch(error){statusLine.textContent=error.message;}};
    q('.fxp-export').onclick=async()=>{try{const list=userPresets.filter(p=>p.kind===kind);const r=await window.lqtacDesktop.presetsExport(list,`Presets ${kind==='video'?'de vídeo':'de audio'}`);if(!r.canceled)statusLine.textContent=`${list.length} presets exportados a ${r.filePath}`;}catch(error){statusLine.textContent=error.message;}};
    q('.fxp-import').onclick=async()=>{try{const r=await window.lqtacDesktop.presetsImport();if(r.canceled)return;const list=[...userPresets];let added=0;
      for(const p of r.presets){let title=p.name.trim().slice(0,80),n=2;while(list.some(x=>x.kind===p.kind&&x.key===p.key&&x.name.toLowerCase()===title.toLowerCase()))title=`${p.name.trim().slice(0,74)} (${n++})`;list.push({...p,id:crypto.randomUUID(),name:title});added++;}
      await saveUser(list);render();statusLine.textContent=`${added} presets importados.`;}catch(error){statusLine.textContent='No se pudieron importar: '+error.message;}};
    userPresets=userPresets||[];render();void loadUser().then(()=>{if(box.isConnected)render(select.value);});
    return {element:box,render};
  }
  window.LQTACPresets={factory,mount,applyTo,capture,ownedKeys,loadUser,reset(){userPresets=null;}};
})();
