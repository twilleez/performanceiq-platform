// js/engine/scoringEngine.js
// PIQ Score = 30% readiness + 25% compliance + 20% performance + 15% recovery + 10% nutrition

/**
 * Compute today's PIQ score.
 * All inputs are 0-100 subscores.
 */
export function computePIQScore({ readiness, compliance, performance, recovery, nutrition }) {
  const score = Math.round(
    (readiness   ?? 70) * 0.30 +
    (compliance  ?? 80) * 0.25 +
    (performance ?? 75) * 0.20 +
    (recovery    ?? 70) * 0.15 +
    (nutrition   ?? 70) * 0.10
  );
  return Math.min(100, Math.max(0, score));
}

/**
 * Compute ACWR (Acute:Chronic Workload Ratio).
 * Optimal: 0.8–1.3 | Risk: > 1.5 | Undertrained: < 0.8
 */
export function computeACWR(acuteLoad, chronicLoad) {
  if (!chronicLoad || chronicLoad === 0) return 1.0;
  return Math.round((acuteLoad / chronicLoad) * 100) / 100;
}

/**
 * Compute compliance score from session completions.
 * @param {Array} sessions - last 7 sessions with {completed: boolean}
 */
export function computeCompliance(sessions) {
  if (!sessions || sessions.length === 0) return 80; // default
  const completed = sessions.filter(s => s.completed).length;
  return Math.round((completed / sessions.length) * 100);
}

/**
 * Normalize a performance test result to 0-100 scale.
 * Uses percentile bands by sport + test type.
 */
export function normalizePerformance(testName, value, sport = 'general') {
  // Simplified normalization — in production this would use sport-specific norms
  const norms = {
    'Vertical Jump':   { min: 16, max: 40, higherBetter: true },
    '40-Yard Dash':    { min: 4.3, max: 5.5, higherBetter: false },
    'Bench Press':     { min: 95, max: 315, higherBetter: true },
    'Squat 1RM':       { min: 135, max: 500, higherBetter: true },
  };

  const norm = norms[testName];
  if (!norm) return 70;

  const normalized = norm.higherBetter
    ? (value - norm.min) / (norm.max - norm.min)
    : (norm.max - value) / (norm.max - norm.min);

  return Math.min(100, Math.max(0, Math.round(normalized * 100)));
}

/**
 * Derive overall performance subscore from multiple test results.
 */
export function computePerformanceScore(testResults) {
  if (!testResults || testResults.length === 0) return 75;
  const scores = testResults.map(r => normalizePerformance(r.test, r.value));
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}
