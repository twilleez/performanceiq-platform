import { navigate, ROUTES, ROLE_HOME } from '../../router.js';
import { signUp, startDemo } from '../../core/auth.js';

const DEMOS = [
  ['coach', '🎽', 'Coach'],
  ['player', '🏀', 'Athlete'],
  ['parent', '👨‍👧', 'Parent'],
  ['solo', '🏃', 'Solo'],
];

export function renderSignUp() {
  return `
<div class="auth-card" style="margin-top:0" aria-labelledby="su-title">
  <h2 id="su-title">Create Account</h2>
  <p id="su-role-label" class="sr-only">Choose account type</p>
  <div class="role-tabs" id="su-role-tabs" role="group" aria-labelledby="su-role-label">
    <button type="button" class="role-tab active" data-role="player" aria-pressed="true">Athlete</button>
    <button type="button" class="role-tab" data-role="coach" aria-pressed="false">Coach</button>
    <button type="button" class="role-tab" data-role="parent" aria-pressed="false">Parent</button>
    <button type="button" class="role-tab" data-role="solo" aria-pressed="false">Solo</button>
  </div>
  <form id="su-form" novalidate>
    <div class="input-group">
      <div class="input-wrap"><label class="sr-only" for="su-name">Full name</label><input type="text" id="su-name" placeholder="Full name" autocomplete="name" required maxlength="100"></div>
      <div class="input-wrap"><label class="sr-only" for="su-email">Email address</label><input type="email" id="su-email" placeholder="Email address" autocomplete="email" inputmode="email" required maxlength="254"></div>
      <div class="input-wrap"><label class="sr-only" for="su-pass">Create password</label><input type="password" id="su-pass" placeholder="Create password" autocomplete="new-password" required minlength="8" aria-describedby="su-pass-help"><span id="su-pass-help" class="auth-help">Use at least 8 characters.</span></div>
    </div>
    <p id="su-message" role="status" aria-live="polite" style="font-size:12.5px;margin-bottom:12px;display:none"></p>
    <button type="submit" class="btn-primary" id="su-submit" style="width:100%">Create Account — It's Free</button>
  </form>
  <div class="auth-foot" style="margin-top:14px">Already have an account? <button type="button" id="su-signin-link" class="auth-inline-link">Sign in</button></div>
  <div class="quick-demo-block" aria-labelledby="su-quick-demo-title">
    <p id="su-quick-demo-title" class="quick-demo-title">Quick Demo Access</p>
    <div class="quick-demo-grid">
      ${DEMOS.map(([role, icon, label]) => `<button type="button" class="demo-btn" data-demo-role="${role}"><span aria-hidden="true">${icon}</span><span>${label}</span></button>`).join('')}
    </div>
    <p class="quick-demo-note">Explore before creating an account · Sample data only</p>
  </div>
</div>`;
}

document.addEventListener('piq:authRendered', () => {
  let selectedRole = 'player';
  document.querySelectorAll('#su-role-tabs .role-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#su-role-tabs .role-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-pressed', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-pressed', 'true');
      selectedRole = tab.dataset.role;
    });
  });

  document.getElementById('su-signin-link')?.addEventListener('click', () => navigate(ROUTES.SIGN_IN));

  document.querySelectorAll('[data-demo-role]').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.demoRole;
      document.querySelectorAll('[data-demo-role]').forEach(b => b.disabled = true);
      btn.classList.add('loading');
      btn.querySelector('span:last-child').textContent = 'Opening…';
      const res = startDemo(role);
      if (res.ok) navigate(ROLE_HOME[res.session.role]);
      else {
        document.querySelectorAll('[data-demo-role]').forEach(b => b.disabled = false);
        const msgEl = document.getElementById('su-message');
        if (msgEl) { msgEl.textContent = res.error || 'Unable to open demo.'; msgEl.style.color = '#b91c1c'; msgEl.style.display = 'block'; }
      }
    });
  });

  document.getElementById('su-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const nameEl = document.getElementById('su-name');
    const emailEl = document.getElementById('su-email');
    const passEl = document.getElementById('su-pass');
    const name = nameEl?.value.trim();
    const email = emailEl?.value.trim();
    const pass = passEl?.value;
    const msgEl = document.getElementById('su-message');
    const btn = document.getElementById('su-submit');

    if (!nameEl?.checkValidity() || !emailEl?.checkValidity() || !passEl?.checkValidity()) {
      if (msgEl) {
        msgEl.textContent = passEl && !passEl.checkValidity() ? 'Enter your name, a valid email, and a password with at least 8 characters.' : 'Enter your name and a valid email address.';
        msgEl.style.color = '#b91c1c'; msgEl.style.display = 'block';
      }
      (nameEl?.checkValidity() ? (emailEl?.checkValidity() ? passEl : emailEl) : nameEl)?.focus();
      return;
    }

    if (msgEl) msgEl.style.display = 'none';
    btn.textContent = 'Creating account…'; btn.disabled = true; btn.setAttribute('aria-busy', 'true');
    const res = await signUp(email, pass, name, selectedRole);
    if (res.ok && res.requiresEmailConfirmation) {
      if (msgEl) { msgEl.textContent = 'Account created. Check your email to confirm your account, then sign in.'; msgEl.style.color = '#166534'; msgEl.style.display = 'block'; }
      btn.textContent = 'Email Confirmation Required'; btn.removeAttribute('aria-busy');
      setTimeout(() => navigate(ROUTES.SIGN_IN), 2200); return;
    }
    if (res.ok && res.session) { navigate(res.isNew ? ROUTES.ONBOARDING : ROLE_HOME[res.session.role]); return; }
    if (msgEl) { msgEl.textContent = res.error || 'Unable to create account. Please try again.'; msgEl.style.color = '#b91c1c'; msgEl.style.display = 'block'; }
    btn.textContent = "Create Account — It's Free"; btn.disabled = false; btn.removeAttribute('aria-busy');
  });
});
