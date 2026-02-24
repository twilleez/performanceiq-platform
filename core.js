// core.js — FULL REPLACEMENT — v2.0.0 (HTML-aligned)
// PerformanceIQ: Offline-first, Team-ready
// Wires ALL buttons/inputs from the provided index.html.
// Includes: PIQ Score, Team Heatmap, Elite Nutrition (paywall+unlock), Risk Detection, Periodization Engine.

(function () {
  "use strict";
  if (window.__PIQ_APP_LOADED__) return;
  window.__PIQ_APP_LOADED__ = true;

  // ---------------------------
  // Helpers
  // ---------------------------
  const $ = (id) => document.getElementById(id);
  const q = (sel, root) => (root || document).querySelector(sel);
  const qa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const clamp = (n, a, b) => Math.min(Math.max(n, a), b);
  const num = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const safeISO = (v) => {
    const s = String(v || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  };
  const todayISO = () => new Date().toISOString().slice(0, 10);

  function addDaysISO(iso, delta) {
    const d = safeISO(iso) || todayISO();
    const ms = Date.parse(d);
    return new Date(ms + delta * 86400000).toISOString().slice(0, 10);
  }

  function startOfWeekMondayISO(iso) {
    const d = safeISO(iso) || todayISO();
    const dt = new Date(d + "T00:00:00");
    const day = dt.getDay(); // 0 Sun ... 6 Sat
    const diff = (day === 0 ? -6 : 1 - day);
    dt.setDate(dt.getDate() + diff);
    return dt.toISOString().slice(0, 10);
  }

  function downloadText(filename, content, mime) {
    try {
      const blob = new Blob([content], { type: mime || "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.warn("download failed", e);
      return false;
    }
  }

  function readJsonFile(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        try {
          resolve(JSON.parse(String(fr.result || "{}")));
        } catch (e) {
          reject(e);
        }
      };
      fr.onerror = reject;
      fr.readAsText(file);
    });
  }

  function escHTML(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }

  // ---------------------------
  // Local State (single source of truth)
  // ---------------------------
  const STORAGE_KEY = "piq_state_v2";

  function defaultState() {
    const now = Date.now();
    return {
      meta: { version: 1, updatedAtMs: now },
      ui: { activeView: "dashboard", activeTeamName: "Default" },
      entitlement: {
        eliteNutrition: false,
        unlockedAtMs: 0
      },
      team: {
        name: "Default",
        seasonStart: "",
        seasonEnd: "",
        macroDefaults: { protein: 160, carbs: 240, fat: 70, water: 96 },
        scoreWeights: { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 }
      },
      roster: [
        // { id, name, pos, htIn, wtLb }
      ],
      logs: {
        training: [
          // { id, athleteId, dateISO, minutes, srpe, type, notes, load }
        ],
        readiness: [
          // { id, athleteId, dateISO, sleepHrs, soreness, stress, energy, injuryNote, readinessScore }
        ],
        nutrition: [
          // { id, athleteId, dateISO, protein, carbs, fat, waterOz, notes, adherence }
        ]
      },
      targets: {
        // athleteId -> { protein, carbs, fat, waterOz }
      },
      periodization: {
        // athleteId -> { startISO, weeks, goal, deloadEvery, plan: [...] }
      }
    };
  }

  function normalizeState(s) {
    const d = defaultState();
    if (!s || typeof s !== "object") return d;

    s.meta = s.meta && typeof s.meta === "object" ? s.meta : d.meta;
    if (!Number.isFinite(s.meta.updatedAtMs)) s.meta.updatedAtMs = Date.now();

    s.ui = s.ui && typeof s.ui === "object" ? s.ui : d.ui;
    if (typeof s.ui.activeView !== "string") s.ui.activeView = "dashboard";

    s.entitlement = s.entitlement && typeof s.entitlement === "object" ? s.entitlement : d.entitlement;
    if (typeof s.entitlement.eliteNutrition !== "boolean") s.entitlement.eliteNutrition = false;
    if (!Number.isFinite(s.entitlement.unlockedAtMs)) s.entitlement.unlockedAtMs = 0;

    s.team = s.team && typeof s.team === "object" ? s.team : d.team;
    if (typeof s.team.name !== "string") s.team.name = "Default";
    if (typeof s.team.seasonStart !== "string") s.team.seasonStart = "";
    if (typeof s.team.seasonEnd !== "string") s.team.seasonEnd = "";

    s.team.macroDefaults = s.team.macroDefaults && typeof s.team.macroDefaults === "object" ? s.team.macroDefaults : d.team.macroDefaults;
    s.team.scoreWeights = s.team.scoreWeights && typeof s.team.scoreWeights === "object" ? s.team.scoreWeights : d.team.scoreWeights;

    if (!Array.isArray(s.roster)) s.roster = [];
    s.logs = s.logs && typeof s.logs === "object" ? s.logs : d.logs;
    if (!Array.isArray(s.logs.training)) s.logs.training = [];
    if (!Array.isArray(s.logs.readiness)) s.logs.readiness = [];
    if (!Array.isArray(s.logs.nutrition)) s.logs.nutrition = [];

    s.targets = s.targets && typeof s.targets === "object" ? s.targets : {};
    s.periodization = s.periodization && typeof s.periodization === "object" ? s.periodization : {};

    return s;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return normalizeState(JSON.parse(raw));
    } catch (e) {
      console.warn("loadState failed", e);
      return defaultState();
    }
  }

  const state = loadState();

  function saveState() {
    state.meta.updatedAtMs = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("saveState failed", e);
    }
    updateHeaderPills();
  }

  // ---------------------------
  // View Navigation
  // ---------------------------
  function setActiveView(view) {
    const all = qa(".view[data-view]");
    all.forEach((v) => {
      const match = v.id === `view-${view}`;
      v.hidden = !match;
    });
    state.ui.activeView = view;
    saveState();
  }

  function updateHeaderPills() {
    const pill = $("activeTeamPill");
    if (pill) pill.textContent = `Team: ${state.team.name || "Default"}`;
    const info = $("appInfo");
    if (info) info.textContent = `core.js v2.0.0 • updated ${new Date(state.meta.updatedAtMs).toLocaleString()} • EliteNutrition: ${state.entitlement.eliteNutrition ? "Unlocked" : "Locked"}`;
  }

  // ---------------------------
  // Data helpers
  // ---------------------------
  function uid(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
  }

  function ensureRosterSeed() {
    if (state.roster.length) return;
    state.roster.push(
      { id: uid("ath"), name: "Demo Athlete A", pos: "PG", htIn: 70, wtLb: 150 },
      { id: uid("ath"), name: "Demo Athlete B", pos: "SG", htIn: 72, wtLb: 165 },
      { id: uid("ath"), name: "Demo Athlete C", pos: "SF", htIn: 74, wtLb: 180 }
    );
  }

  function getAthleteById(id) {
    return state.roster.find((a) => a.id === id) || null;
  }

  function listAthletes() {
    return state.roster.slice();
  }

  function setSelectOptions(selectEl, athletes, selectedId) {
    if (!selectEl) return;
    selectEl.innerHTML = athletes
      .map((a) => `<option value="${escHTML(a.id)}">${escHTML(a.name || a.id)}</option>`)
      .join("");
    if (athletes.length) {
      selectEl.value = selectedId && athletes.some((a) => a.id === selectedId) ? selectedId : athletes[0].id;
    }
  }

  function getTargetsForAthlete(athleteId) {
    const t = state.targets[athleteId];
    if (t && typeof t === "object") return t;
    const d = state.team.macroDefaults;
    return { protein: d.protein, carbs: d.carbs, fat: d.fat, waterOz: d.water };
  }

  // ---------------------------
  // Computations: Training Load, Readiness, Nutrition adherence
  // ---------------------------
  function computeTrainingLoad(minutes, srpe) {
    return clamp(num(minutes, 0), 0, 600) * clamp(num(srpe, 0), 0, 10);
  }

  function computeReadinessScore({ sleepHrs, soreness, stress, energy }) {
    // Simple, transparent formula → 0–100
    // sleep: 0–16, target 8
    const sleep = clamp(num(sleepHrs, 0), 0, 16);
    const sleepScore = clamp((sleep / 8) * 40, 0, 40);

    const sore = clamp(num(soreness, 0), 0, 10);
    const stressV = clamp(num(stress, 0), 0, 10);
    const energyV = clamp(num(energy, 0), 0, 10);

    const soreScore = clamp((10 - sore) * 3, 0, 30);
    const stressScore = clamp((10 - stressV) * 2, 0, 20);
    const energyScore = clamp(energyV * 1, 0, 10);

    return Math.round(clamp(sleepScore + soreScore + stressScore + energyScore, 0, 100));
  }

  function computeNutritionAdherence(athleteId, protein, carbs, fat, waterOz) {
    const t = getTargetsForAthlete(athleteId);
    const p = Math.max(0, num(protein, 0));
    const c = Math.max(0, num(carbs, 0));
    const f = Math.max(0, num(fat, 0));
    const w = Math.max(0, num(waterOz, 0));

    // Ratio to targets, clipped. Slightly penalize huge overshoots.
    function ratio(val, target) {
      const T = Math.max(1, num(target, 1));
      const r = val / T;
      if (r <= 1) return r; // 0..1
      // overshoot: cap at 1, but minor penalty if extreme
      return clamp(1 - (r - 1) * 0.15, 0.7, 1);
    }

    const rp = ratio(p, t.protein);
    const rc = ratio(c, t.carbs);
    const rf = ratio(f, t.fat);
    const rw = ratio(w, t.waterOz);

    const score = Math.round(clamp((rp * 0.35 + rc * 0.35 + rf * 0.2 + rw * 0.1) * 100, 0, 100));
    return { score, detail: { targets: t, ratios: { protein: rp, carbs: rc, fat: rf, water: rw } } };
  }

  // ---------------------------
  // Risk Detection (heuristics)
  // ---------------------------
  function lastNDays(arr, athleteId, endISO, n, dateKey) {
    const end = safeISO(endISO) || todayISO();
    const start = addDaysISO(end, -(n - 1));
    return (arr || [])
      .filter((x) => x && x.athleteId === athleteId && safeISO(x[dateKey]) && x[dateKey] >= start && x[dateKey] <= end)
      .sort((a, b) => String(a[dateKey]).localeCompare(String(b[dateKey])));
  }

  function computeMonotony(loads) {
    // monotony = mean / std (classic TRIMP-style heuristic)
    const xs = loads.filter((x) => Number.isFinite(x));
    if (xs.length < 3) return null;
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const varr = xs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / xs.length;
    const std = Math.sqrt(varr);
    if (std === 0) return null;
    return mean / std;
  }

  function computeStrain(meanLoad, monotony) {
    if (!Number.isFinite(meanLoad) || !Number.isFinite(monotony)) return null;
    return meanLoad * monotony;
  }

  function runRisk(athleteId, asOfISO) {
    const date = safeISO(asOfISO) || todayISO();

    const train7 = lastNDays(state.logs.training, athleteId, date, 7, "dateISO");
    const loads = train7.map((s) => num(s.load, 0));
    const meanLoad = loads.length ? loads.reduce((a, b) => a + b, 0) / loads.length : 0;
    const monotony = computeMonotony(loads);
    const strain = computeStrain(meanLoad, monotony);

    const ready7 = lastNDays(state.logs.readiness, athleteId, date, 7, "dateISO");
    const avgReady = ready7.length ? Math.round(ready7.reduce((a, b) => a + num(b.readinessScore, 0), 0) / ready7.length) : null;

    const nut7 = lastNDays(state.logs.nutrition, athleteId, date, 7, "dateISO");
    const avgNut = nut7.length ? Math.round(nut7.reduce((a, b) => a + num(b.adherence, 0), 0) / nut7.length) : null;

    const flags = [];
    // Heuristic thresholds (tunable)
    if (meanLoad > 500) flags.push("High average load (7d).");
    if (Number.isFinite(monotony) && monotony >= 2.0) flags.push("High monotony (similar load daily).");
    if (Number.isFinite(strain) && strain >= 1200) flags.push("High strain (load × monotony).");
    if (avgReady !== null && avgReady < 55) flags.push("Low readiness average (7d).");
    if (avgNut !== null && avgNut < 60) flags.push("Low nutrition adherence (7d).");

    // Simple composite risk index 0–100
    let risk = 0;
    risk += clamp(meanLoad / 8, 0, 30); // ~0..75 but clipped
    if (Number.isFinite(monotony)) risk += clamp((monotony - 1) * 20, 0, 25);
    if (avgReady !== null) risk += clamp((60 - avgReady) * 0.8, 0, 20);
    if (avgNut !== null) risk += clamp((65 - avgNut) * 0.6, 0, 15);

    risk = Math.round(clamp(risk, 0, 100));

    const band = risk >= 75 ? "High" : risk >= 50 ? "Moderate" : "Low";
    return {
      dateISO: date,
      meanLoad: Math.round(meanLoad),
      monotony: monotony ? monotony.toFixed(2) : "—",
      strain: strain ? Math.round(strain) : "—",
      avgReady: avgReady ?? "—",
      avgNut: avgNut ?? "—",
      flags,
      risk,
      band
    };
  }

  // ---------------------------
  // PIQ Score (brand differentiator)
  // ---------------------------
  function scoreBand(score) {
    const s = num(score, 0);
    if (s >= 85) return "Elite";
    if (s >= 70) return "Strong";
    if (s >= 55) return "Build";
    return "Recover";
  }

  function computeSubScores(athleteId, dateISO) {
    const date = safeISO(dateISO) || todayISO();

    // Readiness: from readiness log (0-100), else neutral 70
    const ready = state.logs.readiness.find((r) => r.athleteId === athleteId && r.dateISO === date);
    const readiness = ready ? clamp(num(ready.readinessScore, 70), 0, 100) : 70;

    // Training: based on last 7 days load, balance vs plan (simple)
    const train7 = lastNDays(state.logs.training, athleteId, date, 7, "dateISO");
    const loads = train7.map((s) => num(s.load, 0));
    const weekly = loads.reduce((a, b) => a + b, 0);
    // Scale weekly load into 0-100 (tunable)
    const training = clamp(100 - Math.abs(weekly - 2400) / 30, 0, 100); // sweet spot ~2400

    // Recovery: sleep & soreness/stress factors from readiness log
    let recovery = 70;
    if (ready) {
      const sleep = clamp(num(ready.sleepHrs, 8), 0, 16);
      const soreness = clamp(num(ready.soreness, 3), 0, 10);
      const stress = clamp(num(ready.stress, 3), 0, 10);
      recovery = Math.round(
        clamp(
          (clamp((sleep / 8) * 60, 0, 60) + clamp((10 - soreness) * 2.5, 0, 25) + clamp((10 - stress) * 1.5, 0, 15)),
          0,
          100
        )
      );
    }

    // Nutrition: adherence score (0-100), else neutral 65
    const nut = state.logs.nutrition.find((n) => n.athleteId === athleteId && n.dateISO === date);
    const nutrition = nut ? clamp(num(nut.adherence, 65), 0, 100) : 65;

    // Risk: invert risk index (higher risk lowers PIQ)
    const riskObj = runRisk(athleteId, date);
    const risk = clamp(100 - riskObj.risk, 0, 100);

    return { readiness: Math.round(readiness), training: Math.round(training), recovery: Math.round(recovery), nutrition: Math.round(nutrition), risk: Math.round(risk), riskRaw: riskObj };
  }

  function computePIQScore(athleteId, dateISO) {
    const w = state.team.scoreWeights;
    const totalW = num(w.readiness, 0) + num(w.training, 0) + num(w.recovery, 0) + num(w.nutrition, 0) + num(w.risk, 0);

    const subs = computeSubScores(athleteId, dateISO);

    // Normalize weights to 100 if user saved weird values
    const W = totalW > 0 ? {
      readiness: (num(w.readiness, 0) / totalW) * 100,
      training: (num(w.training, 0) / totalW) * 100,
      recovery: (num(w.recovery, 0) / totalW) * 100,
      nutrition: (num(w.nutrition, 0) / totalW) * 100,
      risk: (num(w.risk, 0) / totalW) * 100
    } : { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 };

    const score =
      (subs.readiness * W.readiness +
        subs.training * W.training +
        subs.recovery * W.recovery +
        subs.nutrition * W.nutrition +
        subs.risk * W.risk) / 100;

    const out = {
      dateISO: safeISO(dateISO) || todayISO(),
      score: Math.round(clamp(score, 0, 100)),
      band: scoreBand(score),
      subs,
      weights: { ...W }
    };
    return out;
  }

  // ---------------------------
  // Heatmap (team dashboard)
  // ---------------------------
  function heatColorClass(val) {
    const v = num(val, 0);
    if (v >= 85) return "h5";
    if (v >= 70) return "h4";
    if (v >= 55) return "h3";
    if (v >= 40) return "h2";
    return "h1";
  }

  function getHeatValue(metric, athleteId, dateISO) {
    const d = safeISO(dateISO) || todayISO();
    if (metric === "load") {
      const sessions = state.logs.training.filter((s) => s.athleteId === athleteId && s.dateISO === d);
      const sum = sessions.reduce((a, b) => a + num(b.load, 0), 0);
      // map load into 0-100 scale
      return clamp(Math.round((sum / 600) * 100), 0, 100);
    }
    if (metric === "readiness") {
      const r = state.logs.readiness.find((x) => x.athleteId === athleteId && x.dateISO === d);
      return r ? clamp(num(r.readinessScore, 0), 0, 100) : 0;
    }
    if (metric === "nutrition") {
      const n = state.logs.nutrition.find((x) => x.athleteId === athleteId && x.dateISO === d);
      return n ? clamp(num(n.adherence, 0), 0, 100) : 0;
    }
    if (metric === "risk") {
      const rr = runRisk(athleteId, d);
      return clamp(num(rr.risk, 0), 0, 100);
    }
    return 0;
  }

  function renderHeatmap() {
    const start = safeISO($("heatStart")?.value) || addDaysISO(todayISO(), -20);
    const days = clamp(num($("heatDays")?.value, 21), 7, 60);
    const metric = $("heatMetric")?.value || "load";

    const athletes = listAthletes();
    const table = $("heatTable");
    if (!table) return;

    if (!athletes.length) {
      table.innerHTML = `<tr><td class="muted">No athletes yet. Add athletes in Team.</td></tr>`;
      return;
    }

    const dates = Array.from({ length: days }, (_, i) => addDaysISO(start, i));
    let html = "";

    // header
    html += `<tr><th class="sticky">Athlete</th>${dates.map((d) => `<th>${escHTML(d.slice(5))}</th>`).join("")}</tr>`;

    athletes.forEach((a) => {
      html += `<tr>`;
      html += `<td class="sticky"><b>${escHTML(a.name || "—")}</b><div class="small muted">${escHTML(a.pos || "")}</div></td>`;
      dates.forEach((d) => {
        const v = getHeatValue(metric, a.id, d);
        const cls = heatColorClass(metric === "load" ? v : v);
        html += `<td class="heatcell ${cls}" data-ath="${escHTML(a.id)}" data-date="${escHTML(d)}" title="${escHTML(String(v))}">${escHTML(String(v))}</td>`;
      });
      html += `</tr>`;
    });

    table.innerHTML = html;

    // click cell → jump to log
    qa(".heatcell", table).forEach((cell) => {
      cell.addEventListener("click", () => {
        const aid = cell.getAttribute("data-ath");
        const d = cell.getAttribute("data-date");
        if ($("logAthlete")) $("logAthlete").value = aid;
        if ($("logDate")) $("logDate").value = d;
        if ($("readyAthlete")) $("readyAthlete").value = aid;
        if ($("readyDate")) $("readyDate").value = d;
        setActiveView("log");
        renderLogLists();
      });
    });
  }

  // ---------------------------
  // Elite Nutrition: paywall + meal plan templates
  // ---------------------------
  function ensureEliteAccess() {
    if (state.entitlement.eliteNutrition) return true;

    const code = prompt("Elite Nutrition is a paid upgrade. Enter unlock code:");
    if (!code) return false;

    if (String(code).trim().toUpperCase() === "PIQ-ELITE") {
      state.entitlement.eliteNutrition = true;
      state.entitlement.unlockedAtMs = Date.now();
      saveState();
      alert("Elite Nutrition unlocked on this device.");
      return true;
    }

    alert("Invalid code.");
    return false;
  }

  function buildMealPlan(athleteId, goal) {
    // Simple template generator (non-medical), aligned to athlete targets.
    const t = getTargetsForAthlete(athleteId);
    const g = String(goal || "performance");

    const lines = [];
    lines.push(`Meal Plan (Template) — Goal: ${g}`);
    lines.push(`Targets: P ${t.protein}g • C ${t.carbs}g • F ${t.fat}g • Water ${t.waterOz}oz`);
    lines.push("");
    lines.push("Timing (simple):");
    lines.push("- Breakfast: protein + carbs + fruit");
    lines.push("- Pre-training (60–90 min): carbs + small protein");
    lines.push("- Post-training (0–2 hr): protein + carbs");
    lines.push("- Dinner: protein + veg + carbs (as needed)");
    lines.push("");

    // Example food blocks (not brand claims)
    lines.push("Example day:");
    lines.push("- Breakfast: eggs/egg whites + oats + berries");
    lines.push("- Snack: Greek yogurt + banana");
    lines.push("- Lunch: chicken + rice + veggies + olive oil");
    lines.push("- Pre-training: bagel + honey + whey (optional)");
    lines.push("- Post-training: chocolate milk or shake + fruit");
    lines.push("- Dinner: salmon/beef + potatoes + salad");
    lines.push("- Hydration: water all day + electrolytes if heavy sweat");

    return lines.join("\n");
  }

  // ---------------------------
  // Periodization Engine
  // ---------------------------
  function generatePeriodizationPlan({ athleteId, startISO, weeks, goal, deloadEvery }) {
    const start = safeISO(startISO) || todayISO();
    const w = clamp(num(weeks, 8), 2, 24);
    const del = clamp(num(deloadEvery, 4), 3, 5);
    const g = String(goal || "inseason");

    // Weekly target load (minutes × sRPE). Tunable by goal.
    const base = g === "offseason" ? 2800 : g === "rehab" ? 1400 : 2200;

    const plan = [];
    for (let i = 1; i <= w; i++) {
      const isDeload = i % del === 0;
      const mult = isDeload ? 0.75 : 1 + Math.min((i - 1) * 0.05, 0.2);
      const target = Math.round(base * mult);

      plan.push({
        weekIndex: i,
        startISO: addDaysISO(start, (i - 1) * 7),
        deload: isDeload,
        targetLoad: target,
        // Suggested sessions (simple)
        sessions: [
          { day: "Mon", minutes: 60, srpe: isDeload ? 5 : 6 },
          { day: "Tue", minutes: 75, srpe: isDeload ? 5 : 7 },
          { day: "Wed", minutes: 45, srpe: 4 },
          { day: "Thu", minutes: 75, srpe: isDeload ? 5 : 7 },
          { day: "Fri", minutes: 60, srpe: isDeload ? 5 : 6 },
          { day: "Sat", minutes: 45, srpe: 4 },
          { day: "Sun", minutes: 0, srpe: 0 }
        ]
      });
    }
    return { athleteId, startISO: start, weeks: w, goal: g, deloadEvery: del, plan };
  }

  function actualLoadForWeek(athleteId, weekStartISO) {
    const start = safeISO(weekStartISO) || startOfWeekMondayISO(todayISO());
    const end = addDaysISO(start, 6);
    const sessions = state.logs.training.filter((s) => s.athleteId === athleteId && s.dateISO >= start && s.dateISO <= end);
    return Math.round(sessions.reduce((a, b) => a + num(b.load, 0), 0));
  }

  // ---------------------------
  // Rendering: roster list + log lists + nutrition list + plan list
  // ---------------------------
  function renderRoster() {
    const list = $("rosterList");
    if (!list) return;

    const athletes = listAthletes();
    if (!athletes.length) {
      list.innerHTML = `<div class="muted small">No athletes yet. Add one above.</div>`;
      return;
    }

    list.innerHTML = athletes
      .map((a) => {
        return `
          <div class="row gap wrap" style="align-items:center;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;margin:8px 0">
            <div class="grow">
              <div><b>${escHTML(a.name || "—")}</b> <span class="muted small">(${escHTML(a.pos || "—")})</span></div>
              <div class="muted small">Ht: ${escHTML(a.htIn ?? "—")} in • Wt: ${escHTML(a.wtLb ?? "—")} lb</div>
            </div>
            <button class="btn ghost" data-set-active="${escHTML(a.id)}">Use</button>
            <button class="btn danger" data-del-ath="${escHTML(a.id)}">Remove</button>
          </div>
        `;
      })
      .join("");

    qa("[data-del-ath]", list).forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del-ath");
        if (!id) return;
        if (!confirm("Remove athlete and all their logs?")) return;
        state.roster = state.roster.filter((a) => a.id !== id);
        state.logs.training = state.logs.training.filter((x) => x.athleteId !== id);
        state.logs.readiness = state.logs.readiness.filter((x) => x.athleteId !== id);
        state.logs.nutrition = state.logs.nutrition.filter((x) => x.athleteId !== id);
        delete state.targets[id];
        delete state.periodization[id];
        saveState();
        hydrateSelects();
        renderRoster();
        renderLogLists();
      });
    });

    qa("[data-set-active]", list).forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-set-active");
        if (!id) return;
        // set all athlete pickers
        ["dashAthlete", "riskAthlete", "logAthlete", "readyAthlete", "nutAthlete", "targetAthlete", "perAthlete", "monAthlete"].forEach((sid) => {
          const sel = $(sid);
          if (sel) sel.value = id;
        });
        renderDashboard();
        renderRisk();
        renderLogLists();
        renderNutritionLists();
        renderPeriodization();
        alert("Active athlete set.");
      });
    });
  }

  function renderLogComputed() {
    const minutes = num($("logMin")?.value, 0);
    const srpe = num($("logRpe")?.value, 0);
    const load = computeTrainingLoad(minutes, srpe);
    const el = $("logComputed");
    if (el) el.textContent = `Load: ${load}`;
  }

  function renderReadyComputed() {
    const sleepHrs = num($("readySleep")?.value, 0);
    const soreness = num($("readySore")?.value, 0);
    const stress = num($("readyStress")?.value, 0);
    const energy = num($("readyEnergy")?.value, 0);
    const score = computeReadinessScore({ sleepHrs, soreness, stress, energy });
    const el = $("readyComputed");
    if (el) el.textContent = String(score);
  }

  function renderNutComputed() {
    const aid = $("nutAthlete")?.value;
    if (!aid) return;
    const p = num($("nutProt")?.value, 0);
    const c = num($("nutCarb")?.value, 0);
    const f = num($("nutFat")?.value, 0);
    const w = num($("nutWater")?.value, 0);
    const out = computeNutritionAdherence(aid, p, c, f, w);
    const el = $("nutComputed");
    if (el) el.textContent = String(out.score);

    const explain = $("nutExplain");
    if (explain) {
      explain.textContent =
        `Targets: P ${out.detail.targets.protein} / C ${out.detail.targets.carbs} / F ${out.detail.targets.fat} / W ${out.detail.targets.waterOz}\n` +
        `Ratios: P ${out.detail.ratios.protein.toFixed(2)} • C ${out.detail.ratios.carbs.toFixed(2)} • F ${out.detail.ratios.fat.toFixed(2)} • W ${out.detail.ratios.water.toFixed(2)}\n` +
        `Adherence score = weighted blend (P 35%, C 35%, F 20%, W 10%)`;
    }
  }

  function renderLogLists() {
    const aid = $("logAthlete")?.value;
    const date = safeISO($("logDate")?.value) || todayISO();
    if (aid && $("logDate")) $("logDate").value = date;

    const tList = $("trainingList");
    const rList = $("readinessList");

    if (tList) {
      const rows = state.logs.training
        .filter((x) => !aid || x.athleteId === aid)
        .slice()
        .sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)))
        .slice(0, 20);

      tList.innerHTML = rows.length
        ? rows
            .map((s) => {
              const ath = getAthleteById(s.athleteId);
              return `
                <div class="row gap wrap" style="align-items:center;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;margin:8px 0">
                  <div class="grow">
                    <div><b>${escHTML(s.dateISO)}</b> • ${escHTML(ath?.name || "—")} • ${escHTML(s.type || "")}</div>
                    <div class="muted small">Minutes ${escHTML(s.minutes)} • sRPE ${escHTML(s.srpe)} • Load <b>${escHTML(s.load)}</b>${s.notes ? ` • ${escHTML(s.notes)}` : ""}</div>
                  </div>
                  <button class="btn danger" data-del-tr="${escHTML(s.id)}">Delete</button>
                </div>
              `;
            })
            .join("")
        : `<div class="muted small">No training sessions yet.</div>`;

      qa("[data-del-tr]", tList).forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-del-tr");
          if (!id) return;
          state.logs.training = state.logs.training.filter((x) => x.id !== id);
          saveState();
          renderLogLists();
          renderDashboard();
        });
      });
    }

    if (rList) {
      const rows = state.logs.readiness
        .filter((x) => !aid || x.athleteId === aid)
        .slice()
        .sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)))
        .slice(0, 20);

      rList.innerHTML = rows.length
        ? rows
            .map((r) => {
              const ath = getAthleteById(r.athleteId);
              return `
                <div class="row gap wrap" style="align-items:center;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;margin:8px 0">
                  <div class="grow">
                    <div><b>${escHTML(r.dateISO)}</b> • ${escHTML(ath?.name || "—")}</div>
                    <div class="muted small">Sleep ${escHTML(r.sleepHrs)}h • Sore ${escHTML(r.soreness)} • Stress ${escHTML(r.stress)} • Energy ${escHTML(r.energy)} • Score <b>${escHTML(r.readinessScore)}</b></div>
                    ${r.injuryNote ? `<div class="muted small">Injury note: ${escHTML(r.injuryNote)}</div>` : ""}
                  </div>
                  <button class="btn danger" data-del-rd="${escHTML(r.id)}">Delete</button>
                </div>
              `;
            })
            .join("")
        : `<div class="muted small">No readiness check-ins yet.</div>`;

      qa("[data-del-rd]", rList).forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-del-rd");
          if (!id) return;
          state.logs.readiness = state.logs.readiness.filter((x) => x.id !== id);
          saveState();
          renderLogLists();
          renderDashboard();
        });
      });
    }
  }

  function renderNutritionLists() {
    const unlocked = state.entitlement.eliteNutrition;
    const list = $("nutritionList");
    if (!list) return;

    if (!unlocked) {
      list.innerHTML = `<div class="callout">Elite Nutrition is locked. Click Save to unlock with a code.</div>`;
      return;
    }

    const aid = $("nutAthlete")?.value;
    const rows = state.logs.nutrition
      .filter((x) => !aid || x.athleteId === aid)
      .slice()
      .sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)))
      .slice(0, 20);

    list.innerHTML = rows.length
      ? rows
          .map((n) => {
            const ath = getAthleteById(n.athleteId);
            return `
              <div class="row gap wrap" style="align-items:center;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;margin:8px 0">
                <div class="grow">
                  <div><b>${escHTML(n.dateISO)}</b> • ${escHTML(ath?.name || "—")}</div>
                  <div class="muted small">
                    P ${escHTML(n.protein)} • C ${escHTML(n.carbs)} • F ${escHTML(n.fat)} • W ${escHTML(n.waterOz)}oz
                    • Adherence <b>${escHTML(n.adherence)}</b>
                  </div>
                  ${n.notes ? `<div class="muted small">${escHTML(n.notes)}</div>` : ""}
                </div>
                <button class="btn danger" data-del-nu="${escHTML(n.id)}">Delete</button>
              </div>
            `;
          })
          .join("")
      : `<div class="muted small">No nutrition logs yet.</div>`;

    qa("[data-del-nu]", list).forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del-nu");
        if (!id) return;
        state.logs.nutrition = state.logs.nutrition.filter((x) => x.id !== id);
        saveState();
        renderNutritionLists();
        renderDashboard();
      });
    });
  }

  function renderPeriodization() {
    const list = $("planList");
    if (!list) return;

    const aid = $("perAthlete")?.value;
    if (!aid) {
      list.innerHTML = `<div class="muted small">Add an athlete first.</div>`;
      return;
    }

    const planObj = state.periodization[aid];
    if (!planObj || !Array.isArray(planObj.plan)) {
      list.innerHTML = `<div class="muted small">No plan yet. Generate one above.</div>`;
      return;
    }

    list.innerHTML = planObj.plan
      .map((w) => {
        return `
          <div class="row gap wrap" style="border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;margin:8px 0">
            <div class="grow">
              <div><b>Week ${escHTML(w.weekIndex)}</b> • Starts ${escHTML(w.startISO)} ${w.deload ? `<span class="pill">DELOAD</span>` : ""}</div>
              <div class="muted small">Target load: <b>${escHTML(w.targetLoad)}</b></div>
              <div class="mono small muted">${escHTML(w.sessions.map((s) => `${s.day}:${s.minutes}×${s.srpe}`).join("  •  "))}</div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // ---------------------------
  // Dashboard rendering
  // ---------------------------
  function renderDashboard() {
    const aid = $("dashAthlete")?.value;
    const date = safeISO($("dashDate")?.value) || todayISO();
    if ($("dashDate")) $("dashDate").value = date;

    if (!aid) return;

    const out = computePIQScore(aid, date);

    if ($("piqScore")) $("piqScore").textContent = String(out.score);
    if ($("piqBand")) $("piqBand").textContent = out.band;

    // Bars
    const sub = out.subs;
    function setBar(idFill, idNum, v) {
      const fill = $(idFill);
      const numEl = $(idNum);
      if (fill) fill.style.width = `${clamp(v, 0, 100)}%`;
      if (numEl) numEl.textContent = String(Math.round(v));
    }
    setBar("barReadiness", "numReadiness", sub.readiness);
    setBar("barTraining", "numTraining", sub.training);
    setBar("barRecovery", "numRecovery", sub.recovery);
    setBar("barNutrition", "numNutrition", sub.nutrition);
    setBar("barRisk", "numRisk", sub.risk);

    // Explain
    const explain = $("piqExplain");
    if (explain) {
      explain.textContent =
        `Date: ${out.dateISO}\n` +
        `Weights (normalized): readiness ${out.weights.readiness.toFixed(1)} • training ${out.weights.training.toFixed(1)} • recovery ${out.weights.recovery.toFixed(1)} • nutrition ${out.weights.nutrition.toFixed(1)} • risk ${out.weights.risk.toFixed(1)}\n\n` +
        `Sub-scores:\n` +
        `- Readiness: ${sub.readiness}\n` +
        `- Training: ${sub.training} (weekly load sweet spot heuristic)\n` +
        `- Recovery: ${sub.recovery}\n` +
        `- Nutrition: ${sub.nutrition}\n` +
        `- Risk (inverted): ${sub.risk} (risk index ${sub.riskRaw.risk})\n\n` +
        `PIQ Score = weighted blend of sub-scores → ${out.score} (${out.band})`;
    }
  }

  function renderRisk() {
    const aid = $("riskAthlete")?.value;
    const date = safeISO($("riskDate")?.value) || todayISO();
    if ($("riskDate")) $("riskDate").value = date;
    if (!aid) return;

    const r = runRisk(aid, date);

    const summary = $("riskSummary");
    if (summary) {
      summary.textContent = `Risk: ${r.band} (${r.risk}/100) • Flags: ${r.flags.length ? r.flags.join(" ") : "None"}`;
    }
    const wl = $("riskWorkload");
    if (wl) {
      wl.textContent = `7d mean load: ${r.meanLoad}\nMonotony: ${r.monotony}\nStrain: ${r.strain}`;
    }
    const rr = $("riskReadiness");
    if (rr) {
      rr.textContent = `7d avg readiness: ${r.avgReady}\n7d avg nutrition: ${r.avgNut}`;
    }
  }

  // ---------------------------
  // Hydrate all athlete dropdowns
  // ---------------------------
  function hydrateSelects() {
    const athletes = listAthletes();
    const ids = ["dashAthlete", "riskAthlete", "logAthlete", "readyAthlete", "nutAthlete", "targetAthlete", "perAthlete", "monAthlete"];
    ids.forEach((sid) => {
      const sel = $(sid);
      if (!sel) return;
      const current = sel.value;
      setSelectOptions(sel, athletes, current);
    });

    // Default dates
    ["dashDate", "riskDate", "logDate", "readyDate", "nutDate", "perStart", "monWeek", "heatStart", "seasonStart", "seasonEnd"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      if (id === "heatStart" && !safeISO(el.value)) el.value = addDaysISO(todayISO(), -20);
      else if (!safeISO(el.value)) el.value = todayISO();
    });
  }

  // ---------------------------
  // Wire Buttons (this is what was missing)
  // ---------------------------
  function wireNav() {
    qa(".navbtn[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = btn.getAttribute("data-view");
        if (!v) return;
        setActiveView(v);
        // render view-specific panels
        if (v === "dashboard") {
          renderDashboard();
          renderRisk();
        }
        if (v === "team") renderRoster();
        if (v === "log") renderLogLists();
        if (v === "nutrition") renderNutritionLists();
        if (v === "periodization") renderPeriodization();
      });
    });
  }

  function wireTopbar() {
    $("btnSeed")?.addEventListener("click", () => {
      ensureRosterSeed();

      // Seed some logs
      const athletes = listAthletes();
      const end = todayISO();
      athletes.forEach((a) => {
        for (let i = 0; i < 10; i++) {
          const d = addDaysISO(end, -i);
          // training (some days)
          if (i % 2 === 0) {
            const minutes = 60 + (i % 3) * 15;
            const srpe = 5 + (i % 4);
            state.logs.training.push({
              id: uid("tr"),
              athleteId: a.id,
              dateISO: d,
              minutes,
              srpe,
              type: i % 4 === 0 ? "lift" : "practice",
              notes: "",
              load: computeTrainingLoad(minutes, srpe)
            });
          }
          // readiness
          state.logs.readiness.push({
            id: uid("rd"),
            athleteId: a.id,
            dateISO: d,
            sleepHrs: 7 + (i % 3) * 0.5,
            soreness: clamp(2 + (i % 5), 0, 10),
            stress: clamp(2 + (i % 4), 0, 10),
            energy: clamp(6 + (i % 4), 0, 10),
            injuryNote: "",
            readinessScore: 0
          });
          const last = state.logs.readiness[state.logs.readiness.length - 1];
          last.readinessScore = computeReadinessScore(last);

          // nutrition (if unlocked)
          state.logs.nutrition.push({
            id: uid("nu"),
            athleteId: a.id,
            dateISO: d,
            protein: 140 + (i % 3) * 20,
            carbs: 220 + (i % 4) * 30,
            fat: 60 + (i % 3) * 8,
            waterOz: 80 + (i % 3) * 10,
            notes: "",
            adherence: 0
          });
          const nlast = state.logs.nutrition[state.logs.nutrition.length - 1];
          nlast.adherence = computeNutritionAdherence(a.id, nlast.protein, nlast.carbs, nlast.fat, nlast.waterOz).score;
        }
      });

      // Team defaults
      state.team.name = state.team.name || "Default";
      saveState();
      hydrateSelects();
      renderRoster();
      renderLogLists();
      renderNutritionLists();
      renderDashboard();
      renderRisk();
      alert("Seeded demo data.");
    });

    $("btnExport")?.addEventListener("click", () => {
      const json = JSON.stringify(state, null, 2);
      const ok = downloadText(`performanceiq_export_${todayISO()}.json`, json, "application/json");
      if (!ok) alert("Export failed.");
    });

    $("fileImport")?.addEventListener("change", async (e) => {
      try {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const obj = await readJsonFile(file);
        const next = normalizeState(obj);
        // overwrite in place
        Object.keys(state).forEach((k) => delete state[k]);
        Object.keys(next).forEach((k) => (state[k] = next[k]));
        saveState();
        hydrateSelects();
        renderRoster();
        renderLogLists();
        renderNutritionLists();
        renderDashboard();
        renderRisk();
        renderPeriodization();
        alert("Import complete.");
      } catch (err) {
        alert("Import failed: " + (err?.message || err));
      } finally {
        try {
          e.target.value = "";
        } catch {}
      }
    });
  }

  function wireTeam() {
    $("btnAddAthlete")?.addEventListener("click", () => {
      const name = ($("athName")?.value || "").trim();
      if (!name) return alert("Enter athlete name.");
      const pos = ($("athPos")?.value || "").trim();
      const htIn = num($("athHt")?.value, 0);
      const wtLb = num($("athWt")?.value, 0);
      state.roster.push({ id: uid("ath"), name, pos, htIn, wtLb });
      saveState();
      hydrateSelects();
      renderRoster();
      // clear
      if ($("athName")) $("athName").value = "";
      if ($("athPos")) $("athPos").value = "";
      if ($("athHt")) $("athHt").value = "";
      if ($("athWt")) $("athWt").value = "";
    });

    $("btnSaveTeam")?.addEventListener("click", () => {
      state.team.name = ($("teamName")?.value || "Default").trim() || "Default";
      state.team.seasonStart = safeISO($("seasonStart")?.value) || "";
      state.team.seasonEnd = safeISO($("seasonEnd")?.value) || "";
      saveState();
      updateHeaderPills();
      alert("Team saved.");
    });

    $("btnSaveMacroDefaults")?.addEventListener("click", () => {
      state.team.macroDefaults = {
        protein: clamp(num($("defProt")?.value, 160), 0, 400),
        carbs: clamp(num($("defCarb")?.value, 240), 0, 800),
        fat: clamp(num($("defFat")?.value, 70), 0, 300),
        water: clamp(num($("defWater")?.value, 96), 0, 300) // NOTE: defWater input not in HTML; fallback below
      };
      // If HTML doesn't have water default input, keep existing
      if (!$("defWater")) state.team.macroDefaults.water = state.team.macroDefaults.water || 96;
      saveState();
      alert("Macro defaults saved.");
    });

    $("btnSaveWeights")?.addEventListener("click", () => {
      const readiness = clamp(num($("wReadiness")?.value, 30), 0, 100);
      const training = clamp(num($("wTraining")?.value, 25), 0, 100);
      const recovery = clamp(num($("wRecovery")?.value, 20), 0, 100);
      const nutrition = clamp(num($("wNutrition")?.value, 15), 0, 100);
      const risk = clamp(num($("wRisk")?.value, 10), 0, 100);
      const sum = readiness + training + recovery + nutrition + risk;

      state.team.scoreWeights = { readiness, training, recovery, nutrition, risk };
      saveState();

      const note = $("weightsNote");
      if (note) note.textContent = sum === 100 ? "Saved (weights total 100)." : `Saved (weights total ${sum}; PIQ will normalize automatically).`;

      renderDashboard();
      alert("Weights saved.");
    });
  }

  function wireLog() {
    // Update computed load live
    ["logMin", "logRpe"].forEach((id) => $(id)?.addEventListener("input", renderLogComputed));

    $("btnSaveTraining")?.addEventListener("click", () => {
      const athleteId = $("logAthlete")?.value;
      if (!athleteId) return alert("Add/select an athlete first.");

      const dateISO = safeISO($("logDate")?.value) || todayISO();
      const minutes = clamp(num($("logMin")?.value, 60), 0, 600);
      const srpe = clamp(num($("logRpe")?.value, 6), 0, 10);
      const type = ($("logType")?.value || "practice").trim();
      const notes = ($("logNotes")?.value || "").trim();
      const load = computeTrainingLoad(minutes, srpe);

      state.logs.training.push({ id: uid("tr"), athleteId, dateISO, minutes, srpe, type, notes, load });
      saveState();
      renderLogLists();
      renderDashboard();
      renderRisk();
      renderHeatmap();
      alert("Training saved.");
    });

    ["readySleep", "readySore", "readyStress", "readyEnergy"].forEach((id) => $(id)?.addEventListener("input", renderReadyComputed));

    $("btnSaveReadiness")?.addEventListener("click", () => {
      const athleteId = $("readyAthlete")?.value;
      if (!athleteId) return alert("Add/select an athlete first.");

      const dateISO = safeISO($("readyDate")?.value) || todayISO();
      const sleepHrs = clamp(num($("readySleep")?.value, 8), 0, 16);
      const soreness = clamp(num($("readySore")?.value, 3), 0, 10);
      const stress = clamp(num($("readyStress")?.value, 3), 0, 10);
      const energy = clamp(num($("readyEnergy")?.value, 7), 0, 10);
      const injuryNote = ($("readyInjury")?.value || "").trim();

      const readinessScore = computeReadinessScore({ sleepHrs, soreness, stress, energy });

      // Replace existing same day entry
      state.logs.readiness = state.logs.readiness.filter((r) => !(r.athleteId === athleteId && r.dateISO === dateISO));
      state.logs.readiness.push({ id: uid("rd"), athleteId, dateISO, sleepHrs, soreness, stress, energy, injuryNote, readinessScore });

      saveState();
      renderLogLists();
      renderDashboard();
      renderRisk();
      alert("Readiness saved.");
    });
  }

  function wireNutrition() {
    ["nutProt", "nutCarb", "nutFat", "nutWater", "nutAthlete"].forEach((id) => $(id)?.addEventListener("input", renderNutComputed));
    $("nutDate")?.addEventListener("change", renderNutComputed);

    $("btnSaveNutrition")?.addEventListener("click", () => {
      if (!ensureEliteAccess()) return;

      const athleteId = $("nutAthlete")?.value;
      if (!athleteId) return alert("Add/select an athlete first.");

      const dateISO = safeISO($("nutDate")?.value) || todayISO();
      const protein = clamp(num($("nutProt")?.value, 0), 0, 500);
      const carbs = clamp(num($("nutCarb")?.value, 0), 0, 1000);
      const fat = clamp(num($("nutFat")?.value, 0), 0, 400);
      const waterOz = clamp(num($("nutWater")?.value, 0), 0, 300);
      const notes = ($("nutNotes")?.value || "").trim();

      const out = computeNutritionAdherence(athleteId, protein, carbs, fat, waterOz);

      // Replace existing same day entry
      state.logs.nutrition = state.logs.nutrition.filter((n) => !(n.athleteId === athleteId && n.dateISO === dateISO));
      state.logs.nutrition.push({ id: uid("nu"), athleteId, dateISO, protein, carbs, fat, waterOz, notes, adherence: out.score });

      saveState();
      renderNutritionLists();
      renderDashboard();
      renderRisk();
      alert("Nutrition saved.");
    });

    $("btnSaveTargets")?.addEventListener("click", () => {
      if (!ensureEliteAccess()) return;

      const athleteId = $("targetAthlete")?.value;
      if (!athleteId) return alert("Select an athlete.");

      state.targets[athleteId] = {
        protein: clamp(num($("tProt")?.value, state.team.macroDefaults.protein), 0, 500),
        carbs: clamp(num($("tCarb")?.value, state.team.macroDefaults.carbs), 0, 1000),
        fat: clamp(num($("tFat")?.value, state.team.macroDefaults.fat), 0, 400),
        waterOz: clamp(num($("tWater")?.value, state.team.macroDefaults.water), 0, 300)
      };
      saveState();
      renderNutComputed();
      alert("Targets saved.");
    });

    $("btnQuickMeal")?.addEventListener("click", () => {
      if (!ensureEliteAccess()) return;

      const athleteId = $("nutAthlete")?.value;
      if (!athleteId) return alert("Select an athlete.");

      const dateISO = safeISO($("nutDate")?.value) || todayISO();

      // Find existing today or create
      let entry = state.logs.nutrition.find((n) => n.athleteId === athleteId && n.dateISO === dateISO);
      if (!entry) {
        entry = { id: uid("nu"), athleteId, dateISO, protein: 0, carbs: 0, fat: 0, waterOz: 0, notes: "", adherence: 0 };
        state.logs.nutrition.push(entry);
      }

      entry.protein += clamp(num($("qmProt")?.value, 0), 0, 200);
      entry.carbs += clamp(num($("qmCarb")?.value, 0), 0, 300);
      entry.fat += clamp(num($("qmFat")?.value, 0), 0, 150);
      entry.waterOz += clamp(num($("qmWater")?.value, 0), 0, 80);

      entry.adherence = computeNutritionAdherence(athleteId, entry.protein, entry.carbs, entry.fat, entry.waterOz).score;

      saveState();
      renderNutritionLists();
      renderNutComputed();
      renderDashboard();
    });
  }

  function wirePeriodization() {
    $("btnGeneratePlan")?.addEventListener("click", () => {
      const athleteId = $("perAthlete")?.value;
      if (!athleteId) return alert("Select an athlete.");

      const startISO = safeISO($("perStart")?.value) || todayISO();
      const weeks = clamp(num($("perWeeks")?.value, 8), 2, 24);
      const goal = ($("perGoal")?.value || "inseason").trim();
      const deloadEvery = clamp(num($("perDeload")?.value, 4), 3, 5);

      const planObj = generatePeriodizationPlan({ athleteId, startISO, weeks, goal, deloadEvery });
      state.periodization[athleteId] = planObj;
      saveState();
      renderPeriodization();
      alert("Plan generated.");
    });

    $("btnCompareWeek")?.addEventListener("click", () => {
      const athleteId = $("monAthlete")?.value;
      if (!athleteId) return alert("Select an athlete.");

      const weekISO = safeISO($("monWeek")?.value) || startOfWeekMondayISO(todayISO());
      if ($("monWeek")) $("monWeek").value = weekISO;

      const planObj = state.periodization[athleteId];
      const summary = $("compareSummary");
      const detail = $("compareDetail");

      const actual = actualLoadForWeek(athleteId, weekISO);

      let planned = null;
      let weekIndex = null;
      if (planObj && Array.isArray(planObj.plan)) {
        const found = planObj.plan.find((w) => w.startISO === weekISO);
        if (found) {
          planned = found.targetLoad;
          weekIndex = found.weekIndex;
        }
      }

      if (summary) {
        if (planned === null) summary.textContent = `Actual load: ${actual}. No plan found for week starting ${weekISO}.`;
        else {
          const diff = actual - planned;
          const pct = planned > 0 ? Math.round((diff / planned) * 100) : 0;
          summary.textContent = `Week ${weekIndex} • Planned: ${planned} • Actual: ${actual} • Diff: ${diff} (${pct}%)`;
        }
      }

      if (detail) {
        const start = weekISO;
        const end = addDaysISO(start, 6);
        const sessions = state.logs.training
          .filter((s) => s.athleteId === athleteId && s.dateISO >= start && s.dateISO <= end)
          .slice()
          .sort((a, b) => String(a.dateISO).localeCompare(String(b.dateISO)));

        detail.textContent = sessions.length
          ? sessions.map((s) => `${s.dateISO}  ${s.type}  ${s.minutes}min×${s.srpe}  load=${s.load}`).join("\n")
          : "No sessions logged in that week.";
      }
    });
  }

  function wireDashboard() {
    $("btnRecalcScore")?.addEventListener("click", () => renderDashboard());
    $("btnRunRisk")?.addEventListener("click", () => renderRisk());
    $("btnHeatmap")?.addEventListener("click", () => renderHeatmap());

    $("dashAthlete")?.addEventListener("change", renderDashboard);
    $("dashDate")?.addEventListener("change", renderDashboard);

    $("riskAthlete")?.addEventListener("change", renderRisk);
    $("riskDate")?.addEventListener("change", renderRisk);
  }

  function wireSettings() {
    $("btnWipe")?.addEventListener("click", () => {
      if (!confirm("Wipe ALL local PerformanceIQ data on this device?")) return;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      location.reload();
    });
  }

  // ---------------------------
  // Boot
  // ---------------------------
  function boot() {
    // Hide splash (failsafe)
    const splash = $("splash");
    if (splash) {
      setTimeout(() => {
        splash.style.display = "none";
        splash.setAttribute("aria-hidden", "true");
      }, 300);
    }

    // Initial hydrate
    hydrateSelects();

    // Set team inputs
    if ($("teamName")) $("teamName").value = state.team.name || "Default";
    if ($("seasonStart")) $("seasonStart").value = safeISO(state.team.seasonStart) || "";
    if ($("seasonEnd")) $("seasonEnd").value = safeISO(state.team.seasonEnd) || "";

    // Macro defaults inputs (water default input not in your HTML, so only set existing)
    if ($("defProt")) $("defProt").value = String(num(state.team.macroDefaults.protein, 160));
    if ($("defCarb")) $("defCarb").value = String(num(state.team.macroDefaults.carbs, 240));
    if ($("defFat")) $("defFat").value = String(num(state.team.macroDefaults.fat, 70));

    // Weights inputs
    if ($("wReadiness")) $("wReadiness").value = String(num(state.team.scoreWeights.readiness, 30));
    if ($("wTraining")) $("wTraining").value = String(num(state.team.scoreWeights.training, 25));
    if ($("wRecovery")) $("wRecovery").value = String(num(state.team.scoreWeights.recovery, 20));
    if ($("wNutrition")) $("wNutrition").value = String(num(state.team.scoreWeights.nutrition, 15));
    if ($("wRisk")) $("wRisk").value = String(num(state.team.scoreWeights.risk, 10));

    // Wire everything
    wireNav();
    wireTopbar();
    wireTeam();
    wireLog();
    wireNutrition();
    wirePeriodization();
    wireDashboard();
    wireSettings();

    // Computed displays
    renderLogComputed();
    renderReadyComputed();
    renderNutComputed();

    // Render active view
    setActiveView(state.ui.activeView || "dashboard");
    renderRoster();
    renderLogLists();
    renderNutritionLists();
    renderPeriodization();
    renderDashboard();
    renderRisk();
    renderHeatmap();

    updateHeaderPills();

    console.log("PerformanceIQ booted (core.js v2.0.0).");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
