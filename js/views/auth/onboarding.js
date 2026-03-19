import { router } from '../../core/router.js';
import { state } from '../../state/state.js';
const SPORTS = ['Basketball','Football','Soccer','Baseball','Volleyball','Track'];
const PHASES = ['Pre-Season','In-Season','Post-Season','Off-Season'];
export function renderOnboarding(container) {
  container.innerHTML = `
    <div class="auth-screen">
      <h1 class="auth-title">SET UP YOUR PROFILE</h1>
      <p class="auth-sub">Step 2 of 2 — Sport &amp; Season</p>
      <div class="section-label" style="margin-bottom:8px">SELECT SPORT</div>
      <div class="sport-grid">
        ${SPORTS.map(sp => `<button class="role-card sport-card" data-sport="${sp}"><span class="role-label">${sp}</span></button>`).join('')}
      </div>
      <div class="section-label" style="margin:16px 0 8px">SEASON PHASE</div>
      <select class="field-input" id="phase-select">
        ${PHASES.map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>
      <button class="btn-primary" id="finish" style="margin-top:24px">START TRAINING</button>
    </div>`;
  let sport = null;
  container.querySelectorAll('.sport-card').forEach(c => {
    c.addEventListener('click', () => {
      container.querySelectorAll('.sport-card').forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      sport = c.dataset.sport;
    });
  });
  container.querySelector('#finish')?.addEventListener('click', () => {
    state.set('sport', sport || 'Basketball');
    state.set('seasonPhase', container.querySelector('#phase-select')?.value || 'In-Season');
    state.set('onboarded', true);
    const role = state.get('role');
    const dest = role === 'coach' ? 'coach-home' : role === 'parent' ? 'parent-home' : 'player-home';
    router.navigate(dest);
  });
}
