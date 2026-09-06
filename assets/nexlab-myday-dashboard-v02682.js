/* NEXLAB 0.26.82 — Dashboard reconstruído do zero — etapas 1 a 9. */
import { Ln as supabase } from "./nexlab-runtime-vendor.js?v=app-beta-0-26-82-recuperacao-app";

const HOST_ID = 'nexlab-dashboard-clean-v02682';
const STYLE_ID = 'nexlab-dashboard-clean-style-v02682';
const RESET_ATTR = 'data-nexlab-dashboard-reset';
let pageObserver = null;
let mainObserver = null;
let activeView = 'overview';
let scheduled = 0;
let loadingToken = 0;
let refreshTimer = 0;

const state = {
  loading: true,
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
  users:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  folder:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>',
  calendar:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="m9 16 2 2 4-4"/></svg>',
  bell:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
  server:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3" width="20" height="7" rx="2"/><rect x="2" y="14" width="20" height="7" rx="2"/><path d="M6 6h.01M6 17h.01"/></svg>',
  file:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>',
  archive:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M5 6v14h14V6M9 10h6"/><path d="M4 3h16l1 3H3Z"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  chevron:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  dot:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2"/></svg>'
});

function icon(name, cls='') {
  const node = document.createElement('span');
  node.className = cls;
  node.innerHTML = ICONS[name] || ICONS.file;
  return node;
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
body[data-nexlab-page="dashboard"][${RESET_ATTR}="true"] #nexlab-main-content > [data-nexlab-dashboard-legacy-suppressed="true"]{display:none!important}
body:not([data-nexlab-page="dashboard"]) #${HOST_ID}{display:none!important}
#${HOST_ID}{overflow:clip;--nxl-navy:#082650;--nxl-blue:#1675f1;--nxl-text:#0d2b55;--nxl-muted:#60789d;--nxl-border:#dce7f3;--nxl-soft:#f8fbff;--nxl-orange:#f47b12;display:grid;gap:16px;width:100%;min-width:0;color:var(--nxl-text);font-family:inherit}
#${HOST_ID} *{box-sizing:border-box}
#${HOST_ID} button{font:inherit}
#${HOST_ID} svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.85;stroke-linecap:round;stroke-linejoin:round}
.nxl-clean-tabs{display:flex;justify-content:center;margin:0 0 2px}
.nxl-clean-tabs-wrap{display:inline-flex;gap:4px;padding:4px;border:1px solid #dbe5f0;border-radius:16px;background:rgba(255,255,255,.92);box-shadow:0 5px 16px rgba(29,63,105,.05)}
.nxl-clean-tab{min-width:136px;border:0;border-radius:11px;background:transparent;color:#567199;padding:10px 22px;font-size:12px;font-weight:850;cursor:pointer;transition:.16s ease}
.nxl-clean-tab.is-active{background:var(--nxl-navy);color:#fff;box-shadow:0 2px 5px rgba(8,38,80,.16)}
.nxl-clean-view,.nxl-clean-overview{display:grid;gap:16px}
.nxl-clean-panel{border:1px solid var(--nxl-border);border-radius:18px;background:rgba(255,255,255,.965);box-shadow:0 7px 20px rgba(31,65,107,.035)}
.nxl-clean-top{display:grid;grid-template-columns:minmax(0,3.78fr) minmax(270px,1.15fr);gap:14px}
.nxl-clean-myday{min-height:116px;padding:18px 20px;display:grid;grid-template-columns:minmax(340px,1.7fr) auto auto;gap:16px;align-items:center}
.nxl-clean-myday-copy{min-width:0;padding-right:18px;border-right:1px solid #e5edf5}
.nxl-clean-myday-kicker{font-size:13px;font-weight:950;color:#ef710c;text-transform:uppercase;letter-spacing:.025em}
.nxl-clean-myday-heading{margin:5px 0 2px;font-size:21px;line-height:1.12;font-weight:950;color:#082650}
.nxl-clean-myday-description{margin:0;font-size:11px;line-height:1.45;color:#547099}
.nxl-clean-myday-stats{display:flex;gap:9px}
.nxl-clean-stat{min-width:126px;min-height:67px;border:1px solid #e0e8f2;border-radius:14px;background:#fff;padding:9px 12px;display:grid;grid-template-columns:36px auto;grid-template-rows:auto auto;column-gap:10px;align-content:center;text-align:left;color:var(--nxl-text);cursor:pointer}
.nxl-clean-stat-icon{grid-row:1/3;width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:#f3f7ff;color:#2076eb;border:1px solid #e7eef8}
.nxl-clean-stat[data-kind="meeting"] .nxl-clean-stat-icon{background:#f4f8ff;color:#147af5}.nxl-clean-stat[data-kind="overdue"] .nxl-clean-stat-icon{background:#fff2f3;color:#ef334d}
.nxl-clean-stat strong{font-size:18px;line-height:1;font-weight:950}.nxl-clean-stat span:last-child{font-size:10px;color:#60799c;margin-top:4px}
.nxl-clean-primary{min-height:54px;border:1px solid var(--nxl-navy);border-radius:12px;background:var(--nxl-navy);color:#fff;padding:0 18px;font-size:11px;font-weight:900;display:inline-flex;align-items:center;gap:12px;cursor:pointer;white-space:nowrap;box-shadow:0 3px 9px rgba(8,38,80,.12)}
.nxl-clean-primary svg,.nxl-clean-outline svg{width:14px!important;height:14px!important}
.nxl-clean-status{min-height:116px;padding:17px 17px;display:flex;align-items:center;justify-content:space-between;gap:15px}
.nxl-clean-status-main{display:flex;align-items:center;gap:13px;min-width:0}.nxl-clean-status-icon{width:44px;height:44px;border-radius:12px;background:#f6f9fd;color:#54739d;display:grid;place-items:center;border:1px solid #e4ebf3}
.nxl-clean-status-copy small{display:block;font-size:9px;font-weight:850;color:#607ba2;text-transform:uppercase;letter-spacing:.055em;white-space:nowrap}.nxl-clean-status-copy strong{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:13px;color:#0d2b55;white-space:nowrap}
.nxl-clean-dot{width:8px;height:8px;border-radius:50%;background:#83d20c;box-shadow:0 0 0 4px rgba(131,210,12,.12);flex:0 0 auto}.nxl-clean-dot.is-warning{background:#f59e0b;box-shadow:0 0 0 4px rgba(245,158,11,.12)}.nxl-clean-dot.is-offline{background:#94a3b8;box-shadow:0 0 0 4px rgba(148,163,184,.12)}
.nxl-clean-date{width:60px;height:60px;border:1px solid #dfe8f2;border-radius:13px;background:#f9fbfe;display:grid;place-items:center;align-content:center;flex:0 0 auto}.nxl-clean-date strong{font-size:19px;line-height:1;font-weight:950}.nxl-clean-date span{font-size:9px;font-weight:900;margin-top:4px;text-transform:uppercase}
.nxl-clean-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.nxl-clean-card{min-height:98px;padding:15px 18px;display:grid;grid-template-columns:46px minmax(0,1fr) 18px;gap:13px;align-items:center;text-align:left;color:var(--nxl-text);cursor:pointer}
.nxl-clean-card-icon{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;background:#f1f6ff;color:#1975ef;border:1px solid #e2ebf6}.nxl-clean-card[data-tone="orange"] .nxl-clean-card-icon{background:#fff6ed;color:#ef7b18;border-color:#ffead4}.nxl-clean-card[data-tone="green"] .nxl-clean-card-icon{background:#f5fbe9;color:#68ad1b;border-color:#e7f2d2}.nxl-clean-card[data-tone="red"] .nxl-clean-card-icon{background:#fff1f3;color:#ef334d;border-color:#ffe1e5}
.nxl-clean-card small{display:block;font-size:9px;font-weight:850;color:#55749c;text-transform:uppercase;letter-spacing:.035em}.nxl-clean-card strong{display:block;font-size:22px;line-height:1;margin-top:8px;font-weight:950;color:#082650}.nxl-clean-chevron{color:#2d6197;display:grid;place-items:center}
.nxl-clean-main{display:grid;grid-template-columns:minmax(0,2.05fr) minmax(320px,1fr);gap:16px}
.nxl-clean-projects,.nxl-clean-actions{min-height:304px;padding:18px 20px}
.nxl-clean-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.nxl-clean-section-title{margin:0;font-size:16px;line-height:1.2;font-weight:950;color:#0b2c59}.nxl-clean-section-desc{margin:5px 0 0;font-size:10px;line-height:1.35;color:#58749b}
.nxl-clean-gestion{display:inline-flex;align-items:center;gap:8px;border-radius:999px;background:#edf5ff;color:#173f75;padding:7px 13px;font-size:9px;font-weight:950;text-transform:uppercase}.nxl-clean-gestion-dot{width:6px;height:6px;border-radius:50%;background:#2177f1}
.nxl-clean-project-subtitle{display:flex;align-items:center;gap:10px;margin:18px 0 9px;font-size:9px;font-weight:900;color:#55739a;text-transform:uppercase;letter-spacing:.025em}.nxl-clean-project-subtitle::after{content:"";height:1px;background:#e1e8f1;flex:1}
.nxl-clean-project-list{display:grid;gap:7px}.nxl-clean-empty{min-height:64px;border:1px dashed #cedbe9;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:10px;color:#7085a3;font-size:11px;background:#fff}
.nxl-clean-project-row{min-height:48px;border:1px solid #e2e9f1;border-radius:11px;background:#fff;padding:9px 11px;display:flex;align-items:center;gap:10px;color:#193c6a;cursor:pointer}.nxl-clean-project-row-icon{width:31px;height:31px;border-radius:9px;background:#f4f7fb;color:#52729a;display:grid;place-items:center}.nxl-clean-project-row-copy{min-width:0;flex:1}.nxl-clean-project-row-copy strong{display:block;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nxl-clean-project-row-copy span{display:block;font-size:8.5px;color:#7184a0;margin-top:3px}.nxl-clean-project-row-status{font-size:8px;font-weight:900;text-transform:uppercase;color:#4c6f99;background:#f5f8fc;border-radius:999px;padding:5px 7px}
.nxl-clean-project-bottom{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:14px}.nxl-clean-mini-block{border-top:1px solid #e1e8f0;padding-top:11px;min-width:0}.nxl-clean-mini-title{display:flex;align-items:center;gap:9px;font-size:9px;font-weight:900;color:#55739a;text-transform:uppercase}.nxl-clean-mini-title::after{content:"";height:1px;background:#e1e8f0;flex:1}.nxl-clean-mini-list{display:grid;gap:5px;margin-top:10px}.nxl-clean-mini-empty,.nxl-clean-mini-row{display:flex;align-items:center;gap:9px;color:#7085a2;font-size:10.5px;min-height:28px}.nxl-clean-mini-row strong{font-size:9.5px;color:#284d79;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nxl-clean-mini-row time{margin-left:auto;font-size:8.5px;color:#7185a0;white-space:nowrap}
.nxl-clean-project-links{display:flex;align-items:center;justify-content:flex-end;gap:13px;margin-top:11px;font-size:9.5px;font-weight:900}.nxl-clean-link{border:0;background:transparent;color:#062a5a;padding:3px;cursor:pointer;font-weight:900}.nxl-clean-link.is-orange{color:#ef710c}.nxl-clean-link-sep{width:1px;height:16px;background:#f3a45b}
.nxl-clean-actions-list{display:grid;gap:8px;margin-top:17px}.nxl-clean-action{min-height:57px;border:1px solid #dfe7f0;border-radius:12px;background:#fff;padding:9px 11px;display:grid;grid-template-columns:39px minmax(0,1fr) 18px;align-items:center;gap:10px;text-align:left;color:var(--nxl-text);cursor:pointer}.nxl-clean-action-icon{width:39px;height:39px;border-radius:10px;display:grid;place-items:center;background:#f1f6ff;color:#1975ef;border:1px solid #e2eaf5}.nxl-clean-action[data-tone="green"] .nxl-clean-action-icon{background:#f5fbe9;color:#68ad1b;border-color:#e6f1d0}.nxl-clean-action[data-tone="orange"] .nxl-clean-action-icon{background:#fff5eb;color:#ef7b18;border-color:#ffe9d0}.nxl-clean-action strong{display:block;font-size:10.5px;font-weight:900}.nxl-clean-action small{display:block;margin-top:4px;font-size:9px;color:#647e9f}
.nxl-clean-teams{padding:17px 19px}.nxl-clean-teams-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.nxl-clean-outline{min-height:39px;border:1px solid #f4aa58;border-radius:11px;background:#fff;color:#e66e0d;padding:0 14px;font-size:10px;font-weight:900;display:inline-flex;align-items:center;gap:9px;cursor:pointer}.nxl-clean-team-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin-top:14px;border:1px solid #dfe8f1;border-radius:13px;overflow:hidden;background:#fff}.nxl-clean-team-metric{min-height:80px;padding:12px 16px;display:flex;align-items:center;gap:13px;border-right:1px solid #e4ebf2}.nxl-clean-team-metric:last-child{border-right:0}.nxl-clean-team-metric-icon{width:39px;height:39px;border-radius:10px;display:grid;place-items:center;background:#f5f8fc;color:#5e7ca2;border:1px solid #e3eaf2}.nxl-clean-team-metric strong{display:block;font-size:19px;line-height:1;font-weight:950;color:#082650}.nxl-clean-team-metric span{display:block;margin-top:5px;font-size:9px;font-weight:900;text-transform:uppercase;color:#55739a}
.nxl-clean-mural-page{display:grid;gap:14px;min-width:0}
.nxl-clean-mural-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px}
.nxl-clean-mural-head h2{margin:0;font-size:16px;line-height:1.2;font-weight:950;color:#0b2c59}
.nxl-clean-mural-list{display:grid;gap:12px}
.nxl-clean-mural-card{position:relative;padding:15px 17px;overflow:hidden}
.nxl-clean-mural-card.is-pinned{border-color:#f6c68e;background:linear-gradient(180deg,#fff,#fffaf4)}
.nxl-clean-mural-card.is-pinned::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#f47b12}
.nxl-clean-mural-meta{display:flex;align-items:center;gap:10px;min-width:0}
.nxl-clean-mural-avatar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;background:#082650;color:#fff;font-size:10px;font-weight:950;letter-spacing:.03em}
.nxl-clean-mural-author{min-width:0;flex:1}.nxl-clean-mural-author strong{display:block;font-size:10.5px;color:#16385f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nxl-clean-mural-author span{display:block;margin-top:3px;font-size:8.5px;color:#7387a2}
.nxl-clean-mural-side{display:flex;align-items:center;gap:8px;flex:0 0 auto}.nxl-clean-mural-date{font-size:8.5px;color:#7588a2;white-space:nowrap}.nxl-clean-pin{display:inline-flex;align-items:center;gap:5px;border:1px solid #fed9b0;border-radius:999px;background:#fff4e8;color:#d96708;padding:4px 7px;font-size:7.5px;font-weight:950;text-transform:uppercase}
.nxl-clean-mural-content{padding:12px 0 4px}.nxl-clean-mural-content h3{margin:0;font-size:12px;line-height:1.35;font-weight:950;color:#0d2b55}.nxl-clean-mural-content p{margin:7px 0 0;color:#536f92;font-size:10.5px;line-height:1.58;white-space:pre-wrap;overflow-wrap:anywhere}
.nxl-clean-mural-foot{margin-top:10px;padding-top:9px;border-top:1px solid #e8eef5;color:#8090a5;font-size:8.5px;font-weight:750}
.nxl-clean-mural-empty{min-height:260px;display:grid;place-items:center;padding:24px;text-align:center}.nxl-clean-mural-empty-inner{display:grid;justify-items:center;gap:8px;color:#7890ad}.nxl-clean-mural-empty-inner .nxl-clean-mural-empty-icon{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:#f5f8fc;border:1px solid #e4ebf3}.nxl-clean-mural-empty-inner strong{font-size:11px;color:#31557e}.nxl-clean-mural-empty-inner span{font-size:9.5px}
.nxl-clean-loading{opacity:.58}
@media(max-width:1180px){.nxl-clean-myday{grid-template-columns:minmax(260px,1.35fr) auto}.nxl-clean-myday .nxl-clean-primary{grid-column:2}.nxl-clean-myday-copy{grid-row:1/3}.nxl-clean-top{grid-template-columns:minmax(0,1fr) 270px}.nxl-clean-stat{min-width:112px}}
@media(max-width:1020px){.nxl-clean-top{grid-template-columns:1fr}.nxl-clean-myday{grid-template-columns:1fr auto}.nxl-clean-myday-copy{grid-row:auto;border-right:0;border-bottom:1px solid #e5edf5;padding:0 0 13px;grid-column:1/-1}.nxl-clean-myday .nxl-clean-primary{grid-column:auto}.nxl-clean-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.nxl-clean-main{grid-template-columns:1fr}}
@media(max-width:680px){#${HOST_ID}{gap:12px}.nxl-clean-tabs{justify-content:stretch}.nxl-clean-tabs-wrap{width:100%}.nxl-clean-tab{flex:1;min-width:0;padding-inline:10px}.nxl-clean-myday,.nxl-clean-status,.nxl-clean-projects,.nxl-clean-actions,.nxl-clean-teams,.nxl-clean-card{border-radius:15px}.nxl-clean-myday{grid-template-columns:1fr;padding:15px}.nxl-clean-myday-copy{grid-column:auto}.nxl-clean-myday-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%}.nxl-clean-stat{min-width:0;padding:8px;grid-template-columns:1fr;text-align:center}.nxl-clean-stat-icon{display:none}.nxl-clean-primary{width:100%;justify-content:center}.nxl-clean-summary{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.nxl-clean-card{min-height:86px;padding:11px;grid-template-columns:39px minmax(0,1fr)}.nxl-clean-card-icon{width:39px;height:39px}.nxl-clean-card .nxl-clean-chevron{display:none}.nxl-clean-projects,.nxl-clean-actions{padding:15px}.nxl-clean-project-bottom{grid-template-columns:1fr}.nxl-clean-team-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.nxl-clean-team-metric:nth-child(2){border-right:0}.nxl-clean-team-metric:nth-child(-n+2){border-bottom:1px solid #e4ebf2}.nxl-clean-section-head{align-items:center}.nxl-clean-section-desc{font-size:9.5px}}
@media(max-width:820px){#${HOST_ID}{gap:13px}.nxl-clean-main{gap:13px}.nxl-clean-status{min-height:96px}.nxl-clean-projects,.nxl-clean-actions{min-height:auto}.nxl-clean-mural-head{padding:14px 15px}.nxl-clean-mural-card{padding:14px 15px}}
@media(max-width:520px){#${HOST_ID}{gap:10px}.nxl-clean-tabs-wrap{border-radius:11px}.nxl-clean-tab{min-height:36px;font-size:9.5px}.nxl-clean-myday-heading{font-size:18px}.nxl-clean-myday-description{font-size:10px}.nxl-clean-myday-stats{gap:6px}.nxl-clean-stat{min-height:58px;border-radius:11px}.nxl-clean-stat strong{font-size:16px}.nxl-clean-stat span:last-child{font-size:8.5px}.nxl-clean-status{padding:13px}.nxl-clean-status-icon{width:38px;height:38px}.nxl-clean-date{width:52px;height:52px}.nxl-clean-card{min-height:82px}.nxl-clean-card small{font-size:8px}.nxl-clean-card strong{font-size:19px}.nxl-clean-section-title{font-size:14px}.nxl-clean-gestion{padding:6px 9px}.nxl-clean-project-links{justify-content:center}.nxl-clean-teams-head{align-items:center}.nxl-clean-outline{min-height:32px}.nxl-clean-team-metric{min-height:72px;padding:10px}.nxl-clean-team-metric-icon{width:34px;height:34px}.nxl-clean-team-metric strong{font-size:17px}.nxl-clean-mural-head{align-items:center}.nxl-clean-mural-side{gap:5px}.nxl-clean-mural-date{font-size:7.5px}.nxl-clean-mural-card{border-radius:14px}.nxl-clean-mural-content h3{font-size:11px}.nxl-clean-mural-content p{font-size:10px}.nxl-clean-mural-avatar{width:32px;height:32px}.nxl-clean-action{min-height:60px}}
@media(max-width:390px){.nxl-clean-summary{grid-template-columns:1fr}.nxl-clean-team-metrics{grid-template-columns:1fr}.nxl-clean-team-metric{border-right:0!important;border-bottom:1px solid #e4ebf2!important}.nxl-clean-team-metric:last-child{border-bottom:0!important}.nxl-clean-mural-meta{align-items:flex-start}.nxl-clean-mural-side{flex-direction:column;align-items:flex-end}.nxl-clean-pin{font-size:7px}}

/* NEXLAB 0.26.82 — Dashboard compacto para desktop/notebook. */
@media(min-width:821px){
#nexlab-dashboard-clean-v02682{gap:11px}
.nxl-clean-tabs{margin-bottom:0}.nxl-clean-tabs-wrap{padding:2px;border-radius:11px}.nxl-clean-tab{min-width:96px;padding:6px 13px;font-size:9.5px;border-radius:8px;min-height:34px}
.nxl-clean-view,.nxl-clean-overview{gap:11px}.nxl-clean-panel{border-radius:15px}
.nxl-clean-top{gap:11px;grid-template-columns:minmax(0,3.9fr) minmax(245px,1.05fr)}
.nxl-clean-myday{min-height:90px;padding:12px 16px;grid-template-columns:minmax(300px,1.65fr) auto auto;gap:11px}
.nxl-clean-myday-copy{padding-right:14px}.nxl-clean-myday-kicker{font-size:11px}.nxl-clean-myday-heading{margin:3px 0 1px;font-size:17px}.nxl-clean-myday-description{font-size:9.5px;line-height:1.35}
.nxl-clean-myday-stats{gap:7px}.nxl-clean-stat{min-width:108px;min-height:55px;padding:7px 9px;grid-template-columns:30px auto;column-gap:8px;border-radius:11px}.nxl-clean-stat-icon{width:30px;height:30px;border-radius:8px}.nxl-clean-stat-icon svg{width:17px!important;height:17px!important}.nxl-clean-stat strong{font-size:15px}.nxl-clean-stat span:last-child{font-size:8.5px;margin-top:3px}
.nxl-clean-primary{min-height:36px;padding:0 11px;font-size:9px;border-radius:9px;gap:7px}
.nxl-clean-status{min-height:90px;padding:12px 13px;gap:11px}.nxl-clean-status-main{gap:10px}.nxl-clean-status-icon{width:36px;height:36px;border-radius:10px}.nxl-clean-status-icon svg{width:18px!important;height:18px!important}.nxl-clean-status-copy small{font-size:8px}.nxl-clean-status-copy strong{margin-top:5px;font-size:11px;gap:6px}.nxl-clean-dot{width:7px;height:7px}.nxl-clean-date{width:50px;height:50px;border-radius:11px}.nxl-clean-date strong{font-size:16px}.nxl-clean-date span{font-size:8px;margin-top:3px}
.nxl-clean-summary{gap:10px}.nxl-clean-card{min-height:76px;padding:10px 14px;grid-template-columns:38px minmax(0,1fr) 16px;gap:10px}.nxl-clean-card-icon{width:38px;height:38px;border-radius:10px}.nxl-clean-card-icon svg{width:18px!important;height:18px!important}.nxl-clean-card small{font-size:8px}.nxl-clean-card strong{font-size:18px;margin-top:5px}
.nxl-clean-main{gap:11px;grid-template-columns:minmax(0,2.1fr) minmax(290px,.95fr)}.nxl-clean-projects,.nxl-clean-actions{min-height:230px;padding:13px 16px}.nxl-clean-section-title{font-size:14px}.nxl-clean-section-desc{margin-top:3px;font-size:8.5px}.nxl-clean-gestion{padding:5px 9px;font-size:8px}.nxl-clean-project-subtitle{margin:12px 0 7px;font-size:8px}.nxl-clean-empty{min-height:48px;font-size:9.5px}.nxl-clean-project-row{min-height:40px;padding:7px 9px}.nxl-clean-project-row-icon{width:27px;height:27px}.nxl-clean-project-row-copy strong{font-size:9.5px}.nxl-clean-project-row-copy span{font-size:8px}
.nxl-clean-project-bottom{gap:11px;margin-top:9px}.nxl-clean-mini-block{padding-top:8px}.nxl-clean-mini-title{font-size:8px}.nxl-clean-mini-list{margin-top:6px;gap:3px}.nxl-clean-mini-empty,.nxl-clean-mini-row{min-height:22px;font-size:9px}.nxl-clean-mini-row strong{font-size:8.5px}.nxl-clean-mini-row time{font-size:7.5px}.nxl-clean-project-links{margin-top:6px;font-size:8.5px;gap:10px}
.nxl-clean-actions-list{gap:6px;margin-top:11px}.nxl-clean-action{min-height:46px;padding:6px 9px;grid-template-columns:32px minmax(0,1fr) 16px;gap:8px;border-radius:10px}.nxl-clean-action-icon{width:32px;height:32px;border-radius:8px}.nxl-clean-action-icon svg{width:17px!important;height:17px!important}.nxl-clean-action strong{font-size:9.5px}.nxl-clean-action small{margin-top:2px;font-size:8px}
.nxl-clean-teams{padding:12px 15px}.nxl-clean-outline{min-height:29px;padding:0 9px;font-size:8.5px;border-radius:8px;gap:6px}.nxl-clean-team-metrics{margin-top:9px;border-radius:11px}.nxl-clean-team-metric{min-height:62px;padding:8px 12px;gap:10px}.nxl-clean-team-metric-icon{width:32px;height:32px;border-radius:8px}.nxl-clean-team-metric-icon svg{width:17px!important;height:17px!important}.nxl-clean-team-metric strong{font-size:16px}.nxl-clean-team-metric span{margin-top:3px;font-size:8px}
.nxl-clean-mural-page{gap:10px}.nxl-clean-mural-head{padding:12px 15px}.nxl-clean-mural-head h2{font-size:14px}.nxl-clean-mural-list{gap:9px}.nxl-clean-mural-card{padding:12px 14px}.nxl-clean-mural-avatar{width:32px;height:32px}.nxl-clean-mural-author strong{font-size:9.5px}.nxl-clean-mural-author span{font-size:8px}.nxl-clean-mural-content{padding:9px 0 3px}.nxl-clean-mural-content h3{font-size:11px}.nxl-clean-mural-content p{margin-top:5px;font-size:9.5px;line-height:1.48}.nxl-clean-mural-foot{margin-top:7px;padding-top:7px;font-size:8px}.nxl-clean-mural-empty{min-height:200px}
}
@media(min-width:821px) and (max-width:1180px){.nxl-clean-myday{grid-template-columns:minmax(230px,1.25fr) auto}.nxl-clean-stat{min-width:96px}.nxl-clean-top{grid-template-columns:minmax(0,1fr) 240px}}

@media(hover:hover){.nxl-clean-card:hover,.nxl-clean-action:hover,.nxl-clean-project-row:hover{border-color:#c9d7e7;box-shadow:0 7px 18px rgba(31,65,107,.06)}.nxl-clean-tab:hover:not(.is-active){background:#f5f8fc}.nxl-clean-outline:hover{background:#fff8f1}}
@media(prefers-reduced-motion:reduce){#${HOST_ID} *,#${HOST_ID} *::before,#${HOST_ID} *::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;
  document.head.appendChild(style);
}

function nav(tabId, extra={}) {
  try {
    globalThis.dispatchEvent(new CustomEvent('nexlab:navigate-record', {
      detail: { tabId, id:'', entityType:'dashboard_link', groupLabel:'Dashboard', source:'dashboard-clean', ...extra }
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

function buildTabs(host) {
  const tabs = document.createElement('div');
  tabs.className = 'nxl-clean-tabs';
  const wrap = document.createElement('div');
  wrap.className = 'nxl-clean-tabs-wrap';
  for (const [view,label] of [['overview','Visão geral'],['mural','Mural interno']]) {
    const tab = button(label, `nxl-clean-tab${activeView===view?' is-active':''}`, () => {
      activeView = view;
      renderView(host);
    });
    tab.dataset.view = view;
    tab.setAttribute('aria-pressed', String(activeView===view));
    wrap.appendChild(tab);
  }
  tabs.appendChild(wrap);
  return tabs;
}

function n(value) { const v=Number(value); return Number.isFinite(v)&&v>0?Math.trunc(v):0; }
function activeProject(p) { return !['finalizado','arquivado'].includes(String(p?.status||'').toLowerCase()); }
function normId(v) { return String(v||'').trim(); }
function array(v) { return Array.isArray(v)?v:[]; }
function dateValue(v) { const d=new Date(v); return Number.isFinite(d.getTime())?d:null; }
function shortDate(v) { const d=dateValue(v); return d?d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.',''):''; }
function statusLabel(v) {
  const key=String(v||'').toLowerCase();
  return ({ideia:'Ideia',analise:'Análise',aprovacao:'Aprovação',execucao:'Em andamento',finalizado:'Finalizado',arquivado:'Arquivado'})[key]||String(v||'Em andamento');
}
function myDaySentence(summary) {
  const tasks=n(summary?.tasks), meetings=n(summary?.meetings), overdue=n(summary?.overdue);
  const first=`Hoje você tem ${tasks} ${tasks===1?'tarefa':'tarefas'}, ${meetings} ${meetings===1?'reunião':'reuniões'}.`;
  return overdue>0?`${first} ${overdue} ${overdue===1?'item está atrasado':'itens estão atrasados'}.`:`${first} Nenhum item está atrasado.`;
}

function stat(label, iconName, value, kind, target) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'nxl-clean-stat';
  el.dataset.kind = kind;
  el.addEventListener('click',()=>nav(target));
  el.append(icon(iconName,'nxl-clean-stat-icon'));
  const strong = document.createElement('strong'); strong.textContent = String(n(value));
  const span = document.createElement('span'); span.textContent = label;
  el.append(strong, span);
  return el;
}

function summaryCard(label, iconName, target, value, tone='blue') {
  const el = document.createElement('button');
  el.type = 'button'; el.className = 'nxl-clean-card nxl-clean-panel'; el.dataset.tone=tone;
  el.addEventListener('click', () => nav(target));
  el.append(icon(iconName,'nxl-clean-card-icon'));
  const copy = document.createElement('div');
  const small = document.createElement('small'); small.textContent = label;
  const strong = document.createElement('strong'); strong.textContent = String(n(value));
  copy.append(small,strong); el.append(copy, icon('chevron','nxl-clean-chevron'));
  return el;
}

function action(label, description, iconName, target, tone='blue') {
  const el = document.createElement('button'); el.type='button'; el.className='nxl-clean-action'; el.dataset.tone=tone;
  el.addEventListener('click',()=>nav(target));
  el.append(icon(iconName,'nxl-clean-action-icon'));
  const copy=document.createElement('div'); const strong=document.createElement('strong'); strong.textContent=label; const small=document.createElement('small'); small.textContent=description; copy.append(strong,small);
  el.append(copy,icon('chevron','nxl-clean-chevron'));
  return el;
}

function teamMetric(label, iconName, value) {
  const item=document.createElement('article'); item.className='nxl-clean-team-metric';
  item.append(icon(iconName,'nxl-clean-team-metric-icon'));
  const copy=document.createElement('div'); const strong=document.createElement('strong'); strong.textContent=String(n(value)); const span=document.createElement('span'); span.textContent=label;
  copy.append(strong,span); item.append(copy); return item;
}

function projectRows(projects) {
  const wrap=document.createElement('div'); wrap.className='nxl-clean-project-list';
  const list=array(projects).filter(activeProject).slice(0,2);
  if (!list.length) {
    const empty=document.createElement('div'); empty.className='nxl-clean-empty'; empty.append(icon('file')); const text=document.createElement('span'); text.textContent='Nenhum projeto em andamento.'; empty.append(text); wrap.append(empty); return wrap;
  }
  for (const project of list) {
    const row=document.createElement('button'); row.type='button'; row.className='nxl-clean-project-row'; row.addEventListener('click',()=>nav('projetos',{id:normId(project.id),entityType:'project'}));
    row.append(icon('file','nxl-clean-project-row-icon'));
    const copy=document.createElement('div'); copy.className='nxl-clean-project-row-copy'; const strong=document.createElement('strong'); strong.textContent=String(project.nome||project.title||'Projeto'); const span=document.createElement('span'); span.textContent=project.last_activity_at?`Atualizado em ${shortDate(project.last_activity_at)}`:'Projeto ativo'; copy.append(strong,span);
    const status=document.createElement('span'); status.className='nxl-clean-project-row-status'; status.textContent=statusLabel(project.status);
    row.append(copy,status); wrap.append(row);
  }
  return wrap;
}

function miniList(kind, items, emptyLabel) {
  const wrap=document.createElement('div'); wrap.className='nxl-clean-mini-list';
  const list=array(items).slice(0,2);
  if (!list.length) {
    const e=document.createElement('div'); e.className='nxl-clean-mini-empty'; e.append(icon('calendar')); const s=document.createElement('span'); s.textContent=emptyLabel; e.append(s); wrap.append(e); return wrap;
  }
  for (const item of list) {
    const row=document.createElement('div'); row.className='nxl-clean-mini-row'; row.append(icon('calendar'));
    const strong=document.createElement('strong'); strong.textContent=String(item.titulo||item.nome||item.title||'Item agendado');
    const time=document.createElement('time'); time.textContent=shortDate(item.data||item.date||item.inicio||item.created_at);
    row.append(strong,time); wrap.append(row);
  }
  return wrap;
}

function buildOverview() {
  const overview=document.createElement('div'); overview.className=`nxl-clean-overview${state.loading?' nxl-clean-loading':''}`;

  const top=document.createElement('div'); top.className='nxl-clean-top';
  const myday=document.createElement('section'); myday.className='nxl-clean-myday nxl-clean-panel';
  const copy=document.createElement('div'); copy.className='nxl-clean-myday-copy';
  const kicker=document.createElement('div'); kicker.className='nxl-clean-myday-kicker'; kicker.textContent='Meu Dia';
  const heading=document.createElement('h2'); heading.className='nxl-clean-myday-heading'; heading.textContent='Resumo do que precisa da sua atenção';
  const desc=document.createElement('p'); desc.className='nxl-clean-myday-description'; desc.textContent=myDaySentence(state.myDay); copy.append(kicker,heading,desc);
  const stats=document.createElement('div'); stats.className='nxl-clean-myday-stats';
  stats.append(stat('Tarefas','file',state.myDay.tasks,'task','pendencias'),stat('Reuniões','calendar',state.myDay.meetings,'meeting','pendencias'),stat('Atrasados','bell',state.myDay.overdue,'overdue','pendencias'));
  const openDay=button('Abrir','nxl-clean-primary',()=>{try{sessionStorage.setItem('nexlab.pending.active-tab','overview')}catch{} nav('pendencias')}); openDay.append(icon('arrow'));
  myday.append(copy,stats,openDay);

  const status=document.createElement('section'); status.className='nxl-clean-status nxl-clean-panel';
  const statusMain=document.createElement('div'); statusMain.className='nxl-clean-status-main'; statusMain.append(icon('server','nxl-clean-status-icon'));
  const statusCopy=document.createElement('div'); statusCopy.className='nxl-clean-status-copy';
  const statusSmall=document.createElement('small'); statusSmall.textContent='Status do Lab';
  const statusStrong=document.createElement('strong'); const dot=document.createElement('span'); dot.className='nxl-clean-dot'; if(state.lab.status==='warning')dot.classList.add('is-warning'); if(state.lab.status==='offline')dot.classList.add('is-offline'); const st=document.createElement('span'); st.textContent=state.lab.label||'Operacional'; statusStrong.append(dot,st); statusCopy.append(statusSmall,statusStrong); statusMain.append(statusCopy);
  const now=new Date(); const date=document.createElement('div'); date.className='nxl-clean-date'; const day=document.createElement('strong'); day.textContent=String(now.getDate()); const month=document.createElement('span'); month.textContent=now.toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase(); date.append(day,month); status.append(statusMain,date);
  top.append(myday,status); overview.append(top);

  const summary=document.createElement('div'); summary.className='nxl-clean-summary';
  summary.append(summaryCard('Minhas equipes','users','equipes',state.myTeams.length,'blue'),summaryCard('Meus projetos ativos','folder','projetos',state.myProjects.filter(activeProject).length,'orange'),summaryCard('Minhas reuniões','calendar','reserva',state.myMeetings.length,'green'),summaryCard('Pendências','bell','pendencias',n(state.myDay.tasks)+n(state.myDay.approvals),'red'));
  overview.append(summary);

  const main=document.createElement('div'); main.className='nxl-clean-main';
  const projects=document.createElement('section'); projects.className='nxl-clean-projects nxl-clean-panel';
  const phead=document.createElement('div'); phead.className='nxl-clean-section-head'; const phcopy=document.createElement('div'); const ptitle=document.createElement('h2'); ptitle.className='nxl-clean-section-title'; ptitle.textContent='Projetos em andamento'; const pdesc=document.createElement('p'); pdesc.className='nxl-clean-section-desc'; pdesc.textContent='Acompanhamento de projetos e reuniões do laboratório.'; phcopy.append(ptitle,pdesc); const badge=document.createElement('span'); badge.className='nxl-clean-gestion'; const bd=document.createElement('span'); bd.className='nxl-clean-gestion-dot'; badge.append(bd,document.createTextNode('Gestão')); phead.append(phcopy,badge); projects.append(phead);
  const recentTitle=document.createElement('div'); recentTitle.className='nxl-clean-project-subtitle'; recentTitle.textContent='Últimos projetos modificados'; projects.append(recentTitle,projectRows(state.myProjects));
  const bottom=document.createElement('div'); bottom.className='nxl-clean-project-bottom';
  const mb1=document.createElement('div'); mb1.className='nxl-clean-mini-block'; const mt1=document.createElement('div'); mt1.className='nxl-clean-mini-title'; mt1.textContent='Próximas reuniões'; mb1.append(mt1,miniList('meeting',state.myMeetings,'Nenhuma reunião agendada.'));
  const mb2=document.createElement('div'); mb2.className='nxl-clean-mini-block'; const mt2=document.createElement('div'); mt2.className='nxl-clean-mini-title'; mt2.textContent='Próximos eventos'; mb2.append(mt2,miniList('event',state.events,'Nenhum evento agendado.')); bottom.append(mb1,mb2); projects.append(bottom);
  const links=document.createElement('div'); links.className='nxl-clean-project-links'; const lp=button('Projetos','nxl-clean-link',()=>nav('projetos')); lp.append(icon('arrow')); const sep=document.createElement('span'); sep.className='nxl-clean-link-sep'; const le=button('Eventos','nxl-clean-link is-orange',()=>nav('eventos')); le.append(icon('arrow')); links.append(lp,sep,le); projects.append(links);

  const actions=document.createElement('section'); actions.className='nxl-clean-actions nxl-clean-panel'; const ahead=document.createElement('div'); const at=document.createElement('h2'); at.className='nxl-clean-section-title'; at.textContent='Ações recomendadas'; const ad=document.createElement('p'); ad.className='nxl-clean-section-desc'; ad.textContent='Atalhos para as principais funcionalidades.'; ahead.append(at,ad); const list=document.createElement('div'); list.className='nxl-clean-actions-list'; list.append(action('Gerenciar Equipes','Gerencie membros e permissões','users','equipes','blue'),action('Visualizar Projetos','Acesse todos os seus projetos','folder','projetos','green'),action('Reservas e Reuniões','Agende e gerencie espaços','calendar','reserva','orange')); actions.append(ahead,list); main.append(projects,actions); overview.append(main);

  const teams=document.createElement('section'); teams.className='nxl-clean-teams nxl-clean-panel'; const head=document.createElement('div'); head.className='nxl-clean-teams-head'; const hcopy=document.createElement('div'); const tt=document.createElement('h2'); tt.className='nxl-clean-section-title'; tt.textContent='Equipes'; const td=document.createElement('p'); td.className='nxl-clean-section-desc'; td.textContent='Visão geral da estrutura e participação.'; hcopy.append(tt,td); const openTeams=button('Abrir','nxl-clean-outline',()=>nav('equipes')); openTeams.append(icon('arrow')); head.append(hcopy,openTeams);
  const metrics=document.createElement('div'); metrics.className='nxl-clean-team-metrics'; metrics.append(teamMetric('Ativas','users',state.teamMetrics.active_count),teamMetric('Integrantes','users',state.teamMetrics.unique_member_count),teamMetric('Arquivadas','archive',state.teamMetrics.archived_count),teamMetric('Sem projeto','folder',state.teamMetrics.without_projects_count)); teams.append(head,metrics); overview.append(teams);

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
  if (!d) return '';
  return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).replace('.','');
}
function buildMural() {
  const page=document.createElement('div'); page.className='nxl-clean-mural-page';
  const head=document.createElement('section'); head.className='nxl-clean-mural-head nxl-clean-panel';
  const title=document.createElement('h2'); title.textContent='Mural interno';
  const open=button('Abrir','nxl-clean-outline',()=>nav('mural')); open.append(icon('arrow'));
  head.append(title,open); page.append(head);
  const list=document.createElement('div'); list.className='nxl-clean-mural-list';
  const rows=array(state.mural);
  if (!rows.length) {
    const empty=document.createElement('section'); empty.className='nxl-clean-mural-empty nxl-clean-panel';
    const inner=document.createElement('div'); inner.className='nxl-clean-mural-empty-inner';
    inner.append(icon('file','nxl-clean-mural-empty-icon'));
    const strong=document.createElement('strong'); strong.textContent='Nenhum comunicado publicado.';
    const text=document.createElement('span'); text.textContent='O mural está vazio no momento.';
    inner.append(strong,text); empty.append(inner); list.append(empty);
  } else {
    rows.slice(0,10).forEach(post=>{
      const card=document.createElement('article'); card.className=`nxl-clean-mural-card nxl-clean-panel${post?.fixado?' is-pinned':''}`;
      const meta=document.createElement('div'); meta.className='nxl-clean-mural-meta';
      const profile=muralProfile(post); const avatar=document.createElement('div'); avatar.className='nxl-clean-mural-avatar'; avatar.textContent=initials(profile?.nome);
      const author=document.createElement('div'); author.className='nxl-clean-mural-author'; const name=document.createElement('strong'); name.textContent=String(profile?.nome||'NEXLAB'); const role=document.createElement('span'); role.textContent=roleLabel(profile?.role); author.append(name,role);
      const side=document.createElement('div'); side.className='nxl-clean-mural-side';
      if (post?.fixado) { const pin=document.createElement('span'); pin.className='nxl-clean-pin'; pin.textContent='Fixado'; side.append(pin); }
      const date=document.createElement('time'); date.className='nxl-clean-mural-date'; date.textContent=muralDate(post); side.append(date);
      meta.append(avatar,author,side);
      const content=document.createElement('div'); content.className='nxl-clean-mural-content'; const h=document.createElement('h3'); h.textContent=String(post?.titulo||post?.title||'Comunicado'); const p=document.createElement('p'); p.textContent=String(post?.conteudo||post?.content||post?.texto||''); content.append(h,p);
      const foot=document.createElement('div'); foot.className='nxl-clean-mural-foot'; foot.textContent='Comunicado interno do NEXLAB';
      card.append(meta,content,foot); list.append(card);
    });
  }
  page.append(list); return page;
}

function renderView(host) {
  const oldTabs = host.querySelector('.nxl-clean-tabs');
  if (oldTabs) oldTabs.remove();
  host.prepend(buildTabs(host));
  let view=host.querySelector('.nxl-clean-view');
  if (!view) { view=document.createElement('div'); view.className='nxl-clean-view'; host.append(view); }
  view.replaceChildren();
  if (activeView==='overview') view.append(buildOverview());
  else view.append(buildMural());
}

function buildHost(main) {
  let host=document.getElementById(HOST_ID);
  if (!host) { host=document.createElement('section'); host.id=HOST_ID; host.setAttribute('aria-label','Dashboard'); main.append(host); }
  else if (host.parentElement!==main) main.append(host);
  renderView(host);
  return host;
}

function userRelatedProject(p, uid, myTeamIds) {
  const reasons=array(p?.access_reasons).map(v=>String(v).toLowerCase());
  if (reasons.some(v=>['author','responsible','team','task'].includes(v))) return true;
  if (normId(p?.autor_id)===uid || normId(p?.responsavel_id)===uid) return true;
  return myTeamIds.has(normId(p?.equipe_id));
}
function userMeeting(m, uid) {
  if (normId(m?.autor_id)===uid || normId(m?.user_id)===uid || normId(m?.owner_id)===uid) return true;
  return array(m?.participant_ids).some(id=>normId(id)===uid);
}
function upcomingMeeting(m) {
  const status=String(m?.status||'').toLowerCase(); if (['cancelada','cancelado','recusado'].includes(status)) return false;
  const raw=m?.data||m?.date||m?.inicio; const d=dateValue(raw); if (!d) return true;
  const today=new Date(); today.setHours(0,0,0,0); d.setHours(0,0,0,0); return d>=today;
}
function upcomingEvent(e) {
  const d=dateValue(e?.data||e?.date||e?.inicio); if (!d) return true; const today=new Date(); today.setHours(0,0,0,0); d.setHours(0,0,0,0); return d>=today;
}

async function loadData() {
  if (document.body?.dataset?.nexlabPage!=='dashboard') return;
  const token=++loadingToken;
  state.loading=true;
  const host=document.getElementById(HOST_ID); if(host)renderView(host);
  const today=new Date(); const until=new Date(today); until.setDate(until.getDate()+120); const iso=d=>d.toISOString().slice(0,10);
  const errors=[];
  try {
    const userResult=await supabase.auth.getUser();
    const uid=normId(userResult?.data?.user?.id); state.uid=uid;
    const [bundleResult,myDayResult,healthResult]=await Promise.allSettled([
      supabase.rpc('nexlab_get_dashboard_bundle_v02656',{p_date_from:iso(today),p_date_to:iso(until)}),
      supabase.rpc('nexlab_get_my_day_summary_v1',{p_horizon_days:7}),
      supabase.rpc('nexlab_get_database_health_v02682')
    ]);
    if (token!==loadingToken) return;
    const rpcData=(r,label)=>{if(r.status!=='fulfilled'){errors.push(label);return null;}if(r.value?.error){errors.push(label);return null;}return r.value?.data??null;};
    const bundle=rpcData(bundleResult,'dashboard_bundle')||{};
    const myDay=rpcData(myDayResult,'my_day')||{};
    const health=rpcData(healthResult,'health');
    const sections=bundle?.sections||{}; const summary=bundle?.summary||{};
    const teams=array(sections.teams); const teamMembers=array(sections.team_members); const projects=array(sections.projects).length?array(sections.projects):array(summary.projects); const meetings=array(sections.meetings); const events=array(sections.events); const profiles=array(sections.profiles); const mural=array(sections.mural);
    const myTeamIds=new Set(teamMembers.filter(m=>normId(m?.user_id)===uid).map(m=>normId(m?.team_id)).filter(Boolean));
    state.myTeams=teams.filter(t=>myTeamIds.has(normId(t?.id)) && !t?.archived_at);
    state.myProjects=projects.filter(p=>activeProject(p)&&userRelatedProject(p,uid,myTeamIds)).sort((a,b)=>(dateValue(b?.last_activity_at||b?.updated_at||b?.created_at)?.getTime()||0)-(dateValue(a?.last_activity_at||a?.updated_at||a?.created_at)?.getTime()||0));
    state.myMeetings=meetings.filter(m=>userMeeting(m,uid)&&upcomingMeeting(m)).sort((a,b)=>(dateValue(a?.data||a?.date||a?.inicio)?.getTime()||0)-(dateValue(b?.data||b?.date||b?.inicio)?.getTime()||0));
    state.events=events.filter(upcomingEvent).sort((a,b)=>(dateValue(a?.data||a?.date||a?.inicio)?.getTime()||0)-(dateValue(b?.data||b?.date||b?.inicio)?.getTime()||0));
    state.profiles=profiles;
    state.mural=mural.slice().sort((a,b)=>(Number(Boolean(b?.fixado))-Number(Boolean(a?.fixado)))||((dateValue(b?.created_at||b?.updated_at)?.getTime()||0)-(dateValue(a?.created_at||a?.updated_at)?.getTime()||0)));
    state.myDay={tasks:n(myDay?.tasks),meetings:n(myDay?.meetings),approvals:n(myDay?.approvals),overdue:n(myDay?.overdue)};
    state.teamMetrics={active_count:n(summary?.team_metrics?.active_count),unique_member_count:n(summary?.team_metrics?.unique_member_count),archived_count:n(summary?.team_metrics?.archived_count),without_projects_count:n(summary?.team_metrics?.without_projects_count)};
    const healthOk=health?.ok===true || bundle?.ok===true;
    if (navigator.onLine===false) state.lab={status:'offline',label:'Offline'};
    else if (healthOk) state.lab={status:'ok',label:'Operacional'};
    else if (errors.length) state.lab={status:'warning',label:'Atenção'};
    else state.lab={status:'ok',label:'Operacional'};
  } catch (error) {
    errors.push(String(error?.message||error||'load_error'));
    state.lab=navigator.onLine===false?{status:'offline',label:'Offline'}:{status:'warning',label:'Atenção'};
  } finally {
    if (token!==loadingToken) return;
    state.errors=errors; state.loading=false;
    const current=document.getElementById(HOST_ID); if(current)renderView(current);
  }
}

const LEGACY_STYLE_IDS = new Set([
  'nexlab-dashboard-legacy-overview-hidden-v02682',
  'nexlab-dashboard-reference-structure-v02682'
]);
function purgeLegacyArtifacts() {
  for (const id of LEGACY_STYLE_IDS) document.getElementById(id)?.remove();
  document.querySelectorAll('[data-nexlab-dashboard-transient="true"]').forEach(node=>node.remove());
}
function suppressLegacy(main,host) {
  for (const child of [...main.children]) {
    if (child===host) continue;
    if (child.dataset.nexlabDashboardLegacySuppressed==='true') continue;
    child.dataset.nexlabDashboardLegacySuppressed='true';
    child.dataset.nexlabDashboardPrevAriaHidden=child.hasAttribute('aria-hidden')?String(child.getAttribute('aria-hidden')):'__none__';
    child.dataset.nexlabDashboardPrevInert=child.hasAttribute('inert')?'true':'false';
    child.setAttribute('aria-hidden','true');
    try { child.inert=true; } catch { child.setAttribute('inert',''); }
  }
}
function restoreLegacy(main) {
  if (!main) return;
  main.querySelectorAll(':scope > [data-nexlab-dashboard-legacy-suppressed="true"]').forEach(child=>{
    const aria=child.dataset.nexlabDashboardPrevAriaHidden;
    if (aria==='__none__') child.removeAttribute('aria-hidden'); else if (aria!=null) child.setAttribute('aria-hidden',aria);
    if (child.dataset.nexlabDashboardPrevInert!=='true') { try { child.inert=false; } catch {} child.removeAttribute('inert'); }
    delete child.dataset.nexlabDashboardLegacySuppressed;
    delete child.dataset.nexlabDashboardPrevAriaHidden;
    delete child.dataset.nexlabDashboardPrevInert;
  });
}

function activate() {
  if (document.body?.dataset?.nexlabPage!=='dashboard') return cleanup();
  ensureStyle();
  purgeLegacyArtifacts();
  const main=document.getElementById('nexlab-main-content')||document.querySelector('main');
  if (!main) return;
  const host=buildHost(main);
  suppressLegacy(main,host);
  document.body.setAttribute(RESET_ATTR,'true');
  observeMain(main);
  clearTimeout(refreshTimer); refreshTimer=setTimeout(()=>void loadData(),90);
}

function cleanup() {
  document.body?.removeAttribute(RESET_ATTR);
  const main=document.getElementById('nexlab-main-content')||document.querySelector('main');
  restoreLegacy(main);
  document.getElementById(HOST_ID)?.remove();
  clearTimeout(refreshTimer);
}

function schedule(delay=60) { clearTimeout(scheduled); scheduled=setTimeout(activate,delay); }

function observeMain(main) {
  if (mainObserver?.target===main) return;
  if (mainObserver) mainObserver.disconnect();
  mainObserver=new MutationObserver(()=>{
    if (document.body?.dataset?.nexlabPage!=='dashboard') return;
    const host=document.getElementById(HOST_ID);
    if (!host || host.parentElement!==main) return schedule(25);
    suppressLegacy(main,host);
  });
  mainObserver.observe(main,{childList:true});
  mainObserver.target=main;
}

function start() {
  if (!document.body) return;
  ensureStyle();
  if (!pageObserver) {
    pageObserver=new MutationObserver(records=>{if(records.some(r=>r.type==='attributes'&&r.attributeName==='data-nexlab-page')) schedule(20);});
    pageObserver.observe(document.body,{attributes:true,attributeFilter:['data-nexlab-page']});
  }
  schedule(60);
}

globalThis.addEventListener('nexlab:myday-updated',event=>{
  if(document.body?.dataset?.nexlabPage!=='dashboard'||!event?.detail)return;
  state.myDay={tasks:n(event.detail.tasks),meetings:n(event.detail.meetings),approvals:n(event.detail.approvals),overdue:n(event.detail.overdue)};
  const host=document.getElementById(HOST_ID); if(host)renderView(host);
});
globalThis.addEventListener('nexlab:network-status',()=>{if(document.body?.dataset?.nexlabPage==='dashboard')void loadData();});
globalThis.addEventListener('popstate',()=>schedule(20));
globalThis.addEventListener('hashchange',()=>schedule(20));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&document.body?.dataset?.nexlabPage==='dashboard')void loadData();});
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
