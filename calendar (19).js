import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderCoachHome() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach', 'coach/home')}
  <main class="page-main">
    <div class="page-header">
      <h1>Coach Dashboard</h1>
      <p>${user?.name || ''} — Coach Dashboard</p>
    </div>
    <div class="panel">
      <div class="panel-title">Coach Dashboard</div>
      <div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13.5px">
        <div style="font-size:36px;margin-bottom:12px">⚡</div>
        <div style="font-weight:700;font-size:15px;color:var(--text-primary);margin-bottom:8px">Coach Dashboard</div>
        <div>This view is provided by your uploaded source files.</div>
      </div>
    </div>
  </main>
</div>`;
}
