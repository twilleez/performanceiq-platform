/**
 * PerformanceIQ — Today Workout (Elite Engine)
 * Handles:
 * - Assigned workouts
 * - Logging
 * - Completion → ACWR
 */

import {
  getAssignedWorkouts,
  completeAssignment,
  addWorkoutLog
} from '../../state/state.js';

import { navigate, ROUTES } from '../../router.js';

export function renderPlayerToday() {
  const assignments = getAssignedWorkouts().filter(a => !a.completed);
  const workout = assignments[0];

  if (!workout) {
    return `
      <div class="piq-view">
        <div class="empty-state">
          <div>No workout assigned</div>
          <button class="btn" data-route="${ROUTES.PLAYER_HOME}">
            Back to Dashboard
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="piq-view">

      <div class="card">
        <div class="card-title">${workout.title}</div>
        <div class="card-sub">${workout.sessionType}</div>
      </div>

      <div class="card">
        <div class="card-title">Exercises</div>

        ${workout.exercises.map((ex, i) => `
          <div class="exercise">
            <div>${i + 1}. ${ex.name || ex.title}</div>
            <div class="muted">${ex.sets || 3} x ${ex.reps || '8-10'}</div>
          </div>
        `).join('')}
      </div>

      <!-- LOGGING -->
      <div class="card">
        <div class="card-title">Log Session</div>

        <label>Duration (minutes)</label>
        <input id="duration" type="number" value="45" />

        <label>RPE (1–10)</label>
        <input id="rpe" type="number" value="6" />

        <label>Notes</label>
        <textarea id="notes"></textarea>

        <button class="btn primary" id="complete-btn">
          Complete Workout
        </button>
      </div>

    </div>
  `;
}

/**
 * EVENT BINDING (Fix 1 compliant)
 */
document.addEventListener('piq:viewRendered', (e) => {
  if (e.detail?.route !== ROUTES.PLAYER_TODAY) return;

  const btn = document.getElementById('complete-btn');
  if (!btn) return;

  btn.onclick = () => {
    const duration = parseInt(document.getElementById('duration').value || 45);
    const rpe = parseInt(document.getElementById('rpe').value || 6);
    const notes = document.getElementById('notes').value || '';

    const assignments = getAssignedWorkouts().filter(a => !a.completed);
    const workout = assignments[0];

    if (!workout) return;

    // ✅ COMPLETE ASSIGNMENT → feeds ACWR automatically
    completeAssignment(workout.id, {
      avgRPE: rpe,
      duration,
      notes
    });

    // fallback log (extra safety)
    addWorkoutLog({
      name: workout.title,
      duration,
      avgRPE: rpe,
      notes
    });

    navigate(ROUTES.PLAYER_HOME);
  };
});
