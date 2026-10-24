(function(root){
  function source(){return `class LQTACPCM extends AudioWorkletProcessor {
    constructor(){super();this.recording=false;this.buffer=new Float32Array(4096);this.used=0;this.frames=0;this.port.onmessage=event=>{if(event.data.type==='start'){this.used=0;this.frames=0;this.recording=true;}if(event.data.type==='stop'||event.data.type==='abort'){this.recording=false;if(event.data.type==='stop')this.flush();else this.used=0;this.port.postMessage({type:'stopped',frames:this.frames});}};}
    flush(){if(!this.used)return;const data=this.buffer.slice(0,this.used);this.frames+=this.used;this.used=0;this.port.postMessage({type:'samples',data:data.buffer,frames:this.frames},[data.buffer]);}
    process(inputs,outputs){if(!this.recording)return true;const channels=inputs[0];if(!channels||!channels.length)return true;for(let i=0;i<channels[0].length;i++){let value=0;for(const channel of channels)value+=Number.isFinite(channel[i])?channel[i]:0;this.buffer[this.used++]=value/channels.length;if(this.used===this.buffer.length)this.flush();}return true;}
  }registerProcessor('lqtac-pcm',LQTACPCM);`;}
  if(typeof module==='object'&&module.exports)module.exports={source};else root.LQTACMicrophonePCM={source};
})(typeof window==='undefined'?globalThis:window);
