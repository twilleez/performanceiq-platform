import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderPlayerToday() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('player', 'player/today')}
  <main class="page-main">
    <div class="page-header">
      <h1>Today's Workout</h1>
      <p>${user?.name || ''} — Today's Workout</p>
    </div>
    <div class="panel">
      <div class="panel-title">Today's Workout</div>
      <div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13.5px">
        <div style="font-size:36px;margin-bottom:12px">⚡</div>
        <div style="font-weight:700;font-size:15px;color:var(--text-primary);margin-bottom:8px">Today's Workout</div>
        <div>This view is provided by your uploaded source files.</div>
      </div>
    </div>
  </main>
</div>`;
}
