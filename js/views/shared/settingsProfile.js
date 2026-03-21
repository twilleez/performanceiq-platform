import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderSettingsProfile() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('shared', 'settings/profile')}
  <main class="page-main">
    <div class="page-header">
      <h1>Profile Settings</h1>
      <p>${user?.name || ''} — Profile Settings</p>
    </div>
    <div class="panel">
      <div class="panel-title">Profile Settings</div>
      <div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13.5px">
        <div style="font-size:36px;margin-bottom:12px">⚡</div>
        <div style="font-weight:700;font-size:15px;color:var(--text-primary);margin-bottom:8px">Profile Settings</div>
        <div>This view is provided by your uploaded source files.</div>
      </div>
    </div>
  </main>
</div>`;
}
