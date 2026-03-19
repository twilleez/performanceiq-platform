import { state }   from '../../state/state.js';
import { router }  from '../../core/router.js';
import { inline, mark, wide } from '../../components/logo.js';

export function renderPickRole(container) {
  container.innerHTML = `
    <div class="auth-screen">
      <div style="display:flex;justify-content:center;margin-bottom:4px;">
        ${inline(36)}
      </div>
      <div class="onboarding-progress" style="margin-bottom:8px;">
        <div class="onboarding-step active">
          <div class="onboarding-pip active" data-num="1"></div>
          <span>Role</span>
        </div>
        <div class="onboarding-connector" style="opacity:.2;"></div>
        <div class="onboarding-step">
          <div class="onboarding-pip" data-num="2"></div>
          <span>Sport &amp; Season</span>
        </div>
      </div>
      <div class="auth-header">
        <h1 class="auth-title">I AM A…</h1>
        <p class="auth-sub">Choose your role to personalise your experience.</p>
      </div>
      <div class="role-grid">
        <button class="role-card" data-role="athlete" aria-pressed="false">
          <span class="role-icon">⚡</span>
          <span class="role-label">Athlete</span>
          <span class="role-desc">Track your readiness &amp; daily training</span>
        </button>
        <button class="role-card" data-role="coach" aria-pressed="false">
          <span class="role-icon">🎽</span>
          <span class="role-label">Coach</span>
          <span class="role-desc">Manage your team's load &amp; sessions</span>
        </button>
        <button class="role-card" data-role="parent" aria-pressed="false">
          <span class="role-icon">👥</span>
          <span class="role-label">Parent</span>
          <span class="role-desc">Monitor your athlete's wellness</span>
        </button>
        <button class="role-card" data-role="admin" aria-pressed="false">
          <span class="role-icon">🏛️</span>
          <span class="role-label">Admin</span>
          <span class="role-desc">Full platform oversight &amp; settings</span>
        </button>
      </div>
      <button class="btn-primary" id="role-continue" disabled>CONTINUE</button>
    </div>`;

  let selected = null;
  const btn = container.querySelector('#role-continue');
  container.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.role-card').forEach(c => { c.classList.remove('selected'); c.setAttribute('aria-pressed','false'); });
      card.classList.add('selected'); card.setAttribute('aria-pressed','true');
      selected = card.dataset.role; btn.disabled = false;
    });
  });
  btn.addEventListener('click', () => {
    if (!selected) return;
    state.set('role', selected);
    router.navigate('onboarding');
  });
}
