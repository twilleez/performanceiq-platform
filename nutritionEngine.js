// nutritionEngine.js — v2.1.0 (auto targets + macro calories + quality helpers)
(function () {
  "use strict";
  if (window.nutritionEngine) return;

  // Inputs: weight_lbs, goal ("maintain"|"gain"|"cut"), activity ("low"|"med"|"high")
  function macroTargets({ weight_lbs = 160, goal = "maintain", activity = "med" } = {}) {
    const w = Math.max(80, Number(weight_lbs) || 160);

    // Practical defaults
    const protein = Math.round(w * (goal === "cut" ? 1.0 : 0.9)); // g/day
    const fat = Math.round(w * 0.3); // g/day

    let cal = w * 15;
    if (activity === "high") cal += 250;
    if (activity === "low") cal -= 200;
    if (goal === "gain") cal += 250;
    if (goal === "cut") cal -= 300;

    const proteinCals = protein * 4;
    const fatCals = fat * 9;
    const remaining = Math.max(0, cal - proteinCals - fatCals);
    const carbs = Math.round(remaining / 4);

    return { calories: Math.round(cal), protein_g: protein, carbs_g: carbs, fat_g: fat };
  }

  function caloriesFromMacros({ protein_g = 0, carbs_g = 0, fat_g = 0 } = {}) {
    const p = Math.max(0, Number(protein_g) || 0);
    const c = Math.max(0, Number(carbs_g) || 0);
    const f = Math.max(0, Number(fat_g) || 0);
    return Math.round(p * 4 + c * 4 + f * 9);
  }

  // Simple adherence score vs targets (0–100)
  function adherenceScore(consumed, target) {
    if (!consumed || !target) return 0;
    const keys = ["protein_g", "carbs_g", "fat_g"];
    let total = 0;
    keys.forEach((k) => {
      const a = Math.max(0, Number(consumed[k]) || 0);
      const t = Math.max(1, Number(target[k]) || 1);
      const ratio = Math.min(1.25, a / t); // allow slight over
      total += Math.max(0, Math.min(1, ratio));
    });
    return Math.round((total / keys.length) * 100);
  }

  window.nutritionEngine = {
    macroTargets,
    caloriesFromMacros,
    adherenceScore
  };
})();
