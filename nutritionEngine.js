// nutritionEngine.js — FULL REPLACEMENT — v1.2.0
// Compatible with core.js v2.3.1
// - Uses PIQ.getState/saveState when available
// - Reads mealDayType incl: training/game/recovery/rest/auto
// - Reads mealDiet: standard/highprotein/lowerfat
// - Will only bind the button if core has not already bound it

(function () {
  "use strict";

  if (window.__PIQ_NUTRITION_ENGINE_V120__) return;
  window.__PIQ_NUTRITION_ENGINE_V120__ = true;

  const FALLBACK_KEY = "piq_v2_state";
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.min(Math.max(Number(n) || 0, a), b);
  const todayISO = () => new Date().toISOString().slice(0, 10);

  function safeISO(v) {
    const s = String(v || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }

  function addDaysISO(iso, deltaDays) {
    const d = safeISO(iso) || todayISO();
    const ms = Date.parse(d);
    if (!Number.isFinite(ms)) return todayISO();
    return new Date(ms + deltaDays * 86400000).toISOString().slice(0, 10);
  }

  function escHTML(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }

  function getState() {
    if (window.PIQ && typeof window.PIQ.getState === "function") return window.PIQ.getState();
    try {
      const raw = localStorage.getItem(FALLBACK_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveState() {
    if (window.PIQ && typeof window.PIQ.saveState === "function") return window.PIQ.saveState();
    try {
      const s = getState();
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(s));
    } catch {}
  }

  function ensureAddon(state) {
    state.nutritionAddon = state.nutritionAddon && typeof state.nutritionAddon === "object" ? state.nutritionAddon : {};
    state.nutritionAddon.mealPlans = state.nutritionAddon.mealPlans && typeof state.nutritionAddon.mealPlans === "object"
      ? state.nutritionAddon.mealPlans
      : {};
    return state.nutritionAddon;
  }

  function ensureTargets(state, athleteId) {
    state.targets = state.targets && typeof state.targets === "object" ? state.targets : {};
    state.team = state.team && typeof state.team === "object" ? state.team : {};
    state.team.macroDefaults = state.team.macroDefaults && typeof state.team.macroDefaults === "object"
      ? state.team.macroDefaults
      : { protein: 160, carbs: 240, fat: 70, waterOz: 80 };

    if (!state.targets[athleteId]) {
      const d = state.team.macroDefaults;
      state.targets[athleteId] = { protein: d.protein, carbs: d.carbs, fat: d.fat, waterOz: d.waterOz };
    }
    return state.targets[athleteId];
  }

  function listAthletes(state) {
    const arr = Array.isArray(state.athletes) ? state.athletes : [];
    if (!arr.length) return [{ id: "default", name: "Default Athlete" }];
    return arr.map((a) => ({ id: String(a.id), name: String(a.name || a.id) }));
  }

  function normalizeDayType(input, dateISO) {
    const allowed = ["training", "game", "recovery", "rest", "auto"];
    const raw = allowed.includes(String(input || "")) ? String(input) : "training";
    if (raw !== "auto") return raw;
    try {
      const d = new Date(dateISO + "T00:00:00");
      const day = d.getDay();
      return (day === 0 || day === 6) ? "rest" : "training";
    } catch {
      return "training";
    }
  }

  function splitMacros(targets, dayType, diet) {
    let p = Number(targets?.protein) || 160;
    let c = Number(targets?.carbs) || 240;
    let f = Number(targets?.fat) || 70;
    const waterOz = Number(targets?.waterOz) || 80;

    diet = String(diet || "standard");
    let pAdj = p, cAdjBase = c, fAdj = f;

    if (diet === "highprotein") {
      pAdj = Math.round(p * 1.10);
      cAdjBase = Math.round(c * 0.95);
    } else if (diet === "lowerfat") {
      fAdj = Math.round(f * 0.85);
      cAdjBase = Math.round(c * 1.05);
    }

    let carbMult = 1.0;
    if (dayType === "rest") carbMult = 0.75;
    if (dayType === "recovery") carbMult = 0.85;
    if (dayType === "game") carbMult = 1.10;

    const cAdj = Math.max(0, Math.round(cAdjBase * carbMult));

    const meals = [
      { name: "Breakfast", p: 0.25, c: 0.22, f: 0.25 },
      { name: "Lunch", p: 0.25, c: 0.26, f: 0.25 },
      { name: "Pre / Snack", p: 0.15, c: 0.20, f: 0.10 },
      { name: "Post", p: 0.15, c: 0.20, f: 0.10 },
      { name: "Dinner", p: 0.20, c: 0.12, f: 0.30 }
    ];

    const plan = meals.map((m) => ({
      name: m.name,
      protein: Math.round(pAdj * m.p),
      carbs: Math.round(cAdj * m.c),
      fat: Math.round(fAdj * m.f)
    }));

    const sum = (k) => plan.reduce((s, x) => s + (x[k] || 0), 0);
    plan[0].protein += (pAdj - sum("protein"));
    plan[0].carbs += (cAdj - sum("carbs"));
    plan[0].fat += (fAdj - sum("fat"));

    const microFocus =
      dayType === "game" ? ["sodium + fluids", "easy carbs", "potassium"] :
      dayType === "recovery" ? ["omega-3 fats", "colorful produce", "magnesium"] :
      dayType === "rest" ? ["fiber", "veg volume", "iron + zinc"] :
      ["protein quality", "carb timing", "hydration"];

    return {
      dayType,
      diet,
      targets: { protein: pAdj, carbs: cAdj, fat: fAdj, waterOz },
      microFocus,
      meals: plan
    };
  }

  function buildFoodSuggestions(meal, dayType) {
    const p = meal.protein, c = meal.carbs, f = meal.fat;
    const options = [];
    options.push(`Option A: Lean protein + starch + fruit/veg (aim ~P${p}/C${c}/F${f})`);
    if (dayType === "game") {
      options.push(`Option B: Pre-game: rice + chicken + low-fiber veg (keep it simple)`);
      options.push(`Option C: Post-game: chocolate milk + sandwich + fruit`);
    } else if (dayType === "recovery") {
      options.push(`Option B: Salmon/tuna + potatoes + greens + olive oil`);
      options.push(`Option C: Greek yogurt + oats + berries + chia`);
    } else {
      options.push(`Option B: Bowl: rice/pasta/potatoes + chicken/turkey/fish + olive oil/avocado`);
      options.push(`Option C: Greek yogurt + oats + berries + nut butter (adjust portions)`);
    }
    return options;
  }

  function generateMealPlan(athleteId, startISO, days, dayTypeInput, diet) {
    const state = getState();
    ensureAddon(state);

    const start = safeISO(startISO) || todayISO();
    const nDays = clamp(days, 1, 21);
    const t = ensureTargets(state, athleteId);

    const out = [];
    for (let i = 0; i < nDays; i++) {
      const d = addDaysISO(start, i);
      const dt = normalizeDayType(dayTypeInput, d);
      const split = splitMacros(t, dt, diet);

      const notes =
        dt === "game"
          ? "Game day: higher carbs + fluids/sodium. Keep pre-game meals familiar."
          : dt === "recovery"
            ? "Recovery day: moderate carbs, emphasize protein + micronutrients."
            : dt === "rest"
              ? "Rest day: lower carbs, keep protein high, prioritize fiber."
              : "Training day: prioritize carbs around session + hydrate.";

      out.push({ dateISO: d, ...split, notes });
    }

    state.nutritionAddon.mealPlans[String(athleteId)] = {
      athleteId: String(athleteId),
      startISO: start,
      days: nDays,
      createdAtMs: Date.now(),
      mode: String(dayTypeInput || "training"),
      diet: String(diet || "standard"),
      plan: out
    };

    // Persist
    if (window.PIQ && typeof window.PIQ.saveState === "function") {
      window.PIQ.saveState();
    } else {
      try { localStorage.setItem(FALLBACK_KEY, JSON.stringify(state)); } catch {}
    }

    return state.nutritionAddon.mealPlans[String(athleteId)];
  }

  function renderMealPlan(planObj, mountEl) {
    if (!mountEl) return;
    if (!planObj?.plan?.length) {
      mountEl.innerHTML = `<div class="small muted">No plan generated yet.</div>`;
      return;
    }

    mountEl.innerHTML = planObj.plan.map((day) => {
      const mealsHtml = day.meals.map((m) => {
        const opts = buildFoodSuggestions(m, day.dayType).map((x) => `• ${escHTML(x)}`).join("<br/>");
        return `
          <div style="margin:10px 0;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px">
            <div style="font-weight:700">${escHTML(m.name)} — P${escHTML(m.protein)} / C${escHTML(m.carbs)} / F${escHTML(m.fat)}</div>
            <div class="small muted" style="margin-top:6px">${opts}</div>
          </div>
        `;
      }).join("");

      return `
        <div style="margin:14px 0;padding:12px;border:1px solid rgba(255,255,255,.10);border-radius:16px">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
            <div style="font-weight:800">${escHTML(day.dateISO)} • ${escHTML(String(day.dayType).toUpperCase())} • ${escHTML(String(day.diet || "standard").toUpperCase())}</div>
            <div class="small muted">Targets: P${escHTML(day.targets.protein)} / C${escHTML(day.targets.carbs)} / F${escHTML(day.targets.fat)} • Water ${escHTML(day.targets.waterOz)}oz</div>
          </div>
          <div class="small muted" style="margin-top:6px">${escHTML(day.notes || "")}</div>
          <div class="small muted" style="margin-top:6px"><b>Micro-focus:</b> ${escHTML((day.microFocus || []).join(", "))}</div>
          <div style="margin-top:10px">${mealsHtml}</div>
        </div>
      `;
    }).join("");
  }

  function fillSelect(selectEl, items) {
    if (!selectEl) return;
    selectEl.innerHTML = items.map((a) => `<option value="${escHTML(a.id)}">${escHTML(a.name)}</option>`).join("");
  }

  // Bind if core didn't already bind it
  function bindIfNeeded() {
    const btn = $("btnGenerateMealPlan");
    if (!btn) return;

    // If core bound it, it will have a private flag. If not, bind here.
    if (btn.__piq_bound_click_genMealPlan__) return;

    // Minimal bind once
    if (btn.__piqNutBound) return;
    btn.__piqNutBound = true;

    btn.addEventListener("click", () => {
      const s = getState();
      const athletes = listAthletes(s);
      const athleteId = $("mealAthlete")?.value || $("nutAthlete")?.value || athletes[0]?.id || "default";
      const start = safeISO($("mealStart")?.value) || todayISO();
      const days = clamp($("mealDays")?.value || 7, 1, 21);
      const dayType = String($("mealDayType")?.value || "training");
      const diet = String($("mealDiet")?.value || "standard");

      const plan = generateMealPlan(athleteId, start, days, dayType, diet);
      renderMealPlan(plan, $("mealPlanOut"));
      saveState();
    });
  }

  function init() {
    const s = getState();
    const athletes = listAthletes(s);

    fillSelect($("mealAthlete"), athletes);
    if ($("mealStart") && !safeISO($("mealStart").value)) $("mealStart").value = todayISO();

    bindIfNeeded();
  }

  window.PIQ_Nutrition = window.PIQ_Nutrition || {};
  window.PIQ_Nutrition.init = init;
  window.PIQ_Nutrition.generateMealPlan = generateMealPlan;

  document.addEventListener("DOMContentLoaded", () => {
    init();
    setTimeout(init, 250);
    setTimeout(init, 1000);
  });
})();
