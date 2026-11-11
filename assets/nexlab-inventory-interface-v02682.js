import { g as React, Ln as supabase } from "./nexlab-runtime-vendor.js?v=app-beta-0-26-82-oficial-kanban-navegacao-colunas";
export function InventoryModal({ title, onClose, panelClassName = 'max-w-2xl', children }) {
  const overlay = React.useRef(null), close = React.useRef(onClose), titleId = React.useId();
  close.current = onClose;
  React.useLayoutEffect(() => {
    const root = overlay.current, origin = document.activeElement, previousOverflow = document.body.style.overflow;
    const selector = 'button:not([disabled]),a[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const focusable = () => [...root.querySelectorAll(selector)].filter(node => node.getClientRects().length && !node.closest('[inert]'));
    const topmost = () => {
      const dialogs = [...document.querySelectorAll('[role="dialog"][aria-modal="true"],dialog[open]')].filter(node => node.getClientRects().length);
      const last = dialogs[dialogs.length - 1];
      return last === root;
    };
    const focusFirst = () => (focusable().find(node => node.hasAttribute('autofocus')) || focusable().find(node => node.matches('input,select,textarea')) || focusable()[0] || root).focus({ preventScroll: true });
    const onKey = event => {
      if (!topmost()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current?.(); return; }
      if (event.key !== 'Tab' || event.defaultPrevented) return;
      const items = focusable(), first = items[0], last = items[items.length - 1];
      if (!first) { event.preventDefault(); root.focus({ preventScroll: true }); return; }
      if (!root.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const onFocus = event => { if (topmost() && !root.contains(event.target)) focusFirst(); };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocus, true);
    focusFirst();
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocus, true);
      if (document.body.style.overflow === 'hidden') document.body.style.overflow = previousOverflow;
      requestAnimationFrame(() => { if (origin?.isConnected && origin.getClientRects().length && !origin.closest('[inert]')) origin.focus({ preventScroll: true }); });
    };
  }, []);
  return React.createElement('div', { ref: overlay, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabIndex: -1, className: 'nexlab-inventory-modal-overlay', onMouseDown: event => { if (event.target === event.currentTarget) close.current?.(); } },
    React.createElement('div', { className: `nexlab-inventory-modal-panel ${panelClassName}` },
      React.createElement('div', { className: 'nexlab-inventory-modal-header' }, React.createElement('h3', { id: titleId, className: 'font-extrabold text-lg text-blue-dark' }, title), React.createElement('button', { type: 'button', onClick: () => close.current?.(), 'aria-label': 'Fechar', className: 'nexlab-inventory-modal-close' }, '×')),
      React.createElement('div', { className: 'nexlab-inventory-modal-body' }, children)));
}
const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const count = (value) => Number(value || 0).toLocaleString("pt-BR");
const date = (value) => value ? new Date(String(value).length === 10 ? value + "T12:00:00" : value).toLocaleDateString("pt-BR") : "N\xE3o informada";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function InventoryIcon({ kind = "box" }) {
  const paths = { box: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "m12 3 9 5v8l-9 5-9-5V8z" }), /* @__PURE__ */ React.createElement("path", { d: "m3 8 9 5 9-5M12 13v8M7.5 5.5l9 5" })), pin: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "10", r: "2" })), tool: /* @__PURE__ */ React.createElement("path", { d: "m14 7 3 3 4-4a7 7 0 0 1-9 9L6 21l-3-3 6-6a7 7 0 0 1 9-9z" }), value: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "9" }), /* @__PURE__ */ React.createElement("path", { d: "M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12" })), user: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "7", r: "4" }), /* @__PURE__ */ React.createElement("path", { d: "M4 22v-3a8 8 0 0 1 16 0v3" })), calendar: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "5", width: "18", height: "16", rx: "2" }), /* @__PURE__ */ React.createElement("path", { d: "M7 3v4m10-4v4M3 11h18" })), check: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "9" }), /* @__PURE__ */ React.createElement("path", { d: "m8 12 3 3 5-6" })), alert: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "m12 3 10 18H2zM12 9v5" }), /* @__PURE__ */ React.createElement("path", { d: "M12 17h.01" })), monitor: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "3", width: "18", height: "14", rx: "2" }), /* @__PURE__ */ React.createElement("path", { d: "M8 21h8m-4-4v4" })), file: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M14 2H5v20h14V7zM14 2v6h5M8 12h8m-8 4h6" })), arrow: /* @__PURE__ */ React.createElement("path", { d: "m9 5 7 7-7 7" }), swap: /* @__PURE__ */ React.createElement("path", { d: "M3 7h17m-5-4 5 4-5 4M21 17H4m5-4-5 4 5 4" }), layers: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5" })) };
  return /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, paths[kind] || paths.box);
}
function stockCondition(row) {
  return Number(row.quantidade) === 0 ? "zero" : Number(row.quantidade) <= Number(row.estoque_minimo) ? "low" : "normal";
}
const labels = { normal: "Normal", low: "Estoque baixo", zero: "Zerado", disponivel: "Dispon\xEDvel", manutencao: "Em manuten\xE7\xE3o", danificado: "Danificado", inconsistente: "Inconsistente" };
function InventoryBadge({ status }) {
  return /* @__PURE__ */ React.createElement("span", { className: "inventory-badge inventory-badge--" + status }, /* @__PURE__ */ React.createElement("i", null), labels[status] || status);
}
function Metric({ label, value, icon, tone = "blue", onClick }) {
  const content = /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "inventory-metric-icon is-" + tone }, /* @__PURE__ */ React.createElement(InventoryIcon, { kind: icon })), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("small", null, label), /* @__PURE__ */ React.createElement("strong", null, value)));
  return onClick ? /* @__PURE__ */ React.createElement("button", { type: "button", onClick, className: "inventory-metric is-" + tone }, content) : /* @__PURE__ */ React.createElement("div", { className: "inventory-metric is-" + tone }, content);
}
function InventoryAssetCard({ asset, inspection, onOpen }) {
  return /* @__PURE__ */ React.createElement("article", { className: "inventory-card inventory-card--asset", "data-item-id": asset.id }, /* @__PURE__ */ React.createElement("span", { className: "inventory-card-icon" }, /* @__PURE__ */ React.createElement(InventoryIcon, { kind: asset.categoria === "Equipamento" ? "monitor" : "box" })), /* @__PURE__ */ React.createElement("div", { className: "inventory-card-copy" }, /* @__PURE__ */ React.createElement("h3", null, asset.nome || "Bem sem nome"), /* @__PURE__ */ React.createElement("p", null, asset.codigo_patrimonial || "Sem c\xF3digo"), /* @__PURE__ */ React.createElement("p", { className: "inventory-card-location" }, /* @__PURE__ */ React.createElement(InventoryIcon, { kind: "pin" }), asset.localizacao || "Localiza\xE7\xE3o n\xE3o informada")), /* @__PURE__ */ React.createElement(InventoryBadge, { status: inspection.status }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "inventory-card-open", onClick: () => onOpen(asset), "aria-label": "Ver detalhes de " + asset.nome }, "Ver detalhes ", /* @__PURE__ */ React.createElement(InventoryIcon, { kind: "arrow" })));
}
function StockCard({ item, onOpen }) {
  return /* @__PURE__ */ React.createElement("article", { className: "inventory-card inventory-card--stock", "data-item-id": item.id }, /* @__PURE__ */ React.createElement("span", { className: "inventory-card-icon" }, /* @__PURE__ */ React.createElement(InventoryIcon, null)), /* @__PURE__ */ React.createElement("div", { className: "inventory-card-copy" }, /* @__PURE__ */ React.createElement("h3", null, item.nome), /* @__PURE__ */ React.createElement("p", { className: "inventory-card-location" }, /* @__PURE__ */ React.createElement(InventoryIcon, { kind: "pin" }), item.localizacao || "Localiza\xE7\xE3o n\xE3o informada"), /* @__PURE__ */ React.createElement("strong", { className: "inventory-card-balance" }, count(item.quantidade), " ", /* @__PURE__ */ React.createElement("span", null, item.unidade_medida || "unidade"))), /* @__PURE__ */ React.createElement(InventoryBadge, { status: stockCondition(item) }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "inventory-card-open", onClick: () => onOpen(item), "aria-label": "Ver detalhes de " + item.nome }, "Ver detalhes ", /* @__PURE__ */ React.createElement(InventoryIcon, { kind: "arrow" })));
}
function useInventoryPage({ kind, records, addToast }) {
  const [selected, setSelected] = React.useState(null), panelRef = React.useRef(null), origin = React.useRef(null), pending = React.useRef(false), mounted = React.useRef(true), latest = React.useRef(records), selectedRef = React.useRef(selected), toast = React.useRef(addToast);
  latest.current = records;
  selectedRef.current = selected;
  toast.current = addToast;
  const read = () => {
    try {
      const u = new URL(location.href);
      return u.searchParams.get("nexlabInventory") === kind ? u.searchParams.get("nexlabItem") : null;
    } catch {
      return null;
    }
  };
  const focus = () => requestAnimationFrame(() => {
    const main = document.getElementById("nexlab-main-content");
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
    panelRef.current?.focus({ preventScroll: true });
  });
  const capture = () => {
    if (!selectedRef.current) {
      const main = document.getElementById("nexlab-main-content");
      origin.current = { main: main?.scrollTop || 0, window: window.scrollY, trigger: document.activeElement };
    }
  };
  const close = () => {
    setSelected(null);
    requestAnimationFrame(() => {
      const main = document.getElementById("nexlab-main-content");
      if (main) main.scrollTop = origin.current?.main || 0;
      window.scrollTo(0, origin.current?.window || 0);
      if (origin.current?.trigger?.isConnected) origin.current.trigger.focus({ preventScroll: true });
    });
  };
  const sync = async () => {
    const id = read();
    if (!uuid.test(id || "")) {
      close();
      return;
    }
    if (id === selectedRef.current?.id) return;
    capture();
    let row2 = latest.current.find((r) => r.id === id);
    if (!row2) {
      pending.current = true;
      try {
        const result = await supabase.from(kind === "stock" ? "stock_items" : "assets").select("*").eq("id", id).maybeSingle();
        if (result.error) throw result.error;
        row2 = result.data;
      } catch (error) {
        toast.current?.(error.message || "N\xE3o foi poss\xEDvel abrir o item.", "err");
      } finally {
        pending.current = false;
      }
    }
    if (!mounted.current || read() !== id) return;
    if (row2) {
      setSelected(row2);
      focus();
    } else {
      toast.current?.("Item n\xE3o encontrado ou sem acesso.", "err");
      try {
        const u = new URL(location.href);
        u.searchParams.delete("nexlabItem");
        history.replaceState(history.state, "", u);
      } catch {
      }
      close();
    }
  };
  React.useEffect(() => {
    mounted.current = true;
    sync();
    window.addEventListener("popstate", sync);
    return () => {
      mounted.current = false;
      window.removeEventListener("popstate", sync);
      try {
        const u = new URL(location.href);
        if (u.searchParams.get("nexlabInventory") === kind) {
          u.searchParams.delete("nexlabItem");
          u.searchParams.delete("nexlabInventory");
          history.replaceState({ ...history.state, nexlabInventoryPage: null }, "", u);
        }
      } catch {
      }
    };
  }, []);
  const candidate = selected && records.find((r) => r.id === selected.id);
  const row = selected && (candidate && String(candidate.updated_at || "") >= String(selected.updated_at || "") ? candidate : selected);
  return { selected: row, panelRef, open(item) {
    capture();
    setSelected(item);
    try {
      const u = new URL(location.href);
      if (u.searchParams.get("nexlabTab") !== "inventario") {
        u.searchParams.set("nexlabTab", "inventario");
        u.searchParams.delete("nexlabItem");
        u.searchParams.delete("nexlabInventory");
        history.replaceState({ ...history.state, nexlabTab: "inventario" }, "", u);
      }
      u.searchParams.set("nexlabInventory", kind);
      u.searchParams.set("nexlabItem", item.id);
      history.pushState({ ...history.state, nexlabInventoryPage: item.id }, "", u);
    } catch {
    }
    focus();
  }, back() {
    try {
      if (history.state?.nexlabInventoryPage === selectedRef.current?.id && read()) {
        history.back();
        return;
      }
      const u = new URL(location.href);
      u.searchParams.delete("nexlabItem");
      u.searchParams.delete("nexlabInventory");
      history.replaceState({ ...history.state, nexlabInventoryPage: null }, "", u);
    } catch {
    }
    close();
  }, update(item) {
    if (selectedRef.current?.id === item.id) setSelected(item);
  }, remove(id) {
    if (selectedRef.current?.id === id) {
      try {
        const u = new URL(location.href);
        u.searchParams.delete("nexlabItem");
        history.replaceState({ ...history.state, nexlabInventoryPage: null }, "", u);
      } catch {
      }
      close();
    }
  } };
}
function DataRows({ rows }) {
  return /* @__PURE__ */ React.createElement("dl", { className: "inventory-data-rows" }, rows.map(([label, value]) => /* @__PURE__ */ React.createElement("div", { key: label }, /* @__PURE__ */ React.createElement("dt", null, label), /* @__PURE__ */ React.createElement("dd", null, value || "N\xE3o informado"))));
}
function InventoryFilterOptions({ children }) {
  const ref = React.useRef(null), last = React.useRef(null), [expanded, setExpanded] = React.useState(true);
  React.useLayoutEffect(() => {
    const target = ref.current?.closest(".nexlab-inventory-shell");
    if (!target) return;
    const update = () => {
      const small = target.getBoundingClientRect().width <= 480;
      if (small !== last.current) {
        last.current = small;
        setExpanded(!small);
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  return /* @__PURE__ */ React.createElement("details", { ref, className: "inventory-filter-options", open: expanded, onToggle: (e) => setExpanded(e.currentTarget.open) }, /* @__PURE__ */ React.createElement("summary", null, "Filtros e ordena\xE7\xE3o"), /* @__PURE__ */ React.createElement("div", null, children));
}
function InventoryAssetFilters({ children }) {
  const parts = React.Children.toArray(children), summary = parts.pop(), search = parts.shift();
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("section", { className: "inventory-filter-panel" }, /* @__PURE__ */ React.createElement("div", { className: "inventory-search" }, search), /* @__PURE__ */ React.createElement(InventoryFilterOptions, null, parts)), /* @__PURE__ */ React.createElement("div", { className: "inventory-list-summary" }, summary));
}
function ActionMenu({ children }) {
  return /* @__PURE__ */ React.createElement("details", { className: "inventory-action-menu" }, /* @__PURE__ */ React.createElement("summary", null, "Mais a\xE7\xF5es ", /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2304")), /* @__PURE__ */ React.createElement("div", null, children));
}
function Action({ onClick, children, primary = false, danger = false, disabled = false }) {
  return /* @__PURE__ */ React.createElement("button", { type: "button", disabled, onClick, className: "inventory-action" + (primary ? " is-primary" : "") + (danger ? " is-danger" : "") }, children);
}
function InventoryAssetPage({ asset, inspection, responsible, onBack, panelRef, onEdit, onHistory, onCondition, onDelete, canManage, canDelete }) {
  const links = [["Nota fiscal", asset.link_nota_fiscal], ["Garantia", asset.link_garantia], ["Manual", asset.link_manual], ["Refer\xEAncia", asset.link_referencia]].filter(([, url]) => /^https?:\/\//i.test(url || ""));
  return /* @__PURE__ */ React.createElement("section", { ref: panelRef, tabIndex: -1, className: "inventory-detail-page", "aria-label": "Detalhes de " + asset.nome, key: asset.id }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "inventory-back", onClick: onBack }, "\u2190 Voltar para Patrim\xF4nio"), /* @__PURE__ */ React.createElement("header", { className: "inventory-detail-header" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", null, asset.nome), /* @__PURE__ */ React.createElement("p", { className: "inventory-detail-code" }, asset.codigo_patrimonial, " \xB7 ", asset.tombamento), /* @__PURE__ */ React.createElement("div", { className: "inventory-item-context" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement(InventoryIcon, { kind: "pin" }), asset.localizacao || "Localiza\xE7\xE3o n\xE3o informada"), /* @__PURE__ */ React.createElement(InventoryBadge, { status: inspection.status }))), /* @__PURE__ */ React.createElement("div", { className: "inventory-detail-actions" }, /* @__PURE__ */ React.createElement(Action, { onClick: () => onHistory(asset) }, "Hist\xF3rico"), canManage && /* @__PURE__ */ React.createElement(Action, { onClick: () => onEdit(asset), disabled: inspection.inconsistent }, "Editar"), (canManage || canDelete) && /* @__PURE__ */ React.createElement(ActionMenu, null, canManage && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Action, { onClick: () => onCondition(asset), disabled: inspection.inconsistent }, "Alterar condi\xE7\xE3o"), /* @__PURE__ */ React.createElement(Action, { onClick: () => onHistory(asset, "maintenance", true), disabled: inspection.inconsistent }, "Registrar manuten\xE7\xE3o"), /* @__PURE__ */ React.createElement(Action, { onClick: () => onHistory(asset, "movements"), disabled: inspection.inconsistent }, "Movimentar bem")), canDelete && /* @__PURE__ */ React.createElement(Action, { danger: true, onClick: () => onDelete(asset) }, "Excluir bem")))), inspection.inconsistent && /* @__PURE__ */ React.createElement("div", { className: "inventory-warning", role: "alert" }, inspection.issues.join(" \xB7 ")), /* @__PURE__ */ React.createElement("div", { className: "inventory-detail-metrics" }, /* @__PURE__ */ React.createElement(Metric, { icon: "user", label: "Respons\xE1vel", value: responsible || "N\xE3o definido" }), /* @__PURE__ */ React.createElement(Metric, { icon: "check", label: "Condi\xE7\xE3o", value: labels[inspection.status] }), /* @__PURE__ */ React.createElement(Metric, { icon: "calendar", label: "Aquisi\xE7\xE3o", value: date(asset.data_aquisicao) })), /* @__PURE__ */ React.createElement("section", { className: "inventory-information" }, /* @__PURE__ */ React.createElement("h2", null, /* @__PURE__ */ React.createElement(InventoryIcon, { kind: "file" }), " Informa\xE7\xF5es b\xE1sicas"), /* @__PURE__ */ React.createElement(DataRows, { rows: [["Marca / modelo", [asset.marca, asset.modelo].filter(Boolean).join(" \xB7 ")], ["Categoria", asset.categoria], ["Fornecedor", asset.fornecedor]] }), /* @__PURE__ */ React.createElement("details", { className: "inventory-more-details" }, /* @__PURE__ */ React.createElement("summary", null, "Mais detalhes ", /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2193")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(DataRows, { rows: [["N\xFAmero de s\xE9rie", asset.numero_serie], ["Valor de aquisi\xE7\xE3o", money(asset.valor_aquisicao ?? asset.valor_unitario)], ["Nota fiscal", asset.numero_nota_fiscal], ["Garantia at\xE9", date(asset.garantia_ate)], ["\xDAltima atualiza\xE7\xE3o", date(asset.updated_at || asset.created_at)], ["Observa\xE7\xF5es", asset.descricao]] }), links.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "inventory-links" }, links.map(([label, url]) => /* @__PURE__ */ React.createElement("a", { key: label, href: url, target: "_blank", rel: "noopener noreferrer" }, label, " \u2197")))))));
}
function Pager({ page, pages, total, onPage }) {
  const visible = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);
  return /* @__PURE__ */ React.createElement("nav", { className: "inventory-pagination", "aria-label": "Pagina\xE7\xE3o do estoque" }, /* @__PURE__ */ React.createElement("span", null, "P\xE1gina ", page, " de ", pages, " \xB7 ", total, " item(ns)"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("button", { type: "button", "aria-label": "P\xE1gina anterior do estoque", disabled: page <= 1, onClick: () => onPage(page - 1) }, "\u2039"), visible.map((p, i) => /* @__PURE__ */ React.createElement(React.Fragment, { key: p }, i > 0 && p - visible[i - 1] > 1 && /* @__PURE__ */ React.createElement("span", null, "\u2026"), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-current": p === page ? "page" : void 0, onClick: () => onPage(p) }, p))), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-label": "Pr\xF3xima p\xE1gina do estoque", disabled: page >= pages, onClick: () => onPage(page + 1) }, "\u203A")));
}
function StockHistory({ item }) {
  const [result, setResult] = React.useState({ loading: true, rows: [], error: "" }), [page, setPage] = React.useState(0), [retry, setRetry] = React.useState(0);
  React.useEffect(() => {
    let live = true;
    setResult({ loading: true, rows: [], error: "" });
    (async () => {
      try {
        const { data, error, count: total } = await supabase.from("nexlab_stock_movements").select("id,movement_type,quantity_before,quantity_after,delta,reason,created_at", { count: "exact" }).eq("item_id", item.id).order("created_at", { ascending: false }).order("id", { ascending: false }).range(page * 20, page * 20 + 19);
        if (error) throw error;
        if (live) setResult({ loading: false, rows: data || [], total: total || 0, error: "" });
      } catch (error) {
        if (live) setResult({ loading: false, rows: [], error: error.message || "N\xE3o foi poss\xEDvel carregar o hist\xF3rico." });
      }
    })();
    return () => {
      live = false;
    };
  }, [item.id, page, retry]);
  return /* @__PURE__ */ React.createElement("section", { className: "inventory-stock-history", "aria-label": "Hist\xF3rico de estoque" }, /* @__PURE__ */ React.createElement("h3", null, "Hist\xF3rico de movimenta\xE7\xF5es"), result.loading ? /* @__PURE__ */ React.createElement("p", { role: "status" }, "Carregando hist\xF3rico\u2026") : result.error ? /* @__PURE__ */ React.createElement("div", { role: "alert" }, /* @__PURE__ */ React.createElement("p", null, result.error), /* @__PURE__ */ React.createElement(Action, { onClick: () => setRetry((v) => v + 1) }, "Tentar novamente")) : result.rows.length ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("ol", null, result.rows.map((r) => /* @__PURE__ */ React.createElement("li", { key: r.id }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, { initial: "Saldo inicial", entry: "Entrada", exit: "Sa\xEDda", adjustment: "Ajuste", deleted: "Exclus\xE3o" }[r.movement_type] || "Movimenta\xE7\xE3o"), /* @__PURE__ */ React.createElement("time", null, date(r.created_at))), /* @__PURE__ */ React.createElement("p", null, count(r.quantity_before), " \u2192 ", count(r.quantity_after), " ", item.unidade_medida), r.reason && /* @__PURE__ */ React.createElement("p", null, r.reason)))), result.total > 20 && /* @__PURE__ */ React.createElement("div", { className: "inventory-history-pagination" }, /* @__PURE__ */ React.createElement(Action, { disabled: page === 0, onClick: () => setPage((p) => p - 1) }, "Anterior"), /* @__PURE__ */ React.createElement("span", null, "P\xE1gina ", page + 1, " de ", Math.ceil(result.total / 20)), /* @__PURE__ */ React.createElement(Action, { disabled: (page + 1) * 20 >= result.total, onClick: () => setPage((p) => p + 1) }, "Pr\xF3xima"))) : /* @__PURE__ */ React.createElement("p", null, "Nenhuma movimenta\xE7\xE3o registrada."));
}
function StockMovement({ item, onClose, onSaved, addToast }) {
  const [type, setType] = React.useState("entry"), [quantity, setQuantity] = React.useState(""), [busy, setBusy] = React.useState(false), [error, setError] = React.useState(""), saving = React.useRef(false), formRef = React.useRef(null), trigger = React.useRef(document.activeElement);
  React.useEffect(() => {
    formRef.current?.querySelector("input")?.focus();
    const close = (e) => {
      if (e.key === "Escape" && !saving.current) {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", close, true);
    return () => {
      window.removeEventListener("keydown", close, true);
      if (trigger.current?.isConnected) trigger.current.focus();
    };
  }, []);
  const delta = Number(quantity), after = Number(item.quantidade) + (type === "entry" ? delta : -delta);
  const submit = async (e) => {
    e.preventDefault();
    if (saving.current) return;
    setError("");
    if (!/^[1-9]\d*$/.test(quantity) || !Number.isSafeInteger(after) || after < 0 || after > 2147483647) {
      setError("Informe uma quantidade inteira v\xE1lida. A sa\xEDda n\xE3o pode ultrapassar o saldo.");
      return;
    }
    const lock = "stock-save:" + item.id;
    if (window.nexlabAcquireMutation && !window.nexlabAcquireMutation(lock)) return;
    saving.current = true;
    setBusy(true);
    try {
      const fresh = await supabase.from("stock_items").select("*").eq("id", item.id).maybeSingle();
      if (fresh.error) throw fresh.error;
      if (!fresh.data) throw Error("Item n\xE3o encontrado.");
      if (Number(fresh.data.quantidade) !== Number(item.quantidade)) throw Error("O saldo mudou durante a opera\xE7\xE3o. Feche esta janela e confira o saldo atualizado antes de continuar.");
      const row = fresh.data;
      const { data, error: error2 } = await supabase.rpc("nexlab_save_stock_item_v26110", { p_item_id: row.id, p_payload: { nome: row.nome, quantidade: String(after), estoque_minimo: String(row.estoque_minimo), unidade_medida: row.unidade_medida, valor_unitario: String(row.valor_unitario), localizacao: row.localizacao || "", descricao: row.descricao || "" } });
      if (error2) throw error2;
      const saved = data?.item || data;
      if (!saved?.id) throw Error("O cadastro n\xE3o confirmou a movimenta\xE7\xE3o.");
      onSaved(saved);
      addToast("Movimenta\xE7\xE3o de estoque registrada.", "ok");
      onClose();
    } catch (error2) {
      setError(error2.message || "N\xE3o foi poss\xEDvel movimentar o estoque.");
    } finally {
      saving.current = false;
      setBusy(false);
      window.nexlabReleaseMutation?.(lock);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "inventory-movement-overlay", onClick: (e) => e.target === e.currentTarget && !busy && onClose() }, /* @__PURE__ */ React.createElement("section", { role: "dialog", "aria-modal": "true", "aria-labelledby": "inventory-movement-title", className: "inventory-movement-dialog", onKeyDown: (e) => {
    if (e.key === "Tab") {
      const nodes = [...e.currentTarget.querySelectorAll("button:not(:disabled),input,select")];
      const first = nodes[0], last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  } }, /* @__PURE__ */ React.createElement("h2", { id: "inventory-movement-title" }, "Movimentar estoque"), /* @__PURE__ */ React.createElement("p", null, item.nome), /* @__PURE__ */ React.createElement("form", { ref: formRef, onSubmit: submit }, /* @__PURE__ */ React.createElement("label", null, "Tipo de movimenta\xE7\xE3o", /* @__PURE__ */ React.createElement("select", { value: type, disabled: busy, onChange: (e) => setType(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "entry" }, "Entrada"), /* @__PURE__ */ React.createElement("option", { value: "exit" }, "Sa\xEDda"))), /* @__PURE__ */ React.createElement("label", null, "Quantidade", /* @__PURE__ */ React.createElement("input", { required: true, type: "number", min: "1", max: "2147483647", step: "1", value: quantity, disabled: busy, onChange: (e) => setQuantity(e.target.value) })), /* @__PURE__ */ React.createElement("p", null, "Saldo atual: ", /* @__PURE__ */ React.createElement("strong", null, count(item.quantidade), " ", item.unidade_medida)), /* @__PURE__ */ React.createElement("p", null, "Saldo ap\xF3s movimenta\xE7\xE3o: ", /* @__PURE__ */ React.createElement("strong", null, Number.isFinite(after) ? count(after) : "\u2014", " ", item.unidade_medida)), error && /* @__PURE__ */ React.createElement("p", { role: "alert", className: "inventory-warning" }, error), /* @__PURE__ */ React.createElement("div", { className: "inventory-detail-actions" }, /* @__PURE__ */ React.createElement(Action, { disabled: busy, onClick: onClose }, "Cancelar"), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "inventory-action is-primary", disabled: busy }, busy ? "Registrando\u2026" : "Confirmar movimenta\xE7\xE3o")))));
}
function StockPage({ item, navigation, onEdit, onDelete, onUpdated, canManage, canDelete, addToast }) {
  const [movement, setMovement] = React.useState(false), [history2, setHistory] = React.useState(false);
  return /* @__PURE__ */ React.createElement("section", { ref: navigation.panelRef, tabIndex: -1, className: "inventory-detail-page", "aria-label": "Detalhes de " + item.nome }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "inventory-back", onClick: navigation.back }, "\u2190 Voltar para Estoque"), /* @__PURE__ */ React.createElement("header", { className: "inventory-detail-header" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", null, item.nome), /* @__PURE__ */ React.createElement("div", { className: "inventory-item-context" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement(InventoryIcon, { kind: "pin" }), item.localizacao || "Localiza\xE7\xE3o n\xE3o informada"), /* @__PURE__ */ React.createElement(InventoryBadge, { status: stockCondition(item) }))), /* @__PURE__ */ React.createElement("div", { className: "inventory-detail-actions" }, canManage && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Action, { primary: true, onClick: () => setMovement(true) }, /* @__PURE__ */ React.createElement(InventoryIcon, { kind: "swap" }), " Movimentar"), /* @__PURE__ */ React.createElement(Action, { onClick: () => onEdit(item) }, "Editar saldo")), /* @__PURE__ */ React.createElement(ActionMenu, null, /* @__PURE__ */ React.createElement(Action, { onClick: () => setHistory(!history2) }, history2 ? "Recolher hist\xF3rico" : "Hist\xF3rico"), canDelete && /* @__PURE__ */ React.createElement(Action, { danger: true, onClick: () => onDelete(item) }, "Excluir item")))), /* @__PURE__ */ React.createElement("div", { className: "inventory-detail-metrics" }, /* @__PURE__ */ React.createElement(Metric, { icon: "box", label: "Saldo atual", value: count(item.quantidade) + " " + (item.unidade_medida || "unidade") }), /* @__PURE__ */ React.createElement(Metric, { icon: "layers", label: "Estoque m\xEDnimo", value: count(item.estoque_minimo) + " " + (item.unidade_medida || "unidade") }), /* @__PURE__ */ React.createElement(Metric, { icon: "value", label: "Valor unit\xE1rio", value: money(item.valor_unitario) })), /* @__PURE__ */ React.createElement("section", { className: "inventory-information" }, /* @__PURE__ */ React.createElement("h2", null, /* @__PURE__ */ React.createElement(InventoryIcon, { kind: "file" }), " Informa\xE7\xF5es b\xE1sicas"), /* @__PURE__ */ React.createElement(DataRows, { rows: [["Categoria", item.categoria || "Consum\xEDvel"], ["Unidade de medida", item.unidade_medida], ["\xDAltima atualiza\xE7\xE3o", date(item.updated_at || item.created_at)]] }), /* @__PURE__ */ React.createElement("details", { className: "inventory-more-details" }, /* @__PURE__ */ React.createElement("summary", null, "Mais detalhes ", /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2193")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(DataRows, { rows: [["Valor total em estoque", money(Number(item.quantidade) * Number(item.valor_unitario))], ["Descri\xE7\xE3o", item.descricao], ["Data de cadastro", date(item.created_at)]] }), /* @__PURE__ */ React.createElement(Action, { onClick: () => setHistory(!history2) }, history2 ? "Recolher hist\xF3rico" : "Consultar hist\xF3rico de movimenta\xE7\xF5es")))), history2 && /* @__PURE__ */ React.createElement(StockHistory, { key: item.id + "-" + item.updated_at, item }), " ", movement && /* @__PURE__ */ React.createElement(StockMovement, { item, addToast, onClose: () => setMovement(false), onSaved: (row) => {
    navigation.update(row);
    onUpdated(row);
  } }));
}
function StockWorkspace({ items, profile, addToast, onCreate, onEdit, onDelete, onUpdated, onExport }) {
  const [search, setSearch] = React.useState(""), [condition, setCondition] = React.useState("todos"), [category, setCategory] = React.useState("todos"), [sort, setSort] = React.useState("updated_desc"), [page, setPage] = React.useState(1), [size, setSize] = React.useState(12), [exporting, setExporting] = React.useState(false);
  const permissions = profile?.effective_permissions || [], canManage = permissions.includes("estoque_manage"), canDelete = ["admin", "administrador"].includes(String(profile?.role || "").toLowerCase()), canExport = permissions.includes("reports_export") && permissions.includes("module_relatorios") && permissions.includes("module_estoque") && permissions.includes("estoque_view");
  const navigation = useInventoryPage({ kind: "stock", records: items, addToast });
  const categories = [...new Set(items.map((r) => r.categoria || "Consum\xEDvel"))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const filtered = React.useMemo(() => items.filter((r) => (category === "todos" || (r.categoria || "Consum\xEDvel") === category) && (condition === "todos" || stockCondition(r) === { zerados: "zero", baixos: "low", normais: "normal" }[condition]) && [r.nome, r.localizacao, r.unidade_medida, r.descricao].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR"))).sort((a, b) => {
    let n = sort === "name_asc" ? String(a.nome).localeCompare(String(b.nome), "pt-BR") : sort === "name_desc" ? String(b.nome).localeCompare(String(a.nome), "pt-BR") : sort === "balance_asc" ? Number(a.quantidade) - Number(b.quantidade) : sort === "balance_desc" ? Number(b.quantidade) - Number(a.quantidade) : String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""));
    return n || String(a.id).localeCompare(String(b.id));
  }), [items, search, condition, category, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / size)), current = Math.min(page, pages), visible = filtered.slice((current - 1) * size, current * size);
  React.useEffect(() => setPage(1), [search, condition, category, sort, size]);
  const metrics = items.reduce((m, r) => {
    m.units += Number(r.quantidade || 0);
    m[stockCondition(r)]++;
    m.value += Number(r.quantidade || 0) * Number(r.valor_unitario || 0);
    return m;
  }, { units: 0, zero: 0, low: 0, normal: 0, value: 0 });
  const exportReport = async (type) => {
    if (exporting || !canExport) return;
    setExporting(true);
    try {
      const result = await onExport(type);
      if (!result) throw Error("O relat\xF3rio n\xE3o foi gerado.");
      const audit = await supabase.rpc("nexlab_record_report_export", { p_scope: "estoque", p_file_type: type === "excel" ? "xlsx" : "pdf", p_record_count: result.record_count || 0, p_confidential: false, p_filters: { source: "inventory_interface_v02682", report_scope: "all_stock", server_query: true } });
      if (audit.error) throw Error("Arquivo gerado, mas n\xE3o foi poss\xEDvel registrar a exporta\xE7\xE3o: " + audit.error.message);
      addToast("Relat\xF3rio de estoque gerado e auditado.", "ok");
    } catch (error) {
      addToast(error.message || "N\xE3o foi poss\xEDvel exportar o estoque.", "err");
    } finally {
      setExporting(false);
    }
  };
  React.useEffect(() => {
    if (navigation.selected && !items.some((row) => row.id === navigation.selected.id)) navigation.remove(navigation.selected.id);
  }, [items]);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "inventory-stock-listing", hidden: !!navigation.selected }, /* @__PURE__ */ React.createElement("header", { className: "nexlab-inventory-sectionbar" }, /* @__PURE__ */ React.createElement("div", { className: "nexlab-inventory-sectionbar__copy" }, /* @__PURE__ */ React.createElement("span", { className: "nexlab-inventory-sectionbar__icon" }, /* @__PURE__ */ React.createElement(InventoryIcon, null)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", null, "Controle de estoque"), /* @__PURE__ */ React.createElement("p", null, "Acompanhe os itens, saldos e movimenta\xE7\xF5es do laborat\xF3rio."))), /* @__PURE__ */ React.createElement("div", { className: "nexlab-inventory-sectionbar__actions" }, null, canManage && /* @__PURE__ */ React.createElement(Action, { primary: true, onClick: onCreate }, "+ Adicionar consum\xEDvel"))), /* @__PURE__ */ React.createElement("div", { className: "inventory-metrics" }, /* @__PURE__ */ React.createElement(Metric, { label: "Tipos de itens", value: count(items.length), icon: "box", onClick: () => setCondition("todos") }), /* @__PURE__ */ React.createElement(Metric, { label: "Unidades em saldo", value: count(metrics.units), icon: "layers", tone: "green", onClick: () => setCondition("normais") }), /* @__PURE__ */ React.createElement(Metric, { label: "Estoque baixo", value: count(metrics.low), icon: "alert", tone: "amber", onClick: () => setCondition("baixos") }), /* @__PURE__ */ React.createElement(Metric, { label: "Itens zerados", value: count(metrics.zero), icon: "alert", tone: "red", onClick: () => setCondition("zerados") })), /* @__PURE__ */ React.createElement("section", { className: "inventory-filter-panel" }, /* @__PURE__ */ React.createElement("div", { className: "inventory-search" }, /* @__PURE__ */ React.createElement("input", { type: "search", "aria-label": "Buscar no estoque", placeholder: "Buscar consum\xEDvel, unidade ou localiza\xE7\xE3o...", value: search, onChange: (e) => setSearch(e.target.value) })), /* @__PURE__ */ React.createElement(InventoryFilterOptions, null, /* @__PURE__ */ React.createElement("select", { "aria-label": "Categoria do estoque", value: category, onChange: (e) => setCategory(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "todos" }, "Todas as categorias"), categories.map((c) => /* @__PURE__ */ React.createElement("option", { key: c, value: c }, c))), /* @__PURE__ */ React.createElement("select", { "aria-label": "Saldo do estoque", value: condition, onChange: (e) => setCondition(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "todos" }, "Todos os saldos"), /* @__PURE__ */ React.createElement("option", { value: "zerados" }, "Zerados"), /* @__PURE__ */ React.createElement("option", { value: "baixos" }, "Estoque baixo"), /* @__PURE__ */ React.createElement("option", { value: "normais" }, "Acima do m\xEDnimo")), /* @__PURE__ */ React.createElement("select", { "aria-label": "Ordenar estoque", value: sort, onChange: (e) => setSort(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "updated_desc" }, "Mais recentes"), /* @__PURE__ */ React.createElement("option", { value: "name_asc" }, "Nome: A\u2013Z"), /* @__PURE__ */ React.createElement("option", { value: "name_desc" }, "Nome: Z\u2013A"), /* @__PURE__ */ React.createElement("option", { value: "balance_asc" }, "Menor saldo"), /* @__PURE__ */ React.createElement("option", { value: "balance_desc" }, "Maior saldo")), /* @__PURE__ */ React.createElement("select", { "aria-label": "Itens de estoque por p\xE1gina", value: size, onChange: (e) => setSize(Number(e.target.value)) }, [6, 12, 24, 48].map((n) => /* @__PURE__ */ React.createElement("option", { key: n, value: n }, n, " por p\xE1gina"))))), /* @__PURE__ */ React.createElement("div", { className: "inventory-list-summary", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("span", null, filtered.length, " de ", items.length, " item(ns)"), /* @__PURE__ */ React.createElement("span", null, "Valor estimado: ", money(metrics.value))), visible.length ? /* @__PURE__ */ React.createElement("div", { className: "inventory-card-grid inventory-card-grid--stock nexlab-inventory-list-scroll", "aria-label": "Lista de itens de estoque" }, visible.map((item) => /* @__PURE__ */ React.createElement(StockCard, { key: item.id, item, onOpen: navigation.open }))) : /* @__PURE__ */ React.createElement("div", { className: "inventory-empty" }, /* @__PURE__ */ React.createElement(InventoryIcon, null), /* @__PURE__ */ React.createElement("h3", null, "Nenhum consum\xEDvel encontrado"), /* @__PURE__ */ React.createElement("p", null, "Confira a busca e os filtros ou cadastre um material.")), /* @__PURE__ */ React.createElement(Pager, { page: current, pages, total: filtered.length, onPage: setPage })), navigation.selected && /* @__PURE__ */ React.createElement(StockPage, { key: navigation.selected.id, item: navigation.selected, navigation, canManage, canDelete, addToast, onEdit, onDelete, onUpdated }));
}
export {
  InventoryAssetCard,
  InventoryAssetFilters,
  InventoryAssetPage,
  InventoryBadge,
  InventoryIcon,
  StockWorkspace,
  useInventoryPage
};
