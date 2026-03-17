/**
 * Admin Settings View
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderAdminSettings() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/settings')}
  <main class="page-main">
    <div class="page-header">
      <h1>Settings</h1>
      <p>Platform and admin settings</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Admins</div><div class="kpi-val" style="color:#3b82f6">1</div></div>
      <div class="kpi-card"><div class="kpi-lbl">API Keys</div><div class="kpi-val" style="color:#22c955">2</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Integrations</div><div class="kpi-val" style="color:#f59e0b">3</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Last Updated</div><div class="kpi-val" style="color:#a78bfa">Today</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">Settings Overview</div>
      <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13.5px">
        <div style="font-size:32px;margin-bottom:12px">🚧</div>
        <div style="font-weight:600;color:var(--text-primary);margin-bottom:6px">Full Settings Management Coming Soon</div>
        <div>This section will include complete settings management tools, bulk actions, and detailed analytics.</div>
      </div>
    </div>
  </main>
</div>`;
}
