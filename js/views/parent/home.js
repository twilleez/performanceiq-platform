import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { getReadinessScore, getReadinessRingOffset, getReadinessColor, getPIQScore, getWorkoutCount } from '../../state/selectors.js';

export function renderParentHome() {
  const user    = getCurrentUser();
  const fname   = user?.name?.split(' ')[0] || 'Parent';
  const athlete = user?.linkedAthlete || 'Jake Williams';
  const score   = getReadinessScore(), offset = getReadinessRingOffset(score), color = getReadinessColor(score);
  const piq = getPIQScore(), sessions = getWorkoutCount();
  const date = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/home')}
  <main class="page-main">
    <div class="page-header">
      <h1>Welcome back, <span>${fname}</span> 👋</h1>
      <p>${date} · Monitoring ${athlete}</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">PIQ Score</div><div class="kpi-val g">${piq}</div><div class="kpi-chg">Performance Intelligence</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Readiness</div><div class="kpi-val" style="color:${color}">${score}%</div><div class="kpi-chg">${score>=80?'↑ High':score>=60?'→ Moderate':'↓ Low'}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Sessions</div><div class="kpi-val b">${sessions}</div><div class="kpi-chg">Total logged</div></div>
      <div class="kpi-card"><div class="kpi-lbl">This Week</div><div class="kpi-val">3</div><div class="kpi-chg">Of 4 planned</div></div>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Readiness — ${athlete}</div>
        <div class="ring-wrap">
          <svg width="110" height="110" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="46" fill="none" stroke="var(--border)" stroke-width="9"/>
            <circle cx="55" cy="55" r="46" fill="none" stroke="${color}" stroke-width="9"
              stroke-dasharray="289" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 55 55)"/>
          </svg>
          <div class="ring-num" style="color:${color}">${score}</div>
          <div class="ring-lbl">Readiness Score</div>
        </div>
        <div style="padding:12px;background:rgba(57,230,107,.05);border-radius:10px;border:1px solid var(--border);font-size:12.5px;color:var(--text-secondary)">
          🔒 Parent view is read-only. Full data access requires athlete consent.
        </div>
      </div>
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Today's Plan</div>
          <div class="w-row"><div class="w-icon">🏀</div><div class="w-info"><div class="w-name">Guard Speed & Quickness</div><div class="w-meta">40 min · Basketball · Speed</div></div><span class="w-badge">NEXT</span></div>
          <div class="w-row"><div class="w-icon">🧘</div><div class="w-info"><div class="w-name">Recovery Mobility</div><div class="w-meta">20 min · Low intensity</div></div><span class="w-badge gray">PM</span></div>
        </div>
        <div class="panel">
          <div class="panel-title">Quick Links</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn-draft" style="text-align:left;padding:10px 14px" data-route="parent/child">👤 Athlete Overview</button>
            <button class="btn-draft" style="text-align:left;padding:10px 14px" data-route="parent/week">📅 Weekly Plan</button>
            <button class="btn-draft" style="text-align:left;padding:10px 14px" data-route="parent/progress">📈 Progress Charts</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}
