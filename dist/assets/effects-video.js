// Original LQTAC shader. Shared by preview and captured export frames.
(function(){
  let instance;const validated=new WeakSet();
  class VideoEffects {
    constructor(){
      this.canvas=document.createElement('canvas');const gl=this.gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL no está disponible para los efectos');
      const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
      const vertex=shader(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=(p+1.)*.5;gl_Position=vec4(p,0.,1.);}');
      const fragment=shader(gl.FRAGMENT_SHADER,`precision highp float;varying vec2 uv;uniform sampler2D image,lut;uniform vec2 pixel;uniform float brightness,contrast,saturation,temperature,blur,sharpen,vignette,lutSize,tolerance,softness;uniform vec3 keyColor;uniform bool chroma;
        vec4 base(vec2 p){if(blur<.01)return texture2D(image,p);vec2 d=pixel*blur;return (texture2D(image,p)*4.+texture2D(image,p+d*vec2(1.,0.))*2.+texture2D(image,p-d*vec2(1.,0.))*2.+texture2D(image,p+d*vec2(0.,1.))*2.+texture2D(image,p-d*vec2(0.,1.))*2.+texture2D(image,p+d)+texture2D(image,p-d)+texture2D(image,p+d*vec2(1.,-1.))+texture2D(image,p+d*vec2(-1.,1.)))/16.;}
        vec3 lookup(vec3 c){float n=lutSize;vec3 q=clamp(c,0.,1.)*(n-1.);float z=floor(q.b),z1=min(n-1.,z+1.);vec2 a=vec2((q.r+z*n+.5)/(n*n),(q.g+.5)/n),b=vec2((q.r+z1*n+.5)/(n*n),(q.g+.5)/n);return mix(texture2D(lut,a).rgb,texture2D(lut,b).rgb,fract(q.b));}
        void main(){vec4 s=base(uv);vec3 c=s.rgb;if(sharpen>0.)c+=sharpen*(4.*s.rgb-base(uv+vec2(pixel.x,0.)).rgb-base(uv-vec2(pixel.x,0.)).rgb-base(uv+vec2(0.,pixel.y)).rgb-base(uv-vec2(0.,pixel.y)).rgb);
          c=(c-.5)*contrast+.5+brightness;c+=vec3(temperature*.12,0.,-temperature*.12);float y=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(y),c,saturation);if(lutSize>1.)c=lookup(c);
          c*=1.-vignette*smoothstep(.2,.72,length(uv-.5));float alpha=s.a;if(chroma)alpha*=smoothstep(tolerance,tolerance+softness,distance(clamp(c,0.,1.),keyColor));gl_FragColor=vec4(clamp(c,0.,1.),alpha);}`);
      this.program=gl.createProgram();gl.attachShader(this.program,vertex);gl.attachShader(this.program,fragment);gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.deleteShader(vertex);gl.deleteShader(fragment);gl.useProgram(this.program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const location=gl.getAttribLocation(this.program,'p');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
      this.textures=[0,1].map(()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;});
      gl.uniform1i(gl.getUniformLocation(this.program,'image'),0);gl.uniform1i(gl.getUniformLocation(this.program,'lut'),1);
    }
    draw(source,input){
      const f={...LQTACEffects.videoDefaults,...input},gl=this.gl,w=source.videoWidth||source.width,h=source.videoHeight||source.height;
      if(!w||!h)return source;if(w>gl.getParameter(gl.MAX_TEXTURE_SIZE)||h>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw Error('Fuente demasiado grande para efectos GPU');
      this.canvas.width=w;this.canvas.height=h;gl.viewport(0,0,w,h);gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.textures[0]);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      gl.uniform2f(gl.getUniformLocation(this.program,'pixel'),1/w,1/h);
      for(const k of ['brightness','contrast','saturation','temperature','blur','sharpen','vignette'])gl.uniform1f(gl.getUniformLocation(this.program,k),f[k]);
      gl.uniform1i(gl.getUniformLocation(this.program,'chroma'),f.chroma?1:0);gl.uniform1f(gl.getUniformLocation(this.program,'tolerance'),f.chromaTolerance);gl.uniform1f(gl.getUniformLocation(this.program,'softness'),f.chromaSoftness);
      const rgb=f.chromaColor.slice(1).match(/../g).map(x=>parseInt(x,16)/255);gl.uniform3f(gl.getUniformLocation(this.program,'keyColor'),...rgb);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.textures[1]);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      if(f.lut){if(this.lastLut!==f.lut){const n=f.lut.size,data=new Uint8Array(n**3*4);for(let b=0;b<n;b++)for(let g=0;g<n;g++)for(let r=0;r<n;r++){const src=(r+g*n+b*n*n)*3,dst=(r+b*n+g*n*n)*4;data[dst]=Math.round(f.lut.values[src]*255);data[dst+1]=Math.round(f.lut.values[src+1]*255);data[dst+2]=Math.round(f.lut.values[src+2]*255);data[dst+3]=255;}gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,n*n,n,0,gl.RGBA,gl.UNSIGNED_BYTE,data);this.lastLut=f.lut;}gl.uniform1f(gl.getUniformLocation(this.program,'lutSize'),f.lut.size);}
      else{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));this.lastLut=null;gl.uniform1f(gl.getUniformLocation(this.program,'lutSize'),0);}
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);if(gl.getError()!==gl.NO_ERROR)throw Error('Error de GPU al aplicar efectos');return this.canvas;
    }
  }
  window.LQTACVideoEffects={draw(source,fx,time=0){if(!fx?.enabled)return source;if(!validated.has(fx)){LQTACEffects.validate(fx,'video');validated.add(fx);}if(!instance)instance=new VideoEffects();return instance.draw(source,LQTACEffects.at(fx,time));}};
})();
