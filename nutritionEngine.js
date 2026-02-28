// nutritionEngine.js — v1.0.0 (Elite Nutrition Add-on, offline-safe)
(function () {
  "use strict";
  if (window.nutritionEngine) return;

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function targets(profile) {
    const weight = Number(profile?.weight_lbs || 160);
    const goal = profile?.goal || "maintain";      // cut|maintain|bulk
    const activity = profile?.activity || "med";   // low|med|high

    // Simple offline targets (not medical advice):
    // Calories baseline: 14–17 kcal/lb depending on activity; goal adjusts.
    const activityMult = activity === "low" ? 14 : activity === "high" ? 17 : 15.5;
    let cals = weight * activityMult;
    if (goal === "cut") cals -= 250;
    if (goal === "bulk") cals += 250;
    cals = Math.round(cals);

    // Protein: 0.8–1.0 g/lb
    const protein = Math.round(weight * (activity === "high" ? 1.0 : 0.85));

    // Fat: ~0.35 g/lb
    const fat = Math.round(weight * 0.35);

    // Carbs: remainder
    const proteinCals = protein * 4;
    const fatCals = fat * 9;
    const carbCals = Math.max(0, cals - proteinCals - fatCals);
    const carbs = Math.round(carbCals / 4);

    return { calories: cals, protein_g: protein, carbs_g: carbs, fat_g: fat };
  }

  function complianceForDay(log, tgt) {
    if (!log || !tgt) return { score: 0, note: "No log" };

    // score each macro + calories (0..1), average
    function pct(actual, target) {
      if (!target) return 0;
      const r = actual / target;
      // full credit within 85%..115% of target
      if (r >= 0.85 && r <= 1.15) return 1;
      // fade out outside range
      const dist = r < 0.85 ? (0.85 - r) : (r - 1.15);
      return clamp(1 - dist / 0.85, 0, 1);
    }

    const p = pct(Number(log.protein_g || 0), tgt.protein_g);
    const c = pct(Number(log.carbs_g || 0), tgt.carbs_g);
    const f = pct(Number(log.fat_g || 0), tgt.fat_g);
    const k = pct(Number(log.calories || 0), tgt.calories);

    const score = (p + c + f + k) / 4;
    return { score, note: "Computed from macros + calories" };
  }

  window.nutritionEngine = { targets, complianceForDay };
})();
