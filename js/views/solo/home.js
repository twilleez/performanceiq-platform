/**
 * Solo Home Dashboard
 */
import { buildSidebar }              from '../../components/nav.js';
import { getCurrentUser }            from '../../core/auth.js';
import { getReadinessScore, getReadinessRingOffset,
         getReadinessColor, getReadinessExplain,
         getPIQScore, getWorkoutCount, getStreak } from '../../state/selectors.js';

export function renderSoloHome() {
  const user      = getCurrentUser();
  const fname     = user?.name?.split(' ')[0] || 'Athlete';
  const date      = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  const readiness = getReadinessScore();
  const piq       = getPIQScore();
  const sessions  = getWorkoutCount();
  const streak    = getStreak();
  const offset    = getReadinessRingOffset(readiness);
  const color     = getReadinessColor(readiness);
  const explain   = getReadinessExplain(readiness);

  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/home')}
  <main class="page-main">
    <div class="page-header">
      <h1>Welcome back, <span>${fname}</span> 👋</h1>
      <p>${date} · ${user?.sport||'Solo'} · Solo Training</p>
    </div>

    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">PIQ Score</div><div class="kpi-val g">${piq}</div><div class="kpi-chg">↑ Training Intelligence</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Readiness</div><div class="kpi-val" style="color:${color}">${readiness}%</div><div class="kpi-chg">${readiness>=80?'↑ High':readiness>=60?'→ Moderate':'↓ Low'}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Sessions</div><div class="kpi-val b">${sessions}</div><div class="kpi-chg">Logged total</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Streak</div><div class="kpi-val">🔥 ${streak}</div><div class="kpi-chg">Days active</div></div>
    </div>

    <div class="panels-2">
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Today's Plan</div>
          <div class="w-row"><div class="w-icon">⚡</div><div class="w-info"><div class="w-name">Speed & Agility Circuit</div><div class="w-meta">35 min · High · ${user?.sport||'Track'}</div></div><span class="w-badge">NOW</span></div>
          <div class="w-row"><div class="w-icon">💪</div><div class="w-info"><div class="w-name">Lower Body Strength</div><div class="w-meta">40 min · Moderate</div></div><span class="w-badge gray">PM</span></div>
          <div style="margin-top:14px;display:flex;gap:10px">
            <button class="btn-primary" style="font-size:12.5px;padding:10px 18px" data-route="solo/today">Start</button>
            <button class="btn-draft"   style="font-size:12.5px;padding:10px 18px" data-route="solo/builder">Builder</button>
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">Quick Access</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn-draft" style="text-align:left;padding:10px 14px" data-route="solo/score">🏅 View PIQ Score</button>
            <button class="btn-draft" style="text-align:left;padding:10px 14px" data-route="solo/progress">📈 Progress Charts</button>
            <button class="btn-draft" style="text-align:left;padding:10px 14px" data-route="solo/goals">🎯 My Goals</button>
            <button class="btn-draft" style="text-align:left;padding:10px 14px" data-route="solo/library">📚 Exercise Library</button>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Readiness Engine</div>
        <div class="ring-wrap">
          <svg width="110" height="110" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="46" fill="none" stroke="var(--border)" stroke-width="9"/>
            <circle cx="55" cy="55" r="46" fill="none" stroke="${color}" stroke-width="9"
              stroke-dasharray="289" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 55 55)"/>
          </svg>
          <div class="ring-num" style="color:${color}">${readiness}</div>
          <div class="ring-lbl">Readiness Score</div>
        </div>
        <p class="readiness-explain">${explain}</p>
        <div class="rf-row"><span class="rf-lbl">Sleep</span><div class="rf-bar-bg"><div class="rf-bar-fill" style="width:${Math.min(99,readiness+6)}%"></div></div><span class="rf-num">${Math.min(99,readiness+6)}</span></div>
        <div class="rf-row"><span class="rf-lbl">Load</span><div class="rf-bar-bg"><div class="rf-bar-fill" style="width:${Math.max(40,readiness-4)}%"></div></div><span class="rf-num">${Math.max(40,readiness-4)}</span></div>
        <div class="rf-row"><span class="rf-lbl">Recovery</span><div class="rf-bar-bg"><div class="rf-bar-fill" style="width:${Math.min(98,readiness+3)}%"></div></div><span class="rf-num">${Math.min(98,readiness+3)}</span></div>
      </div>
    </div>
  </main>
</div>`;
}
