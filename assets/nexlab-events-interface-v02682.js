import { g as React, Ln as supabase } from "./nexlab-runtime-vendor.js?v=app-beta-0-26-82-oficial-completo";
function EventGlyph({ kind = "calendar" }) {
  const paths = { calendar: ["M3 10h18", "M8 2v4m8-4v4", "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"], clock: ["M12 7v5l3 2", "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0"], pin: ["M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z", "M14.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"], users: ["M3 21v-3a6 6 0 0 1 12 0v3", "M12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0", "M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3"], person: ["M4 21v-2a8 8 0 0 1 16 0v2", "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0"], file: ["M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h8"], search: ["M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0", "m15 15 6 6"], filter: ["M4 6h16M7 12h10M10 18h4"], left: ["m15 6-6 6 6 6"], right: ["m9 6 6 6-6 6"], arrow: ["M4 12h16m-6-6 6 6-6 6"], more: ["M5 12h.01M12 12h.01M19 12h.01"], edit: ["m14 5 5 5M4 20l5-1L21 7a3.5 3.5 0 0 0-5-5L4 14l-1 7 6-2"], trash: ["M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"], close: ["m6 6 12 12M6 18 18 6"], link: ["M10 13a5 5 0 0 0 7 .5l4-4a5 5 0 0 0-7-7l-2 2", "M14 11a5 5 0 0 0-7-.5l-4 4a5 5 0 0 0 7 7l2-2"], external: ["M14 3h7v7M21 3 10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"], ticket: ["M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6Z", "M12 6v3m0 2v2m0 2v3"] };
  return /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, (paths[kind] || paths.calendar).map((d, i) => /* @__PURE__ */ React.createElement("path", { d, key: i })));
}
const localDate = () => {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
function eventIsPast(record) {
  return /^\d{4}-\d{2}-\d{2}$/.test(record?.data || "") && record.data < localDate();
}
const dateObject = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const d = /* @__PURE__ */ new Date(value + "T12:00:00");
  return Number.isNaN(+d) ? null : d;
};
const eventTime = (record) => String(record.horario || record.hora || "").slice(0, 5) || "Sem hor\xE1rio";
function DateBadge({ record }) {
  const d = dateObject(record.data);
  return /* @__PURE__ */ React.createElement("span", { className: "ev-date" }, /* @__PURE__ */ React.createElement("strong", null, d ? String(d.getDate()).padStart(2, "0") : "\u2014"), /* @__PURE__ */ React.createElement("span", null, d ? d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") : "SEM DATA"));
}
function EventStatus({ record }) {
  return dateObject(record.data) ? /* @__PURE__ */ React.createElement("span", { className: "ev-status" + (eventIsPast(record) ? " is-past" : "") }, eventIsPast(record) ? "Realizado" : "Pr\xF3ximo") : null;
}
function eventLinkUrl(value) {
  try {
    const text = String(value || "").trim();
    if (text.length > 2048 || !/^https?:\/\//i.test(text)) return null;
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && url.hostname ? url.href : null;
  } catch {
    return null;
  }
}
const linkSource = (value) => {
  try {
    const host = new URL(value).hostname;
    return /(^|\.)drive\.google\.com$/i.test(host) ? "Google Drive" : /(^|\.)canva\.com$/i.test(host) ? "Canva" : /(^|\.)(youtube\.com|youtu\.be)$/i.test(host) ? "YouTube" : host;
  } catch {
    return "Endere\xE7o indispon\xEDvel";
  }
};
function EventMaterials({ eventId, canManage, currentUserId, onBusy, addToast }) {
  const [rows, setRows] = React.useState([]), [loading, setLoading] = React.useState(true), [error, setError] = React.useState(""), [busy, setBusy] = React.useState(""), [title, setTitle] = React.useState(""), [url, setUrl] = React.useState(""), [editing, setEditing] = React.useState(null), [confirming, setConfirming] = React.useState(null);
  const alive = React.useRef(true), lock = React.useRef(false), request = React.useRef(0), titleRef = React.useRef(null);
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current++;
    };
  }, []);
  const load = React.useCallback(async () => {
    const token = ++request.current;
    setLoading(true);
    setError("");
    try {
      const { data, error: error2 } = await supabase.from("attachments").select("id,titulo,url,tipo,autor_id,created_at").eq("modulo", "eventos").eq("record_id", eventId).eq("tipo", "link").order("created_at", { ascending: false });
      if (error2) throw error2;
      if (alive.current && request.current === token) setRows(data || []);
    } catch (e) {
      if (alive.current && request.current === token) setError("N\xE3o foi poss\xEDvel carregar os materiais. " + (e?.message || ""));
    } finally {
      if (alive.current && request.current === token) setLoading(false);
    }
  }, [eventId]);
  React.useEffect(() => {
    load();
  }, [load]);
  function setWorking(value) {
    lock.current = !!value;
    setBusy(value);
    onBusy(!!value);
  }
  function reset() {
    setEditing(null);
    setTitle("");
    setUrl("");
    setError("");
  }
  async function save(e) {
    e.preventDefault();
    if (lock.current || !canManage || !currentUserId) return;
    const normalized = eventLinkUrl(url), label = title.trim();
    if (!label) return setError("Informe um t\xEDtulo para o material.");
    if (!normalized) return setError("Informe uma URL v\xE1lida iniciada com http:// ou https://, sem usu\xE1rio ou senha.");
    if (rows.some((row) => row.id !== editing && eventLinkUrl(row.url) === normalized)) return setError("Este link j\xE1 est\xE1 cadastrado neste evento.");
    setWorking("save");
    setError("");
    try {
      let query;
      if (editing) query = supabase.from("attachments").update({ titulo: label, url: normalized }).eq("id", editing).eq("modulo", "eventos").eq("record_id", eventId).eq("tipo", "link");
      else query = supabase.from("attachments").insert({ modulo: "eventos", record_id: eventId, titulo: label, url: normalized, tipo: "link", autor_id: currentUserId });
      const { data, error: error2 } = await query.select("id,titulo,url,tipo,autor_id,created_at").single();
      if (error2) throw error2;
      if (!data?.id) throw Error("O material n\xE3o foi salvo. Verifique sua permiss\xE3o.");
      if (alive.current) {
        setRows((previous) => editing ? previous.map((row) => row.id === editing ? data : row) : [data, ...previous]);
        reset();
        addToast?.(editing ? "Link atualizado." : "Link adicionado ao evento.", "ok");
      }
    } catch (e2) {
      if (alive.current) setError(e2?.message || "N\xE3o foi poss\xEDvel salvar o link.");
    } finally {
      if (alive.current) setWorking("");
    }
  }
  async function remove(row) {
    if (lock.current || !canManage) return;
    setWorking(row.id);
    setError("");
    try {
      const { data, error: error2 } = await supabase.from("attachments").delete().eq("id", row.id).eq("modulo", "eventos").eq("record_id", eventId).eq("tipo", "link").select("id");
      if (error2) throw error2;
      if (!data?.length) throw Error("O link n\xE3o foi removido. Verifique sua permiss\xE3o.");
      if (alive.current) {
        setRows((previous) => previous.filter((item) => item.id !== row.id));
        setConfirming(null);
        if (editing === row.id) reset();
        addToast?.("Link removido do evento.", "ok");
      }
    } catch (e) {
      if (alive.current) setError(e?.message || "N\xE3o foi poss\xEDvel remover o link.");
    } finally {
      if (alive.current) setWorking("");
    }
  }
  return /* @__PURE__ */ React.createElement("section", { className: "ev-materials" }, /* @__PURE__ */ React.createElement("header", { className: "ev-section-heading" }, /* @__PURE__ */ React.createElement("h3", null, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "link" }), "Materiais e links"), /* @__PURE__ */ React.createElement("p", null, "Documentos e refer\xEAncias em plataformas externas.")), loading ? /* @__PURE__ */ React.createElement("p", { className: "ev-loading", role: "status" }, "Carregando materiais\u2026") : /* @__PURE__ */ React.createElement(React.Fragment, null, canManage && /* @__PURE__ */ React.createElement("form", { className: "ev-link-form", onSubmit: save, noValidate: true }, /* @__PURE__ */ React.createElement("h4", null, editing ? "Editar material" : "Adicionar material"), /* @__PURE__ */ React.createElement("label", null, "T\xEDtulo do material", /* @__PURE__ */ React.createElement("input", { ref: titleRef, value: title, onChange: (e) => setTitle(e.target.value), disabled: !!busy, maxLength: 180, placeholder: "Ex.: Apresenta\xE7\xE3o da oficina" })), /* @__PURE__ */ React.createElement("label", null, "Endere\xE7o do material", /* @__PURE__ */ React.createElement("input", { type: "url", inputMode: "url", value: url, onChange: (e) => setUrl(e.target.value), disabled: !!busy, maxLength: 2048, placeholder: "https://" })), /* @__PURE__ */ React.createElement("div", { className: "ev-link-form-actions" }, editing && /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !!busy, onClick: reset }, "Cancelar edi\xE7\xE3o"), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "ev-primary", disabled: !!busy }, busy === "save" ? "Salvando\u2026" : editing ? "Salvar link" : "Adicionar link"))), !rows.length && !error && /* @__PURE__ */ React.createElement("div", { className: "ev-empty ev-empty-links" }, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "link" }), /* @__PURE__ */ React.createElement("strong", null, "Nenhum material cadastrado"), /* @__PURE__ */ React.createElement("p", null, canManage ? "Adicione links do Drive, Canva ou outras plataformas." : "Os materiais deste evento aparecer\xE3o aqui.")), /* @__PURE__ */ React.createElement("div", { className: "ev-material-list" }, rows.map((row) => {
    const safe = eventLinkUrl(row.url);
    return /* @__PURE__ */ React.createElement("article", { className: "ev-material", key: row.id }, /* @__PURE__ */ React.createElement("span", { className: "ev-material-icon" }, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "file" })), /* @__PURE__ */ React.createElement("div", { className: "ev-material-copy" }, /* @__PURE__ */ React.createElement("strong", null, row.titulo || "Material do evento"), /* @__PURE__ */ React.createElement("small", null, safe ? linkSource(safe) : "Link inv\xE1lido")), safe ? /* @__PURE__ */ React.createElement("a", { href: safe, target: "_blank", rel: "noopener noreferrer", "aria-label": "Abrir link: " + (row.titulo || "Material do evento") + " (nova aba)" }, "Abrir link ", /* @__PURE__ */ React.createElement(EventGlyph, { kind: "external" })) : /* @__PURE__ */ React.createElement("span", { className: "ev-invalid-link" }, "Endere\xE7o indispon\xEDvel"), canManage && /* @__PURE__ */ React.createElement("div", { className: "ev-material-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !!busy, onClick: () => {
      setEditing(row.id);
      setTitle(row.titulo || "");
      setUrl(row.url || "");
      setError("");
      setConfirming(null);
      requestAnimationFrame(() => titleRef.current?.focus());
    }, "aria-label": "Editar link " + (row.titulo || "Material do evento") }, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "edit" }), "Editar"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !!busy, onClick: () => setConfirming(row.id), "aria-label": "Remover link " + (row.titulo || "Material do evento") }, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "trash" }), "Remover")), confirming === row.id && /* @__PURE__ */ React.createElement("div", { className: "ev-link-confirm", role: "group", "aria-label": "Confirmar remo\xE7\xE3o do link" }, /* @__PURE__ */ React.createElement("p", null, "Remover este link do evento? O documento externo ser\xE1 mantido."), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !!busy, onClick: () => setConfirming(null) }, "Cancelar"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ev-danger", disabled: !!busy, onClick: () => remove(row) }, busy === row.id ? "Removendo\u2026" : "Confirmar remo\xE7\xE3o")));
  })), /* @__PURE__ */ React.createElement("p", { className: "ev-material-note" }, "Os documentos ficam na plataforma de origem. O NexLab armazena apenas o t\xEDtulo e o endere\xE7o do material.")), error && /* @__PURE__ */ React.createElement("div", { className: "ev-error", role: "alert" }, /* @__PURE__ */ React.createElement("p", null, error), !busy && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: load }, "Atualizar materiais")));
}
function useNativeDialog(ref, onClose, busy) {
  const callback = React.useRef({ onClose, busy });
  callback.current = { onClose, busy };
  React.useLayoutEffect(() => {
    const dialog = ref.current, main = document.getElementById("nexlab-main-content"), previousBody = document.body.style.overflow, previousMain = main?.style.overflow, previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    if (main) main.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    const fit = () => {
      const scale = dialog.getBoundingClientRect().width / (dialog.offsetWidth || 1) || 1;
      dialog.style.setProperty("--ev-dialog-height", Math.floor((window.visualViewport?.height || innerHeight) / scale) + "px");
      dialog.style.setProperty("--ev-dialog-width", Math.floor((window.visualViewport?.width || innerWidth) / scale) + "px");
    };
    fit();
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    const observer = new ResizeObserver(fit);
    observer.observe(dialog);
    const cancel = (e) => {
      e.preventDefault();
      if (!callback.current.busy) callback.current.onClose();
    };
    dialog.addEventListener("cancel", cancel);
    return () => {
      dialog.removeEventListener("cancel", cancel);
      observer.disconnect();
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousBody;
      if (main) main.style.overflow = previousMain || "";
      requestAnimationFrame(() => {
        if (previousFocus?.isConnected && !document.querySelector("dialog[open]")) previousFocus.focus({ preventScroll: true });
      });
    };
  }, []);
}
function outsideDialog(e, onClose, busy) {
  if (busy || e.target !== e.currentTarget) return;
  const r = e.currentTarget.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose();
}
function EventDetails({ record, users, canEdit, canDelete, currentUserId, onClose, onEdit, onDelete, addToast }) {
  const ref = React.useRef(null), [tab, setTab] = React.useState("overview"), [busy, setBusy] = React.useState(false), base = React.useId(), bodyRef = React.useRef(null);
  useNativeDialog(ref, onClose, busy);
  const organizer = users.find((p) => String(p.id) === String(record.organizador_id || record.responsavel_id))?.nome || "N\xE3o informado", date = dateObject(record.data);
  function changeTab(value) {
    if (busy) return;
    setTab(value);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }
  return /* @__PURE__ */ React.createElement("dialog", { ref, className: "events-interface-v02682 ev-drawer-modal", "aria-labelledby": base + "title", onClick: (e) => outsideDialog(e, onClose, busy) }, /* @__PURE__ */ React.createElement("div", { className: "ev-drawer" }, /* @__PURE__ */ React.createElement("header", { className: "ev-drawer-head" }, /* @__PURE__ */ React.createElement("div", { className: "ev-drawer-controls" }, /* @__PURE__ */ React.createElement("span", null, "Detalhes do evento"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, className: "ev-close", onClick: onClose, "aria-label": "Fechar detalhes do evento" }, /* @__PURE__ */ React.createElement("span", { className: "ev-back-icon" }, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "left" }), /* @__PURE__ */ React.createElement("span", null, "Voltar")), /* @__PURE__ */ React.createElement("span", { className: "ev-close-icon" }, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "close" })))), /* @__PURE__ */ React.createElement("div", { className: "ev-detail-heading" }, /* @__PURE__ */ React.createElement(DateBadge, { record }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(EventStatus, { record }), /* @__PURE__ */ React.createElement("h2", { id: base + "title" }, record.titulo || "Evento sem t\xEDtulo"))), /* @__PURE__ */ React.createElement("div", { className: "ev-detail-summary" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "clock" }), eventTime(record)), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "calendar" }), date ? date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }) : "Data n\xE3o informada"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "pin" }), record.local || "Sem local"))), /* @__PURE__ */ React.createElement("nav", { className: "ev-detail-tabs", role: "tablist", "aria-label": "Informa\xE7\xF5es do evento", onKeyDown: (e) => {
    if (!busy && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const value = e.key === "Home" ? "overview" : e.key === "End" ? "materials" : tab === "overview" ? "materials" : "overview";
      changeTab(value);
      ref.current?.querySelector("#" + CSS.escape(base + value + "Tab"))?.focus();
    }
  } }, [["overview", "Vis\xE3o geral"], ["materials", "Materiais e links"]].map(([key, label]) => /* @__PURE__ */ React.createElement("button", { type: "button", role: "tab", key, id: base + key + "Tab", "aria-controls": base + key + "Panel", "aria-selected": tab === key, tabIndex: tab === key ? 0 : -1, disabled: busy, onClick: () => changeTab(key) }, label))), /* @__PURE__ */ React.createElement("div", { className: "ev-drawer-body", ref: bodyRef }, /* @__PURE__ */ React.createElement("div", { role: "tabpanel", id: base + "overviewPanel", "aria-labelledby": base + "overviewTab", hidden: tab !== "overview" }, /* @__PURE__ */ React.createElement("section", { className: "ev-detail-block" }, /* @__PURE__ */ React.createElement("h3", null, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "file" }), "Descri\xE7\xE3o"), /* @__PURE__ */ React.createElement("p", null, record.descricao || "Nenhuma descri\xE7\xE3o cadastrada para este evento.")), /* @__PURE__ */ React.createElement("div", { className: "ev-detail-facts" }, /* @__PURE__ */ React.createElement("article", null, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "users" }), /* @__PURE__ */ React.createElement("span", null, "Limite de vagas"), /* @__PURE__ */ React.createElement("strong", null, Number.isInteger(record.vagas_limite) ? record.vagas_limite + " pessoas" : "N\xE3o informado")), /* @__PURE__ */ React.createElement("article", null, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "person" }), /* @__PURE__ */ React.createElement("span", null, "Organizador"), /* @__PURE__ */ React.createElement("strong", null, organizer))), /* @__PURE__ */ React.createElement("section", { className: "ev-detail-block" }, /* @__PURE__ */ React.createElement("h3", null, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "link" }), "Materiais e links"), /* @__PURE__ */ React.createElement("p", null, "Consulte os documentos e as refer\xEAncias externas deste evento."), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ev-detail-link", onClick: () => {
    changeTab("materials");
    ref.current?.querySelector("#" + CSS.escape(base + "materialsTab"))?.focus();
  } }, "Ver materiais ", /* @__PURE__ */ React.createElement(EventGlyph, { kind: "arrow" })))), /* @__PURE__ */ React.createElement("div", { role: "tabpanel", id: base + "materialsPanel", "aria-labelledby": base + "materialsTab", hidden: tab !== "materials" }, tab === "materials" && /* @__PURE__ */ React.createElement(EventMaterials, { eventId: record.id, canManage: canEdit, currentUserId, addToast, onBusy: setBusy }))), /* @__PURE__ */ React.createElement("footer", { className: "ev-drawer-footer" }, /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, className: "ev-secondary", onClick: onClose }, "Fechar"), canEdit && /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, className: "ev-primary", onClick: () => onEdit(record) }, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "edit" }), "Editar evento"), canDelete && /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, className: "ev-icon-button ev-delete", onClick: () => onDelete(record), "aria-label": "Excluir este evento" }, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "trash" })))));
}
function EventList({ items, onOpen, onEdit, onDelete, canEdit, canDelete, loading }) {
  const [page, setPage] = React.useState(1), ref = React.useRef(null), pageSize = 6, pages = Math.max(1, Math.ceil(items.length / pageSize)), current = Math.min(page, pages), start = (current - 1) * pageSize;
  React.useEffect(() => setPage((p) => Math.min(p, pages)), [pages]);
  const changePage = (value) => {
    setPage(value);
    requestAnimationFrame(() => {
      ref.current?.focus({ preventScroll: true });
      ref.current?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  };
  return /* @__PURE__ */ React.createElement("section", { className: "ev-list", tabIndex: -1, ref, "aria-label": "Lista de eventos" }, /* @__PURE__ */ React.createElement("div", { className: "ev-grid" }, loading ? /* @__PURE__ */ React.createElement("p", { className: "ev-empty", role: "status" }, "Carregando eventos\u2026") : items.length ? items.slice(start, start + pageSize).map((record) => /* @__PURE__ */ React.createElement("article", { className: "ev-card", key: record.id, "data-nexlab-record-id": record.id }, /* @__PURE__ */ React.createElement("div", { className: "ev-card-heading" }, /* @__PURE__ */ React.createElement(DateBadge, { record }), /* @__PURE__ */ React.createElement("div", { className: "ev-card-copy" }, /* @__PURE__ */ React.createElement("h2", null, record.titulo || "Evento sem t\xEDtulo"), /* @__PURE__ */ React.createElement(EventStatus, { record })), (canEdit || canDelete) && /* @__PURE__ */ React.createElement("details", { className: "ev-menu" }, /* @__PURE__ */ React.createElement("summary", { "aria-label": "A\xE7\xF5es do evento " + record.titulo }, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "more" })), /* @__PURE__ */ React.createElement("div", null, canEdit && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: (e) => {
    e.currentTarget.closest("details").open = false;
    onEdit(record, e.currentTarget);
  } }, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "edit" }), "Editar evento"), canDelete && /* @__PURE__ */ React.createElement("button", { type: "button", className: "ev-delete", onClick: (e) => {
    e.currentTarget.closest("details").open = false;
    onDelete(record);
  } }, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "trash" }), "Excluir evento")))), /* @__PURE__ */ React.createElement("div", { className: "ev-card-meta" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "clock" }), eventTime(record)), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "pin" }), record.local || "Sem local")), /* @__PURE__ */ React.createElement("div", { className: "ev-card-footer" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ev-detail-link", onClick: () => onOpen(record), "aria-label": "Ver detalhes de " + record.titulo }, "Ver detalhes ", /* @__PURE__ */ React.createElement(EventGlyph, { kind: "arrow" }))))) : /* @__PURE__ */ React.createElement("div", { className: "ev-empty" }, /* @__PURE__ */ React.createElement("strong", null, "Nenhum evento encontrado"), /* @__PURE__ */ React.createElement("p", null, "Experimente outro termo ou ajuste o per\xEDodo."))), !loading && /* @__PURE__ */ React.createElement("footer", { className: "ev-list-footer" }, /* @__PURE__ */ React.createElement("p", { role: "status", "aria-live": "polite" }, items.length ? `Mostrando ${start + 1}\u2013${Math.min(start + pageSize, items.length)} de ${items.length} eventos` : "0 eventos"), pages > 1 && /* @__PURE__ */ React.createElement("nav", { "aria-label": "Pagina\xE7\xE3o dos eventos" }, /* @__PURE__ */ React.createElement("button", { type: "button", disabled: current === 1, "aria-label": "P\xE1gina anterior dos eventos", onClick: () => changePage(current - 1) }, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "left" })), /* @__PURE__ */ React.createElement("span", { role: "status", "aria-live": "polite" }, "P\xE1gina ", current, " de ", pages), [.../* @__PURE__ */ new Set([1, ...[current - 1, current, current + 1].filter((n) => n > 1 && n < pages), pages])].map((n, i, a) => /* @__PURE__ */ React.createElement(React.Fragment, { key: n }, i > 0 && n - a[i - 1] > 1 && /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2026"), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-label": "P\xE1gina " + n + " dos eventos", "aria-current": current === n ? "page" : void 0, onClick: () => changePage(n) }, n))), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: current === pages, "aria-label": "Pr\xF3xima p\xE1gina dos eventos", onClick: () => changePage(current + 1) }, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "right" })))));
}
function EventWorkspace({ header, allEvents, items, users, upcoming, capacity, loading, search, onSearch, period, onPeriod, canEdit, canDelete, currentUserId, onEdit, onDelete, addToast }) {
  const [filtersOpen, setFiltersOpen] = React.useState(false), [selected, setSelected] = React.useState(null), base = React.useId(), record = allEvents.find((e) => e.id === selected);
  const rootRef = React.useRef(null);
  React.useEffect(() => {
    if (selected && !record) setSelected(null);
  }, [selected, record]);
  const edit = (item, trigger) => {
    setSelected(null);
    requestAnimationFrame(() => onEdit(item, trigger || rootRef.current?.querySelector('[data-nexlab-record-id="' + item.id + '"] .ev-detail-link')));
  };
  return /* @__PURE__ */ React.createElement("div", { className: "ev-workspace", ref: rootRef }, /* @__PURE__ */ React.createElement("div", { className: "ev-hero" }, header), canEdit && /* @__PURE__ */ React.createElement("section", { className: "ev-metrics", "aria-label": "Indicadores de Eventos" }, [["calendar", "Eventos cadastrados", allEvents.length], ["ticket", "Pr\xF3ximos eventos", upcoming], ["users", "Vagas informadas", capacity]].map(([kind, label, value], i) => /* @__PURE__ */ React.createElement("article", { key: label, className: "ev-metric ev-tone-" + i }, /* @__PURE__ */ React.createElement("span", { className: "ev-metric-icon" }, /* @__PURE__ */ React.createElement(EventGlyph, { kind })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", null, label), /* @__PURE__ */ React.createElement("strong", null, value))))), /* @__PURE__ */ React.createElement("section", { className: "ev-toolbar" + (filtersOpen ? " is-expanded" : ""), "aria-label": "Busca e filtros de Eventos" }, /* @__PURE__ */ React.createElement("label", { className: "ev-search" }, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "search" }), /* @__PURE__ */ React.createElement("input", { id: "event-search", type: "search", value: search, onChange: (e) => onSearch(e.target.value), "aria-label": "Buscar eventos", placeholder: "Buscar por t\xEDtulo, local ou descri\xE7\xE3o..." })), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ev-filter-toggle", "aria-expanded": filtersOpen, "aria-controls": base + "period", onClick: () => setFiltersOpen((v) => !v) }, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "filter" }), "Filtros", period !== "all" ? " (1)" : ""), /* @__PURE__ */ React.createElement("label", { className: "ev-period", id: base + "period" }, "Per\xEDodo", /* @__PURE__ */ React.createElement("select", { value: period, onChange: (e) => onPeriod(e.target.value), "aria-label": "Per\xEDodo dos eventos" }, /* @__PURE__ */ React.createElement("option", { value: "all" }, "Todos os eventos"), /* @__PURE__ */ React.createElement("option", { value: "upcoming" }, "Pr\xF3ximos eventos"), /* @__PURE__ */ React.createElement("option", { value: "past" }, "Eventos realizados")))), /* @__PURE__ */ React.createElement(EventList, { key: JSON.stringify([search, period]), items, loading, canEdit, canDelete, onOpen: (item) => setSelected(item.id), onEdit: edit, onDelete }), record && /* @__PURE__ */ React.createElement(EventDetails, { key: record.id, record, users, canEdit, canDelete, currentUserId, onEdit: edit, onDelete: (item) => {
    setSelected(null);
    onDelete(item);
  }, onClose: () => setSelected(null), addToast }));
}
function EventEditorDialog({ title, busy, onClose, children }) {
  const ref = React.useRef(null);
  useNativeDialog(ref, onClose, busy);
  const pieces = React.Children.toArray(children.props.children), footer = pieces.pop();
  return /* @__PURE__ */ React.createElement("dialog", { ref, className: "events-interface-v02682 ev-editor-modal", "aria-labelledby": "event-form-title", onClick: (e) => outsideDialog(e, onClose, busy) }, /* @__PURE__ */ React.createElement("header", { className: "ev-editor-head" }, /* @__PURE__ */ React.createElement("h2", { id: "event-form-title" }, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "calendar" }), title), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, onClick: onClose, "aria-label": "Fechar formul\xE1rio do evento" }, /* @__PURE__ */ React.createElement(EventGlyph, { kind: "close" }))), React.cloneElement(children, { className: "ev-editor-form", children: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ev-editor-body" }, pieces), /* @__PURE__ */ React.createElement("footer", { className: "ev-editor-footer" }, footer)) }));
}
function EventDeleteDialog({ busy, onClose, children }) {
  const ref = React.useRef(null);
  useNativeDialog(ref, onClose, busy);
  return /* @__PURE__ */ React.createElement("dialog", { ref, className: "events-interface-v02682 ev-delete-modal", "aria-labelledby": "event-delete-title" }, children);
}
export {
  EventDeleteDialog,
  EventEditorDialog,
  EventGlyph,
  EventWorkspace,
  eventIsPast,
  eventLinkUrl
};
