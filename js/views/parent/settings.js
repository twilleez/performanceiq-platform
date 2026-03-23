import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { getState, setState, getRoster } from '../../state/state.js';
import { navigate } from '../../router.js';
import { showToast } from '../../core/notifications.js';
export function renderParentSettings() {
  const user = getCurrentUser();
  const initials = (user?.name||'P').split(' ').map(w=>w[0]).slice(0,2).join('');
  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/settings')}
  <main class="page-main">
    <div class="page-header"><h1>Settings</h1><p>Manage your account and preferences</p></div>
    <div class="panels-2">
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Profile</div>
          <div style="display:flex;align-items:center;gap:14px;margin:14px 0">
            <div style="width:56px;height:56px;border-radius:50%;background:#f59e0b;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#0d1b3e">${initials}</div>
            <div><div style="font-weight:700;font-size:15px;color:var(--text-primary)">${user?.name||'Parent'}</div><div style="font-size:12.5px;color:var(--text-muted)">${user?.email||''} · Parent</div></div>
          </div>
          <button class="btn-draft" style="width:100%;font-size:13px;padding:10px" data-route="settings/profile">Edit Profile</button>
        </div>
        <div class="panel"><div class="panel-title">Appearance</div>
          <button class="btn-draft" style="width:100%;font-size:13px;padding:10px;margin-top:10px" data-route="settings/theme">Theme Settings</button>
        </div>
      </div>

        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Linked Athlete</div>
          ${(() => {
            const linked = getState().linkedAthlete;
            const roster = getRoster();
            const athlete = roster.find(a => a.id === linked) || roster[0];
            return athlete ? \`
            <div style="display:flex;align-items:center;gap:10px;margin:12px 0">
              <div style="width:38px;height:38px;border-radius:50%;background:var(--piq-green);
                          display:flex;align-items:center;justify-content:center;
                          font-weight:700;color:#0d1b3e;font-size:14px;flex-shrink:0">
                \${(athlete.name||'A').charAt(0)}
              </div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:14px;color:var(--text-primary)">\${athlete.name}</div>
                <div style="font-size:12px;color:var(--text-muted)">\${athlete.position||''} · PIQ \${athlete.piq}</div>
              </div>
            </div>
            <button class="btn-draft" id="parent-relink-btn" style="width:100%;font-size:12.5px;padding:9px">
              Link a different athlete
            </button>
            <div id="parent-athlete-list" style="display:none;margin-top:10px"></div>
            \` : '<div style="color:var(--text-muted);font-size:12.5px;padding:10px 0">No athlete linked yet.</div>';
          })()}
        </div>
      <div class="panel"><div class="panel-title">Notification Preferences</div>
        ${[['Readiness alerts for my athlete',true],['Coach messages',true],['Weekly progress summary',true],['Game and practice reminders',true],['Billing notifications',true]].map(([l,on])=>`
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:13px;color:var(--text-primary)">${l}</span>
          <div style="width:40px;height:22px;border-radius:11px;background:${on?'#f59e0b':'var(--surface-2)'};position:relative">
            <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:2px;${on?'right:2px':'left:2px'}"></div>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </main>
</div>`;
}

document.addEventListener('piq:viewRendered', e => {
  if (e.detail?.route !== 'parent/settings') return;

  const btn = document.getElementById('parent-relink-btn');
  if (!btn || btn.dataset.wired) return;
  btn.dataset.wired = '1';

  btn.addEventListener('click', () => {
    const roster = getRoster();
    const linked = getState().linkedAthlete;
    const list   = document.getElementById('parent-athlete-list');
    if (!list) return;

    list.innerHTML = roster.map(a => `
    <div class="parent-ath" data-id="${a.id}"
      style="display:flex;align-items:center;gap:10px;padding:9px;border-radius:9px;cursor:pointer;
             border:2px solid ${linked===a.id?'var(--piq-green)':'var(--border)'};
             background:${linked===a.id?'rgba(34,201,85,.06)':'var(--surface-2)'};margin-bottom:6px">
      <div style="width:32px;height:32px;border-radius:50%;background:var(--piq-green);
                  display:flex;align-items:center;justify-content:center;
                  font-weight:700;color:#0d1b3e;font-size:13px;flex-shrink:0">
        ${(a.name||'A').charAt(0)}
      </div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${a.name}</div>
        <div style="font-size:11.5px;color:var(--text-muted)">${a.position||''} · PIQ ${a.piq}</div>
      </div>
      ${linked===a.id?'<span style="font-size:11px;color:var(--piq-green);font-weight:700">Linked</span>':''}
    </div>`).join('');
    list.style.display = 'block';

    list.querySelectorAll('.parent-ath').forEach(el => {
      el.addEventListener('click', () => {
        setState({ linkedAthlete: parseInt(el.dataset.id) });
        showToast('✅ Athlete linked!', 'success');
        navigate('parent/settings');
      });
    });
  });
});