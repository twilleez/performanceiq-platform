/**
 * PerformanceIQ Selectors v5
 * ─────────────────────────────────────────────────────────────
 * PHASE 2 UPGRADES:
 *
 *   getCheckInHistory()  — last 30 check-in records for trend charts
 *   getReadinessTrend()  — 30-day readiness score array (for sparklines)
 *   getPIQTrend()        — 30-day PIQ history array
 *   getACWRSeries()      — 28-day ACWR values for the analytics chart,
 *                          computed from real workout log sRPE data
 *   getLoadSeries()      — 28-day sRPE total per day for load charts
 *
 * All phase 1 exports preserved unchanged.
 */
import { getState } from './state.js';
import { getCurrentRole, getCurrentUser }              from '../core/auth.js';
import { calcReadiness, calcPIQ, calcNutrition, calcMindset, sRPE } from '../services/engines.js';

// ── EWMA helpers (mirrors engines.js but local for selector use) ──
const LAMBDA_A = 2 / (7  + 1);
const LAMBDA_C = 2 / (28 + 1);

function _withinDays(arr, n, now = Date.now()) {
  const cutoff = now - n * 86_400_000;
  return arr.filter(e => {
    const t = e.ts || (e.date ? new Date(e.date).getTime() : 0);
    return t >= cutoff;
  });
}

function _byDate(arr) {
  return [...arr].sort((a, b) => {
    const ta = a.ts || (a.date ? new Date(a.date).getTime() : 0);
    const tb = b.ts || (b.date ? new Date(b.date).getTime() : 0);
    return ta - tb;
  });
}

function _ewma(arr, field, lambda) {
  if (!arr.length) return 0;
  let v = arr[0][field] || 0;
  for (let i = 1; i < arr.length; i++) v = lambda * (arr[i][field] || 0) + (1 - lambda) * v;
  return v;
}

// ── READINESS ─────────────────────────────────────────────────

export function getReadinessScore() {
  return calcReadiness(getState()).score;
}

export function getReadinessResult() {
  return calcReadiness(getState());
}

export function getReadinessColor(score) {
  if (score === undefined) score = getReadinessScore();
  return score >= 80 ? '#22c955' : score >= 60 ? '#f59e0b' : '#ef4444';
}

export function getReadinessLabel(score) {
  if (score === undefined) score = getReadinessScore();
  return calcReadiness(getState()).label ||
    (score >= 85 ? 'Peak — push hard today.'
   : score >= 70 ? 'High — train hard.'
   : score >= 55 ? 'Moderate — reduce ~20%.'
   : 'Low — active recovery.');
}

export function getReadinessExplain(score) {
  if (score === undefined) score = getReadinessScore();
  if (score >= 85) return 'Train at full intensity today. Your body is fully primed.';
  if (score >= 70) return 'Train hard. Minor adjustments may help.';
  if (score >= 55) return 'Reduce volume ~20%. Quality over quantity.';
  return 'Active recovery only. Rest is training.';
}

export function getReadinessRingOffset(score) {
  if (score === undefined) score = getReadinessScore();
  return 289 - (score / 100) * 289;
}

// ── PIQ SCORE ─────────────────────────────────────────────────

export function getPIQScore() {
  return getScoreBreakdown().total;
}

export function getScoreBreakdown() {
  return calcPIQ(getState());
}

// ── STREAK / COUNT ────────────────────────────────────────────

export function getWorkoutCount() { return getState().workoutLog.length; }

export function getStreak() {
  const log = getState().workoutLog;
  if (!log.length) return 0;
  let streak = 0, current = new Date();
  for (const w of [...log].sort((a, b) => (b.ts||0) - (a.ts||0))) {
    const d = new Date(w.ts || w.date);
    if (d.toDateString() === current.toDateString()) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else break;
  }
  return streak;
}

// ── NUTRITION ─────────────────────────────────────────────────

export function getMacroTargets() {
  const state   = getState();
  const profile = state.athleteProfile || {};
  if (profile.weightLbs && parseFloat(profile.weightLbs) > 0) {
    const r = calcNutrition(state);
    return { cal: r.cal, pro: r.pro, cho: r.cho, fat: r.fat };
  }
  const t = state.nutrition?.targetMacros;
  if (t && t.cal > 0) return t;
  return { cal: 2800, pro: 160, cho: 350, fat: 80 };
}

export function getMacroProgress() {
  const c = getState().nutrition?.macros || { cal:0, pro:0, cho:0, fat:0 };
  const t = getMacroTargets();
  const pct = (v, m) => Math.min(100, m > 0 ? Math.round((v / m) * 100) : 0);
  return {
    cal: { current: c.cal, target: t.cal, pct: pct(c.cal, t.cal) },
    pro: { current: c.pro, target: t.pro, pct: pct(c.pro, t.pro) },
    cho: { current: c.cho, target: t.cho, pct: pct(c.cho, t.cho) },
    fat: { current: c.fat, target: t.fat, pct: pct(c.fat, t.fat) },
  };
}

export function getNutritionResult() {
  return calcNutrition(getState());
}

// ── PHASE 2: TREND / HISTORY SELECTORS ───────────────────────

/**
 * Last N check-in records from history, newest-last.
 * Falls back to current check-in if history is empty.
 */
export function getCheckInHistory(days = 30) {
  const hist = _getRawCheckInHistory();
  const now  = Date.now();
  const cutoff = now - days * 86_400_000;
  return hist
    .filter(h => (h.ts || 0) >= cutoff)
    .sort((a, b) => (a.ts||0) - (b.ts||0));
}

function _getRawCheckInHistory() {
  const stored = getState().checkInHistory || [];
  if (stored.length > 0) return stored;
  // Bootstrap: if no history yet, seed with current check-in
  const ci = getState().readinessCheckIn;
  if (ci.date && ci.sleepQuality > 0) {
    return [{ ...ci, ts: ci.ts || Date.now() }];
  }
  return [];
}

/**
 * 30-day readiness score series for sparkline/trend charts.
 * Returns array of { date, score, color } objects, newest last.
 * Uses stored piqHistory if available, otherwise derives from check-in history.
 */
export function getReadinessTrend(days = 30) {
  const piqHist = getState().piqHistory || [];
  if (piqHist.length > 0) {
    const cutoff = Date.now() - days * 86_400_000;
    return _byDate(piqHist.filter(h => (h.ts||0) >= cutoff)).map(h => ({
      date:  h.date,
      ts:    h.ts,
      score: h.readiness || 0,
      color: h.readiness >= 80 ? '#22c955' : h.readiness >= 60 ? '#f59e0b' : '#ef4444',
    }));
  }
  // Derive from check-in history
  return _getRawCheckInHistory()
    .slice(-days)
    .map(h => {
      const score = _readinessFromCheckIn(h);
      return { date: h.date, ts: h.ts, score, color: score >= 80 ? '#22c955' : score >= 60 ? '#f59e0b' : '#ef4444' };
    });
}

function _readinessFromCheckIn(ci) {
  if (!ci || !ci.sleepQuality) return 60;
  const sleep   = (ci.sleepQuality / 5) * 100;
  const energy  = (ci.energyLevel  / 5) * 100;
  const sor     = ((6 - (ci.soreness    || 3)) / 5) * 100;
  const fatigue = ((6 - (ci.fatigueLevel || 3)) / 5) * 100;
  const stress  = ((6 - (ci.stressLevel  || 3)) / 5) * 100;
  const mood    = (ci.mood / 5) * 100;
  return Math.max(30, Math.min(99, Math.round(
    sleep * .30 + energy * .15 + sor * .20 + fatigue * .15 + stress * .10 + mood * .10
  )));
}

/**
 * 30-day PIQ score series for trend charts.
 * Returns array of { date, score } objects, newest last.
 */
export function getPIQTrend(days = 30) {
  const piqHist = getState().piqHistory || [];
  if (piqHist.length > 0) {
    const cutoff = Date.now() - days * 86_400_000;
    return _byDate(piqHist.filter(h => (h.ts||0) >= cutoff)).map(h => ({
      date:  h.date,
      ts:    h.ts,
      score: h.piq || 0,
    }));
  }
  return [];
}

/**
 * 28-day ACWR time series from real workout log sRPE.
 * Returns array of { date, acwr, zone } objects, newest last.
 * Requires ≥3 log entries to produce meaningful values.
 *
 * This is what the coach analytics chart reads — not seeded values.
 */
export function getACWRSeries(days = 28) {
  const log    = _byDate(getState().workoutLog || []);
  const loaded = log.map(e => ({ ...e, load: sRPE(e) }));
  const now    = Date.now();
  const series = [];

  // Compute ACWR for each of the last `days` days
  for (let d = days - 1; d >= 0; d--) {
    const dayEnd   = now - d * 86_400_000;
    const dayStart = dayEnd - 86_400_000;
    const date     = new Date(dayEnd).toLocaleDateString('en-US', { month:'short', day:'numeric' });

    const r7  = loaded.filter(e => (e.ts||0) <= dayEnd && (e.ts||0) > dayEnd - 7  * 86_400_000);
    const r28 = loaded.filter(e => (e.ts||0) <= dayEnd && (e.ts||0) > dayEnd - 28 * 86_400_000);

    if (r28.length < 2) {
      series.push({ date, acwr: null, zone: 'no-data' });
      continue;
    }

    const acute   = _ewma(r7,  'load', LAMBDA_A);
    const chronic = _ewma(r28, 'load', LAMBDA_C);
    const acwr    = chronic > 0 ? +(acute / chronic).toFixed(2) : null;

    const zone = !acwr            ? 'no-data'
      : acwr > 1.50               ? 'danger'
      : acwr > 1.30               ? 'spike'
      : acwr >= 0.80              ? 'sweet-spot'
      : acwr >= 0.60              ? 'undertraining'
      : 'detraining';

    series.push({ date, acwr, zone });
  }

  return series;
}

/**
 * 28-day daily sRPE load series (raw training load per day).
 * Returns array of { date, load } objects, newest last.
 * Used for load bar charts in analytics views.
 */
export function getLoadSeries(days = 28) {
  const log = getState().workoutLog || [];
  const now = Date.now();
  const series = [];

  for (let d = days - 1; d >= 0; d--) {
    const dayEnd  = now - d * 86_400_000;
    const date    = new Date(dayEnd).toLocaleDateString('en-US', { month:'short', day:'numeric' });
    const entries = log.filter(e => {
      const t = e.ts || 0;
      return t <= dayEnd && t > dayEnd - 86_400_000;
    });
    const load = entries.reduce((s, e) => s + (e.sRPE || sRPE(e)), 0);
    series.push({ date, load });
  }

  return series;
}

// ── ROLE / DASHBOARD CONFIG ───────────────────────────────────

export function getCurrentRoleSelector() { return getCurrentRole(); }

export function getDashboardConfig() {
  const role = getCurrentRole();
  const configs = {
    coach:  { label:'Coach',  navItems:coachNav(),  home:'coach/home'  },
    player: { label:'Player', navItems:playerNav(), home:'player/home' },
    parent: { label:'Parent', navItems:parentNav(), home:'parent/home' },
    admin:  { label:'Admin',  navItems:adminNav(),  home:'admin/home'  },
    solo:   { label:'Solo',   navItems:soloNav(),   home:'solo/home'   },
  };
  return configs[role] || configs.solo;
}

// ── NAV CONFIGS ───────────────────────────────────────────────

function coachNav() {
  return [
    { route:'coach/home',      label:'Dashboard', icon:'🏠' },
    { route:'coach/team',      label:'Team',      icon:'👥' },
    { route:'coach/roster',    label:'Roster',    icon:'📋' },
    { route:'coach/program',   label:'Programs',  icon:'📐' },
    { route:'coach/readiness', label:'Readiness', icon:'💚' },
    { route:'coach/analytics',    label:'Analytics',   icon:'📈' },
    { route:'coach/leaderboard',  label:'Leaderboard', icon:'🏆' },
    { route:'coach/messages',  label:'Messages',  icon:'💬' },
    { route:'coach/calendar',  label:'Calendar',  icon:'📅' },
    { route:'coach/reports',   label:'Reports',   icon:'📊', section:'secondary' },
    { route:'coach/settings',  label:'Settings',  icon:'⚙️', section:'secondary' },
  ];
}
function playerNav() {
  return [
    { route:'player/home',      label:'Dashboard', icon:'🏠' },
    { route:'player/today',     label:'Today',     icon:'⚡' },
    { route:'player/log',       label:'Log',       icon:'✏️' },
    { route:'player/progress',  label:'Progress',  icon:'📈' },
    { route:'player/score',     label:'PIQ Score', icon:'🏅' },
    { route:'player/readiness', label:'Readiness', icon:'💚' },
    { route:'player/mindset',   label:'Mindset',   icon:'🧠' },
    { route:'player/nutrition', label:'Nutrition', icon:'🥗' },
    { route:'player/messages',  label:'Messages',  icon:'💬', section:'secondary' },
    { route:'player/settings',  label:'Settings',  icon:'⚙️', section:'secondary' },
  ];
}
function parentNav() {
  return [
    { route:'parent/home',     label:'Dashboard',  icon:'🏠' },
    { route:'parent/child',    label:'My Athlete', icon:'🏃' },
    { route:'parent/week',     label:'Weekly Plan',icon:'📅' },
    { route:'parent/progress', label:'Progress',   icon:'📈' },
    { route:'parent/wellness', label:'Wellness',   icon:'💚' },
    { route:'parent/messages', label:'Messages',   icon:'💬' },
    { route:'parent/billing',  label:'Billing',    icon:'💳', section:'secondary' },
    { route:'parent/settings', label:'Settings',   icon:'⚙️', section:'secondary' },
  ];
}
function adminNav() {
  return [
    { route:'admin/home',       label:'Overview',  icon:'🏠' },
    { route:'admin/org',        label:'Org',       icon:'🏫' },
    { route:'admin/teams',      label:'Teams',     icon:'👥' },
    { route:'admin/coaches',    label:'Coaches',   icon:'🎽' },
    { route:'admin/athletes',   label:'Athletes',  icon:'🏃' },
    { route:'admin/adoption',   label:'Adoption',  icon:'📊' },
    { route:'admin/reports',    label:'Reports',   icon:'📋', section:'secondary' },
    { route:'admin/compliance', label:'Compliance',icon:'🛡️', section:'secondary' },
    { route:'admin/billing',    label:'Billing',   icon:'💳', section:'secondary' },
    { route:'admin/settings',   label:'Settings',  icon:'⚙️', section:'secondary' },
  ];
}
function soloNav() {
  return [
    { route:'solo/home',         label:'Dashboard', icon:'🏠' },
    { route:'solo/today',        label:'Today',     icon:'⚡' },
    { route:'solo/builder',      label:'Builder',   icon:'📐' },
    { route:'solo/library',      label:'Library',   icon:'📚' },
    { route:'solo/progress',     label:'Progress',  icon:'📈' },
    { route:'solo/score',        label:'PIQ Score', icon:'🏅' },
    { route:'solo/readiness',    label:'Readiness', icon:'💚' },
    { route:'solo/mindset',      label:'Mindset',   icon:'🧠' },
    { route:'solo/nutrition',    label:'Nutrition', icon:'🥗' },
    { route:'solo/goals',        label:'Goals',     icon:'🎯', section:'secondary' },
    { route:'solo/subscription', label:'Plan',      icon:'💳', section:'secondary' },
    { route:'solo/settings',     label:'Settings',  icon:'⚙️', section:'secondary' },
  ];
}

// ── MINDSET (Phase 4) ─────────────────────────────────────────

/**
 * Full mindset engine result for the current state.
 * Returns PST skill of the day, HRV proxy, pre-comp routine,
 * mental toughness score, and contextual interpretation.
 */
export function getMindsetResult() {
  return calcMindset(getState());
}

export function getMindsetScore() {
  return calcMindset(getState()).score;
}

// ── WEEKLY GOAL (Phase 5) ─────────────────────────────────────


/**
 * Returns weekly progress for the player home ring.
 * { target, completed, pct, daysLeft, onTrack, streakWeeks }
 */
export function getWeeklyProgress() {
  const g        = getState().weeklyGoal || {};
  const target   = g.targetSessions   || 4;
  const completed = g.completedThisWeek || 0;
  const pct      = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
  const today    = new Date().getDay();                        // 0=Sun
  const daysLeft = today === 0 ? 0 : 7 - today;               // days remaining in Mon-Sun week
  const onTrack  = daysLeft > 0
    ? completed / (7 - daysLeft) >= target / 7              // pace check
    : completed >= target;
  return { target, completed, pct, daysLeft, onTrack, streakWeeks: g.streakWeeks || 0 };
}
