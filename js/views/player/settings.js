import { buildSidebar }              from '../../components/nav.js';
import { getCurrentUser, updateUser } from '../../core/auth.js';
import { navigate, ROUTES }           from '../../router.js';
import { showToast }                  from '../../core/notifications.js';

export function renderPlayerSettings() {
  const user = getCurrentUser() || {};
  return `
<div class="view-with-sidebar">
  ${buildSidebar('player','player/settings')}
  <main class="page-main">
    <div class="page-header"><h1>Player <span>Settings</span></h1><p>Account and preferences</p></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:760px">
      <div class="panel">
        <div class="panel-title">Profile</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="b-field"><label>Full Name</label><input type="text" id="ps-name" value="${user.name||''}"></div>
          <div class="b-field"><label>Email</label><input type="email" id="ps-email" value="${user.email||''}"></div>
          <div class="b-field"><label>Sport</label>
            <select id="ps-sport">
              ${['basketball','football','soccer','baseball','volleyball','track'].map(s=>
                `<option value="${s}" ${user.sport===s?'selected':''}>${s[0].toUpperCase()+s.slice(1)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="b-field"><label>Position / Event</label><input type="text" id="ps-pos" value="${user.position||''}" placeholder="e.g. Point Guard"></div>
          <div class="b-field"><label>Grad Year</label><input type="number" id="ps-grad" value="${user.gradYear||''}" placeholder="2025" min="2024" max="2030"></div>
        </div>
        <button class="btn-primary" style="width:auto;padding:10px 24px;margin-top:18px" id="ps-save-btn">Save Changes</button>
        <p id="ps-saved" style="color:var(--piq-green-dark);font-size:13px;margin-top:8px;display:none">✓ Saved</p>
      </div>
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Appearance</div>
          <button class="btn-draft" style="width:100%;margin-bottom:8px" data-route="settings/theme">🎨 Theme Settings</button>
          <button class="btn-draft" style="width:100%" data-route="settings/profile">👤 Full Profile</button>
        </div>
        <div class="panel">
          <div class="panel-title">Account</div>
          <button class="btn-draft" style="width:100%;color:#ef4444;border-color:#ef4444" data-signout>Sign Out</button>
        </div>
      </div>
    </div>
  </main>
</div>`;
}

document.addEventListener('piq:viewRendered', () => {
  document.getElementById('ps-save-btn')?.addEventListener('click', () => {
    updateUser({
      name:     document.getElementById('ps-name')?.value.trim(),
      email:    document.getElementById('ps-email')?.value.trim(),
      sport:    document.getElementById('ps-sport')?.value,
      position: document.getElementById('ps-pos')?.value.trim(),
      gradYear: document.getElementById('ps-grad')?.value,
    });
    const el = document.getElementById('ps-saved');
    if (el) { el.style.display = 'block'; setTimeout(() => el.style.display = 'none', 2500); }
  });
});
