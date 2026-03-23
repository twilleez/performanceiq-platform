/**
 * PerformanceIQ — Settings Profile
 * FIXED: piq:viewRendered listener now guards on route 'settings/profile'
 *        so buttons don't fire on every view change across the app.
 */
import { buildSidebar }                              from '../../components/nav.js';
import { getCurrentUser, getCurrentRole, updateUser } from '../../core/auth.js';
import { getAthleteProfile, patchProfile }           from '../../state/state.js';
import { showToast }                                 from '../../core/notifications.js';

export function renderSettingsProfile() {
  const user    = getCurrentUser() || {};
  const role    = getCurrentRole() || 'solo';
  const profile = getAthleteProfile();
  const sports  = ['basketball','football','soccer','baseball','volleyball','track','swimming','wrestling','lacrosse','other'];

  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, 'settings/profile')}
  <main class="page-main">
    <div class="page-header">
      <h1>Profile <span>Settings</span></h1>
      <p>Keep your profile complete for accurate PIQ Scores and personalised programming.</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:800px">

      <div class="panel">
        <div class="panel-title">Account</div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:12px">
          <div class="b-field">
            <label>Full Name</label>
            <input type="text" id="sp-name" value="${user.name || ''}" placeholder="Your full name">
          </div>
          <div class="b-field">
            <label>Email</label>
            <input type="email" id="sp-email" value="${user.email || ''}" placeholder="your@email.com" readonly
              style="opacity:.6;cursor:not-allowed">
          </div>
        </div>
        <button class="btn-primary" style="width:100%;margin-top:18px;font-size:13px;padding:11px" id="sp-save">
          Save Account
        </button>
      </div>

      <div class="panel">
        <div class="panel-title">Athletic Profile</div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:12px">
          <div class="b-field">
            <label>Sport</label>
            <select id="sp-sport">
              ${sports.map(s => `<option value="${s}" ${profile.sport === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
            </select>
          </div>
          <div class="b-field">
            <label>Position</label>
            <input type="text" id="sp-pos" value="${profile.position || ''}" placeholder="e.g. Point Guard">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="b-field">
              <label>Age</label>
              <input type="number" id="sp-age" value="${profile.age || ''}" placeholder="17" min="10" max="50">
            </div>
            <div class="b-field">
              <label>Weight (lbs)</label>
              <input type="number" id="sp-weight" value="${profile.weightLbs || ''}" placeholder="170" min="80" max="400">
            </div>
          </div>
          <div class="b-field">
            <label>Team</label>
            <input type="text" id="sp-team" value="${profile.team || ''}" placeholder="e.g. Riverside High">
          </div>
          <div class="b-field">
            <label>Training Days / Week</label>
            <select id="sp-days">
              ${[2,3,4,5,6].map(d => `<option value="${d}" ${profile.daysPerWeek == d ? 'selected' : ''}>${d} days</option>`).join('')}
            </select>
          </div>
        </div>
        <button class="btn-primary" style="width:100%;margin-top:18px;font-size:13px;padding:11px" id="sp-save-profile">
          Save Profile
        </button>
      </div>

    </div>
  </main>
</div>`;
}

document.addEventListener('piq:viewRendered', e => {
  // ── Route guard — only wire on this view ──────────────────
  if (e.detail?.route !== 'settings/profile') return;

  document.getElementById('sp-save')?.addEventListener('click', () => {
    const name = document.getElementById('sp-name')?.value?.trim();
    if (!name) { showToast('Name cannot be empty.', 'error'); return; }
    updateUser({ name });
    showToast('✅ Account saved', 'success');
  });

  document.getElementById('sp-save-profile')?.addEventListener('click', () => {
    patchProfile({
      sport:       document.getElementById('sp-sport')?.value,
      position:    document.getElementById('sp-pos')?.value?.trim(),
      age:         document.getElementById('sp-age')?.value,
      weightLbs:   document.getElementById('sp-weight')?.value,
      team:        document.getElementById('sp-team')?.value?.trim(),
      daysPerWeek: parseInt(document.getElementById('sp-days')?.value) || 4,
    });
    showToast('✅ Profile saved', 'success');
  });
});
