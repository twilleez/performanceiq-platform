import { buildSidebar }              from '../../components/nav.js';
import { getCurrentUser, updateUser } from '../../core/auth.js';
import { navigate }                   from '../../router.js';
import { showToast }                  from '../../core/notifications.js';

export function renderCoachSettings() {
  const user = getCurrentUser() || {};
  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/settings')}
  <main class="page-main">
    <div class="page-header"><h1>Coach <span>Settings</span></h1><p>Account and preferences</p></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:760px">
      <div class="panel">
        <div class="panel-title">Profile</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="b-field"><label>Full Name</label><input type="text" id="cs-name" value="${user.name||''}"></div>
          <div class="b-field"><label>Email</label><input type="email" id="cs-email" value="${user.email||''}"></div>
          <div class="b-field"><label>Primary Sport</label>
            <select id="cs-sport">
              ${['basketball','football','soccer','baseball','volleyball','track'].map(s=>
                `<option value="${s}" ${user.sport===s?'selected':''}>${s[0].toUpperCase()+s.slice(1)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="b-field"><label>Team Name</label><input type="text" id="cs-team" value="${user.team||''}" placeholder="e.g. Lincoln High Varsity"></div>
        </div>
        <button class="btn-primary" style="width:auto;padding:10px 24px;margin-top:18px" id="cs-save-btn">Save Changes</button>
        <p id="cs-saved" style="color:var(--piq-green-dark);font-size:13px;margin-top:8px;display:none">✓ Saved</p>
      </div>
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">App Settings</div>
          <button class="btn-draft" style="width:100%;margin-bottom:8px" data-route="settings/theme">🎨 Theme Settings</button>
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
  document.getElementById('cs-save-btn')?.addEventListener('click', () => {
    updateUser({ name:document.getElementById('cs-name')?.value.trim(), email:document.getElementById('cs-email')?.value.trim(), sport:document.getElementById('cs-sport')?.value, team:document.getElementById('cs-team')?.value.trim() });
    const el=document.getElementById('cs-saved');
    if(el){el.style.display='block';setTimeout(()=>el.style.display='none',2500);}
  });
});
