// js/engine/readinessEngine.js
// Readiness scoring with full explainability layer

export function computeReadiness(wellness = {}) {
  const {
    sleep_hours = 7,
    soreness = 5,
    stress = 5,
    energy = 5,
    mood = 5,
  } = wellness || {};

  const safeSleep = toNumber(sleep_hours, 7);
  const safeSoreness = clamp(toNumber(soreness, 5), 1, 10);
  const safeStress = clamp(toNumber(stress, 5), 1, 10);
  const safeEnergy = clamp(toNumber(energy, 5), 1, 10);
  const safeMood = clamp(toNumber(mood, 5), 1, 10);

  const sleepScore = calcSleepScore(safeSleep);
  const sorenessScore = calcSorenessScore(safeSoreness);
  const stressScore = calcStressScore(safeStress);
  const energyScore = calcEnergyScore(safeEnergy);
  const moodScore = calcMoodScore(safeMood);

  const rawScore =
    sleepScore * 0.30 +
    sorenessScore * 0.25 +
    stressScore * 0.20 +
    energyScore * 0.15 +
    moodScore * 0.10;

  const score = Math.round(clamp(rawScore, 0, 100));

  const factors = buildFactors({
    sleep_hours: safeSleep,
    soreness: safeSoreness,
    stress: safeStress,
    energy: safeEnergy,
    mood: safeMood,
    sleepScore,
    sorenessScore,
    stressScore,
    energyScore,
    moodScore,
  });

  const { recommendation, intensity_mod } = getRecommendation(score, factors);
  const why = buildWhyCopy(score, factors, safeSleep, safeSoreness, safeStress, safeEnergy);

  return {
    score,
    components: { sleepScore, sorenessScore, stressScore, energyScore, moodScore },
    factors,
    why,
    recommendation,
    intensity_mod,
  };
}

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
  return Math.max(0, 100 - (soreness - 1) * 12);
}

function calcStressScore(stress) {
  return Math.max(0, 100 - (stress - 1) * 11);
}

function calcEnergyScore(energy) {
  return Math.round((energy / 10) * 100);
}

function calcMoodScore(mood) {
  return Math.round((mood / 10) * 100);
}

function buildFactors({ sleep_hours, soreness, stress, energy, mood, sleepScore, sorenessScore, stressScore, energyScore, moodScore }) {
  const factors = [];

  if (sleepScore >= 85) factors.push({ key: 'sleep', valence: 'positive', text: `strong sleep (${sleep_hours}h)` });
  else if (sleepScore >= 60) factors.push({ key: 'sleep', valence: 'neutral', text: `adequate sleep (${sleep_hours}h)` });
  else factors.push({ key: 'sleep', valence: 'negative', text: `limited sleep (${sleep_hours}h)` });

  if (sorenessScore >= 75) factors.push({ key: 'soreness', valence: 'positive', text: 'muscles feel fresh' });
  else if (sorenessScore >= 50) factors.push({ key: 'soreness', valence: 'neutral', text: `moderate soreness (${soreness}/10)` });
  else factors.push({ key: 'soreness', valence: 'negative', text: `elevated soreness (${soreness}/10)` });

  if (stressScore >= 75) factors.push({ key: 'stress', valence: 'positive', text: 'stress levels are low' });
  else if (stressScore >= 50) factors.push({ key: 'stress', valence: 'neutral', text: `moderate stress (${stress}/10)` });
  else factors.push({ key: 'stress', valence: 'negative', text: `high stress load (${stress}/10)` });

  if (energyScore >= 70) factors.push({ key: 'energy', valence: 'positive', text: `energy is high (${energy}/10)` });
  else if (energyScore >= 50) factors.push({ key: 'energy', valence: 'neutral', text: `moderate energy (${energy}/10)` });
  else factors.push({ key: 'energy', valence: 'negative', text: `low energy (${energy}/10)` });

  if (moodScore >= 70) factors.push({ key: 'mood', valence: 'positive', text: `mood is good (${mood}/10)` });
  else if (moodScore >= 50) factors.push({ key: 'mood', valence: 'neutral', text: `mood is fair (${mood}/10)` });
  else factors.push({ key: 'mood', valence: 'negative', text: `mood is low (${mood}/10)` });

  return factors;
}

function buildWhyCopy(score, factors) {
  const negatives = factors.filter((f) => f.valence === 'negative');
  const positives = factors.filter((f) => f.valence === 'positive');

  if (score >= 85) {
    const pos = positives.slice(0, 2).map((f) => f.text).join(' and ');
    return `Your body is primed today — ${pos}. This is a great day to push intensity.`;
  }

  if (score >= 70) {
    if (negatives.length === 0) {
      return 'All markers are in a good range. A normal training session is appropriate.';
    }
    return `Most markers look good, but ${negatives[0].text} is nudging your score down. Train normally and monitor how you feel.`;
  }

  if (score >= 55) {
    const negs = negatives.slice(0, 2).map((f) => f.text).join(' and ');
    return `Your score dropped due to ${negs}. Reduce intensity by 15–20% and avoid max-effort sets today.`;
  }

  const negs = negatives.length
    ? negatives.map((f) => f.text).join(', ')
    : 'multiple recovery markers';
  return `Recovery is incomplete — ${negs}. A full training session would increase injury risk. Stick to active recovery work.`;
}

function getRecommendation(score) {
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

export function computeRecoveryScore(wellness = {}, prevWellness = null) {
  if (!prevWellness) return 70;

  const currentSoreness = clamp(toNumber(wellness.soreness, 5), 1, 10);
  const previousSoreness = clamp(toNumber(prevWellness.soreness, 5), 1, 10);
  const currentEnergy = clamp(toNumber(wellness.energy, 5), 1, 10);
  const previousEnergy = clamp(toNumber(prevWellness.energy, 5), 1, 10);
  const sleepHours = toNumber(wellness.sleep_hours, 7);

  const sorenessImproved = previousSoreness - currentSoreness;
  const energyImproved = currentEnergy - previousEnergy;
  const sleepOk = sleepHours >= 7.0;

  let score = 60;
  score += sorenessImproved * 5;
  score += energyImproved * 4;
  if (sleepOk) score += 10;

  return clamp(Math.round(score), 0, 100);
}

export function computeFatigueScore(wellness = {}) {
  const soreness = clamp(toNumber(wellness.soreness, 5), 1, 10);
  const stress = clamp(toNumber(wellness.stress, 5), 1, 10);
  const energy = clamp(toNumber(wellness.energy, 5), 1, 10);
  const sleep_hours = toNumber(wellness.sleep_hours, 7);

  const fatigueRaw =
    (soreness / 10) * 35 +
    (stress / 10) * 25 +
    ((10 - energy) / 10) * 25 +
    (Math.max(0, 8 - sleep_hours) / 8) * 15;

  return clamp(Math.round(fatigueRaw), 0, 100);
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
