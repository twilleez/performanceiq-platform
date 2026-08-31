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
  main.innerHTML = `
    <div class="piq-view" id="piq-live-today">
      <div class="view-page-header">
        <div class="view-page-title">Today's <span class="hl">Workout</span></div>
        <div class="view-page-subtitle">Assigned for ${esc(workout.scheduled_date || 'today')}</div>
      </div>

      <div class="card">
        <div class="card-title">${esc(workout.title || 'Assigned Workout')}</div>
        <div class="card-sub">${esc(workout.day_type || 'training')} · ${esc(workout.sport || '')}</div>
      </div>

      <div class="card">
        <div class="card-title">Exercises</div>
        ${exercises.length ? exercises.map((ex,i) => `
          <div class="exercise" style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.07)">
            <div style="font-weight:700">${i+1}. ${esc(ex.name)}</div>
            <div class="muted">${esc(ex.sets)} × ${esc(ex.reps)}${ex.rest ? ` · ${esc(ex.rest)}s rest` : ''}</div>
            ${ex.note ? `<div class="muted" style="margin-top:4px">${esc(ex.note)}</div>` : ''}
          </div>`).join('') : '<div class="muted">No exercises were included in this assignment.</div>'}
      </div>

      <div class="card">
        <div class="card-title">Log Session</div>
        <label for="live-duration">Duration (minutes)</label>
        <input id="live-duration" type="number" min="1" value="45" />
        <label for="live-rpe">RPE (1–10)</label>
        <input id="live-rpe" type="number" min="1" max="10" value="6" />
        <label for="live-notes">Notes</label>
        <textarea id="live-notes"></textarea>
        <div id="live-complete-status" role="status" class="muted" style="margin:10px 0"></div>
        <button class="btn primary" id="live-complete-btn">Complete Workout</button>
      </div>
    </div>`;

  const button = main.querySelector('#live-complete-btn');
  button?.addEventListener('click', async () => {
    const status = main.querySelector('#live-complete-status');
    const durationMin = Number(main.querySelector('#live-duration')?.value || 45);
    const rpeActual = Number(main.querySelector('#live-rpe')?.value || 6);
    const notes = main.querySelector('#live-notes')?.value || '';
    button.disabled = true;
    button.textContent = 'Saving…';
    status.textContent = 'Saving workout completion…';
    try {
      await completeWorkout(workout.id, { exerciseLogs:[], durationMin, rpeActual, notes });
      status.textContent = '✓ Workout completed and saved.';
      button.textContent = '✓ Completed';
    } catch (err) {
      console.error('[PIQ] complete workout failed:', err);
      status.textContent = `Could not save completion: ${err?.message || 'Unknown error'}`;
      button.disabled = false;
      button.textContent = 'Complete Workout';
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
            <div class="muted" style="margin-top:6px">Ask your Coach to choose a workout type, athlete, and date in Program Builder.</div>
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
