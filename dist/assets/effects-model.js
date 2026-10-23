(function(root){
  const videoDefaults={enabled:false,brightness:0,contrast:1,saturation:1,temperature:0,blur:0,sharpen:0,vignette:0,chroma:false,chromaColor:'#00ff00',chromaTolerance:.15,chromaSoftness:.08,lut:null,animation:{}};
  const audioDefaults={enabled:false,bass:0,mid:0,treble:0,compressor:false,thresholdDb:-18,ratio:4,limiter:false,limiterCeiling:.95,denoise:false,denoiseDb:12,normalize:false,targetLufs:-16,echo:false,echoMs:250,echoMix:.25,reverb:false,reverbMix:.2,animation:{}};
  const ranges={video:{brightness:[-1,1],contrast:[0,2],saturation:[0,2],temperature:[-1,1],blur:[0,20],sharpen:[0,2],vignette:[0,1],chromaTolerance:[0,1],chromaSoftness:[.001,1]},audio:{bass:[-18,18],mid:[-18,18],treble:[-18,18],thresholdDb:[-60,0],ratio:[1,20],limiterCeiling:[.0625,1],denoiseDb:[0,30],targetLufs:[-30,-10],echoMs:[20,1000],echoMix:[0,.7],reverbMix:[0,.7]}};
  function validate(fx,kind){
    if(fx===undefined)return;
    const defaults=kind==='video'?videoDefaults:audioDefaults;
    if(!fx||typeof fx!=='object'||Array.isArray(fx)||Object.keys(fx).some(k=>!(k in defaults)))throw Error('Configuración de efectos no válida');
    for(const [key,value] of Object.entries(fx)){
      if(typeof defaults[key]==='boolean'&&typeof value!=='boolean')throw Error('Estado de efecto no válido');
      const range=ranges[kind][key];if(range&&(!Number.isFinite(value)||value<range[0]||value>range[1]))throw Error('Parámetro de efecto fuera de rango: '+key);
    }
    if(kind==='video'){
      if(fx.animation!==undefined){if(!fx.animation||typeof fx.animation!=='object'||Array.isArray(fx.animation)||Object.keys(fx.animation).length>9)throw Error('Animación FX no válida');for(const [key,points] of Object.entries(fx.animation)){const range=ranges.video[key];if(!range||!Array.isArray(points)||points.length>1000||!points.length)throw Error('Curva FX no válida');let previous=-1;for(const p of points){if(!p||!Number.isFinite(p.time)||p.time<0||p.time<=previous||!Number.isFinite(p.value)||p.value<range[0]||p.value>range[1])throw Error('Punto FX no válido');previous=p.time;}}}
      if(fx.chromaColor!==undefined&&!/^#[0-9a-f]{6}$/i.test(fx.chromaColor))throw Error('Color de croma no válido');
      if(fx.lut!==undefined&&fx.lut!==null){const l=fx.lut;if(!Number.isInteger(l.size)||l.size<2||l.size>65||!Array.isArray(l.values)||l.values.length!==l.size**3*3||l.values.some(v=>!Number.isFinite(v)||v<0||v>1)||typeof l.name!=='string'||l.name.length>200)throw Error('LUT 3D no válida');}
    }
    if(kind==='audio'&&fx.animation!==undefined){if(!fx.animation||typeof fx.animation!=='object'||Array.isArray(fx.animation)||Object.keys(fx.animation).length>11)throw Error('Animación de audio no válida');for(const [key,points] of Object.entries(fx.animation)){const range=ranges.audio[key];if(!range||!Array.isArray(points)||!points.length||points.length>1000)throw Error('Curva de audio no válida');let previous=-1;for(const p of points){if(!p||!Number.isFinite(p.time)||p.time<0||p.time<=previous||!Number.isFinite(p.value)||p.value<range[0]||p.value>range[1])throw Error('Punto de audio no válido');previous=p.time;}}}
  }
  function valueAt(points,time,fallback){if(!points?.length)return fallback;if(time<=points[0].time)return points[0].value;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(time<=b.time)return a.value+(b.value-a.value)*(time-a.time)/(b.time-a.time);}return points.at(-1).value;}
  function at(fx,time,kind='video'){const result={...(kind==='audio'?audioDefaults:videoDefaults),...fx};for(const [key,points] of Object.entries(fx?.animation||{}))result[key]=valueAt(points,time,result[key]);return result;}
  function animatedAudio(fx){return !!fx?.enabled&&Object.keys(fx.animation||{}).length>0;}
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
    const out=[];if(f.denoise)out.push(`afftdn=nr=${Math.max(.01,f.denoiseDb)}`);
    for(const [key,hz] of [['bass',120],['mid',1000],['treble',8000]])if(f[key])out.push(`equalizer=f=${hz}:t=q:w=1:g=${f[key]}`);
    if(f.compressor)out.push(`acompressor=threshold=${10**(f.thresholdDb/20)}:ratio=${f.ratio}:attack=10:release=150:makeup=1`);
    if(f.echo&&f.echoMix)out.push(`aecho=1:1:${f.echoMs}:${f.echoMix}`);
    if(f.reverb&&f.reverbMix)out.push(`aecho=1:1:29|43|71|113|173|251:${[.55,.45,.35,.25,.18,.1].map(x=>x*f.reverbMix).join('|')}`);
    if(f.normalize)out.push(`loudnorm=I=${f.targetLufs}:TP=-1:LRA=11`);
    if(f.limiter)out.push(`alimiter=limit=${f.limiterCeiling}:level=false:latency=true`);
    return out;
  }
  const api={videoDefaults,audioDefaults,ranges,validate,parseCube,audioFilters,valueAt,at,slice,animatedAudio};if(typeof module==='object'&&module.exports)module.exports=api;else root.LQTACEffects=api;
})(typeof window==='undefined'?globalThis:window);
