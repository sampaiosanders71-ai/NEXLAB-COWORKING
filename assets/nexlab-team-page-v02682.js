/* NexLab — detalhes da equipe no fluxo da página. Nenhum contrato de dados é alterado. */
import {g as React} from './nexlab-runtime-vendor.js?v=app-beta-0-26-82-oficial-kanban-navegacao-colunas';
const PARAM='nexlabTeam';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function useTeamPageRoute({teamId,teams,onOpen,onClose,panelRef}){
  const callbacks=React.useRef({onOpen,onClose});callbacks.current={onOpen,onClose};
  const records=React.useRef(teams);records.current=teams;
  const previous=React.useRef(null),applying=React.useRef(false),pending=React.useRef('');
  const origin=React.useRef({main:0,window:0,trigger:null});
  const read=()=>{try{return new URL(location.href).searchParams.get(PARAM)||'';}catch{return '';}};
  const sync=()=>{
    try{const tab=new URL(location.href).searchParams.get('nexlabTab');if(tab&&tab!=='equipes')return;}catch{}
    const id=read();pending.current=uuid.test(id)?id:'';
    const team=records.current.find(row=>String(row.id)===id);
    if(team){applying.current=true;callbacks.current.onOpen(team);}
    else if(!pending.current){applying.current=true;callbacks.current.onClose();}
  };
  React.useEffect(()=>{
    if(uuid.test(read()))sync();
    window.addEventListener('popstate',sync);
    return()=>{
      window.removeEventListener('popstate',sync);
      try{const url=new URL(location.href);if(url.searchParams.get('nexlabTab')!=='equipes'&&url.searchParams.has(PARAM)){url.searchParams.delete(PARAM);history.replaceState(history.state,'',url);}}catch{}
    };
  },[]);
  React.useEffect(()=>{
    if(!pending.current||teamId===pending.current)return;
    const team=teams.find(row=>String(row.id)===pending.current);
    if(team){applying.current=true;callbacks.current.onOpen(team);}
  },[teams,teamId]);
  React.useEffect(()=>{
    const main=document.getElementById('nexlab-main-content');
    if(teamId){
      if(!previous.current)origin.current={main:main?.scrollTop||0,window:window.scrollY||0,trigger:document.activeElement};
      if(!applying.current&&read()!==teamId)try{
        const url=new URL(location.href);
        if(url.searchParams.get('nexlabTab')!=='equipes'){
          url.searchParams.set('nexlabTab','equipes');url.searchParams.delete(PARAM);
          history.pushState({...history.state,nexlabTab:'equipes'},'',url);
        }
        url.searchParams.set(PARAM,teamId);
        history.pushState({...history.state,nexlabTeamPage:teamId},'',url);
      }catch{}
      if(previous.current!==teamId)requestAnimationFrame(()=>{if(main)main.scrollTop=0;window.scrollTo(0,0);panelRef.current?.focus?.({preventScroll:true});});
      pending.current='';previous.current=teamId;
    }else if(previous.current){
      if(!applying.current&&read())try{const url=new URL(location.href);url.searchParams.delete(PARAM);const state={...history.state};delete state.nexlabTeamPage;history.replaceState(state,'',url);}catch{}
      previous.current=null;pending.current='';
      requestAnimationFrame(()=>{if(main)main.scrollTop=origin.current.main;window.scrollTo(0,origin.current.window);if(origin.current.trigger?.isConnected)origin.current.trigger.focus?.({preventScroll:true});});
    }
    applying.current=false;
  },[teamId]);
  return {back(){
    try{if(history.state?.nexlabTeamPage===teamId&&read()===teamId){history.back();return;}}catch{}
    callbacks.current.onClose();
  }};
}
