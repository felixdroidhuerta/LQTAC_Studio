// Local WebGL adapter for the vendored GL Transitions shaders.
(() => {
  const catalog = [
    {id:'fade',name:'Fundido',description:'Mezcla gradual entre los dos vídeos.'},
    {id:'wipeLeft',name:'Barrido izquierda',description:'El siguiente vídeo entra desde la derecha.'},
    {id:'wipeRight',name:'Barrido derecha',description:'El siguiente vídeo entra desde la izquierda.'},
    {id:'circleopen',name:'Apertura circular',description:'Un círculo revela el siguiente vídeo.'},
    {id:'pixelize',name:'Pixelado',description:'Pixelado progresivo y fundido.'},
    {id:'crosswarp',name:'Zoom deformado',description:'Los vídeos se deforman y acercan durante el cambio.'},
    {id:'lumaMask',name:'Máscara personalizada',description:'Usa tu imagen: las zonas claras revelan primero el vídeo.'}
  ];
  // Original LQTAC luminance mask transition. Black and white endpoints are exact.
  window.LQTACTransitionShaders.lumaMask=`
    uniform sampler2D maskTexture;uniform float maskSoftness;uniform bool maskInvert;
    uniform int maskMotion;uniform float maskAmount;
    vec4 transition(vec2 uv){
      if(progress<=0.)return getFromColor(uv);
      if(progress>=1.)return getToColor(uv);
      vec2 p=uv;float amount=maskAmount;
      if(maskMotion==1) {float scale=mix(1.,1.+amount*3.,progress);p=(uv-.5)/scale+.5;}
      if(maskMotion==2) {float scale=mix(1.+amount*3.,1.,progress);p=(uv-.5)/scale+.5;}
      if(maskMotion==3)p.x-=mix(-amount,amount,progress);
      if(maskMotion==4)p.x+=mix(-amount,amount,progress);
      if(maskMotion==5)p.y+=mix(-amount,amount,progress);
      if(maskMotion==6)p.y-=mix(-amount,amount,progress);
      if(maskMotion==7)p+=vec2(sin(progress*125.6637),cos(progress*169.646))*amount*.12*sin(progress*3.14159265);
      // Samples outside a moved mask use its outer background, never a tiled logo.
      vec4 pixel=texture2D(maskTexture,clamp(p,0.,1.));
      float luminance=dot(pixel.rgb,vec3(.2126,.7152,.0722))*pixel.a;
      if(maskInvert)luminance=1.-luminance;
      float threshold=1.-luminance;
      float softness=max(.0001,maskSoftness);
      float edge=progress*(1.+2.*softness)-softness;
      float reveal=smoothstep(threshold-softness,threshold+softness,edge);
      return mix(getFromColor(uv),getToColor(uv),reveal);
    }`;
  const blurredMasks=new WeakMap();
  const prepareMask=(image,blur=0)=>{
    blur=Math.max(0,Math.min(50,Number(blur)||0));
    if(!blur)return image;
    let cache=blurredMasks.get(image);
    if(!cache){cache=new Map();blurredMasks.set(image,cache);}
    if(cache.has(blur))return cache.get(blur);
    const originalWidth=image.naturalWidth||image.width,originalHeight=image.naturalHeight||image.height;
    const scale=Math.min(1,1024/Math.max(originalWidth,originalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(originalWidth*scale));canvas.height=Math.max(1,Math.round(originalHeight*scale));
    const ctx=canvas.getContext('2d');
    // Pad by repeating edge pixels so blur never adds an unintended dark frame.
    const pad=Math.ceil(blur*3), padded=document.createElement('canvas');padded.width=canvas.width+pad*2;padded.height=canvas.height+pad*2;
    const pc=padded.getContext('2d'),w=canvas.width,h=canvas.height;
    pc.drawImage(image,pad,pad,w,h);
    pc.drawImage(image,0,0,originalWidth,1,pad,0,w,pad);pc.drawImage(image,0,originalHeight-1,originalWidth,1,pad,pad+h,w,pad);
    pc.drawImage(image,0,0,1,originalHeight,0,pad,pad,h);pc.drawImage(image,originalWidth-1,0,1,originalHeight,pad+w,pad,pad,h);
    for(const [sx,sy,dx,dy] of [[0,0,0,0],[originalWidth-1,0,pad+w,0],[0,originalHeight-1,0,pad+h],[originalWidth-1,originalHeight-1,pad+w,pad+h]])pc.drawImage(image,sx,sy,1,1,dx,dy,pad,pad);
    ctx.filter=`blur(${blur}px)`;ctx.drawImage(padded,-pad,-pad);
    if(cache.size>=2)cache.delete(cache.keys().next().value);cache.set(blur,canvas);return canvas;
  };
  class Renderer {
    constructor(canvas) {
      this.canvas=canvas;
      const gl=this.gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
      if(!gl) throw new Error('WebGL no está disponible');
      this.programs=new Map();
      this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      this.textures=[0,1,2].map(()=>{
        const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        return texture;
      });
    }
    program(id) {
      if(this.programs.has(id)) return this.programs.get(id);
      const gl=this.gl;
      const compile=(type,source)=>{
        const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(error);}
        return shader;
      };
      const vertex=compile(gl.VERTEX_SHADER,'attribute vec2 position; varying vec2 uv; void main(){uv=(position+1.0)*0.5;gl_Position=vec4(position,0.,1.);}');
      const fragment=compile(gl.FRAGMENT_SHADER,`precision highp float;
        varying vec2 uv;uniform sampler2D fromTexture;uniform sampler2D toTexture;
        uniform float progress;uniform float ratio;uniform float fromRatio;uniform float toRatio;uniform float fromOpacity;uniform float toOpacity;
        vec4 contained(sampler2D image,vec2 p,float sourceRatio){
          vec2 scale=vec2(max(1.,ratio/sourceRatio),max(1.,sourceRatio/ratio));
          p=(p-.5)*scale+.5;
          if(p.x<0.||p.x>1.||p.y<0.||p.y>1.)return vec4(0.,0.,0.,1.);
          return texture2D(image,p);
        }
        vec4 getFromColor(vec2 p){vec4 c=contained(fromTexture,p,fromRatio);c.a*=fromOpacity;return c;}
        vec4 getToColor(vec2 p){vec4 c=contained(toTexture,p,toRatio);c.a*=toOpacity;return c;}
        ${window.LQTACTransitionShaders[id]}
        void main(){gl_FragColor=transition(uv);}`);
      const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
      gl.deleteShader(vertex);gl.deleteShader(fragment);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      this.programs.set(id,program);return program;
    }
    draw(id,from,to,progress,options={}) {
      const gl=this.gl, program=this.program(id);
      gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
      const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      [from,to].forEach((source,index)=>{
        gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,this.textures[index]);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      });
      gl.uniform1i(gl.getUniformLocation(program,'fromTexture'),0);gl.uniform1i(gl.getUniformLocation(program,'toTexture'),1);
      gl.uniform1f(gl.getUniformLocation(program,'progress'),Math.max(0,Math.min(1,progress)));
      gl.uniform1f(gl.getUniformLocation(program,'fromOpacity'),options.fromOpacity??1);gl.uniform1f(gl.getUniformLocation(program,'toOpacity'),options.toOpacity??1);
      gl.uniform1f(gl.getUniformLocation(program,'ratio'),this.canvas.width/this.canvas.height);
      const aspect=source=>(source.videoWidth||source.width)/(source.videoHeight||source.height);
      gl.uniform1f(gl.getUniformLocation(program,'fromRatio'),aspect(from));gl.uniform1f(gl.getUniformLocation(program,'toRatio'),aspect(to));
      gl.uniform1f(gl.getUniformLocation(program,'smoothness'),.3);gl.uniform1i(gl.getUniformLocation(program,'opening'),1);
      gl.uniform2i(gl.getUniformLocation(program,'squaresMin'),20,20);gl.uniform1i(gl.getUniformLocation(program,'steps'),50);
      if(id==='lumaMask') {
        if(!options.image) throw new Error('Carga una imagen de máscara');
        gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.textures[2]);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,prepareMask(options.image,options.blur));
        gl.uniform1i(gl.getUniformLocation(program,'maskTexture'),2);
        gl.uniform1f(gl.getUniformLocation(program,'maskSoftness'),Number(options.softness ?? 0));
        gl.uniform1i(gl.getUniformLocation(program,'maskInvert'),options.invert?1:0);
        gl.uniform1i(gl.getUniformLocation(program,'maskMotion'),['none','zoomIn','zoomOut','left','right','up','down','shake'].indexOf(options.motion||'none'));
        gl.uniform1f(gl.getUniformLocation(program,'maskAmount'),Math.max(0,Math.min(1,Number(options.amount??.5))));
      }
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }
    dispose() {
      this.programs.forEach(program=>this.gl.deleteProgram(program));this.textures.forEach(texture=>this.gl.deleteTexture(texture));
      this.gl.deleteBuffer(this.buffer);this.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }
  window.LQTACTransitions={catalog,Renderer,prepareMask};
})();
