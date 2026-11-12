import {Ln as supabase} from './nexlab-runtime-vendor.js?v=app-beta-0-26-82-oficial-modo-de-uso';
const labels={admin:'Administrador',coordenador:'Coordenador',bolsista:'Bolsista',voluntario:'Voluntário',coworking_junior:'Coworking Júnior'};
let current=null,updateProfile=null,choices=[],lastIdentity='',inFlight=false;
function notify(){window.dispatchEvent(new CustomEvent('nexlab:usage-mode-changed'));}
function accept(data,userId){if(!data?.ok||data.profile?.id!==userId||current?.id!==userId)throw new Error('Não foi possível confirmar o perfil atualizado.');choices=Array.isArray(data.profiles)?data.profiles:[];current=data.profile;updateProfile?.({...data.profile});notify();return usageMode.getState();}
export function bindUsageMode(profile,update){current=profile||null;updateProfile=update;const identity=profile?[profile.id,profile.role,profile.official_role,profile.ativo].join(':'):'';if(identity!==lastIdentity){lastIdentity=identity;if(!profile)choices=[];queueMicrotask(notify);}}
export const usageMode={
 getState(){if(!current?.id)return null;const official=current.official_role||current.role;return {officialRole:official,mode:current.role,name:current.nome||current.name||'Minha conta',avatarUrl:current.avatar_url||null,label:labels[current.role]||current.role,eligible:current.ativo!==false&&current.cadastro_completo===true&&['approved','auto_approved'].includes(current.role_request_status)&&['admin','coordenador'].includes(official),profiles:choices};},
 async refresh(){const id=current?.id;if(!id)throw new Error('Entre novamente para consultar seu perfil.');const {data,error}=await supabase.rpc('nexlab_get_usage_mode_v1');if(error)throw error;return accept(data,id);},
 async apply(mode){if(inFlight)throw new Error('Aguarde a troca de modo atual.');const before=this.getState(),id=current?.id;if(!before?.eligible)throw new Error('A troca de modo não está disponível para seu perfil oficial.');inFlight=true;try{const {data,error}=await supabase.rpc('nexlab_set_usage_mode_v1',{p_mode:mode,p_expected_mode:before.mode});if(error)throw error;const next=accept(data,id);window.dispatchEvent(new CustomEvent('nexlab:usage-mode-applied'));return next;}finally{inFlight=false;}},
 navigate(tab){const url=new URL(location.href);url.searchParams.set('nexlabTab',tab);history.replaceState({...history.state,nexlabTab:tab},'',url);window.dispatchEvent(new CustomEvent('nexlab:navigate-record',{detail:{tabId:tab}}));},
 async signOut(){const {error}=await supabase.auth.signOut();if(error)throw error;current=null;choices=[];notify();}
};
