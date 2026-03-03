// /js/features/scoring.js
// PerformanceIQ Score Engine v1 (offline-first, explainable, tolerant of missing data)
// Adapted to your actual model: athlete.history.sessions / athlete.history.wellness

// Weights sum to 100 (injury is a penalty bucket subtracted after weighting).
export const SCORE_WEIGHTS_V1 = Object.freeze({
  trainingConsistency: 30, // last 7 days
  wellnessReadiness: 25,   // last 3 days average
  loadBalance: 20,         // acute vs chronic (7 vs 28)
  nutritionAdherence: 15,  // last 7 days adherence %
  injuryModifier: 10       // penalty bucket (0..10)
});

// -----------------------------
// Utilities
// -----------------------------
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function toDayKey(d) {
  const dt = (d instanceof Date) ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgoDate(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function inLastNDays(dateLike, nDays) {
  const dk = toDayKey(dateLike);
  if (!dk) return false;
  const start = daysAgoDate(nDays - 1);
  const dd = new Date(dateLike);
  dd.setHours(0, 0, 0, 0);
  return dd.getTime() >= start.getTime();
}

function safeArray(x) { return Array.isArray(x) ? x : []; }
function safeNumber(x, fallback = NaN) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}
function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }

// Normalize a wellness metric that might be on a 1–5 scale or 1–10 scale
// Returns number in [0..100] or NaN if invalid.
function normalizeScaleToPct(v) {
  const n = safeNumber(v, NaN);
  if (!Number.isFinite(n)) return NaN;

  // Heuristic: if > 5, treat as 1..10; else treat as 1..5
  if (n > 5) {
    // 1 -> 0, 10 -> 100
    return clamp(((n - 1) / 9) * 100, 0, 100);
  }
  // 1 -> 0, 5 -> 100
  return clamp(((n - 1) / 4) * 100, 0, 100);
}

// -----------------------------
// Data adapters (tolerant)
// -----------------------------
function getAthleteLogsFromState(state, athleteId) {
  const events = safeArray(state?.events);
  const mine = events.filter(e => e && e.athleteId === athleteId);
  return {
    sessions: mine.filter(e => e.type === "session"),
    wellness: mine.filter(e => e.type === "wellness"),
    nutrition: mine.filter(e => e.type === "nutrition")
  };
}

function getLogs(athlete, state) {
  const a = athlete || {};
  const fromState = getAthleteLogsFromState(state, a.id);

  // ✅ Your real model is athlete.history.sessions / athlete.history.wellness
  const historySessions = safeArray(a?.history?.sessions);
  const historyWellness = safeArray(a?.history?.wellness);
  const historyNutrition = safeArray(a?.history?.nutrition);

  const sessions =
    historySessions.length ? historySessions :
    safeArray(a.sessions).length ? safeArray(a.sessions) :
    safeArray(a.trainingLogs).length ? safeArray(a.trainingLogs) :
    fromState.sessions;

  const wellness =
    historyWellness.length ? historyWellness :
    safeArray(a.wellnessLogs).length ? safeArray(a.wellnessLogs) :
    fromState.wellness;

  const nutrition =
    historyNutrition.length ? historyNutrition :
    safeArray(a.nutritionLogs).length ? safeArray(a.nutritionLogs) :
    fromState.nutrition;

  const injury = (a.injury && isObj(a.injury)) ? a.injury : null;

  return { sessions, wellness, nutrition, injury };
}

// -----------------------------
// Subscores (0..100 each)
// -----------------------------

function scoreTrainingConsistency(sessions, targetPerWeek = 4) {
  const last7 = safeArray(sessions).filter(s => inLastNDays(s?.date, 7));
  const count = last7.length;
  const ratio = targetPerWeek > 0 ? (count / targetPerWeek) : 0;

  return {
    score: Math.round(clamp(ratio * 100, 0, 100)),
    detail: { last7Count: count, targetPerWeek }
  };
}

// Wellness readiness: last 3 days average as 0..100
// Supports:
// - readiness (1..5 or 1..10)
// - or composite sleep/soreness/stress (same scale logic)
function scoreWellnessReadiness(wellness) {
  const last3 = safeArray(wellness).filter(w => inLastNDays(w?.date, 3));
  if (!last3.length) {
    return { score: 50, detail: { note: "No wellness logs (default 50)" } };
  }

  const valsPct = last3.map(w => {
    // Prefer readiness if present
    const r = normalizeScaleToPct(w?.readiness);
    if (Number.isFinite(r)) return r;

    // Composite fallback
    const sleep = normalizeScaleToPct(w?.sleep);
    const soreness = normalizeScaleToPct(w?.soreness);
    const stress = normalizeScaleToPct(w?.stress);
    const mood = normalizeScaleToPct(w?.mood);

    const parts = [sleep, soreness, stress, mood].filter(Number.isFinite);
    if (!parts.length) return NaN;
    return parts.reduce((a, b) => a + b, 0) / parts.length;
  }).filter(Number.isFinite);

  if (!valsPct.length) {
    return { score: 50, detail: { note: "Wellness logs missing readiness fields (default 50)" } };
  }

  const avgPct = valsPct.reduce((a, b) => a + b, 0) / valsPct.length;

  return {
    score: Math.round(clamp(avgPct, 0, 100)),
    detail: { last3AvgReadinessPct: Number(avgPct.toFixed(1)), samples: valsPct.length }
  };
}

// Load balance: acute (7d) vs chronic (28d).
// Uses session.load if present, else minutes*intensity.
function scoreLoadBalance(sessions) {
  const sess = safeArray(sessions);

  function loadOf(s) {
    // ✅ Your sessions already use .load in athlete detail UI
    const direct = safeNumber(s?.load, NaN);
    if (Number.isFinite(direct)) return Math.max(0, direct);

    // Fallback if you have minutes/intensity fields
    const minutes = safeNumber(s?.minutes, 0);
    const intensity = clamp(safeNumber(s?.intensity, 3), 1, 5);
    return Math.max(0, minutes * intensity);
  }

  const acute = sess
    .filter(s => inLastNDays(s?.date, 7))
    .reduce((sum, s) => sum + loadOf(s), 0);

  const chronic = sess
    .filter(s => inLastNDays(s?.date, 28))
    .reduce((sum, s) => sum + loadOf(s), 0);

  if (chronic <= 0) {
    const score = acute <= 0 ? 70 : 40;
    return {
      score,
      detail: { acuteLoad: Math.round(acute), chronicLoad: Math.round(chronic), ratio: null, note: "No 28-day history" }
    };
  }

  // Compare acute week to weekly avg over 28 days (chronic/4)
  const ratio = acute / (chronic / 4);

  // Ideal band 0.8–1.2
  let score;
  if (ratio >= 0.8 && ratio <= 1.2) score = 100;
  else if (ratio < 0.8) score = Math.round(clamp(100 - ((0.8 - ratio) / 0.8) * 50, 50, 100));
  else score = Math.round(clamp(100 - ((ratio - 1.2) / 1.2) * 80, 0, 100));

  return {
    score,
    detail: {
      acuteLoad: Math.round(acute),
      chronicLoad: Math.round(chronic),
      ratio: Number(ratio.toFixed(2))
    }
  };
}

// Nutrition adherence: last 7 days average adherence.
// Supported:
// - entry.adherence in [0..1]
// - entry.hit boolean
function scoreNutritionAdherence(nutrition) {
  const last7 = safeArray(nutrition).filter(n => inLastNDays(n?.date, 7));
  if (!last7.length) {
    return { score: 60, detail: { note: "No nutrition logs (default 60)" } };
  }

  const vals = last7.map(n => {
    const a = safeNumber(n?.adherence, NaN);
    if (Number.isFinite(a)) return clamp(a, 0, 1);
    if (typeof n?.hit === "boolean") return n.hit ? 1 : 0;
    return NaN;
  }).filter(Number.isFinite);

  if (!vals.length) {
    return { score: 60, detail: { note: "Nutrition logs missing adherence fields (default 60)" } };
  }

  const avg = vals.reduce((x, y) => x + y, 0) / vals.length;
  return {
    score: Math.round(clamp(avg * 100, 0, 100)),
    detail: { last7AvgAdherence: Number(avg.toFixed(2)), samples: vals.length }
  };
}

function injuryPenalty(injury) {
  const status = String(injury?.status || "healthy").toLowerCase();
  if (status === "out") return { penalty: 10, detail: { status } };
  if (status === "limited") return { penalty: 6, detail: { status } };
  return { penalty: 0, detail: { status: "healthy" } };
}

// -----------------------------
// Public API
// -----------------------------
export function computeAthleteScoreV1(athlete, { state } = {}) {
  const logs = getLogs(athlete, state);

  const training = scoreTrainingConsistency(logs.sessions, 4);
  const wellness = scoreWellnessReadiness(logs.wellness);
  const load = scoreLoadBalance(logs.sessions);
  const nutrition = scoreNutritionAdherence(logs.nutrition);
  const injury = injuryPenalty(logs.injury);

  const w = SCORE_WEIGHTS_V1;

  const weighted =
    (w.trainingConsistency * (training.score / 100)) +
    (w.wellnessReadiness * (wellness.score / 100)) +
    (w.loadBalance * (load.score / 100)) +
    (w.nutritionAdherence * (nutrition.score / 100));

  const total = clamp(Math.round(weighted - injury.penalty), 0, 100);

  return {
    total,
    subscores: {
      trainingConsistency: training.score,
      wellnessReadiness: wellness.score,
      loadBalance: load.score,
      nutritionAdherence: nutrition.score
    },
    injuryPenalty: injury.penalty,
    details: {
      training: training.detail,
      wellness: wellness.detail,
      load: load.detail,
      nutrition: nutrition.detail,
      injury: injury.detail
    },
    weights: w
  };
}

export function explainScore(breakdown) {
  const d = breakdown?.details || {};
  const subs = breakdown?.subscores || {};
  const bullets = [];

  if (d.training?.last7Count != null) {
    bullets.push(`Training: ${d.training.last7Count} sessions in last 7 days (score ${subs.trainingConsistency}).`);
  } else {
    bullets.push(`Training: score ${subs.trainingConsistency}.`);
  }

  if (d.wellness?.last3AvgReadinessPct != null) {
    bullets.push(`Wellness: avg readiness ${d.wellness.last3AvgReadinessPct}% over last 3 days (score ${subs.wellnessReadiness}).`);
  } else {
    bullets.push(`Wellness: score ${subs.wellnessReadiness}.`);
  }

  if (d.load?.ratio != null) {
    bullets.push(`Load: acute/chronic ratio ${d.load.ratio} (score ${subs.loadBalance}).`);
  } else {
    bullets.push(`Load: score ${subs.loadBalance}.`);
  }

  if (d.nutrition?.last7AvgAdherence != null) {
    bullets.push(`Nutrition: avg adherence ${d.nutrition.last7AvgAdherence} over last 7 days (score ${subs.nutritionAdherence}).`);
  } else {
    bullets.push(`Nutrition: score ${subs.nutritionAdherence}.`);
  }

  if (breakdown?.injuryPenalty) {
    bullets.push(`Injury penalty: -${breakdown.injuryPenalty} (status: ${d.injury?.status || "unknown"}).`);
  }

  bullets.push(`Total: ${breakdown.total}/100.`);
  return bullets;
      }
