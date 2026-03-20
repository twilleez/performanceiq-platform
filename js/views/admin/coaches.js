/**
 * Admin Coaches View
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderAdminCoaches() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/coaches')}
  <main class="page-main">
    <div class="page-header">
      <h1>Coaches</h1>
      <p>Manage coaching staff</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Total Coaches</div><div class="kpi-val" style="color:#3b82f6">3</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Head Coaches</div><div class="kpi-val" style="color:#22c955">2</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Assistant Coaches</div><div class="kpi-val" style="color:#f59e0b">1</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Active Today</div><div class="kpi-val" style="color:#22c955">2</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">Coaches Overview</div>
      <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13.5px">
        <div style="font-size:32px;margin-bottom:12px">🚧</div>
        <div style="font-weight:600;color:var(--text-primary);margin-bottom:6px">Full Coaches Management Coming Soon</div>
        <div>This section will include complete coaches management tools, bulk actions, and detailed analytics.</div>
      </div>
    </div>
  </main>
</div>`;
}
