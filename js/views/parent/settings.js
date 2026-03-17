/**
 * Parent Settings View
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderParentSettings() {
  const user = getCurrentUser();

  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/settings')}
  <main class="page-main">
    <div class="page-header">
      <h1>Settings</h1>
      <p>Manage your account and preferences</p>
    </div>
    <div class="panels-2">
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Profile</div>
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
            <div style="width:56px;height:56px;border-radius:50%;background:var(--piq-green);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#0d1b3e">
              ${(user?.name||'P').split(' ').map(w=>w[0]).slice(0,2).join('')}
            </div>
            <div>
              <div style="font-weight:700;font-size:15px;color:var(--text-primary)">${user?.name||'Parent'}</div>
              <div style="font-size:12.5px;color:var(--text-muted)">${user?.email||''} · Parent</div>
            </div>
          </div>
          <button class="btn-draft" style="font-size:13px;padding:10px 18px;width:100%" data-route="settings/profile">Edit Profile</button>
        </div>
        <div class="panel">
          <div class="panel-title">Appearance</div>
          <button class="btn-draft" style="font-size:13px;padding:10px 18px;width:100%;margin-top:8px" data-route="settings/theme">Theme Settings</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Notification Preferences</div>
        ${[
          ['Readiness alerts for my athlete', true],
          ['Coach messages', true],
          ['Weekly progress summary', true],
          ['Game and practice reminders', true],
          ['Billing notifications', true],
        ].map(([label, on]) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:13px;color:var(--text-primary)">${label}</span>
          <div style="width:40px;height:22px;border-radius:11px;background:${on?'var(--piq-green)':'var(--surface-2)'};position:relative;cursor:pointer">
            <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:2px;${on?'right:2px':'left:2px'}"></div>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </main>
</div>`;
}
