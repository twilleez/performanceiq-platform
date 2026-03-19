import { router } from '../../core/router.js';
export function renderWelcome(container) {
  container.innerHTML = `
    <div class="auth-screen auth-welcome">
      <div class="auth-logo-mark">P</div>
      <h1 class="auth-title">PERFORMANCE<br>IQ</h1>
      <p class="auth-sub">Your sport science readiness platform.</p>
      <button class="btn-primary" id="get-started">GET STARTED</button>
      <button class="btn-ghost" id="sign-in-link">Already have an account? Sign in</button>
    </div>`;
  container.querySelector('#get-started')?.addEventListener('click', () => router.navigate('pick-role'));
  container.querySelector('#sign-in-link')?.addEventListener('click', () => router.navigate('sign-in'));
}
