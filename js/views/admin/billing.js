/**
 * Admin Billing View
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderAdminBilling() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/billing')}
  <main class="page-main">
    <div class="page-header">
      <h1>Billing</h1>
      <p>Organization billing and invoices</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Plan</div><div class="kpi-val" style="color:#22c955">Team Pro</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Monthly Cost</div><div class="kpi-val" style="color:#3b82f6">$149</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Next Renewal</div><div class="kpi-val" style="color:#f59e0b">Apr 1</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Invoices</div><div class="kpi-val" style="color:#a78bfa">3</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">Billing Overview</div>
      <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13.5px">
        <div style="font-size:32px;margin-bottom:12px">🚧</div>
        <div style="font-weight:600;color:var(--text-primary);margin-bottom:6px">Full Billing Management Coming Soon</div>
        <div>This section will include complete billing management tools, bulk actions, and detailed analytics.</div>
      </div>
    </div>
  </main>
</div>`;
}
