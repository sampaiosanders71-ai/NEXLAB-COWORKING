import {renderApprovedDashboard,unmountApprovedDashboard} from "./nexlab-profile-dashboard-feedback-v02682.js?v=app-beta-0-26-82-oficial-consolidado";
import {nexlabDateKey,nexlabAddCalendarDays,formatNexlabDate} from "./nexlab-calendar-date-v02682.js?v=app-beta-0-26-82-oficial-consolidado";
/* NEXLAB Beta 0.26.82 — Dashboard reconstruído do zero — face institucional. */
import { Ln as supabase } from "./nexlab-runtime-vendor.js?v=app-beta-0-26-82-oficial-consolidado";

const HOST_ID = 'nexlab-dashboard-clean-v02682';
const STYLE_ID = 'nexlab-dashboard-rebuild-style-v02682';
const RESET_ATTR = 'data-nexlab-dashboard-reset';
let pageObserver = null;
let lifecycleObserver = null;
let mainObserver = null;
let scheduled = 0;
let refreshTimer = 0;
let loadingToken = 0;
let activeView = 'overview';
let lastPrivacyGateState = null;
let currentLoad = null;
let lastObservedPage = null;

const state = {
  loading: true,
  ready: false,
  pendingTotal: null,
  availability: {},
  uid: '',
  myDay: { tasks: 0, meetings: 0, approvals: 0, overdue: 0 },
  myTeams: [],
  myProjects: [],
  myMeetings: [],
  events: [],
  profiles: [],
  mural: [],
  teamMetrics: { active_count: 0, unique_member_count: 0, archived_count: 0, without_projects_count: 0 },
  lab: { status: 'checking', label: 'Verificando' },
  errors: []
};

const ICONS = Object.freeze({
  alert:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.7 20h18.6L12 3Z"/><path d="M12 9v5"/><circle cx="12" cy="17.5" r="1" fill="currentColor" stroke="none"/></svg>',
  tasks:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l2 2 4-4"/><path d="M9 17l2 2 4-4"/><path d="M4 4h16v16H4z"/></svg>',
  calendar:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/></svg>',
  check:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/></svg>',
  clock:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  users:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  folder:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>',
  box:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="m3 8 9 5 9-5v8l-9 5-9-5Z"/></svg>',
  bell:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
  message:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 8h8M8 12h6"/></svg>',
  archive:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M5 6v14h14V6M9 10h6"/><path d="M4 3h16l1 3H3Z"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  chevron:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  pulse:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>',
  spark:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.2 4.1L17 8.5l-3.8 1.4L12 14l-1.2-4.1L7 8.5l3.8-1.4L12 3Z"/><path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z"/></svg>'
});

function icon(name, className='') {
  const el = document.createElement('span');
  el.className = className;
  el.innerHTML = ICONS[name] || ICONS.folder;
  return el;
}

function n(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : 0;
}
function array(value) { return Array.isArray(value) ? value : []; }
function privacyGateActive(){ return !!document.querySelector('.nexlab-privacy-gate'); }
function dashboardAllowed(){ return document.body?.dataset?.nexlabPage==='dashboard' && !privacyGateActive(); }
function dashboardMain(){ return document.getElementById('nexlab-main-content') || document.querySelector('main:not(#nexlab-startup-shell)'); }
function normId(value) { return String(value || '').trim(); }
function dateValue(value) { const d = new Date(value); return Number.isFinite(d.getTime()) ? d : null; }
function shortDate(value) {
  const d = dateValue(value);
  return d ? formatNexlabDate(value, { day:'2-digit', month:'short' }).replace('.','') : '';
}
function activeProject(project) {
  return !['finalizado','arquivado'].includes(String(project?.status || '').toLowerCase());
}
function statusLabel(value) {
  const key = String(value || '').toLowerCase();
  return ({ ideia:'Ideia', analise:'Análise', aprovacao:'Aprovação', execucao:'Em andamento', finalizado:'Finalizado', arquivado:'Arquivado' })[key] || String(value || 'Em andamento');
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
body[data-nexlab-page="dashboard"][${RESET_ATTR}="true"] #nexlab-main-content > [data-nexlab-dashboard-legacy-suppressed="true"]{display:none!important}
body:not([data-nexlab-page="dashboard"]) #${HOST_ID}{display:none!important}
#${HOST_ID}{--nx-ink:#10284a;--nx-navy:#0d2f5c;--nx-blue:#246fca;--nx-orange:#e97718;--nx-red:#c93a4a;--nx-green:#2d7d62;--nx-muted:#6d7f97;--nx-border:#dfe6ee;--nx-soft:#f7f9fc;--nx-panel:#fff;--nx-shadow:0 10px 28px rgba(24,48,79,.055);display:grid;gap:16px;width:100%;min-width:0;color:var(--nx-ink);font-family:inherit}
#${HOST_ID} *{box-sizing:border-box}
#${HOST_ID} button{font:inherit}
#${HOST_ID} svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.85;stroke-linecap:round;stroke-linejoin:round}
.nx-dash-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:44px}
.nx-dash-tabs{display:flex;align-items:center;gap:4px;padding:4px;border:1px solid var(--nx-border);border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(15,42,74,.03)}
.nx-dash-tab{border:0;border-radius:8px;background:transparent;color:#667b96;padding:8px 14px;font-size:11px;font-weight:850;cursor:pointer}
.nx-dash-tab.is-active{background:var(--nx-navy);color:#fff}
.nx-dash-live{display:inline-flex;align-items:center;gap:8px;color:#60758f;font-size:10px;font-weight:800;white-space:nowrap}
.nx-dash-live-dot{width:8px;height:8px;border-radius:50%;background:#63b37b;box-shadow:0 0 0 4px rgba(99,179,123,.12)}
.nx-dash-live-dot.is-checking{background:#3b82f6;box-shadow:0 0 0 4px rgba(59,130,246,.12)}
.nx-dash-live-dot.is-warning{background:#e7a53b;box-shadow:0 0 0 4px rgba(231,165,59,.12)}
.nx-dash-live-dot.is-offline{background:#94a3b8;box-shadow:0 0 0 4px rgba(148,163,184,.12)}
.nx-dash-panel{border:1px solid var(--nx-border);border-radius:16px;background:var(--nx-panel);box-shadow:var(--nx-shadow)}
.nx-dash-overview{display:grid;gap:16px}
.nx-day{display:grid;grid-template-columns:minmax(250px,.95fr) minmax(0,2.1fr) auto;gap:20px;align-items:center;padding:20px 22px;overflow:hidden;position:relative}
.nx-day::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--nx-orange)}
.nx-day-head{min-width:0}
.nx-day-kicker{margin-bottom:6px;color:#76869a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.12em}
.nx-day-title{display:flex;align-items:center;gap:9px;margin:0;color:var(--nx-ink);font-size:20px;font-weight:950;letter-spacing:-.015em}
.nx-day-title-icon{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:#fff4e9;color:var(--nx-orange)}
.nx-day-title-icon svg{width:18px!important;height:18px!important}
.nx-day-grid{display:grid;grid-template-columns:repeat(4,minmax(82px,1fr));border:1px solid #e6ebf1;border-radius:13px;overflow:hidden;background:#fbfcfe}
.nx-day-stat{appearance:none;border:0;border-right:1px solid #e6ebf1;background:transparent;padding:12px 14px;text-align:left;cursor:pointer;color:var(--nx-ink)}
.nx-day-stat:last-child{border-right:0}
.nx-day-stat strong{display:block;font-size:20px;font-weight:950;line-height:1}
.nx-day-stat span{display:block;margin-top:6px;color:#71839a;font-size:9px;font-weight:800}
.nx-day-stat[data-tone="danger"] strong{color:var(--nx-red)}
.nx-dash-button{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:40px;border:1px solid var(--nx-navy);border-radius:10px;background:var(--nx-navy);color:#fff;padding:0 14px;font-size:10px;font-weight:900;cursor:pointer;white-space:nowrap}
.nx-dash-button svg{width:14px!important;height:14px!important}
.nx-dash-button.is-ghost{border-color:#dce4ed;background:#fff;color:#254c79}
.nx-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.nx-kpi{appearance:none;display:grid;grid-template-columns:42px minmax(0,1fr) 16px;align-items:center;gap:12px;min-height:84px;border:1px solid var(--nx-border);border-radius:14px;background:#fff;padding:13px 15px;text-align:left;cursor:pointer;color:var(--nx-ink);box-shadow:0 4px 16px rgba(24,48,79,.035)}
.nx-kpi-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:11px;background:#f1f6fc;color:#2c6eb8}
.nx-kpi-copy small{display:block;color:#71839a;font-size:9px;font-weight:850;text-transform:uppercase;letter-spacing:.045em}
.nx-kpi-copy strong{display:block;margin-top:6px;color:var(--nx-ink);font-size:19px;line-height:1;font-weight:950}
.nx-kpi-chevron{display:grid;place-items:center;color:#7990ab}
.nx-kpi-chevron svg{width:16px!important;height:16px!important}
.nx-workspace{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(280px,.82fr);gap:16px;align-items:stretch}
.nx-work-main,.nx-quick{padding:18px 20px}
.nx-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.nx-section-copy h2{margin:0;color:var(--nx-ink);font-size:15px;font-weight:950;letter-spacing:-.01em}
.nx-section-copy p{margin:5px 0 0;color:#72839a;font-size:9.5px;line-height:1.4}
.nx-section-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid #e2e8f0;border-radius:999px;background:#f8fafc;color:#667b96;padding:6px 9px;font-size:8.5px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}
.nx-projects{display:grid;gap:8px;margin-top:15px}
.nx-project-row{appearance:none;display:grid;grid-template-columns:36px minmax(0,1fr) auto 16px;align-items:center;gap:10px;width:100%;min-height:54px;border:1px solid #e5eaf0;border-radius:11px;background:#fff;padding:8px 10px;text-align:left;cursor:pointer;color:var(--nx-ink)}
.nx-project-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:9px;background:#f3f6fa;color:#4f6988}
.nx-project-icon svg{width:18px!important;height:18px!important}
.nx-project-copy{min-width:0}
.nx-project-copy strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10.5px;font-weight:900}
.nx-project-copy span{display:block;margin-top:4px;color:#8190a4;font-size:8.5px}
.nx-project-status{border-radius:999px;background:#f3f6fa;color:#627793;padding:5px 8px;font-size:8px;font-weight:850;white-space:nowrap}
.nx-empty{display:flex;align-items:center;justify-content:center;gap:9px;min-height:62px;border:1px dashed #ccd7e3;border-radius:11px;background:#fbfcfe;color:#7b8da4;font-size:9.5px}
.nx-agenda{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid #e8edf3}
.nx-agenda-block{min-width:0}
.nx-agenda-title{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#5e728e;font-size:8.5px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}
.nx-agenda-list{display:grid;gap:4px;margin-top:7px}
.nx-agenda-row{display:grid;grid-template-columns:16px minmax(0,1fr) auto;align-items:center;gap:7px;min-height:28px;color:#405977;font-size:9px}
.nx-agenda-row svg{width:14px!important;height:14px!important;color:#6f86a1}
.nx-agenda-row strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:800}
.nx-agenda-row time{color:#92a0b0;font-size:8px;white-space:nowrap}
.nx-agenda-empty{min-height:28px;color:#91a0b1;font-size:9px;display:flex;align-items:center}
.nx-quick.nx-dash-panel{background:var(--nexlab-navy,#0E1F3D);border-color:var(--nexlab-navy,#0E1F3D)}
.nx-quick .nx-section-copy h2{color:#fff!important;font-size:1.125rem;font-weight:700;line-height:1.4}
.nx-quick .nx-section-copy p{color:#b8c5d8;font-size:.75rem;line-height:1.5}
.nx-quick-list{display:grid;gap:9px;margin-top:19px}
.nx-quick-link{--nx-quick-accent:#fff;--nx-quick-line:#8691a3;--nx-quick-tint:#24364f;appearance:none;display:grid;grid-template-columns:36px minmax(0,1fr) 16px;align-items:center;gap:12px;width:100%;min-width:0;min-height:66px;border:1px solid var(--nx-quick-line);border-radius:13px;background:#152845;padding:11px 12px;text-align:left;cursor:pointer;color:#fff;transition:background .15s ease,border-color .15s ease}
.nx-quick-link:nth-child(3n+1){--nx-quick-accent:var(--nexlab-orange,#FF8A00);--nx-quick-line:#b67330;--nx-quick-tint:#2c2f37}
.nx-quick-link:nth-child(3n+2){--nx-quick-accent:var(--nexlab-green,#8ED11A);--nx-quick-line:#658d35;--nx-quick-tint:#233a3e}
.nx-quick-link:focus-visible{outline:2px solid #fff;outline-offset:3px}
.nx-quick-link:active{border-color:var(--nx-quick-accent);background:#1c3150}
.nx-quick-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:var(--nx-quick-tint);color:var(--nx-quick-accent)}
.nx-quick-icon svg{width:18px!important;height:18px!important}
.nx-quick-copy{min-width:0;overflow-wrap:anywhere}
.nx-quick-copy strong{display:block;font-size:.8125rem;font-weight:650;line-height:1.4;color:#fff}
.nx-quick-copy span{display:block;margin-top:3px;color:#b8c5d8;font-size:.6875rem;line-height:1.4}
.nx-quick-link .nx-kpi-chevron{color:#9cacbf}
.nx-team-panel{padding:17px 20px}
.nx-team-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.nx-team-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin-top:13px;border:1px solid #e5eaf0;border-radius:12px;overflow:hidden;background:#fbfcfe}
.nx-team-metric{display:flex;align-items:center;gap:10px;min-height:66px;padding:11px 14px;border-right:1px solid #e5eaf0}
.nx-team-metric:last-child{border-right:0}
.nx-team-metric-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:9px;background:#fff;color:#49698e;border:1px solid #e6ebf0}
.nx-team-metric-icon svg{width:17px!important;height:17px!important}
.nx-team-metric strong{display:block;font-size:17px;font-weight:950;line-height:1}
.nx-team-metric span{display:block;margin-top:4px;color:#7f8fa4;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.035em}
.nx-mural{display:grid;gap:12px}
.nx-mural-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px}
.nx-mural-list{display:grid;gap:10px}
.nx-mural-card{padding:15px 17px}
.nx-mural-meta{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:10px;align-items:center}
.nx-mural-avatar{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:#eef3f8;color:#274f7b;font-size:10px;font-weight:950}
.nx-mural-author strong{display:block;font-size:10px;font-weight:900}.nx-mural-author span{display:block;margin-top:3px;color:#8492a4;font-size:8px}
.nx-mural-side{display:flex;align-items:center;gap:7px}.nx-mural-pin{border-radius:999px;background:#fff3e7;color:#c76714;padding:4px 7px;font-size:7.5px;font-weight:900;text-transform:uppercase}.nx-mural-date{color:#94a0af;font-size:8px}
.nx-mural-content{padding:11px 0 2px}.nx-mural-content h3{margin:0;font-size:12px;font-weight:900}.nx-mural-content p{margin:6px 0 0;color:#60738e;font-size:9.5px;line-height:1.55;white-space:pre-wrap}
.nx-mural-empty{display:flex;align-items:center;justify-content:center;min-height:220px;color:#8291a4;font-size:10px}
.nx-loading{opacity:1;pointer-events:auto}
@media(hover:hover){.nx-day-stat:hover,.nx-kpi:hover,.nx-project-row:hover{border-color:#c7d4e1;background:#fbfdff}.nx-quick-link:hover{border-color:var(--nx-quick-accent);background:#1c3150}.nx-dash-tab:hover:not(.is-active){background:#f4f7fa}.nx-dash-button.is-ghost:hover{background:#f7f9fc}}
@media(max-width:1180px){.nx-day{grid-template-columns:minmax(210px,.8fr) minmax(0,1.5fr) auto;gap:14px}.nx-day-grid{grid-template-columns:repeat(4,minmax(70px,1fr))}.nx-day-stat{padding:11px 9px}.nx-workspace{grid-template-columns:minmax(0,1.35fr) minmax(250px,.8fr)}}
@media(max-width:900px){.nx-day{grid-template-columns:1fr auto}.nx-day-grid{grid-column:1/-1;order:3}.nx-kpis{grid-template-columns:1fr 1fr}.nx-workspace{grid-template-columns:1fr}.nx-team-metrics{grid-template-columns:1fr 1fr}.nx-team-metric:nth-child(2){border-right:0}.nx-team-metric:nth-child(-n+2){border-bottom:1px solid #e5eaf0}}
@media(max-width:640px){#${HOST_ID}{gap:12px}.nx-dash-toolbar{align-items:flex-start}.nx-dash-tabs{width:100%}.nx-dash-tab{flex:1;padding:8px 10px}.nx-dash-live{display:none}.nx-day{grid-template-columns:1fr;padding:16px}.nx-day .nx-dash-button{width:100%}.nx-day-grid{grid-template-columns:1fr 1fr}.nx-day-stat:nth-child(2){border-right:0}.nx-day-stat:nth-child(-n+2){border-bottom:1px solid #e6ebf1}.nx-kpis{grid-template-columns:1fr 1fr;gap:8px}.nx-kpi{grid-template-columns:36px minmax(0,1fr) 14px;min-height:72px;padding:10px 11px}.nx-kpi-icon{width:36px;height:36px}.nx-work-main,.nx-quick,.nx-team-panel{padding:15px}.nx-agenda{grid-template-columns:1fr}.nx-team-metrics{grid-template-columns:1fr 1fr}.nx-team-metric{min-height:58px;padding:9px 10px}.nx-project-row{grid-template-columns:32px minmax(0,1fr) 16px}.nx-project-status{display:none}.nx-section-chip{display:none}.nx-mural-head{padding:14px}.nx-mural-card{padding:13px}}
@media(max-width:420px){.nx-kpis{grid-template-columns:1fr}.nx-day-title{font-size:18px}.nx-day-grid{grid-template-columns:1fr 1fr}.nx-team-metrics{grid-template-columns:1fr 1fr}}
@media(prefers-reduced-motion:reduce){#${HOST_ID} *,#${HOST_ID} *::before,#${HOST_ID} *::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
`;
  document.head.appendChild(style);
}

function nav(tabId, extra={}) {
  try {
    if(tabId==='reserva'&&extra?.id&&['meeting','reservation'].includes(extra.entityType)){
      try{sessionStorage.setItem('nexlabBookingTarget',JSON.stringify({kind:extra.entityType,id:String(extra.id)}));}catch{}
    }
    globalThis.dispatchEvent(new CustomEvent('nexlab:navigate-record', {
      detail: { tabId, id:'', entityType:'dashboard_link', groupLabel:'Dashboard', source:'dashboard-rebuild', ...extra }
    }));
  } catch {}
}

function button(label, className, onClick) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.textContent = label;
  if (onClick) el.addEventListener('click', onClick);
  return el;
}

function buildToolbar(host) {
  const toolbar = document.createElement('div');
  toolbar.className = 'nx-dash-toolbar';
  const tabs = document.createElement('div');
  tabs.className = 'nx-dash-tabs';
  [['overview','Visão geral'],['mural','Mural interno']].forEach(([key,label]) => {
    const tab = button(label, `nx-dash-tab${activeView===key?' is-active':''}`, () => { activeView = key; render(host); });
    tab.setAttribute('aria-pressed', String(activeView===key));
    tabs.append(tab);
  });
  const live = document.createElement('div');
  live.className = 'nx-dash-live';
  const dot = document.createElement('span');
  dot.className = 'nx-dash-live-dot';
  if (state.lab.status === 'checking') dot.classList.add('is-checking');
  if (state.lab.status === 'warning') dot.classList.add('is-warning');
  if (state.lab.status === 'offline') dot.classList.add('is-offline');
  const text = document.createElement('span');
  text.textContent = state.lab.label || 'Operacional';
  live.append(dot,text);
  toolbar.append(tabs,live);
  return toolbar;
}

function kpi(label, value, iconName, target) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'nx-kpi';
  el.addEventListener('click', () => nav(target));
  el.append(icon(iconName,'nx-kpi-icon'));
  const copy = document.createElement('div'); copy.className = 'nx-kpi-copy';
  const small = document.createElement('small'); small.textContent = label;
  const strong = document.createElement('strong'); strong.textContent = String(n(value));
  copy.append(small,strong);
  el.append(copy,icon('chevron','nx-kpi-chevron'));
  return el;
}

function projectRows() {
  const list = document.createElement('div'); list.className = 'nx-projects';
  const rows = array(state.myProjects).filter(activeProject).slice(0,3);
  if (!rows.length) {
    const empty = document.createElement('div'); empty.className='nx-empty';
    empty.append(icon('folder'));
    const span=document.createElement('span'); span.textContent='Nenhum projeto em andamento.'; empty.append(span);
    list.append(empty); return list;
  }
  rows.forEach(project => {
    const row = document.createElement('button'); row.type='button'; row.className='nx-project-row';
    row.addEventListener('click',()=>nav('projetos',{id:normId(project.id),entityType:'project'}));
    row.append(icon('folder','nx-project-icon'));
    const copy=document.createElement('div'); copy.className='nx-project-copy';
    const strong=document.createElement('strong'); strong.textContent=String(project.nome||project.title||'Projeto');
    const span=document.createElement('span'); span.textContent=project.last_activity_at||project.updated_at?`Atualizado em ${shortDate(project.last_activity_at||project.updated_at)}`:'Projeto ativo';
    copy.append(strong,span);
    const status=document.createElement('span'); status.className='nx-project-status'; status.textContent=statusLabel(project.status);
    row.append(copy,status,icon('chevron','nx-kpi-chevron'));
    list.append(row);
  });
  return list;
}

function agendaList(items, emptyText) {
  const list=document.createElement('div'); list.className='nx-agenda-list';
  const rows=array(items).slice(0,3);
  if (!rows.length) {
    const empty=document.createElement('div'); empty.className='nx-agenda-empty'; empty.textContent=emptyText; list.append(empty); return list;
  }
  rows.forEach(item=>{
    const row=document.createElement('div'); row.className='nx-agenda-row'; row.append(icon('calendar'));
    const strong=document.createElement('strong'); strong.textContent=String(item.titulo||item.nome||item.title||'Item agendado');
    const time=document.createElement('time'); time.textContent=shortDate(item.data||item.date||item.inicio||item.created_at);
    row.append(strong,time); list.append(row);
  });
  return list;
}

function quickLink(title, subtitle, iconName, target) {
  const el=document.createElement('button'); el.type='button'; el.className='nx-quick-link'; el.addEventListener('click',()=>nav(target));
  el.append(icon(iconName,'nx-quick-icon'));
  const copy=document.createElement('div'); copy.className='nx-quick-copy';
  const strong=document.createElement('strong'); strong.textContent=title;
  const span=document.createElement('span'); span.textContent=subtitle;
  copy.append(strong,span); el.append(copy,icon('chevron','nx-kpi-chevron')); return el;
}

function teamMetric(label, value, iconName) {
  const item=document.createElement('div'); item.className='nx-team-metric';
  item.append(icon(iconName,'nx-team-metric-icon'));
  const copy=document.createElement('div'); const strong=document.createElement('strong'); strong.textContent=String(n(value)); const span=document.createElement('span'); span.textContent=label;
  copy.append(strong,span); item.append(copy); return item;
}

function buildOverview() {
  const overview=document.createElement('div'); overview.className=`nx-dash-overview${state.loading?' nx-loading':''}`;

  const kpis=document.createElement('div'); kpis.className='nx-kpis';
  kpis.append(
    kpi('Minhas equipes',state.myTeams.length,'users','equipes'),
    kpi('Projetos ativos',state.myProjects.filter(activeProject).length,'folder','projetos'),
    kpi('Próximas reuniões',state.myMeetings.length,'calendar','reserva'),
    kpi('Pendências',n(state.myDay.tasks)+n(state.myDay.approvals)+n(state.myDay.overdue),'tasks','pendencias')
  );
  overview.append(kpis);

  const workspace=document.createElement('div'); workspace.className='nx-workspace';
  const main=document.createElement('section'); main.className='nx-work-main nx-dash-panel';
  const mainHead=document.createElement('div'); mainHead.className='nx-section-head';
  const mainCopy=document.createElement('div'); mainCopy.className='nx-section-copy';
  const mainTitle=document.createElement('h2'); mainTitle.textContent='Em andamento';
  const mainDesc=document.createElement('p'); mainDesc.textContent='Projetos e compromissos mais próximos.';
  mainCopy.append(mainTitle,mainDesc);
  const chip=document.createElement('span'); chip.className='nx-section-chip'; chip.append(icon('pulse'),document.createTextNode('Visão operacional'));
  mainHead.append(mainCopy,chip); main.append(mainHead,projectRows());
  const agenda=document.createElement('div'); agenda.className='nx-agenda';
  const meetings=document.createElement('div'); meetings.className='nx-agenda-block';
  const mt=document.createElement('div'); mt.className='nx-agenda-title'; mt.append(document.createTextNode('Próximas reuniões')); meetings.append(mt,agendaList(state.myMeetings,'Nenhuma reunião agendada.'));
  const events=document.createElement('div'); events.className='nx-agenda-block';
  const et=document.createElement('div'); et.className='nx-agenda-title'; et.append(document.createTextNode('Próximos eventos')); events.append(et,agendaList(state.events,'Nenhum evento agendado.'));
  agenda.append(meetings,events); main.append(agenda);

  const quick=document.createElement('section'); quick.className='nx-quick nx-dash-panel';
  const qcopy=document.createElement('div'); qcopy.className='nx-section-copy'; const qt=document.createElement('h2'); qt.textContent='Acesso rápido'; const qd=document.createElement('p'); qd.textContent='Principais áreas do laboratório.'; qcopy.append(qt,qd); quick.append(qcopy);
  const qlist=document.createElement('div'); qlist.className='nx-quick-list';
  qlist.append(
    quickLink('Equipes','Membros e vínculos','users','equipes'),
    quickLink('Projetos','Acompanhamento e tarefas','folder','projetos'),
    quickLink('Reservas e reuniões','Agenda e espaços','calendar','reserva'),
    quickLink('Estoque e patrimônio','Bens e materiais','box','inventario'),
    quickLink('Notificações','Histórico recebido','bell','notificacoes'),
    quickLink('Mural','Comunicados internos','message','mural')
  );
  quick.append(qlist);
  workspace.append(main,quick); overview.append(workspace);

  const teams=document.createElement('section'); teams.className='nx-team-panel nx-dash-panel';
  const teamHead=document.createElement('div'); teamHead.className='nx-team-head';
  const tcopy=document.createElement('div'); tcopy.className='nx-section-copy'; const tt=document.createElement('h2'); tt.textContent='Equipes'; const td=document.createElement('p'); td.textContent='Estrutura e participação no laboratório.'; tcopy.append(tt,td);
  const openTeams=button('Abrir equipes','nx-dash-button is-ghost',()=>nav('equipes')); openTeams.append(icon('arrow')); teamHead.append(tcopy,openTeams);
  const metrics=document.createElement('div'); metrics.className='nx-team-metrics';
  metrics.append(
    teamMetric('Ativas',state.teamMetrics.active_count,'users'),
    teamMetric('Integrantes',state.teamMetrics.unique_member_count,'users'),
    teamMetric('Arquivadas',state.teamMetrics.archived_count,'archive'),
    teamMetric('Sem projeto',state.teamMetrics.without_projects_count,'folder')
  );
  teams.append(teamHead,metrics); overview.append(teams);
  return overview;
}

function roleLabel(role) {
  const key=String(role||'').toLowerCase();
  return ({admin:'Admin',administrador:'Admin',coordenador:'Coordenador',bolsista:'Bolsista',voluntario:'Voluntário',coworking_junior:'Coworking Júnior'})[key]||'NEXLAB';
}
function initials(name) {
  const parts=String(name||'NEXLAB').trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0,2).map(part=>part[0]||'').join('')||'NX').toUpperCase();
}
function muralProfile(post) {
  const id=normId(post?.autor_id||post?.author_id||post?.user_id);
  return state.profiles.find(profile=>normId(profile?.id)===id)||{nome:post?.autor_nome||post?.author_name||'NEXLAB',role:post?.autor_role||post?.author_role||''};
}
function muralDate(post) {
  const d=dateValue(post?.created_at||post?.updated_at||post?.data);
  return d?d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).replace('.',''):'';
}

function buildMural() {
  const page=document.createElement('div'); page.className='nx-mural';
  const head=document.createElement('section'); head.className='nx-mural-head nx-dash-panel';
  const copy=document.createElement('div'); copy.className='nx-section-copy'; const title=document.createElement('h2'); title.textContent='Mural interno'; const desc=document.createElement('p'); desc.textContent='Comunicados publicados para o laboratório.'; copy.append(title,desc);
  const open=button('Abrir mural','nx-dash-button is-ghost',()=>nav('mural')); open.append(icon('arrow')); head.append(copy,open); page.append(head);
  const list=document.createElement('div'); list.className='nx-mural-list';
  const rows=array(state.mural);
  if (!rows.length) {
    const empty=document.createElement('section'); empty.className='nx-mural-empty nx-dash-panel'; empty.append(icon('message')); const span=document.createElement('span'); span.textContent='Nenhum comunicado publicado.'; empty.append(span); list.append(empty);
  } else {
    rows.slice(0,10).forEach(post=>{
      const card=document.createElement('article'); card.className='nx-mural-card nx-dash-panel';
      const meta=document.createElement('div'); meta.className='nx-mural-meta';
      const profile=muralProfile(post); const avatar=document.createElement('div'); avatar.className='nx-mural-avatar'; avatar.textContent=initials(profile?.nome);
      const author=document.createElement('div'); author.className='nx-mural-author'; const name=document.createElement('strong'); name.textContent=String(profile?.nome||'NEXLAB'); const role=document.createElement('span'); role.textContent=roleLabel(profile?.role); author.append(name,role);
      const side=document.createElement('div'); side.className='nx-mural-side'; if(post?.fixado){const pin=document.createElement('span'); pin.className='nx-mural-pin'; pin.textContent='Fixado'; side.append(pin);} const date=document.createElement('time'); date.className='nx-mural-date'; date.textContent=muralDate(post); side.append(date); meta.append(avatar,author,side);
      const content=document.createElement('div'); content.className='nx-mural-content'; const h=document.createElement('h3'); h.textContent=String(post?.titulo||post?.title||'Comunicado'); const p=document.createElement('p'); p.textContent=String(post?.conteudo||post?.content||post?.texto||''); content.append(h,p);
      card.append(meta,content); list.append(card);
    });
  }
  page.append(list); return page;
}

function render(host) {
  renderApprovedDashboard(host,{state,activeView,nav,onRefresh:()=>void loadData(),onView:value=>{activeView=value;render(host)}});
}

function buildHost(main) {
  let host=document.getElementById(HOST_ID);
  if(!host){host=document.createElement('section');host.id=HOST_ID;host.setAttribute('aria-label','Dashboard do NexLab');main.append(host);} else if(host.parentElement!==main) main.append(host);
  render(host); return host;
}

function userRelatedProject(project,uid,myTeamIds) {
  const reasons=array(project?.access_reasons).map(v=>String(v).toLowerCase());
  if(reasons.some(v=>['author','responsible','team','task'].includes(v))) return true;
  return normId(project?.autor_id)===uid || normId(project?.responsavel_id)===uid || myTeamIds.has(normId(project?.equipe_id));
}
function userMeeting(meeting,uid) {
  if(normId(meeting?.autor_id)===uid||normId(meeting?.user_id)===uid||normId(meeting?.owner_id)===uid) return true;
  return array(meeting?.participant_ids).some(id=>normId(id)===uid);
}
function upcoming(item) {
  const status=String(item?.status||'').toLowerCase();
  if(['cancelada','cancelado','recusado','arquivado'].includes(status)) return false;
  const day=nexlabDateKey(item?.data||item?.date||item?.inicio||'');
  if(!day) return true;
  return day>=nexlabDateKey();
}

function resetAccountData(){state.ready=false;state.pendingTotal=null;state.availability={};state.uid='';state.myTeams=[];state.myProjects=[];state.myMeetings=[];state.events=[];state.profiles=[];state.mural=[];state.myDay={tasks:0,meetings:0,approvals:0,overdue:0};state.teamMetrics={active_count:0,unique_member_count:0,archived_count:0,without_projects_count:0};}
function loadData() {
  if(!dashboardAllowed()) return;
  if(currentLoad) return currentLoad.promise;
  const request={token:++loadingToken,promise:null};
  currentLoad=request;
  request.promise=performLoad(request.token).finally(()=>{if(currentLoad===request)currentLoad=null;});
  return request.promise;
}
async function performLoad(token) {
  state.loading=true;
  const existing=document.getElementById(HOST_ID); if(existing) render(existing);
  const today=nexlabDateKey(),until=nexlabAddCalendarDays(today,120),errors=[];
  try {
    const sessionResult=window.nexlabAuthSessionWithTimeout
      ? await window.nexlabAuthSessionWithTimeout(supabase.auth,4500)
      : await supabase.auth.getSession();
    if(token!==loadingToken) return;
    const session=sessionResult?.data?.session||null;
    if(!session?.user?.id||!dashboardAllowed()){
      resetAccountData(); state.errors=[]; state.loading=false;
      const host=document.getElementById(HOST_ID); if(host) render(host);
      return;
    }
    const userResult=await supabase.auth.getUser();
    if(token!==loadingToken) return;
    const uid=normId(userResult?.data?.user?.id);
    if(userResult?.error||!uid||uid!==normId(session.user.id)||!dashboardAllowed()){
      resetAccountData(); state.errors=[]; state.loading=false;
      const host=document.getElementById(HOST_ID); if(host) render(host);
      return;
    }
    if(state.uid!==uid)resetAccountData();state.uid=uid;
    const [bundleResult,myDayResult,pendingResult]=await Promise.allSettled([
      supabase.rpc('nexlab_get_dashboard_bundle_v02656',{p_date_from:today,p_date_to:until}),
      supabase.rpc('nexlab_get_my_day_summary_v1',{p_horizon_days:7}),
      supabase.rpc('nexlab_get_pending_center_v2703',{p_page:1,p_page_size:1})
    ]);
    if(token!==loadingToken) return;
    const rpcData=(result,label)=>{if(result.status!=='fulfilled'||result.value?.error){errors.push(label);return null;}const data=result.value?.data;if(!data||typeof data!=='object'||Array.isArray(data)){errors.push(label);return null;}if(data.ok===false||data.partial===true||array(data.failures).length||array(data.warnings).length)errors.push(label);return data;};
    const bundle=rpcData(bundleResult,'dashboard_bundle')||{};
    const myDayData=rpcData(myDayResult,'my_day'),myDay=myDayData||{};
    const pending=rpcData(pendingResult,'pending');
    const sections=bundle?.sections||{}; const summary=bundle?.summary||{};
    const teams=array(sections.teams); const teamMembers=array(sections.team_members); const projects=array(sections.projects).length?array(sections.projects):array(summary.projects); const meetings=array(sections.meetings); const events=array(sections.events); const profiles=array(sections.profiles); const mural=array(sections.mural);
    const pendingValue=pending?.metrics?.total;
    const pendingValid=!!pending&&pending.ok!==false&&pending.partial!==true&&!array(pending.failures).length&&!array(pending.warnings).length&&(typeof pendingValue==='number'||typeof pendingValue==='string')&&String(pendingValue).trim()!==''&&Number.isSafeInteger(Number(pendingValue))&&Number(pendingValue)>=0;
    state.pendingTotal=pendingValid?Number(pendingValue):null;
    state.availability={teams:Array.isArray(sections.teams)&&Array.isArray(sections.team_members),projects:Array.isArray(sections.projects)||Array.isArray(summary.projects),meetings:Array.isArray(sections.meetings),events:Array.isArray(sections.events),myDay:!!myDayData&&myDay.ok!==false&&['tasks','meetings','approvals','overdue'].every(key=>myDay[key]!=null&&Number.isFinite(Number(myDay[key]))&&Number(myDay[key])>=0),pending:pendingValid,teamMetrics:!!summary.team_metrics&&typeof summary.team_metrics==='object'&&['active_count','unique_member_count','archived_count','without_projects_count'].every(key=>summary.team_metrics[key]!=null&&Number.isFinite(Number(summary.team_metrics[key])))};
    for(const [section,available] of Object.entries(state.availability))if(!available)errors.push(section);
    const myTeamIds=new Set(teamMembers.filter(member=>normId(member?.user_id)===uid).map(member=>normId(member?.team_id)).filter(Boolean));
    state.myTeams=teams.filter(team=>myTeamIds.has(normId(team?.id))&&!team?.archived_at);
    state.myProjects=projects.filter(project=>activeProject(project)&&userRelatedProject(project,uid,myTeamIds)).sort((a,b)=>(dateValue(b?.last_activity_at||b?.updated_at||b?.created_at)?.getTime()||0)-(dateValue(a?.last_activity_at||a?.updated_at||a?.created_at)?.getTime()||0));
    state.myMeetings=meetings.filter(meeting=>userMeeting(meeting,uid)&&upcoming(meeting)).sort((a,b)=>(dateValue(a?.data||a?.date||a?.inicio)?.getTime()||0)-(dateValue(b?.data||b?.date||b?.inicio)?.getTime()||0));
    state.events=events.filter(upcoming).sort((a,b)=>(dateValue(a?.data||a?.date||a?.inicio)?.getTime()||0)-(dateValue(b?.data||b?.date||b?.inicio)?.getTime()||0));
    state.profiles=profiles;
    state.mural=mural.slice().sort((a,b)=>(Number(Boolean(b?.fixado))-Number(Boolean(a?.fixado)))||((dateValue(b?.created_at||b?.updated_at)?.getTime()||0)-(dateValue(a?.created_at||a?.updated_at)?.getTime()||0)));
    state.myDay={tasks:n(myDay?.tasks),meetings:n(myDay?.meetings),approvals:n(myDay?.approvals),overdue:n(myDay?.overdue)};
    state.teamMetrics={active_count:n(summary?.team_metrics?.active_count),unique_member_count:n(summary?.team_metrics?.unique_member_count),archived_count:n(summary?.team_metrics?.archived_count),without_projects_count:n(summary?.team_metrics?.without_projects_count)};
    state.lab=navigator.onLine===false?{status:'offline',label:'Offline'}:errors.length?{status:'warning',label:'Dados parciais'}:{status:'ok',label:'Operacional'};
    state.ready=true;
  } catch(error) {
    if(token!==loadingToken) return;
    resetAccountData();
    errors.push(String(error?.message||error||'load_error'));
    state.lab=navigator.onLine===false?{status:'offline',label:'Offline'}:{status:'warning',label:'Dados parciais'};
  } finally {
    if(token!==loadingToken) return;
    state.errors=[...new Set(errors)]; state.loading=false;
    const host=document.getElementById(HOST_ID); if(host) render(host);
  }
}

const LEGACY_STYLE_IDS=new Set(['nexlab-dashboard-legacy-overview-hidden-v02682','nexlab-dashboard-reference-structure-v02682','nexlab-dashboard-clean-style-v02682']);
function purgeLegacyArtifacts(){for(const id of LEGACY_STYLE_IDS) document.getElementById(id)?.remove();document.querySelectorAll('[data-nexlab-dashboard-transient="true"]').forEach(node=>node.remove());}
function suppressLegacy(main,host){for(const child of [...main.children]){if(child===host||child.dataset.nexlabDashboardLegacySuppressed==='true')continue;child.dataset.nexlabDashboardLegacySuppressed='true';child.dataset.nexlabDashboardPrevAriaHidden=child.hasAttribute('aria-hidden')?String(child.getAttribute('aria-hidden')):'__none__';child.dataset.nexlabDashboardPrevInert=child.hasAttribute('inert')?'true':'false';child.setAttribute('aria-hidden','true');try{child.inert=true}catch{child.setAttribute('inert','')}}}
function restoreLegacy(main){if(!main)return;main.querySelectorAll(':scope > [data-nexlab-dashboard-legacy-suppressed="true"]').forEach(child=>{const aria=child.dataset.nexlabDashboardPrevAriaHidden;if(aria==='__none__')child.removeAttribute('aria-hidden');else if(aria!=null)child.setAttribute('aria-hidden',aria);if(child.dataset.nexlabDashboardPrevInert!=='true'){try{child.inert=false}catch{}child.removeAttribute('inert')}delete child.dataset.nexlabDashboardLegacySuppressed;delete child.dataset.nexlabDashboardPrevAriaHidden;delete child.dataset.nexlabDashboardPrevInert;});}
function observeMain(main){if(mainObserver?.target===main)return;if(mainObserver)mainObserver.disconnect();mainObserver=new MutationObserver(()=>{if(!dashboardAllowed())return cleanup();const host=document.getElementById(HOST_ID);if(!host||host.parentElement!==main)return schedule(25);suppressLegacy(main,host);});mainObserver.observe(main,{childList:true});mainObserver.target=main;}
function activate(){if(!dashboardAllowed())return cleanup();ensureStyle();purgeLegacyArtifacts();const main=dashboardMain();if(!main)return;const existing=document.getElementById(HOST_ID),alreadyActive=existing?.parentElement===main;const host=alreadyActive?existing:buildHost(main);suppressLegacy(main,host);document.body.setAttribute(RESET_ATTR,'true');observeMain(main);if(!alreadyActive){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>void loadData(),90);}}
function cleanup(){loadingToken++;currentLoad=null;if(mainObserver){mainObserver.disconnect();mainObserver=null;}unmountApprovedDashboard(document.getElementById(HOST_ID));document.body?.removeAttribute(RESET_ATTR);restoreLegacy(dashboardMain());document.getElementById(HOST_ID)?.remove();clearTimeout(refreshTimer);}
function schedule(delay=60){clearTimeout(scheduled);scheduled=setTimeout(activate,delay);}
function observeLifecycle(){
  if(lifecycleObserver)return;
  lastPrivacyGateState=privacyGateActive();
  lifecycleObserver=new MutationObserver(()=>{
    const gateActive=privacyGateActive(),gateChanged=gateActive!==lastPrivacyGateState;
    lastPrivacyGateState=gateActive;
    if(gateChanged&&gateActive)return cleanup();
    if(!dashboardAllowed())return;
    const main=dashboardMain(),host=document.getElementById(HOST_ID);
    if(main&&(gateChanged||mainObserver?.target!==main||host?.parentElement!==main))schedule(20);
  });
  // The app can replace #root or create its main area after this module starts.
  // Reconcile only a missing/replaced Dashboard; ordinary renders keep their data.
  lifecycleObserver.observe(document.body,{childList:true,subtree:true});
}
function start(){if(!document.body)return;ensureStyle();if(!pageObserver){lastObservedPage=document.body.dataset.nexlabPage;pageObserver=new MutationObserver(()=>{const page=document.body.dataset.nexlabPage;if(page!==lastObservedPage){lastObservedPage=page;schedule(20);}});pageObserver.observe(document.body,{attributes:true,attributeFilter:['data-nexlab-page']});}observeLifecycle();privacyGateActive()?cleanup():schedule(60);}

supabase.auth.onAuthStateChange?.((event,session)=>{if(event==='SIGNED_OUT'||event==='USER_UPDATED'||normId(session?.user?.id)!==state.uid){loadingToken++;currentLoad=null;resetAccountData();state.loading=true;const host=document.getElementById(HOST_ID);if(host&&dashboardAllowed())render(host);if(dashboardAllowed()){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>void loadData(),60);}}});

globalThis.addEventListener('nexlab:myday-updated',event=>{if(!dashboardAllowed()||!event?.detail)return;state.myDay={tasks:n(event.detail.tasks),meetings:n(event.detail.meetings),approvals:n(event.detail.approvals),overdue:n(event.detail.overdue)};const host=document.getElementById(HOST_ID);if(host)render(host);});
globalThis.addEventListener('nexlab:network-status',()=>{if(dashboardAllowed())void loadData();});
globalThis.addEventListener('popstate',()=>schedule(20));
globalThis.addEventListener('hashchange',()=>schedule(20));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&dashboardAllowed())void loadData();});
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
