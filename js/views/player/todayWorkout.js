/**
 * PerformanceIQ — Player Today Workout
 * Shared polished runner for production and demo assignments.
 */

import {
  getAssignedWorkouts,
  completeAssignment,
  addWorkoutLog
} from '../../state/state.js';

import { navigate, ROUTES } from '../../router.js';

function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeExercises(workout) {
  const raw = Array.isArray(workout?.exercises) ? workout.exercises : [];
  return raw.map((ex, i) => typeof ex === 'string'
    ? { name: ex, sets: 3, reps: '8–10', rest: null, note: '' }
    : {
        name: ex?.name || ex?.title || `Exercise ${i + 1}`,
        sets: ex?.sets || 3,
        reps: ex?.reps || '8–10',
        rest: ex?.rest || ex?.rest_seconds || null,
        note: ex?.note || ex?.cue || ''
      });
}

export function renderPlayerToday() {
  const assignments = getAssignedWorkouts().filter(a => !a.completed);
  const workout = assignments[0];

  if (!workout) {
    return `
      <div class="piq-view workout-runner">
        <section class="workout-hero">
          <div class="workout-hero-copy">
            <div class="workout-eyebrow">TODAY'S SESSION</div>
            <h1>No workout assigned</h1>
            <div class="workout-meta-row">
              <span class="workout-chip">Recovery / self-directed day</span>
            </div>
          </div>
        </section>
        <div class="workout-empty-card">
          <div style="font-weight:800;color:#f3f7fa;margin-bottom:6px">Nothing is scheduled right now.</div>
          <div style="margin-bottom:16px">Return to your dashboard or choose another training option.</div>
          <button class="workout-complete-btn" style="max-width:260px;margin:0 auto" data-route="${ROUTES.PLAYER_HOME}">
            Back to Dashboard
          </button>
        </div>
      </div>
    `;
  }

  const exercises = normalizeExercises(workout);
  const sessionType = workout.sessionType || workout.day_type || 'Training';
  const durationDefault = workout.duration || workout.durationMin || workout.duration_min || 45;
  const scheduled = workout.scheduledDate || workout.scheduled_date || 'Today';

  return `
    <div class="piq-view workout-runner">
      <section class="workout-hero">
        <div class="workout-hero-copy">
          <div class="workout-eyebrow">TODAY'S SESSION</div>
          <h1>${esc(workout.title || 'Assigned Workout')}</h1>
          <div class="workout-meta-row">
            <span class="workout-chip workout-chip-green">${esc(sessionType)}</span>
            ${workout.sport ? `<span class="workout-chip">${esc(workout.sport)}</span>` : ''}
            <span class="workout-chip">${exercises.length} exercise${exercises.length === 1 ? '' : 's'}</span>
            <span class="workout-chip">~${esc(durationDefault)} min</span>
          </div>
        </div>
        <div class="workout-date-card">
          <span>Scheduled</span>
          <strong>${esc(scheduled)}</strong>
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
          ${exercises.length ? exercises.map((ex, i) => `
            <article class="exercise-card">
              <div class="exercise-number">${i + 1}</div>
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
            </article>
          `).join('') : '<div class="workout-empty-card">No exercises were included in this workout.</div>'}
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
            <label for="duration">Duration</label>
            <div class="input-with-unit">
              <input id="duration" type="number" min="1" max="300" value="${esc(durationDefault)}" />
              <span>min</span>
            </div>
          </div>

          <div class="workout-field">
            <label for="rpe">How hard was it?</label>
            <div class="input-with-unit">
              <input id="rpe" type="number" min="1" max="10" value="6" />
              <span>RPE / 10</span>
            </div>
          </div>

          <div class="workout-field workout-field-notes">
            <label for="notes">Session notes <span>optional</span></label>
            <textarea id="notes" rows="3" placeholder="How did you feel? Any pain, PRs, or adjustments?"></textarea>
          </div>
        </div>

        <div id="complete-status" role="status" class="workout-save-status"></div>
        <button class="workout-complete-btn" id="complete-btn">
          <span class="workout-complete-icon">✓</span>
          <span>Complete Workout</span>
        </button>
      </section>
    </div>
  `;
}

document.addEventListener('piq:viewRendered', (e) => {
  if (e.detail?.route !== ROUTES.PLAYER_TODAY) return;

  const btn = document.getElementById('complete-btn');
  if (!btn) return;

  btn.onclick = () => {
    const status = document.getElementById('complete-status');
    const duration = Number(document.getElementById('duration')?.value || 45);
    const rpe = Number(document.getElementById('rpe')?.value || 6);
    const notes = document.getElementById('notes')?.value || '';

    if (duration < 1 || duration > 300) {
      if (status) {
        status.textContent = 'Enter a duration between 1 and 300 minutes.';
        status.className = 'workout-save-status error';
      }
      return;
    }

    if (rpe < 1 || rpe > 10) {
      if (status) {
        status.textContent = 'RPE must be between 1 and 10.';
        status.className = 'workout-save-status error';
      }
      return;
    }

    const assignments = getAssignedWorkouts().filter(a => !a.completed);
    const workout = assignments[0];
    if (!workout) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="workout-complete-spinner"></span><span>Saving workout…</span>';

    const completed = completeAssignment(workout.id, {
      avgRPE: rpe,
      duration,
      notes
    });

    if (!completed) {
      if (status) {
        status.textContent = 'Could not find this workout. Refresh and try again.';
        status.className = 'workout-save-status error';
      }
      btn.disabled = false;
      btn.innerHTML = '<span class="workout-complete-icon">✓</span><span>Complete Workout</span>';
      return;
    }

    addWorkoutLog({
      name: workout.title,
      duration,
      avgRPE: rpe,
      notes,
      completed: true
    });

    if (status) {
      status.textContent = '✓ Workout completed. Your progress is updated.';
      status.className = 'workout-save-status success';
    }
    btn.innerHTML = '<span class="workout-complete-icon">✓</span><span>Workout Complete</span>';
    btn.classList.add('completed');

    setTimeout(() => navigate(ROUTES.PLAYER_HOME), 500);
  };
});
