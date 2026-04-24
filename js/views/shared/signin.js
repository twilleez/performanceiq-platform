import { navigate, ROUTES, ROLE_HOME } from '../../router.js';
import { signIn } from '../../core/auth.js';

export function renderSignIn() {
  return `
<div class="auth-card" style="margin-top:0">
  <h2>Sign In</h2>
  <div class="input-group">
    <div class="input-wrap"><input type="email" id="si-email" placeholder="Email address" autocomplete="email"></div>
    <div class="input-wrap"><input type="password" id="si-pass" placeholder="Password" autocomplete="current-password"></div>
  </div>
  <p id="si-error" style="color:#f87171;font-size:12.5px;margin-bottom:12px;display:none"></p>
  <button class="btn-primary" id="si-submit" style="width:100%">Sign In</button>
 <div class="auth-foot">
    New here? <a id="si-signup-link" style="cursor:pointer">Create account</a>
    &nbsp;·&nbsp;
    <a id="si-forgot-link" style="cursor:pointer">Forgot password?</a>
    &nbsp;·&nbsp;
    <a id="si-back-link" style="cursor:pointer">← Back</a>
  </div>
  <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)">
    <p style="font-size:10.5px;color:rgba(255,255,255,.3);margin-bottom:10px;text-align:center;font-family:'Barlow Condensed',sans-serif;letter-spacing:2px;text-transform:uppercase">Quick demo access</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button class="demo-btn" data-demo="coach@demo.com">🎽 Coach</button>
      <button class="demo-btn" data-demo="player@demo.com">🏀 Player</button>
      <button class="demo-btn" data-demo="parent@demo.com">👨‍👧 Parent</button>
      <button class="demo-btn" data-demo="solo@demo.com">🏃 Solo</button>
    </div>
  </div>
</div>
<style>
.demo-btn{padding:8px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(255,255,255,.04);color:rgba(255,255,255,.7);font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
.demo-btn:hover{background:rgba(34,201,85,.1);border-color:rgba(34,201,85,.3);color:#fff}
</style>`;
}

document.addEventListener('piq:authRendered', () => {
  document.getElementById('si-signup-link')?.addEventListener('click', () => navigate(ROUTES.SIGN_UP));
  document.getElementById('si-submit')?.addEventListener('click', async () => {
    const email = document.getElementById('si-email')?.value.trim();
    const pass  = document.getElementById('si-pass')?.value;
    const errEl = document.getElementById('si-error');
    const btn   = document.getElementById('si-submit');
    btn.textContent = 'Signing in…'; btn.disabled = true;
    const res = await signIn(email, pass);
    if (res.ok) { navigate(ROLE_HOME[res.session.role]); }
    else {
      if (errEl) { errEl.textContent = res.error || 'Invalid email or password'; errEl.style.display = 'block'; }
      btn.textContent = 'Sign In'; btn.disabled = false;
    }
  });
  document.querySelectorAll('.demo-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orig = btn.textContent; btn.textContent = '⏳'; btn.disabled = true;
      const res = await signIn(btn.dataset.demo, 'demo');
      if (res.ok) navigate(ROLE_HOME[res.session.role]);
      else { btn.textContent = orig; btn.disabled = false; }
    });
  });
});
