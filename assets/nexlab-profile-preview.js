(function(){
  'use strict';

  window.__NEXLAB_PROFILE_PREVIEW_AVAILABLE__=true;

  const PARAM='nexlab_preview';
  const STORAGE_PREFIX='nexlab-preview:';
  const CONFIG=window.__NEXLAB_CONFIG__?.assert?.()||(()=>{throw new Error('Configuração central do NEXLAB não carregada.');})();
  const DEFAULT_BACKEND_ORIGIN=CONFIG.supabaseUrl;

  const RPC_REGISTRY=globalThis.__NEXLAB_RPC_REGISTRY__||null;
  const READ_ONLY_RPCS=new Set(RPC_REGISTRY?.readOnly||[]);
  const NOOP_WRITE_RPCS=new Set(RPC_REGISTRY?.previewNoop||[]);
  const SIMULATED_PERMISSION_RPCS=new Set(RPC_REGISTRY?.simulatedPermission||[]);

  function normalizedOrigin(value){
    try{return new URL(String(value||DEFAULT_BACKEND_ORIGIN)).origin;}catch{return DEFAULT_BACKEND_ORIGIN;}
  }

  function rpcName(target){
    try{
      const match=new URL(typeof target==='string'?target:target?.url,location.href).pathname.match(/\/rest\/v1\/rpc\/([^/]+)$/i);
      return match?decodeURIComponent(match[1]):'';
    }catch{return '';}
  }

  function requestMethod(input,init){return String(init?.method||input?.method||'GET').toUpperCase();}

  function classifyRequest(target,method='GET',backendOrigin=DEFAULT_BACKEND_ORIGIN){
    let parsed;
    try{parsed=new URL(typeof target==='string'?target:target?.url,location.href);}catch{return {action:'passthrough',reason:'invalid_url'};}
    const origin=normalizedOrigin(backendOrigin);
    if(parsed.origin!==origin)return {action:'passthrough',reason:'external_origin'};

    const upper=String(method||'GET').toUpperCase();
    const path=parsed.pathname;
    const name=rpcName(parsed.toString());

    if(['GET','HEAD','OPTIONS'].includes(upper))return {action:'allow',reason:'safe_method',rpc:name};
    if(upper==='POST'&&/^\/auth\/v1\/token$/i.test(path)&&parsed.searchParams.get('grant_type')==='refresh_token')return {action:'allow',reason:'auth_refresh'};
    if(upper==='POST'&&/^\/storage\/v1\/object\/(?:sign|list)(?:\/|$)/i.test(path))return {action:'allow',reason:'storage_read_transport'};
    if(name&&SIMULATED_PERMISSION_RPCS.has(name))return {action:'simulate',reason:'permission_simulation',rpc:name};
    if(name&&READ_ONLY_RPCS.has(name))return {action:'allow',reason:'read_rpc_allowlist',rpc:name};
    if(name&&NOOP_WRITE_RPCS.has(name))return {action:'noop',reason:'background_write_suppressed',rpc:name};
    return {action:'block',reason:name?'rpc_not_allowlisted':'write_method',rpc:name};
  }

  function simulatedPermissionCheck(name,permissionSet,role){
    const normalizedRole=String(role||'').toLowerCase();
    const admin=['admin','administrador'].includes(normalizedRole);
    if(name==='nexlab_can_create_team_v2680')return admin||permissionSet.has('teams_manage_own');
    if(name==='nexlab_can_create_project_v2690')return permissionSet.has('module_projetos')&&(permissionSet.has('projects_manage_all')||permissionSet.has('projects_manage_own'));
    return false;
  }

  function selfTest(){
    const cloud=DEFAULT_BACKEND_ORIGIN;
    const selfHosted='https://nexlab.uema.br';
    const cases=[
      ['rest_get_allowed',classifyRequest(`${cloud}/rest/v1/profiles?select=id`,'GET',cloud).action==='allow'],
      ['rest_patch_blocked',classifyRequest(`${cloud}/rest/v1/profiles?id=eq.1`,'PATCH',cloud).action==='block'],
      ['unknown_rpc_blocked',classifyRequest(`${cloud}/rest/v1/rpc/nexlab_unknown_mutation`,'POST',cloud).action==='block'],
      ['read_rpc_allowed',classifyRequest(`${cloud}/rest/v1/rpc/nexlab_get_dashboard_summary_v2690`,'POST',cloud).action==='allow'],
      ['background_write_noop',classifyRequest(`${cloud}/rest/v1/rpc/nexlab_ensure_notification_preferences`,'POST',cloud).action==='noop'],
      ['storage_sign_allowed',classifyRequest(`${cloud}/storage/v1/object/sign/profile-photos/example.jpg`,'POST',cloud).action==='allow'],
      ['edge_function_blocked',classifyRequest(`${cloud}/functions/v1/admin-delete-user`,'POST',cloud).action==='block'],
      ['self_hosted_write_blocked',classifyRequest(`${selfHosted}/rest/v1/profiles?id=eq.1`,'DELETE',selfHosted).action==='block'],
      ['external_origin_untouched',classifyRequest('https://example.com/api','POST',cloud).action==='passthrough']
    ].map(([name,ok])=>({name,ok:Boolean(ok)}));
    const registryTest=RPC_REGISTRY?.selfTest?.()||{ok:false,cases:[]};
    cases.push({name:'central_rpc_registry_loaded',ok:registryTest.ok===true});
    const permissionCases=[
      {name:'team_create_uses_manage_own',ok:simulatedPermissionCheck('nexlab_can_create_team_v2680',new Set(['teams_manage_own']),'bolsista')===true},
      {name:'team_create_rejects_nonexistent_key',ok:simulatedPermissionCheck('nexlab_can_create_team_v2680',new Set(['teams_create']),'bolsista')===false},
      {name:'project_create_requires_module_and_scope',ok:simulatedPermissionCheck('nexlab_can_create_project_v2690',new Set(['module_projetos','projects_manage_own']),'voluntario')===true},
      {name:'project_create_without_module_blocked',ok:simulatedPermissionCheck('nexlab_can_create_project_v2690',new Set(['projects_manage_own']),'voluntario')===false}
    ];
    cases.push(...permissionCases);
    return {ok:cases.every(item=>item.ok),cases,readRpcCount:READ_ONLY_RPCS.size,registry:registryTest,backendOrigin:cloud,readOnlyMandatory:true};
  }

  window.NexlabProfilePreviewGuard=Object.freeze({
    version:'0.26.82',
    classifyRequest,
    selfTest,
    readOnlyRpcs:Object.freeze([...READ_ONLY_RPCS]),
    noopWriteRpcs:Object.freeze([...NOOP_WRITE_RPCS])
  });

  const url=new URL(location.href);
  const previewToken=url.searchParams.get(PARAM);
  if(!previewToken)return;

  function readAuthToken(){return CONFIG.getAccessToken();}

  function jwtSubject(jwt){
    try{
      const body=jwt.split('.')[1];
      const normalized=body.replace(/-/g,'+').replace(/_/g,'/');
      const padded=normalized.padEnd(Math.ceil(normalized.length/4)*4,'=');
      const payload=JSON.parse(decodeURIComponent(Array.from(atob(padded),c=>`%${c.charCodeAt(0).toString(16).padStart(2,'0')}`).join('')));
      return String(payload?.sub||'');
    }catch{return '';}
  }

  const storageKey=`${STORAGE_PREFIX}${previewToken}`;
  let config=null;
  try{config=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{}
  const currentSubject=jwtSubject(readAuthToken());
  const valid=config
    && config.token===previewToken
    && String(config.issuedBy||'')===currentSubject
    && Number(config.expiresAt||0)>Date.now()
    && Array.isArray(config.effectivePermissions)
    && typeof config.targetRole==='string';

  if(!valid){
    try{localStorage.removeItem(storageKey);}catch{}
    url.searchParams.delete(PARAM);
    history.replaceState(null,'',url.toString());
    return;
  }

  const backendOrigin=normalizedOrigin(config.backendOrigin||DEFAULT_BACKEND_ORIGIN);
  const nativeFetch=window.fetch.bind(window);
  const permissions=new Set(config.effectivePermissions.map(String));
  const simulatedRole=String(config.targetRole||'').toLowerCase();
  const issuerId=String(config.issuedBy||'');
  const roleIsAdmin=['admin','administrador'].includes(simulatedRole);
  const roleIsManager=roleIsAdmin||simulatedRole==='coordenador';

  async function requestBody(input,init){
    try{
      if(init?.body&&typeof init.body==='string')return JSON.parse(init.body);
      if(input instanceof Request){
        const text=await input.clone().text();
        return text?JSON.parse(text):{};
      }
    }catch{}
    return {};
  }

  function jsonResponse(data,status=200,statusText='OK',headers){
    const nextHeaders=new Headers(headers||{});
    nextHeaders.set('Content-Type','application/json; charset=utf-8');
    nextHeaders.set('Cache-Control','no-store');
    return new Response(JSON.stringify(data),{status,statusText,headers:nextHeaders});
  }

  function applyProfileShape(row){
    if(!row||typeof row!=='object'||Array.isArray(row))return row;
    return {
      ...row,
      role:simulatedRole,
      ativo:true,
      cadastro_completo:true,
      role_request_status:'approved',
      effective_permissions:[...permissions],
      acessos:[],
      nome:config.targetName?`${config.targetName} · visualização`:row.nome
    };
  }

  function rewriteDeep(value){
    if(Array.isArray(value))return value.map(rewriteDeep);
    if(!value||typeof value!=='object')return value;
    let next={...value};
    if(String(next.id||'')===issuerId&&(Object.prototype.hasOwnProperty.call(next,'role')||Object.prototype.hasOwnProperty.call(next,'effective_permissions'))){next=applyProfileShape(next);}
    for(const [key,child] of Object.entries(next)){if(child&&typeof child==='object')next[key]=rewriteDeep(child);}
    return next;
  }

  function isExactOwnProfileQuery(target){
    try{
      const targetUrl=new URL(typeof target==='string'?target:target?.url,location.href);
      if(targetUrl.origin!==backendOrigin||!/\/rest\/v1\/profiles$/i.test(targetUrl.pathname))return false;
      return (targetUrl.searchParams.get('id')||'')===`eq.${issuerId}`;
    }catch{return false;}
  }

  function simulatedRpcResult(name,body){
    const permission=String(body?.p_permission||body?.permission||'');
    if(['nexlab_has_effective_permission_v2680','nexlab_has_permission_v26100','nexlab_has_project_permission_v2690'].includes(name))return permissions.has(permission);
    if(['nexlab_is_admin','nexlab_is_admin_v2680','is_admin'].includes(name))return roleIsAdmin;
    if(['nexlab_is_gestor','is_coord_or_admin'].includes(name))return roleIsManager;
    if(name==='nexlab_has_approved_access')return true;
    if(name==='nexlab_can_view_all_teams_v2680')return roleIsAdmin||permissions.has('teams_view_all');
    if(name==='nexlab_can_create_team_v2680')return roleIsAdmin||permissions.has('teams_manage_own');
    if(name==='nexlab_can_create_project_v2690')return permissions.has('module_projetos')&&(permissions.has('projects_manage_all')||permissions.has('projects_manage_own'));
    return undefined;
  }

  window.fetch=async function previewFetch(input,init){
    const method=requestMethod(input,init);
    const target=typeof input==='string'?input:input?.url||String(input||'');
    const name=rpcName(target);
    const body=name?await requestBody(input,init):{};
    // A visualização é sempre somente leitura. O conteúdo do localStorage nunca pode liberar escrita.
    const decision=classifyRequest(target,method,backendOrigin);

    if(decision.action==='simulate')return jsonResponse(simulatedRpcResult(name,body));
    if(decision.action==='noop')return jsonResponse({ok:true,preview:true,blocked:true,operation:name||'background-write'});
    if(decision.action==='block'){
      return jsonResponse({message:'Ação bloqueada: a visualização de perfil é somente leitura.',code:'NEXLAB_PREVIEW_READ_ONLY',operation:name||method},403,'Forbidden');
    }

    const response=await nativeFetch(input,init);
    const contentType=response.headers.get('content-type')||'';
    if(!response.ok||!contentType.includes('application/json'))return response;

    const shouldRewrite=isExactOwnProfileQuery(target)
      || name==='nexlab_list_profiles_visible_v26311'
      || name==='nexlab_get_permission_matrix_v02652'
      || name==='nexlab_get_permission_matrix';
    if(!shouldRewrite)return response;

    try{
      const data=await response.clone().json();
      const rewritten=isExactOwnProfileQuery(target)&&Array.isArray(data)?data.map(applyProfileShape):rewriteDeep(data);
      return jsonResponse(rewritten,response.status,response.statusText,response.headers);
    }catch{return response;}
  };

  function exitPreview(){
    try{localStorage.removeItem(storageKey);}catch{}
    const clean=new URL(location.href);clean.searchParams.delete(PARAM);location.replace(clean.toString());
  }

  function mountBanner(){
    if(document.getElementById('nexlab-profile-preview-banner'))return;
    document.documentElement.classList.add('nexlab-preview-active');
    const style=document.createElement('style');
    style.textContent=`
      html.nexlab-preview-active body{padding-top:48px!important}
      #nexlab-profile-preview-banner{position:fixed;inset:0 0 auto 0;height:48px;z-index:2147483600;background:#7c2d12;color:#fff;display:flex;align-items:center;justify-content:center;gap:12px;padding:8px 14px;font:700 12px/1.25 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 8px 24px rgba(124,45,18,.25)}
      #nexlab-profile-preview-banner strong{font-weight:900}#nexlab-profile-preview-banner span{opacity:.92}
      #nexlab-profile-preview-banner button{border:1px solid rgba(255,255,255,.5);background:#fff;color:#7c2d12;border-radius:9px;padding:7px 11px;font:800 11px/1 system-ui;cursor:pointer}
      @media(max-width:640px){#nexlab-profile-preview-banner{justify-content:space-between;height:56px;font-size:0.625rem}html.nexlab-preview-active body{padding-top:56px!important}#nexlab-profile-preview-banner span{display:none}}
    `;
    document.head.appendChild(style);
    const banner=document.createElement('div');banner.id='nexlab-profile-preview-banner';
    const title=document.createElement('strong');title.textContent=`VISUALIZAÇÃO: ${String(config.targetName||config.targetRole).toUpperCase()}`;
    const description=document.createElement('span');description.textContent='Simulação local · consultas pela conta atual · alterações bloqueadas no backend';
    const exitButton=document.createElement('button');exitButton.type='button';exitButton.textContent='Sair da visualização';exitButton.addEventListener('click',exitPreview);
    banner.append(title,description,exitButton);document.body.appendChild(banner);
  }

  window.__NEXLAB_PROFILE_PREVIEW__=Object.freeze({...config,readOnly:true,backendOrigin,active:true,permissions:[...permissions]});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountBanner,{once:true});else mountBanner();
  setInterval(()=>{if(Date.now()>=Number(config.expiresAt||0))exitPreview();},30000);
})();
