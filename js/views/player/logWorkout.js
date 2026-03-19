/**
 * player/logWorkout.js — Phase 15C
 *
 * Fix 04: Wellness inputs have data-wellness-field attributes
 * Fix 07: After session generation, calls sessionReady.show()
 * Fix 08: First exercise card gets .piq-swap-hint class
 */
import { state }          from '../../state/state.js';
import { router }         from '../../core/router.js';
import { showSessionReady } from '../../app.js';
import { ROUTES }         from '../../app.js';

// Exercise library stub — populated from data/exercises.js in full build
const EXERCISES = {
  Basketball: [
    { id: 'b1', name: 'Box Jumps',          sets: 3, reps: 8,  tag: 'Explosive Power',  swaps: ['b1s1','b1s2'] },
    { id: 'b2', name: 'Romanian Deadlift',  sets: 4, reps: 6,  tag: 'Posterior Chain',  swaps: ['b2s1','b2s2'] },
    { id: 'b3', name: 'Lateral Bounds',     sets: 3, reps: 10, tag: 'Agility',           swaps: ['b3s1'] },
    { id: 'b4', name: 'Bulgarian Split Squat', sets: 3, reps: 8, tag: 'Unilateral',      swaps: ['b4s1'] },
    { id: 'b5', name: 'Med Ball Slam',      sets: 3, reps: 12, tag: 'Power Endurance',   swaps: [] },
    { id: 'b6', name: 'Nordic Curl',        sets: 3, reps: 6,  tag: 'Hamstring',         swaps: ['b6s1'] },
    { id: 'b7', name: 'Sprint Ladder',      sets: 4, reps: 1,  tag: 'Speed',             swaps: [] },
    { id: 'b8', name: 'Hip Flexor Stretch', sets: 2, reps: 45, tag: 'Mobility',          swaps: [] },
  ],
  Football:  [],
  Soccer:    [],
  Baseball:  [],
  Volleyball:[],
  Track:     [],
};

const SWAP_NAMES = {
  b1s1: 'Depth Jump', b1s2: 'Broad Jump',
  b2s1: 'Stiff-Leg Deadlift', b2s2: 'Trap Bar Deadlift',
  b3s1: 'Cone Shuffle',
  b4s1: 'Step-up with Knee Drive',
  b6s1: 'Lying Leg Curl',
};

export function renderPlayerLog(container) {
  const s    = state.getAll();
  const sport = s.sport || 'Basketball';
  const exercises = EXERCISES[sport] || EXERCISES.Basketball;

  container.innerHTML = `
    <div class="view-screen log-workout">
      <div class="view-nav-bar">
        <button class="back-btn" id="back-btn" aria-label="Back">←</button>
        <div class="view-nav-title">LOG SESSION</div>
        <div></div>
      </div>

      <!-- Wellness Check-in — Fix 04 requires data-wellness-field on each wrapper -->
      <div class="log-section">
        <div class="section-label">TODAY'S WELLNESS</div>
        <div class="wellness-fields card">

          <div class="wellness-field" data-wellness-field="sleep">
            <div class="wellness-label-row">
              <label class="wellness-label" for="wf-sleep">Sleep Quality</label>
            </div>
            <input type="range" id="wf-sleep" class="wellness-slider"
                   min="1" max="10" value="7" aria-label="Sleep Quality 1 to 10">
            <div class="wellness-slider-hints">
              <span>Poor</span><span id="wf-sleep-val">7</span><span>Great</span>
            </div>
          </div>

          <div class="wellness-field" data-wellness-field="soreness">
            <div class="wellness-label-row">
              <label class="wellness-label" for="wf-soreness">Muscle Soreness</label>
            </div>
            <input type="range" id="wf-soreness" class="wellness-slider"
                   min="1" max="10" value="3" aria-label="Muscle Soreness 1 to 10">
            <div class="wellness-slider-hints">
              <span>None</span><span id="wf-soreness-val">3</span><span>Very sore</span>
            </div>
          </div>

          <div class="wellness-field" data-wellness-field="stress">
            <div class="wellness-label-row">
              <label class="wellness-label" for="wf-stress">Stress Level</label>
            </div>
            <input type="range" id="wf-stress" class="wellness-slider"
                   min="1" max="10" value="4" aria-label="Stress Level 1 to 10">
            <div class="wellness-slider-hints">
              <span>None</span><span id="wf-stress-val">4</span><span>High</span>
            </div>
          </div>

          <div class="wellness-field" data-wellness-field="fatigue">
            <div class="wellness-label-row">
              <label class="wellness-label" for="wf-fatigue">Fatigue</label>
            </div>
            <input type="range" id="wf-fatigue" class="wellness-slider"
                   min="1" max="10" value="3" aria-label="Fatigue 1 to 10">
            <div class="wellness-slider-hints">
              <span>Fresh</span><span id="wf-fatigue-val">3</span><span>Exhausted</span>
            </div>
          </div>

        </div>
      </div>

      <!-- Training Generator -->
      <div class="log-section">
        <div class="section-header-row">
          <div class="section-label">TODAY'S SESSION</div>
          <!-- Fix 08: swap hint on first exercise is applied dynamically below -->
        </div>

        <div id="exercise-list" class="exercise-list">
          ${_renderExercises(exercises)}
        </div>
      </div>

      <!-- RPE -->
      <div class="log-section">
        <div class="section-label">SESSION RPE</div>
        <div class="card rpe-card">
          <div class="rpe-label-row">
            <span>How hard was this session?</span>
            <span class="rpe-value" id="rpe-display">6</span>
          </div>
          <input type="range" id="rpe-slider" min="1" max="10" value="6"
                 class="wellness-slider" aria-label="RPE 1 to 10">
          <div class="wellness-slider-hints">
            <span>Very easy</span><span></span><span>Max effort</span>
          </div>
        </div>
      </div>

      <!-- Log button -->
      <div class="log-section">
        <button class="btn-primary" id="log-submit-btn">
          GENERATE &amp; LOG SESSION
        </button>
      </div>

    </div>
  `;

  // ── Slider live values ────────────────────────────────────
  ['sleep','soreness','stress','fatigue'].forEach(field => {
    const slider = container.querySelector(`#wf-${field}`);
    const display = container.querySelector(`#wf-${field}-val`);
    slider?.addEventListener('input', () => { if (display) display.textContent = slider.value; });
  });

  const rpeSlider  = container.querySelector('#rpe-slider');
  const rpeDisplay = container.querySelector('#rpe-display');
  rpeSlider?.addEventListener('input', () => {
    if (rpeDisplay) rpeDisplay.textContent = rpeSlider.value;
  });

  // ── Swap buttons ─────────────────────────────────────────
  container.querySelectorAll('.exercise-swap-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove hint after first interaction
      container.querySelector('.piq-swap-hint')?.classList.remove('piq-swap-hint');

      const exerciseId = btn.closest('.exercise-card')?.dataset.exerciseId;
      const exercise = exercises.find(e => e.id === exerciseId);
      if (!exercise?.swaps?.length) {
        btn.textContent = '— No swaps';
        return;
      }
      const swapId = exercise.swaps[0];
      const swapName = SWAP_NAMES[swapId] || 'Alternative';
      const nameEl = btn.closest('.exercise-card')?.querySelector('.exercise-name');
      if (nameEl) nameEl.textContent = swapName;
      btn.textContent = '✓ Swapped';
      btn.style.color = 'var(--piq-green, #00E599)';
      btn.style.borderColor = 'rgba(0,229,153,0.35)';
    });
  });

  // ── Log + Session Ready ───────────────────────────────────
  container.querySelector('#log-submit-btn')?.addEventListener('click', () => {
    const wellness = {
      date:     new Date().toISOString(),
      sleep:    parseInt(container.querySelector('#wf-sleep')?.value    || 7),
      soreness: parseInt(container.querySelector('#wf-soreness')?.value || 3),
      stress:   parseInt(container.querySelector('#wf-stress')?.value   || 4),
      fatigue:  parseInt(container.querySelector('#wf-fatigue')?.value  || 3),
    };

    const rpe = parseInt(rpeSlider?.value || 6);
    const load = rpe * exercises.length;

    // Save wellness entry
    const wellnessLog = state.get('wellness') || [];
    wellnessLog.push(wellness);
    state.set('wellness', wellnessLog);

    // Determine intensity from wellness + rpe
    const intensity = rpe >= 8 ? 'high' : rpe >= 5 ? 'moderate' : rpe <= 2 ? 'recovery' : 'low';

    // Fix 07 — Show session-ready bottom sheet
    showSessionReady({
      exerciseCount: exercises.length,
      durationMins:  exercises.length * 5 + 5, // rough estimate
      intensity,
      sport,
      phase:   state.get('seasonPhase') || '',
      onStart: () => _completeSession(exercises, wellness, rpe, load, sport),
      onSave:  () => _saveSessionDraft(exercises, wellness, rpe, sport),
    });
  });

  container.querySelector('#back-btn')?.addEventListener('click', () => router.navigate(ROUTES.PLAYER_HOME));
}

function _renderExercises(exercises) {
  return exercises.map((ex, i) => `
    <div class="exercise-card" data-exercise-id="${ex.id}">
      <div class="exercise-card-left">
        <div class="exercise-name">${ex.name}</div>
        <div class="exercise-meta">${ex.sets} × ${ex.reps} · ${ex.tag}</div>
      </div>
      <div class="exercise-card-right">
        <!-- Fix 08: piq-swap-hint on first card only -->
        <button class="exercise-swap-btn${i === 0 ? ' piq-swap-hint' : ''}"
                aria-label="Swap ${ex.name}">
          ⇄ Swap
        </button>
      </div>
    </div>
  `).join('');
}

function _completeSession(exercises, wellness, rpe, load, sport) {
  const sessions = state.get('sessions') || [];
  const logs = state.get('logs') || [];

  const session = {
    id:        Date.now(),
    date:      new Date().toISOString(),
    sport,
    exercises: exercises.map(e => e.name),
    rpe,
    load,
    completed: true,
  };

  sessions.push(session);
  logs.push({ date: session.date, load, completed: true });

  state.set('sessions', sessions);
  state.set('logs', logs);

  // Navigate to score view to see updated PIQ
  import('../../core/router.js').then(({ router }) => {
    router.navigate('player-score');
  });
}

function _saveSessionDraft(exercises, wellness, rpe, sport) {
  // Save as incomplete — persists for later completion
  const sessions = state.get('sessions') || [];
  sessions.push({
    id:        Date.now(),
    date:      new Date().toISOString(),
    sport,
    exercises: exercises.map(e => e.name),
    rpe,
    completed: false,
    draft:     true,
  });
  state.set('sessions', sessions);
}
