// Local low-latency audition. Noise reduction and loudness are approximations;
// FFmpeg remains the exact render/reference path.
class LqtacAudition extends AudioWorkletProcessor {
 static get parameterDescriptors(){return ['denoise','noiseDb','normalize','targetLufs','limiter','ceiling'].map(name=>({name,defaultValue:{targetLufs:-16,ceiling:0.95}[name]||0,automationRate:'k-rate'}));}
 constructor(){super();this.power=0;this.level=1;}
 process(inputs,outputs,p){const input=inputs[0],out=outputs[0];if(!input.length)return true;const count=out[0].length,follow=1-Math.exp(-1/(sampleRate*0.15));
 for(let i=0;i<count;i++){let energy=0;for(let c=0;c<input.length;c++)energy+=(input[c][i]||0)**2;this.power+=follow*(energy/input.length-this.power);const rms=Math.sqrt(this.power);const target=10**((p.targetLufs[0]+0.7)/20);let gain=p.normalize[0]&&rms>0.0001?Math.min(4,target/Math.max(rms,0.0001)):1;
 if(p.denoise[0]){const reduction=10**(-p.noiseDb[0]/20);gain*=reduction+(1-reduction)*Math.min(1,Math.max(0,(rms-0.001)/0.008));}if(!p.denoise[0]&&!p.normalize[0])this.level=1;else this.level+=0.002*(gain-this.level);
 for(let c=0;c<out.length;c++){let v=(input[Math.min(c,input.length-1)]?.[i]||0)*this.level;if(p.limiter[0])v=Math.max(-p.ceiling[0],Math.min(p.ceiling[0],v));out[c][i]=v;}}
 return true;
 }
}
registerProcessor('lqtac-audition',LqtacAudition);
