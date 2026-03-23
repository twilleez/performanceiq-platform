import { buildSidebar } from '../../components/nav.js';
import { getRoster } from '../../state/state.js';
export function renderAdminTeams() {
  const roster = getRoster();
  const teams = [
    {name:'Varsity Basketball',sport:'Basketball',athletes:roster.length,coach:'Alex Morgan',season:'In-Season',color:'#22c955'},
    {name:'Track & Field',sport:'Track',athletes:3,coach:'Sam Rivera',season:'Pre-Season',color:'#3b82f6'},
    {name:'Soccer',sport:'Soccer',athletes:4,coach:'Jordan Kim',season:'Off-Season',color:'#f59e0b'},
  ];
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/teams')}
  <main class="page-main">
    <div class="page-header"><h1>Teams</h1><p>Manage all program teams</p></div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Total Teams</div><div class="kpi-val b">${teams.length}</div><div class="kpi-chg">Active</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Total Athletes</div><div class="kpi-val b">${teams.reduce((s,t)=>s+t.athletes,0)}</div><div class="kpi-chg">Across all teams</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${teams.map(t=>`
      <div class="panel" style="border-top:4px solid ${t.color}">
        <div style="font-size:20px;margin-bottom:8px">🏆</div>
        <div style="font-weight:700;font-size:15px;color:var(--text-primary);margin-bottom:4px">${t.name}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">${t.sport} · Coach ${t.coach}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin-bottom:12px">
          <div style="padding:8px;background:var(--surface-2);border-radius:8px;text-align:center"><div style="color:var(--text-muted)">Athletes</div><div style="font-weight:700;font-size:16px">${t.athletes}</div></div>
          <div style="padding:8px;background:${t.color}20;border-radius:8px;text-align:center"><div style="color:var(--text-muted)">Season</div><div style="font-weight:700;font-size:11px;color:${t.color}">${t.season}</div></div>
        </div>
        <button class="btn-draft" style="width:100%;font-size:12px;padding:8px">Manage Team</button>
      </div>`).join('')}
    </div>
  </main>
</div>`;
}