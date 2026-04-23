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
    <div class="input-wrap"><input type="text"     id="su-name"  placeholder="Full name"        autocomplete="name"></div>
    <div class="input-wrap"><input type="email"    id="su-email" placeholder="Email address"    autocomplete="email"></div>
    <div class="input-wrap"><input type="password" id="su-pass"  placeholder="Create password"  autocomplete="new-password"></div>
  </div>
  <p id="su-error" style="color:#f87171;font-size:12.5px;margin-bottom:12px;display:none"></p>
  <button class="btn-primary" id="su-submit" style="width:100%">Create Account — It's Free</button>
  <div class="auth-foot" style="margin-top:14px">
    Already have an account? <a id="su-signin-link" style="cursor:pointer">Sign in</a>
  </div>
</div>`;
}

/* Legacy auth-card (shared/signup.js path) */
.auth-card {
  background: #ffffff;
  color: #0f172a;
}
.auth-card h2         { color: #0f172a; }
.auth-card .role-tab  { color: #475569; }
.auth-card .role-tab.active { color: #0f172a; }
.auth-card .input-wrap input {
  color: #0f172a;
  background: #f8fafc;
}
.auth-card .input-wrap input::placeholder { color: #94a3b8; }
.auth-card .auth-foot { color: #475569; }
.auth-card .auth-foot a { color: #39e66b; }

document.addEventListener('piq:authRendered', () => {
  let selectedRole = 'player';
  document.querySelectorAll('#su-role-tabs .role-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#su-role-tabs .role-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active'); selectedRole = tab.dataset.role;
    });
  });
  document.getElementById('su-signin-link')?.addEventListener('click', () => navigate(ROUTES.SIGN_IN));
  document.getElementById('su-submit')?.addEventListener('click', async () => {
    const name  = document.getElementById('su-name')?.value.trim();
    const email = document.getElementById('su-email')?.value.trim();
    const pass  = document.getElementById('su-pass')?.value;
    const errEl = document.getElementById('su-error');
    const btn   = document.getElementById('su-submit');
    btn.textContent = 'Creating account…'; btn.disabled = true;
    const res = await signUp(email, pass, name, selectedRole);
    if (res.ok) { navigate(res.isNew ? ROUTES.ONBOARDING : ROLE_HOME[res.session.role]); }
    else {
      if (errEl) { errEl.textContent = res.error; errEl.style.display = 'block'; }
      btn.textContent = 'Create Account — It\'s Free'; btn.disabled = false;
    }
  });
});
