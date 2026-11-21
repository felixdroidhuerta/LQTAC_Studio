// Light / dark appearance. The interface was designed dark; the light theme is derived from it by remapping every
// colour in the page's style sheets (lightness inverted, backgrounds turned into light greys and blues, text into
// anthracite) instead of keeping a second copy of each style. Content is left as it is: the monitor and its overlays,
// timeline clips (thumbnails, waveforms), previews and dialog backdrops keep their original colours.
// Loaded in <head>, right after the main style sheet, so the first paint already uses the chosen theme.
(function(){
  const KEY='lqtac.prefs';
  let theme='dark';try{const p=JSON.parse(localStorage.getItem(KEY)||'{}');if(p&&p.theme==='light')theme='light';}catch{}
  // Selectors whose colours are content, not interface.
  const KEEP=/(monitor-screen|preview-media|::backdrop|subtitle-overlay|safe-overlay|snap-guide|frame-title|frame-label|clip-visual|clip-fade|checker|stage|swatch|scope)|(^|[\s>+~,(])\.clip(?=$|[.:\[\s>+~,)])/;
  const SHADOW=/^(box-shadow|text-shadow|filter|-webkit-box-shadow)$/;
  const saved=new Map();let processed=new WeakSet();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function hsl(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2;let h=0,s=0;if(max!==min){const d=max-min;s=l>.5?d/(2-max-min):d/(max+min);h=max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4;h/=6;}return [h,s,l];}
  function rgb(h,s,l){if(!s){const v=Math.round(l*255);return [v,v,v];}const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q,f=t=>{t=(t%1+1)%1;return t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p;};return [f(h+1/3),f(h),f(h-1/3)].map(v=>Math.round(v*255));}
  // Dark-theme colour → light-theme colour.
  function light(r,g,b){
    let [h,s,l]=hsl(r,g,b);let L=1-l,S=s;
    if(L>.6){L=.83+(L-.6)/.4*.16;S=Math.min(s,.5)*.55;}            // dark surfaces → light greys / pale blues
    else if(L<.4){L=.12+L/.4*.24;S=s>.6?s*.85:Math.min(s,.5);}       // light text and accents → anthracite / deep accents
    return rgb(h,S,clamp(L,0,1));
  }
  const hex=v=>v.length===3||v.length===4?v.split('').map(c=>parseInt(c+c,16)):[0,2,4,6].slice(0,v.length/2).map(i=>parseInt(v.slice(i,i+2),16));
  function remap(value,prop){
    const shadow=SHADOW.test(prop);
    const out=(r,g,b,a)=>{if(shadow&&r+g+b<90)return null;const [R,G,B]=light(r,g,b);return a===undefined||a>=1?`rgb(${R}, ${G}, ${B})`:`rgba(${R}, ${G}, ${B}, ${a})`;};
    return value.replace(/#([0-9a-fA-F]{3,8})\b|rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)|\b(white|black)\b/g,(m,h,r,g,b,a,name)=>{
      if(h){if(![3,4,6,8].includes(h.length))return m;const c=hex(h),alpha=c.length===4?c[3]/255:undefined;return out(c[0],c[1],c[2],alpha)??m;}
      if(name){if(/^(font|grid|transition|animation|content)/.test(prop))return m;return out(...(name==='white'?[255,255,255]:[0,0,0]))??m;}
      let A=a===undefined?undefined:a.endsWith('%')?parseFloat(a)/100:Number(a);return out(Number(r),Number(g),Number(b),A)??m;});
  }
  function walk(rules){
    for(const rule of rules){
      if(rule.cssRules&&!rule.style){walk(rule.cssRules);continue;}
      if(!rule.style||(rule.selectorText&&KEEP.test(rule.selectorText)))continue;
      const style=rule.style,changes=[];
      for(let i=0;i<style.length;i++){const prop=style[i],value=style.getPropertyValue(prop);if(!/#|rgb|white|black/.test(value))continue;const next=remap(value,prop);if(next!==value)changes.push([prop,value,next,style.getPropertyPriority(prop)]);}
      if(!changes.length)continue;const before={};
      for(const [prop,value,next,priority] of changes){before[prop]=[value,priority];style.setProperty(prop,next,priority);}
      saved.set(style,before);
    }
  }
  // Inline styles written by scripts (dialogs built with style.cssText…), except inside content areas.
  const KEEP_ELEMENT='.monitor-screen,.clip,canvas,video,img,.safe-overlay,.snap-guide,[data-theme-keep]',inline=new Map();
  function remapDeclarations(text){return text.split(';').map(part=>{const i=part.indexOf(':');if(i<0)return part;const prop=part.slice(0,i).trim().toLowerCase();return part.slice(0,i+1)+remap(part.slice(i+1),prop);}).join(';');}
  function fixInline(el){
    if(theme!=='light'||el.nodeType!==1)return;const value=el.getAttribute('style');if(!value||!/#|rgb|white|black/.test(value))return;
    const known=inline.get(el);if(known&&known.written===value)return;if(el.closest(KEEP_ELEMENT))return;
    const next=remapDeclarations(value);inline.set(el,{original:value,written:next});if(next!==value)el.setAttribute('style',next);
  }
  function scanInline(root=document){if(theme!=='light')return;if(root.nodeType===1&&root.hasAttribute('style'))fixInline(root);root.querySelectorAll?.('[style]').forEach(fixInline);}
  function scan(){if(theme!=='light')return;for(const sheet of document.styleSheets){if(processed.has(sheet))continue;processed.add(sheet);try{walk(sheet.cssRules);}catch{}}}
  function restore(){for(const [style,before] of saved)for(const [prop,[value,priority]] of Object.entries(before))style.setProperty(prop,value,priority);saved.clear();processed=new WeakSet();
    for(const [el,{original,written}] of inline)if(el.isConnected&&el.getAttribute('style')===written)el.setAttribute('style',original);inline.clear();}
  function mark(){document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;}
  let pending=0;const later=()=>{if(!pending)pending=requestAnimationFrame(()=>{pending=0;scan();});};
  new MutationObserver(records=>{if(theme!=='light')return;let sheets=false;
    for(const r of records){if(r.type==='attributes'){fixInline(r.target);continue;}if(r.target.nodeName==='STYLE')sheets=true;for(const n of r.addedNodes){if(n.nodeName==='STYLE'||n.nodeName==='LINK')sheets=true;else if(n.nodeType===1)scanInline(n);}}
    if(sheets)later();}).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style']});
  mark();scan();scanInline();
  window.LQTACTheme={get current(){return theme;},set(next){next=next==='light'?'light':'dark';if(next===theme)return;theme=next;if(theme==='dark')restore();mark();scan();scanInline();window.dispatchEvent(new Event('lqtac-theme'));},remap,light};
})();
