// nutritionEngine.js — v2.0.0

(function () {
  "use strict";
  if (window.nutritionEngine) return;

  function calcTargets(profile) {
    // Simple, stable, offline-first targets.
    // You can later replace with sport/phase tuned equations without changing UI contracts.
    const days = Number(profile.days_per_week || 4);
    const baseCals = 2400 + (days - 4) * 150;

    // Macro split:
    const protein_g = 160;
    const fat_g = 70;
    const calsFromPF = protein_g * 4 + fat_g * 9;
    const carbs_g = Math.max(200, Math.round((baseCals - calsFromPF) / 4));

    return { calories: baseCals, protein_g, carbs_g, fat_g };
  }

  function adherenceFromLog(targets, log) {
    if (!log) return { score: 0, flags: ["No nutrition logged"] };
    const p = Number(log.protein_g || 0);
    const c = Number(log.carbs_g || 0);
    const f = Number(log.fat_g || 0);
    const cal = Number(log.calories || 0);

    const pct = (a, b) => (b <= 0 ? 0 : (a / b) * 100);
    const pPct = pct(p, targets.protein_g);
    const cPct = pct(c, targets.carbs_g);
    const fPct = pct(f, targets.fat_g);
    const calPct = pct(cal, targets.calories);

    const score = Math.round((clamp01(pPct/100) + clamp01(cPct/100) + clamp01(fPct/100) + clamp01(calPct/100)) / 4 * 100);

    const flags = [];
    if (pPct < 80) flags.push("Protein low");
    if (calPct < 80) flags.push("Calories low");
    if (calPct > 120) flags.push("Calories high");
    if (cPct < 70) flags.push("Carbs low");
    return { score, flags };
  }

  function clamp01(x){ return Math.max(0, Math.min(1, x)); }

  window.nutritionEngine = { calcTargets, adherenceFromLog };
})();
