/**
 * PerformanceIQ Selectors  (remediated — v2 → Elite bridge)
 *
 * All scoring/readiness re-exported from selectorsElite.js.
 * This file adds missing exports that deployed view files import
 * but were never implemented. Each pass adds the next batch.
 *
 * Exports added in this pass:
 *   getACWRSeries()      — 28-day ACWR time series for chart views
 *                          (solo/progress, solo/score)
 *   getNutritionResult() — composite nutrition summary for solo/nutrition
 *
 * Previously added:
 *   getWeeklyProgress()  — weekly session ring widget
 *   getMindsetScore()    — athleteProfile.mindsetScore
 *   getHydrationOz()     — athleteProfile.hydrationOz
 *   getPliabilityDone()  — athleteProfile.pliabilityDone
 */

import { getState }       from './state.js';
import { getCurrentRole } from '../core/auth.js';

// ── RE-EXPORTS FROM ELITE ─────────────────────────────────────────────────────
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

// ── STREAK ────────────────────────────────────────────────────────────────────
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

export function getWorkoutCount() {
  return getState().workoutLog.length;
}

// ── MINDSET / DAILY WELLNESS ──────────────────────────────────────────────────
export function getMindsetScore()   { return getState().athleteProfile?.mindsetScore  ?? 0; }
export function getHydrationOz()    { return getState().athleteProfile?.hydrationOz   ?? 0; }
export function getPliabilityDone() { return getState().athleteProfile?.pliabilityDone ?? false; }

// ── WEEKLY PROGRESS ───────────────────────────────────────────────────────────
/**
 * Weekly training progress against the athlete's session target.
 * Returns: { completed, target, pct, onTrack, daysLeft }
 */
export function getWeeklyProgress() {
  const log     = getState().workoutLog;
  const profile = getState().athleteProfile;
  const target  = Math.max(1, parseInt(profile?.daysPerWeek) || 4);

  const now       = new Date();
  const dayOfWeek = now.getDay();
  const monday    = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const completed = log.filter(w =>
    w.completed !== false &&
    w.ts >= monday.getTime() &&
    w.ts <= sunday.getTime()
  ).length;

  const pct      = Math.min(100, Math.round((completed / target) * 100));
  const daysLeft = Math.max(0, 6 - ((dayOfWeek + 6) % 7));
  const daysElapsed = 7 - daysLeft;
  const projected   = daysElapsed > 0 ? Math.round((completed / daysElapsed) * 7) : 0;
  const onTrack     = projected >= target || completed >= target;

  return { completed, target, pct, onTrack, daysLeft };
}

// ── ACWR SERIES ───────────────────────────────────────────────────────────────
/**
 * Returns a 28-day rolling ACWR (Acute:Chronic Workload Ratio) time series
 * for use in progress and score charts.
 *
 * Each data point: { date: string, acwr: number, zone: string, load: number }
 *   date  — 'Mon DD' label
 *   acwr  — ratio value (acute 7-day EWMA / chronic 28-day EWMA)
 *   zone  — 'sweet-spot' | 'spike' | 'danger' | 'undertraining' | 'no-data'
 *   load  — sRPE for that day (RPE × duration in hours)
 *
 * Algorithm: Gabbett 2016 (BJSM) EWMA approach.
 *   Acute λ  = 2/(7+1)  = 0.25
 *   Chronic λ = 2/(28+1) = 0.069
 *
 * Returns empty array when fewer than 3 sessions are logged.
 */
export function getACWRSeries() {
  const log = getState().workoutLog;
  if (log.length < 3) return [];

  const LAMBDA_A = 2 / 8;   // acute 7-day
  const LAMBDA_C = 2 / 29;  // chronic 28-day

  // Build a daily load map over the last 28 days
  const now     = Date.now();
  const DAY_MS  = 86_400_000;
  const days    = 28;

  // sRPE = RPE × duration (hours) — Foster et al. 2001
  const sRPE = w => (w.avgRPE || 5) * ((w.duration || 45) / 60);

  // Aggregate load per calendar day
  const dailyLoad = new Array(days).fill(0);
  log.forEach(w => {
    const daysAgo = Math.floor((now - w.ts) / DAY_MS);
    if (daysAgo >= 0 && daysAgo < days) {
      dailyLoad[days - 1 - daysAgo] += sRPE(w);
    }
  });

  // Walk through each day computing EWMA acute and chronic
  let ewmaA = 0;
  let ewmaC = 0;
  const series = [];

  for (let i = 0; i < days; i++) {
    const load = dailyLoad[i];
    ewmaA = LAMBDA_A * load + (1 - LAMBDA_A) * ewmaA;
    ewmaC = LAMBDA_C * load + (1 - LAMBDA_C) * ewmaC;

    const acwr = ewmaC > 0 ? ewmaA / ewmaC : 1.0;
    const zone =
      acwr > 1.50 ? 'danger'       :
      acwr > 1.30 ? 'spike'        :
      acwr >= 0.80 ? 'sweet-spot'  :
      acwr >= 0.60 ? 'undertraining' :
      i < 7       ? 'no-data'      : 'undertraining';

    // Only emit points from day 7 onward (EWMA needs warmup)
    if (i >= 6) {
      const d = new Date(now - (days - 1 - i) * DAY_MS);
      series.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
        acwr: Math.round(acwr * 100) / 100,
        zone,
        load: Math.round(load * 10) / 10,
      });
    }
  }

  return series;
}

// ── NUTRITION RESULT ──────────────────────────────────────────────────────────
/**
 * Composite nutrition summary for the nutrition view.
 *
 * Returns: {
 *   targets     — { cal, pro, cho, fat } from profile
 *   current     — { cal, pro, cho, fat } logged today
 *   progress    — { cal, pro, cho, fat } each with { current, target, pct }
 *   hydration   — { oz, target, pct }
 *   meals       — meal log array
 *   mealCount   — number of meals logged today
 *   calRemaining — kcal remaining to target
 *   proRemaining — protein g remaining
 *   onTrack     — true when calorie progress >= 40% by midday or >= 70% by evening
 * }
 *
 * Views importing getNutritionResult can destructure exactly what they need.
 */
export function getNutritionResult() {
  const state   = getState();
  const profile = state.athleteProfile;
  const nutrition = state.nutrition;

  const targets = (() => {
    const t = nutrition.targetMacros;
    if (t && t.cal > 0) return t;
    return { cal: 2800, pro: 160, cho: 350, fat: 80 };
  })();

  const current = nutrition.macros || { cal: 0, pro: 0, cho: 0, fat: 0 };

  const pct = k => Math.min(100, current[k] > 0 && targets[k] > 0
    ? Math.round((current[k] / targets[k]) * 100)
    : 0);

  const progress = {
    cal: { current: current.cal, target: targets.cal, pct: pct('cal') },
    pro: { current: current.pro, target: targets.pro, pct: pct('pro') },
    cho: { current: current.cho, target: targets.cho, pct: pct('cho') },
    fat: { current: current.fat, target: targets.fat, pct: pct('fat') },
  };

  // Hydration: target = bodyweight (lbs) × 0.5 oz, minimum 64 oz
  const weightLbs  = parseFloat(profile?.weightLbs) || 160;
  const hydTarget  = Math.max(64, Math.round(weightLbs * 0.5));
  const hydCurrent = profile?.hydrationOz ?? 0;

  const calRemaining = Math.max(0, targets.cal - current.cal);
  const proRemaining = Math.max(0, targets.pro - current.pro);

  const hour    = new Date().getHours();
  const onTrack = hour < 12
    ? progress.cal.pct >= 30
    : hour < 17
      ? progress.cal.pct >= 50
      : progress.cal.pct >= 70;

  return {
    targets,
    current,
    progress,
    hydration: {
      oz:     hydCurrent,
      target: hydTarget,
      pct:    Math.min(100, Math.round((hydCurrent / hydTarget) * 100)),
    },
    meals:        nutrition.meals || [],
    mealCount:    (nutrition.meals || []).length,
    calRemaining,
    proRemaining,
    onTrack,
  };
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
