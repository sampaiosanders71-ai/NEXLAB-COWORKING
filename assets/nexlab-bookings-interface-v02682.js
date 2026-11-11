import { g as React } from "./nexlab-runtime-vendor.js?v=app-beta-0-26-82-oficial-kanban-navegacao-colunas";
function BookingGlyph({ kind = "calendar" }) {
  const paths = { calendar: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "5", width: "18", height: "16", rx: "3" }), /* @__PURE__ */ React.createElement("path", { d: "M7 3v4m10-4v4M3 11h18m-12 4h6m-6 3h4" })), people: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("circle", { cx: "9", cy: "7", r: "3" }), /* @__PURE__ */ React.createElement("path", { d: "M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-3-5" })), pin: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "10", r: "2" })), clock: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "9" }), /* @__PURE__ */ React.createElement("path", { d: "M12 6v6l4 2" })), arrow: /* @__PURE__ */ React.createElement("path", { d: "m9 5 7 7-7 7" }), close: /* @__PURE__ */ React.createElement("path", { d: "m6 6 12 12M6 18 18 6" }), search: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("circle", { cx: "10", cy: "10", r: "6" }), /* @__PURE__ */ React.createElement("path", { d: "m15 15 6 6" })), chevron: /* @__PURE__ */ React.createElement("path", { d: "m6 9 6 6 6-6" }) };
  return /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, paths[kind] || paths.calendar);
}
function FocusDialog({ children, title, onClose, busy = false, editor = false, icon }) {
  const ref = React.useRef(null), trigger = React.useRef(null), closeRef = React.useRef(onClose), busyRef = React.useRef(busy), titleId = React.useId();
  closeRef.current = onClose;
  busyRef.current = busy;
  React.useEffect(() => {
    trigger.current = document.activeElement;
    const main = document.getElementById("nexlab-main-content"), overflow = main?.style.overflow;
    if (main) main.style.overflow = "hidden";
    const timer = requestAnimationFrame(() => {
      const first = ref.current?.querySelector("input:not(:disabled),textarea:not(:disabled),select:not(:disabled)") || ref.current?.querySelector("button:not(:disabled)");
      first?.focus({ preventScroll: true });
    });
    const key = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!busyRef.current) closeRef.current();
      }
    };
    window.addEventListener("keydown", key, true);
    return () => {
      cancelAnimationFrame(timer);
      window.removeEventListener("keydown", key, true);
      if (main) main.style.overflow = overflow || "";
      if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true });
    };
  }, []);
  return /* @__PURE__ */ React.createElement("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, className: "booking-dialog-overlay" + (editor ? " is-editor" : ""), onClick: (e) => {
    if (e.target === e.currentTarget && !busy) onClose();
  }, onKeyDown: (e) => {
    if (e.key !== "Tab") return;
    const nodes = [...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex="0"]')].filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden"), first = nodes[0], last = nodes.at(-1);
    if (!first) {
      e.preventDefault();
      return;
    }
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  } }, /* @__PURE__ */ React.createElement("section", { ref, className: "booking-dialog" + (editor ? " booking-editor-dialog" : " booking-details-dialog") }, /* @__PURE__ */ React.createElement("header", { className: "booking-dialog-header" }, /* @__PURE__ */ React.createElement("h2", { id: titleId }, icon || /* @__PURE__ */ React.createElement(BookingGlyph, null), title), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-label": "Fechar", disabled: busy, onClick: onClose }, /* @__PURE__ */ React.createElement(BookingGlyph, { kind: "close" }))), children));
}
function BookingEditorDialog({ title, icon, onClose, busy, children }) {
  const pieces = React.Children.toArray(children.props.children), footer = pieces.pop();
  return /* @__PURE__ */ React.createElement(FocusDialog, { title, onClose, busy, editor: true, icon }, React.cloneElement(children, { className: "booking-editor-form", children: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "booking-editor-scroll" }, pieces), /* @__PURE__ */ React.createElement("footer", { className: "booking-editor-footer" }, footer)) }));
}
function BookingDetailsDialog({ title, icon, onClose, busy, children }) {
  return /* @__PURE__ */ React.createElement(FocusDialog, { title, icon, onClose, busy }, /* @__PURE__ */ React.createElement("div", { className: "booking-details-scroll" }, children));
}
function Field({ label, children, optional = false, className = "" }) {
  const id = React.useId();
  return /* @__PURE__ */ React.createElement("div", { className: "booking-field " + className }, /* @__PURE__ */ React.createElement("label", { htmlFor: id }, label, optional && /* @__PURE__ */ React.createElement("span", { className: "booking-optional" }, " opcional")), React.cloneElement(children, { id }));
}
function Participants({ users, allUsers, selected, onChange, query, onQueryChange }) {
  const [expanded, setExpanded] = React.useState(true), [limit, setLimit] = React.useState(5), ref = React.useRef(null), listId = React.useId();
  React.useLayoutEffect(() => {
    if (ref.current?.getBoundingClientRect().width < 440) setExpanded(false);
  }, []);
  React.useEffect(() => setLimit(5), [query]);
  const selectedSet = new Set(selected.map(String)), available = new Set(users.map((u) => String(u.id))), term = query.trim().toLocaleLowerCase("pt-BR"), matches = users.filter((u) => !term || [u.nome, u.email, u.matricula, u.curso].some((s) => String(s || "").toLocaleLowerCase("pt-BR").includes(term))), missing = selected.filter((id) => !available.has(String(id)));
  return /* @__PURE__ */ React.createElement("section", { ref, className: "booking-participants" }, /* @__PURE__ */ React.createElement("div", { className: "booking-participants-head" }, /* @__PURE__ */ React.createElement("button", { type: "button", "aria-expanded": expanded, "aria-controls": listId, onClick: () => setExpanded((v) => !v) }, /* @__PURE__ */ React.createElement("span", null, "Participantes"), /* @__PURE__ */ React.createElement(BookingGlyph, { kind: "chevron" })), /* @__PURE__ */ React.createElement("span", { className: "booking-selected-count" }, selected.length, " selecionado", selected.length === 1 ? "" : "s")), /* @__PURE__ */ React.createElement("div", { className: "booking-participant-search" }, /* @__PURE__ */ React.createElement(BookingGlyph, { kind: "search" }), /* @__PURE__ */ React.createElement("input", { type: "search", "aria-label": "Buscar participante por nome", placeholder: "Buscar participante por nome...", value: query, onChange: (e) => {
    onQueryChange(e.target.value);
    setExpanded(true);
  } })), expanded && /* @__PURE__ */ React.createElement("div", { id: listId, className: "booking-participant-list" }, matches.length ? matches.slice(0, limit).map((u) => /* @__PURE__ */ React.createElement("label", { key: u.id, className: "booking-person" + (selectedSet.has(String(u.id)) ? " is-selected" : "") }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: selectedSet.has(String(u.id)), onChange: () => onChange(selectedSet.has(String(u.id)) ? selected.filter((id) => String(id) !== String(u.id)) : [...selected, String(u.id)]) }), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, u.nome || "Usu\xE1rio sem nome"), /* @__PURE__ */ React.createElement("small", null, String(u.role || u.curso || "").replaceAll("_", " "))))) : /* @__PURE__ */ React.createElement("p", null, "Nenhum usu\xE1rio ativo encontrado."), matches.length > limit && /* @__PURE__ */ React.createElement("button", { type: "button", className: "booking-load-people", onClick: () => setLimit((v) => v + 5) }, "Mostrar mais participantes (", matches.length - limit, ")")), missing.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "booking-unavailable", role: "alert" }, /* @__PURE__ */ React.createElement("strong", null, "Participantes indispon\xEDveis \u2014 remova antes de salvar"), missing.map((id) => {
    const user = allUsers.find((u) => String(u.id) === String(id));
    return /* @__PURE__ */ React.createElement("div", { key: id }, /* @__PURE__ */ React.createElement("span", null, user?.nome || "Participante indispon\xEDvel"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => onChange(selected.filter((other) => String(other) !== String(id))) }, "Remover"));
  })));
}
function BookingFormFields({ form, setForm, editing, canReserve, canMeet, spaces, users, allUsers, query, onQueryChange, busy, minDate }) {
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const changeType = (type) => {
    if (type === "reserva" && !canReserve || type === "reuniao" && !canMeet) return;
    setForm((previous) => {
      const space = spaces.find((s) => String(s.id) === String(previous.space_id)) || spaces[0];
      return { ...previous, type, format: type === "reserva" ? "presencial" : previous.format, purpose: previous.purpose || (type === "reserva" ? "Estudo em Grupo" : ""), space_id: type === "reserva" || previous.format !== "online" ? String(space?.id || "") : "", space_name: type === "reserva" || previous.format !== "online" ? space?.name || "" : "" };
    });
  };
  const updateSpace = (value) => {
    const space = spaces.find((s) => String(s.id) === value);
    setForm((previous) => ({ ...previous, space_id: value, space_name: space?.name || "" }));
  };
  const today = minDate;
  const spaceField = /* @__PURE__ */ React.createElement(Field, { label: "Espa\xE7o *" }, /* @__PURE__ */ React.createElement("select", { required: true, value: form.space_id, onChange: (e) => updateSpace(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "", disabled: true }, "Selecione um espa\xE7o"), spaces.map((s) => /* @__PURE__ */ React.createElement("option", { key: s.id, value: s.id }, s.name))));
  return /* @__PURE__ */ React.createElement("fieldset", { disabled: busy, className: "booking-form-fields" }, !editing && /* @__PURE__ */ React.createElement("div", { className: "booking-type-switch", role: "group", "aria-label": "Tipo de agendamento" }, /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !canReserve, "aria-pressed": form.type === "reserva", onClick: () => changeType("reserva") }, "Reserva de sala"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !canMeet, "aria-pressed": form.type === "reuniao", onClick: () => changeType("reuniao") }, "Reuni\xE3o")), /* @__PURE__ */ React.createElement(Field, { label: "T\xEDtulo *" }, /* @__PURE__ */ React.createElement("input", { required: true, maxLength: 150, placeholder: form.type === "reserva" ? "Ex.: Estudo em grupo \xB7 Projeto NexLab" : "Ex.: Reuni\xE3o de alinhamento \xB7 Projeto NexLab", value: form.title, onChange: (e) => set("title", e.target.value) })), /* @__PURE__ */ React.createElement("div", { className: "booking-date-row" }, /* @__PURE__ */ React.createElement(Field, { label: "Data *", className: "booking-date-field" }, /* @__PURE__ */ React.createElement("input", { required: true, type: "date", min: today, value: form.date, onChange: (e) => set("date", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "In\xEDcio *" }, /* @__PURE__ */ React.createElement("input", { required: true, type: "time", value: form.start_time, onChange: (e) => set("start_time", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "T\xE9rmino *" }, /* @__PURE__ */ React.createElement("input", { required: true, type: "time", value: form.end_time, onChange: (e) => set("end_time", e.target.value) }))), form.type === "reserva" ? /* @__PURE__ */ React.createElement("div", { className: "booking-form-row" }, /* @__PURE__ */ React.createElement(Field, { label: "Finalidade *" }, /* @__PURE__ */ React.createElement("input", { required: true, maxLength: 150, value: form.purpose, onChange: (e) => set("purpose", e.target.value) })), spaceField) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "booking-form-row" }, /* @__PURE__ */ React.createElement(Field, { label: "Formato *" }, /* @__PURE__ */ React.createElement("select", { value: form.format, onChange: (e) => {
    const format = e.target.value, space = spaces.find((s) => String(s.id) === String(form.space_id)) || spaces[0];
    setForm((previous) => ({ ...previous, format, space_id: format === "online" ? "" : String(space?.id || ""), space_name: format === "online" ? "" : space?.name || "" }));
  } }, /* @__PURE__ */ React.createElement("option", { value: "presencial" }, "Presencial"), /* @__PURE__ */ React.createElement("option", { value: "online" }, "Online"), /* @__PURE__ */ React.createElement("option", { value: "hibrido" }, "H\xEDbrido"))), form.format !== "online" && spaceField), form.format !== "presencial" && /* @__PURE__ */ React.createElement(Field, { label: "Link online *" }, /* @__PURE__ */ React.createElement("input", { required: true, type: "url", maxLength: 1e3, placeholder: "https://...", value: form.online_link, onChange: (e) => set("online_link", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Pauta" }, /* @__PURE__ */ React.createElement("textarea", { rows: 2, maxLength: 2e3, placeholder: "Adicione os principais t\xF3picos da reuni\xE3o...", value: form.agenda, onChange: (e) => set("agenda", e.target.value) }))), /* @__PURE__ */ React.createElement(Participants, { users, allUsers, selected: form.participant_ids, onChange: (ids) => set("participant_ids", ids), query, onQueryChange }), /* @__PURE__ */ React.createElement(Field, { label: "Descri\xE7\xE3o", optional: true }, /* @__PURE__ */ React.createElement("textarea", { rows: 2, maxLength: 2e3, placeholder: "Adicione mais detalhes sobre o agendamento...", value: form.description, onChange: (e) => set("description", e.target.value) })));
}
function BookingDayGroup({ date, label, shortLabel, count, active, children }) {
  return /* @__PURE__ */ React.createElement("section", { className: "booking-day-group" + (active ? " is-active" : ""), "aria-label": label }, /* @__PURE__ */ React.createElement("header", { className: "booking-day-head" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("small", null, shortLabel), /* @__PURE__ */ React.createElement("h3", null, label)), /* @__PURE__ */ React.createElement("span", null, count, " agendamento", Number(count) === 1 ? "" : "s")), /* @__PURE__ */ React.createElement("div", { className: "booking-day-items" }, children));
}
function BookingListRow({ record, status, time, actions }) {
  const list = React.Children.toArray(actions?.props?.children).filter(Boolean), main = record.private_slot ? null : list.shift();
  const primary = main && React.cloneElement(main, { className: "booking-open-details", disabled: main.props.disabled, children: /* @__PURE__ */ React.createElement(React.Fragment, null, record.type === "reuniao" && record.my_participation_pending ? "Responder convite" : "Ver detalhes", /* @__PURE__ */ React.createElement(BookingGlyph, { kind: "arrow" })), "aria-label": (record.type === "reuniao" && record.my_participation_pending ? "Responder convite de " : "Ver detalhes de ") + record.title });
  return /* @__PURE__ */ React.createElement("article", { "data-nexlab-record-id": String(record.legacy_id || record.booking_id), className: "booking-list-row" + (record.private_slot ? " is-private" : "") + (record.my_participation_pending ? " nexlab-invitation-card-pending-r55628" : "") }, /* @__PURE__ */ React.createElement("div", { className: "booking-row-icon is-" + record.type }, /* @__PURE__ */ React.createElement(BookingGlyph, { kind: record.type === "reuniao" ? "people" : "calendar" })), /* @__PURE__ */ React.createElement("div", { className: "booking-row-copy" }, /* @__PURE__ */ React.createElement("div", { className: "booking-row-kicker" }, /* @__PURE__ */ React.createElement("span", null, record.type === "reuniao" ? "Reuni\xE3o" : "Reserva de sala"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement(BookingGlyph, { kind: "clock" }), time(record.start_at), "\u2013", time(record.end_at))), /* @__PURE__ */ React.createElement("h4", null, record.title), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement(BookingGlyph, { kind: "pin" }), record.format === "online" ? "Online" : record.space_name || "Local n\xE3o informado"), record.private_slot ? /* @__PURE__ */ React.createElement("small", null, "Detalhes protegidos \u2014 hor\xE1rio ocupado") : /* @__PURE__ */ React.createElement("small", null, record.owner_name || "Respons\xE1vel n\xE3o identificado", " \xB7 ", record.participant_count || 0, " participante", Number(record.participant_count) === 1 ? "" : "s")), /* @__PURE__ */ React.createElement("div", { className: "booking-row-actions" }, /* @__PURE__ */ React.createElement("span", { className: "booking-status is-" + record.status }, status.label), !record.private_slot && record.my_participation_status && /* @__PURE__ */ React.createElement("span", { className: "booking-participation-status is-" + record.my_participation_status }, record.my_participation_pending ? "Confirma\xE7\xE3o pendente" : record.my_participation_status === "confirmado" ? "Participa\xE7\xE3o confirmada" : record.my_participation_status === "recusado" ? "N\xE3o participar\xE1" : "Indeciso"), primary, list.length > 0 && /* @__PURE__ */ React.createElement("details", { className: "booking-more-actions" }, /* @__PURE__ */ React.createElement("summary", { "aria-label": "Mais a\xE7\xF5es de " + record.title }, "\u2022\u2022\u2022"), /* @__PURE__ */ React.createElement("div", { onClick: (e) => {
    if (e.target.closest("button,a")) e.currentTarget.parentElement.open = false;
  } }, list))));
}
function BookingLegacyResources({ value, resources }) {
  const text = value || (resources || []).map((r) => r.resource_name).filter(Boolean).join(", ");
  return text ? /* @__PURE__ */ React.createElement("section", { className: "booking-legacy-resources" }, /* @__PURE__ */ React.createElement("h4", null, "Recursos cadastrados"), /* @__PURE__ */ React.createElement("p", null, text)) : null;
}
export {
  BookingDayGroup,
  BookingDetailsDialog,
  BookingEditorDialog,
  BookingFormFields,
  BookingLegacyResources,
  BookingListRow
};
