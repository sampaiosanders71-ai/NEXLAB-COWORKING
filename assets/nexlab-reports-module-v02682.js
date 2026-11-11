import { g as React, Ln as supabase, bt as Users, Fe as Network, ge as FolderKanban, Ve as Package, V as CalendarClock, ze as Megaphone, H as CalendarDays, K as CalendarRange, Ge as RefreshCw, J as ChartColumn, D as ArrowRight, wt as X } from "./nexlab-runtime-vendor.js?v=app-beta-0-26-82-oficial-kanban-navegacao-colunas";
import { DownloadIcon, useReportDownload, reportMfaSetupRequired } from "./nexlab-report-download-v02682.js?v=app-beta-0-26-82-oficial-kanban-navegacao-colunas";
import { reportModules, fold, validPeriod, periodLabel, validatePacket, appendSensitiveUsers } from "./nexlab-reports-schema-v02682.js?v=app-beta-0-26-82-oficial-kanban-navegacao-colunas";
import { exportModuleReport } from "./nexlab-reports-export-v02682.js?v=app-beta-0-26-82-oficial-kanban-navegacao-colunas";
const icons = { users: Users, network: Network, folder: FolderKanban, package: Package, calendar: CalendarClock, megaphone: Megaphone, events: CalendarDays };
const num = (value) => new Intl.NumberFormat("pt-BR").format(value);
const message = (error) => error?.code === "42501" ? error.message : error?.code === "NEXLAB_MFA_SETUP_REQUIRED" ? error.message : error?.name === "TimeoutError" ? "A consulta demorou mais que o esperado. Tente novamente." : "N\xE3o foi poss\xEDvel concluir a consulta. Tente novamente.";
const localDate = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export default function ReportsByModule({ profile, addToast = () => {
}, onNavigate = () => {
} }) {
  const [catalog, setCatalog] = React.useState(null), [loading, setLoading] = React.useState(true), [loadError, setLoadError] = React.useState(""), [refreshKey, setRefreshKey] = React.useState(0);
  const [start, setStart] = React.useState(""), [end, setEnd] = React.useState(""), [quick, setQuick] = React.useState("all"), [search, setSearch] = React.useState(""), [category, setCategory] = React.useState("Todos");
  const [scope, setScope] = React.useState(null), [format, setFormat] = React.useState("pdf"), [busy, setBusy] = React.useState(false), [exportError, setExportError] = React.useState(""), [sensitive, setSensitive] = React.useState(false), [purpose, setPurpose] = React.useState(""), [mfaRequired, setMfaRequired] = React.useState(false), [code, setCode] = React.useState(""), [setupRequired, setSetupRequired] = React.useState(false);
  const dialog = React.useRef(null), startInput = React.useRef(null), run = React.useRef({ active: true, busy: false, sequence: 0, controller: null }), loadSequence = React.useRef(0), transferState = useReportDownload();
  const permissionKey = Array.isArray(profile?.effective_permissions) ? [...profile.effective_permissions].sort().join("|") : "";
  const profileScope = [profile?.id, profile?.role, profile?.ativo, profile?.cadastro_completo, profile?.role_request_status, permissionKey].join("|");
  const periodValid = validPeriod(start, end), canSensitive = Array.isArray(profile?.effective_permissions) && profile.effective_permissions.includes("action_sensitive_export");
  const entries = Array.isArray(catalog?.modules) ? catalog.modules : [], entry = (id) => entries.find((m) => m.id === id), chosen = scope === "geral" ? reportModules : reportModules.filter((m) => m.id === scope);
  const period = periodLabel(start, end), blocked = busy || loading || !periodValid || !catalog;
  const sectionCount = entries.filter((e) => e.authorized).reduce((n, e) => n + (e.sections?.length || 0), 0), records = entries.filter((e) => e.authorized).reduce((n, e) => n + Number(e.record_count || 0), 0), available = entries.filter((e) => e.authorized).length;
  const groups = ["Todos", "Gest\xE3o", "Opera\xE7\xE3o", "Comunica\xE7\xE3o"];
  const visible = reportModules.filter((m) => (category === "Todos" || m.group === category) && fold([m.title, m.description, ...m.sections].join(" ")).includes(fold(search)));
  React.useEffect(() => {
    const state = run.current;
    state.active = true;
    return () => {
      state.active = false;
      state.sequence++;
      state.controller?.abort();
    };
  }, []);
  React.useEffect(() => {
    const seq = ++loadSequence.current, controller = new AbortController();
    let deadline;
    setCatalog(null);
    setLoadError("");
    setLoading(true);
    setScope(null);
    run.current.sequence++;
    run.current.controller?.abort();
    run.current.busy = false;
    setBusy(false);
    if (!profile?.id || !periodValid) {
      setLoading(false);
      return () => controller.abort();
    }
    const timer = setTimeout(async () => {
      deadline = setTimeout(() => controller.abort(new DOMException("Tempo de consulta excedido.", "TimeoutError")), 25e3);
      try {
        const { data, error } = await supabase.rpc("nexlab_get_module_reports_v02682", { p_scope: "catalog", p_start: start || null, p_end: end || null }).abortSignal(controller.signal);
        if (error) throw error;
        if (!data?.ok || !Array.isArray(data.modules) || data.modules.length !== 7 || new Set(data.modules.map((m) => m.id)).size !== 7 || data.modules.some((m) => !reportModules.some((d) => d.id === m.id) || typeof m.authorized !== "boolean" || m.authorized && (!Number.isInteger(m.record_count) || m.record_count < 0 || !Array.isArray(m.sections)))) throw new Error("Cat\xE1logo de relat\xF3rios incompleto.");
        if (seq === loadSequence.current && !controller.signal.aborted) setCatalog(data);
      } catch (error) {
        if (seq === loadSequence.current && (!controller.signal.aborted || controller.signal.reason?.name === "TimeoutError")) setLoadError(message(controller.signal.reason || error));
      } finally {
        clearTimeout(deadline);
        if (seq === loadSequence.current) setLoading(false);
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      clearTimeout(deadline);
      controller.abort();
    };
  }, [profileScope, start, end, refreshKey, periodValid]);
  React.useEffect(() => {
    if (scope && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!scope && dialog.current?.open) dialog.current.close();
  }, [scope]);
  function open(id) {
    if (blocked || (id === "geral" ? !catalog?.general_authorized : !entry(id)?.authorized)) return;
    setScope(id);
    setFormat("pdf");
    setExportError("");
    setSensitive(false);
    setPurpose("");
    setMfaRequired(false);
    setCode("");
    setSetupRequired(false);
  }
  function cancel() {
    run.current.sequence++;
    run.current.controller?.abort();
    setScope(null);
  }
  function choosePeriod(value) {
    setQuick(value);
    if (value === "all") {
      setStart("");
      setEnd("");
      return;
    }
    const now = /* @__PURE__ */ new Date(), from = new Date(now), to = new Date(now);
    if (value === "month") {
      from.setDate(1);
      to.setMonth(to.getMonth() + 1, 0);
    } else from.setDate(from.getDate() - 29);
    setStart(localDate(from));
    setEnd(localDate(to));
  }
  async function ensureMfa() {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    if (data?.currentLevel === "aal2") return true;
    const factors = await supabase.auth.mfa.listFactors();
    if (factors.error) throw factors.error;
    const verified = [...factors.data?.totp || [], ...factors.data?.phone || []].filter((f) => f.status === "verified");
    if (!verified.length) throw reportMfaSetupRequired("Ative a verifica\xE7\xE3o em duas etapas em Meu Perfil para incluir dados pessoais.");
    setMfaRequired(true);
    if (!/^\d{6}$/.test(code.trim())) {
      setExportError("Informe o c\xF3digo de 6 d\xEDgitos do seu autenticador para continuar.");
      return false;
    }
    const result = await supabase.auth.mfa.challengeAndVerify({ factorId: verified[0].id, code: code.trim() });
    if (result.error) throw result.error;
    return true;
  }
  async function generate(event) {
    event.preventDefault();
    const state = run.current;
    if (state.busy || blocked || !scope) return;
    if (sensitive && (purpose.trim().length < 20 || purpose.trim().length > 300)) {
      setExportError("Informe uma finalidade institucional entre 20 e 300 caracteres.");
      return;
    }
    const transfer = transferState.begin(scope, format);
    if (!transfer) return;
    const sequence = ++state.sequence, controller = new AbortController();
    state.controller = controller;
    state.busy = true;
    setBusy(true);
    setExportError("");
    setSetupRequired(false);
    const checkActive = () => {
      if (!state.active || sequence !== state.sequence || controller.signal.aborted) throw new DOMException("Exporta\xE7\xE3o cancelada.", "AbortError");
    };
    let deadline = setTimeout(() => controller.abort(new DOMException("Tempo de consulta excedido.", "TimeoutError")), 25e3);
    try {
      await transfer.paint();
      checkActive();
      if (sensitive && !await ensureMfa()) return;
      checkActive();
      const { data, error } = await supabase.rpc("nexlab_get_module_reports_v02682", { p_scope: scope, p_start: start || null, p_end: end || null }).abortSignal(controller.signal);
      if (error) throw error;
      checkActive();
      const packets = validatePacket(data, scope);
      if (sensitive) {
        const result = await supabase.rpc("nexlab_export_sensitive_user_report", { p_purpose: purpose.trim() }).abortSignal(controller.signal);
        if (result.error) throw result.error;
        checkActive();
        appendSensitiveUsers(packets, result.data, start, end);
      }
      clearTimeout(deadline);
      await transfer.generate();
      checkActive();
      await exportModuleReport({ packets, scope, format, period, profile, purpose: purpose.trim(), transfer, checkActive });
      checkActive();
      const audit = await supabase.rpc("record_security_audit", { action_name: "report_export_recorded", target_user_id: null, event_details: { scope, file_type: format, exported_records: packets.reduce((n, p) => n + p.record_count, 0), confidential: sensitive } });
      if (audit.error) console.warn("Auditoria de exporta\xE7\xE3o n\xE3o confirmada:", audit.error.code || "audit_failed");
      checkActive();
      setScope(null);
      addToast("Arquivo preparado. O download foi iniciado.", "ok");
    } catch (error) {
      if (!state.active || sequence !== state.sequence) return;
      if (controller.signal.reason?.name === "TimeoutError") error = controller.signal.reason;
      if (error?.name === "AbortError") return;
      if (error?.code === "NEXLAB_MFA_SETUP_REQUIRED") {
        setSetupRequired(true);
        transfer.requireVerification();
      } else transfer.fail();
      setExportError(message(error));
    } finally {
      clearTimeout(deadline);
      transfer.end();
      if (state.controller === controller) {
        state.controller = null;
        state.busy = false;
        if (state.active) setBusy(false);
      }
    }
  }
  const countLabel = (id) => loading ? "\u2014" : entry(id)?.authorized ? num(entry(id).record_count) : "\u2014";
  return /* @__PURE__ */ React.createElement("div", { className: "module-shell nxl-reports" }, /* @__PURE__ */ React.createElement("section", { className: "nxl-r-hero" }, /* @__PURE__ */ React.createElement("div", { className: "nxl-r-hero-art", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "nxl-r-eyebrow" }, "VIS\xC3O INTEGRADA DO LABORAT\xD3RIO"), /* @__PURE__ */ React.createElement("h1", null, "Central de relat\xF3rios"), /* @__PURE__ */ React.createElement("p", null, "Cada m\xF3dulo completo. Todas as informa\xE7\xF5es reunidas.")), /* @__PURE__ */ React.createElement("button", { type: "button", className: "nxl-r-btn nxl-r-primary", disabled: blocked || !catalog?.general_authorized, onClick: () => open("geral"), title: catalog && !catalog.general_authorized ? "O relat\xF3rio geral exige acesso aos sete m\xF3dulos." : void 0 }, /* @__PURE__ */ React.createElement(ChartColumn, { size: 17 }), "Gerar relat\xF3rio geral", /* @__PURE__ */ React.createElement(ArrowRight, { size: 16 }))), /* @__PURE__ */ React.createElement("section", { className: "nxl-r-overview", "aria-label": "Resumo dos relat\xF3rios" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(ChartColumn, { size: 22 }), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, catalog ? available : "\u2014"), /* @__PURE__ */ React.createElement("small", null, "M\xF3dulos dispon\xEDveis"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Package, { size: 22 }), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, catalog ? num(records) : "\u2014"), /* @__PURE__ */ React.createElement("small", null, "Registros principais"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Network, { size: 22 }), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, catalog ? num(sectionCount) : "\u2014"), /* @__PURE__ */ React.createElement("small", null, "Se\xE7\xF5es reunidas")))), /* @__PURE__ */ React.createElement("section", { className: "nxl-r-filters", "aria-label": "Filtros do relat\xF3rio" }, /* @__PURE__ */ React.createElement("div", { className: "nxl-r-date-range" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement(CalendarRange, { size: 16 }), "Per\xEDodo de refer\xEAncia"), /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, "Data inicial"), /* @__PURE__ */ React.createElement("input", { ref: startInput, "aria-label": "Data inicial", type: "date", value: start, disabled: busy, onChange: (e) => {
    setQuick("custom");
    setStart(e.target.value);
  } })), /* @__PURE__ */ React.createElement("span", null, "at\xE9"), /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, "Data final"), /* @__PURE__ */ React.createElement("input", { "aria-label": "Data final", type: "date", value: end, disabled: busy, onChange: (e) => {
    setQuick("custom");
    setEnd(e.target.value);
  } }))), /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, "Per\xEDodo r\xE1pido"), /* @__PURE__ */ React.createElement("select", { "aria-label": "Per\xEDodo r\xE1pido", value: quick, disabled: busy, onChange: (e) => choosePeriod(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "all" }, "Todo o per\xEDodo"), /* @__PURE__ */ React.createElement("option", { value: "month" }, "M\xEAs atual"), /* @__PURE__ */ React.createElement("option", { value: "30days" }, "\xDAltimos 30 dias"), /* @__PURE__ */ React.createElement("option", { value: "custom", hidden: true }, "Per\xEDodo personalizado"))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "nxl-r-refresh", disabled: busy || loading || !periodValid, onClick: () => setRefreshKey((k) => k + 1) }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 15 }), "Atualizar dados"), !periodValid && /* @__PURE__ */ React.createElement("p", { className: "nxl-r-error", role: "alert" }, "Informe as duas datas, com a data inicial anterior ou igual \xE0 final, ou selecione Todo o per\xEDodo."), /* @__PURE__ */ React.createElement("p", { className: "nxl-r-period-note" }, "Estoque e patrim\xF4nio refletem a posi\xE7\xE3o atual; as datas filtram suas movimenta\xE7\xF5es. Publica\xE7\xF5es sem data permanecem inclu\xEDdas.")), /* @__PURE__ */ React.createElement("section", { "aria-labelledby": "nxl-r-modules-title" }, /* @__PURE__ */ React.createElement("div", { className: "nxl-r-section-heading" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { id: "nxl-r-modules-title" }, "Relat\xF3rios por m\xF3dulo"), /* @__PURE__ */ React.createElement("p", null, "As abas de cada m\xF3dulo fazem parte da mesma exporta\xE7\xE3o.")), /* @__PURE__ */ React.createElement("label", { className: "nxl-r-search" }, /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, "Buscar m\xF3dulo"), /* @__PURE__ */ React.createElement("input", { type: "search", "aria-label": "Buscar m\xF3dulo", placeholder: "Buscar m\xF3dulo...", value: search, onChange: (e) => setSearch(e.target.value) }))), /* @__PURE__ */ React.createElement("div", { className: "nxl-r-categories", role: "group", "aria-label": "Filtrar grupo de m\xF3dulos" }, groups.map((group) => /* @__PURE__ */ React.createElement("button", { key: group, type: "button", "aria-pressed": category === group, onClick: () => setCategory(group) }, group, /* @__PURE__ */ React.createElement("span", null, group === "Todos" ? 7 : reportModules.filter((m) => m.group === group).length)))), loadError && /* @__PURE__ */ React.createElement("div", { className: "nxl-r-load-error", role: "alert" }, /* @__PURE__ */ React.createElement("p", null, loadError), /* @__PURE__ */ React.createElement("button", { type: "button", className: "nxl-r-btn nxl-r-secondary", onClick: () => setRefreshKey((k) => k + 1) }, "Tentar novamente")), /* @__PURE__ */ React.createElement("div", { className: "nxl-r-grid", "aria-busy": loading }, visible.map((m) => {
    const Icon = icons[m.icon], authorized = entry(m.id)?.authorized;
    return /* @__PURE__ */ React.createElement("article", { key: m.id, className: "nxl-r-card", "data-report-scope": m.id, style: { "--module-color": m.color, "--module-light": m.light } }, /* @__PURE__ */ React.createElement("div", { className: "nxl-r-card-top" }, /* @__PURE__ */ React.createElement("span", { className: "nxl-r-module-icon" }, /* @__PURE__ */ React.createElement(Icon, { size: 21 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", null, m.title), /* @__PURE__ */ React.createElement("small", null, m.group))), /* @__PURE__ */ React.createElement("p", null, m.description), /* @__PURE__ */ React.createElement("span", { className: "nxl-r-chip-label" }, "NESTE RELAT\xD3RIO"), /* @__PURE__ */ React.createElement("div", { className: "nxl-r-chips" }, m.sections.map((s) => /* @__PURE__ */ React.createElement("span", { key: s }, s))), /* @__PURE__ */ React.createElement("div", { className: "nxl-r-card-footer" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, countLabel(m.id)), /* @__PURE__ */ React.createElement("small", null, loading ? "Consultando..." : authorized ? "registros principais" : loadError ? "consulta indispon\xEDvel" : "acesso restrito")), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-label": "Gerar relat\xF3rio de " + m.title, disabled: blocked || !authorized, onClick: () => open(m.id) }, /* @__PURE__ */ React.createElement(DownloadIcon, { size: 15 }), "Gerar relat\xF3rio")));
  })), !visible.length && /* @__PURE__ */ React.createElement("div", { className: "nxl-r-empty" }, /* @__PURE__ */ React.createElement("h3", null, "Nenhum m\xF3dulo encontrado"), /* @__PURE__ */ React.createElement("p", null, "Tente outro nome ou limpe a busca."), /* @__PURE__ */ React.createElement("button", { type: "button", className: "nxl-r-btn nxl-r-secondary", onClick: () => {
    setSearch("");
    setCategory("Todos");
  } }, "Limpar busca"))), /* @__PURE__ */ React.createElement("dialog", { className: "nxl-r-dialog", ref: dialog, "aria-labelledby": "nxl-r-dialog-title", onCancel: (e) => {
    e.preventDefault();
    cancel();
  }, onClick: (e) => {
    if (e.target === dialog.current) {
      const r = e.target.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) cancel();
    }
  } }, scope && /* @__PURE__ */ React.createElement("form", { onSubmit: generate }, /* @__PURE__ */ React.createElement("header", null, /* @__PURE__ */ React.createElement("span", { className: "nxl-r-dialog-icon" }, /* @__PURE__ */ React.createElement(ChartColumn, { size: 23 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "nxl-r-eyebrow" }, scope === "geral" ? "TODOS OS M\xD3DULOS, UM \xDANICO ARQUIVO" : "RELAT\xD3RIO COMPLETO DO M\xD3DULO"), /* @__PURE__ */ React.createElement("h2", { id: "nxl-r-dialog-title" }, scope === "geral" ? "Relat\xF3rio geral" : chosen[0]?.title)), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: cancel, "aria-label": "Fechar janela" }, /* @__PURE__ */ React.createElement(X, { size: 19 }))), /* @__PURE__ */ React.createElement("div", { className: "nxl-r-dialog-body" }, /* @__PURE__ */ React.createElement("p", { className: "nxl-r-intro" }, scope === "geral" ? "Os sete m\xF3dulos e suas se\xE7\xF5es ser\xE3o reunidos no mesmo arquivo." : "As informa\xE7\xF5es das abas deste m\xF3dulo ser\xE3o geradas juntas no mesmo arquivo."), /* @__PURE__ */ React.createElement("div", { className: "nxl-r-export-period" }, /* @__PURE__ */ React.createElement(CalendarRange, { size: 18 }), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("small", null, "Per\xEDodo selecionado"), /* @__PURE__ */ React.createElement("strong", null, period)), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, onClick: () => {
    cancel();
    startInput.current?.focus();
  } }, "Alterar")), /* @__PURE__ */ React.createElement("div", { className: "nxl-r-included-heading" }, /* @__PURE__ */ React.createElement("h3", null, scope === "geral" ? "M\xF3dulos inclu\xEDdos" : "Se\xE7\xF5es inclu\xEDdas"), /* @__PURE__ */ React.createElement("span", null, scope === "geral" ? "7 m\xF3dulos" : chosen[0]?.sections.length + " se\xE7\xF5es")), /* @__PURE__ */ React.createElement("div", { className: "nxl-r-included" }, scope === "geral" ? chosen.map((m) => /* @__PURE__ */ React.createElement("div", { key: m.id }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2713"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, m.title), /* @__PURE__ */ React.createElement("small", null, m.sections.join(" \xB7 "))), /* @__PURE__ */ React.createElement("small", null, num(entry(m.id)?.record_count || 0), " registros"))) : (entry(scope)?.sections || []).map((s) => /* @__PURE__ */ React.createElement("div", { key: s.name }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2713"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, s.name)), /* @__PURE__ */ React.createElement("small", null, num(s.records), " registros")))), (scope === "usuarios" || scope === "geral") && canSensitive && /* @__PURE__ */ React.createElement("section", { className: "nxl-r-sensitive" }, /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: sensitive, disabled: busy, onChange: (e) => {
    setSensitive(e.target.checked);
    setExportError("");
    setMfaRequired(false);
    setCode("");
  } }), "Incluir dados pessoais autorizados de Usu\xE1rios"), /* @__PURE__ */ React.createElement("p", null, "Opcional. Exige finalidade institucional e verifica\xE7\xE3o em duas etapas. Esses dados ser\xE3o inclu\xEDdos no mesmo arquivo."), sensitive && /* @__PURE__ */ React.createElement("label", null, "Finalidade institucional", /* @__PURE__ */ React.createElement("textarea", { minLength: 20, maxLength: 300, value: purpose, disabled: busy, onChange: (e) => setPurpose(e.target.value), placeholder: "Descreva a finalidade desta exporta\xE7\xE3o." })), mfaRequired && sensitive && /* @__PURE__ */ React.createElement("label", null, "C\xF3digo do autenticador", /* @__PURE__ */ React.createElement("input", { value: code, disabled: busy, inputMode: "numeric", pattern: "[0-9]{6}", maxLength: 6, autoComplete: "one-time-code", onChange: (e) => setCode(e.target.value) }))), /* @__PURE__ */ React.createElement("fieldset", { disabled: busy, className: "nxl-r-formats" }, /* @__PURE__ */ React.createElement("legend", null, "Formato do arquivo"), /* @__PURE__ */ React.createElement("div", null, [["pdf", "PDF", "Documento PDF", "Se\xE7\xF5es reunidas para leitura e impress\xE3o"], ["xlsx", "XLS", "Planilha Excel", "Todas as se\xE7\xF5es no mesmo arquivo"]].map(([value, label, title, copy]) => /* @__PURE__ */ React.createElement("label", { key: value, className: format === value ? "is-selected" : "" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "report-format", value, checked: format === value, onChange: () => setFormat(value) }), /* @__PURE__ */ React.createElement("span", { className: "nxl-r-file " + value }, label), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, title), /* @__PURE__ */ React.createElement("small", null, copy)), /* @__PURE__ */ React.createElement("span", { className: "nxl-r-radio" }))))), /* @__PURE__ */ React.createElement("p", { className: "nxl-r-export-note" }, format === "pdf" ? "Um \xFAnico PDF, com as informa\xE7\xF5es organizadas por m\xF3dulo e se\xE7\xE3o." : "Um \xFAnico Excel, com resumo e planilhas para as se\xE7\xF5es inclu\xEDdas."), exportError && /* @__PURE__ */ React.createElement("div", { className: "nxl-r-export-error", role: "alert" }, /* @__PURE__ */ React.createElement("p", null, exportError), setupRequired && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
    cancel();
    onNavigate("perfil");
  } }, "Abrir Meu Perfil"))), /* @__PURE__ */ React.createElement("footer", null, /* @__PURE__ */ React.createElement("span", { "aria-live": "polite" }, busy ? "Preparando arquivo..." : ""), /* @__PURE__ */ React.createElement("button", { type: "button", className: "nxl-r-btn nxl-r-secondary", onClick: cancel }, "Cancelar"), /* @__PURE__ */ React.createElement("button", { type: "submit", disabled: busy, className: "nxl-r-btn nxl-r-primary" }, /* @__PURE__ */ React.createElement(DownloadIcon, { size: 16 }), busy ? "Gerando..." : format === "pdf" ? "Gerar PDF" : "Gerar Excel")))));
}
