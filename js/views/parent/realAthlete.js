import { buildSidebar } from '../../components/nav.js';
import { getState, applyCloudSnapshot } from '../../state/state.js';
import { getCheckInHistory } from '../../state/selectors.js';
import { computeACWR, explainACWR } from '../../services/loadModel.js';
import { completedSessions } from '../../services/consistency.js';
import { pullAll } from '../../services/cloudSync.js';
import { esc, hasNum, num, pct, readinessTone, shortDate, kpi, syncNotice } from '../../components/athleteMetrics.js';

const TITLES = {
  'parent/home':['Family','Dashboard'],
  'parent/child':['My','Athlete'],
  'parent/week':['This','Week'],
  'parent/progress':['Progress','Trends'],
  'parent/wellness':['Wellness','Check-ins'],
};

function shell(route, subtitle, body) {
  const [title, accent] = TITLES[route] || TITLES['parent/home'];
  return `<div class="view-with-sidebar">
    ${buildSidebar('parent', route)}
    <main class="page-main">
      <div class="page-header"><h1>${title} <span>${accent}</span></h1><p>${subtitle}</p></div>
      ${syncNotice(getState().cloud)}
      ${body}
    </main>
  </div>`;
}

function noAthlete(route) {
  return shell(route, 'No athlete linked yet', `
    <div class="panel" style="text-align:center;padding:28px 20px;margin-bottom:16px">
      <div style="font-size:30px">👪</div>
      <div style="font-weight:700;margin-top:8px">No athlete is sharing with you yet</div>
      <div style="font-size:12.5px;color:var(--text-muted);margin-top:6px">Your athlete must connect your parent code from Settings → Share my data.</div>
    </div>
    <div data-piq-link-panel="parent"></div>`);
}

function switcher(list, activeId) {
  if (list.length < 2) return '';
  return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
    ${list.map(a=>`<button class="btn-draft" data-piq-child="${esc(a.id)}" style="${a.id===activeId?'border-color:var(--piq-green);color:var(--piq-green)':''}">${esc(a.name)}</button>`).join('')}
  </div>`;
}

function athleteHero(a) {
  const tone = readinessTone(a.readiness);
  return `<div class="panel" style="margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;gap:16px;align-items:center">
      <div><div style="font-weight:800;font-size:18px">${esc(a.name)}</div>
      <div style="font-size:12px;color:var(--text-muted)">${esc([a.position,a.sport,a.level].filter(Boolean).join(' · ')||'Profile details not filled in')}</div></div>
      <div style="text-align:right"><div style="font-size:24px;font-weight:900;color:${tone.color}">${hasNum(a.readiness)?a.readiness+'%':'—'}</div><div style="font-size:11px;color:var(--text-muted)">Readiness today</div></div>
    </div>
  </div>`;
}

function recentSessions(sessions, limit=8) {
  if (!sessions.length) return '<div style="color:var(--text-muted);font-size:12.5px">No sessions logged yet.</div>';
  return sessions.slice(-limit).reverse().map(s=>`<div style="padding:9px 0;border-bottom:1px solid var(--border);display:flex;gap:10px">
    <span style="min-width:52px;color:var(--text-muted);font-size:12px">${shortDate(s.ts)}</span>
    <span style="flex:1;font-weight:600">${esc(s.name||s.title||'Training session')}</span>
    <span style="color:var(--text-muted);font-size:12px">${hasNum(s.duration)?s.duration+' min':''}${hasNum(s.avgRPE)?' · effort '+s.avgRPE+'/10':''}</span>
  </div>`).join('');
}

function loadPanel(log) {
  const load = computeACWR(log);
  return `<div class="panel" style="margin-bottom:16px">
    <div class="panel-title">Training load</div>
    <div style="font-size:12.5px;color:var(--text-muted);line-height:1.6;margin-top:8px">${esc(explainACWR(load))}</div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:8px">Use load as a conversation prompt, not an injury prediction or diagnosis.</div>
  </div>`;
}

function wellness() {
  const state = getState(), c = state.readinessCheckIn || {};
  const history = getCheckInHistory(7);
  const today = c.date === new Date().toDateString() && c.sleepQuality > 0;
  return `<div class="panel" style="margin-bottom:16px"><div class="panel-title">Today's check-in</div>
    <div style="font-size:12.5px;color:var(--text-muted);margin-top:8px">${today?'Sleep '+c.sleepQuality+'/5 · Energy '+(c.energyLevel||'—')+'/5 · Soreness '+(c.soreness||'—')+'/5':'Your athlete has not checked in today.'}</div>
  </div>
  <div class="panel"><div class="panel-title">Recent check-ins</div>
    ${history.length?history.map(h=>`<div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between"><span>${esc(h.dateLabel)}</span><strong>${pct(hasNum(h.cloudScore)?h.cloudScore:h.readiness)}</strong></div>`).join(''):'<div style="color:var(--text-muted);font-size:12.5px;margin-top:8px">No check-ins recorded yet.</div>'}
  </div>`;
}

export function renderRealParentView(route) {
  const state = getState();
  const list = Array.isArray(state.linkedAthletes) ? state.linkedAthletes : [];
  const athlete = state.linkedAthlete && typeof state.linkedAthlete === 'object' ? state.linkedAthlete : null;
  if (!athlete) return noAthlete(route);

  const log = state.workoutLog || [];
  const sessions = completedSessions(log);
  const head = switcher(list, athlete.id) + athleteHero(athlete);

  if (route === 'parent/wellness') return shell(route, athlete.name, head + wellness());
  if (route === 'parent/progress') return shell(route, athlete.name, head + `
    <div class="kpi-row">
      ${kpi('Sessions (7 days)', num(athlete.sessions7), 'Training days')}
      ${kpi('Sessions (28 days)', num(athlete.sessions28), 'Training days')}
      ${kpi('Streak', athlete.streak ?? 0, 'Training days in a row')}
      ${kpi('PIQ Score', num(athlete.piq), hasNum(athlete.piq)?'Calculated on their device':'Not calculated yet')}
    </div>
    ${loadPanel(log)}
    <div class="panel"><div class="panel-title">Recent sessions</div>${recentSessions(sessions,12)}</div>`);
  if (route === 'parent/week') return shell(route, athlete.name, head + `<div class="panel"><div class="panel-title">This week</div>${recentSessions(sessions.filter(s=>Date.now()-s.ts<7*86400000),7)}</div>`);

  const tone = readinessTone(athlete.readiness);
  return shell(route, athlete.name, head + `
    <div class="kpi-row">
      ${kpi('Readiness', pct(athlete.readiness), hasNum(athlete.readiness)?tone.label:'No check-in today', tone.color)}
      ${kpi('PIQ Score', num(athlete.piq), hasNum(athlete.piq)?'Calculated on their device':'Not calculated yet')}
      ${kpi('Streak', athlete.streak ?? 0, 'Training-day streak')}
      ${kpi('Training days (7d)', num(athlete.sessions7), 'Logged sessions')}
    </div>
    <div class="panel"><div class="panel-title">Recent sessions</div>${recentSessions(sessions, route==='parent/child'?10:5)}</div>
  `);
}

if (typeof document !== 'undefined') {
  document.addEventListener('piq:viewRendered', event => {
    if (!String(event.detail?.route||'').startsWith('parent/')) return;
    document.querySelectorAll('[data-piq-child]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = (getState().linkedAthletes || []).find(a => a.id === btn.dataset.piqChild);
        if (!next) return;
        applyCloudSnapshot({ linkedAthlete: next, workoutLog: [] }, { silent: true });
        pullAll({ force: true });
      });
    });
  });
}
