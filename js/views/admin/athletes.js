/**
 * Admin Athletes View
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderAdminAthletes() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/athletes')}
  <main class="page-main">
    <div class="page-header">
      <h1>Athletes</h1>
      <p>Manage athlete accounts</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Total Athletes</div><div class="kpi-val" style="color:#3b82f6">12</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Active Today</div><div class="kpi-val" style="color:#22c955">9</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Caution Flags</div><div class="kpi-val" style="color:#ef4444">2</div></div>
      <div class="kpi-card"><div class="kpi-lbl">New This Month</div><div class="kpi-val" style="color:#a78bfa">1</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">Athletes Overview</div>
      <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13.5px">
        <div style="font-size:32px;margin-bottom:12px">🚧</div>
        <div style="font-weight:600;color:var(--text-primary);margin-bottom:6px">Full Athletes Management Coming Soon</div>
        <div>This section will include complete athletes management tools, bulk actions, and detailed analytics.</div>
      </div>
    </div>
  </main>
</div>`;
}
