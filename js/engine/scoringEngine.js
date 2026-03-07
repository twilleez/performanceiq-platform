// js/engine/scoringEngine.js
// PIQ Score = 30% readiness + 25% compliance + 20% performance + 15% recovery + 10% nutrition

export function computePIQScore({ readiness, compliance, performance, recovery, nutrition } = {}) {
  const safeReadiness = toNumber(readiness, 70);
  const safeCompliance = toNumber(compliance, 80);
  const safePerformance = toNumber(performance, 75);
  const safeRecovery = toNumber(recovery, 70);
  const safeNutrition = toNumber(nutrition, 70);

  const score = Math.round(
    safeReadiness * 0.30 +
    safeCompliance * 0.25 +
    safePerformance * 0.20 +
    safeRecovery * 0.15 +
    safeNutrition * 0.10
  );

  return clamp(score, 0, 100);
}

export function computeACWR(acuteLoad, chronicLoad) {
  const acute = toNumber(acuteLoad, 0);
  const chronic = toNumber(chronicLoad, 0);

  if (!chronic) return 1.0;
  return Math.round((acute / chronic) * 100) / 100;
}

export function computeCompliance(sessions = []) {
  if (!Array.isArray(sessions) || sessions.length === 0) return 80;
  const completed = sessions.filter((s) => !!s?.completed).length;
  return Math.round((completed / sessions.length) * 100);
}

export function normalizePerformance(testName, value, sport = 'general') {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 70;

  const norms = {
    'Vertical Jump': { min: 16, max: 40, higherBetter: true },
    '40-Yard Dash': { min: 4.3, max: 5.5, higherBetter: false },
    'Bench Press': { min: 95, max: 315, higherBetter: true },
    'Squat 1RM': { min: 135, max: 500, higherBetter: true },
  };

  const norm = norms[testName];
  if (!norm) return 70;

  const denominator = norm.max - norm.min;
  if (!denominator) return 70;

  const normalized = norm.higherBetter
    ? (numericValue - norm.min) / denominator
    : (norm.max - numericValue) / denominator;

  return clamp(Math.round(normalized * 100), 0, 100);
}

export function computePerformanceScore(testResults = []) {
  if (!Array.isArray(testResults) || testResults.length === 0) return 75;

  const scores = testResults.map((r) => normalizePerformance(r?.test, r?.value));
  if (!scores.length) return 75;

  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(average);
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
