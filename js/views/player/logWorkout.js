/**
 * player/logWorkout.js — Phase 15C
 * C4: Wellness sliders — midpoint labels, directional hints per field
 * Fix 04: data-wellness-field attributes for tooltip module
 * Fix 07: sessionReady.show() after generation
 * Fix 08: swap hint on first exercise card
 */
import { state }            from '../../state/state.js';
import { router }           from '../../core/router.js';
import { showSessionReady } from '../../app.js';
import { inline }           from '../../components/logo.js';
import { ROUTES }           from '../../app.js';

const EXERCISES = {
  Basketball: [
    { id:'b1', name:'Box Jumps',           sets:3, reps:8,   tag:'Explosive Power',  swaps:['Depth Jump','Broad Jump'] },
    { id:'b2', name:'Romanian Deadlift',   sets:4, reps:6,   tag:'Posterior Chain',  swaps:['Stiff-Leg Deadlift'] },
    { id:'b3', name:'Lateral Bounds',      sets:3, reps:10,  tag:'Agility',          swaps:['Cone Shuffle'] },
    { id:'b4', name:'Bulgarian Split Squat',sets:3,reps:8,   tag:'Unilateral',       swaps:['Step-up + Knee Drive'] },
    { id:'b5', name:'Med Ball Slam',       sets:3, reps:12,  tag:'Power Endurance',  swaps:[] },
    { id:'b6', name:'Nordic Curl',         sets:3, reps:6,   tag:'Hamstring',        swaps:['Lying Leg Curl'] },
    { id:'b7', name:'Sprint Ladder',       sets:4, reps:1,   tag:'Speed',            swaps:[] },
    { id:'b8', name:'Hip Flexor Stretch',  sets:2, reps:45,  tag:'Mobility',         swaps:[] },
  ],
};
function getExercises(sport) {
  return EXERCISES[sport] || EXERCISES.Basketball;
}

// C4 — Wellness field definitions including scale direction copy
const WELLNESS_FIELDS = [
  {
    id:    'sleep',
    label: 'Sleep Quality',
    low:   'Poor',
    mid:   'OK',
    high:  'Great',
    invert: false,
  },
  {
    id:    'soreness',
    label: 'Muscle Soreness',
    low:   'None',
    mid:   'Moderate',
    high:  'Very sore',
    invert: true,   // high value = worse
  },
  {
    id:    'stress',
    label: 'Stress Level',
    low:   'Calm',
    mid:   'Neutral',
    high:  'High stress',
    invert: true,
  },
  {
    id:    'fatigue',
    label: 'Fatigue',
    low:   'Fresh',
    mid:   'Tired',
    high:  'Exhausted',
    invert: true,
  },
];

function renderWellnessField(f) {
  return `
    <div class="wellness-field" data-wellness-field="${f.id}">
      <div class="wellness-label-row">
        <label class="wellness-label" for="wf-${f.id}">${f.label}</label>
      </div>
      <input type="range" id="wf-${f.id}" class="wellness-slider"
             min="1" max="10" value="${f.invert ? 3 : 7}"
             aria-label="${f.label} 1 to 10">
      <div class="wellness-slider-hints">
        <span>${f.low}</span>
        <span id="wf-${f.id}-val" class="slider-mid-val">${f.invert ? 3 : 7} — ${f.mid}</span>
        <span>${f.high}</span>
      </div>
    </div>`;
}

export function renderPlayerLog(container) {
  const s        = state.getAll();
  const sport    = s.sport || 'Basketball';
  const exercises = getExercises(sport);

  container.innerHTML = `
    <div class="view-screen log-workout">
      <div class="view-nav-bar">
        <button class="back-btn" id="back">←</button>
        ${inline(28)}
        <div class="view-nav-title">LOG SESSION</div>
      </div>

      <!-- C4: Wellness fields with directional scale hints -->
      <div class="log-section" style="margin-top:16px;">
        <div class="section-label" style="padding:0;margin-bottom:12px;">TODAY'S WELLNESS</div>
        <div class="wellness-fields card">
          ${WELLNESS_FIELDS.map(renderWellnessField).join('')}
        </div>
      </div>

      <!-- Exercise list -->
      <div class="log-section">
        <div class="section-label" style="padding:0;margin-bottom:12px;">
          TODAY'S SESSION — ${sport.toUpperCase()}
        </div>
        <div id="exercise-list" class="exercise-list">
          ${exercises.map((ex, i) => `
            <div class="exercise-card" data-exercise-id="${ex.id}">
              <div class="exercise-card-left">
                <div class="exercise-name">${ex.name}</div>
                <div class="exercise-meta">${ex.sets} × ${ex.reps} · ${ex.tag}</div>
              </div>
              <!-- Fix 08: piq-swap-hint on first card -->
              <button class="exercise-swap-btn${i === 0 ? ' piq-swap-hint' : ''}"
                      data-exercise="${ex.id}"
                      aria-label="Swap ${ex.name}">
                ⇄ Swap
              </button>
            </div>`).join('')}
        </div>
      </div>

      <!-- RPE -->
      <div class="log-section">
        <div class="section-label" style="padding:0;margin-bottom:12px;">SESSION RPE</div>
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

      <div class="log-section">
        <button class="btn-primary" id="log-submit">GENERATE &amp; LOG SESSION</button>
      </div>
    </div>`;

  // C4: Live slider value labels with midpoint description
  WELLNESS_FIELDS.forEach(f => {
    const slider  = container.querySelector(`#wf-${f.id}`);
    const display = container.querySelector(`#wf-${f.id}-val`);
    if (!slider || !display) return;
    const update = () => {
      const v = parseInt(slider.value);
      let desc = f.mid;
      if (v <= 3)       desc = f.low;
      else if (v >= 8)  desc = f.high;
      display.textContent = `${v} — ${desc}`;
      // Color hint: invert fields go red-green opposite direction
      const danger  = f.invert ? (v >= 7) : (v <= 3);
      const good    = f.invert ? (v <= 3) : (v >= 7);
      display.style.color = danger ? 'var(--piq-red)' : good ? 'var(--piq-green)' : 'var(--piq-muted)';
    };
    slider.addEventListener('input', update);
    update();
  });

  const rpeSlider  = container.querySelector('#rpe-slider');
  const rpeDisplay = container.querySelector('#rpe-display');
  rpeSlider?.addEventListener('input', () => {
    if (rpeDisplay) rpeDisplay.textContent = rpeSlider.value;
  });

  // Swap buttons
  container.querySelectorAll('.exercise-swap-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelector('.piq-swap-hint')?.classList.remove('piq-swap-hint');
      const id  = btn.dataset.exercise;
      const ex  = exercises.find(e => e.id === id);
      if (!ex?.swaps?.length) { btn.textContent = '— No swaps'; return; }
      const nameEl = btn.closest('.exercise-card')?.querySelector('.exercise-name');
      if (nameEl) nameEl.textContent = ex.swaps[0];
      btn.textContent = '✓ Swapped';
      btn.style.color = 'var(--piq-green)';
      btn.style.borderColor = 'rgba(0,229,153,0.35)';
    });
  });

  // Submit — generate + show session ready sheet
  container.querySelector('#log-submit')?.addEventListener('click', () => {
    const getVal = id => parseInt(container.querySelector(`#wf-${id}`)?.value || 5);
    const wellness = {
      date:     new Date().toISOString(),
      sleep:    getVal('sleep'),
      soreness: getVal('soreness'),
      stress:   getVal('stress'),
      fatigue:  getVal('fatigue'),
    };
    const rpe  = parseInt(rpeSlider?.value || 6);
    const load = rpe * exercises.length;
    const intensity = rpe >= 8 ? 'high' : rpe >= 5 ? 'moderate' : rpe <= 2 ? 'recovery' : 'low';

    // Save wellness
    const wList = state.get('wellness') || [];
    wList.push(wellness);
    state.set('wellness', wList);

    // Fix 07: Session-ready bottom sheet
    showSessionReady({
      exerciseCount: exercises.length,
      durationMins:  exercises.length * 5 + 5,
      intensity,
      sport,
      phase: state.get('seasonPhase') || '',
      onStart: () => _saveSession(exercises, wellness, rpe, load, sport, true),
      onSave:  () => _saveSession(exercises, wellness, rpe, load, sport, false),
    });
  });

  container.querySelector('#back')?.addEventListener('click', () => router.navigate(ROUTES.PLAYER_HOME));
}

function _saveSession(exercises, wellness, rpe, load, sport, completed) {
  const sessions = state.get('sessions') || [];
  const logs     = state.get('logs')     || [];
  const session  = {
    id:        Date.now(),
    date:      new Date().toISOString(),
    sport,
    exercises: exercises.map(e => e.name),
    rpe,
    load,
    completed,
    draft: !completed,
  };
  sessions.push(session);
  if (completed) logs.push({ date: session.date, load, completed: true });
  state.set('sessions', sessions);
  state.set('logs', logs);
  router.navigate('player-home');
}
