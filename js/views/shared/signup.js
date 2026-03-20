/**
 * Sign Up screen
 */
import { navigate, ROUTES, ROLE_HOME } from '../../router.js';
import { signUp }                       from '../../core/auth.js';

export function renderSignUp() {
  return `
<div class="auth-card" style="margin-top:0">
  <h2>Create Account</h2>
  <div class="role-tabs" id="su-role-tabs">
    <button class="role-tab active" data-role="coach">Coach</button>
    <button class="role-tab" data-role="player">Player</button>
    <button class="role-tab" data-role="parent">Parent</button>
    <button class="role-tab" data-role="solo">Solo</button>
  </div>
  <div class="input-group">
    <div class="input-wrap">
      <input type="text" id="su-name" placeholder="Full name" autocomplete="name">
    </div>
    <div class="input-wrap">
      <input type="email" id="su-email" placeholder="Email address" autocomplete="email">
    </div>
    <div class="input-wrap">
      <input type="password" id="su-pass" placeholder="Create password" autocomplete="new-password">
    </div>
  </div>
  <p id="su-error" style="color:#f87171;font-size:12.5px;margin-bottom:12px;display:none"></p>
  <button class="btn-primary" id="su-submit">Create Account</button>
  <div class="auth-foot">
    Already have an account? <a id="su-signin-link" style="cursor:pointer">Sign in</a>
  </div>
</div>`;
}

document.addEventListener('piq:authRendered', () => {
  const tabs   = document.querySelectorAll('#su-role-tabs .role-tab');
  const submit = document.getElementById('su-submit');
  if (!submit) return;

  let selectedRole = 'coach';
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    selectedRole = tab.dataset.role;
  }));

  document.getElementById('su-signin-link')?.addEventListener('click', () =>
    navigate(ROUTES.SIGN_IN));

  submit.addEventListener('click', async () => {
    const name  = document.getElementById('su-name')?.value.trim();
    const email = document.getElementById('su-email')?.value.trim();
    const pass  = document.getElementById('su-pass')?.value;
    const errEl = document.getElementById('su-error');

    submit.textContent = 'Creating account…';
    submit.disabled = true;

    const res = await signUp(email, pass, name, selectedRole);
    if (res.ok) {
      navigate(res.isNew ? ROUTES.ONBOARDING : ROLE_HOME[res.session.role]);
    } else {
      if (errEl) { errEl.textContent = res.error; errEl.style.display = 'block'; }
      submit.textContent = 'Create Account';
      submit.disabled = false;
    }
  });
});
