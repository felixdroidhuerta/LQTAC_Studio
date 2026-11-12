// Original LQTAC shader. Shared by preview and captured export frames.
(function(){
  let instance;const validated=new WeakSet();
  class VideoEffects {
    constructor(){
      this.canvas=document.createElement('canvas');const gl=this.gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL no está disponible para los efectos');
      const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
      const vertex=shader(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=(p+1.)*.5;gl_Position=vec4(p,0.,1.);}');
      const fragment=shader(gl.FRAGMENT_SHADER,`precision highp float;varying vec2 uv;uniform sampler2D image,lut,matte,shape;uniform int shapeMode;uniform bool shapeInvert;uniform bool useMatte;uniform float protectAt,protectSoft;uniform vec2 pixel;uniform float brightness,contrast,saturation,temperature,blur,sharpen,vignette,lutSize,tolerance,softness;uniform vec3 keyColor;uniform bool chroma;
        uniform float clock,${LQTACEffects.creative.flatMap(e=>e[2].map(f=>f[0])).join(',')};
        float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
        vec3 highlights(vec2 p,float threshold){vec4 s=texture2D(image,clamp(p,0.,1.));float y=dot(s.rgb,vec3(.2126,.7152,.0722));return s.rgb*s.a*smoothstep(threshold,min(1.,threshold+.15)+.001,y);}
        vec3 halo(vec2 p,float radius,float threshold){vec2 d=pixel*radius;return (highlights(p,threshold)*2.+highlights(p+vec2(d.x,0.),threshold)+highlights(p-vec2(d.x,0.),threshold)+highlights(p+vec2(0.,d.y),threshold)+highlights(p-vec2(0.,d.y),threshold)+highlights(p+d*.7,threshold)+highlights(p-d*.7,threshold)+highlights(p+d*vec2(.7,-.7),threshold)+highlights(p+d*vec2(-.7,.7),threshold))/10.;}
        // Pack 1 · particles, light and distortion helpers (all procedural, deterministic in time).
        vec2 hash2(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
        vec3 hue(float h){return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);}
        vec4 particleLayer(vec2 uv,float L,int ty,float asp){
          float depth=1.-L*.28,cells=mix(5.,18.,particleDensity)*(1.+L*.7),t=clock*particleSpeed;vec2 vel=vec2(.03,.02);
          if(ty==0)vel=vec2(particleWind*.15,-.12);else if(ty==1)vel=vec2(particleWind*.35,-1.6);else if(ty==2)vel=vec2(particleWind*.2,.35);else if(ty==3)vel=vec2(particleWind*.05,.015);else if(ty==4)vel=vec2(particleWind*.15,-.2);else if(ty==5)vel=vec2(particleWind*.06,.14);else vel=vec2(particleWind*.03,.02);
          vel*=depth;vec2 q=vec2(uv.x*asp,uv.y)*cells-vel*t*cells,id=floor(q),f=fract(q)-.5,r=hash2(id+L*37.);
          if(r.x>.3+.6*particleDensity)return vec4(0.);
          vec2 c=(hash2(id+L*91.+3.)-.5)*.5;if(ty==0)c.x+=.18*sin(clock*1.3+r.y*6.28);if(ty==3)c+=.15*vec2(sin(clock*.7+r.y*9.),cos(clock*.5+r.x*7.));if(ty==5)c.x+=.12*sin(clock*2.+r.y*6.28);
          vec2 d=f-c;float rad=particleSize*(.5+r.y)*depth*.012*cells,a=0.;vec3 col=vec3(1.);
          if(ty==0){rad=min(rad,.4);a=smoothstep(rad,rad*.3,length(d));}
          else if(ty==1){float w=min(rad*.25,.08),h=min(rad*6.,.45);d.x+=d.y*particleWind*.25;a=smoothstep(w,0.,abs(d.x))*smoothstep(h,0.,abs(d.y))*.85;col=vec3(.8,.88,1.);}
          else if(ty==2){rad=min(rad*1.1,.3);float tw=.65+.35*sin(clock*23.+r.y*40.);a=min(1.,exp(-length(d)/max(rad*.3,.001))*1.4)*tw;a=max(a,smoothstep(rad*.35,0.,abs(d.x))*clamp(1.+d.y/(rad*5.),0.,1.)*step(d.y,0.)*.7*tw);col=vec3(1.,.66,.25);}
          else if(ty==3){rad=min(rad*.5,.3);a=smoothstep(rad,0.,length(d))*.55*(.6+.4*sin(clock*2.+r.x*30.));col=vec3(1.,.95,.85);}
          else if(ty==4){rad=min(rad*1.2,.35);float ang=clock*3.*(r.x-.5)*2.+r.y*6.28;vec2 e=vec2(d.x*cos(ang)-d.y*sin(ang),d.x*sin(ang)+d.y*cos(ang));a=step(abs(e.x),rad)*step(abs(e.y),rad*.45*(.4+.6*abs(sin(clock*4.+r.x*9.))));col=hue(fract(r.x*7.31));}
          else if(ty==5){rad=min(rad*1.6,.42);float l=length(d);a=min(1.,smoothstep(rad*.12,0.,abs(l-rad))*.8+smoothstep(rad*.3,0.,length(d-vec2(-rad*.4,rad*.4)))*.6);col=vec3(.85,.93,1.);}
          else{rad=min(rad*3.,.45);float l=length(d);if(r.x>.3+.3*particleDensity)return vec4(0.);a=smoothstep(rad,rad*.88,l)*.12+smoothstep(rad,rad*.3,l)*.05;col=mix(vec3(1.,.85,.6),vec3(.7,.85,1.),r.y);}
          return vec4(col*a,a);}
        vec4 particlesAt(vec2 uv){float asp=pixel.y/pixel.x;int ty=int(particleType+.5);vec4 acc=vec4(0.);for(int i=0;i<3;i++){vec4 l=particleLayer(uv,float(i),ty,asp);acc+=(1.-acc.a)*l;}return acc;}
        vec3 flareAt(vec2 uv){float asp=pixel.y/pixel.x,s=flareSize;vec2 f=vec2(flareX,1.-flareY),d=(uv-f)*vec2(asp,1.);vec3 tint=mix(vec3(1.,.72,.42),vec3(.55,.78,1.),flareHue);
          vec3 col=tint*(exp(-length(d)*20./s)*1.1+exp(-length(d)*4./s)*.18)+mix(vec3(1.),tint,.5)*exp(-abs(d.y)*90./s)*exp(-abs(d.x)*1.6/s)*.6;vec2 axis=vec2(.5)-f;
          for(int i=0;i<4;i++){float k=i==0?.5:i==1?1.1:i==2?1.45:2.1,rr=(i==0?.05:i==1?.09:i==2?.03:.14)*s;float l=length((uv-(f+axis*k*2.))*vec2(asp,1.));col+=(smoothstep(rr,rr*.7,l)*.1+smoothstep(rr,rr*.95,l)*.06)*hue(fract(.08+float(i)*.21+flareHue*.4))*.8;}
          return col;}
        vec3 raysAt(vec2 uv){vec2 o=vec2(raysX,1.-raysY),st=(o-uv)*raysLength/32.,q=uv;vec3 sum=vec3(0.);float w=1.;for(int i=0;i<32;i++){sum+=highlights(q,raysThreshold)*w;w*=.96;q+=st;}return sum/21.3;}
        vec3 leakAt(vec2 uv){float t=clock*leakSpeed,asp=pixel.y/pixel.x;vec3 a=mix(vec3(1.,.55,.15),vec3(1.,.25,.55),leakHue),b=mix(vec3(1.,.8,.35),vec3(.7,.3,1.),leakHue);
          vec2 p1=vec2(.15+.25*sin(t*.7),.75+.2*cos(t*.5)),p2=vec2(.85+.15*cos(t*.6+1.),.3+.25*sin(t*.8+2.));
          return a*exp(-pow(length((uv-p1)*vec2(asp,1.))*2.2,2.))+b*exp(-pow(length((uv-p2)*vec2(asp,1.))*2.6,2.))+a*smoothstep(.55,1.,abs(uv.x-.5)*2.)*.5*(.5+.5*sin(t*1.3));}
        vec2 mirrored(vec2 p){int m=int(mirrorMode+.5);float asp=pixel.y/pixel.x;
          if(m==0)p.x=p.x<.5?p.x:1.-p.x;else if(m==1)p.y=p.y>.5?p.y:1.-p.y;else if(m==2){p.x=p.x<.5?p.x:1.-p.x;p.y=p.y>.5?p.y:1.-p.y;}
          else{vec2 q=(p-.5)*vec2(asp,1.);float r=length(q),seg=6.2831853/floor(mirrorSegments+.5),a=mod(atan(q.y,q.x)+mirrorRotate*6.2831853,seg);a=abs(a-seg*.5);p=r*vec2(cos(a),sin(a))/vec2(asp,1.)+.5;p=1.-abs(1.-mod(p,2.));}
          return p;}
        vec4 base(vec2 p){if(blur<.01)return texture2D(image,p);vec2 d=pixel*blur;return (texture2D(image,p)*4.+texture2D(image,p+d*vec2(1.,0.))*2.+texture2D(image,p-d*vec2(1.,0.))*2.+texture2D(image,p+d*vec2(0.,1.))*2.+texture2D(image,p-d*vec2(0.,1.))*2.+texture2D(image,p+d)+texture2D(image,p-d)+texture2D(image,p+d*vec2(1.,-1.))+texture2D(image,p+d*vec2(-1.,1.)))/16.;}
        vec3 lookup(vec3 c){float n=lutSize;vec3 q=clamp(c,0.,1.)*(n-1.);float z=floor(q.b),z1=min(n-1.,z+1.);vec2 a=vec2((q.r+z*n+.5)/(n*n),(q.g+.5)/n),b=vec2((q.r+z1*n+.5)/(n*n),(q.g+.5)/n);return mix(texture2D(lut,a).rgb,texture2D(lut,b).rgb,fract(q.b));}
        void main(){vec2 p=uv;float frame=floor(clock*24.);float edge=1.;float asp=pixel.y/pixel.x,lightA=0.;
          if(fisheye!=0.){vec2 q=(p-.5)*vec2(asp,1.);q*=1.-fisheye*.5*max(0.,1.-dot(q,q)/(.25*asp*asp+.25));p=q/vec2(asp,1.)+.5;}
          if(swirl!=0.){vec2 cc=vec2(swirlX,1.-swirlY),q=(p-cc)*vec2(asp,1.);float r=length(q);if(r<swirlRadius){float a=swirl*6.2831853*pow(1.-r/swirlRadius,2.);q=vec2(q.x*cos(a)-q.y*sin(a),q.x*sin(a)+q.y*cos(a));p=q/vec2(asp,1.)+cc;}}
          if(ripple>0.){vec2 cc=vec2(rippleX,1.-rippleY),q=(p-cc)*vec2(asp,1.);float r=length(q);if(r>.0001)p+=(q/r)*(ripple*.025*sin(r*rippleFreq*6.2831853-clock*rippleSpeed*6.2831853)/(1.+r*3.))/vec2(asp,1.);}
          if(heat>0.){p.x+=heat*.008*sin(p.y*heatScale*6.2831853+clock*heatSpeed*5.+sin(p.x*heatScale*2.));p.y+=heat*.005*sin(p.x*heatScale*4.+clock*heatSpeed*3.7);}
          
          if(crt>0.){vec2 q=p-.5;p=.5+q*(1.+crt*crtCurve*dot(q,q)*.6);edge=step(0.,p.x)*step(p.x,1.)*step(0.,p.y)*step(p.y,1.);}
          if(vhs>0.){p.x+=vhs*.006*sin(p.y*80.+clock*13.);float band=1.-smoothstep(.0,.025,abs(p.y-fract(clock*.17)));p.x+=band*vhs*.035*sin(clock*19.);}
          float tick=floor(clock*glitchSpeed),row=floor(p.y*18.);float gate=step(.68,noise(vec2(row,tick)));if(glitch>0.)p.x+=(noise(vec2(row+7.,tick))-.5)*.22*glitch*gate;
          vec4 s=base(clamp(p,0.,1.));if(mirror>0.)s=mix(s,base(clamp(mirrored(p),0.,1.)),mirror);vec3 c=s.rgb;if(sharpen>0.)c+=sharpen*(4.*s.rgb-base(p+vec2(pixel.x,0.)).rgb-base(p-vec2(pixel.x,0.)).rgb-base(p+vec2(0.,pixel.y)).rgb-base(p-vec2(0.,pixel.y)).rgb);
          if(vhs>0.||glitch>0.){float shift=vhs*.004+glitch*.018;vec3 split=vec3(texture2D(image,clamp(p+vec2(shift,0.),0.,1.)).r,c.g,texture2D(image,clamp(p-vec2(shift,0.),0.,1.)).b);c=mix(c,split,clamp(vhs+glitch,0.,1.));}
          c=(c-.5)*contrast+.5+brightness;c+=vec3(temperature*.12,0.,-temperature*.12);float y=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(y),c,saturation);if(lutSize>1.)c=lookup(c);
          if(glow>0.){vec3 light=halo(p,glowRadius,glowThreshold);c=1.-(1.-clamp(c,0.,1.))*(1.-clamp(light*glow,0.,1.));}
          if(bloom>0.)c+=bloom*(halo(p,bloomRadius,bloomThreshold)*.65+halo(p,bloomRadius*.4,bloomThreshold)*.35);
          if(flare>0.){vec3 fl=flare*flareAt(uv);c+=fl;lightA=max(lightA,clamp(max(fl.r,max(fl.g,fl.b)),0.,1.));}
          if(rays>0.){vec3 ry=clamp(rays*raysAt(p)*.7,0.,1.);c=1.-(1.-clamp(c,0.,1.))*(1.-ry);lightA=max(lightA,clamp(max(ry.r,max(ry.g,ry.b)),0.,1.));}
          if(leak>0.){vec3 lk=clamp(leakAt(uv)*leak,0.,1.);c=1.-(1.-clamp(c,0.,1.))*(1.-lk);lightA=max(lightA,max(lk.r,max(lk.g,lk.b))*.8);}
          if(flicker>0.){float k=clock*flickerSpeed;c*=1.-flicker*.45*mix(noise(vec2(floor(k),11.)),noise(vec2(floor(k)+1.,11.)),fract(k));}
          if(crt>0.){float scan=.5+.5*sin(uv.y/pixel.y*3.14159265);c*=1.-crt*crtLines*scan*.45;c*=1.-crt*.18*smoothstep(.2,.7,length(uv-.5));c*=1.+crt*.025*sin(clock*55.);}
          if(vhs>0.)c+=(noise(floor(uv/pixel)+frame)-.5)*vhs*vhsNoise*.3;
          if(film>0.){float y=dot(c,vec3(.299,.587,.114));c=mix(c,vec3(y*1.12,y*.98,y*.78),film*.8);c+=(noise(floor(uv/pixel)+frame*3.)-.5)*film*filmGrain*.28;float scratchX=noise(vec2(floor(clock*8.),3.));float scratch=(1.-smoothstep(.0,.0015,abs(uv.x-scratchX)))*step(.3,noise(vec2(frame,4.)));c+=scratch*film*filmScratches*.7;c*=1.-film*.08*noise(vec2(frame,9.));}
          c*=1.-vignette*smoothstep(.2,.72,length(uv-.5));float alpha=s.a*edge;if(chroma){float keep=smoothstep(tolerance,tolerance+softness,distance(clamp(c,0.,1.),keyColor));if(useMatte){float m=texture2D(matte,uv).r;keep=max(keep,smoothstep(protectAt-protectSoft,protectAt+protectSoft,m));}alpha*=keep;}alpha=max(alpha,lightA);if(particles>0.){vec4 pa=clamp(particlesAt(uv)*particles,0.,1.);int pty=int(particleType+.5);if(pty==2||pty==6){c=clamp(c,0.,1.)+pa.rgb;alpha=max(alpha,pa.a);}else{float oa=pa.a+alpha*(1.-pa.a);c=(pa.rgb+clamp(c,0.,1.)*alpha*(1.-pa.a))/max(oa,.0001);alpha=oa;}}if(shapeMode>0){float m=texture2D(shape,uv).a;if(shapeInvert)m=1.-m;if(shapeMode==1)alpha*=m;else{vec4 o=texture2D(image,uv);c=mix(o.rgb,clamp(c,0.,1.),m);alpha=mix(o.a,alpha,m);}}gl_FragColor=vec4(clamp(c,0.,1.),alpha);}`);
      this.program=gl.createProgram();gl.attachShader(this.program,vertex);gl.attachShader(this.program,fragment);gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.deleteShader(vertex);gl.deleteShader(fragment);gl.useProgram(this.program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const location=gl.getAttribLocation(this.program,'p');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
      this.textures=[0,1,2].map(()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;});
      gl.uniform1i(gl.getUniformLocation(this.program,'image'),0);gl.uniform1i(gl.getUniformLocation(this.program,'lut'),1);gl.uniform1i(gl.getUniformLocation(this.program,'matte'),2);gl.uniform1i(gl.getUniformLocation(this.program,'shape'),6);
    }
    // Echo / motion blur: the effect pass renders into a texture and is combined with a per-source history (ping-pong framebuffers).
    // History restarts on seeks (time going back or jumping more than 0.3 s); repeated draws at the same time do not accumulate.
    target(w,h){const gl=this.gl,make=()=>{const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);const fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);gl.bindFramebuffer(gl.FRAMEBUFFER,null);return {tex,fb};};return make;}
    echoSetup(){if(this.echoProgram)return;const gl=this.gl,shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
      const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=(p+1.)*.5;gl_Position=vec4(p,0.,1.);}'));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,'precision highp float;varying vec2 uv;uniform sampler2D cur,hist;uniform float decay;uniform int mode;void main(){vec4 c=texture2D(cur,uv),h=texture2D(hist,uv);gl_FragColor=mode==2?c:mode==1?mix(c,h,decay):max(c,h*decay);}'));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));this.echoProgram=p;this.echoHistory=new Map();}
    echo(source,f,time,w,h){const gl=this.gl,prog=this.echoProgram,make=this.target(w,h);let st=this.echoHistory.get(source);
      if(!st||st.w!==w||st.h!==h){if(st)for(const x of [st.a,st.b])gl.deleteTexture(x.tex),gl.deleteFramebuffer(x.fb);st={a:make(),b:make(),w,h,last:-1e9};this.echoHistory.delete(source);this.echoHistory.set(source,st);if(this.echoHistory.size>6){const [k,old]=this.echoHistory.entries().next().value;for(const x of [old.a,old.b])gl.deleteTexture(x.tex),gl.deleteFramebuffer(x.fb);this.echoHistory.delete(k);}}
      const dt=time-st.last,reset=dt<-1e-4||dt>.3,same=Math.abs(dt)<=1e-6;gl.useProgram(prog);const loc=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,this.cur.tex);gl.uniform1i(gl.getUniformLocation(prog,'cur'),3);gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,st.a.tex);gl.uniform1i(gl.getUniformLocation(prog,'hist'),4);
      gl.uniform1f(gl.getUniformLocation(prog,'decay'),f.echo);gl.uniform1i(gl.getUniformLocation(prog,'mode'),reset?2:Math.round(f.echoMode)===1?1:0);gl.bindFramebuffer(gl.FRAMEBUFFER,st.b.fb);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,st.b.tex);gl.uniform1i(gl.getUniformLocation(prog,'mode'),2);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      if(!same){[st.a,st.b]=[st.b,st.a];st.last=time;}gl.useProgram(this.program);}
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
      // Chroma zone: person matte protects the subject; the key only acts outside it.
      let matte=null;if(f.chroma&&window.LQTACAiMatte){if(f.chromaZone==='people')matte=LQTACAiMatte.personMask(source,time,f.chromaMatteModel);else if(f.chromaZone==='pro')matte=LQTACAiMatte.proMask(f,time);}this.matteUsed=!!matte;
      gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.textures[2]);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      if(matte)gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,matte.width,matte.height,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,matte.data);else gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,1,1,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,new Uint8Array([0]));
      gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.uniform1i(gl.getUniformLocation(this.program,'useMatte'),matte?1:0);
      const polygon=f.shapeMask?LQTACEffects.maskAt(f.shapeMask,time):null;gl.uniform1i(gl.getUniformLocation(this.program,'shapeMode'),polygon?(f.shapeMask.mode==='cut'?1:2):0);gl.uniform1i(gl.getUniformLocation(this.program,'shapeInvert'),polygon&&f.shapeMask.invert?1:0);
      if(polygon){if(!this.shapeTex){this.shapeTex=gl.createTexture();gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,this.shapeTex);for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);this.shapeCanvas=document.createElement('canvas');}
        const sc=this.shapeCanvas,sw=Math.max(2,Math.round(w/2)),sh=Math.max(2,Math.round(h/2));sc.width=sw;sc.height=sh;const g2=sc.getContext('2d');g2.clearRect(0,0,sw,sh);g2.filter=f.shapeMask.feather>0?'blur('+(f.shapeMask.feather*sh).toFixed(2)+'px)':'none';g2.fillStyle='#fff';g2.beginPath();polygon.forEach(([x,y],i)=>i?g2.lineTo(x*sw,y*sh):g2.moveTo(x*sw,y*sh));g2.closePath();g2.fill();
        gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,this.shapeTex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,sc);}gl.uniform1f(gl.getUniformLocation(this.program,'protectAt'),f.chromaProtect);gl.uniform1f(gl.getUniformLocation(this.program,'protectSoft'),f.chromaMatteSoftness);
      const echo=f.echo>0;if(echo){this.echoSetup();if(!this.cur||this.cur.w!==w||this.cur.h!==h){if(this.cur){gl.deleteTexture(this.cur.tex);gl.deleteFramebuffer(this.cur.fb);}this.cur={...this.target(w,h)(),w,h};}gl.bindFramebuffer(gl.FRAMEBUFFER,this.cur.fb);}
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);if(echo){gl.bindFramebuffer(gl.FRAMEBUFFER,null);this.echo(source,f,time,w,h);}if(gl.getError()!==gl.NO_ERROR)throw Error('Error de GPU al aplicar efectos');return this.canvas;
    }
  }
  window.LQTACVideoEffects={get matteUsed(){return !!instance?.matteUsed;},draw(source,fx,time=0){if(!fx?.enabled)return source;if(!validated.has(fx)){LQTACEffects.validate(fx,'video');validated.add(fx);}if(!instance)instance=new VideoEffects();return instance.draw(source,LQTACEffects.at(fx,time),time);}};
})();
