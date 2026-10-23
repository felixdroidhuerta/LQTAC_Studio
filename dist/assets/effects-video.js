// Original LQTAC shader. Shared by preview and captured export frames.
(function(){
  let instance;const validated=new WeakSet();
  class VideoEffects {
    constructor(){
      this.canvas=document.createElement('canvas');const gl=this.gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL no está disponible para los efectos');
      const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
      const vertex=shader(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=(p+1.)*.5;gl_Position=vec4(p,0.,1.);}');
      const fragment=shader(gl.FRAGMENT_SHADER,`precision highp float;varying vec2 uv;uniform sampler2D image,lut;uniform vec2 pixel;uniform float brightness,contrast,saturation,temperature,blur,sharpen,vignette,lutSize,tolerance,softness;uniform vec3 keyColor;uniform bool chroma;
        uniform float clock,crt,crtCurve,crtLines,vhs,vhsNoise,glitch,glitchSpeed,glow,glowRadius,glowThreshold,bloom,bloomRadius,bloomThreshold,film,filmGrain,filmScratches;
        float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
        vec3 highlights(vec2 p,float threshold){vec4 s=texture2D(image,clamp(p,0.,1.));float y=dot(s.rgb,vec3(.2126,.7152,.0722));return s.rgb*s.a*smoothstep(threshold,min(1.,threshold+.15)+.001,y);}
        vec3 halo(vec2 p,float radius,float threshold){vec2 d=pixel*radius;return (highlights(p,threshold)*2.+highlights(p+vec2(d.x,0.),threshold)+highlights(p-vec2(d.x,0.),threshold)+highlights(p+vec2(0.,d.y),threshold)+highlights(p-vec2(0.,d.y),threshold)+highlights(p+d*.7,threshold)+highlights(p-d*.7,threshold)+highlights(p+d*vec2(.7,-.7),threshold)+highlights(p+d*vec2(-.7,.7),threshold))/10.;}
        vec4 base(vec2 p){if(blur<.01)return texture2D(image,p);vec2 d=pixel*blur;return (texture2D(image,p)*4.+texture2D(image,p+d*vec2(1.,0.))*2.+texture2D(image,p-d*vec2(1.,0.))*2.+texture2D(image,p+d*vec2(0.,1.))*2.+texture2D(image,p-d*vec2(0.,1.))*2.+texture2D(image,p+d)+texture2D(image,p-d)+texture2D(image,p+d*vec2(1.,-1.))+texture2D(image,p+d*vec2(-1.,1.)))/16.;}
        vec3 lookup(vec3 c){float n=lutSize;vec3 q=clamp(c,0.,1.)*(n-1.);float z=floor(q.b),z1=min(n-1.,z+1.);vec2 a=vec2((q.r+z*n+.5)/(n*n),(q.g+.5)/n),b=vec2((q.r+z1*n+.5)/(n*n),(q.g+.5)/n);return mix(texture2D(lut,a).rgb,texture2D(lut,b).rgb,fract(q.b));}
        void main(){vec2 p=uv;float frame=floor(clock*24.);float edge=1.;
          if(crt>0.){vec2 q=p-.5;p=.5+q*(1.+crt*crtCurve*dot(q,q)*.6);edge=step(0.,p.x)*step(p.x,1.)*step(0.,p.y)*step(p.y,1.);}
          if(vhs>0.){p.x+=vhs*.006*sin(p.y*80.+clock*13.);float band=1.-smoothstep(.0,.025,abs(p.y-fract(clock*.17)));p.x+=band*vhs*.035*sin(clock*19.);}
          float tick=floor(clock*glitchSpeed),row=floor(p.y*18.);float gate=step(.68,noise(vec2(row,tick)));if(glitch>0.)p.x+=(noise(vec2(row+7.,tick))-.5)*.22*glitch*gate;
          vec4 s=base(clamp(p,0.,1.));vec3 c=s.rgb;if(sharpen>0.)c+=sharpen*(4.*s.rgb-base(p+vec2(pixel.x,0.)).rgb-base(p-vec2(pixel.x,0.)).rgb-base(p+vec2(0.,pixel.y)).rgb-base(p-vec2(0.,pixel.y)).rgb);
          if(vhs>0.||glitch>0.){float shift=vhs*.004+glitch*.018;vec3 split=vec3(texture2D(image,clamp(p+vec2(shift,0.),0.,1.)).r,c.g,texture2D(image,clamp(p-vec2(shift,0.),0.,1.)).b);c=mix(c,split,clamp(vhs+glitch,0.,1.));}
          c=(c-.5)*contrast+.5+brightness;c+=vec3(temperature*.12,0.,-temperature*.12);float y=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(y),c,saturation);if(lutSize>1.)c=lookup(c);
          if(glow>0.){vec3 light=halo(p,glowRadius,glowThreshold);c=1.-(1.-clamp(c,0.,1.))*(1.-clamp(light*glow,0.,1.));}
          if(bloom>0.)c+=bloom*(halo(p,bloomRadius,bloomThreshold)*.65+halo(p,bloomRadius*.4,bloomThreshold)*.35);
          if(crt>0.){float scan=.5+.5*sin(uv.y/pixel.y*3.14159265);c*=1.-crt*crtLines*scan*.45;c*=1.-crt*.18*smoothstep(.2,.7,length(uv-.5));c*=1.+crt*.025*sin(clock*55.);}
          if(vhs>0.)c+=(noise(floor(uv/pixel)+frame)-.5)*vhs*vhsNoise*.3;
          if(film>0.){float y=dot(c,vec3(.299,.587,.114));c=mix(c,vec3(y*1.12,y*.98,y*.78),film*.8);c+=(noise(floor(uv/pixel)+frame*3.)-.5)*film*filmGrain*.28;float scratchX=noise(vec2(floor(clock*8.),3.));float scratch=(1.-smoothstep(.0,.0015,abs(uv.x-scratchX)))*step(.3,noise(vec2(frame,4.)));c+=scratch*film*filmScratches*.7;c*=1.-film*.08*noise(vec2(frame,9.));}
          c*=1.-vignette*smoothstep(.2,.72,length(uv-.5));float alpha=s.a*edge;if(chroma)alpha*=smoothstep(tolerance,tolerance+softness,distance(clamp(c,0.,1.),keyColor));gl_FragColor=vec4(clamp(c,0.,1.),alpha);}`);
      this.program=gl.createProgram();gl.attachShader(this.program,vertex);gl.attachShader(this.program,fragment);gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.deleteShader(vertex);gl.deleteShader(fragment);gl.useProgram(this.program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const location=gl.getAttribLocation(this.program,'p');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
      this.textures=[0,1].map(()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;});
      gl.uniform1i(gl.getUniformLocation(this.program,'image'),0);gl.uniform1i(gl.getUniformLocation(this.program,'lut'),1);
    }
    draw(source,input,time=0){
      const f={...LQTACEffects.videoDefaults,...input},gl=this.gl,w=source.videoWidth||source.width,h=source.videoHeight||source.height;
      if(!w||!h)return source;if(w>gl.getParameter(gl.MAX_TEXTURE_SIZE)||h>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw Error('Fuente demasiado grande para efectos GPU');
      this.canvas.width=w;this.canvas.height=h;gl.viewport(0,0,w,h);gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.textures[0]);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      gl.uniform2f(gl.getUniformLocation(this.program,'pixel'),1/w,1/h);
      for(const k of ['brightness','contrast','saturation','temperature','blur','sharpen','vignette'])gl.uniform1f(gl.getUniformLocation(this.program,k),f[k]);
      gl.uniform1f(gl.getUniformLocation(this.program,'clock'),Math.max(0,Number.isFinite(time)?time:0));
      for(const [,,fields] of LQTACEffects.creative)for(const [k] of fields)gl.uniform1f(gl.getUniformLocation(this.program,k),f[k]);
      gl.uniform1i(gl.getUniformLocation(this.program,'chroma'),f.chroma?1:0);gl.uniform1f(gl.getUniformLocation(this.program,'tolerance'),f.chromaTolerance);gl.uniform1f(gl.getUniformLocation(this.program,'softness'),f.chromaSoftness);
      const rgb=f.chromaColor.slice(1).match(/../g).map(x=>parseInt(x,16)/255);gl.uniform3f(gl.getUniformLocation(this.program,'keyColor'),...rgb);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.textures[1]);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      if(f.lut){if(this.lastLut!==f.lut){const n=f.lut.size,data=new Uint8Array(n**3*4);for(let b=0;b<n;b++)for(let g=0;g<n;g++)for(let r=0;r<n;r++){const src=(r+g*n+b*n*n)*3,dst=(r+b*n+g*n*n)*4;data[dst]=Math.round(f.lut.values[src]*255);data[dst+1]=Math.round(f.lut.values[src+1]*255);data[dst+2]=Math.round(f.lut.values[src+2]*255);data[dst+3]=255;}gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,n*n,n,0,gl.RGBA,gl.UNSIGNED_BYTE,data);this.lastLut=f.lut;}gl.uniform1f(gl.getUniformLocation(this.program,'lutSize'),f.lut.size);}
      else{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));this.lastLut=null;gl.uniform1f(gl.getUniformLocation(this.program,'lutSize'),0);}
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);if(gl.getError()!==gl.NO_ERROR)throw Error('Error de GPU al aplicar efectos');return this.canvas;
    }
  }
  window.LQTACVideoEffects={draw(source,fx,time=0){if(!fx?.enabled)return source;if(!validated.has(fx)){LQTACEffects.validate(fx,'video');validated.add(fx);}if(!instance)instance=new VideoEffects();return instance.draw(source,LQTACEffects.at(fx,time),time);}};
})();
