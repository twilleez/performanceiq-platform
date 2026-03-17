/**
 * Parent Home Dashboard
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { getRoster }      from '../../state/state.js';

export function renderParentHome() {
  const user   = getCurrentUser();
  const fname  = user?.name?.split(' ')[0] || 'Parent';
  const date   = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  const roster = getRoster();

  // Simulate linked athlete (first on roster)
  const athlete = roster[0] || { name: 'Jake Williams', readiness: 82, piq: 79, streak: 5, sport: 'basketball', position: 'SG' };

  const readinessColor = athlete.readiness>=80?'#22c955':athlete.readiness<60?'#ef4444':'#f59e0b';

  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/home')}
  <main class="page-main">
    <div class="page-header">
      <h1>Welcome, <span>${fname}</span> 👋</h1>
      <p>${date} · Parent Dashboard</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Athlete Readiness</div><div class="kpi-val" style="color:${readinessColor}">${athlete.readiness}%</div><div class="kpi-chg">Today</div></div>
      <div class="kpi-card"><div class="kpi-lbl">PIQ Score</div><div class="kpi-val g">${athlete.piq}</div><div class="kpi-chg">Performance index</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Training Streak</div><div class="kpi-val">🔥 ${athlete.streak}d</div><div class="kpi-chg">Consecutive days</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Status</div><div class="kpi-val" style="font-size:14px">${athlete.readiness>=80?'✅ Ready':athlete.readiness<60?'⚠️ Caution':'→ Moderate'}</div><div class="kpi-chg">Today</div></div>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Your Athlete — ${athlete.name}</div>
        <div style="padding:16px;background:var(--surface-2);border-radius:12px;margin-top:12px">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
            <div style="width:50px;height:50px;border-radius:50%;background:var(--piq-green);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#0d1b3e">
              ${athlete.name.split(' ').map(w=>w[0]).join('')}
            </div>
            <div>
              <div style="font-weight:700;font-size:14px;color:var(--text-primary)">${athlete.name}</div>
              <div style="font-size:12px;color:var(--text-muted)">${athlete.position||'—'} · ${athlete.sport||'—'}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div style="padding:10px;background:var(--bg-primary);border-radius:8px;text-align:center">
              <div style="font-size:20px;font-weight:700;color:${readinessColor}">${athlete.readiness}%</div>
              <div style="font-size:11px;color:var(--text-muted)">Readiness</div>
            </div>
            <div style="padding:10px;background:var(--bg-primary);border-radius:8px;text-align:center">
              <div style="font-size:20px;font-weight:700;color:var(--piq-green)">${athlete.piq}</div>
              <div style="font-size:11px;color:var(--text-muted)">PIQ Score</div>
            </div>
          </div>
        </div>
        <div style="margin-top:14px;display:flex;gap:10px">
          <button class="btn-primary" style="flex:1;font-size:12.5px;padding:10px" data-route="parent/child">View Details</button>
          <button class="btn-draft" style="flex:1;font-size:12.5px;padding:10px" data-route="parent/progress">Progress</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">This Week's Schedule</div>
        ${[
          ['Monday', '7:00 AM', 'Morning Conditioning', '#3b82f6'],
          ['Tuesday', '3:30 PM', 'Strength Block', '#22c955'],
          ['Wednesday', '3:30 PM', 'Team Scrimmage', '#f59e0b'],
          ['Thursday', '7:00 AM', 'Recovery Session', '#a78bfa'],
          ['Friday', '3:30 PM', 'Speed Work', '#3b82f6'],
          ['Saturday', '10:00 AM', 'Game Day', '#f59e0b'],
        ].map(([day,time,title,color])=>`
        <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
          <div style="width:3px;height:32px;background:${color};border-radius:2px;flex-shrink:0"></div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${title}</div>
            <div style="font-size:11.5px;color:var(--text-muted)">${day} · ${time}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </main>
</div>`;
}
