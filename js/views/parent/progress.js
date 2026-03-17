/**
 * Parent Progress View — athlete progress overview for parent
 */
import { buildSidebar }   from '../../components/nav.js';
import { getRoster }      from '../../state/state.js';
import { getScoreBreakdown, getWorkoutCount, getStreak } from '../../state/selectors.js';

export function renderParentProgress() {
  const roster    = getRoster();
  const athlete   = roster[0] || { name: 'Jake Williams', readiness: 82, piq: 79, streak: 5, sport: 'basketball' };
  const breakdown = getScoreBreakdown();
  const sessions  = getWorkoutCount();
  const streak    = getStreak();

  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/progress')}
  <main class="page-main">
    <div class="page-header">
      <h1>Progress Overview</h1>
      <p>${athlete.name} · Performance trends</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">PIQ Score</div><div class="kpi-val g">${breakdown.total}</div><div class="kpi-chg">${breakdown.tier}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Sessions Logged</div><div class="kpi-val b">${sessions}</div><div class="kpi-chg">Total</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Current Streak</div><div class="kpi-val">🔥 ${streak}d</div><div class="kpi-chg">Consecutive days</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Compliance</div><div class="kpi-val">${breakdown.compliance.raw}%</div><div class="kpi-chg">Completion rate</div></div>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">PIQ Score Components</div>
        <div style="margin-top:12px">
          ${[
            { label: 'Training Consistency', key: 'consistency', icon: '🔥', desc: 'How regularly your athlete trains' },
            { label: 'Readiness Index',      key: 'readiness',   icon: '💚', desc: 'Physical readiness based on load and recovery' },
            { label: 'Workout Compliance',   key: 'compliance',  icon: '✅', desc: 'Percentage of planned sessions completed' },
            { label: 'Load Management',      key: 'load',        icon: '⚖️', desc: 'Balance of training intensity over time' },
          ].map(c => {
            const comp = breakdown[c.key];
            return `
            <div style="margin-bottom:14px">
              <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${c.icon} ${c.label}</span>
                <span style="font-size:13px;font-weight:700;color:var(--piq-green)">${comp.raw}</span>
              </div>
              <div style="font-size:11.5px;color:var(--text-muted);margin-bottom:5px">${c.desc}</div>
              <div style="height:7px;background:var(--surface-2);border-radius:4px;overflow:hidden">
                <div style="height:100%;width:${comp.raw}%;background:var(--piq-green);border-radius:4px"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Understanding the PIQ Score</div>
        <div style="margin-top:12px;font-size:13px;color:var(--text-primary);line-height:1.7">
          <p style="margin:0 0 12px">The <strong>PIQ Score</strong> (Performance IQ Score) is a composite metric ranging from 30–99 that reflects the overall quality of your athlete's training.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
            ${[['90–99','Elite','#22c955'],['80–89','Advanced','#3b82f6'],['70–79','Developing','#f59e0b'],['60–69','Building','#f97316'],['30–59','Getting Started','#6b7280']].map(([range,tier,color])=>`
            <div style="padding:8px;background:var(--surface-2);border-radius:8px">
              <div style="font-weight:700;font-size:12px;color:${color}">${range}</div>
              <div style="font-size:11.5px;color:var(--text-muted)">${tier}</div>
            </div>`).join('')}
          </div>
          <p style="margin:0;font-size:12px;color:var(--text-muted)">Scores improve as your athlete logs more sessions, maintains consistency, and manages training load effectively.</p>
        </div>
      </div>
    </div>
  </main>
</div>`;
}
