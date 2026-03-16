import { getCurrentUser, updateUser } from '../../core/auth.js';
import { getCurrentRole }             from '../../core/auth.js';
import { buildSidebar }               from '../../components/nav.js';

export function renderSettingsProfile() {
  const user = getCurrentUser() || {};
  const role = getCurrentRole() || 'solo';
  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role + '/settings')}
  <main class="page-main">
    <div class="page-header">
      <h1>Settings — <span>Profile</span></h1>
      <p>Update your account information.</p>
    </div>
    <div class="panel" style="max-width:460px">
      <div class="panel-title">Account Details</div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="b-field">
          <label>Full Name</label>
          <input type="text" id="prof-name" value="${user.name || ''}" placeholder="Full name">
        </div>
        <div class="b-field">
          <label>Email</label>
          <input type="email" id="prof-email" value="${user.email || ''}" placeholder="Email">
        </div>
        <div class="b-field">
          <label>Sport</label>
          <select id="prof-sport">
            ${['basketball','football','soccer','baseball','volleyball','track'].map(s =>
              `<option value="${s}" ${user.sport===s?'selected':''}>${s[0].toUpperCase()+s.slice(1)}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn-primary" style="width:auto;padding:11px 24px" id="save-profile-btn">Save Changes</button>
        <button class="btn-draft" style="padding:11px 22px" data-signout>Sign Out</button>
      </div>
      <p id="prof-saved" style="color:var(--piq-green-dark);font-size:13px;margin-top:10px;display:none">✓ Profile saved</p>
    </div>
  </main>
</div>`;
}

document.addEventListener('piq:viewRendered', () => {
  document.getElementById('save-profile-btn')?.addEventListener('click', () => {
    updateUser({
      name:  document.getElementById('prof-name')?.value.trim(),
      email: document.getElementById('prof-email')?.value.trim(),
      sport: document.getElementById('prof-sport')?.value,
    });
    const msg = document.getElementById('prof-saved');
    if (msg) { msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 2500); }
  });
});
