import { buildSidebar } from '../../components/nav.js';
import { getRoster } from '../../state/state.js';
export function renderAdminAthletes() {
  const roster = getRoster();
  const avgPIQ = Math.round(roster.reduce((s,a)=>s+a.piq,0)/roster.length);
  const avgRdy = Math.round(roster.reduce((s,a)=>s+a.readiness,0)/roster.length);
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/athletes')}
  <main class="page-main">
    <div class="page-header"><h1>Athletes</h1><p>Platform administration</p></div>
    
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Total Athletes</div><div class="kpi-val b">${roster.length}</div><div class="kpi-chg">Active</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg PIQ</div><div class="kpi-val g">${avgPIQ}</div><div class="kpi-chg">Platform avg</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg Readiness</div><div class="kpi-val" style="color:${avgRdy>=80?'var(--piq-green)':avgRdy<60?'#ef4444':'#f59e0b'}">${avgRdy}%</div><div class="kpi-chg">Today</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">All Athletes</div>
      <div style="overflow-x:auto;margin-top:12px">
        <table style="width:100%;border-collapse:collapse;font-size:12.5px">
          <thead><tr style="border-bottom:2px solid var(--border)">
            <th style="text-align:left;padding:8px 10px;color:var(--text-muted);font-size:11px;font-weight:600">NAME</th>
            <th style="text-align:center;padding:8px 10px;color:var(--text-muted);font-size:11px;font-weight:600">SPORT</th>
            <th style="text-align:center;padding:8px 10px;color:var(--text-muted);font-size:11px;font-weight:600">READINESS</th>
            <th style="text-align:center;padding:8px 10px;color:var(--text-muted);font-size:11px;font-weight:600">PIQ</th>
            <th style="text-align:center;padding:8px 10px;color:var(--text-muted);font-size:11px;font-weight:600">STREAK</th>
          </tr></thead>
          <tbody>${roster.map(a=>`<tr style="border-bottom:1px solid var(--border)">
            <td style="padding:10px"><div style="font-weight:600;font-size:13px;color:var(--text-primary)">${a.name}</div><div style="font-size:11.5px;color:var(--text-muted)">${a.position||'—'}</div></td>
            <td style="text-align:center;padding:10px;color:var(--text-muted)">${a.sport||'—'}</td>
            <td style="text-align:center;padding:10px;font-weight:700;color:${a.readiness>=80?'#22c955':a.readiness<60?'#ef4444':'#f59e0b'}">${a.readiness}%</td>
            <td style="text-align:center;padding:10px;font-weight:700;color:var(--piq-green)">${a.piq}</td>
            <td style="text-align:center;padding:10px">🔥 ${a.streak}d</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>
  </main>
</div>`;
}