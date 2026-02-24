// nutritionEngine.js — COMPLETE REPLACEMENT (v1.0.0)
// Elite Nutrition Add-on + Meal Plan Generator (offline-first)
// Fixes: "Generate plan" button not working (ID mismatch + late DOM binding)
// Works with or without a global PIQ store. No external deps.

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

  // ---------------------------
  // Storage bridge (uses core.js state if available)
  // ---------------------------
  const FALLBACK_KEY = "piq_state_v1";

  function getRootState() {
    // Preferred: core.js exposes PIQ.getState()
    if (window.PIQ && typeof window.PIQ.getState === "function") return window.PIQ.getState();

    // Fallback: localStorage JSON (same key used in older builds)
    try {
      const raw = localStorage.getItem(FALLBACK_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveRootState(s) {
    // Preferred: core.js exposes PIQ.saveState()
    if (window.PIQ && typeof window.PIQ.saveState === "function") {
      try {
        window.PIQ.saveState();
        return true;
      } catch {}
    }
    // Fallback: write entire object
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(s));
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------
  // Nutrition data model (stored inside root state)
  // ---------------------------
  function ensureNutritionState(state) {
    state.nutrition = state.nutrition && typeof state.nutrition === "object" ? state.nutrition : {};
    state.nutrition.targets = state.nutrition.targets && typeof state.nutrition.targets === "object" ? state.nutrition.targets : {};
    state.nutrition.logs = Array.isArray(state.nutrition.logs) ? state.nutrition.logs : [];
    state.nutrition.mealPlans = state.nutrition.mealPlans && typeof state.nutrition.mealPlans === "object" ? state.nutrition.mealPlans : {};
    return state.nutrition;
  }

  // ---------------------------
  // Athlete sources (works with multiple app shapes)
  // ---------------------------
  function listAthletes(state) {
    // New UI often stores roster under state.team.roster or state.team.athletes
    const t = state.team && typeof state.team === "object" ? state.team : {};
    const roster =
      Array.isArray(t.athletes) ? t.athletes :
      Array.isArray(t.roster) ? t.roster :
      Array.isArray(t.members) ? t.members :
      [];

    // Normalize
    const out = [];
    for (const a of roster) {
      if (!a) continue;
      const id = String(a.id || a.user_id || a.athleteId || a.uuid || "").trim();
      const name = String(a.name || a.fullName || a.display_name || a.label || "").trim();
      if (!id && !name) continue;
      out.push({
        id: id || name || ("ath_" + Math.random().toString(16).slice(2)),
        name: name || ("Athlete " + (id ? id.slice(0, 8) : "")),
        weightLb: Number(a.weightLb || a.weight || a.wt || a.bodyweight || NaN),
        sport: String(a.sport || state?.profile?.sport || "basketball")
      });
    }

    // If roster is empty, create a single “Default athlete” so UI still works
    if (!out.length) {
      out.push({ id: "default", name: "Default Athlete", weightLb: NaN, sport: String(state?.profile?.sport || "basketball") });
    }
    return out;
  }

  // ---------------------------
  // Macro target logic (elite defaults)
  // ---------------------------
  function defaultTargetsForAthlete(athlete, state) {
    // If your Team tab stores defaults, use them
    const def = state.team?.macroDefaults || state.team?.defaults?.macros || null;
    const defProt = Number(def?.protein);
    const defCarb = Number(def?.carbs);
    const defFat = Number(def?.fat);
    const defWater = Number(def?.waterOz);

    // If we have bodyweight, use weight-based guidelines
    const bw = Number(athlete.weightLb);
    const hasBW = Number.isFinite(bw) && bw > 60 && bw < 400;

    // Athlete-friendly ranges:
    // Protein: ~0.8–1.0 g/lb (higher for gaining/lean mass)
    // Carbs: training-day higher; rest-day moderate
    // Fat: ~0.3–0.4 g/lb
    // Water: ~0.6–0.8 oz/lb baseline
    const protein = Number.isFinite(defProt) ? defProt : (hasBW ? Math.round(clamp(bw * 0.9, 90, 260)) : 160);
    const fat = Number.isFinite(defFat) ? defFat : (hasBW ? Math.round(clamp(bw * 0.35, 40, 120)) : 70);
    const carbs = Number.isFinite(defCarb) ? defCarb : (hasBW ? Math.round(clamp(bw * 1.8, 120, 520)) : 240);
    const waterOz = Number.isFinite(defWater) ? defWater : (hasBW ? Math.round(clamp(bw * 0.7, 60, 160)) : 100);

    return { protein, carbs, fat, waterOz };
  }

  function getTargets(state, athleteId) {
    const n = ensureNutritionState(state);
    const saved = n.targets[String(athleteId)] || null;
    if (saved && typeof saved === "object") return saved;

    const athlete = listAthletes(state).find((a) => a.id === athleteId) || { id: athleteId, name: "Athlete", weightLb: NaN };
    return defaultTargetsForAthlete(athlete, state);
  }

  function setTargets(state, athleteId, targets) {
    const n = ensureNutritionState(state);
    n.targets[String(athleteId)] = {
      protein: clamp(targets.protein, 0, 500),
      carbs: clamp(targets.carbs, 0, 1200),
      fat: clamp(targets.fat, 0, 400),
      waterOz: clamp(targets.waterOz, 0, 300)
    };
  }

  // ---------------------------
  // Meal Plan Generator
  // ---------------------------
  function splitMacros(targets, dayType) {
    // dayType: "training" or "rest"
    const p = targets.protein;
    const f = targets.fat;
    const c = targets.carbs;

    // Carb periodization
    const carbMult = dayType === "rest" ? 0.75 : 1.0;
    const cAdj = Math.round(c * carbMult);

    // Distribute into 4 meals + 1 snack (simple & realistic)
    const meals = [
      { name: "Breakfast", p: 0.25, c: 0.20, f: 0.25 },
      { name: "Lunch", p: 0.25, c: 0.25, f: 0.25 },
      { name: "Pre-Workout / Snack", p: 0.15, c: 0.20, f: 0.10 },
      { name: "Post-Workout", p: 0.15, c: 0.20, f: 0.10 },
      { name: "Dinner", p: 0.20, c: 0.15, f: 0.30 }
    ];

    function roundMeal(m) {
      return {
        name: m.name,
        protein: Math.round(p * m.p),
        carbs: Math.round(cAdj * m.c),
        fat: Math.round(f * m.f)
      };
    }

    const plan = meals.map(roundMeal);

    // Fix rounding drift
    const sum = (k) => plan.reduce((s, x) => s + (x[k] || 0), 0);
    plan[0].protein += (p - sum("protein"));
    plan[0].carbs += (cAdj - sum("carbs"));
    plan[0].fat += (f - sum("fat"));

    return { dayType, targets: { ...targets, carbs: cAdj }, meals: plan };
  }

  function buildFoodSuggestions(meal) {
    // Lightweight “templates” (no database)
    // Each line is a simple athlete-friendly option.
    const p = meal.protein, c = meal.carbs, f = meal.fat;

    // Keep it readable and not overly strict
    const options = [];
    options.push(`Option A: Lean protein + carbs + fruit/veg (aim ~P${p}/C${c}/F${f})`);
    options.push(`Option B: Bowl: rice/pasta/potatoes + chicken/turkey/fish + olive oil/avocado`);
    options.push(`Option C: Greek yogurt + oats + berries + nut butter (adjust portions)`);
    return options;
  }

  function generateMealPlan(state, athleteId, startISO, days, dayTypeMode) {
    const start = /^\d{4}-\d{2}-\d{2}$/.test(startISO) ? startISO : nowISO();
    const nDays = clamp(days, 1, 21);

    const targets = getTargets(state, athleteId);

    const out = [];
    for (let i = 0; i < nDays; i++) {
      const d = new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10);
      const dayType =
        dayTypeMode === "rest" ? "rest" :
        dayTypeMode === "training" ? "training" :
        // auto: 2 rest days per week heuristic
        (i % 7 === 5 || i % 7 === 6) ? "rest" : "training";

      const split = splitMacros(targets, dayType);
      out.push({
        dateISO: d,
        ...split,
        notes: dayType === "training"
          ? "Training day: prioritize carbs around session + hydrate."
          : "Rest day: slightly lower carbs, keep protein high."
      });
    }

    // persist
    const n = ensureNutritionState(state);
    n.mealPlans[String(athleteId)] = {
      athleteId: String(athleteId),
      startISO: start,
      days: nDays,
      createdAtMs: Date.now(),
      mode: dayTypeMode || "auto",
      plan: out
    };

    return n.mealPlans[String(athleteId)];
  }

  // ---------------------------
  // UI Wiring (robust binding)
  // ---------------------------
  function fillSelect(selectEl, athletes, selectedId) {
    if (!selectEl) return;
    selectEl.innerHTML = athletes.map((a) => `<option value="${sanitize(a.id)}">${sanitize(a.name)}</option>`).join("");
    if (selectedId) selectEl.value = selectedId;
  }

  function renderMealPlan(planObj, mountEl) {
    if (!mountEl) return;
    if (!planObj?.plan?.length) {
      mountEl.innerHTML = `<div class="small muted">No plan generated yet.</div>`;
      return;
    }

    mountEl.innerHTML = planObj.plan.map((day) => {
      const mealLines = day.meals.map((m) => {
        const opts = buildFoodSuggestions(m).map((x) => `• ${sanitize(x)}`).join("<br/>");
        return `
          <div style="margin:10px 0;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px">
            <div style="font-weight:700">${sanitize(m.name)} — P${m.protein} / C${m.carbs} / F${m.fat}</div>
            <div class="small muted" style="margin-top:6px">${opts}</div>
          </div>
        `;
      }).join("");

      return `
        <div style="margin:14px 0;padding:12px;border:1px solid rgba(255,255,255,.10);border-radius:16px">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
            <div style="font-weight:800">${sanitize(day.dateISO)} • ${sanitize(day.dayType.toUpperCase())}</div>
            <div class="small muted">Targets: P${day.targets.protein} / C${day.targets.carbs} / F${day.targets.fat} • Water ${day.targets.waterOz}oz</div>
          </div>
          <div class="small muted" style="margin-top:6px">${sanitize(day.notes || "")}</div>
          <div style="margin-top:10px">${mealLines}</div>
        </div>
      `;
    }).join("");
  }

  function bindMealPlanButton() {
    // Support multiple IDs so an HTML mismatch won’t break it
    const possibleIds = [
      "btnGenerateMealPlan",
      "btnGenMealPlan",
      "btnMealPlan",
      "btnGeneratePlanMeal",
      "btnGenerateNutritionPlan",
      "btnGeneratePlan" // if you reused this id for meal plan section
    ];

    const btn = possibleIds.map((id) => $(id)).find(Boolean);

    // Also support a data attribute: <button data-action="generate-meal-plan">
    const fallbackBtn = document.querySelector('[data-action="generate-meal-plan"]');

    const targetBtn = btn || fallbackBtn;
    if (!targetBtn) return false;

    // Prevent double-binding
    if (targetBtn.__piqBound) return true;
    targetBtn.__piqBound = true;

    targetBtn.addEventListener("click", () => {
      try {
        const state = getRootState();
        ensureNutritionState(state);

        // Try to find athlete + start + days inputs (support multiple ids)
        const athleteSel =
          $("mealAthlete") || $("nutAthlete") || $("targetAthlete") || $("dashAthlete") || $("logAthlete");

        const startInp =
          $("mealStart") || $("nutDate") || $("mealDate") || $("mealPlanStart") || $("dashDate");

        const daysInp =
          $("mealDays") || $("mealPlanDays") || $("planDays") || $("heatDays");

        const modeSel =
          $("mealMode") || $("mealDayType") || $("mealPlanMode");

        const athletes = listAthletes(state);
        const athleteId = athleteSel?.value || athletes[0]?.id || "default";

        const startISO = (startInp?.value || nowISO()).trim();
        const days = Number(daysInp?.value || 7);
        const mode = (modeSel?.value || "auto").trim(); // auto | training | rest

        const planObj = generateMealPlan(state, athleteId, startISO, days, mode);

        // render into a mount if present, otherwise alert
        const outMount = $("mealPlanOut") || $("mealPlanList") || $("mealPlanOutput");
        if (outMount) {
          renderMealPlan(planObj, outMount);
        } else {
          alert("Meal plan generated. Add a container with id='mealPlanOut' to display it.");
        }

        saveRootState(state);
      } catch (e) {
        console.warn("Meal plan generation failed:", e);
        alert("Meal plan generation failed: " + (e?.message || e));
      }
    });

    return true;
  }

  function initNutritionUI() {
    const state = getRootState();
    ensureNutritionState(state);

    const athletes = listAthletes(state);

    // Fill known selects if they exist
    fillSelect($("nutAthlete"), athletes);
    fillSelect($("targetAthlete"), athletes);
    if ($("nutDate")) $("nutDate").value = $("nutDate").value || nowISO();

    // Bind the meal plan generator button robustly
    bindMealPlanButton();
  }

  // Public API
  window.PIQ_Nutrition = window.PIQ_Nutrition || {};
  window.PIQ_Nutrition.init = initNutritionUI;
  window.PIQ_Nutrition.generateMealPlan = function (athleteId, startISO, days, mode) {
    const state = getRootState();
    const planObj = generateMealPlan(state, athleteId, startISO, days, mode);
    saveRootState(state);
    return planObj;
  };

  // Init after DOM is ready AND also on next tick (covers late-inserted views)
  document.addEventListener("DOMContentLoaded", () => {
    initNutritionUI();
    setTimeout(initNutritionUI, 250);
    setTimeout(initNutritionUI, 1000);
  });

})();
