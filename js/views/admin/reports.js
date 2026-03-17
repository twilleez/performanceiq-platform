/**
 * Admin Reports View
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderAdminReports() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/reports')}
  <main class="page-main">
    <div class="page-header">
      <h1>Reports</h1>
      <p>Generate and export platform reports</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Reports Generated</div><div class="kpi-val" style="color:#3b82f6">14</div></div>
      <div class="kpi-card"><div class="kpi-lbl">This Week</div><div class="kpi-val" style="color:#22c955">3</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Scheduled</div><div class="kpi-val" style="color:#f59e0b">2</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Shared</div><div class="kpi-val" style="color:#a78bfa">7</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">Reports Overview</div>
      <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13.5px">
        <div style="font-size:32px;margin-bottom:12px">🚧</div>
        <div style="font-weight:600;color:var(--text-primary);margin-bottom:6px">Full Reports Management Coming Soon</div>
        <div>This section will include complete reports management tools, bulk actions, and detailed analytics.</div>
      </div>
    </div>
  </main>
</div>`;
}
