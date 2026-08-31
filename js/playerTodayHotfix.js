import { getSession } from './core/auth.js';
import { getTodayWorkout, completeWorkout } from './services/workoutService.js';

function esc(v='') {
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function normalizedExercises(workout) {
  const raw = Array.isArray(workout?.exercises) ? workout.exercises : [];
  return raw.map((ex, i) => typeof ex === 'string'
    ? { name:ex, sets:3, reps:'8-10', rest:null, note:'' }
    : { name:ex.name || ex.title || `Exercise ${i+1}`, sets:ex.sets || 3, reps:ex.reps || '8-10', rest:ex.rest || ex.rest_seconds || null, note:ex.note || '' });
}

function renderLiveWorkout(main, workout) {
  const exercises = normalizedExercises(workout);
  const workoutType = workout.day_type || 'Training';
  const durationDefault = workout.duration_min || 45;

  main.innerHTML = `
    <div class="piq-view workout-runner" id="piq-live-today">
      <section class="workout-hero">
        <div class="workout-hero-copy">
          <div class="workout-eyebrow">TODAY'S SESSION</div>
          <h1>${esc(workout.title || 'Assigned Workout')}</h1>
          <div class="workout-meta-row">
            <span class="workout-chip workout-chip-green">${esc(workoutType)}</span>
            ${workout.sport ? `<span class="workout-chip">${esc(workout.sport)}</span>` : ''}
            <span class="workout-chip">${exercises.length} exercise${exercises.length===1?'':'s'}</span>
            <span class="workout-chip">~${esc(durationDefault)} min</span>
          </div>
        </div>
        <div class="workout-date-card">
          <span>Scheduled</span>
          <strong>${esc(workout.scheduled_date || 'Today')}</strong>
        </div>
      </section>

      <section class="workout-section">
        <div class="workout-section-head">
          <div>
            <div class="workout-section-kicker">WORKOUT PLAN</div>
            <h2>Exercises</h2>
          </div>
          <div class="workout-progress-label">${exercises.length} total</div>
        </div>

        <div class="exercise-stack">
          ${exercises.length ? exercises.map((ex,i) => `
            <article class="exercise-card">
              <div class="exercise-number">${i+1}</div>
              <div class="exercise-body">
                <div class="exercise-name">${esc(ex.name)}</div>
                <div class="exercise-prescription">
                  <span><strong>${esc(ex.sets)}</strong> sets</span>
                  <span><strong>${esc(ex.reps)}</strong> reps</span>
                  ${ex.rest ? `<span><strong>${esc(ex.rest)}s</strong> rest</span>` : ''}
                </div>
                ${ex.note ? `<div class="exercise-note">Coach cue: ${esc(ex.note)}</div>` : ''}
              </div>
              <div class="exercise-check" aria-hidden="true">✓</div>
            </article>`).join('') : `
            <div class="workout-empty-card">No exercises were included in this workout.</div>`}
        </div>
      </section>

      <section class="workout-log-panel">
        <div class="workout-section-head">
          <div>
            <div class="workout-section-kicker">FINISH SESSION</div>
            <h2>Log your workout</h2>
          </div>
          <div class="workout-log-hint">Takes about 10 seconds</div>
        </div>

        <div class="workout-log-grid">
          <div class="workout-field">
            <label for="live-duration">Duration</label>
            <div class="input-with-unit">
              <input id="live-duration" type="number" min="1" max="300" value="${esc(durationDefault)}" />
              <span>min</span>
            </div>
          </div>

          <div class="workout-field">
            <label for="live-rpe">How hard was it?</label>
            <div class="input-with-unit">
              <input id="live-rpe" type="number" min="1" max="10" value="6" />
              <span>RPE / 10</span>
            </div>
          </div>

          <div class="workout-field workout-field-notes">
            <label for="live-notes">Session notes <span>optional</span></label>
            <textarea id="live-notes" rows="3" placeholder="How did you feel? Any pain, PRs, or adjustments?"></textarea>
          </div>
        </div>

        <div id="live-complete-status" role="status" class="workout-save-status"></div>
        <button class="workout-complete-btn" id="live-complete-btn">
          <span class="workout-complete-icon">✓</span>
          <span>Complete Workout</span>
        </button>
      </section>
    </div>`;

  const button = main.querySelector('#live-complete-btn');
  button?.addEventListener('click', async () => {
    const status = main.querySelector('#live-complete-status');
    const durationMin = Number(main.querySelector('#live-duration')?.value || 45);
    const rpeActual = Number(main.querySelector('#live-rpe')?.value || 6);
    const notes = main.querySelector('#live-notes')?.value || '';

    if (durationMin < 1 || durationMin > 300) {
      status.textContent = 'Enter a duration between 1 and 300 minutes.';
      status.className = 'workout-save-status error';
      return;
    }
    if (rpeActual < 1 || rpeActual > 10) {
      status.textContent = 'RPE must be between 1 and 10.';
      status.className = 'workout-save-status error';
      return;
    }

    button.disabled = true;
    button.innerHTML = '<span class="workout-complete-spinner"></span><span>Saving workout…</span>';
    status.textContent = 'Saving your workout and updating progress…';
    status.className = 'workout-save-status';
    try {
      await completeWorkout(workout.id, { exerciseLogs:[], durationMin, rpeActual, notes });
      status.textContent = '✓ Workout completed. Your training history is updated.';
      status.className = 'workout-save-status success';
      button.innerHTML = '<span class="workout-complete-icon">✓</span><span>Workout Complete</span>';
      button.classList.add('completed');
    } catch (err) {
      console.error('[PIQ] complete workout failed:', err);
      status.textContent = `Could not save completion: ${err?.message || 'Unknown error'}`;
      status.className = 'workout-save-status error';
      button.disabled = false;
      button.innerHTML = '<span class="workout-complete-icon">✓</span><span>Complete Workout</span>';
    }
  });
}

async function loadLiveToday() {
  if (getSession()?.isDemo) return;
  const main = document.getElementById('piq-main');
  if (!main) return;
  main.innerHTML = '<div class="piq-view"><div class="empty-state"><div>Loading today’s workout…</div></div></div>';
  try {
    const workout = await getTodayWorkout();
    if (!workout) {
      main.innerHTML = `
        <div class="piq-view">
          <div class="empty-state">
            <div style="font-weight:700">No workout assigned for today</div>
            <div class="muted" style="margin-top:6px">Choose your own workout below or use a Coach-assigned session when one is available.</div>
            <button class="btn" data-route="player/home" style="margin-top:14px">Back to Dashboard</button>
          </div>
        </div>`;
      main.querySelector('[data-route]')?.addEventListener('click', () => location.hash = '#/player/home');
      return;
    }
    renderLiveWorkout(main, workout);
  } catch (err) {
    console.error('[PIQ] load live Today failed:', err);
    main.innerHTML = `<div class="piq-view"><div class="empty-state"><div>Unable to load today’s workout</div><div class="muted">${esc(err?.message || '')}</div></div></div>`;
  }
}

document.addEventListener('piq:viewRendered', event => {
  if (event.detail?.route === 'player/today') loadLiveToday();
});
