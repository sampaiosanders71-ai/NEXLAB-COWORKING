(function(){
  'use strict';
  const BUILD=window.__NEXLAB_BUILD_IDENTITY__||Object.freeze({version:'0.26.82',release:'Beta',revision:'beta-0-26-82-google-calendar-integracao',generatedAt:"2026-11-01T02:08:39Z",cacheName:'nexlab-app-beta-0-26-82-correcoes-recuperacao-auditoria-20260928T022407Z',pwa:{identity:{id:'./nexlab-pwa',name:'NexLab',scope:'./',startUrl:'./?source=pwa',worker:'./nexlab-sw.js?pwa=nexlab-identity-v2-20260926',workerPath:'nexlab-sw.js',namespace:'nexlab-pwa-v2'}}});
  const CURRENT={version:String(BUILD.version||''),release:String(BUILD.release||''),revision:String(BUILD.revision||''),generatedAt:String(BUILD.generatedAt||'')};
  const HEAD_URL='./release-head.json';
  const PWA_IDENTITY=BUILD.pwa?.identity||Object.freeze({id:'./nexlab-pwa',name:'NexLab',scope:'./',startUrl:'./?source=pwa',worker:'./nexlab-sw.js',workerPath:'nexlab-sw.js',namespace:'nexlab-pwa-v2'});
  const WORKER_URL=String(PWA_IDENTITY.worker||'./nexlab-sw.js');
  const WORKER_SCOPE=String(PWA_IDENTITY.scope||'./');
  const EXPECTED_SCOPE_URL=new URL(WORKER_SCOPE,document.baseURI).href;
  const EXPECTED_WORKER_PATH=new URL(String(PWA_IDENTITY.workerPath||'nexlab-sw.js'),document.baseURI).pathname;
  const CHECK_INTERVAL_MS=15*60*1000;
  const VISIBILITY_MIN_INTERVAL_MS=2*60*1000;
  const MESSAGE_TIMEOUT_MS=5000;
  const ACTIVATE_TIMEOUT_MS=30000;
  const DEFERRED_KEY='nexlab:update-deferred-revision';
  if(window.__NEXLAB_UPDATE_MANAGER__?.revision===CURRENT.revision)return;

  let started=false,intervalId=null,initialTimer=null,checking=null,applying=false,reloading=false,lastCheckMs=0;
  let observedRegistration=null,updateFoundHandler=null,banner=null,bannerText=null,bannerNow=null;
  const state={...CURRENT,status:'idle',updateAvailable:false,remoteVersion:null,remoteRelease:null,remoteRevision:null,remoteGeneratedAt:null,workerRevision:null,checkedAt:null,error:null,protocol:2};
  const dispatch=(name,detail)=>{try{window.dispatchEvent(new CustomEvent(name,{detail}));}catch{}};
  const withTimeout=(promise,ms,message)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(message)),ms);Promise.resolve(promise).then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});
  function id(value){if(!value||typeof value!=='object')return null;return{version:String(value.version||'').trim(),release:String(value.release||'').trim(),revision:String(value.revision||'').trim(),generatedAt:String(value.generatedAt||value.generated_at||'').trim(),cache:String(value.cache||'').trim(),protocol:Number(value.protocol||value.update_protocol||0)||0};}
  function newer(value){const remote=id(value);if(!remote?.revision)return false;const rt=Date.parse(remote.generatedAt||''),ct=Date.parse(CURRENT.generatedAt||'');if(remote.revision===CURRENT.revision)return Number.isFinite(rt)&&Number.isFinite(ct)&&rt>ct;if(Number.isFinite(rt)&&Number.isFinite(ct))return rt>ct;return remote.revision!==CURRENT.revision;}
  function buildKey(value){const remote=id(value);return remote?.revision?`${remote.revision}@${remote.generatedAt||''}`:'';}
  function deferred(){try{return sessionStorage.getItem(DEFERRED_KEY)||'';}catch{return '';}}
  function clearDeferred(){try{sessionStorage.removeItem(DEFERRED_KEY);}catch{}}
  const UPDATE_INTERFACE_CSS="#nexlab-update-notice{position:fixed;inset:0;margin:auto;padding:0;width:min(620px,calc(100% - 32px));max-width:calc(100% - 32px);max-height:calc(var(--nu-height,100dvh) - 32px);border:1px solid #cbd9e9;border-radius:22px;background:#f4f7fc;color:#173450;box-shadow:0 26px 100px #02132d61;font:14px/1.6 system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;overflow:hidden;outline:none}\n#nexlab-update-notice:not([open]){display:none}\n#nexlab-update-notice[open]{display:flex;flex-direction:column}\n#nexlab-update-notice::backdrop{background:#061c37a8;backdrop-filter:blur(2px)}\n#nexlab-update-notice *{box-sizing:border-box}\n#nexlab-update-notice svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}\n#nexlab-update-notice button{font:inherit;cursor:pointer}\n#nexlab-update-notice button:focus-visible{outline:3px solid #ff941f;outline-offset:3px}\n#nexlab-update-notice button:disabled{cursor:wait;opacity:.65}\n#nexlab-update-notice .nu-head{position:relative;flex:none;padding:28px;background:linear-gradient(118deg,#143f50,#102d50 75%);color:#fff;border-bottom:3px solid #ff8b19}\n#nexlab-update-notice .nu-identity{display:flex;align-items:center;gap:18px;padding-right:22px}\n#nexlab-update-notice .nu-logo{width:66px;height:66px;object-fit:contain;padding:8px;border:1px solid #ffffff26;background:#ffffff0c;border-radius:17px;flex:none}\n#nexlab-update-notice .nu-eyebrow{display:block;color:#a9c7df;letter-spacing:1.6px;font-size:10px;text-transform:uppercase;font-weight:700;margin-bottom:7px}\n#nexlab-update-notice h2{margin:0;color:inherit;font-size:24px;line-height:1.28;font-weight:750;letter-spacing:-.55px;overflow-wrap:anywhere}\n#nexlab-update-notice .nu-version{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:10px;color:#c0d4e7;font-size:12px}\n#nexlab-update-notice .nu-badge{font-size:10px;font-weight:700;border:1px solid #ffbe7955;background:#ffab4b1f;color:#ffbc74;padding:3px 9px;border-radius:30px}\n#nexlab-update-notice .nu-close{position:absolute;right:12px;top:12px;display:grid;place-items:center;min-width:36px;min-height:36px;padding:7px;border-radius:9px;border:1px solid #ffffff26;background:#ffffff09;color:#d4e3f0}\n#nexlab-update-notice .nu-close svg{width:17px;height:17px}\n#nexlab-update-notice .nu-content{padding:26px 28px 24px;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#9db3ca #edf3fa}\n#nexlab-update-notice .nu-intro{font-size:14px;line-height:1.75;color:#506781;margin:0 0 21px;overflow-wrap:anywhere}\n#nexlab-update-notice .nu-panel{background:#eaf1f9;border:1px solid #d7e3ef;border-radius:15px;padding:20px}\n#nexlab-update-notice h3{font-size:16px;margin:0 0 18px;color:#173a5b}\n#nexlab-update-notice .nu-news{list-style:none;margin:0;padding:0;display:grid;gap:17px}\n#nexlab-update-notice .nu-news li{display:flex;align-items:center;gap:13px;min-width:0}\n#nexlab-update-notice .nu-feature{display:grid;place-items:center;width:39px;height:39px;border-radius:12px;background:#dce8f5;color:#295d88;flex:none}\n#nexlab-update-notice .nu-news strong{font-size:12px;line-height:1.55;display:block;color:#24466a;font-weight:650;overflow-wrap:anywhere}\n#nexlab-update-notice .nu-news small{font-size:11px;color:#617b95;line-height:1.6;display:block;margin-top:2px;overflow-wrap:anywhere}\n#nexlab-update-notice .nu-history-link{display:inline-flex;gap:7px;align-items:center;padding:8px 0;border:0;background:none;color:#315f8d;font-size:12px;text-decoration:underline;text-underline-offset:3px;margin-top:10px;min-height:40px}\n#nexlab-update-notice .nu-history-link svg{width:14px;height:14px}\n#nexlab-update-notice .nu-notice{display:flex;align-items:flex-start;gap:9px;padding:12px 13px;border:1px solid #dbe5ef;border-radius:10px;color:#5a718c;font-size:11px;line-height:1.65;margin:14px 0 0;background:#f9fbfd}\n#nexlab-update-notice .nu-notice svg{width:15px;height:15px;margin-top:2px}\n#nexlab-update-notice .nu-footer{padding:18px 28px 21px;border-top:1px solid #d8e4f0;background:#edf3fa;flex:none}\n#nexlab-update-notice .nu-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}\n#nexlab-update-notice .nu-button{border:1px solid #cfdeed;border-radius:10px;padding:12px 18px;min-height:46px;font-size:12px;line-height:1.5;font-weight:650;display:inline-flex;align-items:center;justify-content:center;gap:9px;max-width:100%;white-space:normal;overflow-wrap:anywhere}\n#nexlab-update-notice .nu-secondary{background:#fbfdff;color:#204160}\n#nexlab-update-notice .nu-primary{background:#ff8c16;border-color:#f4810b;color:#42250e;box-shadow:0 4px 10px #ff8b1814}\n#nexlab-update-notice .nu-primary:hover{background:#ffa137}\n#nexlab-update-notice .nu-secondary:hover{background:#e3edf7}\n#nexlab-update-notice .nu-history{list-style:none;padding:0;margin:0;display:grid;gap:18px}\n#nexlab-update-notice .nu-history li{border-left:2px solid #c9dbea;padding-left:14px}\n#nexlab-update-notice .nu-history strong{font-size:13px;color:#234b71;display:block;overflow-wrap:anywhere}\n#nexlab-update-notice .nu-history small{display:block;color:#758ba1;font-size:10px;margin:4px 0}\n#nexlab-update-notice .nu-history p{font-size:12px;line-height:1.7;color:#607892;margin:5px 0 0;overflow-wrap:anywhere}\n#nexlab-update-notice.nu-dark{height:550px;background:#102c4b;border-color:#47627c;color:#fff}\n#nexlab-update-notice .nu-journey{display:flex;flex-direction:column;height:100%;min-height:0;width:100%;padding:27px 32px 25px;background:radial-gradient(ellipse at 50% 36%,#1b4361 0,transparent 66%)}\n#nexlab-update-notice .nu-brand{display:flex;align-items:center;justify-content:space-between;gap:12px;flex:none;min-height:25px;color:#9bb5cc;font-size:10px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase}\n#nexlab-update-notice .nu-brand span:last-child{font-size:10px;letter-spacing:.4px;color:#7f9bb5;font-weight:400}\n#nexlab-update-notice .nu-center{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;flex-direction:column;overflow:auto;padding:20px 0;text-align:center}\n#nexlab-update-notice .nu-mark{position:relative;width:186px;height:186px;flex:none;margin:0 0 24px}\n#nexlab-update-notice .nu-mark>svg{position:absolute;inset:0;width:100%;height:100%;stroke-width:2.5}\n#nexlab-update-notice .nu-orbit{stroke:#ff9a34;animation:nu-orbit 2.8s linear infinite;transform-origin:50% 50%;transform-box:view-box}\n#nexlab-update-notice .nu-arc{stroke-linecap:round;animation:nu-arc 2.2s cubic-bezier(.4,0,.2,1) infinite;stroke-dasharray:28 72}\n#nexlab-update-notice .nu-mark-logo{position:absolute;left:50%;top:50%;width:78px;height:78px;object-fit:contain;filter:brightness(0) invert(1);translate:-50% -50%}\n#nexlab-update-notice .nu-mark .nu-check,#nexlab-update-notice .nu-mark .nu-alert{inset:50%;translate:-50% -50%;width:55px;height:55px;opacity:0;stroke:#fff;stroke-width:1.7}\n#nexlab-update-notice .nu-message{font-size:23px;line-height:1.35;letter-spacing:-.45px;font-weight:650;margin:0;min-height:62px;display:grid;place-items:center;max-width:100%;color:#f0f6fb}\n#nexlab-update-notice .nu-support{font-size:12px;line-height:1.8;margin:7px 0 0;color:#9cb6cd;max-width:340px;overflow-wrap:anywhere}\n#nexlab-update-notice .nu-journey-foot{flex:none;border-top:1px solid #ffffff10;padding-top:17px;text-align:center}\n#nexlab-update-notice .nu-tip{display:flex;align-items:center;justify-content:center;gap:8px;font-size:10px;line-height:1.65;color:#87a5c0;margin:0;min-height:28px}\n#nexlab-update-notice .nu-tip svg{width:14px;height:14px}\n#nexlab-update-notice .nu-journey .nu-actions{justify-content:center}\n#nexlab-update-notice .nu-journey .nu-primary{background:#ff9a2d;border-color:#f8972e;color:#2a210f;min-width:180px}\n#nexlab-update-notice .nu-journey .nu-secondary{background:#ffffff08;border-color:#ffffff25;color:#dce9f3}\n#nexlab-update-notice[data-mode=success] .nu-orbit,#nexlab-update-notice[data-mode=error] .nu-orbit,#nexlab-update-notice[data-mode=success] .nu-arc,#nexlab-update-notice[data-mode=error] .nu-arc{animation:none}\n#nexlab-update-notice[data-mode=success] .nu-arc{stroke-dasharray:100 0}\n#nexlab-update-notice[data-mode=success] .nu-mark-logo,#nexlab-update-notice[data-mode=error] .nu-mark-logo{opacity:0}\n#nexlab-update-notice[data-mode=success] .nu-check{opacity:1}\n#nexlab-update-notice[data-mode=success] .nu-check path{stroke-dasharray:1;stroke-dashoffset:1;animation:nu-confirm .7s .15s ease-out forwards}\n#nexlab-update-notice[data-mode=error] .nu-alert{opacity:1;stroke:#ffbe79}\n#nexlab-update-notice[data-mode=error] .nu-orbit{opacity:.5}\n@keyframes nu-orbit{to{transform:rotate(360deg)}}\n@keyframes nu-arc{0%{stroke-dasharray:8 92;stroke-dashoffset:0}50%{stroke-dasharray:62 38;stroke-dashoffset:-18}100%{stroke-dasharray:8 92;stroke-dashoffset:-100}}\n@keyframes nu-confirm{to{stroke-dashoffset:0}}\n@media(max-width:650px){#nexlab-update-notice{max-width:calc(100% - 24px);width:min(620px,calc(100% - 24px));border-radius:18px}#nexlab-update-notice .nu-head{padding:22px 19px}#nexlab-update-notice .nu-identity{gap:12px;padding-right:17px}#nexlab-update-notice .nu-logo{width:47px;height:47px;border-radius:12px;padding:5px}#nexlab-update-notice h2{font-size:20px}#nexlab-update-notice .nu-eyebrow{font-size:9px;letter-spacing:1.1px}#nexlab-update-notice .nu-version{font-size:10px;gap:7px;margin-top:8px}#nexlab-update-notice .nu-badge{font-size:9px;padding:2px 6px}#nexlab-update-notice .nu-close{right:8px;top:8px;min-width:32px;min-height:32px}#nexlab-update-notice .nu-content{padding:21px 18px}#nexlab-update-notice .nu-intro{font-size:13px;margin-bottom:18px}#nexlab-update-notice .nu-panel{padding:17px 14px}#nexlab-update-notice h3{font-size:15px}#nexlab-update-notice .nu-news li{gap:10px}#nexlab-update-notice .nu-feature{width:32px;height:32px}#nexlab-update-notice .nu-news strong{font-size:11px}#nexlab-update-notice .nu-news small{font-size:10px}#nexlab-update-notice .nu-footer{padding:16px 18px 18px}#nexlab-update-notice .nu-button{padding:11px 12px;font-size:11px;min-height:45px}#nexlab-update-notice .nu-notice{font-size:10px;padding:10px}#nexlab-update-notice.nu-dark{height:510px}#nexlab-update-notice .nu-journey{padding:23px 21px 21px}#nexlab-update-notice .nu-brand{font-size:9px;letter-spacing:1.2px}#nexlab-update-notice .nu-brand span:last-child{font-size:9px}#nexlab-update-notice .nu-mark{width:160px;height:160px;margin-bottom:21px}#nexlab-update-notice .nu-mark-logo{width:68px;height:68px}#nexlab-update-notice .nu-message{font-size:21px;min-height:58px}#nexlab-update-notice .nu-support{font-size:11px;max-width:265px}#nexlab-update-notice .nu-journey .nu-button{min-width:0;flex:1}#nexlab-update-notice .nu-tip{font-size:10px}}\n@media(max-height:640px){#nexlab-update-notice .nu-journey{padding-top:18px;padding-bottom:18px}#nexlab-update-notice .nu-mark{width:125px;height:125px;margin-bottom:11px}#nexlab-update-notice .nu-mark-logo{width:55px;height:55px}#nexlab-update-notice .nu-center{padding:10px 0}#nexlab-update-notice .nu-message{min-height:54px;font-size:20px}#nexlab-update-notice .nu-support{font-size:10px;line-height:1.7;margin-top:2px}#nexlab-update-notice .nu-journey-foot{padding-top:10px}}\n@media(prefers-reduced-motion:reduce){#nexlab-update-notice,#nexlab-update-notice *{animation:none!important;transition:none!important}#nexlab-update-notice .nu-check path{stroke-dashoffset:0!important}}\n";
  // Display layer only. Worker ownership, validation and activation stay in the manager.
  const COMPLETION_KEY='nexlab:update-completion:'+EXPECTED_SCOPE_URL;
  const initialActivation=(()=>{const p=new URL(location.href).searchParams;return {revision:p.get('nexlabActivated'),at:Number(p.get('nexlabReload'))};})();
  const ui={mode:null,identity:null,notes:null,notesKey:'',request:0,previous:null,overflow:'',cleanup:null,message:'',completionShown:false};
  const iconPaths={close:'m6 6 12 12M6 18 18 6',grid:'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',photo:'M3 3h18v18H3ZM3 16l6-6 6 6 3-3 3 3M16 7h.01',calendar:'M4 5h16v16H4ZM8 2v6m8-6v6M4 11h16',arrow:'M4 12h16m-6-6 6 6-6 6',info:'M12 11v6m0-10v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',refresh:'M20 7V3l-3 3a8 8 0 1 0 3 10M20 3h-5',left:'m15 6-6 6 6 6'};
  function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
  function uiIcon(kind){const e=document.createElementNS('http://www.w3.org/2000/svg','svg');e.setAttribute('viewBox','0 0 24 24');e.setAttribute('aria-hidden','true');const p=document.createElementNS(e.namespaceURI,'path');p.setAttribute('d',iconPaths[kind]||iconPaths.grid);e.append(p);return e;}
  function action(label,cls,fn,kind){const e=node('button','nu-button '+cls);e.type='button';if(kind)e.append(uiIcon(kind));e.append(document.createTextNode(label));e.onclick=fn;return e;}
  function logo(cls){const e=node('img',cls);e.alt='';e.src=new URL('./brand/nexlab-icon.webp',document.baseURI).href;return e;}
  function displayVersion(value){return [value?.release||CURRENT.release,value?.version||CURRENT.version].filter(Boolean).join(' ');}
  function sameBuild(a,b){const x=id(a),y=id(b);return !!x&&!!y&&x.revision===y.revision&&Number.isFinite(Date.parse(x.generatedAt))&&Date.parse(x.generatedAt)===Date.parse(y.generatedAt);}
  function safeText(value,max=250){return typeof value==='string'?value.trim().slice(0,max):'';}
  function notesFrom(data){
    const n=data?.update_notes||{},items=(Array.isArray(n.items)?n.items:[]).slice(0,6).map(i=>({title:safeText(i?.title,120),description:safeText(i?.description),icon:['grid','photo','calendar','refresh'].includes(i?.icon)?i.icon:'grid'})).filter(i=>i.title);
    const history=(Array.isArray(n.history)?n.history:[]).slice(0,20).map(i=>({title:safeText(i?.title,150),description:safeText(i?.description,400),version:safeText(i?.version,30),release:safeText(i?.release,20),generatedAt:safeText(i?.generated_at,60)})).filter(i=>i.title);
    return {summary:safeText(n.summary,400),items,history};
  }
  async function loadUpdateNotes(identity){
    const key=buildKey(identity);if(!key||ui.notesKey===key)return;ui.notesKey=key;ui.notes=null;const token=++ui.request;
    try{
      const url=new URL('./release.json',document.baseURI);url.searchParams.set('notes',String(Date.now()));
      const response=await fetch(url,{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});if(!response.ok)throw Error('Notas indisponíveis');
      const raw=await response.text();if(raw.length>300000)throw Error('Notas inválidas');const data=JSON.parse(raw);if(!sameBuild(data,identity))throw Error('Notas de outra versão');
      if(token!==ui.request)return;ui.notes=notesFrom(data);
    }catch{if(token===ui.request)ui.notes={summary:'',items:[],history:[]};}
    if(banner?.open&&sameBuild(ui.identity,identity)&&['available','history'].includes(ui.mode))renderUpdate(ui.mode,false);
  }
  function ensureStyle(){
    if(document.getElementById('nexlab-update-manager-style'))return;
    const style=node('style');style.id='nexlab-update-manager-style';style.textContent=UPDATE_INTERFACE_CSS;document.head.append(style);
  }
  function hideBanner(){
    if(applying||state.status==='reloading')return;
    const dialog=banner;if(!dialog)return;
    ui.cleanup?.();ui.cleanup=null;dialog.close();dialog.remove();banner=null;bannerText=null;bannerNow=null;ui.mode=null;
    document.body.style.overflow=ui.overflow;
    if(ui.previous?.isConnected)ui.previous.focus({preventScroll:true});ui.previous=null;
  }
  function dismissUpdate(){
    if(applying||state.status==='reloading')return;
    if(ui.mode!=='success'&&ui.identity){try{sessionStorage.setItem(DEFERRED_KEY,buildKey(ui.identity));}catch{}state.status='deferred';dispatch('nexlab:update-deferred',{...state});}
    if(!banner)return;
    if(matchMedia('(prefers-reduced-motion:reduce)').matches){hideBanner();return;}
    const dialog=banner;dialog.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(6px) scale(.985)'}],{duration:240,easing:'ease-in',fill:'forwards'}).finished.then(()=>{if(banner===dialog)hideBanner();}).catch(()=>{});
  }
  function ensureDialog(){
    ensureStyle();if(banner)return;
    ui.previous=document.activeElement;ui.overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    banner=node('dialog');banner.id='nexlab-update-notice';banner.setAttribute('aria-labelledby','nexlab-update-notice-title');banner.setAttribute('aria-describedby','nexlab-update-notice-message');
    banner.addEventListener('cancel',e=>{e.preventDefault();dismissUpdate();});document.body.append(banner);
    const dialog=banner,fit=()=>{if(!dialog.isConnected)return;const scale=dialog.getBoundingClientRect().width/(dialog.offsetWidth||1)||1;const value=Math.floor((window.visualViewport?.height||innerHeight)/scale)+'px';if(dialog.style.getPropertyValue('--nu-height')!==value)dialog.style.setProperty('--nu-height',value);};
    const observer=new ResizeObserver(fit);observer.observe(dialog);window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);
    ui.cleanup=()=>{observer.disconnect();window.removeEventListener('resize',fit);window.visualViewport?.removeEventListener('resize',fit);};
  }
  function uiHeader(title){
    const head=node('header','nu-head'),identity=node('div','nu-identity'),copy=node('div');identity.append(logo('nu-logo'));
    copy.append(node('span','nu-eyebrow','Seu NexLab, cada vez melhor'));const h=node('h2',null,title);h.id='nexlab-update-notice-title';copy.append(h);
    const version=node('div','nu-version');version.append(node('span',null,'NexLab · '+displayVersion(ui.identity)),node('span','nu-badge',ui.mode==='history'?'Novidades':'Recomendado'));copy.append(version);identity.append(copy);head.append(identity);
    const close=action('','nu-close',dismissUpdate,'close');close.setAttribute('aria-label','Fechar aviso de atualização');head.append(close);return head;
  }
  function renderUpdate(mode,focus=true){
    ensureDialog();const opened=banner.open,previousAction=banner.contains(document.activeElement)?document.activeElement?.dataset?.updateAction:null;
    banner.getAnimations().forEach(a=>a.cancel());ui.mode=mode;banner.dataset.mode=mode;banner.classList.toggle('nu-dark',['updating','success','error'].includes(mode));
    banner.replaceChildren();bannerText=null;bannerNow=null;
    if(mode==='available'||mode==='history'){
      banner.append(uiHeader(mode==='history'?'Histórico de versões':'Nova atualização disponível'));
      const content=node('div','nu-content'),intro=node('p','nu-intro');intro.id='nexlab-update-notice-message';content.append(intro);
      if(mode==='available'){
        intro.textContent=ui.notes?.summary||'Uma nova atualização está pronta para deixar sua experiência mais organizada e fácil de usar.';
        const panel=node('section','nu-panel');panel.append(node('h3',null,'O que há de novo'));
        if(ui.notes?.items.length){const list=node('ul','nu-news');for(const item of ui.notes.items){const row=node('li'),mark=node('span','nu-feature'),copy=node('div');mark.append(uiIcon(item.icon));copy.append(node('strong',null,item.title));if(item.description)copy.append(node('small',null,item.description));row.append(mark,copy);list.append(row);}panel.append(list);}
        else panel.append(node('p','nu-intro',ui.notes?'As melhorias estarão disponíveis ao concluir a atualização.':'Carregando as novidades desta versão…'));
        content.append(panel);
        const history=action('Ver histórico de versões','nu-history-link',()=>renderUpdate('history'),'arrow');history.dataset.updateAction='history';content.append(history);
        const notice=node('p','nu-notice');notice.append(uiIcon('info'),node('span',null,'O aplicativo será recarregado ao atualizar. Salve suas alterações antes de continuar.'));content.append(notice);
      }else{
        intro.textContent='Confira as mudanças publicadas no NexLab.';
        if(ui.notes?.history.length){const list=node('ul','nu-history');for(const item of ui.notes.history){const li=node('li');li.append(node('strong',null,item.title));const date=new Date(item.generatedAt),label=[displayVersion(item),Number.isFinite(date.getTime())?date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'America/Sao_Paulo'}):''].filter(Boolean).join(' · ');li.append(node('small',null,label));if(item.description)li.append(node('p',null,item.description));list.append(li);}content.append(list);}
        else content.append(node('p','nu-intro',ui.notes?'O histórico desta versão não está disponível no momento.':'Carregando o histórico…'));
      }
      const footer=node('footer','nu-footer'),actions=node('div','nu-actions');
      if(mode==='available'){const later=action('Depois','nu-secondary',dismissUpdate);later.dataset.updateAction='later';bannerNow=action('Atualizar agora','nu-primary',()=>void applyUpdate());bannerNow.dataset.updateAction='apply';actions.append(later,bannerNow);}
      else{const back=action('Voltar para a atualização','nu-secondary',()=>renderUpdate('available'),'left');back.dataset.updateAction='back';actions.append(back);}
      footer.append(actions);banner.append(content,footer);
    }else{
      const journey=node('div','nu-journey'),brand=node('div','nu-brand');brand.append(node('span',null,'NexLab · Atualização'),node('span',null,displayVersion(ui.identity)));journey.append(brand);
      const center=node('div','nu-center'),mark=node('div','nu-mark');mark.setAttribute('aria-hidden','true');
      mark.innerHTML='<svg class="nu-orbit" viewBox="0 0 192 192"><circle class="nu-arc" cx="96" cy="96" r="81" pathLength="100"/></svg><svg class="nu-check" viewBox="0 0 24 24"><path pathLength="1" d="m5 12 4 4L19 6"/></svg><svg class="nu-alert" viewBox="0 0 24 24"><path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v.01"/></svg>';mark.append(logo('nu-mark-logo'));center.append(mark);
      bannerText=node('h2','nu-message',mode==='updating'?ui.message:mode==='success'?'Seu NexLab está pronto.':'Não foi possível atualizar.');bannerText.id='nexlab-update-notice-title';bannerText.setAttribute('aria-live','polite');bannerText.setAttribute('aria-atomic','true');center.append(bannerText);
      const support=node('p','nu-support',mode==='updating'?'Estamos preparando o NexLab para você.':mode==='success'?'A atualização foi concluída. Pode continuar de onde parou.':ui.message||'Tente novamente em instantes.');support.id='nexlab-update-notice-message';center.append(support);journey.append(center);
      const foot=node('footer','nu-journey-foot');
      if(mode==='updating'){const tip=node('p','nu-tip');tip.append(uiIcon('info'),node('span',null,'Mantenha esta tela aberta até a conclusão.'));foot.append(tip);}
      else{const actions=node('div','nu-actions');if(mode==='success')actions.append(action('Continuar no NexLab','nu-primary',dismissUpdate,'arrow'));else{const later=action('Depois','nu-secondary',dismissUpdate);bannerNow=action('Tentar novamente','nu-primary',()=>void applyUpdate(),'refresh');actions.append(later,bannerNow);}foot.append(actions);}journey.append(foot);banner.append(journey);
    }
    if(!opened){banner.showModal();if(!matchMedia('(prefers-reduced-motion:reduce)').matches)banner.animate([{opacity:0,transform:'translateY(12px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)'});}
    banner.setAttribute('tabindex','-1');
    if(focus){(bannerNow||banner.querySelector('.nu-primary')||banner).focus({preventScroll:true});}
    else if(previousAction){const target=Array.from(banner.querySelectorAll('[data-update-action]')).find(e=>e.dataset.updateAction===previousAction);target?.focus({preventScroll:true});}
  }
  function showBanner(identity,validation){
    const remote=id(identity);if(!document.body||!remote?.revision||validation?.ok!==true||deferred()===buildKey(remote)||applying||state.status==='reloading')return;
    ui.identity=remote;loadUpdateNotes(remote);
    if(!banner?.open||!['available','history'].includes(ui.mode))renderUpdate('available');
  }
  function setProgress(message){
    ui.message=message;ui.identity=ui.identity||id({version:state.remoteVersion||CURRENT.version,release:state.remoteRelease||CURRENT.release,revision:state.remoteRevision||CURRENT.revision,generatedAt:state.remoteGeneratedAt||CURRENT.generatedAt});
    if(ui.mode!=='updating'||!banner)renderUpdate('updating');else if(bannerText)bannerText.textContent=message;
  }
  function restoreAction(message){const known=['A atualização ainda não está pronta.','A versão disponível mudou.','Não foi possível confirmar os arquivos','A atualização está demorando'];ui.message=navigator.onLine===false?'Você está sem conexão. Reconecte à internet e tente novamente.':known.some(prefix=>String(message||"").startsWith(prefix))?String(message):'A atualização não pôde ser concluída. Tente novamente em instantes.';renderUpdate('error');}
  function markCompletion(identity){try{sessionStorage.setItem(COMPLETION_KEY,JSON.stringify({identity:id(identity),at:Date.now()}));}catch{}}
  function clearCompletion(){try{sessionStorage.removeItem(COMPLETION_KEY);}catch{}}
  function showCompletedUpdate(identity){
    if(ui.completionShown)return;let pending;try{pending=JSON.parse(sessionStorage.getItem(COMPLETION_KEY)||'null');}catch{return;}
    if(!pending&&initialActivation.revision===CURRENT.revision&&initialActivation.at>0)pending={identity:CURRENT,at:initialActivation.at};
    if(!pending)return;
    const age=Date.now()-Number(pending.at);if(!Number.isFinite(age)||age<0||age>30*60*1000||!sameBuild(pending.identity,CURRENT)){clearCompletion();return;}
    if(!sameBuild(identity,CURRENT))return;
    clearCompletion();ui.completionShown=true;ui.identity=id(CURRENT);renderUpdate('success');dispatch('nexlab:update-complete',{...state,identity});
  }
  async function fetchHead(){const url=new URL(HEAD_URL,location.href);url.searchParams.set('check',String(Date.now()));const response=await fetch(url,{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`Cabeçalho de atualização indisponível (${response.status}).`);const data=await response.json();return id(data)||{};}
  function workerScriptOwned(worker){if(!worker?.scriptURL)return true;try{return new URL(worker.scriptURL).pathname===EXPECTED_WORKER_PATH;}catch{return false;}}
  function registrationOwned(registration){if(!registration||registration.scope!==EXPECTED_SCOPE_URL)return false;return [registration.active,registration.waiting,registration.installing].filter(Boolean).every(workerScriptOwned);}
  async function getRegistration(){
    if(!('serviceWorker'in navigator)||location.protocol==='file:')return null;
    const registrations=await navigator.serviceWorker.getRegistrations();
    let registration=registrations.find(item=>item.scope===EXPECTED_SCOPE_URL)||null;
    if(registration&&!registrationOwned(registration)){
      await registration.unregister();
      registration=null;
      dispatch('nexlab:pwa-scope-reclaimed',{scope:EXPECTED_SCOPE_URL,reason:'foreign-worker-on-nexlab-scope'});
    }
    registration=await navigator.serviceWorker.register(WORKER_URL,{scope:WORKER_SCOPE,updateViaCache:'none'});
    if(registration.scope!==EXPECTED_SCOPE_URL)throw new Error('O Service Worker do NexLab foi registrado fora do escopo exclusivo do aplicativo.');
    observeRegistration(registration);
    return registration;
  }
  async function workerMessage(worker,payload,timeoutMs=MESSAGE_TIMEOUT_MS){if(!worker||typeof MessageChannel==='undefined')return null;return withTimeout(new Promise((resolve,reject)=>{const channel=new MessageChannel();channel.port1.onmessage=(event)=>{const data=event.data||{};data.ok===false?reject(new Error(data.error||'O Service Worker recusou a operação.')):resolve(data);};worker.postMessage(payload,[channel.port2]);}),timeoutMs,'O Service Worker não respondeu no tempo esperado.');}
  async function workerIdentity(worker){try{return id(await workerMessage(worker,{type:'NEXLAB_GET_VERSION'}));}catch{return null;}}
  async function validateWaiting(worker){return workerMessage(worker,{type:'NEXLAB_VALIDATE_INSTALL'},10000);}
  function publishReady(identity,validation){const remote=id(identity);if(!remote||!newer(remote)||validation?.ok!==true)return false;state.workerRevision=remote.revision;state.remoteVersion=remote.version;state.remoteRelease=remote.release;state.remoteRevision=remote.revision;state.remoteGeneratedAt=remote.generatedAt;state.updateAvailable=true;state.status=deferred()===buildKey(remote)?'deferred':'available';state.error=null;if(state.status==='available')showBanner(remote,validation);dispatch('nexlab:update-available',{...state,validation});return true;}
  async function inspectWaiting(registration,expectedHead=null){const worker=registration?.waiting;if(!worker)return false;const identity=await workerIdentity(worker);if(!identity?.revision||!newer(identity))return false;if(expectedHead?.revision&&identity.revision!==expectedHead.revision)return false;try{const validation=await validateWaiting(worker);return publishReady(identity,validation);}catch(error){state.status='preparing';state.error=String(error?.message||error);hideBanner();dispatch('nexlab:update-preparing',{...state});return false;}}
  function detachObserver(){if(observedRegistration&&updateFoundHandler)observedRegistration.removeEventListener('updatefound',updateFoundHandler);observedRegistration=null;updateFoundHandler=null;}
  function observeRegistration(registration){if(!registration||observedRegistration===registration)return;detachObserver();observedRegistration=registration;updateFoundHandler=()=>{const installing=registration.installing;if(!installing)return;state.status='downloading';state.updateAvailable=false;hideBanner();dispatch('nexlab:update-preparing',{...state});installing.addEventListener('statechange',()=>{if(installing.state==='installed'&&navigator.serviceWorker.controller)void inspectWaiting(registration);else if(installing.state==='redundant'){state.status='preparing';state.error='A revisão ainda não foi publicada por completo. O NEXLAB atual permanece ativo.';dispatch('nexlab:update-preparing',{...state});}});};registration.addEventListener('updatefound',updateFoundHandler);void inspectWaiting(registration);}
  async function performCheck(options={}){lastCheckMs=Date.now();state.status='checking';state.error=null;try{const registration=await getRegistration();let head=null;try{head=await fetchHead();}catch(error){state.checkedAt=new Date().toISOString();state.status=navigator.onLine===false?'offline':'current';state.error=navigator.onLine===false?null:String(error?.message||error);return{ok:true,...state,offline:navigator.onLine===false};}state.checkedAt=new Date().toISOString();
    const activeWorker=registration?.active||navigator.serviceWorker.controller;
    const activeIdentity=await workerIdentity(activeWorker);
    const expectedRevision=String(head?.revision||CURRENT.revision||'');
    if(expectedRevision&&activeIdentity?.revision&&activeIdentity.revision!==expectedRevision){
      state.workerRevision=activeIdentity.revision;state.remoteVersion=head?.version||CURRENT.version;state.remoteRelease=head?.release||CURRENT.release;state.remoteRevision=expectedRevision;state.remoteGeneratedAt=head?.generatedAt||CURRENT.generatedAt;state.updateAvailable=false;state.status='repairing';state.error=null;hideBanner();dispatch('nexlab:update-repairing',{...state,activeRevision:activeIdentity.revision,expectedRevision});
      if(registration&&!registration.installing)try{await registration.update();}catch(error){state.error=String(error?.message||error);}
      if(await inspectWaiting(registration,head))return{ok:true,...state,ready:true,repaired:true};
      state.status=registration?.installing?'downloading':'preparing';dispatch('nexlab:update-preparing',{...state,remote:head,repair:true});return{ok:true,...state,ready:false,repair:true};
    }
    if(head?.revision&&newer(head)){state.remoteVersion=head.version;state.remoteRelease=head.release;state.remoteRevision=head.revision;state.remoteGeneratedAt=head.generatedAt;if(await inspectWaiting(registration,head))return{ok:true,...state,ready:true};state.updateAvailable=false;hideBanner();state.status=registration?.installing?'downloading':'preparing';if(registration&&!registration.installing)try{await registration.update();}catch{}dispatch('nexlab:update-preparing',{...state,remote:head});return{ok:true,...state,ready:false};}state.updateAvailable=false;state.status='current';state.error=null;clearDeferred();if(ui.mode!=='success')hideBanner();dispatch('nexlab:update-current',{...state});return{ok:true,...state,ready:false};}catch(error){state.status='error';state.error=String(error?.message||error);state.checkedAt=new Date().toISOString();dispatch('nexlab:update-error',{...state});return{ok:false,...state};}}
  function check(options={}){if(applying||state.status==='reloading')return Promise.resolve({ok:true,...state,applying:true});if(checking)return checking;checking=performCheck(options).finally(()=>{checking=null;});return checking;}
  async function applyUpdate(){
    if(applying||reloading)return {ok:false,reason:'already_applying'};
    applying=true;state.status='activating';state.error=null;clearDeferred();setProgress('Verificando a atualização…');let controllerPromise;
    try{
      const registration=await getRegistration(),waiting=registration?.waiting;
      if(!waiting)throw new Error('A atualização ainda não está pronta. Aguarde um novo aviso e tente novamente.');
      const identity=await workerIdentity(waiting);
      if(!identity||!newer(identity))throw new Error('A versão disponível mudou. Verifique novamente antes de atualizar.');
      ui.identity=identity;
      const validation=await validateWaiting(waiting);
      if(validation?.ok!==true)throw new Error('Não foi possível confirmar os arquivos desta atualização. Tente novamente em instantes.');
      setProgress('Aplicando as melhorias…');
      controllerPromise=waitForController(identity);markCompletion(identity);
      await workerMessage(waiting,{type:'NEXLAB_ACTIVATE_UPDATE',expectedVersion:identity.version,expectedRevision:identity.revision},10000);
      await controllerPromise;
      state.status='reloading';setProgress('Reabrindo o NexLab…');reloadOnce(identity.revision);return {ok:true,identity,validation};
    }catch(error){
      controllerPromise?.cancel?.();clearCompletion();applying=false;state.status='error';state.error=String(error?.message||error);restoreAction(state.error);dispatch('nexlab:update-error',{...state});return {ok:false,error:state.error};
    }
  }
  function waitForController(identity){
    let cancel;
    const result=new Promise((resolve,reject)=>{
      let done=false;
      const cleanup=()=>{clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',onChange);};
      const finish=(error,active)=>{if(done)return;done=true;cleanup();error?reject(error):resolve(active);};
      const onChange=async()=>{const active=await workerIdentity(navigator.serviceWorker.controller);if(sameBuild(active,identity))finish(null,active);};
      const timer=setTimeout(()=>finish(new Error('A atualização está demorando para assumir a página. Tente novamente em instantes.')),ACTIVATE_TIMEOUT_MS);
      navigator.serviceWorker.addEventListener('controllerchange',onChange);
      cancel=()=>finish(null,null);
    });
    // Observe rejections while the activation acknowledgement is still pending.
    result.catch(()=>{});result.cancel=()=>cancel?.();return result;
  }
  function reloadOnce(revision){if(reloading)return;reloading=true;try{const key='nexlab:update-reload:'+revision;const at=Number(sessionStorage.getItem(key)||0);if(Date.now()-at<10000)return;sessionStorage.setItem(key,String(Date.now()));}catch{}const target=new URL(location.href);target.searchParams.set('nexlabActivated',revision);target.searchParams.set('nexlabReload',String(Date.now()));setTimeout(()=>location.replace(target.toString()),50);}
  function cleanTechnicalUrl(){try{const target=new URL(location.href);let changed=false;for(const key of ['nexlabActivated','nexlabReload','nexlabModuleRetry','nexlabRecoveryReason']){if(target.searchParams.has(key)){target.searchParams.delete(key);changed=true;}}if(changed)history.replaceState(history.state,'',target.pathname+(target.searchParams.toString()?`?${target.searchParams}`:'')+target.hash);return changed;}catch{return false;}}
  async function announceBootOk(){
    try{
      const registration=await navigator.serviceWorker.getRegistration('./'),active=registration?.active||navigator.serviceWorker.controller;
      const identity=await workerIdentity(active);if(!sameBuild(identity,CURRENT))return false;
      const reply=await workerMessage(active,{type:'NEXLAB_APP_BOOT_OK',expectedRevision:CURRENT.revision},8000);
      if(reply?.ok!==true)return false;
      cleanTechnicalUrl();showCompletedUpdate(identity);return true;
    }catch{return false;}
  }
  function showAvailable(){if(state.updateAvailable&&state.remoteRevision&&observedRegistration?.waiting)void inspectWaiting(observedRegistration,{revision:state.remoteRevision});}
  function start(){if(started)return;started=true;if(!('serviceWorker'in navigator)||location.protocol==='file:'){state.status='unsupported';return;}void getRegistration().then(reg=>{observeRegistration(reg);void inspectWaiting(reg);});initialTimer=setTimeout(()=>void check(),1800);intervalId=setInterval(()=>void check(),CHECK_INTERVAL_MS);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastCheckMs>VISIBILITY_MIN_INTERVAL_MS)void check();});window.addEventListener('online',()=>void check());window.addEventListener('pageshow',event=>{if(event.persisted&&Date.now()-lastCheckMs>VISIBILITY_MIN_INTERVAL_MS)void check();});navigator.serviceWorker.addEventListener('controllerchange',async()=>{const identity=await workerIdentity(navigator.serviceWorker.controller);if(!applying&&identity?.revision&&identity.revision!==CURRENT.revision)reloadOnce(identity.revision);});if(document.body?.dataset?.nexlabAppReady==='true')void announceBootOk();}
  function stop(){if(initialTimer)clearTimeout(initialTimer);if(intervalId)clearInterval(intervalId);initialTimer=null;intervalId=null;detachObserver();started=false;}
  window.addEventListener('nexlab:application-ready',()=>void announceBootOk(),{once:true});
  window.__NEXLAB_UPDATE_MANAGER__={version:CURRENT.version,release:CURRENT.release,revision:CURRENT.revision,state,check,applyUpdate,start,stop,showAvailable,isPublishedUpdate:newer,cleanTechnicalUrl,compareIdentity:(a,b=CURRENT)=>{const ai=id(a),bi=id(b);if(!ai||!bi)return 0;const at=Date.parse(ai.generatedAt||''),bt=Date.parse(bi.generatedAt||'');if(ai.revision===bi.revision)return Number.isFinite(at)&&Number.isFinite(bt)?Math.sign(at-bt):0;return Number.isFinite(at)&&Number.isFinite(bt)?Math.sign(at-bt):1;}};
  if(document.readyState==='complete')start();else window.addEventListener('load',start,{once:true});
})();
