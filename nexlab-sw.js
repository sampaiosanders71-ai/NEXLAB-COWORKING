const APP_VERSION='0.26.82';
const APP_RELEASE='Beta';
const APP_REVISION='beta-0-26-82-dashboard-acoes-compactas';
const GENERATED_AT='2026-09-06T22:57:02Z';
const ASSET_REVISION='app-beta-0-26-82-recuperacao-app';
const CACHE_NAME='nexlab-app-beta-0-26-82-dashboard-acoes-compactas-20260906T225702Z';
const GENERATION_KEY=GENERATED_AT.replace(/[^0-9A-Za-z]/g,'');
const STAGING_CACHE_NAME='nxl-stage-'+APP_REVISION+'-'+GENERATION_KEY;
const META_CACHE_NAME='nexlab-update-meta';
const CACHE_PREFIX='nexlab-';
const LEGACY_ASSET_REVISIONS=new Set(["app-beta-0-26-82-notificacoes-runtime-corrigido"]);
const HEAD_PATH='release-head.json';
const MANIFEST_PATH='release-manifest.json';
const NETWORK_TIMEOUT_MS=6000;
const INSTALL_FETCH_TIMEOUT_MS=9000;
const INSTALL_RETRIES=2;
const INSTALL_CONCURRENCY=4;
const ALLOWED_TABS=new Set(['dashboard','pendencias','agenda','notificacoes','participantes','permissoes','equipes','perfil','projetos','inventario','patrimonio','estoque','reserva','marketing','eventos','mural','feedback','configuracoes','relatorios','saude-sistema','logs','atividades-sistema']);
const SCOPE_URL=new URL(self.registration.scope);
const INDEX_URL=new URL('./index.html',self.registration.scope).href;
const OFFLINE_URL=new URL('./offline.html',self.registration.scope).href;
let installManifest=null;

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function timeout(ms){return new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tempo de rede excedido.')),ms));}
async function fetchWithTimeout(request,ms){if(typeof AbortController==='undefined')return Promise.race([fetch(request),timeout(ms)]);const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);try{return await fetch(new Request(request,{signal:controller.signal}));}finally{clearTimeout(timer);}}
function expectedKind(path){if(/\.js$/i.test(path))return'script';if(/\.css$/i.test(path))return'style';if(/\.webmanifest$/i.test(path))return'manifest';if(/\.json$/i.test(path))return'json';if(/\.(?:png|webp|ico|jpe?g|svg)$/i.test(path))return'image';if(/\.html$/i.test(path))return'html';return'other';}
function mimeOk(kind,value){const ct=String(value||'').toLowerCase();if(kind==='script')return/(?:javascript|ecmascript)/.test(ct);if(kind==='style')return ct.includes('text/css');if(kind==='manifest'||kind==='json')return/(?:application\/manifest\+json|application\/json|text\/json)/.test(ct);if(kind==='image')return ct.startsWith('image/');if(kind==='html')return ct.includes('text/html');return true;}
function hex(buffer){return[...new Uint8Array(buffer)].map(v=>v.toString(16).padStart(2,'0')).join('');}
async function sha256(buffer){return hex(await crypto.subtle.digest('SHA-256',buffer));}
async function responseBytes(response){return response.clone().arrayBuffer();}
function canonicalUrl(path){return new URL('./'+String(path||'').replace(/^\.\//,''),self.registration.scope).href;}
function freshUrl(path){const url=new URL(canonicalUrl(path));if(/\.(?:js|css|webmanifest)$/i.test(url.pathname))url.searchParams.set('v',ASSET_REVISION);else url.searchParams.set('build',APP_REVISION);return url.href;}
async function fetchJsonFresh(path){const url=new URL(canonicalUrl(path));url.searchParams.set('build',APP_REVISION);const response=await fetchWithTimeout(new Request(url.href,{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}}),INSTALL_FETCH_TIMEOUT_MS);if(!response.ok)throw new Error(`${path} indisponível (${response.status}).`);const buffer=await responseBytes(response);return{response,buffer,json:JSON.parse(new TextDecoder().decode(buffer))};}
async function loadInstallDefinition(){const headResult=await fetchJsonFresh(HEAD_PATH);const head=headResult.json||{};if(head.version!==APP_VERSION||head.revision!==APP_REVISION||head.asset_revision!==ASSET_REVISION||Number(head.protocol||0)!==2)throw new Error('release-head.json não corresponde ao Service Worker em instalação.');const manifestResult=await fetchJsonFresh(head.manifest||MANIFEST_PATH);const manifestHash=await sha256(manifestResult.buffer);if(String(head.manifest_sha256||'').toLowerCase()!==manifestHash)throw new Error('Hash do release-manifest.json não confere com o cabeçalho da revisão.');const manifest=manifestResult.json||{};if(manifest.version!==APP_VERSION||manifest.revision!==APP_REVISION||manifest.asset_revision!==ASSET_REVISION)throw new Error('Manifesto de atualização pertence a outra revisão.');if(!Array.isArray(manifest.essential_files)||manifest.essential_files.length<8)throw new Error('Manifesto de atualização sem shell essencial válido.');installManifest=manifest;return{head,manifest,headResult,manifestResult,manifestHash};}
async function fetchVerified(entry){const path=String(entry.path||'');if(!path)throw new Error('Entrada de atualização sem caminho.');let lastError=null;for(let attempt=1;attempt<=INSTALL_RETRIES;attempt++){try{const request=new Request(freshUrl(path),{cache:'no-store',credentials:'same-origin'});const response=await fetchWithTimeout(request,INSTALL_FETCH_TIMEOUT_MS);if(!response.ok||response.type==='opaque'||!mimeOk(expectedKind(path),response.headers.get('content-type')))throw new Error(`Resposta inválida (${response.status}) para ${path}.`);const buffer=await responseBytes(response);if(Number(entry.size)!==buffer.byteLength)throw new Error(`Tamanho divergente em ${path}.`);const digest=await sha256(buffer);if(digest!==String(entry.sha256||'').toLowerCase())throw new Error(`Hash divergente em ${path}.`);return{path,response};}catch(error){lastError=error;if(attempt<INSTALL_RETRIES)await sleep(400*attempt);}}throw new Error(`Falha ao preparar ${path}: ${String(lastError?.message||lastError)}`);}
async function mapConcurrency(items,limit,fn){const values=Array.from(items||[]);let cursor=0;const runners=Array.from({length:Math.max(1,Math.min(limit,values.length||1))},async()=>{while(true){const i=cursor++;if(i>=values.length)return;await fn(values[i],i);}});await Promise.all(runners);}
async function stageInstall(){await caches.delete(STAGING_CACHE_NAME);const definition=await loadInstallDefinition();const cache=await caches.open(STAGING_CACHE_NAME);try{await mapConcurrency(definition.manifest.essential_files,INSTALL_CONCURRENCY,async entry=>{const result=await fetchVerified(entry);await cache.put(canonicalUrl(result.path),result.response.clone());});await cache.put(canonicalUrl(HEAD_PATH),definition.headResult.response.clone());await cache.put(canonicalUrl(MANIFEST_PATH),definition.manifestResult.response.clone());const validation=await validateStaging(definition.manifest);if(!validation.ok)throw new Error('O cache temporário não passou na validação final.');return validation;}catch(error){await caches.delete(STAGING_CACHE_NAME);throw error;}}
async function manifestFromCache(cacheName){const cache=await caches.open(cacheName);const response=await cache.match(canonicalUrl(MANIFEST_PATH),{ignoreSearch:true});if(!response)return null;try{return await response.json();}catch{return null;}}
async function validateCache(cacheName,manifest){const cache=await caches.open(cacheName);const missing=[],invalid=[];let bytes=0;for(const entry of manifest?.essential_files||[]){const response=await cache.match(canonicalUrl(entry.path),{ignoreSearch:true});if(!response){missing.push(entry.path);continue;}try{const buffer=await responseBytes(response);bytes+=buffer.byteLength;if(buffer.byteLength!==Number(entry.size))throw new Error('size');const digest=await sha256(buffer);if(digest!==String(entry.sha256||'').toLowerCase())throw new Error('sha256');if(!mimeOk(expectedKind(entry.path),response.headers.get('content-type')))throw new Error('mime');}catch(error){invalid.push(`${entry.path} (${String(error?.message||error)})`);}}return{ok:missing.length===0&&invalid.length===0,version:APP_VERSION,release:APP_RELEASE,revision:APP_REVISION,assetRevision:ASSET_REVISION,essentialCount:(manifest?.essential_files||[]).length,essentialBytes:bytes,missing,invalid,protocol:2};}
async function validateStaging(manifest=installManifest){const resolved=manifest||await manifestFromCache(STAGING_CACHE_NAME);if(!resolved)return{ok:false,error:'Manifesto temporário ausente.',revision:APP_REVISION};return validateCache(STAGING_CACHE_NAME,resolved);}
async function promoteStaging(){const manifest=await manifestFromCache(STAGING_CACHE_NAME);const validation=await validateStaging(manifest);if(!validation.ok)throw new Error('Cache temporário inválido no momento da ativação.');await caches.delete(CACHE_NAME);const staging=await caches.open(STAGING_CACHE_NAME);const target=await caches.open(CACHE_NAME);for(const request of await staging.keys()){const response=await staging.match(request);if(response)await target.put(request,response);}const finalValidation=await validateCache(CACHE_NAME,manifest);if(!finalValidation.ok){await caches.delete(CACHE_NAME);throw new Error('Falha ao promover o cache validado.');}return finalValidation;}
async function oldCacheNames(){const keys=await caches.keys();return keys.filter(name=>name.startsWith(CACHE_PREFIX)&&!name.startsWith('nexlab-stage-')&&name!==CACHE_NAME&&name!==META_CACHE_NAME).sort().reverse();}
function cacheGeneration(name){const match=String(name||'').match(/-(\d{8}T\d{6}Z)$/);return match?match[1]:'';}
async function cleanupOldCaches(){const names=await oldCacheNames();const all=await caches.keys();const staleStages=all.filter(name=>{const isStage=name.startsWith('nxl-stage-')||name.startsWith('nexlab-stage-');if(!isStage||name===STAGING_CACHE_NAME)return false;const generation=cacheGeneration(name);return !generation||generation<GENERATION_KEY;});await Promise.all([...names,...staleStages].map(name=>caches.delete(name)));await caches.delete(STAGING_CACHE_NAME);return [...names,...staleStages];}
self.addEventListener('install',event=>{event.waitUntil(stageInstall());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const validation=await promoteStaging();await self.clients.claim();const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of clients){try{client.postMessage({type:'NEXLAB_SW_ACTIVATED',version:APP_VERSION,release:APP_RELEASE,revision:APP_REVISION,generatedAt:GENERATED_AT,cache:CACHE_NAME,validation,previousCachesRetained:true});}catch{}}})());});
async function activeCacheMatch(request,options={}){const cache=await caches.open(CACHE_NAME);return cache.match(request,options);}
async function previousCacheMatch(request,options={}){for(const name of await oldCacheNames()){const cache=await caches.open(name);const hit=await cache.match(request,options);if(hit)return hit;}return null;}
function requestedRevision(url){const value=String(url.searchParams.get('v')||'').trim();return /^app-(?:beta|rc|stable)-/i.test(value)?value:'';}
function allowedAssetRevision(value){return !value||value===ASSET_REVISION||LEGACY_ASSET_REVISIONS.has(value);}
function isStatic(request,url){return ['script','style','image','font','manifest'].includes(request.destination)||/\.(?:js|css|png|webp|ico|jpe?g|svg|woff2?|webmanifest)$/i.test(url.pathname);}
function appEntry(url){const scope=SCOPE_URL.pathname.endsWith('/')?SCOPE_URL.pathname:SCOPE_URL.pathname+'/';return url.pathname===scope||url.pathname===scope+'index.html';}
async function cacheCurrentNetwork(request){const response=await fetchWithTimeout(new Request(request,{cache:'no-store'}),NETWORK_TIMEOUT_MS);if(!response.ok||response.type==='opaque')throw new Error('Resposta de rede inválida.');const cache=await caches.open(CACHE_NAME);await cache.put(new Request(new URL(request.url).origin+new URL(request.url).pathname),response.clone());return response;}
async function staticResponse(request,url){const reqRev=requestedRevision(url);if(reqRev&&!allowedAssetRevision(reqRev)){const old=await previousCacheMatch(request,{ignoreSearch:true});if(old)return old;return new Response('/* revisão antiga indisponível */',{status:409,headers:{'Content-Type':/\.css$/i.test(url.pathname)?'text/css':'text/javascript','Cache-Control':'no-store'}});}if(request.cache==='reload'||request.cache==='no-store')try{return await cacheCurrentNetwork(request);}catch{}const cached=await activeCacheMatch(request,{ignoreSearch:true});if(cached)return cached;try{return await cacheCurrentNetwork(request);}catch(error){const old=await previousCacheMatch(request,{ignoreSearch:true});if(old)return old;throw error;}}
async function navigationResponse(request,url){if(appEntry(url)){const cached=await activeCacheMatch(INDEX_URL,{ignoreSearch:true});if(cached)return cached;const old=await previousCacheMatch(INDEX_URL,{ignoreSearch:true});if(old)return old;}try{return await fetchWithTimeout(new Request(request,{cache:'no-store'}),NETWORK_TIMEOUT_MS);}catch{return await activeCacheMatch(OFFLINE_URL,{ignoreSearch:true})||await previousCacheMatch(OFFLINE_URL,{ignoreSearch:true})||new Response('<!doctype html><meta charset="utf-8"><title>NEXLAB offline</title><h1>NEXLAB offline</h1>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});}}
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;if([HEAD_PATH,MANIFEST_PATH,'release.json'].some(path=>url.pathname.endsWith('/'+path))){event.respondWith(fetch(new Request(request,{cache:'no-store'})));return;}if(request.mode==='navigate'){event.respondWith(navigationResponse(request,url));return;}if(isStatic(request,url)){event.respondWith(staticResponse(request,url).catch(()=>new Response('',{status:503})));return;}});
self.addEventListener('message',event=>{const type=String(event.data?.type||'');if(type==='NEXLAB_GET_VERSION'){event.ports?.[0]?.postMessage({ok:true,type:'NEXLAB_VERSION',version:APP_VERSION,release:APP_RELEASE,revision:APP_REVISION,generatedAt:GENERATED_AT,cache:CACHE_NAME,protocol:2,cachePolicy:'staging-hash-waiting-user-activation'});return;}if(type==='NEXLAB_VALIDATE_INSTALL'){event.waitUntil((async()=>{try{event.ports?.[0]?.postMessage(await validateStaging());}catch(error){event.ports?.[0]?.postMessage({ok:false,revision:APP_REVISION,error:String(error?.message||error)});}})());return;}if(type==='NEXLAB_ACTIVATE_UPDATE'||type==='NEXLAB_SKIP_WAITING'){event.waitUntil((async()=>{try{const expectedVersion=String(event.data?.expectedVersion||'');const expectedRevision=String(event.data?.expectedRevision||'');if(expectedVersion&&expectedVersion!==APP_VERSION)throw new Error('Versão confirmada diferente do worker.');if(expectedRevision&&expectedRevision!==APP_REVISION)throw new Error('Revisão confirmada diferente do worker.');const validation=await validateStaging();if(!validation.ok)throw new Error('A revisão em espera não está íntegra.');event.ports?.[0]?.postMessage({ok:true,version:APP_VERSION,revision:APP_REVISION,validation});await self.skipWaiting();}catch(error){event.ports?.[0]?.postMessage({ok:false,error:String(error?.message||error)});}})());return;}if(type==='NEXLAB_APP_BOOT_OK'){event.waitUntil((async()=>{try{const expected=String(event.data?.expectedRevision||'');if(expected&&expected!==APP_REVISION)throw new Error('Confirmação de boot pertence a outra revisão.');const removed=await cleanupOldCaches();event.ports?.[0]?.postMessage({ok:true,revision:APP_REVISION,removedCaches:removed});}catch(error){event.ports?.[0]?.postMessage({ok:false,error:String(error?.message||error)});}})());return;}});

function createPushRequestId(){
  try{return crypto.randomUUID();}catch{return `push-${Date.now()}-${Math.random().toString(16).slice(2)}`;}
}

function safePushDestination(raw,tab,notificationId,entityId,entityType,pushRequestId){
  let url;
  try{url=new URL(String(raw||''),self.registration.scope);}catch{url=new URL('./',self.registration.scope);}
  const scope=new URL(self.registration.scope);
  if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))url=new URL('./',self.registration.scope);
  url.searchParams.set('nexlabTab',tab);
  if(notificationId)url.searchParams.set('notification',notificationId);
  if(entityId)url.searchParams.set('entity',entityId);
  if(entityType)url.searchParams.set('entityType',entityType);
  if(pushRequestId)url.searchParams.set('nexlabPushRequest',pushRequestId);
  return url.toString();
}

async function postNavigationAndWaitForAck(client,message,timeoutMs=5200){
  if(!client)return {ok:false,error:'Cliente indisponível.'};
  const channel=new MessageChannel();
  const response=new Promise((resolve)=>{
    let settled=false;
    const finish=(value)=>{if(settled)return;settled=true;clearTimeout(timer);try{channel.port1.close();}catch{}resolve(value);};
    const timer=setTimeout(()=>finish({ok:false,error:'O aplicativo não confirmou a navegação Push.'}),timeoutMs);
    channel.port1.onmessage=(event)=>{
      const data=event.data&&typeof event.data==='object'?event.data:{};
      const requestMatches=!message.pushRequestId||String(data.requestId||'')===message.pushRequestId;
      finish(requestMatches&&data.type==='NEXLAB_NAVIGATE_ACK'&&data.ok===true
        ?{ok:true,ack:data}
        :{ok:false,error:String(data.error||'Confirmação Push inválida.'),ack:data});
    };
  });
  try{client.postMessage({...message,handledByBridge:true,requiresAck:true},[channel.port2]);}
  catch(error){return {ok:false,error:String(error?.message||error)};}
  return response;
}

self.addEventListener('push',(event)=>{
  let payload={};
  try{payload=event.data?event.data.json():{};}catch{payload={body:event.data?.text()};}
  const source=payload?.data&&typeof payload.data==='object'?payload.data:{};
  const requested=String(source.targetTab||source.target_tab||'notificacoes');
  const targetTab=ALLOWED_TABS.has(requested)?requested:'notificacoes';
  const notificationId=String(source.notificationId||source.notification_id||'').trim().slice(0,80);
  const entityId=String(source.entityId||source.entity_id||'').trim().slice(0,100);
  const entityType=String(source.entityType||source.entity_type||'').trim().slice(0,80);
  const url=safePushDestination(source.url,targetTab,notificationId,entityId,entityType,'');
  event.waitUntil(self.registration.showNotification(String(payload.title||'NEXLAB').slice(0,120),{
    body:String(payload.body||'Você recebeu uma nova notificação.').slice(0,500),
    icon:'./icons/nexlab-192.png?v=brand-r50',
    badge:'./icons/nexlab-192.png?v=brand-r50',
    tag:String(payload.tag||`nexlab-${notificationId||Date.now()}`).slice(0,160),
    data:{url,targetTab,notificationId,entityId,entityType}
  }));
});

self.addEventListener('notificationclick',(event)=>{
  event.notification.close();
  const data=event.notification?.data&&typeof event.notification.data==='object'?event.notification.data:{};
  const requested=String(data.targetTab||'notificacoes');
  const tab=ALLOWED_TABS.has(requested)?requested:'notificacoes';
  const notificationId=String(data.notificationId||'').trim().slice(0,80);
  const entityId=String(data.entityId||'').trim().slice(0,100);
  const entityType=String(data.entityType||'').trim().slice(0,80);
  const pushRequestId=createPushRequestId();
  const destination=safePushDestination(data.url,tab,notificationId,entityId,entityType,pushRequestId);
  const message={type:'NEXLAB_NAVIGATE',tab,targetTab:tab,notificationId,entityId,entityType,pushRequestId,url:destination,source:'push'};
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const scope=new URL(self.registration.scope);
    const eligible=windows.filter(item=>{try{const url=new URL(item.url);return url.origin===scope.origin&&url.pathname.startsWith(scope.pathname);}catch{return false;}});
    const client=eligible.find(item=>item.focused)||eligible.find(item=>item.visibilityState==='visible')||eligible[0]||null;
    if(client){
      try{await client.focus();}catch{}
      const acknowledgment=await postNavigationAndWaitForAck(client,message);
      if(acknowledgment.ok)return client;
      try{
        const navigated=typeof client.navigate==='function'?await client.navigate(destination):null;
        const targetClient=navigated||client;
        try{await targetClient.focus();}catch{}
        return targetClient;
      }catch{
        // A confirmação falhou e a janela não pôde ser redirecionada; abrir uma nova é o último fallback.
      }
    }
    if(self.clients.openWindow){
      const opened=await self.clients.openWindow(destination);
      if(opened)return opened;
    }
    throw new Error('Não foi possível abrir nem confirmar o destino da notificação Push.');
  })());
});

