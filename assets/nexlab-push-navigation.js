/* NEXLAB Beta 0.26.48 — navegação Push sincronizada com a prontidão real do aplicativo. */
(()=>{
  const BUILD=globalThis.__NEXLAB_BUILD_IDENTITY__||Object.freeze({version:'0.26.48',revision:'beta-0-26-48-dashboard-equipes-compacto',homologationRevision:'beta-0-26-48-dashboard-equipes-compacto'});
  if(globalThis.__NEXLAB_PUSH_NAVIGATION__?.version===BUILD.version)return;
  const VERSION=BUILD.version;
  const BUILD_REVISION=BUILD.revision;
  const HOMOLOGATION_REVISION=BUILD.homologationRevision||BUILD_REVISION;
  const EVIDENCE_KEY='nexlab:device-homologation:'+VERSION+':'+BUILD_REVISION;
  const ALLOWED_TABS=new Set(['dashboard','pendencias','agenda','notificacoes','participantes','permissoes','equipes','perfil','projetos','inventario','patrimonio','estoque','reserva','marketing','eventos','mural','feedback','relatorios','saude-sistema','logs','atividades-sistema']);
  const RECENT_TTL_MS=10000;
  const CONFIRM_TIMEOUT_MS=4500;
  const MAX_DELIVERY_ATTEMPTS=2;
  const clean=(value,max=180)=>String(value??'').trim().slice(0,max);
  const normalize=(source={})=>{
    const tabCandidate=clean(source.tab||source.targetTab||source.target_tab||'notificacoes',60);
    const tab=ALLOWED_TABS.has(tabCandidate)?tabCandidate:'notificacoes';
    return {tab,notificationId:clean(source.notificationId||source.notification_id||source.notification,80),entityId:clean(source.entityId||source.entity_id||source.entity,100),entityType:clean(source.entityType||source.entity_type,80),pushRequestId:clean(source.pushRequestId||source.push_request_id||source.nexlabPushRequest,100),url:clean(source.url,1200),source:'push'};
  };
  const signature=(target)=>[target.tab,target.notificationId,target.entityId,target.entityType].join('|');
  const fromLocation=()=>{const params=new URL(location.href).searchParams;return normalize({tab:params.get('nexlabTab'),notificationId:params.get('notification'),entityId:params.get('entity'),entityType:params.get('entityType'),pushRequestId:params.get('nexlabPushRequest'),url:location.href});};
  const readEvidence=()=>{try{return JSON.parse(localStorage.getItem(EVIDENCE_KEY)||'{}')||{};}catch{return {};}};
  const writeEvidence=(patch)=>{const current=readEvidence();const next={...current,version:VERSION,revision:HOMOLOGATION_REVISION,buildRevision:BUILD_REVISION,userAgent:navigator.userAgent,updatedAt:new Date().toISOString(),...patch};try{localStorage.setItem(EVIDENCE_KEY,JSON.stringify(next));}catch{}globalThis.dispatchEvent(new CustomEvent('nexlab:push-navigation-evidence',{detail:next}));return next;};
  const persist=(target)=>{try{sessionStorage.setItem('nexlabNotificationTarget',JSON.stringify(target));if(target.tab==='reserva'&&target.entityId)sessionStorage.setItem('nexlabBookingTarget',JSON.stringify({kind:target.entityType==='meeting'?'meeting':'reservation',id:target.entityId,source:'push'}));if(target.tab==='projetos'&&target.entityId)sessionStorage.setItem('nexlabProjectTarget',JSON.stringify({id:target.entityId,source:'push'}));if(target.tab==='agenda'&&target.entityId)sessionStorage.setItem('nexlabAgendaTarget',JSON.stringify({id:target.entityId,entityType:target.entityType,source:'push'}));}catch{}};
  const updateLocation=(target)=>{try{const url=new URL(location.href);url.searchParams.set('nexlabTab',target.tab);if(target.notificationId)url.searchParams.set('notification',target.notificationId);else url.searchParams.delete('notification');if(target.entityId)url.searchParams.set('entity',target.entityId);else url.searchParams.delete('entity');if(target.entityType)url.searchParams.set('entityType',target.entityType);else url.searchParams.delete('entityType');if(target.pushRequestId)url.searchParams.set('nexlabPushRequest',target.pushRequestId);else url.searchParams.delete('nexlabPushRequest');history.replaceState({...history.state,nexlabTab:target.tab,nexlabPushTarget:target},'',url);}catch{}};
  const isApplicationReady=()=>document.body?.dataset?.nexlabAppReady==='true'&&!document.getElementById('nexlab-startup-shell');
  const waitForApplicationReady=(timeoutMs=10000)=>new Promise((resolve)=>{
    if(isApplicationReady())return resolve(true);
    let settled=false;
    const finish=(value)=>{if(settled)return;settled=true;clearTimeout(timer);observer.disconnect();globalThis.removeEventListener('nexlab:application-ready',onReady);resolve(value);};
    const onReady=()=>{if(isApplicationReady())finish(true);};
    globalThis.addEventListener('nexlab:application-ready',onReady);
    const observer=new MutationObserver(()=>{if(isApplicationReady())finish(true);});
    observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-nexlab-app-ready']});
    const timer=setTimeout(()=>finish(false),timeoutMs);
  });
  const matchesConfirmation=(detail,target)=>{if(!detail||String(detail.tabId||'')!==target.tab)return false;const notificationMatches=!target.notificationId||!detail.notificationId||clean(detail.notificationId,80)===target.notificationId;const entityMatches=!target.entityId||!detail.id||clean(detail.id,100)===target.entityId;return notificationMatches&&entityMatches;};
  const waitForAppConfirmation=(target)=>new Promise((resolve)=>{let settled=false;const finish=(value)=>{if(settled)return;settled=true;clearTimeout(timer);globalThis.removeEventListener('nexlab:push-navigation-confirmed',onConfirmed);resolve(value);};const onConfirmed=(event)=>{if(matchesConfirmation(event?.detail,target))finish(true);};globalThis.addEventListener('nexlab:push-navigation-confirmed',onConfirmed);const timer=setTimeout(()=>finish(false),CONFIRM_TIMEOUT_MS);});
  const deliverToApplication=async(target)=>{
    for(let attempt=1;attempt<=MAX_DELIVERY_ATTEMPTS;attempt+=1){
      const ready=await waitForApplicationReady(attempt===1?10000:3500);
      if(!ready)continue;
      const confirmation=waitForAppConfirmation(target);
      const recordId=target.entityId||target.notificationId;
      globalThis.dispatchEvent(new CustomEvent('nexlab:navigate-record',{detail:{tabId:target.tab,id:recordId||null,entityType:target.entityType||'notification',notificationId:target.notificationId||null,pushRequestId:target.pushRequestId||null,source:'push',groupLabel:'Notificação Push',deliveryAttempt:attempt}}));
      if(await confirmation)return {confirmed:true,attempt};
      if(attempt<MAX_DELIVERY_ATTEMPTS)await new Promise(resolve=>setTimeout(resolve,350));
    }
    return {confirmed:false,attempt:MAX_DELIVERY_ATTEMPTS};
  };
  const dispatchFlow=async(target)=>{
    persist(target);updateLocation(target);globalThis.__NEXLAB_LAST_PUSH_TARGET__=Object.freeze({...target});globalThis.__NEXLAB_PENDING_PUSH_TARGET__=Object.freeze({...target});
    globalThis.dispatchEvent(new CustomEvent('nexlab:push-navigation',{detail:target}));
    const result=await deliverToApplication(target);
    if(result.confirmed){globalThis.__NEXLAB_PENDING_PUSH_TARGET__=null;writeEvidence({automaticPushDisplayedAt:new Date().toISOString(),automaticPushDestinationAt:new Date().toISOString(),automaticPushDestinationSignature:signature(target),automaticPushRequestId:target.pushRequestId||null});}
    return {ok:result.confirmed,confirmed:result.confirmed,deliveryAttempt:result.attempt,target,error:result.confirmed?'':'O aplicativo não confirmou a navegação após ficar pronto.'};
  };
  const dispatch=(source)=>{const target=normalize(source);const key=signature(target);const now=Date.now();const previous=globalThis.__NEXLAB_LAST_PUSH_DISPATCH__;if(previous?.key===key&&now-previous.at<RECENT_TTL_MS)return previous.promise;const promise=dispatchFlow(target);globalThis.__NEXLAB_LAST_PUSH_DISPATCH__={key,at:now,target,promise};return promise;};
  const respond=(port,payload)=>{try{port?.postMessage(payload);}catch{}};
  const onMessage=(event)=>{if(event?.data?.type!=='NEXLAB_NAVIGATE')return;const target=normalize(event.data);writeEvidence({automaticPushDisplayedAt:new Date().toISOString(),automaticPushRequestId:target.pushRequestId||null});void dispatch(target).then(result=>respond(event.ports?.[0],{type:'NEXLAB_NAVIGATE_ACK',requestId:target.pushRequestId||'',ok:result.ok===true,confirmed:result.confirmed===true,deliveryAttempt:result.deliveryAttempt||0,tab:target.tab,notificationId:target.notificationId,entityId:target.entityId,error:result.error||''})).catch(error=>respond(event.ports?.[0],{type:'NEXLAB_NAVIGATE_ACK',requestId:target.pushRequestId||'',ok:false,error:String(error?.message||error)}));};
  navigator.serviceWorker?.addEventListener('message',onMessage);
  const initial=()=>{const target=fromLocation();if(target.notificationId||target.entityId||target.pushRequestId){if(target.pushRequestId)writeEvidence({automaticPushDisplayedAt:new Date().toISOString(),automaticPushRequestId:target.pushRequestId});void dispatch(target);}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initial,{once:true});else initial();
  globalThis.__NEXLAB_PUSH_NAVIGATION__=Object.freeze({version:VERSION,normalize,dispatch,isApplicationReady,getPending:()=>globalThis.__NEXLAB_PENDING_PUSH_TARGET__||null,getLast:()=>globalThis.__NEXLAB_LAST_PUSH_TARGET__||null});
})();
