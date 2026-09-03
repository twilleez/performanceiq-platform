import { navigate, ROUTES } from '../../router.js';
import { requestPasswordReset } from '../../core/auth.js';

export function renderForgotPassword() {
  return `
<div class="auth-card" style="margin-top:0" aria-labelledby="fp-title">
  <h2 id="fp-title">Reset Password</h2>
  <p class="auth-help" style="font-size:13px;margin:0 0 20px;line-height:1.5">
    Enter your email and we'll send a secure PerformanceIQ password-reset link.
  </p>

  <form id="fp-form" novalidate>
    <div class="input-group">
      <div class="input-wrap">
        <label class="sr-only" for="fp-email">Email address</label>
        <input type="email" id="fp-email" placeholder="Email address" autocomplete="email" required>
      </div>
    </div>
    <p id="fp-error" role="alert" style="color:#b91c1c;font-size:12.5px;margin-bottom:12px;display:none"></p>
    <button type="submit" class="btn-primary" id="fp-submit" style="width:100%">Send Reset Link</button>
  </form>

  <div id="fp-success" style="display:none;text-align:center;padding:12px 0">
    <div style="font-size:32px;margin-bottom:12px">📬</div>
    <p style="font-size:14px;font-weight:700;color:var(--text-primary,#0f172a);margin-bottom:6px">Check your inbox</p>
    <p class="auth-help" style="font-size:13px;line-height:1.5">
      If that address is registered, Supabase has sent a password-reset link. Open it to choose a new password.
    </p>
  </div>

  <div class="auth-foot" style="margin-top:16px">
    <button type="button" id="fp-back-signin" class="auth-inline-link">← Back to Sign In</button>
  </div>
</div>`;
}

document.addEventListener('piq:authRendered', () => {
  const form = document.getElementById('fp-form');
  const submit = document.getElementById('fp-submit');
  if (!form || !submit) return;

  document.getElementById('fp-back-signin')?.addEventListener('click', () => navigate(ROUTES.SIGN_IN));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const emailEl = document.getElementById('fp-email');
    const email = emailEl?.value.trim().toLowerCase();
    const errEl = document.getElementById('fp-error');
    const success = document.getElementById('fp-success');

    if (!emailEl?.checkValidity()) {
      if (errEl) { errEl.textContent = 'Please enter a valid email address.'; errEl.style.display = 'block'; }
      emailEl?.focus();
      return;
    }

    submit.textContent = 'Sending…';
    submit.disabled = true;
    if (errEl) errEl.style.display = 'none';

    const res = await requestPasswordReset(email);
    if (!res.ok) {
      if (errEl) { errEl.textContent = res.error || 'Unable to send reset email. Please try again.'; errEl.style.display = 'block'; }
      submit.textContent = 'Send Reset Link';
      submit.disabled = false;
      return;
    }

    form.style.display = 'none';
    if (success) success.style.display = 'block';
  });
});
