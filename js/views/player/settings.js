/**
 * Player Settings View
 * Profile editing, training preferences, and account information.
 */
import { buildSidebar }           from '../../components/nav.js';
import { getCurrentUser,
         getCurrentRole,
         updateUser }             from '../../core/auth.js';
import { getAthleteProfile,
         patchProfile }           from '../../state/state.js';

export function renderPlayerSettings() {
  const user    = getCurrentUser() || {};
  const role    = getCurrentRole() || 'player';
  const profile = getAthleteProfile();

  const SPORTS = ['basketball','football','soccer','baseball','volleyball','track'];
  const LEVELS = [
    { value: 'beginner',     label: 'Beginner — New to structured training' },
    { value: 'intermediate', label: 'Intermediate — 1–3 years consistent' },
    { value: 'advanced',     label: 'Advanced — 3+ years, competitive' },
    { value: 'elite',        label: 'Elite — Collegiate / Professional' },
  ];
  const PHASES = [
    { value: 'off-season',  label: 'Off-Season — Build base fitness' },
    { value: 'pre-season',  label: 'Pre-Season — Sport-specific preparation' },
    { value: 'in-season',   label: 'In-Season — Maintain and protect' },
    { value: 'post-season', label: 'Post-Season — Recovery and deload' },
  ];
  const POSITIONS = {
    basketball: ['Point Guard','Shooting Guard','Small Forward','Power Forward','Center'],
    football:   ['QB','RB','WR','TE','OL','DL','LB','CB','S','K/P'],
    soccer:     ['Goalkeeper','Defender','Midfielder','Forward','Winger'],
    baseball:   ['Pitcher','Catcher','1B','2B','3B','SS','LF','CF','RF','DH'],
    volleyball: ['Setter','Outside Hitter','Middle Blocker','Opposite','Libero'],
    track:      ['Sprinter','Middle Distance','Long Distance','Jumper','Thrower','Hurdler'],
  };
  const positions = POSITIONS[profile.sport || 'basketball'] || POSITIONS.basketball;

  const sport     = profile.sport         || 'basketball';
  const level     = profile.trainingLevel || 'intermediate';
  const phase     = profile.compPhase     || 'in-season';
  const daysPerWk = profile.daysPerWeek   || 4;

  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role + '/settings')}
  <main class="page-main">

    <div class="page-header">
      <h1>Settings</h1>
      <p>Profile, training preferences, and account</p>
    </div>

    <div class="panels-2">

      <!-- ── LEFT: Profile + Athlete Info ─────────────────────── -->
      <div>

        <!-- Account -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Account</div>
          <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px">
            <div class="b-field">
              <label>Display Name</label>
              <input type="text" id="set-name" value="${user.name || ''}" placeholder="Your name">
            </div>
            <div class="b-field">
              <label>Email</label>
              <input type="email" id="set-email" value="${user.email || ''}" placeholder="your@email.com" disabled
                style="opacity:0.6;cursor:not-allowed">
            </div>
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:1px solid var(--border);font-size:13px">
              <span style="color:var(--text-muted)">Role</span>
              <span style="font-weight:600;color:var(--text-primary);text-transform:capitalize">${role}</span>
            </div>
            <button class="btn-primary" style="font-size:12.5px;padding:10px 16px" id="save-account-btn">Save Account</button>
            <p id="account-saved" style="color:var(--piq-green-dark);font-size:12.5px;display:none">Account updated.</p>
          </div>
        </div>

        <!-- Athlete Profile -->
        <div class="panel">
          <div class="panel-title">Athlete Profile</div>
          <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div class="b-field">
                <label>Sport</label>
                <select id="set-sport">
                  ${SPORTS.map(s => `<option value="${s}" ${sport===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
                </select>
              </div>
              <div class="b-field">
                <label>Position</label>
                <select id="set-position">
                  <option value="">Select position</option>
                  ${positions.map(p => `<option value="${p}" ${profile.position===p?'selected':''}>${p}</option>`).join('')}
                </select>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div class="b-field">
                <label>Age</label>
                <input type="number" id="set-age" value="${profile.age||''}" placeholder="17" min="12" max="30">
              </div>
              <div class="b-field">
                <label>Grad Year</label>
                <input type="number" id="set-gradyear" value="${profile.gradYear||''}" placeholder="${new Date().getFullYear()+1}" min="2024" max="2035">
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
              <div class="b-field">
                <label>Height (ft)</label>
                <input type="number" id="set-height-ft" value="${profile.heightFt||''}" placeholder="6" min="4" max="8">
              </div>
              <div class="b-field">
                <label>Height (in)</label>
                <input type="number" id="set-height-in" value="${profile.heightIn||''}" placeholder="2" min="0" max="11">
              </div>
              <div class="b-field">
                <label>Weight (lbs)</label>
                <input type="number" id="set-weight" value="${profile.weightLbs||''}" placeholder="185" min="80" max="400">
              </div>
            </div>
            <div class="b-field">
              <label>Team / School</label>
              <input type="text" id="set-team" value="${profile.team||''}" placeholder="e.g. Lincoln High Varsity">
            </div>
            <div class="b-field">
              <label>Injury History</label>
              <input type="text" id="set-injuries" value="${profile.injuryHistory && profile.injuryHistory !== 'none' ? profile.injuryHistory : ''}"
                placeholder="e.g. left knee — or leave blank">
            </div>
          </div>
        </div>

      </div>

      <!-- ── RIGHT: Training Preferences ──────────────────────── -->
      <div>

        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Training Preferences</div>
          <div style="margin-top:14px;display:flex;flex-direction:column;gap:12px">

            <div class="b-field">
              <label>Training Level</label>
              <select id="set-level">
                ${LEVELS.map(l => `<option value="${l.value}" ${level===l.value?'selected':''}>${l.label}</option>`).join('')}
              </select>
            </div>

            <div class="b-field">
              <label>Competition Phase</label>
              <select id="set-phase">
                ${PHASES.map(p => `<option value="${p.value}" ${phase===p.value?'selected':''}>${p.label}</option>`).join('')}
              </select>
            </div>

            <div class="b-field">
              <label>Training Days Per Week</label>
              <div style="display:flex;gap:8px;margin-top:4px">
                ${[2,3,4,5,6].map(d => `
                <button type="button" class="days-btn" data-days="${d}"
                  style="flex:1;padding:8px;border-radius:8px;
                         border:1px solid ${daysPerWk==d?'var(--piq-green)':'var(--border)'};
                         background:${daysPerWk==d?'var(--piq-green)':'var(--surface-2)'};
                         color:${daysPerWk==d?'#0d1b3e':'var(--text-primary)'};
                         font-size:13px;font-weight:${daysPerWk==d?'700':'400'};cursor:pointer">
                  ${d}
                </button>`).join('')}
              </div>
            </div>

            <div class="b-field">
              <label>Average Sleep Hours</label>
              <input type="number" id="set-sleep" value="${profile.sleepHours||7}" min="4" max="12" step="0.5">
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Target 8–9h for competitive athletes (Halson, Sports Med 2014)</div>
            </div>

            <div class="b-field">
              <label>Primary Training Goal</label>
              <select id="set-goal">
                <option value="">Select goal</option>
                ${['Strength','Speed','Power','Endurance','Agility','Skill Development','Recruiting Exposure','Weight Loss','Muscle Gain'].map(g =>
                  `<option value="${g}" ${profile.primaryGoal===g?'selected':''}>${g}</option>`
                ).join('')}
              </select>
            </div>

          </div>
          <button class="btn-primary" style="width:100%;margin-top:16px" id="save-prefs-btn">Save Preferences</button>
          <p id="prefs-saved" style="color:var(--piq-green-dark);font-size:12.5px;margin-top:8px;display:none">
            Preferences saved. Nutrition targets and workout recommendations have been updated.
          </p>
        </div>

        <!-- Theme / App -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">App</div>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:13px;color:var(--text-primary)">Theme</span>
              <button class="btn-draft" style="font-size:12px;padding:6px 14px" data-route="settings/theme">Change Theme</button>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:13px;color:var(--text-primary)">Recruiting Profile</span>
              <button class="btn-draft" style="font-size:12px;padding:6px 14px" data-route="player/recruiting">Edit Profile</button>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0">
              <span style="font-size:13px;color:var(--text-primary)">Sign Out</span>
              <button class="btn-draft" style="font-size:12px;padding:6px 14px;color:#ef4444;border-color:#ef444440" data-signout>Sign Out</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </main>
</div>`;
}

// ── WIRE INTERACTIONS ─────────────────────────────────────────────────────────
document.addEventListener('piq:viewRendered', () => {
  if (!document.getElementById('save-prefs-btn')) return;

  // Days per week toggle
  let selectedDays = getAthleteProfile().daysPerWeek || 4;
  document.querySelectorAll('.days-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedDays = parseInt(btn.dataset.days);
      document.querySelectorAll('.days-btn').forEach(b => {
        const sel = parseInt(b.dataset.days) === selectedDays;
        b.style.background  = sel ? 'var(--piq-green)' : 'var(--surface-2)';
        b.style.color       = sel ? '#0d1b3e' : 'var(--text-primary)';
        b.style.fontWeight  = sel ? '700' : '400';
        b.style.borderColor = sel ? 'var(--piq-green)' : 'var(--border)';
      });
    });
  });

  // Save training preferences
  document.getElementById('save-prefs-btn')?.addEventListener('click', () => {
    patchProfile({
      sport:         document.getElementById('set-sport')?.value    || undefined,
      position:      document.getElementById('set-position')?.value || undefined,
      age:           document.getElementById('set-age')?.value      || undefined,
      gradYear:      document.getElementById('set-gradyear')?.value || undefined,
      heightFt:      parseInt(document.getElementById('set-height-ft')?.value) || undefined,
      heightIn:      parseInt(document.getElementById('set-height-in')?.value) || 0,
      weightLbs:     document.getElementById('set-weight')?.value   || undefined,
      team:          document.getElementById('set-team')?.value     || undefined,
      injuryHistory: document.getElementById('set-injuries')?.value || 'none',
      trainingLevel: document.getElementById('set-level')?.value    || 'intermediate',
      compPhase:     document.getElementById('set-phase')?.value    || 'in-season',
      daysPerWeek:   selectedDays,
      sleepHours:    parseFloat(document.getElementById('set-sleep')?.value) || 7,
      primaryGoal:   document.getElementById('set-goal')?.value     || undefined,
    });
    const msg = document.getElementById('prefs-saved');
    const btn = document.getElementById('save-prefs-btn');
    if (msg) msg.style.display = 'block';
    if (btn) { btn.textContent = 'Saved ✓'; btn.disabled = true; }
    setTimeout(() => {
      if (msg) msg.style.display = 'none';
      if (btn) { btn.textContent = 'Save Preferences'; btn.disabled = false; }
    }, 2500);
  });

  // Save account
  document.getElementById('save-account-btn')?.addEventListener('click', () => {
    const name = document.getElementById('set-name')?.value?.trim();
    if (name) updateUser({ name });
    const msg = document.getElementById('account-saved');
    const btn = document.getElementById('save-account-btn');
    if (msg) msg.style.display = 'block';
    if (btn) { btn.textContent = 'Saved ✓'; btn.disabled = true; }
    setTimeout(() => {
      if (msg) msg.style.display = 'none';
      if (btn) { btn.textContent = 'Save Account'; btn.disabled = false; }
    }, 2500);
  });
});
