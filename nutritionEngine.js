// nutritionEngine.js — FULL REPLACEMENT (v1.2.0)
// Elite Nutrition Add-on + Meal Plan Generator (offline-first)
// Supports: Day type (training / game / recovery), macro targets, hydration, micronutrient focus.
// Works with core.js v2.1.0 via window.PIQ.getState()/saveState(). Falls back to localStorage if PIQ missing.

(function () {
  "use strict";

  if (window.__PIQ_NUTRITION_ENGINE_V12__) return;
  window.__PIQ_NUTRITION_ENGINE_V12__ = true;

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

  function toNum(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function safeISO(d) {
    const s = String(d || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }

  function addDaysISO(iso, deltaDays) {
    const d = safeISO(iso) || nowISO();
    const ms = Date.parse(d);
    if (!Number.isFinite(ms)) return nowISO();
    return new Date(ms + deltaDays * 86400000).toISOString().slice(0, 10);
  }

  // ---------------------------
  // Storage bridge (uses core.js state if available)
  // ---------------------------
  const FALLBACK_KEY = "piq_v2_state";

  function getRootState() {
    if (window.PIQ && typeof window.PIQ.getState === "function") return window.PIQ.getState();
    try {
      const raw = localStorage.getItem(FALLBACK_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveRootState(state) {
    if (window.PIQ && typeof window.PIQ.saveState === "function") {
      try {
        window.PIQ.saveState();
        return true;
      } catch {}
    }
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------
  // Ensure nutrition state container
  // ---------------------------
  function ensureNutritionState(state) {
    // Keep compatibility with your existing core.js schema:
    // state.targets[athleteId] and state.logs.nutrition[athleteId]
    // Add this module-specific bucket:
    state.nutrition = state.nutrition && typeof state.nutrition === "object" ? state.nutrition : {};
    state.nutrition.mealPlans = state.nutrition.mealPlans && typeof state.nutrition.mealPlans === "object" ? state.nutrition.mealPlans : {};
    state.nutrition.settings = state.nutrition.settings && typeof state.nutrition.settings === "object" ? state.nutrition.settings : {};
    return state.nutrition;
  }

  // ---------------------------
  // Athlete sources (core.js v2 stores athletes at state.athletes)
  // ---------------------------
  function listAthletes(state) {
    const roster = Array.isArray(state.athletes) ? state.athletes : [];
    const out = roster
      .filter(Boolean)
      .map((a) => ({
        id: String(a.id || a.uuid || a.athleteId || a.user_id || a.name || "default"),
        name: String(a.name || a.fullName || a.display_name || a.label || "Athlete"),
        weightLb: toNum(a.weightLb || a.weight || a.wt, NaN),
        sport: String(a.sport || "basketball")
      }));

    if (!out.length) out.push({ id: "default", name: "Default Athlete", weightLb: NaN, sport: "basketball" });
    return out;
  }

  // ---------------------------
  // Targets (uses core.js targets if present)
  // ---------------------------
  function getTargets(state, athleteId) {
    const id = String(athleteId || "default");
    // core.js: state.targets[id] exists after ensureTargetsForAthlete runs
    const t = state.targets && typeof state.targets === "object" ? state.targets[id] : null;
    if (t && typeof t === "object") {
      return {
        protein: clamp(toNum(t.protein, 160), 0, 500),
        carbs: clamp(toNum(t.carbs, 240), 0, 1200),
        fat: clamp(toNum(t.fat, 70), 0, 400),
        waterOz: clamp(toNum(t.waterOz, 80), 0, 300)
      };
    }

    // fallback: team defaults
    const d = state.team?.macroDefaults || { protein: 160, carbs: 240, fat: 70, waterOz: 80 };
    return {
      protein: clamp(toNum(d.protein, 160), 0, 500),
      carbs: clamp(toNum(d.carbs, 240), 0, 1200),
      fat: clamp(toNum(d.fat, 70), 0, 400),
      waterOz: clamp(toNum(d.waterOz, 80), 0, 300)
    };
  }

  // ---------------------------
  // Day-type macro adjustments (industry-style periodization)
  // ---------------------------
  function adjustTargetsForDayType(baseTargets, dayType) {
    const t = { ...baseTargets };

    // Training day: baseline targets (carb-forward)
    // Game day: slightly higher carbs + hydration emphasis
    // Recovery day: lower carbs, maintain protein, slightly higher fats (satiety)
    if (dayType === "game") {
      t.carbs = Math.round(t.carbs * 1.15);
      t.waterOz = Math.round(t.waterOz * 1.10);
      // keep protein/fat stable
    } else if (dayType === "recovery") {
      t.carbs = Math.round(t.carbs * 0.75);
      t.fat = Math.round(t.fat * 1.10);
      // water stays baseline (or slight bump if you want)
      t.waterOz = Math.round(t.waterOz * 1.00);
    } else {
      // training default
      t.carbs = Math.round(t.carbs * 1.00);
      t.waterOz = Math.round(t.waterOz * 1.00);
    }

    // Clamp
    t.protein = clamp(t.protein, 0, 500);
    t.carbs = clamp(t.carbs, 0, 1200);
    t.fat = clamp(t.fat, 0, 400);
    t.waterOz = clamp(t.waterOz, 0, 300);
    return t;
  }

  // ---------------------------
  // Meal distribution logic
  // ---------------------------
  function splitMacrosIntoMeals(targets, dayType) {
    // 5 feedings: Breakfast, Lunch, Pre, Post, Dinner
    // Game day: add "Pre-game" emphasis + "Post-game" recovery; still 5 feedings.
    // Recovery: slightly more fats at dinner; carbs reduced overall already.
    const meals = [
      { name: "Breakfast", p: 0.25, c: dayType === "recovery" ? 0.18 : 0.20, f: 0.25 },
      { name: "Lunch", p: 0.25, c: dayType === "recovery" ? 0.22 : 0.25, f: 0.25 },
      { name: dayType === "game" ? "Pre-Game Meal / Snack" : "Pre-Workout Snack", p: 0.15, c: 0.22, f: 0.10 },
      { name: dayType === "game" ? "Post-Game Recovery" : "Post-Workout", p: 0.15, c: 0.22, f: 0.10 },
      { name: "Dinner", p: 0.20, c: dayType === "recovery" ? 0.16 : 0.11, f: dayType === "recovery" ? 0.30 : 0.30 }
    ];

    function roundMeal(m) {
      return {
        name: m.name,
        protein: Math.round(targets.protein * m.p),
        carbs: Math.round(targets.carbs * m.c),
        fat: Math.round(targets.fat * m.f)
      };
    }

    const plan = meals.map(roundMeal);

    // Fix rounding drift to match totals exactly (apply drift to breakfast)
    const sum = (k) => plan.reduce((s, x) => s + (x[k] || 0), 0);
    plan[0].protein += (targets.protein - sum("protein"));
    plan[0].carbs += (targets.carbs - sum("carbs"));
    plan[0].fat += (targets.fat - sum("fat"));

    return plan;
  }

  // ---------------------------
  // Micronutrient + hydration focus by day-type
  // ---------------------------
  function micronutrientFocus(dayType) {
    if (dayType === "game") {
      return {
        title: "Game Day Focus",
        bullets: [
          "Carb-forward fuel + easy digestion (lower fiber immediately pre-game).",
          "Electrolytes: include sodium + fluids throughout the day.",
          "Post-game: prioritize carbs + protein within 1–2 hours."
        ],
        highlights: ["Sodium", "Potassium", "Magnesium", "Iron", "Vitamin C"]
      };
    }
    if (dayType === "recovery") {
      return {
        title: "Recovery Day Focus",
        bullets: [
          "Protein spread across meals to support repair.",
          "Anti-inflammatory foods: colorful fruits/veg, omega-3 sources.",
          "Prioritize sleep support: consistent meals + hydration."
        ],
        highlights: ["Omega-3", "Magnesium", "Zinc", "Vitamin D", "Polyphenols"]
      };
    }
    return {
      title: "Training Day Focus",
      bullets: [
        "Carbs around the session (pre + post) to support intensity and recovery.",
        "Hydrate early; don’t wait until practice to drink.",
        "Include a fruit/veg “color goal” (2–3 colors/day minimum)."
      ],
      highlights: ["Carbs", "Sodium", "Potassium", "Calcium", "B Vitamins"]
    };
  }

  function hydrationPlan(targetWaterOz, dayType) {
    const w = clamp(toNum(targetWaterOz, 80), 40, 220);
    // Simple split across the day. Add a “during activity” recommendation for training/game.
    const morning = Math.round(w * 0.30);
    const midday = Math.round(w * 0.30);
    const afternoon = Math.round(w * 0.25);
    const evening = w - (morning + midday + afternoon);

    const during = (dayType === "training" || dayType === "game")
      ? "During: sip regularly; include electrolytes if sweating heavily."
      : "During: normal hydration; keep urine pale yellow.";

    return [
      `Morning: ~${morning} oz`,
      `Midday: ~${midday} oz`,
      `Afternoon: ~${afternoon} oz`,
      `Evening: ~${evening} oz`,
      during
    ];
  }

  // ---------------------------
  // Food templates (no database)
  // ---------------------------
  function mealTemplates(mealName, dayType, macros) {
    const p = macros.protein, c = macros.carbs, f = macros.fat;

    // Keep options athlete-friendly and adjustable
    const opts = [];

    if (/Breakfast/i.test(mealName)) {
      opts.push(`Oats + Greek yogurt + berries (+ honey if you need carbs) (Aim ~P${p}/C${c}/F${f})`);
      opts.push(`Eggs/egg whites + toast + fruit (add avocado if fats needed)`);
      opts.push(`Smoothie: milk + whey + banana + oats + peanut butter (easy to scale)`);
    } else if (/Lunch/i.test(mealName)) {
      opts.push(`Chicken/turkey bowl: rice + veggies + olive oil/avocado`);
      opts.push(`Sandwich/wrap + fruit + yogurt (simple + portable)`);
      opts.push(`Salmon/tuna + potatoes + salad (add fats if short)`);
    } else if (/Pre/i.test(mealName)) {
      if (dayType === "game") {
        opts.push(`Pre-game: bagel + jam + banana (+ small protein)`);
        opts.push(`Rice + lean protein (light portions) + fruit`);
        opts.push(`Sports drink + granola bar if close to tip-off`);
      } else {
        opts.push(`Pre-workout: banana + yogurt or whey + cereal`);
        opts.push(`Rice cakes + honey + whey (fast carbs)`);
        opts.push(`Turkey sandwich + fruit (2–3 hrs before)`);
      }
    } else if (/Post/i.test(mealName)) {
      opts.push(`Post: chocolate milk + banana (easy recovery)`);
      opts.push(`Protein shake + pretzels/fruit (fast carbs)`);
      opts.push(`Rice + lean protein (bigger meal if hungry)`);
    } else {
      // Dinner
      opts.push(`Lean protein + carbs + veggies (add olive oil if fats needed)`);
      opts.push(`Pasta + meat sauce + side salad (great for training/game days)`);
      opts.push(`Stir-fry: rice + chicken/beef + mixed veggies`);
      if (dayType === "recovery") opts.push(`Add omega-3 option: salmon + sweet potato + greens`);
    }

    return opts.map((x) => `• ${x}`);
  }

  // ---------------------------
  // Build a single-day plan
  // ---------------------------
  function buildSingleDayPlan({ athleteId, dateISO, dayType }) {
    const state = getRootState();
    ensureNutritionState(state);

    const baseTargets = getTargets(state, athleteId);
    const targets = adjustTargetsForDayType(baseTargets, dayType);

    const meals = splitMacrosIntoMeals(targets, dayType);
    const micro = micronutrientFocus(dayType);
    const hydration = hydrationPlan(targets.waterOz, dayType);

    return {
      athleteId: String(athleteId),
      dateISO: safeISO(dateISO) || nowISO(),
      dayType,
      targets,
      micronutrients: micro,
      hydration,
      meals: meals.map((m) => ({
        ...m,
        suggestions: mealTemplates(m.name, dayType, m)
      })),
      createdAtMs: Date.now()
    };
  }

  // ---------------------------
  // Build multi-day plan (optional; uses start + days if present)
  // ---------------------------
  function buildMultiDayPlan({ athleteId, startISO, days, dayType }) {
    const start = safeISO(startISO) || nowISO();
    const nDays = clamp(toNum(days, 1), 1, 21);

    const out = [];
    for (let i = 0; i < nDays; i++) {
      out.push(buildSingleDayPlan({
        athleteId,
        dateISO: addDaysISO(start, i),
        dayType
      }));
    }
    return { athleteId: String(athleteId), startISO: start, days: nDays, mode: dayType, plan: out, createdAtMs: Date.now() };
  }

  // ---------------------------
  // Render output
  // ---------------------------
  function renderPlanToHTML(plan) {
    if (!plan) return `<div class="small muted">No plan generated.</div>`;

    // If multi-day wrapper
    if (plan.plan && Array.isArray(plan.plan)) {
      return plan.plan.map((p) => renderPlanToHTML(p)).join("");
    }

    const day = plan;
    const micro = day.micronutrients || { title: "Focus", bullets: [], highlights: [] };

    const mealsHTML = (day.meals || []).map((m) => {
      const sug = (m.suggestions || []).map((x) => sanitize(x)).join("<br/>");
      return `
        <div style="margin:10px 0;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px">
          <div style="font-weight:800">${sanitize(m.name)} — P${m.protein} / C${m.carbs} / F${m.fat}</div>
          <div class="small muted" style="margin-top:6px">${sug}</div>
        </div>
      `;
    }).join("");

    const microBullets = (micro.bullets || []).map((b) => `• ${sanitize(b)}`).join("<br/>");
    const microHi = (micro.highlights || []).map((h) => `<span class="pill" style="margin-right:6px">${sanitize(h)}</span>`).join("");

    const hyd = (day.hydration || []).map((h) => `• ${sanitize(h)}`).join("<br/>");

    return `
      <div style="margin:14px 0;padding:12px;border:1px solid rgba(255,255,255,.10);border-radius:16px">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
          <div style="font-weight:900">${sanitize(day.dateISO)} • ${sanitize(String(day.dayType || "").toUpperCase())}</div>
          <div class="small muted">Targets: P${day.targets.protein} / C${day.targets.carbs} / F${day.targets.fat} • Water ${day.targets.waterOz}oz</div>
        </div>

        <div style="margin-top:10px;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px">
          <div style="font-weight:800">${sanitize(micro.title)}</div>
          <div class="small muted" style="margin-top:6px">${microBullets}</div>
          <div style="margin-top:8px">${microHi}</div>
        </div>

        <div style="margin-top:10px;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px">
          <div style="font-weight:800">Hydration plan</div>
          <div class="small muted" style="margin-top:6px">${hyd}</div>
        </div>

        <div style="margin-top:10px">${mealsHTML}</div>
      </div>
    `;
  }

  // ---------------------------
  // UI Wiring
  // ---------------------------
  function fillSelect(selectEl, athletes, selectedId) {
    if (!selectEl) return;
    selectEl.innerHTML = athletes.map((a) => `<option value="${sanitize(a.id)}">${sanitize(a.name)}</option>`).join("");
    if (selectedId && athletes.some((x) => x.id === selectedId)) selectEl.value = selectedId;
  }

  function bindGenerateButton() {
    // Support multiple IDs (robust against HTML edits)
    const possibleBtnIds = [
      "btnGenerateMealPlan",
      "btnGenMealPlan",
      "btnMealPlan",
      "btnGenerateNutritionPlan"
    ];
    const btn = possibleBtnIds.map((id) => $(id)).find(Boolean) || document.querySelector('[data-action="generate-meal-plan"]');
    if (!btn) return false;
    if (btn.__piqBound) return true;
    btn.__piqBound = true;

    btn.addEventListener("click", () => {
      try {
        const state = getRootState();
        ensureNutritionState(state);

        const athletes = listAthletes(state);

        // athlete source: prefer meal-specific selector, then nutrition panel, then targets panel
        const athleteSel =
          $("mealAthlete") || $("nutAthlete") || $("targetAthlete") || $("dashAthlete") || $("logAthlete");

        const athleteId = athleteSel?.value || athletes[0]?.id || "default";

        // date source: prefer a meal-specific date, then nutrition date, then today
        const dateInp = $("mealDate") || $("nutDate") || $("dashDate");
        const dateISO = safeISO(dateInp?.value) || nowISO();

        // day type source: your new select
        const dayTypeSel = $("mealDayType");
        const dayTypeRaw = String(dayTypeSel?.value || "training").trim();
        const dayType = (dayTypeRaw === "game" || dayTypeRaw === "recovery") ? dayTypeRaw : "training";

        // optional multi-day support if you later add inputs
        const startInp = $("mealStart") || $("mealPlanStart");
        const daysInp = $("mealDays") || $("mealPlanDays");

        const hasMulti = safeISO(startInp?.value) && toNum(daysInp?.value, 0) > 1;

        const plan = hasMulti
          ? buildMultiDayPlan({ athleteId, startISO: startInp.value, days: toNum(daysInp.value, 1), dayType })
          : buildSingleDayPlan({ athleteId, dateISO, dayType });

        // persist in state.nutrition.mealPlans
        const n = ensureNutritionState(state);
        n.mealPlans[String(athleteId)] = plan;
        saveRootState(state);

        // render
        const outMount = $("mealPlanOut") || $("mealPlanList") || $("mealPlanOutput");
        if (outMount) {
          outMount.innerHTML = renderPlanToHTML(plan);
        } else {
          alert("Meal plan generated. Add a container with id='mealPlanOut' (recommended) to display it.");
        }
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
    fillSelect($("nutAthlete"), athletes, $("nutAthlete")?.value);
    fillSelect($("targetAthlete"), athletes, $("targetAthlete")?.value);

    // If you add <select id="mealAthlete">, we support it too
    fillSelect($("mealAthlete"), athletes, $("mealAthlete")?.value);

    // Default dates
    if ($("nutDate") && !safeISO($("nutDate").value)) $("nutDate").value = nowISO();
    if ($("mealDate") && !safeISO($("mealDate").value)) $("mealDate").value = nowISO();

    // Ensure day type default
    if ($("mealDayType") && !String($("mealDayType").value || "").trim()) $("mealDayType").value = "training";

    bindGenerateButton();
  }

  // ---------------------------
  // Public API
  // ---------------------------
  window.PIQ_Nutrition = window.PIQ_Nutrition || {};
  window.PIQ_Nutrition.init = initNutritionUI;
  window.PIQ_Nutrition.generateSingleDay = function (athleteId, dateISO, dayType) {
    const state = getRootState();
    ensureNutritionState(state);
    const plan = buildSingleDayPlan({ athleteId, dateISO, dayType: dayType || "training" });
    ensureNutritionState(state).mealPlans[String(athleteId)] = plan;
    saveRootState(state);
    return plan;
  };
  window.PIQ_Nutrition.generateMultiDay = function (athleteId, startISO, days, dayType) {
    const state = getRootState();
    ensureNutritionState(state);
    const plan = buildMultiDayPlan({ athleteId, startISO, days, dayType: dayType || "training" });
    ensureNutritionState(state).mealPlans[String(athleteId)] = plan;
    saveRootState(state);
    return plan;
  };

  // Init after DOM is ready AND also on next tick (covers late view rendering)
  document.addEventListener("DOMContentLoaded", () => {
    initNutritionUI();
    setTimeout(initNutritionUI, 250);
    setTimeout(initNutritionUI, 1000);
  });

})();
