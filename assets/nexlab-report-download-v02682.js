/* NexLab — animação dos cards associada ao fluxo real de exportação. */
import {g as React} from './nexlab-runtime-vendor.js?v=app-beta-0-26-82-oficial-completo';
const h=React.createElement;
export function DownloadIcon({size=16,className=''}){
  return h('svg',{
    width:size,height:size,viewBox:'0 0 24 24',preserveAspectRatio:'xMidYMid meet',
    className:'nxl-download-icon '+className,style:{'--nxl-download-size':`${size}px`},
    fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round',
    'aria-hidden':true,focusable:false
  },h('path',{d:'M12 3v12'}),h('path',{d:'m7 10 5 5 5-5'}),h('path',{d:'M5 17v4h14v-4'}));
}

const FINISH_MS=1000;
function reducedMotion(){return document.documentElement.dataset.nexlabReduceMotion==='true'||!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches}
function cancelTimers(r){clearTimeout(r.timer);clearTimeout(r.finishTimer)}
export function reportMfaSetupRequired(message){return Object.assign(new Error(message),{code:'NEXLAB_MFA_SETUP_REQUIRED'})}

// Let React paint the current stage before synchronous PDF/XLSX work begins.
// The fallback also lets exports continue when a background tab suspends RAF.
function nextPaint(){
  return new Promise(resolve=>{
    let frame=0,done=false;
    const finish=()=>{if(done)return;done=true;clearTimeout(timer);cancelAnimationFrame(frame);resolve()};
    const timer=setTimeout(finish,150);
    frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(finish)});
  });
}

export function useReportDownload(){
  const [state,setState]=React.useState(null);
  const ref=React.useRef({mounted:true,busy:false,sequence:0,timer:null,finishTimer:null});
  React.useEffect(()=>{
    ref.current.mounted=true;
    return()=>{const r=ref.current;r.mounted=false;r.sequence++;cancelTimers(r)};
  },[]);
  const clear=()=>{const r=ref.current;if(!r.busy){cancelTimers(r);r.sequence++;if(r.mounted)setState(null)}};
  function begin(scope,type){
    const r=ref.current;if(r.busy||!r.mounted)return null;
    cancelTimers(r);r.busy=true;const id=++r.sequence;
    let phase='preparing',handedOff=false;
    const publish=()=>{if(r.mounted&&r.sequence===id)setState({scope,type,phase})};
    publish();
    const dismissLater=()=>{clearTimeout(r.timer);r.timer=setTimeout(()=>{if(r.mounted&&r.sequence===id)setState(null)},2600)};
    const started=()=>{
      if(handedOff)return;
      handedOff=true;
      // The file has already been handed to the browser. This is a visual
      // completion, never a delay on the export or a simulated generation %.
      if(reducedMotion()){phase='complete';publish();return}
      phase='finishing';publish();
      r.finishTimer=setTimeout(()=>{
        if(!r.mounted||r.sequence!==id)return;
        phase='complete';publish();if(!r.busy)dismissLater();
      },FINISH_MS);
    };
    return {
      paint:nextPaint,
      async generate(){if(!handedOff){phase='generating';publish();await nextPaint()}},
      async run(action,mayCancel=false){
        phase='generating';publish();await nextPaint();
        const result=await action();
        if(!mayCancel||result!=null)started();
        return result;
      },
      async pdfSave(document,filename){await nextPaint();await document.save(filename,{returnPromise:true});started()},
      started,
      hasStarted:()=>handedOff,
      fail(){if(!handedOff){phase='error';publish()}},
      requireVerification(){if(!handedOff){phase='verification';publish()}},
      end(){
        if(!r.mounted||r.sequence!==id)return;r.busy=false;
        if(phase==='complete')dismissLater();
        else if(!['error','verification','finishing'].includes(phase))setState(null);
      }
    };
  }
  return {state,begin,clear,isBusy:()=>ref.current.busy};
}

export function reportMotionPhase(state,scope){return state?.scope===scope?state.phase:null}

function glyph(kind){
  const props={viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true};
  if(kind==='check')return h('svg',props,h('circle',{cx:12,cy:12,r:9}),h('path',{d:'m8 12 3 3 5-6'}));
  if(kind==='error')return h('svg',props,h('circle',{cx:12,cy:12,r:9}),h('path',{d:'M12 7v6m0 4h.01'}));
  return h(DownloadIcon,{size:24});
}

export function ReportDownloadOverlay({state,scope,title,icon,onRetry,onDismiss,onProfile,disabled=false}){
  if(!state||state.scope!==scope)return null;
  const complete=state.phase==='complete',finishing=state.phase==='finishing',verification=state.phase==='verification',error=state.phase==='error',busy=['preparing','generating'].includes(state.phase);
  const format=state.type==='pdf'?'PDF':'Excel';
  const message=complete||finishing?'Download iniciado':verification?'Ative a verificação em duas etapas':error?'Não foi possível gerar':state.phase==='preparing'?'Preparando relatório…':`Gerando ${format}…`;
  return h('div',{className:'nexlab-report-download-v02682 is-'+state.phase},
    busy&&h('div',{className:'report-download-sweep','aria-hidden':true}),
    finishing&&h('div',{className:'report-download-finish','aria-hidden':true}),
    h('div',{className:'report-download-caption','aria-hidden':true},icon,h('span',null,title),h('small',null,format)),
    h('div',{className:'report-download-body'},
      h('span',{className:'report-download-symbol'},glyph(complete?'check':error||verification?'error':'download')),
      h('span',{className:'report-download-message',role:'status','aria-live':'polite'},message),
      (complete||finishing)&&h('small',null,'Confira os downloads do navegador.'),
      busy&&h('div',{role:'progressbar','aria-label':`${message} ${title}`,className:'report-download-indeterminate'}),
      error&&h('div',{className:'report-download-error-actions'},
        h('button',{type:'button',disabled,onClick:()=>onRetry(scope,state.type)},'Tentar novamente'),
        h('button',{type:'button',disabled,onClick:onDismiss},'Voltar')),
      verification&&h('div',{className:'report-download-error-actions'},
        h('button',{type:'button',disabled,onClick:()=>{onDismiss();onProfile?.()}},'Ir para Meu Perfil'),
        h('button',{type:'button',disabled,onClick:onDismiss},'Voltar'))));
}
