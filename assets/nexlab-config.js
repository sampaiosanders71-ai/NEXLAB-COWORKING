(function(root){
  'use strict';
  if(root.__NEXLAB_CONFIG__?.valid)return;

  const VERSION='0.26.82';
  const SUPABASE_URL='https://eahldhabwulnwhuwrhvc.supabase.co';
  const SUPABASE_ANON_KEY='sb_publishable_hr-WTQUBbBE0Ei3Lr2hkhQ_XSKG_PXa';
  const VAPID_PUBLIC_KEY='BIwuvqKRH2PipAjpAMTwmVM6kUgN0XycoLCD99uuKJQcO3e0rXWZWBNBaMZaqFxGHBL90aKQrTbMZaNLb_xblLE';

  function fail(message){
    const error=new Error(`Configuração do NEXLAB inválida: ${message}`);
    error.name='NexlabConfigurationError';
    throw error;
  }
  function findAccessToken(value,depth=0){
    if(!value||depth>7)return '';
    if(typeof value==='object'&&typeof value.access_token==='string'&&value.access_token)return value.access_token;
    if(Array.isArray(value)){for(const item of value){const token=findAccessToken(item,depth+1);if(token)return token;}return '';}
    if(typeof value==='object'){for(const item of Object.values(value)){const token=findAccessToken(item,depth+1);if(token)return token;}}
    return '';
  }
  function decodeJwtSubject(jwt){
    try{
      const body=String(jwt||'').split('.')[1]||'';
      const normalized=body.replace(/-/g,'+').replace(/_/g,'/');
      const padded=normalized+'='.repeat((4-normalized.length%4)%4);
      const payload=JSON.parse(decodeURIComponent(Array.from(atob(padded),c=>`%${c.charCodeAt(0).toString(16).padStart(2,'0')}`).join('')));
      return String(payload?.sub||'');
    }catch{return '';}
  }

  let parsed;
  try{parsed=new URL(SUPABASE_URL);}catch{fail('URL do Supabase malformada.');}
  if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.supabase.co'))fail('a URL do Supabase deve usar HTTPS e o domínio oficial.');
  const projectRef=parsed.hostname.split('.')[0];
  if(!/^[a-z0-9]+$/.test(projectRef))fail('referência do projeto não reconhecida.');
  if(!SUPABASE_ANON_KEY.startsWith('sb_publishable_'))fail('chave pública ausente ou incompatível.');
  if(!VAPID_PUBLIC_KEY)fail('chave pública VAPID ausente.');

  const authStoragePrefix=`sb-${projectRef}-auth-token`;
  const authStorageKey=authStoragePrefix;
  function readStoredSession(){
    try{
      const keys=[authStorageKey];
      for(let i=0;i<localStorage.length;i+=1){const key=localStorage.key(i)||'';if(key.startsWith(authStoragePrefix)&&!keys.includes(key))keys.push(key);}
      for(const key of keys){
        const raw=localStorage.getItem(key);if(!raw)continue;
        try{const parsed=JSON.parse(raw);if(parsed)return parsed;}catch{}
      }
    }catch{}
    return null;
  }
  function getAccessToken(){return findAccessToken(readStoredSession());}
  function getUserId(){return decodeJwtSubject(getAccessToken());}
  function addConnectionHints(){
    if(typeof document==='undefined'||!document.head)return;
    for(const [rel,href] of [['dns-prefetch',`//${parsed.hostname}`],['preconnect',SUPABASE_URL]]){
      if(document.head.querySelector(`link[rel="${rel}"][href="${href}"]`))continue;
      const link=document.createElement('link');link.rel=rel;link.href=href;if(rel==='preconnect')link.crossOrigin='anonymous';document.head.appendChild(link);
    }
  }

  const config=Object.freeze({
    valid:true,
    version:VERSION,
    environment:'production',
    supabaseUrl:SUPABASE_URL,
    supabaseAnonKey:SUPABASE_ANON_KEY,
    projectRef,
    authStorageKey,
    authStoragePrefix,
    vapidPublicKey:VAPID_PUBLIC_KEY,
    appUrl:root.location&&['http:','https:'].includes(root.location.protocol)?new URL('./',root.location.href).href:'',
    endpoints:Object.freeze({
      auth:`${SUPABASE_URL}/auth/v1`,
      rest:`${SUPABASE_URL}/rest/v1`,
      functions:`${SUPABASE_URL}/functions/v1`,
      storage:`${SUPABASE_URL}/storage/v1`,
      realtime:`wss://${parsed.hostname}/realtime/v1/websocket`,
      communication:'https://nexlab-communication.sampaiosanders71.workers.dev'
    }),
    readStoredSession,
    getAccessToken,
    getUserId,
    assert(){if(!this.valid)fail('configuração não carregada.');return this;}
  });

  try{Object.defineProperty(root,'__NEXLAB_CONFIG__',{value:config,enumerable:true,configurable:false,writable:false});}
  catch{root.__NEXLAB_CONFIG__=config;}
  addConnectionHints();
  try{root.dispatchEvent?.(new CustomEvent('nexlab:config-ready',{detail:{version:VERSION,projectRef}}));}catch{}
})(typeof window!=='undefined'?window:globalThis);
