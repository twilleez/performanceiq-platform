import { navigate, ROUTES } from '../../router.js';
import { updatePassword } from '../../core/auth.js';

export function renderResetPassword() {
  return `
<div class="auth-card" style="margin-top:0" aria-labelledby="rp-title">
  <h2 id="rp-title">Choose a New Password</h2>
  <p class="auth-help" style="margin:0 0 18px;line-height:1.5">Enter a new password for your PerformanceIQ account.</p>
  <form id="rp-form" novalidate>
    <div class="input-group">
      <div class="input-wrap">
        <label class="sr-only" for="rp-pass">New password</label>
        <input id="rp-pass" type="password" placeholder="New password" autocomplete="new-password" minlength="8" required>
      </div>
      <div class="input-wrap">
        <label class="sr-only" for="rp-confirm">Confirm new password</label>
        <input id="rp-confirm" type="password" placeholder="Confirm new password" autocomplete="new-password" minlength="8" required>
      </div>
    </div>
    <p id="rp-message" role="status" aria-live="polite" style="font-size:12.5px;line-height:1.45;margin-bottom:12px;display:none"></p>
    <button type="submit" id="rp-submit" class="btn-primary" style="width:100%">Update Password</button>
  </form>
</div>`;
}

document.addEventListener('piq:authRendered', () => {
  const form = document.getElementById('rp-form');
  if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const pass = document.getElementById('rp-pass')?.value || '';
    const confirm = document.getElementById('rp-confirm')?.value || '';
    const message = document.getElementById('rp-message');
    const submit = document.getElementById('rp-submit');
    const show = (text, color = '#b91c1c') => {
      if (!message) return;
      message.textContent = text;
      message.style.color = color;
      message.style.display = 'block';
    };

    if (pass.length < 8) { show('Password must be at least 8 characters.'); return; }
    if (pass !== confirm) { show('Passwords do not match.'); return; }

    submit.disabled = true;
    submit.textContent = 'Updating…';
    const res = await updatePassword(pass);
    if (!res.ok) {
      show(res.error || 'Unable to update password. Request a new reset link and try again.');
      submit.disabled = false;
      submit.textContent = 'Update Password';
      return;
    }

    show('Password updated. You can now continue to PerformanceIQ.', '#166534');
    submit.textContent = 'Password Updated';
    setTimeout(() => navigate(ROUTES.SIGN_IN), 1200);
  });
});
