import { router }  from '../../core/router.js';
import { lockup, wide } from '../../components/logo.js';

export function renderWelcome(container) {
  container.innerHTML = `
    <div class="auth-screen auth-welcome">

      <!-- Real logo — wide format with motion streaks on welcome -->
      <div style="margin-bottom:8px;">
        ${wide(240)}
      </div>

      <!-- Wordmark under logo -->
      <div style="text-align:center;line-height:1.05;">
        <div style="font-family:var(--font-display);font-size:32px;font-weight:700;
                    color:var(--piq-text);letter-spacing:0.06em;">PERFORMANCE</div>
        <div style="font-family:var(--font-display);font-size:32px;font-weight:700;
                    color:var(--piq-green);letter-spacing:0.18em;
                    text-shadow:0 0 24px var(--piq-green-glow);">IQ</div>
      </div>

      <p class="auth-sub" style="max-width:260px;margin-top:4px;">
        Your sport science readiness platform.
      </p>

      <div style="display:flex;flex-direction:column;gap:10px;width:100%;max-width:360px;margin-top:4px;">
        <button class="btn-primary" id="get-started">GET STARTED</button>
        <button class="btn-ghost"   id="sign-in-link">Already have an account? Sign in</button>
      </div>

    </div>`;

  container.querySelector('#get-started')  ?.addEventListener('click', () => router.navigate('pick-role'));
  container.querySelector('#sign-in-link') ?.addEventListener('click', () => router.navigate('sign-in'));
}
