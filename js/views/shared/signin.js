import { navigate, ROUTES, ROLE_HOME } from '../../router.js';
import { signIn, signUp } from '../../core/auth.js';

export function renderSignIn() {
  return `<div class="auth-card" style="margin-top:0">
    <h2>Sign In</h2>
    <p style="color:rgba(255,255,255,0.5);font-size:13px;margin-bottom:20px">This view is provided by your uploaded source files.</p>
    <button class="btn-primary" id="fallback-home" style="width:100%">Continue</button>
  </div>`;
}

document.addEventListener('piq:authRendered', () => {
  document.getElementById('fallback-home')?.addEventListener('click', () => navigate(ROUTES.WELCOME));
});
