// nutritionEngine.js — FULL REPLACEMENT (v1.2.0)
// Meal Plan Generator + Nutrition helpers
// Integrates with core.js via window.PIQ.getState()/saveState() when available.
// Offline-first: localStorage only.

(function () {
  "use strict";

  if (window.__PIQ_NUTRITION_ENGINE_V12__) return;
  window.__PIQ_NUTRITION_ENGINE_V12__ = true;

  const $ = (id) => document.getElementById(id);
  const q = (sel, root = document) => root.querySelector(sel);

  const todayISO = () => new Date().toISOString().slice(0, 10);
  const clamp = (n, a, b) => Math.min(Math.max(Number(n) || 0, a), b);

  function esc(str) {
    const d = document.createElement("div");
    d.textContent = String(str ?? "");
    return d.innerHTML;
  }

  // -----------------------------
  // State bridge
  // -----------------------------
  const FALLBACK_KEY = "piq_v2_state";

  function getState() {
    if (window.PIQ && typeof window.PIQ.getState === "function") return window.PIQ.getState();
    try {
      const raw = localStorage.getItem(FALLBACK_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveState(state) {
    if (window.PIQ && typeof window.PIQ.saveState === "function") return window.PIQ.saveState();
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  function listAthletes(state) {
    const athletes = Array.isArray(state?.athletes) ? state.athletes : [];
    if (athletes.length) return athletes.map((a) => ({
      id: String(a.id || ""),
      name: String(a.name || a.id || "Athlete"),
      weightLb: Number(a.weightLb || NaN)
    }));
    return [{ id: "default", name: "Default Athlete", weightLb: NaN }];
  }

  function fillSelect(sel, athletes) {
    if (!sel) return;
    sel.innerHTML = athletes.map((a) => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join("");
  }

  function getTargets(state, athleteId) {
    const id = String(athleteId || "default");
    // Prefer core targets
    const t = state?.targets?.[id];
    if (t && typeof t === "object") {
      return {
        protein: clamp(t.protein, 0, 500),
        carbs: clamp(t.carbs, 0, 1200),
        fat: clamp(t.fat, 0, 400),
        waterOz: clamp(t.waterOz, 0, 300)
      };
    }
    // Fallback to team defaults
    const d = state?.team?.macroDefaults || { protein: 160, carbs: 240, fat: 70, waterOz: 80 };
    return {
      protein: clamp(d.protein, 0, 500),
      carbs: clamp(d.carbs, 0, 1200),
      fat: clamp(d.fat, 0, 400),
      waterOz: clamp(d.waterOz, 0, 300)
    };
  }

  // -----------------------------
  // Meal plan logic
  // -----------------------------
  function applyDayType(targets, dayType) {
    // Adjust carbs slightly by day type
    let carbMult = 1.0;
    let fatMult = 1.0;

    if (dayType === "rest") carbMult = 0.75;
    if (dayType === "recovery") carbMult = 0.85;
    if (dayType === "game") carbMult = 1.10;

    return {
      ...targets,
      carbs: Math.round(targets.carbs * carbMult),
      fat: Math.round(targets.fat * fatMult)
    };
  }

  function applyDietPreference(targets, diet) {
    // Simple shifts while keeping calories-ish stable
    const t = { ...targets };
    if (diet === "highprotein") {
      t.protein = Math.round(t.protein * 1.08);
      t.carbs = Math.round(t.carbs * 0.95);
    } else if (diet === "lowerfat") {
      t.fat = Math.round(t.fat * 0.85);
      t.carbs = Math.round(t.carbs * 1.05);
    }
    return t;
  }

  function splitIntoMeals(targets, dayType) {
    // 4 meals + 1 snack
    const meals = [
      { name: "Breakfast", p: 0.25, c: 0.20, f: 0.25, micro: "Fiber + hydration" },
      { name: "Lunch", p: 0.25, c: 0.25, f: 0.25, micro: "Colorful veg + sodium balance" },
      { name: "Pre / Snack", p: 0.15, c: 0.20, f: 0.10, micro: dayType === "game" ? "Fast carbs + electrolytes" : "Carbs + light protein" },
      { name: "Post", p: 0.15, c: 0.20, f: 0.10, micro: "Protein + carbs + fluids" },
      { name: "Dinner", p: 0.20, c: 0.15, f: 0.30, micro: "Micronutrients + recovery foods" }
    ];

    const plan = meals.map((m) => ({
      name: m.name,
      protein: Math.round(targets.protein * m.p),
      carbs: Math.round(targets.carbs * m.c),
      fat: Math.round(targets.fat * m.f),
      micro: m.micro
    }));

    // drift fix
    const sum = (k) => plan.reduce((s, x) => s + (x[k] || 0), 0);
    plan[0].protein += (targets.protein - sum("protein"));
    plan[0].carbs += (targets.carbs - sum("carbs"));
    plan[0].fat += (targets.fat - sum("fat"));

    return plan;
  }

  function foodSuggestions(meal) {
    const p = meal.protein, c = meal.carbs, f = meal.fat;
    return [
      `Option A: Lean protein + rice/potatoes + fruit/veg (aim ~P${p}/C${c}/F${f})`,
      `Option B: Bowl: chicken/turkey/fish + grains + olive oil/avocado`,
      `Option C: Greek yogurt + oats + berries + nut butter (adjust portions)`
    ];
  }

  function generateMealPlan(state, athleteId, startISO, days, mode, diet) {
    const start = /^\d{4}-\d{2}-\d{2}$/.test(startISO) ? startISO : todayISO();
    const nDays = clamp(days, 1, 21);

    const base = getTargets(state, athleteId);
    const out = [];

    for (let i = 0; i < nDays; i++) {
      const d = new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10);

      const dayType =
        mode === "auto" ? ((i % 7 === 5 || i % 7 === 6) ? "rest" : "training") :
        mode;

      let t = applyDayType(base, dayType);
      t = applyDietPreference(t, diet);

      const meals = splitIntoMeals(t, dayType);

      out.push({
        dateISO: d,
        dayType,
        targets: t,
        notes:
          dayType === "game" ? "Game day: prioritize carbs + fluids early; avoid heavy fats close to tip." :
          dayType === "recovery" ? "Recovery day: steady protein, slightly lower carbs; focus micronutrients." :
          dayType === "rest" ? "Rest day: lower carbs, keep protein high, hydrate." :
          "Training day: carbs around session + hydrate.",
        meals
      });
    }

    state.nutritionPlans = state.nutritionPlans && typeof state.nutritionPlans === "object" ? state.nutritionPlans : {};
    state.nutritionPlans[String(athleteId)] = {
      athleteId: String(athleteId),
      startISO: start,
      days: nDays,
      mode,
      diet,
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
      const mealBlocks = day.meals.map((m) => {
        const opts = foodSuggestions(m).map((x) => `• ${esc(x)}`).join("<br/>");
        return `
          <div style="margin:10px 0;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px">
            <div style="font-weight:800">${esc(m.name)} — P${m.protein} / C${m.carbs} / F${m.fat}</div>
            <div class="small muted" style="margin-top:6px">Focus: ${esc(m.micro)}</div>
            <div class="small muted" style="margin-top:6px">${opts}</div>
          </div>
        `;
      }).join("");

      return `
        <div style="margin:14px 0;padding:12px;border:1px solid rgba(255,255,255,.10);border-radius:16px">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
            <div style="font-weight:900">${esc(day.dateISO)} • ${esc(day.dayType.toUpperCase())}</div>
            <div class="small muted">
              Targets: P${day.targets.protein} / C${day.targets.carbs} / F${day.targets.fat} • Water ${day.targets.waterOz}oz
            </div>
          </div>
          <div class="small muted" style="margin-top:6px">${esc(day.notes || "")}</div>
          <div style="margin-top:10px">${mealBlocks}</div>
        </div>
      `;
    }).join("");
  }

  // -----------------------------
  // UI binding
  // -----------------------------
  function bindOnce(el, event, fn) {
    if (!el) return;
    const k = `__bound_${event}`;
    if (el[k]) return;
    el[k] = true;
    el.addEventListener(event, fn);
  }

  function init() {
    const state = getState();
    const athletes = listAthletes(state);

    // Fill selects
    fillSelect($("mealAthlete"), athletes);
    fillSelect($("nutAthlete"), athletes);
    fillSelect($("targetAthlete"), athletes);

    if ($("mealStart") && !/^\d{4}-\d{2}-\d{2}$/.test($("mealStart").value)) $("mealStart").value = todayISO();
    if ($("nutDate") && !/^\d{4}-\d{2}-\d{2}$/.test($("nutDate").value)) $("nutDate").value = todayISO();

    // Button
    bindOnce($("btnGenerateMealPlan"), "click", () => {
      const s = getState();
      const athleteId = $("mealAthlete")?.value || athletes[0]?.id || "default";
      const startISO = ($("mealStart")?.value || todayISO()).trim();
      const days = Number($("mealDays")?.value || 7);
      const mode = ($("mealDayType")?.value || "auto").trim(); // training|game|recovery|rest|auto
      const diet = ($("mealDiet")?.value || "standard").trim(); // standard|highprotein|lowerfat
      const planObj = generateMealPlan(s, athleteId, startISO, days, mode, diet);
      renderMealPlan(planObj, $("mealPlanOut"));
      saveState(s);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    init();
    setTimeout(init, 250);
    setTimeout(init, 1000);
  });

})();
