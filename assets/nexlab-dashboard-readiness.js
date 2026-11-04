(function(root){
  'use strict';
  const RPC='nexlab_get_dashboard_bundle_v02656';
  const REQUIRED_SECTIONS=['profiles','projects','teams','meetings','events','mural','activities'];
  const $=(id)=>document.getElementById(id);
  const escapeHtml=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  async function fetchText(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);return response.text();}
  function count(text,needle){return String(text).split(needle).length-1;}
  function render(result){
    const host=$('nexlab-dashboard-results'); if(!host)return;
    const rows=result.checks.map(item=>`<li class="${item.ok?'ok':'pending'}"><strong>${escapeHtml(item.label)}</strong><span>${item.ok?'Aprovado':'Pendente'}</span></li>`).join('');
    host.innerHTML=`<section class="summary ${result.ok?'ok':'pending'}"><h2>${result.ok?'Contrato técnico aprovado':'Contrato técnico incompleto'}</h2><p>${escapeHtml(result.message)}</p><p class="timestamp">${escapeHtml(new Date(result.checkedAt).toLocaleString('pt-BR'))}</p></section><ul>${rows}</ul>`;
  }
  async function run(){
    const identity=root.__NEXLAB_BUILD_IDENTITY__||{};
    const registry=root.__NEXLAB_RPC_REGISTRY__||{};
    const mainPath=identity.resources?.entry?.main||'assets/nexlab-runtime-app.js';
    const app=await fetchText(`./${mainPath}?validation=${Date.now()}`);
    const rpcMarker=`rpc("${RPC}"`;
    const checks=[
      {id:'registry',label:'RPC do Dashboard classificada explicitamente como leitura',ok:registry.classifyRpc?.(RPC)==='read'},
      {id:'single_rpc',label:'Uma única chamada consolidada do Dashboard no bundle principal',ok:count(app,rpcMarker)===1},
      {id:'date_range',label:'Período enviado por p_date_from e p_date_to com janela de 120 dias',ok:app.includes('p_date_from:dashboardFrom')&&app.includes('p_date_to:dashboardTo')&&/Date\.now\(\)\+120\*/.test(app)},
      {id:'sections',label:'Seções consolidadas de usuários, projetos, equipes, reuniões, eventos, mural e atividades',ok:REQUIRED_SECTIONS.every(name=>app.includes(`sections.${name}`))},
      {id:'failure_isolation',label:'Falhas por seção preservadas sem descartar todo o painel',ok:app.includes('bundle.failures')&&app.includes('serverFailures')&&app.includes('criticalFailures')&&app.includes('secondaryFailures')},
      {id:'metrics',label:'Métricas técnicas do bundle emitidas para diagnóstico',ok:app.includes('nexlab:dashboard-bundle-metrics')&&app.includes(`version:"${identity.version}"`)},
      {id:'runtime_paths',label:'Bundle ativo utiliza nomes neutros, sem artefatos históricos',ok:/assets\/nexlab-runtime-app\.js$/.test(mainPath)}
    ];
    const result={ok:checks.every(item=>item.ok),checks,checkedAt:new Date().toISOString(),version:identity.version||null,message:'Esta validação comprova o contrato do frontend. A resposta real do Supabase ainda depende de uma sessão autenticada após a publicação.'};
    root.__NEXLAB_DASHBOARD_TECHNICAL_VALIDATION__=result; render(result); return result;
  }
  root.nexlabRunDashboardTechnicalValidation=run;
  document.addEventListener('DOMContentLoaded',()=>{const button=$('nexlab-run-dashboard-check');button?.addEventListener('click',()=>run().catch(error=>render({ok:false,checkedAt:new Date().toISOString(),message:error.message,checks:[{label:'Execução da validação',ok:false}]})));run().catch(()=>{});},{once:true});
})(typeof window!=='undefined'?window:globalThis);
