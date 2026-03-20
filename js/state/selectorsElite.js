/**
 * PerformanceIQ Selectors — Elite v3
 * Advanced scoring algorithms with sport-specific weighting, momentum tracking,
 * injury risk assessment, and predictive readiness modeling.
 *
 * Based on:
 * - NSCA Load Management Principles (Stone et al., 2007)
 * - HRV-based Readiness (Plews et al., 2013)
 * - Sport-Specific Periodization (Bompa & Haff, 2009)
 * - Athlete Monitoring Best Practices (Carling et al., 2018)
 */
import { getState } from './state.js';
import { getCurrentRole, getCurrentUser } from '../core/auth.js';

// ────────────────────────────────────────────────────────────────
// ELITE PIQ SCORE ENGINE v3
// ────────────────────────────────────────────────────────────────

/**
 * Sport-specific weighting factors for PIQ scoring.
 * Reflects the unique demands and recovery patterns of each sport.
 */
const SPORT_WEIGHTS = {
  basketball: { consistency: 0.28, readiness: 0.27, compliance: 0.20, load: 0.15, profile: 0.10, injury: 0.05 },
  football:   { consistency: 0.25, readiness: 0.30, compliance: 0.18, load: 0.17, profile: 0.10, injury: 0.05 },
  soccer:     { consistency: 0.30, readiness: 0.25, compliance: 0.20, load: 0.15, profile: 0.10, injury: 0.05 },
  baseball:   { consistency: 0.26, readiness: 0.26, compliance: 0.22, load: 0.16, profile: 0.10, injury: 0.05 },
  volleyball: { consistency: 0.29, readiness: 0.26, compliance: 0.19, load: 0.16, profile: 0.10, injury: 0.05 },
  track:      { consistency: 0.32, readiness: 0.24, compliance: 0.19, load: 0.15, profile: 0.10, injury: 0.05 },
};

/**
 * Elite PIQ Score Breakdown with 6 pillars.
 * Includes momentum scoring and injury risk assessment.
 */
export function getScoreBreakdownElite() {
  const log      = getState().workoutLog;
  const profile  = getState().athleteProfile;
  const sport    = profile.sport || 'basketball';
  const weights  = SPORT_WEIGHTS[sport] || SPORT_WEIGHTS.basketball;
  const n        = log.length;

  // Pillar 1: Training Consistency (with momentum bonus)
  const consistency = _calculateConsistency(log, profile);

  // Pillar 2: Readiness Index (advanced 7-factor model)
  const readiness = _calculateReadinessElite();

  // Pillar 3: Workout Compliance
  const compliance = _calculateCompliance(log);

  // Pillar 4: Load Management (RPE balance + volume tracking)
  const load = _calculateLoadManagement(log);

  // Pillar 5: Profile Completeness
  const profileScore = _profileCompleteness(profile);

  // Pillar 6: Injury Risk (penalty if high-risk indicators present)
  const injuryRisk = _calculateInjuryRisk(log, profile);

  // Weighted composite
  const total = Math.round(
    consistency.raw * weights.consistency +
    readiness.raw * weights.readiness +
    compliance.raw * weights.compliance +
    load.raw * weights.load +
    profileScore * weights.profile +
    (100 - injuryRisk.riskScore) * weights.injury
  );

  return {
    total: Math.max(25, Math.min(100, total)),
    consistency: { raw: consistency.raw, weighted: Math.round(consistency.raw * weights.consistency), weight: weights.consistency, label: 'Training Consistency', momentum: consistency.momentum },
    readiness: { raw: readiness.raw, weighted: Math.round(readiness.raw * weights.readiness), weight: weights.readiness, label: 'Readiness Index', trend: readiness.trend },
    compliance: { raw: compliance.raw, weighted: Math.round(compliance.raw * weights.compliance), weight: weights.compliance, label: 'Workout Compliance' },
    load: { raw: load.raw, weighted: Math.round(load.raw * weights.load), weight: weights.load, label: 'Load Management', acuteChronicRatio: load.acuteChronicRatio },
    profile: { raw: profileScore, weighted: Math.round(profileScore * weights.profile), weight: weights.profile, label: 'Profile Completeness' },
    injury: { raw: 100 - injuryRisk.riskScore, weighted: Math.round((100 - injuryRisk.riskScore) * weights.injury), weight: weights.injury, label: 'Injury Prevention', flags: injuryRisk.flags },
  };
}

/**
 * Training Consistency Pillar
 * Incorporates streak, session count, and momentum (acceleration/deceleration of effort).
 */
function _calculateConsistency(log, profile) {
  const streak = _getStreak(log);
  const sessionCount = Math.min(100, (log.length / 30) * 100); // 30 sessions = 100%
  const momentum = _calculateMomentum(log);
  
  const raw = Math.round(
    (streak / 14) * 40 +      // Streak: max 14 days = 40 pts
    sessionCount * 0.40 +      // Session count: 40 pts
    momentum * 20              // Momentum: ±20 pts
  );
  
  return { raw: Math.max(0, Math.min(100, raw)), momentum };
}

/**
 * Momentum Scoring
 * Detects if athlete is accelerating (positive momentum) or decelerating (negative).
 * Based on RPE trend over last 3 weeks.
 */
function _calculateMomentum(log) {
  if (log.length < 7) return 0;
  
  const now = Date.now();
  const week1 = log.filter(w => now - w.ts < 7 * 24 * 60 * 60 * 1000);
  const week2 = log.filter(w => now - w.ts < 14 * 24 * 60 * 60 * 1000 && now - w.ts >= 7 * 24 * 60 * 60 * 1000);
  const week3 = log.filter(w => now - w.ts < 21 * 24 * 60 * 60 * 1000 && now - w.ts >= 14 * 24 * 60 * 60 * 1000);
  
  const avgRPE1 = week1.length ? week1.reduce((s, w) => s + (w.avgRPE || 5), 0) / week1.length : 5;
  const avgRPE2 = week2.length ? week2.reduce((s, w) => s + (w.avgRPE || 5), 0) / week2.length : 5;
  const avgRPE3 = week3.length ? week3.reduce((s, w) => s + (w.avgRPE || 5), 0) / week3.length : 5;
  
  // Trend: if RPE is increasing, momentum is positive (building fitness)
  // If RPE is decreasing, momentum is negative (detraining or recovery)
  const trend = (avgRPE1 - avgRPE2) + (avgRPE2 - avgRPE3);
  return Math.max(-1, Math.min(1, trend / 10)); // Normalized to ±1
}

/**
 * Readiness Index — Elite 7-Factor Model
 * Incorporates sleep, energy, soreness, mood, stress, HRV simulation, and sleep debt.
 */
function _calculateReadinessElite() {
  const checkin = getState().readinessCheckIn;
  const today   = new Date().toDateString();
  const log     = getState().workoutLog;

  if (checkin.date === today && checkin.sleepQuality > 0) {
    const sleep       = (checkin.sleepQuality / 5) * 100;
    const energy      = (checkin.energyLevel / 5) * 100;
    const soreness    = ((6 - checkin.soreness) / 5) * 100;
    const mood        = (checkin.mood / 5) * 100;
    const stress      = ((6 - checkin.stressLevel) / 5) * 100;
    const sleepDebt   = _calculateSleepDebt(checkin);
    const hrvSimulated = _simulateHRV(checkin, log);

    const raw = Math.round(
      sleep * 0.28 +
      energy * 0.22 +
      soreness * 0.18 +
      mood * 0.12 +
      stress * 0.10 +
      sleepDebt * 0.05 +
      hrvSimulated * 0.05
    );

    const trend = _getReadinessTrend(log);
    return { raw: Math.max(30, Math.min(99, raw)), trend };
  }

  // Fallback: derive from workout log
  if (!log.length) return { raw: 72, trend: 'stable' };
  
  const recent = log.slice(-5);
  const avgRPE = recent.reduce((s, w) => s + (w.avgRPE || 5), 0) / recent.length;
  const compliance = Math.min(100, (recent.filter(w => w.completed).length / 5) * 100);
  const base = Math.round(100 - (avgRPE * 4) + (compliance * 0.2));
  
  return { raw: Math.max(30, Math.min(99, base)), trend: 'stable' };
}

/**
 * Sleep Debt Calculation
 * Tracks cumulative sleep deficit over the past 7 days.
 * Recommended sleep for athletes: 8–10 hours (using 9 as target).
 */
function _calculateSleepDebt(checkin) {
  const targetSleep = 9; // hours
  const actualSleep = checkin.sleepHours || 7;
  const debt = Math.max(0, targetSleep - actualSleep);
  
  // Convert to 0–100 scale: 0 debt = 100 pts, 3+ hours debt = 0 pts
  return Math.max(0, 100 - (debt * 33.33));
}

/**
 * HRV Simulation
 * Estimates Heart Rate Variability from available data.
 * Higher HRV = better parasympathetic tone = better recovery.
 */
function _simulateHRV(checkin, log) {
  // HRV is inversely related to stress and sleep quality
  const stressImpact = (checkin.stressLevel / 5) * 50;
  const sleepImpact = (checkin.sleepQuality / 5) * 50;
  const hrvScore = 100 - stressImpact - (50 - sleepImpact);
  
  return Math.max(0, Math.min(100, hrvScore));
}

/**
 * Readiness Trend Analysis
 * Detects if readiness is improving, stable, or declining over the past 2 weeks.
 */
function _getReadinessTrend(log) {
  if (log.length < 7) return 'stable';
  
  const now = Date.now();
  const week1 = log.filter(w => now - w.ts < 7 * 24 * 60 * 60 * 1000);
  const week2 = log.filter(w => now - w.ts < 14 * 24 * 60 * 60 * 1000 && now - w.ts >= 7 * 24 * 60 * 60 * 1000);
  
  const avgRPE1 = week1.length ? week1.reduce((s, w) => s + (w.avgRPE || 5), 0) / week1.length : 5;
  const avgRPE2 = week2.length ? week2.reduce((s, w) => s + (w.avgRPE || 5), 0) / week2.length : 5;
  
  if (avgRPE1 < avgRPE2 - 0.5) return 'improving';
  if (avgRPE1 > avgRPE2 + 0.5) return 'declining';
  return 'stable';
}

/**
 * Workout Compliance Pillar
 * % of prescribed sessions completed, with quality bonus.
 */
function _calculateCompliance(log) {
  if (!log.length) return { raw: 0 };
  
  const completed = log.filter(w => w.completed).length;
  const qualityBonus = log.filter(w => w.completed && (w.avgRPE || 5) >= 6).length * 2;
  
  const raw = Math.round((completed / log.length) * 80 + Math.min(20, qualityBonus));
  return { raw: Math.min(100, raw) };
}

/**
 * Load Management Pillar
 * Calculates Acute:Chronic Workload Ratio (ACWR).
 * Ideal range: 0.8–1.3 (Gabbett, 2016).
 */
function _calculateLoadManagement(log) {
  if (log.length < 14) return { raw: 60, acuteChronicRatio: 1.0 };
  
  const now = Date.now();
  const acuteLoad = log
    .filter(w => now - w.ts < 7 * 24 * 60 * 60 * 1000)
    .reduce((s, w) => s + ((w.avgRPE || 5) * (w.duration || 45) / 60), 0);
  
  const chronicLoad = log
    .filter(w => now - w.ts < 28 * 24 * 60 * 60 * 1000)
    .reduce((s, w) => s + ((w.avgRPE || 5) * (w.duration || 45) / 60), 0) / 4;
  
  const acuteChronicRatio = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;
  
  // Score: ideal ACWR is 0.8–1.3
  let raw = 100;
  if (acuteChronicRatio < 0.8) raw = 70; // Detraining risk
  else if (acuteChronicRatio > 1.5) raw = 60; // Overtraining risk
  else if (acuteChronicRatio > 1.3) raw = 80;
  
  return { raw, acuteChronicRatio: Math.round(acuteChronicRatio * 100) / 100 };
}

/**
 * Injury Risk Assessment
 * Detects high-risk patterns: rapid load increase, high soreness, low compliance.
 */
function _calculateInjuryRisk(log, profile) {
  const flags = [];
  let riskScore = 0;
  
  if (log.length >= 14) {
    const now = Date.now();
    const week1Load = log.filter(w => now - w.ts < 7 * 24 * 60 * 60 * 1000).reduce((s, w) => s + (w.avgRPE || 5), 0);
    const week4Load = log.filter(w => now - w.ts < 28 * 24 * 60 * 60 * 1000).reduce((s, w) => s + (w.avgRPE || 5), 0) / 4;
    
    if (week1Load > week4Load * 1.5) {
      flags.push('Rapid load increase detected');
      riskScore += 25;
    }
  }
  
  const recentSoreness = log.slice(-3).reduce((s, w) => s + (w.soreness || 0), 0) / 3;
  if (recentSoreness > 3) {
    flags.push('High soreness levels');
    riskScore += 20;
  }
  
  const recentCompliance = log.slice(-5).filter(w => w.completed).length / 5;
  if (recentCompliance < 0.6) {
    flags.push('Low compliance (possible overtraining)');
    riskScore += 15;
  }
  
  if (profile.injuryHistory && profile.injuryHistory.length > 0) {
    flags.push('Previous injury on file');
    riskScore += 10;
  }
  
  return { riskScore: Math.min(100, riskScore), flags };
}

/**
 * Profile Completeness Score
 * Rewards athletes who fill in their profile data (10 fields).
 */
function _profileCompleteness(profile) {
  const fields = [
    'sport', 'position', 'team', 'gradYear', 'age',
    'weight', 'height', 'trainingLevel', 'compPhase', 'daysPerWeek'
  ];
  const filled = fields.filter(f => profile[f] && profile[f] !== '').length;
  return Math.round((filled / fields.length) * 100);
}

/**
 * Helper: Calculate streak
 */
function _getStreak(log) {
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

// ────────────────────────────────────────────────────────────────
// READINESS RING HELPERS
// ────────────────────────────────────────────────────────────────

export function getReadinessRingOffsetElite(score = _calculateReadinessElite().raw) {
  return Math.round(((100 - score) / 100) * 289);
}

export function getReadinessColorElite(score = _calculateReadinessElite().raw) {
  if (score >= 85) return '#10b981'; // Emerald: Peak
  if (score >= 75) return '#22c955'; // Green: High
  if (score >= 60) return '#f59e0b'; // Amber: Moderate
  if (score >= 45) return '#f97316'; // Orange: Low
  return '#ef4444'; // Red: Critical
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
// EXPORT LEGACY FUNCTIONS (for backward compatibility)
// ────────────────────────────────────────────────────────────────

export function getScoreBreakdown() {
  return getScoreBreakdownElite();
}

export function getPIQScore() {
  return getScoreBreakdownElite().total;
}

export function getReadinessScore() {
  return _calculateReadinessElite().raw;
}

export function getReadinessRingOffset(score) {
  return getReadinessRingOffsetElite(score);
}

export function getReadinessColor(score) {
  return getReadinessColorElite(score);
}

export function getReadinessExplain(score) {
  return getReadinessExplainElite(score);
}

export function getStreak() {
  return _getStreak(getState().workoutLog);
}

export function getWorkoutCount() {
  return getState().workoutLog.length;
}

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

// ────────────────────────────────────────────────────────────────
// DASHBOARD CONFIG (unchanged)
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
