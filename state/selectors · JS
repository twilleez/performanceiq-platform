/**
 * PerformanceIQ Selectors
 * Pure functions that derive computed values from state + auth.
 */

import { getState } from './state.js';
import { getCurrentRole, getCurrentUser, getSession } from '../core/auth.js';

// ── ROLE / DASHBOARD ─────────────────────────────────────────
export function getCurrentRoleSelector() {
  return getCurrentRole();
}

export function getDashboardConfig() {
  const role = getCurrentRole();
  const user = getCurrentUser();
  const configs = {
    coach:  { label: 'Coach',   navItems: coachNav(),   home: 'coach/home' },
    player: { label: 'Player',  navItems: playerNav(),  home: 'player/home' },
    parent: { label: 'Parent',  navItems: parentNav(),  home: 'parent/home' },
    admin:  { label: 'Admin',   navItems: adminNav(),   home: 'admin/home' },
    solo:   { label: 'Solo',    navItems: soloNav(),    home: 'solo/home' },
  };
  return configs[role] || configs.solo;
}

// ── SCORING SELECTORS ─────────────────────────────────────────
export function getWorkoutCount() {
  return getState().workoutLog.length;
}

export function getStreak() {
  const log = getState().workoutLog;
  if (!log.length) return 0;
  let streak = 0;
  const sorted = [...log].sort((a, b) => b.ts - a.ts);
  let current = new Date();
  for (const w of sorted) {
    const d = new Date(w.ts);
    if (d.toDateString() === current.toDateString()) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else break;
  }
  return streak;
}

export function getReadinessScore() {
  const log = getState().workoutLog;
  if (!log.length) return 82;
  const recent = log.slice(-5);
  const avgRPE = recent.reduce((s, w) => s + (w.avgRPE || 5), 0) / recent.length;
  const compliance = Math.min(100, (recent.filter(w => w.completed).length / 5) * 100);
  const base = Math.round(100 - (avgRPE * 4) + (compliance * 0.2));
  return Math.max(30, Math.min(99, base));
}

export function getPIQScore() {
  return getScoreBreakdown().total;
}

/**
 * PerformanceIQ Score Formula v1
 * Weighted composite of Training Consistency, Readiness Index,
 * Workout Compliance, and Load Management.
 */
export function getScoreBreakdown() {
  const log     = getState().workoutLog;
  const n       = log.length;
  const streak  = getStreak();
  const readiness = getReadinessScore();

  if (n === 0) {
    return {
      total:       72,
      consistency: { raw: 0,  weighted: 0,  weight: 0.35 },
      readiness:   { raw: 72, weighted: 25, weight: 0.30 },
      compliance:  { raw: 0,  weighted: 0,  weight: 0.25 },
      load:        { raw: 60, weighted: 6,  weight: 0.10 },
      tier:        'Getting Started',
    };
  }

  // Consistency: based on streak and total sessions (max 100)
  const consistencyRaw = Math.min(100, Math.round((streak * 8) + (n * 1.5)));

  // Compliance: pct of logged workouts marked completed
  const complianceRaw = Math.round(
    (log.filter(w => w.completed).length / Math.max(1, n)) * 100
  );

  // Load Management: based on avg RPE over last 7 sessions (ideal 6-7)
  const recent7  = log.slice(-7);
  const avgRPE7  = recent7.length
    ? recent7.reduce((s, w) => s + (w.avgRPE || 5), 0) / recent7.length
    : 5;
  const loadRaw  = Math.round(Math.max(0, 100 - Math.abs(avgRPE7 - 6.5) * 14));

  // Weighted total
  const total = Math.min(99, Math.max(30, Math.round(
    consistencyRaw * 0.35 +
    readiness      * 0.30 +
    complianceRaw  * 0.25 +
    loadRaw        * 0.10
  )));

  const tier =
    total >= 90 ? 'Elite' :
    total >= 80 ? 'Advanced' :
    total >= 70 ? 'Developing' :
    total >= 60 ? 'Building' :
                  'Getting Started';

  return {
    total,
    consistency: { raw: consistencyRaw, weighted: Math.round(consistencyRaw * .35), weight: 0.35 },
    readiness:   { raw: readiness,      weighted: Math.round(readiness * .30),      weight: 0.30 },
    compliance:  { raw: complianceRaw,  weighted: Math.round(complianceRaw * .25),  weight: 0.25 },
    load:        { raw: loadRaw,        weighted: Math.round(loadRaw * .10),         weight: 0.10 },
    tier,
  };
}

export function getReadinessRingOffset(score = getReadinessScore()) {
  // SVG circle r=46, circumference ≈ 289
  return Math.round(289 - (score / 100) * 289);
}

export function getReadinessColor(score = getReadinessScore()) {
  return score >= 80 ? '#22c955' : score >= 60 ? '#f59e0b' : '#ef4444';
}

export function getReadinessExplain(score = getReadinessScore()) {
  if (score >= 80) return 'Your body is primed — good sleep and load balance. Train hard today.';
  if (score >= 60) return 'Moderate readiness. A balanced intensity session is recommended.';
  return 'Low readiness detected. Prioritize recovery and mobility today.';
}

// ── NAV CONFIGS ───────────────────────────────────────────────
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
    { route: 'player/messages',  label: 'Messages',  icon: '💬' },
    { route: 'player/settings',  label: 'Settings',  icon: '⚙️' },
  ];
}

function parentNav() {
  return [
    { route: 'parent/home',     label: 'Dashboard', icon: '🏠' },
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
    { route: 'admin/home',       label: 'Overview',   icon: '🏠' },
    { route: 'admin/org',        label: 'Org',        icon: '🏫' },
    { route: 'admin/teams',      label: 'Teams',      icon: '👥' },
    { route: 'admin/coaches',    label: 'Coaches',    icon: '🎽' },
    { route: 'admin/athletes',   label: 'Athletes',   icon: '🏃' },
    { route: 'admin/adoption',   label: 'Adoption',   icon: '📊' },
    { route: 'admin/reports',    label: 'Reports',    icon: '📋' },
    { route: 'admin/billing',    label: 'Billing',    icon: '💳' },
    { route: 'admin/settings',   label: 'Settings',   icon: '⚙️' },
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
    { route: 'solo/goals',     label: 'Goals',     icon: '🎯' },
    { route: 'solo/settings',  label: 'Settings',  icon: '⚙️' },
  ];
}
