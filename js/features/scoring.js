// /js/features/scoring.js
// PerformanceIQ Score Engine v1 (Unified)
// FIX: export cap() and pct() so sessionGenerator.js (and other consumers) can import them.

import { computePIQ } from './piqScore.js';

export const SCORE_WEIGHTS_V1 = Object.freeze({
  trainingConsistency: 30,
  wellnessPIQ:         25,
  loadBalance:         20,
  nutritionAdherence:  15,
  injuryModifier:      10,
});

// ─── Shared utilities (now exported) ─────────────────────────────
export function cap(str) {
  const s = String(str || '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Return `fraction` of `total`, rounded to nearest integer. */
export function pct(total, fraction) {
  return Math.round(Number(total) * fraction);
}

// ─── Internal helpers ────────────────────────────────────────────
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function safeArray(x) { return Array.isArray(x) ? x : []; }
function safeNumber(x, fallback = NaN) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}
function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }

function daysAgoDate(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}
function inLastNDays(dateLike, nDays) {
  const dt = new Date(dateLike);
  if (Number.isNaN(dt.getTime())) return false;
  dt.setHours(0, 0, 0, 0);
  const start = daysAgoDate(nDays - 1);
  return dt.getTime() >= start.getTime();
}

// ─── Data adapters ───────────────────────────────────────────────
function getAthleteLogsFromState(state, athleteId) {
  const events = safeArray(state?.events);
  const mine = events.filter(e => e && e.athleteId === athleteId);
  return {
    sessions:  mine.filter(e => e.type === 'session'),
    wellness:  mine.filter(e => e.type === 'wellness'),
    nutrition: mine.filter(e => e.type === 'nutrition'),
  };
}

function getLogs(athlete, state) {
  const a = athlete || {};
  const fromState = getAthleteLogsFromState(state, a.id);

  const sessions =
    safeArray(a?.history?.sessions).length ? safeArray(a.history.sessions) :
    safeArray(a.sessions).length           ? safeArray(a.sessions) :
    safeArray(a.trainingLogs).length       ? safeArray(a.trainingLogs) :
    fromState.sessions;

  const wellness =
    safeArray(a?.history?.wellness).length ? safeArray(a.history.wellness) :
    safeArray(a.wellnessLogs).length       ? safeArray(a.wellnessLogs) :
    fromState.wellness;

  const nutrition =
    safeArray(a?.history?.nutrition).length ? safeArray(a.history.nutrition) :
    safeArray(a.nutritionLogs).length       ? safeArray(a.nutritionLogs) :
    fromState.nutrition;

  const injury = (a.injury && isObj(a.injury)) ? a.injury : null;

  return { sessions, wellness, nutrition, injury };
}

// ─── Subscores (0..100) ──────────────────────────────────────────
function scoreTrainingConsistency(sessions, targetPerWeek = 4) {
  const last7 = safeArray(sessions).filter(s => inLastNDays(s?.date, 7));
  const count = last7.length;
  const ratio = targetPerWeek > 0 ? (count / targetPerWeek) : 0;
  return {
    score:  Math.round(clamp(ratio * 100, 0, 100)),
    detail: { last7Count: count, targetPerWeek },
  };
}

function scoreWellnessPIQ(wellness) {
  const last = safeArray(wellness).slice(-1)[0] || null;
  if (!last) return { score: 50, detail: { note: 'No wellness logs (default 50)' } };

  const piqResult = computePIQ({
    sleep:     last.sleep,
    soreness:  last.soreness,
    stress:    last.stress,
    mood:      last.mood,
    readiness: last.readiness,
  });

  return {
    score:  clamp(Number(piqResult?.score ?? 50), 0, 100),
    detail: { latestDate: last.date || null, breakdown: piqResult?.breakdown || [] },
  };
}

function scoreLoadBalance(sessions) {
  const sess = safeArray(sessions);

  function loadOf(s) {
    const direct = safeNumber(s?.load, NaN);
    if (Number.isFinite(direct)) return Math.max(0, direct);
    const minutes   = safeNumber(s?.minutes, 0);
    const intensity = clamp(safeNumber(s?.intensity, 3), 1, 5);
    return Math.max(0, minutes * intensity);
  }

  const acute  = sess.filter(s => inLastNDays(s?.date, 7)).reduce((sum, s) => sum + loadOf(s), 0);
  const chronic = sess.filter(s => inLastNDays(s?.date, 28)).reduce((sum, s) => sum + loadOf(s), 0);

  if (chronic <= 0) {
    const score = acute <= 0 ? 70 : 40;
    return { score, detail: { acuteLoad: Math.round(acute), chronicLoad: 0, ratio: null } };
  }

  const ratio = acute / (chronic / 4);
  let score;
  if (ratio >= 0.8 && ratio <= 1.2)  score = 100;
  else if (ratio < 0.8)              score = Math.round(clamp(100 - ((0.8 - ratio) / 0.8) * 50, 50, 100));
  else                               score = Math.round(clamp(100 - ((ratio - 1.2) / 1.2) * 80, 0, 100));

  return {
    score,
    detail: { acuteLoad: Math.round(acute), chronicLoad: Math.round(chronic), ratio: Number(ratio.toFixed(2)) },
  };
}

function scoreNutritionAdherence(nutrition) {
  const last7 = safeArray(nutrition).filter(n => inLastNDays(n?.date, 7));
  if (!last7.length) return { score: 60, detail: { note: 'No nutrition logs (default 60)' } };

  const vals = last7.map(n => {
    const a = safeNumber(n?.adherence, NaN);
    if (Number.isFinite(a)) return clamp(a, 0, 1);
    if (typeof n?.hit === 'boolean') return n.hit ? 1 : 0;
    return NaN;
  }).filter(Number.isFinite);

  if (!vals.length) return { score: 60, detail: { note: 'Nutrition logs missing adherence fields (default 60)' } };

  const avg = vals.reduce((x, y) => x + y, 0) / vals.length;
  return { score: Math.round(clamp(avg * 100, 0, 100)), detail: { last7AvgAdherence: Number(avg.toFixed(2)), samples: vals.length } };
}

function injuryPenalty(injury) {
  const status = String(injury?.status || 'healthy').toLowerCase();
  if (status === 'out')     return { penalty: 10, detail: { status } };
  if (status === 'limited') return { penalty: 6,  detail: { status } };
  return { penalty: 0, detail: { status: 'healthy' } };
}

// ─── Public API ──────────────────────────────────────────────────
export function computeAthleteScoreV1(athlete, { state } = {}) {
  const logs = getLogs(athlete, state);

  const training  = scoreTrainingConsistency(logs.sessions, 4);
  const wellness  = scoreWellnessPIQ(logs.wellness);
  const load      = scoreLoadBalance(logs.sessions);
  const nutrition = scoreNutritionAdherence(logs.nutrition);
  const injury    = injuryPenalty(logs.injury);

  const w = SCORE_WEIGHTS_V1;

  const weighted =
    (w.trainingConsistency * (training.score  / 100)) +
    (w.wellnessPIQ         * (wellness.score  / 100)) +
    (w.loadBalance         * (load.score      / 100)) +
    (w.nutritionAdherence  * (nutrition.score / 100));

  const total = clamp(Math.round(weighted - injury.penalty), 0, 100);

  return {
    total,
    subscores: {
      trainingConsistency: training.score,
      wellnessPIQ:         wellness.score,
      loadBalance:         load.score,
      nutritionAdherence:  nutrition.score,
    },
    injuryPenalty: injury.penalty,
    details: {
      training:  training.detail,
      wellness:  wellness.detail,
      load:      load.detail,
      nutrition: nutrition.detail,
      injury:    injury.detail,
    },
    weights: w,
  };
}

export function explainScore(b) {
  const d = b?.details  || {};
  const s = b?.subscores || {};
  const bullets = [];

  if (d.training?.last7Count != null)
    bullets.push(`Training: ${d.training.last7Count} sessions/7d (score ${s.trainingConsistency}).`);
  else
    bullets.push(`Training: score ${s.trainingConsistency}.`);

  bullets.push(`Wellness (PIQ): ${s.wellnessPIQ}.`);

  if (d.load?.ratio != null) bullets.push(`Load balance: ratio ${d.load.ratio} (score ${s.loadBalance}).`);
  else                       bullets.push(`Load balance: score ${s.loadBalance}.`);

  if (d.nutrition?.last7AvgAdherence != null)
    bullets.push(`Nutrition: ${d.nutrition.last7AvgAdherence} avg (score ${s.nutritionAdherence}).`);
  else
    bullets.push(`Nutrition: score ${s.nutritionAdherence}.`);

  if (b?.injuryPenalty) bullets.push(`Injury penalty: -${b.injuryPenalty}.`);

  bullets.push(`Total: ${b.total}/100.`);
  return bullets;
}
