// nutritionEngine.js — v2.0.0 (auto macro targets)
(function () {
  "use strict";
  if (window.nutritionEngine) return;

  // Simple, practical defaults (can be upgraded later)
  // Inputs: weight_lbs, goal ("maintain"|"gain"|"cut"), activity ("low"|"med"|"high")
  function macroTargets({ weight_lbs = 160, goal = "maintain", activity = "med" } = {}) {
    const w = Math.max(80, Number(weight_lbs) || 160);

    // Protein: athletes ~0.8–1.0 g/lb baseline
    const protein = Math.round(w * (goal === "cut" ? 1.0 : 0.9));

    // Fats: ~0.3 g/lb baseline
    const fat = Math.round(w * 0.3);

    // Calories estimate (very rough; tuned for usability)
    let cal = w * 15; // base
    if (activity === "high") cal += 250;
    if (activity === "low") cal -= 200;
    if (goal === "gain") cal += 250;
    if (goal === "cut") cal -= 300;

    // Carbs fill remaining calories
    const proteinCals = protein * 4;
    const fatCals = fat * 9;
    const remaining = Math.max(0, cal - proteinCals - fatCals);
    const carbs = Math.round(remaining / 4);

    return { calories: Math.round(cal), protein_g: protein, carbs_g: carbs, fat_g: fat };
  }

  window.nutritionEngine = { macroTargets };
})();
