import { g as React, S as ReactDOM, Ln as supabase } from "./nexlab-runtime-vendor.js?v=app-beta-0-26-82-oficial-completo";
import { Card, PostsGrid, Details } from "./nexlab-mural-interface-v02682.js?v=app-beta-0-26-82-oficial-completo";
import { formatNexlabDate } from "./nexlab-calendar-date-v02682.js?v=app-beta-0-26-82-oficial-completo";
const paths = { user: "M20 21v-2a7 7 0 0 0-14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0", users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8m6 10v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0", folder: "M3 7V4h6l3 3h9v13H3V7Z", calendar: "M4 5h16v16H4V5ZM8 2v6m8-6v6M4 10h16", check: "m6 12 4 4 8-8", activity: "M2 12h5l3-8 4 16 3-8h5", mail: "M3 5h18v14H3V5Zm0 0 9 8 9-8", cap: "m2 8 10-5 10 5-10 5L2 8Zm4 3v6c4 3 8 3 12 0v-6m4-3v8", pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0", spark: "m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z", arrow: "M4 12h16m-6-6 6 6-6 6", close: "m6 6 12 12M6 18 18 6", edit: "m14 5 5 5M4 20l5-1L21 7a3.5 3.5 0 0 0-5-5L4 14l-1 7", message: "M4 3h16v14H9l-5 4V3Zm4 5h8m-8 4h5", send: "m22 2-7 20-4-9-9-4L22 2Zm0 0L11 13", image: "M3 3h18v18H3V3Zm0 14 5-5 4 4 3-3 6 6M9 7h.01", attach: "m9 13 7-7a3 3 0 0 1 4 4L10 20a5 5 0 0 1-7-7L13 3", lock: "M5 10h14v11H5V10Zm3 0V6a4 4 0 1 1 8 0v4", trash: "M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7m4-7v7", bug: "M9 3l3 3 3-3M6 9h12v8a6 6 0 0 1-12 0V9Zm-4 2h4m12 0h4M2 17h4m12 0h4M12 9v14", bulb: "M9 18v3h6v-3M8 14a7 7 0 1 1 8 0l-1 4H9l-1-4Z", chart: "M4 20V9h4v11M10 20V3h4v17m2 0v-7h4v7", video: "M3 5h13v14H3V5Zm13 5 6-3v10l-6-3", clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0", rocket: "M14 4 21 3l-1 7-8 8-6-6 8-8ZM6 12l-3 1v6l4-1m5 0-1 4h6l1-4M16 8h.01", book: "M3 3h7l2 3 2-3h7v17h-7l-2 2-2-2H3V3Zm9 3v16" };
function Glyph({ name, ...props }) {
  return /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", ...props }, /* @__PURE__ */ React.createElement("path", { d: paths[name] || paths.folder }));
}
function PreviewDialog({ title, children, onClose }) {
  const ref = React.useRef(null), closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  React.useLayoutEffect(() => {
    const dialog = ref.current, focus = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    const cancel = (e) => {
      e.preventDefault();
      closeRef.current();
    };
    dialog.addEventListener("cancel", cancel);
    return () => {
      dialog.close();
      dialog.removeEventListener("cancel", cancel);
      document.body.style.overflow = overflow;
      focus?.isConnected && focus.focus({ preventScroll: true });
    };
  }, []);
  const id = React.useId();
  return /* @__PURE__ */ React.createElement("dialog", { ref, className: "ux-dialog", "aria-labelledby": id }, /* @__PURE__ */ React.createElement("header", null, /* @__PURE__ */ React.createElement("h2", { id }, title), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onClose, "aria-label": "Fechar janela" }, /* @__PURE__ */ React.createElement(Glyph, { name: "close" }))), /* @__PURE__ */ React.createElement("div", { className: "ux-dialog-body" }, children));
}
function Section({ icon, title, children, className = "" }) {
  return /* @__PURE__ */ React.createElement("section", { className: "ux-panel " + className }, /* @__PURE__ */ React.createElement("header", { className: "ux-panel-heading" }, /* @__PURE__ */ React.createElement(Glyph, { name: icon }), /* @__PURE__ */ React.createElement("h2", null, title)), children);
}
function Metric({ icon, value, label, tone = "blue", sub, onClick }) {
  const Tag = onClick ? "button" : "div";
  return /* @__PURE__ */ React.createElement(Tag, { type: onClick ? "button" : void 0, className: "ux-metric tone-" + tone, onClick }, /* @__PURE__ */ React.createElement("span", { className: "ux-metric-icon" }, /* @__PURE__ */ React.createElement(Glyph, { name: icon })), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, value), /* @__PURE__ */ React.createElement("b", null, label), sub && /* @__PURE__ */ React.createElement("small", null, sub)), onClick && /* @__PURE__ */ React.createElement(Glyph, { name: "arrow", className: "ux-metric-arrow" }));
}
function FeedbackRow({ record, author, onStatus }) {
  const [expanded, setExpanded] = React.useState(false), [busy, setBusy] = React.useState(false);
  const status = record.status || "novo", label = { novo: "Novo", em_analise: "Em an\xE1lise", resolvido: "Resolvido", arquivado: "Arquivado" }[status] || "Novo";
  const kind = record.tipo || "Sugest\xE3o", kindLabel = kind === "Bug" ? "Erro t\xE9cnico" : kind, kindTone = kind === "Bug" ? "rose" : kind === "Elogio" ? "green" : "blue";
  const date2 = new Date(record.created_at), valid = Number.isFinite(date2.getTime());
  async function change(next, event) {
    event.currentTarget.closest("details").open = false;
    if (busy) return;
    setBusy(true);
    try {
      await onStatus(record, next);
    } finally {
      setBusy(false);
    }
  }
  return /* @__PURE__ */ React.createElement("article", { className: "compact-card nxl-feedback-record", "data-nexlab-record-id": record.id, "data-nexlab-feedback-record": "true", "data-expanded": expanded ? "true" : "false" }, /* @__PURE__ */ React.createElement("div", { className: "nxl-feedback-row" }, /* @__PURE__ */ React.createElement("span", { className: "nxl-feedback-symbol is-" + kindTone }, /* @__PURE__ */ React.createElement(Glyph, { name: kind === "Bug" ? "bug" : kind === "Elogio" ? "spark" : "bulb" })), /* @__PURE__ */ React.createElement("span", { className: "nxl-feedback-kind is-" + kindTone }, kindLabel), /* @__PURE__ */ React.createElement("button", { type: "button", className: "nxl-feedback-copy", onClick: () => setExpanded((v) => !v), "aria-expanded": expanded }, /* @__PURE__ */ React.createElement("strong", null, record.titulo), /* @__PURE__ */ React.createElement("span", null, record.descricao)), /* @__PURE__ */ React.createElement("div", { className: "nxl-feedback-meta" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement(Glyph, { name: "user" }), author.nome), /* @__PURE__ */ React.createElement("time", { dateTime: valid ? date2.toISOString() : void 0 }, /* @__PURE__ */ React.createElement(Glyph, { name: "calendar" }), valid ? date2.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Data n\xE3o informada")), /* @__PURE__ */ React.createElement("span", { className: "nxl-feedback-status is-" + status }, label), /* @__PURE__ */ React.createElement("details", { className: "nxl-feedback-actions" }, /* @__PURE__ */ React.createElement("summary", { "aria-label": "A\xE7\xF5es do feedback " + record.titulo }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2022\u2022\u2022")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: (e) => {
    e.currentTarget.closest("details").open = false;
    setExpanded(true);
  } }, "Abrir detalhes"), status === "novo" && /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, onClick: (e) => change("em_analise", e) }, "Colocar em an\xE1lise"), !["resolvido", "arquivado"].includes(status) && /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, onClick: (e) => change("resolvido", e) }, "Resolver"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, onClick: (e) => change(status === "arquivado" ? "novo" : "arquivado", e) }, status === "arquivado" ? "Reabrir" : "Arquivar")))), /* @__PURE__ */ React.createElement("details", { className: "nxl-feedback-detail", open: expanded, onToggle: (e) => {
    if (e.currentTarget.open !== expanded) setExpanded(e.currentTarget.open);
  } }, /* @__PURE__ */ React.createElement("summary", null, "Ver mensagem detalhada"), /* @__PURE__ */ React.createElement("p", null, record.descricao), /* @__PURE__ */ React.createElement("small", null, author.nome, author.email ? " \xB7 " + author.email : "")));
}
const list = (value) => Array.isArray(value) ? value : [];
const date = (value) => {
  const d = new Date(value);
  return value && Number.isFinite(d.getTime()) ? d : null;
};
const headingDate = (value) => formatNexlabDate(value, { day: "2-digit", month: "short" }) || "Data a definir";
const schedule = (item) => [headingDate(item.data || item.date || item.inicio), item.horario || item.hora || item.hora_inicio || ""].filter(Boolean).join(" \xB7 ");
const statusLabel = (value) => ({ ideia: "Ideia", analise: "An\xE1lise", aprovacao: "Aprova\xE7\xE3o", execucao: "Em andamento", finalizado: "Finalizado", arquivado: "Arquivado" })[value] || value || "Em andamento";
function Overview({ state, nav }) {
  const profile = list(state.profiles).find((p) => String(p.id) === String(state.uid));
  const first = String(profile?.nome || "").trim().split(/\s+/)[0], hour = (/* @__PURE__ */ new Date()).getHours(), greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const projects = list(state.myProjects).slice(0, 3), meetings = list(state.myMeetings).slice(0, 3), events = list(state.events).slice(0, 3);
  const available = (key) => state.availability?.[key] !== false;
  const unavailable = (label) => /* @__PURE__ */ React.createElement("div", { className: "nx-empty", role: "status" }, /* @__PURE__ */ React.createElement("span", null, "N\xE3o foi poss\xEDvel consultar ", label, "."));
  const quick = [["folder", "Projetos", "orange", "projetos"], ["calendar", "Agenda", "blue", "agenda"], ["calendar", "Reservas", "green", "reserva"], ["folder", "Estoque e Patrim\xF4nio", "violet", "inventario"], ["message", "Mural Interno", "orange", "mural"], ["send", "Marketing", "blue", "marketing"]];
  const open = (target, item, type) => nav(target, item ? { id: String(item.id), entityType: type } : void 0);
  function scheduledItems(items, empty, target, type, key, label) {
    return !available(key) ? unavailable(label) : items.length ? /* @__PURE__ */ React.createElement("div", { className: "nxl-scheduled-items" }, items.map((item) => /* @__PURE__ */ React.createElement("button", { type: "button", key: item.id, onClick: () => open(target, item, type) }, /* @__PURE__ */ React.createElement("strong", null, item.titulo || item.nome || item.title || "Atividade"), /* @__PURE__ */ React.createElement("span", null, schedule(item)), (item.local || item.sala || item.space_name) && /* @__PURE__ */ React.createElement("small", null, item.local || item.sala || item.space_name)))) : /* @__PURE__ */ React.createElement("div", { className: "nx-empty" }, /* @__PURE__ */ React.createElement(Glyph, { name: "calendar" }), /* @__PURE__ */ React.createElement("span", null, empty));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "ux-overview" }, /* @__PURE__ */ React.createElement("section", { className: "ux-dashboard-hero" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "ux-hero-date" }, /* @__PURE__ */ React.createElement(Glyph, { name: "calendar" }), formatNexlabDate(/* @__PURE__ */ new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })), /* @__PURE__ */ React.createElement("span", null, greeting, ","), /* @__PURE__ */ React.createElement("h1", null, first || "bem-vindo ao NexLab", " ", /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F44B}"))), /* @__PURE__ */ React.createElement("img", { src: "./brand/nexlab-logo-dark.webp", alt: "NexLab" })), /* @__PURE__ */ React.createElement("div", { className: "ux-dashboard-metrics" }, /* @__PURE__ */ React.createElement(Metric, { icon: "users", value: available("teams") ? list(state.myTeams).length : "\u2014", label: "Minhas equipes", onClick: () => nav("equipes") }), /* @__PURE__ */ React.createElement(Metric, { icon: "folder", value: available("projects") ? list(state.myProjects).length : "\u2014", label: "Projetos ativos", tone: "orange", onClick: () => nav("projetos") }), /* @__PURE__ */ React.createElement(Metric, { icon: "calendar", value: available("meetings") ? list(state.myMeetings).length : "\u2014", label: "Pr\xF3ximas reuni\xF5es", tone: "green", onClick: () => nav("reserva") }), /* @__PURE__ */ React.createElement(Metric, { icon: "check", value: state.pendingTotal ?? "\u2014", label: "Pend\xEAncias", tone: "rose", onClick: () => nav("pendencias") })), /* @__PURE__ */ React.createElement("div", { className: "ux-dashboard-center" }, /* @__PURE__ */ React.createElement(Section, { title: "Em andamento", icon: "activity" }, /* @__PURE__ */ React.createElement("div", { className: "ux-running-grid" }, /* @__PURE__ */ React.createElement("article", null, /* @__PURE__ */ React.createElement("h3", null, /* @__PURE__ */ React.createElement(Glyph, { name: "folder" }), "Projetos em andamento"), !available("projects") ? unavailable("os projetos") : projects.length ? /* @__PURE__ */ React.createElement("div", { className: "nxl-scheduled-items" }, projects.map((project) => /* @__PURE__ */ React.createElement("button", { type: "button", key: project.id, onClick: () => open("projetos", project, "project") }, /* @__PURE__ */ React.createElement("span", { className: "ux-tag orange" }, statusLabel(project.status)), /* @__PURE__ */ React.createElement("strong", null, project.nome || project.titulo || project.title || "Projeto"), (project.last_activity_at || project.updated_at) && /* @__PURE__ */ React.createElement("small", null, "Atualizado em ", headingDate(project.last_activity_at || project.updated_at))))) : /* @__PURE__ */ React.createElement("div", { className: "nx-empty" }, /* @__PURE__ */ React.createElement(Glyph, { name: "folder" }), /* @__PURE__ */ React.createElement("span", null, "Nenhum projeto em andamento.")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => nav("projetos") }, "Abrir projetos ", /* @__PURE__ */ React.createElement(Glyph, { name: "arrow" }))), /* @__PURE__ */ React.createElement("article", null, /* @__PURE__ */ React.createElement("h3", null, /* @__PURE__ */ React.createElement(Glyph, { name: "calendar" }), "Pr\xF3ximas reuni\xF5es"), scheduledItems(meetings, "Nenhuma reuni\xE3o agendada.", "reserva", "meeting", "meetings", "as reuni\xF5es"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => nav("reserva") }, "Ver reuni\xF5es ", /* @__PURE__ */ React.createElement(Glyph, { name: "arrow" }))), /* @__PURE__ */ React.createElement("article", null, /* @__PURE__ */ React.createElement("h3", null, /* @__PURE__ */ React.createElement(Glyph, { name: "spark" }), "Pr\xF3ximos eventos"), scheduledItems(events, "Nenhum evento agendado.", "eventos", "event", "events", "os eventos"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => nav("eventos") }, "Ver eventos ", /* @__PURE__ */ React.createElement(Glyph, { name: "arrow" }))))), /* @__PURE__ */ React.createElement("section", { className: "ux-quick" }, /* @__PURE__ */ React.createElement("h2", null, /* @__PURE__ */ React.createElement(Glyph, { name: "rocket" }), "Acesso r\xE1pido"), /* @__PURE__ */ React.createElement("div", null, quick.map(([icon, label, tone, target]) => /* @__PURE__ */ React.createElement("button", { type: "button", key: target, className: "tone-" + tone, onClick: () => nav(target) }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement(Glyph, { name: icon })), label, /* @__PURE__ */ React.createElement(Glyph, { name: "arrow" })))))), /* @__PURE__ */ React.createElement(Section, { title: "Equipes", icon: "users" }, !available("teamMetrics") ? unavailable("o resumo das equipes") : /* @__PURE__ */ React.createElement("div", { className: "ux-team-metrics" }, /* @__PURE__ */ React.createElement(Metric, { icon: "users", value: state.teamMetrics.active_count, label: "Ativas", onClick: () => nav("equipes") }), /* @__PURE__ */ React.createElement(Metric, { icon: "users", value: state.teamMetrics.unique_member_count, label: "Integrantes", tone: "green", onClick: () => nav("equipes") }), /* @__PURE__ */ React.createElement(Metric, { icon: "folder", value: state.teamMetrics.archived_count, label: "Arquivadas", tone: "muted", onClick: () => nav("equipes") }), /* @__PURE__ */ React.createElement(Metric, { icon: "folder", value: state.teamMetrics.without_projects_count, label: "Sem projeto", tone: "orange", onClick: () => nav("equipes") }))));
}
function selectRecentPosts(rows, now = Date.now()) {
  return list(rows).filter((p) => !p.archived_at && (!p.expires_at || (date(p.expires_at)?.getTime() || 0) > now)).sort((a, b) => (date(b.created_at)?.getTime() || 0) - (date(a.created_at)?.getTime() || 0) || String(b.id).localeCompare(String(a.id))).slice(0, 6);
}
function RecentMural({ uid, users, nav }) {
  const [records, setRecords] = React.useState([]), [error, setError] = React.useState(""), [loading, setLoading] = React.useState(true), [selected, setSelected] = React.useState(null), [retry, setRetry] = React.useState(0);
  React.useEffect(() => {
    let alive = true, sequence = 0;
    async function load(background = false) {
      const token = ++sequence;
      if (!background) setLoading(true);
      try {
        const { data, error: error2 } = await supabase.rpc("nexlab_mural_v02682", { p_action: "list", p_payload: { archived: false } });
        if (error2) throw error2;
        if (data?.permissions?.view === false) throw Object.assign(Error("Acesso não permitido"), {code:"42501"});
        if (!data || !Array.isArray(data.rows)) throw Error("Consulta indisponível");
        if (alive && token === sequence) {
          setRecords(data.rows);
          setError("");
        }
      } catch (error) {
        if (alive && token === sequence) {
          if (!background || error?.code === "42501") { setRecords([]); setSelected(null); }
          setError("N\xE3o foi poss\xEDvel carregar as publica\xE7\xF5es.");
        }
        if (background) throw error;
      } finally {
        if (alive && token === sequence) setLoading(false);
      }
    }
    load();
    const stop = globalThis.__NEXLAB_REALTIME_CORE__?.watch?.(["board_posts"], () => load(true), {scope:"dashboard-mural"});
    return () => {
      alive = false;
      sequence++;
      stop?.();
    };
  }, [uid, retry]);
  React.useEffect(() => {
    if (selected && !selectRecentPosts(records).some((p) => p.id === selected)) setSelected(null);
  }, [records, selected]);
  const rows = selectRecentPosts(records), post = rows.find((p) => p.id === selected), profile = users.find((p) => p.id === uid) || { id: uid };
  return /* @__PURE__ */ React.createElement("section", { className: "nxl-dashboard-mural" }, /* @__PURE__ */ React.createElement("section", { className: "hero" }, /* @__PURE__ */ React.createElement("div", { className: "hero-copy" }, /* @__PURE__ */ React.createElement("span", { className: "eyebrow" }, "Dashboard \xB7 Comunica\xE7\xE3o interna"), /* @__PURE__ */ React.createElement("h1", null, "Mural interno"), /* @__PURE__ */ React.createElement("p", null, "As publica\xE7\xF5es mais recentes da nossa comunidade."))), /* @__PURE__ */ React.createElement("div", { className: "nxl-latest-heading" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", null, "\xDAltimas publica\xE7\xF5es ", /* @__PURE__ */ React.createElement("span", null, rows.length)), /* @__PURE__ */ React.createElement("p", null, "Da mais recente para a mais antiga")), /* @__PURE__ */ React.createElement("button", { type: "button", className: "nxl-all-posts", onClick: () => nav("mural") }, "Ver todos no Mural Interno ", /* @__PURE__ */ React.createElement(Glyph, { name: "arrow" }))), error ? /* @__PURE__ */ React.createElement("div", { className: "form-error", role: "alert" }, error, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setRetry((v) => v + 1) }, "Tentar novamente")) : loading && !records.length ? /* @__PURE__ */ React.createElement("p", { role: "status", className: "nxl-dashboard-message" }, "Carregando comunicados\u2026") : rows.length ? /* @__PURE__ */ React.createElement(PostsGrid, { loading }, rows.map((p) => /* @__PURE__ */ React.createElement(Card, { key: p.id, post: p, openOnCard: true, profile, users, onOpen: (p2) => setSelected(p2.id), canEdit: false, canModerate: false, canDelete: false, busy: false }))) : /* @__PURE__ */ React.createElement("p", { className: "nxl-dashboard-message" }, "Nenhum comunicado publicado."), /* @__PURE__ */ React.createElement("footer", { className: "nxl-recent-footer" }, /* @__PURE__ */ React.createElement("span", null, rows.length ? `Voc\xEA est\xE1 vendo as ${rows.length} publica\xE7\xF5es mais recentes.` : ""), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => nav("mural") }, "Ver publica\xE7\xF5es anteriores ", /* @__PURE__ */ React.createElement(Glyph, { name: "arrow" }))), post && /* @__PURE__ */ React.createElement(Details, { post, profile, users, onClose: () => setSelected(null), canEdit: false, canModerate: false, canDelete: false, busy: false }));
}
function Dashboard({ state, activeView, onView, nav, onRefresh }) {
  const failed = !!state.errors?.length;
  return /* @__PURE__ */ React.createElement("div", { className: "mural-interface-v02682 nxl-dashboard-content" }, /* @__PURE__ */ React.createElement("div", { className: "nx-dash-toolbar" }, /* @__PURE__ */ React.createElement("nav", { className: "dashboard-tabs nx-dash-tabs", "aria-label": "Abas do Dashboard" }, [["overview", "Vis\xE3o geral"], ["mural", "Mural interno"]].map(([id, label]) => /* @__PURE__ */ React.createElement("button", { type: "button", key: id, className: "nx-dash-tab " + (activeView === id ? "is-active active" : ""), "aria-pressed": activeView === id, onClick: () => onView(id) }, label))), /* @__PURE__ */ React.createElement("span", { className: "nx-dash-live", role: "status" }, state.loading && state.ready ? "Atualizando\u2026" : state.lab.label)), state.ready && failed && /* @__PURE__ */ React.createElement("div", { className: "form-error", role: "status" }, "Algumas informa\xE7\xF5es n\xE3o puderam ser consultadas. ", /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onRefresh, disabled: state.loading }, "Tentar novamente")), state.loading && !state.ready ? /* @__PURE__ */ React.createElement("p", { role: "status", className: "nxl-dashboard-message" }, "Carregando Dashboard\u2026") : !state.uid ? /* @__PURE__ */ React.createElement("div", { className: "nxl-dashboard-message", role: "status" }, failed ? "N\xE3o foi poss\xEDvel carregar o Dashboard." : "Aguardando sua sess\xE3o.", failed && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onRefresh }, "Tentar novamente")) : activeView === "mural" ? /* @__PURE__ */ React.createElement(RecentMural, { key: state.uid, uid: state.uid, users: state.profiles, nav }) : /* @__PURE__ */ React.createElement(Overview, { state, nav }));
}
const roots = /* @__PURE__ */ new WeakMap();
function renderApprovedDashboard(host, props) {
  let root = roots.get(host);
  if (!root) {
    host.replaceChildren();
    host.classList.add("nxl-approved");
    root = ReactDOM.createRoot(host);
    roots.set(host, root);
  }
  root.render(/* @__PURE__ */ React.createElement(Dashboard, { ...props }));
}
function unmountApprovedDashboard(host) {
  const root = host && roots.get(host);
  if (root) {
    root.unmount();
    roots.delete(host);
  }
}
export {
  FeedbackRow,
  renderApprovedDashboard,
  selectRecentPosts,
  unmountApprovedDashboard
};
