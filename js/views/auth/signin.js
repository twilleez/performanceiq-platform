import { router } from '../../core/router.js';
import { state } from '../../state/state.js';
export function renderSignIn(container) {
  const msg = sessionStorage.getItem('piq_auth_msg') || '';
  if (msg) sessionStorage.removeItem('piq_auth_msg');
  container.innerHTML = `
    <div class="auth-screen">
      <button class="back-btn" id="back">←</button>
      <h1 class="auth-title">SIGN IN</h1>
      ${msg ? `<div class="auth-msg-warn">${msg}</div>` : ''}
      <input class="field-input" id="email" type="email" placeholder="Email">
      <input class="field-input" id="password" type="password" placeholder="Password">
      <div id="si-error" class="field-error" style="display:none"></div>
      <button class="btn-primary" id="submit">SIGN IN</button>
      <button class="btn-ghost" id="to-signup">Create an account</button>
    </div>`;
  container.querySelector('#back')?.addEventListener('click', () => router.navigate('welcome'));
  container.querySelector('#to-signup')?.addEventListener('click', () => router.navigate('sign-up'));
  container.querySelector('#submit')?.addEventListener('click', () => {
    // Stub: skip auth, route to pick-role
    router.navigate('pick-role');
  });
}
