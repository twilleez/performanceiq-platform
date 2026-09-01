import { navigate, ROUTES, ROLE_HOME } from '../../router.js';
import { signIn, startDemo } from '../../core/auth.js';

const DEMOS = [
  ['coach', '🎽', 'Coach'],
  ['player', '🏀', 'Athlete'],
  ['parent', '👨‍👧', 'Parent'],
  ['solo', '🏃', 'Solo'],
];

export function renderSignIn() {
  return `
<div class="auth-card" style="margin-top:0" aria-labelledby="si-title">
  <h2 id="si-title">Sign In</h2>
  <div class="input-group">
    <div class="input-wrap"><label class="sr-only" for="si-email">Email address</label><input type="email" id="si-email" placeholder="Email address" autocomplete="email"></div>
    <div class="input-wrap"><label class="sr-only" for="si-pass">Password</label><input type="password" id="si-pass" placeholder="Password" autocomplete="current-password"></div>
  </div>
  <p id="si-error" role="alert" style="color:#b91c1c;font-size:12.5px;margin-bottom:12px;display:none"></p>
  <button class="btn-primary" id="si-submit" style="width:100%">Sign In</button>
  <div class="auth-foot">
    New here? <button type="button" id="si-signup-link" class="auth-inline-link">Create account</button>
    <span aria-hidden="true"> · </span>
    <button type="button" id="si-forgot-link" class="auth-inline-link">Forgot password?</button>
    <span aria-hidden="true"> · </span>
    <button type="button" id="si-back-link" class="auth-inline-link">← Back</button>
  </div>
  <div class="quick-demo-block" aria-labelledby="quick-demo-title">
    <p id="quick-demo-title" class="quick-demo-title">Quick Demo Access</p>
    <div class="quick-demo-grid">
      ${DEMOS.map(([role, icon, label]) => `<button type="button" class="demo-btn" data-demo-role="${role}"><span aria-hidden="true">${icon}</span><span>${label}</span></button>`).join('')}
    </div>
    <p class="quick-demo-note">No account required · Sample data only</p>
  </div>
</div>`;
}

document.addEventListener('piq:authRendered', () => {
  document.getElementById('si-signup-link')?.addEventListener('click', () => navigate(ROUTES.SIGN_UP));
  document.getElementById('si-forgot-link')?.addEventListener('click', () => navigate(ROUTES.FORGOT_PASSWORD));
  document.getElementById('si-back-link')?.addEventListener('click', () => navigate(ROUTES.WELCOME));

  const submit = async () => {
    const email = document.getElementById('si-email')?.value.trim();
    const pass  = document.getElementById('si-pass')?.value;
    const errEl = document.getElementById('si-error');
    const btn   = document.getElementById('si-submit');
    if (!email || !pass) {
      if (errEl) { errEl.textContent = 'Enter your email and password.'; errEl.style.display = 'block'; }
      return;
    }
    if (errEl) errEl.style.display = 'none';
    btn.textContent = 'Signing in…'; btn.disabled = true; btn.setAttribute('aria-busy', 'true');
    const res = await signIn(email, pass);
    if (res.ok) {
      navigate(res.isNew ? ROUTES.ONBOARDING : (ROLE_HOME[res.session.role] || ROUTES.PICK_ROLE));
      return;
    }
    if (errEl) {
      const raw = res.error || 'Invalid email or password';
      errEl.textContent = /email not confirmed/i.test(raw)
        ? 'Please confirm your email first, then sign in.'
        : raw;
      errEl.style.display = 'block';
    }
    btn.textContent = 'Sign In'; btn.disabled = false; btn.removeAttribute('aria-busy');
  };

  document.getElementById('si-submit')?.addEventListener('click', submit);
  document.getElementById('si-pass')?.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  document.getElementById('si-email')?.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });

  document.querySelectorAll('[data-demo-role]').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.demoRole;
      document.querySelectorAll('[data-demo-role]').forEach(b => b.disabled = true);
      btn.classList.add('loading');
      btn.querySelector('span:last-child').textContent = 'Opening…';
      const res = startDemo(role);
      if (res.ok) {
        navigate(ROLE_HOME[res.session.role]);
      } else {
        btn.classList.remove('loading');
        document.querySelectorAll('[data-demo-role]').forEach(b => b.disabled = false);
        const errEl = document.getElementById('si-error');
        if (errEl) { errEl.textContent = res.error || 'Unable to open demo.'; errEl.style.display = 'block'; }
      }
    });
  });
});
