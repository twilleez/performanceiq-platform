/**
 * Forgot Password screen
 * Wires to Supabase resetPasswordForEmail when backend is live.
 * In demo/localStorage mode, shows a mock confirmation.
 */
import { navigate, ROUTES } from '../../router.js';

export function renderForgotPassword() {
  return `
<div class="auth-card" style="margin-top:0">
  <h2>Reset Password</h2>
  <p style="font-size:13px;color:#6B7280;margin-bottom:20px;line-height:1.5">
    Enter your email and we'll send you a link to reset your password.
  </p>

  <div id="fp-form">
    <div class="input-group">
      <div class="input-wrap">
        <input type="email" id="fp-email" placeholder="Email address" autocomplete="email">
      </div>
    </div>
    <p id="fp-error" style="color:#f87171;font-size:12.5px;margin-bottom:12px;display:none"></p>
    <button class="btn-primary" id="fp-submit" style="width:100%">Send Reset Link</button>
  </div>

  <div id="fp-success" style="display:none;text-align:center;padding:12px 0">
    <div style="font-size:32px;margin-bottom:12px">📬</div>
    <p style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:6px">Check your inbox</p>
    <p style="font-size:13px;color:#6B7280;line-height:1.5">
      If that email is registered, a reset link is on its way.
    </p>
  </div>

  <div class="auth-foot" style="margin-top:16px">
    <a id="fp-back-signin" style="cursor:pointer">← Back to Sign In</a>
  </div>
</div>`;
}

document.addEventListener('piq:authRendered', () => {
  const submit = document.getElementById('fp-submit');
  if (!submit) return;

  document.getElementById('fp-back-signin')?.addEventListener('click', () =>
    navigate(ROUTES.SIGN_IN));

  submit.addEventListener('click', async () => {
    const email = document.getElementById('fp-email')?.value.trim().toLowerCase();
    const errEl = document.getElementById('fp-error');
    const form  = document.getElementById('fp-form');
    const success = document.getElementById('fp-success');

    if (!email || !email.includes('@')) {
      if (errEl) { errEl.textContent = 'Please enter a valid email address.'; errEl.style.display = 'block'; }
      return;
    }

    submit.textContent = 'Sending…';
    submit.disabled = true;
    if (errEl) errEl.style.display = 'none';

    // ── Supabase (uncomment when backend migration is complete) ──
    // const { error } = await supabase.auth.resetPasswordForEmail(email, {
    //   redirectTo: `${window.location.origin}/performanceiq-platform/#/reset-password`
    // });
    // if (error) {
    //   errEl.textContent = error.message;
    //   errEl.style.display = 'block';
    //   submit.textContent = 'Send Reset Link';
    //   submit.disabled = false;
    //   return;
    // }

    // Demo / pre-Supabase: always show success (don't leak whether email exists)
    form.style.display = 'none';
    success.style.display = 'block';
  });
});
