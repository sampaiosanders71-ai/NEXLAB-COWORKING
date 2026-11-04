/* Marketing promovido isoladamente do NEXLAB-TESTE. React e cliente do oficial preservados. */
import {g,o,Ln,wt,we,he,dt} from "./nexlab-vendor-beta-0-26-12.js?v=app-beta-0-26-82-marketing-oficial";
import {Hn,Mo,Vn} from "./nexlab-app-shared-beta-0-26-12.js?v=app-beta-0-26-82-marketing-oficial";
import {MarketingWorkspace,MarketingEditorDialog} from "./nexlab-marketing-interface-v02682.js?v=app-beta-0-26-82-marketing-oficial";
var Ol = ["Ideia", "Em produ\xE7\xE3o", "Em revis\xE3o", "Aprovado", "Agendado", "Publicado", "Arquivado", "Cancelado"];
function zl(e2) {
  if (!e2) return null;
  let t2 = e2.trim();
  if (t2.length < 10) return null;
  let a2 = t2.substring(0, 10), r2 = a2.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!r2) return null;
  let s2 = parseInt(r2[1], 10), n2 = parseInt(r2[2], 10), o2 = parseInt(r2[3], 10);
  if (s2 < 1900 || s2 > 2100 || n2 < 1 || n2 > 12) return null;
  let i2 = new Date(s2, n2, 0).getDate();
  return o2 < 1 || o2 > i2 ? null : a2;
}
function Ml(e2) {
  return "string" == typeof e2 && Ol.some((t2) => t2 === e2);
}
function Dl(e2) {
  if (!e2) return null;
  let t2 = e2.trim();
  if (Ml(t2)) return t2;
  let a2 = t2.toLowerCase();
  return "ideia" === a2 ? "Ideia" : "planejado" === a2 ? "Agendado" : "ativo" === a2 ? "Publicado" : "producao" === a2 || "produ\xE7\xE3o" === a2 || "em producao" === a2 || "em produ\xE7\xE3o" === a2 ? "Em produ\xE7\xE3o" : "publicado" === a2 ? "Publicado" : null;
}
function Il(e2) {
  let t2 = Dl(e2);
  if (!t2) return null;
  switch (t2) {
    case "Ideia":
      return "Em produ\xE7\xE3o";
    case "Em produ\xE7\xE3o":
      return "Em revis\xE3o";
    case "Em revis\xE3o":
      return "Aprovado";
    case "Aprovado":
      return "Agendado";
    case "Agendado":
      return "Publicado";
    case "Publicado":
      return "Arquivado";
    default:
      return null;
  }
}
function Fl(e2, t2, a2) {
  if (!t2 || !e2) return false;
  if (t2 < a2) {
    let t3 = Dl(e2);
    return !!t3 && ["Ideia", "Em produ\xE7\xE3o", "Em revis\xE3o", "Aprovado", "Agendado"].some((e3) => e3 === t3);
  }
  return false;
}
function Bl(e2) {
  let t2 = Dl(e2);
  if (!t2) return { bg: "bg-slate-100", border: "border-slate-200", text: "text-slate-600", label: t2 || e2 || "Sem status" };
  switch (t2) {
    case "Ideia":
      return { bg: "bg-slate-100", border: "border-slate-200/80", text: "text-slate-700", label: "Ideia" };
    case "Em produ\xE7\xE3o":
      return { bg: "bg-orange-50", border: "border-orange-200/80", text: "text-orange-700", label: "Em produ\xE7\xE3o" };
    case "Em revis\xE3o":
      return { bg: "bg-amber-50", border: "border-amber-200/80", text: "text-amber-800", label: "Em revis\xE3o" };
    case "Aprovado":
      return { bg: "bg-lime-50", border: "border-lime-200", text: "text-lime-800", label: "Aprovado" };
    case "Agendado":
      return { bg: "bg-blue-50", border: "border-blue-200/80", text: "text-blue-700", label: "Agendado" };
    case "Publicado":
      return { bg: "bg-emerald-50", border: "border-emerald-200/80", text: "text-emerald-700", label: "Publicado" };
    case "Arquivado":
      return { bg: "bg-zinc-100", border: "border-zinc-200/80", text: "text-zinc-600", label: "Arquivado" };
    case "Cancelado":
      return { bg: "bg-red-50", border: "border-red-200/80", text: "text-red-700", label: "Cancelado" };
  }
}
function Ul(e2, t2) {
  let a2 = [], r2 = Dl(e2.status), s2 = zl(e2.data);
  null === r2 && a2.push("unknown-status"), Fl(e2.status, s2, t2) && a2.push("overdue"), e2.responsavel_id || a2.push("without-responsible"), "Em revis\xE3o" === r2 && a2.push("in-review"), "Aprovado" === r2 && a2.push("awaiting-scheduling"), (e2.data && !s2 || ("Agendado" === r2 || "Publicado" === r2) && !s2) && a2.push("invalid-date"), s2 && (function(e3, t3) {
    let a3 = zl(e3), r3 = zl(t3);
    if (!a3 || !r3 || !Number.isInteger(7)) return false;
    let [s3, n3, o2] = r3.split("-").map(Number), i2 = new Date(s3, n3 - 1, o2);
    i2.setDate(i2.getDate() + 7);
    let l2 = `${(d2 = i2).getFullYear()}-${String(d2.getMonth() + 1).padStart(2, "0")}-${String(d2.getDate()).padStart(2, "0")}`;
    var d2;
    return a3 >= r3 && a3 <= l2;
  })(s2, t2) && ("Ideia" === r2 || "Em produ\xE7\xE3o" === r2 || "Em revis\xE3o" === r2 || "Aprovado" === r2 || "Agendado" === r2) && a2.push("upcoming-deadline");
  let n2 = !!e2.link && !!Hn(e2.link);
  return ("Em revis\xE3o" === r2 || "Aprovado" === r2 || "Agendado" === r2) && !n2 && a2.push("without-material"), a2;
}
function nexlabMarketingPostingTimeV02682(value) {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d(?::00(?:\.0+)?)?$/.test(value.trim()) ? value.trim().slice(0, 5) : "";
}
var Vl = ["Instagram", "Mural", "Newsletter", "WhatsApp", "Portal UEMA"], Hl = Object.freeze(Object.defineProperty({ __proto__: null, default: function({ profile: e2, allMarketing: t2, allUsers: a2, marketingDates: r2, marketingEvents: s2, addToast: n2, onCampaignCreated: i2, onCampaignUpdated: l2, onCampaignDeleted: d2 }) {
  let [c2, u2] = g.useState("calendar"), [p2, m2] = g.useState(false), [h2, f2] = g.useState(null), [x2, b2] = g.useState(null), [v2, y2] = g.useState(false), [w2, _2] = g.useState(""), [j2, k2] = g.useState(""), [N2, S2] = g.useState("Instagram"), [C2, E2] = g.useState(""), [A2, T2] = g.useState("Ideia"), [R2, L2] = g.useState(""), [marketingPostingTime, setMarketingPostingTime] = g.useState(""), [P2, $2] = g.useState(false), [q2, O2] = g.useState(""), [z2, D2] = g.useState(""), [M2, I2] = g.useState({}), [marketingSelectedDate, setMarketingSelectedDate] = g.useState(null), [marketingDetail, setMarketingDetail] = g.useState(null), F2 = g.useMemo(() => {
    let e3 = /* @__PURE__ */ new Date();
    return `${e3.getFullYear()}-${String(e3.getMonth() + 1).padStart(2, "0")}-${String(e3.getDate()).padStart(2, "0")}`;
  }, []), B2 = g.useMemo(() => {
    let e3 = 0, a3 = 0, r3 = 0;
    return t2.forEach((t3) => {
      let s3 = Dl(t3.status);
      "Em produ\xE7\xE3o" === s3 || "Em revis\xE3o" === s3 ? e3++ : "Agendado" === s3 ? a3++ : "Publicado" === s3 && r3++;
    }), { emAndamento: e3, agendadas: a3, publicadas: r3 };
  }, [t2]), U2 = g.useMemo(() => {
    let e3 = /* @__PURE__ */ new Map();
    return a2.forEach((t3) => {
      let a3 = t3.nome || t3.email || "Usu\xE1rio Sem Nome";
      e3.set(t3.id, false === t3.ativo ? `${a3} (Inativo)` : a3);
    }), e3;
  }, [a2]), V2 = g.useCallback((e3) => e3 ? U2.get(e3) ?? "Respons\xE1vel n\xE3o localizado" : "Sem respons\xE1vel", [U2]), W2 = g.useRef(false), H2 = g.useRef(/* @__PURE__ */ new Set()), K2 = g.useRef(null), G2 = g.useRef(null), X2 = g.useRef(null), J2 = g.useRef(null), Q2 = g.useRef(null), Y2 = Array.isArray(e2?.effective_permissions) && e2.effective_permissions.includes("module_marketing"), Z2 = "admin" === e2?.role, ee2 = g.useCallback(() => {
    requestAnimationFrame(() => {
      let e3 = K2.current;
      e3 && document.body.contains(e3) && e3.focus(), K2.current = null;
    });
  }, []), te2 = g.useCallback(() => {
    W2.current || (m2(false), f2(null), ee2());
  }, [ee2]), ae2 = g.useCallback(() => {
    W2.current || (b2(null), ee2());
  }, [ee2]), re2 = g.useCallback((e3) => {
    e3 && e3.preventDefault(), te2();
  }, [te2]), se2 = g.useCallback((e3) => {
    e3 && e3.preventDefault(), ae2();
  }, [ae2]);
  g.useEffect(() => {
    let e3 = p2 || !!x2 || !!marketingDetail, t3 = "";
    return e3 && (t3 = document.body.style.overflow, document.body.style.overflow = "hidden"), () => {
      e3 && (document.body.style.overflow = t3);
    };
  }, [p2, x2, marketingDetail]), g.useEffect(() => {
    let e3 = (e4) => {
      if ("Escape" === e4.key) {
        if (W2.current) return;
        p2 && te2(), x2 && ae2(), marketingDetail && setMarketingDetail(null);
      }
    };
    return window.addEventListener("keydown", e3), () => window.removeEventListener("keydown", e3);
  }, [p2, x2, te2, ae2, marketingDetail]), g.useEffect(() => {
    let e3 = (e4) => {
      if ("Tab" !== e4.key) return;
      let t3 = p2 ? G2 : x2 ? X2 : null;
      if (!t3 || !t3.current) return;
      let a3 = t3.current, r3 = Array.from(a3.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (0 === r3.length) return e4.preventDefault(), void a3.focus();
      let s3 = r3[0], n3 = r3[r3.length - 1], o2 = document.activeElement;
      e4.shiftKey ? (o2 === s3 || !r3.includes(o2)) && (e4.preventDefault(), n3.focus()) : (o2 === n3 || !r3.includes(o2)) && (e4.preventDefault(), s3.focus());
    };
    return window.addEventListener("keydown", e3), () => window.removeEventListener("keydown", e3);
  }, [p2, x2]), g.useEffect(() => {
    let e3 = null;
    return p2 ? e3 = window.setTimeout(() => {
      var e4;
      null == (e4 = J2.current) || e4.focus();
    }, 50) : x2 && (e3 = window.setTimeout(() => {
      var e4;
      null == (e4 = Q2.current) || e4.focus();
    }, 50)), () => {
      e3 && window.clearTimeout(e3);
    };
  }, [p2, x2]);
  let ne2 = (t3) => {
    K2.current = document.activeElement instanceof HTMLElement ? document.activeElement : null, f2(null), k2(""), S2("Instagram"), E2(e2?.id || ""), T2("Ideia"), L2(t3 || ""), setMarketingPostingTime(""), O2(""), D2(""), $2(false), m2(true);
  }, oe2 = (e3) => {
    if (!Y2) return void n2("Voc\xEA n\xE3o tem permiss\xE3o para editar campanhas de marketing.", "err");
    K2.current = document.activeElement instanceof HTMLElement ? document.activeElement : null, f2(e3), k2(e3.titulo || ""), S2(e3.canal ?? ""), E2(e3.responsavel_id || "");
    let t3 = Dl(e3.status);
    T2(t3 || e3.status);
    let a3 = zl(e3.data);
    L2(a3 ?? ""), setMarketingPostingTime(nexlabMarketingPostingTimeV02682(e3.horario_postagem));
    let r3 = !!e3.data && !a3;
    $2(r3), O2(e3.descricao || ""), D2(e3.link || ""), m2(true);
  }, ie2 = (e3) => {
    Z2 ? (K2.current = document.activeElement instanceof HTMLElement ? document.activeElement : null, b2(e3)) : n2("Somente administradores podem excluir campanhas permanentemente.", "err");
  }, le2 = async (e3) => {
    if (!Y2) return void n2("Voc\xEA n\xE3o tem permiss\xE3o para gerenciar campanhas.", "err");
    let t3 = Il(e3.status);
    if (!t3) return void n2("N\xE3o h\xE1 pr\xF3xima etapa operacional para esta campanha.", "err");
    let a3 = "Agendado" === t3 || "Publicado" === t3, r3 = zl(e3.data);
    if (!a3 || r3) {
      if (!M2[e3.id] && !H2.current.has(e3.id)) {
        H2.current.add(e3.id);
        try {
          I2((t4) => ({ ...t4, [e3.id]: true }));
          let { data: a4, error: r4 } = await Ln.from("marketing").update({ status: t3 }).eq("id", e3.id).select("id,titulo,descricao,tipo,canal,status,data,horario_postagem,link,responsavel_id,created_at").single();
          if (r4) throw r4;
          if (!a4 || a4.id !== e3.id) throw Error("Falha ao confirmar o registro atualizado.");
          l2(a4), await Mo("marketing_status_updated", null, { entity_id: e3.id, entity_name: e3.titulo, previous_status: e3.status, new_status: t3, module: "marketing" }), n2(`Campanha avan\xE7ada para "${t3}" com sucesso!`, "ok");
        } catch (e4) {
          n2(`Erro ao avan\xE7ar campanha: ${Vn(e4, "Erro inesperado ao avan\xE7ar a campanha")}`, "err");
        } finally {
          H2.current.delete(e3.id), I2((t4) => ({ ...t4, [e3.id]: false }));
        }
      }
    } else n2(`Informe uma data de publica\xE7\xE3o v\xE1lida antes de avan\xE7ar para "${t3}".`, "err");
  }, de2 = g.useMemo(() => {
    let e3 = w2.trim().toLocaleLowerCase("pt-BR");
    return e3 ? t2.filter((t3) => {
      let a3 = (t3.titulo || "").toLocaleLowerCase("pt-BR"), r3 = (t3.descricao || "").toLocaleLowerCase("pt-BR"), s3 = (t3.canal || "").toLocaleLowerCase("pt-BR"), n3 = Bl(t3.status).label.toLocaleLowerCase("pt-BR"), o2 = V2(t3.responsavel_id).toLocaleLowerCase("pt-BR");
      return a3.includes(e3) || r3.includes(e3) || s3.includes(e3) || n3.includes(e3) || o2.includes(e3);
    }) : t2;
  }, [t2, w2, V2]), ce2 = g.useMemo(() => {
    let e3 = [...a2.filter((e4) => false !== e4.ativo)];
    if (h2 && h2.responsavel_id) {
      let t3 = a2.find((e4) => e4.id === h2.responsavel_id);
      t3 && false === t3.ativo && (e3.some((e4) => e4.id === t3.id) || e3.push({ ...t3, nome: `${t3.nome || t3.email || "Usu\xE1rio Sem Nome"} (Inativo)` }));
    }
    return e3;
  }, [a2, h2]);
  const [ue2, pe2] = g.useState(""), [me2, fe2] = g.useState(""), [ge2, xe2] = g.useState(() => {
    let e3 = /* @__PURE__ */ new Date();
    return { year: e3.getFullYear(), month: e3.getMonth() };
  }), be2 = g.useMemo(() => de2.filter((e3) => {
    let t3 = Dl(e3.status), a3 = e3.canal || "";
    return !(ue2 && t3 !== ue2 || me2 && a3 !== me2);
  }), [de2, ue2, me2]), ve2 = g.useMemo(() => be2.filter((e3) => Fl(e3.status, zl(e3.data), F2)), [be2, F2]), ye2 = (e3) => {
    setMarketingSelectedDate(null), xe2((t3) => {
      let a3 = t3.month + e3, r3 = t3.year;
      for (; a3 < 0; ) a3 += 12, r3--;
      for (; a3 > 11; ) a3 -= 12, r3++;
      return { year: r3, month: a3 };
    });
  }, _e2 = (e3) => {
    let t3 = zl(e3);
    if (!t3) return "Sem data";
    let a3 = t3.split("-");
    if (3 !== a3.length) return "Data inv\xE1lida";
    let r3 = new Date(Number(a3[0]), Number(a3[1]) - 1, Number(a3[2]));
    return isNaN(r3.getTime()) ? "Data inv\xE1lida" : r3.toLocaleDateString("pt-BR");
  }, je2 = g.useMemo(() => {
    let e3 = new Date(ge2.year, ge2.month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return e3.charAt(0).toUpperCase() + e3.slice(1);
  }, [ge2]), marketingCompactDate = (e3) => {
    let t3 = zl(e3);
    if (!t3) return "Sem data";
    let [a3, r3, s3] = t3.split("-").map(Number), n3 = new Date(a3, r3 - 1, s3);
    return Number.isNaN(n3.getTime()) ? "Data inv\xE1lida" : n3.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(/\./g, "");
  }, marketingLongDate = (e3) => {
    let t3 = zl(e3);
    if (!t3) return "Sem data";
    let [a3, r3, s3] = t3.split("-").map(Number), n3 = new Date(a3, r3 - 1, s3);
    return Number.isNaN(n3.getTime()) ? "Data inv\xE1lida" : n3.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  }, marketingMonthItems = g.useMemo(() => {
    let e3 = `${ge2.year}-${String(ge2.month + 1).padStart(2, "0")}-`;
    return be2.filter((t3) => {
      let a3 = zl(t3.data);
      return !!a3 && a3.startsWith(e3);
    }).sort((e4, t3) => String(zl(e4.data) || "").localeCompare(String(zl(t3.data) || "")) || String(nexlabMarketingPostingTimeV02682(e4.horario_postagem) || "99:99").localeCompare(String(nexlabMarketingPostingTimeV02682(t3.horario_postagem) || "99:99")) || String(e4.titulo || "").localeCompare(String(t3.titulo || ""), "pt-BR"));
  }, [be2, ge2]), marketingSelectedItems = g.useMemo(() => marketingSelectedDate ? marketingMonthItems.filter((e3) => zl(e3.data) === marketingSelectedDate) : marketingMonthItems, [marketingMonthItems, marketingSelectedDate]), ke2 = g.useMemo(() => {
    let e3 = ge2.year, t3 = ge2.month, a3 = new Date(e3, t3, 1), r3 = new Date(e3, t3 + 1, 0).getDate(), s3 = new Date(e3, t3, 0).getDate(), n3 = (a3.getDay() + 6) % 7, o2 = [], i3 = /* @__PURE__ */ new Date();
    for (let a4 = 0; a4 < 42; a4++) {
      let l3 = a4 - n3 + 1, d3 = t3, c3 = e3, u3 = l3, p3 = false;
      l3 < 1 ? (u3 = s3 + l3, d3 = t3 - 1, p3 = true, d3 < 0 && (d3 = 11, c3--)) : l3 > r3 && (u3 = l3 - r3, d3 = t3 + 1, p3 = true, d3 > 11 && (d3 = 0, c3++));
      let m3 = `${c3}-${String(d3 + 1).padStart(2, "0")}-${String(u3).padStart(2, "0")}`, h3 = p3 ? [] : be2.filter((e4) => zl(e4.data) === m3), f3 = be2.filter((e4) => zl(e4.data) === m3);
      o2.push({ key: `${c3}-${d3}-${u3}`, day: u3, month: d3, year: c3, iso: m3, muted: p3, today: !p3 && i3.getFullYear() === c3 && i3.getMonth() === d3 && i3.getDate() === u3, items: h3, mobileItems: f3 });
    }
    return o2;
  }, [ge2, be2]), Ne2 = [{ label: "Total", value: be2.length, desc: "campanhas filtradas" }, { label: "Em andamento", value: B2.emAndamento, desc: "produ\xE7\xE3o/revis\xE3o" }, { label: "Agendadas", value: B2.agendadas, desc: "com data prevista" }, { label: "Publicadas", value: B2.publicadas, desc: "j\xE1 divulgadas" }];
  return o.jsxs("div", { className: "module-shell nexlab-marketing-reset marketing-interface-v02682", children: [o.jsx(MarketingWorkspace, { header: o.jsxs("section", { className: "nexlab-mkt-hero", children: [o.jsxs("div", { className: "nexlab-mkt-hero-copy", children: [o.jsx("span", { children: "Comunica\xE7\xE3o e planejamento" }), o.jsx("h1", { children: "Marketing e divulga\xE7\xE3o" }), null] }), Y2 && o.jsxs("button", { type: "button", onClick: () => ne2(), className: "nexlab-mkt-primary-btn", "aria-haspopup": "dialog", children: [o.jsx("span", { children: "+" }), "Nova campanha"] })] }), metrics: Ne2, tab: c2, onTabChange: u2, search: w2, onSearch: _2, status: ue2, onStatus: pe2, channel: me2, onChannel: fe2, channels: Vl, onClear: () => {
    pe2("");
    fe2("");
    _2("");
  }, monthLabel: je2, days: ke2, onMonthChange: ye2, onToday: () => {
    let today = /* @__PURE__ */ new Date();
    setMarketingSelectedDate(null);
    xe2({ year: today.getFullYear(), month: today.getMonth() });
  }, selectedDate: marketingSelectedDate, onSelectDay: (day) => {
    if (day.muted) xe2({ year: day.year, month: day.month });
    setMarketingSelectedDate((prev) => prev === day.iso ? null : day.iso);
  }, onWholeMonth: () => setMarketingSelectedDate(null), items: marketingSelectedItems, pendingItems: ve2, ownerName: V2, statusLabel: (status) => Bl(status).label, normalizeStatus: Dl, compactDate: marketingCompactDate, longDate: marketingLongDate, canEdit: Y2, canDelete: Z2, onDetail: setMarketingDetail, onEdit: oe2, onDelete: ie2, onAdvance: le2, canAdvance: Il, busyMap: M2 }), marketingDetail && o.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm nexlab-modal-overlay animate-fade-in nexlab-mkt-detail-modal-v2", onClick: (e3) => e3.target === e3.currentTarget && setMarketingDetail(null), children: o.jsxs("div", { className: "nexlab-mkt-detail-dialog-v2", role: "dialog", "aria-modal": "true", "aria-labelledby": "marketing-detail-title", onClick: (e3) => e3.stopPropagation(), children: [o.jsxs("div", { className: "nexlab-mkt-detail-head-v2", children: [o.jsxs("div", { children: [o.jsx("span", { children: "Campanha de marketing" }), o.jsx("h3", { id: "marketing-detail-title", children: marketingDetail.titulo || "Campanha sem t\xEDtulo" })] }), o.jsx("button", { type: "button", onClick: () => setMarketingDetail(null), "aria-label": "Fechar detalhes", children: o.jsx(wt, { className: "w-5 h-5", "aria-hidden": "true" }) })] }), o.jsxs("div", { className: "nexlab-mkt-detail-grid-v2", children: [o.jsxs("div", { children: [o.jsx("span", { children: "Status" }), o.jsx("strong", { children: Bl(marketingDetail.status).label })] }), o.jsxs("div", { children: [o.jsx("span", { children: "Canal" }), o.jsx("strong", { children: marketingDetail.canal || "Sem canal" })] }), o.jsxs("div", { children: [o.jsx("span", { children: "Data" }), o.jsx("strong", { children: marketingLongDate(marketingDetail.data) })] }), o.jsxs("div", { children: [o.jsx("span", { children: "Hor\xE1rio de postagem" }), o.jsx("strong", { children: nexlabMarketingPostingTimeV02682(marketingDetail.horario_postagem) || "A definir" })] }), o.jsxs("div", { children: [o.jsx("span", { children: "Respons\xE1vel" }), o.jsx("strong", { children: V2(marketingDetail.responsavel_id) })] })] }), o.jsxs("div", { className: "nexlab-mkt-detail-description-v2", children: [o.jsx("span", { children: "Descri\xE7\xE3o / briefing" }), o.jsx("p", { children: marketingDetail.descricao || "Nenhuma descri\xE7\xE3o cadastrada." })] }), marketingDetail.link && Hn(marketingDetail.link) && o.jsx("a", { href: Hn(marketingDetail.link), target: "_blank", rel: "noopener noreferrer", className: "nexlab-mkt-detail-link-v2", children: "Abrir material da campanha" })] }) }), p2 && o.jsx(MarketingEditorDialog, { title: h2 ? "Editar Campanha de Divulga\xE7\xE3o" : "Nova Campanha de Divulga\xE7\xE3o", dialogRef: G2, onClose: re2, busy: v2, children: o.jsxs("form", { onSubmit: async (e3) => {
    if (e3.preventDefault(), !Y2) return void n2("Voc\xEA n\xE3o tem permiss\xE3o para gerenciar campanhas de marketing.", "err");
    if (!j2.trim()) return void n2("O t\xEDtulo \xE9 obrigat\xF3rio.", "err");
    if (!h2 && !N2) return void n2("O canal de comunica\xE7\xE3o \xE9 obrigat\xF3rio para novas campanhas.", "err");
    let t3 = R2 ? zl(R2) : null;
    if (marketingPostingTime && !nexlabMarketingPostingTimeV02682(marketingPostingTime)) return void n2("Informe um hor\xE1rio de postagem v\xE1lido entre 00:00 e 23:59.", "err");
    if (marketingPostingTime && !t3) return void n2("Escolha a data de publica\xE7\xE3o para definir o hor\xE1rio de postagem.", "err");
    if (R2 && !t3) return void n2("Informe uma data de publica\xE7\xE3o v\xE1lida", "err");
    let a3 = Dl(A2);
    if ("Agendado" !== a3 && "Publicado" !== a3 || t3) if (!z2.trim() || Hn(z2)) {
      if (!W2.current) try {
        W2.current = true, y2(true);
        let e4 = { titulo: j2.trim(), canal: "" === N2 ? null : N2, responsavel_id: C2 || null, status: A2, data: t3, horario_postagem: marketingPostingTime || null, descricao: q2.trim() || null, link: z2.trim() || null };
        if (h2) {
          let { data: t4, error: a4 } = await Ln.from("marketing").update(e4).eq("id", h2.id).select("id,titulo,descricao,tipo,canal,status,data,horario_postagem,link,responsavel_id,created_at").single();
          if (a4) throw a4;
          if (!t4 || !t4.id) throw Error("O banco de dados n\xE3o retornou o registro atualizado.");
          l2(t4), await Mo("marketing_updated", null, { entity_id: t4.id, entity_name: t4.titulo, module: "marketing" }), n2("Campanha de marketing atualizada com sucesso!", "ok");
        } else {
          let { data: t4, error: a4 } = await Ln.from("marketing").insert(e4).select("id,titulo,descricao,tipo,canal,status,data,horario_postagem,link,responsavel_id,created_at").single();
          if (a4) throw a4;
          if (!t4 || !t4.id) throw Error("O banco de dados n\xE3o retornou o registro criado.");
          i2(t4), await Mo("marketing_created", null, { entity_id: t4.id, entity_name: t4.titulo, module: "marketing" }), n2("Campanha de marketing criada com sucesso!", "ok");
        }
        W2.current = false, te2();
      } catch (e4) {
        n2("Erro ao salvar campanha: " + Vn(e4, "Erro desconhecido ao salvar campanha"), "err");
      } finally {
        y2(false), W2.current = false;
      }
    } else n2("O link do material inserido n\xE3o \xE9 v\xE1lido ou seguro. Deve iniciar com http:// ou https://", "err");
    else n2(`A data de publica\xE7\xE3o \xE9 obrigat\xF3ria para o status "${A2}".`, "err");
  }, className: "space-y-6", children: [o.jsxs("div", { className: "space-y-4", children: [o.jsx("h4", { className: "text-xs font-black text-slate-400 uppercase tracking-widest border-l-2 border-orange-500 pl-2", children: "1. Dados da Divulga\xE7\xE3o" }), o.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [o.jsxs("div", { className: "md:col-span-2", children: [o.jsx("label", { htmlFor: "input-titulo", className: "text-xs font-semibold text-slate-600 block mb-1", children: "T\xEDtulo da Publica\xE7\xE3o / Campanha *" }), o.jsx("input", { id: "input-titulo", ref: J2, type: "text", required: true, placeholder: "Ex: Divulga\xE7\xE3o do Processo Seletivo NEXLAB 2026", className: "w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none", value: j2, onChange: (e3) => k2(e3.target.value), disabled: v2 })] }), o.jsxs("div", { children: [o.jsx("label", { htmlFor: "select-canal", className: "text-xs font-semibold text-slate-600 block mb-1", children: "Canal de Comunica\xE7\xE3o *" }), o.jsxs("select", { id: "select-canal", className: "w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none", value: N2, onChange: (e3) => {
    let t3 = e3.target.value;
    var a3;
    ("" === t3 || (a3 = t3, Vl.some((e4) => e4 === a3))) && S2(t3);
  }, disabled: v2, children: [o.jsx("option", { value: "", children: "Canal n\xE3o informado" }), o.jsx("option", { value: "Instagram", children: "Instagram (Rede Social)" }), o.jsx("option", { value: "Mural", children: "Mural Interno" }), o.jsx("option", { value: "Newsletter", children: "E-mail Newsletter" }), o.jsx("option", { value: "WhatsApp", children: "Grupo de WhatsApp" }), o.jsx("option", { value: "Portal UEMA", children: "Portal UEMA Oficial" })] })] }), o.jsxs("div", { children: [o.jsx("label", { htmlFor: "select-status", className: "text-xs font-semibold text-slate-600 block mb-1", children: "Status da Produ\xE7\xE3o *" }), o.jsxs("select", { id: "select-status", className: "w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none", value: A2, onChange: (e3) => {
    let t3 = e3.target.value;
    (Ml(t3) || t3 === A2) && T2(t3);
  }, disabled: v2, children: [Ol.map((e3) => o.jsx("option", { value: e3, children: e3 }, e3)), !Ml(A2) && o.jsxs("option", { value: A2, children: ["Status legado: ", A2] })] })] })] }), o.jsxs("div", { children: [o.jsx("label", { htmlFor: "textarea-descricao", className: "text-xs font-semibold text-slate-600 block mb-1", children: "Legenda / Briefing do Conte\xFAdo" }), o.jsx("textarea", { id: "textarea-descricao", placeholder: "Cole aqui a legenda programada, ideias de hashtags, briefing de imagens para o designer...", rows: 3, className: "w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none", value: q2, onChange: (e3) => O2(e3.target.value), disabled: v2 })] })] }), o.jsxs("div", { className: "space-y-4 pt-4 border-t border-slate-100", children: [o.jsx("h4", { className: "text-xs font-black text-slate-400 uppercase tracking-widest border-l-2 border-orange-500 pl-2", children: "2. Agendamento e Respons\xE1veis" }), o.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [(() => {
    let e3 = Dl(A2), t3 = "Agendado" === e3 || "Publicado" === e3;
    return o.jsxs("div", { children: [o.jsxs("label", { htmlFor: "input-data", className: "text-xs font-semibold text-slate-600 block mb-1", children: ["Data de Publica\xE7\xE3o ", t3 ? "*" : "(Opcional)"] }), o.jsx("input", { id: "input-data", type: "date", required: t3, className: "w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none", value: R2, onChange: (e4) => {
      L2(e4.target.value), e4.target.value || setMarketingPostingTime(""), $2(false);
    }, disabled: v2 }), P2 && o.jsx("p", { className: "mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg font-medium", children: "Aviso: A data original armazenada \xE9 inv\xE1lida e precisa ser corrigida ou removida antes de salvar." })] });
  })(), o.jsxs("div", { className: "nexlab-marketing-posting-time-field", children: [o.jsx("label", { htmlFor: "input-horario-postagem", className: "text-xs font-semibold text-slate-600 block mb-1", children: "Hor\xE1rio de postagem (opcional)" }), o.jsx("input", { id: "input-horario-postagem", type: "time", step: 60, min: "00:00", max: "23:59", value: marketingPostingTime, onChange: (e3) => setMarketingPostingTime(e3.target.value), disabled: v2, className: "w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none" })] }), o.jsxs("div", { children: [o.jsx("label", { htmlFor: "select-responsavel", className: "text-xs font-semibold text-slate-600 block mb-1", children: "Respons\xE1vel pela Produ\xE7\xE3o" }), o.jsxs("select", { id: "select-responsavel", className: "w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none", value: C2, onChange: (e3) => E2(e3.target.value), disabled: v2, children: [o.jsx("option", { value: "", children: "Selecione um respons\xE1vel" }), h2?.responsavel_id && !ce2.some((e3) => e3.id === h2.responsavel_id) && o.jsx("option", { value: h2.responsavel_id, children: "Respons\xE1vel n\xE3o localizado" }), ce2.map((e3) => o.jsx("option", { value: e3.id, children: e3.nome }, e3.id))] })] })] })] }), o.jsxs("div", { className: "space-y-4 pt-4 border-t border-slate-100", children: [o.jsxs("div", { className: "flex items-center justify-between", children: [o.jsx("h4", { className: "text-xs font-black text-slate-400 uppercase tracking-widest border-l-2 border-orange-500 pl-2", children: "3. Links e materiais" }), z2.trim() && o.jsxs("button", { type: "button", onClick: () => D2(""), className: "text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-1 transition-all focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none", "aria-label": "Remover link de material", disabled: v2, children: [o.jsx(wt, { className: "w-3 h-3" }), " Remover Link"] })] }), o.jsxs("div", { className: "space-y-3", children: [o.jsxs("div", { children: [o.jsx("label", { htmlFor: "input-link", className: "text-xs font-semibold text-slate-600 block mb-1", children: "Link do material" }), o.jsxs("div", { className: "relative", children: [o.jsx("input", { id: "input-link", type: "url", placeholder: "https://exemplo.com/pasta-no-drive", className: "input-with-trailing-icon w-full pr-10 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none", value: z2, onChange: (e3) => D2(e3.target.value), disabled: v2 }), o.jsx(we, { className: "w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" })] }), o.jsx("p", { className: "text-xs text-slate-400 font-medium mt-1", children: "Canva, Drive, YouTube, Instagram ou outras refer\xEAncias. Use uma URL iniciada com http:// ou https://." })] }), z2.trim() && (() => {
    let e3 = Hn(z2);
    return o.jsxs("div", { className: "flex items-center gap-3 p-3 border rounded-2xl text-xs " + (e3 ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"), children: [o.jsx(we, { className: "w-4 h-4 shrink-0 " + (e3 ? "text-emerald-500" : "text-red-500") }), o.jsxs("div", { className: "min-w-0 flex-1", children: [o.jsx("span", { className: "text-xs text-slate-400 font-bold block uppercase tracking-wider font-mono", children: e3 ? "Material adicionado" : "URL inv\xE1lida" }), o.jsx("span", { className: "text-slate-700 font-medium block truncate font-mono", children: z2 })] }), o.jsx("div", { className: "flex gap-2 shrink-0", children: e3 ? o.jsx("a", { href: e3, target: "_blank", rel: "noopener noreferrer", className: "p-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none", title: "Abrir Link", "aria-label": "Abrir link do material", children: o.jsx(he, { className: "w-3.5 h-3.5 text-slate-500" }) }) : o.jsx("span", { className: "text-xs text-red-600 font-semibold px-2 py-1 bg-red-50 border border-red-100 rounded-lg", children: "Incorreto" }) })] });
  })()] })] }), o.jsxs("div", { className: "pt-6 border-t border-slate-100 flex justify-end gap-3", children: [o.jsx("button", { type: "button", disabled: v2, onClick: re2, className: "px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none", children: "Cancelar" }), o.jsx("button", { type: "submit", disabled: v2, className: "px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-orange-500/15 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none", children: v2 ? "Salvando..." : h2 ? "Salvar Altera\xE7\xF5es" : "Criar campanha" })] })] }) }), x2 && o.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm nexlab-modal-overlay animate-fade-in", onClick: () => {
    W2.current || ae2();
  }, children: o.jsxs("div", { ref: X2, tabIndex: -1, className: "bg-white rounded-[24px] max-w-md w-full p-6 space-y-6 shadow-2xl animate-scale-up outline-none", onClick: (e3) => e3.stopPropagation(), role: "dialog", "aria-modal": "true", "aria-labelledby": "delete-modal-title", children: [o.jsxs("div", { className: "flex items-center gap-3 text-red-600", children: [o.jsx(dt, { className: "w-6 h-6" }), o.jsx("h3", { id: "delete-modal-title", className: "font-extrabold text-lg text-slate-900", children: "Excluir Campanha" })] }), o.jsxs("p", { className: "text-sm text-slate-600 leading-relaxed", children: ["Tem certeza de que deseja excluir a campanha de divulga\xE7\xE3o ", o.jsxs("strong", { className: "text-slate-900 font-extrabold", children: ['"', x2.titulo, '"'] }), "? Esta a\xE7\xE3o remover\xE1 definitivamente o agendamento e n\xE3o poder\xE1 ser desfeita."] }), o.jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [o.jsx("button", { ref: Q2, type: "button", disabled: v2, onClick: se2, className: "px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none", children: "Cancelar" }), o.jsx("button", { type: "button", disabled: v2, onClick: () => (async (e3) => {
    if (Z2) {
      if (!W2.current) try {
        W2.current = true, y2(true);
        let { data: a3, error: r3 } = await Ln.rpc("admin_delete_operational_record", { p_entity_type: "marketing", p_entity_id: e3 });
        if (r3) throw r3;
        if (!a3) return void n2("A campanha j\xE1 foi exclu\xEDda ou voc\xEA n\xE3o tem autoriza\xE7\xE3o para esta opera\xE7\xE3o.", "err");
        let s3 = t2.find((t3) => t3.id === e3);
        d2(e3), await Mo("marketing_deleted", null, { entity_id: e3, entity_name: s3?.titulo || "Campanha", module: "marketing" }), n2("Campanha exclu\xEDda permanentemente.", "ok"), W2.current = false, ae2();
      } catch (e4) {
        n2("Erro ao excluir: " + Vn(e4, "Erro ao excluir campanha"), "err");
      } finally {
        y2(false), W2.current = false;
      }
    } else n2("Somente administradores podem excluir campanhas permanentemente.", "err");
  })(x2.id), className: "px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-none", children: v2 ? "Excluindo..." : "Confirmar Exclus\xE3o" })] })] }) })] });
} }, Symbol.toStringTag, { value: "Module" }));

export default Hl.default;
