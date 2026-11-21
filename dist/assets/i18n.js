// Interface language. Spanish stays the source text in the code; this layer translates what the window shows
// (text nodes, title / aria-label / placeholder, document title, alert/confirm/prompt messages) from per-language
// dictionaries (dist/assets/i18n/<lang>.js). Numbers are matched through templates: "8 elementos" uses the key
// "{0} elementos". Changes are live: switching language re-translates the page from the remembered Spanish source,
// so the open project is kept. Missing strings stay in Spanish and are collected in LQTACI18n.missing.
(function(){
  const KEY='lqtac.prefs',LANGS={es:'Español',en:'English',fr:'Français',zh:'中文（简体）',ja:'日本語'};
  let lang='es';try{const p=JSON.parse(localStorage.getItem(KEY)||'{}');if(p&&LANGS[p.language])lang=p.language;}catch{}
  const SKIP='script,style,textarea,[contenteditable=""],[contenteditable=true],.clip,#projectName,.system-font-picker,#genFont,#subFont,[data-i18n-skip]',ATTRS=['title','aria-label','placeholder'];
  // Lookup rules live in i18n-core.js, shared with the main process (native dialogs).
  const core=window.LQTACI18nCore.create(),{dictionaries,missing}=core;
  function add(code,dict){core.add(code,dict);if(code===lang&&ready)translateAll();}
  // Spanish source → current language (null when there is nothing to change).
  const lookup=(source,code=lang)=>core.lookup(source,code);
  function t(text){if(typeof text!=='string')return text;return lookup(text)??text;}
  const texts=new WeakMap(),attrs=new WeakMap();
  // The code compares texts and labels in Spanish ("Herramientas", title="Ajustes"…). Reading them returns the
  // Spanish source while the screen shows the translation: getters for data/nodeValue/textContent, getAttribute and
  // the title/ariaLabel/placeholder properties. Writes are untouched and get translated by the observer.
  const native={data:Object.getOwnPropertyDescriptor(CharacterData.prototype,'data'),nodeValue:Object.getOwnPropertyDescriptor(Node.prototype,'nodeValue'),textContent:Object.getOwnPropertyDescriptor(Node.prototype,'textContent'),getAttribute:Element.prototype.getAttribute};
  const raw=node=>native.data.get.call(node);
  const sourceOf=node=>{const value=raw(node),known=texts.get(node);return known&&value===known.out?known.source:value;};
  Object.defineProperty(CharacterData.prototype,'data',{...native.data,get(){return lang==='es'?native.data.get.call(this):sourceOf(this);}});
  Object.defineProperty(Node.prototype,'nodeValue',{...native.nodeValue,get(){return lang!=='es'&&this.nodeType===3?sourceOf(this):native.nodeValue.get.call(this);}});
  Object.defineProperty(Node.prototype,'textContent',{...native.textContent,get(){
    if(lang==='es'||this.nodeType===9)return native.textContent.get.call(this);if(this.nodeType===3)return sourceOf(this);
    if(this.nodeType!==1&&this.nodeType!==11)return native.textContent.get.call(this);
    let out='';const walker=document.createTreeWalker(this,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode()))out+=sourceOf(n);return out;}});
  function sourceAttr(el,name,value){const known=attrs.get(el)?.[name];return known&&value===known.out?known.source:value;}
  Element.prototype.getAttribute=function(name){const value=native.getAttribute.call(this,name);return lang==='es'||value===null||!ATTRS.includes(String(name).toLowerCase())?value:sourceAttr(this,String(name).toLowerCase(),value);};
  for(const [proto,prop,name] of [[HTMLElement.prototype,'title','title'],[Element.prototype,'ariaLabel','aria-label'],[HTMLInputElement.prototype,'placeholder','placeholder'],[HTMLTextAreaElement.prototype,'placeholder','placeholder']]){const d=Object.getOwnPropertyDescriptor(proto,prop);if(!d?.get)continue;Object.defineProperty(proto,prop,{...d,get(){const value=d.get.call(this);return lang==='es'||value==null?value:sourceAttr(this,name,value);}});}
  const skipped=el=>!el||!!el.closest?.(SKIP);
  function textNode(node){
    const value=raw(node),known=texts.get(node);let source=value;if(known&&value===known.out)source=known.source;
    const out=lookup(source)??source;texts.set(node,{source,out});if(value!==out)native.data.set.call(node,out);
  }
  function attribute(el,name){
    const value=native.getAttribute.call(el,name);if(value===null)return;let map=attrs.get(el);if(!map)attrs.set(el,map={});const known=map[name];
    let source=value;if(known&&value===known.out)source=known.source;const out=lookup(source)??source;map[name]={source,out};if(value!==out)el.setAttribute(name,out);
  }
  function translateTree(root){
    if(!root)return;if(root.nodeType===3){if(!skipped(root.parentElement))textNode(root);return;}if(root.nodeType!==1||skipped(root))return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,{acceptNode:n=>n.nodeType===1&&n.matches(SKIP)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
    let n=root;do{if(n.nodeType===3)textNode(n);else for(const a of ATTRS)if(n.hasAttribute(a))attribute(n,a);}while((n=walker.nextNode()));
  }
  let titleSource=null;
  function translateAll(){if(!ready)return;translateTree(document.body);if(titleSource===null)titleSource=document.title;document.title=lookup(titleSource)??titleSource;}
  new MutationObserver(records=>{for(const r of records){
    if(!ready)return;
    if(r.type==='characterData'){if(!skipped(r.target.parentElement)){const known=texts.get(r.target);if(!known||raw(r.target)!==known.out)textNode(r.target);}}
    else if(r.type==='attributes'){if(!skipped(r.target)){const known=attrs.get(r.target)?.[r.attributeName];if(!known||native.getAttribute.call(r.target,r.attributeName)!==known.out)attribute(r.target,r.attributeName);}}
    else for(const n of r.addedNodes)translateTree(n);
  }}).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  let ready=false;document.addEventListener('DOMContentLoaded',()=>{ready=true;translateAll();});
  // Native message boxes from the page.
  for(const name of ['alert','confirm','prompt']){const original=window[name].bind(window);window[name]=(message,...rest)=>original(t(String(message??'')),...rest);}
  function set(code){if(!LANGS[code])return;void window.lqtacDesktop?.setLanguage?.(code);if(code===lang)return;lang=code;document.documentElement.lang=code;translateAll();window.dispatchEvent(new Event('lqtac-language'));}
  void window.lqtacDesktop?.setLanguage?.(lang);   // native dialogs of the main process follow the window
  // Chinese and Japanese: Windows UI fonts for those scripts (the interface font has no CJK glyphs), no extra tracking.
  const cjk=document.createElement('style');cjk.textContent=`html[lang=zh] body,html[lang=zh] button,html[lang=zh] input,html[lang=zh] select{font-family:Inter,"Microsoft YaHei UI","Microsoft YaHei","Segoe UI",sans-serif}
html[lang=ja] body,html[lang=ja] button,html[lang=ja] input,html[lang=ja] select{font-family:Inter,"Yu Gothic UI","Meiryo UI",Meiryo,"Segoe UI",sans-serif}
html[lang=zh] *,html[lang=ja] *{letter-spacing:normal!important}`;document.head.append(cjk);
  document.documentElement.lang=lang;
  window.LQTACI18n={add,t,set,get current(){return lang;},languages:LANGS,missing,dictionaries};
})();
