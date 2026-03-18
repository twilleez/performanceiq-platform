import { buildSidebar }              from '../../components/nav.js';
import { getCurrentUser, updateUser } from '../../core/auth.js';

export function renderSoloSettings() {
  const user = getCurrentUser() || {};
  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/settings')}
  <main class="page-main">
    <div class="page-header"><h1>Solo <span>Settings</span></h1></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:760px">
      <div class="panel">
        <div class="panel-title">Profile</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="b-field"><label>Full Name</label><input type="text" id="ss-name" value="${user.name||''}"></div>
          <div class="b-field"><label>Sport</label>
            <select id="ss-sport">
              ${['basketball','football','soccer','baseball','volleyball','track'].map(s=>`<option value="${s}" ${user.sport===s?'selected':''}>${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}
            </select>
          </div>
        </div>
        <button class="btn-primary" style="width:auto;padding:10px 24px;margin-top:18px" id="ss-save">Save</button>
        <p id="ss-ok" style="color:var(--piq-green-dark);font-size:13px;margin-top:8px;display:none">✓ Saved</p>
      </div>
      <div>
        <div class="panel" style="margin-bottom:12px"><div class="panel-title">App</div>
          <button class="btn-draft" style="width:100%;margin-bottom:8px" data-route="settings/theme">🎨 Theme</button>
          <button class="btn-draft" style="width:100%" data-route="solo/goals">🎯 Edit Goals</button>
        </div>
        <div class="panel"><div class="panel-title">Account</div>
          <button class="btn-draft" style="width:100%;color:#ef4444;border-color:#ef4444" data-signout>Sign Out</button>
        </div>
      </div>
    </div>
  </main>
</div>`;
}

document.addEventListener('piq:viewRendered', () => {
  document.getElementById('ss-save')?.addEventListener('click', () => {
    updateUser({ name:document.getElementById('ss-name')?.value.trim(), sport:document.getElementById('ss-sport')?.value });
    const el=document.getElementById('ss-ok'); if(el){el.style.display='block';setTimeout(()=>el.style.display='none',2500);}
  });
});
