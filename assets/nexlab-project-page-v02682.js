/* NEXLAB — página de projeto e links externos. Usa o contrato existente de attachments. */
import { g as React, Ln as supabase } from './nexlab-runtime-vendor.js?v=app-beta-0-26-82-oficial-patrimonio-pagina-detalhes';
import {internalAttachmentPath,PrivateAttachmentLink} from './nexlab-attachment-access-v02682.js?v=app-beta-0-26-82-oficial-patrimonio-pagina-detalhes';

const h=React.createElement;
const PROJECT_PARAM='nexlabProject';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ICON_PATHS={
  folder:['M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z','M3 11h18'],
  ideia:['M9 18h6','M10 21h4','M8.5 14.5a6 6 0 1 1 7 0L15 18H9Z'],
  analise:['M16.5 16.5 21 21','M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0'],
  aprovacao:['m8 12 3 3 5-6','m12 2 3 2 4 1 1 4 2 3-2 3-1 4-4 1-3 2-3-2-4-1-1-4-2-3 2-3 1-4 4-1Z'],
  execucao:['M4 16 2 22l6-2','M9 15 4 10l4-1C10 3 16 2 22 2c0 6-1 12-7 14l-1 4-5-5Z','M14 8h.01'],
  finalizado:['M22 12a10 10 0 1 1-4-8','m8 11 4 4L22 5'],
  arquivado:['M4 9v12h16V9','M3 3h18v6H3Z','M10 13h4'],
  calendar:['M8 2v4','M16 2v4','M3 10h18','M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z'],
  flag:['M4 22V3','M4 3c6-3 10 3 16 0v11c-6 3-10-3-16 0'],
  user:['M20 21v-2a7 7 0 0 0-14 0v2','M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
  users:['M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0','M17 4a4 4 0 0 1 0 8','M23 21v-2a4 4 0 0 0-3-3.8'],
  link:['M10 13a5 5 0 0 0 7 .5l4-4a5 5 0 0 0-7-7l-2 2','M14 11a5 5 0 0 0-7-.5l-4 4a5 5 0 0 0 7 7l2-2'],
  document:['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z','M14 2v6h6','M8 13h8','M8 17h6'],
  progress:['M4 20V10h4v10','M10 20V4h4v16','M16 20V7h4v13'],
  tasks:['M9 6h12','M9 12h12','M9 18h12','m2 6 1 1 2-2','m2 12 1 1 2-2','m2 18 1 1 2-2'],
  plus:['M12 5v14','M5 12h14'],
  edit:['m16 3 5 5-13 13H3v-5Z','m14 5 5 5'],
  layers:['m12 2 10 6-10 6L2 8Z','m2 12 10 6 10-6','m2 16 10 6 10-6'],
  chevron:['m9 5 7 7-7 7'],
  check:['m5 12 4 4L19 6'],
  clock:['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0','M12 6v6l4 2']
  ,board:['M3 3h18v18H3Z','M9 3v18','M15 3v18']
  ,table:['M3 3h18v18H3Z','M3 9h18','M3 15h18','M9 3v18']
  ,move:['M12 2v20','M2 12h20','m8 6 4-4 4 4','m8 18 4 4 4-4','m6 8-4 4 4 4','m18 8 4 4-4 4']
  ,grip:['M8 5h.01 M16 5h.01 M8 12h.01 M16 12h.01 M8 19h.01 M16 19h.01']
};
export function ProjectIcon({name='folder',className=''}){
  return h('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,className:'project-design-icon '+className},...(ICON_PATHS[name]||ICON_PATHS.folder).map((d,i)=>h('path',{key:i,d})));
}
const dateTime=value=>{try{return value?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'—';}catch{return '—';}};
const roleName=value=>({responsavel:'Responsável',vice_responsavel:'Vice-responsável',organizador:'Organizador',membro:'Membro'}[value]||'Membro');
function EmptyState({icon='folder',title,description,action}){
  return h('div',{className:'project-design-empty'},h('span',{className:'project-design-empty-icon'},h(ProjectIcon,{name:icon})),h('strong',null,title),description?h('p',null,description):null,action||null);
}
function PanelHeading({icon,title,description,count,action,tone='blue'}){
  return h('header',{className:'project-design-panel-heading tone-'+tone},h('span',{className:'project-design-icon-box'},h(ProjectIcon,{name:icon})),h('div',{className:'project-design-heading-copy'},h('h3',null,title),description?h('p',null,description):null),count!=null?h('span',{className:'project-design-count'},count):null,action||null);
}
export function ProjectPageHeader({project,statusLabel,onBack,onEdit,onRefresh,onArchive,canManage,busy}){
  return h('header',{className:'project-details-header-v2690 project-details-header-v02667 project-design-page-header'},
    h('div',{className:'project-design-project-heading'},h('button',{type:'button',className:'project-page-back-v02682',onClick:onBack},'← Voltar aos projetos'),
      h('div',{className:'project-design-title-line'},h('span',{className:'project-design-folder'},h(ProjectIcon,{name:'folder'})),h('div',null,h('h1',{id:'project-details-title-v2690'},project?.nome||'Detalhes do projeto'),
        h('div',{className:'project-design-project-meta'},h('span',{className:'project-status-v2690 status-'+(project?.status||'ideia')},h(ProjectIcon,{name:project?.status||'ideia'}),statusLabel),h('span',null,'Registrado em ',dateTime(project?.created_at)),h('span',null,'Última atualização em ',dateTime(project?.updated_at||project?.created_at)))))),
    h('div',{className:'project-details-header-actions-v02667'},canManage?h('button',{type:'button',onClick:()=>onEdit(),className:'project-details-edit-v02667'},h(ProjectIcon,{name:'edit'}),'Editar'):null,
      h('details',{className:'project-details-more-v02667'},h('summary',null,'••• Mais ações'),h('div',{className:'project-details-more-menu-v02667'},h('button',{type:'button',disabled:busy,onClick:onRefresh},'Atualizar dados'),canManage&&project?.status!=='arquivado'?h('button',{type:'button',disabled:busy,onClick:onArchive},'Arquivar projeto'):null))));
}
export function ProjectOverview({project,team,responsibleName,priorityLabel,deadline,progress,canManage,onEdit,onMove,statuses,busy}){
  const metric=(icon,label,value,field,tone)=>h(canManage?'button':'div',{key:field,type:canManage?'button':undefined,onClick:canManage?()=>onEdit(field):undefined,className:'project-design-property tone-'+tone},h('span',{className:'project-design-icon-box'},h(ProjectIcon,{name:icon})),h('span',{className:'project-design-property-copy'},h('small',null,label),h('strong',null,value)),canManage?h(ProjectIcon,{name:'chevron',className:'project-design-chevron'}):null);
  return h('div',{className:'project-overview-layout'},
    h('div',{className:'project-overview-primary'},
      h('section',{className:'project-design-description'},h(PanelHeading,{icon:'document',title:'Descrição do projeto',action:canManage?h('button',{type:'button',onClick:()=>onEdit('descricao'),className:'project-design-edit-description'},h(ProjectIcon,{name:'edit'}),'Editar descrição'):null}),
        h('p',{className:'project-details-description-v2690'},project?.descricao||'Nenhuma descrição foi registrada para este projeto.'),h('div',{className:'project-design-dates'},h('span',null,'Criado por ',h('strong',null,project?.author_name||'Usuário')),h('span',null,dateTime(project?.created_at)),h('span',null,'Última atualização em ',dateTime(project?.updated_at||project?.created_at)))),
      h('section',{className:'project-design-progress'},h('div',null,h(ProjectIcon,{name:'progress'}),h('strong',null,'Progresso geral'),h('span',null,h('b',null,progress.progress+'%'),h('small',null,progress.total?`${progress.completed} de ${progress.total} subtarefas concluídas`:'Nenhuma subtarefa cadastrada'))),h('div',{className:'project-design-progress-track'},h('span',{style:{width:progress.progress+'%'}})))),
    h('aside',{className:'project-overview-properties','aria-label':'Informações do projeto'},
      metric('flag','Prioridade',priorityLabel,'prioridade','orange'),metric('calendar','Prazo',deadline.label,'prazo','blue'),metric('user','Responsável',responsibleName,'responsavel','amber'),metric('users','Equipe',team?.name||project?.team_name||'Sem equipe','equipe','purple'),
      h('div',{className:'project-design-stage'},h(ProjectIcon,{name:'layers'}),h('label',null,h('span',null,'Etapa do projeto'),canManage?h('select',{'aria-label':`Mover projeto ${project?.nome}`,value:project?.status,disabled:busy,onChange:event=>onMove(event.target.value)},...statuses.map(item=>h('option',{key:item.key,value:item.key},item.label))):h('strong',null,statuses.find(item=>item.key===project?.status)?.label||project?.status)))));
}
export function ProjectTasksPanel({tasks,progress,canManage,people,draft,setDraft,editingId,busy,onSubmit,onCancel,onToggle,onEdit,onDelete}){
  return h('section',{className:'project-details-section-v2690 project-tasks-v2690 project-details-tasks-pane-v02667 project-design-tasks'},
    h('div',{className:'project-design-task-summary'},h(PanelHeading,{icon:'progress',title:'Subtarefas',description:'Acompanhe o progresso das subtarefas deste projeto.',count:`${progress.completed}/${progress.total} concluídas`}),h('strong',{className:'project-design-task-percent'},progress.progress+'%'),h('div',{className:'project-design-progress-track'},h('span',{style:{width:progress.progress+'%'}}))),
    canManage?h('form',{className:'project-task-form-v2690 project-design-new-task',onSubmit},h('h3',null,h(ProjectIcon,{name:'plus'}),editingId?'Editar subtarefa':'Nova subtarefa'),
      h('label',null,'Título da subtarefa',h('input',{type:'text',maxLength:180,required:true,disabled:!!busy,placeholder:'Digite o título da subtarefa…',value:draft.title,onChange:event=>setDraft(prev=>({...prev,title:event.target.value}))})),
      h('label',null,'Responsável',h('select',{'aria-label':'Responsável pela tarefa',value:draft.responsible_id,disabled:!!busy,onChange:event=>setDraft(prev=>({...prev,responsible_id:event.target.value}))},h('option',{value:''},'Sem responsável'),...people.filter(person=>person.ativo!==false||person.id===draft.responsible_id).map(person=>h('option',{key:person.id,value:person.id},person.nome)))),
      h('div',{className:'project-task-form-actions-v2690'},editingId?h('button',{type:'button',disabled:!!busy,onClick:onCancel,className:'is-secondary'},'Cancelar'):null,h('button',{type:'submit',disabled:!!busy||!draft.title.trim(),className:'is-primary'},h(ProjectIcon,{name:'plus'}),busy?'Salvando…':editingId?'Salvar subtarefa':'Adicionar subtarefa'))):null,
    h('div',{className:'project-design-task-list'},h('h3',null,h(ProjectIcon,{name:'tasks'}),'Lista de subtarefas'),!tasks.length?h(EmptyState,{icon:'tasks',title:'Nenhuma subtarefa cadastrada',description:canManage?'Adicione uma subtarefa para começar a organizar este projeto.':'As subtarefas deste projeto aparecerão aqui.'}):
      h('div',{className:'project-details-task-list-v2690'},...tasks.map(task=>h('article',{key:task.id,className:task.done?'is-done':''},
        h('button',{type:'button',className:'project-task-toggle-v2690',disabled:!(task.can_toggle??canManage)||!!busy,onClick:()=>onToggle(task),'aria-label':`${task.done?'Reabrir':'Concluir'} subtarefa ${task.title||task.titulo}`},h(ProjectIcon,{name:task.done?'finalizado':'clock'})),
        h('div',{className:'project-task-content-v2690'},h('strong',null,task.title||task.titulo),h('small',null,task.responsible_name||people.find(person=>person.id===(task.responsible_id||task.responsavel_id))?.nome||'Sem responsável')),
        h('div',{className:'project-task-actions-v2690'},(task.can_edit??canManage)?h('button',{type:'button',disabled:!!busy,onClick:()=>onEdit(task),'aria-label':`Editar subtarefa ${task.title||task.titulo}`},h(ProjectIcon,{name:'edit'})):null,(task.can_delete??canManage)?h('button',{type:'button',className:'is-danger',disabled:!!busy,onClick:()=>onDelete(task),'aria-label':`Excluir subtarefa ${task.title||task.titulo}`},'Excluir'):null))))));
}
export function ProjectTeamPanel({team,participants,canManage,onEdit}){
  const action=h('button',{type:'button',className:'project-design-primary',onClick:()=>onEdit('equipe')},h(ProjectIcon,{name:'plus'}),team?'Trocar equipe':'Vincular equipe');
  return h('section',{className:'project-details-section-v2690 project-team-pane-v02682'},h(PanelHeading,{icon:'users',title:'Equipe do projeto',description:'Gerencie e acompanhe a equipe vinculada a este projeto.',action:team&&canManage?action:null,tone:'orange'}),
    !team?h(EmptyState,{icon:'users',title:'Nenhuma equipe vinculada',description:'Vincule uma equipe para organizar os responsáveis e acompanhar as atividades em conjunto.',action:canManage?action:null}):
      h('div',{className:'project-design-team-content'},h('div',{className:'project-design-team-name'},h(ProjectIcon,{name:'users'}),h('div',null,h('h4',null,team.name||team.nome||'Equipe'),h('p',null,team.area||'Equipe participante')),h('span',{className:'project-design-count'},participants.length+' integrantes')),
        !participants.length?h(EmptyState,{icon:'users',title:'Nenhum integrante disponível',description:'Os integrantes da equipe serão exibidos nesta área.'}):h('div',{className:'project-details-people-v2690'},...participants.map(person=>h('article',{key:person.user_id},h('span',null,String(person.name||'U').trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('')),h('div',null,h('strong',null,person.name||'Usuário'),h('small',null,roleName(person.role))))))));
}
function SortRecords({value,onChange,label}){
  return h('label',{className:'project-design-sort'},h('span',{className:'sr-only'},label),h('select',{'aria-label':label,value,onChange:event=>onChange(event.target.value)},h('option',{value:'recent'},'Mais recentes'),h('option',{value:'oldest'},'Mais antigos'),h('option',{value:'name'},'Nome A–Z')));
}
const sortRecords=(rows,sort)=>[...rows].sort((a,b)=>sort==='name'?String(a.title||a.titulo||'').localeCompare(String(b.title||b.titulo||''),'pt-BR'):(new Date(b.created_at||b.date||0)-new Date(a.created_at||a.date||0))*(sort==='oldest'?-1:1));
export function ProjectLinkedRecords({links,available,kind,setKind,recordId,setRecordId,canManage,busy,onAdd,onRemove}){
  const [sort,setSort]=React.useState('recent');
  return h('section',{className:'project-details-section-v2690 project-links-v2690 project-details-links-v02667 project-design-linked-records'},h(PanelHeading,{icon:'calendar',title:'Vínculos do projeto',description:'Associe eventos ou reuniões a este projeto.',count:links.length+' vínculos'}),
    canManage?h('div',{className:'project-link-manager-v2690'},h('label',null,'Tipo de vínculo',h('select',{'aria-label':'Tipo do vínculo',value:kind,disabled:!!busy,onChange:event=>setKind(event.target.value)},h('option',{value:'event'},'Evento'),h('option',{value:'meeting'},'Reunião'))),
      h('label',null,'Selecionar registro',h('select',{'aria-label':'Registro para vincular',value:recordId,disabled:!!busy,onChange:event=>setRecordId(event.target.value)},h('option',{value:''},available.length?'Selecione…':'Nenhum registro disponível'),...available.map(item=>h('option',{key:item.id,value:item.id},item.title||'Registro')))),
      h('button',{type:'button',disabled:!recordId||!!busy,onClick:onAdd},h(ProjectIcon,{name:'plus'}),busy?'Vinculando…':'Adicionar vínculo')):null,
    h('div',{className:'project-design-registered'},h('div',{className:'project-design-list-heading'},h('h4',null,'Vínculos cadastrados'),h(SortRecords,{value:sort,onChange:setSort,label:'Ordenar vínculos'})),
      !links.length?h(EmptyState,{icon:'calendar',title:'Nenhum evento ou reunião vinculado',description:'Associe um evento ou uma reunião para centralizar as informações deste projeto.'}):h('div',{className:'project-link-list-v2690'},...sortRecords(links,sort).map(item=>h('article',{key:item.type+'-'+item.id},h(ProjectIcon,{name:'calendar'}),h('div',null,h('strong',null,item.title||'Registro'),h('small',null,[item.date,item.location].filter(Boolean).join(' · ')||'Vínculo direto')),canManage?h('button',{type:'button',disabled:!!busy,onClick:()=>onRemove(item),'aria-label':`Remover vínculo ${item.title||''}`},'Remover'):null)))));
}
export function projectLinkUrl(value){
  try{
    const text=String(value||'').trim();
    if(text.length>2048||!/^https?:\/\//i.test(text))return null;
    const url=new URL(text);
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!url.hostname)return null;
    return url.href;
  }catch{return null;}
}

export function useProjectPageRoute({open,projectId,onOpen,onClose,panelRef}){
  const callbacks=React.useRef({onOpen,onClose});callbacks.current={onOpen,onClose};
  const previous=React.useRef(null),applying=React.useRef(false),scroll=React.useRef({main:0,window:0});
  const read=()=>{try{return new URL(location.href).searchParams.get(PROJECT_PARAM)||'';}catch{return '';}};
  React.useEffect(()=>{
    const sync=()=>{
      try{const tab=new URL(location.href).searchParams.get('nexlabTab');if(tab&&tab!=='projetos'&&tab!=='planejamentos')return;}catch{}
      const id=read();
      applying.current=true;
      if(uuid.test(id))callbacks.current.onOpen({id});else callbacks.current.onClose();
    };
    if(uuid.test(read()))sync();
    window.addEventListener('popstate',sync);
    return()=>{
      window.removeEventListener('popstate',sync);
      try{const url=new URL(location.href),tab=url.searchParams.get('nexlabTab');if(tab!=='projetos'&&tab!=='planejamentos'&&url.searchParams.has(PROJECT_PARAM)){url.searchParams.delete(PROJECT_PARAM);history.replaceState(history.state,'',url);}}catch{}
    };
  },[]);
  React.useEffect(()=>{
    const main=document.getElementById('nexlab-main-content');
    if(open&&projectId){
      if(!previous.current)scroll.current={main:main?.scrollTop||0,window:window.scrollY||0};
      if(!applying.current&&read()!==projectId)try{
        const url=new URL(location.href);
        if(url.searchParams.get('nexlabTab')!=='projetos'){
          url.searchParams.set('nexlabTab','projetos');url.searchParams.delete(PROJECT_PARAM);
          history.pushState({...history.state,nexlabTab:'projetos'},'',url);
        }
        url.searchParams.set(PROJECT_PARAM,projectId);
        history.pushState({...history.state,nexlabProjectPage:projectId},'',url);
      }catch{}
      if(previous.current!==projectId)requestAnimationFrame(()=>{if(main)main.scrollTop=0;window.scrollTo(0,0);panelRef.current?.focus?.({preventScroll:true});});
      previous.current=projectId;
    }else if(previous.current){
      if(!applying.current&&read())try{const url=new URL(location.href);url.searchParams.delete(PROJECT_PARAM);const state={...history.state};delete state.nexlabProjectPage;history.replaceState(state,'',url);}catch{}
      previous.current=null;
      requestAnimationFrame(()=>{if(main)main.scrollTop=scroll.current.main;window.scrollTo(0,scroll.current.window);});
    }
    applying.current=false;
  },[open,projectId]);
  return {back(){
    try{if(history.state?.nexlabProjectPage===projectId&&read()===projectId){history.back();return;}}catch{}
    callbacks.current.onClose();
  }};
}

export function ProjectExternalLinks({projectId,attachments=[],canManage=false,canDeleteAll=false,currentUserId,onChanged,addToast}){
  const [title,setTitle]=React.useState(''),[url,setUrl]=React.useState(''),[busy,setBusy]=React.useState(''),[error,setError]=React.useState(''),[owners,setOwners]=React.useState({}),[sort,setSort]=React.useState('recent');
  const mounted=React.useRef(true),sequence=React.useRef(0);
  React.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;sequence.current+=1;};},[]);
  React.useEffect(()=>{
    let active=true;setTitle('');setUrl('');setError('');setOwners({});sequence.current+=1;
    if(canManage&&!canDeleteAll)supabase.from('attachments').select('id,autor_id').eq('record_id',projectId).in('modulo',['projetos','projects','project']).then(({data})=>{
      if(active)setOwners(Object.fromEntries((data||[]).map(row=>[row.id,row.autor_id])));
    }).catch(()=>{});
    return()=>{active=false;};
  },[projectId,canManage,canDeleteAll]);
  const current=token=>mounted.current&&sequence.current===token;
  async function save(event){
    event.preventDefault();if(busy||!canManage)return;
    const normalized=projectLinkUrl(url),label=title.trim();
    if(!normalized)return setError('Informe um link completo começando com https:// ou http://.');
    if(!label)return setError('Informe um título para identificar o link.');
    if(attachments.some(row=>projectLinkUrl(row.url)===normalized))return setError('Este link já está anexado ao projeto.');
    const token=sequence.current;setBusy('save');setError('');
    try{
      const {data,error}=await supabase.from('attachments').insert({modulo:'projetos',record_id:projectId,titulo:label,url:normalized,tipo:'link',autor_id:currentUserId}).select('id,autor_id').single();
      if(error)throw error;
      if(!current(token))return;
      if(data?.id)setOwners(prev=>({...prev,[data.id]:data.autor_id}));
      setTitle('');setUrl('');addToast?.('Link anexado ao projeto.','ok');
      await onChanged?.();
    }catch(error){if(current(token))setError(error?.message||'Não foi possível anexar o link. Tente novamente.');}
    finally{if(current(token))setBusy('');}
  }
  async function remove(row){
    if(busy||!canManage||!(canDeleteAll||owners[row.id]===currentUserId))return;
    const confirmed=typeof window.nexlabConfirm==='function'?await window.nexlabConfirm(`Remover o link "${row.title||'Link do projeto'}"?`):window.confirm(`Remover o link "${row.title||'Link do projeto'}"?`);
    if(!confirmed)return;
    const token=sequence.current;setBusy(row.id);setError('');
    try{
      const {data,error}=await supabase.from('attachments').delete().eq('id',row.id).eq('record_id',projectId).in('modulo',['projetos','projects','project']).eq('tipo','link').select('id');
      if(error)throw error;
      if(!data?.length)throw new Error('O link não foi removido. Atualize os dados e verifique sua permissão.');
      if(current(token)){addToast?.('Link removido do projeto.','ok');await onChanged?.();}
    }catch(error){if(current(token))setError(error?.message||'Não foi possível remover o link.');}
    finally{if(current(token))setBusy('');}
  }
  return h('section',{className:'project-details-section-v2690 project-external-links-v02682'},
    h(PanelHeading,{icon:'link',title:'Links e anexos',description:'Adicione sites, documentos e outros recursos do projeto.',count:attachments.length+' itens',tone:'orange'}),
    canManage?h('form',{className:'project-external-link-form-v02682',onSubmit:save,noValidate:true},
      h('label',null,'Título do link',h('input',{type:'text',maxLength:180,value:title,disabled:!!busy,placeholder:'Ex.: Site do projeto ou Repositório',onChange:event=>setTitle(event.target.value)})),
      h('label',null,'Endereço do link',h('input',{type:'url',inputMode:'url',maxLength:2048,value:url,disabled:!!busy,placeholder:'https://',onChange:event=>setUrl(event.target.value)})),
      h('button',{type:'submit',disabled:!!busy},h(ProjectIcon,{name:'plus'}),busy==='save'?'Anexando…':'Anexar link')):null,
    error?h('p',{className:'project-link-error-v02682',role:'alert'},error):null,
    h('div',{className:'project-design-registered'},h('div',{className:'project-design-list-heading'},h('h4',null,'Links cadastrados'),h(SortRecords,{value:sort,onChange:setSort,label:'Ordenar links'})),
    !attachments.length?h(EmptyState,{icon:'link',title:'Nenhum link anexado a este projeto',description:'Adicione links úteis, como sites, repositórios e documentos.'}):h('ul',{className:'project-external-link-list-v02682'},...sortRecords(attachments,sort).map(row=>{
      const safe=projectLinkUrl(row.url),label=row.title||row.titulo||'Link do projeto';
      return h('li',{key:row.id},h('div',null,h('strong',null,label),h('small',null,safe?new URL(safe).hostname:'Endereço indisponível')),
        safe?(internalAttachmentPath(safe)!==null?h(PrivateAttachmentLink,{url:safe,label:`Abrir anexo: ${label} (nova aba)`,className:'project-open-link-v02682'},'Abrir arquivo ↗'):h('a',{href:safe,target:'_blank',rel:'noopener noreferrer',className:'project-open-link-v02682','aria-label':`Abrir projeto: ${label} (nova aba)`},'Abrir projeto ↗')):h('span',{role:'status'},'Link inválido'),
        canManage&&(row.type||row.tipo)==='link'&&(canDeleteAll||owners[row.id]===currentUserId)?h('button',{type:'button',disabled:!!busy,onClick:()=>remove(row),'aria-label':`Remover link ${label}`,className:'project-remove-link-v02682'},busy===row.id?'Removendo…':'Remover'):null);
    }))));
}
