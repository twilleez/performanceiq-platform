import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderSoloSubscription() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo', 'solo/subscription')}
  <main class="page-main">
    <div class="page-header">
      <h1>Subscription</h1>
      <p>${user?.name || ''} — Subscription</p>
    </div>
    <div class="panel">
      <div class="panel-title">Subscription</div>
      <div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13.5px">
        <div style="font-size:36px;margin-bottom:12px">⚡</div>
        <div style="font-weight:700;font-size:15px;color:var(--text-primary);margin-bottom:8px">Subscription</div>
        <div>This view is provided by your uploaded source files.</div>
      </div>
    </div>
  </main>
</div>`;
}
