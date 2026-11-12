// Point/region tracker: zero-mean SAD template matching on grey frames, coarse (step 2) then fine (step 1) search,
// parabolic sub-pixel refinement and a slowly adapting template. Pure, synchronous; used inside a worker thread.
function integral(frame,W,H){const I=new Float64Array((W+1)*(H+1));for(let y=0;y<H;y++){let row=0;for(let x=0;x<W;x++){row+=frame[y*W+x];I[(y+1)*(W+1)+x+1]=I[y*(W+1)+x+1]+row;}}return I;}
function mean(I,W,x,y,w,h){const s=I[(y+h)*(W+1)+x+w]-I[y*(W+1)+x+w]-I[(y+h)*(W+1)+x]+I[y*(W+1)+x];return s/(w*h);}
function createTracker(W,H,box){
  const w=Math.max(8,Math.min(W-2,Math.round(box.w))),h=Math.max(8,Math.min(H-2,Math.round(box.h)));let cx=box.x+box.w/2,cy=box.y+box.h/2,template=null,tMean=0,first=null;
  const clampX=x=>Math.max(0,Math.min(W-w,x)),clampY=y=>Math.max(0,Math.min(H-h,y));
  function grab(frame,x,y){const t=new Float32Array(w*h);let s=0;for(let j=0;j<h;j++)for(let i=0;i<w;i++){const v=frame[(y+j)*W+x+i];t[j*w+i]=v;s+=v;}return {t,m:s/(w*h)};}
  function sad(frame,I,x,y,step){const m=mean(I,W,x,y,w,h);let s=0,n=0;for(let j=0;j<h;j+=step){const row=(y+j)*W+x,tr=j*w;for(let i=0;i<w;i+=step){s+=Math.abs(frame[row+i]-m-(template[tr+i]-tMean));n++;}}return s/n;}
  return {
    start(frame){const x=clampX(Math.round(cx-w/2)),y=clampY(Math.round(cy-h/2));const g=grab(frame,x,y);template=g.t;tMean=g.m;first={t:Float32Array.from(g.t),m:g.m};return {x:(x+w/2)/W,y:(y+h/2)/H,score:0};},
    next(frame){
      const I=integral(frame,W,H),R=Math.max(12,Math.round(Math.max(w,h)*.8)),x0=Math.round(cx-w/2),y0=Math.round(cy-h/2);let best=Infinity,bx=x0,by=y0;
      for(let dy=-R;dy<=R;dy+=2)for(let dx=-R;dx<=R;dx+=2){const x=x0+dx,y=y0+dy;if(x<0||y<0||x>W-w||y>H-h)continue;const s=sad(frame,I,x,y,2);if(s<best){best=s;bx=x;by=y;}}
      let fine=Infinity,fx=bx,fy=by;const cost=new Map();
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=bx+dx,y=by+dy;if(x<0||y<0||x>W-w||y>H-h)continue;const s=sad(frame,I,x,y,1);cost.set(x+','+y,s);if(s<fine){fine=s;fx=x;fy=y;}}
      const at=(x,y)=>cost.get(x+','+y),para=(a,b,c)=>{const d=a-2*b+c;return d>1e-9?Math.max(-.5,Math.min(.5,(a-c)/(2*d))):0;};
      const sx=at(fx-1,fy)!==undefined&&at(fx+1,fy)!==undefined?para(at(fx-1,fy),fine,at(fx+1,fy)):0,sy=at(fx,fy-1)!==undefined&&at(fx,fy+1)!==undefined?para(at(fx,fy-1),fine,at(fx,fy+1)):0;
      cx=fx+sx+w/2;cy=fy+sy+h/2;
      // Adapt the template slowly while the match is good; keep a pull towards the first appearance to limit drift.
      if(fine<28){const g=grab(frame,fx,fy);for(let i=0;i<template.length;i++)template[i]=template[i]*.8+g.t[i]*.15+first.t[i]*.05;tMean=tMean*.8+g.m*.15+first.m*.05;}
      return {x:cx/W,y:cy/H,score:fine};
    }
  };
}
module.exports={createTracker,integral};
