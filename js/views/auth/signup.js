import { router } from '../../core/router.js';
export function renderSignUp(container) {
  container.innerHTML = `
    <div class="auth-screen">
      <button class="back-btn" id="back">←</button>
      <h1 class="auth-title">CREATE ACCOUNT</h1>
      <input class="field-input" type="text"     placeholder="Full name">
      <input class="field-input" type="email"    placeholder="Email">
      <input class="field-input" type="password" placeholder="Password">
      <button class="btn-primary" id="submit">CREATE ACCOUNT</button>
    </div>`;
  container.querySelector('#back')?.addEventListener('click', () => router.navigate('welcome'));
  container.querySelector('#submit')?.addEventListener('click', () => router.navigate('pick-role'));
}
