/**
 * PerformanceIQ Selectors  (remediated — v2 → Elite bridge)
 *
 * This file is the import target for most existing view files.
 * It re-exports all scoring/readiness functions from selectorsElite.js
 * so every consumer gets Elite v3 logic regardless of which file they import.
 *
 * Exported functions added in this remediation pass:
 *
 *   getMindsetScore()    — athleteProfile.mindsetScore (0–10)
 *   getHydrationOz()     — athleteProfile.hydrationOz (fl oz)
 *   getPliabilityDone()  — athleteProfile.pliabilityDone (bool)
 *   getWeeklyProgress()  — { completed, target, pct, onTrack, daysLeft }
 *                          Used by solo/home.js weekly ring widget.
 *
 * getWeeklyProgress() shape (all fields the deployed view uses):
 *   completed  {number}  sessions logged this calendar week (Mon–Sun)
 *   target     {number}  athlete's daysPerWeek goal from profile
 *   pct        {number}  0–100 completion percentage
 *   onTrack    {boolean} true when pace will hit target by week end
 *   daysLeft   {number}  calendar days remaining in the week (0–6)
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
 * Excludes entries where completed === false (abandoned sessions).
 * Legacy entries without the completed field still count.
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

/**
 * Mindset score for today (0–10 scale).
 * Set by the athlete during their daily check-in.
 * Returns 0 when not yet recorded.
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

// ── WEEKLY PROGRESS ────────────────────────────────────────────────────────────
/**
 * Weekly training progress against the athlete's session target.
 *
 * Used by the solo/home.js ring widget. Returns all fields the view uses:
 *   completed  — sessions logged this Mon–Sun calendar week
 *   target     — daysPerWeek goal from athleteProfile (default 4)
 *   pct        — completion percentage clamped 0–100
 *   onTrack    — true when current pace will reach target by Sunday
 *   daysLeft   — calendar days remaining until end of week (Sun = 0)
 *
 * "Completed" counts only sessions not explicitly marked incomplete,
 * consistent with getStreak() behaviour.
 */
export function getWeeklyProgress() {
  const log     = getState().workoutLog;
  const profile = getState().athleteProfile;
  const target  = Math.max(1, parseInt(profile?.daysPerWeek) || 4);

  // Monday-anchored week boundaries
  const now       = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon … 6 = Sat
  const monday    = new Date(now);
  // Shift: Sunday (0) → go back 6 days; Mon (1) → 0; Tue (2) → 1 …
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Count completed sessions this week
  const completed = log.filter(w =>
    w.completed !== false &&
    w.ts >= monday.getTime() &&
    w.ts <= sunday.getTime()
  ).length;

  const pct = Math.min(100, Math.round((completed / target) * 100));

  // Days left until Sunday (inclusive of today if not yet Sunday)
  const daysLeft = Math.max(0, 6 - ((dayOfWeek + 6) % 7));

  // On track: if we complete the same number of sessions per remaining day,
  // will we hit the target?
  const daysElapsed = 7 - daysLeft;
  const projectedTotal = daysElapsed > 0
    ? Math.round((completed / daysElapsed) * 7)
    : 0;
  const onTrack = projectedTotal >= target || completed >= target;

  return { completed, target, pct, onTrack, daysLeft };
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
