import { buildSidebar } from '../../components/nav.js';
import { getRoster } from '../../state/state.js';
export function renderAdminReports() {
  const roster = getRoster();
  const avgPIQ = Math.round(roster.reduce((s,a)=>s+a.piq,0)/roster.length);
  const reports = [{icon:'📊',title:'Weekly Platform Summary',desc:'All-user activity and engagement',ready:true},{icon:'📈',title:'PIQ Trend Analysis',desc:'Score trends across all athletes',ready:true},{icon:'💚',title:'Wellness Heatmap',desc:'Team readiness patterns over time',ready:true},{icon:'📋',title:'Compliance Report',desc:'Workout completion by team/athlete',ready:true},{icon:'🎯',title:'Goal Achievement',desc:'Goal tracking across the program',ready:false},{icon:'🏥',title:'Injury Risk Report',desc:'ACWR flags and at-risk athletes',ready:false}];
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/reports')}
  <main class="page-main">
    <div class="page-header"><h1>Reports</h1><p>Platform-wide analytics and exports</p></div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Avg PIQ</div><div class="kpi-val g">${avgPIQ}</div><div class="kpi-chg">Platform avg</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Roster Size</div><div class="kpi-val b">${roster.length}</div><div class="kpi-chg">Active athletes</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Reports Ready</div><div class="kpi-val b">${reports.filter(r=>r.ready).length}</div><div class="kpi-chg">Available now</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">Available Reports</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-top:12px">
        ${reports.map(r=>`
        <div style="padding:16px;border:1px solid var(--border);border-radius:12px">
          <div style="display:flex;gap:12px">
            <div style="font-size:24px">${r.icon}</div>
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="font-weight:600;font-size:13.5px;color:var(--text-primary)">${r.title}</span>
                <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:${r.ready?'#22c95522':'var(--surface-2)'};color:${r.ready?'#22c955':'var(--text-muted)'};font-weight:600">${r.ready?'Ready':'Soon'}</span>
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${r.desc}</div>
              <button class="btn-draft" style="font-size:12px;padding:6px 14px" ${!r.ready?'disabled style="opacity:.5"':''}>Generate</button>
            </div>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </main>
</div>`;
}