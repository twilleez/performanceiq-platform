/**
 * Sign In screen
 */
import { navigate, ROUTES, ROLE_HOME } from '../../router.js';
import { signIn }                       from '../../core/auth.js';

export function renderSignIn() {
  return `
<div class="auth-card" style="margin-top:0">
  <h2>Sign In</h2>
  <div class="role-tabs" id="signin-role-tabs">
    <button class="role-tab active" data-role="coach">Coach</button>
    <button class="role-tab" data-role="player">Player</button>
    <button class="role-tab" data-role="parent">Parent</button>
    <button class="role-tab" data-role="solo">Solo</button>
    <button class="role-tab" data-role="admin">Admin</button>
  </div>
  <div class="input-group">
    <div class="input-wrap">
      <input type="email" id="si-email" placeholder="Email address" autocomplete="email">
    </div>
    <div class="input-wrap">
      <input type="password" id="si-pass" placeholder="Password" autocomplete="current-password">
    </div>
  </div>
  <p id="si-error" style="color:#f87171;font-size:12.5px;margin-bottom:12px;display:none"></p>
  <button class="btn-primary" id="si-submit">Sign In</button>
  <div class="auth-foot">
    New here? <a id="si-signup-link" style="cursor:pointer">Create account</a>
    &nbsp;·&nbsp;
    <a id="si-back-link" style="cursor:pointer">← Back</a>
  </div>
</div>`;
}

document.addEventListener('piq:authRendered', () => {
  const tabs   = document.querySelectorAll('#signin-role-tabs .role-tab');
  const submit = document.getElementById('si-submit');
  if (!submit) return;

  let selectedRole = 'coach';
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    selectedRole = tab.dataset.role;
  }));

  document.getElementById('si-signup-link')?.addEventListener('click', () =>
    navigate(ROUTES.SIGN_UP));
  document.getElementById('si-back-link')?.addEventListener('click', () =>
    navigate(ROUTES.WELCOME));

  async function doSignIn() {
    const email = document.getElementById('si-email')?.value.trim();
    const errEl = document.getElementById('si-error');
    submit.textContent = 'Signing in…';
    submit.disabled = true;

    const res = await signIn(email, '', selectedRole);
    if (res.ok) {
      navigate(ROLE_HOME[res.session.role] || ROUTES.PICK_ROLE);
    } else {
      if (errEl) { errEl.textContent = res.error; errEl.style.display = 'block'; }
      submit.textContent = 'Sign In';
      submit.disabled = false;
    }
  }

  submit.addEventListener('click', doSignIn);
  document.getElementById('si-pass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSignIn();
  });
});
