// Motion path («Trayectoria»): an anchor point of the clip layer (the «zona de peso») follows a
// Bézier route at uniform speed and the layer turns around that point. Shared by preview, export,
// persistence and MCP. Deterministic: the pose at a time never depends on previously drawn frames.
(function(root){
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const keys=new Set(['version','enabled','anchor','nodes','start','end','easing','orient','forward','angleOffset','inertia','scale','scaleEnd','loop']);
  const nodeKeys=new Set(['x','y','in','out','mode']);
  const orients=['path','flip','none'],easings=['Linear','Fast','Slow','Smooth','Sharp'];
  const defaults={version:1,enabled:true,anchor:{x:.5,y:.5},nodes:[],start:0,end:1,easing:'Linear',orient:'path',forward:0,angleOffset:0,inertia:.35,scale:1,scaleEnd:null,loop:false};
  const SAMPLES=64,FLIP_BAND=Math.sin(8*Math.PI/180);

  function ease(type,p){p=clamp(p,0,1);switch(type){case 'Fast':return 1-(1-p)**2;case 'Slow':return p*p;case 'Smooth':return p*p*(3-2*p);case 'Sharp':return ((2*p-1)**3+1)/2;default:return p;}}
  const finite=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
  const point=(p,a,b)=>p&&typeof p==='object'&&!Array.isArray(p)&&Object.keys(p).every(k=>k==='x'||k==='y')&&finite(p.x,a,b)&&finite(p.y,a,b);

  // Throws a Spanish message for anything outside the documented limits. null/undefined = no path.
  function validate(m){
    if(m===null||m===undefined)return;
    const bad=detail=>{throw Error('Trayectoria no válida: '+detail);};
    if(typeof m!=='object'||Array.isArray(m))bad('debe ser un objeto');
    for(const k of Object.keys(m))if(!keys.has(k))bad('propiedad desconocida '+k);
    if(m.version!==undefined&&m.version!==1)bad('versión');
    if(m.enabled!==undefined&&typeof m.enabled!=='boolean')bad('enabled');
    if(m.anchor!==undefined&&!point(m.anchor,0,1))bad('anchor debe tener x e y entre 0 y 1');
    if(!Array.isArray(m.nodes)||m.nodes.length<2||m.nodes.length>200)bad('nodes necesita de 2 a 200 nodos');
    for(const n of m.nodes){
      if(!n||typeof n!=='object'||Object.keys(n).some(k=>!nodeKeys.has(k)))bad('nodo');
      if(!finite(n.x,-2,3)||!finite(n.y,-2,3))bad('coordenadas de nodo entre -2 y 3');
      for(const h of ['in','out'])if(n[h]!==undefined&&n[h]!==null&&!point(n[h],-4,5))bad('tirador '+h);
      if(n.mode!==undefined&&!['smooth','corner'].includes(n.mode))bad('mode del nodo');
    }
    if(!finite(m.start,-604800,604800)||!finite(m.end,-604800,604800)||m.end-m.start<.05)bad('start/end (tramo mínimo 0,05 s)');
    if(m.easing!==undefined&&!easings.includes(m.easing))bad('easing');
    if(m.orient!==undefined&&!orients.includes(m.orient))bad('orient');
    if(m.forward!==undefined&&!finite(m.forward,-360,360))bad('forward');
    if(m.angleOffset!==undefined&&!finite(m.angleOffset,-180,180))bad('angleOffset');
    if(m.inertia!==undefined&&!finite(m.inertia,0,1))bad('inertia');
    if(m.scale!==undefined&&!finite(m.scale,.01,10))bad('scale');
    if(m.scaleEnd!==undefined&&m.scaleEnd!==null&&!finite(m.scaleEnd,.01,10))bad('scaleEnd');
    if(m.loop!==undefined&&typeof m.loop!=='boolean')bad('loop');
  }
  const normalize=m=>({...defaults,...m,anchor:{...defaults.anchor,...(m.anchor||{})}});

  // Arc-length table in project pixels, cached per route and frame size.
  const cache=new Map();
  function table(nodes,w,h){
    const key=w+'x'+h+':'+JSON.stringify(nodes);let t=cache.get(key);if(t)return t;
    const P=p=>({x:p.x*w,y:p.y*h}),segs=[];
    for(let i=0;i<nodes.length-1;i++){const a=nodes[i],b=nodes[i+1];segs.push([P(a),P(a.out||a),P(b.in||b),P(b)]);}
    const length=[0],seg=[0],u=[0];let total=0,prev=bez(segs[0],0);
    segs.forEach((s,i)=>{for(let k=1;k<=SAMPLES;k++){const q=bez(s,k/SAMPLES);total+=Math.hypot(q.x-prev.x,q.y-prev.y);prev=q;length.push(total);seg.push(i);u.push(k/SAMPLES);}});
    t={segs,length,seg,u,total};
    // Facing (right/left) along the route with a dead band around vertical, used by orient 'flip'.
    let facing=Math.cos(tangentAngle(t,0))<-FLIP_BAND?-1:1;t.facing=length.map((_,k)=>{const v=deriv(segs[seg[k]],u[k]),c=v.x/Math.hypot(v.x,v.y);if(c>FLIP_BAND)facing=1;else if(c<-FLIP_BAND)facing=-1;return facing;});
    if(cache.size>64)cache.delete(cache.keys().next().value);cache.set(key,t);return t;
  }
  function bez([a,b,c,d],s){const r=1-s;return {x:r*r*r*a.x+3*r*r*s*b.x+3*r*s*s*c.x+s*s*s*d.x,y:r*r*r*a.y+3*r*r*s*b.y+3*r*s*s*c.y+s*s*s*d.y};}
  function deriv(sg,s){const [a,b,c,d]=sg,r=1-s;let x=3*r*r*(b.x-a.x)+6*r*s*(c.x-b.x)+3*s*s*(d.x-c.x),y=3*r*r*(b.y-a.y)+6*r*s*(c.y-b.y)+3*s*s*(d.y-c.y);
    if(Math.hypot(x,y)<1e-9){const p=bez(sg,clamp(s-.001,0,1)),q=bez(sg,clamp(s+.001,0,1));x=q.x-p.x;y=q.y-p.y;}
    if(Math.hypot(x,y)<1e-9){x=d.x-a.x;y=d.y-a.y;}return {x,y};}
  function locate(t,d){d=clamp(d,0,t.total);const L=t.length;let lo=0,hi=L.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(L[m]<=d)lo=m;else hi=m;}
    const f=L[hi]>L[lo]?(d-L[lo])/(L[hi]-L[lo]):0,i=t.seg[hi],u0=t.seg[lo]===i?t.u[lo]:0;return {index:f<.5?lo:hi,seg:i,u:u0+(t.u[hi]-u0)*f};}
  function positionAt(t,d){if(d<0||d>t.total){const end=d<0?0:t.total,a=tangentAngle(t,end),p=positionAt(t,end),e=d-end;return {x:p.x+Math.cos(a)*e,y:p.y+Math.sin(a)*e};}const l=locate(t,d);return bez(t.segs[l.seg],l.u);}
  function tangentAngle(t,d){const l=locate(t,d),v=deriv(t.segs[l.seg],l.u);return Math.atan2(v.y,v.x);}

  // Pose at clip-local time `time` on a w×h frame: anchor position (px), rotation (rad), mirror and scale.
  function at(motion,time,w,h){
    const m=normalize(motion),t=table(m.nodes,w,h),span=m.end-m.start;
    let p=(time-m.start)/span;p=m.loop&&p>0?(p%1||(p>=1?1:0)):clamp(p,0,1);
    const progress=ease(m.easing,p),d=progress*t.total,pos=positionAt(t,d);
    // The body trails the head: orientation is the chord from the point a body-length behind on the route.
    const body=m.inertia*.3*h;let angle;
    if(body<1)angle=tangentAngle(t,d);else{const back=positionAt(t,d-body);angle=Math.hypot(pos.x-back.x,pos.y-back.y)>1e-6?Math.atan2(pos.y-back.y,pos.x-back.x):tangentAngle(t,d);}
    const F=m.forward*Math.PI/180,off=m.angleOffset*Math.PI/180;let rotation=0,flipX=false;
    if(m.orient==='path')rotation=angle-F+off;
    else if(m.orient==='flip'){flipX=t.facing[locate(t,d).index]<0;rotation=flipX?angle-Math.PI+F-off:angle-F+off;}
    const scale=m.scale+((m.scaleEnd??m.scale)-m.scale)*progress;
    return {x:pos.x,y:pos.y,rotation,flipX,scale,anchor:m.anchor,progress,length:t.total};
  }

  // Draws a full-frame layer (already cropped/effected) so that its anchor lands on the route.
  function draw(ctx,layer,w,h,motion,time){
    const s=at(motion,time,w,h);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.rotation);ctx.scale(s.scale*(s.flipX?-1:1),s.scale);ctx.translate(-s.anchor.x*w,-s.anchor.y*h);ctx.drawImage(layer,0,0,w,h);ctx.restore();return s;
  }

  // Editing helpers: times are clip-local seconds, like Pan/Crop.
  const shift=(m,delta)=>m&&{...m,start:m.start-delta,end:m.end-delta};
  const stretch=(m,scale)=>m&&{...m,start:m.start*scale,end:m.end*scale};

  const api={defaults,orients,easings,validate,normalize,at,draw,shift,stretch,ease};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.LQTACMotion=api;
})(typeof window==='undefined'?globalThis:window);
