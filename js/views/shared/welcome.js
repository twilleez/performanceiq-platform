/**
 * Welcome screen — logo area + CTA buttons + demo shortcuts
 */
import { navigate, ROLE_HOME, ROUTES } from '../../router.js';
import { signIn }                       from '../../core/auth.js';

export function renderWelcome() {
  return `
<div class="auth-card" style="margin-top:0">
  <h2>Welcome to PerformanceIQ</h2>
  <p style="font-size:13px;color:#6B7280;margin-bottom:24px;line-height:1.6">
    Elite training analytics for coaches, athletes, and programs.
  </p>

  <button class="btn-primary" id="welcome-get-started">Get Started — It's Free</button>
  <button class="btn-ghost" id="welcome-signin-btn" style="width:100%;margin-top:8px">Sign In</button>

  <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb">
    <p style="font-size:10.5px;color:#9CA3AF;margin-bottom:10px;text-align:center;
              font-family:'Barlow Condensed',sans-serif;letter-spacing:2px;text-transform:uppercase">
      Explore without an account
    </p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button class="demo-btn" data-demo="coach@demo.com">🎽 Coach View</button>
      <button class="demo-btn" data-demo="player@demo.com">🏀 Athlete View</button>
      <button class="demo-btn" data-demo="parent@demo.com">👨‍👧 Parent View</button>
      <button class="demo-btn" data-demo="solo@demo.com">🏃 Solo View</button>
    </div>
    <p style="font-size:11px;color:#9CA3AF;text-align:center;margin-top:8px">
      No sign-up required · Sample data only
    </p>
  </div>
</div>
<style>
.demo-btn {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  color: #374151;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all .2s;
  text-align: left;
}
.demo-btn:hover {
  background: #f0fdf4;
  border-color: #86efac;
  color: #166534;
}
</style>`;
}

document.addEventListener('piq:authRendered', () => {
  document.getElementById('welcome-get-started')?.addEventListener('click', () =>
    navigate(ROUTES.SIGN_UP));

  document.getElementById('welcome-signin-btn')?.addEventListener('click', () =>
    navigate(ROUTES.SIGN_IN));

  document.querySelectorAll('.demo-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const original = btn.textContent;
      btn.textContent = '⏳ Loading…';
      btn.disabled = true;
      const res = await signIn(btn.dataset.demo, 'demo');
      if (res.ok) {
        navigate(ROLE_HOME[res.session.role]);
      } else {
        btn.textContent = '⚠ Error';
        btn.disabled = false;
        setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2000);
      }
    });
  });
});
