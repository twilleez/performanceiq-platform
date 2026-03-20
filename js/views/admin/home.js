/**
 * Admin Home Dashboard
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { getRoster }      from '../../state/state.js';

export function renderAdminHome() {
  const user   = getCurrentUser();
  const fname  = user?.name?.split(' ')[0] || 'Admin';
  const date   = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  const roster = getRoster();

  const totalAthletes = roster.length;
  const avgPIQ = Math.round(roster.reduce((s,a)=>s+a.piq,0)/roster.length);
  const avgRdy = Math.round(roster.reduce((s,a)=>s+a.readiness,0)/roster.length);

  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/home')}
  <main class="page-main">
    <div class="page-header">
      <h1>Admin Overview</h1>
      <p>${date} · Platform Administration</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Total Athletes</div><div class="kpi-val b">${totalAthletes}</div><div class="kpi-chg">Active accounts</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Coaches</div><div class="kpi-val b">3</div><div class="kpi-chg">Active coaches</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg PIQ Score</div><div class="kpi-val g">${avgPIQ}</div><div class="kpi-chg">Platform average</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg Readiness</div><div class="kpi-val" style="color:${avgRdy>=80?'var(--piq-green)':avgRdy<60?'#ef4444':'#f59e0b'}">${avgRdy}%</div><div class="kpi-chg">Today</div></div>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Quick Actions</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
          ${[
            ['👥', 'Manage Teams', 'admin/teams'],
            ['🎽', 'Manage Coaches', 'admin/coaches'],
            ['🏃', 'Manage Athletes', 'admin/athletes'],
            ['📊', 'View Reports', 'admin/reports'],
            ['🏫', 'Organization', 'admin/org'],
            ['💳', 'Billing', 'admin/billing'],
          ].map(([icon, label, route]) => `
          <button class="btn-draft" style="padding:14px;text-align:left;font-size:13px;display:flex;align-items:center;gap:8px" data-route="${route}">
            <span style="font-size:18px">${icon}</span> ${label}
          </button>`).join('')}
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Platform Health</div>
        <div style="margin-top:12px">
          ${[
            ['Active Sessions Today', '8', '#22c955'],
            ['Workouts Logged This Week', '34', '#3b82f6'],
            ['Caution Flags', roster.filter(a=>a.readiness<60).length.toString(), roster.filter(a=>a.readiness<60).length>0?'#ef4444':'#22c955'],
            ['Adoption Rate', '87%', '#22c955'],
          ].map(([label, value, color]) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:13px;color:var(--text-primary)">${label}</span>
            <span style="font-size:15px;font-weight:700;color:${color}">${value}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </main>
</div>`;
}
