import { navigate, ROUTES, ROLE_HOME } from '../../router.js';
import { signUp } from '../../core/auth.js';

export function renderSignUp() {
  return `
<div class="auth-card" style="margin-top:0">
  <h2>Create Account</h2>
  <div class="role-tabs" id="su-role-tabs">
    <button class="role-tab active" data-role="player">Athlete</button>
    <button class="role-tab" data-role="coach">Coach</button>
    <button class="role-tab" data-role="parent">Parent</button>
    <button class="role-tab" data-role="solo">Solo</button>
  </div>
  <div class="input-group">
    <div class="input-wrap"><input type="text" id="su-name" placeholder="Full name" autocomplete="name"></div>
    <div class="input-wrap"><input type="email" id="su-email" placeholder="Email address" autocomplete="email"></div>
    <div class="input-wrap"><input type="password" id="su-pass" placeholder="Create password" autocomplete="new-password"></div>
  </div>
  <p id="su-message" role="status" aria-live="polite" style="font-size:12.5px;margin-bottom:12px;display:none"></p>
  <button class="btn-primary" id="su-submit" style="width:100%">Create Account — It's Free</button>
  <div class="auth-foot" style="margin-top:14px">
    Already have an account? <a id="su-signin-link" style="cursor:pointer">Sign in</a>
  </div>
</div>`;
}

document.addEventListener('piq:authRendered', () => {
  let selectedRole = 'player';
  document.querySelectorAll('#su-role-tabs .role-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#su-role-tabs .role-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedRole = tab.dataset.role;
    });
  });

  document.getElementById('su-signin-link')?.addEventListener('click', () => navigate(ROUTES.SIGN_IN));

  document.getElementById('su-submit')?.addEventListener('click', async () => {
    const name = document.getElementById('su-name')?.value.trim();
    const email = document.getElementById('su-email')?.value.trim();
    const pass = document.getElementById('su-pass')?.value;
    const msgEl = document.getElementById('su-message');
    const btn = document.getElementById('su-submit');

    if (msgEl) msgEl.style.display = 'none';
    btn.textContent = 'Creating account…';
    btn.disabled = true;

    const res = await signUp(email, pass, name, selectedRole);
    if (res.ok && res.requiresEmailConfirmation) {
      if (msgEl) {
        msgEl.textContent = 'Account created. Check your email to confirm your account, then sign in.';
        msgEl.style.color = '#166534';
        msgEl.style.display = 'block';
      }
      btn.textContent = 'Email Confirmation Required';
      setTimeout(() => navigate(ROUTES.SIGN_IN), 2200);
      return;
    }

    if (res.ok && res.session) {
      navigate(res.isNew ? ROUTES.ONBOARDING : ROLE_HOME[res.session.role]);
      return;
    }

    if (msgEl) {
      msgEl.textContent = res.error || 'Unable to create account. Please try again.';
      msgEl.style.color = '#b91c1c';
      msgEl.style.display = 'block';
    }
    btn.textContent = "Create Account — It's Free";
    btn.disabled = false;
  });
});
