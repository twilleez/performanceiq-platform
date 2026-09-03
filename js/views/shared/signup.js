import { navigate, ROUTES, ROLE_HOME } from '../../router.js';
import { signUp, startDemo, resendSignupConfirmation } from '../../core/auth.js';

const DEMOS = [
  ['coach', '🎽', 'Coach'], ['player', '🏀', 'Athlete'], ['parent', '👨‍👧', 'Parent'], ['solo', '🏃', 'Solo'],
];

export function renderSignUp() {
  return `
<div class="auth-card" style="margin-top:0" aria-labelledby="su-title">
  <h2 id="su-title">Create Account</h2>
  <p class="auth-help" style="margin:-4px 0 14px">Choose your account type. If this email already has an account, use Sign In → Forgot password instead of signing up again.</p>
  <p id="su-role-label" class="sr-only">Choose account type</p>
  <div class="role-tabs" id="su-role-tabs" role="group" aria-labelledby="su-role-label">
    <button type="button" class="role-tab active" data-role="player" aria-pressed="true">Athlete</button>
    <button type="button" class="role-tab" data-role="coach" aria-pressed="false">Coach</button>
    <button type="button" class="role-tab" data-role="parent" aria-pressed="false">Parent</button>
    <button type="button" class="role-tab" data-role="solo" aria-pressed="false">Solo</button>
  </div>
  <form id="su-form" novalidate>
    <div class="input-group">
      <div class="input-wrap"><label class="sr-only" for="su-name">Full name</label><input type="text" id="su-name" placeholder="Full name" autocomplete="name" required maxlength="100"></div>
      <div class="input-wrap"><label class="sr-only" for="su-email">Email address</label><input type="email" id="su-email" placeholder="Email address" autocomplete="email" inputmode="email" required maxlength="254"></div>
      <div class="input-wrap"><label class="sr-only" for="su-pass">Create password</label><input type="password" id="su-pass" placeholder="Create password" autocomplete="new-password" required minlength="8" aria-describedby="su-pass-help"><span id="su-pass-help" class="auth-help">Use at least 8 characters.</span></div>
    </div>
    <p id="su-message" role="status" aria-live="polite" style="font-size:12.5px;line-height:1.45;margin-bottom:12px;display:none"></p>
    <button type="submit" class="btn-primary" id="su-submit" style="width:100%">Create Account — It's Free</button>
  </form>
  <div id="su-confirm-actions" style="display:none;margin-top:12px;gap:8px;flex-wrap:wrap">
    <button type="button" id="su-resend" class="auth-inline-link" style="padding:8px 10px">Resend confirmation</button>
    <button type="button" id="su-go-signin" class="auth-inline-link" style="padding:8px 10px">Go to Sign In</button>
  </div>
  <div id="su-existing-actions" style="display:none;margin-top:12px;gap:8px;flex-wrap:wrap">
    <button type="button" id="su-existing-signin" class="auth-inline-link" style="padding:8px 10px">Sign In / Reset Password</button>
  </div>
  <div class="auth-foot" style="margin-top:14px">Already have an account? <button type="button" id="su-signin-link" class="auth-inline-link">Sign in</button></div>
  <div class="quick-demo-block" aria-labelledby="su-quick-demo-title"><p id="su-quick-demo-title" class="quick-demo-title">Quick Demo Access</p><div class="quick-demo-grid">${DEMOS.map(([role, icon, label]) => `<button type="button" class="demo-btn" data-demo-role="${role}"><span aria-hidden="true">${icon}</span><span>${label}</span></button>`).join('')}</div><p class="quick-demo-note">Explore before creating an account · Sample data only</p></div>
</div>`;
}

document.addEventListener('piq:authRendered', () => {
  const form = document.getElementById('su-form'); if (!form) return;
  let selectedRole = 'player'; let submittedEmail = '';
  const showMessage = (text, color = '#b91c1c') => { const el=document.getElementById('su-message'); if(el){el.textContent=text;el.style.color=color;el.style.display='block';} };
  const showActions = id => ['su-confirm-actions','su-existing-actions'].forEach(x=>{const el=document.getElementById(x);if(el)el.style.display=x===id?'flex':'none';});
  document.querySelectorAll('#su-role-tabs .role-tab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('#su-role-tabs .role-tab').forEach(t=>{t.classList.remove('active');t.setAttribute('aria-pressed','false');});tab.classList.add('active');tab.setAttribute('aria-pressed','true');selectedRole=tab.dataset.role;}));
  ['su-signin-link','su-go-signin','su-existing-signin'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>navigate(ROUTES.SIGN_IN)));
  document.getElementById('su-resend')?.addEventListener('click',async e=>{if(!submittedEmail)return;const b=e.currentTarget;b.disabled=true;b.textContent='Sending…';const r=await resendSignupConfirmation(submittedEmail);showMessage(r.ok?'Confirmation email sent again. Check Inbox and Spam, then open the PerformanceIQ confirmation link.':(r.error||'Unable to resend confirmation right now.'),r.ok?'#166534':'#b91c1c');b.textContent='Resend confirmation';b.disabled=false;});
  document.querySelectorAll('[data-demo-role]').forEach(btn=>btn.addEventListener('click',()=>{const r=startDemo(btn.dataset.demoRole);if(r.ok)navigate(ROLE_HOME[r.session.role]);else showMessage(r.error||'Unable to open demo.');}));
  form.addEventListener('submit',async event=>{
    event.preventDefault(); const nameEl=document.getElementById('su-name'),emailEl=document.getElementById('su-email'),passEl=document.getElementById('su-pass'),btn=document.getElementById('su-submit');
    const name=nameEl?.value.trim(),email=emailEl?.value.trim(),pass=passEl?.value; showActions(null);
    if(!nameEl?.checkValidity()||!emailEl?.checkValidity()||!passEl?.checkValidity()){showMessage(passEl&&!passEl.checkValidity()?'Enter your name, a valid email, and a password with at least 8 characters.':'Enter your name and a valid email address.');return;}
    submittedEmail=email; btn.textContent='Creating account…';btn.disabled=true; const res=await signUp(email,pass,name,selectedRole);
    if(res.ok&&res.needsAccountRecovery){showMessage('This email is already connected to a PerformanceIQ account. Signup cannot replace its password. Use Sign In / Reset Password.','#8a4b08');showActions('su-existing-actions');btn.textContent="Create Account — It's Free";btn.disabled=false;return;}
    if(res.ok&&res.requiresEmailConfirmation){showMessage('Account created. Open the confirmation email we sent; the link returns to PerformanceIQ so you can continue setup.','#166534');showActions('su-confirm-actions');btn.textContent='Waiting for Email Confirmation';btn.disabled=false;return;}
    if(res.ok&&res.session){navigate(res.isNew?ROUTES.ONBOARDING:ROLE_HOME[res.session.role]);return;}
    showMessage(res.error||'Unable to create account. Please try again.');btn.textContent="Create Account — It's Free";btn.disabled=false;
  });
});
