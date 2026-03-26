/**
 * PerformanceIQ Selectors — Elite v3  (remediated)
 *
 * Changes from prior version:
 *   1. The "EXPORT LEGACY FUNCTIONS (for backward compatibility)" block at the
 *      bottom has been REMOVED. Those re-exports are now in selectors.js, which
 *      is the file most views import from. Having them in both files created a
 *      dual-export collision — any module that imported from both files (even
 *      transitively) got a "duplicate identifier" error or, worse, silently
 *      used whichever binding resolved last.
 *
 *   2. _getStreak() now filters out workouts explicitly marked incomplete
 *      (w.completed === false) before counting streak days. Legacy entries
 *      without a completed field are still counted (backward compatibility).
 *
 *   3. getScoreBreakdownElite() now includes a `tier` field in the return
 *      object. Several views reference sb.tier — it was present in the v2
 *      getScoreBreakdown() but was accidentally omitted from the Elite version.
 *
 *   4. All other logic (SPORT_WEIGHTS, 6-pillar scoring, ACWR, injury risk,
 *      HRV simulation, readiness trend, nutrition selectors) is unchanged.
 *
 * This file is the SINGLE source of truth for all scoring calculations.
 * selectors.js re-exports from here — do not duplicate functions there.
 *
 * References:
 *   NSCA Load Management Principles (Stone et al., 2007)
 *   HRV-based Readiness (Plews et al., 2013)
 *   Sport-Specific Periodization (Bompa & Haff, 2009)
 *   Athlete Monitoring Best Practices (Carling et al., 2018)
 *   ACWR / Sweet-Spot (Gabbett, 2016; Malone et al., 2017)
 *   ISSN Position Stand — protein targets (2017)
 *   Thomas, Erdman & Burke — carbohydrate periodisation (2016)
 */

import { getState }                        from './state.js';
import { getCurrentRole, getCurrentUser }  from '../core/auth.js';

// ────────────────────────────────────────────────────────────────
// SPORT-SPECIFIC WEIGHTING
// ────────────────────────────────────────────────────────────────

const SPORT_WEIGHTS = {
  basketball: { consistency: 0.28, readiness: 0.27, compliance: 0.20, load: 0.15, profile: 0.10, injury: 0.05 },
  football:   { consistency: 0.25, readiness: 0.30, compliance: 0.18, load: 0.17, profile: 0.10, injury: 0.05 },
  soccer:     { consistency: 0.30, readiness: 0.25, compliance: 0.20, load: 0.15, profile: 0.10, injury: 0.05 },
  baseball:   { consistency: 0.26, readiness: 0.26, compliance: 0.22, load: 0.16, profile: 0.10, injury: 0.05 },
  volleyball: { consistency: 0.29, readiness: 0.26, compliance: 0.19, load: 0.16, profile: 0.10, injury: 0.05 },
  track:      { consistency: 0.32, readiness: 0.24, compliance: 0.19, load: 0.15, profile: 0.10, injury: 0.05 },
};

// ────────────────────────────────────────────────────────────────
// ELITE PIQ SCORE BREAKDOWN — 6-PILLAR ENGINE
// ────────────────────────────────────────────────────────────────

/**
 * Returns the full Elite PIQ score breakdown with 6 weighted pillars.
 * Includes a `tier` label so views can display sb.tier without errors.
 */
export function getScoreBreakdownElite() {
  const log      = getState().workoutLog;
  const profile  = getState().athleteProfile;
  const sport    = profile.sport || 'basketball';
  const weights  = SPORT_WEIGHTS[sport] || SPORT_WEIGHTS.basketball;

  const consistency  = _calculateConsistency(log, profile);
  const readiness    = _calculateReadinessElite();
  const compliance   = _calculateCompliance(log);
  const load         = _calculateLoadManagement(log);
  const profileScore = _profileCompleteness(profile);
  const injuryRisk   = _calculateInjuryRisk(log, profile);

  const total = Math.max(25, Math.min(100, Math.round(
    consistency.raw  * weights.consistency  +
    readiness.raw    * weights.readiness    +
    compliance.raw   * weights.compliance   +
    load.raw         * weights.load         +
    profileScore     * weights.profile      +
    (100 - injuryRisk.riskScore) * weights.injury
  )));

  // Tier label — mirrors the v2 selectors.js tiers so views using sb.tier work
  const tier =
    total >= 90 ? 'Elite'          :
    total >= 80 ? 'Advanced'       :
    total >= 70 ? 'Developing'     :
    total >= 60 ? 'Building'       :
                  'Getting Started';

  return {
    total,
    tier,
    consistency: { raw: consistency.raw,          weighted: Math.round(consistency.raw * weights.consistency),          weight: weights.consistency,  label: 'Training Consistency', momentum: consistency.momentum },
    readiness:   { raw: readiness.raw,             weighted: Math.round(readiness.raw * weights.readiness),              weight: weights.readiness,    label: 'Readiness Index',       trend: readiness.trend },
    compliance:  { raw: compliance.raw,            weighted: Math.round(compliance.raw * weights.compliance),            weight: weights.compliance,   label: 'Workout Compliance' },
    load:        { raw: load.raw,                  weighted: Math.round(load.raw * weights.load),                        weight: weights.load,         label: 'Load Management',       acuteChronicRatio: load.acuteChronicRatio },
    profile:     { raw: profileScore,              weighted: Math.round(profileScore * weights.profile),                 weight: weights.profile,      label: 'Profile Completeness' },
    injury:      { raw: 100 - injuryRisk.riskScore, weighted: Math.round((100 - injuryRisk.riskScore) * weights.injury), weight: weights.injury,       label: 'Injury Prevention',     flags: injuryRisk.flags },
  };
}

/** Convenience: PIQ total as a number */
export function getPIQScore() {
  return getScoreBreakdownElite().total;
}

// ────────────────────────────────────────────────────────────────
// TRAINING CONSISTENCY PILLAR
// ────────────────────────────────────────────────────────────────

function _calculateConsistency(log, profile) {
  const streak     = _getStreak(log);
  const n          = log.length;
  const daysPerWk  = parseInt(profile.daysPerWeek) || 4;

  const streakScore  = Math.min(100, streak * 10);
  const volumeScore  = Math.min(100, (n / (daysPerWk * 4)) * 100);
  const momentum     = _calculateMomentum(log);
  const momentumBonus = momentum > 0 ? Math.min(10, momentum * 10) : 0;

  const raw = Math.round(streakScore * 0.5 + volumeScore * 0.4 + momentumBonus * 0.1);
  return { raw: Math.min(100, raw), momentum };
}

function _calculateMomentum(log) {
  if (log.length < 14) return 0;
  const now   = Date.now();
  const week1 = log.filter(w => now - w.ts < 7  * 86_400_000);
  const week2 = log.filter(w => now - w.ts >= 7  * 86_400_000 && now - w.ts < 14 * 86_400_000);
  const week3 = log.filter(w => now - w.ts >= 14 * 86_400_000 && now - w.ts < 21 * 86_400_000);
  const avg = arr => arr.length ? arr.reduce((s, w) => s + (w.avgRPE || 5), 0) / arr.length : 5;
  const trend = (avg(week1) - avg(week2)) + (avg(week2) - avg(week3));
  return Math.max(-1, Math.min(1, trend / 10));
}

// ────────────────────────────────────────────────────────────────
// STREAK HELPER — fixed to exclude incomplete workouts
// ────────────────────────────────────────────────────────────────

/**
 * Calculate consecutive training streak.
 *
 * Fix: entries where w.completed === false are excluded. This prevents
 * an abandoned/started-but-not-finished session from inflating the streak.
 * Legacy entries without a `completed` field are treated as complete
 * (completed === undefined → counts) to preserve backwards compatibility.
 */
function _getStreak(log) {
  if (!log.length) return 0;
  const done    = log.filter(w => w.completed !== false);
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

// ────────────────────────────────────────────────────────────────
// READINESS — ELITE 7-FACTOR MODEL
// ────────────────────────────────────────────────────────────────

/**
 * Main export: full readiness object with score, color, ring offset, etc.
 */
export function getReadinessScoreElite() {
  const readiness = _calculateReadinessElite();
  return {
    score:      readiness.raw,
    raw:        readiness.raw,
    color:      getReadinessColorElite(readiness.raw),
    ringOffset: getReadinessRingOffsetElite(readiness.raw),
    explain:    getReadinessExplainElite(readiness.raw),
    factors:    readiness.factors || {},
    trend:      readiness.trend,
    sleepDebt:  readiness.sleepDebt,
  };
}

function _calculateReadinessElite() {
  const checkin = getState().readinessCheckIn;
  const today   = new Date().toDateString();
  const log     = getState().workoutLog;

  if (checkin.date === today && checkin.sleepQuality > 0) {
    const sleep        = (checkin.sleepQuality / 5) * 100;
    const energy       = (checkin.energyLevel  / 5) * 100;
    const soreness     = ((6 - checkin.soreness)   / 5) * 100;
    const mood         = (checkin.mood         / 5) * 100;
    const stress       = ((6 - checkin.stressLevel) / 5) * 100;
    const sleepDebt    = _calculateSleepDebt(checkin);
    const hrv          = _simulateHRV(checkin, log);

    const raw = Math.round(
      sleep     * 0.28 +
      energy    * 0.22 +
      soreness  * 0.18 +
      mood      * 0.12 +
      stress    * 0.10 +
      sleepDebt * 0.05 +
      hrv       * 0.05
    );

    return {
      raw:       Math.max(30, Math.min(99, raw)),
      trend:     _getReadinessTrend(log),
      sleepDebt,
      factors:   { sleep, energy, soreness, mood, stress, sleepDebt, hrv },
    };
  }

  // Fallback: derive from workout log when no check-in today
  if (!log.length) return { raw: 72, trend: 'stable', sleepDebt: null, factors: {} };
  const recent     = log.slice(-5);
  const avgRPE     = recent.reduce((s, w) => s + (w.avgRPE || 5), 0) / recent.length;
  const compliance = Math.min(100, (recent.filter(w => w.completed !== false).length / 5) * 100);
  const base       = Math.round(100 - (avgRPE * 4) + (compliance * 0.2));
  return { raw: Math.max(30, Math.min(99, base)), trend: 'stable', sleepDebt: null, factors: {} };
}

function _calculateSleepDebt(checkin) {
  const target = 9; // hours (recommended for competitive athletes)
  const actual = checkin.sleepHours || 7;
  const debt   = Math.max(0, target - actual);
  return Math.max(0, 100 - (debt * 33.33));
}

function _simulateHRV(checkin, log) {
  const stressImpact = (checkin.stressLevel / 5) * 50;
  const sleepImpact  = (checkin.sleepQuality / 5) * 50;
  return Math.max(0, Math.min(100, 100 - stressImpact - (50 - sleepImpact)));
}

function _getReadinessTrend(log) {
  if (log.length < 7) return 'stable';
  const now   = Date.now();
  const week1 = log.filter(w => now - w.ts <  7 * 86_400_000);
  const week2 = log.filter(w => now - w.ts >= 7 * 86_400_000 && now - w.ts < 14 * 86_400_000);
  const avg   = arr => arr.length ? arr.reduce((s, w) => s + (w.avgRPE || 5), 0) / arr.length : 5;
  if (avg(week1) < avg(week2) - 0.5) return 'improving';
  if (avg(week1) > avg(week2) + 0.5) return 'declining';
  return 'stable';
}

export function getReadinessRingOffsetElite(score = _calculateReadinessElite().raw) {
  return Math.round(((100 - score) / 100) * 289);
}

export function getReadinessColorElite(score = _calculateReadinessElite().raw) {
  if (score >= 85) return '#10b981';
  if (score >= 75) return '#22c955';
  if (score >= 60) return '#f59e0b';
  if (score >= 45) return '#f97316';
  return '#ef4444';
}

export function getReadinessExplainElite(score = _calculateReadinessElite().raw) {
  if (score >= 90) return '🟢 Peak readiness. Your body is fully primed — push hard and compete at your best today.';
  if (score >= 80) return '🟢 High readiness. Great sleep and load balance. Train with full intent today.';
  if (score >= 70) return '🟡 Good readiness. Train at 85–90% intensity. Focus on technique and power.';
  if (score >= 60) return '🟡 Moderate readiness. Train at 75–80% intensity. Reduce volume by 15–20%.';
  if (score >= 45) return '🟠 Low readiness. Active recovery day. Pliability, mobility, and technique work only.';
  return '🔴 Critical readiness. Complete rest day. Prioritize sleep and recovery protocols.';
}

// ────────────────────────────────────────────────────────────────
// WORKOUT COMPLIANCE PILLAR
// ────────────────────────────────────────────────────────────────

function _calculateCompliance(log) {
  if (!log.length) return { raw: 0 };
  const completed    = log.filter(w => w.completed !== false).length;
  const qualityBonus = log.filter(w => w.completed !== false && (w.avgRPE || 5) >= 6).length * 2;
  const raw          = Math.round((completed / log.length) * 80 + Math.min(20, qualityBonus));
  return { raw: Math.min(100, raw) };
}

// ────────────────────────────────────────────────────────────────
// LOAD MANAGEMENT PILLAR — ACWR
// Source: Gabbett 2016 (BJSM); sweet-spot 0.8–1.3
// ────────────────────────────────────────────────────────────────

function _calculateLoadManagement(log) {
  if (log.length < 14) return { raw: 60, acuteChronicRatio: 1.0 };
  const now         = Date.now();
  const acuteLoad   = log.filter(w => now - w.ts <  7 * 86_400_000).reduce((s, w) => s + ((w.avgRPE || 5) * (w.duration || 45) / 60), 0);
  const chronicLoad = log.filter(w => now - w.ts < 28 * 86_400_000).reduce((s, w) => s + ((w.avgRPE || 5) * (w.duration || 45) / 60), 0) / 4;
  const acuteChronicRatio = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;
  let raw = 100;
  if      (acuteChronicRatio < 0.8)  raw = 70;
  else if (acuteChronicRatio > 1.5)  raw = 60;
  else if (acuteChronicRatio > 1.3)  raw = 80;
  return { raw, acuteChronicRatio: Math.round(acuteChronicRatio * 100) / 100 };
}

// ────────────────────────────────────────────────────────────────
// INJURY RISK ASSESSMENT
// ────────────────────────────────────────────────────────────────

function _calculateInjuryRisk(log, profile) {
  const flags = [];
  let riskScore = 0;
  const now = Date.now();

  if (log.length >= 14) {
    const week1Load = log.filter(w => now - w.ts <  7 * 86_400_000).reduce((s, w) => s + (w.avgRPE || 5), 0);
    const week4Load = log.filter(w => now - w.ts < 28 * 86_400_000).reduce((s, w) => s + (w.avgRPE || 5), 0) / 4;
    if (week1Load > week4Load * 1.5) { flags.push('Rapid load increase detected'); riskScore += 25; }
  }

  const recentSoreness = log.slice(-3).reduce((s, w) => s + (w.soreness || 0), 0) / 3;
  if (recentSoreness > 3) { flags.push('High soreness levels'); riskScore += 20; }

  const recentCompliance = log.slice(-5).filter(w => w.completed !== false).length / 5;
  if (recentCompliance < 0.6) { flags.push('Low compliance (possible overtraining)'); riskScore += 15; }

  if (profile.injuryHistory && profile.injuryHistory !== 'none' && profile.injuryHistory.length > 0) {
    flags.push('Previous injury on file');
    riskScore += 10;
  }

  return { riskScore: Math.min(100, riskScore), flags };
}

// ────────────────────────────────────────────────────────────────
// PROFILE COMPLETENESS
// ────────────────────────────────────────────────────────────────

function _profileCompleteness(profile) {
  const fields = ['sport', 'position', 'team', 'gradYear', 'age', 'weightLbs', 'heightFt', 'trainingLevel', 'compPhase', 'daysPerWeek'];
  const filled = fields.filter(f => profile[f] && profile[f] !== '').length;
  return Math.round((filled / fields.length) * 100);
}

// ────────────────────────────────────────────────────────────────
// DASHBOARD CONFIG — authoritative copy here for selectorsElite imports
// ────────────────────────────────────────────────────────────────

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

function coachNav()  { return [{ route:'coach/home',label:'Dashboard',icon:'🏠'},{route:'coach/team',label:'Team',icon:'👥'},{route:'coach/roster',label:'Roster',icon:'📋'},{route:'coach/program',label:'Programs',icon:'📐'},{route:'coach/readiness',label:'Readiness',icon:'💚'},{route:'coach/analytics',label:'Analytics',icon:'📈'},{route:'coach/messages',label:'Messages',icon:'💬'},{route:'coach/calendar',label:'Calendar',icon:'📅'},{route:'coach/settings',label:'Settings',icon:'⚙️'}]; }
function playerNav() { return [{route:'player/home',label:'Dashboard',icon:'🏠'},{route:'player/today',label:'Today',icon:'⚡'},{route:'player/log',label:'Log',icon:'✏️'},{route:'player/progress',label:'Progress',icon:'📈'},{route:'player/score',label:'PIQ Score',icon:'🏅'},{route:'player/readiness',label:'Readiness',icon:'💚'},{route:'player/nutrition',label:'Nutrition',icon:'🥗'},{route:'player/messages',label:'Messages',icon:'💬'},{route:'player/settings',label:'Settings',icon:'⚙️'}]; }
function parentNav() { return [{route:'parent/home',label:'Dashboard',icon:'🏠'},{route:'parent/child',label:'My Athlete',icon:'🏃'},{route:'parent/week',label:'Weekly Plan',icon:'📅'},{route:'parent/progress',label:'Progress',icon:'📈'},{route:'parent/wellness',label:'Wellness',icon:'💚'},{route:'parent/messages',label:'Messages',icon:'💬'},{route:'parent/billing',label:'Billing',icon:'💳'},{route:'parent/settings',label:'Settings',icon:'⚙️'}]; }
function adminNav()  { return [{route:'admin/home',label:'Overview',icon:'🏠'},{route:'admin/org',label:'Org',icon:'🏫'},{route:'admin/teams',label:'Teams',icon:'👥'},{route:'admin/coaches',label:'Coaches',icon:'🎽'},{route:'admin/athletes',label:'Athletes',icon:'🏃'},{route:'admin/adoption',label:'Adoption',icon:'📊'},{route:'admin/reports',label:'Reports',icon:'📋'},{route:'admin/billing',label:'Billing',icon:'💳'},{route:'admin/settings',label:'Settings',icon:'⚙️'}]; }
function soloNav()   { return [{route:'solo/home',label:'Dashboard',icon:'🏠'},{route:'solo/today',label:'Today',icon:'⚡'},{route:'solo/builder',label:'Builder',icon:'📐'},{route:'solo/library',label:'Library',icon:'📚'},{route:'solo/progress',label:'Progress',icon:'📈'},{route:'solo/score',label:'PIQ Score',icon:'🏅'},{route:'solo/readiness',label:'Readiness',icon:'💚'},{route:'solo/nutrition',label:'Nutrition',icon:'🥗'},{route:'solo/goals',label:'Goals',icon:'🎯'},{route:'solo/settings',label:'Settings',icon:'⚙️'}]; }

// ────────────────────────────────────────────────────────────────
// NUTRITION SELECTORS
// ────────────────────────────────────────────────────────────────

export function getMacroTargets() {
  const targets = getState().nutrition.targetMacros;
  if (!targets || targets.cal === 0) {
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
