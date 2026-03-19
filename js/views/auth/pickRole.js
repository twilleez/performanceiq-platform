/**
 * pickRole.js — Phase 15C
 * Fix 02: Role cards now include one-line descriptors.
 */
import { state }  from '../../state/state.js';
import { router } from '../../core/router.js';

export function renderPickRole(container) {
  container.innerHTML = `
    <div class="auth-screen">
      <div class="auth-header">
        <div class="auth-logo">PIQ</div>
        <h1 class="auth-title">I AM A…</h1>
        <p class="auth-sub">Choose your role to personalise your experience.</p>
      </div>

      <!-- Fix 02 — role descriptors added below each card label -->
      <div class="role-grid" id="role-grid">

        <button class="role-card" data-role="athlete" aria-pressed="false">
          <span class="role-icon" aria-hidden="true">⚡</span>
          <span class="role-label">Athlete</span>
          <span class="role-desc">Track your readiness &amp; daily training</span>
        </button>

        <button class="role-card" data-role="coach" aria-pressed="false">
          <span class="role-icon" aria-hidden="true">🎽</span>
          <span class="role-label">Coach</span>
          <span class="role-desc">Manage your team's load &amp; sessions</span>
        </button>

        <button class="role-card" data-role="parent" aria-pressed="false">
          <span class="role-icon" aria-hidden="true">👥</span>
          <span class="role-label">Parent</span>
          <span class="role-desc">Monitor your athlete's wellness</span>
        </button>

        <button class="role-card" data-role="admin" aria-pressed="false">
          <span class="role-icon" aria-hidden="true">🏛️</span>
          <span class="role-label">Admin</span>
          <span class="role-desc">Full platform oversight &amp; settings</span>
        </button>

      </div>

      <button class="btn-primary" id="role-continue" disabled>
        CONTINUE
      </button>
    </div>
  `;

  // ── Interaction ───────────────────────────────────────────
  let selected = null;
  const continueBtn = container.querySelector('#role-continue');

  container.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.role-card').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
      });
      card.classList.add('selected');
      card.setAttribute('aria-pressed', 'true');
      selected = card.dataset.role;
      continueBtn.disabled = false;
    });
  });

  continueBtn.addEventListener('click', () => {
    if (!selected) return;
    state.set('role', selected);

    // Route to sport picker or onboarding next
    router.navigate('onboarding');
  });
}
