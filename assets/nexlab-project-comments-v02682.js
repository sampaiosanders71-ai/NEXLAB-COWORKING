(function(){
  'use strict';

  const BUILD=globalThis.__NEXLAB_BUILD_IDENTITY__||Object.freeze({version:'0.26.82',revision:'beta-0-26-82-google-calendar-integracao'});
  const REVISION=BUILD.revision;
  if(globalThis.__NEXLAB_PROJECT_COMMENTS__?.revision===REVISION)return;

  const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const PANEL_SELECTOR='.project-details-panel-v2690.project-details-panel-v02667';
  const BODY_SELECTOR='.project-details-body-v2690.project-details-body-v02667';
  const HEADER_SELECTOR='.project-details-header-v2690.project-details-header-v02667';
  const FOOTER_SELECTOR='.project-details-footer-v2690.project-details-footer-v02667';
  const WORKER_FALLBACK='https://nexlab-communication.sampaiosanders71.workers.dev';
  const PAGE_SIZE=30;
  const states=new WeakMap();
  const stateByProjectId=new Map();
  let profilesPromise=null;
  let observerScheduled=false;

  function client(){return globalThis.__NEXLAB_SUPABASE__||null;}
  function workerUrl(){return String(globalThis.__NEXLAB_CONFIG__?.endpoints?.communication||WORKER_FALLBACK).replace(/\/+$/,'');}
  function clean(value,max=4000){return String(value??'').trim().slice(0,max);}
  function initials(name){return clean(name,80).split(/\s+/).filter(Boolean).slice(0,2).map(v=>v[0]?.toUpperCase()||'').join('')||'U';}
  function roleLabel(role){return ({admin:'Admin',administrador:'Admin',coordenador:'Coordenador',bolsista:'Bolsista',voluntario:'Voluntário',coworking_junior:'Coworking Júnior'}[String(role||'').toLowerCase()]||'Usuário');}
  function formatDate(value){if(!value)return 'Agora';try{return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));}catch{return '—';}}
  function isUuid(value){return UUID_RE.test(String(value||''));}

  function toast(message,type='info'){
    try{
      globalThis.dispatchEvent(new CustomEvent('nexlab:toast',{detail:{text:message,type}}));
    }catch{}
    if(typeof globalThis.nexlabShowModal==='function'&&type==='err'){
      globalThis.nexlabShowModal({title:'Comentários do projeto',message,variant:'danger',okLabel:'Entendi'}).catch?.(()=>{});
    }
  }

  async function waitClient(timeout=12000){
    const start=Date.now();
    while(Date.now()-start<timeout){
      const c=client();
      if(c?.auth)return c;
      await new Promise(resolve=>setTimeout(resolve,80));
    }
    throw new Error('Cliente do NEXLAB não ficou disponível.');
  }

  async function session(){
    const c=await waitClient();
    let result=await c.auth.getSession();
    if(result?.error)throw result.error;
    let current=result?.data?.session||null;
    if(!current?.access_token)throw new Error('Sessão expirada. Entre novamente no NEXLAB.');
    return current;
  }

  async function api(path,options={},retry=true){
    const current=await session();
    const headers=new Headers(options.headers||{});
    headers.set('Authorization',`Bearer ${current.access_token}`);
    headers.set('Accept','application/json');
    if(options.body!=null&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
    let response;
    try{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),15000);
      try{response=await fetch(workerUrl()+path,{...options,headers,signal:controller.signal,cache:'no-store'});}finally{clearTimeout(timer);}
    }catch(error){
      if(error?.name==='AbortError')throw new Error('O serviço de comentários demorou para responder.');
      throw new Error(navigator.onLine===false?'Sem conexão com a internet.':'Não foi possível acessar o serviço de comentários.');
    }
    if(response.status===401&&retry){
      try{await client()?.auth?.refreshSession?.();}catch{}
      return api(path,options,false);
    }
    let data=null;
    try{data=await response.json();}catch{}
    if(!response.ok){
      const code=String(data?.error||`http_${response.status}`);
      const messages={
        access_denied:'Você não possui permissão para esta ação.',
        invalid_or_expired_session:'Sua sessão expirou. Entre novamente.',
        project_not_found:'Este projeto não está mais disponível.',
        comment_not_found:'Este comentário não está mais disponível.',
        reply_not_found:'Esta resposta não está mais disponível.',
        invalid_mention_target:'Uma das pessoas mencionadas não possui acesso a este projeto.',
        mention_validation_denied:'Não foi possível validar as menções.',
        official_reply_already_exists:'Este comentário já recebeu uma resposta oficial.',
        mention_addition_requires_new_comment:'Novas menções devem ser feitas em um novo comentário ou resposta.',
        text_too_long:'O texto excede o limite permitido.',
        text_required:'Digite um texto antes de enviar.'
      };
      const error=new Error(messages[code]||'Não foi possível concluir a ação.');
      error.code=code;error.status=response.status;throw error;
    }
    return data;
  }

  async function loadProfiles(){
    if(profilesPromise)return profilesPromise;
    profilesPromise=(async()=>{
      const c=await waitClient();
      const {data,error}=await c.rpc('nexlab_list_profiles_visible_v26311');
      if(error)throw error;
      const rows=Array.isArray(data)?data:[];
      const map=new Map();
      for(const row of rows){if(row?.id)map.set(String(row.id),row);}
      return map;
    })().catch(error=>{profilesPromise=null;console.warn('NEXLAB project comments profiles',error);return new Map();});
    return profilesPromise;
  }

  async function loadAccess(state){
    if(state.accessLoading)return state.accessLoading;
    if(state.accessAttempted)return state.access;
    state.accessAttempted=true;
    state.accessLoading=(async()=>{
      const c=await waitClient();
      const [{data,error},profiles,current]=await Promise.all([
        c.rpc('nexlab_get_communication_access_v1',{p_scope:'project',p_scope_id:state.projectId}),
        loadProfiles(),
        session()
      ]);
      if(error)throw error;
      state.access=Array.isArray(data)?data[0]:data;
      state.profiles=profiles;
      state.currentUserId=String(current.user?.id||'');
      syncNavigation(state);
      return state.access;
    })().catch(error=>{
      state.accessError=error;
      console.error('NEXLAB project comments access',error);
      syncNavigation(state);
      return null;
    }).finally(()=>{state.accessLoading=null;});
    return state.accessLoading;
  }

  function profile(state,id){return state.profiles?.get?.(String(id))||null;}
  function profileName(state,id){return profile(state,id)?.nome||'Usuário';}

  function node(tag,className,text){
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(text!=null)el.textContent=String(text);
    return el;
  }

  function iconText(text,label){const span=node('span','nexlab-project-comment-icon-v054',text);span.setAttribute('aria-hidden','true');if(label)span.title=label;return span;}

  function setInlineMessage(state,message,type='info'){
    const box=state.commentsPanel?.querySelector('.nexlab-project-comments-message-v054');
    if(!box)return;
    box.hidden=!message;
    box.className=`nexlab-project-comments-message-v054 is-${type}`;
    box.textContent=message||'';
  }

  function buildTabs(state){
    const nav=node('nav','nexlab-project-tabs-v054');
    nav.setAttribute('aria-label','Áreas do projeto');
    nav.setAttribute('role','tablist');
    const tabs=[
      ['overview','Visão geral'],
      ['tasks','Tarefas'],
      ['team','Equipe'],
      ['links','Links e anexos']
    ];
    for(const [key,label] of tabs){
      const button=node('button','nexlab-project-tab-v054',label);
      button.type='button';button.dataset.projectTab=key;button.setAttribute('role','tab');button.setAttribute('aria-selected','false');
      button.addEventListener('click',()=>activateTab(state,key));
      nav.appendChild(button);
    }
    return nav;
  }

  function buildCommentsPanel(state){
    const section=node('details','nexlab-project-comments-v054');
    section.hidden=false;
    section.open=!window.matchMedia('(max-width:767px)').matches;
    section.setAttribute('aria-label','Comentários do projeto');
    const summary=node('summary','nexlab-project-comments-toggle-v02682');
    summary.append(node('span','','Comentários'),node('span','nexlab-project-comments-count-v02682',''));
    section.appendChild(summary);
    section.addEventListener('toggle',()=>{if(section.open)void ensureCommentsReady(state);});

    const head=node('div','nexlab-project-comments-head-v054');
    const titleWrap=node('div');
    titleWrap.append(node('h3','', 'Comentários'),node('p','', 'Discussões registradas no contexto deste projeto.'));
    const refresh=node('button','nexlab-project-comments-refresh-v054','Atualizar');
    refresh.type='button';refresh.addEventListener('click',()=>loadComments(state,{force:true}));
    head.append(titleWrap,refresh);

    const message=node('div','nexlab-project-comments-message-v054');message.hidden=true;message.setAttribute('role','status');
    const older=node('button','nexlab-project-comments-older-v054','Carregar comentários anteriores');older.type='button';older.hidden=true;older.addEventListener('click',()=>loadOlder(state));
    const list=node('div','nexlab-project-comments-list-v054');list.setAttribute('aria-live','polite');
    const composer=node('div','nexlab-project-comments-composer-slot-v054');

    section.append(head,message,older,list,composer);
    return section;
  }

  function classifyBody(state){
    const body=state.panel.querySelector(BODY_SELECTOR);
    state.body=body||null;
    if(!body)return;
    for(const child of [...body.children]){
      if(child.classList.contains('nexlab-project-tab-empty-v054'))continue;
      let group='overview';
      if(child.classList.contains('project-tasks-v2690')||child.classList.contains('project-details-tasks-pane-v02667'))group='tasks';
      else if(child.classList.contains('project-team-pane-v02682'))group='team';
      else if(child.classList.contains('project-external-links-v02682')||child.classList.contains('project-links-v2690'))group='links';
      else{
        const heading=clean(child.querySelector?.('h3')?.textContent,120).toLocaleLowerCase('pt-BR');
        if(heading.includes('equipe participante')||heading.includes('agenda da equipe'))group='team';
      }
      child.dataset.nexlabProjectGroup=group;
    }
    let emptyTeam=body.querySelector('.nexlab-project-tab-empty-v054[data-for="team"]');
    if(!emptyTeam){emptyTeam=node('div','nexlab-project-tab-empty-v054');emptyTeam.dataset.for='team';emptyTeam.append(node('strong','', 'Nenhuma equipe vinculada'),node('p','', 'Este projeto não possui informações de equipe para exibir.'));body.appendChild(emptyTeam);}
    let emptyTasks=body.querySelector('.nexlab-project-tab-empty-v054[data-for="tasks"]');
    if(!emptyTasks){emptyTasks=node('div','nexlab-project-tab-empty-v054');emptyTasks.dataset.for='tasks';emptyTasks.append(node('strong','', 'Nenhuma tarefa disponível'),node('p','', 'Não há subtarefas disponíveis neste projeto.'));body.appendChild(emptyTasks);}
  }

  function syncNavigation(state){
    if(!state.panel?.isConnected)return;
    const nav=state.panel.querySelector('.nexlab-project-tabs-v054');
    if(!nav)return;
    const commentsButton=nav.querySelector('[data-project-tab="comments"]');
    if(commentsButton){
      const permitted=state.access?.can_view_comments!==false;
      commentsButton.hidden=!permitted;
      commentsButton.disabled=!!state.accessError;
    }
    state.panel.classList.toggle('nexlab-project-comments-disabled-v054', state.access?.can_view_comments===false || !!state.accessError);
    for(const button of nav.querySelectorAll('[data-project-tab]')){
      const active=button.dataset.projectTab===state.activeTab;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-selected',String(active));
    }
  }

  function applyTab(state){
    classifyBody(state);
    syncNavigation(state);
    const body=state.body;
    const comments=state.commentsPanel;
    const footer=state.panel.querySelector(FOOTER_SELECTOR);
    state.panel.dataset.nexlabProjectActiveTab=state.activeTab;
    if(body)body.dataset.nexlabProjectActiveTab=state.activeTab;
    if(comments){
      const canView=state.access?.can_view_comments!==false && !state.accessError;
      const primary=state.panel.querySelector('.project-overview-primary');
      if(primary&&comments.parentElement!==primary)primary.appendChild(comments);
      comments.hidden=!canView||state.activeTab!=='overview';
      if(canView&&comments.open&&state.activeTab==='overview') void ensureCommentsReady(state);
    }
    if(body){
      body.hidden=false;
      body.style.gridTemplateColumns='minmax(0,1fr)';
      body.style.columnGap='0';
      body.style.rowGap='.75rem';
      body.style.alignContent='start';
      if(state.activeTab==='tasks'){
        body.style.display='block';
      }else if(state.activeTab==='team'){
        body.style.display='block';
      }else{
        body.style.display='grid';
      }
      const groups=[...body.children].filter(el=>el.dataset.nexlabProjectGroup);
      const hasTarget=groups.some(el=>el.dataset.nexlabProjectGroup===state.activeTab);
      for(const child of [...body.children]){
        if(child.classList.contains('nexlab-project-tab-empty-v054')){
          child.hidden=child.dataset.for!==state.activeTab||hasTarget;
          continue;
        }
        if(state.activeTab!=='tasks' && child.classList.contains('project-details-tasks-pane-v02667')){
          child.hidden=true;
          continue;
        }
        child.hidden=child.dataset.nexlabProjectGroup!==state.activeTab;
      }
    }
    if(footer){footer.hidden=false;delete footer.dataset.nexlabCommentsHidden;}
  }

  function activateTab(state,key){
    if(!['overview','tasks','team','links'].includes(key))key='overview';
    state.activeTab=key;
    applyTab(state);
  }

  async function maybeOpenFromNotification(state){
    if(state.notificationChecked)return;
    state.notificationChecked=true;
    let notificationId='';
    try{notificationId=new URL(location.href).searchParams.get('notification')||'';}catch{}
    if(!isUuid(notificationId)){
      try{
        const stored=JSON.parse(sessionStorage.getItem('nexlabNotificationTarget')||'null');
        notificationId=String(stored?.notificationId||stored?.notification_id||'');
      }catch{}
    }
    if(!isUuid(notificationId))return;
    try{
      const c=await waitClient();
      const {data,error}=await c.from('notifications').select('id,entity_id,metadata').eq('id',notificationId).maybeSingle();
      if(error||!data)return;
      if(String(data.entity_id||'')!==state.projectId)return;
      if(data.metadata?.open_section==='comments'){
        state.targetContentId=String(data.metadata?.communication_content_id||'');
        activateTab(state,'overview');
        state.commentsPanel.open=true;
        void ensureCommentsReady(state);
        requestAnimationFrame(()=>state.commentsPanel?.scrollIntoView?.({block:'nearest',behavior:'smooth'}));
      }
    }catch{}
  }

  async function ensureCommentsReady(state){
    await loadAccess(state);
    if(state.access?.can_view_comments===false){
      setInlineMessage(state,'Você não possui acesso aos comentários deste projeto.','err');
      return;
    }
    renderComposer(state);
    if(!state.loaded&&!state.loading)await loadComments(state);
    await maybeOpenFromNotification(state);
  }

  async function loadComments(state,{force=false}={}){
    if(state.loading)return;
    state.loading=true;
    const list=state.commentsPanel.querySelector('.nexlab-project-comments-list-v054');
    const refresh=state.commentsPanel.querySelector('.nexlab-project-comments-refresh-v054');
    refresh.disabled=true;refresh.textContent='Atualizando...';
    if(!state.loaded||force){list.classList.add('is-loading');setInlineMessage(state,'Carregando comentários...','info');}
    try{
      const data=await api(`/v1/projects/${encodeURIComponent(state.projectId)}/comments?limit=${PAGE_SIZE}`);
      state.comments=Array.isArray(data?.comments)?data.comments:[];
      state.nextCursor=data?.next_cursor||null;
      state.loaded=true;
      setInlineMessage(state,'','info');
      renderComments(state);
      if(state.targetContentId)highlightTarget(state,state.targetContentId);
    }catch(error){
      console.error('NEXLAB project comments load',error);
      setInlineMessage(state,error.message||'Não foi possível carregar os comentários.','err');
    }finally{
      state.loading=false;list.classList.remove('is-loading');refresh.disabled=false;refresh.textContent='Atualizar';
      syncOlderButton(state);
    }
  }

  async function loadOlder(state){
    if(state.loading||!state.nextCursor)return;
    state.loading=true;const older=state.commentsPanel.querySelector('.nexlab-project-comments-older-v054');older.disabled=true;older.textContent='Carregando...';
    try{
      const data=await api(`/v1/projects/${encodeURIComponent(state.projectId)}/comments?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(state.nextCursor)}`);
      const rows=Array.isArray(data?.comments)?data.comments:[];
      const known=new Set(state.comments.map(row=>String(row.id)));
      state.comments=[...rows.filter(row=>!known.has(String(row.id))),...state.comments];
      state.nextCursor=data?.next_cursor||null;
      renderComments(state);
    }catch(error){setInlineMessage(state,error.message||'Não foi possível carregar comentários anteriores.','err');}
    finally{state.loading=false;older.disabled=false;older.textContent='Carregar comentários anteriores';syncOlderButton(state);}
  }

  function syncOlderButton(state){
    const older=state.commentsPanel?.querySelector('.nexlab-project-comments-older-v054');
    if(older)older.hidden=!state.nextCursor;
  }

  function appendTextWithMentions(container,text){
    const source=String(text||'');
    const regex=/@[\p{L}\p{N}_.-]+/gu;
    let index=0,match;
    while((match=regex.exec(source))){
      if(match.index>index)container.appendChild(document.createTextNode(source.slice(index,match.index)));
      container.appendChild(node('span','nexlab-project-inline-mention-v054',match[0]));
      index=match.index+match[0].length;
    }
    if(index<source.length)container.appendChild(document.createTextNode(source.slice(index)));
  }

  function mentionChips(state,ids,{removable=false,onRemove=null}={}){
    const wrap=node('div','nexlab-project-mention-chips-v054');
    for(const id of ids||[]){
      const item=node('span','nexlab-project-mention-chip-v054');
      item.append(iconText('@'),document.createTextNode(profileName(state,id)));
      if(removable){
        const remove=node('button','','×');remove.type='button';remove.setAttribute('aria-label',`Remover menção a ${profileName(state,id)}`);remove.addEventListener('click',()=>onRemove?.(String(id)));item.appendChild(remove);
      }
      wrap.appendChild(item);
    }
    return wrap;
  }

  function renderComments(state){
    const list=state.commentsPanel.querySelector('.nexlab-project-comments-list-v054');
    const count=state.commentsPanel.querySelector('.nexlab-project-comments-count-v02682');
    if(count)count.textContent=String(state.comments.length);
    renderComposer(state);
    list.replaceChildren();
    if(!state.comments.length){
      const empty=node('div','nexlab-project-comments-empty-v054');empty.append(iconText('💬'),node('strong','', 'Ainda não há comentários neste projeto.'),node('p','', state.access?.can_comment?'Seja o primeiro a comentar e compartilhar informações.':'Ainda não há discussões registradas neste projeto.'));
      if(state.access?.can_comment){const add=node('button','project-design-primary','Adicionar comentário');add.type='button';add.addEventListener('click',()=>{state.composing=true;renderComposer(state);state.commentsPanel.querySelector('.nexlab-project-composer-v054 textarea')?.focus();});empty.appendChild(add);}
      list.appendChild(empty);syncOlderButton(state);return;
    }
    for(const comment of state.comments)list.appendChild(renderCommentCard(state,comment));
    syncOlderButton(state);
  }

  function renderCommentCard(state,comment){
    const card=node('article','nexlab-project-comment-card-v054');card.dataset.commentId=String(comment.id||'');
    const author=profile(state,comment.author_id);
    const top=node('header','nexlab-project-comment-card-head-v054');
    const avatar=node('span','nexlab-project-comment-avatar-v054',initials(author?.nome));
    const meta=node('div','nexlab-project-comment-meta-v054');
    meta.append(node('strong','',author?.nome||'Usuário'),node('small','',`${roleLabel(author?.role)} • ${formatDate(comment.created_at)}${comment.edited_at?' • editado':''}`));
    const actions=node('div','nexlab-project-comment-actions-v054');
    const own=String(comment.author_id||'')===state.currentUserId;
    if(own){actions.append(actionButton('Editar',()=>startEditComment(state,comment,card)));}
    if(own||state.access?.can_admin_delete_comment){actions.append(actionButton('Excluir',()=>deleteComment(state,comment),true));}
    top.append(avatar,meta,actions);

    const body=node('p','nexlab-project-comment-text-v054');appendTextWithMentions(body,comment.comment);
    card.append(top,body);
    if(comment.mentions?.length)card.appendChild(mentionChips(state,comment.mentions));

    const replySlot=node('div','nexlab-project-comment-reply-slot-v054');
    if(comment.reply)replySlot.appendChild(renderReply(state,comment,comment.reply));
    else if(state.access?.can_reply_comment){
      const replyButton=node('button','nexlab-project-official-reply-trigger-v054','Responder oficialmente');replyButton.type='button';replyButton.addEventListener('click',()=>openReplyComposer(state,comment,replySlot));replySlot.appendChild(replyButton);
    }
    card.appendChild(replySlot);
    return card;
  }

  function renderReply(state,comment,reply){
    const box=node('section','nexlab-project-official-reply-v054');box.dataset.replyId=String(reply.id||'');
    const label=node('div','nexlab-project-official-label-v054');label.append(iconText('✓'),node('strong','', 'Resposta oficial'));
    const author=profile(state,reply.author_id);
    const meta=node('div','nexlab-project-official-meta-v054');meta.append(node('span','',author?.nome||'Responsável do projeto'),node('small','',`${formatDate(reply.created_at)}${reply.edited_at?' • editada':''}`));
    const text=node('p','nexlab-project-comment-text-v054');appendTextWithMentions(text,reply.reply);
    const actions=node('div','nexlab-project-comment-actions-v054');
    const own=String(reply.author_id||'')===state.currentUserId;
    if(own)actions.append(actionButton('Editar',()=>startEditReply(state,comment,reply,box)));
    if(own||state.access?.can_admin_delete_comment)actions.append(actionButton('Excluir',()=>deleteReply(state,comment,reply),true));
    box.append(label,meta,text);
    if(reply.mentions?.length)box.appendChild(mentionChips(state,reply.mentions));
    if(actions.childElementCount)box.appendChild(actions);
    return box;
  }

  function actionButton(label,handler,danger=false){
    const button=node('button','nexlab-project-comment-action-v054'+(danger?' is-danger':''),label);button.type='button';button.addEventListener('click',handler);return button;
  }

  function buildEditor(state,{text,mentionIds,onSave,onCancel,saveLabel='Salvar'}){
    const wrap=node('div','nexlab-project-comment-editor-v054');
    const textarea=node('textarea','');textarea.rows=4;textarea.maxLength=4000;textarea.value=String(text||'');textarea.setAttribute('aria-label','Editar texto');
    const selected=new Set((mentionIds||[]).map(String));
    const chipSlot=node('div');
    const refreshChips=()=>{chipSlot.replaceChildren();if(selected.size)chipSlot.appendChild(mentionChips(state,[...selected],{removable:true,onRemove:id=>{selected.delete(id);refreshChips();}}));};refreshChips();
    const note=node('p','nexlab-project-comment-edit-note-v054','Durante a edição, você pode remover menções existentes. Para mencionar uma nova pessoa, envie um novo comentário ou resposta.');
    const buttons=node('div','nexlab-project-comment-editor-actions-v054');
    const cancel=node('button','','Cancelar');cancel.type='button';cancel.addEventListener('click',onCancel);
    const save=node('button','is-primary',saveLabel);save.type='button';save.addEventListener('click',async()=>{
      const value=textarea.value.trim();if(!value)return;
      textarea.disabled=cancel.disabled=save.disabled=true;save.textContent='Salvando...';
      try{await onSave(value,[...selected]);}
      catch(error){setInlineMessage(state,error.message||'Não foi possível salvar a alteração.','err');textarea.disabled=cancel.disabled=save.disabled=false;save.textContent=saveLabel;}
    });
    buttons.append(cancel,save);wrap.append(textarea,chipSlot,note,buttons);setTimeout(()=>textarea.focus(),0);return wrap;
  }

  function startEditComment(state,comment,card){
    const body=card.querySelector('.nexlab-project-comment-text-v054');if(!body)return;
    const original=[...card.children];
    const editor=buildEditor(state,{text:comment.comment,mentionIds:comment.mentions,onCancel:()=>renderComments(state),onSave:async(text,mentions)=>{
      const data=await api(`/v1/comments/${encodeURIComponent(comment.id)}`,{method:'PATCH',body:JSON.stringify({comment:text,mentions})});
      Object.assign(comment,data.comment||{comment:text,mentions,edited_at:new Date().toISOString()});renderComments(state);setInlineMessage(state,'Comentário atualizado.','ok');
    }});
    body.replaceWith(editor);
  }

  function startEditReply(state,comment,reply,box){
    const textNode=box.querySelector('.nexlab-project-comment-text-v054');if(!textNode)return;
    const editor=buildEditor(state,{text:reply.reply,mentionIds:reply.mentions,onCancel:()=>renderComments(state),onSave:async(text,mentions)=>{
      const data=await api(`/v1/replies/${encodeURIComponent(reply.id)}`,{method:'PATCH',body:JSON.stringify({reply:text,mentions})});
      Object.assign(reply,data.reply||{reply:text,mentions,edited_at:new Date().toISOString()});renderComments(state);setInlineMessage(state,'Resposta oficial atualizada.','ok');
    }});
    textNode.replaceWith(editor);
  }

  async function askConfirm(message){
    if(typeof globalThis.nexlabConfirm==='function')return !!(await globalThis.nexlabConfirm(message));
    return window.confirm(message);
  }

  async function deleteComment(state,comment){
    if(!await askConfirm('Excluir este comentário? Esta ação não pode ser desfeita.'))return;
    try{
      await api(`/v1/comments/${encodeURIComponent(comment.id)}`,{method:'DELETE'});
      state.comments=state.comments.filter(row=>String(row.id)!==String(comment.id));renderComments(state);setInlineMessage(state,'Comentário excluído.','ok');
    }catch(error){setInlineMessage(state,error.message||'Não foi possível excluir o comentário.','err');}
  }

  async function deleteReply(state,comment,reply){
    if(!await askConfirm('Excluir esta resposta oficial? Esta ação não pode ser desfeita.'))return;
    try{
      await api(`/v1/replies/${encodeURIComponent(reply.id)}`,{method:'DELETE'});
      comment.reply=null;renderComments(state);setInlineMessage(state,'Resposta oficial excluída.','ok');
    }catch(error){setInlineMessage(state,error.message||'Não foi possível excluir a resposta.','err');}
  }

  function openReplyComposer(state,comment,slot){
    slot.replaceChildren();
    const composer=buildComposer(state,{placeholder:'Escreva a resposta oficial...',submitLabel:'Publicar resposta',onCancel:()=>renderComments(state),onSubmit:async(text,mentions)=>{
      const data=await api(`/v1/comments/${encodeURIComponent(comment.id)}/reply`,{method:'POST',body:JSON.stringify({reply:text,mentions})});
      comment.reply=data.reply;renderComments(state);setInlineMessage(state,'Resposta oficial publicada.','ok');
    }});
    slot.appendChild(composer);
  }

  function buildComposer(state,{placeholder='Escreva um comentário...',submitLabel='Comentar',onSubmit,onCancel=null}){
    const wrap=node('div','nexlab-project-composer-v054');
    const textarea=node('textarea','');textarea.rows=3;textarea.maxLength=4000;textarea.placeholder=placeholder;textarea.setAttribute('aria-label',placeholder);
    const selected=new Set();
    const chips=node('div','nexlab-project-composer-chips-v054');
    const suggestions=node('div','nexlab-project-mention-suggestions-v054');suggestions.hidden=true;
    const counter=node('span','nexlab-project-composer-counter-v054','0/4000');
    const actions=node('div','nexlab-project-composer-actions-v054');
    if(onCancel){const cancel=node('button','is-secondary','Cancelar');cancel.type='button';cancel.addEventListener('click',onCancel);actions.appendChild(cancel);}
    const submit=node('button','is-primary',submitLabel);submit.type='button';actions.appendChild(submit);

    const refreshChips=()=>{chips.replaceChildren();if(selected.size)chips.appendChild(mentionChips(state,[...selected],{removable:true,onRemove:id=>{selected.delete(id);refreshChips();}}));};
    const hideSuggestions=()=>{suggestions.hidden=true;suggestions.replaceChildren();};
    const suggestionQuery=()=>{
      const before=textarea.value.slice(0,textarea.selectionStart??textarea.value.length);
      const match=before.match(/(?:^|\s)@([^\s@]{0,40})$/u);return match?{query:match[1],start:before.length-match[1].length-1,end:before.length}:null;
    };
    const showSuggestions=()=>{
      const info=suggestionQuery();if(!info){hideSuggestions();return;}
      const q=info.query.toLocaleLowerCase('pt-BR');
      const rows=[...(state.profiles?.values?.()||[])].filter(row=>row?.id&&String(row.id)!==state.currentUserId&&false!==row.ativo&&clean(row.nome,100).toLocaleLowerCase('pt-BR').includes(q)).slice(0,6);
      suggestions.replaceChildren();
      if(!rows.length){suggestions.appendChild(node('p','', 'Nenhuma pessoa encontrada.'));suggestions.hidden=false;return;}
      for(const row of rows){
        const button=node('button','',row.nome||'Usuário');button.type='button';button.appendChild(node('small','',roleLabel(row.role)));button.addEventListener('click',()=>{
          const token='@'+clean(row.nome,80).split(/\s+/)[0];
          const value=textarea.value;textarea.value=value.slice(0,info.start)+token+' '+value.slice(info.end);selected.add(String(row.id));refreshChips();hideSuggestions();textarea.focus();textarea.setSelectionRange(info.start+token.length+1,info.start+token.length+1);counter.textContent=`${textarea.value.length}/4000`;
        });suggestions.appendChild(button);
      }
      suggestions.hidden=false;
    };
    textarea.addEventListener('input',()=>{counter.textContent=`${textarea.value.length}/4000`;if(!textarea.value.includes('@')&&selected.size){selected.clear();refreshChips();}showSuggestions();});
    textarea.addEventListener('keyup',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key))showSuggestions();});
    textarea.addEventListener('blur',()=>setTimeout(hideSuggestions,160));

    submit.addEventListener('click',async()=>{
      const text=textarea.value.trim();if(!text){textarea.focus();return;}
      textarea.disabled=submit.disabled=true;for(const button of actions.querySelectorAll('button'))button.disabled=true;submit.textContent='Enviando...';
      try{await onSubmit(text,[...selected]);textarea.value='';selected.clear();refreshChips();counter.textContent='0/4000';}
      catch(error){setInlineMessage(state,error.message||'Não foi possível enviar.','err');textarea.focus();}
      finally{textarea.disabled=false;for(const button of actions.querySelectorAll('button'))button.disabled=false;submit.textContent=submitLabel;}
    });

    const inputWrap=node('div','nexlab-project-composer-input-v054');inputWrap.append(textarea,suggestions);
    const bottom=node('div','nexlab-project-composer-bottom-v054');bottom.append(counter,actions);
    wrap.append(inputWrap,chips,bottom);
    return wrap;
  }

  function renderComposer(state){
    const slot=state.commentsPanel.querySelector('.nexlab-project-comments-composer-slot-v054');if(!slot)return;
    slot.hidden=state.loaded&&!state.comments.length&&!state.composing;
    const key=state.accessError?'error':state.access?.can_comment?'write':'read';
    if(slot.firstChild&&slot.dataset.composerAccess===key)return;
    slot.dataset.composerAccess=key;slot.replaceChildren();
    if(state.accessError){slot.appendChild(node('p','nexlab-project-comments-readonly-v054','Não foi possível verificar sua permissão para comentar.'));return;}
    if(!state.access?.can_comment){slot.appendChild(node('p','nexlab-project-comments-readonly-v054','Você pode acompanhar esta discussão, mas seu perfil não possui permissão para comentar neste projeto.'));return;}
    const composer=buildComposer(state,{onSubmit:async(text,mentions)=>{
      const data=await api(`/v1/projects/${encodeURIComponent(state.projectId)}/comments`,{method:'POST',body:JSON.stringify({comment:text,mentions})});
      if(data?.comment){state.comments.push(data.comment);renderComments(state);setInlineMessage(state,'Comentário publicado.','ok');requestAnimationFrame(()=>state.commentsPanel.querySelector('.nexlab-project-comments-list-v054')?.lastElementChild?.scrollIntoView({block:'nearest'}));}
    }});
    slot.appendChild(composer);
  }

  function highlightTarget(state,id){
    if(!id)return;
    const target=state.commentsPanel.querySelector(`[data-comment-id="${CSS.escape(id)}"],[data-reply-id="${CSS.escape(id)}"]`);
    if(!target)return;
    target.classList.add('is-target');target.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>target.classList.remove('is-target'),3200);state.targetContentId='';
  }

  function createState(panel,projectId){
    panel.classList.add('nexlab-project-layout-v054');
    const state={panel,projectId,activeTab:'overview',comments:[],nextCursor:null,loaded:false,loading:false,access:null,accessError:null,accessLoading:null,profiles:new Map(),currentUserId:'',notificationChecked:false,targetContentId:'',body:null,commentsPanel:null};
    const header=panel.querySelector(HEADER_SELECTOR);
    const nav=buildTabs(state);
    const comments=buildCommentsPanel(state);state.commentsPanel=comments;
    if(header){header.insertAdjacentElement('afterend',nav);panel.insertBefore(comments,panel.querySelector(FOOTER_SELECTOR));}else{panel.appendChild(comments);panel.prepend(nav);}
    states.set(panel,state);stateByProjectId.set(projectId,state);
    void loadAccess(state).then(()=>{renderComposer(state);void maybeOpenFromNotification(state);});
    applyTab(state);
    return state;
  }

  function rebindState(panel,state){
    panel.classList.add('nexlab-project-layout-v054');
    state.panel=panel;state.body=panel.querySelector(BODY_SELECTOR);
    panel.querySelector('.nexlab-project-tabs-v054')?.remove();panel.querySelector('.nexlab-project-comments-v054')?.remove();
    const header=panel.querySelector(HEADER_SELECTOR);const nav=buildTabs(state);const comments=buildCommentsPanel(state);state.commentsPanel=comments;
    if(header){header.insertAdjacentElement('afterend',nav);panel.insertBefore(comments,panel.querySelector(FOOTER_SELECTOR));}else{panel.appendChild(comments);panel.prepend(nav);}
    states.set(panel,state);
    if(state.loaded)renderComments(state);renderComposer(state);syncOlderButton(state);applyTab(state);
    if(state.activeTab==='comments'&&!state.loaded)void loadComments(state,{force:true});
    return state;
  }

  function ensurePanel(panel){
    if(!(panel instanceof HTMLElement))return;
    panel.classList.add('nexlab-project-layout-v054');
    let projectId=String(panel.dataset.nexlabProjectId||'');
    if(!isUuid(projectId)){
      const source=panel.closest('.project-details-overlay-v02667')?.dataset?.nexlabProjectId||'';
      if(isUuid(source))projectId=source;
    }
    if(!isUuid(projectId))return;
    let state=states.get(panel);
    if(!state||state.projectId!==projectId){
      panel.querySelector('.nexlab-project-tabs-v054')?.remove();panel.querySelector('.nexlab-project-comments-v054')?.remove();
      const cached=stateByProjectId.get(projectId);
      state=cached&&!cached.panel?.isConnected?rebindState(panel,cached):createState(panel,projectId);
    }else{
      if(!panel.querySelector('.nexlab-project-tabs-v054')){
        const header=panel.querySelector(HEADER_SELECTOR);const nav=buildTabs(state);header?.insertAdjacentElement('afterend',nav);
      }
      if(!panel.querySelector('.nexlab-project-comments-v054')){
        const nav=panel.querySelector('.nexlab-project-tabs-v054');const comments=buildCommentsPanel(state);state.commentsPanel=comments;panel.insertBefore(comments,panel.querySelector(FOOTER_SELECTOR));if(state.loaded)renderComments(state);renderComposer(state);syncOlderButton(state);
      }
      applyTab(state);
    }
  }

  function scan(){observerScheduled=false;document.querySelectorAll(PANEL_SELECTOR).forEach(ensurePanel);}
  function scheduleScan(){if(observerScheduled)return;observerScheduled=true;requestAnimationFrame(scan);}

  const observer=new MutationObserver(scheduleScan);
  function start(){observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-nexlab-project-id']});scheduleScan();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

  globalThis.addEventListener('nexlab:session-reset',()=>{profilesPromise=null;stateByProjectId.clear();});
  globalThis.__NEXLAB_PROJECT_COMMENTS__=Object.freeze({
    version:BUILD.version,revision:REVISION,workerUrl:workerUrl(),
    refreshCurrent(){const panel=document.querySelector(PANEL_SELECTOR);const state=panel&&states.get(panel);if(state)return loadComments(state,{force:true});return Promise.resolve(null);},
    openCurrent(){const panel=document.querySelector(PANEL_SELECTOR);const state=panel&&states.get(panel);if(state){activateTab(state,'overview');state.commentsPanel.open=true;void ensureCommentsReady(state);state.commentsPanel?.scrollIntoView?.({block:'nearest',behavior:'smooth'});return true;}return false;},
    snapshot(){const panel=document.querySelector(PANEL_SELECTOR);const state=panel&&states.get(panel);return state?Object.freeze({projectId:state.projectId,activeTab:state.activeTab,loaded:state.loaded,comments:state.comments.length,nextCursor:!!state.nextCursor,canView:state.access?.can_view_comments??null,canComment:state.access?.can_comment??null,canReply:state.access?.can_reply_comment??null}):null;}
  });
})();
