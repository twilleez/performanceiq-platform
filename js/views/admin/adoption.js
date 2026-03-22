import { buildSidebar } from '../../components/nav.js';
import { getRoster } from '../../state/state.js';
export function renderAdminAdoption() {
  const roster = getRoster();
  const avgPIQ = Math.round(roster.reduce((s,a)=>s+a.piq,0)/roster.length);
  const avgRdy = Math.round(roster.reduce((s,a)=>s+a.readiness,0)/roster.length);
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/adoption')}
  <main class="page-main">
    <div class="page-header"><h1>Adoption Analytics</h1><p>Platform administration</p></div>
    
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Active Athletes</div><div class="kpi-val b">${roster.length}</div><div class="kpi-chg">Logged in this week</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Check-in Rate</div><div class="kpi-val g">78%</div><div class="kpi-chg">Daily average</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg Sessions/Wk</div><div class="kpi-val b">3.4</div><div class="kpi-chg">Per athlete</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Platform Score</div><div class="kpi-val g">${avgPIQ}</div><div class="kpi-chg">Avg PIQ</div></div>
    </div>
    <div class="panels-2">
      <div class="panel"><div class="panel-title">Engagement by Role</div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">
          ${[['Athletes',roster.length,'#22c955',85],['Coaches',3,'#3b82f6',92],['Parents',Math.floor(roster.length*0.6),'#f59e0b',60]].map(([role,count,color,pct])=>`
          <div><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-size:12.5px;color:var(--text-primary)">${role} (${count})</span><span style="font-size:12.5px;font-weight:700;color:${color}">${pct}% active</span></div>
          <div style="height:7px;background:var(--surface-2);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${color};border-radius:4px"></div></div></div>`).join('')}
        </div>
      </div>
      <div class="panel"><div class="panel-title">Feature Usage</div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
          ${[['Daily Check-In',78,'#22c955'],['Workout Logging',65,'#3b82f6'],['PIQ Score View',88,'#a78bfa'],['Nutrition Tracker',42,'#f59e0b'],['Messages',55,'#fb923c']].map(([f,p,c])=>`
          <div style="display:flex;align-items:center;gap:10px"><span style="font-size:12px;color:var(--text-muted);width:140px">${f}</span>
          <div style="flex:1;height:6px;background:var(--surface-2);border-radius:3px;overflow:hidden"><div style="height:100%;width:${p}%;background:${c};border-radius:3px"></div></div>
          <span style="font-size:12px;font-weight:600;color:${c};width:28px;text-align:right">${p}%</span></div>`).join('')}
        </div>
      </div>
    </div>
  </main>
</div>`;
}