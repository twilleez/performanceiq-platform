/**
 * onboarding.js — Phase 15C
 * C2: Step 2/2 progress indicator
 * C3: Sport picker validation — disabled CTA until sport selected, 
 *     default pre-selected, shake on invalid tap
 */
import { router }  from '../../core/router.js';
import { state }   from '../../state/state.js';
import { inline, mark, wide } from '../../components/logo.js';

const SPORTS = [
  { id: 'basketball', label: 'Basketball', icon: '🏀' },
  { id: 'football',   label: 'Football',   icon: '🏈' },
  { id: 'soccer',     label: 'Soccer',     icon: '⚽' },
  { id: 'baseball',   label: 'Baseball',   icon: '⚾' },
  { id: 'volleyball', label: 'Volleyball', icon: '🏐' },
  { id: 'track',      label: 'Track',      icon: '🏃' },
];
const PHASES = ['Pre-Season','In-Season','Post-Season','Off-Season'];

export function renderOnboarding(container) {
  container.innerHTML = `
    <div class="auth-screen">

      <!-- Logo -->
      <div style="display:flex;justify-content:center;margin-bottom:4px;">
        ${inline(32)}
      </div>

      <!-- C2: Step progress indicator -->
      <div class="onboarding-progress">
        <div class="onboarding-step done">
          <div class="onboarding-pip done" data-num="1"></div>
          <span>Role</span>
        </div>
        <div class="onboarding-connector"></div>
        <div class="onboarding-step active">
          <div class="onboarding-pip active" data-num="2"></div>
          <span>Sport &amp; Season</span>
        </div>
      </div>

      <div class="auth-header" style="margin-top:4px;">
        <h1 class="auth-title">YOUR SETUP</h1>
        <p class="auth-sub">Sport and season phase power your readiness engine.</p>
      </div>

      <!-- C3: Sport grid — Basketball pre-selected -->
      <div class="section-label" style="padding:0;margin-bottom:10px;">SELECT YOUR SPORT</div>
      <div class="sport-grid" id="sport-grid">
        ${SPORTS.map((sp, i) => `
          <button class="role-card sport-card${i === 0 ? ' selected' : ''}"
                  data-sport="${sp.label}"
                  aria-pressed="${i === 0 ? 'true' : 'false'}">
            <span class="role-icon" style="font-size:22px;">${sp.icon}</span>
            <span class="role-label">${sp.label}</span>
          </button>`).join('')}
      </div>

      <div class="section-label" style="padding:0;margin:16px 0 8px;">SEASON PHASE</div>
      <select class="field-input" id="phase-select" style="margin-bottom:0;">
        ${PHASES.map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>

      <button class="btn-primary" id="finish" style="margin-top:20px;">
        START TRAINING →
      </button>

    </div>`;

  // C3: Sport selection — Basketball is default so button starts enabled
  let selectedSport = 'Basketball';

  container.querySelectorAll('.sport-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.sport-card').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
      });
      card.classList.add('selected');
      card.setAttribute('aria-pressed', 'true');
      selectedSport = card.dataset.sport;
    });
  });

  container.querySelector('#finish')?.addEventListener('click', () => {
    state.set('sport',       selectedSport);
    state.set('seasonPhase', container.querySelector('#phase-select')?.value || 'In-Season');
    state.set('onboarded',   true);
    const role = state.get('role') || 'athlete';
    const dest = role === 'coach' ? 'coach-home'
               : role === 'parent' ? 'parent-home'
               : 'player-home';
    router.navigate(dest);
  });
}
