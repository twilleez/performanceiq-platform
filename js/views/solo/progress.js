import { buildSidebar }  from '../../components/nav.js';
import { getWorkoutLog } from '../../state/state.js';
import { getScoreBreakdown, getStreak } from '../../state/selectors.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderSoloProgress() {
  const log = getWorkoutLog();
  const sb  = getScoreBreakdown();
  const sessionRows = log.length
    ? log.slice(-8).reverse().map(w=>`
      <div class="w-row">
        <div class="w-icon">🏋️</div>
        <div class="w-info"><div class="w-name">${w.title||'Workout'}</div>
        <div class="w-meta">${w.date||''} · RPE ${w.avgRPE||'—'} · ${w.duration||'—'}min</div></div>
        <span class="w-badge ${w.completed?'':'gray'}">${w.completed?'DONE':'PARTIAL'}</span>
      </div>`).join('')
    : '<p style="color:var(--text-muted);font-size:13px">No sessions yet. <a data-route="solo/today" style="color:var(--piq-green-dark);cursor:pointer">Start your first workout →</a></p>';

  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/progress')}
  <main class="page-main">
    <div class="page-header"><h1>My <span>Progress</span></h1><p>Training history and performance trends</p></div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Sessions</div><div class="kpi-val b">${log.length}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Completed</div><div class="kpi-val g">${log.filter(w=>w.completed).length}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Streak</div><div class="kpi-val">🔥 ${getStreak()}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg RPE</div><div class="kpi-val">${log.length?(log.reduce((s,w)=>s+(w.avgRPE||5),0)/log.length).toFixed(1):'—'}</div></div>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Score Breakdown</div>
        ${['consistency','readiness','compliance','load'].map(k=>`
        <div class="prog-row">
          <div class="prog-top"><strong>${k.charAt(0).toUpperCase()+k.slice(1)}</strong><span>${sb[k]?.raw||0}</span></div>
          <div class="prog-bg"><div class="prog-fill" style="width:${sb[k]?.raw||0}%"></div></div>
        </div>`).join('')}
        <div style="margin-top:14px">
          <button class="btn-primary" style="width:auto;padding:10px 20px;font-size:13px" data-route="solo/today">+ Log Session</button>
        </div>
      </div>
      <div class="panel"><div class="panel-title">Session History</div>${sessionRows}</div>
    </div>
  </main>
</div>`;
}
