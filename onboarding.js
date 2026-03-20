/**
 * Multi-step onboarding wizard — role-aware, 3 steps
 */
import { navigate, ROLE_HOME, ROUTES } from '../../router.js';
import { getCurrentUser, markOnboardingDone, setRole } from '../../core/auth.js';
import { patchProfile }                               from '../../state/state.js';

export function renderOnboarding() {
  const user = getCurrentUser();
  const role = user?.role || 'solo';
  const name = user?.name?.split(' ')[0] || 'Athlete';

  return `
<div class="auth-card" style="margin-top:0;max-width:460px;width:100%">
  <div class="onboard-steps">
    <div class="onboard-dot active" id="od1"></div>
    <div class="onboard-dot" id="od2"></div>
    <div class="onboard-dot" id="od3"></div>
  </div>

  <!-- Step 1 -->
  <div id="ob-s1">
    <h2 style="margin-top:16px">Welcome, ${name}!</h2>
    <p class="sub" style="font-size:13px;color:var(--g400);margin:6px 0 20px">
      Let's set up your profile in 3 quick steps.
    </p>
    <div class="onboard-field">
      <label>Your Name</label>
      <input type="text" id="ob-name" value="${user?.name || ''}" placeholder="Full name">
    </div>
    <div class="onboard-field">
      <label>I am a…</label>
      <select id="ob-role">
        <option value="coach"  ${role==='coach'  ?'selected':''}>Coach</option>
        <option value="player" ${role==='player' ?'selected':''}>Player / Athlete</option>
        <option value="parent" ${role==='parent' ?'selected':''}>Parent</option>
        <option value="solo"   ${role==='solo'   ?'selected':''}>Solo Athlete</option>
        <option value="admin"  ${role==='admin'  ?'selected':''}>Admin</option>
      </select>
    </div>
    <div class="onboard-nav">
      <div></div>
      <button class="onboard-next" id="ob-next1">Next →</button>
    </div>
  </div>

  <!-- Step 2 -->
  <div id="ob-s2" style="display:none">
    <h2 style="margin-top:16px" id="ob-s2-title">Your Sport & Team</h2>
    <p style="font-size:13px;color:var(--g400);margin:6px 0 20px" id="ob-s2-sub">
      Tell us what you're training for.
    </p>
    <div id="ob-s2-athlete">
      <div class="onboard-field">
        <label>Primary Sport</label>
        <select id="ob-sport">
          <option value="basketball">🏀 Basketball</option>
          <option value="football">🏈 Football</option>
          <option value="soccer">⚽ Soccer</option>
          <option value="baseball">⚾ Baseball</option>
          <option value="volleyball">🏐 Volleyball</option>
          <option value="track">🏃 Track & Field</option>
        </select>
      </div>
      <div class="onboard-field">
        <label>Level</label>
        <select id="ob-level">
          <option value="youth">Youth</option>
          <option value="middle_school">Middle School</option>
          <option value="high_school" selected>High School</option>
          <option value="collegiate">Collegiate</option>
          <option value="professional">Professional</option>
        </select>
      </div>
      <div class="onboard-field">
        <label>Team / School <span style="font-weight:400;color:var(--g400)">(optional)</span></label>
        <input type="text" id="ob-team" placeholder="e.g. Lincoln High Basketball">
      </div>
    </div>
    <div id="ob-s2-coach" style="display:none">
      <div class="onboard-field">
        <label>Team Name</label>
        <input type="text" id="ob-coach-team" placeholder="e.g. Westside Elite 17U">
      </div>
      <div class="onboard-field">
        <label>Primary Sport</label>
        <select id="ob-coach-sport">
          <option value="basketball">🏀 Basketball</option>
          <option value="football">🏈 Football</option>
          <option value="soccer">⚽ Soccer</option>
          <option value="baseball">⚾ Baseball</option>
          <option value="volleyball">🏐 Volleyball</option>
          <option value="track">🏃 Track & Field</option>
        </select>
      </div>
    </div>
    <div class="onboard-nav">
      <button class="onboard-back" id="ob-back2">← Back</button>
      <button class="onboard-next" id="ob-next2">Next →</button>
    </div>
  </div>

  <!-- Step 3 -->
  <div id="ob-s3" style="display:none">
    <h2 style="margin-top:16px">Your Goals</h2>
    <p style="font-size:13px;color:var(--g400);margin:6px 0 16px">Select all that apply.</p>
    <div class="onboard-goals" id="ob-goals">
      <button class="onboard-goal" data-g="strength">💪 Strength</button>
      <button class="onboard-goal" data-g="speed">⚡ Speed</button>
      <button class="onboard-goal" data-g="endurance">🏃 Endurance</button>
      <button class="onboard-goal" data-g="flexibility">🧘 Flexibility</button>
      <button class="onboard-goal" data-g="conditioning">🔥 Conditioning</button>
      <button class="onboard-goal" data-g="recovery">💚 Recovery</button>
      <button class="onboard-goal" data-g="vertical">⬆️ Vertical Jump</button>
      <button class="onboard-goal" data-g="recruiting">🎓 Recruiting</button>
    </div>
    <div class="onboard-nav" style="margin-top:24px">
      <button class="onboard-back" id="ob-back3">← Back</button>
      <button class="onboard-next" id="ob-finish">Let's Go 🚀</button>
    </div>
  </div>
</div>`;
}

document.addEventListener('piq:authRendered', wireOnboarding);

function setDot(n) {
  for (let i = 1; i <= 3; i++) {
    const d = document.getElementById('od' + i);
    if (!d) return;
    d.className = 'onboard-dot' +
      (i < n ? ' done' : i === n ? ' active' : '');
  }
}

function wireOnboarding() {
  if (!document.getElementById('ob-s1')) return;
  let goals = [];

  // Step 1 → 2
  document.getElementById('ob-next1')?.addEventListener('click', () => {
    const role    = document.getElementById('ob-role')?.value || 'solo';
    const isCoach = role === 'coach';
    document.getElementById('ob-s2-athlete').style.display = isCoach ? 'none' : 'block';
    document.getElementById('ob-s2-coach').style.display   = isCoach ? 'block' : 'none';
    if (isCoach) {
      document.getElementById('ob-s2-title').textContent = 'Your Team';
      document.getElementById('ob-s2-sub').textContent   = 'Tell us about your team.';
    }
    document.getElementById('ob-s1').style.display = 'none';
    document.getElementById('ob-s2').style.display = 'block';
    setDot(2);
  });

  document.getElementById('ob-back2')?.addEventListener('click', () => {
    document.getElementById('ob-s2').style.display = 'none';
    document.getElementById('ob-s1').style.display = 'block';
    setDot(1);
  });

  // Step 2 → 3
  document.getElementById('ob-next2')?.addEventListener('click', () => {
    document.getElementById('ob-s2').style.display = 'none';
    document.getElementById('ob-s3').style.display = 'block';
    setDot(3);
  });

  document.getElementById('ob-back3')?.addEventListener('click', () => {
    document.getElementById('ob-s3').style.display = 'none';
    document.getElementById('ob-s2').style.display = 'block';
    setDot(2);
  });

  // Goal chips
  document.querySelectorAll('.onboard-goal').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('sel');
      const g = btn.dataset.g;
      if (btn.classList.contains('sel')) { if (!goals.includes(g)) goals.push(g); }
      else goals = goals.filter(x => x !== g);
    });
  });

  // Finish
  document.getElementById('ob-finish')?.addEventListener('click', () => {
    const role  = document.getElementById('ob-role')?.value    || 'solo';
    const sport = document.getElementById('ob-sport')?.value
               || document.getElementById('ob-coach-sport')?.value
               || 'basketball';
    const team  = document.getElementById('ob-team')?.value
               || document.getElementById('ob-coach-team')?.value || '';

    setRole(role);
    markOnboardingDone({ sport, team, goals, role });
    patchProfile({ sport, team, goals });
    navigate(ROLE_HOME[role]);
  });
}
