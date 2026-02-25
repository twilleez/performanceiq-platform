// nutritionEngine.js — v1.2.0 (FULL REPLACEMENT)
// Meal Plan Generator + write-back into PIQ state
// Supports: day types (training/game/recovery/rest/auto), diet prefs (standard/highprotein/lowerfat)

(function () {
  "use strict";

  if (window.__PIQ_NUTRITION_ENGINE_V12__) return;
  window.__PIQ_NUTRITION_ENGINE_V12__ = true;

  const $ = (id) => document.getElementById(id);
  const nowISO = () => new Date().toISOString().slice(0, 10);

  function clamp(n, a, b) {
    const x = Number(n);
    if (!Number.isFinite(x)) return a;
    return Math.min(Math.max(x, a), b);
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }

  function getState() {
    if (window.PIQ && typeof window.PIQ.getState === "function") return window.PIQ.getState();
    const raw = localStorage.getItem("piq_v2_state");
    try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  }

  function saveState(state) {
    if (window.PIQ && typeof window.PIQ.saveState === "function") return window.PIQ.saveState();
    try { localStorage.setItem("piq_v2_state", JSON.stringify(state)); } catch {}
  }

  function ensureNutrition(state) {
    state.nutrition = state.nutrition && typeof state.nutrition === "object" ? state.nutrition : {};
    state.nutrition.mealPlans = state.nutrition.mealPlans && typeof state.nutrition.mealPlans === "object" ? state.nutrition.mealPlans : {};
    return state.nutrition;
  }

  function listAthletes(state) {
    const arr = Array.isArray(state.athletes) ? state.athletes : [];
    if (!arr.length) return [{ id: "default", name: "Default Athlete" }];
    return arr.map((a) => ({ id: String(a.id), name: a.name || a.id }));
  }

  function getTargets(state, athleteId) {
    state.targets = state.targets && typeof state.targets === "object" ? state.targets : {};
    const t = state.targets[String(athleteId)];
    if (t && typeof t === "object") return t;

    const d = state.team?.macroDefaults || { protein: 160, carbs: 240, fat: 70, waterOz: 80 };
    return { protein: d.protein, carbs: d.carbs, fat: d.fat, waterOz: d.waterOz };
  }

  function applyDietPref(targets, pref) {
    let p = Number(targets.protein);
    let c = Number(targets.carbs);
    let f = Number(targets.fat);

    if (pref === "highprotein") {
      p = Math.round(p * 1.10);
      c = Math.round(c * 0.96);
    } else if (pref === "lowerfat") {
      f = Math.round(f * 0.85);
      c = Math.round(c * 1.06);
    }
    return { ...targets, protein: clamp(p, 0, 500), carbs: clamp(c, 0, 1200), fat: clamp(f, 0, 400) };
  }

  function dayMultiplier(dayType) {
    if (dayType === "game") return { carb: 1.12, fat: 0.92, note: "Game day: higher carbs, lower fat pre-game, hydrate + electrolytes." };
    if (dayType === "recovery") return { carb: 0.90, fat: 1.00, note: "Recovery day: moderate carbs, protein steady, omega-3 + colorful produce." };
    if (dayType === "rest") return { carb: 0.75, fat: 1.05, note: "Rest day: lower carbs, keep protein high, fiber + micronutrients." };
    return { carb: 1.00, fat: 1.00, note: "Training day: prioritize carbs around session + hydrate." };
  }

  function splitMacros(targets, dayType) {
    const mult = dayMultiplier(dayType);
    const p = targets.protein;
    const c = Math.round(targets.carbs * mult.carb);
    const f = Math.round(targets.fat * mult.fat);

    const meals = [
      { name: "Breakfast", p: 0.25, c: 0.20, f: 0.25 },
      { name: "Lunch", p: 0.25, c: 0.25, f: 0.25 },
      { name: (dayType === "game" ? "Pre-Game Snack" : "Pre-Workout / Snack"), p: 0.15, c: 0.22, f: 0.10 },
      { name: (dayType === "game" ? "Post-Game" : "Post-Workout"), p: 0.15, c: 0.22, f: 0.10 },
      { name: "Dinner", p: 0.20, c: 0.11, f: 0.30 }
    ];

    const plan = meals.map((m) => ({
      name: m.name,
      protein: Math.round(p * m.p),
      carbs: Math.round(c * m.c),
      fat: Math.round(f * m.f)
    }));

    // rounding drift fix
    const sum = (k) => plan.reduce((s, x) => s + (x[k] || 0), 0);
    plan[0].protein += (p - sum("protein"));
    plan[0].carbs += (c - sum("carbs"));
    plan[0].fat += (f - sum("fat"));

    return { targets: { ...targets, carbs: c, fat: f }, meals: plan, note: mult.note };
  }

  function micronutrientFocus(dayType) {
    if (dayType === "game") return ["Electrolytes (sodium/potassium)", "Easy carbs", "Iron-rich foods", "Avoid heavy fats pre-game"];
    if (dayType === "recovery") return ["Omega-3 (salmon/chia)", "Vitamin C + polyphenols (berries)", "Magnesium (nuts/greens)", "Protein spread evenly"];
    if (dayType === "rest") return ["Fiber (beans/veg)", "Color variety", "Hydration", "Protein steady"];
    return ["Carbs around training", "Hydration + sodium", "Protein 4–5 feedings", "Fruit/veg each meal"];
  }

  function foodTemplates(meal, dayType) {
    const p = meal.protein, c = meal.carbs, f = meal.fat;
    const base = [
      `Lean protein + carb + fruit/veg (aim ~P${p}/C${c}/F${f})`,
      `Bowl: rice/potatoes + chicken/fish + olive oil/avocado`,
      `Greek yogurt + oats + berries + nut butter (adjust portions)`
    ];
    if (dayType === "game" && meal.name.toLowerCase().includes("pre")) {
      base.unshift("Pre-game: bagel + honey + banana + small protein (light fats)");
    }
    if (dayType === "recovery" && meal.name.toLowerCase().includes("dinner")) {
      base.unshift("Recovery: salmon/turkey + sweet potato + big salad (olive oil)");
    }
    return base;
  }

  function generateMealPlan(state, athleteId, startISO, days, dayTypeMode, dietPref) {
    const start = /^\d{4}-\d{2}-\d{2}$/.test(startISO) ? startISO : nowISO();
    const nDays = clamp(days, 1, 21);

    const targets0 = getTargets(state, athleteId);
    const targets = applyDietPref(targets0, dietPref);

    const out = [];
    for (let i = 0; i < nDays; i++) {
      const d = new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10);

      const dayType =
        dayTypeMode === "auto"
          ? ((i % 7 === 5 || i % 7 === 6) ? "rest" : "training")
          : (dayTypeMode || "training");

      const split = splitMacros(targets, dayType);
      out.push({
        dateISO: d,
        dayType,
        targets: split.targets,
        meals: split.meals,
        note: split.note,
        microFocus: micronutrientFocus(dayType)
      });
    }

    const n = ensureNutrition(state);
    n.mealPlans[String(athleteId)] = {
      athleteId: String(athleteId),
      startISO: start,
      days: nDays,
      createdAtMs: Date.now(),
      mode: dayTypeMode || "training",
      dietPref: dietPref || "standard",
      plan: out
    };

    return n.mealPlans[String(athleteId)];
  }

  function renderMealPlan(planObj, mountEl) {
    if (!mountEl) return;
    if (!planObj?.plan?.length) {
      mountEl.innerHTML = `<div class="small muted">No plan generated yet.</div>`;
      return;
    }

    mountEl.innerHTML = planObj.plan.map((day) => {
      const focus = (day.microFocus || []).map((x) => `• ${esc(x)}`).join("<br/>");

      const mealLines = (day.meals || []).map((m) => {
        const opts = foodTemplates(m, day.dayType).map((x) => `• ${esc(x)}`).join("<br/>");
        return `
          <div style="margin:10px 0;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px">
            <div style="font-weight:700">${esc(m.name)} — P${m.protein} / C${m.carbs} / F${m.fat}</div>
            <div class="small muted" style="margin-top:6px">${opts}</div>
          </div>
        `;
      }).join("");

      return `
        <div style="margin:14px 0;padding:12px;border:1px solid rgba(255,255,255,.10);border-radius:16px">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
            <div style="font-weight:800">${esc(day.dateISO)} • ${esc(String(day.dayType).toUpperCase())}</div>
            <div class="small muted">Targets: P${day.targets.protein} / C${day.targets.carbs} / F${day.targets.fat} • Water ${day.targets.waterOz}oz</div>
          </div>
          <div class="small muted" style="margin-top:6px">${esc(day.note || "")}</div>
          <div class="small muted" style="margin-top:8px"><b>Micronutrient focus</b><br/>${focus}</div>
          <div style="margin-top:10px">${mealLines}</div>
        </div>
      `;
    }).join("");
  }

  function init() {
    const state = getState();
    ensureNutrition(state);

    const athletes = listAthletes(state);

    const fill = (selId) => {
      const el = $(selId);
      if (!el) return;
      el.innerHTML = athletes.map((a) => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join("");
    };

    fill("mealAthlete");
    if ($("mealStart") && !$("mealStart").value) $("mealStart").value = nowISO();

    const btn = $("btnGenerateMealPlan");
    if (btn && !btn.__piqBound) {
      btn.__piqBound = true;
      btn.addEventListener("click", () => {
        try {
          const st = getState();
          ensureNutrition(st);

          const athleteId = $("mealAthlete")?.value || athletes[0]?.id || "default";
          const startISO = ($("mealStart")?.value || nowISO()).trim();
          const days = Number($("mealDays")?.value || 7);
          const mode = ($("mealDayType")?.value || "auto").trim();
          const diet = ($("mealDiet")?.value || "standard").trim();

          const planObj = generateMealPlan(st, athleteId, startISO, days, mode, diet);
          const outMount = $("mealPlanOut");
          renderMealPlan(planObj, outMount);

          saveState(st);
        } catch (e) {
          console.warn("Meal plan generation failed:", e);
          alert("Meal plan generation failed: " + (e?.message || e));
        }
      });
    }
  }

  window.PIQ_Nutrition = window.PIQ_Nutrition || {};
  window.PIQ_Nutrition.init = init;
  window.PIQ_Nutrition.generateMealPlan = function (athleteId, startISO, days, mode, dietPref) {
    const st = getState();
    const planObj = generateMealPlan(st, athleteId, startISO, days, mode, dietPref);
    saveState(st);
    return planObj;
  };
})();
