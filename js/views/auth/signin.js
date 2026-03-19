import { router }  from '../../core/router.js';
import { inline, mark, wide } from '../../components/logo.js';

export function renderSignIn(container) {
  const msg = sessionStorage.getItem('piq_auth_msg') || '';
  if (msg) sessionStorage.removeItem('piq_auth_msg');
  container.innerHTML = `
    <div class="auth-screen">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
        <button class="back-btn" id="back">←</button>
        ${inline(32)}
      </div>
      <div class="auth-header"><h1 class="auth-title">SIGN IN</h1></div>
      ${msg ? `<div class="auth-msg-warn">⚠️ ${msg}</div>` : ''}
      <input class="field-input" id="email"    type="email"    placeholder="Email address"   autocomplete="email">
      <input class="field-input" id="password" type="password" placeholder="Password"        autocomplete="current-password">
      <div id="si-error" class="field-error" style="display:none"></div>
      <button class="btn-primary" id="submit">SIGN IN</button>
      <button class="btn-ghost"   id="to-signup">Create an account</button>
    </div>`;
  container.querySelector('#back')     ?.addEventListener('click', () => router.navigate('welcome'));
  container.querySelector('#to-signup')?.addEventListener('click', () => router.navigate('sign-up'));
  container.querySelector('#submit')   ?.addEventListener('click', () => router.navigate('pick-role'));
}
