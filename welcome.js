import { buildSidebar } from '../../components/nav.js';
export function renderAdminCoaches() {
  const coaches = [{name:'Alex Morgan',sport:'Basketball',athletes:5,status:'Active',piq:88},{name:'Sam Rivera',sport:'Track & Field',athletes:3,status:'Active',piq:82},{name:'Jordan Kim',sport:'Soccer',athletes:4,status:'Active',piq:85}];
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/coaches')}
  <main class="page-main">
    <div class="page-header"><h1>Coaches</h1><p>Manage coaching staff · ${coaches.length} active coaches</p></div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Total Coaches</div><div class="kpi-val b">${coaches.length}</div><div class="kpi-chg">Active</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Athletes Managed</div><div class="kpi-val b">${coaches.reduce((s,c)=>s+c.athletes,0)}</div><div class="kpi-chg">Total assigned</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg Team PIQ</div><div class="kpi-val g">${Math.round(coaches.reduce((s,c)=>s+c.piq,0)/coaches.length)}</div><div class="kpi-chg">Across all teams</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">Coaching Staff</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:14px">
        ${coaches.map(c=>`
        <div style="padding:16px;border:1px solid var(--border);border-radius:12px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <div style="width:44px;height:44px;border-radius:50%;background:var(--piq-green);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#0d1b3e">${c.name.split(' ').map(w=>w[0]).join('')}</div>
            <div><div style="font-weight:700;font-size:14px;color:var(--text-primary)">${c.name}</div><div style="font-size:12px;color:var(--text-muted)">${c.sport}</div></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
            <div style="padding:8px;background:var(--surface-2);border-radius:8px;text-align:center"><div style="color:var(--text-muted);margin-bottom:2px">Athletes</div><div style="font-weight:700;font-size:16px">${c.athletes}</div></div>
            <div style="padding:8px;background:var(--surface-2);border-radius:8px;text-align:center"><div style="color:var(--text-muted);margin-bottom:2px">Team PIQ</div><div style="font-weight:700;font-size:16px;color:var(--piq-green)">${c.piq}</div></div>
          </div>
          <div style="margin-top:10px;display:flex;gap:8px">
            <button class="btn-draft" style="flex:1;font-size:12px;padding:7px">View Team</button>
            <button class="btn-draft" style="flex:1;font-size:12px;padding:7px">Message</button>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </main>
</div>`;
}