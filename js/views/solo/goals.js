/**
 * Solo Goals View — personal training goals
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { getState }       from '../../state/state.js';
import { getPIQScore, getStreak, getWorkoutCount } from '../../state/selectors.js';

export function renderSoloGoals() {
  const user     = getCurrentUser();
  const piq      = getPIQScore();
  const streak   = getStreak();
  const sessions = getWorkoutCount();
  const goals    = getState().athleteProfile?.goals || [];

  const defaultGoals = [
    { title: 'Log 20 Sessions', target: 20, current: sessions, unit: 'sessions', icon: '💪' },
    { title: 'Reach 7-Day Streak', target: 7, current: streak, unit: 'days', icon: '🔥' },
    { title: 'PIQ Score ≥80', target: 80, current: piq, unit: 'points', icon: '🏅' },
  ];

  const goalCards = defaultGoals.map(g => {
    const pct = Math.min(100, Math.round(g.current/g.target*100));
    const done = g.current >= g.target;
    return `
    <div style="padding:16px;border:1px solid ${done?'var(--piq-green)':'var(--border)'};border-radius:12px;background:${done?'#22c95511':'transparent'}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="font-size:22px">${g.icon}</span>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13.5px;color:var(--text-primary)">${g.title}</div>
          <div style="font-size:12px;color:var(--text-muted)">${g.current} / ${g.target} ${g.unit}</div>
        </div>
        ${done?`<span style="font-size:11px;padding:3px 8px;border-radius:10px;background:#22c95522;color:#22c955;font-weight:700">✓ Done</span>`:''}
      </div>
      <div style="height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${done?'var(--piq-green)':'#3b82f6'};border-radius:4px;transition:width .4s"></div>
      </div>
      <div style="font-size:11.5px;color:var(--text-muted);margin-top:5px">${pct}% complete</div>
    </div>`;
  }).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/goals')}
  <main class="page-main">
    <div class="page-header">
      <h1>Training Goals</h1>
      <p>Track your personal performance targets</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Goals Active</div><div class="kpi-val b">${defaultGoals.length}</div><div class="kpi-chg">In progress</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Completed</div><div class="kpi-val g">${defaultGoals.filter(g=>g.current>=g.target).length}</div><div class="kpi-chg">Achieved</div></div>
      <div class="kpi-card"><div class="kpi-lbl">PIQ Score</div><div class="kpi-val" style="color:var(--piq-green)">${piq}</div><div class="kpi-chg">Current</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Streak</div><div class="kpi-val">🔥 ${streak}d</div><div class="kpi-chg">Active days</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">Current Goals</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-top:12px">
        ${goalCards}
      </div>
    </div>
    <div class="panel" style="margin-top:16px">
      <div class="panel-title">Goal Setting Guide</div>
      <div style="margin-top:12px;font-size:13px;color:var(--text-primary);line-height:1.7">
        <p style="margin:0 0 10px">Effective goal setting in athletic training follows the <strong>SMART framework</strong>: goals should be Specific, Measurable, Achievable, Relevant, and Time-bound.</p>
        <p style="margin:0;font-size:12px;color:var(--text-muted)">Custom goal creation is coming in a future update. For now, your progress toward the default targets above is tracked automatically as you log sessions.</p>
      </div>
    </div>
  </main>
</div>`;
}
