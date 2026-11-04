(function(){
  'use strict';

  const VERSION='0.26.82';
  const CONFIG=window.__NEXLAB_CONFIG__?.assert?.()||(()=>{throw new Error('Configuração central do NEXLAB não carregada.');})();
  const PROJECT_REF=CONFIG.projectRef;
  const BASE=CONFIG.supabaseUrl;
  const KEY=CONFIG.supabaseAnonKey;
  const ROLE_LABELS={admin:'Administrador',administrador:'Administrador',coordenador:'Coordenador',bolsista:'Bolsista',voluntario:'Voluntário',coworking_junior:'Coworking Júnior'};
  const ROLE_ORDER=['admin','coordenador','bolsista','voluntario','coworking_junior'];
  let matrixCache=null;
  let matrixLoadedAt=0;

  window.NexlabAdminHomologation={version:VERSION};

  const style=document.createElement('style');
  style.textContent=`
    
    .nexlab-admin-overlay{position:fixed;inset:0;z-index:10080;background:rgba(2,6,23,.68);display:grid;place-items:center;padding:18px}
    .nexlab-admin-dialog{width:min(980px,100%);max-height:min(92vh,920px);overflow:auto;background:#fff;border-radius:24px;box-shadow:0 30px 90px rgba(2,6,23,.38);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a}
    .nexlab-admin-dialog.is-wide{width:min(1380px,100%)}
    .nexlab-admin-head{padding:22px 24px 18px;background:linear-gradient(135deg,#0b2a63,#111827);color:#fff;display:flex;justify-content:space-between;gap:18px;align-items:flex-start;position:sticky;top:0;z-index:3}
    .nexlab-admin-head h2{font-size:1.3125rem;margin:0 0 5px}.nexlab-admin-head p{margin:0;color:#cbd5e1;font-size:0.75rem;line-height:1.45;max-width:760px}
    .nexlab-admin-close{border:0;background:rgba(255,255,255,.13);color:#fff;width:36px;height:36px;border-radius:12px;font-size:1.25rem;cursor:pointer;flex:0 0 auto}
    .nexlab-admin-body{padding:22px 24px;display:grid;gap:16px}.nexlab-admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .nexlab-admin-tool{border:1px solid #dbe4ef;background:#fff;border-radius:18px;padding:17px;text-align:left;cursor:pointer;display:grid;grid-template-columns:42px 1fr;gap:13px;align-items:start;transition:.16s ease}
    .nexlab-admin-tool:hover{transform:translateY(-1px);border-color:#93b4e8;box-shadow:0 12px 28px rgba(15,23,42,.08)}.nexlab-admin-tool:disabled{opacity:.55;cursor:not-allowed;transform:none}
    .nexlab-admin-tool-icon{width:42px;height:42px;border-radius:13px;background:#eaf1fb;color:#0b2a63;display:grid;place-items:center;font-size:1.25rem;font-weight:900}.nexlab-admin-tool h3{margin:0 0 5px;font-size:0.875rem}.nexlab-admin-tool p{margin:0;color:#64748b;font-size:0.6875rem;line-height:1.5}
    .nexlab-admin-note{border:1px solid #dbe4ef;background:#f8fafc;border-radius:15px;padding:13px 15px;color:#475569;font-size:0.6875rem;line-height:1.55}
    .nexlab-admin-warning{border-color:#fdba74;background:#fff7ed;color:#9a3412}.nexlab-admin-success{border-color:#86efac;background:#f0fdf4;color:#166534}.nexlab-admin-error{border-color:#fecaca;background:#fef2f2;color:#b91c1c}
    .nexlab-admin-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.nexlab-admin-btn{border:0;border-radius:12px;padding:11px 15px;font:800 12px/1 system-ui;cursor:pointer}.nexlab-admin-btn:disabled{opacity:.55;cursor:wait}.nexlab-admin-primary{background:#0b2a63;color:#fff}.nexlab-admin-secondary{background:#e2e8f0;color:#0f172a}.nexlab-admin-danger{background:#fee2e2;color:#991b1b}.nexlab-admin-orange{background:#f97316;color:#fff}
    .nexlab-admin-field{display:grid;gap:6px}.nexlab-admin-field>span{font-size:0.6875rem;font-weight:800;color:#475569}.nexlab-admin-field input,.nexlab-admin-field select,.nexlab-admin-field textarea{width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:10px 12px;font:12px/1.4 system-ui;background:#fff;color:#0f172a}.nexlab-admin-field textarea{resize:vertical;min-height:84px}
    .nexlab-preview-modes{display:flex;gap:8px}.nexlab-preview-mode{border:1px solid #cbd5e1;background:#fff;color:#475569;border-radius:999px;padding:8px 12px;font:800 11px/1 system-ui;cursor:pointer}.nexlab-preview-mode.is-active{background:#0b2a63;color:#fff;border-color:#0b2a63}
    .nexlab-role-cards{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}.nexlab-role-card{border:1px solid #dbe4ef;background:#fff;border-radius:14px;padding:12px 9px;text-align:center;cursor:pointer;font:800 11px/1.25 system-ui;color:#334155}.nexlab-role-card.is-active{border-color:#f97316;background:#fff7ed;color:#9a3412;box-shadow:0 0 0 2px rgba(249,115,22,.12)}
    .nexlab-preview-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.nexlab-preview-summary div{border:1px solid #dbe4ef;background:#f8fafc;border-radius:14px;padding:12px}.nexlab-preview-summary strong{display:block;font-size:1.125rem;color:#0b2a63}.nexlab-preview-summary span{font-size:0.625rem;color:#64748b}
    .nexlab-kanban-toolbar{display:grid;grid-template-columns:150px 230px minmax(180px,1fr) minmax(180px,1fr);gap:10px;align-items:end}.nexlab-kanban-toolbar .nexlab-admin-field{margin:0}
    .nexlab-kanban-stats{display:flex;gap:8px;flex-wrap:wrap}.nexlab-kanban-pill{border-radius:999px;padding:6px 9px;background:#eef2f7;color:#475569;font:800 10px/1 system-ui}.nexlab-kanban-pill.is-changed{background:#ffedd5;color:#9a3412}
    .nexlab-kanban-board{display:grid;grid-template-columns:repeat(4,minmax(245px,1fr));gap:12px;overflow-x:auto;padding-bottom:5px}.nexlab-kanban-column{border:1px solid #dbe4ef;background:#f8fafc;border-radius:18px;min-height:460px;display:flex;flex-direction:column}.nexlab-kanban-column.is-drop{outline:3px solid rgba(249,115,22,.22);border-color:#f97316}.nexlab-kanban-column-head{padding:13px 14px;border-bottom:1px solid #dbe4ef;display:flex;align-items:center;justify-content:space-between;gap:8px;position:sticky;top:76px;background:#f8fafc;border-radius:18px 18px 0 0;z-index:2}.nexlab-kanban-column-head strong{font-size:0.75rem}.nexlab-kanban-column-head span{font-size:0.625rem;background:#fff;border:1px solid #dbe4ef;border-radius:999px;padding:4px 7px}
    .nexlab-kanban-list{padding:10px;display:grid;gap:8px;align-content:start;min-height:390px}.nexlab-permission-card{border:1px solid #dbe4ef;background:#fff;border-radius:14px;padding:11px;display:grid;gap:7px;cursor:grab;box-shadow:0 4px 12px rgba(15,23,42,.04)}.nexlab-permission-card.is-locked{cursor:not-allowed;background:#f1f5f9}.nexlab-permission-card.is-dragging{opacity:.45}.nexlab-permission-card h4{font-size:0.6875rem;margin:0;color:#0f172a}.nexlab-permission-card p{font-size:0.5625rem;line-height:1.4;color:#64748b;margin:0}.nexlab-permission-card-meta{display:flex;gap:5px;flex-wrap:wrap}.nexlab-permission-card-meta span{font-size:0.5rem;font-weight:900;border-radius:999px;background:#eef2f7;color:#475569;padding:4px 6px}.nexlab-permission-toggle{border:0;background:#e2e8f0;color:#334155;border-radius:9px;padding:7px 8px;font:800 9px/1 system-ui;cursor:pointer}.nexlab-permission-card.is-locked .nexlab-permission-toggle{display:none}
    .nexlab-security-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.nexlab-security-summary div{border:1px solid #dbe4ef;border-radius:14px;padding:12px;background:#f8fafc}.nexlab-security-summary strong{display:block;font-size:1.1875rem;color:#0b2a63}.nexlab-security-summary span{font-size:0.5625rem;color:#64748b}.nexlab-hash{display:block;word-break:break-all;border:1px solid #dbe4ef;background:#0f172a;color:#e2e8f0;border-radius:12px;padding:10px;font:10px/1.5 ui-monospace,monospace}
    .nexlab-review-list{display:grid;gap:9px}.nexlab-review-row{border:1px solid #dbe4ef;border-radius:13px;padding:11px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px}.nexlab-review-row strong{font-size:0.6875rem}.nexlab-review-row span{font-size:0.625rem;color:#64748b}.nexlab-review-state{font-weight:900!important}.nexlab-review-state.ok{color:#166534}.nexlab-review-state.fail{color:#b91c1c}.nexlab-hidden{display:none!important}
    @media(max-width:760px){.nexlab-admin-overlay{padding:0}.nexlab-admin-dialog,.nexlab-admin-dialog.is-wide{max-height:100vh;height:100%;border-radius:0}.nexlab-admin-head,.nexlab-admin-body{padding-left:17px;padding-right:17px}.nexlab-admin-grid{grid-template-columns:1fr}.nexlab-role-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.nexlab-preview-summary,.nexlab-security-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.nexlab-kanban-toolbar{grid-template-columns:1fr}.nexlab-kanban-board{grid-template-columns:repeat(4,270px)}.nexlab-kanban-column-head{top:72px}}
  `;
  document.head.appendChild(style);

  function authToken(){return CONFIG.getAccessToken();}

  function jwtSubject(jwt){
    try{
      const body=jwt.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
      const padded=body.padEnd(Math.ceil(body.length/4)*4,'=');
      const payload=JSON.parse(decodeURIComponent(Array.from(atob(padded),c=>`%${c.charCodeAt(0).toString(16).padStart(2,'0')}`).join('')));
      return String(payload?.sub||'');
    }catch{return '';}
  }

  async function api(path,options={}){
    const token=authToken();
    if(!token)throw new Error('Sessão não encontrada. Entre novamente no NEXLAB.');
    const method=String(options.method||'GET').toUpperCase();
    const rpcMatch=String(path||'').match(/\/rpc\/([^/?#]+)/i);const rpcName=rpcMatch?decodeURIComponent(rpcMatch[1]):'';
    const readOperation=method==='GET'||globalThis.__NEXLAB_RPC_REGISTRY__?.classifyRpc?.(rpcName)==='read';
    const attempts=readOperation?2:1;let lastError=null;
    for(let attempt=0;attempt<attempts;attempt+=1){
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
      try{
        const response=await fetch(`${BASE}${path}`,{...options,headers:{apikey:KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})},cache:'no-store',signal:controller.signal});
        let data=null;try{data=await response.json();}catch{}
        if(!response.ok){const error=new Error(data?.message||data?.error_description||data?.hint||`Falha HTTP ${response.status}.`);error.status=response.status;throw error;}
        return data;
      }catch(error){lastError=error;const transient=error?.name==='AbortError'||[0,429,502,503,504].includes(Number(error?.status||0));if(attempt+1>=attempts||!transient)break;await new Promise(resolve=>setTimeout(resolve,450*(attempt+1)));}
      finally{clearTimeout(timer);}
    }
    if(lastError?.name==='AbortError')throw new Error('A consulta demorou mais de 12 segundos. Verifique a conexão e tente novamente.');
    throw lastError||new Error('Não foi possível concluir a consulta.');
  }

  function rpc(name,payload={}){
    return api(`/rest/v1/rpc/${encodeURIComponent(name)}`,{method:'POST',body:JSON.stringify(payload)});
  }

  async function currentProfile(){
    const token=authToken();
    const id=jwtSubject(token);
    if(!id)return null;
    try{
      const rows=await api(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=id,nome,role,ativo`);
      return Array.isArray(rows)?rows[0]||null:null;
    }catch{return null;}
  }

  async function currentAdmin(){
    const profile=await currentProfile();
    if(!profile||profile.ativo===false||!['admin','administrador'].includes(String(profile.role||'').toLowerCase()))return null;
    return profile;
  }

  async function currentPreviewOperator(){
    const profile=await currentProfile();
    if(!profile||profile.ativo===false||!['admin','administrador','coordenador'].includes(String(profile.role||'').toLowerCase()))return null;
    return profile;
  }

  async function loadPreviewData(){
    const data=await rpc('nexlab_get_profile_preview_data_v02655');
    if(!data?.ok||!Array.isArray(data.available_roles)||!Array.isArray(data.defaults)||!Array.isArray(data.users))throw new Error('O Supabase retornou dados incompletos para a visualização.');
    return data;
  }

  async function loadMatrix(force=false){
    if(!force&&matrixCache&&Date.now()-matrixLoadedAt<30000)return matrixCache;
    const data=await rpc('nexlab_get_permission_matrix_v02652');
    if(!data||!Array.isArray(data.catalog)||!Array.isArray(data.defaults)||!Array.isArray(data.users))throw new Error('O Supabase retornou uma matriz incompleta.');
    matrixCache=data;matrixLoadedAt=Date.now();return data;
  }

  function createDialog(title,description,wide=false){
    const overlay=document.createElement('div');overlay.className='nexlab-admin-overlay';
    const dialog=document.createElement('section');dialog.className=`nexlab-admin-dialog${wide?' is-wide':''}`;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
    dialog.innerHTML=`<header class="nexlab-admin-head"><div><h2></h2><p></p></div><button class="nexlab-admin-close" type="button" aria-label="Fechar">×</button></header><div class="nexlab-admin-body"></div>`;
    dialog.querySelector('h2').textContent=title;dialog.querySelector('p').textContent=description;
    overlay.appendChild(dialog);document.body.appendChild(overlay);
    const close=()=>overlay.remove();dialog.querySelector('.nexlab-admin-close').onclick=close;overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
    return {overlay,dialog,body:dialog.querySelector('.nexlab-admin-body'),close};
  }

  function messageBox(text,type=''){
    const box=document.createElement('div');box.className=`nexlab-admin-note${type?` nexlab-admin-${type}`:''}`;box.textContent=text;return box;
  }

  function roleLabel(role){return ROLE_LABELS[String(role||'').toLowerCase()]||String(role||'Perfil');}
  function normalizeRole(role){const value=String(role||'').toLowerCase();return value==='administrador'?'admin':value;}
  function permissionConstraintState(role,row,item){
    const normalized=normalizeRole(role);
    if(normalized==='admin')return'protected';
    const incompatible=row?.assignment_state==='incompatible'
      || item?.admin_only===true
      || (Array.isArray(item?.eligible_roles)&&!item.eligible_roles.includes(normalized));
    if(incompatible)return'incompatible';
    if(row?.assignment_state==='protected'||item?.core===true||item?.grantable===false)return'protected';
    return row?.allowed?'allowed':'denied';
  }
  function userOverrideState(effect){return effect==='allow'?'granted':effect==='deny'?'revoked':'inherited';}
  function userOverridePayload(state){return state==='granted'?'allow':state==='revoked'?'deny':'default';}
  function permissionKanbanSelfTest(matrix){
    const syntheticAdminOnly={permission_key:'synthetic_admin_only',admin_only:true,core:false,grantable:true,eligible_roles:['admin']};
    const syntheticProtected={permission_key:'synthetic_core',admin_only:false,core:true,grantable:false,eligible_roles:['voluntario']};
    const cases=[
      {name:'admin_only_is_incompatible_for_volunteer',ok:permissionConstraintState('voluntario',{allowed:false,assignment_state:'incompatible'},syntheticAdminOnly)==='incompatible'},
      {name:'core_permission_is_protected_when_eligible',ok:permissionConstraintState('voluntario',{allowed:true,assignment_state:'protected'},syntheticProtected)==='protected'},
      {name:'user_allow_maps_to_granted',ok:userOverrideState('allow')==='granted'},
      {name:'user_deny_maps_to_revoked',ok:userOverrideState('deny')==='revoked'},
      {name:'user_default_maps_to_inherited',ok:userOverrideState(null)==='inherited'},
      {name:'user_payload_round_trip',ok:userOverridePayload('granted')==='allow'&&userOverridePayload('revoked')==='deny'&&userOverridePayload('inherited')==='default'},
      {name:'matrix_has_user_override_data',ok:Array.isArray(matrix?.users)&&Array.isArray(matrix?.overrides)}
    ];
    return {ok:cases.every(item=>item.ok),cases};
  }
  window.NexlabPermissionKanbanDiagnostics=Object.freeze({version:VERSION,selfTest:permissionKanbanSelfTest,permissionConstraintState,userOverrideState,userOverridePayload});

  function downloadBlob(name,content,type='application/json'){
    const blob=new Blob([content],{type});
    const anchor=document.createElement('a');anchor.href=URL.createObjectURL(blob);anchor.download=name;anchor.click();
    setTimeout(()=>URL.revokeObjectURL(anchor.href),1800);
  }

  async function sha256(text){
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  }

  async function openProfilePreview(){
    const {body}=createDialog('Visualizar como perfil','Simule a interface e as permissões sem alterar usuários, vínculos ou dados do Supabase. Administradores podem visualizar qualquer perfil; Coordenadores não podem simular Administrador.');
    const loading=messageBox('Carregando perfis e permissões...');body.appendChild(loading);
    try{
      const [previewData,operator]=await Promise.all([loadPreviewData(),currentPreviewOperator()]);
      if(!operator)throw new Error('A sessão de Administrador ou Coordenador não foi confirmada.');
      loading.remove();
      const allowedRoles=previewData.available_roles.map(normalizeRole).filter(role=>ROLE_ORDER.includes(role));
      if(!allowedRoles.length)throw new Error('Nenhum perfil está disponível para simulação.');
      let mode='role';let selectedRole=allowedRoles.includes('voluntario')?'voluntario':allowedRoles[0];let selectedUserId='';
      const modes=document.createElement('div');modes.className='nexlab-preview-modes';modes.innerHTML='<button class="nexlab-preview-mode is-active" data-mode="role" type="button">Perfil padrão</button><button class="nexlab-preview-mode" data-mode="user" type="button">Usuário específico</button>';body.appendChild(modes);
      const roleCards=document.createElement('div');roleCards.className='nexlab-role-cards';
      for(const role of allowedRoles){
        const button=document.createElement('button');button.type='button';button.className=`nexlab-role-card${role===selectedRole?' is-active':''}`;button.dataset.role=role;button.textContent=roleLabel(role);roleCards.appendChild(button);
      }
      body.appendChild(roleCards);
      const userField=document.createElement('label');userField.className='nexlab-admin-field nexlab-hidden';userField.innerHTML='<span>Usuário para simulação</span><select></select>';
      const select=userField.querySelector('select');
      const users=[...previewData.users].filter(user=>allowedRoles.includes(normalizeRole(user.role))).sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR'));
      for(const user of users){
        const option=document.createElement('option');option.value=String(user.id);option.textContent=`${user.nome||'Usuário'} — ${roleLabel(user.role)}${user.ativo===false?' — inativo':''}`;select.appendChild(option);
      }
      selectedUserId=select.value;body.appendChild(userField);
      const summary=document.createElement('div');summary.className='nexlab-preview-summary';body.appendChild(summary);
      const operatorRole=normalizeRole(previewData.operator?.role||operator.role);
      const note=messageBox(`Operador: ${roleLabel(operatorRole)}. A visualização usa a sessão atual para consultas, mas bloqueia toda alteração no backend. Ela não substitui o teste real de RLS com uma conta temporária.`,'warning');body.appendChild(note);
      const status=document.createElement('div');body.appendChild(status);
      const actions=document.createElement('div');actions.className='nexlab-admin-actions';actions.innerHTML='<button type="button" class="nexlab-admin-btn nexlab-admin-primary">Abrir visualização em nova guia</button>';body.appendChild(actions);
      const launch=actions.querySelector('button');

      function rolePermissions(role){return previewData.defaults.filter(row=>normalizeRole(row.role_key)===normalizeRole(role)&&row.allowed).map(row=>row.permission_key);}
      function selection(){
        if(mode==='user'){
          const user=users.find(item=>String(item.id)===String(selectedUserId));
          if(!user)return null;
          const role=normalizeRole(user.role||'coworking_junior');
          return {role,name:user.nome||'Usuário',permissions:Array.isArray(user.effective_permissions)?user.effective_permissions:rolePermissions(role),user};
        }
        return {role:selectedRole,name:roleLabel(selectedRole),permissions:rolePermissions(selectedRole),user:null};
      }
      function renderSummary(){
        const chosen=selection();
        const allowed=chosen?.permissions?.length||0;
        const modules=new Set((chosen?.permissions||[]).filter(key=>String(key).startsWith('module_'))).size;
        summary.innerHTML=`<div><strong>${allowed}</strong><span>permissões efetivas</span></div><div><strong>${modules}</strong><span>módulos principais</span></div><div><strong>20 min</strong><span>validade da visualização</span></div>`;
        launch.disabled=!chosen;
      }
      renderSummary();
      modes.addEventListener('click',event=>{
        const button=event.target.closest('[data-mode]');if(!button)return;mode=button.dataset.mode;
        modes.querySelectorAll('[data-mode]').forEach(item=>item.classList.toggle('is-active',item===button));
        roleCards.classList.toggle('nexlab-hidden',mode!=='role');userField.classList.toggle('nexlab-hidden',mode!=='user');renderSummary();
      });
      roleCards.addEventListener('click',event=>{
        const button=event.target.closest('[data-role]');if(!button)return;selectedRole=button.dataset.role;
        roleCards.querySelectorAll('[data-role]').forEach(item=>item.classList.toggle('is-active',item===button));renderSummary();
      });
      select.addEventListener('change',()=>{selectedUserId=select.value;renderSummary();});
      launch.addEventListener('click',()=>{
        const chosen=selection();if(!chosen)return;
        if(operatorRole==='coordenador'&&normalizeRole(chosen.role)==='admin'){
          status.replaceChildren(messageBox('Coordenadores não podem simular o perfil Administrador.','error'));return;
        }
        const token=crypto.randomUUID();
        const config={token,issuedBy:String(operator.id),issuedByRole:operatorRole,mode,targetRole:chosen.role,targetName:chosen.name,targetUserId:chosen.user?String(chosen.user.id):null,effectivePermissions:[...new Set(chosen.permissions.map(String))],sourceRevision:previewData.revision,readOnly:true,backendOrigin:BASE,createdAt:Date.now(),expiresAt:Date.now()+20*60*1000};
        localStorage.setItem(`nexlab-preview:${token}`,JSON.stringify(config));
        const target=new URL(location.href);target.searchParams.set('nexlab_preview',token);target.hash='';
        const opened=window.open(target.toString(),'_blank');
        if(opened)try{opened.opener=null;}catch{}
        if(!opened)status.replaceChildren(messageBox('O navegador bloqueou a nova guia. Autorize pop-ups para este site e tente novamente.','error'));
        else status.replaceChildren(messageBox(`Visualização de ${chosen.name} aberta com bloqueio integral de escrita.`,'success'));
      });
    }catch(error){loading.className='nexlab-admin-note nexlab-admin-error';loading.textContent=error.message||'Falha ao carregar a visualização.';}
  }

  async function openPermissionKanban(){
    const {body}=createDialog('Kanban de permissões','Gerencie padrões de perfil ou exceções individuais. Arraste os cartões ou use o seletor de estado em celulares.',true);
    const loading=messageBox('Carregando matriz de permissões...');body.appendChild(loading);
    try{
      let matrix=await loadMatrix();loading.remove();
      let targetKind='role';let targetId='voluntario';let search='';let category='all';let original=new Map();let working=new Map();let baseAllowed=new Map();let lockKinds=new Map();let dragged='';
      const catalogByKey=new Map(matrix.catalog.map(item=>[item.permission_key,item]));
      const dependencies=Array.isArray(matrix.dependencies)?matrix.dependencies:[];
      const eligibleUsers=()=>matrix.users.filter(user=>normalizeRole(user.role)!=='admin').sort((a,b)=>String(a.nome||a.email||'').localeCompare(String(b.nome||b.email||''),'pt-BR'));
      const toolbar=document.createElement('div');toolbar.className='nexlab-kanban-toolbar';toolbar.innerHTML='<label class="nexlab-admin-field"><span>Aplicar em</span><select data-kind><option value="role">Perfil</option><option value="user">Usuário</option></select></label><label class="nexlab-admin-field"><span data-target-label>Perfil</span><select data-target></select></label><label class="nexlab-admin-field"><span>Buscar permissão</span><input data-search type="search" placeholder="Nome, chave ou descrição"></label><label class="nexlab-admin-field"><span>Categoria</span><select data-category></select></label>';body.appendChild(toolbar);
      const kindSelect=toolbar.querySelector('[data-kind]'),targetSelect=toolbar.querySelector('[data-target]'),targetLabel=toolbar.querySelector('[data-target-label]');
      const categories=['all',...[...new Set(matrix.catalog.map(item=>item.category||'Outros'))].sort((a,b)=>a.localeCompare(b,'pt-BR'))];const categorySelect=toolbar.querySelector('[data-category]');for(const item of categories){const option=document.createElement('option');option.value=item;option.textContent=item==='all'?'Todas as categorias':item;categorySelect.appendChild(option);}
      const stats=document.createElement('div');stats.className='nexlab-kanban-stats';body.appendChild(stats);
      const board=document.createElement('div');board.className='nexlab-kanban-board';body.appendChild(board);
      const form=document.createElement('div');form.innerHTML='<label class="nexlab-admin-field"><span>Motivo da alteração</span><textarea data-reason placeholder="Obrigatório para registrar a mudança na auditoria"></textarea></label><div class="nexlab-admin-actions"><button type="button" data-save class="nexlab-admin-btn nexlab-admin-primary">Salvar alterações</button><button type="button" data-reset class="nexlab-admin-btn nexlab-admin-secondary">Descartar alterações</button><button type="button" data-restore class="nexlab-admin-btn nexlab-admin-danger nexlab-hidden">Restaurar padrão do perfil</button></div><div data-message></div>';body.appendChild(form);
      const reason=form.querySelector('[data-reason]'),save=form.querySelector('[data-save]'),reset=form.querySelector('[data-reset]'),restore=form.querySelector('[data-restore]'),message=form.querySelector('[data-message]');

      function currentUser(){return matrix.users.find(user=>String(user.id)===String(targetId))||null;}
      function currentRole(){return targetKind==='role'?normalizeRole(targetId):normalizeRole(currentUser()?.role);}
      function defaultRow(key){return matrix.defaults.find(entry=>normalizeRole(entry.role_key)===currentRole()&&entry.permission_key===key);}
      function overrideEffect(userId,key){return matrix.overrides.find(entry=>String(entry.user_id)===String(userId)&&entry.permission_key===key)?.effect||null;}
      function targetName(){return targetKind==='role'?roleLabel(targetId):(currentUser()?.nome||currentUser()?.email||'Usuário');}
      function populateTargets(){
        const previous=targetId;targetSelect.innerHTML='';
        if(targetKind==='role'){
          targetLabel.textContent='Perfil';
          for(const item of ROLE_ORDER){const option=document.createElement('option');option.value=item;option.textContent=roleLabel(item);targetSelect.appendChild(option);}
          targetId=ROLE_ORDER.includes(previous)?previous:'voluntario';
        }else{
          targetLabel.textContent='Usuário';
          const users=eligibleUsers();
          for(const user of users){const option=document.createElement('option');option.value=String(user.id);option.textContent=`${user.nome||user.email||'Usuário'} — ${roleLabel(user.role)}${user.ativo===false?' — inativo':''}`;targetSelect.appendChild(option);}
          targetId=users.some(user=>String(user.id)===String(previous))?String(previous):String(users[0]?.id||'');
        }
        targetSelect.value=targetId;restore.classList.toggle('nexlab-hidden',targetKind!=='user');
      }
      function rebuildState(){
        original=new Map();working=new Map();baseAllowed=new Map();lockKinds=new Map();
        const user=currentUser();
        for(const item of matrix.catalog){
          const row=defaultRow(item.permission_key);const constraint=permissionConstraintState(currentRole(),row,item);baseAllowed.set(item.permission_key,Boolean(row?.allowed));
          if(targetKind==='role'){
            original.set(item.permission_key,constraint);working.set(item.permission_key,constraint);lockKinds.set(item.permission_key,['protected','incompatible'].includes(constraint)?constraint:'');
          }else{
            const blocked=['protected','incompatible'].includes(constraint);
            const state=blocked?'blocked':userOverrideState(overrideEffect(user?.id,item.permission_key));
            original.set(item.permission_key,state);working.set(item.permission_key,state);lockKinds.set(item.permission_key,blocked?constraint:'');
          }
        }
      }
      function changedKeys(){return [...working.keys()].filter(key=>working.get(key)!==original.get(key));}
      function locked(key){return targetKind==='role'?['protected','incompatible'].includes(working.get(key)):working.get(key)==='blocked';}
      function visible(item){const term=search.trim().toLowerCase();const matchesText=!term||`${item.label} ${item.permission_key} ${item.description||''}`.toLowerCase().includes(term);return matchesText&&(category==='all'||(item.category||'Outros')===category);}
      function setMessage(text,type=''){message.replaceChildren(text?messageBox(text,type):document.createTextNode(''));}

      function allowRoleWithDependencies(key,visited=new Set()){
        if(visited.has(key))return;visited.add(key);
        if(working.get(key)==='incompatible')throw new Error(`${catalogByKey.get(key)?.label||key} é incompatível com ${roleLabel(currentRole())}.`);
        if(working.get(key)==='protected')return;
        for(const dep of dependencies.filter(item=>item.permission_key===key))allowRoleWithDependencies(dep.required_permission_key,visited);
        working.set(key,'allowed');
      }
      function denyRoleWithDependents(key,visited=new Set()){
        if(visited.has(key))return;visited.add(key);
        if(working.get(key)==='protected')throw new Error(`${catalogByKey.get(key)?.label||key} é protegida e não pode ser negada.`);
        if(working.get(key)==='incompatible')return;
        for(const dep of dependencies.filter(item=>item.required_permission_key===key)){if(working.get(dep.permission_key)==='allowed')denyRoleWithDependents(dep.permission_key,visited);}
        working.set(key,'denied');
      }
      function userEffective(key){const state=working.get(key);if(state==='granted')return true;if(state==='revoked')return false;return Boolean(baseAllowed.get(key));}
      function allowUserWithDependencies(key,visited=new Set()){
        if(visited.has(key))return;visited.add(key);
        if(working.get(key)==='blocked'&&!userEffective(key))throw new Error(`${catalogByKey.get(key)?.label||key} é ${lockKinds.get(key)==='incompatible'?'incompatível':'protegida'} para ${roleLabel(currentRole())}.`);
        for(const dep of dependencies.filter(item=>item.permission_key===key))allowUserWithDependencies(dep.required_permission_key,visited);
        if(working.get(key)!=='blocked')working.set(key,'granted');
      }
      function revokeUserWithDependents(key,visited=new Set()){
        if(visited.has(key))return;visited.add(key);
        if(working.get(key)==='blocked'){
          if(userEffective(key))throw new Error(`${catalogByKey.get(key)?.label||key} é protegida e não pode ser revogada.`);
          return;
        }
        for(const dep of dependencies.filter(item=>item.required_permission_key===key)){if(userEffective(dep.permission_key))revokeUserWithDependents(dep.permission_key,visited);}
        working.set(key,'revoked');
      }
      function inheritUserWithDependencies(key){
        if(working.get(key)==='blocked')return;
        if(baseAllowed.get(key)){
          for(const dep of dependencies.filter(item=>item.permission_key===key))allowUserWithDependencies(dep.required_permission_key,new Set([key]));
        }else{
          for(const dep of dependencies.filter(item=>item.required_permission_key===key)){if(userEffective(dep.permission_key))revokeUserWithDependents(dep.permission_key);}
        }
        working.set(key,'inherited');
      }
      function move(key,target){
        try{
          if(locked(key))return;
          if(targetKind==='role'){
            if(!['allowed','denied'].includes(target))return;
            if(target==='allowed')allowRoleWithDependencies(key);else denyRoleWithDependents(key);
          }else{
            if(!['inherited','granted','revoked'].includes(target))return;
            if(target==='granted')allowUserWithDependencies(key);else if(target==='revoked')revokeUserWithDependents(key);else inheritUserWithDependencies(key);
          }
          setMessage('Alteração preparada. Salve para aplicar no Supabase.');render();
        }catch(error){setMessage(error.message,'error');}
      }
      function render(){
        const states=targetKind==='role'
          ?[['allowed','Permitidas'],['denied','Negadas'],['protected','Protegidas'],['incompatible','Incompatíveis']]
          :[['inherited','Herdadas do perfil'],['granted','Concedidas individualmente'],['revoked','Revogadas individualmente'],['blocked','Protegidas ou incompatíveis']];
        board.innerHTML='';
        for(const [state,label] of states){
          const column=document.createElement('section');column.className='nexlab-kanban-column';column.dataset.state=state;
          const items=matrix.catalog.filter(item=>working.get(item.permission_key)===state&&visible(item));
          column.innerHTML=`<header class="nexlab-kanban-column-head"><strong>${label}</strong><span>${items.length}</span></header><div class="nexlab-kanban-list"></div>`;
          const list=column.querySelector('.nexlab-kanban-list');
          for(const item of items){
            const isLocked=locked(item.permission_key);const card=document.createElement('article');card.className=`nexlab-permission-card${isLocked?' is-locked':''}`;card.draggable=!isLocked;card.dataset.key=item.permission_key;
            const deps=dependencies.filter(dep=>dep.permission_key===item.permission_key).map(dep=>catalogByKey.get(dep.required_permission_key)?.label||dep.required_permission_key);
            card.innerHTML=`<h4></h4><p></p><div class="nexlab-permission-card-meta"></div>${!isLocked?'<select class="nexlab-permission-toggle" aria-label="Alterar estado da permissão"></select>':''}`;
            card.querySelector('h4').textContent=item.label;card.querySelector('p').textContent=item.description||item.permission_key;
            const metadata=[item.category||'Outros',item.permission_key,deps.length?`Exige: ${deps.join(', ')}`:''];
            if(targetKind==='user')metadata.push(`Padrão: ${baseAllowed.get(item.permission_key)?'permitida':'negada'}`);
            if(isLocked)metadata.push(lockKinds.get(item.permission_key)==='incompatible'?'Incompatível':'Protegida');
            const meta=card.querySelector('.nexlab-permission-card-meta');for(const text of metadata){if(!text)continue;const chip=document.createElement('span');chip.textContent=text;meta.appendChild(chip);}
            const selector=card.querySelector('.nexlab-permission-toggle');if(selector){
              const options=targetKind==='role'?[['allowed','Permitida'],['denied','Negada']]:[['inherited','Herdar do perfil'],['granted','Conceder'],['revoked','Revogar']];
              for(const [value,text] of options){const option=document.createElement('option');option.value=value;option.textContent=text;selector.appendChild(option);}selector.value=state;selector.onchange=()=>move(item.permission_key,selector.value);
            }
            card.addEventListener('dragstart',()=>{dragged=item.permission_key;card.classList.add('is-dragging');});card.addEventListener('dragend',()=>{dragged='';card.classList.remove('is-dragging');board.querySelectorAll('.is-drop').forEach(node=>node.classList.remove('is-drop'));});list.appendChild(card);
          }
          const dropStates=targetKind==='role'?['allowed','denied']:['inherited','granted','revoked'];
          if(dropStates.includes(state)){
            column.addEventListener('dragover',event=>{event.preventDefault();column.classList.add('is-drop');});column.addEventListener('dragleave',event=>{if(!column.contains(event.relatedTarget))column.classList.remove('is-drop');});column.addEventListener('drop',event=>{event.preventDefault();column.classList.remove('is-drop');if(dragged)move(dragged,state);});
          }
          board.appendChild(column);
        }
        const changed=changedKeys().length;const counts={};for(const state of working.values())counts[state]=(counts[state]||0)+1;
        const targetChip=targetKind==='role'?`Perfil ${roleLabel(currentRole())}`:`Usuário ${targetName()} · ${roleLabel(currentRole())}`;
        const pills=[];
        const addPill=(text,isChanged=false)=>{const pill=document.createElement('span');pill.className=`nexlab-kanban-pill${isChanged?' is-changed':''}`;pill.textContent=String(text);pills.push(pill);};
        addPill(targetChip);addPill(`Revisão ${matrix.revision}`);
        for(const [state,count] of Object.entries(counts))addPill(`${count} ${state}`);
        addPill(`${changed} alteração(ões)`,changed>0);stats.replaceChildren(...pills);
        save.disabled=(targetKind==='role'&&currentRole()==='admin')||!targetId||changed===0;
      }
      async function refreshAfterSave(){matrix=await loadMatrix(true);catalogByKey.clear();for(const item of matrix.catalog)catalogByKey.set(item.permission_key,item);populateTargets();rebuildState();reason.value='';render();}

      populateTargets();rebuildState();render();
      kindSelect.addEventListener('change',()=>{targetKind=kindSelect.value;targetId=targetKind==='role'?'voluntario':'';populateTargets();rebuildState();setMessage(targetKind==='user'&&!targetId?'Não há usuários não administrativos disponíveis.':'');render();});
      targetSelect.addEventListener('change',()=>{targetId=targetSelect.value;rebuildState();setMessage(targetKind==='role'&&currentRole()==='admin'?'O perfil Administrador é integral e protegido.':'');render();});
      toolbar.querySelector('[data-search]').addEventListener('input',event=>{search=event.target.value;render();});categorySelect.addEventListener('change',()=>{category=categorySelect.value;render();});
      reset.addEventListener('click',()=>{rebuildState();setMessage('Alterações locais descartadas.');render();});
      save.addEventListener('click',async()=>{
        const changes=changedKeys();if(!changes.length)return;if(!reason.value.trim()){setMessage('Informe o motivo da alteração.','error');return;}
        if(typeof window.nexlabRequestPermissionPassword!=='function'){setMessage('O componente de confirmação administrativa não está disponível. Recarregue o aplicativo.','error');return;}
        const password=await window.nexlabRequestPermissionPassword({title:'Autorizar Kanban de permissões',message:`Confirme com a senha administrativa para aplicar ${changes.length} alteração(ões) em ${targetName()}.`,confirmLabel:'Salvar permissões'});
        if(password==null)return;save.disabled=true;reset.disabled=true;restore.disabled=true;setMessage('Salvando alterações...');
        const payload={};for(const key of changes)payload[key]=targetKind==='role'?working.get(key)==='allowed':userOverridePayload(working.get(key));
        try{
          if(targetKind==='role')await rpc('nexlab_admin_save_role_permissions_v02652',{p_role:currentRole(),p_permissions:payload,p_reason:reason.value.trim(),p_expected_revision:matrix.revision,p_admin_password:password});
          else await rpc('nexlab_admin_save_user_permissions_v02655',{p_target_user_id:String(targetId),p_overrides:payload,p_reason:reason.value.trim(),p_expected_revision:matrix.revision,p_admin_password:password});
          await refreshAfterSave();setMessage(`${targetKind==='role'?'Padrões':'Exceções individuais'} de ${targetName()} atualizados e auditados.`,'success');
        }catch(error){setMessage(error.message||'Falha ao salvar permissões.','error');render();}
        finally{reset.disabled=false;restore.disabled=false;}
      });
      restore.addEventListener('click',async()=>{
        if(targetKind!=='user'||!targetId)return;if(!reason.value.trim()){setMessage('Informe o motivo da restauração.','error');return;}
        if(typeof window.nexlabRequestPermissionPassword!=='function'){setMessage('O componente de confirmação administrativa não está disponível.','error');return;}
        const password=await window.nexlabRequestPermissionPassword({title:'Restaurar permissões do usuário',message:`Remover todas as exceções individuais de ${targetName()} e restaurar o padrão de ${roleLabel(currentRole())}?`,confirmLabel:'Restaurar padrão'});
        if(password==null)return;save.disabled=true;reset.disabled=true;restore.disabled=true;setMessage('Restaurando permissões padrão...');
        try{await rpc('nexlab_admin_restore_user_permissions_v02655',{p_target_user_id:String(targetId),p_reason:reason.value.trim(),p_expected_revision:matrix.revision,p_admin_password:password});await refreshAfterSave();setMessage(`Permissões de ${targetName()} restauradas para o padrão do perfil.`,'success');}
        catch(error){setMessage(error.message||'Falha ao restaurar permissões.','error');render();}
        finally{reset.disabled=false;restore.disabled=false;}
      });
    }catch(error){loading.className='nexlab-admin-note nexlab-admin-error';loading.textContent=error.message||'Falha ao carregar o Kanban.';}
  }

  async function openSecurityExport(){
    const {body}=createDialog('Exportação de segurança','Gere um snapshot sanitizado e auditado da configuração atual. Dados pessoais protegidos, credenciais e segredos não são incluídos.');
    const purpose=document.createElement('label');purpose.className='nexlab-admin-field';purpose.innerHTML='<span>Finalidade da exportação</span><textarea>Homologação física da Beta 0.26.82 e conferência do gate de promoção oficial.</textarea>';body.appendChild(purpose);
    body.appendChild(messageBox('O arquivo registra perfis apenas por contagem e função. A auditoria recente usa identificadores técnicos, sem dados pessoais diretos ou conteúdo pessoal.'));
    const actions=document.createElement('div');actions.className='nexlab-admin-actions';actions.innerHTML='<button type="button" class="nexlab-admin-btn nexlab-admin-primary">Gerar e baixar snapshot</button>';body.appendChild(actions);
    const output=document.createElement('div');body.appendChild(output);const button=actions.querySelector('button');
    button.addEventListener('click',async()=>{
      const text=purpose.querySelector('textarea').value.trim();if(text.length<10){output.replaceChildren(messageBox('Informe uma finalidade com pelo menos 10 caracteres.','error'));return;}
      button.disabled=true;button.textContent='Gerando snapshot...';output.replaceChildren(messageBox('Consultando integridade, permissões, RLS, auditoria e versões...'));
      try{
        const snapshot=await rpc('nexlab_export_security_snapshot_v02653',{p_purpose:text});
        const canonical=JSON.stringify(snapshot);
        const hash=await sha256(canonical);
        const envelope={format:'NEXLAB_SECURITY_SNAPSHOT',format_version:'1.0',generated_at:new Date().toISOString(),sha256:hash,hash_scope:'snapshot',snapshot};
        const filename=`NEXLAB_SEGURANCA_${VERSION.replaceAll('.','_')}_${new Date().toISOString().slice(0,10)}.json`;
        downloadBlob(filename,JSON.stringify(envelope,null,2));
        const profiles=snapshot.profiles||{};const permissions=snapshot.permissions||{};const database=snapshot.database||{};const rls=database.row_level_security||{};
        output.innerHTML=`<div class="nexlab-security-summary"><div><strong>${profiles.total||0}</strong><span>perfis analisados</span></div><div><strong>${permissions.actual_pairs||0}/${permissions.expected_pairs||0}</strong><span>pares da matriz</span></div><div><strong>${rls.rls_enabled||0}</strong><span>tabelas com RLS</span></div><div><strong>${snapshot.audit_chain?.valid===true?'Íntegra':'Revisar'}</strong><span>cadeia de auditoria</span></div></div><div class="nexlab-admin-note nexlab-admin-success">Snapshot gerado, auditado e baixado. ID de auditoria: ${snapshot.audit_id||'—'}</div><code class="nexlab-hash"></code>`;
        output.querySelector('.nexlab-hash').textContent=`SHA-256: ${hash}`;
      }catch(error){output.replaceChildren(messageBox(error.message||'Falha ao exportar a segurança.','error'));}
      finally{button.disabled=false;button.textContent='Gerar e baixar snapshot';}
    });
  }

  async function openReleaseReview(){
    const {body}=createDialog(`Revisão da Beta ${VERSION}`,'Executa testes funcionais do bloqueio somente leitura, acesso de Coordenadores, Kanban individual e matriz.');
    const status=messageBox('Executando verificações funcionais...');body.appendChild(status);
    const list=document.createElement('div');list.className='nexlab-review-list';body.appendChild(list);
    const actions=document.createElement('div');actions.className='nexlab-admin-actions nexlab-hidden';actions.innerHTML='<button type="button" class="nexlab-admin-btn nexlab-admin-secondary">Baixar relatório da revisão</button>';body.appendChild(actions);
    try{
      let release=null,manifest=null,matrix=null,diagnostics=null,previewData=null;
      const results=await Promise.allSettled([
        fetch(`./release.json?review=${Date.now()}`,{cache:'no-store'}).then(response=>response.ok?response.json():null),
        fetch(`./manifest.webmanifest?review=${Date.now()}`,{cache:'no-store'}).then(response=>response.ok?response.json():null),
        loadMatrix(true),
        rpc('nexlab_get_homologation_diagnostics_v02682'),
        loadPreviewData()
      ]);
      [release,manifest,matrix,diagnostics,previewData]=results.map(result=>result.status==='fulfilled'?result.value:null);
      const identity=window.__NEXLAB_BUILD_IDENTITY__||window.__NEXLAB_RELEASE__||{};
      const guardTest=window.NexlabProfilePreviewGuard?.selfTest?.()||{ok:false,cases:[]};
      const kanbanTest=window.NexlabPermissionKanbanDiagnostics?.selfTest?.(matrix)||{ok:false,cases:[]};
      const rpcRegistryTest=window.__NEXLAB_RPC_REGISTRY__?.selfTest?.()||{ok:false,cases:[],counts:{}};
      const checks=[];
      checks.push({label:'Identidade da versão',ok:String(identity.version||'')===VERSION,detail:String(identity.version||'não identificada')});
      checks.push({label:'Manifesto PWA isolado',ok:manifest?.name==='NexLab'&&manifest?.id==='./nexlab-pwa'&&manifest?.scope==='./'&&String(manifest?.start_url||'').startsWith('./'),detail:manifest?`${manifest.name} · id ${manifest.id} · scope ${manifest.scope}`:'não carregado'});
      checks.push({label:'Inventário release.json',ok:String(release?.version||'')===VERSION,detail:String(release?.version||'não carregado')});
      checks.push({label:'Matriz de cinco perfis',ok:Boolean(matrix?.summary?.matrix_complete)&&Number(matrix?.summary?.actual_pairs)===Number(matrix?.summary?.expected_pairs),detail:matrix?`${matrix.summary.actual_pairs}/${matrix.summary.expected_pairs} pares`:'indisponível'});
      checks.push({label:'Bloqueio somente leitura funcional',ok:guardTest.ok===true,detail:`${guardTest.cases?.filter(item=>item.ok).length||0}/${guardTest.cases?.length||0} cenários; inclui RPC desconhecida, REST, Storage, Edge Function e domínio próprio`});
      checks.push({label:'Registro explícito de RPCs',ok:rpcRegistryTest.ok===true,detail:rpcRegistryTest.ok?`${rpcRegistryTest.counts?.read||0} leituras · ${rpcRegistryTest.counts?.mutation||0} mutações · ${rpcRegistryTest.counts?.background||0} rotinas de fundo`:'registro ausente ou inconsistente'});
      checks.push({label:'Acesso de Coordenadores à simulação',ok:diagnostics?.profile_preview?.coordinator_allowed===true&&diagnostics?.profile_preview?.coordinator_cannot_simulate_admin===true&&previewData?.operator?.can_preview===true,detail:diagnostics?.profile_preview?`${(diagnostics.profile_preview.coordinator_roles||[]).map(roleLabel).join(', ')}; Administrador excluído`:'diagnóstico indisponível'});
      checks.push({label:'Kanban por usuário e classificação',ok:kanbanTest.ok===true&&diagnostics?.user_kanban?.override_schema_complete===true&&diagnostics?.user_kanban?.save_rpc_available===true&&diagnostics?.user_kanban?.restore_rpc_available===true,detail:`${kanbanTest.cases?.filter(item=>item.ok).length||0}/${kanbanTest.cases?.length||0} cenários locais; salvar e restaurar disponíveis`});
      const expectedDatabaseVersion=String(release?.database?.current_version||release?.database?.version||'');
      checks.push({label:'Diagnóstico do Supabase',ok:Boolean(expectedDatabaseVersion)&&String(diagnostics?.version||'')===expectedDatabaseVersion&&diagnostics?.matrix?.complete===true,detail:diagnostics?`frontend ${VERSION}; banco ${diagnostics.version}; matriz ${diagnostics.matrix.actual}/${diagnostics.matrix.expected}`:'indisponível'});
      const uiGuard=window.NexlabAdministrativeUiGuard?.selfTest?.()||{ok:false};
      const mandatory=identity?.pwa?.mandatoryShell||[];const functional=identity?.pwa?.functional||[];const duplicates=mandatory.filter(path=>functional.includes(path));
      checks.push({label:'Limpeza de sessão e acessibilidade administrativa',ok:uiGuard.ok===true,detail:uiGuard.ok?'logout, troca de perfil, foco, Esc e restauração de foco ativos':'proteção não carregada'});
      checks.push({label:'Cache obrigatório das ferramentas',ok:['assets/nexlab-rpc-registry.js','assets/nexlab-admin-ui-guard.js','assets/nexlab-coordinator-validation.js','assets/nexlab-admin-homologation.js'].every(path=>mandatory.includes(path))&&duplicates.length===0,detail:`${mandatory.length} recursos obrigatórios; ${duplicates.length} duplicidade(s)`});
      checks.push({label:'Dashboard consolidado',ok:diagnostics?.dashboard_bundle?.available===true&&diagnostics?.dashboard_bundle?.single_round_trip===true&&diagnostics?.dashboard_bundle?.section_isolation===true,detail:diagnostics?.dashboard_bundle?.available?'uma RPC com isolamento por seção':'RPC consolidada indisponível'});
      const allOk=checks.every(item=>item.ok);status.className=`nexlab-admin-note ${allOk?'nexlab-admin-success':'nexlab-admin-warning'}`;status.textContent=allOk?'Todos os testes funcionais integrados foram aprovados.':'A revisão funcional encontrou itens que precisam de atenção.';
      for(const item of checks){const row=document.createElement('div');row.className='nexlab-review-row';row.innerHTML='<div><strong></strong><br><span></span></div><span class="nexlab-review-state"></span>';row.querySelector('strong').textContent=item.label;row.querySelector('div span').textContent=item.detail;const state=row.querySelector('.nexlab-review-state');state.textContent=item.ok?'APROVADO':'ATENÇÃO';state.classList.add(item.ok?'ok':'fail');list.appendChild(row);}
      const report={app:'NEXLAB',version:VERSION,checked_at:new Date().toISOString(),approved:allOk,checks,rpc_registry:rpcRegistryTest,preview_guard:guardTest,permission_kanban:kanbanTest,server_diagnostics:diagnostics};actions.classList.remove('nexlab-hidden');actions.querySelector('button').onclick=()=>downloadBlob(`NEXLAB_REVISAO_${VERSION.replaceAll('.','_')}.json`,JSON.stringify(report,null,2));
    }catch(error){status.className='nexlab-admin-note nexlab-admin-error';status.textContent=error.message||'Falha na revisão funcional.';const retry=document.createElement('button');retry.type='button';retry.className='nexlab-admin-btn nexlab-admin-secondary';retry.textContent='Tentar novamente';retry.onclick=()=>{document.querySelector('.nexlab-admin-overlay')?.remove();openReleaseReview();};body.appendChild(retry);}
  }

  window.NexlabAdminHomologation=Object.freeze({version:VERSION,openProfilePreview,openPermissionKanban,openSecurityExport,openReleaseReview,openCoordinatorValidation:()=>window.NexlabCoordinatorValidation?.openValidation?.(),openPromotion:()=>window.NexlabCoordinatorValidation?.openPromotion?.()});
})();
