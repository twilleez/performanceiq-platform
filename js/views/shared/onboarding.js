import { navigate, ROLE_HOME, ROUTES } from '../../router.js';
import { getCurrentUser, getCurrentRole, markOnboardingDone, setRole } from '../../core/auth.js';
import { patchProfile, setState, getRoster } from '../../state/state.js';

const SPORTS = [
  {id:'basketball',emoji:'🏀',label:'Basketball'},
  {id:'football',  emoji:'🏈',label:'Football'},
  {id:'soccer',    emoji:'⚽',label:'Soccer'},
  {id:'baseball',  emoji:'⚾',label:'Baseball'},
  {id:'volleyball',emoji:'🏐',label:'Volleyball'},
  {id:'track',     emoji:'🏃',label:'Track & Field'},
];

export function renderOnboarding() {
  const user = getCurrentUser();
  const existingRole = getCurrentRole();
  return `
<div class="auth-card" style="margin-top:0;max-width:520px;width:100%">
  <h2>Let's set up your profile</h2>
  <p style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:20px;line-height:1.5">Quick setup for personalized programming and an accurate PIQ Score.</p>

  <div id="ob-step1">
    <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.5);letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">Your Role</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px" id="ob-role-grid">
      ${[{id:'player',icon:'🏅',label:'Player / Athlete'},{id:'solo',icon:'⚡',label:'Solo Athlete'},{id:'coach',icon:'📋',label:'Coach'},{id:'parent',icon:'👥',label:'Parent'}].map(r=>`
      <div class="ob-role-card ${existingRole===r.id?'sel':''}" data-role="${r.id}"
        style="border:2px solid ${existingRole===r.id?'var(--piq-green)':'rgba(255,255,255,.15)'};border-radius:10px;padding:12px;cursor:pointer;background:${existingRole===r.id?'rgba(34,201,85,.1)':'transparent'};transition:all .15s">
        <div style="font-size:20px;margin-bottom:4px">${r.icon}</div>
        <div style="font-size:12.5px;font-weight:600;color:#fff">${r.label}</div>
      </div>`).join('')}
    </div>

    <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.5);letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">Your Sport</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px" id="ob-sport-grid">
      ${SPORTS.map((s,i)=>`
      <div class="ob-sport-card ${i===0?'sel':''}" data-sport="${s.id}"
        style="border:2px solid ${i===0?'var(--piq-green)':'rgba(255,255,255,.15)'};border-radius:10px;padding:10px;cursor:pointer;text-align:center;background:${i===0?'rgba(34,201,85,.1)':'transparent'};transition:all .15s">
        <div style="font-size:22px;margin-bottom:4px">${s.emoji}</div>
        <div style="font-size:11.5px;font-weight:600;color:#fff">${s.label}</div>
      </div>`).join('')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      <div class="input-wrap"><input type="text" id="ob-team" placeholder="Team name (optional)"></div>
      <div class="input-wrap"><input type="number" id="ob-age" placeholder="Age" min="10" max="50"></div>
    </div>

    <button class="btn-primary" id="ob-finish" style="width:100%;font-size:14px;padding:14px">Get Started →</button>
  </div>
</div>
<style>
.ob-role-card:hover,.ob-sport-card:hover{border-color:rgba(34,201,85,.5)!important}
.ob-role-card.sel,.ob-sport-card.sel{border-color:var(--piq-green)!important;background:rgba(34,201,85,.1)!important}
</style>`;
}

document.addEventListener('piq:authRendered', () => {
  let selectedRole = getCurrentRole()||'player';
  let selectedSport = 'basketball';

  document.querySelectorAll('.ob-role-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.ob-role-card').forEach(c=>c.classList.remove('sel'));
      card.classList.add('sel');
      selectedRole = card.dataset.role;
    });
  });

  document.querySelectorAll('.ob-sport-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.ob-sport-card').forEach(c=>c.classList.remove('sel'));
      card.classList.add('sel');
      selectedSport = card.dataset.sport;
    });
  });

  document.getElementById('ob-finish')?.addEventListener('click', () => {
    const team = document.getElementById('ob-team')?.value?.trim()||'';
    const age  = document.getElementById('ob-age')?.value||'';
    const btn  = document.getElementById('ob-finish');
    btn.textContent = 'Setting up…'; btn.disabled = true;

    // If parent role: show athlete linking step before finishing
    if (selectedRole === 'parent') {
      btn.disabled = false;
      btn.textContent = 'Get Started →';
      _showAthleteLinker(team, age);
      return;
    }

    setRole(selectedRole);
    markOnboardingDone({ sport:selectedSport, team, age, role:selectedRole });
    patchProfile({ sport:selectedSport, team, age, role:selectedRole });
    setTimeout(() => navigate(ROLE_HOME[selectedRole]||ROUTES.WELCOME), 400);
  });
});

function _showAthleteLinker(team, age) {
  const roster = getRoster();
  const card   = document.querySelector('.auth-card');
  if (!card) return;
  card.innerHTML = `
    <h2>Link your athlete</h2>
    <p style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:20px;line-height:1.5">
      Select which athlete you're following. You can change this later in Settings.
    </p>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px" id="athlete-list">
      ${roster.map(a => `
      <div class="ob-athlete-card" data-id="${a.id}"
        style="border:2px solid rgba(255,255,255,.15);border-radius:10px;padding:12px;cursor:pointer;
               display:flex;align-items:center;gap:12px;transition:all .15s">
        <div style="width:38px;height:38px;border-radius:50%;background:#22c955;
                    display:flex;align-items:center;justify-content:center;
                    font-weight:700;color:#0d1b3e;font-size:14px;flex-shrink:0">
          ${(a.name||'A').charAt(0)}
        </div>
        <div>
          <div style="font-size:13.5px;font-weight:600;color:#fff">${a.name}</div>
          <div style="font-size:11.5px;color:rgba(255,255,255,.4)">${a.position||''} · ${a.sport||''}</div>
        </div>
      </div>`).join('')}
    </div>
    <button class="btn-primary" id="ob-link-btn" style="width:100%;font-size:14px;padding:14px;opacity:.5" disabled>
      Link athlete &amp; Continue →
    </button>`;

  let selectedAthleteId = null;

  card.querySelectorAll('.ob-athlete-card').forEach(el => {
    el.addEventListener('click', () => {
      card.querySelectorAll('.ob-athlete-card').forEach(c => {
        c.style.borderColor = 'rgba(255,255,255,.15)';
        c.style.background  = 'transparent';
      });
      el.style.borderColor = 'var(--piq-green)';
      el.style.background  = 'rgba(34,201,85,.1)';
      selectedAthleteId = parseInt(el.dataset.id);
      const btn = document.getElementById('ob-link-btn');
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    });
  });

  document.getElementById('ob-link-btn')?.addEventListener('click', () => {
    if (!selectedAthleteId) return;
    setState({ linkedAthlete: selectedAthleteId });
    setRole('parent');
    markOnboardingDone({ team, age, role: 'parent' });
    patchProfile({ team, age, role: 'parent' });
    setTimeout(() => navigate(ROLE_HOME['parent'] || 'parent/home'), 400);
  });
}
