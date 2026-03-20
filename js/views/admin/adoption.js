/**
 * Admin Adoption View
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderAdminAdoption() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/adoption')}
  <main class="page-main">
    <div class="page-header">
      <h1>Adoption</h1>
      <p>Platform adoption and engagement metrics</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Overall Adoption</div><div class="kpi-val" style="color:#22c955">87%</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Daily Active Users</div><div class="kpi-val" style="color:#3b82f6">9</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg Sessions/Week</div><div class="kpi-val" style="color:#f59e0b">4.2</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Retention Rate</div><div class="kpi-val" style="color:#22c955">91%</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">Adoption Overview</div>
      <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13.5px">
        <div style="font-size:32px;margin-bottom:12px">🚧</div>
        <div style="font-weight:600;color:var(--text-primary);margin-bottom:6px">Full Adoption Management Coming Soon</div>
        <div>This section will include complete adoption management tools, bulk actions, and detailed analytics.</div>
      </div>
    </div>
  </main>
</div>`;
}
