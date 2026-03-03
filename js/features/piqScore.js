// /js/features/piqScore.js
// FIX BUG-12: Default values were 0, which penalized athletes with no data logged.
//   An athlete with no data should get a neutral score (~50), not near 0.
//   Defaults now use midpoint values (5/10) for unlogged fields.
//   Callers that want to signal "no data" should pass explicit null and handle separately.
//
// Score is 0-100. Inputs are scaled 0-10 for wellness fields.

export function computePIQ({
  sleep     = 5,   // 0-10: higher is better
  soreness  = 5,   // 0-10: higher soreness = worse (inverted below)
  stress    = 5,   // 0-10: higher stress = worse (inverted below)
  mood      = 5,   // 0-10: higher is better
  readiness = 5,   // 0-10: higher is better
} = {}) {
  const clamp = (x) => Math.max(0, Math.min(10, Number(x) ?? 5));

  const sSleep   = clamp(sleep);
  const sSore    = 10 - clamp(soreness);   // invert: low soreness = good
  const sStress  = 10 - clamp(stress);     // invert: low stress = good
  const sMood    = clamp(mood);
  const sReady   = clamp(readiness);

  // Weights sum to 1.0
  const w = {
    sleep:    0.25,
    soreness: 0.20,
    stress:   0.20,
    mood:     0.15,
    readiness: 0.20,
  };

  const score0to10 =
    sSleep   * w.sleep    +
    sSore    * w.soreness +
    sStress  * w.stress   +
    sMood    * w.mood     +
    sReady   * w.readiness;

  const score = Math.round(score0to10 * 10);

  const breakdown = [
    { key: "Sleep",              value: sSleep,  weight: w.sleep    },
    { key: "Soreness (inverse)", value: sSore,   weight: w.soreness },
    { key: "Stress (inverse)",   value: sStress, weight: w.stress   },
    { key: "Mood",               value: sMood,   weight: w.mood     },
    { key: "Readiness",          value: sReady,  weight: w.readiness},
  ];

  return { score, breakdown };
}
