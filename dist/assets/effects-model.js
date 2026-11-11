(function(root){
  const videoDefaults={enabled:false,brightness:0,contrast:1,saturation:1,temperature:0,blur:0,sharpen:0,vignette:0,chroma:false,chromaColor:'#00ff00',chromaTolerance:.15,chromaSoftness:.08,chromaZone:'all',chromaMatteModel:'fast',chromaProtect:.5,chromaMatteSoftness:.15,chromaProMatte:null,lut:null,animation:{}};
  const audioDefaults={enabled:false,bass:0,mid:0,treble:0,compressor:false,thresholdDb:-18,ratio:4,limiter:false,limiterCeiling:.95,denoise:false,denoiseDb:12,normalize:false,targetLufs:-16,echo:false,echoMs:250,echoMix:.25,reverb:false,reverbMix:.2,highpass:false,highpassHz:80,lowpass:false,lowpassHz:12000,gate:false,gateDb:-45,deesser:false,deesserAmount:.5,pitch:false,pitchSemitones:0,pitchFormant:true,chorus:false,chorusDepth:.5,chorusMix:.5,tremolo:false,tremoloHz:5,tremoloDepth:.5,lofi:false,lofiAmount:.5,widen:false,widenAmount:1.5,convReverb:false,convSize:1.5,convMix:.3,pan:false,panPosition:0,autotune:false,autotuneKey:0,autotuneScale:'chromatic',autotuneSpeed:.1,autotuneAmount:1,autotuneRange:2.5,autotuneGuideTrack:'',autotuneGuideMode:'notes',autotuneGuideFallback:'scale',autotuneGuideOffset:0,animation:{}};
  // Parameters whose FFmpeg filter cannot change while running: fixed per clip, never animated.
  const audioStatic=['convSize','autotuneKey','autotuneRange','autotuneGuideOffset'];
  const autotuneScales=['chromatic','major','minor','harmonicMinor','pentatonicMajor','pentatonicMinor','blues'];
  const ranges={video:{brightness:[-1,1],contrast:[0,2],saturation:[0,2],temperature:[-1,1],blur:[0,20],sharpen:[0,2],vignette:[0,1],chromaTolerance:[0,1],chromaSoftness:[.001,1],chromaProtect:[.05,.95],chromaMatteSoftness:[.01,.5]},audio:{bass:[-18,18],mid:[-18,18],treble:[-18,18],thresholdDb:[-60,0],ratio:[1,20],limiterCeiling:[.0625,1],denoiseDb:[0,30],targetLufs:[-30,-10],echoMs:[20,1000],echoMix:[0,.7],reverbMix:[0,.7],highpassHz:[20,1000],lowpassHz:[500,20000],gateDb:[-80,-10],deesserAmount:[0,1],pitchSemitones:[-12,12],chorusDepth:[0,1],chorusMix:[0,1],tremoloHz:[.5,20],tremoloDepth:[0,1],lofiAmount:[0,1],widenAmount:[0,4],convSize:[.3,5],convMix:[0,1],panPosition:[-1,1],autotuneKey:[0,11],autotuneSpeed:[0,1],autotuneAmount:[0,1],autotuneRange:[.5,12],autotuneGuideOffset:[-1,1]}};
  const creative=[["crt","TV antigua / CRT",[["crt","Intensidad",0,1,0],["crtCurve","Curvatura",0,1,0.35],["crtLines","Líneas de barrido",0,1,0.5]]],["vhs","VHS",[["vhs","Intensidad",0,1,0],["vhsNoise","Ruido de cinta",0,1,0.3]]],["glitch","Glitch / separación RGB",[["glitch","Intensidad",0,1,0],["glitchSpeed","Velocidad",1,30,8]]],["glow","Glow / resplandor",[["glow","Intensidad",0,2,0],["glowRadius","Radio (px de fuente)",1,80,12],["glowThreshold","Umbral luminoso",0,1,0.5]]],["bloom","Bloom / expansión de luces",[["bloom","Intensidad",0,2,0],["bloomRadius","Radio (px de fuente)",1,100,25],["bloomThreshold","Umbral luminoso",0,1,0.65]]],["film","Película antigua",[["film","Intensidad",0,1,0],["filmGrain","Grano",0,1,0.35],["filmScratches","Arañazos",0,1,0.3]]]];
  for(const [, ,fields] of creative)for(const [key,,min,max,value] of fields){videoDefaults[key]=value;ranges.video[key]=[min,max];}
  function validate(fx,kind){
    if(fx===undefined)return;
    const defaults=kind==='video'?videoDefaults:audioDefaults;
    if(!fx||typeof fx!=='object'||Array.isArray(fx)||Object.keys(fx).some(k=>!(k in defaults)))throw Error('Configuración de efectos no válida');
    for(const [key,value] of Object.entries(fx)){
      if(typeof defaults[key]==='boolean'&&typeof value!=='boolean')throw Error('Estado de efecto no válido');if(typeof defaults[key]==='string'&&typeof value!=='string')throw Error('Valor de efecto no válido: '+key);
      const range=ranges[kind][key];if(range&&(!Number.isFinite(value)||value<range[0]||value>range[1]))throw Error('Parámetro de efecto fuera de rango: '+key);
    }
    if(kind==='video'){
      if(fx.animation!==undefined){if(!fx.animation||typeof fx.animation!=='object'||Array.isArray(fx.animation)||Object.keys(fx.animation).length>Object.keys(ranges.video).length)throw Error('Animación FX no válida');for(const [key,points] of Object.entries(fx.animation)){const range=ranges.video[key];if(!range||!Array.isArray(points)||points.length>1000||!points.length)throw Error('Curva FX no válida');let previous=-1;for(const p of points){if(!p||!Number.isFinite(p.time)||p.time<0||p.time<=previous||!Number.isFinite(p.value)||p.value<range[0]||p.value>range[1])throw Error('Punto FX no válido');previous=p.time;}}}
      if(fx.chromaProMatte!==undefined&&fx.chromaProMatte!==null){const m=fx.chromaProMatte;if(typeof m!=='object'||Array.isArray(m)||Object.keys(m).some(k=>!['id','fps','frames'].includes(k))||!/^[0-9a-f]{64}$/.test(m.id)||!Number.isFinite(m.fps)||m.fps<1||m.fps>30||!Number.isInteger(m.frames)||m.frames<1||m.frames>54000)throw Error('Análisis IA pro no válido');}if(fx.chromaZone!==undefined&&!['all','people','pro'].includes(fx.chromaZone))throw Error('Zona de croma no válida');if(fx.chromaMatteModel!==undefined&&!['fast','detail'].includes(fx.chromaMatteModel))throw Error('Modelo de máscara no válido');if(fx.chromaColor!==undefined&&!/^#[0-9a-f]{6}$/i.test(fx.chromaColor))throw Error('Color de croma no válido');
      if(fx.lut!==undefined&&fx.lut!==null){const l=fx.lut;if(!Number.isInteger(l.size)||l.size<2||l.size>65||!Array.isArray(l.values)||l.values.length!==l.size**3*3||l.values.some(v=>!Number.isFinite(v)||v<0||v>1)||typeof l.name!=='string'||l.name.length>200)throw Error('LUT 3D no válida');}
    }
    if(kind==='audio'&&fx.autotuneScale!==undefined&&!autotuneScales.includes(fx.autotuneScale))throw Error('Escala de autotune no válida');
    if(kind==='audio'&&fx.autotuneKey!==undefined&&!Number.isInteger(fx.autotuneKey))throw Error('Tonalidad de autotune no válida');
    if(kind==='audio'&&fx.autotuneGuideTrack!==undefined&&!/^[A-Za-z0-9_ .·-]{0,64}$/.test(fx.autotuneGuideTrack))throw Error('Pista guía de autotune no válida');
    if(kind==='audio'&&fx.autotuneGuideMode!==undefined&&!['notes','contour'].includes(fx.autotuneGuideMode))throw Error('Modo de pista guía no válido');
    if(kind==='audio'&&fx.autotuneGuideFallback!==undefined&&!['scale','none'].includes(fx.autotuneGuideFallback))throw Error('Comportamiento sin guía no válido');
    if(kind==='audio'&&fx.animation!==undefined){if(!fx.animation||typeof fx.animation!=='object'||Array.isArray(fx.animation)||Object.keys(fx.animation).length>Object.keys(ranges.audio).length)throw Error('Animación de audio no válida');for(const [key,points] of Object.entries(fx.animation)){const range=ranges.audio[key];if(!range||audioStatic.includes(key)||!Array.isArray(points)||!points.length||points.length>1000)throw Error('Curva de audio no válida');let previous=-1;for(const p of points){if(!p||!Number.isFinite(p.time)||p.time<0||p.time<=previous||!Number.isFinite(p.value)||p.value<range[0]||p.value>range[1])throw Error('Punto de audio no válido');previous=p.time;}}}
  }
  function valueAt(points,time,fallback){if(!points?.length)return fallback;if(time<=points[0].time)return points[0].value;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(time<=b.time)return a.value+(b.value-a.value)*(time-a.time)/(b.time-a.time);}return points.at(-1).value;}
  function at(fx,time,kind='video'){const result={...(kind==='audio'?audioDefaults:videoDefaults),...fx};for(const [key,points] of Object.entries(fx?.animation||{}))result[key]=valueAt(points,time,result[key]);return result;}
  // True when the clip is processed as an isolated segment (animation, or filters that need a multi-input graph).
  function animatedAudio(fx){return !!fx?.enabled&&(Object.keys(fx.animation||{}).length>0||!!fx.convReverb||!!fx.autotune||(!!fx.deesser&&(fx.deesserAmount??.5)>0));}
  function slice(fx,start,duration){const result={...fx,animation:{}};for(const [key,points] of Object.entries(fx?.animation||{})){result.animation[key]=[{time:0,value:valueAt(points,start,fx[key]??videoDefaults[key])},...points.filter(p=>p.time>start&&p.time<start+duration).map(p=>({time:p.time-start,value:p.value})),{time:duration,value:valueAt(points,start+duration,fx[key]??videoDefaults[key])}];}return result;}
  function parseCube(text,name){
    if(text.length>16*1024*1024)throw Error('LUT demasiado grande (máximo 16 MB)');
    let size=0;const values=[];
    for(const raw of text.split(/\r?\n/)){const line=raw.replace(/#.*/,'').trim();if(!line||/^TITLE\b/.test(line))continue;
      if(/^LUT_3D_SIZE\s/.test(line)){size=Number(line.split(/\s+/)[1]);continue;}
      if(/^DOMAIN_MIN\s/.test(line)){if(line.split(/\s+/).slice(1).some(x=>Number(x)!==0))throw Error('Solo DOMAIN_MIN 0 0 0');continue;}
      if(/^DOMAIN_MAX\s/.test(line)){if(line.split(/\s+/).slice(1).some(x=>Number(x)!==1))throw Error('Solo DOMAIN_MAX 1 1 1');continue;}
      const parts=line.split(/\s+/);if(parts.length!==3||parts.some(x=>!Number.isFinite(Number(x))))throw Error('Formato .cube no soportado');values.push(...parts.map(Number));
    }
    const lut={size,values,name:String(name).slice(0,200)};validate({lut},'video');return lut;
  }
  function audioFilters(input){
    validate(input,'audio');const f={...audioDefaults,...input};if(!f.enabled)return [];
    const out=[];
    if(f.highpass)out.push(`highpass=f=${f.highpassHz}:poles=2`);if(f.lowpass)out.push(`lowpass=f=${f.lowpassHz}:poles=2`);
    if(f.gate)out.push(`agate=threshold=${10**(f.gateDb/20)}:range=0.01:ratio=4:attack=5:release=150`);
    if(f.denoise)out.push(`afftdn=nr=${Math.max(.01,f.denoiseDb)}`);
    for(const [key,hz] of [['bass',120],['mid',1000],['treble',8000]])if(f[key])out.push(`equalizer=f=${hz}:t=q:w=1:g=${f[key]}`);
    if(f.deesser&&f.deesserAmount)out.push(`deesser=i=${f.deesserAmount}:m=0.5:f=0.5:s=o`);
    if(f.compressor)out.push(`acompressor=threshold=${10**(f.thresholdDb/20)}:ratio=${f.ratio}:attack=10:release=150:makeup=1`);
    out.push(...creativeAudio(f));
    if(f.echo&&f.echoMix)out.push(`aecho=1:1:${f.echoMs}:${f.echoMix}`);
    if(f.reverb&&f.reverbMix)out.push(`aecho=1:1:29|43|71|113|173|251:${[.55,.45,.35,.25,.18,.1].map(x=>x*f.reverbMix).join('|')}`);
    if(f.normalize)out.push(`loudnorm=I=${f.targetLufs}:TP=-1:LRA=11`);
    if(f.limiter)out.push(`alimiter=limit=${f.limiterCeiling}:level=false:latency=true`);
    return out;
  }
  // Pitch, chorus, tremolo, lo-fi and stereo width share the same text in the static and segment graphs.
  function creativeAudio(f){const out=[];
    if(f.pitch)out.push(`rubberband=pitch=${2**(f.pitchSemitones/12)}:formant=${f.pitchFormant?'preserved':'shifted'}:pitchq=quality`);
    if(f.chorus&&f.chorusMix){const d=1+f.chorusDepth*3;out.push(`chorus=${(1/(1+.7*f.chorusMix)).toFixed(4)}:0.9:45|62:${(.45*f.chorusMix).toFixed(4)}|${(.35*f.chorusMix).toFixed(4)}:0.25|0.4:${d.toFixed(3)}|${(d*1.3).toFixed(3)}`);}
    if(f.tremolo&&f.tremoloDepth)out.push(`tremolo=f=${f.tremoloHz}:d=${f.tremoloDepth}`);
    if(f.lofi&&f.lofiAmount)out.push(`acrusher=samples=${1+19*f.lofiAmount}:mix=1:aa=0.5`);
    if(f.widen)out.push(`extrastereo=m=${f.widenAmount}:c=false`);
    if(f.pan&&f.panPosition)out.push(`stereotools=balance_out=${f.panPosition}`);
    return out;}
  // Deterministic synthetic room response (white noise, exponential decay to −60 dB, gentle low-pass). Used by the live preview.
  function convolutionImpulse(sampleRate,seconds){const length=Math.max(1,Math.round(sampleRate*seconds)),data=[new Float32Array(length),new Float32Array(length)];let seed=20261111;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296*2-1;};const pre=Math.round(sampleRate*.012);for(let c=0;c<2;c++){let lp=0;for(let i=pre;i<length;i++){const t=(i-pre)/sampleRate;lp+=.35*(random()-lp);data[c][i]=lp*Math.exp(-6.9*t/seconds);}}return data;}
  const api={autotuneScales,audioStatic,creativeAudio,convolutionImpulse,creative,videoDefaults,audioDefaults,ranges,validate,parseCube,audioFilters,valueAt,at,slice,animatedAudio};if(typeof module==='object'&&module.exports)module.exports=api;else root.LQTACEffects=api;
})(typeof window==='undefined'?globalThis:window);
