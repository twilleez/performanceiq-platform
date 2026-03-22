import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { getRoster } from '../../state/state.js';
export function renderAdminHome() {
  const user = getCurrentUser();
  const fname = user?.name?.split(' ')[0]||'Admin';
  const roster = getRoster();
  const avgPIQ = Math.round(roster.reduce((s,a)=>s+a.piq,0)/roster.length);
  const avgRdy = Math.round(roster.reduce((s,a)=>s+a.readiness,0)/roster.length);
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/home')}
  <main class="page-main">
    <div class="page-header">
      <h1>Admin <span>Overview</span></h1>
      <p>${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} · Platform Administration</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Athletes</div><div class="kpi-val b">${roster.length}</div><div class="kpi-chg">Active accounts</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Coaches</div><div class="kpi-val b">3</div><div class="kpi-chg">Active</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg PIQ</div><div class="kpi-val g">${avgPIQ}</div><div class="kpi-chg">Platform avg</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg Readiness</div><div class="kpi-val" style="color:${avgRdy>=80?'var(--piq-green)':avgRdy<60?'#ef4444':'#f59e0b'}">${avgRdy}%</div><div class="kpi-chg">Today</div></div>
      <div class="kpi-card"><div class="kpi-lbl">At Risk</div><div class="kpi-val" style="color:${roster.filter(a=>a.readiness<60).length>0?'#ef4444':'#22c955'}">${roster.filter(a=>a.readiness<60).length}</div><div class="kpi-chg">Need attention</div></div>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Quick Actions</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
          ${[['👥','Teams','admin/teams'],['🎽','Coaches','admin/coaches'],['🏃','Athletes','admin/athletes'],['📊','Reports','admin/reports'],['🏫','Organization','admin/org'],['💳','Billing','admin/billing']].map(([icon,label,route])=>`
          <button class="btn-draft" style="padding:14px;text-align:left;font-size:13px;display:flex;align-items:center;gap:8px" data-route="${route}">
            <span style="font-size:18px">${icon}</span>${label}
          </button>`).join('')}
        </div>
      </div>
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Platform Health</div>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
            ${[['Active sessions today','8','#22c955'],['Workouts logged this week','34','#3b82f6'],['Check-in rate','78%','#f59e0b'],['Caution flags',roster.filter(a=>a.readiness<60).length,'#ef4444']].map(([l,v,c])=>`
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:12.5px;color:var(--text-muted)">${l}</span>
              <span style="font-size:13px;font-weight:700;color:${c}">${v}</span>
            </div>`).join('')}
          </div>
        </div>
        <div class="panel" style="background:linear-gradient(135deg,#0d1b3e,#1a2f5e);border-color:#22c95530">
          <div style="font-size:11px;font-weight:700;color:var(--piq-green);letter-spacing:.06em;margin-bottom:8px">PLATFORM STATUS</div>
          <div style="font-size:12.5px;color:#c8d8e8;line-height:1.6">All systems operational. Last deployment: today. Uptime: 99.9%.</div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}