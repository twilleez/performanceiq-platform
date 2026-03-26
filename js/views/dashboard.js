/**
 * PerformanceIQ — Player Dashboard (Elite)
 * Fully wired, state-driven, Today-first UX
 */

import {
  getState,
  getWeeklyGoal,
  getAssignedWorkouts,
  getWorkoutLog,
  getReadinessCheckIn
} from '../../state/state.js';

import { navigate, ROUTES } from '../../router.js';

export function renderPlayerHome() {
  const state = getState();
  const weekly = getWeeklyGoal();
  const readiness = getReadinessCheckIn();

  const assignments = getAssignedWorkouts().filter(a => !a.completed);
  const nextWorkout = assignments[0];

  const completed = weekly.completedThisWeek || 0;
  const target = weekly.targetSessions || 4;
  const progressPct = Math.min(100, (completed / target) * 100);

  const readinessScore = readiness.quickScore || 6;

  return `
    <div class="piq-view">

      <!-- HERO -->
      <div class="card hero">
        <div class="hero-left">
          <div class="hero-title">Today</div>
          <div class="hero-sub">
            ${nextWorkout ? nextWorkout.title : 'No session assigned'}
          </div>
        </div>

        <div class="hero-actions">
          ${
            nextWorkout
              ? `<button class="btn primary" data-route="${ROUTES.PLAYER_TODAY}">Start Workout</button>`
              : `<button class="btn" data-route="${ROUTES.PLAYER_BUILDER || ROUTES.PLAYER_TODAY}">Build Session</button>`
          }
        </div>
      </div>

      <!-- READINESS -->
      <div class="card">
        <div class="card-title">Readiness</div>
        <div class="readiness-score">${readinessScore}/10</div>

        <button class="btn small" data-route="${ROUTES.PLAYER_READINESS}">
          Update Check-In
        </button>
      </div>

      <!-- WEEKLY PROGRESS -->
      <div class="card">
        <div class="card-title">Weekly Progress</div>

        <div class="progress-bar">
          <div class="progress-fill" style="width:${progressPct}%"></div>
        </div>

        <div class="progress-text">
          ${completed} / ${target} sessions
        </div>
      </div>

      <!-- QUICK ACTIONS -->
      <div class="grid-2">
        <button class="card action" data-route="${ROUTES.PLAYER_LOG}">
          Log Workout
        </button>

        <button class="card action" data-route="${ROUTES.PLAYER_PROGRESS}">
          View Progress
        </button>

        <button class="card action" data-route="${ROUTES.PLAYER_SCORE}">
          PIQ Score
        </button>

        <button class="card action" data-route="${ROUTES.PLAYER_MESSAGES}">
          Messages
        </button>
      </div>

    </div>
  `;
}
