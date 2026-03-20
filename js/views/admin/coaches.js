import { buildSidebar } from '../../components/nav.js';
export function renderAdminCoaches() {
  return `<div class="view-with-sidebar">${buildSidebar('admin','admin/coaches')}
  <main class="page-main">
    <div class="page-header"><h1>Coaches</h1><p>Manage coaching staff</p></div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Total Coaches</div><div class="kpi-val b">3</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Active Today</div><div class="kpi-val g">2</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">Coaches</div>
      <div style="padding:32px;text-align:center;color:var(--text-muted)">
        <div style="font-size:32px;margin-bottom:12px">🚧</div>
        <div style="font-weight:600;color:var(--text-primary)">Full Management Coming Soon</div>
      </div>
    </div>
  </main></div>`;
}
