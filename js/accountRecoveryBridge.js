import { requestPasswordReset, updatePassword } from './core/auth.js';

function recoveryOverlay() {
  let host = document.getElementById('piq-recovery-overlay');
  if (host) return host;
  host = document.createElement('div');
  host.id = 'piq-recovery-overlay';
  host.style.cssText = 'position:fixed;inset:0;z-index:5000;background:#010d14;display:flex;align-items:center;justify-content:center;padding:20px;font-family:DM Sans,system-ui,sans-serif';
  document.body.appendChild(host);
  return host;
}

function showResetScreen() {
  const host = recoveryOverlay();
  host.innerHTML = `
    <div class="auth-card" style="width:min(440px,100%);margin:0" aria-labelledby="bridge-reset-title">
      <h2 id="bridge-reset-title">Choose a New Password</h2>
      <p class="auth-help" style="line-height:1.5;margin-bottom:16px">Enter a new password for your PerformanceIQ account.</p>
      <div class="input-group">
        <div class="input-wrap"><label class="sr-only" for="bridge-pass">New password</label><input id="bridge-pass" type="password" placeholder="New password" autocomplete="new-password" minlength="8"></div>
        <div class="input-wrap"><label class="sr-only" for="bridge-confirm">Confirm password</label><input id="bridge-confirm" type="password" placeholder="Confirm new password" autocomplete="new-password" minlength="8"></div>
      </div>
      <p id="bridge-msg" role="status" style="display:none;font-size:12.5px;line-height:1.45;margin-bottom:12px"></p>
      <button id="bridge-save" class="btn-primary" style="width:100%">Update Password</button>
    </div>`;

  document.getElementById('bridge-save')?.addEventListener('click', async () => {
    const pass = document.getElementById('bridge-pass')?.value || '';
    const confirm = document.getElementById('bridge-confirm')?.value || '';
    const msg = document.getElementById('bridge-msg');
    const button = document.getElementById('bridge-save');
    const show = (text, color) => { if (msg) { msg.textContent = text; msg.style.color = color; msg.style.display = 'block'; } };
    if (pass.length < 8) { show('Password must be at least 8 characters.', '#f87171'); return; }
    if (pass !== confirm) { show('Passwords do not match.', '#f87171'); return; }
    button.disabled = true; button.textContent = 'Updating…';
    const res = await updatePassword(pass);
    if (!res.ok) {
      show(res.error || 'Unable to update password. Request a fresh reset link.', '#f87171');
      button.disabled = false; button.textContent = 'Update Password';
      return;
    }
    show('Password updated successfully. Returning to Sign In…', '#86efac');
    button.textContent = 'Password Updated';
    setTimeout(() => { window.location.href = `${window.location.origin}${window.location.pathname}#/signin`; }, 1200);
  });
}

// Supabase recovery redirects include #/reset-password. Handle this before the
// in-memory router can replace the requested destination with a role home.
if (window.location.hash.replace(/^#\//, '') === 'reset-password') {
  window.addEventListener('load', () => setTimeout(showResetScreen, 50));
}

// Older signup UI versions routed this action to an unmapped internal route.
// Capture it at document level so recovery remains functional across cached UI.
document.addEventListener('click', async event => {
  const button = event.target.closest('#su-existing-reset');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const email = document.getElementById('su-email')?.value.trim() || '';
  const msg = document.getElementById('su-message');
  button.disabled = true; button.textContent = 'Sending…';
  const res = await requestPasswordReset(email);
  if (msg) {
    msg.textContent = res.ok
      ? 'If this email is registered, a secure password-reset link has been sent. Check Inbox and Spam.'
      : (res.error || 'Unable to send reset link.');
    msg.style.color = res.ok ? '#166534' : '#b91c1c';
    msg.style.display = 'block';
  }
  button.disabled = false; button.textContent = 'Forgot / Set Password';
}, true);
