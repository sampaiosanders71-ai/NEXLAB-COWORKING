(function(root){
  'use strict';
  const VERSION='0.26.82';
  const REVISION='beta-0-26-82-google-calendar-integracao';
  const RPC='nexlab_get_release_publish_gate_v02682';
  const ASSERT_RPC='nexlab_assert_release_publishable_v02682';
  const EVIDENCE_KEY='nexlab:device-homologation:'+VERSION+':'+REVISION;
  let state=Object.freeze({version:VERSION,revision:REVISION,publication_allowed:false,reason:'physical_receipt_required',source:'local'});
  function readEvidence(){try{return JSON.parse(localStorage.getItem(EVIDENCE_KEY)||'{}')||{};}catch{return {};}}
  function localState(){const e=readEvidence();const exact=e.serverReceiptComplete===true&&e.serverReceiptRevision===REVISION&&e.version===VERSION&&Boolean(e.serverReceiptId);return {version:VERSION,revision:REVISION,publication_allowed:exact,reason:exact?'exact_physical_receipt_present':'physical_receipt_required',receipt_id:exact?String(e.serverReceiptId):null,completed_at:exact?String(e.serverReceiptAt||''):null,manual_override_allowed:false,source:'local_receipt'};}
  function render(next){const el=document.getElementById('nexlab-release-gate-status');if(!el)return;const ok=next?.publication_allowed===true;el.className='device-status '+(ok?'ok':'pending');el.textContent=ok?'Promoção oficial liberada: recibo físico exato confirmado.':'Promoção oficial BLOQUEADA: falta recibo físico válido desta versão e revisão.';const box=document.getElementById('nexlab-release-gate');if(box)box.dataset.publicationAllowed=String(ok);}
  async function waitClient(timeoutMs=15000){const started=Date.now();while(Date.now()-started<timeoutMs){const c=root.__NEXLAB_SUPABASE__;if(c?.rpc&&c?.auth?.getSession)return c;await new Promise(r=>setTimeout(r,300));}return null;}
  async function refresh(){const local=localState();state=Object.freeze(local);render(state);const client=await waitClient();if(!client){root.dispatchEvent(new CustomEvent('nexlab:release-gate',{detail:state}));return state;}try{const s=await client.auth.getSession();if(!s?.data?.session)return state;const result=await client.rpc(RPC);if(result?.error)throw result.error;state=Object.freeze({...local,...(result.data||{}),source:'server'});render(state);root.dispatchEvent(new CustomEvent('nexlab:release-gate',{detail:state}));return state;}catch(error){state=Object.freeze({...local,server_error:String(error?.message||error)});render(state);return state;}}
  async function assertPromotable(){const client=await waitClient();if(!client)throw new Error('Cliente Supabase indisponível.');const result=await client.rpc(ASSERT_RPC);if(result?.error)throw result.error;const data=result?.data||{};if(data.ok===false||data.publication_allowed!==true)throw new Error('Promoção oficial bloqueada: falta homologação física válida desta versão.');return data;}
  root.__NEXLAB_RELEASE_GATE__=Object.freeze({version:VERSION,revision:REVISION,refresh,getState:()=>state,localState,assertPromotable});
  const boot=()=>{state=Object.freeze(localState());render(state);setTimeout(()=>void refresh(),1200);};
  root.addEventListener('nexlab:auth-ready',()=>void refresh());
  root.addEventListener('nexlab:device-homologation-synced',()=>void refresh());
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof window!=='undefined'?window:globalThis);
