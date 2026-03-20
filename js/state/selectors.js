/**
 * PerformanceIQ Selectors v2
 * Pure functions that derive computed values from state + auth.
 * Enhanced PIQ scoring uses full athlete profile for accuracy.
 */
import { getState } from './state.js';
import { getCurrentRole, getCurrentUser } from '../core/auth.js';

// ── ROLE / DASHBOARD ─────────────────────────────────────────
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

// ── SCORING SELECTORS ─────────────────────────────────────────
export function getWorkoutCount() { return getState().workoutLog.length; }

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

/**
 * Readiness Score v2 — incorporates daily check-in data when available.
 * Falls back to workout log analysis when no check-in exists.
 */
export function getReadinessScore() {
  const checkin = getState().readinessCheckIn;
  const today   = new Date().toDateString();
  const log     = getState().workoutLog;

  // If today's check-in is complete, use it (most accurate)
  if (checkin.date === today && checkin.sleepQuality > 0) {
    const sleep    = (checkin.sleepQuality / 5) * 100;
    const energy   = (checkin.energyLevel / 5) * 100;
    const soreness = ((6 - checkin.soreness) / 5) * 100; // inverted: less sore = better
    const mood     = (checkin.mood / 5) * 100;
    const stress   = ((6 - checkin.stressLevel) / 5) * 100; // inverted
    const score = Math.round(sleep * 0.30 + energy * 0.25 + soreness * 0.20 + mood * 0.15 + stress * 0.10);
    return Math.max(30, Math.min(99, score));
  }

  // Fallback: derive from workout log
  if (!log.length) return 72;
  const recent = log.slice(-5);
  const avgRPE = recent.reduce((s, w) => s + (w.avgRPE || 5), 0) / recent.length;
  const compliance = Math.min(100, (recent.filter(w => w.completed).length / 5) * 100);
  const base = Math.round(100 - (avgRPE * 4) + (compliance * 0.2));
  return Math.max(30, Math.min(99, base));
}

export function getPIQScore() { return getScoreBreakdown().total; }

/**
 * PIQ Score Formula v2
 * Weighted composite of 5 pillars:
 *   1. Training Consistency  (30%) — streak + session count
 *   2. Readiness Index       (25%) — sleep, energy, soreness, mood
 *   3. Workout Compliance    (20%) — % sessions completed
 *   4. Load Management       (15%) — RPE balance (ideal 6–7)
 *   5. Profile Completeness  (10%) — rewarding athletes who fill in their data
 *
 * Formula is transparent and evidence-based (NSCA load management principles).
 * All calculations shown step-by-step in the Score view.
 */
export function getScoreBreakdown() {
  const log      = getState().workoutLog;
  const profile  = getState().athleteProfile;
  const n        = log.length;
  const streak   = getStreak();
  const readiness = getReadinessScore();

  if (n === 0) {
    const profileScore = _profileCompleteness(profile);
    return {
      total:       Math.min(72, 30 + Math.round(profileScore * 0.10)),
      consistency: { raw: 0,  weighted: 0,  weight: 0.30, label: 'Training Consistency' },
      readiness:   { raw: readiness, weighted: Math.round(readiness * 0.25), weight: 0.25, label: 'Readiness Index' },
      compliance:  { raw: 0,  weighted: 0,  weight: 0.20, label: 'Workout Compliance' },
      load:        { raw: 60, weighted: 9,  weight: 0.15, label: 'Load Management' },
      profile:     { raw: profileScore, weighted: Math.round(profileScore * 0.10), weight: 0.10, label: 'Profile Completeness' },
      tier: 'Getting Started',
    };
  }

  // 1. Consistency: streak (8 pts each) + sessions (1.5 pts each), max 100
  const consistencyRaw = Math.min(100, Math.round((streak * 8) + (n * 1.5)));

  // 2. Readiness: from check-in or log analysis (already computed)

  // 3. Compliance: % of logged sessions marked completed
  const complianceRaw = Math.round((log.filter(w => w.completed).length / Math.max(1, n)) * 100);

  // 4. Load Management: avg RPE over last 7 sessions; ideal is 6–7 (NSCA)
  const recent7  = log.slice(-7);
  const avgRPE7  = recent7.length ? recent7.reduce((s, w) => s + (w.avgRPE || 5), 0) / recent7.length : 5;
  const loadRaw  = Math.round(Math.max(0, 100 - Math.abs(avgRPE7 - 6.5) * 14));

  // 5. Profile completeness: rewards athletes who enter accurate data
  const profileRaw = _profileCompleteness(profile);

  // Weighted total
  const total = Math.min(99, Math.max(30, Math.round(
    consistencyRaw * 0.30 +
    readiness      * 0.25 +
    complianceRaw  * 0.20 +
    loadRaw        * 0.15 +
    profileRaw     * 0.10
  )));

  const tier =
    total >= 90 ? 'Elite' :
    total >= 80 ? 'Advanced' :
    total >= 70 ? 'Developing' :
    total >= 60 ? 'Building' :
                  'Getting Started';

  return {
    total,
    consistency: { raw: consistencyRaw, weighted: Math.round(consistencyRaw * 0.30), weight: 0.30, label: 'Training Consistency' },
    readiness:   { raw: readiness,      weighted: Math.round(readiness * 0.25),      weight: 0.25, label: 'Readiness Index' },
    compliance:  { raw: complianceRaw,  weighted: Math.round(complianceRaw * 0.20),  weight: 0.20, label: 'Workout Compliance' },
    load:        { raw: loadRaw,        weighted: Math.round(loadRaw * 0.15),         weight: 0.15, label: 'Load Management' },
    profile:     { raw: profileRaw,     weighted: Math.round(profileRaw * 0.10),      weight: 0.10, label: 'Profile Completeness' },
    tier,
  };
}

/** Profile completeness score 0–100 — rewards filling in accurate data */
function _profileCompleteness(p) {
  if (!p) return 0;
  let score = 0;
  if (p.sport)         score += 15;
  if (p.position)      score += 10;
  if (p.age)           score += 10;
  if (p.weightLbs)     score += 15;
  if (p.heightFt)      score += 10;
  if (p.trainingLevel) score += 10;
  if (p.compPhase)     score += 10;
  if (p.primaryGoal)   score += 10;
  if (p.goals && p.goals.length > 0) score += 10;
  return Math.min(100, score);
}

export function getReadinessRingOffset(score = getReadinessScore()) {
  return Math.round(289 - (score / 100) * 289);
}
export function getReadinessColor(score = getReadinessScore()) {
  return score >= 80 ? '#22c955' : score >= 60 ? '#f59e0b' : '#ef4444';
}
export function getReadinessExplain(score = getReadinessScore()) {
  if (score >= 90) return 'Peak readiness. Your body is fully primed — push hard and compete at your best today.';
  if (score >= 80) return 'High readiness. Great sleep and load balance. Train with full intent today.';
  if (score >= 65) return 'Moderate readiness. Train at 80–85% intensity. Focus on technique and quality reps.';
  if (score >= 50) return 'Low-moderate readiness. Consider a reduced-volume session or active recovery.';
  return 'Low readiness detected. Prioritize pliability, mobility, and recovery today. Avoid max-effort work.';
}

// ── NUTRITION SELECTORS ───────────────────────────────────────
export function getMacroTargets() {
  const targets = getState().nutrition.targetMacros;
  if (!targets || targets.cal === 0) {
    // Default targets if profile not filled
    return { cal: 2800, pro: 160, cho: 350, fat: 80 };
  }
  return targets;
}

export function getMacroProgress() {
  const current = getState().nutrition.macros;
  const targets = getMacroTargets();
  return {
    cal: { current: current.cal, target: targets.cal, pct: Math.min(100, Math.round((current.cal / targets.cal) * 100)) },
    pro: { current: current.pro, target: targets.pro, pct: Math.min(100, Math.round((current.pro / targets.pro) * 100)) },
    cho: { current: current.cho, target: targets.cho, pct: Math.min(100, Math.round((current.cho / targets.cho) * 100)) },
    fat: { current: current.fat, target: targets.fat, pct: Math.min(100, Math.round((current.fat / targets.fat) * 100)) },
  };
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
