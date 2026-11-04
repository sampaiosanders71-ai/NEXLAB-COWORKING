import { g as React, Ln as supabase } from "./nexlab-runtime-vendor.js?v=app-beta-0-26-82-oficial-completo";
const paths = { megaphone: ["m3 9 12-4v14L3 15V9Zm12-4 6-2v18l-6-2M5 16l2 5h4l-2-4"], search: ["M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0", "m15 15 6 6"], pin: ["m9 3 10 4-4 4-1 5-3-1-6 6 1-8-3-3 5-2 1-5Z"], grid: ["M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z"], archive: ["M4 9v12h16V9M3 3h18v6H3ZM10 13h4"], plus: ["M12 5v14M5 12h14"], arrow: ["M4 12h16m-6-6 6 6-6 6"], left: ["m15 6-6 6 6 6"], right: ["m9 6 6 6-6 6"], clock: ["M12 7v5l3 2", "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0"], calendar: ["M3 10h18M8 2v4m8-4v4", "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"], close: ["m6 6 12 12M6 18 18 6"], edit: ["m14 5 5 5M4 20l5-1L21 7a3.5 3.5 0 0 0-5-5L4 14l-1 7 6-2"], trash: ["M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"], external: ["M14 3h7v7M21 3 10 14M10 3H5v18h14v-7"], link: ["M10 13a5 5 0 0 0 7 .5l4-4a5 5 0 0 0-7-7l-2 2", "M14 11a5 5 0 0 0-7-.5l-4 4a5 5 0 0 0 7 7l2-2"], file: ["M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h8"], refresh: ["M20 7V3l-3 3a8 8 0 1 0 3 10M20 3h-5"] };
function Icon({ kind }) {
  return /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, kind === "more" ? [4, 12, 20].map((y) => /* @__PURE__ */ React.createElement("circle", { key: y, cx: "12", cy: y, r: "1.6", fill: "currentColor", stroke: "none" })) : (paths[kind] || paths.file).map((d, i) => /* @__PURE__ */ React.createElement("path", { key: i, d })));
}
function muralUrl(value, maxLength = 2048) {
  try {
    const s = String(value || "").trim();
    if (s.length > maxLength || !/^https?:\/\//i.test(s)) return null;
    const u = new URL(s);
    if (!u.hostname || u.username || u.password) return null;
    return u.href;
  } catch {
    return null;
  }
}
const api = async (action, payload = {}) => {
  const { data, error } = await supabase.rpc("nexlab_mural_v02682", { p_action: action, p_payload: payload });
  if (error) throw error;
  if (data == null) throw Error("O servidor n\xE3o confirmou a opera\xE7\xE3o.");
  return data;
};
const dateOnly = (value) => new Date(value).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const longDate = (value) => new Date(value).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
const shortDate = (value) => new Date(value).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).replaceAll(" de ", " ");
const expiryLabel = (p) => p.expires_at ? "V\xE1lido at\xE9 " + shortDate(p.expires_at) : "Sem vencimento";
const cleanBody = (p) => String(p.conteudo || "").replace(/\[BANNER_IMAGE:[^\]]*\]/g, "").trim();
const initials = (s) => String(s || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((s2) => s2[0]).join("").toUpperCase();
const roleLabel = (s) => ({ admin: "Admin", administrador: "Admin", coordenador: "Coordenador", bolsista: "Bolsista", voluntario: "Volunt\xE1rio", coworking_junior: "Coworking J\xFAnior" })[s] || "Comunidade";
function relativeDate(s) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(s)) / 864e5));
  return days === 0 ? "Hoje" : days === 1 ? "H\xE1 1 dia" : "H\xE1 " + days + " dias";
}
function PostsGrid({ children, loading }) {
  const ref = React.useRef(null);
  React.useLayoutEffect(() => {
    const grid = ref.current, cards = Array.from(grid.children).filter((e) => e.classList.contains("post"));
    let frame = 0, active = true;
    const set = (node, key, value) => {
      if (node.style.getPropertyValue(key) !== value) node.style.setProperty(key, value);
    };
    const reset = () => {
      delete grid.dataset.cascade;
      grid.style.removeProperty("--mural-height");
      grid.style.removeProperty("--post-width");
    };
    const layout = () => {
      frame = 0;
      if (!active) return;
      const css = getComputedStyle(grid), columns = Math.max(1, Math.min(3, Number(css.getPropertyValue("--mural-columns")) || 1));
      const width = parseFloat(css.width), gap = parseFloat(css.columnGap) || 0;
      if (!cards.length || !width) {
        reset();
        return;
      }
      const slotWidth = (width - gap * (columns - 1)) / columns;
      const imageLimit = parseFloat(css.getPropertyValue("--post-image-limit"));
      cards.forEach((card) => {
        const image = card.querySelector(".post-cover"), box = getComputedStyle(card);
        const frameWidth = [box.paddingLeft, box.paddingRight, box.borderLeftWidth, box.borderRightWidth].reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
        let cardWidth = slotWidth;
        if (image?.naturalWidth > 0 && image.naturalHeight > 0) {
          let imageWidth = Math.min(image.naturalWidth, Math.max(0, slotWidth - frameWidth));
          if (Number.isFinite(imageLimit) && imageLimit > 0) imageWidth = Math.min(imageWidth, imageLimit * image.naturalWidth / image.naturalHeight);
          cardWidth = Math.min(slotWidth, Math.max(Math.min(280, slotWidth), imageWidth + frameWidth));
        }
        set(card, "--post-width", Math.round(cardWidth * 100) / 100 + "px");
      });
      if (columns === 1) {
        reset();
        return;
      }
      grid.dataset.cascade = "true";
      set(grid, "--post-width", (width - gap * (columns - 1)) / columns + "px");
      const scale = grid.getBoundingClientRect().width / width || 1, heights = Array(columns).fill(0);
      const sizes = cards.map((card) => Math.ceil(card.getBoundingClientRect().height / scale));
      cards.forEach((card, i) => {
        const col = heights.indexOf(Math.min(...heights));
        set(card, "--post-left", col * ((width - gap * (columns - 1)) / columns + gap) + "px");
        set(card, "--post-top", heights[col] + "px");
        heights[col] += sizes[i] + gap;
      });
      set(grid, "--mural-height", Math.max(...heights) - gap + "px");
    };
    const schedule = () => {
      if (active && !frame) frame = requestAnimationFrame(layout);
    };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
    observer?.observe(grid);
    cards.forEach((card) => observer?.observe(card));
    grid.addEventListener("load", schedule, true);
    grid.addEventListener("error", schedule, true);
    window.addEventListener("resize", schedule);
    document.fonts?.ready.then(schedule);
    layout();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      grid.removeEventListener("load", schedule, true);
      grid.removeEventListener("error", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [children]);
  return /* @__PURE__ */ React.createElement("div", { className: "posts-grid", ref, tabIndex: -1, "aria-busy": loading }, children);
}
function Cover({ post, detail = false, eager = false, onImage, onStatus }) {
  const [signed, setSigned] = React.useState(null), [failed, setFailed] = React.useState(""), [loaded, setLoaded] = React.useState("");
  const legacy = String(post.capa_url || ""), banner = String(post.conteudo || "").match(/\[BANNER_IMAGE:([^\]]+)\]/)?.[1];
  let src = post.link_url ? muralUrl(post.link_image_url, 4096) : /^storage:\/\/mural-media\/[\w./-]+$/.test(legacy) ? signed : /^\.\/(brand|icons)\/[\w.-]+\.(webp|png|svg)$/.test(banner || "") ? banner : null;
  React.useEffect(() => {
    let live = true;
    if (!post.link_url && legacy.startsWith("storage://mural-media/")) supabase.storage.from("mural-media").createSignedUrl(legacy.slice(22), 3600).then(({ data }) => {
      if (live) setSigned(data?.signedUrl || null);
    }).catch(() => {
    });
    return () => {
      live = false;
    };
  }, [post.link_url, legacy]);
  React.useEffect(() => {
    onImage?.(!!src && src !== failed);
  }, [src, failed, onImage]);
  React.useEffect(() => {
    onStatus?.(!src ? "empty" : src === failed ? "failed" : src === loaded ? "ready" : "loading");
  }, [src, failed, loaded, onStatus]);
  return src && src !== failed ? /* @__PURE__ */ React.createElement("img", { key: src, className: detail ? "detail-cover" : "post-cover", src, alt: "Imagem do comunicado " + post.titulo, referrerPolicy: "no-referrer", loading: detail || eager ? "eager" : "lazy", onLoad: () => setLoaded(src), onError: () => setFailed(src) }) : null;
}
function Author({ post, profile, users = [] }) {
  const user = users.find((u) => u.id === post.autor_id), name = post.author_name || user?.nome || (post.autor_id === profile?.id ? profile.nome : "Usu\xE1rio removido"), role = post.author_role || user?.role;
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "avatar" }, initials(name)), /* @__PURE__ */ React.createElement("div", { className: "author-copy" }, /* @__PURE__ */ React.createElement("strong", null, name), /* @__PURE__ */ React.createElement("small", null, roleLabel(role), " \xB7 ", relativeDate(post.created_at)), /* @__PURE__ */ React.createElement("time", { className: "publication-date", dateTime: post.created_at }, /* @__PURE__ */ React.createElement(Icon, { kind: "calendar" }), /* @__PURE__ */ React.createElement("span", null, "Publicado em ", new Date(post.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" })))));
}
function Card({ post, profile, users, onOpen, onAction, canEdit, canModerate, canDelete, busy, preview = false, onImageStatus, openOnCard = false }) {
  const [hasImage, setHasImage] = React.useState(!!(post.link_image_url || post.capa_url || /\[BANNER_IMAGE:/.test(post.conteudo || "")));
  return /* @__PURE__ */ React.createElement("article", { className: "post " + (hasImage ? "has-cover" : "no-cover"), "data-nexlab-record-id": post.id, onClick: openOnCard ? (event) => { if (!event.target.closest("button,a,summary,input,select,textarea")) onOpen(post); } : void 0 }, /* @__PURE__ */ React.createElement("header", { className: "post-header" }, /* @__PURE__ */ React.createElement(Author, { post, profile, users }), !preview && (canEdit || canModerate || canDelete) && /* @__PURE__ */ React.createElement("details", { className: "post-menu" }, /* @__PURE__ */ React.createElement("summary", { "aria-label": "A\xE7\xF5es de " + post.titulo }, /* @__PURE__ */ React.createElement(Icon, { kind: "more" })), /* @__PURE__ */ React.createElement("div", null, canEdit && !post.archived_at && /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, onClick: (e) => {
    e.currentTarget.closest("details").open = false;
    onAction("edit", post);
  } }, /* @__PURE__ */ React.createElement(Icon, { kind: "edit" }), "Editar comunicado"), canModerate && !post.archived_at && /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, onClick: (e) => {
    e.currentTarget.closest("details").open = false;
    onAction("pin", post);
  } }, /* @__PURE__ */ React.createElement(Icon, { kind: "pin" }), post.fixado ? "Desafixar" : "Fixar no topo"), canModerate && /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, onClick: (e) => {
    e.currentTarget.closest("details").open = false;
    onAction(post.archived_at ? "restore" : "archive", post);
  } }, /* @__PURE__ */ React.createElement(Icon, { kind: post.archived_at ? "refresh" : "archive" }), post.archived_at ? "Restaurar publica\xE7\xE3o" : "Arquivar"), canDelete && /* @__PURE__ */ React.createElement("button", { type: "button", className: "danger", disabled: busy, onClick: (e) => {
    e.currentTarget.closest("details").open = false;
    onAction("delete", post);
  } }, /* @__PURE__ */ React.createElement(Icon, { kind: "trash" }), "Excluir")))), /* @__PURE__ */ React.createElement("div", { className: "post-labels" }, /* @__PURE__ */ React.createElement("span", { className: "kind-label" }, /* @__PURE__ */ React.createElement(Icon, { kind: "megaphone" }), "Comunicado"), post.fixado && /* @__PURE__ */ React.createElement("span", { className: "pinned-label" }, /* @__PURE__ */ React.createElement(Icon, { kind: "pin" }), "Fixado")), /* @__PURE__ */ React.createElement(Cover, { post, eager: preview, onImage: setHasImage, onStatus: onImageStatus }), /* @__PURE__ */ React.createElement("h2", null, post.titulo || "T\xEDtulo do comunicado"), /* @__PURE__ */ React.createElement("p", { className: "post-excerpt" }, cleanBody(post) ? cleanBody(post).slice(0, 500) + (cleanBody(post).length > 500 ? "\u2026" : "") : "O conte\xFAdo do comunicado aparecer\xE1 aqui."), /* @__PURE__ */ React.createElement("footer", { className: "post-footer" }, /* @__PURE__ */ React.createElement("span", { className: "validity" }, /* @__PURE__ */ React.createElement(Icon, { kind: "clock" }), expiryLabel(post)), !preview && /* @__PURE__ */ React.createElement("button", { type: "button", className: "read-button", disabled: busy, onClick: () => onOpen(post) }, "Ler comunicado ", /* @__PURE__ */ React.createElement(Icon, { kind: "arrow" }))));
}
function useDialog(ref, onClose, busy) {
  const callbacks = React.useRef({ onClose, busy });
  callbacks.current = { onClose, busy };
  React.useLayoutEffect(() => {
    const d = ref.current, previous = document.activeElement, body = document.body.style.overflow, main = document.getElementById("nexlab-main-content"), overflow = main?.style.overflow;
    document.body.style.overflow = "hidden";
    if (main) main.style.overflow = "hidden";
    d.showModal();
    const fit = () => {
      const scale = d.getBoundingClientRect().width / (d.offsetWidth || 1) || 1;
      d.style.setProperty("--mb-height", Math.floor((window.visualViewport?.height || innerHeight) / scale) + "px");
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(d);
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    const cancel = (e) => {
      e.preventDefault();
      if (!callbacks.current.busy) callbacks.current.onClose();
    };
    d.addEventListener("cancel", cancel);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
      d.removeEventListener("cancel", cancel);
      d.close();
      document.body.style.overflow = body;
      if (main) main.style.overflow = overflow || "";
      requestAnimationFrame(() => {
        if (previous?.isConnected && !document.querySelector("dialog[open]")) previous.focus({ preventScroll: true });
      });
    };
  }, []);
}
function Details({ post, profile, users, onClose, onAction, canEdit, canModerate, canDelete, busy }) {
  const ref = React.useRef(null), base = React.useId();
  useDialog(ref, onClose, busy);
  const link = muralUrl(post.link_url);
  return /* @__PURE__ */ React.createElement("dialog", { ref, className: "detail-dialog", "aria-labelledby": base + "title" }, /* @__PURE__ */ React.createElement("div", { className: "detail-shell" }, /* @__PURE__ */ React.createElement("header", { className: "detail-header" }, /* @__PURE__ */ React.createElement("div", { className: "detail-controls" }, /* @__PURE__ */ React.createElement("span", null, "Comunicado completo"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "close-detail", disabled: busy, onClick: onClose, "aria-label": "Fechar detalhes do comunicado" }, /* @__PURE__ */ React.createElement("span", { className: "x" }, /* @__PURE__ */ React.createElement(Icon, { kind: "close" })), /* @__PURE__ */ React.createElement("span", { className: "back" }, /* @__PURE__ */ React.createElement(Icon, { kind: "left" }), "Voltar"))), /* @__PURE__ */ React.createElement("h2", { id: base + "title" }, post.titulo), /* @__PURE__ */ React.createElement("div", { className: "detail-meta" }, /* @__PURE__ */ React.createElement(Author, { post, users, profile }), post.fixado && /* @__PURE__ */ React.createElement("span", { className: "pinned-label" }, /* @__PURE__ */ React.createElement(Icon, { kind: "pin" }), "Fixado"))), /* @__PURE__ */ React.createElement("div", { className: "detail-body" }, /* @__PURE__ */ React.createElement(Cover, { post, detail: true }), /* @__PURE__ */ React.createElement("section", { className: "detail-section" }, /* @__PURE__ */ React.createElement("h3", null, /* @__PURE__ */ React.createElement(Icon, { kind: "file" }), "Comunicado"), /* @__PURE__ */ React.createElement("p", { className: "detail-text" }, cleanBody(post))), /* @__PURE__ */ React.createElement("section", { className: "detail-section" }, /* @__PURE__ */ React.createElement("h3", null, /* @__PURE__ */ React.createElement(Icon, { kind: "link" }), "Link de acesso"), link ? /* @__PURE__ */ React.createElement("div", { className: "access-card" }, /* @__PURE__ */ React.createElement("strong", null, "Acesse o conte\xFAdo original"), /* @__PURE__ */ React.createElement("small", null, link), /* @__PURE__ */ React.createElement("a", { className: "external-access", href: link, target: "_blank", rel: "noopener noreferrer" }, "Abrir conte\xFAdo original ", /* @__PURE__ */ React.createElement(Icon, { kind: "external" }))) : /* @__PURE__ */ React.createElement("p", { className: "muted" }, "Nenhum link foi anexado a este comunicado.")), /* @__PURE__ */ React.createElement("section", { className: "detail-section" }, /* @__PURE__ */ React.createElement("h3", null, /* @__PURE__ */ React.createElement(Icon, { kind: "clock" }), "Validade da publica\xE7\xE3o"), /* @__PURE__ */ React.createElement("div", { className: "validity-row" }, /* @__PURE__ */ React.createElement(Icon, { kind: "calendar" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, post.expires_at ? "V\xE1lido at\xE9 " + longDate(post.expires_at) : "Sem vencimento"), /* @__PURE__ */ React.createElement("small", null, post.expires_at ? "Ao vencer, sai do Mural e \xE9 exclu\xEDdo automaticamente, inclusive se estiver fixado ou arquivado." : "Permanece at\xE9 ser arquivado ou exclu\xEDdo manualmente. Arquivar mant\xE9m o registro salvo."), post.archived_at && /* @__PURE__ */ React.createElement("small", null, "Esta publica\xE7\xE3o est\xE1 arquivada. O prazo de validade foi mantido."))))), /* @__PURE__ */ React.createElement("footer", { className: "detail-footer" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "secondary", disabled: busy, onClick: onClose }, "Fechar"), (post.archived_at ? canModerate : canEdit) && /* @__PURE__ */ React.createElement("button", { type: "button", className: "primary", disabled: busy, onClick: () => onAction(post.archived_at ? "restore" : "edit", post) }, /* @__PURE__ */ React.createElement(Icon, { kind: post.archived_at ? "refresh" : "edit" }), post.archived_at ? "Restaurar publica\xE7\xE3o" : "Editar post"), canDelete && /* @__PURE__ */ React.createElement("button", { type: "button", className: "danger", disabled: busy, onClick: () => onAction("delete", post), "aria-label": "Excluir este comunicado" }, /* @__PURE__ */ React.createElement(Icon, { kind: "trash" })))));
}
function monthExpiry(base, term) {
  const [y, m, day] = dateOnly(base).split("-").map(Number), d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + Number(term));
  d.setUTCDate(Math.min(day, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()));
  return d.toISOString().slice(0, 10) + "T23:59:59.999-03:00";
}
function Editor({ record, profile, users, canModerate, onClose, onSave }) {
  const ref = React.useRef(null), base = React.useId(), initial = React.useRef(/* @__PURE__ */ new Date()), key = React.useRef(globalThis.crypto?.randomUUID?.() || "00000000-0000-4000-8000-" + String(Date.now()).slice(-12));
  const [title, setTitle] = React.useState(record?.titulo || ""), [content, setContent] = React.useState(cleanBody(record || {})), [link, setLink] = React.useState(record?.link_url || ""), [image, setImage] = React.useState(record?.link_image_url || null), [term, setTerm] = React.useState(record?.validity_term || (record ? "none" : "6")), [custom, setCustom] = React.useState(record?.expires_at ? dateOnly(record.expires_at) : ""), [pinned, setPinned] = React.useState(!!record?.fixado), [busy, setBusy] = React.useState(false), [lookup, setLookup] = React.useState(""), [error, setError] = React.useState("");
  const lock = React.useRef(false);
  useDialog(ref, onClose, busy);
  const normalized = muralUrl(link), unchanged = !!record && term === (record.validity_term || "none") && (term !== "custom" || custom === dateOnly(record.expires_at));
  const expiry = unchanged ? record.expires_at : term === "none" ? null : term === "custom" ? custom ? custom + "T23:59:59.999-03:00" : null : monthExpiry(record?.created_at || initial.current, term);
  React.useEffect(() => {
    let current = true;
    const original = muralUrl(record?.link_url);
    if (normalized && normalized === original) {
      setImage(record?.link_image_url || null);
      setLookup("");
      return;
    }
    setImage(null);
    if (!link.trim()) {
      setLookup("");
      return;
    }
    if (!normalized) {
      setLookup("invalid");
      return;
    }
    setLookup("loading");
    const timer = setTimeout(async () => {
      try {
        const { data, error: error2 } = await supabase.functions.invoke("nexlab-mural-link-preview", { body: { url: normalized } });
        if (!current) return;
        if (error2) throw error2;
        const found = muralUrl(data?.image_url, 4096);
        setImage(found);
        setLookup(found ? "image-loading" : "empty");
      } catch {
        if (current) setLookup("failed");
      }
    }, 650);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [normalized, link, record]);
  const onPreviewStatus = React.useCallback((status) => {
    if (image) setLookup(status === "ready" ? "ready" : status === "failed" ? "image-failed" : "image-loading");
  }, [image]);
  const draft = { ...record || {}, id: "draft", titulo: title, conteudo: content, link_url: normalized, link_image_url: image, autor_id: record?.autor_id || profile.id, created_at: record?.created_at || initial.current.toISOString(), fixado: pinned, expires_at: expiry };
  async function submit(e) {
    e.preventDefault();
    if (lock.current) return;
    setError("");
    if (title.trim().length < 3 || content.trim().length < 3) return setError("Preencha o t\xEDtulo e o conte\xFAdo com pelo menos 3 caracteres.");
    if (link.trim() && !normalized) return setError("Informe um link v\xE1lido iniciado com http:// ou https://, sem usu\xE1rio ou senha.");
    if (term !== "none" && (!expiry || new Date(expiry) <= /* @__PURE__ */ new Date())) return setError("Escolha uma data de validade futura.");
    if (lookup === "loading") return;
    lock.current = true;
    setBusy(true);
    try {
      await onSave({ id: record?.id || null, title: title.trim(), content: content.trim(), link_url: normalized || null, pinned, validity: unchanged ? "keep" : term, expires_at: term === "custom" ? expiry : null, expected_updated_at: record?.updated_at, idempotency_key: key.current }, !!record);
      onClose();
    } catch (e2) {
      setError(e2?.message || "N\xE3o foi poss\xEDvel salvar o comunicado. Tente novamente.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return /* @__PURE__ */ React.createElement("dialog", { ref, className: "editor-dialog", "aria-labelledby": base + "title" }, /* @__PURE__ */ React.createElement("form", { className: "editor-shell", onSubmit: submit, noValidate: true }, /* @__PURE__ */ React.createElement("header", { className: "editor-header" }, /* @__PURE__ */ React.createElement("h2", { id: base + "title" }, /* @__PURE__ */ React.createElement(Icon, { kind: "megaphone" }), record ? "Editar comunicado" : "Novo comunicado"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "icon-button", disabled: busy, onClick: onClose, "aria-label": "Fechar formul\xE1rio" }, /* @__PURE__ */ React.createElement(Icon, { kind: "close" }))), /* @__PURE__ */ React.createElement("div", { className: "editor-body" }, /* @__PURE__ */ React.createElement("div", { className: "editor-fields" }, /* @__PURE__ */ React.createElement("label", { className: "field" }, "T\xEDtulo do comunicado *", /* @__PURE__ */ React.createElement("input", { id: "post-title", value: title, onChange: (e) => setTitle(e.target.value), required: true, minLength: 3, maxLength: 150, disabled: busy, placeholder: "Qual \xE9 a novidade?", autoFocus: true })), /* @__PURE__ */ React.createElement("label", { className: "field" }, "Conte\xFAdo *", /* @__PURE__ */ React.createElement("textarea", { id: "post-content", value: content, onChange: (e) => setContent(e.target.value), required: true, minLength: 3, maxLength: 1e4, disabled: busy, placeholder: "Escreva o comunicado completo\u2026" })), /* @__PURE__ */ React.createElement("label", { className: "field" }, "Link de acesso", /* @__PURE__ */ React.createElement("input", { id: "post-link", type: "url", inputMode: "url", value: link, onChange: (e) => setLink(e.target.value), maxLength: 2048, disabled: busy, placeholder: "https://" }), /* @__PURE__ */ React.createElement("small", null, "Quando dispon\xEDvel, a imagem deste link preenche o post. O acesso ao conte\xFAdo fica nos detalhes.")), /* @__PURE__ */ React.createElement("p", { className: "muted", role: "status" }, lookup === "loading" ? "Buscando a imagem do link\u2026" : lookup === "ready" ? "Imagem encontrada." : lookup === "image-loading" ? "Carregando a imagem\u2026" : lookup === "image-failed" ? "A imagem do link n\xE3o p\xF4de ser exibida. Voc\xEA pode publicar o comunicado informativo." : lookup === "invalid" ? "Revise o endere\xE7o do link." : lookup === "failed" ? "N\xE3o foi poss\xEDvel obter a imagem. Voc\xEA pode publicar o comunicado informativo com o link nos detalhes." : lookup === "empty" ? "O link n\xE3o forneceu uma imagem. O post ficar\xE1 no formato informativo." : normalized ? "O link ficar\xE1 acess\xEDvel nos detalhes." : "Sem link ou imagem, o comunicado aparece no formato informativo."), /* @__PURE__ */ React.createElement("div", { className: "two-fields" }, /* @__PURE__ */ React.createElement("label", { className: "field" }, "Validade", /* @__PURE__ */ React.createElement("select", { id: "post-validity", value: term, onChange: (e) => setTerm(e.target.value), disabled: busy }, /* @__PURE__ */ React.createElement("option", { value: "3" }, "3 meses"), /* @__PURE__ */ React.createElement("option", { value: "6" }, "6 meses"), /* @__PURE__ */ React.createElement("option", { value: "12" }, "12 meses"), /* @__PURE__ */ React.createElement("option", { value: "custom" }, "Data personalizada"), /* @__PURE__ */ React.createElement("option", { value: "none" }, "Sem vencimento"))), term === "custom" && /* @__PURE__ */ React.createElement("label", { className: "field" }, "V\xE1lido at\xE9 *", /* @__PURE__ */ React.createElement("input", { id: "post-expiry", type: "date", value: custom, onChange: (e) => setCustom(e.target.value), min: dateOnly(/* @__PURE__ */ new Date()), disabled: busy, required: true }))), /* @__PURE__ */ React.createElement("p", { className: "muted" }, term === "none" ? "Sem exclus\xE3o autom\xE1tica. Arquivar retira do Mural e mant\xE9m o registro salvo." : expiry ? "Exclus\xE3o autom\xE1tica ap\xF3s " + longDate(expiry) + ". Os prazos s\xE3o contados da publica\xE7\xE3o; editar o texto n\xE3o renova a validade." : "Escolha a data de vencimento."), canModerate && /* @__PURE__ */ React.createElement("label", { className: "pin-option" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: pinned, onChange: (e) => setPinned(e.target.checked), disabled: busy }), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, "Fixar no topo do Mural"), /* @__PURE__ */ React.createElement("small", null, "A publica\xE7\xE3o continua respeitando sua validade."))), error && /* @__PURE__ */ React.createElement("p", { className: "form-error", role: "alert" }, error)), /* @__PURE__ */ React.createElement("aside", { className: "editor-preview" }, /* @__PURE__ */ React.createElement("h3", null, "Pr\xE9via da publica\xE7\xE3o"), /* @__PURE__ */ React.createElement(Card, { post: draft, profile, users, preview: true, onImageStatus: onPreviewStatus }), /* @__PURE__ */ React.createElement("p", { className: "preview-explanation" }, "A imagem continua hospedada no site de origem. Alguns sites podem impedir a pr\xE9via."))), /* @__PURE__ */ React.createElement("footer", { className: "editor-footer" }, /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, onClick: onClose }, "Cancelar"), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "primary", disabled: busy || lookup === "loading" }, busy ? "Salvando\u2026" : record ? "Salvar altera\xE7\xF5es" : "Publicar comunicado"))));
}
function ConfirmDelete({ post, onClose, onConfirm, busy, error }) {
  const ref = React.useRef(null), base = React.useId();
  useDialog(ref, onClose, busy);
  return /* @__PURE__ */ React.createElement("dialog", { ref, className: "confirm-dialog", "aria-labelledby": base + "title" }, /* @__PURE__ */ React.createElement("h2", { id: base + "title" }, "Excluir comunicado?"), /* @__PURE__ */ React.createElement("p", null, "A publica\xE7\xE3o ", /* @__PURE__ */ React.createElement("strong", null, post.titulo), " ser\xE1 exclu\xEDda definitivamente. Os materiais hospedados no site de origem continuam l\xE1."), error && /* @__PURE__ */ React.createElement("p", { className: "form-error", role: "alert" }, error), /* @__PURE__ */ React.createElement("div", { className: "dialog-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, onClick: onClose, autoFocus: true }, "Cancelar"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "confirm-delete", disabled: busy, onClick: onConfirm }, busy ? "Excluindo\u2026" : "Excluir definitivamente")));
}
function MuralWorkspace({ profile, allUsers = [], addToast, onPostCreated, onPostUpdated, onPostDeleted }) {
  const [records, setRecords] = React.useState([]), [archived, setArchived] = React.useState(false), [counts, setCounts] = React.useState({ active: 0, archived: 0 }), [loading, setLoading] = React.useState(true), [error, setError] = React.useState(""), [search, setSearch] = React.useState(""), [pinned, setPinned] = React.useState(false), [page, setPage] = React.useState(1), [selected, setSelected] = React.useState(null), [editor, setEditor] = React.useState(null), [deleting, setDeleting] = React.useState(null), [busy, setBusy] = React.useState(false), [deleteError, setDeleteError] = React.useState("");
  const root = React.useRef(null), alive = React.useRef(true), request = React.useRef(0), lock = React.useRef(false), callbacks = React.useRef({});
  callbacks.current = { onPostCreated, onPostUpdated, onPostDeleted, addToast };
  const permissions = profile?.effective_permissions || [], canView = permissions.includes("module_mural"), canPublish = canView && permissions.includes("mural_publish"), canModerate = canView && permissions.includes("mural_moderate"), canDelete = canView && ["admin", "administrador"].includes(profile?.role);
  const canEdit = (p) => !p.archived_at && (canModerate || canPublish && p.autor_id === profile?.id);
  const load = React.useCallback(async (background = false) => {
    if (!canView) return;
    const token = ++request.current;
    if (background !== true) setLoading(true);
    setError("");
    try {
      const data = await api("list", { archived });
      if (alive.current && token === request.current) {
        setRecords(data.rows || []);
        setCounts({ active: data.active_count || 0, archived: data.archived_count || 0 });
      }
    } catch (e) {
      if (alive.current && token === request.current) setError(e?.message || "N\xE3o foi poss\xEDvel carregar o Mural.");
      if (background === true) throw e;
    } finally {
      if (alive.current && token === request.current) setLoading(false);
    }
  }, [archived, canView]);
  React.useEffect(() => {
    alive.current = true;
    load();
    const stop = globalThis.__NEXLAB_REALTIME_CORE__?.watch?.(["board_posts"], () => load(true), { scope: "mural", blocked: () => lock.current });
    return () => {
      alive.current = false;
      request.current++;
      stop?.();
    };
  }, [load]);
  React.useEffect(() => {
    if (selected && !records.some((p) => p.id === selected)) setSelected(null);
  }, [records, selected]);
  React.useEffect(() => {
    const closeMenus = (e) => {
      root.current?.querySelectorAll(".post-menu[open]").forEach((d) => {
        if (!d.contains(e.target)) d.open = false;
      });
    };
    document.addEventListener("click", closeMenus);
    return () => document.removeEventListener("click", closeMenus);
  }, []);
  async function mutate(action2, payload) {
    if (lock.current) throw Error("Aguarde a opera\xE7\xE3o atual.");
    lock.current = true;
    setBusy(true);
    const mutationKey = "mural-" + action2 + ":" + (payload.id || payload.idempotency_key || "new");
    if (window.nexlabAcquireMutation && !window.nexlabAcquireMutation(mutationKey)) {
      lock.current = false;
      setBusy(false);
      throw Error("Esta opera\xE7\xE3o j\xE1 est\xE1 em andamento.");
    }
    try {
      const row = await api(action2, payload);
      if (!alive.current) return row;
      const c = callbacks.current;
      if (action2 === "delete" || action2 === "archive") {
        setRecords((rows2) => rows2.filter((p) => p.id !== payload.id));
        c.onPostDeleted?.(payload.id);
      } else if (action2 === "restore") {
        setRecords((rows2) => rows2.filter((p) => p.id !== payload.id));
        c.onPostCreated?.(row);
      } else if (action2 === "save") {
        setRecords((rows2) => rows2.some((p) => p.id === row.id) ? rows2.map((p) => p.id === row.id ? row : p) : [row, ...rows2]);
        if (payload.id) c.onPostUpdated?.(row);
        else c.onPostCreated?.(row);
      } else {
        setRecords((rows2) => rows2.map((p) => p.id === row.id ? row : p));
        c.onPostUpdated?.(row);
      }
      c.addToast?.(action2 === "archive" ? "Publica\xE7\xE3o arquivada. A validade foi mantida." : action2 === "restore" ? "Publica\xE7\xE3o restaurada." : action2 === "delete" ? "Comunicado exclu\xEDdo definitivamente." : action2 === "pin" ? "Destaque atualizado." : "Comunicado salvo.", "ok");
      await load();
      return row;
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
      window.nexlabReleaseMutation?.(mutationKey);
    }
  }
  function action(type, post2) {
    if (lock.current) return;
    if (type === "edit") {
      setSelected(null);
      setEditor(post2);
    } else if (type === "delete") {
      setSelected(null);
      setDeleteError("");
      setDeleting(post2);
    } else {
      if (type === "restore") setSelected(null);
      mutate(type, { id: post2.id }).catch((e) => callbacks.current.addToast?.(e?.message || "N\xE3o foi poss\xEDvel atualizar o comunicado.", "err"));
    }
  }
  const q = search.trim().toLocaleLowerCase("pt-BR"), rows = records.filter((p) => (!p.expires_at || new Date(p.expires_at) > /* @__PURE__ */ new Date()) && (!pinned || p.fixado) && (!q || [p.titulo, cleanBody(p), p.author_name, allUsers.find((u) => u.id === p.autor_id)?.nome].join(" ").toLocaleLowerCase("pt-BR").includes(q))).sort((a, b) => Number(b.fixado) - Number(a.fixado) || new Date(b.created_at) - new Date(a.created_at) || b.id.localeCompare(a.id));
  const pages = Math.max(1, Math.ceil(rows.length / 6)), current = Math.min(page, pages), start = (current - 1) * 6, post = records.find((p) => p.id === selected), filtered = !!search.trim() || pinned;
  function changeTab(value) {
    if (lock.current || value === archived) return;
    request.current++;
    setSelected(null);
    setArchived(value);
    setRecords([]);
    setPage(1);
    setError("");
  }
  function changePage(n) {
    setPage(n);
    requestAnimationFrame(() => {
      const list = root.current?.querySelector(".posts-grid");
      list?.focus({ preventScroll: true });
      list?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }
  if (!canView) return /* @__PURE__ */ React.createElement("div", { className: "mural-interface-v02682" }, /* @__PURE__ */ React.createElement("p", { className: "form-error", role: "alert" }, "Voc\xEA n\xE3o possui acesso ao Mural Interno."));
  return /* @__PURE__ */ React.createElement("div", { className: "module-shell mural-interface-v02682", ref: root }, /* @__PURE__ */ React.createElement("section", { className: "hero" }, /* @__PURE__ */ React.createElement("div", { className: "hero-copy" }, /* @__PURE__ */ React.createElement("span", { className: "eyebrow" }, "Comunica\xE7\xE3o interna"), /* @__PURE__ */ React.createElement("h1", null, "Mural de comunicados"), /* @__PURE__ */ React.createElement("p", null, "Novidades, avisos e ideias que conectam nossa comunidade.")), /* @__PURE__ */ React.createElement("svg", { className: "hero-art", viewBox: "0 0 340 250", fill: "none", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "m160 5 95 55v110l-95 55-95-55V60Z", stroke: "#4480ad", strokeWidth: "2" }), /* @__PURE__ */ React.createElement("path", { d: "m225 43 80 46v92l-80 46-80-46V89Z", stroke: "#5c99c4", strokeWidth: "2" }), /* @__PURE__ */ React.createElement("path", { d: "m270 0 50 29v58l-50 29-50-29V29Z", stroke: "#ff9a42", strokeWidth: "2" }))), /* @__PURE__ */ React.createElement("div", { className: "toolbar-top" }, /* @__PURE__ */ React.createElement("nav", { className: "feed-tabs", "aria-label": "Visualiza\xE7\xE3o do Mural" }, /* @__PURE__ */ React.createElement("button", { type: "button", "aria-pressed": !archived, disabled: busy, className: !archived ? "is-current" : "", onClick: () => changeTab(false) }, /* @__PURE__ */ React.createElement(Icon, { kind: "grid" }), "Publica\xE7\xF5es ", /* @__PURE__ */ React.createElement("span", { className: "tab-count" }, counts.active)), canModerate && /* @__PURE__ */ React.createElement("button", { type: "button", "aria-pressed": archived, disabled: busy, className: archived ? "is-current" : "", onClick: () => changeTab(true) }, /* @__PURE__ */ React.createElement(Icon, { kind: "archive" }), "Arquivados ", /* @__PURE__ */ React.createElement("span", { className: "tab-count" }, counts.archived))), canPublish && /* @__PURE__ */ React.createElement("button", { type: "button", className: "primary create-button", disabled: busy, onClick: () => setEditor({ new: true }) }, /* @__PURE__ */ React.createElement(Icon, { kind: "plus" }), "Novo post")), /* @__PURE__ */ React.createElement("section", { className: "filters", "aria-label": "Buscar e filtrar publica\xE7\xF5es" }, /* @__PURE__ */ React.createElement("label", { className: "search" }, /* @__PURE__ */ React.createElement(Icon, { kind: "search" }), /* @__PURE__ */ React.createElement("input", { type: "search", value: search, onChange: (e) => {
    setSearch(e.target.value);
    setPage(1);
  }, "aria-label": "Buscar comunicados", placeholder: "Buscar comunicados\u2026" })), /* @__PURE__ */ React.createElement("button", { type: "button", className: "pin-filter", "aria-pressed": pinned, onClick: () => {
    setPinned((v) => !v);
    setPage(1);
  } }, /* @__PURE__ */ React.createElement(Icon, { kind: "pin" }), "Fixados"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "mural-refresh", onClick: load, disabled: loading || busy, "aria-label": "Atualizar comunicados" }, /* @__PURE__ */ React.createElement(Icon, { kind: "refresh" })), /* @__PURE__ */ React.createElement("span", { className: "results-label", role: "status" }, loading ? "Atualizando\u2026" : rows.length + " " + (rows.length === 1 ? "comunicado" : "comunicados"))), error && /* @__PURE__ */ React.createElement("p", { className: "form-error", role: "alert" }, error, " ", /* @__PURE__ */ React.createElement("button", { type: "button", onClick: load, disabled: busy || loading }, "Tentar novamente")), /* @__PURE__ */ React.createElement("section", { "aria-label": archived ? "Publica\xE7\xF5es arquivadas" : "Publica\xE7\xF5es do Mural" }, /* @__PURE__ */ React.createElement(PostsGrid, { loading }, rows.slice(start, start + 6).map((p) => /* @__PURE__ */ React.createElement(Card, { key: p.id, post: p, users: allUsers, profile, canEdit: canEdit(p), canModerate, canDelete, busy, onAction: action, onOpen: (p2) => setSelected(p2.id) })), !rows.length && !error && /* @__PURE__ */ React.createElement("div", { className: "empty" }, /* @__PURE__ */ React.createElement(Icon, { kind: archived ? "archive" : "megaphone" }), /* @__PURE__ */ React.createElement("strong", null, loading ? "Carregando comunicados\u2026" : filtered ? "Nenhum comunicado encontrado" : archived ? "Nenhuma publica\xE7\xE3o arquivada" : "Nenhum comunicado por aqui"), !loading && /* @__PURE__ */ React.createElement("p", null, filtered ? "Ajuste a busca ou o filtro para encontrar publica\xE7\xF5es." : archived ? "Os comunicados arquivados ficam aqui at\xE9 serem restaurados, exclu\xEDdos ou vencerem." : "Novas publica\xE7\xF5es aparecer\xE3o neste espa\xE7o."))), /* @__PURE__ */ React.createElement("footer", { className: "list-footer" }, /* @__PURE__ */ React.createElement("p", { role: "status", "aria-live": "polite" }, rows.length ? `Mostrando ${start + 1}\u2013${Math.min(start + 6, rows.length)} de ${rows.length}` : "0 publica\xE7\xF5es"), pages > 1 && /* @__PURE__ */ React.createElement("nav", { className: "pagination", "aria-label": "Pagina\xE7\xE3o do Mural" }, /* @__PURE__ */ React.createElement("button", { type: "button", disabled: current === 1, "aria-label": "P\xE1gina anterior do Mural", onClick: () => changePage(current - 1) }, /* @__PURE__ */ React.createElement(Icon, { kind: "left" })), /* @__PURE__ */ React.createElement("span", { role: "status" }, "P\xE1gina ", current, " de ", pages), [.../* @__PURE__ */ new Set([1, ...[current - 1, current, current + 1].filter((n) => n > 1 && n < pages), pages])].map((n, i, a) => /* @__PURE__ */ React.createElement(React.Fragment, { key: n }, i > 0 && n - a[i - 1] > 1 && /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2026"), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-label": "P\xE1gina " + n + " do Mural", "aria-current": current === n ? "page" : void 0, onClick: () => changePage(n) }, n))), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: current === pages, "aria-label": "Pr\xF3xima p\xE1gina do Mural", onClick: () => changePage(current + 1) }, /* @__PURE__ */ React.createElement(Icon, { kind: "right" }))))), post && /* @__PURE__ */ React.createElement(Details, { post, profile, users: allUsers, canEdit: canEdit(post), canModerate, canDelete, busy, onClose: () => setSelected(null), onAction: action }), " ", editor && /* @__PURE__ */ React.createElement(Editor, { key: editor.id || "new", record: editor.new ? null : editor, profile, users: allUsers, canModerate, onClose: () => setEditor(null), onSave: (payload) => mutate("save", payload) }), " ", deleting && /* @__PURE__ */ React.createElement(ConfirmDelete, { post: deleting, busy, error: deleteError, onClose: () => setDeleting(null), onConfirm: () => mutate("delete", { id: deleting.id }).then(() => setDeleting(null)).catch((e) => setDeleteError(e?.message || "N\xE3o foi poss\xEDvel excluir.")) }));
}
export {
  MuralWorkspace as default,
  Card, PostsGrid, Details,
  muralUrl
};
