/**
 * Pick Role screen — shown post-auth when role needs confirmation
 */
import { navigate, ROLE_HOME } from '../../router.js';
import { setRole }              from '../../core/auth.js';

export function renderPickRole() {
  return `
<div class="auth-card" style="margin-top:0;max-width:560px;width:100%">
  <h2>Choose Your Role</h2>
  <p style="font-size:13px;color:var(--g400);margin-bottom:0;line-height:1.5">
    Your role shapes your dashboard and features.
  </p>
  <div class="pick-role-grid" id="role-grid">
    <div class="pick-role-card" data-role="coach">
      <div class="pick-role-icon">🎽</div>
      <div class="pick-role-label">Coach</div>
      <div class="pick-role-desc">Build programs, manage rosters, track readiness</div>
    </div>
    <div class="pick-role-card" data-role="player">
      <div class="pick-role-icon">🏀</div>
      <div class="pick-role-label">Player</div>
      <div class="pick-role-desc">Follow workouts and track your PIQ score</div>
    </div>
    <div class="pick-role-card" data-role="parent">
      <div class="pick-role-icon">👨‍👧</div>
      <div class="pick-role-label">Parent</div>
      <div class="pick-role-desc">Monitor your athlete's progress</div>
    </div>
    <div class="pick-role-card" data-role="solo">
      <div class="pick-role-icon">🏃</div>
      <div class="pick-role-label">Solo</div>
      <div class="pick-role-desc">Self-directed training with full builder</div>
    </div>
    <div class="pick-role-card" data-role="admin">
      <div class="pick-role-icon">🏫</div>
      <div class="pick-role-label">Admin</div>
      <div class="pick-role-desc">Manage your organization and teams</div>
    </div>
  </div>
</div>`;
}

document.addEventListener('piq:authRendered', () => {
  document.querySelectorAll('#role-grid .pick-role-card').forEach(card => {
    card.addEventListener('click', () => {
      const role = card.dataset.role;
      setRole(role);
      navigate(ROLE_HOME[role]);
    });
  });
});
