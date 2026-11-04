/* NEXLAB Beta 0.26.82 — preferências globais de interface e acessibilidade. */
import { Ln as supabase } from './nexlab-runtime-vendor.js?v=app-beta-0-26-82-oficial-completo';

const STORAGE_KEY='nexlab:interface-preferences:v0.26.82';
const DEFAULTS=Object.freeze({text_size:'default',high_contrast:false,reduce_motion:false});
function normalize(value={}){return{ text_size:['default','large','xlarge'].includes(String(value.text_size||''))?String(value.text_size):'default', high_contrast:!!value.high_contrast, reduce_motion:!!value.reduce_motion };}
function apply(value,{persist=true,emit=true}={}){const settings=normalize(value);const root=document.documentElement;const fontSize=settings.text_size==='xlarge'?'125%':settings.text_size==='large'?'112.5%':'100%';root.dataset.nexlabTextSize=settings.text_size;root.dataset.nexlabHighContrast=settings.high_contrast?'true':'false';root.dataset.nexlabReduceMotion=settings.reduce_motion?'true':'false';root.style.setProperty('font-size',fontSize,'important');if(persist)try{localStorage.setItem(STORAGE_KEY,JSON.stringify(settings));}catch{}if(emit)try{window.dispatchEvent(new CustomEvent('nexlab:interface-preferences',{detail:settings}));}catch{}return settings;}
function readLocal(){try{return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'));}catch{return{...DEFAULTS};}}
window.__NEXLAB_APPLY_INTERFACE_PREFERENCES__=apply;
window.__NEXLAB_INTERFACE_PREFERENCES__=apply(readLocal(),{persist:false,emit:false});
async function sync(){try{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data,error}=await supabase.rpc('nexlab_get_interface_settings_v02682');if(error)throw error;const settings=normalize(data?.settings||{});window.__NEXLAB_INTERFACE_PREFERENCES__=apply(settings); }catch(error){console.warn('NEXLAB preferências de interface: usando cópia local.',error?.code||error?.message||error);}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void sync(),{once:true});else void sync();
window.addEventListener('nexlab:session-reset',()=>{window.__NEXLAB_INTERFACE_PREFERENCES__=apply(DEFAULTS);});
