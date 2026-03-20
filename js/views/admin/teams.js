/**
 * Admin Teams View
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderAdminTeams() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/teams')}
  <main class="page-main">
    <div class="page-header">
      <h1>Teams</h1>
      <p>Manage teams and groups</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Total Teams</div><div class="kpi-val" style="color:#3b82f6">4</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Basketball</div><div class="kpi-val" style="color:#f59e0b">1</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Track</div><div class="kpi-val" style="color:#22c955">1</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Soccer</div><div class="kpi-val" style="color:#a78bfa">1</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">Teams Overview</div>
      <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13.5px">
        <div style="font-size:32px;margin-bottom:12px">🚧</div>
        <div style="font-weight:600;color:var(--text-primary);margin-bottom:6px">Full Teams Management Coming Soon</div>
        <div>This section will include complete teams management tools, bulk actions, and detailed analytics.</div>
      </div>
    </div>
  </main>
</div>`;
}
