// "Voz de estudio": measures a voice take (noise floor, clipping, tonal balance, sibilance, dynamics, loudness)
// and turns the measurements into settings for the clip's existing audio effects. No effect is applied here.
const {spawn}=require('node:child_process');
const {audioDefaults,validate}=require('../dist/assets/effects-model.js');
const RATE=48000,N=2048,CLIP_LEVEL=.989;
// Analysis bands (Hz). Reference values: long-term average speech spectrum (Byrne et al. 1994), 1/3-octave levels relative to 1 kHz.
const BANDS={rumble:[20,70],low:[100,200],mud:[200,450],ref:[800,1250],presence:[2500,5000],sib:[5000,9000],air:[9000,14000],speech:[100,8000]};
const LTASS={rumble:-12,low:4,mud:7,presence:-6.5,sib:-11,air:-15};
// Settings this tool owns; everything else (pitch, autotune, reverb…) is left as the user had it.
const MANAGED=['declip','highpass','highpassHz','lowpass','voiceAi','voiceAiAmount','voiceDeep','voiceDeepDb','gate','gateDb','denoise','denoiseDb','bass','lowMid','mid','presence','treble','deesser','deesserAmount','compressor','thresholdDb','ratio','normalize','targetLufs','limiter','limiterCeiling'];
// Autotune settings, only proposed when "Afinar la voz según la música" is analysed.
const TUNE_KEYS=['autotune','autotuneKey','autotuneScale','autotuneSpeed','autotuneAmount','autotuneRange','autotuneGuideTrack','autotuneGuideMode','autotuneGuideFallback','autotuneGuideOffset'];
// Voice level over the backing in the voice band (dB), by mix style.
// Calibrated on a produced pop song: its lead vocal sits ≈ +4.4 dB over the backing (voice-band density over voiced frames).
const STYLES={front:{name:'Delante (balada, voz protagonista)',offset:6},balanced:{name:'Equilibrada (como un disco pop)',offset:4.5},blend:{name:'Integrada (rock)',offset:3}};
const PITCH_RATE=16000,MAX_PIECES=64,MAX_TRACKS=12,MAX_TUNING_SECONDS=1200;
// Krumhansl–Kessler key profiles (tonic first).
const KEY_PROFILES={major:[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88],minor:[6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17]};
const KEY_NAMES=['Do','Do♯','Re','Mi♭','Mi','Fa','Fa♯','Sol','La♭','La','Si♭','Si'];
const PROFILES={
  podcast:{name:'Podcast / locución',lufs:-16,highpass:80,ai:true,gate:true,presenceBias:1,song:false},
  song:{name:'Canción',lufs:-14,highpass:70,ai:false,gate:false,presenceBias:0,song:true},
  video:{name:'Vídeo / redes',lufs:-14,highpass:80,ai:true,gate:true,presenceBias:.5,song:false},
};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),round=(v,d=1)=>Math.round(v*10**d)/10**d,db=p=>10*Math.log10(Math.max(p,1e-20));
const pct=(sorted,q)=>sorted.length?sorted[Math.min(sorted.length-1,Math.max(0,Math.floor(q*(sorted.length-1))))]:-100;

// In-place radix-2 FFT (N is a power of two).
function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
  for(let len=2;len<=n;len<<=1){const ang=-2*Math.PI/len,wr=Math.cos(ang),wi=Math.sin(ang);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const a=i+k,b=a+len/2,tr=re[b]*cr-im[b]*ci,ti=re[b]*ci+im[b]*cr;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr;}}}}

// Streaming frame analyser: feed interleaved stereo float samples, then call result().
function analyser(){
  const window=Float64Array.from({length:N},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(N-1))),re=new Float64Array(N),im=new Float64Array(N),frame=new Float64Array(N);
  const keys=Object.keys(BANDS),bins=Object.fromEntries(keys.map(k=>[k,[Math.max(1,Math.round(BANDS[k][0]*N/RATE)),Math.min(N/2,Math.round(BANDS[k][1]*N/RATE))]]));
  const levels=[],bandPower=Object.fromEntries(keys.map(k=>[k,[]]));let fill=0,samples=0,peak=0,clipped=0,clipEvents=0;const run=[0,0];
  function closeFrame(){let sum=0;for(let i=0;i<N;i++){sum+=frame[i]*frame[i];re[i]=frame[i]*window[i];im[i]=0;}levels.push(db(sum/N));fft(re,im);
    for(const k of keys){const [a,b]=bins[k];let p=0;for(let i=a;i<=b;i++)p+=re[i]*re[i]+im[i]*im[i];bandPower[k].push(p/(b-a+1));}fill=0;}
  return {
    push(data){for(let i=0;i+1<data.length;i+=2){const l=data[i],r=data[i+1];samples++;
      for(const [c,v] of [[0,l],[1,r]]){const a=Math.abs(v);if(a>peak)peak=a;if(a>=CLIP_LEVEL){run[c]++;if(run[c]===3){clipped+=3;clipEvents++;}else if(run[c]>3)clipped++;}else run[c]=0;}
      frame[fill++]=(l+r)/2;if(fill===N)closeFrame();}},
    result(){return {levels,bandPower,samples,peak,clipped,clipEvents};},
  };
}

// Voiced frames: louder than max(noise floor + 10, loudest − 30, −70 dBFS).
function speechFrames(levels){const sorted=[...levels].map(v=>Math.max(-100,v)).sort((a,b)=>a-b),noiseFloor=pct(sorted,.1),loud=pct(sorted,.95);
  const threshold=Math.max(noiseFloor+10,loud-30,-70),speech=[];levels.forEach((v,i)=>{if(v>threshold)speech.push(i);});return {speech,noiseFloor};}
function measure(raw,loudness){
  const {levels,bandPower,samples,peak,clipped,clipEvents}=raw,seconds=samples/RATE,{speech,noiseFloor}=speechFrames(levels);
  const speechLevels=speech.map(i=>levels[i]).sort((a,b)=>a-b),speechLevel=pct(speechLevels,.5);
  // Tonal balance over the voiced frames: mean power density per band, as 1/3-octave levels (∝ density · centre) relative to 1 kHz.
  const mean=k=>speech.length?speech.reduce((s,i)=>s+bandPower[k][i],0)/speech.length:0,centre=k=>Math.sqrt(BANDS[k][0]*BANDS[k][1]);
  const ref=db(mean('ref')*1000),tone={};for(const k of Object.keys(LTASS))tone[k]=round(db(mean(k)*centre(k))-ref);
  // Sibilance: how loud the loudest 5–9 kHz moments are (95th percentile) against the typical level of the whole voice band.
  const sibLevels=speech.map(i=>db(bandPower.sib[i]*(BANDS.sib[1]-BANDS.sib[0]))).sort((a,b)=>a-b),voiceLevels=speech.map(i=>db(bandPower.speech[i]*(BANDS.speech[1]-BANDS.speech[0]))).sort((a,b)=>a-b);
  // Room echo: the fastest level falls (dB lost over 2 frames ≈ 85 ms, 95th percentile, frames 20 dB or more above the floor).
  // A dry voice can stop almost at once; a room's reverberation limits how fast the level can fall (RT60 ≈ 60 dB · 85 ms / fall).
  const drops=[];for(let i=0;i+2<levels.length;i++)if(levels[i]-noiseFloor>=20&&levels[i]>levels[i+2])drops.push(levels[i]-Math.max(levels[i+2],noiseFloor));
  drops.sort((a,b)=>a-b);const echo=drops.length>=20?{falls:drops.length,fall:round(pct(drops,.95))}:null;
  return {seconds:round(seconds,2),speechSeconds:round(speech.length*N/RATE,2),noiseFloor:round(noiseFloor),speechLevel:round(speechLevel),snr:round(speechLevel-noiseFloor),
    peakDb:round(db(peak*peak)),clippedRatio:samples?clipped/(samples*2):0,clipEvents,tone,sibilance:speech.length?round(pct(sibLevels,.95)-pct(voiceLevels,.5)):-40,
    lufs:loudness.lufs,lra:loudness.lra,truePeak:loudness.truePeak,echo};
}

// Measurements + profile → settings for the managed keys, plus a readable report.
function recommend(m,profileKey='podcast',options={}){
  const p=PROFILES[profileKey];if(!p)throw Error('Perfil de voz no válido');const style=STYLES[options.style]||STYLES.balanced;
  const s=Object.fromEntries(MANAGED.map(k=>[k,audioDefaults[k]])),report=[],add=(status,title,detail)=>report.push({status,title,detail});
  // A reference voice replaces the average speech spectrum as the tonal target.
  const ref=m.reference,T=ref?{...LTASS,...ref.tone}:LTASS;let backingCut=0;
  if(ref)add('info','Voz de referencia',`Se iguala el tono a «${ref.name}» (${ref.speechSeconds} s de voz analizados)${ref.speechSeconds<5?': es poca voz, el resultado es orientativo':''}.`);
  if(m.speechSeconds<2){add('warn','Poca voz para analizar',`Solo se detectan ${m.speechSeconds} s de voz: los ajustes son orientativos.`);}
  // Clipping
  if(m.clippedRatio>1e-5||m.clipEvents>=5){s.declip=true;add(m.clippedRatio>1e-3?'warn':'fix','Saturación',`${m.clipEvents} recortes detectados (pico ${m.peakDb} dBFS): se activa Reparar saturación.${m.clippedRatio>1e-3?' Hay mucha saturación: mejorará, pero conviene grabar con menos ganancia.':''}`);}
  else add('ok','Saturación','Sin recortes.');
  // Low end: rumble and boom
  s.highpass=true;s.highpassHz=p.highpass;const boom=m.tone.low-T.low,rumble=m.tone.rumble-LTASS.rumble;
  if(rumble>6&&!p.song){s.highpassHz=100;add('fix','Retumbe y golpes graves',`Mucha energía por debajo de 70 Hz (+${round(rumble)} dB): filtro de graves a 100 Hz.`);}
  else add(rumble>6?'fix':'ok','Retumbe y golpes graves',`Filtro de graves a ${s.highpassHz} Hz${rumble>6?' (había retumbe)':', como en cualquier cadena de estudio'}.`);
  if(boom>4){s.bass=-round(clamp((boom-2)*.6,1,4));add('fix','Graves retumbantes',`Exceso de 100–200 Hz (+${round(boom)} dB): graves ${s.bass} dB.`);}
  // Noise
  const noisy=m.noiseFloor>-62&&m.snr<50;
  // Room echo (see measure): only judged when the voice stands 30 dB or more over the noise, otherwise the falls are capped by the noise.
  const echoey=!!m.echo&&m.snr>=30&&m.echo.fall<14;
  if(noisy&&p.ai){s.voiceDeep=true;s.voiceDeepDb=echoey||m.snr<20?100:m.snr<30?40:24;
    add('fix','Ruido de fondo',`Ruido a ${m.noiseFloor} dBFS (la voz está ${m.snr} dB por encima): IA de ruido y eco (DeepFilterNet), ${s.voiceDeepDb===100?'reducción completa':`reducción de hasta ${s.voiceDeepDb} dB`}.`);}
  else if(noisy){s.denoise=true;s.denoiseDb=m.snr<25?15:m.snr<35?10:6;add('fix','Ruido de fondo',`Ruido a ${m.noiseFloor} dBFS: reducción clásica de ${s.denoiseDb} dB (las IA de ruido están entrenadas con voz hablada y pueden apagar el canto; si quieres probarla, activa «Quitar ruido y eco con IA» en Efectos).`);}
  else add('ok','Ruido de fondo',m.noiseFloor<=-62?`Fondo limpio (${m.noiseFloor} dBFS).`:'Ruido bajo respecto a la voz.');
  if(echoey&&!s.voiceDeep){s.voiceDeep=true;s.voiceDeepDb=p.ai?100:18;}
  if(!m.echo||m.snr<30)add('ok','Eco de la sala','No se puede medir con este nivel de ruido o tan poca voz.');
  else if(echoey)add(p.ai?'fix':'warn','Eco de la sala',`La voz tarda en apagarse al acabar cada frase (${m.echo.fall} dB en 85 ms; una voz seca cae más de 14): IA DeepFilterNet ${p.ai?'con reducción completa':'suave (hasta 18 dB)'}.${p.ai?'':' En canto puede apagar las notas largas: escúchalo y bájala o desactívala en Efectos si hace falta.'}`);
  else add('ok','Eco de la sala','Voz seca, sin eco de sala apreciable.');
  if(p.gate&&!s.voiceAi&&!s.voiceDeep&&m.noiseFloor>-65&&m.snr>15){s.gate=true;s.gateDb=round(clamp(Math.min(m.noiseFloor+6,m.speechLevel-18),-70,-30));add('fix','Silencios',`Puerta de ruido a ${s.gateDb} dB para limpiar las pausas.`);}
  // Tonal balance
  const mud=m.tone.mud-T.mud,presence=T.presence-m.tone.presence,air=LTASS.air-m.tone.air,brightGap=T.air-m.tone.air;
  if(mud>2){s.lowMid=-round(clamp(mud*.8,1.5,6));add('fix','Voz embarrada',`Exceso de 200–450 Hz (+${round(mud)} dB): medios-graves ${s.lowMid} dB.`);}
  else add('ok','Cuerpo de la voz','Medios-graves equilibrados.');
  if(presence>2){s.presence=round(clamp(presence*.7+p.presenceBias,1,6));add('fix','Claridad',`Falta presencia en 2,5–5 kHz (−${round(presence)} dB): presencia +${s.presence} dB.`);}
  else if(presence<-4){s.presence=-round(clamp((-presence-2)*.6,1,4));add('fix','Voz chillona',`Exceso de 2,5–5 kHz: presencia ${s.presence} dB.`);}
  else{if(p.presenceBias)s.presence=p.presenceBias;add('ok','Claridad',`Presencia correcta${p.presenceBias?` (+${p.presenceBias} dB de brillo para ${p.name.toLowerCase()})`:''}.`);}
  if(air>12)add('warn','Sin agudos','La grabación no tiene sonido por encima de 9 kHz (micrófono o archivo de baja calidad): no se puede recuperar, así que no se suben los agudos.');
  else if((ref?brightGap:air)>4&&m.snr>25){s.treble=round(clamp(((ref?brightGap:air)-2)*.5,1,4));add('fix','Brillo',`Voz apagada por encima de 9 kHz: agudos +${s.treble} dB.`);}
  // Sibilance (loudest 5–9 kHz moments against the voice level). Calibrated: speech ≈ −14 normal, −7 hissy, −22 dull;
  // a finished studio lead vocal measures ≈ −10, so the de-esser starts above −9.
  const sib=m.sibilance+(s.presence>0||s.treble>0?1:0),sibLimit=ref?clamp(ref.sibilance+2,-12,-6):-9;
  if(sib>sibLimit){s.deesser=true;s.deesserAmount=round(clamp(.3+(sib-sibLimit)*.1,.3,.8),2);add('fix','Eses que silban',`Sibilantes fuertes: de-esser al ${Math.round(s.deesserAmount*100)} %.`);}
  else add('ok','Eses','Sibilantes bajo control.');
  // Dynamics
  const lra=Number.isFinite(m.lra)?m.lra:8;
  if(p.song){s.compressor=true;s.ratio=lra>10?2.5:2;s.thresholdDb=round(clamp(m.speechLevel-2,-60,-1));}
  else{s.compressor=true;s.ratio=lra<=5?2:lra<=9?3:4;s.thresholdDb=round(clamp(m.speechLevel-4,-60,-1));}
  if(ref&&Number.isFinite(ref.lra)&&lra>ref.lra+3){s.ratio=Math.min(6,s.ratio+1);s.thresholdDb=round(clamp(s.thresholdDb-2,-60,-1));}
  if(!p.song&&lra<=5)add('ok','Dinámica',`Volumen estable (${round(lra)} LU): compresión suave ${s.ratio}:1 desde ${s.thresholdDb} dB para dar cuerpo.`);
  else add('fix','Volumen irregular',`Rango de sonoridad ${round(lra)} LU${ref&&Number.isFinite(ref.lra)?` (la referencia tiene ${round(ref.lra)} LU)`:''}: compresor ${s.ratio}:1 desde ${s.thresholdDb} dB${p.song?' (suave, respeta la interpretación)':''}.`);
  // Fit with the backing tracks (measured only where the voice sounds).
  const b=m.backing;let target=ref&&Number.isFinite(ref.lufs)?round(clamp(ref.lufs,-30,-10)):p.lufs,targetWhy=ref&&Number.isFinite(ref.lufs)?'como la referencia':p.name;
  if(b?.silent)add('warn','Base','Las pistas elegidas casi no suenan donde está la voz: no se ajusta nada respecto a la música.');
  else if(b){
    // Masking left after the voice's own presence correction (a produced mix measures ≈ 0 dB here).
    const masked=round(b.relSpeech-b.relBand.presence-Math.max(0,s.presence));
    if(masked>3){const boost=round(clamp((masked-3)*.5,.5,3));s.presence=round(clamp(s.presence+boost,-6,8));backingCut=-round(clamp((masked-3)*.5,1,3));
      add('fix','La música tapa la voz',`La base ocupa la zona de claridad de la voz (2,5–5 kHz, ${masked} dB más de lo que deja una mezcla equilibrada): presencia de la voz +${boost} dB. Puedes recortar también ${backingCut} dB esa zona en la base.`);}
    else add('ok','Espacio en la mezcla','La base deja sitio a la claridad de la voz (2,5–5 kHz).');
    const crowd=round(b.relSpeech-b.relBand.mud);
    if(crowd>4){s.lowMid=round(clamp(s.lowMid-1.5,-8,0));add('fix','Medios-graves cargados',`La base llena 200–450 Hz (${crowd} dB): medios-graves de la voz ${s.lowMid} dB para que no se empaste.`);}
    if(b.backTone.low>4){const hz=p.song?110:100;if(s.highpassHz<hz){s.highpassHz=hz;add('fix','Graves de la base',`El bajo y el bombo ocupan los graves: filtro de graves de la voz a ${hz} Hz para no embarrar.`);}}
    const voiceAir=m.tone.air-m.tone.presence,backAir=b.backTone.air-b.backTone.presence;
    if(air<=12&&m.snr>25&&backAir-voiceAir>4){const t=round(clamp((backAir-voiceAir-2)*.4,1,3));if(t>s.treble){s.treble=t;add('fix','Brillo de la mezcla',`La base es más brillante que la voz: agudos +${t} dB para que no suene apagada al lado.`);}}
    if(Number.isFinite(b.lra)&&b.lra<7&&s.ratio<3){s.ratio=3;s.thresholdDb=round(clamp(m.speechLevel-6,-60,-1));add('fix','Base comprimida',`La música tiene poca dinámica (${round(b.lra)} LU): compresor de la voz ${s.ratio}:1 desde ${s.thresholdDb} dB para que no aparezca y desaparezca.`);}
    if(Number.isFinite(m.lufs)){const wanted=round(m.lufs+style.offset-b.delta);target=round(clamp(wanted,-30,-10));targetWhy=`voz ${style.offset>0?'+':''}${style.offset} dB sobre la base (ahora ${b.delta>0?'+':''}${b.delta} dB), ${style.name.toLowerCase()}`;
      if(wanted!==target)add('warn','Volumen fuera de rango',`Haría falta ${wanted} LUFS: baja o sube el volumen de la pista de voz o de la base para que encajen.`);}
  }
  // Tuning against the backing's key, or the melody of a backing track.
  const tn=m.tuning;let tuned=false;
  if(tn?.skipped)add('warn','Afinación',tn.skipped);
  else if(tn){
    const key=tn.key&&tn.key.r>=.6&&tn.key.margin>=.04?tn.key:null,guide=tn.guides.filter(g=>g.score>=.5&&g.agreement>=.7).sort((x,y)=>y.score-x.score)[0],offTuned=Math.abs(tn.tuningCents)>20;
    if(tn.key)add('info','Tonalidad de la base',key?`${KEY_NAMES[key.key]} ${key.scale==='major'?'mayor':'menor'}${offTuned?`, afinada ${tn.tuningCents>0?'+':''}${tn.tuningCents} cents respecto a La 440`:''}.`:'No está clara (pocos acordes o música atonal).');
    if(tn.notes<10)add('warn','Afinación','Hay pocas notas cantadas para medir la afinación: no se cambia el autotune.');
    else if(tn.medianCents<12&&tn.offShare<.12)add('ok','Afinación',`La voz va afinada (desvío medio ${tn.medianCents} cents): no hace falta autotune.`);
    else if(offTuned&&!guide)add('warn','Base con otra afinación',`La base está ${tn.tuningCents>0?'+':''}${tn.tuningCents} cents respecto a La 440 y el autotune corrige a La 440: no se activa para no separar la voz de la música.`);
    else{tuned=true;const gentle=tn.medianCents<20,medium=tn.medianCents<35;
      Object.assign(s,{autotune:true,autotuneSpeed:gentle?.6:medium?.35:.2,autotuneAmount:gentle?.6:medium?.8:1,autotuneGuideOffset:0,autotuneGuideFallback:'scale'});
      const chromatic=!key||tn.outOfScale>.25;s.autotuneKey=chromatic?0:key.key;s.autotuneScale=chromatic?'chromatic':key.scale;
      s.autotuneGuideTrack=guide?guide.id:'';s.autotuneGuideMode=guide&&offTuned?'contour':'notes';s.autotuneRange=guide?2.5:1;
      const how=guide?`siguiendo la melodía de «${guide.label}»`:chromatic?'a la nota más cercana':`a la escala de ${KEY_NAMES[key.key]} ${key.scale==='major'?'mayor':'menor'}`;
      add('fix','Afinación',`Desvío medio ${tn.medianCents} cents (${Math.round(tn.offShare*100)} % de las notas a más de 30 cents): autotune ${gentle?'suave y natural':medium?'medio':'firme'} ${how}, al ${Math.round(s.autotuneAmount*100)} %.`);
      if(key&&chromatic&&!guide)add('info','Notas fuera de la escala',`El ${Math.round(tn.outOfScale*100)} % de las notas no está en la escala de la base: se corrige a la nota más cercana para no cambiar la melodía.`);}
  }
  // Loudness and peaks
  s.normalize=true;s.targetLufs=target;s.limiter=true;s.limiterCeiling=.89;
  add('fix','Volumen final',`${Number.isFinite(m.lufs)?`Ahora ${round(m.lufs)} LUFS`:'Sonoridad'} → ${target} LUFS (${targetWhy}), con limitador a −1 dB.`);
  if(m.speechLevel<-45)add('warn','Grabación muy baja','La voz está muy por debajo del nivel normal: al subirla también sube el ruido. Acércate al micrófono o sube la ganancia.');
  if(!tuned)for(const k of TUNE_KEYS)delete s[k];
  validate({...audioDefaults,...s},'audio');return {profile:profileKey,style:options.style||'balanced',settings:s,report,backingCut};
}

function run(args,onData){return new Promise((resolve,reject)=>{const child=spawn(require('./render-engine.cjs').ffmpegPath(),args,{windowsHide:true,stdio:['ignore','pipe','pipe']});active.add(child);let log='';
  child.stdout.on('data',onData);child.stderr.on('data',b=>{log=(log+b).slice(-20000);});child.once('error',reject);
  child.once('close',code=>{active.delete(child);if(code===0)return resolve(log);const error=Error(cancelled?'Análisis cancelado':'No se pudo analizar la voz: '+log.slice(-600));error.log=log;reject(error);});});}
const active=new Set(),workers=new Set();let cancelled=false;
const probeLog=filePath=>run(['-hide_banner','-i',filePath],()=>{}).catch(e=>e.log||'');
// One FFmpeg pass: 48 kHz stereo PCM into the frame analyser plus EBU R128 (I, LRA, peak) from the same signal.
async function meterPass(inputs,graph){
  const a=analyser();let rest=Buffer.alloc(0);
  const log=await run(['-hide_banner','-nostats','-v','info',...inputs.flatMap(f=>['-i',f]),'-filter_complex',`${graph},asplit=2[pcm][meter];[meter]ebur128=peak=true:framelog=verbose,anullsink`,'-map','[pcm]','-f','f32le','pipe:1'],chunk=>{
    const b=rest.length?Buffer.concat([rest,chunk]):chunk,usable=b.length-b.length%8;a.push(new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+usable)));rest=b.subarray(usable);});
  const summary=log.slice(log.lastIndexOf('Summary:')),num=re=>{const x=summary.match(re);return x?Number(x[1]):NaN;};
  return {raw:a.result(),loudness:{lufs:num(/I:\s*(-?[\d.]+)\s*LUFS/),lra:num(/LRA:\s*(-?[\d.]+)\s*LU/),truePeak:num(/Peak:\s*(-?[\d.]+|-inf)\s*dBFS/)}};
}
// Mono sources are duplicated to both channels (FFmpeg's default upmix lowers them 3 dB and would hide clipping).
async function voicePass(filePath,segment){
  const automation=require('./audio-automation.cjs'),mono=/Audio:[^\r\n]*\b(mono|1 channels)\b/.test(await probeLog(filePath)),layout=mono?'pan=stereo|c0=c0|c1=c0,aformat=sample_fmts=flt':'aformat=sample_fmts=flt:channel_layouts=stereo';
  const pass=await meterPass([filePath],`[0:a:0]${automation.baseChain(segment)},aresample=${RATE},${layout}`);if(!pass.raw.samples)throw Error('El clip no tiene audio');return pass;
}
// Backing pieces (same shape as autotune guide pieces plus gain), mixed in voice-event seconds.
function checkPieces(pieces){if(!Array.isArray(pieces)||pieces.some(p=>!p||typeof p.filePath!=='string'||!p.filePath||!['at','skip','duration','offset','clipDuration','rate','gain'].every(k=>Number.isFinite(p[k]))||p.at<0||p.skip<0||p.duration<=0||p.offset<0||p.clipDuration<=0||p.rate<.25||p.rate>4||p.gain<0||p.gain>16))throw Error('Pistas de la base no válidas');}
function mixGraph(pieces,duration,rate,layout){
  const n=require('./audio-automation.cjs').n,parts=pieces.map((p,i)=>{const tempo=[];let r=p.rate;while(r>2){tempo.push('atempo=2');r/=2;}while(r<.5){tempo.push('atempo=0.5');r/=.5;}tempo.push('atempo='+n(r));
    return `[${i}:a:0]atrim=start=${n(p.offset)}:duration=${n(p.clipDuration*p.rate)},asetpts=PTS-STARTPTS,${p.reverse?'areverse,':''}${tempo.join(',')},atrim=start=${n(p.skip)}:duration=${n(p.duration)},asetpts=PTS-STARTPTS,aresample=${rate},aformat=sample_fmts=flt:channel_layouts=${layout},volume=${n(p.gain)},adelay=delays=${Math.round(p.at*1000)}:all=1[p${i}]`;});
  return `${parts.join(';')};${pieces.map((_,i)=>`[p${i}]`).join('')}amix=inputs=${pieces.length}:normalize=0:duration=longest,apad=whole_dur=${n(duration)},atrim=duration=${n(duration)}`;
}
async function collect(args){const chunks=[];await run(args,b=>chunks.push(b));const b=Buffer.concat(chunks),out=new Float32Array(Math.floor(b.length/4));for(let i=0;i<out.length;i++)out[i]=b.readFloatLE(i*4);return out;}
const mono16=(inputs,graph)=>collect(['-hide_banner','-nostats','-v','error',...inputs.flatMap(f=>['-i',f]),'-filter_complex',graph,'-f','f32le','pipe:1']);
// Voice against backing over the voiced frames: overall level difference and per-band difference (voice-band densities, gains applied).
function compareMix(voice,back,loudness,voiceGainDb){
  const {speech}=speechFrames(voice.levels),frames=speech.filter(i=>i<back.levels.length),bandDb=(raw,k,i)=>db(raw.bandPower[k][i]);
  const playing=frames.filter(i=>back.levels[i]>-60);if(frames.length<20||playing.length<frames.length*.3)return {silent:true};
  const median=values=>{const v=[...values].sort((a,b)=>a-b);return v.length?v[v.length>>1]:0;},rel=k=>round(median(playing.map(i=>bandDb(voice,k,i)+voiceGainDb-bandDb(back,k,i))));
  const relBand={};for(const k of ['low','mud','ref','presence','sib','air'])relBand[k]=rel(k);
  const mean=k=>playing.reduce((s,i)=>s+back.bandPower[k][i],0)/playing.length,centre=k=>Math.sqrt(BANDS[k][0]*BANDS[k][1]),r1k=db(mean('ref')*1000),backTone={};
  for(const k of Object.keys(LTASS))backTone[k]=round(db(mean(k)*centre(k))-r1k);
  return {silent:false,delta:rel('speech'),relSpeech:rel('speech'),relBand,backTone,coverage:round(playing.length/frames.length,2),lufs:loudness.lufs,lra:loudness.lra};
}
// Key and tuning of a mono 16 kHz signal: per-frame normalised chroma (65–2100 Hz) and the circular mean of spectral-peak offsets from La 440.
function harmony(x,rate=PITCH_RATE){
  const M=8192,hop=4096,win=Float64Array.from({length:M},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(M-1))),re=new Float64Array(M),im=new Float64Array(M),mag=new Float64Array(M/2+1);
  const lo=Math.ceil(65*M/rate),hi=Math.floor(2100*M/rate),peakLo=Math.ceil(100*M/rate),pcOf=new Int8Array(hi+1),chroma=new Float64Array(12);
  for(let k=lo;k<=hi;k++){const m=69+12*Math.log2(k*rate/M/440);pcOf[k]=((Math.round(m)%12)+12)%12;}
  let frames=0,tx=0,ty=0;
  for(let s=0;s+M<=x.length;s+=hop){for(let i=0;i<M;i++){re[i]=x[s+i]*win[i];im[i]=0;}fft(re,im);let max=0;for(let k=1;k<=hi+1;k++){mag[k]=Math.hypot(re[k],im[k]);if(k<=hi&&k>=lo&&mag[k]>max)max=mag[k];}
    if(max<2)continue;frames++;const c=new Float64Array(12);for(let k=lo;k<=hi;k++)c[pcOf[k]]+=mag[k]*mag[k];const cm=Math.max(...c);if(cm>0)for(let p=0;p<12;p++)chroma[p]+=Math.sqrt(c[p]/cm);
    for(let k=Math.max(peakLo,2);k<hi;k++){const b=mag[k];if(b<max*.1||b<=mag[k-1]||b<mag[k+1])continue;const a=Math.log(mag[k-1]+1e-12),bb=Math.log(b),cc=Math.log(mag[k+1]+1e-12),den=a-2*bb+cc,d=den<0?.5*(a-cc)/den:0;
      const m=69+12*Math.log2((k+d)*rate/M/440),angle=(m-Math.round(m))*2*Math.PI;tx+=b*Math.cos(angle);ty+=b*Math.sin(angle);}}
  return {chroma:[...chroma],frames,tuningCents:frames?round(Math.atan2(ty,tx)/(2*Math.PI)*100):0};
}
function detectKey(chroma){
  const corr=(a,b)=>{const ma=a.reduce((s,v)=>s+v,0)/12,mb=b.reduce((s,v)=>s+v,0)/12;let n=0,da=0,dd=0;for(let i=0;i<12;i++){n+=(a[i]-ma)*(b[i]-mb);da+=(a[i]-ma)**2;dd+=(b[i]-mb)**2;}return da&&dd?n/Math.sqrt(da*dd):0;};
  const all=[];for(const scale of ['major','minor'])for(let key=0;key<12;key++)all.push({key,scale,r:corr(chroma,KEY_PROFILES[scale].map((_,i)=>KEY_PROFILES[scale][(i-key+12)%12]))});all.sort((a,b)=>b.r-a.r);
  // The relative major/minor share the same notes, so the margin is taken against the best key with different notes.
  const best=all[0],relative=best.scale==='major'?{key:(best.key+9)%12,scale:'minor'}:{key:(best.key+3)%12,scale:'major'},other=all.find(k=>k!==best&&!(k.key===relative.key&&k.scale===relative.scale));
  return {key:best.key,scale:best.scale,r:round(best.r,3),margin:round(best.r-other.r,3)};
}
// Sung notes from a melody (MIDI per 10 ms): runs of ≥ 80 ms that stay within 0.35 st between frames, each reduced to its median (vibrato centre).
function sungNotes(melody){const notes=[];let run=[];const flush=()=>{if(run.length>=8){const v=[...run].sort((a,b)=>a-b);notes.push(v[v.length>>1]);}run=[];};
  for(const v of melody){if(v>0&&(!run.length||Math.abs(v-run[run.length-1])<.35))run.push(v);else{flush();if(v>0)run.push(v);}}flush();return notes;}
function guideScore(voice,track){let voiced=0,both=0,match=0;for(let i=0;i<voice.length;i++){if(!(voice[i]>0))continue;voiced++;const t=track[i];if(!(t>0))continue;both++;const d=(((voice[i]-t)%12)+12)%12;if(Math.min(d,12-d)<.6)match++;}
  return {coverage:voiced?round(both/voiced,2):0,agreement:both?round(match/both,2):0,score:voiced?round(match/voiced,2):0};}
// Runs in a worker: voice melody, backing key/tuning, how far the sung notes are from the grid, and which track (if any) carries the melody.
function pitchReport({voice,tracks,duration}){
  const core=require('../dist/assets/autotune-core.js'),vm=core.melody(voice,PITCH_RATE,duration),mix=new Float32Array(voice.length);
  for(const t of tracks)for(let i=0;i<mix.length&&i<t.samples.length;i++)mix[i]+=t.samples[i];
  const h=harmony(mix),key=h.frames>=8?detectKey(h.chroma):null,offset=h.tuningCents/100,pcs=key?core.notes(key.key,key.scale):null;
  const guides=tracks.map(t=>({id:t.id,label:t.label,...guideScore(vm,core.melody(t.samples,PITCH_RATE,duration))}));
  const cents=[],notes=sungNotes(vm);let outside=0;
  for(const raw of notes){const p=raw-offset,d=Math.abs(p-Math.round(p))*100;cents.push(d);if(pcs&&d<35&&!pcs.includes(((Math.round(p)%12)+12)%12))outside++;}
  cents.sort((a,b)=>a-b);
  return {notes:notes.length,medianCents:cents.length?round(cents[cents.length>>1]):0,offShare:cents.length?round(cents.filter(c=>c>30).length/cents.length,2):0,outOfScale:notes.length?round(outside/notes.length,2):0,key,tuningCents:h.tuningCents,guides};
}
function inWorker(data){return new Promise((resolve,reject)=>{const {Worker}=require('node:worker_threads'),worker=new Worker("const {workerData:w,parentPort}=require('node:worker_threads');parentPort.postMessage(require(w.module).pitchReport(w));",{eval:true,workerData:{module:__filename,...data}});workers.add(worker);
  let done=false;worker.once('message',r=>{done=true;resolve(r);});worker.once('error',reject);worker.once('exit',code=>{workers.delete(worker);if(!done)reject(Error(cancelled?'Análisis cancelado':'Falló el análisis de afinación'));});});}
// filePath + event segment (offset, duration, rate; reversal is resolved by the caller) → measurements.
// options: {tracks:[{id,label,pieces}], voiceGain, reference (file path), tuning (bool)}.
async function analyze(filePath,segment,options={}){
  const automation=require('./audio-automation.cjs');automation.checkSegment(segment);if(segment.duration>4*3600)throw Error('El clip es demasiado largo para analizarlo');
  const tracks=Array.isArray(options.tracks)?options.tracks:[];if(tracks.length>MAX_TRACKS)throw Error(`Elige como mucho ${MAX_TRACKS} pistas de base`);
  for(const t of tracks){if(!t||typeof t.id!=='string'||!/^[A-Za-z0-9_ .·-]{1,64}$/.test(t.id)||typeof t.label!=='string'||t.label.length>120)throw Error('Pistas de la base no válidas');checkPieces(t.pieces);}
  const voiceGain=Number.isFinite(options.voiceGain)&&options.voiceGain>0?Math.min(16,options.voiceGain):1;
  cancelled=false;const voice=await voicePass(filePath,segment),m=measure(voice.raw,voice.loudness);
  if(typeof options.reference==='string'&&options.reference){
    const d=(await probeLog(options.reference)).match(/Duration:\s*(\d+):(\d+):([\d.]+)/),seconds=d?Number(d[1])*3600+Number(d[2])*60+Number(d[3]):0;if(!(seconds>.5))throw Error('No se pudo leer la voz de referencia');
    const r=await voicePass(options.reference,{offset:0,duration:Math.min(seconds,600),rate:1}),rm=measure(r.raw,r.loudness);
    m.reference={name:require('node:path').basename(options.reference),tone:rm.tone,sibilance:rm.sibilance,lufs:rm.lufs,lra:rm.lra,speechSeconds:rm.speechSeconds};
  }
  const pieces=tracks.flatMap(t=>t.pieces);
  if(pieces.length>MAX_PIECES)throw Error(`La base tiene demasiados eventos bajo la voz (${pieces.length}, máximo ${MAX_PIECES}): elige menos pistas o recorta el clip`);
  if(pieces.length){
    const back=await meterPass(pieces.map(p=>p.filePath),mixGraph(pieces,segment.duration,RATE,'stereo'));
    m.backing={...compareMix(voice.raw,back.raw,back.loudness,db(voiceGain*voiceGain)),tracks:tracks.map(t=>t.label)};
    if(options.tuning){
      if(segment.duration>MAX_TUNING_SECONDS)m.tuning={skipped:'El clip dura más de 20 minutos: la afinación no se analiza.'};
      else{const voice16=await mono16([filePath],`[0:a:0]${automation.baseChain(segment)},aresample=${PITCH_RATE},aformat=sample_fmts=flt:channel_layouts=mono`),list=[];
        for(const t of tracks)if(t.pieces.length)list.push({id:t.id,label:t.label,samples:await mono16(t.pieces.map(p=>p.filePath),mixGraph(t.pieces,segment.duration,PITCH_RATE,'mono'))});
        m.tuning=await inWorker({voice:voice16,tracks:list,duration:segment.duration});}
    }
  }else if(options.tuning)m.tuning={skipped:'Para afinar según la música elige al menos una pista de la base.'};
  return m;
}
function cancel(){cancelled=true;for(const c of active)c.kill();for(const w of workers)void w.terminate();}
module.exports={analyze,recommend,cancel,measure,analyser,harmony,detectKey,sungNotes,guideScore,pitchReport,compareMix,PROFILES,MANAGED,TUNE_KEYS,STYLES,LTASS};
