// /js/features/piqScore.js
// Transparent PIQ score breakdown.
// Inputs are scaled 0-10 for wellness fields.
// Score is 0-100.

export function computePIQ({ sleep = 0, soreness = 0, stress = 0, mood = 0, readiness = 0 } = {}) {
  const clamp = (x) => Math.max(0, Math.min(10, Number(x) || 0));

  const sSleep = clamp(sleep);      // higher is better
  const sSore = 10 - clamp(soreness); // lower soreness is better
  const sStress = 10 - clamp(stress); // lower stress is better
  const sMood = clamp(mood);
  const sReady = clamp(readiness);

  // Weights sum to 1.0
  const w = { sleep: 0.25, soreness: 0.20, stress: 0.20, mood: 0.15, readiness: 0.20 };

  const score0to10 =
    sSleep * w.sleep +
    sSore * w.soreness +
    sStress * w.stress +
    sMood * w.mood +
    sReady * w.readiness;

  const score = Math.round(score0to10 * 10);

  const breakdown = [
    { key: "Sleep", value: sSleep, weight: w.sleep },
    { key: "Soreness (inverse)", value: sSore, weight: w.soreness },
    { key: "Stress (inverse)", value: sStress, weight: w.stress },
    { key: "Mood", value: sMood, weight: w.mood },
    { key: "Readiness", value: sReady, weight: w.readiness }
  ];

  return { score, breakdown };
}
