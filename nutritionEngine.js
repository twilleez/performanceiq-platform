// nutritionEngine.js — v2.3.0 (Elite Nutrition + Meal Plan Generator + Sport-aware nudges)
(function () {
  "use strict";
  if (window.nutritionEngine) return;

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function calcAdherence(consumed, target) {
    if (!target) return 0;
    const keys = ["p", "c", "f", "water"];
    let score = 0;
    let count = 0;
    keys.forEach(k => {
      const t = Number(target[k] || 0);
      if (t <= 0) return;
      const v = Number(consumed[k] || 0);
      const ratio = v / t;
      // 100% at 1.0, small penalty for under/over
      const s = clamp(100 - Math.abs(1 - ratio) * 120, 0, 100);
      score += s;
      count++;
    });
    return count ? Math.round(score / count) : 0;
  }

  function sportMacroNudge(sport, dayType) {
    // small, safe adjustments (MVP) — final targets still user-controlled
    const s = (sport || "").toLowerCase();
    const isGame = dayType === "game";
    const isTraining = dayType === "training";
    const isRecovery = dayType === "recovery" || dayType === "rest";

    // Return % multipliers for protein/carbs/fat
    if (s.includes("basketball") || s.includes("soccer")) {
      return {
        p: isRecovery ? 1.05 : 1.0,
        c: isGame ? 1.15 : (isTraining ? 1.10 : 0.95),
        f: isGame ? 0.90 : 1.0
      };
    }
    if (s.includes("football")) {
      return {
        p: 1.10,
        c: isGame ? 1.10 : (isTraining ? 1.0 : 0.95),
        f: 1.05
      };
    }
    if (s.includes("baseball")) {
      return {
        p: 1.05,
        c: isGame ? 1.05 : (isTraining ? 1.0 : 0.95),
        f: 1.0
      };
    }
    if (s.includes("track") || s.includes("swim")) {
      return {
        p: 1.0,
        c: isTraining ? 1.15 : (isGame ? 1.10 : 0.95),
        f: 0.95
      };
    }
    return { p: 1.0, c: 1.0, f: 1.0 };
  }

  function mealTemplate(diet) {
    const d = diet || "standard";
    if (d === "highprotein") {
      return [
        { name: "Breakfast", focus: "protein + carbs", notes: "eggs/greek yogurt + oats + fruit" },
        { name: "Lunch", focus: "lean protein + carbs", notes: "chicken/turkey + rice + veg" },
        { name: "Pre-workout", focus: "easy carbs", notes: "banana + honey + toast" },
        { name: "Post-workout", focus: "protein + carbs", notes: "shake + bagel + fruit" },
        { name: "Dinner", focus: "protein + micronutrients", notes: "fish/lean beef + potatoes + salad" }
      ];
    }
    if (d === "lowerfat") {
      return [
        { name: "Breakfast", focus: "carbs + protein", notes: "oats + berries + egg whites" },
        { name: "Lunch", focus: "lean bowl", notes: "rice + chicken + veg (minimal oils)" },
        { name: "Snack", focus: "carbs", notes: "pretzels + fruit" },
        { name: "Post-workout", focus: "protein + carbs", notes: "shake + cereal" },
        { name: "Dinner", focus: "lean protein", notes: "turkey + pasta + veg" }
      ];
    }
    return [
      { name: "Breakfast", focus: "balanced", notes: "eggs + toast + fruit" },
      { name: "Lunch", focus: "balanced bowl", notes: "protein + rice + veg" },
      { name: "Snack", focus: "energy", notes: "yogurt + granola" },
      { name: "Post-workout", focus: "rebuild", notes: "protein + carbs" },
      { name: "Dinner", focus: "recovery", notes: "protein + carbs + veg" }
    ];
  }

  function distributeMacros(target, dayType, sport, diet) {
    const nudge = sportMacroNudge(sport, dayType);

    const p = Math.round((target.p || 0) * nudge.p);
    const c = Math.round((target.c || 0) * nudge.c);
    const f = Math.round((target.f || 0) * nudge.f);
    const w = Math.round(target.water || 0);

    // simple split across 5 feedings
    const splits = [0.25, 0.25, 0.10, 0.20, 0.20];
    const meals = mealTemplate(diet).map((m, i) => {
      const sp = Math.round(p * splits[i]);
      const sc = Math.round(c * splits[i]);
      const sf = Math.round(f * splits[i]);
      return Object.assign({}, m, { p: sp, c: sc, f: sf });
    });

    return { total: { p, c, f, water: w }, meals };
  }

  function renderMealPlanHTML(plan, meta) {
    const t = plan.total;
    const hdr =
      `<div class="callout"><b>${meta.title}</b><div class="small muted">${meta.subtitle}</div>` +
      `<div class="mono small" style="margin-top:8px">Targets: P ${t.p}g • C ${t.c}g • F ${t.f}g • Water ${t.water}oz</div></div>`;

    const rows = plan.meals.map(m => {
      return `
        <div class="wk-day" style="margin-top:10px">
          <div>
            <div><b>${m.name}</b> <span class="badge">${m.focus}</span></div>
            <div class="small muted">${m.notes}</div>
          </div>
          <div class="mono small">P ${m.p} • C ${m.c} • F ${m.f}</div>
        </div>
      `;
    }).join("");

    return hdr + rows;
  }

  window.nutritionEngine = {
    calcAdherence,
    distributeMacros,
    renderMealPlanHTML
  };
})();
