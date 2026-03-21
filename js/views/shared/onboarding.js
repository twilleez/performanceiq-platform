import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderOnboarding() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('shared', 'onboarding')}
  <main class="page-main">
    <div class="page-header">
      <h1>Onboarding</h1>
      <p>${user?.name || ''} — Onboarding</p>
    </div>
    <div class="panel">
      <div class="panel-title">Onboarding</div>
      <div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13.5px">
        <div style="font-size:36px;margin-bottom:12px">⚡</div>
        <div style="font-weight:700;font-size:15px;color:var(--text-primary);margin-bottom:8px">Onboarding</div>
        <div>This view is provided by your uploaded source files.</div>
      </div>
    </div>
  </main>
</div>`;
}
