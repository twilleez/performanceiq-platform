// core.js — v2.3.0 (FULL REPLACEMENT)
// Fixes "blank app" via correct view wiring + splash failsafe
// Adds: Role switching, Workouts view (standard/advanced), write-back, periodization integration

(function () {
  "use strict";

  if (window.__PIQ_V23_LOADED__) return;
  window.__PIQ_V23_LOADED__ = true;

  const APP_VERSION = "2.3.0";
  const STORAGE_KEY = "piq_v2_state";
  const DEFAULT_TEAM_ID = "default";

  // -------------------------
  // DOM helpers
  // -------------------------
  const $ = (id) => document.getElementById(id);
  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (n, a, b) => Math.min(Math.max(n, a), b);

  function safeISO(d) {
    const s = String(d || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }
  const todayISO = () => new Date().toISOString().slice(0, 10);

  function addDaysISO(iso, deltaDays) {
    const d = safeISO(iso) || todayISO();
    const ms = Date.parse(d);
    if (!Number.isFinite(ms)) return todayISO();
    return new Date(ms + deltaDays * 86400000).toISOString().slice(0, 10);
  }

  function toNum(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function uid(prefix = "a") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  }

  function escHTML(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }

  // -------------------------
  // State
  // -------------------------
  function defaultState() {
    const now = Date.now();
    return {
      meta: { version: 1, updatedAtMs: now, appVersion: APP_VERSION, role: "coach" },
      team: {
        id: DEFAULT_TEAM_ID,
        name: "Default",
        seasonStart: "",
        seasonEnd: "",
        macroDefaults: { protein: 160, carbs: 240, fat: 70, waterOz: 80 },
        piqWeights: { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 }
      },
      athletes: [],
      logs: {
        training: {},
        readiness: {},
        nutrition: {}
      },
      targets: {},
      periodization: {},
      workouts: {
        // weekly plans stored by athleteId -> weekStartISO -> {mode, source, days:[...]}
        weeks: {}
      },
      nutrition: {
        mealPlans: {}
      }
    };
  }

  function normalizeState(s) {
    const d = defaultState();
    if (!s || typeof s !== "object") return d;

    s.meta = s.meta && typeof s.meta === "object" ? s.meta : d.meta;
    if (!s.meta.role) s.meta.role = "coach";

    s.team = s.team && typeof s.team === "object" ? s.team : d.team;
    s.team.macroDefaults = s.team.macroDefaults && typeof s.team.macroDefaults === "object" ? s.team.macroDefaults : d.team.macroDefaults;
    s.team.piqWeights = s.team.piqWeights && typeof s.team.piqWeights === "object" ? s.team.piqWeights : d.team.piqWeights;

    if (!Array.isArray(s.athletes)) s.athletes = [];

    s.logs = s.logs && typeof s.logs === "object" ? s.logs : d.logs;
    if (!s.logs.training || typeof s.logs.training !== "object") s.logs.training = {};
    if (!s.logs.readiness || typeof s.logs.readiness !== "object") s.logs.readiness = {};
    if (!s.logs.nutrition || typeof s.logs.nutrition !== "object") s.logs.nutrition = {};

    s.targets = s.targets && typeof s.targets === "object" ? s.targets : {};
    s.periodization = s.periodization && typeof s.periodization === "object" ? s.periodization : {};

    s.workouts = s.workouts && typeof s.workouts === "object" ? s.workouts : { weeks: {} };
    if (!s.workouts.weeks || typeof s.workouts.weeks !== "object") s.workouts.weeks = {};

    s.nutrition = s.nutrition && typeof s.nutrition === "object" ? s.nutrition : { mealPlans: {} };
    if (!s.nutrition.mealPlans || typeof s.nutrition.mealPlans !== "object") s.nutrition.mealPlans = {};

    return s;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return normalizeState(JSON.parse(raw));
    } catch {
      return defaultState();
    }
  }

  const state = loadState();

  function saveState() {
    try {
      state.meta.updatedAtMs = Date.now();
      state.meta.appVersion = APP_VERSION;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("saveState failed", e);
    }
  }

  // Expose stable API for other engines
  window.PIQ = window.PIQ || {};
  window.PIQ.getState = () => state;
  window.PIQ.saveState = saveState;

  // -------------------------
  // Splash safety
  // -------------------------
  function hideSplash() {
    const s = $("splash");
    if (!s) return;
    s.classList.add("hidden");
    s.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      try { s.remove(); } catch {}
    }, 650);
  }

  // Failsafe hide (prevents “stuck on splash”)
  function splashFailSafe(ms = 1600) {
    setTimeout(() => {
      // If still visible, hide anyway
      if ($("splash")) hideSplash();
    }, ms);
  }

  // -------------------------
  // Roles
  // -------------------------
  function roleRank(role) {
    if (role === "admin") return 3;
    if (role === "coach") return 2;
    return 1; // athlete
  }

  function getRole() {
    return String(state.meta.role || "coach");
  }

  function setRole(r) {
    const role = (r === "admin" || r === "coach" || r === "athlete") ? r : "coach";
    state.meta.role = role;
    saveState();
    updateRoleUI();
    applyRoleToNav();
  }

  function updateRoleUI() {
    const pill = $("activeRolePill");
    if (pill) pill.textContent = `Role: ${getRole()}`;
    const sel = $("roleSelect");
    if (sel) sel.value = getRole();
    const note = $("roleNote");
    if (note) {
      note.textContent =
        getRole() === "athlete"
          ? "Athlete view enabled. Team management hidden."
          : "Coach/Admin view enabled. Team management visible.";
    }
  }

  function applyRoleToNav() {
    const r = getRole();
    const rr = roleRank(r);

    qa(".navbtn[data-role-min]").forEach((btn) => {
      const min = String(btn.getAttribute("data-role-min") || "coach");
      const allow = rr >= roleRank(min);
      btn.style.display = allow ? "" : "none";
    });

    // If currently on a hidden view (Team) as athlete, bounce to dashboard
    const active = qa(".navbtn.active")[0];
    const activeView = active?.getAttribute("data-view") || "dashboard";
    if (activeView === "team" && rr < roleRank("coach")) showView("dashboard");
  }

  // -------------------------
  // View switching
  // -------------------------
  const VIEWS = ["dashboard", "team", "log", "workouts", "nutrition", "periodization", "settings"];

  function showView(name) {
    const view = VIEWS.includes(String(name)) ? String(name) : "dashboard";

    VIEWS.forEach((v) => {
      const el = $(`view-${v}`);
      if (!el) return;
      el.hidden = v !== view;
    });

    qa(".navbtn").forEach((b) => {
      const v = b.getAttribute("data-view");
      b.classList.toggle("active", v === view);
    });

    // Render target view
    if (view === "dashboard") renderDashboard();
    if (view === "team") renderTeam();
    if (view === "log") renderLog();
    if (view === "workouts") renderWorkouts();
    if (view === "nutrition") renderNutrition();
    if (view === "periodization") renderPeriodization();
    if (view === "settings") renderSettings();

    saveState();
  }

  window.PIQ.showView = showView;
  window.PIQ.getRole = getRole;
  window.PIQ.setRole = setRole;

  function wireNav() {
    qa(".navbtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = btn.getAttribute("data-view") || "dashboard";
        showView(v);
      });
    });
  }

  // -------------------------
  // Athletes helpers
  // -------------------------
  function getAthletes() { return state.athletes.slice(); }
  function getAthlete(id) { return state.athletes.find((a) => a && a.id === id) || null; }

  function ensureTargetsForAthlete(athleteId) {
    if (!athleteId) return null;
    if (!state.targets[athleteId]) {
      const d = state.team.macroDefaults || { protein: 160, carbs: 240, fat: 70, waterOz: 80 };
      state.targets[athleteId] = { protein: d.protein, carbs: d.carbs, fat: d.fat, waterOz: d.waterOz };
      saveState();
    }
    return state.targets[athleteId];
  }

  function athleteLabel(a) {
    if (!a) return "—";
    const name = (a.name || "").trim();
    const pos = (a.position || "").trim();
    return name ? (pos ? `${name} (${pos})` : name) : a.id;
  }

  function fillAthleteSelect(selectEl, selectedId) {
    if (!selectEl) return;
    const athletes = getAthletes();
    if (!athletes.length) {
      selectEl.innerHTML = `<option value="">(No athletes yet)</option>`;
      selectEl.value = "";
      return;
    }
    selectEl.innerHTML = athletes
      .map((a) => `<option value="${escHTML(a.id)}">${escHTML(athleteLabel(a))}</option>`)
      .join("");
    if (selectedId && athletes.some((a) => a.id === selectedId)) selectEl.value = selectedId;
    else selectEl.value = athletes[0].id;
  }

  // -------------------------
  // Logs helpers
  // -------------------------
  function getTraining(athleteId) {
    return Array.isArray(state.logs.training[athleteId]) ? state.logs.training[athleteId].slice() : [];
  }
  function getReadiness(athleteId) {
    return Array.isArray(state.logs.readiness[athleteId]) ? state.logs.readiness[athleteId].slice() : [];
  }
  function getNutrition(athleteId) {
    return Array.isArray(state.logs.nutrition[athleteId]) ? state.logs.nutrition[athleteId].slice() : [];
  }

  function upsertByDate(arr, row) {
    const d = safeISO(row.dateISO);
    if (!d) return arr;
    const out = (arr || []).filter((x) => x && x.dateISO !== d);
    out.push({ ...row, dateISO: d });
    out.sort((a, b) => String(a.dateISO).localeCompare(String(b.dateISO)));
    return out;
  }

  function addTrainingSession(athleteId, session) {
    const list = getTraining(athleteId);
    list.push(session);
    list.sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)));
    state.logs.training[athleteId] = list;
    saveState();
  }
  function upsertReadiness(athleteId, row) {
    state.logs.readiness[athleteId] = upsertByDate(getReadiness(athleteId), row);
    saveState();
  }
  function upsertNutrition(athleteId, row) {
    state.logs.nutrition[athleteId] = upsertByDate(getNutrition(athleteId), row);
    saveState();
  }

  // -------------------------
  // Scoring models
  // -------------------------
  function calcReadinessScore({ sleep, soreness, stress, energy }) {
    const sl = toNum(sleep, 0);
    const so = clamp(toNum(soreness, 0), 0, 10);
    const st = clamp(toNum(stress, 0), 0, 10);
    const en = clamp(toNum(energy, 0), 0, 10);

    const sleepPenalty = clamp((8 - sl) * 7, 0, 35);
    const sorePenalty = so * 4;
    const stressPenalty = st * 3;
    const energyPenalty = clamp((10 - en) * 4, 0, 40);

    const score = 100 - (sleepPenalty + sorePenalty + stressPenalty + energyPenalty) * 0.5;
    return clamp(Math.round(score), 0, 100);
  }

  function calcNutritionAdherence(total, target) {
    if (!target) return 50;
    const p = Math.abs(toNum(total.protein) - toNum(target.protein)) / Math.max(1, toNum(target.protein));
    const c = Math.abs(toNum(total.carbs) - toNum(target.carbs)) / Math.max(1, toNum(target.carbs));
    const f = Math.abs(toNum(total.fat) - toNum(target.fat)) / Math.max(1, toNum(target.fat));
    const w = Math.abs(toNum(total.waterOz) - toNum(target.waterOz)) / Math.max(1, toNum(target.waterOz));
    const dev = (clamp(p, 0, 1) + clamp(c, 0, 1) + clamp(f, 0, 1) + clamp(w, 0, 1)) / 4;
    return clamp(Math.round(100 - dev * 100), 0, 100);
  }

  function sessionLoad(sess) { return clamp(toNum(sess.minutes, 0) * toNum(sess.rpe, 0), 0, 6000); }

  function sumLoads(trainingSessions, fromISO, toISOInclusive) {
    const f = safeISO(fromISO);
    const t = safeISO(toISOInclusive);
    if (!f || !t) return 0;
    return (trainingSessions || [])
      .filter((s) => s && safeISO(s.dateISO) && s.dateISO >= f && s.dateISO <= t)
      .reduce((acc, s) => acc + sessionLoad(s), 0);
  }

  function dailyLoads(trainingSessions, startISO, days) {
    const map = {};
    for (let i = 0; i < days; i++) map[addDaysISO(startISO, i)] = 0;
    (trainingSessions || []).forEach((s) => {
      const d = safeISO(s.dateISO);
      if (!d || !(d in map)) return;
      map[d] += sessionLoad(s);
    });
    return map;
  }

  function workloadRiskIndex(trainingSessions, asOfISO) {
    const asOf = safeISO(asOfISO) || todayISO();
    const acuteFrom = addDaysISO(asOf, -6);
    const chronicFrom = addDaysISO(asOf, -27);

    const acute = sumLoads(trainingSessions, acuteFrom, asOf);
    const chronicTotal = sumLoads(trainingSessions, chronicFrom, asOf);
    const chronicAvg7 = (chronicTotal / 28) * 7;

    const acwr = chronicAvg7 > 0 ? acute / chronicAvg7 : null;

    const daily = dailyLoads(trainingSessions, acuteFrom, 7);
    const vals = Object.values(daily);
    const mean = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / Math.max(1, vals.length);
    const sd = Math.sqrt(variance);
    const monotony = sd > 0 ? mean / sd : (mean > 0 ? 3 : 0);
    const strain = acute * monotony;

    let idx = 0;
    if (acwr === null) idx += 10;
    else if (acwr < 0.6) idx += 20;
    else if (acwr <= 1.3) idx += 10;
    else if (acwr <= 1.6) idx += 45;
    else idx += 70;

    if (monotony >= 2.0) idx += 15;
    if (monotony >= 2.5) idx += 25;

    if (strain >= 8000) idx += 20;
    if (strain >= 12000) idx += 30;

    return {
      acute: Math.round(acute),
      chronicAvg7: Math.round(chronicAvg7),
      acwr: acwr === null ? null : Number(acwr.toFixed(2)),
      monotony: Number(monotony.toFixed(2)),
      strain: Math.round(strain),
      index: clamp(Math.round(idx), 0, 100)
    };
  }

  function trainingScore(trainingSessions, asOfISO) {
    const m = workloadRiskIndex(trainingSessions, asOfISO);
    return clamp(Math.round(100 - m.index), 0, 100);
  }

  function recoveryScore(readinessRow) {
    if (!readinessRow) return 60;
    const sleep = clamp(toNum(readinessRow.sleep, 0), 0, 16);
    const sore = clamp(toNum(readinessRow.soreness, 0), 0, 10);
    const stress = clamp(toNum(readinessRow.stress, 0), 0, 10);

    const sleepScore = clamp((sleep / 9) * 100, 0, 100);
    const soreScore = 100 - sore * 9;
    const stressScore = 100 - stress * 8;

    return clamp(Math.round(sleepScore * 0.45 + soreScore * 0.30 + stressScore * 0.25), 0, 100);
  }

  function riskScore(riskIndex, readinessScore0to100, nutritionScore0to100) {
    let base = 100 - clamp(toNum(riskIndex, 0), 0, 100);
    if (readinessScore0to100 < 55) base -= 10;
    if (readinessScore0to100 < 40) base -= 15;
    if (nutritionScore0to100 < 60) base -= 8;
    if (nutritionScore0to100 < 45) base -= 12;
    return clamp(Math.round(base), 0, 100);
  }

  function calcPIQScore(athleteId, dateISO) {
    const date = safeISO(dateISO) || todayISO();
    const training = getTraining(athleteId);
    const readinessList = getReadiness(athleteId);
    const nutritionList = getNutrition(athleteId);
    const target = ensureTargetsForAthlete(athleteId);

    const readinessRow = readinessList.find((r) => r.dateISO === date) || readinessList[readinessList.length - 1] || null;
    const nutritionRow = nutritionList.find((n) => n.dateISO === date) || nutritionList[nutritionList.length - 1] || null;

    const readiness = readinessRow ? calcReadinessScore(readinessRow) : 60;
    const nutrition = nutritionRow ? calcNutritionAdherence(nutritionRow, target) : 50;
    const trainingQ = trainingScore(training, date);
    const riskMeta = workloadRiskIndex(training, date);
    const recovery = recoveryScore(readinessRow);
    const risk = riskScore(riskMeta.index, readiness, nutrition);

    const w = state.team.piqWeights || { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 };
    const totalW = (w.readiness + w.training + w.recovery + w.nutrition + w.risk);
    const norm = totalW > 0 ? 100 / totalW : 1;

    const score =
      readiness * (w.readiness * norm / 100) +
      trainingQ * (w.training * norm / 100) +
      recovery * (w.recovery * norm / 100) +
      nutrition * (w.nutrition * norm / 100) +
      risk * (w.risk * norm / 100);

    const final = clamp(Math.round(score), 0, 100);

    let band = "Developing";
    if (final >= 90) band = "Elite";
    else if (final >= 80) band = "High";
    else if (final >= 70) band = "Solid";
    else if (final >= 55) band = "At-Risk";
    else band = "Critical";

    return {
      dateISO: date,
      final,
      band,
      subs: { readiness, training: trainingQ, recovery, nutrition, risk },
      meta: { workload: riskMeta }
    };
  }

  function runRiskDetection(athleteId, dateISO) {
    const date = safeISO(dateISO) || todayISO();
    const training = getTraining(athleteId);
    const readinessList = getReadiness(athleteId);
    const nutritionList = getNutrition(athleteId);
    const target = ensureTargetsForAthlete(athleteId);

    const readinessRow = readinessList.find((r) => r.dateISO === date) || readinessList[readinessList.length - 1] || null;
    const nutritionRow = nutritionList.find((n) => n.dateISO === date) || nutritionList[nutritionList.length - 1] || null;

    const rScore = readinessRow ? calcReadinessScore(readinessRow) : 60;
    const nScore = nutritionRow ? calcNutritionAdherence(nutritionRow, target) : 50;
    const w = workloadRiskIndex(training, date);

    const flags = [];
    if (w.acwr !== null && w.acwr > 1.5) flags.push("High ACWR spike");
    if (w.monotony >= 2.5) flags.push("High monotony");
    if (w.strain >= 12000) flags.push("High strain");
    if (rScore < 55) flags.push("Low readiness");
    if (readinessRow && toNum(readinessRow.sleep) < 6.5) flags.push("Sleep low");
    if (readinessRow && toNum(readinessRow.soreness) >= 7) flags.push("High soreness");
    if (nScore < 60) flags.push("Nutrition adherence low");

    const index = clamp(Math.round((w.index * 0.65) + ((100 - rScore) * 0.20) + ((100 - nScore) * 0.15)), 0, 100);

    let headline = "OK";
    if (index >= 80) headline = "HIGH RISK";
    else if (index >= 60) headline = "ELEVATED";
    else if (index >= 40) headline = "WATCH";

    return { dateISO: date, index, headline, flags, workload: w, readinessScore: rScore, nutritionScore: nScore };
  }

  // -------------------------
  // Heatmap styles + classes
  // -------------------------
  function heatColorClass(v) {
    const x = clamp(toNum(v, 0), 0, 100);
    if (x >= 85) return "heat4";
    if (x >= 70) return "heat3";
    if (x >= 55) return "heat2";
    if (x >= 40) return "heat1";
    return "heat0";
  }

  function injectHeatStylesOnce() {
    if (document.getElementById("__piq_heat_styles__")) return;
    const style = document.createElement("style");
    style.id = "__piq_heat_styles__";
    style.textContent = `
      .heat0 { background: rgba(231, 76, 60, 0.18); }
      .heat1 { background: rgba(230, 126, 34, 0.18); }
      .heat2 { background: rgba(241, 196, 15, 0.18); }
      .heat3 { background: rgba(46, 204, 113, 0.18); }
      .heat4 { background: rgba(46, 204, 113, 0.30); }
    `;
    document.head.appendChild(style);
  }

  // -------------------------
  // Periodization Engine
  // -------------------------
  function generatePeriodizationPlan({ athleteId, startISO, weeks, goal, deloadEvery }) {
    const start = safeISO(startISO) || todayISO();
    const W = clamp(toNum(weeks, 8), 2, 24);
    const deloadN = clamp(toNum(deloadEvery, 4), 3, 6);

    let base = 1800;
    if (goal === "offseason") base = 2200;
    if (goal === "inseason") base = 1700;
    if (goal === "rehab") base = 1200;

    const weeksPlan = [];
    for (let i = 1; i <= W; i++) {
      const isDeload = (i % deloadN === 0);
      const wave = 1 + (i - 1) * 0.04;
      const targetLoad = Math.round(base * wave * (isDeload ? 0.72 : 1.0));

      const sessions = [
        { day: "Mon", minutes: 60, rpe: isDeload ? 5 : 6, type: "lift" },
        { day: "Tue", minutes: 75, rpe: isDeload ? 5 : 7, type: "practice" },
        { day: "Thu", minutes: 60, rpe: isDeload ? 4 : 6, type: "skills" },
        { day: "Sat", minutes: 75, rpe: isDeload ? 5 : 7, type: "conditioning" }
      ];

      const current = sessions.reduce((s, x) => s + x.minutes * x.rpe, 0);
      const scale = current > 0 ? targetLoad / current : 1;

      const scaled = sessions.map((x) => {
        const m = clamp(Math.round(x.minutes * scale), 30, 120);
        return { ...x, minutes: m };
      });

      const weekStart = addDaysISO(start, (i - 1) * 7);

      weeksPlan.push({ week: i, weekStartISO: weekStart, deload: isDeload, targetLoad, sessions: scaled });
    }

    state.periodization[athleteId] = { athleteId, startISO: start, weeks: W, goal, deloadEvery: deloadN, weeksPlan };
    saveState();
    return state.periodization[athleteId];
  }

  function plannedLoadForWeek(plan, weekStartISO) {
    if (!plan?.weeksPlan) return 0;
    const wk = plan.weeksPlan.find((w) => w.weekStartISO === weekStartISO);
    return wk?.targetLoad || 0;
  }

  function actualLoadForWeek(trainingSessions, weekStartISO) {
    const start = safeISO(weekStartISO);
    if (!start) return 0;
    const end = addDaysISO(start, 6);
    return sumLoads(trainingSessions, start, end);
  }

  // -------------------------
  // Workouts (Standard vs Advanced) + write-back to Training Log
  // -------------------------
  function exerciseLibrary(mode) {
    const advanced = mode === "advanced";
    return [
      { tag: "lift", name: "Trap Bar Deadlift", sets: advanced ? "5×3–5" : "3×5", notes: "Explosive intent, perfect reps." },
      { tag: "lift", name: "Rear-Foot Elevated Split Squat", sets: advanced ? "4×6/side" : "3×8/side", notes: "Control down, drive up." },
      { tag: "lift", name: "Bench Press / DB Press", sets: advanced ? "5×4–6" : "3×6–8", notes: "Full ROM, shoulder-friendly." },
      { tag: "lift", name: "Pull-ups / Lat Pulldown", sets: advanced ? "4×6–10" : "3×8–10", notes: "Scap control." },
      { tag: "plyo", name: "Pogo Jumps", sets: advanced ? "4×20s" : "3×15s", notes: "Stiff ankles, quick contacts." },
      { tag: "plyo", name: "Depth Jump to Stick", sets: advanced ? "4×4" : "3×3", notes: "Land quiet, knee alignment." },
      { tag: "skills", name: "Ball Handling Series", sets: advanced ? "25 min" : "15 min", notes: "2-ball, change of pace." },
      { tag: "skills", name: "Shooting: Form + Game Spots", sets: advanced ? "45 min" : "30 min", notes: "Track makes, fatigue form." },
      { tag: "conditioning", name: "Tempo Runs / Court Suicides", sets: advanced ? "10–14 reps" : "6–10 reps", notes: "Quality effort, full recovery." },
      { tag: "mobility", name: "Hip + Ankle Mobility", sets: "10 min", notes: "Daily. Ankles + hip flexors." },
      { tag: "mobility", name: "Prehab: Nordics / Hamstring", sets: advanced ? "3×4–6" : "2×4", notes: "Slow eccentric; stop before cramp." }
    ];
  }

  function buildWeekFromTemplate(weekStartISO, mode) {
    // simple weekly split: Mon lift+plyo, Tue skills, Thu lift, Sat conditioning+skills, others mobility
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDaysISO(weekStartISO, i);
      const dow = new Date(Date.parse(d)).getUTCDay(); // 0 Sun .. 6 Sat
      let title = "Mobility / Recovery";
      let focus = ["mobility"];
      let minutes = 35;
      let rpe = 4;

      if (dow === 1) { title = "Lower Strength + Plyo"; focus = ["lift", "plyo"]; minutes = 70; rpe = (mode === "advanced" ? 7 : 6); }
      if (dow === 2) { title = "Skills + Shooting"; focus = ["skills"]; minutes = 75; rpe = 6; }
      if (dow === 4) { title = "Upper/Total Strength"; focus = ["lift"]; minutes = 60; rpe = (mode === "advanced" ? 7 : 6); }
      if (dow === 6) { title = "Conditioning + Skills"; focus = ["conditioning", "skills"]; minutes = 70; rpe = 7; }

      days.push({ dateISO: d, title, focus, minutes, rpe });
    }
    return days;
  }

  function findPlanSessionsForWeek(athleteId, weekStartISO) {
    const plan = state.periodization[athleteId];
    if (!plan?.weeksPlan?.length) return null;
    const wk = plan.weeksPlan.find((w) => w.weekStartISO === weekStartISO);
    return wk?.sessions || null;
  }

  function writeWorkoutWeek(athleteId, weekStartISO, mode, source, days) {
    state.workouts.weeks[athleteId] = state.workouts.weeks[athleteId] || {};
    state.workouts.weeks[athleteId][weekStartISO] = { athleteId, weekStartISO, mode, source, days, createdAtMs: Date.now() };
    saveState();
  }

  function getWorkoutWeek(athleteId, weekStartISO) {
    return state.workouts.weeks?.[athleteId]?.[weekStartISO] || null;
  }

  function renderWeekOut(athleteId, weekStartISO, mount) {
    const wk = getWorkoutWeek(athleteId, weekStartISO);
    if (!mount) return;
    if (!wk?.days?.length) {
      mount.innerHTML = `<div class="small muted">No week built yet. Click “Build Week”.</div>`;
      return;
    }

    const lib = exerciseLibrary(wk.mode);

    mount.innerHTML = wk.days.map((d) => {
      const ex = lib.filter((x) => d.focus.includes(x.tag)).slice(0, 6);
      const exHtml = ex.map((x) => `
        <div class="small">
          <span class="pillTag">${escHTML(x.tag)}</span>
          <b>${escHTML(x.name)}</b> — ${escHTML(x.sets)} <span class="muted">(${escHTML(x.notes)})</span>
        </div>
      `).join("");

      return `
        <div class="item">
          <div style="flex:1">
            <div><b>${escHTML(d.dateISO)}</b> • ${escHTML(d.title)} <span class="muted small">(${escHTML(wk.mode)})</span></div>
            <div class="muted small">Suggested: ${escHTML(d.minutes)} min @ sRPE ${escHTML(d.rpe)} (load ${escHTML(d.minutes * d.rpe)})</div>
            <div style="margin-top:8px">${exHtml || `<span class="muted small">No exercises matched.</span>`}</div>
          </div>
          <div class="row gap wrap" style="align-items:flex-start">
            <button class="btn ghost" data-log="${escHTML(d.dateISO)}" data-min="${escHTML(d.minutes)}" data-rpe="${escHTML(d.rpe)}" data-type="${escHTML(d.focus[0] || "practice")}">Log</button>
          </div>
        </div>
      `;
    }).join("");

    qa("[data-log]", mount).forEach((btn) => {
      btn.addEventListener("click", () => {
        const dateISO = btn.getAttribute("data-log");
        const minutes = toNum(btn.getAttribute("data-min"), 60);
        const rpe = toNum(btn.getAttribute("data-rpe"), 6);
        const type = String(btn.getAttribute("data-type") || "practice");

        // Write back to training log
        addTrainingSession(athleteId, {
          id: uid("sess"),
          dateISO: safeISO(dateISO) || todayISO(),
          minutes: clamp(minutes, 0, 600),
          rpe: clamp(rpe, 0, 10),
          type,
          notes: `From Workouts (${wk.mode}/${wk.source})`,
          load: Math.round(minutes * rpe)
        });

        // Jump to log
        showView("log");
        if ($("logAthlete")) $("logAthlete").value = athleteId;
        if ($("logDate")) $("logDate").value = safeISO(dateISO) || todayISO();
        renderLog();
        renderDashboard();
      });
    });
  }

  // -------------------------
  // Render: Dashboard
  // -------------------------
  function renderDashboard() {
    injectHeatStylesOnce();

    const athSel = $("dashAthlete");
    const dateEl = $("dashDate");
    fillAthleteSelect(athSel, athSel?.value);
    if (dateEl && !safeISO(dateEl.value)) dateEl.value = todayISO();

    fillAthleteSelect($("riskAthlete"), $("riskAthlete")?.value);
    const riskDateEl = $("riskDate");
    if (riskDateEl && !safeISO(riskDateEl.value)) riskDateEl.value = todayISO();

    const heatStart = $("heatStart");
    if (heatStart && !safeISO(heatStart.value)) heatStart.value = addDaysISO(todayISO(), -14);

    function updatePIQ() {
      const athleteId = athSel?.value || "";
      const dateISO = safeISO(dateEl?.value) || todayISO();
      if (!athleteId) {
        $("piqScore").textContent = "—";
        $("piqBand").textContent = "Add athletes in Team tab";
        return;
      }

      const r = calcPIQScore(athleteId, dateISO);
      $("piqScore").textContent = String(r.final);
      $("piqBand").textContent = `${r.band} • ${r.dateISO}`;

      const setBar = (barId, numId, v) => {
        const vv = clamp(toNum(v, 0), 0, 100);
        const bar = $(barId);
        if (bar) bar.style.width = `${vv}%`;
        const num = $(numId);
        if (num) num.textContent = String(vv);
      };

      setBar("barReadiness", "numReadiness", r.subs.readiness);
      setBar("barTraining", "numTraining", r.subs.training);
      setBar("barRecovery", "numRecovery", r.subs.recovery);
      setBar("barNutrition", "numNutrition", r.subs.nutrition);
      setBar("barRisk", "numRisk", r.subs.risk);

      const explain = [
        `PIQ Score (${r.final}) = weighted blend of 5 sub-scores (0–100).`,
        ``,
        `Readiness: ${r.subs.readiness}`,
        `Training: ${r.subs.training}`,
        `Recovery: ${r.subs.recovery}`,
        `Nutrition: ${r.subs.nutrition}`,
        `Risk: ${r.subs.risk}`,
        ``,
        `Workload details (last 7 days):`,
        `Acute load: ${r.meta.workload.acute}`,
        `Chronic avg(7d-equivalent): ${r.meta.workload.chronicAvg7}`,
        `ACWR: ${r.meta.workload.acwr === null ? "—" : r.meta.workload.acwr}`,
        `Monotony: ${r.meta.workload.monotony}`,
        `Strain: ${r.meta.workload.strain}`,
        `Risk index (0–100): ${r.meta.workload.index}`
      ].join("\n");

      $("piqExplain").textContent = explain;
    }

    $("btnRecalcScore")?.addEventListener("click", updatePIQ);
    athSel?.addEventListener("change", updatePIQ);
    dateEl?.addEventListener("change", updatePIQ);
    updatePIQ();

    function updateRisk() {
      const athleteId = $("riskAthlete")?.value || "";
      const dateISO = safeISO($("riskDate")?.value) || todayISO();
      if (!athleteId) {
        $("riskSummary").textContent = "Add athletes in Team tab";
        return;
      }
      const r = runRiskDetection(athleteId, dateISO);

      $("riskSummary").textContent = `${r.headline} • Risk index ${r.index}/100 • ${r.flags.length ? r.flags.join(", ") : "No major flags"}`;

      $("riskWorkload").textContent =
        `Acute(7d): ${r.workload.acute}\n` +
        `Chronic avg(7d-eq): ${r.workload.chronicAvg7}\n` +
        `ACWR: ${r.workload.acwr === null ? "—" : r.workload.acwr}\n` +
        `Monotony: ${r.workload.monotony}\n` +
        `Strain: ${r.workload.strain}\n` +
        `Workload risk index: ${r.workload.index}`;

      $("riskReadiness").textContent =
        `Readiness score: ${r.readinessScore}\n` +
        `Nutrition adherence: ${r.nutritionScore}\n` +
        `Flags:\n- ${r.flags.length ? r.flags.join("\n- ") : "None"}`;
    }

    $("btnRunRisk")?.addEventListener("click", updateRisk);
    $("riskAthlete")?.addEventListener("change", updateRisk);
    $("riskDate")?.addEventListener("change", updateRisk);

    function renderHeatmap() {
      const start = safeISO($("heatStart")?.value) || addDaysISO(todayISO(), -14);
      const days = clamp(toNum($("heatDays")?.value, 21), 7, 60);
      const metric = String($("heatMetric")?.value || "load");

      const athletes = getAthletes();
      const tbl = $("heatTable");
      if (!tbl) return;

      if (!athletes.length) {
        tbl.innerHTML = `<tr><th>No athletes yet</th></tr>`;
        return;
      }

      const headers = [];
      for (let i = 0; i < days; i++) headers.push(addDaysISO(start, i).slice(5));

      let html = `<tr><th>Athlete</th>${headers.map((h) => `<th>${escHTML(h)}</th>`).join("")}</tr>`;

      athletes.forEach((a) => {
        const training = getTraining(a.id);
        const readiness = getReadiness(a.id);
        const nutrition = getNutrition(a.id);
        const target = ensureTargetsForAthlete(a.id);

        html += `<tr><th style="text-align:left">${escHTML(a.name || a.id)}</th>`;

        for (let i = 0; i < days; i++) {
          const d = addDaysISO(start, i);
          let val = 0;

          if (metric === "load") {
            val = sumLoads(training, d, d);
            val = clamp(Math.round((val / 600) * 100), 0, 100);
          } else if (metric === "readiness") {
            const row = readiness.find((r) => r.dateISO === d);
            val = row ? calcReadinessScore(row) : 0;
          } else if (metric === "nutrition") {
            const row = nutrition.find((n) => n.dateISO === d);
            val = row ? calcNutritionAdherence(row, target) : 0;
          } else if (metric === "risk") {
            const r = runRiskDetection(a.id, d);
            val = clamp(r.index, 0, 100);
          }

          const cls = heatColorClass(val);
          html += `<td class="${cls}" data-ath="${escHTML(a.id)}" data-date="${escHTML(d)}" title="${escHTML(String(val))}">${escHTML(String(val || ""))}</td>`;
        }
        html += `</tr>`;
      });

      tbl.innerHTML = html;

      qa("td[data-ath][data-date]", tbl).forEach((cell) => {
        cell.addEventListener("click", () => {
          const ath = cell.getAttribute("data-ath");
          const d = cell.getAttribute("data-date");
          if (!ath || !d) return;
          showView("log");
          if ($("logAthlete")) $("logAthlete").value = ath;
          if ($("logDate")) $("logDate").value = d;
          if ($("readyAthlete")) $("readyAthlete").value = ath;
          if ($("readyDate")) $("readyDate").value = d;
          renderLog();
        });
      });
    }

    $("btnHeatmap")?.addEventListener("click", renderHeatmap);
    renderHeatmap();
  }

  // -------------------------
  // Render: Team
  // -------------------------
  function renderTeam() {
    const pill = $("activeTeamPill");
    if (pill) pill.textContent = `Team: ${state.team?.name || "Default"}`;

    const list = $("rosterList");
    const athletes = getAthletes();

    if (list) {
      if (!athletes.length) {
        list.innerHTML = `<div class="muted small">No athletes yet. Add one above or click “Seed Demo”.</div>`;
      } else {
        list.innerHTML = athletes.map((a) => {
          const t = ensureTargetsForAthlete(a.id);
          return `
            <div class="item">
              <div style="flex:1">
                <div><b>${escHTML(a.name || "—")}</b> <span class="muted small">${escHTML(a.position || "")}</span></div>
                <div class="muted small">Ht: ${escHTML(a.heightIn ?? "—")} in • Wt: ${escHTML(a.weightLb ?? "—")} lb</div>
                <div class="muted small">Targets: P ${escHTML(t.protein)} / C ${escHTML(t.carbs)} / F ${escHTML(t.fat)} • Water ${escHTML(t.waterOz)}oz</div>
              </div>
              <div class="row gap wrap">
                <button class="btn ghost" data-edit="${escHTML(a.id)}">Edit targets</button>
                <button class="btn danger" data-del="${escHTML(a.id)}">Remove</button>
              </div>
            </div>
          `;
        }).join("");

        qa("[data-del]", list).forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-del");
            if (!id) return;
            if (!confirm("Remove athlete and all their logs?")) return;
            state.athletes = state.athletes.filter((a) => a.id !== id);
            delete state.logs.training[id];
            delete state.logs.readiness[id];
            delete state.logs.nutrition[id];
            delete state.targets[id];
            delete state.periodization[id];
            delete state.workouts.weeks[id];
            delete state.nutrition.mealPlans[id];
            saveState();
            renderTeam(); renderDashboard();
          });
        });

        qa("[data-edit]", list).forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-edit");
            if (!id) return;
            showView("nutrition");
            if ($("targetAthlete")) $("targetAthlete").value = id;
            renderNutrition();
          });
        });
      }
    }

    $("btnAddAthlete")?.addEventListener("click", () => {
      const name = ($("athName")?.value || "").trim();
      const pos = ($("athPos")?.value || "").trim();
      const ht = toNum($("athHt")?.value, null);
      const wt = toNum($("athWt")?.value, null);

      if (!name) return alert("Enter athlete full name.");
      const a = { id: uid("ath"), name, position: pos, heightIn: ht, weightLb: wt };
      state.athletes.push(a);
      ensureTargetsForAthlete(a.id);

      $("athName").value = "";
      $("athPos").value = "";
      $("athHt").value = "";
      $("athWt").value = "";

      saveState();
      renderTeam(); renderDashboard(); renderLog(); renderNutrition(); renderPeriodization(); renderWorkouts();
    });

    if ($("teamName")) $("teamName").value = state.team?.name || "Default";
    if ($("seasonStart")) $("seasonStart").value = state.team?.seasonStart || "";
    if ($("seasonEnd")) $("seasonEnd").value = state.team?.seasonEnd || "";

    $("btnSaveTeam")?.addEventListener("click", () => {
      state.team.name = ($("teamName")?.value || "Default").trim() || "Default";
      state.team.seasonStart = safeISO($("seasonStart")?.value) || "";
      state.team.seasonEnd = safeISO($("seasonEnd")?.value) || "";
      saveState();
      renderTeam();
      alert("Saved team settings.");
    });

    if ($("defProt")) $("defProt").value = state.team.macroDefaults.protein;
    if ($("defCarb")) $("defCarb").value = state.team.macroDefaults.carbs;
    if ($("defFat")) $("defFat").value = state.team.macroDefaults.fat;
    if ($("defWater")) $("defWater").value = state.team.macroDefaults.waterOz;

    $("btnSaveMacroDefaults")?.addEventListener("click", () => {
      state.team.macroDefaults.protein = clamp(toNum($("defProt")?.value, 160), 0, 400);
      state.team.macroDefaults.carbs = clamp(toNum($("defCarb")?.value, 240), 0, 800);
      state.team.macroDefaults.fat = clamp(toNum($("defFat")?.value, 70), 0, 300);
      state.team.macroDefaults.waterOz = clamp(toNum($("defWater")?.value, 80), 0, 300);
      saveState();
      alert("Saved macro defaults.");
      renderTeam(); renderNutrition(); renderDashboard();
    });

    if ($("wReadiness")) $("wReadiness").value = state.team.piqWeights.readiness;
    if ($("wTraining")) $("wTraining").value = state.team.piqWeights.training;
    if ($("wRecovery")) $("wRecovery").value = state.team.piqWeights.recovery;
    if ($("wNutrition")) $("wNutrition").value = state.team.piqWeights.nutrition;
    if ($("wRisk")) $("wRisk").value = state.team.piqWeights.risk;

    $("btnSaveWeights")?.addEventListener("click", () => {
      const w = {
        readiness: clamp(toNum($("wReadiness")?.value, 30), 0, 100),
        training: clamp(toNum($("wTraining")?.value, 25), 0, 100),
        recovery: clamp(toNum($("wRecovery")?.value, 20), 0, 100),
        nutrition: clamp(toNum($("wNutrition")?.value, 15), 0, 100),
        risk: clamp(toNum($("wRisk")?.value, 10), 0, 100)
      };
      const total = w.readiness + w.training + w.recovery + w.nutrition + w.risk;
      $("weightsNote").textContent = total === 100 ? "OK (totals 100)" : `Totals ${total} (should be 100)`;
      state.team.piqWeights = w;
      saveState();
      alert("Saved weights.");
      renderDashboard();
    });
  }

  // -------------------------
  // Render: Log
  // -------------------------
  function renderLog() {
    const athletes = getAthletes();
    fillAthleteSelect($("logAthlete"), $("logAthlete")?.value);
    fillAthleteSelect($("readyAthlete"), $("readyAthlete")?.value);

    if ($("logDate") && !safeISO($("logDate").value)) $("logDate").value = todayISO();
    if ($("readyDate") && !safeISO($("readyDate").value)) $("readyDate").value = todayISO();

    const logAthleteId = $("logAthlete")?.value || (athletes[0]?.id || "");
    const logDate = safeISO($("logDate")?.value) || todayISO();

    const readyAthleteId = $("readyAthlete")?.value || (athletes[0]?.id || "");
    const readyDate = safeISO($("readyDate")?.value) || todayISO();

    function updateTrainingComputed() {
      const min = clamp(toNum($("logMin")?.value, 0), 0, 600);
      const rpe = clamp(toNum($("logRpe")?.value, 0), 0, 10);
      const load = Math.round(min * rpe);
      const el = $("logComputed");
      if (el) el.textContent = `Load: ${load}`;
    }
    $("logMin")?.addEventListener("input", updateTrainingComputed);
    $("logRpe")?.addEventListener("input", updateTrainingComputed);
    updateTrainingComputed();

    $("btnSaveTraining")?.addEventListener("click", () => {
      const athleteId = $("logAthlete")?.value || "";
      if (!athleteId) return alert("Add athletes first (Team tab).");

      const dateISO = safeISO($("logDate")?.value) || todayISO();
      const minutes = clamp(toNum($("logMin")?.value, 0), 0, 600);
      const rpe = clamp(toNum($("logRpe")?.value, 0), 0, 10);
      const type = String($("logType")?.value || "practice");
      const notes = ($("logNotes")?.value || "").trim();

      const sess = { id: uid("sess"), dateISO, minutes, rpe, type, notes, load: Math.round(minutes * rpe) };
      addTrainingSession(athleteId, sess);
      $("logNotes").value = "";
      updateTrainingComputed();
      renderLog();
      renderDashboard();
    });

    const tList = $("trainingList");
    if (tList) {
      if (!logAthleteId) {
        tList.innerHTML = `<div class="muted small">Add athletes in Team tab.</div>`;
      } else {
        const sessions = getTraining(logAthleteId).slice(0, 20);
        tList.innerHTML = sessions.length
          ? sessions.map((s) => `
              <div class="item">
                <div style="flex:1">
                  <div><b>${escHTML(s.dateISO)}</b> • ${escHTML(s.type)} • ${escHTML(s.minutes)} min • sRPE ${escHTML(s.rpe)}</div>
                  <div class="muted small">Load: <b>${escHTML(s.load)}</b>${s.notes ? ` • ${escHTML(s.notes)}` : ""}</div>
                </div>
                <button class="btn danger" data-del-session="${escHTML(s.id)}">Delete</button>
              </div>
            `).join("")
          : `<div class="muted small">No sessions yet.</div>`;

        qa("[data-del-session]", tList).forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-del-session");
            if (!id) return;
            state.logs.training[logAthleteId] = getTraining(logAthleteId).filter((x) => x.id !== id);
            saveState();
            renderLog();
            renderDashboard();
          });
        });
      }
    }

    function updateReadinessComputed() {
      const row = {
        sleep: toNum($("readySleep")?.value, 8),
        soreness: toNum($("readySore")?.value, 3),
        stress: toNum($("readyStress")?.value, 3),
        energy: toNum($("readyEnergy")?.value, 7)
      };
      const score = calcReadinessScore(row);
      const el = $("readyComputed");
      if (el) el.textContent = `${score}`;
    }
    ["readySleep", "readySore", "readyStress", "readyEnergy"].forEach((id) => $(id)?.addEventListener("input", updateReadinessComputed));
    updateReadinessComputed();

    $("btnSaveReadiness")?.addEventListener("click", () => {
      const athleteId = $("readyAthlete")?.value || "";
      if (!athleteId) return alert("Add athletes first (Team tab).");

      const dateISO = safeISO($("readyDate")?.value) || todayISO();
      const row = {
        dateISO,
        sleep: clamp(toNum($("readySleep")?.value, 0), 0, 16),
        soreness: clamp(toNum($("readySore")?.value, 0), 0, 10),
        stress: clamp(toNum($("readyStress")?.value, 0), 0, 10),
        energy: clamp(toNum($("readyEnergy")?.value, 0), 0, 10),
        injuryNote: ($("readyInjury")?.value || "").trim()
      };
      upsertReadiness(athleteId, row);
      $("readyInjury").value = "";
      renderLog();
      renderDashboard();
    });

    const rList = $("readinessList");
    if (rList) {
      if (!readyAthleteId) {
        rList.innerHTML = `<div class="muted small">Add athletes in Team tab.</div>`;
      } else {
        const rows = getReadiness(readyAthleteId).slice().sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO))).slice(0, 14);
        rList.innerHTML = rows.length
          ? rows.map((r) => {
              const score = calcReadinessScore(r);
              return `
                <div class="item">
                  <div style="flex:1">
                    <div><b>${escHTML(r.dateISO)}</b> • Readiness <b>${escHTML(score)}</b></div>
                    <div class="muted small">
                      Sleep ${escHTML(r.sleep)}h • Soreness ${escHTML(r.soreness)} • Stress ${escHTML(r.stress)} • Energy ${escHTML(r.energy)}
                      ${r.injuryNote ? `<br/>Injury: ${escHTML(r.injuryNote)}` : ""}
                    </div>
                  </div>
                  <button class="btn danger" data-del-ready="${escHTML(r.dateISO)}">Delete</button>
                </div>
              `;
            }).join("")
          : `<div class="muted small">No readiness check-ins yet.</div>`;

        qa("[data-del-ready]", rList).forEach((btn) => {
          btn.addEventListener("click", () => {
            const d = btn.getAttribute("data-del-ready");
            state.logs.readiness[readyAthleteId] = getReadiness(readyAthleteId).filter((x) => x.dateISO !== d);
            saveState();
            renderLog();
            renderDashboard();
          });
        });
      }
    }
  }

  // -------------------------
  // Render: Workouts
  // -------------------------
  function renderWorkouts() {
    const athletes = getAthletes();
    fillAthleteSelect($("wkAthlete"), $("wkAthlete")?.value);

    // default weekStart = most recent Monday
    const weekEl = $("wkWeekStart");
    if (weekEl && !safeISO(weekEl.value)) {
      const t = todayISO();
      const d = new Date(Date.parse(t));
      // compute Monday using local-ish approach from ISO:
      // (ISO uses UTC midnight; okay for this UI)
      const day = d.getUTCDay(); // 0 Sun
      const delta = (day === 0 ? -6 : 1 - day);
      weekEl.value = addDaysISO(t, delta);
    }

    const athleteId = $("wkAthlete")?.value || athletes[0]?.id || "";
    const weekStart = safeISO($("wkWeekStart")?.value) || todayISO();

    function rebuildWeek() {
      if (!athleteId) return alert("Add athletes first (Team tab).");

      const mode = String($("wkMode")?.value || "standard");
      const source = String($("wkSource")?.value || "smart");

      let days = null;

      if (source === "smart") {
        const sessions = findPlanSessionsForWeek(athleteId, weekStart);
        if (sessions?.length) {
          // convert periodization sessions into days
          const dayMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
          days = [];
          for (let i = 0; i < 7; i++) {
            const dISO = addDaysISO(weekStart, i);
            days.push({ dateISO: dISO, title: "Mobility / Recovery", focus: ["mobility"], minutes: 30, rpe: 4 });
          }
          sessions.forEach((s) => {
            const idx = dayMap[s.day] ?? null;
            if (idx === null) return;
            days[idx] = {
              dateISO: addDaysISO(weekStart, idx),
              title: `${String(s.type || "session").toUpperCase()} (Plan)`,
              focus: [String(s.type || "practice")],
              minutes: clamp(toNum(s.minutes, 60), 0, 600),
              rpe: clamp(toNum(s.rpe, 6), 0, 10)
            };
          });
        }
      }

      if (!days) days = buildWeekFromTemplate(weekStart, mode);

      writeWorkoutWeek(athleteId, weekStart, mode, source, days);
      renderWeekOut(athleteId, weekStart, $("wkWeekOut"));
    }

    $("btnBuildWeek")?.addEventListener("click", rebuildWeek);

    // Show existing week if any
    renderWeekOut(athleteId, weekStart, $("wkWeekOut"));

    // Library
    function renderLibrary() {
      const mode = String($("wkMode")?.value || "standard");
      const filter = String($("wkFilter")?.value || "all");
      const lib = exerciseLibrary(mode).filter((x) => filter === "all" ? true : x.tag === filter);

      const list = $("wkLibList");
      if (!list) return;

      list.innerHTML = lib.map((x) => `
        <div class="item">
          <div style="flex:1">
            <div><span class="pillTag">${escHTML(x.tag)}</span> <b>${escHTML(x.name)}</b></div>
            <div class="muted small">${escHTML(x.sets)} • ${escHTML(x.notes)}</div>
          </div>
          <button class="btn ghost" data-loglib="${escHTML(x.tag)}">Log</button>
        </div>
      `).join("");

      qa("[data-loglib]", list).forEach((btn) => {
        btn.addEventListener("click", () => {
          // Quick log from library
          if (!athleteId) return alert("Select an athlete.");
          const tag = btn.getAttribute("data-loglib") || "practice";
          // default minutes/rpe by tag
          let minutes = 60, rpe = 6;
          if (tag === "mobility") { minutes = 20; rpe = 3; }
          if (tag === "plyo") { minutes = 25; rpe = 6; }
          if (tag === "conditioning") { minutes = 35; rpe = 7; }
          if (tag === "skills") { minutes = 45; rpe = 6; }
          if (tag === "lift") { minutes = 60; rpe = 7; }

          // use selected week start date as "today" default
          const dateISO = todayISO();

          addTrainingSession(athleteId, {
            id: uid("sess"),
            dateISO,
            minutes,
            rpe,
            type: tag === "lift" ? "lift" : (tag === "conditioning" ? "conditioning" : (tag === "skills" ? "skills" : "recovery")),
            notes: `From Exercise Library (${mode})`,
            load: Math.round(minutes * rpe)
          });

          showView("log");
          if ($("logAthlete")) $("logAthlete").value = athleteId;
          if ($("logDate")) $("logDate").value = dateISO;
          renderLog();
          renderDashboard();
        });
      });
    }

    $("wkMode")?.addEventListener("change", () => { renderLibrary(); renderWeekOut(athleteId, weekStart, $("wkWeekOut")); });
    $("wkFilter")?.addEventListener("change", renderLibrary);
    $("btnRefreshLib")?.addEventListener("click", renderLibrary);
    renderLibrary();
  }

  // -------------------------
  // Render: Nutrition
  // -------------------------
  function renderNutrition() {
    const athletes = getAthletes();
    fillAthleteSelect($("nutAthlete"), $("nutAthlete")?.value);
    fillAthleteSelect($("targetAthlete"), $("targetAthlete")?.value);
    fillAthleteSelect($("mealAthlete"), $("mealAthlete")?.value);

    if ($("nutDate") && !safeISO($("nutDate").value)) $("nutDate").value = todayISO();
    if ($("mealStart") && !safeISO($("mealStart").value)) $("mealStart").value = todayISO();

    const athleteId = $("nutAthlete")?.value || (athletes[0]?.id || "");
    const dateISO = safeISO($("nutDate")?.value) || todayISO();

    const tAth = $("targetAthlete")?.value || athleteId;
    if (tAth) {
      const t = ensureTargetsForAthlete(tAth);
      if ($("tProt")) $("tProt").value = t.protein;
      if ($("tCarb")) $("tCarb").value = t.carbs;
      if ($("tFat")) $("tFat").value = t.fat;
      if ($("tWater")) $("tWater").value = t.waterOz;
    }

    function updateNutComputed() {
      const a = $("nutAthlete")?.value || "";
      if (!a) return;

      const t = ensureTargetsForAthlete(a);
      const row = {
        protein: toNum($("nutProt")?.value, 0),
        carbs: toNum($("nutCarb")?.value, 0),
        fat: toNum($("nutFat")?.value, 0),
        waterOz: toNum($("nutWater")?.value, 0)
      };
      const score = calcNutritionAdherence(row, t);
      $("nutComputed").textContent = String(score);

      $("nutExplain").textContent =
        `Adherence compares daily totals vs targets.\n` +
        `Deviation is averaged across Protein/Carbs/Fat/Water.\n` +
        `Score = 100 - avgDeviation% (capped).\n\n` +
        `Targets:\nP ${t.protein} / C ${t.carbs} / F ${t.fat} • Water ${t.waterOz}oz`;
    }

    ["nutProt", "nutCarb", "nutFat", "nutWater"].forEach((id) => $(id)?.addEventListener("input", updateNutComputed));
    $("nutAthlete")?.addEventListener("change", () => { renderNutrition(); renderDashboard(); });
    $("nutDate")?.addEventListener("change", renderNutrition);

    if (athleteId) {
      const existing = getNutrition(athleteId).find((n) => n.dateISO === dateISO);
      if (existing) {
        $("nutProt").value = toNum(existing.protein, 0);
        $("nutCarb").value = toNum(existing.carbs, 0);
        $("nutFat").value = toNum(existing.fat, 0);
        $("nutWater").value = toNum(existing.waterOz, 0);
        $("nutNotes").value = existing.notes || "";
      } else {
        $("nutProt").value = 0;
        $("nutCarb").value = 0;
        $("nutFat").value = 0;
        $("nutWater").value = 0;
        $("nutNotes").value = "";
      }
    }

    updateNutComputed();

    $("btnSaveNutrition")?.addEventListener("click", () => {
      const a = $("nutAthlete")?.value || "";
      if (!a) return alert("Add athletes first (Team tab).");
      const d = safeISO($("nutDate")?.value) || todayISO();

      const row = {
        dateISO: d,
        protein: clamp(toNum($("nutProt")?.value, 0), 0, 500),
        carbs: clamp(toNum($("nutCarb")?.value, 0), 0, 1000),
        fat: clamp(toNum($("nutFat")?.value, 0), 0, 400),
        waterOz: clamp(toNum($("nutWater")?.value, 0), 0, 300),
        notes: ($("nutNotes")?.value || "").trim()
      };
      upsertNutrition(a, row);
      renderNutrition();
      renderDashboard();
      alert("Saved.");
    });

    $("btnQuickMeal")?.addEventListener("click", () => {
      const a = $("nutAthlete")?.value || "";
      if (!a) return alert("Add athletes first (Team tab).");
      const d = safeISO($("nutDate")?.value) || todayISO();

      const cur = getNutrition(a).find((n) => n.dateISO === d) || { dateISO: d, protein: 0, carbs: 0, fat: 0, waterOz: 0, notes: "" };

      const add = {
        protein: clamp(toNum($("qmProt")?.value, 0), 0, 200),
        carbs: clamp(toNum($("qmCarb")?.value, 0), 0, 300),
        fat: clamp(toNum($("qmFat")?.value, 0), 0, 150),
        waterOz: clamp(toNum($("qmWater")?.value, 0), 0, 80)
      };

      const next = {
        ...cur,
        protein: toNum(cur.protein, 0) + add.protein,
        carbs: toNum(cur.carbs, 0) + add.carbs,
        fat: toNum(cur.fat, 0) + add.fat,
        waterOz: toNum(cur.waterOz, 0) + add.waterOz
      };
      upsertNutrition(a, next);
      renderNutrition();
      renderDashboard();
    });

    $("btnSaveTargets")?.addEventListener("click", () => {
      const a = $("targetAthlete")?.value || "";
      if (!a) return alert("Select an athlete.");
      state.targets[a] = {
        protein: clamp(toNum($("tProt")?.value, 160), 0, 500),
        carbs: clamp(toNum($("tCarb")?.value, 240), 0, 1000),
        fat: clamp(toNum($("tFat")?.value, 70), 0, 400),
        waterOz: clamp(toNum($("tWater")?.value, 80), 0, 300)
      };
      saveState();
      alert("Saved targets.");
      renderNutrition();
      renderDashboard();
    });

    const list = $("nutritionList");
    if (list) {
      if (!athleteId) {
        list.innerHTML = `<div class="muted small">Add athletes in Team tab.</div>`;
      } else {
        const rows = getNutrition(athleteId).slice().sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO))).slice(0, 14);
        const t = ensureTargetsForAthlete(athleteId);
        list.innerHTML = rows.length
          ? rows.map((r) => {
              const score = calcNutritionAdherence(r, t);
              return `
                <div class="item">
                  <div style="flex:1">
                    <div><b>${escHTML(r.dateISO)}</b> • Adherence <b>${escHTML(score)}</b></div>
                    <div class="muted small">
                      P ${escHTML(r.protein)} • C ${escHTML(r.carbs)} • F ${escHTML(r.fat)} • Water ${escHTML(r.waterOz)}oz
                      ${r.notes ? `<br/>${escHTML(r.notes)}` : ""}
                    </div>
                  </div>
                  <button class="btn danger" data-del-nut="${escHTML(r.dateISO)}">Delete</button>
                </div>
              `;
            }).join("")
          : `<div class="muted small">No nutrition entries yet.</div>`;

        qa("[data-del-nut]", list).forEach((btn) => {
          btn.addEventListener("click", () => {
            const d = btn.getAttribute("data-del-nut");
            state.logs.nutrition[athleteId] = getNutrition(athleteId).filter((x) => x.dateISO !== d);
            saveState();
            renderNutrition();
            renderDashboard();
          });
        });
      }
    }

    // Initialize nutrition engine button binds & meal plan output
    try { window.PIQ_Nutrition?.init?.(); } catch {}
  }

  // -------------------------
  // Render: Periodization
  // -------------------------
  function renderPeriodization() {
    const athletes = getAthletes();
    fillAthleteSelect($("perAthlete"), $("perAthlete")?.value);
    fillAthleteSelect($("monAthlete"), $("monAthlete")?.value);

    if ($("perStart") && !safeISO($("perStart").value)) $("perStart").value = todayISO();
    if ($("monWeek") && !safeISO($("monWeek").value)) $("monWeek").value = todayISO();

    $("btnGeneratePlan")?.addEventListener("click", () => {
      const athleteId = $("perAthlete")?.value || "";
      if (!athleteId) return alert("Add athletes first (Team tab).");

      const startISO = safeISO($("perStart")?.value) || todayISO();
      const weeks = clamp(toNum($("perWeeks")?.value, 8), 2, 24);
      const goal = String($("perGoal")?.value || "inseason");
      const deloadEvery = clamp(toNum($("perDeload")?.value, 4), 3, 6);

      generatePeriodizationPlan({ athleteId, startISO, weeks, goal, deloadEvery });
      renderPeriodization();
      alert("Plan generated.");
    });

    const planList = $("planList");
    const athleteId = $("perAthlete")?.value || (athletes[0]?.id || "");
    const plan = athleteId ? state.periodization[athleteId] : null;

    if (planList) {
      if (!athleteId) {
        planList.innerHTML = `<div class="muted small">Add athletes in Team tab.</div>`;
      } else if (!plan || !plan.weeksPlan?.length) {
        planList.innerHTML = `<div class="muted small">No plan yet. Generate one above.</div>`;
      } else {
        planList.innerHTML = plan.weeksPlan.map((w) => `
          <div class="item">
            <div style="flex:1">
              <div><b>Week ${escHTML(w.week)}</b> • ${escHTML(w.weekStartISO)} ${w.deload ? `<span class="pillTag">DELOAD</span>` : ""}</div>
              <div class="muted small">Target load: <b>${escHTML(w.targetLoad)}</b></div>
              <div class="muted small">
                ${w.sessions.map((s) => `${escHTML(s.day)} ${escHTML(s.minutes)}min @ RPE ${escHTML(s.rpe)} (${escHTML(s.minutes * s.rpe)}) • ${escHTML(s.type || "")}`).join(" • ")}
              </div>
            </div>
          </div>
        `).join("");
      }
    }

    $("btnCompareWeek")?.addEventListener("click", () => {
      const a = $("monAthlete")?.value || "";
      if (!a) return alert("Select an athlete.");
      const weekStart = safeISO($("monWeek")?.value) || todayISO();
      const plan = state.periodization[a] || null;
      const training = getTraining(a);

      const planned = plannedLoadForWeek(plan, weekStart);
      const actual = actualLoadForWeek(training, weekStart);
      const diff = planned ? Math.round(((actual - planned) / planned) * 100) : null;

      $("compareSummary").textContent =
        planned ? `Planned ${planned} vs Actual ${actual} (${diff >= 0 ? "+" : ""}${diff}% )`
                : `No planned week found starting ${weekStart}. Generate plan first.`;

      const details = [];
      details.push(`Week: ${weekStart} → ${addDaysISO(weekStart, 6)}`);
      details.push(`Planned load: ${planned || "—"}`);
      details.push(`Actual load: ${actual}`);
      details.push("");
      details.push("Actual sessions:");
      training
        .filter((s) => s.dateISO >= weekStart && s.dateISO <= addDaysISO(weekStart, 6))
        .sort((a, b) => String(a.dateISO).localeCompare(String(b.dateISO)))
        .forEach((s) => details.push(`- ${s.dateISO}: ${s.minutes}min @ RPE ${s.rpe} (${sessionLoad(s)}) • ${s.type}`));

      $("compareDetail").textContent = details.join("\n");
    });
  }

  // -------------------------
  // Render: Settings
  // -------------------------
  function renderSettings() {
    updateRoleUI();

    const info = $("appInfo");
    if (info) {
      info.textContent =
        `PerformanceIQ v${APP_VERSION}\n` +
        `LocalStorage key: ${STORAGE_KEY}\n` +
        `Updated: ${new Date(state.meta.updatedAtMs || Date.now()).toLocaleString()}\n` +
        `Athletes: ${state.athletes.length}\n` +
        `Role: ${getRole()}`;
    }

    $("btnSaveRole")?.addEventListener("click", () => {
      setRole($("roleSelect")?.value || "coach");
      alert("Role saved.");
    });

    $("btnWipe")?.addEventListener("click", () => {
      if (!confirm("Wipe ALL local data? This cannot be undone.")) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      location.reload();
    });
  }

  // -------------------------
  // Seed / Export / Import
  // -------------------------
  function seedDemo() {
    if (!confirm("Seed demo data? This will overwrite/merge into your current state.")) return;

    if (!state.athletes.length) {
      const a1 = { id: uid("ath"), name: "Jordan Smith", position: "PG", heightIn: 70, weightLb: 155 };
      const a2 = { id: uid("ath"), name: "Cam Johnson", position: "SG", heightIn: 72, weightLb: 165 };
      const a3 = { id: uid("ath"), name: "Avery Lee", position: "SF", heightIn: 74, weightLb: 175 };
      state.athletes.push(a1, a2, a3);
      [a1, a2, a3].forEach((a) => ensureTargetsForAthlete(a.id));
    }

    const athletes = state.athletes.slice(0, 3);
    const start = addDaysISO(todayISO(), -21);

    athletes.forEach((a, idx) => {
      for (let i = 0; i < 21; i++) {
        const d = addDaysISO(start, i);
        const minutes = 45 + ((i + idx) % 4) * 15;
        const rpe = 5 + ((i + idx) % 4);
        const type = ["practice", "lift", "skills", "conditioning"][(i + idx) % 4];
        addTrainingSession(a.id, { id: uid("sess"), dateISO: d, minutes, rpe, type, notes: "", load: minutes * rpe });
      }
      for (let i = 0; i < 21; i++) {
        const d = addDaysISO(start, i);
        upsertReadiness(a.id, {
          dateISO: d,
          sleep: 7 + ((i + idx) % 3) * 0.5,
          soreness: clamp(((i + idx) % 8), 2, 8),
          stress: clamp(((i + 2 * idx) % 7), 1, 7),
          energy: clamp(8 - ((i + idx) % 3), 5, 9),
          injuryNote: ""
        });
      }
      const t = ensureTargetsForAthlete(a.id);
      for (let i = 0; i < 21; i++) {
        const d = addDaysISO(start, i);
        upsertNutrition(a.id, {
          dateISO: d,
          protein: clamp(t.protein + ((i % 3) - 1) * 20, 0, 500),
          carbs: clamp(t.carbs + ((i % 3) - 1) * 40, 0, 1000),
          fat: clamp(t.fat + ((i % 3) - 1) * 10, 0, 400),
          waterOz: clamp(t.waterOz + ((i % 3) - 1) * 12, 0, 300),
          notes: ""
        });
      }
    });

    saveState();
    alert("Seeded demo data.");
    renderTeam(); renderDashboard(); renderLog(); renderNutrition(); renderPeriodization(); renderWorkouts();
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performanceiq_export_${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const next = normalizeState(parsed);
        Object.keys(state).forEach((k) => delete state[k]);
        Object.keys(next).forEach((k) => (state[k] = next[k]));
        saveState();
        alert("Imported.");
        showView("dashboard");
      } catch (e) {
        alert("Import failed: " + (e?.message || e));
      }
    };
    reader.readAsText(file);
  }

  // -------------------------
  // Boot
  // -------------------------
  function boot() {
    splashFailSafe(1600);
    hideSplash();

    wireNav();
    updateRoleUI();
    applyRoleToNav();

    $("btnSeed")?.addEventListener("click", seedDemo);
    $("btnExport")?.addEventListener("click", exportJSON);
    $("fileImport")?.addEventListener("change", (e) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      importJSON(file);
      e.target.value = "";
    });

    if ($("dashDate")) $("dashDate").value = todayISO();
    if ($("riskDate")) $("riskDate").value = todayISO();

    // start view
    showView("dashboard");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
