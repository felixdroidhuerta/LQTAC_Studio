// Translation lookup shared by the window (i18n.js) and the main process (desktop/i18n-main.cjs).
// Spanish source → target language, or null when the dictionary has nothing for it. Rules, in order:
// exact text · "✓ " marks kept · numbers through {0} templates · {*} free-text templates (names, paths, phrases; each
// captured part is translated again) · "Prefijo: detalle" errors (prefix translated, detail kept) · Electron's
// "Error invoking remote method '…': Error: " prefix removed.
(function(root){
  const NUMBER=/\d+(?:[.,:]\d+)*/g,escape=s=>s.replace(/[.*+?^$()|[\]\\]/g,'\\$&');
  function create(){
    const dictionaries={},patterns={},missing=new Set();
    function add(code,dict){const d=dictionaries[code]||(dictionaries[code]={}),list=patterns[code]||(patterns[code]=[]);
      for(const [k,v] of Object.entries(dict||{})){if(typeof v!=='string'||!v)continue;d[k]=v;
        if(!k.includes('{*}'))continue;const literal=k.replace(/\{\*\}|\{\d+\}/g,'');if((literal.match(/\p{L}/gu)||[]).length<6)continue;   // too generic to be safe
        const order=[];const re=new RegExp('^'+k.split(/(\{\*\}|\{\d+\})/).map(part=>{if(part==='{*}'){order.push('*');return '(.*?)';}const m=part.match(/^\{(\d+)\}$/);if(m){order.push(Number(m[1]));return '(\\d+(?:[.,:]\\d+)*)';}return escape(part);}).join('')+'$');
        list.push({re,order,value:v,size:literal.length});}
      list.sort((a,b)=>b.size-a.size);}
    function lookup(source,code,depth=0){
      if(!code||code==='es'||depth>3)return null;const d=dictionaries[code];if(!d)return null;
      const text=source.replace(/\s+/g,' ').trim();if(!text||!/\p{L}/u.test(text))return null;
      let out=d[text];
      if(out===undefined){const ipc=text.match(/^Error invoking remote method '[^']+': (?:\w*Error: )?([\s\S]+)$/);if(ipc)out=lookup(ipc[1],code,depth+1)??ipc[1];}
      if(out===undefined&&/^[✓✔] /.test(text)){const rest=lookup(text.slice(2),code,depth+1);if(rest!==null)out=text.slice(0,2)+rest;}
      if(out===undefined&&/\d/.test(text)){const numbers=[];const key=text.replace(NUMBER,m=>{numbers.push(m);return '{'+(numbers.length-1)+'}';});const tpl=d[key];if(tpl!==undefined)out=tpl.replace(/\{(\d+)\}/g,(m,i)=>numbers[i]??m);}
      if(out===undefined)for(const {re,order,value} of patterns[code]||[]){const m=text.match(re);if(!m)continue;const free=[],numbers=[];order.forEach((o,i)=>{if(o==='*')free.push(m[i+1]);else numbers[o]=m[i+1];});
        let k=0;out=value.replace(/\{\*\}/g,()=>{const part=free[k++]??'';if(/^e?s$/.test(part))return '';return lookup(part,code,depth+1)??part;}).replace(/\{(\d+)\}/g,(x,i)=>numbers[i]??x);break;}
      if(out===undefined){const m=text.match(/^(.{4,120}?:)\s+(.+)$/);if(m&&d[m[1]]!==undefined)out=d[m[1]]+' '+(lookup(m[2],code,depth+1)??m[2]);}
      if(out===undefined){if(!depth&&text.length<300){let i=0;missing.add(text.replace(NUMBER,()=>'{'+(i++)+'}'));}return null;}
      if(text===source)return out;const lead=source.match(/^\s*/)[0],trail=source.match(/\s*$/)[0];return lead+out+trail;
    }
    return {add,lookup,dictionaries,missing};
  }
  const api={create};if(typeof module==='object'&&module.exports)module.exports=api;else root.LQTACI18nCore=api;
})(typeof window!=='undefined'?window:globalThis);
