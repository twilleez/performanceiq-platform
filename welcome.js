/**
 * Welcome screen — logo area + CTA buttons + demo shortcuts
 */
import { navigate, ROLE_HOME, ROUTES } from '../../router.js';
import { signIn }                       from '../../core/auth.js';

export function renderWelcome() {
  return `
<div class="auth-card" style="margin-top:0">
  <h2>Welcome to PerformanceIQ</h2>
  <p style="font-size:13px;color:var(--g400);margin-bottom:24px;line-height:1.6">
    Elite training analytics for coaches, athletes, and programs.
  </p>
  <button class="btn-primary" id="welcome-get-started">Get Started</button>
  <div class="auth-foot" style="margin-top:14px">
    Already have an account? <a id="welcome-signin-link" style="cursor:pointer">Sign in</a>
  </div>
  <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08)">
    <p style="font-size:10.5px;color:var(--g400);margin-bottom:10px;text-align:center;font-family:'Barlow Condensed',sans-serif;letter-spacing:2px;text-transform:uppercase">
      Try a demo account
    </p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button class="demo-btn" data-demo="coach@demo.com">🎽 Coach</button>
      <button class="demo-btn" data-demo="player@demo.com">🏀 Player</button>
      <button class="demo-btn" data-demo="parent@demo.com">👨‍👧 Parent</button>
      <button class="demo-btn" data-demo="solo@demo.com">🏃 Solo</button>
    </div>
  </div>
</div>
<style>
.demo-btn{padding:9px 12px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(255,255,255,.04);color:rgba(255,255,255,.7);font-size:12.5px;font-weight:600;cursor:pointer;transition:all .2s}
.demo-btn:hover{background:rgba(57,230,107,.1);border-color:rgba(57,230,107,.3);color:#fff}
</style>`;
}

// Called by app.js after rendering via piq:authRendered event
document.addEventListener('piq:authRendered', () => {
  document.getElementById('welcome-get-started')?.addEventListener('click', () =>
    navigate(ROUTES.SIGN_UP));
  document.getElementById('welcome-signin-link')?.addEventListener('click', () =>
    navigate(ROUTES.SIGN_IN));

  document.querySelectorAll('.demo-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.textContent = '⏳ Loading…';
      btn.disabled = true;
      const res = await signIn(btn.dataset.demo, 'demo');
      if (res.ok) navigate(ROLE_HOME[res.session.role]);
      else { btn.textContent = '⚠ Error'; btn.disabled = false; }
    });
  });
});
