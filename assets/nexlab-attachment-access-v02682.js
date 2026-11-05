import {g as React,Ln as supabase} from './nexlab-runtime-vendor.js?v=app-beta-0-26-82-icones-acesso-rapido';

export function internalAttachmentPath(value,client=supabase){
  try{
    const url=new URL(String(value||''));
    const origin=new URL(client.supabaseUrl||'https://eahldhabwulnwhuwrhvc.supabase.co').origin;
    if(url.origin!==origin||url.username||url.password)return null;
    const prefix='/storage/v1/object/public/anexos/';
    if(!url.pathname.startsWith(prefix))return null;
    const path=decodeURIComponent(url.pathname.slice(prefix.length));
    if(!path||path.startsWith('/')||path.split('/').some(part=>!part||part==='.'||part==='..')||/[\u0000-\u001f\u007f\\]/.test(path))return null;
    return path;
  }catch{return null;}
}

export function createAttachmentResolver(client=supabase){
  let generation=0;const cache=new Map(),pending=new Map();
  const clear=()=>{generation++;cache.clear();pending.clear();};
  const subscription=client.auth?.onAuthStateChange?.((event)=>{if(['SIGNED_OUT','SIGNED_IN','USER_UPDATED'].includes(event))clear();})?.data?.subscription;
  async function resolve(value){
    const path=internalAttachmentPath(value,client);if(path===null)return value;const sessionGeneration=generation;
    const {data,error:sessionError}=await client.auth.getSession();
    if(sessionError||!data?.session?.user?.id)throw Error('Entre no aplicativo para abrir este arquivo.');
    if(sessionGeneration!==generation)throw Error('Sua sessão mudou. Abra o arquivo novamente.');
    const key=data.session.user.id+'\n'+path,entry=cache.get(key);if(entry?.expiresAt>Date.now()+30000)return entry.url;
    if(pending.has(key))return pending.get(key);
    const token=sessionGeneration;
    const work=(async()=>{
      const {data:signed,error}=await client.storage.from('anexos').createSignedUrl(path,300);
      if(error||!signed?.signedUrl)throw Error('Não foi possível abrir este anexo. Verifique sua permissão e tente novamente.');
      if(token!==generation)throw Error('Sua sessão mudou. Abra o arquivo novamente.');
      const url=new URL(signed.signedUrl);if(url.origin!==new URL(client.supabaseUrl||'https://eahldhabwulnwhuwrhvc.supabase.co').origin||!url.pathname.startsWith('/storage/v1/object/sign/anexos/'))throw Error('Endereço do anexo inválido.');
      cache.set(key,{url:url.href,expiresAt:Date.now()+300000});return url.href;
    })();
    pending.set(key,work);
    try{return await work;}finally{if(pending.get(key)===work)pending.delete(key);}
  }
  return {resolve,clear,dispose(){clear();subscription?.unsubscribe();}};
}
let defaultResolver;
export function PrivateAttachmentLink({url,label,className,children}){
  const [href,setHref]=React.useState(''),[error,setError]=React.useState(''),[retry,setRetry]=React.useState(0);
  React.useEffect(()=>{
    let live=true,timer;setHref('');setError('');defaultResolver||=createAttachmentResolver();
    const load=async()=>{try{const value=await defaultResolver.resolve(url);if(!live)return;setHref(value);setError('');timer=setTimeout(load,240000);}catch(e){if(live){setHref('');setError(e.message||'Não foi possível abrir o anexo.');}}};load();
    return()=>{live=false;clearTimeout(timer);};
  },[url,retry]);
  if(href)return React.createElement('a',{href,target:'_blank',rel:'noopener noreferrer',referrerPolicy:'no-referrer',className,'aria-label':label},children||'Abrir arquivo ↗');
  return React.createElement('span',null,React.createElement('button',{type:'button',className,disabled:!error,onClick:()=>setRetry(x=>x+1),'aria-label':error?'Tentar abrir anexo novamente':'Preparando acesso ao anexo'},error?'Tentar novamente':'Preparando anexo…'),error&&React.createElement('small',{role:'status'},error));
}
