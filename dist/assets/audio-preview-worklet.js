// Local low-latency audition. Noise reduction and loudness are approximations;
// FFmpeg remains the exact render/reference path.
class LqtacAudition extends AudioWorkletProcessor {
 static get parameterDescriptors(){return ['autotune','autotuneKey','autotuneScale','autotuneSpeed','autotuneAmount','autotuneRange','guideActive','guideMidi','guideMode','guideFallback','pitch','pitchSemitones','gate','gateDb','lofi','lofiAmount','widen','widenAmount','denoise','noiseDb','normalize','targetLufs','limiter','ceiling'].map(name=>({name,defaultValue:{targetLufs:-16,ceiling:0.95,gateDb:-45,lofiAmount:0.5,widenAmount:1,autotuneSpeed:0.1,autotuneAmount:1,autotuneRange:2.5}[name]||0,automationRate:'k-rate'}));}
 constructor(){super();this.size=8192;this.window=2048;this.pitchBuffer=[new Float32Array(8192),new Float32Array(8192)];this.write=0;this.delay=0;this.power=0;this.level=1;this.gateLevel=1;this.hold=[0,0];this.holdCount=0;
  // Autotune (needs autotune-core.js loaded in this worklet scope first): YIN on a ~16 kHz mono copy, one step every 10 ms.
  const core=globalThis.LQTACAutotune;this.tune=0;if(core){this.core=core;this.decimate=Math.max(1,Math.round(sampleRate/16000));this.analysisRate=sampleRate/this.decimate;this.detector=core.detector(this.analysisRate);this.corrector=core.corrector();this.ring=new Float32Array(4096);this.ringWrite=0;this.scratch=new Float32Array(this.detector.span);this.acc=0;this.accCount=0;this.hopCount=0;this.hop=Math.round(this.analysisRate*core.HOP);}}
 analyse(p,sample){this.acc+=sample;if(++this.accCount<this.decimate)return;this.ring[this.ringWrite]=this.acc/this.decimate;this.ringWrite=(this.ringWrite+1)&4095;this.acc=0;this.accCount=0;if(++this.hopCount<this.hop)return;this.hopCount=0;
  const span=this.detector.span;for(let k=0;k<span;k++)this.scratch[k]=this.ring[(this.ringWrite-span+k)&4095];const freq=this.detector.detect(this.scratch,0),names=this.core.scaleNames;
  this.tune=this.corrector.step(freq,{notes:this.core.notes(p.autotuneKey[0],names[Math.round(p.autotuneScale[0])]||'chromatic'),speed:p.autotuneSpeed[0],amount:p.autotuneAmount[0],range:p.autotuneRange[0],guide:p.guideActive[0]?p.guideMidi[0]:undefined,guideMode:p.guideMode[0]?'contour':'notes',fallback:p.guideFallback[0]?'none':'scale'});}
 process(inputs,outputs,p){const input=inputs[0],out=outputs[0];if(!input.length)return true;const count=out[0].length,follow=1-Math.exp(-1/(sampleRate*0.15)),tuning=!!(p.autotune[0]&&this.core),basePitch=p.pitch[0]?p.pitchSemitones[0]:0;let semis=NaN,ratio=1;
 for(let i=0;i<count;i++){let energy=0;for(let c=0;c<input.length;c++)energy+=(input[c][i]||0)**2;this.power+=follow*(energy/input.length-this.power);const rms=Math.sqrt(this.power);const target=10**((p.targetLufs[0]+0.7)/20);let gain=p.normalize[0]&&rms>0.0001?Math.min(4,target/Math.max(rms,0.0001)):1;
 if(p.denoise[0]){const reduction=10**(-p.noiseDb[0]/20);gain*=reduction+(1-reduction)*Math.min(1,Math.max(0,(rms-0.001)/0.008));}if(!p.denoise[0]&&!p.normalize[0])this.level=1;else this.level+=0.002*(gain-this.level);
 const gateTarget=p.gate[0]&&rms<10**(p.gateDb[0]/20)?0.01:1;this.gateLevel+=(gateTarget<this.gateLevel?0.004:0.0008)*(gateTarget-this.gateLevel);
 let l=(input[0]?.[i]||0),r=(input[Math.min(1,input.length-1)]?.[i]||0);
 // Live pitch shift: two read heads sweep a short delay line with Hann crossfades (approximate; the render uses Rubber Band).
 {const b=this.pitchBuffer,m=this.size-1,w=this.write;b[0][w]=l;b[1][w]=r;this.write=(w+1)&m;
  if(tuning)this.analyse(p,(l+r)/2);const total=basePitch+(tuning?this.tune:0);if(total!==semis){semis=total;ratio=2**(total/12);}
  if(total){const W=this.window;this.delay+=1-ratio;if(this.delay<0)this.delay+=W;else if(this.delay>=W)this.delay-=W;
   const d1=this.delay,d2=(d1+W/2)%W,g1=.5-.5*Math.cos(2*Math.PI*d1/W),read=(ch,d)=>{const pos=w-d-2,i=Math.floor(pos),f=pos-i;return b[ch][i&m]*(1-f)+b[ch][(i+1)&m]*f;};
   l=read(0,d1)*g1+read(0,d2)*(1-g1);r=read(1,d1)*g1+read(1,d2)*(1-g1);}}
 if(p.widen[0]){const m=(l+r)/2,s=(l-r)/2*p.widenAmount[0];l=m+s;r=m-s;}
 if(p.lofi[0]){const step=Math.max(1,Math.round(1+19*p.lofiAmount[0]));if(this.holdCount++%step===0)this.hold=[l,r];[l,r]=this.hold;}
 for(let c=0;c<out.length;c++){let v=(c===0?l:r)*this.level*(p.gate[0]?this.gateLevel:1);if(p.limiter[0])v=Math.max(-p.ceiling[0],Math.min(p.ceiling[0],v));out[c][i]=v;}}
 return true;
 }
}
registerProcessor('lqtac-audition',LqtacAudition);
