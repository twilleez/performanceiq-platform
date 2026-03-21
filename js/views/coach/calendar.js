import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderCoachCalendar() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach', 'coach/calendar')}
  <main class="page-main">
    <div class="page-header">
      <h1>Calendar</h1>
      <p>${user?.name || ''} · Calendar</p>
    </div>
    <div class="panel">
      <div class="panel-title">Calendar</div>
      <div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13.5px">
        <div style="font-size:36px;margin-bottom:12px">🚧</div>
        <div style="font-weight:700;font-size:15px;color:var(--text-primary);margin-bottom:8px">Coming Soon</div>
        <div>This section is in development.</div>
      </div>
    </div>
  </main>
</div>`;
}
