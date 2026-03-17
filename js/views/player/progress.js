/**
 * Player Progress View — performance trends and history
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { getWorkoutLog }  from '../../state/state.js';
import { getPIQScore, getStreak, getWorkoutCount, getScoreBreakdown } from '../../state/selectors.js';

export function renderPlayerProgress() {
  const user     = getCurrentUser();
  const log      = getWorkoutLog();
  const piq      = getPIQScore();
  const streak   = getStreak();
  const sessions = getWorkoutCount();
  const breakdown = getScoreBreakdown();

  // Last 7 sessions for mini chart
  const recent7 = [...log].sort((a,b)=>b.ts-a.ts).slice(0,7).reverse();
  const maxRPE = 10;
  const chartBars = recent7.length > 0
    ? recent7.map(w => {
        const h = Math.round((w.avgRPE||5)/maxRPE*60);
        const color = (w.avgRPE||5)>=8?'#ef4444':(w.avgRPE||5)>=6?'#f59e0b':'#22c955';
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
          <div style="width:28px;height:${h}px;background:${color};border-radius:4px 4px 0 0"></div>
          <div style="font-size:10px;color:var(--text-muted)">${new Date(w.ts).toLocaleDateString('en-US',{weekday:'short'})}</div>
        </div>`;
      }).join('')
    : `<div style="color:var(--text-muted);font-size:12.5px;padding:20px 0">No sessions logged yet.</div>`;

  const componentRows = [
    { label: 'Training Consistency', key: 'consistency', icon: '🔥' },
    { label: 'Readiness Index',      key: 'readiness',   icon: '💚' },
    { label: 'Workout Compliance',   key: 'compliance',  icon: '✅' },
    { label: 'Load Management',      key: 'load',        icon: '⚖️' },
  ].map(c => {
    const comp = breakdown[c.key];
    return `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <span style="font-size:13px;color:var(--text-primary)">${c.icon} ${c.label}</span>
        <span style="font-size:12px;font-weight:700;color:var(--text-primary)">${comp.raw} <span style="color:var(--text-muted);font-weight:400">→ ${comp.weighted} pts</span></span>
      </div>
      <div style="height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${comp.raw}%;background:var(--piq-green);border-radius:4px;transition:width .4s"></div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:3px">Weight: ${Math.round(comp.weight*100)}% of total score</div>
    </div>`;
  }).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('player','player/progress')}
  <main class="page-main">
    <div class="page-header">
      <h1>My Progress</h1>
      <p>Performance trends and training history</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">PIQ Score</div><div class="kpi-val g">${piq}</div><div class="kpi-chg">${breakdown.tier}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Sessions</div><div class="kpi-val b">${sessions}</div><div class="kpi-chg">Total logged</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Streak</div><div class="kpi-val">🔥 ${streak}d</div><div class="kpi-chg">Consecutive days</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Compliance</div><div class="kpi-val">${breakdown.compliance.raw}%</div><div class="kpi-chg">Completion rate</div></div>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Recent RPE Trend</div>
        <div style="display:flex;align-items:flex-end;gap:6px;height:80px;margin-top:16px;padding-bottom:4px">
          ${chartBars}
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px">RPE = Rate of Perceived Exertion (1–10). Green ≤5, Amber 6–7, Red ≥8.</div>
      </div>
      <div class="panel">
        <div class="panel-title">PIQ Score Breakdown</div>
        <div style="margin-top:12px">${componentRows}</div>
      </div>
    </div>
  </main>
</div>`;
}
