import { g as React, S as ReactDOM, Ln as supabase } from "./nexlab-runtime-vendor.js?v=app-beta-0-26-82-icones-acesso-rapido";
const CATEGORIES = { operational: [["projects", "Projetos"], ["teams", "Equipes"], ["asset_changes", "Altera\xE7\xF5es de patrim\xF4nio"], ["asset_movements", "Movimenta\xE7\xF5es de patrim\xF4nio"], ["asset_maintenance", "Manuten\xE7\xF5es conclu\xEDdas"], ["stock", "Movimenta\xE7\xF5es de estoque"], ["bookings", "Reservas e reuni\xF5es"], ["feedback", "Feedbacks"], ["users", "V\xEDnculos de usu\xE1rios"], ["permissions", "Permiss\xF5es"], ["reports", "Exporta\xE7\xF5es de relat\xF3rios"], ["activities", "Atividades operacionais"]], technical: [["system", "Eventos do sistema"], ["errors", "Ocorr\xEAncias de erros"], ["cron", "Execu\xE7\xF5es conclu\xEDdas de rotinas"], ["backup_expired", "Backups expirados"]] };
const DEFAULT_CATEGORY = { projetos: "projects", planejamentos: "projects", equipes: "teams", inventario: "asset_movements", estoque: "stock", patrimonio: "asset_movements", reserva: "bookings", feedback: "feedback", participantes: "users", permissoes: "permissions", relatorios: "reports" };
const dateText = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Data indispon\xEDvel" : d.toLocaleString("pt-BR", { timeZone: "America/Fortaleza" });
};
async function rpc(name, payload) {
  const { data, error } = await supabase.rpc(name, payload);
  if (error) throw error;
  if (!data?.ok) throw Error("N\xE3o foi poss\xEDvel concluir a opera\xE7\xE3o.");
  return data;
}
function historyFailure(error, phase) {
  const timeout = error?.code === '57014' || /statement timeout|canceling statement|timed? ?out/i.test(error?.message || '');
  if (phase === 'refresh') return timeout
    ? 'A exclusão foi concluída, mas a atualização da lista excedeu o tempo limite. Clique em “Atualizar lista”.'
    : 'A exclusão foi concluída, mas não foi possível atualizar a lista. Clique em “Atualizar lista”.';
  if (timeout) return phase === 'delete'
    ? 'A exclusão não foi concluída porque o banco excedeu o tempo limite. Atualize a lista antes de tentar novamente.'
    : 'A consulta do histórico excedeu o tempo limite. Clique em “Atualizar lista” para tentar novamente.';
  if (phase === 'delete' && /failed to fetch|fetcherror|network|aborterror|gateway|conex[aã]o/i.test(error?.message || ''))
    return 'Não foi possível confirmar o resultado da exclusão. Atualize a lista antes de tentar novamente.';
  return error?.message || (phase === 'delete' ? 'Não foi possível excluir.' : 'Não foi possível carregar o histórico.');
}
function HistoryIcon({ name, className = "" }) {
  const paths = { shield: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" }), /* @__PURE__ */ React.createElement("path", { d: "m8 12 3 3 5-6" })), search: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("circle", { cx: "10.5", cy: "10.5", r: "6.5" }), /* @__PURE__ */ React.createElement("path", { d: "m16 16 4 4" })), inbox: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M4 5h16l2 12v3H2v-3L4 5Z" }), /* @__PURE__ */ React.createElement("path", { d: "M2 14h6l2 3h4l2-3h6" })), database: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("ellipse", { cx: "10", cy: "5", rx: "7", ry: "3" }), /* @__PURE__ */ React.createElement("path", { d: "M3 5v12c0 4 14 4 14 0V5M3 11c0 4 14 4 14 0" }), /* @__PURE__ */ React.createElement("path", { d: "M17 14h6m-5 0v7h4v-7" })), close: /* @__PURE__ */ React.createElement("path", { d: "m6 6 12 12M18 6 6 18" }) };
  return /* @__PURE__ */ React.createElement("svg", { className, width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, paths[name] || paths.shield);
}
function HistoryView({ bulkAction=null, listUnavailable=false, embedded=false, totalKnown=true, dialogRef, close, busy, mode, setMode, group, switchGroup, category, setCategory, search, setSearch, before, setBefore, notice, error, confirmation, setConfirmation, analysis, selected, setSelected, reason, setReason, word, setWord, cancel, execute, categoryLabel, selectionBox, all, loading, data, current, pages, page, setPage, load, analyze }) {
  return /* @__PURE__ */ React.createElement(embedded ? "section" : "dialog", { ref: dialogRef, className: "nxl-history-dialog", "data-history-group": group, "aria-label": "Gerenciar hist\xF3ricos e limpeza manual", onCancel: (e) => {
    e.preventDefault();
    close();
  }, onClick: (e) => {
    if (!embedded && e.target === e.currentTarget) close();
  } }, /* @__PURE__ */ React.createElement("header", null, /* @__PURE__ */ React.createElement("h2", null, "Hist\xF3ricos e limpeza manual"), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-label": "Fechar gerenciamento de hist\xF3ricos", onClick: close, disabled: busy }, /* @__PURE__ */ React.createElement(HistoryIcon, { name: "close" }))), /* @__PURE__ */ React.createElement("div", { className: "nxl-history-body" }, /* @__PURE__ */ React.createElement("div", { className: "nxl-history-topbar" }, /* @__PURE__ */ React.createElement("nav", { className: "nxl-history-tabs", "aria-label": "Ferramentas de manuten\xE7\xE3o" }, /* @__PURE__ */ React.createElement("button", { type: "button", "aria-pressed": mode === "history", onClick: () => setMode("history"), disabled: busy || !!confirmation }, "Hist\xF3ricos"), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-pressed": mode === "cleanup", onClick: () => setMode("cleanup"), disabled: busy || !!confirmation }, "Registros exclu\xEDdos")), mode === "history" && !confirmation && /* @__PURE__ */ React.createElement("div", { className: "nxl-history-tabs nxl-history-groups", role: "group", "aria-label": "Tipo de hist\xF3rico" }, /* @__PURE__ */ React.createElement("button", { type: "button", "aria-pressed": group === "operational", onClick: () => switchGroup("operational") }, "Operacionais"), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-pressed": group === "technical", onClick: () => switchGroup("technical") }, "T\xE9cnicos"))), notice && /* @__PURE__ */ React.createElement("p", { className: "nxl-history-success", role: "status" }, notice), error && /* @__PURE__ */ React.createElement("p", { className: "nxl-history-error", role: "alert" }, error), confirmation ? /* @__PURE__ */ React.createElement("section", { className: "nxl-history-confirm", "aria-label": "Confirmar exclus\xE3o manual" }, /* @__PURE__ */ React.createElement("h3", null, confirmation === "cleanup" ? "Confirmar limpeza dos res\xEDduos?" : "Excluir os hist\xF3ricos selecionados?"), /* @__PURE__ */ React.createElement("p", null, confirmation === "cleanup" ? `${analysis.total} refer\xEAncias de registros j\xE1 exclu\xEDdos e ${analysis.related_history} registros relacionados de hist\xF3rico foram identificados.` : `${selected.length} registros de \u201C${categoryLabel}\u201D ser\xE3o exclu\xEDdos permanentemente. Os registros dos m\xF3dulos continuam preservados.`), confirmation === "delete" && /* @__PURE__ */ React.createElement("label", null, "Motivo da exclus\xE3o", /* @__PURE__ */ React.createElement("textarea", { "aria-label": "Motivo da exclus\xE3o", value: reason, onChange: (e) => setReason(e.target.value), minLength: 10, maxLength: 300, disabled: busy, placeholder: "Descreva o motivo, com pelo menos 10 caracteres" })), /* @__PURE__ */ React.createElement("label", null, "Digite ", confirmation === "cleanup" ? "LIMPAR" : "EXCLUIR", " para confirmar", /* @__PURE__ */ React.createElement("input", { "aria-label": "Digite " + (confirmation === "cleanup" ? "LIMPAR" : "EXCLUIR") + " para confirmar", value: word, onChange: (e) => setWord(e.target.value), autoComplete: "off", disabled: busy })), /* @__PURE__ */ React.createElement("div", { className: "nxl-history-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", ref: cancel, onClick: () => setConfirmation(null), disabled: busy }, "Cancelar"), /* @__PURE__ */ React.createElement("button", { className: "is-danger", type: "button", onClick: execute, disabled: busy || word !== (confirmation === "cleanup" ? "LIMPAR" : "EXCLUIR") || confirmation === "delete" && reason.trim().length < 10 }, busy ? "Excluindo\u2026" : confirmation === "cleanup" ? "Limpar res\xEDduos" : "Excluir selecionados"))) : mode === "history" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "nxl-history-filters" }, /* @__PURE__ */ React.createElement("label", null, "Hist\xF3rico", /* @__PURE__ */ React.createElement("select", { "aria-label": "Hist\xF3rico", value: category, onChange: (e) => setCategory(e.target.value) }, CATEGORIES[group].map(([id, label]) => /* @__PURE__ */ React.createElement("option", { key: id, value: id }, label)))), /* @__PURE__ */ React.createElement("label", null, "Pesquisar", /* @__PURE__ */ React.createElement("span", { className: "nxl-history-search" }, /* @__PURE__ */ React.createElement(HistoryIcon, { name: "search" }), /* @__PURE__ */ React.createElement("input", { type: "search", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Pesquisar no hist\xF3rico" }))), /* @__PURE__ */ React.createElement("label", null, "At\xE9 o dia", /* @__PURE__ */ React.createElement("input", { type: "date", value: before, onChange: (e) => setBefore(e.target.value) }))), /* @__PURE__ */ React.createElement("p", { className: "nxl-history-note" }, /* @__PURE__ */ React.createElement(HistoryIcon, { name: "shield" }), /* @__PURE__ */ React.createElement("span", null, group === "technical" ? (category === "backup_expired" ? "A lista contém somente registros de backups expirados, sem restaurações vinculadas ou processamento em andamento. A exclusão preserva os arquivos de backup." : category === "cron" ? "Execuções mais recentes pela ordem de registro. Rotinas em execução ficam preservadas." : "A seleção técnica é independente da operacional. A auditoria de segurança é protegida contra exclusão.") : "A exclus\xE3o remove apenas os hist\xF3ricos selecionados. Manuten\xE7\xF5es em andamento ficam preservadas.")), bulkAction, /* @__PURE__ */ React.createElement("div", { className: "nxl-history-selection" }, /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("input", { ref: selectionBox, type: "checkbox", checked: all, disabled: loading || listUnavailable || !data.rows.length, onChange: (e) => setSelected(e.target.checked ? data.rows.map(({ id, fingerprint }) => ({ id, fingerprint })) : []) }), `Selecionar os ${data.rows.length} registros desta página`), /* @__PURE__ */ React.createElement("button", { className: "is-danger", type: "button", disabled: !selected.length || loading || listUnavailable, onClick: () => setConfirmation("delete") }, "Excluir selecionados (", selected.length, ")")), /* @__PURE__ */ React.createElement("div", { className: "nxl-history-list", "aria-busy": loading }, loading ? /* @__PURE__ */ React.createElement("p", { className: "nxl-history-empty", role: "status" }, "Carregando hist\xF3ricos\u2026") : listUnavailable ? React.createElement("p", { className: "nxl-history-empty", role: "status" }, "A lista não está atualizada. Clique em “Atualizar lista”.") : data.rows.length ? data.rows.map((row) => /* @__PURE__ */ React.createElement("label", { key: row.id, className: "nxl-history-row" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", "aria-label": "Selecionar hist\xF3rico " + row.id, checked: selected.some((s) => s.id === row.id), onChange: (e) => setSelected((rows) => e.target.checked ? [...rows, { id: row.id, fingerprint: row.fingerprint }] : rows.filter((s) => s.id !== row.id)) }), /* @__PURE__ */ React.createElement("span", { className: "nxl-history-row-copy" }, /* @__PURE__ */ React.createElement("strong", null, row.title), /* @__PURE__ */ React.createElement("span", { className: "nxl-history-meta" }, row.summary && /* @__PURE__ */ React.createElement("small", { className: "nxl-history-summary", title: String(row.summary) }, row.summary), /* @__PURE__ */ React.createElement("span", { className: "nxl-history-id" }, "Refer\xEAncia: ", row.id))), /* @__PURE__ */ React.createElement("time", { dateTime: row.at || void 0 }, dateText(row.at)))) : /* @__PURE__ */ React.createElement("div", { className: "nxl-history-empty" }, /* @__PURE__ */ React.createElement(HistoryIcon, { name: "inbox" }), /* @__PURE__ */ React.createElement("p", null, "Nenhum hist\xF3rico encontrado neste filtro."))), /* @__PURE__ */ React.createElement("footer", null, /* @__PURE__ */ React.createElement("span", null, listUnavailable ? "Lista indisponível" : totalKnown ? `${data.total} registros · Página ${current} de ${pages}` : `${data.rows.length} registros nesta página · Página ${current}`), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("button", { type: "button", disabled: current <= 1 || loading, onClick: () => {
    setSelected([]);
    setPage(page - 1);
  } }, "Anterior"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: current >= pages || loading, onClick: () => {
    setSelected([]);
    setPage(page + 1);
  } }, "Pr\xF3xima"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: loading, onClick: () => load() }, "Atualizar lista")))) : /* @__PURE__ */ React.createElement("section", { className: "nxl-history-cleanup" }, /* @__PURE__ */ React.createElement("div", { className: "nxl-history-cleanup-heading" }, /* @__PURE__ */ React.createElement("h3", null, /* @__PURE__ */ React.createElement("span", { className: "nxl-history-cleanup-icon" }, /* @__PURE__ */ React.createElement(HistoryIcon, { name: "database" })), "Limpeza de registros j\xE1 exclu\xEDdos"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "is-primary", disabled: busy, onClick: analyze }, /* @__PURE__ */ React.createElement(HistoryIcon, { name: "search" }), busy ? "Analisando\u2026" : "Analisar res\xEDduos de exclus\xE3o")), analysis && /* @__PURE__ */ React.createElement("div", { className: "nxl-history-analysis" }, /* @__PURE__ */ React.createElement("h4", null, analysis.total ? "Res\xEDduos identificados" : "Nenhum res\xEDduo remov\xEDvel encontrado"), /* @__PURE__ */ React.createElement("dl", null, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("dt", null, "Refer\xEAncias de links"), /* @__PURE__ */ React.createElement("dd", null, analysis.links)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("dt", null, "Reservas sem registro de origem"), /* @__PURE__ */ React.createElement("dd", null, analysis.bookings)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("dt", null, "Hist\xF3ricos relacionados"), /* @__PURE__ */ React.createElement("dd", null, analysis.related_history))), /* @__PURE__ */ React.createElement("p", null, "At\xE9 ", analysis.batch_limit, " refer\xEAncias por opera\xE7\xE3o. Arquivados com registro de origem, registros ativos, arquivos do Storage e auditoria de seguran\xE7a ficam preservados."), /* @__PURE__ */ React.createElement("button", { type: "button", className: "is-danger", disabled: !analysis.total || busy, onClick: () => setConfirmation("cleanup") }, "Limpar res\xEDduos identificados (", analysis.total, ")")))));
}

function CronHistoryCleanup({onLockChange,onComplete}) {
 const h=React.createElement,dialog=React.useRef(null),alive=React.useRef(true),stopping=React.useRef(false),guard=React.useRef(false),reported=React.useRef(false);
 const [open,setOpen]=React.useState(false),[plan,setPlan]=React.useState(null),[phase,setPhase]=React.useState('idle'),[error,setError]=React.useState(''),[reason,setReason]=React.useState(''),[word,setWord]=React.useState('');
 const running=phase==='running',loading=phase==='preparing';
 React.useEffect(()=>{alive.current=true;return()=>{alive.current=false;stopping.current=true;};},[]);
 React.useEffect(()=>{onLockChange?.(open);return()=>onLockChange?.(false);},[open,onLockChange]);
 React.useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();},[open]);
 const read=async(action,payload={})=>rpc('nexlab_cron_history_cleanup_v02682',{p_action:action,p_payload:payload});
 function completed(next){if(!reported.current){reported.current=true;onComplete?.(next);}}
 async function begin(){if(guard.current)return;guard.current=true;setOpen(true);setWord('');setPlan(null);setPhase('preparing');setError('');reported.current=false;try{const next=await read('preview');if(alive.current){setPlan(next);setPhase(next.status==='completed'?'done':'review');if(next.status==='completed')completed(next);}}catch(e){if(alive.current){setPhase('error');setError(historyFailure(e,'list'));}}finally{guard.current=false;}}
 async function execute(){if(guard.current||!plan||word!=='EXCLUIR'||reason.trim().length<10)return;guard.current=true;stopping.current=false;setPhase('running');setError('');let current=plan;
  try{current=await read('status',{plan_id:plan.plan_id});if(alive.current)setPlan(current);
   while(alive.current&&!stopping.current&&['ready','running'].includes(current.status)){
    current=await read('step',{plan_id:current.plan_id,expected_step:current.step,confirmation:word,reason:reason.trim()});
    if(alive.current)setPlan(current);
   }
   if(alive.current){if(current.status==='completed'){setPhase('done');completed(current);}else if(current.status==='expired'||current.status==='cancelled'){setPhase('error');setError('Esta limpeza foi encerrada. Feche e prepare uma nova análise.');}else setPhase('paused');}
  }catch(e){if(alive.current){setError('Limpeza interrompida. Consulte o progresso e retome para continuar; os lotes concluídos permanecem registrados.');setPhase('paused');try{const next=await read('status',{plan_id:current.plan_id});if(alive.current){setPlan(next);if(next.status==='completed'){setPhase('done');completed(next);}}}catch{if(alive.current)setError('Não foi possível confirmar o último lote. Ao retomar, o progresso será consultado antes de continuar.');}}}
  finally{guard.current=false;}
 }
 async function cancel(){if(running||loading||guard.current)return;guard.current=true;try{if(plan&&['ready','running'].includes(plan.status)){const next=await read('cancel',{plan_id:plan.plan_id});if(alive.current){setPlan(next);if(next.deleted_count>0)completed(next);}}dialog.current?.close();if(alive.current){setOpen(false);setPhase('idle');setWord('');}}catch(e){if(alive.current)setError(e.message||'Não foi possível encerrar o plano de limpeza.');}finally{guard.current=false;}}
 function close(){if(running||loading)return;if(plan?.deleted_count>0)completed(plan);dialog.current?.close();setOpen(false);if(phase==='done'||phase==='error')setPlan(null);}
 const percent=plan?.status==='completed'?100:plan?.total?Math.min(100,100*plan.deleted_count/plan.total):0;
 return h(React.Fragment,null,h('div',{className:'nxl-cron-cleanup-launch'},h('button',{type:'button',className:'is-danger',onClick:begin,disabled:open},'Esvaziar histórico de rotinas'),h('small',null,'Alcança todas as páginas de execuções concluídas.')),
  open&&h('dialog',{ref:dialog,className:'nxl-cron-cleanup-dialog','aria-label':'Esvaziar histórico de rotinas',onCancel:e=>{e.preventDefault();close();}},
   h('header',null,h('h2',null,'Esvaziar histórico de rotinas'),h('button',{type:'button','aria-label':'Fechar limpeza de rotinas',disabled:running||loading,onClick:close},h(HistoryIcon,{name:'close'}))),
   h('div',{className:'nxl-cron-cleanup-body'},error&&h('p',{role:'alert',className:'nxl-history-error'},error),
    loading?h('p',{role:'status'},'Contando os registros concluídos…'):plan&&h(React.Fragment,null,
     h('p',{className:'nxl-cron-cleanup-count'},h('strong',null,new Intl.NumberFormat('pt-BR').format(plan.total)),h('span',null,'registros concluídos nesta limpeza')),
     h('p',null,'Inclui todas as páginas até '+dateText(plan.cutoff)+'. Rotinas em andamento e registros concluídos depois desse horário ficam preservados.'),
     h('p',null,'Projetos, usuários, posts, reservas e arquivos de backup permanecem intactos. As rotinas continuam funcionando e podem gerar novos registros.'),
     h('p',{className:'nxl-history-note'},'O banco poderá reutilizar o espaço. O tamanho em disco pode não diminuir imediatamente.'),
     h('div',{className:'nxl-cron-cleanup-progress','aria-live':'polite'},h('progress',{max:100,value:percent,'aria-label':'Progresso da limpeza'}),h('strong',null,new Intl.NumberFormat('pt-BR').format(plan.deleted_count)+' de '+new Intl.NumberFormat('pt-BR').format(plan.total)+' removidos'),h('span',null,phase==='done'?'Limpeza concluída':running?'Limpando…':phase==='paused'?'Limpeza pausada':'Aguardando confirmação')),
     phase!=='done'&&h(React.Fragment,null,h('label',null,'Motivo da limpeza',h('textarea',{'aria-label':'Motivo da limpeza',value:reason,onChange:e=>setReason(e.target.value),minLength:10,maxLength:300,disabled:running||loading})),h('label',null,'Digite EXCLUIR para confirmar',h('input',{'aria-label':'Digite EXCLUIR para confirmar a limpeza completa',value:word,onChange:e=>setWord(e.target.value),autoComplete:'off',disabled:running||loading}))),
     h('footer',null,running?h('button',{type:'button',onClick:()=>{stopping.current=true;}},'Pausar após este lote'):phase==='done'?h('button',{type:'button',onClick:close},'Concluir'):h(React.Fragment,null,h('button',{type:'button',onClick:cancel},'Cancelar limpeza'),h('button',{type:'button',className:'is-danger',disabled:word!=='EXCLUIR'||reason.trim().length<10||['expired','cancelled'].includes(plan.status),onClick:execute},phase==='paused'||plan.deleted_count>0?'Retomar limpeza':'Confirmar limpeza completa')))
    ),!loading&&!plan&&h('button',{type:'button',onClick:close},'Fechar'))));
}

function HistoryPanel({ initialMode, initialCategory, onClose, embedded=false, onLockChange }) {
  const [mode, setMode] = React.useState(initialMode), [group, setGroup] = React.useState(CATEGORIES.technical.some(([key])=>key===initialCategory) ? "technical" : "operational"), [category, setCategory] = React.useState(initialCategory), [search, setSearch] = React.useState(""), [query, setQuery] = React.useState(""), [before, setBefore] = React.useState(""), [page, setPage] = React.useState(1), [data, setData] = React.useState({ rows: [], total: 0 }), [loading, setLoading] = React.useState(false), [error, setError] = React.useState(""), [selected, setSelected] = React.useState([]), [confirmation, setConfirmation] = React.useState(null), [reason, setReason] = React.useState(""), [word, setWord] = React.useState(""), [busy, setBusy] = React.useState(false), [notice, setNotice] = React.useState(""), [analysis, setAnalysis] = React.useState(null), [listUnavailable, setListUnavailable] = React.useState(false);
  const [bulkLocked,setBulkLocked]=React.useState(false);
  const dialog = React.useRef(null), alive = React.useRef(true), sequence = React.useRef(0), lock = React.useRef(false), live = React.useRef(null), cancel = React.useRef(null), selectionBox = React.useRef(null);
  React.useEffect(() => {
    alive.current = true;
    if(!embedded)dialog.current.showModal();
    return () => {
      alive.current = false;
      sequence.current++;
    };
  }, []);
  React.useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  React.useEffect(() => {
    setSelected([]);
    setNotice("");
    setConfirmation(null);
    setWord("");
    setReason("");
    setPage(1);
  }, [group, category, query, before, mode]);
  const load = React.useCallback(async (background = false, afterDeletion = false, removedIds = []) => {
    if (mode !== "history") return;
    const token = ++sequence.current;
    if (!background) setLoading(true);
    setError("");
    try {
      const next = await rpc("nexlab_history_maintenance_v02682", { p_action: "list", p_payload: { category, page, search: query, before } });
      if (!alive.current || token !== sequence.current) return;
      if (afterDeletion && next.rows.some(row => removedIds.includes(row.id))) throw Error('A lista retornou registros desatualizados.');
      setData(next);
      setListUnavailable(false);
      if (!next.rows.length && page > 1) setPage(Number.isFinite(next.total) ? Math.max(1, Math.ceil(next.total / 25)) : page - 1);
      return next;
    } catch (e) {
      if (alive.current && token === sequence.current) {
        setError(historyFailure(e, afterDeletion ? 'refresh' : 'list'));
        setListUnavailable(true);
        setSelected([]);
      }
      if (background) throw e;
    } finally {
      if (alive.current && token === sequence.current) setLoading(false);
    }
  }, [mode, category, page, query, before]);
  React.useEffect(() => {
    load();
  }, [load]);
  live.current = { load, blocked: () => loading || bulkLocked || listUnavailable || lock.current || selected.length > 0 || !!confirmation };
  React.useEffect(() => {
    if (mode !== "history") return;
    return globalThis.__NEXLAB_REALTIME_CORE__?.watch?.(["nexlab_history_revision_v02682"], () => live.current.load(true), { scope: "manual-history-" + category, filters: { nexlab_history_revision_v02682: "category=eq." + category }, blocked: () => live.current.blocked() });
  }, [category, mode]);
  React.useEffect(() => {
    if (selectionBox.current) selectionBox.current.indeterminate = selected.length > 0 && selected.length < data.rows.length;
  }, [selected, data.rows]);
  React.useEffect(() => {
    if (confirmation) {
      setWord("");
      setReason("");
      requestAnimationFrame(() => cancel.current?.focus());
    }
  }, [confirmation]);
  const close = () => {
    if (lock.current) return;
    if (confirmation) {
      setConfirmation(null);
      return;
    }
    onClose();
  };
  const totalKnown = Number.isFinite(data.total), pages = totalKnown ? Math.max(1, Math.ceil(data.total / 25)) : page + (data.has_more ? 1 : 0), current = Math.min(page, pages), all = data.rows.length > 0 && selected.length === data.rows.length;
  const switchGroup = (value) => {
    setGroup(value);
    setCategory(CATEGORIES[value][0][0]);
    setSearch("");
    setQuery("");
    setPage(1);
  };
  async function analyze() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await rpc("nexlab_deleted_residue_maintenance_v02682", { p_execute: false });
      if (alive.current) setAnalysis(next);
    } catch (e) {
      if (alive.current) setError(e.message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function execute() {
    if (lock.current || (confirmation === 'delete' && listUnavailable)) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    let committed = false;
    try {
      const next = confirmation === "cleanup" ? await rpc("nexlab_deleted_residue_maintenance_v02682", { p_execute: true, p_token: analysis.token, p_confirmation: word }) : await rpc("nexlab_history_maintenance_v02682", { p_action: "delete", p_payload: { category, rows: selected, reason, confirmation: word } });
      if (!alive.current) return;
      committed = true;
      setNotice(confirmation === "cleanup" ? `${next.affected_rows} registros residuais removidos.` : `${next.deleted_count} registros de histórico excluídos.`);
      setConfirmation(null);
      setSelected([]);
      setAnalysis(null);
      if (mode === 'history') {
        sequence.current++;
        setListUnavailable(true);
        setData({rows: [], total: 0});
      }
      // Commit outcome is final. A failed list refresh must not retry the mutation.
      const updated = await load(false, true, selected.map(row => row.id));
      if (alive.current && mode === 'history' && updated?.rows?.length) setNotice(`${next.deleted_count} registros de histórico excluídos. A lista agora mostra outros registros.`);
      globalThis.__NEXLAB_PENDING_REALTIME_HUB__?.refresh?.({ table: "team_history", eventType: "MANUAL_HISTORY_DELETE" });
      globalThis.dispatchEvent(new CustomEvent("nexlab:history-maintenance-completed", { detail: { category } }));
    } catch (e) {
      if (alive.current) {
        setError(historyFailure(e, committed ? 'refresh' : 'delete'));
        if (!committed && (e.code === '57014' || /statement timeout|canceling statement|timed? ?out|failed to fetch|fetcherror|network|aborterror|gateway|conex[aã]o/i.test(e.message || ''))) {
          setConfirmation(null);
          setSelected([]);
          if (mode === 'history') setListUnavailable(true);
        }
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  React.useEffect(()=>{onLockChange?.(busy||!!confirmation||bulkLocked);return()=>onLockChange?.(false);},[busy,!!confirmation,bulkLocked,onLockChange]);
  const bulkCompleted=React.useCallback(next=>{
    setSelected([]);setConfirmation(null);setNotice(`${next.deleted_count} registros de histórico excluídos até ${dateText(next.cutoff)}. Novas execuções podem aparecer após esse horário.`);
    setPage(1);setData({rows:[],total:0});setListUnavailable(true);load();
    globalThis.dispatchEvent(new CustomEvent('nexlab:history-maintenance-completed',{detail:{category:'cron'}}));
  },[load]);
  const bulkAction=category==='cron'&&mode==='history'&&!confirmation?React.createElement(CronHistoryCleanup,{onLockChange:setBulkLocked,onComplete:bulkCompleted}):null;
  const categoryLabel = [...CATEGORIES.operational, ...CATEGORIES.technical].find(([k]) => k === category)?.[1] || category;
  return React.createElement(HistoryView, {bulkAction,totalKnown,listUnavailable,embedded,dialogRef:dialog,close,busy,mode,setMode,group,switchGroup,category,setCategory,search,setSearch,before,setBefore,notice,error,confirmation,setConfirmation,analysis,selected,setSelected,reason,setReason,word,setWord,cancel,execute,categoryLabel,selectionBox,all,loading,data,current,pages,page,setPage,load,analyze});
}
function storageBytes(value){if(value===null||value===undefined||!Number.isFinite(Number(value)))return 'Não medido';const bytes=Number(value),units=['B','kB','MB','GB'],index=bytes>0?Math.min(3,Math.floor(Math.log(bytes)/Math.log(1024))):0;return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(bytes/1024**index)+' '+units[index];}
function StorageAnalysis(){
 const [data,setData]=React.useState(null),[loading,setLoading]=React.useState(false),[error,setError]=React.useState('');
 const seq=React.useRef(0),alive=React.useRef(true),lock=React.useRef(false);
 React.useEffect(()=>{alive.current=true;const invalidate=()=>{seq.current++;lock.current=false;setLoading(false);setData(null);setError('O histórico mudou. Faça uma nova análise para consultar o armazenamento atual.');};window.addEventListener('nexlab:history-maintenance-completed',invalidate);return()=>{alive.current=false;seq.current++;window.removeEventListener('nexlab:history-maintenance-completed',invalidate);};},[]);
 async function analyze(){if(lock.current)return;lock.current=true;const ticket=++seq.current;setLoading(true);setError('');try{const next=await rpc('nexlab_storage_analysis_v02682',{});if(!Array.isArray(next.tables)||next.read_only!==true)throw Error('Resposta inválida ao analisar o armazenamento.');if(alive.current&&ticket===seq.current)setData(next);}catch(e){if(alive.current&&ticket===seq.current)setError(e.message||'Não foi possível analisar o espaço.');}finally{if(alive.current&&ticket===seq.current){lock.current=false;setLoading(false);}}}
 const h=React.createElement;
 return h('section',{className:'nxl-storage-analysis','aria-label':'Análise do espaço'},
  h('div',{className:'nxl-storage-analysis-head'},h('div',null,h('h3',null,'Manutenção do espaço'),h('p',null,'Consulte os tamanhos atuais e avalie a necessidade de manutenção.')),h('button',{type:'button',className:'nxl-storage-action',disabled:loading,onClick:analyze},loading?'Analisando…':data?'Atualizar análise':'Analisar espaço')),
  error&&h('p',{role:'alert',className:'nxl-history-error'},error),
  loading&&h('p',{role:'status',className:'nxl-storage-loading'},'Consultando o armazenamento do banco…'),
  !data&&!loading&&!error&&h('div',{className:'nxl-storage-empty'},h(HistoryIcon,{name:'info'}),h('strong',null,'Análise pendente'),h('p',null,'O espaço recuperável ainda não foi medido.')),
  data&&h(React.Fragment,null,h('div',{className:'nxl-storage-results'},h('div',null,h('small',null,'Total ocupado em disco'),h('strong',null,storageBytes(data.total_bytes))),h('div',null,h('small',null,'Redução possível em disco'),h('strong',null,data.estimate_available?storageBytes(data.reclaimable_bytes):'A medir'),h('p',null,'O tamanho alocado não equivale ao espaço recuperável.'))),
   h('div',{className:'nxl-storage-table-wrap'},h('table',{className:'nxl-storage-table'},h('caption',null,'Estruturas com maior ocupação'),h('thead',null,h('tr',null,h('th',null,'Estrutura'),h('th',null,'Dados'),h('th',null,'Índices'),h('th',null,'Total'))),h('tbody',null,...data.tables.map(row=>h('tr',{key:row.relation},h('td',null,row.label,h('small',{className:'nxl-storage-relation'},row.relation)),h('td',null,storageBytes(row.table_bytes)),h('td',null,storageBytes(row.index_bytes)),h('td',null,storageBytes(row.total_bytes))))))),h('p',{className:'nxl-storage-read-at'},'Consulta realizada em '+dateText(data.checked_at))),
  h('aside',{className:'nxl-storage-explanation'},h('strong',null,'Reutilização e compactação'),h('p',null,'O espaço liberado pode ser reutilizado por novos registros. Reduzir o tamanho em disco exige avaliar tabelas e índices. A compactação pode bloquear temporariamente uma tabela e precisa de um horário planejado.')),
  h('div',{className:'nxl-storage-plan'},h('span',null,'Esta análise consulta metadados e preserva os registros.'),h('button',{type:'button',disabled:true,title:'Depende de avaliação técnica do espaço recuperável e do horário de manutenção.'},'Planejar manutenção')));
}
function StorageManager({onClose}){
 const [tab,setTab]=React.useState('history'),[locked,setLocked]=React.useState(false),[residues,setResidues]=React.useState(false),dialog=React.useRef(null);
 const close=()=>{if(!locked)onClose();};
 React.useEffect(()=>{dialog.current?.showModal();},[]);
 const h=React.createElement;
 return h('dialog',{ref:dialog,className:'nxl-storage-dialog','aria-label':'Gerenciar armazenamento',onCancel:e=>{e.preventDefault();close();}},
  h('header',null,h('div',null,h(HistoryIcon,{name:'shield'}),h('h2',null,'Gerenciar armazenamento')),h('button',{type:'button','aria-label':'Fechar gerenciamento de armazenamento',onClick:close,disabled:locked},h(HistoryIcon,{name:'close'}))),
  h('nav',{className:'nxl-storage-tabs','aria-label':'Gestão do armazenamento'},h('button',{type:'button','data-nexlab-no-guard':'true','aria-pressed':tab==='history',onClick:()=>{setTab('history');setResidues(false);},disabled:locked},'Históricos'),h('button',{type:'button','data-nexlab-no-guard':'true','aria-pressed':tab==='maintenance',onClick:()=>setTab('maintenance'),disabled:locked},'Manutenção do espaço')),
  tab==='history'?h('div',{className:'nxl-storage-history'},h(HistoryPanel,{key:'history',initialMode:'history',initialCategory:'cron',onClose:close,embedded:true,onLockChange:setLocked})):
  h('div',{className:'nxl-storage-maintenance'},h(StorageAnalysis),h('section',{className:'nxl-storage-residue'},h('button',{type:'button',className:'nxl-storage-residue-toggle','aria-expanded':residues,disabled:locked,onClick:()=>setResidues(v=>!v)},'Revisar resíduos de registros excluídos',h('span',{'aria-hidden':true},residues?'−':'+')),residues&&h('div',{className:'nxl-storage-history'},h(HistoryPanel,{key:'residues',initialMode:'cleanup',initialCategory:'system',onClose:close,embedded:true,onLockChange:setLocked})))));
}

function useHistoryMaintenance(profile, tab) {
  React.useEffect(() => {
    if (!profile?.id || !["admin", "administrador"].includes(String(profile.role).toLowerCase())) return;
    const main = document.querySelector("main");
    if (!main) return;
    const supported = DEFAULT_CATEGORY[tab] || ["atividades-sistema", "logs", "saude-sistema"].includes(tab);
    if (!supported) return;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = ReactDOM.createRoot(host);
    let trigger = null, frame = null;
    const close = () => {
      host.querySelector("dialog[open]")?.close();
      root.render(null);
      requestAnimationFrame(() => {
        const target = trigger?.isConnected ? trigger : systemPage ? main.querySelector(".nxl-storage-manage") : null;
        target?.focus({ preventScroll: true });
      });
    };
    const launch = (mode, category, event) => {
      event?.preventDefault();
      event?.stopPropagation();
      trigger = event?.currentTarget;
      root.render(mode === "storage" ? React.createElement(StorageManager,{onClose:close}) : React.createElement(HistoryPanel, { key: Date.now(), initialMode: mode, initialCategory: category, onClose: close }));
    };
    const systemPage=["atividades-sistema","logs","saude-sistema"].includes(tab);
    const openStorage=event=>{if(!systemPage)return;trigger=event.detail?.trigger||document.activeElement;root.render(React.createElement(StorageManager,{onClose:close}));};
    window.addEventListener("nexlab:open-storage-manager",openStorage);
    function makeButton(mode, category, label) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "nxl-history-open";
      b.textContent = label;
      b.dataset.nexlabHistoryTool = "true";
      b.addEventListener("click", (e) => launch(mode, category, e));
      return b;
    }
    function bind() {
      frame = null;
      if (!main.isConnected) return;
      if (!systemPage && !main.querySelector(".nxl-history-toolbar")) {
        const bar = document.createElement("div");
        bar.className = "nxl-history-toolbar";
        bar.appendChild(makeButton("history", DEFAULT_CATEGORY[tab] || "system", "Gerenciar hist\xF3ricos"));
        if (["atividades-sistema", "logs", "saude-sistema"].includes(tab)) bar.appendChild(makeButton("cleanup", "system", "Limpeza de registros exclu\xEDdos"));
        main.prepend(bar);
      }
      if(!systemPage)for (const heading of main.querySelectorAll("h2,h3")) if (/histórico|históricos|movimentações/i.test(heading.textContent) && !heading.querySelector("[data-nexlab-history-tool]")) heading.appendChild(makeButton("history", DEFAULT_CATEGORY[tab] || "system", "Selecionar e excluir"));
    }
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(bind);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(main, { subtree: true, childList: true });
    bind();
    const updated = () => {
      globalThis.dispatchEvent(new CustomEvent("nexlab:retry-module", { detail: { module: tab } }));
    };
    globalThis.addEventListener("nexlab:history-maintenance-completed", updated);
    return () => {
      window.removeEventListener("nexlab:open-storage-manager",openStorage);
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      root.unmount();
      host.remove();
      main.querySelectorAll(".nxl-history-toolbar,[data-nexlab-history-tool]").forEach((e) => e.remove());
      globalThis.removeEventListener("nexlab:history-maintenance-completed", updated);
    };
  }, [profile?.id, profile?.role, tab]);
}
export {
  useHistoryMaintenance
};
