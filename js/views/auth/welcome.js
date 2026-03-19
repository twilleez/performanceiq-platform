import { router }  from '../../core/router.js';
import { lockup }  from '../../components/logo.js';

export function renderWelcome(container) {
  container.innerHTML = `
    <div class="auth-screen auth-welcome">
      ${lockup(80)}
      <p class="auth-sub" style="max-width:260px;">
        Your sport science readiness platform.
      </p>
      <div style="display:flex;flex-direction:column;gap:10px;width:100%;max-width:360px;">
        <button class="btn-primary" id="get-started">GET STARTED</button>
        <button class="btn-ghost"   id="sign-in-link">Already have an account? Sign in</button>
      </div>
    </div>`;
  container.querySelector('#get-started')  ?.addEventListener('click', () => router.navigate('pick-role'));
  container.querySelector('#sign-in-link') ?.addEventListener('click', () => router.navigate('sign-in'));
}
