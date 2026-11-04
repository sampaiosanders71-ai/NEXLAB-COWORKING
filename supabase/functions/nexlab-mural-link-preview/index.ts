import {createClient} from 'npm:@supabase/supabase-js@2.95.3';
import {publicUrl,extractPreview} from './preview.ts';
import {cacheCover,cachedPath} from './media.ts';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply({error:'Método inválido.'},405);
 const authorization=req.headers.get('Authorization')||'';
 if(!/^Bearer\s+\S+$/i.test(authorization))return reply({error:'Autenticação obrigatória.'},401);
 const userClient=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:userData,error:authError}=await userClient.auth.getUser(authorization.replace(/^Bearer\s+/i,''));
 if(authError||!userData.user)return reply({error:'Sessão inválida.'},401);
 let input;
 try{if(Number(req.headers.get('Content-Length')||0)>8192)return reply({error:'Solicitação muito grande.'},413);const reader=req.body?.getReader();if(!reader)return reply({error:'Solicitação inválida.'},400);let bytes=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>8192){await reader.cancel();return reply({error:'Solicitação muito grande.'},413)}chunks.push(value)}const all=new Uint8Array(bytes);let pos=0;for(const c of chunks){all.set(c,pos);pos+=c.length}input=JSON.parse(new TextDecoder().decode(all));}catch{return reply({error:'Solicitação inválida.'},400)}
 if(!input||typeof input!=='object'||Array.isArray(input))return reply({error:'Solicitação inválida.'},400);
 const base=Deno.env.get('SUPABASE_URL')!;
 const admin=createClient(base,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 if(input.action==='ensure_cover'){
  if(typeof input.post_id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.post_id))return reply({error:'Publicação inválida.'},400);
  // The authenticated Mural RPC checks approved membership and module access.
  // Ignore client URLs: only a currently visible, saved post may be mirrored.
  const {data:feed,error}=await userClient.rpc('nexlab_mural_v02682',{p_action:'list',p_payload:{archived:!!input.archived}});
  if(error||!feed?.permissions?.view)return reply({error:'Sem acesso a esta publicação.'},403);
  const post=feed.rows?.find((p:any)=>p.id===input.post_id);
  if(!post?.link_url||input.expected_link&&input.expected_link!==post.link_url)return reply({image_url:null,status:'unavailable'});
  try{publicUrl(post.link_url)}catch{return reply({image_url:null,status:'unavailable'})}
  const image=await cacheCover(admin,base,post.link_url,post.link_image_url);
  return reply({image_url:image,status:image?'ready':'unavailable'});
 }
 let url:string;
 try{if(typeof input.url!=='string'||input.url.length>2048)throw Error();publicUrl(input.url);url=new URL(input.url).href;}catch{return reply({image_url:null,status:'unavailable'})}
 const {data:reserved,error}=await userClient.rpc('nexlab_mural_v02682',{p_action:'preview_reserve',p_payload:{url}});
 if(error)return reply({error:error.code==='54000'?'Aguarde um minuto antes de consultar outros links.':'Você não pode consultar a prévia deste link.'},error.code==='54000'?429:403);
 // Preserve the preview response used by clients that have not updated yet.
 if(input.persistent!==true){
  if(reserved.cached&&!cachedPath(reserved.image_url||'',base))return reply({image_url:reserved.image_url||null,status:reserved.image_url?'ready':'unavailable'});
  let image:string|null=null;try{image=await extractPreview(url)}catch{}
  if(!reserved.cached){const stored=await admin.rpc('nexlab_mural_v02682',{p_action:'preview_store',p_payload:{user_id:userData.user.id,url,image_url:image}});if(stored.error||!stored.data?.ok)return reply({image_url:null,status:'unavailable'});}
  return reply({image_url:image,status:image?'ready':'unavailable'});
 }
 if(reserved.cached){const image=reserved.image_url?await cacheCover(admin,base,url,reserved.image_url):null;return reply({image_url:image,status:image?'ready':'unavailable'});}
 let image:string|null=null;try{image=await cacheCover(admin,base,url)}catch{/* A indisponibilidade da imagem não impede a publicação. */}
 const stored=await admin.rpc('nexlab_mural_v02682',{p_action:'preview_store',p_payload:{user_id:userData.user.id,url,image_url:image}});
 if(stored.error||!stored.data?.ok)return reply({image_url:null,status:'unavailable'});
 return reply({image_url:image,status:image?'ready':'unavailable'});
});

