const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class HttpError extends Error{constructor(status,code){super(code);this.status=status;this.code=code}}

export default {async fetch(request,env,ctx){try{return await route(request,env,ctx)}catch(e){if(e instanceof HttpError)return reply(request,env,{error:e.code},e.status);console.error('nexlab-communication-api',{name:e?.name||'Error',message:e?.message||'Unexpected error'});return reply(request,env,{error:'internal_error'},500)}}};

async function route(request,env,ctx){
  const url=new URL(request.url);
  if(request.method==='OPTIONS')return preflight(request,env);
  if(url.pathname==='/health'&&request.method==='GET'){
    const row=await env.DB.prepare('SELECT 1 AS ok').first();
    return reply(request,env,{ok:row?.ok===1,service:'nexlab-communication'},200);
  }
  if(url.pathname.startsWith('/v1/internal/backup/'))return internalBackup(request,env,url);
  checkOrigin(request,env);
  const token=getBearer(request); if(!token)throw new HttpError(401,'authentication_required');
  const teamRead=request.method==='GET'&&url.pathname.match(/^\/v1\/teams\/([0-9a-f-]{36})\/messages$/i);
  const projectRead=request.method==='GET'&&url.pathname.match(/^\/v1\/projects\/([0-9a-f-]{36})\/comments$/i);
  const readAuthorization=teamRead||projectRead?await authorizeCommunicationRead(teamRead?'team':'project',(teamRead||projectRead)[1],token,env):null;
  const user=readAuthorization?readAuthorization.user:await verifyUser(token,env); if(!user?.id)throw new HttpError(401,'invalid_or_expired_session');

  let m=url.pathname.match(/^\/v1\/teams\/([0-9a-f-]{36})\/messages$/i);
  if(m){
    const teamId=validId(m[1]); const access=readAuthorization?readAuthorization.access:await authz('team',teamId,token,env);
    if(!access?.exists)throw new HttpError(404,'team_not_found');
    if(request.method==='GET'){if(!access.can_view_chat)throw new HttpError(403,'access_denied');return measuredCommunicationRead(()=>listMessages(request,env,teamId),readAuthorization)}
    if(request.method==='POST'){if(!access.can_send_message)throw new HttpError(403,'access_denied');return addMessage(request,env,teamId,user.id,token,ctx)}
    throw new HttpError(405,'method_not_allowed');
  }

  m=url.pathname.match(/^\/v1\/projects\/([0-9a-f-]{36})\/comments$/i);
  if(m){
    const projectId=validId(m[1]); const access=readAuthorization?readAuthorization.access:await authz('project',projectId,token,env);
    if(!access?.exists)throw new HttpError(404,'project_not_found');
    if(request.method==='GET'){if(!access.can_view_comments)throw new HttpError(403,'access_denied');return measuredCommunicationRead(()=>listComments(request,env,projectId),readAuthorization)}
    if(request.method==='POST'){if(!access.can_comment)throw new HttpError(403,'access_denied');return addComment(request,env,projectId,user.id,token,ctx)}
    throw new HttpError(405,'method_not_allowed');
  }

  m=url.pathname.match(/^\/v1\/comments\/([0-9a-f-]{36})$/i);
  if(m){
    const id=validId(m[1]); const row=await env.DB.prepare('SELECT * FROM project_comments WHERE id=?').bind(id).first();
    if(!row)throw new HttpError(404,'comment_not_found');
    const access=await authz('project',row.project_id,token,env); if(!access?.can_view_comments)throw new HttpError(403,'access_denied');
    if(request.method==='PATCH'){if(row.author_id!==user.id)throw new HttpError(403,'access_denied');return editComment(request,env,row)}
    if(request.method==='DELETE'){
      const own=row.author_id===user.id, admin=Boolean(access.can_admin_delete_comment);
      if(!own&&!admin)throw new HttpError(403,'access_denied');
      return deleteComment(request,env,row,user.id,admin&&!own?'admin':'author');
    }
    throw new HttpError(405,'method_not_allowed');
  }

  m=url.pathname.match(/^\/v1\/comments\/([0-9a-f-]{36})\/reply$/i);
  if(m){
    if(request.method!=='POST')throw new HttpError(405,'method_not_allowed');
    const id=validId(m[1]); const row=await env.DB.prepare('SELECT id,project_id,author_id FROM project_comments WHERE id=?').bind(id).first();
    if(!row)throw new HttpError(404,'comment_not_found');
    const access=await authz('project',row.project_id,token,env); if(!access?.can_reply_comment)throw new HttpError(403,'access_denied');
    return addReply(request,env,row,user.id,token,ctx);
  }

  m=url.pathname.match(/^\/v1\/replies\/([0-9a-f-]{36})$/i);
  if(m){
    const id=validId(m[1]);
    const row=await env.DB.prepare(`SELECT r.id,r.comment_id,r.author_id,r.reply,r.created_at,r.edited_at,c.project_id FROM project_comment_replies r JOIN project_comments c ON c.id=r.comment_id WHERE r.id=?`).bind(id).first();
    if(!row)throw new HttpError(404,'reply_not_found');
    const access=await authz('project',row.project_id,token,env); if(!access?.can_view_comments)throw new HttpError(403,'access_denied');
    if(request.method==='PATCH'){
      if(row.author_id!==user.id)throw new HttpError(403,'access_denied');
      return editReply(request,env,row);
    }
    if(request.method==='DELETE'){
      const own=row.author_id===user.id,admin=Boolean(access.can_admin_delete_comment);
      if(!own&&!admin)throw new HttpError(403,'access_denied');
      return deleteReply(request,env,row,user.id,admin&&!own?'admin':'author');
    }
    throw new HttpError(405,'method_not_allowed');
  }

  throw new HttpError(404,'not_found');
}

async function verifyUser(token,env){
  need(env,'SUPABASE_URL');need(env,'SUPABASE_PUBLISHABLE_KEY');
  const r=await fetch(`${trimSlash(env.SUPABASE_URL)}/auth/v1/user`,{headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,Accept:'application/json'}});
  return r.ok?r.json():null;
}

async function authz(scope,id,token,env){
  const r=await fetch(`${trimSlash(env.SUPABASE_URL)}/rest/v1/rpc/nexlab_get_communication_access_v1`,{method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({p_scope:scope,p_scope_id:id})});
  if(r.status===401)throw new HttpError(401,'invalid_or_expired_session');
  if(r.status===403)throw new HttpError(403,'access_denied');
  if(!r.ok){console.error('authorization_rpc_failed',{status:r.status});throw new HttpError(502,'authorization_service_error')}
  const data=await r.json(); return Array.isArray(data)?data[0]:data;
}

async function listMessages(request,env,teamId){
  const {limit,cursor}=page(request);
  let s=cursor?env.DB.prepare(`SELECT id,team_id,author_id,message,created_at FROM team_messages WHERE team_id=? AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT ?`).bind(teamId,cursor.created_at,cursor.created_at,cursor.id,limit):env.DB.prepare(`SELECT id,team_id,author_id,message,created_at FROM team_messages WHERE team_id=? ORDER BY created_at DESC,id DESC LIMIT ?`).bind(teamId,limit);
  const raw=(await s.all()).results||[]; const next=raw.length===limit?encodeCursor(raw.at(-1)):null; const rows=raw.slice().reverse();
  await withMentions(env,'team_message',rows); return reply(request,env,{messages:rows,next_cursor:next},200);
}

async function addMessage(request,env,teamId,userId,token,ctx){
  const b=await body(request); const text=textValue(b.message,max(env.MAX_MESSAGE_LENGTH,4000)); const mentions=mentionList(b.mentions);
  await validateMentions('team',teamId,mentions,token,env);
  const id=crypto.randomUUID(),now=new Date().toISOString();
  await env.DB.batch([env.DB.prepare('INSERT INTO team_messages(id,team_id,author_id,message,created_at) VALUES(?,?,?,?,?)').bind(id,teamId,userId,text,now),...mentionStatements(env,'team_message',id,mentions,now)]);
  scheduleCommunicationNotification(ctx,token,env,{p_event_type:'team_message',p_content_id:id,p_scope_id:teamId,p_mentioned_user_ids:mentions,p_parent_author_id:null});
  return reply(request,env,{message:{id,team_id:teamId,author_id:userId,message:text,created_at:now,mentions},notification_dispatch:'scheduled'},201);
}

async function listComments(request,env,projectId){
  const {limit,cursor}=page(request);
  let s=cursor?env.DB.prepare(`SELECT id,project_id,author_id,comment,created_at,edited_at FROM project_comments WHERE project_id=? AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT ?`).bind(projectId,cursor.created_at,cursor.created_at,cursor.id,limit):env.DB.prepare(`SELECT id,project_id,author_id,comment,created_at,edited_at FROM project_comments WHERE project_id=? ORDER BY created_at DESC,id DESC LIMIT ?`).bind(projectId,limit);
  const raw=(await s.all()).results||[]; const next=raw.length===limit?encodeCursor(raw.at(-1)):null; const rows=raw.slice().reverse();
  if(rows.length){
    const ids=rows.map(x=>x.id),q=ids.map(()=>'?').join(','); const rr=(await env.DB.prepare(`SELECT id,comment_id,author_id,reply,created_at,edited_at FROM project_comment_replies WHERE comment_id IN (${q})`).bind(...ids).all()).results||[]; const map=new Map(rr.map(x=>[x.comment_id,x])); rows.forEach(x=>x.reply=map.get(x.id)||null);
    await withMentions(env,'project_comment',rows); await withMentions(env,'project_comment_reply',rr);
  }
  return reply(request,env,{comments:rows,next_cursor:next},200);
}

async function addComment(request,env,projectId,userId,token,ctx){
  const b=await body(request);const text=textValue(b.comment,max(env.MAX_COMMENT_LENGTH,4000));const mentions=mentionList(b.mentions);
  await validateMentions('project',projectId,mentions,token,env);
  const id=crypto.randomUUID(),now=new Date().toISOString();
  await env.DB.batch([env.DB.prepare('INSERT INTO project_comments(id,project_id,author_id,comment,created_at) VALUES(?,?,?,?,?)').bind(id,projectId,userId,text,now),...mentionStatements(env,'project_comment',id,mentions,now)]);
  scheduleCommunicationNotification(ctx,token,env,{p_event_type:'project_comment',p_content_id:id,p_scope_id:projectId,p_mentioned_user_ids:mentions,p_parent_author_id:null});
  return reply(request,env,{comment:{id,project_id:projectId,author_id:userId,comment:text,created_at:now,edited_at:null,mentions,reply:null},notification_dispatch:'scheduled'},201);
}

async function editComment(request,env,row){
  const b=await body(request);const text=textValue(b.comment,max(env.MAX_COMMENT_LENGTH,4000));
  const mentions=await editedMentions(env,'project_comment',row.id,b.mentions);const now=new Date().toISOString();
  await env.DB.batch([env.DB.prepare('UPDATE project_comments SET comment=?,edited_at=? WHERE id=?').bind(text,now,row.id),env.DB.prepare("DELETE FROM communication_mentions WHERE content_type='project_comment' AND content_id=?").bind(row.id),...mentionStatements(env,'project_comment',row.id,mentions,now)]);
  return reply(request,env,{comment:{...row,comment:text,edited_at:now,mentions}},200);
}

async function deleteComment(request,env,row,userId,type){
  const now=new Date().toISOString(),logId=crypto.randomUUID();const rep=await env.DB.prepare('SELECT id FROM project_comment_replies WHERE comment_id=?').bind(row.id).first();
  const ss=[env.DB.prepare("INSERT INTO communication_deletion_log(id,content_type,content_id,deleted_by_user_id,deletion_type,reason,deleted_at) VALUES(?,'project_comment',?,?,?,NULL,?)").bind(logId,row.id,userId,type,now),env.DB.prepare("DELETE FROM communication_mentions WHERE content_type='project_comment' AND content_id=?").bind(row.id)];
  if(rep?.id)ss.push(env.DB.prepare("DELETE FROM communication_mentions WHERE content_type='project_comment_reply' AND content_id=?").bind(rep.id));
  ss.push(env.DB.prepare('DELETE FROM project_comments WHERE id=?').bind(row.id)); await env.DB.batch(ss);
  return reply(request,env,{deleted:true,id:row.id},200);
}

async function addReply(request,env,comment,userId,token,ctx){
  const exists=await env.DB.prepare('SELECT id FROM project_comment_replies WHERE comment_id=?').bind(comment.id).first();if(exists)throw new HttpError(409,'official_reply_already_exists');
  const b=await body(request);const text=textValue(b.reply,max(env.MAX_COMMENT_LENGTH,4000));const mentions=mentionList(b.mentions);
  await validateMentions('project',comment.project_id,mentions,token,env);
  const id=crypto.randomUUID(),now=new Date().toISOString();
  await env.DB.batch([env.DB.prepare('INSERT INTO project_comment_replies(id,comment_id,author_id,reply,created_at) VALUES(?,?,?,?,?)').bind(id,comment.id,userId,text,now),...mentionStatements(env,'project_comment_reply',id,mentions,now)]);
  scheduleCommunicationNotification(ctx,token,env,{p_event_type:'project_comment_reply',p_content_id:id,p_scope_id:comment.project_id,p_mentioned_user_ids:mentions,p_parent_author_id:comment.author_id});
  return reply(request,env,{reply:{id,comment_id:comment.id,author_id:userId,reply:text,created_at:now,edited_at:null,mentions},notification_dispatch:'scheduled'},201);
}

async function editReply(request,env,row){
  const b=await body(request);const text=textValue(b.reply,max(env.MAX_COMMENT_LENGTH,4000));
  const mentions=await editedMentions(env,'project_comment_reply',row.id,b.mentions);const now=new Date().toISOString();
  await env.DB.batch([env.DB.prepare('UPDATE project_comment_replies SET reply=?,edited_at=? WHERE id=?').bind(text,now,row.id),env.DB.prepare("DELETE FROM communication_mentions WHERE content_type='project_comment_reply' AND content_id=?").bind(row.id),...mentionStatements(env,'project_comment_reply',row.id,mentions,now)]);
  return reply(request,env,{reply:{id:row.id,comment_id:row.comment_id,author_id:row.author_id,reply:text,created_at:row.created_at,edited_at:now,mentions}},200);
}

async function deleteReply(request,env,row,userId,type){
  const now=new Date().toISOString(),logId=crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO communication_deletion_log(id,content_type,content_id,deleted_by_user_id,deletion_type,reason,deleted_at) VALUES(?,'project_comment_reply',?,?,?,NULL,?)").bind(logId,row.id,userId,type,now),
    env.DB.prepare("DELETE FROM communication_mentions WHERE content_type='project_comment_reply' AND content_id=?").bind(row.id),
    env.DB.prepare('DELETE FROM project_comment_replies WHERE id=?').bind(row.id)
  ]);
  return reply(request,env,{deleted:true,id:row.id},200);
}

async function editedMentions(env,type,id,input){
  const existingRows=(await env.DB.prepare('SELECT mentioned_user_id FROM communication_mentions WHERE content_type=? AND content_id=?').bind(type,id).all()).results||[];
  const existing=existingRows.map(x=>String(x.mentioned_user_id));
  if(input===undefined)return existing;
  const requested=mentionList(input);
  if(requested.some(userId=>!existing.includes(userId)))throw new HttpError(400,'mention_addition_requires_new_comment');
  return requested;
}

async function validateMentions(scope,scopeId,mentions,token,env){
  if(!mentions.length)return;
  need(env,'NEXLAB_BRIDGE_SECRET');
  const r=await fetch(`${trimSlash(env.SUPABASE_URL)}/rest/v1/rpc/nexlab_validate_communication_mentions_v1`,{
    method:'POST',
    headers:{
      apikey:env.SUPABASE_PUBLISHABLE_KEY,
      Authorization:`Bearer ${token}`,
      'x-nexlab-bridge-secret':env.NEXLAB_BRIDGE_SECRET,
      'Content-Type':'application/json',
      Accept:'application/json'
    },
    body:JSON.stringify({p_scope:scope,p_scope_id:scopeId,p_mentioned_user_ids:mentions})
  });
  if(r.status===401||r.status===403)throw new HttpError(403,'mention_validation_denied');
  if(!r.ok){console.error('mention_validation_rpc_failed',{status:r.status});throw new HttpError(502,'mention_validation_error')}
  const data=await r.json();const row=Array.isArray(data)?data[0]:data;
  if(!row?.ok)throw new HttpError(400,row?.error_code==='INVALID_MENTION_TARGET'?'invalid_mention_target':'invalid_mentions');
}

function scheduleCommunicationNotification(ctx,token,env,payload){
  if(!ctx?.waitUntil){console.error('notification_dispatch_unavailable');return}
  ctx.waitUntil(emitCommunicationNotification(token,env,payload).catch(e=>{
    console.error('communication_notification_failed',{event_type:payload.p_event_type,content_id:payload.p_content_id,status:e?.status||null,message:e?.message||'dispatch_failed'});
  }));
}

async function emitCommunicationNotification(token,env,payload){
  need(env,'NEXLAB_BRIDGE_SECRET');
  const r=await fetch(`${trimSlash(env.SUPABASE_URL)}/rest/v1/rpc/nexlab_emit_communication_notifications_v1`,{
    method:'POST',
    headers:{
      apikey:env.SUPABASE_PUBLISHABLE_KEY,
      Authorization:`Bearer ${token}`,
      'x-nexlab-bridge-secret':env.NEXLAB_BRIDGE_SECRET,
      'Content-Type':'application/json',
      Accept:'application/json'
    },
    body:JSON.stringify(payload)
  });
  if(!r.ok){
    const e=Object.assign(new Error(`notification_rpc_${r.status}`),{status:r.status});throw e;
  }
  return r.json();
}

async function withMentions(env,type,rows){if(!rows.length)return;const ids=rows.map(x=>x.id),q=ids.map(()=>'?').join(',');const rs=(await env.DB.prepare(`SELECT content_id,mentioned_user_id FROM communication_mentions WHERE content_type=? AND content_id IN (${q}) ORDER BY created_at`).bind(type,...ids).all()).results||[];const m=new Map();for(const x of rs){if(!m.has(x.content_id))m.set(x.content_id,[]);m.get(x.content_id).push(x.mentioned_user_id)}rows.forEach(x=>x.mentions=m.get(x.id)||[])}
function mentionStatements(env,type,id,mentions,now){return mentions.map(u=>env.DB.prepare('INSERT OR IGNORE INTO communication_mentions(id,content_type,content_id,mentioned_user_id,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),type,id,u,now))}
function mentionList(v){if(v==null)return[];if(!Array.isArray(v))throw new HttpError(400,'invalid_mentions');const out=[];for(const x of v){const id=String(x||'').trim();if(!UUID_RE.test(id))throw new HttpError(400,'invalid_mentioned_user_id');if(!out.includes(id))out.push(id);if(out.length>25)throw new HttpError(400,'too_many_mentions')}return out}
function textValue(v,n){if(typeof v!=='string')throw new HttpError(400,'text_required');const s=v.trim();if(!s)throw new HttpError(400,'text_required');if(s.includes('\u0000'))throw new HttpError(400,'invalid_text');if(s.length>n)throw new HttpError(400,'text_too_long');return s}
async function body(request){const ct=request.headers.get('content-type')||'';if(!ct.toLowerCase().includes('application/json'))throw new HttpError(415,'application_json_required');const len=parseInt(request.headers.get('content-length')||'0',10);if(Number.isFinite(len)&&len>32768)throw new HttpError(413,'request_too_large');try{return await request.json()}catch{throw new HttpError(400,'invalid_json')}}
function page(request){const u=new URL(request.url),n=parseInt(u.searchParams.get('limit')||'30',10),limit=Math.max(1,Math.min(Number.isFinite(n)?n:30,50));return{limit,cursor:decodeCursor(u.searchParams.get('cursor'))}}
function encodeCursor(r){return btoa(JSON.stringify({created_at:r.created_at,id:r.id})).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function decodeCursor(v){if(!v)return null;try{let s=v.replace(/-/g,'+').replace(/_/g,'/');s+='='.repeat((4-(s.length%4||4))%4);const o=JSON.parse(atob(s));if(!o?.created_at||!UUID_RE.test(o.id||''))throw 0;return o}catch{throw new HttpError(400,'invalid_cursor')}}
function validId(v){if(!UUID_RE.test(v))throw new HttpError(400,'invalid_id');return v}
function getBearer(r){const m=(r.headers.get('authorization')||'').match(/^Bearer\s+(.+)$/i);return m?.[1]?.trim()||null}
function need(env,k){if(!env[k])throw new Error(`Missing Worker configuration: ${k}`)}
function trimSlash(v){return String(v||'').replace(/\/+$/,'')}
function max(v,f){const n=parseInt(v||'',10);return Number.isFinite(n)&&n>=100&&n<=10000?n:f}
function origins(env){return String(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean)}
function checkOrigin(r,env){const o=r.headers.get('origin');if(o&&!origins(env).includes(o))throw new HttpError(403,'origin_not_allowed')}
function preflight(r,env){const o=r.headers.get('origin');if(!o||!origins(env).includes(o))return new Response(null,{status:403});return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':o,'Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Max-Age':'600',Vary:'Origin'}})}
function reply(r,env,data,status){const h=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});const o=r.headers.get('origin');if(o&&origins(env).includes(o)){h.set('Access-Control-Allow-Origin',o);h.set('Vary','Origin')}return new Response(JSON.stringify(data),{status,headers:h})}

// Internal D1 backup API. Only status and export are enabled; no database writes.
// The shared secret is configured in Cloudflare, never embedded in this file.
const D1_BACKUP_TABLES=Object.freeze([
  'team_messages','project_comments','project_comment_replies',
  'communication_mentions','communication_deletion_log'
]);
const D1_BACKUP_MAX_BYTES=25*1024*1024;
const D1_BACKUP_IMPLEMENTATION='nexlab-d1-backup-readonly-v1';

async function internalBackup(request,env,url){
  // Browser sessions do not authorize exporting all communication records.
  if(request.headers.has('origin'))throw new HttpError(403,'internal_server_request_required');
  const expected=typeof env.NEXLAB_BRIDGE_SECRET==='string'?env.NEXLAB_BRIDGE_SECRET:'';
  if(!expected)throw new HttpError(503,'backup_secret_not_configured');
  const supplied=request.headers.get('x-nexlab-bridge-secret')||'';
  if(!supplied||supplied.length>4096||!(await backupSecretMatches(supplied,expected)))throw new HttpError(401,'invalid_backup_credential');
  if(url.pathname==='/v1/internal/backup/restore')throw new HttpError(501,'backup_restore_not_implemented');
  if(!['/v1/internal/backup/status','/v1/internal/backup/export'].includes(url.pathname))throw new HttpError(404,'not_found');
  if(request.method!=='GET')throw new HttpError(405,'method_not_allowed');
  if(!env.DB?.prepare)throw new HttpError(503,'backup_database_not_configured');
  // Force a fresh primary read when the binding supports D1 Sessions.
  const db=typeof env.DB.withSession==='function'?env.DB.withSession('first-primary'):env.DB;
  const columns=await backupTableColumns(db);
  if(url.pathname.endsWith('/status')){
    const result=await db.batch(D1_BACKUP_TABLES.map(table=>db.prepare(`SELECT COUNT(*) AS row_count FROM ${backupIdent(table)}`)));
    backupCheckResults(result,D1_BACKUP_TABLES.length);
    const row_counts={};let total_rows=0;
    D1_BACKUP_TABLES.forEach((table,i)=>{const count=Number(result[i].results?.[0]?.row_count);if(!Number.isSafeInteger(count)||count<0)throw new HttpError(502,'backup_invalid_count');row_counts[table]=count;total_rows+=count;});
    return reply(request,env,{ok:true,service:'nexlab-communication',backup_api:D1_BACKUP_IMPLEMENTATION,schema_version:1,database_name:'nexlab-communication',table_count:5,row_counts,total_rows,export_available:true,restore_available:false,max_export_bytes:D1_BACKUP_MAX_BYTES},200);
  }
  // A single read statement covers all five tables at the same database snapshot.
  // The metadata row is always returned; oversized data rows stay inside D1.
  const selects=D1_BACKUP_TABLES.map(table=>{
    const pairs=columns[table].flatMap(name=>[backupLiteral(name),backupIdent(name)]).join(',');
    return `SELECT ${backupLiteral(table)} AS table_name, id AS row_id, json_object(${pairs}) AS row_json FROM ${backupIdent(table)}`;
  });
  const sql=`WITH snapshot AS MATERIALIZED (${selects.join(' UNION ALL ')}),
    budget AS (SELECT COUNT(*) AS total_rows,COALESCE(SUM(length(CAST(row_json AS BLOB))+1),0)+1024 AS estimated_bytes FROM snapshot)
    SELECT NULL AS table_name,NULL AS row_id,NULL AS row_json,total_rows,estimated_bytes FROM budget
    UNION ALL SELECT s.table_name,s.row_id,s.row_json,NULL,NULL FROM snapshot s,budget b WHERE b.estimated_bytes<=?`;
  const result=await db.prepare(sql).bind(D1_BACKUP_MAX_BYTES).all();
  backupCheckResults([result],1);
  const rows=result.results||[],meta=rows[0];
  if(!meta||meta.table_name!==null||!Number.isSafeInteger(Number(meta.total_rows))||Number(meta.total_rows)<0)throw new HttpError(502,'backup_invalid_metadata');
  if(Number(meta.estimated_bytes)>D1_BACKUP_MAX_BYTES)throw new HttpError(413,'backup_snapshot_too_large');
  const tables=Object.fromEntries(D1_BACKUP_TABLES.map(table=>[table,[]]));
  for(const item of rows.slice(1)){
    if(!Object.hasOwn(tables,item.table_name)||typeof item.row_json!=='string')throw new HttpError(502,'backup_invalid_row');
    let row;try{row=JSON.parse(item.row_json);}catch{throw new HttpError(502,'backup_invalid_row');}
    if(!row||typeof row!=='object'||Array.isArray(row)||String(row.id)!==String(item.row_id))throw new HttpError(502,'backup_invalid_row');
    tables[item.table_name].push(row);
  }
  const row_counts=Object.fromEntries(D1_BACKUP_TABLES.map(table=>[table,tables[table].length]));
  const total_rows=Object.values(row_counts).reduce((n,value)=>n+value,0);
  if(total_rows!==Number(meta.total_rows))throw new HttpError(502,'backup_row_count_mismatch');
  const payload={ok:true,schema_version:1,database_name:'nexlab-communication',exported_at:new Date().toISOString(),table_count:5,total_rows,row_counts,tables};
  const text=JSON.stringify(payload);
  if(new TextEncoder().encode(text).byteLength>D1_BACKUP_MAX_BYTES)throw new HttpError(413,'backup_snapshot_too_large');
  return new Response(text,{status:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
}
async function backupSecretMatches(supplied,expected){
  const encoder=new TextEncoder();
  const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',encoder.encode(supplied)),crypto.subtle.digest('SHA-256',encoder.encode(expected))]);
  // Cloudflare Workers Web Crypto provides this timing-resistant comparison.
  return crypto.subtle.timingSafeEqual(a,b);
}
async function backupTableColumns(db){
  const results=await db.batch(D1_BACKUP_TABLES.map(table=>db.prepare(`PRAGMA table_info(${backupIdent(table)})`)));
  backupCheckResults(results,D1_BACKUP_TABLES.length);
  return Object.fromEntries(D1_BACKUP_TABLES.map((table,i)=>{
    const names=(results[i].results||[]).map(row=>row.name);
    if(!names.length||!names.includes('id')||names.some(name=>typeof name!=='string'||!name))throw new HttpError(503,'backup_schema_unavailable');
    return [table,names];
  }));
}
function backupCheckResults(results,count){if(!Array.isArray(results)||results.length!==count||results.some(result=>!result||result.success===false||!Array.isArray(result.results)))throw new HttpError(502,'backup_database_read_failed');}
function backupIdent(value){return '"'+String(value).replace(/"/g,'""')+'"';}
function backupLiteral(value){return "'"+String(value).replace(/'/g,"''")+"'";}

// Both remote checks remain mandatory; no permission or identity is cached.
async function authorizeCommunicationRead(scope,id,token,env){
  const started=performance.now();
  const timings={};
  const measure=async(name,operation)=>{
    const begin=performance.now();
    try{return await operation();}
    finally{timings[name]=Math.max(0,performance.now()-begin);}
  };
  const [identity,permission]=await Promise.allSettled([
    measure('identity',()=>verifyUser(token,env)),
    measure('permissions',()=>authz(scope,validId(id),token,env))
  ]);
  // Preserve the original identity-first error precedence, even if permission
  // finishes first. No D1 read occurs until both checks have succeeded.
  if(identity.status==='rejected')throw identity.reason;
  if(!identity.value?.id)throw new HttpError(401,'invalid_or_expired_session');
  if(permission.status==='rejected')throw permission.reason;
  const access=permission.value;
  if(!access||access.user_id!==identity.value.id)throw new HttpError(403,'access_denied');
  timings.authorization=Math.max(0,performance.now()-started);
  return {user:identity.value,access,timings,started};
}

async function measuredCommunicationRead(operation,authorization){
  const begin=performance.now();
  const response=await operation();
  const timings={...authorization.timings,read:Math.max(0,performance.now()-begin),worker:Math.max(0,performance.now()-authorization.started)};
  const headers=new Headers(response.headers);
  headers.set('Server-Timing',Object.entries(timings).map(([name,ms])=>`${name};dur=${ms.toFixed(1)}`).join(', '));
  const exposed=new Set((headers.get('Access-Control-Expose-Headers')||'').split(',').map(name=>name.trim()).filter(Boolean));
  exposed.add('Server-Timing');
  headers.set('Access-Control-Expose-Headers',[...exposed].join(', '));
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
