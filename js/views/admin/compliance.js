/**
 * Admin Compliance View
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderAdminCompliance() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/compliance')}
  <main class="page-main">
    <div class="page-header">
      <h1>Compliance</h1>
      <p>Platform compliance and data governance</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Data Compliance</div><div class="kpi-val" style="color:#22c955">100%</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Privacy Requests</div><div class="kpi-val" style="color:#22c955">0</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Audit Logs</div><div class="kpi-val" style="color:#3b82f6">247</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Last Audit</div><div class="kpi-val" style="color:#f59e0b">Mar 10</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">Compliance Overview</div>
      <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13.5px">
        <div style="font-size:32px;margin-bottom:12px">🚧</div>
        <div style="font-weight:600;color:var(--text-primary);margin-bottom:6px">Full Compliance Management Coming Soon</div>
        <div>This section will include complete compliance management tools, bulk actions, and detailed analytics.</div>
      </div>
    </div>
  </main>
</div>`;
}
