import { router }  from '../../core/router.js';
import { inline }  from '../../components/logo.js';

export function renderSignUp(container) {
  container.innerHTML = `
    <div class="auth-screen">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
        <button class="back-btn" id="back">←</button>
        ${inline(32)}
      </div>
      <div class="auth-header">
        <h1 class="auth-title">CREATE ACCOUNT</h1>
        <p class="auth-sub">Free forever. No credit card required.</p>
      </div>
      <input class="field-input" type="text"     placeholder="Full name"       autocomplete="name">
      <input class="field-input" type="email"    placeholder="Email address"   autocomplete="email">
      <input class="field-input" type="password" placeholder="Password (8+ chars)" autocomplete="new-password">
      <button class="btn-primary" id="submit">CREATE ACCOUNT</button>
      <button class="btn-ghost"   id="to-signin">Already have an account? Sign in</button>
    </div>`;
  container.querySelector('#back')     ?.addEventListener('click', () => router.navigate('welcome'));
  container.querySelector('#to-signin')?.addEventListener('click', () => router.navigate('sign-in'));
  container.querySelector('#submit')   ?.addEventListener('click', () => router.navigate('pick-role'));
}
