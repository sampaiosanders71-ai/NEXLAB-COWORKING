/* NEXLAB Beta 0.26.82 — área de equipes e tarefas, sem mensageria. */
(function(){
  'use strict';
  const BUILD=globalThis.__NEXLAB_BUILD_IDENTITY__||Object.freeze({version:'0.26.82',revision:'beta-0-26-82-google-calendar-integracao'});
  const REVISION=BUILD.revision;
  if(globalThis.__NEXLAB_TEAM_WORKSPACE__?.revision===REVISION)return;
  const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const PANEL_SELECTOR='.team-details-v2680[data-nexlab-team-id]';
  const CONTENT_SELECTOR='.team-details-v2680__content';
  const HEADER_SELECTOR='.team-details-v2680__header';
  let states=new WeakMap();
  const stateByTeamId=new Map();
  let observerScheduled=false;
  let pendingNotification=null;
  let notificationPromise=null;
  function client(){return globalThis.__NEXLAB_SUPABASE__||null;}

  function isUuid(value){return UUID_RE.test(String(value||''));}

  function clean(value,max=4000){return String(value??'').trim().slice(0,max);}

  function initials(name){return clean(name,80).split(/\s+/).filter(Boolean).slice(0,2).map(v=>v[0]?.toUpperCase()||'').join('')||'U';}

  function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=String(text);return el;}

  async function waitClient(timeout=12000){
    const started=Date.now();
    while(Date.now()-started<timeout){const c=client();if(c?.auth)return c;await new Promise(resolve=>setTimeout(resolve,80));}
    throw new Error('Cliente do NEXLAB não ficou disponível.');
  }
  const TEAM_WORKSPACE_UI_ICONS_V02682=Object.freeze({
    overview:[['rect',{x:'3',y:'3',width:'7',height:'7',rx:'1'}],['rect',{x:'14',y:'3',width:'7',height:'7',rx:'1'}],['rect',{x:'3',y:'14',width:'7',height:'7',rx:'1'}],['rect',{x:'14',y:'14',width:'7',height:'7',rx:'1'}]],
    tasks:[['path',{d:'M9 11l3 3L22 4'}],['path',{d:'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'}]],
    links:[['path',{d:'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'}],['path',{d:'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'}]],
    users:[['path',{d:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'}],['circle',{cx:'9',cy:'7',r:'4'}],['path',{d:'M22 21v-2a4 4 0 0 0-3-3.87'}],['path',{d:'M16 3.13a4 4 0 0 1 0 7.75'}]],
    refresh:[['path',{d:'M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5'}],['path',{d:'M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5'}]],
    more:[['circle',{cx:'5',cy:'12',r:'1'}],['circle',{cx:'12',cy:'12',r:'1'}],['circle',{cx:'19',cy:'12',r:'1'}]],
    chevron:[['path',{d:'m9 18 6-6-6-6'}]],
    search:[['circle',{cx:'11',cy:'11',r:'7'}],['path',{d:'m21 21-4.35-4.35'}]],
    filter:[['polygon',{points:'22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3'}]],
    plus:[['path',{d:'M12 5v14'}],['path',{d:'M5 12h14'}]],
    clock:[['circle',{cx:'12',cy:'12',r:'9'}],['path',{d:'M12 7v5l3 2'}]],
    play:[['path',{d:'M8 5v14l11-7z'}]],
    'check-circle':[['circle',{cx:'12',cy:'12',r:'9'}],['path',{d:'m9 12 2 2 4-4'}]],
    calendar:[['rect',{x:'3',y:'4',width:'18',height:'18',rx:'2'}],['path',{d:'M16 2v4'}],['path',{d:'M8 2v4'}],['path',{d:'M3 10h18'}]],
    dot:[['circle',{cx:'12',cy:'12',r:'2.25'}]]
  });
  function teamWorkspaceIcon(key,size=16){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','2');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('width',String(size));svg.setAttribute('height',String(size));svg.setAttribute('aria-hidden','true');for(const [tag,attrs] of TEAM_WORKSPACE_UI_ICONS_V02682[key]||[]){const child=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [name,value] of Object.entries(attrs))child.setAttribute(name,String(value));svg.appendChild(child);}return svg;}

  async function loadTaskIdentity(state){
    if(state.identityLoaded)return state.currentUserId;
    if(state.identityLoading)return state.identityLoading;
    state.identityLoading=(async()=>{
      const current=await waitClient();
      const result=await current.auth.getSession();
      if(result?.error)throw result.error;
      state.currentUserId=String(result?.data?.session?.user?.id||'');
      state.identityLoaded=true;
      return state.currentUserId;
    })().catch(error=>{console.warn('NEXLAB team task identity',error);return '';}).finally(()=>{state.identityLoading=null;});
    return state.identityLoading;
  }
  function buildTabs(state){
    const nav=node('nav','nexlab-team-tabs-rebuilt-v02682');nav.setAttribute('aria-label','Áreas da equipe');nav.setAttribute('role','tablist');
    for(const [key,label,icon] of [['overview','Visão geral','overview'],['tasks','Tarefas','tasks'],['links','Vínculos','links']]){
      const button=node('button','nexlab-team-tab-rebuilt-v02682');button.type='button';button.dataset.teamTab=key;button.setAttribute('role','tab');button.setAttribute('aria-selected','false');button.append(teamWorkspaceIcon(icon,15),node('span','',label));button.addEventListener('click',()=>activateTab(state,key));nav.appendChild(button);
    }
    return nav;
  }
  function buildTasksPanel(state){
    const section=node('section','nexlab-team-tasks-rebuilt-v02682');section.hidden=true;section.setAttribute('aria-label','Tarefas da equipe');
    const shell=node('div','nexlab-team-tasks-shell-v02682');
    const heading=node('header','nexlab-team-tasks-heading-v02682');
    const headingCopy=node('div','nexlab-team-tasks-heading-copy-v02682');headingCopy.append(node('h3','', 'Tarefas da equipe'),node('p','', 'Acompanhe e gerencie as tarefas da equipe.'));
    heading.appendChild(headingCopy);

    const toolbar=node('div','nexlab-team-tasks-toolbar-v02682');
    const search=node('label','nexlab-team-task-search-v02682');
    search.appendChild(teamWorkspaceIcon('search',16));
    const searchInput=document.createElement('input');searchInput.type='search';searchInput.placeholder='Buscar tarefa...';searchInput.setAttribute('aria-label','Buscar tarefa');searchInput.autocomplete='off';searchInput.value=state.taskSearchTerm||'';searchInput.addEventListener('input',()=>{state.taskSearchTerm=searchInput.value||'';renderTeamTasks(state);});search.appendChild(searchInput);

    const toolbarActions=node('div','nexlab-team-task-toolbar-actions-v02682');
    const filtersWrap=node('div','nexlab-team-task-filters-wrap-v02682');
    const filters=node('button','nexlab-team-task-filter-toggle-v02682');filters.type='button';filters.setAttribute('aria-haspopup','menu');filters.setAttribute('aria-expanded',String(!!state.taskFilterPanelOpen));filters.append(teamWorkspaceIcon('filter',14),node('span','', 'Filtros'));filters.addEventListener('click',()=>{state.taskFilterPanelOpen=!state.taskFilterPanelOpen;renderTeamTasks(state);});
    const filtersPanel=node('div','nexlab-team-task-filter-panel-v02682');filtersPanel.hidden=true;filtersPanel.setAttribute('role','menu');
    const filterOptions=[['all','Todas'],['mine','Minhas'],['overdue','Atrasadas'],['scheduled','Com prazo']];
    for(const [value,label] of filterOptions){const option=node('button','nexlab-team-task-filter-option-v02682',label);option.type='button';option.setAttribute('role','menuitemradio');option.dataset.quickFilter=value;option.addEventListener('click',()=>{state.taskQuickFilter=value;state.taskFilterPanelOpen=false;renderTeamTasks(state);});filtersPanel.appendChild(option);}    
    filtersWrap.append(filters,filtersPanel);

    const create=node('button','nexlab-team-task-create-v02682');create.type='button';create.hidden=true;create.append(teamWorkspaceIcon('plus',15),node('span','', 'Nova tarefa'));create.addEventListener('click',()=>showTaskForm(state));

    toolbarActions.append(filtersWrap,create);toolbar.append(search,toolbarActions);

    const summary=node('div','nexlab-team-task-summary-v02682');
    const notice=node('div','nexlab-team-task-message-v02682');notice.hidden=true;notice.setAttribute('role','status');
    const form=node('div','nexlab-team-task-form-slot-v02682');form.hidden=true;
    const detail=node('div','nexlab-team-task-detail-slot-v02682');detail.hidden=true;
    const list=node('div','nexlab-team-task-groups-v02682');list.setAttribute('aria-live','polite');

    shell.append(heading,toolbar,summary,notice,form,detail,list);section.appendChild(shell);return section;
  }

  function buildTeamWorkspace(tasks){
    const workspace=node('div','nexlab-team-workspace-v057');workspace.hidden=true;workspace.setAttribute('aria-label','Área de trabalho da equipe');workspace.append(tasks);return workspace;
  }

  function setTaskMessage(state,message,type='info'){
    const box=state.tasksPanel?.querySelector('.nexlab-team-task-message-v02682');if(!box)return;
    box.hidden=!message;box.className=`nexlab-team-task-message-v02682 is-${type}`;box.textContent=message||'';
  }

  function formatTaskDay(value){if(!value)return 'Sem prazo';try{return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(`${String(value).slice(0,10)}T12:00:00`));}catch{return String(value);}}
  function formatTaskMoment(value){if(!value)return '';try{return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value));}catch{return '';}}
  function taskPriorityLabel(value){return ({baixa:'Baixa',normal:'Normal',alta:'Alta',urgente:'Urgente'}[String(value||'').toLowerCase()]||'Normal');}
  function normalizeTaskStatus(value){const key=String(value||'').toLowerCase();if(key==='em andamento')return 'em_andamento';if(key==='concluída')return 'concluida';return ({pendente:'pendente',em_andamento:'em_andamento',concluida:'concluida',cancelada:'cancelada'}[key]||'pendente');}
  function taskStatusLabel(value){return ({pendente:'Pendentes',em_andamento:'Em andamento',concluida:'Concluídas',cancelada:'Canceladas'}[normalizeTaskStatus(value)]||'Pendentes');}
  function taskSummaryLabel(key){return ({total:'todas as tarefas',pendente:'aguardando início',em_andamento:'em progresso',concluida:'finalizadas'}[key]||'todas as tarefas');}
  function isTaskOverdue(task){if(!task?.deadline||['concluida','cancelada'].includes(normalizeTaskStatus(task.status)))return false;const today=new Date();today.setHours(0,0,0,0);const due=new Date(`${String(task.deadline).slice(0,10)}T00:00:00`);return Number.isFinite(due.getTime())&&due<today;}
  function taskMetaLine(task){const status=normalizeTaskStatus(task?.status);const creator=clean(task?.created_by_name||task?.creator_name||task?.author_name||'Equipe',80)||'Equipe';if(status==='concluida'){const who=clean(task?.completed_by_name||task?.responsible_name||creator,80)||creator;const date=formatTaskMoment(task?.completed_at||task?.updated_at)||formatTaskDay(task?.deadline);return date?`Concluída por ${who} • Concluída em: ${date}`:`Concluída por ${who}`;}if(status==='em_andamento'){const started=formatTaskMoment(task?.started_at||task?.updated_at);return started?`Criada por ${creator} • Iniciada em: ${started}`:`Criada por ${creator}`;}if(status==='cancelada'){const canceled=formatTaskMoment(task?.updated_at);return canceled?`Criada por ${creator} • Cancelada em: ${canceled}`:`Criada por ${creator}`;}const due=task?.deadline?formatTaskDay(task.deadline):'';return due?`Criada por ${creator} • Prazo: ${due}`:`Criada por ${creator}`;}
  function taskDateBadge(task){const status=normalizeTaskStatus(task?.status);if(status==='concluida'){return {icon:'check-circle',label:formatTaskMoment(task?.completed_at)||formatTaskDay(task?.deadline)};}return {icon:'calendar',label:formatTaskDay(task?.deadline)};}
  function taskGroupTone(key){return ({pendente:'pending',em_andamento:'progress',concluida:'done',cancelada:'muted'}[normalizeTaskStatus(key)]||'pending');}
  function taskMatchesSearch(task,query){const q=clean(query||'',120).toLowerCase();if(!q)return true;const hay=[task?.title,task?.description,task?.responsible_name,task?.created_by_name,task?.creator_name,task?.author_name,taskPriorityLabel(task?.priority),taskStatusLabel(task?.status)].map(value=>String(value||'').toLowerCase()).join(' ');return hay.includes(q);}
  function taskMatchesQuickFilter(state,task){const mode=String(state.taskQuickFilter||'all');if(mode==='mine')return String(task?.responsible_id||'')===String(state.currentUserId||'');if(mode==='overdue')return isTaskOverdue(task);if(mode==='scheduled')return !!task?.deadline;return true;}
  function taskGroupCatalog(){return [{key:'pendente',label:'Pendentes'},{key:'em_andamento',label:'Em andamento'},{key:'concluida',label:'Concluídas'},{key:'cancelada',label:'Canceladas'}];}

  function taskWorkspaceReadOnly(workspace){
    if(!workspace)return false;
    return !!(workspace.read_only||workspace.team_archived||workspace.archived||workspace.team?.archived_at||workspace.team?.archived===true);
  }
  function taskStatusActionLabel(status){
    return ({pendente:'Iniciar tarefa',em_andamento:'Voltar para pendente',concluida:'Reabrir tarefa',cancelada:'Reabrir tarefa'}[normalizeTaskStatus(status)]||'Alterar status');
  }
  function taskNextStatus(status){
    return ({pendente:'em_andamento',em_andamento:'pendente',concluida:'em_andamento',cancelada:'pendente'}[normalizeTaskStatus(status)]||'pendente');
  }
  function taskDetailValue(label,value){const row=node('div','nexlab-team-task-detail-row-v02682');row.append(node('span','',label),node('strong','',value||'—'));return row;}
  function closeTaskDetail(state){const slot=state.tasksPanel?.querySelector('.nexlab-team-task-detail-slot-v02682');if(slot){slot.hidden=true;slot.replaceChildren();}state.taskDetailId='';}
  function focusTaskMenu(state,taskId){
    if(!taskId||!state.tasksPanel)return;
    const row=state.tasksPanel.querySelector(`[data-task-id="${CSS.escape(String(taskId))}"]`);
    row?.querySelector('.nexlab-team-task-row-menu-v02682 [role="menuitem"]')?.focus();
  }
  function focusTaskMenuToggle(state,taskId){
    if(!taskId||!state.tasksPanel)return;
    const row=state.tasksPanel.querySelector(`[data-task-id="${CSS.escape(String(taskId))}"]`);
    row?.querySelector('.nexlab-team-task-row-menu-toggle-v02682')?.focus();
  }
  function showTaskDetails(state,task){
    const slot=state.tasksPanel?.querySelector('.nexlab-team-task-detail-slot-v02682');if(!slot||!task)return;
    state.taskOpenMenuId='';state.taskDetailId=String(task.id||'');slot.hidden=false;slot.replaceChildren();
    const card=node('section','nexlab-team-task-detail-card-v02682');card.dataset.taskDetailId=state.taskDetailId;
    const head=node('div','nexlab-team-task-detail-head-v02682');
    const title=node('div');title.append(node('small','',taskStatusLabel(task.status)),node('h4','',task.title||'Tarefa'));
    const close=node('button','nexlab-team-task-detail-close-v02682');close.type='button';close.setAttribute('aria-label','Fechar detalhes');close.textContent='×';close.addEventListener('click',()=>closeTaskDetail(state));head.append(title,close);card.appendChild(head);
    if(task.description)card.appendChild(node('p','nexlab-team-task-detail-description-v02682',task.description));
    const grid=node('div','nexlab-team-task-detail-grid-v02682');grid.append(
      taskDetailValue('Responsável',task.responsible_name||'Não atribuído'),
      taskDetailValue('Prazo',formatTaskDay(task.deadline)),
      taskDetailValue('Prioridade',taskPriorityLabel(task.priority)),
      taskDetailValue('Situação',taskStatusLabel(task.status).replace(/s$/,''))
    );card.appendChild(grid);
    const meta=node('p','nexlab-team-task-detail-meta-v02682',taskMetaLine(task));card.appendChild(meta);
    const actions=node('div','nexlab-team-task-detail-actions-v02682');
    const readonly=taskWorkspaceReadOnly(state.taskWorkspace);
    if(task.can_edit&&!readonly){const edit=node('button','','Editar tarefa');edit.type='button';edit.addEventListener('click',()=>{closeTaskDetail(state);showTaskForm(state,task);});actions.appendChild(edit);}
    if(task.can_complete&&normalizeTaskStatus(task.status)!=='concluida'&&!readonly){const done=node('button','is-primary','Concluir');done.type='button';done.addEventListener('click',()=>{closeTaskDetail(state);completeTeamTask(state,task);});actions.appendChild(done);}
    if(task.can_delete&&!readonly){const remove=node('button','is-danger','Excluir');remove.type='button';remove.addEventListener('click',()=>{closeTaskDetail(state);deleteTeamTask(state,task);});actions.appendChild(remove);}
    if(actions.childElementCount)card.appendChild(actions);slot.appendChild(card);
    requestAnimationFrame(()=>card.scrollIntoView({behavior:'smooth',block:'nearest'}));
  }
  async function updateTeamTaskStatus(state,task,status){
    if(!task?.can_edit||taskWorkspaceReadOnly(state.taskWorkspace))return;
    try{
      setTaskMessage(state,'Atualizando situação da tarefa...','info');
      const c=await waitClient();
      const {data,error}=await c.rpc('nexlab_manage_team_task_v1',{p_team_id:state.teamId,p_action:'update',p_task_id:task.id,p_title:task.title||'Tarefa',p_description:task.description||null,p_responsible_id:task.responsible_id||null,p_deadline:task.deadline||null,p_priority:task.priority||'normal',p_status:status});
      if(error)throw error;if(!data?.ok)throw new Error('O Supabase não confirmou a mudança de situação.');
      state.taskWorkspace=data.workspace||state.taskWorkspace;state.tasksLoaded=true;state.taskOpenMenuId='';closeTaskDetail(state);renderTeamTasks(state);setTaskMessage(state,'Situação da tarefa atualizada.','ok');
      try{globalThis.__NEXLAB_PENDING_REALTIME_HUB__?.refresh?.({table:'tasks',eventType:'LOCAL_MUTATION'});globalThis.dispatchEvent(new CustomEvent('nexlab:pending-refresh'));}catch{}
    }catch(error){console.error('NEXLAB team task status',error);setTaskMessage(state,error?.message||'Não foi possível alterar a situação da tarefa.','err');}
  }

  function bindTaskRealtime(state){
    if(state.taskRealtimeUnsubscribe)return;
    const subscribe=globalThis.__NEXLAB_PENDING_REALTIME_HUB__?.subscribe;
    if(typeof subscribe!=='function')return;
    state.taskRealtimeUnsubscribe=subscribe(detail=>{
      if(detail?.table!=='team_history'||!state.tasksLoaded)return;
      if(detail.teamId&&String(detail.teamId)!==String(state.teamId))return;
      if(state.taskRealtimeTimer)clearTimeout(state.taskRealtimeTimer);
      state.taskRealtimeTimer=setTimeout(()=>{state.taskRealtimeTimer=null;void loadTeamTasks(state,{force:true});},250);
    });
  }

  async function loadTeamTasks(state,{force=false}={}){
    if(state.tasksLoading)return state.tasksLoading;
    const list=state.tasksPanel?.querySelector('.nexlab-team-task-groups-v02682');const refresh=state.tasksPanel?.querySelector('.nexlab-team-task-refresh-v02682');
    if(refresh){refresh.disabled=true;refresh.textContent='Atualizando...';}
    if(list&&(!state.tasksLoaded||force))list.classList.add('is-loading');
    setTaskMessage(state,'Carregando tarefas...','info');
    state.tasksLoading=(async()=>{
      const c=await waitClient();const {data,error}=await c.rpc('nexlab_get_team_tasks_v1',{p_team_id:state.teamId});if(error)throw error;
      if(!data?.ok)throw new Error('O Supabase não confirmou o carregamento das tarefas.');
      state.taskWorkspace=data;state.tasksLoaded=true;state.taskLoadError=null;setTaskMessage(state,'','info');renderTeamTasks(state);syncNavigation(state);return data;
    })().catch(error=>{console.error('NEXLAB team tasks load',error);state.taskLoadError=error;setTaskMessage(state,error?.message||'Não foi possível carregar as tarefas.','err');renderTeamTasks(state);return null;}).finally(()=>{
      state.tasksLoading=null;if(list)list.classList.remove('is-loading');if(refresh){refresh.disabled=false;refresh.textContent='Atualizar';}
    });
    return state.tasksLoading;
  }

  async function ensureTeamTasksReady(state){
    await loadTaskIdentity(state);
    if(!state.tasksLoaded&&!state.tasksLoading)await loadTeamTasks(state);
    if(state.targetTaskId)highlightTaskTarget(state,state.targetTaskId);
  }

  function taskField(label,input){const wrap=node('label','nexlab-team-task-field-v02682');wrap.append(node('span','',label),input);return wrap;}

  function showTaskForm(state,task=null,prefill=null){
    const permissions=state.taskWorkspace?.permissions||{};
    if(taskWorkspaceReadOnly(state.taskWorkspace)){setTaskMessage(state,'Esta equipe está em modo somente leitura.','err');return;}
    if(task&&!task.can_edit)return;
    if(!task&&!permissions.can_create){setTaskMessage(state,'Você não possui permissão para criar tarefas nesta equipe.','err');return;}
    const slot=state.tasksPanel?.querySelector('.nexlab-team-task-form-slot-v02682');if(!slot)return;
    const editing=!!task;slot.hidden=false;slot.replaceChildren();
    const form=node('form','nexlab-team-task-form-v02682');
    const formHead=node('div','nexlab-team-task-form-head-v02682');formHead.append(node('strong','',editing?'Editar tarefa':'Nova tarefa'),node('span','',editing?'Somente Líder ou Vice-Líder pode alterar os detalhes.':'Escolha um integrante da equipe como responsável.'));form.appendChild(formHead);
    const title=document.createElement('input');title.type='text';title.maxLength=180;title.required=true;title.value=task?.title||clean(prefill?.title||'',180);title.placeholder='Ex.: Preparar material da apresentação';
    const responsible=document.createElement('select');responsible.required=true;responsible.appendChild(new Option('Selecione o responsável',''));
    for(const member of state.taskWorkspace?.members||[]){const option=new Option(member.name||'Integrante',member.id);if(String(member.id)===String(task?.responsible_id||''))option.selected=true;responsible.appendChild(option);}
    const deadline=document.createElement('input');deadline.type='date';deadline.required=true;deadline.value=task?.deadline||'';
    const priority=document.createElement('select');for(const [value,label] of [['baixa','Baixa'],['normal','Normal'],['alta','Alta'],['urgente','Urgente']]){const option=new Option(label,value);if(value===(task?.priority||'normal'))option.selected=true;priority.appendChild(option);}
    const description=document.createElement('textarea');description.rows=3;description.maxLength=4000;description.value=task?.description||clean(prefill?.description||'',4000);description.placeholder='Descrição opcional';
    const grid=node('div','nexlab-team-task-form-grid-v02682');grid.append(taskField('Título',title),taskField('Responsável',responsible),taskField('Prazo',deadline),taskField('Prioridade',priority));form.append(grid,taskField('Descrição',description));
    let status=null;if(editing){status=document.createElement('select');const statusOptions=[['pendente','Pendente'],['em_andamento','Em andamento'],['cancelada','Cancelada']];if(task.can_complete||task.status==='concluida')statusOptions.splice(2,0,['concluida','Concluída']);for(const [value,label] of statusOptions){const option=new Option(label,value);if(value===(task.status||'pendente'))option.selected=true;status.appendChild(option);}form.appendChild(taskField('Status',status));}
    const actions=node('div','nexlab-team-task-form-actions-v02682');const cancel=node('button','','Cancelar');cancel.type='button';cancel.addEventListener('click',()=>{slot.hidden=true;slot.replaceChildren();});const save=node('button','is-primary',editing?'Salvar alterações':'Criar tarefa');save.type='submit';actions.append(cancel,save);form.appendChild(actions);
    form.addEventListener('submit',async event=>{
      event.preventDefault();save.disabled=true;cancel.disabled=true;save.textContent=editing?'Salvando...':'Criando...';
      try{
        const c=await waitClient();const args={p_team_id:state.teamId,p_action:editing?'update':'create',p_task_id:editing?task.id:null,p_title:title.value.trim(),p_description:description.value.trim()||null,p_responsible_id:responsible.value||null,p_deadline:deadline.value||null,p_priority:priority.value,p_status:editing?status.value:null};
        const {data,error}=await c.rpc('nexlab_manage_team_task_v1',args);if(error)throw error;if(!data?.ok)throw new Error('O Supabase não confirmou a alteração da tarefa.');
        state.taskWorkspace=data.workspace||state.taskWorkspace;state.tasksLoaded=true;slot.hidden=true;slot.replaceChildren();renderTeamTasks(state);syncNavigation(state);setTaskMessage(state,editing?'Tarefa atualizada.':'Tarefa criada.','ok');
        try{globalThis.__NEXLAB_PENDING_REALTIME_HUB__?.refresh?.({table:'tasks',eventType:'LOCAL_MUTATION'});globalThis.dispatchEvent(new CustomEvent('nexlab:pending-refresh'));}catch{}
      }catch(error){console.error('NEXLAB team task save',error);setTaskMessage(state,error?.message||'Não foi possível salvar a tarefa.','err');}
      finally{save.disabled=false;cancel.disabled=false;save.textContent=editing?'Salvar alterações':'Criar tarefa';}
    });
    slot.appendChild(form);requestAnimationFrame(()=>title.focus());
  }

  async function completeTeamTask(state,task){
    if(!task?.can_complete||taskWorkspaceReadOnly(state.taskWorkspace))return;
    try{
      const c=await waitClient();const {data,error}=await c.rpc('nexlab_manage_team_task_v1',{p_team_id:state.teamId,p_action:'complete',p_task_id:task.id,p_title:null,p_description:null,p_responsible_id:null,p_deadline:null,p_priority:null,p_status:null});if(error)throw error;if(!data?.ok)throw new Error('O Supabase não confirmou a conclusão da tarefa.');
      state.taskWorkspace=data.workspace||state.taskWorkspace;renderTeamTasks(state);setTaskMessage(state,'Tarefa concluída.','ok');try{globalThis.__NEXLAB_PENDING_REALTIME_HUB__?.refresh?.({table:'tasks',eventType:'LOCAL_MUTATION'});globalThis.dispatchEvent(new CustomEvent('nexlab:pending-refresh'));}catch{}
    }catch(error){console.error('NEXLAB team task complete',error);setTaskMessage(state,error?.message||'Não foi possível concluir a tarefa.','err');}
  }

  async function deleteTeamTask(state,task){
    if(!task?.can_delete||taskWorkspaceReadOnly(state.taskWorkspace))return;if(!confirm(`Excluir a tarefa “${task.title||'Tarefa'}”?`))return;
    try{
      const c=await waitClient();const {data,error}=await c.rpc('nexlab_manage_team_task_v1',{p_team_id:state.teamId,p_action:'delete',p_task_id:task.id,p_title:null,p_description:null,p_responsible_id:null,p_deadline:null,p_priority:null,p_status:null});if(error)throw error;if(!data?.ok)throw new Error('O Supabase não confirmou a exclusão da tarefa.');
      state.taskWorkspace=data.workspace||state.taskWorkspace;renderTeamTasks(state);setTaskMessage(state,'Tarefa excluída.','ok');try{globalThis.__NEXLAB_PENDING_REALTIME_HUB__?.refresh?.({table:'tasks',eventType:'LOCAL_MUTATION'});globalThis.dispatchEvent(new CustomEvent('nexlab:pending-refresh'));}catch{}
    }catch(error){console.error('NEXLAB team task delete',error);setTaskMessage(state,error?.message||'Não foi possível excluir a tarefa.','err');}
  }

  function renderTeamTasks(state){
    const panel=state.tasksPanel;if(!panel)return;
    const list=panel.querySelector('.nexlab-team-task-groups-v02682');
    const create=panel.querySelector('.nexlab-team-task-create-v02682');
    const summary=panel.querySelector('.nexlab-team-task-summary-v02682');
    const filterButton=panel.querySelector('.nexlab-team-task-filter-toggle-v02682');
    const filterPanel=panel.querySelector('.nexlab-team-task-filter-panel-v02682');
    if(!list||!summary)return;
    const workspace=state.taskWorkspace||{};
    const readOnly=taskWorkspaceReadOnly(workspace);
    if(create)create.hidden=!workspace.permissions?.can_create||readOnly;
    if(filterPanel){filterPanel.hidden=!state.taskFilterPanelOpen;filterPanel.querySelectorAll('[data-quick-filter]').forEach(button=>{const active=button.dataset.quickFilter===String(state.taskQuickFilter||'all');button.classList.toggle('is-active',active);button.setAttribute('aria-checked',String(active));});}
    if(filterButton){filterButton.classList.toggle('is-active',String(state.taskQuickFilter||'all')!=='all'||!!clean(state.taskSearchTerm||'',120));filterButton.setAttribute('aria-expanded',String(!!state.taskFilterPanelOpen));}

    const tasks=Array.isArray(workspace.tasks)?workspace.tasks:[];
    const normalized=tasks.map(task=>({...task,status:normalizeTaskStatus(task?.status)}));
    const counts={total:normalized.length,pendente:0,em_andamento:0,concluida:0,cancelada:0};
    normalized.forEach(task=>{counts[normalizeTaskStatus(task.status)]=(counts[normalizeTaskStatus(task.status)]||0)+1;});

    summary.replaceChildren();
    const summaryCards=[
      ['total','Total',counts.total,'todas as tarefas','dot'],
      ['pendente','Pendentes',counts.pendente,taskSummaryLabel('pendente'),'clock'],
      ['em_andamento','Em andamento',counts.em_andamento,taskSummaryLabel('em_andamento'),'play'],
      ['concluida','Concluídas',counts.concluida,taskSummaryLabel('concluida'),'check-circle']
    ];
    for(const [key,label,value,caption,icon] of summaryCards){
      const card=node('article',`nexlab-team-task-stat-card-v02682 is-${key}`);
      const iconShell=node('span','nexlab-team-task-stat-icon-v02682');iconShell.appendChild(teamWorkspaceIcon(icon,16));
      const copy=node('div','nexlab-team-task-stat-copy-v02682');copy.append(node('strong','',String(value)),node('span','',label),node('small','',caption));
      card.append(iconShell,copy);summary.appendChild(card);
    }

    list.replaceChildren();
    if(state.taskLoadError&&!state.tasksLoaded){const empty=node('div','nexlab-team-task-empty-v02682');empty.append(node('strong','', 'Não foi possível carregar as tarefas'),node('p','',clean(state.taskLoadError?.message||'Tente novamente em instantes.',180)));list.appendChild(empty);return;}
    if(readOnly){const readonly=node('div','nexlab-team-task-readonly-v02682');readonly.append(teamWorkspaceIcon('clipboard',15),node('span','', 'Equipe arquivada ou em modo somente leitura. As tarefas podem ser consultadas, mas não alteradas.'));list.appendChild(readonly);}
    if(workspace.permissions?.can_view===false){const empty=node('div','nexlab-team-task-empty-v02682');empty.append(node('strong','', 'Sem acesso às tarefas'),node('p','', 'Você não possui permissão para visualizar as tarefas desta equipe.'));list.appendChild(empty);return;}
    if(!normalized.length){const empty=node('div','nexlab-team-task-empty-v02682');empty.append(node('strong','', 'Nenhuma tarefa registrada'),node('p','',workspace.permissions?.can_create?'Use “Nova tarefa” para criar a primeira atividade da equipe.':'Ainda não há tarefas nesta equipe.'));list.appendChild(empty);return;}

    const filtered=normalized.filter(task=>taskMatchesQuickFilter(state,task)&&taskMatchesSearch(task,state.taskSearchTerm));
    if(!filtered.length){const empty=node('div','nexlab-team-task-empty-v02682');empty.append(node('strong','', 'Nenhum resultado encontrado'),node('p','', 'Ajuste a busca ou os filtros para localizar outra tarefa.'));list.appendChild(empty);return;}

    for(const group of taskGroupCatalog()){
      const items=filtered.filter(task=>normalizeTaskStatus(task.status)===group.key);
      if(!items.length&&group.key==='cancelada'&&!counts.cancelada)continue;
      const section=node('section',`nexlab-team-task-group-v02682 is-${taskGroupTone(group.key)}`);
      const header=node('button','nexlab-team-task-group-head-v02682');header.type='button';const groupBodyId=`nexlab-team-task-group-${state.teamId}-${group.key}`;header.setAttribute('aria-expanded',String(!state.taskGroupCollapsed[group.key]));header.setAttribute('aria-controls',groupBodyId);header.addEventListener('click',()=>{state.taskGroupCollapsed[group.key]=!state.taskGroupCollapsed[group.key];renderTeamTasks(state);});
      const headLeft=node('div','nexlab-team-task-group-head-left-v02682');headLeft.append(node('span',`nexlab-team-task-group-dot-v02682 is-${taskGroupTone(group.key)}`),node('strong','',group.label),node('span','nexlab-team-task-group-count-v02682',String(items.length)));
      const headRight=node('span','nexlab-team-task-group-chevron-v02682');headRight.appendChild(teamWorkspaceIcon('chevron',14));header.append(headLeft,headRight);
      section.appendChild(header);
      const body=node('div','nexlab-team-task-group-body-v02682');body.id=groupBodyId;body.hidden=!!state.taskGroupCollapsed[group.key];
      if(!items.length){const empty=node('div','nexlab-team-task-group-empty-v02682','Nenhuma tarefa neste grupo.');body.appendChild(empty);}else{
        for(const task of items){
          const row=node('article','nexlab-team-task-row-v02682');row.dataset.taskId=String(task.id||'');if(isTaskOverdue(task))row.classList.add('is-overdue');if(normalizeTaskStatus(task.status)==='concluida')row.classList.add('is-done');
          const lead=node(task.can_complete&&!readOnly&&normalizeTaskStatus(task.status)!=='concluida'?'button':'span','nexlab-team-task-row-toggle-v02682');if(task.can_complete&&!readOnly&&normalizeTaskStatus(task.status)!=='concluida'){lead.type='button';lead.title='Concluir tarefa';lead.setAttribute('aria-label',`Concluir tarefa: ${task.title||'Tarefa'}`);lead.addEventListener('click',event=>{event.stopPropagation();completeTeamTask(state,task);});}lead.classList.add(`is-${taskGroupTone(task.status)}`);lead.appendChild(teamWorkspaceIcon(normalizeTaskStatus(task.status)==='concluida'?'check-circle':'dot',16));
          const main=node('div','nexlab-team-task-row-main-v02682');
          main.append(node('h4','',task.title||'Tarefa'),node('p','',taskMetaLine(task)));
          if(task.description){main.appendChild(node('small','nexlab-team-task-row-description-v02682',task.description));}
          const trailing=node('div','nexlab-team-task-row-trailing-v02682');
          const assignee=node('div','nexlab-team-task-assignee-v02682');const avatar=node('span','nexlab-team-task-assignee-avatar-v02682',initials(task.responsible_name||'U'));const assigneeName=node('span','nexlab-team-task-assignee-name-v02682',clean(task.responsible_name||'Não atribuído',60)||'Não atribuído');assignee.append(avatar,assigneeName);
          const badgeInfo=taskDateBadge(task);const dateBadge=node('div','nexlab-team-task-date-badge-v02682');dateBadge.append(teamWorkspaceIcon(badgeInfo.icon,14),node('span','',badgeInfo.label||'Sem prazo'));
          const menuWrap=node('div','nexlab-team-task-row-menu-wrap-v02682');
          const toggle=node('button','nexlab-team-task-row-menu-toggle-v02682');toggle.type='button';toggle.setAttribute('aria-label','Ações da tarefa');toggle.setAttribute('aria-haspopup','menu');toggle.setAttribute('aria-expanded',String(state.taskOpenMenuId===String(task.id||'')));toggle.appendChild(teamWorkspaceIcon('more',16));toggle.addEventListener('click',event=>{event.stopPropagation();const taskId=String(task.id||'');const opening=state.taskOpenMenuId!==taskId;state.taskOpenMenuId=opening?taskId:'';renderTeamTasks(state);requestAnimationFrame(()=>opening?focusTaskMenu(state,taskId):focusTaskMenuToggle(state,taskId));});
          menuWrap.appendChild(toggle);
          const menu=node('div','nexlab-team-task-row-menu-v02682');menu.hidden=state.taskOpenMenuId!==String(task.id||'');menu.setAttribute('role','menu');
          const details=node('button','','Ver detalhes');details.type='button';details.setAttribute('role','menuitem');details.addEventListener('click',event=>{event.stopPropagation();showTaskDetails(state,task);});menu.appendChild(details);
          if(task.can_complete&&normalizeTaskStatus(task.status)!=='concluida'&&!readOnly){const done=node('button','is-complete','Concluir');done.type='button';done.setAttribute('role','menuitem');done.addEventListener('click',event=>{event.stopPropagation();completeTeamTask(state,task);});menu.appendChild(done);}
          if(task.can_edit&&!readOnly){const statusAction=node('button','',taskStatusActionLabel(task.status));statusAction.type='button';statusAction.setAttribute('role','menuitem');statusAction.addEventListener('click',event=>{event.stopPropagation();updateTeamTaskStatus(state,task,taskNextStatus(task.status));});menu.appendChild(statusAction);}
          if(task.can_edit&&!readOnly){const reassign=node('button','','Reatribuir responsável');reassign.type='button';reassign.setAttribute('role','menuitem');reassign.addEventListener('click',event=>{event.stopPropagation();state.taskOpenMenuId='';showTaskForm(state,task);requestAnimationFrame(()=>state.tasksPanel?.querySelector('.nexlab-team-task-form-v02682 select')?.focus());});menu.appendChild(reassign);}
          if(task.can_edit&&!readOnly){const edit=node('button','','Editar');edit.type='button';edit.setAttribute('role','menuitem');edit.addEventListener('click',event=>{event.stopPropagation();state.taskOpenMenuId='';showTaskForm(state,task);});menu.appendChild(edit);}
          if(task.can_delete&&!readOnly){const remove=node('button','is-danger','Excluir');remove.type='button';remove.setAttribute('role','menuitem');remove.addEventListener('click',event=>{event.stopPropagation();state.taskOpenMenuId='';deleteTeamTask(state,task);});menu.appendChild(remove);}
          if(menu.childElementCount)menuWrap.appendChild(menu);
          trailing.append(assignee,dateBadge,menuWrap);
          row.append(lead,main,trailing);body.appendChild(row);
        }
      }
      section.appendChild(body);list.appendChild(section);
    }
    if(state.targetTaskId)highlightTaskTarget(state,state.targetTaskId);
  }

  function highlightTaskTarget(state,id){
    if(!id||!state.tasksPanel)return;const target=state.tasksPanel.querySelector(`[data-task-id="${CSS.escape(String(id))}"]`);if(!target)return;
    target.classList.add('is-target');target.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>target.classList.remove('is-target'),3200);state.targetTaskId='';
  }

  function syncNavigation(state){
    const nav=state.panel.querySelector('.nexlab-team-tabs-rebuilt-v02682');if(!nav)return;
    const tasks=nav.querySelector('[data-team-tab="tasks"]');
    if(tasks){const denied=state.taskWorkspace?.permissions?.can_view===false;tasks.disabled=denied;tasks.title=denied?'Você não possui acesso às tarefas desta equipe.':'';}
    for(const button of nav.querySelectorAll('[data-team-tab]')){const active=button.dataset.teamTab===state.activeTab;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));}
  }
  function classifyAndApply(state){
    const content=state.panel.querySelector(CONTENT_SELECTOR);state.content=content||null;if(!content)return;
    const workspace=state.workspace||state.panel.querySelector(':scope > .nexlab-team-workspace-v057');
    const footer=state.panel.querySelector(':scope > .team-details-v2680__footer');state.footer=footer||null;
    const groups={
      overview:[...content.querySelectorAll(':scope > .team-details-v2680__summary, :scope > .team-details-v2680__members, :scope > .team-workspace-v2680__history')],
      links:[...content.querySelectorAll(':scope > .nexlab-team-links-rebuilt-v02682')]
    };
    // Fallback for older DOM shapes.
    if(!groups.overview.length){for(const selector of ['.team-details-v2680__summary','.team-details-v2680__members','.team-workspace-v2680__history']){const el=content.querySelector(selector);if(el)groups.overview.push(el);}}
    if(!groups.links.length){const el=content.querySelector('.nexlab-team-links-rebuilt-v02682');if(el)groups.links.push(el);}
    const managed=new Set([...groups.overview,...groups.links]);
    for(const el of managed){el.hidden=true;}
    const workspaceTab=state.activeTab==='tasks';
    content.hidden=workspaceTab;
    if(footer)footer.hidden=workspaceTab;
    if(workspace)workspace.hidden=!workspaceTab;
    if(state.tasksPanel)state.tasksPanel.hidden=state.activeTab!=='tasks';
    state.panel.classList.toggle('is-nexlab-team-workspace-v057',workspaceTab);
    state.panel.classList.toggle('is-nexlab-team-tasks-scroll-v02682',state.activeTab==='tasks');
    if(!workspaceTab){for(const el of groups[state.activeTab]||groups.overview)el.hidden=false;}
    syncNavigation(state);
  }

  function activateTab(state,key){
    if(!['overview','tasks','links'].includes(key))key='overview';
    if(key==='tasks'&&state.taskWorkspace?.permissions?.can_view===false)return;
    state.activeTab=key;classifyAndApply(state);
    if(key==='tasks')void ensureTeamTasksReady(state);
  }
  async function resolveNotificationTarget(){
    if(notificationPromise)return notificationPromise;
    notificationPromise=(async()=>{
      let notificationId='';try{notificationId=new URL(location.href).searchParams.get('notification')||'';}catch{}
      if(!isUuid(notificationId)){try{const stored=JSON.parse(sessionStorage.getItem('nexlabNotificationTarget')||'null');notificationId=String(stored?.notificationId||stored?.notification_id||'');}catch{}}
      if(isUuid(notificationId)){
        const c=await waitClient();const {data,error}=await c.from('notifications').select('id,target_tab,entity_type,entity_id,metadata').eq('id',notificationId).maybeSingle();
        if(!error&&data&&String(data.entity_type||'')==='team'&&isUuid(data.entity_id)&&String(data.metadata?.open_section||'')==='tasks'){
          const section=String(data.metadata.open_section);return {notificationId,teamId:String(data.entity_id),section,contentId:'',taskId:section==='tasks'?String(data.metadata?.task_id||''):''};
        }
      }
      try{
        const direct=JSON.parse(sessionStorage.getItem('nexlabTeamTaskTarget')||'null');
        if(isUuid(direct?.teamId)&&isUuid(direct?.taskId)){sessionStorage.removeItem('nexlabTeamTaskTarget');return {notificationId:'',teamId:String(direct.teamId),section:'tasks',contentId:'',taskId:String(direct.taskId)};}
      }catch{}
      return null;
    })().catch(()=>null).then(value=>{pendingNotification=value;return value;});
    return notificationPromise;
  }
  function tryOpenPendingTeam(){
    if(!pendingNotification?.teamId||document.querySelector(PANEL_SELECTOR))return;
    const card=document.querySelector(`[data-nexlab-record-id="${CSS.escape(pendingNotification.teamId)}"]`);if(!card)return;
    const buttons=[...card.querySelectorAll('button')];const details=buttons.find(button=>/^(ver detalhes|detalhes)$/i.test(clean(button.textContent,60)));if(details){details.click();}
  }

  function mountWorkspace(panel,state){
    panel.querySelectorAll('.nexlab-team-workspace-v057,.nexlab-team-tasks-rebuilt-v02682').forEach(el=>el.remove());
    const tasks=buildTasksPanel(state);const workspace=buildTeamWorkspace(tasks);
    state.tasksPanel=tasks;state.workspace=workspace;state.content=panel.querySelector(CONTENT_SELECTOR);state.footer=panel.querySelector(':scope > .team-details-v2680__footer');
    const nav=panel.querySelector(':scope > .nexlab-team-tabs-rebuilt-v02682');
    if(nav)nav.insertAdjacentElement('afterend',workspace);else if(state.content)state.content.insertAdjacentElement('beforebegin',workspace);else panel.appendChild(workspace);
    if(state.tasksLoaded)renderTeamTasks(state);
  }
  function createState(panel,teamId){
    const state={panel,teamId,activeTab:'overview',currentUserId:'',identityLoaded:false,identityLoading:null,targetTaskId:'',content:null,footer:null,workspace:null,tasksPanel:null,taskWorkspace:null,tasksLoaded:false,tasksLoading:null,taskRealtimeUnsubscribe:null,taskRealtimeTimer:null,taskSearchTerm:'',taskQuickFilter:'all',taskFilterPanelOpen:false,taskGroupCollapsed:{pendente:false,em_andamento:false,concluida:false,cancelada:false},taskOpenMenuId:'',taskDetailId:'',taskLoadError:null};
    panel.classList.add('has-nexlab-team-workspace-v02682','has-nexlab-team-tasks-rebuilt-v02682');
    const header=panel.querySelector(HEADER_SELECTOR);const nav=buildTabs(state);
    if(header)header.insertAdjacentElement('afterend',nav);else panel.prepend(nav);
    mountWorkspace(panel,state);states.set(panel,state);stateByTeamId.set(teamId,state);bindTaskRealtime(state);
    if(pendingNotification?.teamId===teamId){state.activeTab='tasks';state.targetTaskId=pendingNotification.taskId||'';}
    void loadTaskIdentity(state).then(()=>{if(state.panel!==panel||!panel.isConnected)return;classifyAndApply(state);if(state.activeTab==='tasks')void ensureTeamTasksReady(state);});
    classifyAndApply(state);return state;
  }
  function rebindState(panel,state){
    state.panel=panel;state.content=panel.querySelector(CONTENT_SELECTOR);state.footer=panel.querySelector(':scope > .team-details-v2680__footer');
    panel.classList.add('has-nexlab-team-workspace-v02682','has-nexlab-team-tasks-rebuilt-v02682');
    panel.querySelectorAll('.nexlab-team-tabs-rebuilt-v02682,.nexlab-team-workspace-v057,.nexlab-team-tasks-rebuilt-v02682').forEach(el=>el.remove());
    const header=panel.querySelector(HEADER_SELECTOR);const nav=buildTabs(state);
    if(header)header.insertAdjacentElement('afterend',nav);else panel.prepend(nav);
    mountWorkspace(panel,state);
    states.set(panel,state);bindTaskRealtime(state);classifyAndApply(state);
    if(state.activeTab==='tasks'&&!state.tasksLoaded)void ensureTeamTasksReady(state);
    return state;
  }
  function ensurePanel(panel){
    if(!(panel instanceof HTMLElement))return;const teamId=String(panel.dataset.nexlabTeamId||'');if(!isUuid(teamId))return;
    let state=states.get(panel);if(!state||state.teamId!==teamId){
      panel.querySelectorAll('.nexlab-team-tabs-rebuilt-v02682,.nexlab-team-workspace-v057,.nexlab-team-tasks-rebuilt-v02682').forEach(el=>el.remove());
      const cached=stateByTeamId.get(teamId);
      state=cached&&!cached.panel?.isConnected?rebindState(panel,cached):createState(panel,teamId);
    }else{
      let nav=panel.querySelector(':scope > .nexlab-team-tabs-rebuilt-v02682');
      if(!nav){nav=buildTabs(state);const header=panel.querySelector(HEADER_SELECTOR);if(header)header.insertAdjacentElement('afterend',nav);else panel.prepend(nav);}
      const workspace=panel.querySelector(':scope > .nexlab-team-workspace-v057');
      if(!workspace||!workspace.querySelector('.nexlab-team-tasks-rebuilt-v02682'))mountWorkspace(panel,state);
      classifyAndApply(state);
    }
  }
  function closeTaskFloatingPanels(target,{escape=false}={}){
    for(const state of stateByTeamId.values()){
      if(state.activeTab!=='tasks'||!state.tasksPanel?.isConnected)continue;
      let changed=false;const menuReturnId=state.taskOpenMenuId;
      if(state.taskFilterPanelOpen&&(escape||!(target instanceof Element)||!target.closest('.nexlab-team-task-filters-wrap-v02682'))){state.taskFilterPanelOpen=false;changed=true;}
      if(state.taskOpenMenuId&&(escape||!(target instanceof Element)||!target.closest('.nexlab-team-task-row-menu-wrap-v02682'))){state.taskOpenMenuId='';changed=true;}
      if(changed)renderTeamTasks(state);
      if(escape&&menuReturnId)requestAnimationFrame(()=>focusTaskMenuToggle(state,menuReturnId));
      if(escape&&state.taskDetailId)closeTaskDetail(state);
    }
  }
  function scan(){observerScheduled=false;tryOpenPendingTeam();document.querySelectorAll(PANEL_SELECTOR).forEach(ensurePanel);}
  function scheduleScan(){if(observerScheduled)return;observerScheduled=true;requestAnimationFrame(scan);}

  const observer=new MutationObserver(scheduleScan);
  function start(){observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-nexlab-team-id','data-nexlab-record-id']});document.addEventListener('pointerdown',event=>closeTaskFloatingPanels(event.target),{passive:true});document.addEventListener('keydown',event=>{if(event.key==='Escape')closeTaskFloatingPanels(event.target,{escape:true});});void resolveNotificationTarget().then(scheduleScan);scheduleScan();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  globalThis.addEventListener('nexlab:session-reset',()=>{
    notificationPromise=null;pendingNotification=null;
    for(const state of stateByTeamId.values()){
      if(state.taskRealtimeTimer)clearTimeout(state.taskRealtimeTimer);
      try{state.taskRealtimeUnsubscribe?.();}catch{}
      state.taskRealtimeTimer=null;state.taskRealtimeUnsubscribe=null;
      state.taskWorkspace=null;state.tasksLoaded=false;state.currentUserId='';
      state.panel.querySelectorAll('.nexlab-team-tabs-rebuilt-v02682,.nexlab-team-workspace-v057').forEach(el=>el.remove());
    }
    states=new WeakMap();stateByTeamId.clear();
    try{sessionStorage.removeItem('nexlabTeamTaskTarget');}catch{}
  });
  globalThis.__NEXLAB_TEAM_WORKSPACE__=Object.freeze({
    version:BUILD.version,revision:REVISION,
    refreshTasks(){const panel=document.querySelector(PANEL_SELECTOR);const state=panel&&states.get(panel);return state?loadTeamTasks(state,{force:true}):Promise.resolve(null);},
    openTasks(){const panel=document.querySelector(PANEL_SELECTOR);const state=panel&&states.get(panel);if(state){activateTab(state,'tasks');return true;}return false;},
    snapshot(){const panel=document.querySelector(PANEL_SELECTOR);const state=panel&&states.get(panel);return state?Object.freeze({teamId:state.teamId,activeTab:state.activeTab,tasksLoaded:state.tasksLoaded,tasks:Array.isArray(state.taskWorkspace?.tasks)?state.taskWorkspace.tasks.length:0,canCreateTask:state.taskWorkspace?.permissions?.can_create??null,canManageTask:state.taskWorkspace?.permissions?.can_manage??null}):null;}
  });
})();
