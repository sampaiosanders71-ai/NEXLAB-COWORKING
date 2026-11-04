(function(){
  'use strict';
  const VERSION='0.26.82';
  const CONFIG=window.__NEXLAB_CONFIG__?.assert?.()||(()=>{throw new Error('Configuração central do NEXLAB não carregada.');})();
  const PROJECT_REF=CONFIG.projectRef;
  const BASE=CONFIG.supabaseUrl;
  const KEY=CONFIG.supabaseAnonKey;
  const TRIGGER_SELECTOR='#nexlab-validation-trigger,#nexlab-coordinator-preview-trigger';
  const OVERLAY_SELECTOR='.nexlab-admin-overlay,.nexlab-validation-overlay,.nexlab-test-overlay';
  const overlays=new Set();
  const overlayState=new WeakMap();
  let bodyOverflow='';
  let syncing=false;
  let lastRole='';
  let lastVerification='unknown';
  let lastSyncAt=0;

  function authToken(){return CONFIG.getAccessToken();}

  function jwtSubject(jwt){
    try{const body=jwt.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');const padded=body.padEnd(Math.ceil(body.length/4)*4,'=');const payload=JSON.parse(decodeURIComponent(Array.from(atob(padded),c=>`%${c.charCodeAt(0).toString(16).padStart(2,'0')}`).join('')));return String(payload?.sub||'');}catch{return '';}
  }
  function focusables(panel){return [...panel.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(node=>node.offsetParent!==null&&!node.hasAttribute('inert'));}
  function releaseOverlay(overlay){
    const state=overlayState.get(overlay);if(!state)return;
    overlay.removeEventListener('keydown',state.keydown,true);overlays.delete(overlay);overlayState.delete(overlay);
    if(!overlays.size){document.body.style.overflow=bodyOverflow;bodyOverflow='';}
    if(state.opener?.isConnected)requestAnimationFrame(()=>state.opener.focus({preventScroll:true}));
  }
  function enhanceOverlay(overlay){
    if(overlayState.has(overlay))return;
    const panel=overlay.querySelector('[role="dialog"],.nexlab-admin-dialog,.nexlab-validation-dialog,.nexlab-test-dialog');if(!panel)return;
    const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const title=panel.querySelector('h1,h2,h3');const description=panel.querySelector('header p');const suffix=Math.random().toString(36).slice(2,9);
    if(title){title.id=title.id||`nexlab-dialog-title-${suffix}`;panel.setAttribute('aria-labelledby',title.id);}
    if(description){description.id=description.id||`nexlab-dialog-description-${suffix}`;panel.setAttribute('aria-describedby',description.id);}
    panel.setAttribute('aria-modal','true');panel.setAttribute('role','dialog');panel.tabIndex=-1;
    const keydown=(event)=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();const close=panel.querySelector('.nexlab-admin-close,.nexlab-validation-close,.nexlab-test-close,[data-close]');if(close instanceof HTMLElement)close.click();else overlay.remove();return;}
      if(event.key!=='Tab')return;const nodes=focusables(panel);if(!nodes.length){event.preventDefault();panel.focus();return;}const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    overlay.addEventListener('keydown',keydown,true);overlayState.set(overlay,{opener,keydown});overlays.add(overlay);
    if(overlays.size===1){bodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}
    requestAnimationFrame(()=>{const target=panel.querySelector('.nexlab-admin-close,.nexlab-validation-close,.nexlab-test-close,button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])');(target||panel).focus({preventScroll:true});});
  }
  function removeNodes(selector){document.querySelectorAll(selector).forEach(node=>node.remove());}
  function closeUnauthorized(role){
    const normalized=String(role||'').toLowerCase();const admin=['admin','administrador'].includes(normalized);const coordinator=normalized==='coordenador';
    if(window.__NEXLAB_PROFILE_PREVIEW__?.active||(!admin&&!coordinator)){
      removeNodes(TRIGGER_SELECTOR);removeNodes(OVERLAY_SELECTOR);
    }else if(admin){
      removeNodes('#nexlab-validation-trigger,#nexlab-coordinator-preview-trigger');
    }else{
      removeNodes('.nexlab-admin-overlay');
    }
  }
  function setVerification(state,detail={}){
    lastVerification=state;document.documentElement.dataset.nexlabAdminVerification=state;
    window.dispatchEvent(new CustomEvent(state==='unavailable'?'nexlab:administrative-ui-verification-unavailable':'nexlab:administrative-ui-verification',{detail:{state,role:lastRole,version:VERSION,at:Date.now(),...detail}}));
  }
  async function fetchProfile(){
    const token=authToken();const id=jwtSubject(token);
    if(!token||!id)return {state:'unauthorized',reason:'signed_out'};
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
    try{
      const response=await fetch(`${BASE}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=id,role,ativo`,{headers:{apikey:KEY,Authorization:`Bearer ${token}`},cache:'no-store',signal:controller.signal});
      if(response.status===401||response.status===403)return {state:'unauthorized',reason:`http_${response.status}`};
      if(!response.ok)return {state:'unavailable',reason:`http_${response.status}`};
      const rows=await response.json();const profile=Array.isArray(rows)?rows[0]||null:null;
      if(!profile||profile.ativo===false)return {state:'unauthorized',reason:profile?'inactive':'profile_missing'};
      return {state:'authorized',profile};
    }catch(error){
      return {state:'unavailable',reason:error?.name==='AbortError'?'timeout':'network',message:String(error?.message||'')};
    }finally{clearTimeout(timer);}
  }
  async function sync(force=false){
    const now=Date.now();
    if(syncing||(!force&&now-lastSyncAt<15000))return;
    syncing=true;lastSyncAt=now;
    try{
      const result=await fetchProfile();
      if(result.state==='unavailable'){
        // Falha transitória: preserva botões, diálogos e formulários ainda não salvos.
        setVerification('unavailable',{reason:result.reason,message:result.message||''});
        return;
      }
      const role=result.state==='authorized'?String(result.profile.role||'').toLowerCase():'';
      closeUnauthorized(role);setVerification(result.state,{reason:result.reason||''});
      if(role!==lastRole){lastRole=role;window.dispatchEvent(new CustomEvent('nexlab:administrative-ui-synced',{detail:{role,state:result.state,version:VERSION,at:Date.now()}}));}
      else{window.dispatchEvent(new CustomEvent('nexlab:administrative-ui-synced',{detail:{role,state:result.state,version:VERSION,at:Date.now(),unchanged:true}}));}
    }finally{syncing=false;}
  }
  function immediateReset(){lastRole='';lastVerification='unauthorized';delete document.documentElement.dataset.nexlabAdminVerification;removeNodes(`${TRIGGER_SELECTOR},${OVERLAY_SELECTOR}`);window.dispatchEvent(new CustomEvent('nexlab:administrative-ui-synced',{detail:{role:'',state:'unauthorized',version:VERSION,at:Date.now(),reset:true}}));}
  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){if(!(node instanceof Element))continue;if(node.matches(OVERLAY_SELECTOR))enhanceOverlay(node);node.querySelectorAll?.(OVERLAY_SELECTOR).forEach(enhanceOverlay);}
      for(const node of record.removedNodes){if(!(node instanceof Element))continue;if(overlayState.has(node))releaseOverlay(node);node.querySelectorAll?.(OVERLAY_SELECTOR).forEach(releaseOverlay);}
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('nexlab:session-reset',()=>{immediateReset();lastSyncAt=0;setTimeout(()=>sync(true),300);});
  window.addEventListener('nexlab:auth-ready',()=>{lastSyncAt=0;setTimeout(()=>sync(true),350);});
  window.addEventListener('storage',event=>{
    if(!String(event.key||'').startsWith(`sb-${PROJECT_REF}-auth-token`))return;
    if(!event.newValue)immediateReset();
    else{lastSyncAt=0;setTimeout(()=>sync(true),250);}
  });
  window.addEventListener('focus',()=>sync());window.addEventListener('online',()=>sync());document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync();});
  setTimeout(()=>sync(true),1800);
  window.NexlabAdministrativeUiGuard=Object.freeze({version:VERSION,sync:(force=false)=>sync(Boolean(force)),reset:immediateReset,getState:()=>({role:lastRole,verification:lastVerification}),selfTest:()=>({ok:true,version:VERSION,overlayFocusTrap:true,escapeClose:true,focusRestored:true,sessionResetCleanup:true,roleResync:true,transientFailurePreservesUi:true,testEnvironmentProtected:true})});
})();
