// nutritionEngine.js — COMPLETE REPLACEMENT (v1.1.0)
// Elite Nutrition Add-on + Meal Plan Generator (offline-first)
// Supports day types: training / game / recovery / rest / auto
// Robust DOM binding + works with PerformanceIQ core.js v2 state (localStorage: "piq_v2_state")
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
  // core.js v2 uses this:
  const V2_KEY = "piq_v2_state";
  // fallback older key:
  const FALLBACK_KEY = "piq_state_v1";

  function readJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeJSON(key, obj) {
    try {
      localStorage.setItem(key, JSON.stringify(obj));
      return true;
    } catch {
      return false;
    }
  }

  // If core.js ever exposes PIQ.getState/saveState in future, we support it.
  function getRootState() {
    if (window.PIQ && typeof window.PIQ.getState === "function") {
      try { return window.PIQ.getState(); } catch {}
    }

    // Prefer v2 key
    const v2 = readJSON(V2_KEY);
    if (v2 && typeof v2 === "object") return v2;

    const old = readJSON(FALLBACK_KEY);
    if (old && typeof old === "object") return old;

    return {};
  }

  function saveRootState(state) {
    if (window.PIQ && typeof window.PIQ.saveState === "function") {
      try {
        window.PIQ.saveState();
        return true;
      } catch {}
    }

    // If it looks like v2 state, save to v2 key.
    const looksV2 =
      state &&
      typeof state === "object" &&
      state.team &&
      state.logs &&
      (state.meta || state.targets || state.periodization);

    if (looksV2) return writeJSON(V2_KEY, state);

    // otherwise fallback
    return writeJSON(FALLBACK_KEY, state);
  }

  // ---------------------------
  // Nutrition data model
  // ---------------------------
  function ensureNutritionState(state) {
    // Keep mealPlans inside a dedicated namespace so it doesn't collide with core.js structures.
    state.nutrition = state.nutrition && typeof state.nutrition === "object" ? state.nutrition : {};
    state.nutrition.mealPlans =
      state.nutrition.mealPlans && typeof state.nutrition.mealPlans === "object"
        ? state.nutrition.mealPlans
        : {};
    return state.nutrition;
  }

  // ---------------------------
  // Athlete sources (core.js v2 + legacy)
  // ---------------------------
  function listAthletes(state) {
    // core.js v2 stores athletes at state.athletes (array)
    const roster = Array.isArray(state.athletes)
      ? state.athletes
      : Array.isArray(state.team?.athletes)
      ? state.team.athletes
      : Array.isArray(state.team?.roster)
      ? state.team.roster
      : [];

    const out = [];
    for (const a of roster) {
      if (!a) continue;
      const id = String(a.id || a.uuid || a.athleteId || a.user_id || "").trim();
      const name = String(a.name || a.fullName || a.display_name || a.label || "").trim();
      out.push({
        id: id || name || ("ath_" + Math.random().toString(16).slice(2)),
        name: name || ("Athlete " + (id ? id.slice(0, 8) : "")),
        weightLb: Number(a.weightLb ?? a.weight ?? a.wt ?? NaN),
        sport: String(a.sport || state?.profile?.sport || "basketball")
      });
    }

    if (!out.length) out.push({ id: "default", name: "Default Athlete", weightLb: NaN, sport: "basketball" });
    return out;
  }

  // ---------------------------
  // Macro target logic
  // ---------------------------
  function defaultTargetsForAthlete(athlete, state) {
    // core.js v2 defaults: state.team.macroDefaults
    const def = state.team?.macroDefaults || state.team?.defaults?.macros || null;

    const defProt = Number(def?.protein);
    const defCarb = Number(def?.carbs);
    const defFat = Number(def?.fat);
    const defWater = Number(def?.waterOz);

    const bw = Number(athlete.weightLb);
    const hasBW = Number.isFinite(bw) && bw > 60 && bw < 400;

    // Athlete-friendly defaults
    const protein = Number.isFinite(defProt) ? defProt : (hasBW ? Math.round(clamp(bw * 0.9, 90, 260)) : 160);
    const fat = Number.isFinite(defFat) ? defFat : (hasBW ? Math.round(clamp(bw * 0.35, 40, 120)) : 70);
    const carbs = Number.isFinite(defCarb) ? defCarb : (hasBW ? Math.round(clamp(bw * 1.8, 120, 520)) : 240);
    const waterOz = Number.isFinite(defWater) ? defWater : (hasBW ? Math.round(clamp(bw * 0.7, 60, 160)) : 100);

    return { protein, carbs, fat, waterOz };
  }

  function getTargets(state, athleteId) {
    // core.js v2 stores per-athlete targets in state.targets
    const v2Targets = state.targets && typeof state.targets === "object" ? state.targets : null;
    const saved = v2Targets ? v2Targets[String(athleteId)] : null;
    if (saved && typeof saved === "object") {
      return {
        protein: clamp(saved.protein, 0, 500),
        carbs: clamp(saved.carbs, 0, 1200),
        fat: clamp(saved.fat, 0, 400),
        waterOz: clamp(saved.waterOz, 0, 300)
      };
    }

    const athlete = listAthletes(state).find((a) => a.id === athleteId) || { id: athleteId, name: "Athlete", weightLb: NaN };
    return defaultTargetsForAthlete(athlete, state);
  }

  // ---------------------------
  // Micronutrient focus (simple “elite” touch, no database)
  // ---------------------------
  function micronutrientFocus(dayType) {
    // Simple rotation of priorities that are athlete-relevant
    if (dayType === "game") {
      return {
        focus: "Sodium + Potassium + Carbs",
        why: "Support hydration, nerve function, and performance fueling.",
        examples: ["banana", "salted rice/pasta", "sports drink/electrolytes", "potatoes"]
      };
    }
    if (dayType === "recovery") {
      return {
        focus: "Omega-3 + Magnesium + Vitamin C",
        why: "Support recovery, inflammation management, and tissue repair.",
        examples: ["salmon/tuna", "nuts/seeds", "leafy greens", "berries/citrus"]
      };
    }
    if (dayType === "rest") {
      return {
        focus: "Fiber + Iron + Calcium",
        why: "Support body comp, oxygen transport, and bone health.",
        examples: ["beans/oats", "lean red meat/spinach", "yogurt/milk", "broccoli"]
      };
    }
    // training default
    return {
      focus: "Carbs + Protein timing + Fluids",
      why: "Support training output and muscle recovery.",
      examples: ["oats/rice", "chicken/eggs", "fruit", "water"]
    };
  }

  // ---------------------------
  // Meal Plan Generator (day types)
  // ---------------------------
  function splitMacros(targets, dayType) {
    // dayType: training | game | recovery | rest
    const p = targets.protein;
    const c = targets.carbs;
    const f = targets.fat;

    // Periodization:
    // game = highest carbs, slightly lower fat (digestion)
    // training = baseline
    // recovery = moderate carbs, slightly higher fat
    // rest = lower carbs, higher fat
    let carbMult = 1.0;
    let fatMult = 1.0;

    if (dayType === "game") {
      carbMult = 1.15;
      fatMult = 0.90;
    } else if (dayType === "recovery") {
      carbMult = 0.90;
      fatMult = 1.05;
    } else if (dayType === "rest") {
      carbMult = 0.75;
      fatMult = 1.10;
    }

    const cAdj = Math.round(c * carbMult);
    const fAdj = Math.round(f * fatMult);

    // 4 meals + 1 snack template
    const meals = [
      { name: "Breakfast", p: 0.25, c: 0.20, f: 0.25 },
      { name: "Lunch", p: 0.25, c: 0.25, f: 0.25 },
      { name: dayType === "game" ? "Pre-Game / Snack" : "Pre-Workout / Snack", p: 0.15, c: 0.20, f: 0.10 },
      { name: dayType === "game" ? "Post-Game" : "Post-Workout", p: 0.15, c: 0.20, f: 0.10 },
      { name: "Dinner", p: 0.20, c: 0.15, f: 0.30 }
    ];

    const plan = meals.map((m) => ({
      name: m.name,
      protein: Math.round(p * m.p),
      carbs: Math.round(cAdj * m.c),
      fat: Math.round(fAdj * m.f)
    }));

    // Fix rounding drift
    const sum = (k) => plan.reduce((s, x) => s + (x[k] || 0), 0);
    plan[0].protein += (p - sum("protein"));
    plan[0].carbs += (cAdj - sum("carbs"));
    plan[0].fat += (fAdj - sum("fat"));

    return { dayType, targets: { ...targets, carbs: cAdj, fat: fAdj }, meals: plan };
  }

  function buildFoodSuggestions(meal, dayType) {
    const p = meal.protein, c = meal.carbs, f = meal.fat;

    const opts = [];
    opts.push(`Option A: Lean protein + carbs + fruit/veg (aim ~P${p}/C${c}/F${f})`);
    opts.push(`Option B: Bowl: rice/pasta/potatoes + chicken/turkey/fish + olive oil/avocado`);
    opts.push(`Option C: Greek yogurt + oats + berries + nut butter (adjust portions)`);

    if (dayType === "game" && /Pre-Game|Breakfast/i.test(meal.name)) {
      opts.push(`Game tip: keep fats/fiber lighter pre-game; choose easy carbs + fluids.`);
    }
    if (dayType === "recovery" && /Dinner|Lunch/i.test(meal.name)) {
      opts.push(`Recovery tip: add colorful produce + omega-3 source (fish/nuts) if possible.`);
    }
    return opts;
  }

  function resolveDayType(mode, dateISO) {
    const m = String(mode || "auto").trim();
    if (m === "training" || m === "game" || m === "recovery" || m === "rest") return m;

    // auto heuristic:
    // weekend = rest, Wednesday = recovery, otherwise training
    const d = new Date(dateISO + "T00:00:00");
    const dow = d.getDay(); // 0 Sun .. 6 Sat
    if (dow === 0 || dow === 6) return "rest";
    if (dow === 3) return "recovery";
    return "training";
  }

  function generateMealPlan(state, athleteId, startISO, days, mode) {
    const start = safeISO(startISO) || nowISO();
    const nDays = clamp(days, 1, 21);
    const targets = getTargets(state, athleteId);

    const out = [];
    for (let i = 0; i < nDays; i++) {
      const d = new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10);
      const dayType = resolveDayType(mode, d);

      const split = splitMacros(targets, dayType);
      const micro = micronutrientFocus(dayType);

      const notes =
        dayType === "game"
          ? "Game day: carb-forward meals + hydration + lighter fats pre-game."
          : dayType === "training"
          ? "Training day: prioritize carbs around session + hydrate."
          : dayType === "recovery"
          ? "Recovery day: emphasize protein, micronutrients, and sleep support."
          : "Rest day: slightly lower carbs, keep protein high.";

      out.push({
        dateISO: d,
        ...split,
        microFocus: micro,
        notes
      });
    }

    const n = ensureNutritionState(state);
    n.mealPlans[String(athleteId)] = {
      athleteId: String(athleteId),
      startISO: start,
      days: nDays,
      createdAtMs: Date.now(),
      mode: String(mode || "auto"),
      plan: out
    };

    return n.mealPlans[String(athleteId)];
  }

  // ---------------------------
  // UI Wiring
  // ---------------------------
  function fillSelect(selectEl, athletes, selectedId) {
    if (!selectEl) return;
    selectEl.innerHTML = athletes
      .map((a) => `<option value="${sanitize(a.id)}">${sanitize(a.name)}</option>`)
      .join("");
    if (selectedId && athletes.some((a) => a.id === selectedId)) selectEl.value = selectedId;
  }

  function renderMealPlan(planObj, mountEl) {
    if (!mountEl) return;
    if (!planObj?.plan?.length) {
      mountEl.innerHTML = `<div class="small muted">No plan generated yet.</div>`;
      return;
    }

    mountEl.innerHTML = planObj.plan
      .map((day) => {
        const micro = day.microFocus || {};
        const microExamples = Array.isArray(micro.examples) ? micro.examples : [];

        const mealLines = day.meals
          .map((m) => {
            const opts = buildFoodSuggestions(m, day.dayType)
              .map((x) => `• ${sanitize(x)}`)
              .join("<br/>");

            return `
              <div style="margin:10px 0;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px">
                <div style="font-weight:700">${sanitize(m.name)} — P${m.protein} / C${m.carbs} / F${m.fat}</div>
                <div class="small muted" style="margin-top:6px">${opts}</div>
              </div>
            `;
          })
          .join("");

        return `
          <div style="margin:14px 0;padding:12px;border:1px solid rgba(255,255,255,.10);border-radius:16px">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
              <div style="font-weight:800">${sanitize(day.dateISO)} • ${sanitize(String(day.dayType).toUpperCase())}</div>
              <div class="small muted">
                Targets: P${day.targets.protein} / C${day.targets.carbs} / F${day.targets.fat} • Water ${day.targets.waterOz}oz
              </div>
            </div>

            <div class="small muted" style="margin-top:6px">${sanitize(day.notes || "")}</div>

            <div style="margin-top:10px;padding:10px;border:1px dashed rgba(255,255,255,.12);border-radius:12px">
              <div style="font-weight:700">Micronutrient focus: ${sanitize(micro.focus || "—")}</div>
              <div class="small muted" style="margin-top:6px">${sanitize(micro.why || "")}</div>
              ${
                microExamples.length
                  ? `<div class="small muted" style="margin-top:6px">Examples: ${sanitize(microExamples.join(", "))}</div>`
                  : ""
              }
            </div>

            <div style="margin-top:10px">${mealLines}</div>
          </div>
        `;
      })
      .join("");
  }

  function bindMealPlanButton() {
    const possibleIds = [
      "btnGenerateMealPlan",
      "btnGenMealPlan",
      "btnMealPlan",
      "btnGeneratePlanMeal",
      "btnGenerateNutritionPlan",
      "btnGeneratePlan" // fallback if reused
    ];

    const btn = possibleIds.map((id) => $(id)).find(Boolean);
    const fallbackBtn = document.querySelector('[data-action="generate-meal-plan"]');
    const targetBtn = btn || fallbackBtn;
    if (!targetBtn) return false;

    if (targetBtn.__piqBound) return true;
    targetBtn.__piqBound = true;

    targetBtn.addEventListener("click", () => {
      try {
        const state = getRootState();
        ensureNutritionState(state);

        const athletes = listAthletes(state);

        const athleteSel = $("mealAthlete") || $("nutAthlete") || $("targetAthlete") || $("dashAthlete") || $("logAthlete");
        const startInp = $("mealStart") || $("mealPlanStart") || $("nutDate") || $("dashDate");
        const daysInp = $("mealDays") || $("mealPlanDays") || $("planDays");
        const modeSel = $("mealDayType") || $("mealMode") || $("mealPlanMode");

        const athleteId = athleteSel?.value || athletes[0]?.id || "default";
        const startISO = (startInp?.value || nowISO()).trim();
        const days = Number(daysInp?.value || 7);
        const mode = (modeSel?.value || "auto").trim(); // training|game|recovery|rest|auto

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
    const state = getRootState();
    ensureNutritionState(state);

    const athletes = listAthletes(state);

    // Fill known selects (existing UI)
    fillSelect($("nutAthlete"), athletes, $("nutAthlete")?.value);
    fillSelect($("targetAthlete"), athletes, $("targetAthlete")?.value);

    // Fill meal plan generator select + defaults
    fillSelect($("mealAthlete"), athletes, $("mealAthlete")?.value);

    if ($("nutDate")) $("nutDate").value = $("nutDate").value || nowISO();
    if ($("mealStart")) $("mealStart").value = $("mealStart").value || nowISO();

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

  // Init after DOM ready + retries (covers late-rendered views)
  document.addEventListener("DOMContentLoaded", () => {
    initNutritionUI();
    setTimeout(initNutritionUI, 250);
    setTimeout(initNutritionUI, 1000);
  });
})();
