import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderPlayerProgress() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('player', 'player/progress')}
  <main class="page-main">
    <div class="page-header">
      <h1>Progress</h1>
      <p>${user?.name || ''} · Progress</p>
    </div>
    <div class="panel">
      <div class="panel-title">Progress</div>
      <div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13.5px">
        <div style="font-size:36px;margin-bottom:12px">🚧</div>
        <div style="font-weight:700;font-size:15px;color:var(--text-primary);margin-bottom:8px">Coming Soon</div>
        <div>This section is in development.</div>
      </div>
    </div>
  </main>
</div>`;
}
