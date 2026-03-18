import { buildSidebar }   from '../../components/nav.js';
import { getWorkoutLog }  from '../../state/state.js';
import { getScoreBreakdown, getReadinessScore, getStreak } from '../../state/selectors.js';
import { getCurrentUser } from '../../core/auth.js';
import { SPORT_EMOJI }    from '../../data/exerciseLibrary.js';

export function renderPlayerProgress() {
  const log  = getWorkoutLog();
  const sb   = getScoreBreakdown();
  const user = getCurrentUser();

  // Build weekly session counts (last 8 weeks)
  const weekBuckets = {};
  log.forEach(w => {
    const d   = new Date(w.ts);
    const wk  = getWeekKey(d);
    weekBuckets[wk] = (weekBuckets[wk] || 0) + 1;
  });
  const weeks  = Object.entries(weekBuckets).slice(-8);
  const maxWk  = Math.max(...weeks.map(([,v]) => v), 1);

  // PIQ over time (simulate from last 8 logs)
  const piqHistory = log.slice(-8).map((w, i, arr) => {
    const subset = arr.slice(0, i + 1);
    const streak = i + 1;
    const consistency = Math.min(100, streak * 10);
    const compliance  = Math.round(subset.filter(x => x.completed).length / subset.length * 100);
    const rpe = w.avgRPE || 6;
    const load = Math.round(Math.max(0, 100 - Math.abs(rpe - 6.5) * 14));
    return Math.min(99, Math.round(consistency * .35 + 75 * .30 + compliance * .25 + load * .10));
  });

  const sessionRows = log.length
    ? log.slice(-10).reverse().map(w => `
      <div class="w-row">
        <div class="w-icon">${SPORT_EMOJI[w.sport] || '🏋️'}</div>
        <div class="w-info">
          <div class="w-name">${w.title || 'Workout'}</div>
          <div class="w-meta">${w.date || new Date(w.ts).toLocaleDateString()} · ${w.exercises || 0} exercises · ${w.duration || '—'} min</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:${w.avgRPE >= 8 ? '#ef4444' : w.avgRPE >= 6 ? '#f59e0b' : 'var(--piq-green-dark)'}">RPE ${w.avgRPE || '—'}</div>
          <div class="w-badge ${w.completed ? '' : 'gray'}" style="display:inline-block;margin-top:3px">${w.completed ? 'DONE' : 'PARTIAL'}</div>
        </div>
      </div>`).join('')
    : '<p style="color:var(--text-muted);font-size:13px">No sessions yet. <a data-route="player/log" style="color:var(--piq-green-dark);cursor:pointer">Log your first workout →</a></p>';

  const weekBars = weeks.length
    ? weeks.map(([wk, count]) => `
      <div class="chart-bar-row">
        <span class="chart-bar-lbl" style="font-size:11px">${wk}</span>
        <div class="chart-bar-wrap">
          <div class="chart-bar-fill green" style="width:${Math.round(count/maxWk*100)}%">
            <span class="chart-bar-val">${count}</span>
          </div>
        </div>
      </div>`).join('')
    : '<p style="color:var(--text-muted);font-size:13px">Log sessions to see weekly volume.</p>';

  const piqBars = piqHistory.length
    ? piqHistory.map((score, i) => `
      <div class="chart-bar-row">
        <span class="chart-bar-lbl" style="font-size:11px">S${i+1}</span>
        <div class="chart-bar-wrap">
          <div class="chart-bar-fill" style="width:${score}%;background:linear-gradient(90deg,var(--piq-navy-light),var(--piq-blue))">
            <span class="chart-bar-val">${score}</span>
          </div>
        </div>
      </div>`).join('')
    : '<p style="color:var(--text-muted);font-size:13px">Log sessions to see PIQ trend.</p>';

  return `
<div class="view-with-sidebar">
  ${buildSidebar('player','player/progress')}
  <main class="page-main">
    <div class="page-header">
      <h1>My <span>Progress</span></h1>
      <p>${user?.name || 'Athlete'} · Training history and trends</p>
    </div>

    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Total Sessions</div><div class="kpi-val b">${log.length}</div><div class="kpi-chg">All time</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Completed</div><div class="kpi-val g">${log.filter(w=>w.completed).length}</div><div class="kpi-chg">${log.length ? Math.round(log.filter(w=>w.completed).length/log.length*100) : 0}% compliance</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Streak</div><div class="kpi-val">🔥 ${getStreak()}</div><div class="kpi-chg">Days active</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg RPE</div><div class="kpi-val">${log.length ? (log.reduce((s,w)=>s+(w.avgRPE||5),0)/log.length).toFixed(1) : '—'}</div><div class="kpi-chg">Target: 6–7</div></div>
    </div>

    <div class="panels-2">
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Weekly Session Volume</div>
          ${weekBars}
        </div>
        <div class="panel">
          <div class="panel-title">PIQ Score Trend</div>
          ${piqBars}
        </div>
      </div>
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Score Breakdown</div>
          ${['consistency','readiness','compliance','load'].map(k => `
          <div class="prog-row">
            <div class="prog-top">
              <strong>${k.charAt(0).toUpperCase()+k.slice(1)}</strong>
              <span>${sb[k]?.raw || 0} <span style="color:var(--text-muted);font-size:11px">× ${Math.round((sb[k]?.weight||0)*100)}%</span></span>
            </div>
            <div class="prog-bg"><div class="prog-fill" style="width:${sb[k]?.raw||0}%"></div></div>
          </div>`).join('')}
          <div style="margin-top:14px">
            <button class="btn-primary" style="width:auto;padding:10px 20px;font-size:13px" data-route="player/log">+ Log Session</button>
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">Session History</div>
          ${sessionRows}
        </div>
      </div>
    </div>
  </main>
</div>`;
}

function getWeekKey(d) {
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return (start.getMonth()+1) + '/' + start.getDate();
}
