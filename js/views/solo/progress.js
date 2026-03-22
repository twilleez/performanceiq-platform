import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { getWorkoutLog } from '../../state/state.js';
import { getPIQScore, getStreak, getReadinessScore, getReadinessColor } from '../../state/selectors.js';
export function renderSoloProgress() {
  const log = getWorkoutLog();
  const user = getCurrentUser();
  const piq = getPIQScore();
  const streak = getStreak();
  const readiness = getReadinessScore();
  const rColor = getReadinessColor(readiness);
  const total = log.length;
  const completed = log.filter(w=>w.completed).length;
  const compliance = total?Math.round(completed/total*100):0;
  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/progress')}
  <main class="page-main">
    <div class="page-header"><h1>Progress</h1><p>${user?.name||'Solo Athlete'} · Training history and trends</p></div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">PIQ Score</div><div class="kpi-val g">${piq}</div><div class="kpi-chg">Current</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Streak</div><div class="kpi-val">🔥 ${streak}d</div><div class="kpi-chg">Consecutive days</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Total Sessions</div><div class="kpi-val b">${total}</div><div class="kpi-chg">All time</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Compliance</div><div class="kpi-val" style="color:${compliance>=80?'var(--piq-green)':compliance>=60?'#f59e0b':'#ef4444'}">${compliance}%</div><div class="kpi-chg">Completion rate</div></div>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Recent Sessions</div>
        ${log.length ? `<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
          ${log.slice(-7).reverse().map(w=>`
          <div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--surface-2);border-radius:10px">
            <span style="font-size:18px">${w.completed?'✅':'⏳'}</span>
            <div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text-primary)">${w.title||'Training Session'}</div>
            <div style="font-size:11.5px;color:var(--text-muted)">${new Date(w.ts).toLocaleDateString('en-US',{month:'short',day:'numeric'})} · RPE ${w.avgRPE||'—'}</div></div>
            <span style="font-size:11px;padding:3px 8px;border-radius:8px;background:${w.completed?'#22c95520':'var(--surface-2)'};color:${w.completed?'#22c955':'var(--text-muted)'};font-weight:600">${w.completed?'Done':'Missed'}</span>
          </div>`).join('')}
        </div>` : `<div style="padding:32px;text-align:center;color:var(--text-muted)">
          <div style="font-size:32px;margin-bottom:10px">📋</div>
          <div style="font-weight:600;color:var(--text-primary)">No sessions yet</div>
          <button class="btn-primary" style="margin-top:14px;font-size:13px;padding:10px 20px" data-route="solo/today">Start today →</button>
        </div>`}
      </div>
      <div class="panel">
        <div class="panel-title">Milestones</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
          ${[[total>=1,'First session logged','🏁'],[total>=5,'5 sessions','⭐'],[total>=10,'10 sessions','🌟'],[streak>=3,'3-day streak','🔥'],[streak>=7,'7-day streak','💪'],[compliance>=80,'80% compliance','✅']].map(([done,label,icon])=>`
          <div style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:10px;background:${done?'#22c95510':'var(--surface-2)'};border:1px solid ${done?'#22c95540':'var(--border)'}">
            <span style="font-size:20px;opacity:${done?1:0.4}">${icon}</span>
            <div><div style="font-size:13px;font-weight:${done?700:500};color:${done?'var(--text-primary)':'var(--text-muted)'}">${label}</div>
            <div style="font-size:11.5px;color:var(--text-muted)">${done?'Achieved!':'Keep going'}</div></div>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </main>
</div>`;
}