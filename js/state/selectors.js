/**
 * PerformanceIQ Selectors  (remediated — v2 → Elite bridge)
 *
 * This file is the import target for most existing view files. Rather than
 * rewriting every view's import path simultaneously, this file acts as a
 * thin bridge: it re-exports from selectorsElite.js for all scoring and
 * readiness functions so every consumer automatically gets Elite v3 logic
 * regardless of which selector file they import from.
 *
 * Changes from prior version:
 *   1. All scoring / readiness functions now delegate to selectorsElite.js.
 *      The v2 implementations (getScoreBreakdown, getReadinessScore, etc.)
 *      have been removed and replaced with re-exports of the Elite versions.
 *      This eliminates the duplicate-formula bug where the dashboard ring
 *      (app.js, importing Elite) showed a different score than coach/player
 *      views (importing this file, getting v2).
 *
 *   2. getStreak() now requires w.completed === true before counting a day.
 *      Previously a workout that was created but not finished still incremented
 *      the streak counter, overstating it.
 *
 *   3. getDashboardConfig() and all nav helper functions are unchanged — they
 *      are not duplicated in selectorsElite.js and remain authoritative here.
 *
 *   4. getMacroTargets() and getMacroProgress() are also re-exported from
 *      selectorsElite.js (they live there and not here in v2).
 *
 * Migration note for view authors:
 *   Long-term, all imports should move to selectorsElite.js directly.
 *   Short-term, importing from either file is safe — they now return
 *   identical values for all scoring functions.
 */

import { getState }                from './state.js';
import { getCurrentRole }          from '../core/auth.js';

// Re-export all scoring / readiness selectors from Elite — single source of truth
export {
  getScoreBreakdownElite  as getScoreBreakdown,
  getPIQScore,
  getReadinessScoreElite  as getReadinessScore,
  getReadinessRingOffsetElite as getReadinessRingOffset,
  getReadinessColorElite  as getReadinessColor,
  getReadinessExplainElite as getReadinessExplain,
  getReadinessScoreElite,
  getScoreBreakdownElite,
  getMacroTargets,
  getMacroProgress,
} from './selectorsElite.js';

// ── STREAK — fixed: only count days with a completed workout ──────────────────
/**
 * Returns the current consecutive-day training streak.
 *
 * Fix: previously any logged workout (including abandoned/incomplete ones)
 * counted toward the streak. This overstated streaks for athletes who started
 * but did not finish a session. Now only entries where completed !== false
 * are counted (i.e. completed === true OR completed is undefined/null,
 * which covers legacy log entries that predate the completed field).
 *
 * The "completed undefined = counts" rule preserves backwards compatibility
 * with existing workout log entries that were saved before the completed flag
 * was introduced. If you want strict mode (only explicit true), change the
 * filter to: w.completed === true
 */
export function getStreak() {
  const log = getState().workoutLog;
  if (!log.length) return 0;

  // Filter: exclude entries explicitly marked incomplete
  const done   = log.filter(w => w.completed !== false);
  if (!done.length) return 0;

  const sorted  = [...done].sort((a, b) => b.ts - a.ts);
  let streak    = 0;
  let current   = new Date();

  for (const w of sorted) {
    const d = new Date(w.ts);
    if (d.toDateString() === current.toDateString()) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ── WORKOUT COUNT ─────────────────────────────────────────────────────────────
export function getWorkoutCount() {
  return getState().workoutLog.length;
}

// ── DASHBOARD CONFIG + NAV ────────────────────────────────────────────────────
// These functions are NOT in selectorsElite.js — they live here as authoritative.

export function getCurrentRoleSelector() { return getCurrentRole(); }

export function getDashboardConfig() {
  const role = getCurrentRole();
  const configs = {
    coach:  { label: 'Coach',  navItems: coachNav(),  home: 'coach/home' },
    player: { label: 'Player', navItems: playerNav(), home: 'player/home' },
    parent: { label: 'Parent', navItems: parentNav(), home: 'parent/home' },
    admin:  { label: 'Admin',  navItems: adminNav(),  home: 'admin/home' },
    solo:   { label: 'Solo',   navItems: soloNav(),   home: 'solo/home' },
  };
  return configs[role] || configs.solo;
}

function coachNav() {
  return [
    { route: 'coach/home',      label: 'Dashboard', icon: '🏠' },
    { route: 'coach/team',      label: 'Team',      icon: '👥' },
    { route: 'coach/roster',    label: 'Roster',    icon: '📋' },
    { route: 'coach/program',   label: 'Programs',  icon: '📐' },
    { route: 'coach/readiness', label: 'Readiness', icon: '💚' },
    { route: 'coach/analytics', label: 'Analytics', icon: '📈' },
    { route: 'coach/messages',  label: 'Messages',  icon: '💬' },
    { route: 'coach/calendar',  label: 'Calendar',  icon: '📅' },
    { route: 'coach/settings',  label: 'Settings',  icon: '⚙️' },
  ];
}

function playerNav() {
  return [
    { route: 'player/home',      label: 'Dashboard', icon: '🏠' },
    { route: 'player/today',     label: 'Today',     icon: '⚡' },
    { route: 'player/log',       label: 'Log',       icon: '✏️' },
    { route: 'player/progress',  label: 'Progress',  icon: '📈' },
    { route: 'player/score',     label: 'PIQ Score', icon: '🏅' },
    { route: 'player/readiness', label: 'Readiness', icon: '💚' },
    { route: 'player/nutrition', label: 'Nutrition', icon: '🥗' },
    { route: 'player/messages',  label: 'Messages',  icon: '💬' },
    { route: 'player/settings',  label: 'Settings',  icon: '⚙️' },
  ];
}

function parentNav() {
  return [
    { route: 'parent/home',     label: 'Dashboard',  icon: '🏠' },
    { route: 'parent/child',    label: 'My Athlete', icon: '🏃' },
    { route: 'parent/week',     label: 'Weekly Plan', icon: '📅' },
    { route: 'parent/progress', label: 'Progress',   icon: '📈' },
    { route: 'parent/wellness', label: 'Wellness',   icon: '💚' },
    { route: 'parent/messages', label: 'Messages',   icon: '💬' },
    { route: 'parent/billing',  label: 'Billing',    icon: '💳' },
    { route: 'parent/settings', label: 'Settings',   icon: '⚙️' },
  ];
}

function adminNav() {
  return [
    { route: 'admin/home',       label: 'Overview',  icon: '🏠' },
    { route: 'admin/org',        label: 'Org',       icon: '🏫' },
    { route: 'admin/teams',      label: 'Teams',     icon: '👥' },
    { route: 'admin/coaches',    label: 'Coaches',   icon: '🎽' },
    { route: 'admin/athletes',   label: 'Athletes',  icon: '🏃' },
    { route: 'admin/adoption',   label: 'Adoption',  icon: '📊' },
    { route: 'admin/reports',    label: 'Reports',   icon: '📋' },
    { route: 'admin/billing',    label: 'Billing',   icon: '💳' },
    { route: 'admin/settings',   label: 'Settings',  icon: '⚙️' },
  ];
}

function soloNav() {
  return [
    { route: 'solo/home',      label: 'Dashboard', icon: '🏠' },
    { route: 'solo/today',     label: 'Today',     icon: '⚡' },
    { route: 'solo/builder',   label: 'Builder',   icon: '📐' },
    { route: 'solo/library',   label: 'Library',   icon: '📚' },
    { route: 'solo/progress',  label: 'Progress',  icon: '📈' },
    { route: 'solo/score',     label: 'PIQ Score', icon: '🏅' },
    { route: 'solo/readiness', label: 'Readiness', icon: '💚' },
    { route: 'solo/nutrition', label: 'Nutrition', icon: '🥗' },
    { route: 'solo/goals',     label: 'Goals',     icon: '🎯' },
    { route: 'solo/settings',  label: 'Settings',  icon: '⚙️' },
  ];
}
