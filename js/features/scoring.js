// /js/features/scoring.js
// PerformanceIQ Score Engine v1 (offline-first, explainable, tolerant of missing data)

// Weights sum to 100.
export const SCORE_WEIGHTS_V1 = Object.freeze({
  trainingConsistency: 30, // last 7 days
  wellnessReadiness: 25,   // last 3 days avg
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
  // local date key (YYYY-MM-DD)
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
  const start = daysAgoDate(nDays - 1); // inclusive range
  const dd = new Date(dateLike);
  dd.setHours(0, 0, 0, 0);
  return dd.getTime() >= start.getTime();
}

function safeArray(x) { return Array.isArray(x) ? x : []; }
function safeNumber(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

// -----------------------------
// Data adapters (tolerant)
// -----------------------------
// You can store logs either on athlete or in global STATE.
// This engine checks athlete first, then optional state buckets.
//
// Expected (any of these work):
// athlete.sessions: [{ date, minutes, intensity(1-5) }]
// athlete.trainingLogs: same shape
// athlete.wellnessLogs: [{ date, readiness(1-5) }] OR { sleep(1-5), soreness(1-5), stress(1-5) }
// athlete.nutritionLogs: [{ date, adherence(0-1) }] OR { caloriesHit(true/false) }
// athlete.injury: { status: "healthy"|"limited"|"out", note? }
//
// Optional global fallback:
// state.events: can include { type:"session"|"wellness"|"nutrition", athleteId, date, ... }

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

  const sessions =
    safeArray(a.sessions).length ? safeArray(a.sessions) :
    safeArray(a.trainingLogs).length ? safeArray(a.trainingLogs) :
    fromState.sessions;

  const wellness =
    safeArray(a.wellnessLogs).length ? safeArray(a.wellnessLogs) :
    fromState.wellness;

  const nutrition =
    safeArray(a.nutritionLogs).length ? safeArray(a.nutritionLogs) :
    // state-level nutrition bucket you already have (STATE.nutrition.logs) can be global,
    // but without athleteId it can’t be attributed reliably—so only use events fallback.
    fromState.nutrition;

  const injury = (a.injury && typeof a.injury === "object") ? a.injury : null;

  return { sessions, wellness, nutrition, injury };
}

// -----------------------------
// Subscores (0..100 each)
// -----------------------------

// Training consistency: target sessions per week.
// Default target = 4 sessions/week.
// Score: 0 sessions => 0, target => 100, above target stays 100.
function scoreTrainingConsistency(sessions, targetPerWeek = 4) {
  const last7 = safeArray(sessions).filter(s => inLastNDays(s?.date, 7));
  const count = last7.length;
  const ratio = targetPerWeek > 0 ? (count / targetPerWeek) : 0;
  return {
    score: Math.round(clamp(ratio * 100, 0, 100)),
    detail: { last7Count: count, targetPerWeek }
  };
}

// Wellness readiness: last 3 days average readiness mapped to 0..100.
// readiness inputs supported:
// - entry.readiness (1..5)
// - or average of sleep/soreness/stress (all 1..5) if present
function scoreWellnessReadiness(wellness) {
  const last3 = safeArray(wellness).filter(w => inLastNDays(w?.date, 3));
  if (!last3.length) {
    return { score: 50, detail: { note: "No wellness logs (default 50)" } };
  }

  const vals = last3.map(w => {
    const r = safeNumber(w?.readiness, NaN);
    if (Number.isFinite(r)) return r;

    // fallback composite
    const sleep = safeNumber(w?.sleep, NaN);
    const soreness = safeNumber(w?.soreness, NaN);
    const stress = safeNumber(w?.stress, NaN);
    const parts = [sleep, soreness, stress].filter(Number.isFinite);
    if (!parts.length) return NaN;
    const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
    return avg;
  }).filter(Number.isFinite);

  if (!vals.length) {
    return { score: 50, detail: { note: "Wellness logs missing readiness fields (default 50)" } };
  }

  const avg = vals.reduce((a, b) => a + b, 0) / vals.length; // 1..5
  const normalized = ((avg - 1) / 4) * 100; // 1->0, 5->100
  return {
    score: Math.round(clamp(normalized, 0, 100)),
    detail: { last3AvgReadiness: Number(avg.toFixed(2)), samples: vals.length }
  };
}

// Load balance: compare acute (7d) to chronic (28d) load.
// Load per session = minutes * intensity (default intensity=3).
// If chronic is 0 but acute > 0, score down (spike).
function scoreLoadBalance(sessions) {
  const sess = safeArray(sessions);

  function loadOf(s) {
    const minutes = safeNumber(s?.minutes, 0);
    const intensity = clamp(safeNumber(s?.intensity, 3), 1, 5);
    return minutes * intensity;
  }

  const acute = sess.filter(s => inLastNDays(s?.date, 7)).reduce((sum, s) => sum + loadOf(s), 0);
  const chronic = sess.filter(s => inLastNDays(s?.date, 28)).reduce((sum, s) => sum + loadOf(s), 0);

  if (chronic <= 0) {
    // If no chronic history, treat as neutral if also no acute; otherwise penalize a bit.
    const score = acute <= 0 ? 70 : 40;
    return { score, detail: { acuteLoad: Math.round(acute), chronicLoad: Math.round(chronic), ratio: null } };
  }

  const ratio = acute / (chronic / 4); // compare 7d to weekly average over 28d
  // Ideal ratio band around 0.8..1.2; penalize outside.
  let score;
  if (ratio >= 0.8 && ratio <= 1.2) score = 100;
  else if (ratio < 0.8) score = Math.round(clamp(100 - ((0.8 - ratio) / 0.8) * 50, 50, 100)); // down to ~50
  else score = Math.round(clamp(100 - ((ratio - 1.2) / 1.2) * 80, 0, 100)); // spikes penalized more

  return {
    score,
    detail: { acuteLoad: Math.round(acute), chronicLoad: Math.round(chronic), ratio: Number(ratio.toFixed(2)) }
  };
}

// Nutrition adherence: last 7 days average adherence.
// Supported:
// - entry.adherence in [0..1] (preferred)
// - entry.hit === true/false (mapped to 1/0)
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

  const avg = vals.reduce((x, y) => x + y, 0) / vals.length; // 0..1
  return {
    score: Math.round(clamp(avg * 100, 0, 100)),
    detail: { last7AvgAdherence: Number(avg.toFixed(2)), samples: vals.length }
  };
}

// Injury modifier: penalty 0..10 (higher penalty reduces total).
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

  // Weighted total: sum(weights * subscores/100) minus injury penalty bucket.
  const w = SCORE_WEIGHTS_V1;

  const weighted =
    (w.trainingConsistency * (training.score / 100)) +
    (w.wellnessReadiness * (wellness.score / 100)) +
    (w.loadBalance * (load.score / 100)) +
    (w.nutritionAdherence * (nutrition.score / 100));

  // Injury bucket is a penalty out of 10 points max.
  const total = clamp(Math.round(weighted - injury.penalty), 0, 100);

  const breakdown = {
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

  return breakdown;
}

export function explainScore(breakdown) {
  // Returns short “why” bullets
  const d = breakdown?.details || {};
  const subs = breakdown?.subscores || {};
  const bullets = [];

  if (d.training?.last7Count != null) {
    bullets.push(`Training: ${d.training.last7Count} sessions in last 7 days (score ${subs.trainingConsistency}).`);
  } else {
    bullets.push(`Training: score ${subs.trainingConsistency}.`);
  }

  if (d.wellness?.last3AvgReadiness != null) {
    bullets.push(`Wellness: avg readiness ${d.wellness.last3AvgReadiness} over last 3 days (score ${subs.wellnessReadiness}).`);
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
