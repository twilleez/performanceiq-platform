// js/engine/readinessEngine.js
// Readiness scoring with full explainability layer — the #1 trust driver

/**
 * Compute readiness score from wellness inputs.
 * Returns score (0-100) + human-readable why + recommendation.
 */
export function computeReadiness(wellness) {
  const { sleep_hours, soreness, stress, energy, mood } = wellness;

  // ── Component scores ──
  const sleepScore   = calcSleepScore(sleep_hours);
  const sorenessScore = calcSorenessScore(soreness);
  const stressScore  = calcStressScore(stress);
  const energyScore  = calcEnergyScore(energy);
  const moodScore    = calcMoodScore(mood);

  // Weighted composite (out of 100)
  const rawScore =
    sleepScore   * 0.30 +
    sorenessScore * 0.25 +
    stressScore  * 0.20 +
    energyScore  * 0.15 +
    moodScore    * 0.10;

  const score = Math.round(Math.min(100, Math.max(0, rawScore)));

  // ── Identify what drove the score ──
  const factors = buildFactors({ sleep_hours, soreness, stress, energy, mood, sleepScore, sorenessScore, stressScore, energyScore, moodScore });
  const { recommendation, intensity_mod } = getRecommendation(score, factors);
  const why = buildWhyCopy(score, factors, sleep_hours, soreness, stress, energy);

  return {
    score,
    components: { sleepScore, sorenessScore, stressScore, energyScore, moodScore },
    factors,
    why,
    recommendation,
    intensity_mod,  // multiplier for session load (0.5–1.0)
  };
}

// ── Sub-scorers ──

function calcSleepScore(hours) {
  if (hours >= 9.0) return 100;
  if (hours >= 8.0) return 95;
  if (hours >= 7.5) return 85;
  if (hours >= 7.0) return 75;
  if (hours >= 6.5) return 60;
  if (hours >= 6.0) return 45;
  if (hours >= 5.5) return 30;
  return 15;
}

function calcSorenessScore(soreness) {
  // Inverted — high soreness = low score
  return Math.max(0, 100 - (soreness - 1) * 12);
}

function calcStressScore(stress) {
  // Inverted
  return Math.max(0, 100 - (stress - 1) * 11);
}

function calcEnergyScore(energy) {
  return Math.round((energy / 10) * 100);
}

function calcMoodScore(mood) {
  return Math.round((mood / 10) * 100);
}

// ── Factor identification ──

function buildFactors({ sleep_hours, soreness, stress, energy, mood, sleepScore, sorenessScore, stressScore, energyScore, moodScore }) {
  const factors = [];

  if (sleepScore >= 85)     factors.push({ key: 'sleep', valence: 'positive', text: `strong sleep (${sleep_hours}h)` });
  else if (sleepScore >= 60) factors.push({ key: 'sleep', valence: 'neutral',  text: `adequate sleep (${sleep_hours}h)` });
  else                       factors.push({ key: 'sleep', valence: 'negative', text: `limited sleep (${sleep_hours}h)` });

  if (sorenessScore >= 75)  factors.push({ key: 'soreness', valence: 'positive', text: 'muscles feel fresh' });
  else if (sorenessScore >= 50) factors.push({ key: 'soreness', valence: 'neutral', text: `moderate soreness (${soreness}/10)` });
  else                       factors.push({ key: 'soreness', valence: 'negative', text: `elevated soreness (${soreness}/10)` });

  if (stressScore >= 75)    factors.push({ key: 'stress', valence: 'positive', text: 'stress levels are low' });
  else if (stressScore >= 50) factors.push({ key: 'stress', valence: 'neutral', text: `moderate stress (${stress}/10)` });
  else                       factors.push({ key: 'stress', valence: 'negative', text: `high stress load (${stress}/10)` });

  if (energyScore >= 70)    factors.push({ key: 'energy', valence: 'positive', text: `energy is high (${energy}/10)` });
  else if (energyScore >= 50) factors.push({ key: 'energy', valence: 'neutral', text: `moderate energy (${energy}/10)` });
  else                       factors.push({ key: 'energy', valence: 'negative', text: `low energy (${energy}/10)` });

  return factors;
}

// ── Why copy generator ──

function buildWhyCopy(score, factors, sleep_hours, soreness, stress, energy) {
  const negatives = factors.filter(f => f.valence === 'negative');
  const positives = factors.filter(f => f.valence === 'positive');

  if (score >= 85) {
    const pos = positives.slice(0, 2).map(f => f.text).join(' and ');
    return `Your body is primed today — ${pos}. This is a great day to push intensity.`;
  }

  if (score >= 70) {
    if (negatives.length === 0) {
      return `All markers are in a good range. A normal training session is appropriate.`;
    }
    const neg = negatives[0].text;
    return `Most markers look good, but ${neg} is nudging your score down. Train normally and monitor how you feel.`;
  }

  if (score >= 55) {
    const negs = negatives.slice(0, 2).map(f => f.text).join(' and ');
    return `Your score dropped due to ${negs}. Reduce intensity by 15–20% and avoid max-effort sets today.`;
  }

  // Low score
  const negs = negatives.map(f => f.text).join(', ');
  return `Recovery is incomplete — ${negs}. A full training session would increase injury risk. Stick to active recovery work.`;
}

// ── Recommendation ──

function getRecommendation(score, factors) {
  if (score >= 80) {
    return {
      recommendation: 'Full session. Target intensity is on point.',
      intensity_mod: 1.0,
    };
  }
  if (score >= 65) {
    return {
      recommendation: 'Normal session. Listen to your body and back off if you feel worse than expected.',
      intensity_mod: 0.9,
    };
  }
  if (score >= 50) {
    return {
      recommendation: 'Reduced load session. Drop working weights by 15–20% and skip max-effort sets.',
      intensity_mod: 0.75,
    };
  }
  return {
    recommendation: 'Active recovery only. Movement, stretching, and foam rolling — no heavy lifting.',
    intensity_mod: 0.5,
  };
}

// ── Recovery score (separate from readiness — focuses on bounce-back) ──
export function computeRecoveryScore(wellness, prevWellness) {
  if (!prevWellness) return 70; // default if no history
  const sorenessImproved = prevWellness.soreness - wellness.soreness;
  const energyImproved   = wellness.energy - prevWellness.energy;
  const sleepOk          = wellness.sleep_hours >= 7.0;
  let score = 60;
  score += sorenessImproved * 5;
  score += energyImproved * 4;
  if (sleepOk) score += 10;
  return Math.min(100, Math.max(0, Math.round(score)));
}

// ── Fatigue score ──
export function computeFatigueScore(wellness) {
  const { soreness, stress, energy, sleep_hours } = wellness;
  const fatigueRaw =
    (soreness / 10) * 35 +
    (stress / 10)   * 25 +
    ((10 - energy) / 10) * 25 +
    (Math.max(0, 8 - sleep_hours) / 8) * 15;
  return Math.min(100, Math.round(fatigueRaw));
}
