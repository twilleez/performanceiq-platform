/**
 * PerformanceIQ Selectors  (remediated — v2 → Elite bridge)
 *
 * This file is the import target for most existing view files.
 * It re-exports all scoring/readiness functions from selectorsElite.js
 * so every consumer gets Elite v3 logic regardless of which selector
 * file they import from.
 *
 * Changes from prior version:
 *   1. getMindsetScore() added — deployed solo/home.js imports this;
 *      it was never implemented, causing a hard crash on solo/home load.
 *      Reads athleteProfile.mindsetScore (0–10 scale stored in state).
 *
 *   2. getHydrationOz() added — reads athleteProfile.hydrationOz.
 *      Present in the same deployed view import block.
 *
 *   3. getPliabilityDone() added — reads athleteProfile.pliabilityDone.
 *      Present in the same deployed view import block.
 *
 *   4. All scoring/readiness re-exports from selectorsElite.js retained.
 *
 *   5. getStreak() fixed: excludes w.completed === false entries.
 *
 *   6. getDashboardConfig() and nav helpers remain authoritative here.
 */

import { getState }       from './state.js';
import { getCurrentRole } from '../core/auth.js';

// ── RE-EXPORTS FROM ELITE — single source of truth for scoring ────────────────
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

// ── STREAK ─────────────────────────────────────────────────────────────────────
/**
 * Consecutive training streak in days.
 * Fix: entries with completed === false are excluded (abandoned sessions
 * should not count). Legacy entries without the field still count.
 */
export function getStreak() {
  const log  = getState().workoutLog;
  if (!log.length) return 0;
  const done = log.filter(w => w.completed !== false);
  if (!done.length) return 0;
  const sorted  = [...done].sort((a, b) => b.ts - a.ts);
  let streak    = 0;
  let current   = new Date();
  for (const w of sorted) {
    const d = new Date(w.ts);
    if (d.toDateString() === current.toDateString()) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else break;
  }
  return streak;
}

// ── WORKOUT COUNT ──────────────────────────────────────────────────────────────
export function getWorkoutCount() {
  return getState().workoutLog.length;
}

// ── MINDSET / DAILY WELLNESS SELECTORS ────────────────────────────────────────
// These read from athleteProfile which stores today's wellness inputs.
// They were imported by deployed view files but never exported from selectors.js,
// causing SyntaxError crashes when those views loaded.

/**
 * Mindset score for today (0–10 scale).
 * Set by the athlete during their daily check-in / readiness submission.
 * Returns 0 when not yet set today.
 */
export function getMindsetScore() {
  return getState().athleteProfile?.mindsetScore ?? 0;
}

/**
 * Hydration logged today in fluid ounces.
 * Returns 0 when not yet set.
 */
export function getHydrationOz() {
  return getState().athleteProfile?.hydrationOz ?? 0;
}

/**
 * Whether pliability/mobility work has been marked done today.
 * Returns false when not yet set.
 */
export function getPliabilityDone() {
  return getState().athleteProfile?.pliabilityDone ?? false;
}

// ── DASHBOARD CONFIG + NAV ────────────────────────────────────────────────────
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
    { route: 'parent/home',     label: 'Dashboard',   icon: '🏠' },
    { route: 'parent/child',    label: 'My Athlete',  icon: '🏃' },
    { route: 'parent/week',     label: 'Weekly Plan', icon: '📅' },
    { route: 'parent/progress', label: 'Progress',    icon: '📈' },
    { route: 'parent/wellness', label: 'Wellness',    icon: '💚' },
    { route: 'parent/messages', label: 'Messages',    icon: '💬' },
    { route: 'parent/billing',  label: 'Billing',     icon: '💳' },
    { route: 'parent/settings', label: 'Settings',    icon: '⚙️' },
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
