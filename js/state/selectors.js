/**
 * PerformanceIQ Selectors  (remediated — full export set)
 *
 * Exports added in this pass:
 *   getPIQTrend() — compares PIQ score trajectory over last 4 weeks.
 *                   Used by solo/progress.js for trend indicator.
 *                   Returns { direction, delta, label, color }
 */

import { getState }                              from './state.js';
import { getCurrentRole }                        from '../core/auth.js';
import { getScoreBreakdownElite, getPIQScore,
         getReadinessScoreElite,
         getReadinessRingOffsetElite,
         getReadinessColorElite,
         getReadinessExplainElite,
         getMacroTargets, getMacroProgress }     from './selectorsElite.js';

// ── RE-EXPORTS FROM ELITE ─────────────────────────────────────────────────────
export { getScoreBreakdownElite  as getScoreBreakdown  };
export { getPIQScore };
export { getReadinessScoreElite };
export { getReadinessRingOffsetElite as getReadinessRingOffset };
export { getReadinessColorElite  as getReadinessColor  };
export { getReadinessExplainElite as getReadinessExplain };
export { getScoreBreakdownElite };
export { getMacroTargets };
export { getMacroProgress };

// ── getReadinessScore — ALWAYS returns a NUMBER ───────────────────────────────
export function getReadinessScore() {
  return getReadinessScoreElite().raw;
}

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

// ── PIQ TREND ─────────────────────────────────────────────────────────────────
/**
 * getPIQTrend — compares PIQ score trajectory over the last 4 weeks.
 *
 * Imported by solo/progress.js for the trend indicator arrow.
 * Uses session count and compliance as a proxy for PIQ change over time,
 * since the actual PIQ score is a point-in-time calculation (no history stored).
 *
 * Returns: {
 *   direction — 'improving' | 'stable' | 'declining'
 *   delta     — approximate score change (positive = up, negative = down)
 *   label     — human-readable trend description
 *   color     — hex color for UI
 *   arrow     — '↑' | '→' | '↓'
 * }
 */
export function getPIQTrend() {
  const log = getState().workoutLog;
  const now = Date.now();
  const DAY = 86_400_000;

  // Compare session count and compliance: recent 14 days vs prior 14 days
  const recent = log.filter(w => now - w.ts < 14 * DAY);
  const prior  = log.filter(w => now - w.ts >= 14 * DAY && now - w.ts < 28 * DAY);

  if (prior.length === 0 && recent.length === 0) {
    return { direction: 'stable', delta: 0, label: 'Not enough data yet', color: '#888', arrow: '→' };
  }

  // Score each period: sessions + compliance rate
  const score = arr => {
    if (!arr.length) return 0;
    const compliance = arr.filter(w => w.completed !== false).length / arr.length;
    const avgRPE     = arr.reduce((s, w) => s + (w.avgRPE || 5), 0) / arr.length;
    const loadScore  = Math.max(0, 100 - Math.abs(avgRPE - 6.5) * 14);
    return Math.round(arr.length * 8 + compliance * 30 + loadScore * 0.3);
  };

  const recentScore = score(recent);
  const priorScore  = score(prior);

  if (priorScore === 0) {
    return { direction: 'improving', delta: 0, label: 'Building momentum', color: '#22c955', arrow: '↑' };
  }

  const delta = recentScore - priorScore;
  const pct   = Math.round((delta / Math.max(1, priorScore)) * 100);

  if (pct >= 10) {
    return { direction: 'improving', delta: Math.abs(pct), label: `Trending up ${Math.abs(pct)}% vs last 2 weeks`, color: '#22c955', arrow: '↑' };
  } else if (pct <= -10) {
    return { direction: 'declining', delta: Math.abs(pct), label: `Trending down ${Math.abs(pct)}% vs last 2 weeks`, color: '#ef4444', arrow: '↓' };
  } else {
    return { direction: 'stable', delta: 0, label: 'Holding steady', color: '#f59e0b', arrow: '→' };
  }
}

// ── CHECK-IN HISTORY ──────────────────────────────────────────────────────────
export function getCheckInHistory(n = 30) {
  const log = getState().workoutLog;

  return log
    .filter(w => w.type === 'checkin')
    .sort((a, b) => b.ts - a.ts)
    .slice(0, n)
    .map(w => {
      let readiness = 72;
      if (w.sleepQuality > 0) {
        const sleep    = (w.sleepQuality / 5) * 100;
        const energy   = ((w.energyLevel  || 3) / 5) * 100;
        const soreness = ((6 - (w.soreness || 3))   / 5) * 100;
        const mood     = ((w.mood         || 3) / 5) * 100;
        const stress   = ((6 - (w.stressLevel || 3)) / 5) * 100;
        readiness = Math.max(30, Math.min(99, Math.round(
          sleep * 0.30 + energy * 0.25 + soreness * 0.20 + mood * 0.15 + stress * 0.10
        )));
      }
      const date = new Date(w.ts);
      return {
        ...w,
        readiness,
        dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dayLabel:  date.toLocaleDateString('en-US', { weekday: 'short' }),
      };
    });
}

// ── READINESS RESULT ──────────────────────────────────────────────────────────
export function getReadinessResult() {
  const state   = getState();
  const checkin = state.readinessCheckIn;
  const log     = state.workoutLog;
  const today   = new Date().toDateString();

  const hasCheckedIn = checkin.date === today && checkin.sleepQuality > 0;

  let score = 72;
  let factors = {};
  let trend = 'stable';

  if (hasCheckedIn) {
    const sleep    = (checkin.sleepQuality / 5) * 100;
    const energy   = (checkin.energyLevel  / 5) * 100;
    const soreness = ((6 - checkin.soreness)    / 5) * 100;
    const mood     = (checkin.mood         / 5) * 100;
    const stress   = ((6 - checkin.stressLevel) / 5) * 100;
    score = Math.max(30, Math.min(99, Math.round(
      sleep * 0.30 + energy * 0.25 + soreness * 0.20 + mood * 0.15 + stress * 0.10
    )));
    factors = { sleep, energy, soreness, mood, stress };
  } else if (log.length) {
    const recent     = log.slice(-5);
    const avgRPE     = recent.reduce((s, w) => s + (w.avgRPE || 5), 0) / recent.length;
    const compliance = Math.min(100, (recent.filter(w => w.completed !== false).length / 5) * 100);
    score = Math.max(30, Math.min(99, Math.round(100 - (avgRPE * 4) + (compliance * 0.2))));
  }

  if (log.length >= 7) {
    const now   = Date.now();
    const DAY   = 86_400_000;
    const week1 = log.filter(w => now - w.ts < 7 * DAY);
    const week2 = log.filter(w => now - w.ts >= 7 * DAY && now - w.ts < 14 * DAY);
    const avg   = arr => arr.length ? arr.reduce((s, w) => s + (w.avgRPE || 5), 0) / arr.length : 5;
    if (avg(week1) < avg(week2) - 0.5) trend = 'improving';
    else if (avg(week1) > avg(week2) + 0.5) trend = 'declining';
  }

  const color =
    score >= 85 ? '#10b981' : score >= 75 ? '#22c955' :
    score >= 60 ? '#f59e0b' : score >= 45 ? '#f97316' : '#ef4444';

  const label =
    score >= 80 ? 'High' : score >= 60 ? 'Moderate' :
    score >= 45 ? 'Low'  : 'Critical';

  const ringOffset = Math.round(((100 - score) / 100) * 289);

  const explain =
    score >= 90 ? '🟢 Peak readiness. Your body is fully primed — push hard and compete at your best today.' :
    score >= 80 ? '🟢 High readiness. Great sleep and load balance. Train with full intent today.' :
    score >= 70 ? '🟡 Good readiness. Train at 85–90% intensity. Focus on technique and power.' :
    score >= 60 ? '🟡 Moderate readiness. Train at 75–80% intensity. Reduce volume by 15–20%.' :
    score >= 45 ? '🟠 Low readiness. Active recovery day. Pliability, mobility, and technique work only.' :
    '🔴 Critical readiness. Complete rest day. Prioritize sleep and recovery protocols.';

  const intensityNote =
    score >= 80 ? 'Full training — execute your planned session.' :
    score >= 60 ? 'Moderate session — reduce volume 15–20%, prioritize quality.' :
    score >= 45 ? 'Active recovery only — mobility and pliability work.' :
    'Complete rest — sleep, nutrition, and recovery only.';

  const DAY_MS  = 86_400_000;
  const now     = Date.now();
  const sRPE    = w => (w.avgRPE || 5) * ((w.duration || 45) / 60);
  const acute   = log.filter(w => now - w.ts < 7  * DAY_MS).reduce((s, w) => s + sRPE(w), 0);
  const chronic = log.filter(w => now - w.ts < 28 * DAY_MS).reduce((s, w) => s + sRPE(w), 0) / 4;
  const acwr    = chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : 1.0;
  const acwrZone =
    log.length < 3  ? 'no-data'       :
    acwr > 1.50     ? 'danger'        :
    acwr > 1.30     ? 'spike'         :
    acwr >= 0.80    ? 'sweet-spot'    :
    acwr >= 0.60    ? 'undertraining' : 'detraining';

  return {
    score, raw: score, color, ringOffset, explain,
    hasCheckedIn, checkin, trend, factors, label,
    intensityNote, acwr, acwrZone,
  };
}

// ── ACWR SERIES ───────────────────────────────────────────────────────────────
export function getACWRSeries() {
  const log = getState().workoutLog;
  if (log.length < 3) return [];

  const LAMBDA_A = 2 / 8;
  const LAMBDA_C = 2 / 29;
  const now      = Date.now();
  const DAY_MS   = 86_400_000;
  const days     = 28;
  const sRPE     = w => (w.avgRPE || 5) * ((w.duration || 45) / 60);

  const dailyLoad = new Array(days).fill(0);
  log.forEach(w => {
    const daysAgo = Math.floor((now - w.ts) / DAY_MS);
    if (daysAgo >= 0 && daysAgo < days) dailyLoad[days - 1 - daysAgo] += sRPE(w);
  });

  let ewmaA = 0, ewmaC = 0;
  const series = [];

  for (let i = 0; i < days; i++) {
    const load = dailyLoad[i];
    ewmaA = LAMBDA_A * load + (1 - LAMBDA_A) * ewmaA;
    ewmaC = LAMBDA_C * load + (1 - LAMBDA_C) * ewmaC;
    const acwr = ewmaC > 0 ? ewmaA / ewmaC : 1.0;
    const zone =
      acwr > 1.50  ? 'danger'        :
      acwr > 1.30  ? 'spike'         :
      acwr >= 0.80 ? 'sweet-spot'    :
      acwr >= 0.60 ? 'undertraining' :
      i < 7        ? 'no-data'       : 'undertraining';

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

// ── LOAD SERIES ───────────────────────────────────────────────────────────────
export function getLoadSeries() {
  const log    = getState().workoutLog;
  const now    = Date.now();
  const DAY_MS = 86_400_000;
  const days   = 28;
  const sRPE   = w => (w.avgRPE || 5) * ((w.duration || 45) / 60);

  const dailyLoad = new Array(days).fill(0);
  const dailyHits = new Array(days).fill(false);

  log.forEach(w => {
    const daysAgo = Math.floor((now - w.ts) / DAY_MS);
    if (daysAgo >= 0 && daysAgo < days) {
      dailyLoad[days - 1 - daysAgo] += sRPE(w);
      dailyHits[days - 1 - daysAgo] = true;
    }
  });

  return dailyLoad.map((load, i) => {
    const d = new Date(now - (days - 1 - i) * DAY_MS);
    return {
      date:    d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      load:    Math.round(load * 10) / 10,
      hasData: dailyHits[i],
    };
  });
}

// ── NUTRITION RESULT ──────────────────────────────────────────────────────────
export function getNutritionResult() {
  const state     = getState();
  const profile   = state.athleteProfile;
  const nutrition = state.nutrition;

  const targets = (() => {
    const t = nutrition.targetMacros;
    return (t && t.cal > 0) ? t : { cal: 2800, pro: 160, cho: 350, fat: 80 };
  })();

  const current = nutrition.macros || { cal: 0, pro: 0, cho: 0, fat: 0 };
  const pct     = k => Math.min(100, current[k] > 0 && targets[k] > 0
    ? Math.round((current[k] / targets[k]) * 100) : 0);

  const progress = {
    cal: { current: current.cal, target: targets.cal, pct: pct('cal') },
    pro: { current: current.pro, target: targets.pro, pct: pct('pro') },
    cho: { current: current.cho, target: targets.cho, pct: pct('cho') },
    fat: { current: current.fat, target: targets.fat, pct: pct('fat') },
  };

  const weightLbs  = parseFloat(profile?.weightLbs) || 160;
  const hydTarget  = Math.max(64, Math.round(weightLbs * 0.5));
  const hydCurrent = profile?.hydrationOz ?? 0;
  const hour       = new Date().getHours();

  return {
    targets, current, progress,
    hydration: {
      oz:     hydCurrent,
      target: hydTarget,
      pct:    Math.min(100, Math.round((hydCurrent / hydTarget) * 100)),
    },
    meals:        nutrition.meals || [],
    mealCount:    (nutrition.meals || []).length,
    calRemaining: Math.max(0, targets.cal - current.cal),
    proRemaining: Math.max(0, targets.pro - current.pro),
    onTrack: hour < 12 ? progress.cal.pct >= 30
           : hour < 17 ? progress.cal.pct >= 50
           : progress.cal.pct >= 70,
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
