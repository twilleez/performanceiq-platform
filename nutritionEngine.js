// nutritionEngine.js — COMPLETE REPLACEMENT (v1.2.0)
// Elite Nutrition Add-on + Meal Plan Generator (offline-first)
// Supports: Training / Game / Recovery day types + micronutrient focus + hydration guidance
// Robust DOM binding + safe localStorage integration with core.js v2 state.
//
// Primary assumptions:
// - core.js uses localStorage key: "piq_v2_state"
// - targets live at state.targets[athleteId] OR state.team.macroDefaults for defaults
//
// No external deps.

(function () {
  "use strict";

  if (window.__PIQ_NUTRITION_ENGINE__) return;
  window.__PIQ_NUTRITION_ENGINE__ = true;

  // ---------------------------
  // Helpers
  // ---------------------------
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

  function safeISO(s) {
    const v = String(s || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  }

  // ---------------------------
  // Storage bridge
  // ---------------------------
  const STORAGE_KEY_PRIMARY = "piq_v2_state"; // core.js v2 key
  const STORAGE_KEY_FALLBACK = "piq_state_v1"; // older builds fallback

  function getRootState() {
    // Preferred: core.js exposes PIQ.getState()
    if (window.PIQ && typeof window.PIQ.getState === "function") {
      try { return window.PIQ.getState(); } catch {}
    }

    // Fallback: localStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PRIMARY) || localStorage.getItem(STORAGE_KEY_FALLBACK);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveRootState(state) {
    // Preferred: core.js exposes PIQ.saveState()
    if (window.PIQ && typeof window.PIQ.saveState === "function") {
      try { window.PIQ.saveState(); return true; } catch {}
    }
    // Fallback: store full object
    try {
      localStorage.setItem(STORAGE_KEY_PRIMARY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------
  // Athlete sources (core.js v2 stores state.athletes)
  // ---------------------------
  function listAthletes(state) {
    const roster = Array.isArray(state?.athletes) ? state.athletes : [];
    const out = roster
      .filter(Boolean)
      .map((a) => ({
        id: String(a.id || "").trim() || ("ath_" + Math.random().toString(16).slice(2)),
        name: String(a.name || "Athlete").trim(),
        weightLb: Number(a.weightLb ?? a.weight ?? a.wt ?? NaN),
        sport: String(a.sport || "basketball")
      }));

    if (!out.length) out.push({ id: "default", name: "Default Athlete", weightLb: NaN, sport: "basketball" });
    return out;
  }

  // ---------------------------
  // Targets (uses core.js v2 state.targets[athleteId])
  // ---------------------------
  function defaultTargets(state, athlete) {
    const d = state?.team?.macroDefaults || { protein: 160, carbs: 240, fat: 70, waterOz: 80 };
    const bw = Number(athlete?.weightLb);
    const hasBW = Number.isFinite(bw) && bw > 60 && bw < 400;

    // Practical athlete defaults (simple + effective)
    const protein = hasBW ? Math.round(clamp(bw * 0.9, 90, 260)) : Number(d.protein || 160);
    const carbs = hasBW ? Math.round(clamp(bw * 1.8, 140, 520)) : Number(d.carbs || 240);
    const fat = hasBW ? Math.round(clamp(bw * 0.35, 40, 120)) : Number(d.fat || 70);
    const waterOz = hasBW ? Math.round(clamp(bw * 0.7, 60, 160)) : Number(d.waterOz || 80);

    return { protein, carbs, fat, waterOz };
  }

  function getTargets(state, athleteId) {
    const id = String(athleteId || "default");
    state.targets = state.targets && typeof state.targets === "object" ? state.targets : {};
    const saved = state.targets[id];
    if (saved && typeof saved === "object") {
      return {
        protein: clamp(saved.protein, 0, 500),
        carbs: clamp(saved.carbs, 0, 1200),
        fat: clamp(saved.fat, 0, 400),
        waterOz: clamp(saved.waterOz, 0, 300)
      };
    }
    const athlete = listAthletes(state).find((a) => a.id === id) || { id, name: "Athlete", weightLb: NaN };
    return defaultTargets(state, athlete);
  }

  // ---------------------------
  // Day-type rules (industry-style)
  // ---------------------------
  function applyDayTypeToTargets(baseTargets, dayType) {
    const t = { ...baseTargets };

    // Carb periodization + fat timing (simple, coach-friendly)
    if (dayType === "training") {
      // baseline
      return t;
    }

    if (dayType === "game") {
      // Higher carbs, slightly lower fat to prioritize glycogen + digestion
      t.carbs = Math.round(t.carbs * 1.15);
      t.fat = Math.round(t.fat * 0.85);
      return t;
    }

    if (dayType === "recovery") {
      // Lower carbs, keep protein high, slightly higher fats for satiety
      t.carbs = Math.round(t.carbs * 0.75);
      t.fat = Math.round(t.fat * 1.10);
      return t;
    }

    return t;
  }

  function micronutrientFocus(dayType) {
    // “Top program” style: keep it actionable without pretending to diagnose deficiency.
    if (dayType === "game") {
      return [
        "Sodium + fluids: pre-game hydration/electrolytes (especially if you sweat heavy)",
        "Potassium: bananas, potatoes, yogurt",
        "Magnesium: nuts, seeds, whole grains",
        "Iron support foods: lean red meat, beans, spinach (pair with vitamin C foods)",
        "Omega-3s: salmon, tuna, chia/flax (recovery support)"
      ];
    }
    if (dayType === "recovery") {
      return [
        "Calcium + Vitamin D: dairy/fortified milk, yogurt, sunlight exposure",
        "Omega-3s: salmon, sardines, chia/flax (inflammation support)",
        "Magnesium: pumpkin seeds, almonds, oats",
        "Antioxidant-rich produce: berries, cherries, leafy greens",
        "Protein quality: lean meat, eggs, Greek yogurt, whey if needed"
      ];
    }
    // training
    return [
      "Carb quality + fiber: oats, rice, potatoes, fruit",
      "Magnesium: nuts, seeds, whole grains",
      "Potassium: bananas, potatoes, yogurt",
      "Iron support foods: lean meats/beans/spinach (pair with vitamin C foods)",
      "Omega-3s a few times/week (fish or chia/flax)"
    ];
  }

  function hydrationGuidance(dayType, targets) {
    const base = `Daily water target: ~${targets.waterOz} oz (adjust up for heat/sweat).`;
    if (dayType === "game") {
      return [
        base,
        "Game day: drink consistently earlier in the day (don’t “chug” last minute).",
        "If sweating a lot: add electrolytes (sodium) and sip during warmups/halftime."
      ];
    }
    if (dayType === "recovery") {
      return [
        base,
        "Recovery day: keep hydration steady + include sodium with meals if you trained hard yesterday."
      ];
    }
    return [
      base,
      "Training day: drink around training and include sodium/electrolytes if sessions are long or sweaty."
    ];
  }

  // ---------------------------
  // Meal plan generator
  // ---------------------------
  function splitMeals(targets, dayType) {
    // 5 feedings: breakfast / lunch / pre / post / dinner
    // Game day pushes more carbs earlier + pre/post emphasis.
    const pattern =
      dayType === "game"
        ? [
            { name: "Breakfast", p: 0.25, c: 0.30, f: 0.20 },
            { name: "Lunch", p: 0.25, c: 0.30, f: 0.20 },
            { name: "Pre-Game / Snack", p: 0.15, c: 0.20, f: 0.10 },
            { name: "Post-Game", p: 0.15, c: 0.15, f: 0.10 },
            { name: "Dinner", p: 0.20, c: 0.05, f: 0.40 }
          ]
        : dayType === "recovery"
        ? [
            { name: "Breakfast", p: 0.25, c: 0.20, f: 0.30 },
            { name: "Lunch", p: 0.25, c: 0.25, f: 0.25 },
            { name: "Snack", p: 0.15, c: 0.15, f: 0.15 },
            { name: "Snack / Protein", p: 0.15, c: 0.10, f: 0.10 },
            { name: "Dinner", p: 0.20, c: 0.30, f: 0.20 }
          ]
        : [
            { name: "Breakfast", p: 0.25, c: 0.20, f: 0.25 },
            { name: "Lunch", p: 0.25, c: 0.25, f: 0.25 },
            { name: "Pre-Workout / Snack", p: 0.15, c: 0.20, f: 0.10 },
            { name: "Post-Workout", p: 0.15, c: 0.20, f: 0.10 },
            { name: "Dinner", p: 0.20, c: 0.15, f: 0.30 }
          ];

    const plan = pattern.map((m) => ({
      name: m.name,
      protein: Math.round(targets.protein * m.p),
      carbs: Math.round(targets.carbs * m.c),
      fat: Math.round(targets.fat * m.f)
    }));

    // fix rounding drift
    const sum = (k) => plan.reduce((s, x) => s + (x[k] || 0), 0);
    plan[0].protein += (targets.protein - sum("protein"));
    plan[0].carbs += (targets.carbs - sum("carbs"));
    plan[0].fat += (targets.fat - sum("fat"));

    return plan;
  }

  function mealOptions(mealName, dayType) {
    const common = [
      "Lean protein + carb base + fruit/veg (adjust portions)",
      "Bowl: rice/pasta/potatoes + chicken/turkey/fish + olive oil/avocado",
      "Greek yogurt + oats + berries + nut butter (adjust portions)"
    ];

    if (dayType === "game" && /pre|breakfast|lunch/i.test(mealName)) {
      return [
        "Easy-digest carbs + lean protein (lower fat): bagel + eggs/egg whites, fruit",
        "Rice + chicken + fruit (keep it simple)",
        ...common
      ];
    }

    if (dayType === "recovery" && /dinner|breakfast/i.test(mealName)) {
      return [
        "Protein + colorful produce + healthy fats: salmon + veggies + rice/potatoes",
        "Greek yogurt + berries + granola + chia/flax",
        ...common
      ];
    }

    return common;
  }

  function shoppingListFromMeals(dayType) {
    const base = [
      "Lean proteins: chicken, turkey, eggs, Greek yogurt",
      "Carbs: rice, oats, potatoes, pasta, bread/bagels",
      "Fats: olive oil, avocado, nuts/nut butter",
      "Produce: bananas, berries, leafy greens, oranges"
    ];
    if (dayType === "game") base.unshift("Electrolytes: sports drink or electrolyte packets (as needed)");
    if (dayType === "recovery") base.push("Omega-3: salmon/tuna OR chia/flax");
    return base;
  }

  function buildPlan(state, athleteId, dateISO, dayType) {
    const date = safeISO(dateISO) || nowISO();
    const baseTargets = getTargets(state, athleteId);
    const adjustedTargets = applyDayTypeToTargets(baseTargets, dayType);

    const meals = splitMeals(adjustedTargets, dayType);

    return {
      athleteId: String(athleteId || "default"),
      dateISO: date,
      dayType,
      targets: adjustedTargets,
      micronutrients: micronutrientFocus(dayType),
      hydration: hydrationGuidance(dayType, adjustedTargets),
      meals: meals.map((m) => ({
        ...m,
        options: mealOptions(m.name, dayType)
      })),
      shoppingList: shoppingListFromMeals(dayType),
      createdAtMs: Date.now()
    };
  }

  // Persist under state.nutrition.mealPlans[athleteId][dateISO]
  function ensureNutritionBucket(state) {
    state.nutrition = state.nutrition && typeof state.nutrition === "object" ? state.nutrition : {};
    state.nutrition.mealPlans = state.nutrition.mealPlans && typeof state.nutrition.mealPlans === "object" ? state.nutrition.mealPlans : {};
    return state.nutrition;
  }

  function savePlan(state, plan) {
    const n = ensureNutritionBucket(state);
    const a = String(plan.athleteId);
    n.mealPlans[a] = n.mealPlans[a] && typeof n.mealPlans[a] === "object" ? n.mealPlans[a] : {};
    n.mealPlans[a][String(plan.dateISO)] = plan;
    return plan;
  }

  // ---------------------------
  // Render
  // ---------------------------
  function renderPlan(plan, mountEl) {
    if (!mountEl) return;

    if (!plan) {
      mountEl.innerHTML = `<div class="small muted">No plan generated yet.</div>`;
      return;
    }

    const hdr = `
      <div style="padding:12px;border:1px solid rgba(255,255,255,.10);border-radius:16px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
          <div style="font-weight:900">${sanitize(plan.dateISO)} • ${sanitize(String(plan.dayType).toUpperCase())}</div>
          <div class="small muted">Targets: P${plan.targets.protein} / C${plan.targets.carbs} / F${plan.targets.fat} • Water ${plan.targets.waterOz}oz</div>
        </div>
      </div>
    `;

    const micro = `
      <div style="padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:16px;margin-bottom:12px">
        <div style="font-weight:800;margin-bottom:6px">Micronutrient Focus</div>
        <div class="small muted">
          ${plan.micronutrients.map((x) => `• ${sanitize(x)}`).join("<br/>")}
        </div>
      </div>
    `;

    const hydro = `
      <div style="padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:16px;margin-bottom:12px">
        <div style="font-weight:800;margin-bottom:6px">Hydration</div>
        <div class="small muted">
          ${plan.hydration.map((x) => `• ${sanitize(x)}`).join("<br/>")}
        </div>
      </div>
    `;

    const meals = plan.meals
      .map((m) => {
        return `
          <div style="margin:10px 0;padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:16px">
            <div style="font-weight:800">${sanitize(m.name)} — P${m.protein} / C${m.carbs} / F${m.fat}</div>
            <div class="small muted" style="margin-top:8px">
              ${m.options.map((x) => `• ${sanitize(x)}`).join("<br/>")}
            </div>
          </div>
        `;
      })
      .join("");

    const shop = `
      <div style="padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:16px;margin-top:12px">
        <div style="font-weight:800;margin-bottom:6px">Shopping List (quick)</div>
        <div class="small muted">
          ${plan.shoppingList.map((x) => `• ${sanitize(x)}`).join("<br/>")}
        </div>
      </div>
    `;

    mountEl.innerHTML = hdr + micro + hydro + meals + shop;
  }

  // ---------------------------
  // UI Wiring (robust binding)
  // ---------------------------
  function fillSelect(selectEl, athletes, selectedId) {
    if (!selectEl) return;
    selectEl.innerHTML = athletes
      .map((a) => `<option value="${sanitize(a.id)}">${sanitize(a.name)}</option>`)
      .join("");
    if (selectedId) selectEl.value = selectedId;
  }

  function bindGenerateButton() {
    const possibleBtnIds = [
      "btnGenerateMealPlan",
      "btnGenMealPlan",
      "btnMealPlan",
      "btnGenerateNutritionPlan",
      "btnGeneratePlanMeal"
    ];
    const btn = possibleBtnIds.map((id) => $(id)).find(Boolean) || document.querySelector('[data-action="generate-meal-plan"]');
    if (!btn) return false;

    if (btn.__piqBound) return true;
    btn.__piqBound = true;

    btn.addEventListener("click", () => {
      try {
        const state = getRootState();

        // Athlete selection priority: mealAthlete -> nutAthlete -> targetAthlete
        const athleteSel = $("mealAthlete") || $("nutAthlete") || $("targetAthlete") || $("dashAthlete");
        const athletes = listAthletes(state);
        const athleteId = athleteSel?.value || athletes[0]?.id || "default";

        // Date input priority: mealDate -> nutDate -> dashDate
        const dateInp = $("mealDate") || $("mealPlanDate") || $("nutDate") || $("dashDate");
        const dateISO = safeISO(dateInp?.value) || nowISO();

        // Day type from your HTML
        const dayTypeSel = $("mealDayType");
        const dayType = String(dayTypeSel?.value || "training");

        const plan = buildPlan(state, athleteId, dateISO, dayType);
        savePlan(state, plan);
        saveRootState(state);

        const mount = $("mealPlanOut") || $("mealPlanList") || $("mealPlanOutput");
        if (mount) renderPlan(plan, mount);
        else alert("Meal plan generated. Add a container with id='mealPlanOut' to display it.");
      } catch (e) {
        console.warn("Meal plan generation failed:", e);
        alert("Meal plan generation failed: " + (e?.message || e));
      }
    });

    return true;
  }

  function init() {
    const state = getRootState();
    const athletes = listAthletes(state);

    // If your UI includes a specific athlete selector for meal planning, populate it
    fillSelect($("mealAthlete"), athletes);
    // Also keep these in sync if present
    fillSelect($("nutAthlete"), athletes, $("nutAthlete")?.value);
    fillSelect($("targetAthlete"), athletes, $("targetAthlete")?.value);

    // Default date field if present
    const dateInp = $("mealDate") || $("mealPlanDate") || $("nutDate");
    if (dateInp && !safeISO(dateInp.value)) dateInp.value = nowISO();

    bindGenerateButton();
  }

  // Public API
  window.PIQ_Nutrition = window.PIQ_Nutrition || {};
  window.PIQ_Nutrition.init = init;

  // Init after DOM ready + retry (for view-based rendering / hidden tabs)
  document.addEventListener("DOMContentLoaded", () => {
    init();
    setTimeout(init, 250);
    setTimeout(init, 1000);
  });
})();
