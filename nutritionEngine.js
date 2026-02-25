// nutritionEngine.js — v1.1.0 (COMPLETE REPLACEMENT)
// Elite Nutrition Add-on + Meal Plan Generator (offline-first)
// - Supports day types: training | game | recovery
// - Works with PIQ.getState()/saveState from core.js v2.3.0
// - Robust button binding (ID mismatch safe)

(function () {
  "use strict";

  if (window.__PIQ_NUTRITION_ENGINE__) return;
  window.__PIQ_NUTRITION_ENGINE__ = true;

  const $ = (id) => document.getElementById(id);
  const nowISO = () => new Date().toISOString().slice(0, 10);

  function sanitize(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }

  function clamp(n, a, b) {
    const x = Number(n);
    if (!Number.isFinite(x)) return a;
    return Math.min(Math.max(x, a), b);
  }

  function getRootState() {
    if (window.PIQ && typeof window.PIQ.getState === "function") return window.PIQ.getState();
    try {
      const raw = localStorage.getItem("piq_v2_state");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveRootState(s) {
    if (window.PIQ && typeof window.PIQ.saveState === "function") {
      try { window.PIQ.saveState(); return true; } catch {}
    }
    try { localStorage.setItem("piq_v2_state", JSON.stringify(s)); return true; } catch { return false; }
  }

  function ensureNutritionState(state) {
    // For compatibility with earlier structures, but main state is in core.js
    state.nutritionPlans = state.nutritionPlans && typeof state.nutritionPlans === "object" ? state.nutritionPlans : {};
    return state;
  }

  function listAthletes(state) {
    const roster = Array.isArray(state.athletes) ? state.athletes : [];
    if (!roster.length) return [{ id: "default", name: "Default Athlete", weightLb: NaN, sport: "basketball" }];

    return roster.map((a) => ({
      id: String(a.id),
      name: String(a.name || "Athlete"),
      weightLb: Number(a.weightLb || a.weight || NaN),
      sport: String(a.sport || "basketball")
    }));
  }

  function getTargets(state, athleteId) {
    state.targets = state.targets && typeof state.targets === "object" ? state.targets : {};
    const t = state.targets[String(athleteId)];
    if (t && typeof t === "object") return t;

    // fallback to team defaults
    const def = state.team?.macroDefaults || { protein: 160, carbs: 240, fat: 70, waterOz: 80 };
    return { protein: def.protein, carbs: def.carbs, fat: def.fat, waterOz: def.waterOz };
  }

  function splitMacros(targets, dayType) {
    const p = targets.protein;
    const f = targets.fat;
    const c = targets.carbs;

    let carbMult = 1.0;
    if (dayType === "recovery") carbMult = 0.80;
    if (dayType === "game") carbMult = 1.15;

    const cAdj = Math.round(c * carbMult);

    const meals = [
      { name: "Breakfast", p: 0.25, c: 0.22, f: 0.25 },
      { name: "Lunch", p: 0.25, c: 0.26, f: 0.25 },
      { name: "Pre-session / Snack", p: 0.15, c: 0.22, f: 0.10 },
      { name: "Post-session", p: 0.15, c: 0.22, f: 0.10 },
      { name: "Dinner", p: 0.20, c: 0.08, f: 0.30 }
    ];

    const plan = meals.map((m) => ({
      name: m.name,
      protein: Math.round(p * m.p),
      carbs: Math.round(cAdj * m.c),
      fat: Math.round(f * m.f)
    }));

    const sum = (k) => plan.reduce((s, x) => s + (x[k] || 0), 0);
    plan[0].protein += (p - sum("protein"));
    plan[0].carbs += (cAdj - sum("carbs"));
    plan[0].fat += (f - sum("fat"));

    const microFocus =
      dayType === "game"
        ? "Micronutrient focus: sodium + potassium (sweat), vitamin C foods, easy-to-digest carbs."
        : dayType === "recovery"
        ? "Micronutrient focus: omega-3 foods, magnesium-rich foods, colorful fruit/veg for antioxidants."
        : "Micronutrient focus: iron + B-vitamins, calcium + vitamin D, hydrate consistently.";

    const timing =
      dayType === "game"
        ? "Timing: carb-forward earlier; avoid heavy fats close to game."
        : dayType === "recovery"
        ? "Timing: steady protein across meals; carbs moderate; prioritize sleep support."
        : "Timing: place carbs around training; protein evenly spaced.";

    return { dayType, targets: { ...targets, carbs: cAdj }, meals: plan, microFocus, timing };
  }

  function buildFoodSuggestions(meal, dayType) {
    const p = meal.protein, c = meal.carbs, f = meal.fat;
    const easy = dayType === "game" ? " (game-day lighter fiber)" : "";
    return [
      `Option A: Lean protein + carbs + fruit/veg${easy} (aim ~P${p}/C${c}/F${f})`,
      `Option B: Bowl: rice/potatoes/pasta + chicken/turkey/fish + olive oil/avocado`,
      `Option C: Greek yogurt + oats + berries + nut butter (adjust portions)`
    ];
  }

  function generateMealPlan(state, athleteId, startISO, days, dayTypeMode) {
    const start = /^\d{4}-\d{2}-\d{2}$/.test(startISO) ? startISO : nowISO();
    const nDays = clamp(days, 1, 21);
    const targets = getTargets(state, athleteId);

    const out = [];
    for (let i = 0; i < nDays; i++) {
      const d = new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10);
      const dayType = ["training", "game", "recovery"].includes(dayTypeMode) ? dayTypeMode : "training";
      const split = splitMacros(targets, dayType);

      out.push({
        dateISO: d,
        dayType: split.dayType,
        targets: split.targets,
        microFocus: split.microFocus,
        timing: split.timing,
        meals: split.meals
      });
    }

    ensureNutritionState(state);
    state.nutritionPlans[String(athleteId)] = {
      athleteId: String(athleteId),
      startISO: start,
      days: nDays,
      dayType: dayTypeMode || "training",
      createdAtMs: Date.now(),
      plan: out
    };

    return state.nutritionPlans[String(athleteId)];
  }

  function renderMealPlan(planObj, mountEl) {
    if (!mountEl) return;
    if (!planObj?.plan?.length) {
      mountEl.innerHTML = `<div class="small muted">No plan generated yet.</div>`;
      return;
    }

    mountEl.innerHTML = planObj.plan.map((day) => {
      const mealLines = day.meals.map((m) => {
        const opts = buildFoodSuggestions(m, day.dayType).map((x) => `• ${sanitize(x)}`).join("<br/>");
        return `
          <div style="margin:10px 0;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px">
            <div style="font-weight:700">${sanitize(m.name)} — P${m.protein} / C${m.carbs} / F${m.fat}</div>
            <div class="small muted" style="margin-top:6px">${opts}</div>
          </div>
        `;
      }).join("");

      return `
        <div style="margin:14px 0;padding:12px;border:1px solid rgba(255,255,255,.10);border-radius:16px">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
            <div style="font-weight:800">${sanitize(day.dateISO)} • ${sanitize(String(day.dayType).toUpperCase())}</div>
            <div class="small muted">Targets: P${day.targets.protein} / C${day.targets.carbs} / F${day.targets.fat} • Water ${day.targets.waterOz}oz</div>
          </div>
          <div class="small muted" style="margin-top:6px">${sanitize(day.timing || "")}</div>
          <div class="small muted" style="margin-top:6px">${sanitize(day.microFocus || "")}</div>
          <div style="margin-top:10px">${mealLines}</div>
        </div>
      `;
    }).join("");
  }

  function bindMealPlanButton() {
    const possibleIds = [
      "btnGenerateMealPlan",
      "btnGenMealPlan",
      "btnMealPlan",
      "btnGeneratePlanMeal",
      "btnGenerateNutritionPlan"
    ];
    const btn = possibleIds.map((id) => $(id)).find(Boolean) || document.querySelector('[data-action="generate-meal-plan"]');
    if (!btn) return false;
    if (btn.__piqBound) return true;
    btn.__piqBound = true;

    btn.addEventListener("click", () => {
      try {
        const state = getRootState();
        ensureNutritionState(state);

        const athletes = listAthletes(state);
        const athleteSel = $("mealAthlete") || $("nutAthlete") || $("targetAthlete") || $("dashAthlete") || $("logAthlete");
        const startInp = $("mealStart") || $("nutDate") || $("mealDate") || $("mealPlanStart") || $("dashDate");
        const daysInp = $("mealDays") || $("mealPlanDays") || $("planDays");
        const modeSel = $("mealDayType") || $("mealMode") || $("mealPlanMode");

        const athleteId = athleteSel?.value || athletes[0]?.id || "default";
        const startISO = (startInp?.value || nowISO()).trim();
        const days = Number(daysInp?.value || 7);
        const mode = String(modeSel?.value || "training").trim();

        const planObj = generateMealPlan(state, athleteId, startISO, days, mode);

        const outMount = $("mealPlanOut") || $("mealPlanList") || $("mealPlanOutput");
        if (outMount) renderMealPlan(planObj, outMount);
        else alert("Meal plan generated. Add a container with id='mealPlanOut' to display it.");

        saveRootState(state);
      } catch (e) {
        console.warn("Meal plan generation failed:", e);
        alert("Meal plan generation failed: " + (e?.message || e));
      }
    });

    return true;
  }

  function initNutritionUI() {
    bindMealPlanButton();
  }

  window.PIQ_Nutrition = window.PIQ_Nutrition || {};
  window.PIQ_Nutrition.init = initNutritionUI;

  document.addEventListener("DOMContentLoaded", () => {
    initNutritionUI();
    setTimeout(initNutritionUI, 250);
    setTimeout(initNutritionUI, 1000);
  });
})();
