import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderAdminHome() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin', 'admin/home')}
  <main class="page-main">
    <div class="page-header">
      <h1>Platform Overview</h1>
      <p>${user?.name || ''} · Platform Overview</p>
    </div>
    <div class="panel">
      <div class="panel-title">Platform Overview</div>
      <div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13.5px">
        <div style="font-size:36px;margin-bottom:12px">🚧</div>
        <div style="font-weight:700;font-size:15px;color:var(--text-primary);margin-bottom:8px">Coming Soon</div>
        <div>This section is in development.</div>
      </div>
    </div>
  </main>
</div>`;
}
