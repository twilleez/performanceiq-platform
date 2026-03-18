/**
 * Sign In — supports both demo (no password) and real Supabase accounts.
 */
import { navigate, ROUTES, ROLE_HOME } from '../../router.js';
import { signIn, isDemo }               from '../../core/auth.js';

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
    <div class="input-wrap" id="si-pass-wrap">
      <input type="password" id="si-pass" placeholder="Password" autocomplete="current-password">
    </div>
  </div>

  <!-- Demo hint: hides password field for demo emails -->
  <p id="si-demo-hint" style="font-size:11.5px;color:var(--piq-green);margin-bottom:10px;display:none">
    ✓ Demo account — no password needed
  </p>

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
  const tabs      = document.querySelectorAll('#signin-role-tabs .role-tab');
  const submit    = document.getElementById('si-submit');
  const emailEl   = document.getElementById('si-email');
  const passWrap  = document.getElementById('si-pass-wrap');
  const demoHint  = document.getElementById('si-demo-hint');
  if (!submit) return;

  const DEMO_EMAILS = [
    'coach@demo.com','player@demo.com',
    'parent@demo.com','admin@demo.com','solo@demo.com',
  ];

  let selectedRole = 'coach';

  // Tab selection
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    selectedRole = tab.dataset.role;
  }));

  // Show/hide password for demo emails
  emailEl?.addEventListener('input', () => {
    const isDemo = DEMO_EMAILS.includes(emailEl.value.trim().toLowerCase());
    if (passWrap) passWrap.style.display = isDemo ? 'none' : 'block';
    if (demoHint) demoHint.style.display = isDemo ? 'block' : 'none';
  });

  document.getElementById('si-signup-link')
    ?.addEventListener('click', () => navigate(ROUTES.SIGN_UP));
  document.getElementById('si-back-link')
    ?.addEventListener('click', () => navigate(ROUTES.WELCOME));

  async function doSignIn() {
    const email   = emailEl?.value.trim();
    const pass    = document.getElementById('si-pass')?.value || '';
    const errEl   = document.getElementById('si-error');
    if (errEl) errEl.style.display = 'none';

    if (!email) {
      if (errEl) { errEl.textContent = 'Please enter your email.'; errEl.style.display = 'block'; }
      return;
    }

    submit.textContent = 'Signing in…';
    submit.disabled    = true;

    const res = await signIn(email, pass, selectedRole);

    if (res.ok) {
      if (res.needsConfirmation) {
        if (errEl) {
          errEl.style.color    = 'var(--piq-green)';
          errEl.textContent    = res.message;
          errEl.style.display  = 'block';
        }
        submit.textContent = 'Sign In';
        submit.disabled    = false;
        return;
      }
      navigate(ROLE_HOME[res.session.role] || ROUTES.PICK_ROLE);
    } else {
      if (errEl) { errEl.textContent = res.error; errEl.style.display = 'block'; }
      submit.textContent = 'Sign In';
      submit.disabled    = false;
    }
  }

  submit.addEventListener('click', doSignIn);
  document.getElementById('si-pass')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') doSignIn(); });
});
