import { navigate, ROUTES, ROLE_HOME } from '../../router.js';
import { signIn, startDemo, requestPasswordReset } from '../../core/auth.js';

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
  <div id="si-login-panel">
    <div class="input-group">
      <div class="input-wrap"><label class="sr-only" for="si-email">Email address</label><input type="email" id="si-email" placeholder="Email address" autocomplete="email"></div>
      <div class="input-wrap"><label class="sr-only" for="si-pass">Password</label><input type="password" id="si-pass" placeholder="Password" autocomplete="current-password"></div>
    </div>
    <p id="si-error" role="alert" style="color:#b91c1c;font-size:12.5px;line-height:1.45;margin-bottom:12px;display:none"></p>
    <button class="btn-primary" id="si-submit" style="width:100%">Sign In</button>
    <div class="auth-foot">
      New here? <button type="button" id="si-signup-link" class="auth-inline-link">Create account</button>
      <span aria-hidden="true"> · </span>
      <button type="button" id="si-forgot-link" class="auth-inline-link">Forgot password?</button>
      <span aria-hidden="true"> · </span>
      <button type="button" id="si-back-link" class="auth-inline-link">← Back</button>
    </div>
  </div>

  <div id="si-recovery-panel" style="display:none">
    <p class="auth-help" style="line-height:1.5;margin-bottom:14px">Enter your account email and we’ll send a secure link to set a new password.</p>
    <div class="input-group"><div class="input-wrap"><label class="sr-only" for="si-recovery-email">Recovery email</label><input type="email" id="si-recovery-email" placeholder="Email address" autocomplete="email"></div></div>
    <p id="si-recovery-message" role="status" aria-live="polite" style="font-size:12.5px;line-height:1.45;margin-bottom:12px;display:none"></p>
    <button type="button" class="btn-primary" id="si-recovery-submit" style="width:100%">Send Reset Link</button>
    <div class="auth-foot"><button type="button" id="si-recovery-back" class="auth-inline-link">← Back to Sign In</button></div>
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
  const loginPanel = document.getElementById('si-login-panel');
  if (!loginPanel) return;
  const recoveryPanel = document.getElementById('si-recovery-panel');

  document.getElementById('si-signup-link')?.addEventListener('click', () => navigate(ROUTES.SIGN_UP));
  document.getElementById('si-back-link')?.addEventListener('click', () => navigate(ROUTES.WELCOME));
  document.getElementById('si-forgot-link')?.addEventListener('click', () => {
    const current = document.getElementById('si-email')?.value.trim() || '';
    loginPanel.style.display = 'none';
    if (recoveryPanel) recoveryPanel.style.display = 'block';
    const recoveryEmail = document.getElementById('si-recovery-email');
    if (recoveryEmail) { recoveryEmail.value = current; recoveryEmail.focus(); }
  });
  document.getElementById('si-recovery-back')?.addEventListener('click', () => {
    if (recoveryPanel) recoveryPanel.style.display = 'none';
    loginPanel.style.display = 'block';
  });

  document.getElementById('si-recovery-submit')?.addEventListener('click', async () => {
    const emailEl = document.getElementById('si-recovery-email');
    const msg = document.getElementById('si-recovery-message');
    const btn = document.getElementById('si-recovery-submit');
    const show = (text, color) => { if (msg) { msg.textContent = text; msg.style.color = color; msg.style.display = 'block'; } };
    if (!emailEl?.value || !emailEl.checkValidity()) { show('Enter a valid email address.', '#b91c1c'); emailEl?.focus(); return; }
    btn.disabled = true; btn.textContent = 'Sending…';
    const res = await requestPasswordReset(emailEl.value);
    if (res.ok) show('If that email is registered, a password-reset link is on the way. Check Inbox and Spam.', '#166534');
    else show(res.error || 'Unable to send reset link.', '#b91c1c');
    btn.disabled = false; btn.textContent = 'Send Reset Link';
  });

  const submit = async () => {
    const email = document.getElementById('si-email')?.value.trim();
    const pass  = document.getElementById('si-pass')?.value;
    const errEl = document.getElementById('si-error');
    const btn   = document.getElementById('si-submit');
    if (!email || !pass) { if (errEl) { errEl.textContent = 'Enter your email and password.'; errEl.style.display = 'block'; } return; }
    if (errEl) errEl.style.display = 'none';
    btn.textContent = 'Signing in…'; btn.disabled = true; btn.setAttribute('aria-busy', 'true');
    const res = await signIn(email, pass);
    if (res.ok) { navigate(res.isNew ? ROUTES.ONBOARDING : (ROLE_HOME[res.session.role] || ROUTES.PICK_ROLE)); return; }
    if (errEl) {
      const raw = res.error || 'Invalid email or password';
      errEl.textContent = /email not confirmed/i.test(raw) ? 'Please confirm your email first, then sign in.' : raw;
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
      if (res.ok) navigate(ROLE_HOME[res.session.role]);
      else {
        btn.classList.remove('loading');
        document.querySelectorAll('[data-demo-role]').forEach(b => b.disabled = false);
        const errEl = document.getElementById('si-error');
        if (errEl) { errEl.textContent = res.error || 'Unable to open demo.'; errEl.style.display = 'block'; }
      }
    });
  });
});
