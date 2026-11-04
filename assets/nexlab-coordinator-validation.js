(function(){
  'use strict';

  const VERSION='0.26.82';
  const CONFIG=window.__NEXLAB_CONFIG__?.assert?.()||(()=>{throw new Error('Configuração central do NEXLAB não carregada.');})();
  const PROJECT_REF=CONFIG.projectRef;
  const BASE=CONFIG.supabaseUrl;
  const KEY=CONFIG.supabaseAnonKey;

  const style=document.createElement('style');
  style.textContent=`
    #nexlab-validation-trigger,#nexlab-coordinator-preview-trigger{position:fixed;right:18px;bottom:86px;z-index:10045;border:0;border-radius:999px;background:#0b2a63;color:#fff;padding:11px 15px;box-shadow:0 14px 38px rgba(15,23,42,.3);font:800 12px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;display:flex;gap:8px;align-items:center}
    #nexlab-validation-trigger:hover,#nexlab-coordinator-preview-trigger:hover{background:#123a7a}#nexlab-coordinator-preview-trigger{bottom:134px;background:#f97316}#nexlab-coordinator-preview-trigger:hover{background:#ea580c}.nexlab-validation-overlay{position:fixed;inset:0;z-index:10110;background:rgba(2,6,23,.72);display:grid;place-items:center;padding:18px}
    .nexlab-validation-dialog{width:min(1180px,100%);max-height:min(94vh,980px);overflow:auto;background:#fff;border-radius:24px;box-shadow:0 30px 90px rgba(2,6,23,.4);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a}
    .nexlab-validation-head{padding:22px 24px 18px;background:linear-gradient(135deg,#0b2a63,#111827);color:#fff;display:flex;justify-content:space-between;gap:18px;align-items:flex-start;position:sticky;top:0;z-index:4}
    .nexlab-validation-head h2{font-size:1.3125rem;margin:0 0 5px}.nexlab-validation-head p{margin:0;color:#cbd5e1;font-size:0.75rem;line-height:1.5;max-width:820px}.nexlab-validation-close{border:0;background:rgba(255,255,255,.14);color:#fff;width:36px;height:36px;border-radius:12px;font-size:1.25rem;cursor:pointer}
    .nexlab-validation-body{padding:22px 24px;display:grid;gap:16px}.nexlab-validation-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.nexlab-validation-btn{border:0;border-radius:12px;padding:11px 15px;font:800 12px/1 system-ui;cursor:pointer}.nexlab-validation-btn:disabled{opacity:.48;cursor:not-allowed}.nexlab-validation-primary{background:#0b2a63;color:#fff}.nexlab-validation-secondary{background:#e2e8f0;color:#0f172a}.nexlab-validation-orange{background:#f97316;color:#fff}
    .nexlab-validation-note{border:1px solid #dbe4ef;background:#f8fafc;border-radius:15px;padding:13px 15px;color:#475569;font-size:0.6875rem;line-height:1.55}.nexlab-validation-note.success{border-color:#86efac;background:#f0fdf4;color:#166534}.nexlab-validation-note.warning{border-color:#fdba74;background:#fff7ed;color:#9a3412}.nexlab-validation-note.error{border-color:#fecaca;background:#fef2f2;color:#b91c1c}
    .nexlab-validation-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.nexlab-validation-summary div{border:1px solid #dbe4ef;background:#f8fafc;border-radius:15px;padding:12px}.nexlab-validation-summary strong{display:block;font-size:1.25rem;color:#0b2a63}.nexlab-validation-summary span{font-size:0.5625rem;color:#64748b}
    .nexlab-validation-list{display:grid;gap:12px}.nexlab-validation-card{border:1px solid #dbe4ef;border-radius:18px;background:#fff;overflow:hidden}.nexlab-validation-card-head{padding:15px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.nexlab-validation-card-head h3{margin:0 0 4px;font-size:0.875rem}.nexlab-validation-card-head p{margin:0;color:#64748b;font-size:0.625rem;line-height:1.45}.nexlab-validation-state{border-radius:999px;padding:6px 9px;font:900 9px/1 system-ui;white-space:nowrap;background:#e2e8f0;color:#475569}.nexlab-validation-state.approved{background:#dcfce7;color:#166534}.nexlab-validation-state.adjustment{background:#ffedd5;color:#9a3412}.nexlab-validation-state.blocking{background:#fee2e2;color:#991b1b}
    .nexlab-validation-card-body{padding:15px 16px;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.75fr);gap:16px}.nexlab-validation-steps{margin:8px 0 0;padding-left:20px;color:#334155;font-size:0.625rem;line-height:1.55}.nexlab-validation-expected{margin-top:12px;border-left:3px solid #0b2a63;padding:8px 10px;background:#f8fafc;border-radius:0 10px 10px 0;font-size:0.625rem;color:#334155}.nexlab-validation-form{display:grid;gap:9px}.nexlab-validation-choice{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.nexlab-validation-choice button{border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:9px 6px;font:800 9px/1.2 system-ui;cursor:pointer}.nexlab-validation-choice button.is-active[data-verdict="approved"]{background:#dcfce7;border-color:#4ade80;color:#166534}.nexlab-validation-choice button.is-active[data-verdict="adjustment"]{background:#ffedd5;border-color:#fb923c;color:#9a3412}.nexlab-validation-choice button.is-active[data-verdict="blocking"]{background:#fee2e2;border-color:#f87171;color:#991b1b}.nexlab-validation-form textarea,.nexlab-promotion-grid input,.nexlab-promotion-grid textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:11px;padding:10px 11px;font:11px/1.4 system-ui;color:#0f172a;background:#fff}.nexlab-validation-form textarea,.nexlab-promotion-grid textarea{min-height:75px;resize:vertical}.nexlab-validation-form label,.nexlab-promotion-grid label{display:grid;gap:5px;font-size:0.625rem;font-weight:800;color:#475569}
    .nexlab-validation-reviews{display:grid;gap:5px;margin-top:10px}.nexlab-validation-review{font-size:0.5625rem;color:#64748b;border-top:1px dashed #dbe4ef;padding-top:6px}.nexlab-promotion{border:1px solid #cbd5e1;border-radius:18px;padding:16px;background:#f8fafc;display:grid;gap:12px}.nexlab-promotion h3{margin:0;font-size:0.9375rem}.nexlab-promotion-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.nexlab-promotion-grid .full{grid-column:1/-1}.nexlab-validation-hash{display:block;word-break:break-all;border-radius:11px;background:#0f172a;color:#e2e8f0;padding:10px;font:9px/1.5 ui-monospace,monospace}
    @media(max-width:760px){#nexlab-validation-trigger,#nexlab-coordinator-preview-trigger{right:14px}#nexlab-validation-trigger{bottom:78px}#nexlab-coordinator-preview-trigger{bottom:126px}.nexlab-validation-overlay{padding:0}.nexlab-validation-dialog{height:100%;max-height:100vh;border-radius:0}.nexlab-validation-head,.nexlab-validation-body{padding-left:16px;padding-right:16px}.nexlab-validation-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.nexlab-validation-card-body{grid-template-columns:1fr}.nexlab-validation-choice{grid-template-columns:1fr}.nexlab-promotion-grid{grid-template-columns:1fr}.nexlab-promotion-grid .full{grid-column:auto}}
  `;
  document.head.appendChild(style);

  function authToken(){return CONFIG.getAccessToken();}

  async function api(path,options={}){
    const token=authToken();if(!token)throw new Error('Sessão não encontrada. Entre novamente no NEXLAB.');
    const method=String(options.method||'GET').toUpperCase();const rpcMatch=String(path||'').match(/\/rpc\/([^/?#]+)/i);const rpcName=rpcMatch?decodeURIComponent(rpcMatch[1]):'';const readOperation=method==='GET'||globalThis.__NEXLAB_RPC_REGISTRY__?.classifyRpc?.(rpcName)==='read';const attempts=readOperation?2:1;let lastError=null;
    for(let attempt=0;attempt<attempts;attempt+=1){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);try{const response=await fetch(`${BASE}${path}`,{...options,headers:{apikey:KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})},cache:'no-store',signal:controller.signal});let data=null;try{data=await response.json();}catch{}if(!response.ok){const error=new Error(data?.message||data?.error_description||data?.hint||`Falha HTTP ${response.status}.`);error.status=response.status;throw error;}return data;}catch(error){lastError=error;const transient=error?.name==='AbortError'||[0,429,502,503,504].includes(Number(error?.status||0));if(attempt+1>=attempts||!transient)break;await new Promise(resolve=>setTimeout(resolve,450*(attempt+1)));}finally{clearTimeout(timer);}}
    if(lastError?.name==='AbortError')throw new Error('A consulta demorou mais de 12 segundos. Verifique a conexão e tente novamente.');throw lastError||new Error('Não foi possível concluir a consulta.');
  }
  function rpc(name,payload={}){return api(`/rest/v1/rpc/${encodeURIComponent(name)}`,{method:'POST',body:JSON.stringify(payload)});}
  function dialog(title,description){
    const overlay=document.createElement('div');overlay.className='nexlab-validation-overlay';
    const panel=document.createElement('section');panel.className='nexlab-validation-dialog';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.innerHTML='<header class="nexlab-validation-head"><div><h2></h2><p></p></div><button class="nexlab-validation-close" type="button" aria-label="Fechar">×</button></header><div class="nexlab-validation-body"></div>';
    panel.querySelector('h2').textContent=title;panel.querySelector('p').textContent=description;overlay.appendChild(panel);document.body.appendChild(overlay);
    const close=()=>overlay.remove();panel.querySelector('.nexlab-validation-close').onclick=close;overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
    return {overlay,panel,body:panel.querySelector('.nexlab-validation-body'),close};
  }
  function note(text,type=''){const box=document.createElement('div');box.className=`nexlab-validation-note${type?` ${type}`:''}`;box.textContent=text;return box;}
  function download(name,text,type='application/json'){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1600);}
  async function sha256(text){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
  function verdictLabel(value){return value==='approved'?'Aprovado':value==='adjustment'?'Solicita ajuste':value==='blocking'?'Bloqueio':'Pendente';}
  function formatDate(value){if(!value)return'—';try{return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));}catch{return String(value);}}
  function validationScript(state){return {format:'NEXLAB_COORDINATOR_VALIDATION_SCRIPT',format_version:'1.0',app_version:VERSION,generated_at:new Date().toISOString(),cycle:state.cycle,items:state.items.map(item=>({item_key:item.item_key,title:item.title,description:item.description,test_steps:item.test_steps,expected_result:item.expected_result,required:item.required}))};}

  async function openValidation(options={}){
    const {body}=dialog('Validação dos coordenadores','Roteiro oficial de homologação da Beta 0.26.82. Cada item obrigatório precisa de aprovação registrada por Coordenador.');
    const loading=note('Carregando ciclo de validação...');body.appendChild(loading);
    try{
      let state=await rpc('nexlab_get_validation_cycle_v02657');loading.remove();
      const topActions=document.createElement('div');topActions.className='nexlab-validation-actions';topActions.innerHTML='<button class="nexlab-validation-btn nexlab-validation-secondary" data-download type="button">Baixar roteiro</button><button class="nexlab-validation-btn nexlab-validation-secondary" data-refresh type="button">Atualizar</button>';body.appendChild(topActions);
      const status=document.createElement('div');body.appendChild(status);
      const summary=document.createElement('div');summary.className='nexlab-validation-summary';body.appendChild(summary);
      const list=document.createElement('div');list.className='nexlab-validation-list';body.appendChild(list);
      const promotion=document.createElement('section');promotion.className='nexlab-promotion';body.appendChild(promotion);

      topActions.querySelector('[data-download]').onclick=()=>download(`NEXLAB_ROTEIRO_VALIDACAO_${VERSION.replaceAll('.','_')}.json`,JSON.stringify(validationScript(state),null,2));
      topActions.querySelector('[data-refresh]').onclick=async event=>{const button=event.currentTarget;button.disabled=true;status.replaceChildren(note('Atualizando ciclo de validação...'));try{state=await rpc('nexlab_get_validation_cycle_v02657');render();}catch(error){status.replaceChildren(note(error.message||'Falha ao atualizar. Tente novamente.','error'));}finally{button.disabled=false;}};

      function renderSummary(){
        const s=state.summary||{};const t=s.technical||{};
        summary.innerHTML=`<div><strong>${s.approved_total||0}/${s.required_total||0}</strong><span>itens aprovados</span></div><div><strong>${s.coordinator_reviewers||0}</strong><span>Coordenadores revisores</span></div><div><strong>${s.adjustment_items||0}</strong><span>itens com ajustes</span></div><div><strong>${t.matrix_actual||0}/${t.matrix_expected||0}</strong><span>matriz de permissões</span></div><div><strong>${Number(t.active_test_runs||0)+Number(t.test_profiles||0)+Number(t.test_records||0)}</strong><span>resíduos de teste ativos</span></div>`;
        if((s.active_coordinators||0)===0)status.replaceChildren(note('Ainda não existe um perfil Coordenador ativo. O roteiro está pronto, mas a promoção continuará bloqueada até pelo menos um Coordenador validar todos os itens.','warning'));
        else if(s.ready_for_promotion)status.replaceChildren(note('Todos os itens obrigatórios e verificações técnicas foram aprovados. A promoção seletiva pode ser preparada.','success'));
        else status.replaceChildren(note(`Validação em andamento: ${s.pending_total||0} item(ns) ainda não aprovado(s).`,s.adjustment_items?'warning':''));
      }

      function renderItems(){
        list.innerHTML='';
        for(const item of state.items||[]){
          const card=document.createElement('article');card.className='nexlab-validation-card';
          const my=item.my_review||{};let selected=my.verdict||'';
          const overall=item.approved?'approved':Number(item.negative_reviews||0)>0?'adjustment':'';
          card.innerHTML='<header class="nexlab-validation-card-head"><div><h3></h3><p></p></div><span class="nexlab-validation-state"></span></header><div class="nexlab-validation-card-body"><div><strong>Etapas de teste</strong><ol class="nexlab-validation-steps"></ol><div class="nexlab-validation-expected"></div><div class="nexlab-validation-reviews"></div></div><div class="nexlab-validation-form"><div class="nexlab-validation-choice"><button type="button" data-verdict="approved">Aprovar</button><button type="button" data-verdict="adjustment">Solicitar ajuste</button><button type="button" data-verdict="blocking">Bloquear</button></div><label>Observações<textarea placeholder="Obrigatório para ajuste ou bloqueio"></textarea></label><button type="button" class="nexlab-validation-btn nexlab-validation-primary" data-save>Salvar validação</button><div data-message></div></div></div>';
          card.querySelector('h3').textContent=item.title;card.querySelector('.nexlab-validation-card-head p').textContent=item.description;
          const stateChip=card.querySelector('.nexlab-validation-state');stateChip.textContent=item.approved?`APROVADO (${item.coordinator_approvals})`:Number(item.negative_reviews||0)>0?'AJUSTE PENDENTE':'PENDENTE';if(overall)stateChip.classList.add(overall);
          const steps=card.querySelector('.nexlab-validation-steps');for(const step of item.test_steps||[]){const li=document.createElement('li');li.textContent=step;steps.appendChild(li);}
          card.querySelector('.nexlab-validation-expected').textContent=`Resultado esperado: ${item.expected_result}`;
          const reviews=card.querySelector('.nexlab-validation-reviews');for(const review of item.reviews||[]){const row=document.createElement('div');row.className='nexlab-validation-review';row.textContent=`${review.reviewer_name||'Revisor'} (${review.reviewer_role}) — ${verdictLabel(review.verdict)} — ${formatDate(review.reviewed_at)}${review.notes?` — ${review.notes}`:''}`;reviews.appendChild(row);}
          const textarea=card.querySelector('textarea');textarea.value=my.notes||'';const choices=[...card.querySelectorAll('[data-verdict]')];
          const sync=()=>choices.forEach(button=>button.classList.toggle('is-active',button.dataset.verdict===selected));sync();choices.forEach(button=>button.onclick=()=>{selected=button.dataset.verdict;sync();});
          const save=card.querySelector('[data-save]'),message=card.querySelector('[data-message]');
          save.onclick=async()=>{
            if(!selected){message.replaceChildren(note('Escolha um resultado para este item.','error'));return;}
            save.disabled=true;message.replaceChildren(note('Salvando validação...'));
            try{state=await rpc('nexlab_submit_validation_review_v02657',{p_item_key:item.item_key,p_verdict:selected,p_notes:textarea.value.trim()||null,p_evidence:{app_version:VERSION,user_agent:navigator.userAgent,viewport:`${innerWidth}x${innerHeight}`}});render();}
            catch(error){message.replaceChildren(note(error.message||'Falha ao salvar.','error'));save.disabled=false;}
          };
          list.appendChild(card);
        }
      }

      function renderPromotion(){
        const reviewer=state.current_reviewer||{};const s=state.summary||{};const existing=state.promotion_manifest;
        promotion.innerHTML='<h3>Promoção seletiva para o repositório oficial</h3>';
        if(!reviewer.can_promote){promotion.appendChild(note('Somente Administradores podem gerar ou confirmar a promoção. Coordenadores registram as validações acima.'));return;}
        const description=note(s.ready_for_promotion?'Todos os itens obrigatórios do pacote foram aprovados. O manifesto autoriza a promoção integral desta candidata; promoção parcial não é permitida.':'A promoção está bloqueada até todas as aprovações e verificações técnicas serem concluídas.',s.ready_for_promotion?'success':'warning');promotion.appendChild(description);
        const grid=document.createElement('div');grid.className='nexlab-promotion-grid';grid.innerHTML='<label class="full">Observações da promoção<textarea data-notes placeholder="Resumo opcional para o histórico"></textarea></label><div class="full nexlab-validation-actions"><button type="button" class="nexlab-validation-btn nexlab-validation-orange" data-generate>Gerar manifesto seletivo</button></div><div class="full" data-output></div>';promotion.appendChild(grid);
        const generate=grid.querySelector('[data-generate]'),output=grid.querySelector('[data-output]');generate.disabled=!s.ready_for_promotion;
        generate.onclick=async()=>{generate.disabled=true;output.replaceChildren(note('Gerando manifesto de promoção...'));try{const result=await rpc('nexlab_generate_promotion_manifest_v02657',{p_notes:grid.querySelector('[data-notes]').value.trim()||null});const canonical=JSON.stringify(result.manifest);const hash=await sha256(canonical);download(`NEXLAB_PROMOCAO_OFICIAL_${VERSION.replaceAll('.','_')}.json`,JSON.stringify({...result,sha256:hash},null,2));state=await rpc('nexlab_get_validation_cycle_v02657');render();}catch(error){output.replaceChildren(note(error.message||'Falha ao gerar manifesto.','error'));generate.disabled=!s.ready_for_promotion;}};
        const manifest=existing||state.promotion_manifest;if(manifest){
          const confirmation=document.createElement('div');confirmation.className='nexlab-promotion-grid';confirmation.innerHTML='<div class="full nexlab-validation-note success">Manifesto preparado. Após publicar os arquivos no repositório oficial, registre o repositório e o SHA do commit.</div><label>Repositório<input data-repository placeholder="proprietário/nome"></label><label>SHA do commit<input data-sha placeholder="abcdef123456..."></label><label class="full">Observações da publicação<textarea data-publication-notes></textarea></label><div class="full nexlab-validation-actions"><button type="button" class="nexlab-validation-btn nexlab-validation-primary" data-confirm>Confirmar publicação</button></div><div class="full" data-confirm-output></div>';promotion.appendChild(confirmation);
          confirmation.querySelector('[data-repository]').value=manifest.repository||'';confirmation.querySelector('[data-sha]').value=manifest.commit_sha||'';
          const confirm=confirmation.querySelector('[data-confirm]');if(manifest.status==='published'){confirm.disabled=true;confirm.textContent='Publicação já confirmada';}
          confirm.onclick=async()=>{confirm.disabled=true;const out=confirmation.querySelector('[data-confirm-output]');out.replaceChildren(note('Confirmando publicação...'));try{await rpc('nexlab_confirm_official_repository_publish_v02657',{p_manifest_id:manifest.id,p_repository:confirmation.querySelector('[data-repository]').value.trim(),p_commit_sha:confirmation.querySelector('[data-sha]').value.trim(),p_notes:confirmation.querySelector('[data-publication-notes]').value.trim()||null});state=await rpc('nexlab_get_validation_cycle_v02657');render();}catch(error){out.replaceChildren(note(error.message||'Falha ao confirmar publicação.','error'));confirm.disabled=false;}};
        }
      }

      function render(){renderSummary();renderItems();renderPromotion();if(options.focusPromotion)setTimeout(()=>promotion.scrollIntoView({behavior:'smooth',block:'start'}),80);}
      render();
    }catch(error){loading.className='nexlab-validation-note error';loading.textContent=error.message||'Falha ao abrir a validação.';const retry=document.createElement('button');retry.type='button';retry.className='nexlab-validation-btn nexlab-validation-secondary';retry.textContent='Tentar novamente';retry.onclick=()=>{document.querySelector('.nexlab-validation-overlay')?.remove();openValidation(options);};body.appendChild(retry);}
  }

  function openPromotion(){return openValidation({focusPromotion:true});}
  function openProfilePreview(){
    let attempts=0;
    const open=()=>{
      const handler=window.NexlabAdminHomologation?.openProfilePreview;
      if(typeof handler==='function'){handler();return;}
      attempts+=1;
      if(attempts<20)setTimeout(open,150);
      else alert('A ferramenta de visualização ainda não carregou. Atualize a página e tente novamente.');
    };
    open();
  }
  function removeCoordinatorUi(){document.getElementById('nexlab-validation-trigger')?.remove();document.getElementById('nexlab-coordinator-preview-trigger')?.remove();document.querySelectorAll('.nexlab-validation-overlay').forEach(node=>node.remove());}
  function mount(roleHint=''){
    // Ferramentas de homologação permanecem internas. Nenhum atalho flutuante é
    // exposto na interface pública do NEXLAB, inclusive para Coordenadores.
    removeCoordinatorUi();
  }

  window.NexlabCoordinatorValidation=Object.freeze({version:VERSION,open:openValidation,openValidation,openPromotion,openProfilePreview,load:()=>rpc('nexlab_get_validation_cycle_v02657')});
  window.addEventListener('nexlab:administrative-ui-synced',event=>mount(event.detail?.role||''));window.addEventListener('nexlab:auth-ready',()=>setTimeout(()=>mount(window.NexlabAdministrativeUiGuard?.getState?.().role||''),700));window.addEventListener('nexlab:session-reset',()=>removeCoordinatorUi());setTimeout(()=>mount(window.NexlabAdministrativeUiGuard?.getState?.().role||''),2200);
})();
