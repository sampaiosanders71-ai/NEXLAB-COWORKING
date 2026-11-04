import {downloadImage,extractPreview} from './preview.ts';
const bucket='mural-media';
export function cachedPath(url:string,base:string):string|null {
 try{const candidate=new URL(url),own=new URL(base);const prefix='/storage/v1/object/authenticated/'+bucket+'/';if(candidate.origin!==own.origin||!candidate.pathname.startsWith(prefix)||candidate.search||candidate.hash)return null;const path=decodeURIComponent(candidate.pathname.slice(prefix.length));return /^link-cache\/[a-f0-9]{64}\.(jpg|png|webp)$/.test(path)?path:null;}catch{return null;}
}
const stableUrl=(base:string,path:string)=>base.replace(/\/$/,'')+'/storage/v1/object/authenticated/'+bucket+'/'+path;
const inflight=new Map<string,Promise<string|null>>();
const cooldown=new Map<string,number>();
export async function cacheCover(admin:any,base:string,source:string,candidate?:string|null):Promise<string|null>{
 const canonical=new URL(source);canonical.hash='';const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical.href)))).map(n=>n.toString(16).padStart(2,'0')).join('');
 if(inflight.has(key))return inflight.get(key)!;
 const work=(async()=>{
  // A signed URL is returned only if Storage can read an existing object.
  for(const extension of ['jpg','png','webp']){
   const path='link-cache/'+key+'.'+extension;const {data,error}=await admin.storage.from(bucket).createSignedUrl(path,60);
   if(!error&&data?.signedUrl)return stableUrl(base,path);
  }
  if((cooldown.get(key)||0)>Date.now())return null;
  cooldown.set(key,Date.now()+60000);
  // Bound worker-local failure state; successful media lives in private Storage.
  if(cooldown.size>256)for(const [k,until] of cooldown)if(until<Date.now())cooldown.delete(k);
  while(cooldown.size>256)cooldown.delete(cooldown.keys().next().value!);
  let media;
  if(candidate&&!cachedPath(candidate,base))try{media=await downloadImage(candidate)}catch{}
  if(!media){const fresh=await extractPreview(canonical.href);if(!fresh)return null;try{media=await downloadImage(fresh)}catch{return null}}
  const path='link-cache/'+key+'.'+media.extension;
  const {error}=await admin.storage.from(bucket).upload(path,media.bytes,{contentType:media.contentType,cacheControl:'31536000',upsert:false});
  if(error){const existing=await admin.storage.from(bucket).createSignedUrl(path,60);if(existing.error||!existing.data?.signedUrl)return null;}
  cooldown.delete(key);return stableUrl(base,path);
 })().catch(()=>null).finally(()=>inflight.delete(key));
 inflight.set(key,work);return work;
}
