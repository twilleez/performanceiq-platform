// core.js — FULL FILE — v2.4.1
// Offline-first PerformanceIQ
// Includes:
// - Workouts (Standard vs Advanced) + localStorage + sRPE load + periodization integration
// - Workouts ↔ Periodization WRITE-BACK
// - Risk guardrails before pushing workouts into Training Log
// - Role views (Coach vs Athlete) with nav gating + role pill
// - Full renderers: Dashboard/Team/Log/Nutrition/Periodization/Workouts (no stubs)

(function () {
  "use strict";

  if (window.__PIQ_V241_LOADED__) return;
  window.__PIQ_V241_LOADED__ = true;

  const APP_VERSION = "2.4.1";
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

  // Week start helper (Monday)
  function mondayOf(iso) {
    const d = safeISO(iso) || todayISO();
    const dt = new Date(Date.parse(d));
    const day = dt.getUTCDay(); // 0 Sun..6 Sat
    const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
    dt.setUTCDate(dt.getUTCDate() + diff);
    return dt.toISOString().slice(0, 10);
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
      meta: {
        version: 1,
        updatedAtMs: now,
        appVersion: APP_VERSION,
        role: "coach",
        entitlements: {
          eliteNutrition: false
        }
      },
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
        prefs: {},
        builtWeeks: {}
      }
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return normalizeState(parsed);
    } catch {
      return defaultState();
    }
  }

  function normalizeState(s) {
    const d = defaultState();
    if (!s || typeof s !== "object") return d;

    s.meta = s.meta && typeof s.meta === "object" ? s.meta : d.meta;
    if (!s.meta.role) s.meta.role = "coach";
    if (!s.meta.entitlements || typeof s.meta.entitlements !== "object") s.meta.entitlements = { eliteNutrition: false };
    if (typeof s.meta.entitlements.eliteNutrition !== "boolean") s.meta.entitlements.eliteNutrition = false;

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

    s.workouts = s.workouts && typeof s.workouts === "object" ? s.workouts : d.workouts;
    if (!s.workouts.prefs || typeof s.workouts.prefs !== "object") s.workouts.prefs = {};
    if (!s.workouts.builtWeeks || typeof s.workouts.builtWeeks !== "object") s.workouts.builtWeeks = {};

    return s;
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

  function getRole() {
    const r = String(state.meta.role || "coach");
    return (r === "athlete" || r === "coach") ? r : "coach";
  }

  function applyRoleUI() {
    const role = getRole();
    const pill = $("activeRolePill");
    if (pill) pill.textContent = `Role: ${role === "coach" ? "Coach" : "Athlete"}`;

    qa(".navbtn").forEach((b) => {
      const req = b.getAttribute("data-requires");
      if (req === "coach") b.style.display = (role === "coach") ? "" : "none";
    });
  }

  function eliteNutritionEnabled() {
    return !!state?.meta?.entitlements?.eliteNutrition;
  }

  // -------------------------
  // Splash safety
  // -------------------------
  function hideSplash() {
    const s = $("splash");
    if (!s) return;
    s.style.pointerEvents = "none";
    s.style.opacity = "0";
    s.style.visibility = "hidden";
    s.style.display = "none";
    try { s.remove(); } catch {}
  }

  // -------------------------
  // View switching
  // -------------------------
  const VIEWS = ["dashboard", "team", "log", "nutrition", "workouts", "periodization", "settings"];

  function showView(name) {
    const role = getRole();
    let view = String(name || "dashboard");

    if (role === "athlete" && view === "team") view = "dashboard";

    VIEWS.forEach((v) => {
      const el = $(`view-${v}`);
      if (!el) return;
      el.hidden = v !== view;
    });

    qa(".navbtn").forEach((b) => {
      const v = b.getAttribute("data-view");
      b.classList.toggle("active", v === view);
    });

    if (view === "dashboard") renderDashboard();
    if (view === "team") renderTeam();
    if (view === "log") renderLog();
    if (view === "nutrition") renderNutrition();
    if (view === "workouts") renderWorkouts();
    if (view === "periodization") renderPeriodization();
    if (view === "settings") renderSettings();

    saveState();
  }

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
  function getAthletes() {
    return state.athletes.slice();
  }
  function getAthlete(id) {
    return state.athletes.find((a) => a && a.id === id) || null;
  }

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
    selectEl.innerHTML =
      athletes.map((a) => `<option value="${escHTML(a.id)}">${escHTML(athleteLabel(a))}</option>`).join("");
    if (selectedId && athletes.some((a) => a.id === selectedId)) selectEl.value = selectedId;
    else selectEl.value = athletes[0].id;
  }

  function fillAthleteSelectsAll() {
    const ids = [
      "dashAthlete","riskAthlete","logAthlete","readyAthlete","nutAthlete","targetAthlete",
      "perAthlete","monAthlete","workoutAthlete","mealAthlete"
    ];
    ids.forEach((id) => fillAthleteSelect($(id), $(id)?.value));
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
    out.sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)));
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
    const score = 100 - dev * 100;
    return clamp(Math.round(score), 0, 100);
  }

  function sessionLoad(sess) {
    return clamp(toNum(sess.minutes, 0) * toNum(sess.rpe, 0), 0, 6000);
  }

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

  // Training subscore (fatigue proxy): higher acute vs chronic lowers score
  function trainingSubScore(trainingSessions, asOfISO) {
    const meta = workloadRiskIndex(trainingSessions, asOfISO);
    if (meta.acwr === null) return 70;
    const acwr = meta.acwr;
    let score = 100;
    if (acwr <= 0.6) score = 70;
    else if (acwr <= 1.1) score = 95;
    else if (acwr <= 1.3) score = 85;
    else if (acwr <= 1.6) score = 60;
    else score = 40;
    return clamp(Math.round(score), 0, 100);
  }

  // Recovery subscore from readiness inputs (slightly more forgiving)
  function recoverySubScore(readinessRow) {
    if (!readinessRow) return 70;
    const base = calcReadinessScore(readinessRow);
    return clamp(Math.round(base * 0.9 + 10), 0, 100);
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
        { day: "Mon", minutes: 60, rpe: isDeload ? 5 : 6, type: "practice", notes: "" },
        { day: "Tue", minutes: 75, rpe: isDeload ? 5 : 7, type: "skills", notes: "" },
        { day: "Thu", minutes: 60, rpe: isDeload ? 4 : 6, type: "lift", notes: "" },
        { day: "Sat", minutes: 75, rpe: isDeload ? 5 : 7, type: "conditioning", notes: "" }
      ];

      const current = sessions.reduce((s, x) => s + x.minutes * x.rpe, 0);
      const scale = current > 0 ? targetLoad / current : 1;

      const scaled = sessions.map((x) => {
        const m = clamp(Math.round(x.minutes * scale), 30, 120);
        return { ...x, minutes: m };
      });

      const weekStart = addDaysISO(start, (i - 1) * 7);

      weeksPlan.push({
        week: i,
        weekStartISO: weekStart,
        deload: isDeload,
        targetLoad,
        sessions: scaled,
        updatedAtMs: Date.now()
      });
    }

    state.periodization[athleteId] = {
      athleteId,
      startISO: start,
      weeks: W,
      goal,
      deloadEvery: deloadN,
      weeksPlan,
      updatedAtMs: Date.now()
    };
    saveState();
    return state.periodization[athleteId];
  }

  function plannedLoadForWeek(plan, weekStartISO) {
    if (!plan?.weeksPlan) return 0;
    const wk = plan.weeksPlan.find((w) => w.weekStartISO === weekStartISO);
    if (!wk) return 0;
    return wk.targetLoad || 0;
  }

  function actualLoadForWeek(trainingSessions, weekStartISO) {
    const start = safeISO(weekStartISO);
    if (!start) return 0;
    const end = addDaysISO(start, 6);
    return sumLoads(trainingSessions, start, end);
  }

  // -------------------------
  // Workouts Module
  // -------------------------
  function defaultWorkoutPrefs(athleteId) {
    if (!state.workouts.prefs[athleteId]) {
      state.workouts.prefs[athleteId] = {
        mode: "standard",
        source: "auto",
        advIntensity: "0.05",
        advPowerPair: "yes"
      };
      saveState();
    }
    return state.workouts.prefs[athleteId];
  }

  function templateWeek(mode, advIntensity, advPowerPair) {
    const bump = clamp(toNum(advIntensity, 0), 0, 0.15);
    const isAdv = mode === "advanced";

    const base = [
      { dayIdx: 0, day: "Mon", type: "lift",         minutes: 60, rpe: 6, title: "Lower + Core", notes: "Squat/RDL/split squat + core" },
      { dayIdx: 1, day: "Tue", type: "skills",       minutes: 75, rpe: 7, title: "Upper Push + Skill", notes: "Bench/press + shooting/ball handling" },
      { dayIdx: 3, day: "Thu", type: "practice",     minutes: 60, rpe: 6, title: "Lower Posterior + Core", notes: "Trap bar/hinge + carries/core" },
      { dayIdx: 5, day: "Sat", type: "conditioning", minutes: 75, rpe: 7, title: "Upper Pull + Conditioning", notes: "Rows/pull + intervals" }
    ];

    if (!isAdv) return base;

    return base.map((s) => {
      const minutes = clamp(Math.round(s.minutes * (1 + bump)), 30, 120);
      const rpe = clamp(Math.round((s.rpe + 1) * 10) / 10, 0, 10);
      const powerNote = (advPowerPair === "yes") ? " • Add power pairing (lift + jump/med ball)" : "";
      return { ...s, minutes, rpe, notes: `${s.notes}${powerNote}` };
    });
  }

  function periodizationWeekSessions(plan, weekStartISO) {
    if (!plan?.weeksPlan?.length) return null;
    const wk = plan.weeksPlan.find((w) => w.weekStartISO === weekStartISO);
    if (!wk) return null;

    const dayMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

    return wk.sessions.map((s) => {
      const dayIdx = dayMap[String(s.day)] ?? 0;
      return {
        dayIdx,
        day: String(s.day || "Mon"),
        type: String(s.type || "practice"),
        minutes: clamp(toNum(s.minutes, 60), 0, 600),
        rpe: clamp(toNum(s.rpe, 6), 0, 10),
        title: "Planned session",
        notes: String(s.notes || "")
      };
    });
  }

  function buildWorkoutWeek(athleteId, weekStartISO, prefs) {
    const weekStart = mondayOf(weekStartISO);
    const plan = state.periodization[athleteId] || null;

    let sessions = null;
    const source = prefs.source || "auto";

    if (source === "periodization") {
      sessions = periodizationWeekSessions(plan, weekStart);
    } else if (source === "template") {
      sessions = templateWeek(prefs.mode, prefs.advIntensity, prefs.advPowerPair);
    } else {
      sessions = periodizationWeekSessions(plan, weekStart) || templateWeek(prefs.mode, prefs.advIntensity, prefs.advPowerPair);
    }

    const expanded = (sessions || []).map((s) => {
      const dateISO = addDaysISO(weekStart, clamp(toNum(s.dayIdx, 0), 0, 6));
      return {
        ...s,
        dateISO,
        minutes: clamp(toNum(s.minutes, 0), 0, 600),
        rpe: clamp(toNum(s.rpe, 0), 0, 10),
        type: String(s.type || "practice"),
        notes: String(s.notes || "")
      };
    });

    state.workouts.builtWeeks[athleteId] = {
      weekStartISO: weekStart,
      sessions: expanded,
      updatedAtMs: Date.now()
    };
    saveState();
    return state.workouts.builtWeeks[athleteId];
  }

  function pushWorkoutWeekToLog(athleteId, builtWeek) {
    if (!athleteId) throw new Error("Missing athleteId");
    if (!builtWeek?.sessions?.length) throw new Error("Build a week first.");

    builtWeek.sessions.forEach((s) => {
      const sess = {
        id: uid("sess"),
        dateISO: safeISO(s.dateISO) || todayISO(),
        minutes: clamp(toNum(s.minutes, 0), 0, 600),
        rpe: clamp(toNum(s.rpe, 0), 0, 10),
        type: String(s.type || "practice"),
        notes: String((s.title ? `${s.title} • ` : "") + (s.notes || "")).trim(),
        load: Math.round(clamp(toNum(s.minutes, 0), 0, 600) * clamp(toNum(s.rpe, 0), 0, 10))
      };
      addTrainingSession(athleteId, sess);
    });

    saveState();
  }

  // WRITE-BACK: update periodization week sessions from built workouts
  function writeBackToPeriodization(athleteId) {
    const bw = state.workouts.builtWeeks[athleteId];
    if (!bw?.sessions?.length) throw new Error("Build a week first.");

    const weekStart = mondayOf(bw.weekStartISO);
    const plan = state.periodization[athleteId];
    if (!plan?.weeksPlan?.length) throw new Error("No periodization plan found for this athlete.");

    const wk = plan.weeksPlan.find((w) => w.weekStartISO === weekStart);
    if (!wk) throw new Error(`No matching periodization week found for ${weekStart}.`);

    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const nextSessions = [];
    bw.sessions.forEach((s) => {
      const idx = clamp(toNum(s.dayIdx, 0), 0, 6);
      nextSessions.push({
        day: dayNames[idx],
        minutes: clamp(toNum(s.minutes, 0), 0, 600),
        rpe: clamp(toNum(s.rpe, 0), 0, 10),
        type: String(s.type || "practice"),
        notes: String(s.notes || "")
      });
    });

    // Remove duplicate days (keep last)
    const map = {};
    nextSessions.forEach((s) => { map[s.day] = s; });
    wk.sessions = Object.values(map).sort((a, b) => dayNames.indexOf(a.day) - dayNames.indexOf(b.day));

    wk.targetLoad = Math.round(wk.sessions.reduce((acc, s) => acc + (toNum(s.minutes, 0) * toNum(s.rpe, 0)), 0));
    wk.updatedAtMs = Date.now();
    plan.updatedAtMs = Date.now();

    saveState();
    return wk;
  }

  // -------------------------
  // Dashboard (PIQ Score + Risk + Heatmap)
  // -------------------------
  function getReadinessRowByDate(athleteId, dateISO) {
    const d = safeISO(dateISO);
    if (!d) return null;
    return getReadiness(athleteId).find((r) => r.dateISO === d) || null;
  }

  function getNutritionRowByDate(athleteId, dateISO) {
    const d = safeISO(dateISO);
    if (!d) return null;
    return getNutrition(athleteId).find((r) => r.dateISO === d) || null;
  }

  function piqBand(score) {
    const s = toNum(score, 0);
    if (s >= 85) return "Elite";
    if (s >= 70) return "Strong";
    if (s >= 55) return "Build";
    return "Recover";
  }

  function calcPIQ(athleteId, dateISO) {
    const d = safeISO(dateISO) || todayISO();
    const weights = state.team.piqWeights || { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 };

    const train = getTraining(athleteId);
    const readRow = getReadinessRowByDate(athleteId, d);
    const nutRow = getNutritionRowByDate(athleteId, d);

    const readiness = readRow ? calcReadinessScore(readRow) : 70;
    const training = trainingSubScore(train, d);
    const recovery = recoverySubScore(readRow);
    const nutrition = nutRow ? clamp(toNum(nutRow.adherence, 0), 0, 100) : 70;

    const riskMeta = workloadRiskIndex(train, d);
    const risk = clamp(100 - riskMeta.index, 0, 100);

    const sumW =
      toNum(weights.readiness) + toNum(weights.training) + toNum(weights.recovery) + toNum(weights.nutrition) + toNum(weights.risk);

    const w = sumW > 0 ? weights : { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 };

    const score =
      (readiness * toNum(w.readiness) +
        training * toNum(w.training) +
        recovery * toNum(w.recovery) +
        nutrition * toNum(w.nutrition) +
        risk * toNum(w.risk)) / 100;

    const explain = {
      date: d,
      subscores: { readiness, training, recovery, nutrition, risk },
      weights: { ...w },
      riskMeta
    };

    return { score: clamp(Math.round(score), 0, 100), explain };
  }

  function setBar(idFill, idNum, val) {
    const v = clamp(toNum(val, 0), 0, 100);
    const fill = $(idFill);
    const num = $(idNum);
    if (fill) fill.style.width = `${v}%`;
    if (num) num.textContent = String(v);
  }

  function renderDashboard() {
    fillAthleteSelectsAll();

    const athletes = getAthletes();
    const dashAthlete = $("dashAthlete");
    const riskAthlete = $("riskAthlete");

    const activeA = dashAthlete?.value || athletes[0]?.id || "";
    const activeR = riskAthlete?.value || activeA;

    if ($("dashDate") && !safeISO($("dashDate").value)) $("dashDate").value = todayISO();
    if ($("riskDate") && !safeISO($("riskDate").value)) $("riskDate").value = todayISO();

    // PIQ Score calc
    const doPIQ = () => {
      const aid = $("dashAthlete")?.value || activeA;
      const d = $("dashDate")?.value || todayISO();
      if (!aid) return;

      const { score, explain } = calcPIQ(aid, d);

      if ($("piqScore")) $("piqScore").textContent = String(score);
      if ($("piqBand")) $("piqBand").textContent = piqBand(score);

      const s = explain.subscores;
      setBar("barReadiness", "numReadiness", s.readiness);
      setBar("barTraining", "numTraining", s.training);
      setBar("barRecovery", "numRecovery", s.recovery);
      setBar("barNutrition", "numNutrition", s.nutrition);
      setBar("barRisk", "numRisk", s.risk);

      const lines = [];
      lines.push(`Date: ${explain.date}`);
      lines.push(``);
      lines.push(`Subscores (0–100):`);
      lines.push(`- Readiness: ${s.readiness}`);
      lines.push(`- Training: ${s.training} (fatigue proxy from ACWR)`);
      lines.push(`- Recovery: ${s.recovery}`);
      lines.push(`- Nutrition: ${s.nutrition}`);
      lines.push(`- Risk: ${s.risk} (100 - risk index)`);
      lines.push(``);
      lines.push(`Weights (%): ${JSON.stringify(explain.weights)}`);
      lines.push(`Risk meta: ACWR=${explain.riskMeta.acwr ?? "—"}, monotony=${explain.riskMeta.monotony}, strain=${explain.riskMeta.strain}, index=${explain.riskMeta.index}`);

      if ($("piqExplain")) $("piqExplain").textContent = lines.join("\n");
    };

    $("btnRecalcScore")?.addEventListener("click", doPIQ);
    $("dashAthlete")?.addEventListener("change", doPIQ);
    $("dashDate")?.addEventListener("change", doPIQ);
    doPIQ();

    // Risk Detection
    const doRisk = () => {
      const aid = $("riskAthlete")?.value || activeR;
      const d = $("riskDate")?.value || todayISO();
      if (!aid) return;

      const meta = workloadRiskIndex(getTraining(aid), d);
      const summary =
        `As-of ${d} • Risk index ${meta.index}/100 • ACWR ${meta.acwr ?? "—"} • Monotony ${meta.monotony}`;

      if ($("riskSummary")) $("riskSummary").textContent = summary;

      if ($("riskWorkload")) {
        $("riskWorkload").textContent =
          `Acute(7d): ${meta.acute}\nChronic avg(7d equiv): ${meta.chronicAvg7}\nACWR: ${meta.acwr ?? "—"}\nStrain: ${meta.strain}\nMonotony: ${meta.monotony}`;
      }
      if ($("riskReadiness")) {
        const rr = getReadinessRowByDate(aid, d);
        const nr = getNutritionRowByDate(aid, d);
        const rScore = rr ? calcReadinessScore(rr) : "—";
        const nScore = nr ? nr.adherence : "—";
        $("riskReadiness").textContent = `Readiness: ${rScore}\nNutrition adherence: ${nScore}`;
      }
    };

    $("btnRunRisk")?.addEventListener("click", doRisk);
    $("riskAthlete")?.addEventListener("change", doRisk);
    $("riskDate")?.addEventListener("change", doRisk);
    doRisk();

    // Heatmap
    if ($("heatStart") && !safeISO($("heatStart").value)) $("heatStart").value = addDaysISO(todayISO(), -14);
    const renderHeatmap = () => {
      const start = $("heatStart")?.value || addDaysISO(todayISO(), -14);
      const days = clamp(toNum($("heatDays")?.value, 21), 7, 60);
      const metric = String($("heatMetric")?.value || "load");

      const tbl = $("heatTable");
      if (!tbl) return;

      const at = getAthletes();
      if (!at.length) {
        tbl.innerHTML = `<tr><td class="muted small">Add athletes in Team.</td></tr>`;
        return;
      }

      const dates = [];
      for (let i = 0; i < days; i++) dates.push(addDaysISO(start, i));

      const head =
        `<tr>` +
        `<th class="stickycol">Athlete</th>` +
        dates.map((d) => `<th class="small mono">${d.slice(5)}</th>`).join("") +
        `</tr>`;

      const rows = at.map((a) => {
        const train = getTraining(a.id);
        const ready = getReadiness(a.id);
        const nut = getNutrition(a.id);

        const cells = dates.map((d) => {
          let val = 0;
          if (metric === "load") {
            val = train.filter((s) => s.dateISO === d).reduce((acc, s) => acc + sessionLoad(s), 0);
            val = clamp(Math.round((val / 2000) * 100), 0, 100); // scaled to heat 0–100
          } else if (metric === "readiness") {
            const r = ready.find((x) => x.dateISO === d);
            val = r ? calcReadinessScore(r) : 0;
          } else if (metric === "nutrition") {
            const n = nut.find((x) => x.dateISO === d);
            val = n ? clamp(toNum(n.adherence, 0), 0, 100) : 0;
          } else if (metric === "risk") {
            const m = workloadRiskIndex(train, d);
            val = clamp(m.index, 0, 100);
          }

          const cls = `heat c${Math.round(val / 10)}`;
          return `<td class="${cls}" data-heat-a="${escHTML(a.id)}" data-heat-d="${escHTML(d)}" title="${val}">${val || ""}</td>`;
        }).join("");

        return `<tr><td class="stickycol"><b>${escHTML(a.name || "—")}</b><div class="small muted">${escHTML(a.position || "")}</div></td>${cells}</tr>`;
      }).join("");

      tbl.innerHTML = head + rows;

      // click jump to Log view
      qa("td[data-heat-a]").forEach((cell) => {
        cell.addEventListener("click", () => {
          const aid = cell.getAttribute("data-heat-a");
          const d = cell.getAttribute("data-heat-d");
          if ($("logAthlete")) $("logAthlete").value = aid;
          if ($("logDate")) $("logDate").value = d;
          if ($("readyAthlete")) $("readyAthlete").value = aid;
          if ($("readyDate")) $("readyDate").value = d;
          if ($("nutAthlete")) $("nutAthlete").value = aid;
          if ($("nutDate")) $("nutDate").value = d;
          showView("log");
        });
      });
    };

    $("btnHeatmap")?.addEventListener("click", renderHeatmap);
    renderHeatmap();
  }

  // -------------------------
  // Team view
  // -------------------------
  function renderRosterList() {
    const list = $("rosterList");
    if (!list) return;

    const at = getAthletes();
    if (!at.length) {
      list.innerHTML = `<div class="item"><div class="muted small">No athletes yet. Add one above.</div></div>`;
      return;
    }

    list.innerHTML = at.map((a) => {
      const ht = a.heightIn ? `${a.heightIn} in` : "—";
      const wt = a.weightLb ? `${a.weightLb} lb` : "—";
      return `
        <div class="item">
          <div class="grow">
            <div><b>${escHTML(a.name || "—")}</b> <span class="muted">(${escHTML(a.position || "—")})</span></div>
            <div class="small muted">Ht: ${escHTML(ht)} • Wt: ${escHTML(wt)}</div>
          </div>
          <div class="row gap">
            <button class="btn ghost" data-act="edit" data-id="${escHTML(a.id)}">Edit</button>
            <button class="btn danger" data-act="del" data-id="${escHTML(a.id)}">Delete</button>
          </div>
        </div>
      `;
    }).join("");

    qa("button[data-act='del']", list).forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-id");
        if (!id) return;
        const a = getAthlete(id);
        if (!confirm(`Delete athlete "${a?.name || id}" and their logs?`)) return;

        state.athletes = state.athletes.filter((x) => x.id !== id);
        delete state.logs.training[id];
        delete state.logs.readiness[id];
        delete state.logs.nutrition[id];
        delete state.targets[id];
        delete state.periodization[id];
        delete state.workouts.prefs[id];
        delete state.workouts.builtWeeks[id];

        saveState();
        fillAthleteSelectsAll();
        renderRosterList();
      });
    });

    qa("button[data-act='edit']", list).forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-id");
        const a = getAthlete(id);
        if (!a) return;

        const name = prompt("Name", a.name || "");
        if (name === null) return;
        const pos = prompt("Position", a.position || "");
        if (pos === null) return;

        a.name = String(name).trim();
        a.position = String(pos).trim();
        saveState();
        fillAthleteSelectsAll();
        renderRosterList();
      });
    });
  }

  function renderTeam() {
    // Team pill
    if ($("activeTeamPill")) $("activeTeamPill").textContent = `Team: ${state.team.name || "Default"}`;

    // Populate fields
    if ($("teamName")) $("teamName").value = state.team.name || "Default";
    if ($("seasonStart")) $("seasonStart").value = state.team.seasonStart || "";
    if ($("seasonEnd")) $("seasonEnd").value = state.team.seasonEnd || "";

    const md = state.team.macroDefaults || { protein: 160, carbs: 240, fat: 70, waterOz: 80 };
    if ($("defProt")) $("defProt").value = md.protein;
    if ($("defCarb")) $("defCarb").value = md.carbs;
    if ($("defFat")) $("defFat").value = md.fat;

    const w = state.team.piqWeights || { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 };
    if ($("wReadiness")) $("wReadiness").value = w.readiness;
    if ($("wTraining")) $("wTraining").value = w.training;
    if ($("wRecovery")) $("wRecovery").value = w.recovery;
    if ($("wNutrition")) $("wNutrition").value = w.nutrition;
    if ($("wRisk")) $("wRisk").value = w.risk;

    $("btnAddAthlete")?.addEventListener("click", () => {
      const name = String($("athName")?.value || "").trim();
      const pos = String($("athPos")?.value || "").trim();
      const ht = toNum($("athHt")?.value, 0);
      const wt = toNum($("athWt")?.value, 0);

      if (!name) return alert("Enter athlete name.");

      const a = {
        id: uid("ath"),
        name,
        position: pos,
        heightIn: ht || null,
        weightLb: wt || null
      };
      state.athletes.push(a);
      ensureTargetsForAthlete(a.id);
      defaultWorkoutPrefs(a.id);
      saveState();

      if ($("athName")) $("athName").value = "";
      if ($("athPos")) $("athPos").value = "";
      if ($("athHt")) $("athHt").value = "";
      if ($("athWt")) $("athWt").value = "";

      fillAthleteSelectsAll();
      renderRosterList();
    });

    $("btnSaveTeam")?.addEventListener("click", () => {
      state.team.name = String($("teamName")?.value || "Default").trim() || "Default";
      state.team.seasonStart = safeISO($("seasonStart")?.value) || "";
      state.team.seasonEnd = safeISO($("seasonEnd")?.value) || "";
      saveState();
      if ($("activeTeamPill")) $("activeTeamPill").textContent = `Team: ${state.team.name || "Default"}`;
      alert("Saved team settings.");
    });

    $("btnSaveMacroDefaults")?.addEventListener("click", () => {
      const p = clamp(toNum($("defProt")?.value, 160), 0, 400);
      const c = clamp(toNum($("defCarb")?.value, 240), 0, 800);
      const f = clamp(toNum($("defFat")?.value, 70), 0, 300);

      state.team.macroDefaults = { protein: p, carbs: c, fat: f, waterOz: state.team.macroDefaults?.waterOz ?? 80 };
      // update any missing athlete targets
      state.athletes.forEach((a) => ensureTargetsForAthlete(a.id));
      saveState();
      alert("Saved macro defaults.");
    });

    $("btnSaveWeights")?.addEventListener("click", () => {
      const ww = {
        readiness: clamp(toNum($("wReadiness")?.value, 30), 0, 100),
        training: clamp(toNum($("wTraining")?.value, 25), 0, 100),
        recovery: clamp(toNum($("wRecovery")?.value, 20), 0, 100),
        nutrition: clamp(toNum($("wNutrition")?.value, 15), 0, 100),
        risk: clamp(toNum($("wRisk")?.value, 10), 0, 100)
      };
      const total = ww.readiness + ww.training + ww.recovery + ww.nutrition + ww.risk;
      if ($("weightsNote")) $("weightsNote").textContent = `Total: ${total} (must be 100)`;
      if (total !== 100) return alert("Weights must total 100.");
      state.team.piqWeights = ww;
      saveState();
      alert("Saved PIQ weights.");
    });

    renderRosterList();
    fillAthleteSelectsAll();
  }

  // -------------------------
  // Log view
  // -------------------------
  function renderTrainingList(athleteId) {
    const list = $("trainingList");
    if (!list) return;

    const items = getTraining(athleteId);
    if (!items.length) {
      list.innerHTML = `<div class="item"><div class="muted small">No sessions logged yet.</div></div>`;
      return;
    }

    list.innerHTML = items.map((s) => {
      const load = Math.round(sessionLoad(s));
      return `
        <div class="item">
          <div class="grow">
            <div><b>${escHTML(s.dateISO)}</b> <span class="pill">${escHTML(s.type || "practice")}</span></div>
            <div class="small muted">Minutes: ${escHTML(s.minutes)} • sRPE: ${escHTML(s.rpe)} • Load: <b>${escHTML(load)}</b></div>
            ${s.notes ? `<div class="small">${escHTML(s.notes)}</div>` : ""}
          </div>
          <button class="btn danger" data-del-tr="${escHTML(s.id)}">Delete</button>
        </div>
      `;
    }).join("");

    qa("button[data-del-tr]", list).forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-del-tr");
        if (!id) return;
        state.logs.training[athleteId] = getTraining(athleteId).filter((x) => x.id !== id);
        saveState();
        renderTrainingList(athleteId);
      });
    });
  }

  function renderReadinessList(athleteId) {
    const list = $("readinessList");
    if (!list) return;

    const items = getReadiness(athleteId);
    if (!items.length) {
      list.innerHTML = `<div class="item"><div class="muted small">No readiness check-ins yet.</div></div>`;
      return;
    }

    list.innerHTML = items.map((r) => {
      const score = calcReadinessScore(r);
      return `
        <div class="item">
          <div class="grow">
            <div><b>${escHTML(r.dateISO)}</b> <span class="pill">Score ${escHTML(score)}</span></div>
            <div class="small muted">Sleep ${escHTML(r.sleep)}h • Soreness ${escHTML(r.soreness)} • Stress ${escHTML(r.stress)} • Energy ${escHTML(r.energy)}</div>
            ${r.injury ? `<div class="small">${escHTML(r.injury)}</div>` : ""}
          </div>
          <button class="btn danger" data-del-r="${escHTML(r.dateISO)}">Delete</button>
        </div>
      `;
    }).join("");

    qa("button[data-del-r]", list).forEach((b) => {
      b.addEventListener("click", () => {
        const d = b.getAttribute("data-del-r");
        if (!d) return;
        state.logs.readiness[athleteId] = getReadiness(athleteId).filter((x) => x.dateISO !== d);
        saveState();
        renderReadinessList(athleteId);
      });
    });
  }

  function renderLog() {
    fillAthleteSelectsAll();

    const athletes = getAthletes();
    const aid = $("logAthlete")?.value || athletes[0]?.id || "";
    if (!aid) return;

    // default dates
    if ($("logDate") && !safeISO($("logDate").value)) $("logDate").value = todayISO();
    if ($("readyDate") && !safeISO($("readyDate").value)) $("readyDate").value = todayISO();

    // computed load preview
    const updateComputed = () => {
      const min = clamp(toNum($("logMin")?.value, 0), 0, 600);
      const rpe = clamp(toNum($("logRpe")?.value, 0), 0, 10);
      const load = Math.round(min * rpe);
      if ($("logComputed")) $("logComputed").textContent = `Load: ${load}`;
    };

    $("logMin")?.addEventListener("input", updateComputed);
    $("logRpe")?.addEventListener("input", updateComputed);
    updateComputed();

    $("btnSaveTraining")?.addEventListener("click", () => {
      const a = $("logAthlete")?.value || aid;
      const d = safeISO($("logDate")?.value) || todayISO();
      const minutes = clamp(toNum($("logMin")?.value, 60), 0, 600);
      const rpe = clamp(toNum($("logRpe")?.value, 6), 0, 10);
      const type = String($("logType")?.value || "practice");
      const notes = String($("logNotes")?.value || "").trim();
      addTrainingSession(a, {
        id: uid("sess"),
        dateISO: d,
        minutes,
        rpe,
        type,
        notes,
        load: Math.round(minutes * rpe)
      });
      if ($("logNotes")) $("logNotes").value = "";
      renderTrainingList(a);
    });

    const updateReadyComputed = () => {
      const row = {
        sleep: toNum($("readySleep")?.value, 8),
        soreness: toNum($("readySore")?.value, 3),
        stress: toNum($("readyStress")?.value, 3),
        energy: toNum($("readyEnergy")?.value, 7)
      };
      const score = calcReadinessScore(row);
      if ($("readyComputed")) $("readyComputed").textContent = String(score);
    };

    ["readySleep","readySore","readyStress","readyEnergy"].forEach((id) => $(id)?.addEventListener("input", updateReadyComputed));
    updateReadyComputed();

    $("btnSaveReadiness")?.addEventListener("click", () => {
      const a = $("readyAthlete")?.value || aid;
      const d = safeISO($("readyDate")?.value) || todayISO();
      const row = {
        dateISO: d,
        sleep: clamp(toNum($("readySleep")?.value, 8), 0, 16),
        soreness: clamp(toNum($("readySore")?.value, 3), 0, 10),
        stress: clamp(toNum($("readyStress")?.value, 3), 0, 10),
        energy: clamp(toNum($("readyEnergy")?.value, 7), 0, 10),
        injury: String($("readyInjury")?.value || "").trim()
      };
      upsertReadiness(a, row);
      renderReadinessList(a);
    });

    $("logAthlete")?.addEventListener("change", () => renderLog());
    $("readyAthlete")?.addEventListener("change", () => renderLog());

    renderTrainingList(aid);
    renderReadinessList(aid);
  }

  // -------------------------
  // Nutrition view
  // -------------------------
  function renderNutritionList(athleteId) {
    const list = $("nutritionList");
    if (!list) return;

    const items = getNutrition(athleteId);
    if (!items.length) {
      list.innerHTML = `<div class="item"><div class="muted small">No nutrition logs yet.</div></div>`;
      return;
    }

    list.innerHTML = items.map((n) => {
      return `
        <div class="item">
          <div class="grow">
            <div><b>${escHTML(n.dateISO)}</b> <span class="pill">Adherence ${escHTML(n.adherence ?? "—")}</span></div>
            <div class="small muted">P ${escHTML(n.protein)}g • C ${escHTML(n.carbs)}g • F ${escHTML(n.fat)}g • Water ${escHTML(n.waterOz)}oz</div>
            ${n.notes ? `<div class="small">${escHTML(n.notes)}</div>` : ""}
          </div>
          <button class="btn danger" data-del-n="${escHTML(n.dateISO)}">Delete</button>
        </div>
      `;
    }).join("");

    qa("button[data-del-n]", list).forEach((b) => {
      b.addEventListener("click", () => {
        const d = b.getAttribute("data-del-n");
        state.logs.nutrition[athleteId] = getNutrition(athleteId).filter((x) => x.dateISO !== d);
        saveState();
        renderNutritionList(athleteId);
      });
    });
  }

  function renderNutrition() {
    fillAthleteSelectsAll();
    const athletes = getAthletes();
    const aid = $("nutAthlete")?.value || athletes[0]?.id || "";

    // default dates
    if ($("nutDate") && !safeISO($("nutDate").value)) $("nutDate").value = todayISO();
    if ($("mealStart") && !safeISO($("mealStart").value)) $("mealStart").value = todayISO();

    // paywall
    const paywall = $("nutPaywall");
    const main = $("nutMain");
    const targets = $("targetsBlock");

    const enabled = eliteNutritionEnabled();
    if (paywall) paywall.style.display = enabled ? "none" : "";
    if (main) main.style.display = enabled ? "" : "none";
    if (targets) targets.style.display = enabled ? "" : "none";

    $("btnUnlock")?.addEventListener("click", () => {
      const code = String($("unlockCode")?.value || "").trim();
      // offline demo unlock codes (you can change these anytime)
      const ok = (code === "PIQ-ELITE" || code === "PERFORMANCEIQ" || code === "ELITE");
      if (!ok) {
        if ($("unlockHint")) $("unlockHint").textContent = "Invalid code.";
        return;
      }
      state.meta.entitlements.eliteNutrition = true;
      saveState();
      if ($("unlockHint")) $("unlockHint").textContent = "Unlocked.";
      renderNutrition();
    });

    if (!aid) {
      if ($("nutritionList")) $("nutritionList").innerHTML = `<div class="item"><div class="muted small">Add athletes in Team.</div></div>`;
      return;
    }

    ensureTargetsForAthlete(aid);

    // Targets UI (per athlete)
    const setTargetUI = (athleteId) => {
      const t = ensureTargetsForAthlete(athleteId);
      if (!t) return;
      if ($("tProt")) $("tProt").value = t.protein ?? 0;
      if ($("tCarb")) $("tCarb").value = t.carbs ?? 0;
      if ($("tFat")) $("tFat").value = t.fat ?? 0;
      if ($("tWater")) $("tWater").value = t.waterOz ?? 0;
    };

    setTargetUI($("targetAthlete")?.value || aid);

    $("btnSaveTargets")?.addEventListener("click", () => {
      const athleteId = $("targetAthlete")?.value || aid;
      const t = {
        protein: clamp(toNum($("tProt")?.value, 0), 0, 500),
        carbs: clamp(toNum($("tCarb")?.value, 0), 0, 1000),
        fat: clamp(toNum($("tFat")?.value, 0), 0, 400),
        waterOz: clamp(toNum($("tWater")?.value, 0), 0, 300)
      };
      state.targets[athleteId] = t;
      saveState();
      alert("Saved targets.");
    });

    $("targetAthlete")?.addEventListener("change", () => setTargetUI($("targetAthlete").value));

    // Save nutrition log
    const computeNut = (athleteId, totals) => {
      const target = ensureTargetsForAthlete(athleteId);
      return calcNutritionAdherence(totals, target);
    };

    const updateNutComputed = () => {
      const athleteId = $("nutAthlete")?.value || aid;
      const totals = {
        protein: clamp(toNum($("nutProt")?.value, 0), 0, 500),
        carbs: clamp(toNum($("nutCarb")?.value, 0), 0, 1000),
        fat: clamp(toNum($("nutFat")?.value, 0), 0, 400),
        waterOz: clamp(toNum($("nutWater")?.value, 0), 0, 300)
      };
      const score = computeNut(athleteId, totals);
      if ($("nutComputed")) $("nutComputed").textContent = String(score);

      const target = ensureTargetsForAthlete(athleteId);
      const explain = [
        `Targets: P ${target.protein} / C ${target.carbs} / F ${target.fat} / Water ${target.waterOz}`,
        `Adherence is based on avg % deviation from targets (lower deviation = higher score).`
      ];
      if ($("nutExplain")) $("nutExplain").textContent = explain.join("\n");
    };

    ["nutProt","nutCarb","nutFat","nutWater"].forEach((id) => $(id)?.addEventListener("input", updateNutComputed));
    updateNutComputed();

    $("btnSaveNutrition")?.addEventListener("click", () => {
      const athleteId = $("nutAthlete")?.value || aid;
      const d = safeISO($("nutDate")?.value) || todayISO();

      const totals = {
        protein: clamp(toNum($("nutProt")?.value, 0), 0, 500),
        carbs: clamp(toNum($("nutCarb")?.value, 0), 0, 1000),
        fat: clamp(toNum($("nutFat")?.value, 0), 0, 400),
        waterOz: clamp(toNum($("nutWater")?.value, 0), 0, 300)
      };
      const adherence = computeNut(athleteId, totals);

      upsertNutrition(athleteId, {
        dateISO: d,
        ...totals,
        notes: String($("nutNotes")?.value || "").trim(),
        adherence
      });

      if ($("nutNotes")) $("nutNotes").value = "";
      renderNutritionList(athleteId);
      renderDashboard();
    });

    // Quick meal builder adds to today's totals
    $("btnQuickMeal")?.addEventListener("click", () => {
      const athleteId = $("nutAthlete")?.value || aid;
      const d = safeISO($("nutDate")?.value) || todayISO();

      const existing = getNutritionRowByDate(athleteId, d) || {
        dateISO: d, protein: 0, carbs: 0, fat: 0, waterOz: 0, notes: "", adherence: 0
      };

      const add = {
        protein: clamp(toNum($("qmProt")?.value, 0), 0, 200),
        carbs: clamp(toNum($("qmCarb")?.value, 0), 0, 300),
        fat: clamp(toNum($("qmFat")?.value, 0), 0, 150),
        waterOz: clamp(toNum($("qmWater")?.value, 0), 0, 80)
      };

      const totals = {
        protein: clamp(toNum(existing.protein, 0) + add.protein, 0, 500),
        carbs: clamp(toNum(existing.carbs, 0) + add.carbs, 0, 1000),
        fat: clamp(toNum(existing.fat, 0) + add.fat, 0, 400),
        waterOz: clamp(toNum(existing.waterOz, 0) + add.waterOz, 0, 300)
      };

      const adherence = calcNutritionAdherence(totals, ensureTargetsForAthlete(athleteId));

      upsertNutrition(athleteId, {
        dateISO: d,
        ...totals,
        notes: existing.notes || "",
        adherence
      });

      // reflect in inputs
      if ($("nutProt")) $("nutProt").value = totals.protein;
      if ($("nutCarb")) $("nutCarb").value = totals.carbs;
      if ($("nutFat")) $("nutFat").value = totals.fat;
      if ($("nutWater")) $("nutWater").value = totals.waterOz;
      updateNutComputed();
      renderNutritionList(athleteId);
    });

    // Meal plan generator output (uses nutritionEngine if present, else fallback generator)
    $("btnGenerateMealPlan")?.addEventListener("click", () => {
      const athleteId = $("mealAthlete")?.value || aid;
      const start = safeISO($("mealStart")?.value) || todayISO();
      const days = clamp(toNum($("mealDays")?.value, 7), 1, 21);
      const dayType = String($("mealDayType")?.value || "training");
      const diet = String($("mealDiet")?.value || "standard");

      const target = ensureTargetsForAthlete(athleteId);

      if (window.nutritionEngine && typeof window.nutritionEngine.generateMultiDayPlan === "function") {
        const plan = window.nutritionEngine.generateMultiDayPlan({ target, startISO: start, days, dayType, diet });
        if ($("mealPlanOut")) $("mealPlanOut").innerHTML = plan?.html || `<div class="muted small">No plan output.</div>`;
        return;
      }

      // fallback
      const lines = [];
      for (let i = 0; i < days; i++) {
        const d = addDaysISO(start, i);
        const isWeekend = [0,6].includes(new Date(Date.parse(d)).getUTCDay());
        const type = (dayType === "auto") ? (isWeekend ? "rest" : "training") : dayType;
        const bump = (type === "game") ? 1.12 : (type === "training") ? 1.08 : (type === "recovery") ? 0.95 : 0.9;

        const p = Math.round(target.protein * (diet === "highprotein" ? 1.08 : 1.0));
        const c = Math.round(target.carbs * bump * (diet === "lowerfat" ? 1.05 : 1.0));
        const f = Math.round(target.fat * (diet === "lowerfat" ? 0.85 : 1.0));
        const w = target.waterOz;

        lines.push(
          `<div class="planDay">
            <div class="row gap wrap">
              <span class="pill">${escHTML(d)}</span>
              <span class="pill ghost">${escHTML(type)}</span>
              <span class="pill">P ${p} • C ${c} • F ${f} • W ${w}oz</span>
            </div>
            <div class="small muted" style="margin-top:6px">
              Breakfast: protein + carbs • Lunch: balanced bowl • Pre: quick carbs • Post: protein + carbs • Dinner: lean protein + veg
            </div>
          </div>`
        );
      }
      if ($("mealPlanOut")) $("mealPlanOut").innerHTML = lines.join("");
    });

    $("nutAthlete")?.addEventListener("change", renderNutrition);
    $("targetAthlete")?.addEventListener("change", renderNutrition);
    $("mealAthlete")?.addEventListener("change", renderNutrition);

    renderNutritionList(aid);
  }

  // -------------------------
  // Periodization view
  // -------------------------
  function renderPlanList(athleteId) {
    const list = $("planList");
    if (!list) return;

    const plan = state.periodization[athleteId];
    if (!plan?.weeksPlan?.length) {
      list.innerHTML = `<div class="item"><div class="muted small">No plan yet. Use Generate above.</div></div>`;
      return;
    }

    list.innerHTML = plan.weeksPlan.map((w) => {
      const sessLines = (w.sessions || []).map((s) => {
        const load = Math.round(toNum(s.minutes, 0) * toNum(s.rpe, 0));
        return `<div class="small mono">- ${escHTML(s.day)}: ${escHTML(s.type)} • ${escHTML(s.minutes)}m • RPE ${escHTML(s.rpe)} • Load ${escHTML(load)}</div>`;
      }).join("");

      return `
        <div class="item">
          <div class="grow">
            <div class="row gap wrap">
              <b>Week ${escHTML(w.week)}</b>
              <span class="pill">${escHTML(w.weekStartISO)}</span>
              ${w.deload ? `<span class="pill danger">Deload</span>` : `<span class="pill ghost">Build</span>`}
              <span class="pill">Target load ${escHTML(w.targetLoad)}</span>
            </div>
            <div style="margin-top:8px">${sessLines}</div>
          </div>
          <button class="btn ghost" data-copy-week="${escHTML(w.weekStartISO)}">Use in Workouts</button>
        </div>
      `;
    }).join("");

    qa("button[data-copy-week]", list).forEach((b) => {
      b.addEventListener("click", () => {
        const ws = b.getAttribute("data-copy-week");
        if ($("workoutAthlete")) $("workoutAthlete").value = athleteId;
        if ($("workoutWeekStart")) $("workoutWeekStart").value = ws;
        if ($("workoutSource")) $("workoutSource").value = "periodization";
        showView("workouts");
      });
    });
  }

  function renderPeriodization() {
    fillAthleteSelectsAll();
    const athletes = getAthletes();
    const aid = $("perAthlete")?.value || athletes[0]?.id || "";
    if (!aid) return;

    if ($("perStart") && !safeISO($("perStart").value)) $("perStart").value = mondayOf(todayISO());
    if ($("monWeek") && !safeISO($("monWeek").value)) $("monWeek").value = mondayOf(todayISO());

    $("btnGeneratePlan")?.addEventListener("click", () => {
      const athleteId = $("perAthlete")?.value || aid;
      const start = mondayOf($("perStart")?.value || todayISO());
      const weeks = clamp(toNum($("perWeeks")?.value, 8), 2, 24);
      const goal = String($("perGoal")?.value || "inseason");
      const deloadEvery = clamp(toNum($("perDeload")?.value, 4), 3, 6);

      generatePeriodizationPlan({ athleteId, startISO: start, weeks, goal, deloadEvery });
      renderPlanList(athleteId);
      alert("Generated plan.");
    });

    $("btnCompareWeek")?.addEventListener("click", () => {
      const athleteId = $("monAthlete")?.value || aid;
      const weekStart = mondayOf($("monWeek")?.value || todayISO());
      const plan = state.periodization[athleteId] || null;

      const planned = plannedLoadForWeek(plan, weekStart);
      const actual = actualLoadForWeek(getTraining(athleteId), weekStart);
      const diff = planned ? Math.round(((actual - planned) / planned) * 100) : null;

      if ($("compareSummary")) {
        $("compareSummary").textContent =
          `Week ${weekStart} • Planned ${planned || "—"} vs Actual ${actual} ${diff === null ? "" : `(${diff >= 0 ? "+" : ""}${diff}%)`}`;
      }

      if ($("compareDetail")) {
        const end = addDaysISO(weekStart, 6);
        const sessions = getTraining(athleteId).filter((s) => s.dateISO >= weekStart && s.dateISO <= end);
        const lines = [];
        lines.push(`Sessions logged (${sessions.length})`);
        sessions.forEach((s) => lines.push(`- ${s.dateISO}: ${s.type} • ${s.minutes}m • RPE ${s.rpe} • Load ${Math.round(sessionLoad(s))}`));
        $("compareDetail").textContent = lines.join("\n");
      }
    });

    $("perAthlete")?.addEventListener("change", () => { renderPlanList($("perAthlete").value); });
    $("monAthlete")?.addEventListener("change", () => { /* no-op */ });

    renderPlanList(aid);
  }

  // -------------------------
  // Workouts view (full)
  // -------------------------
  function renderWorkoutPerMeta(athleteId, weekStartISO) {
    const el = $("workoutPerMeta");
    if (!el) return;

    const plan = state.periodization[athleteId] || null;
    const ws = mondayOf(weekStartISO);

    if (!plan?.weeksPlan?.length) {
      el.textContent = "No periodization plan found for this athlete.\n(Workouts will use template unless you generate a plan.)";
      return;
    }

    const wk = plan.weeksPlan.find((w) => w.weekStartISO === ws) || null;
    if (!wk) {
      el.textContent =
        `Periodization exists.\nStart: ${plan.startISO}\nWeeks: ${plan.weeks}\nGoal: ${plan.goal}\n\nNo matching week found for ${ws}.`;
      return;
    }

    el.textContent =
      `Plan found.\nGoal: ${plan.goal}\nWeek ${wk.week}${wk.deload ? " (DELOAD)" : ""}\nWeek start: ${wk.weekStartISO}\nTarget load: ${wk.targetLoad}\nUpdated: ${wk.updatedAtMs ? new Date(wk.updatedAtMs).toLocaleString() : "—"}`;
  }

  function renderWorkoutLoadPreview(athleteId) {
    const el = $("workoutLoadPreview");
    if (!el) return;

    const bw = state.workouts.builtWeeks[athleteId] || null;
    if (!bw?.sessions?.length) {
      el.textContent = "Build a week to preview planned load vs actual.";
      return;
    }

    const weekStart = mondayOf(bw.weekStartISO);
    const weekEnd = addDaysISO(weekStart, 6);

    const builtPlanned = bw.sessions.reduce((acc, s) => acc + Math.round(toNum(s.minutes, 0) * toNum(s.rpe, 0)), 0);
    const actual = sumLoads(getTraining(athleteId), weekStart, weekEnd);

    const plan = state.periodization[athleteId] || null;
    const plannedFromPeriodization = plannedLoadForWeek(plan, weekStart) || 0;

    const refPlanned = plannedFromPeriodization || builtPlanned;
    const diff = refPlanned ? Math.round(((actual - refPlanned) / refPlanned) * 100) : null;

    el.textContent =
      `Week: ${weekStart} → ${weekEnd}\n` +
      `Workouts built load: ${builtPlanned}\n` +
      `Periodization target: ${plannedFromPeriodization || "—"}\n` +
      `Actual logged load: ${actual}\n` +
      (diff === null ? "" : `Difference vs plan: ${diff >= 0 ? "+" : ""}${diff}%`);
  }

  function renderWorkoutRiskPreview(athleteId) {
    const el = $("workoutRiskPreview");
    if (!el) return;

    const bw = state.workouts.builtWeeks[athleteId] || null;
    if (!bw?.sessions?.length) {
      el.textContent = "Build a week to preview risk.";
      return;
    }

    const weekStart = mondayOf(bw.weekStartISO);
    const weekEnd = addDaysISO(weekStart, 6);

    const current = getTraining(athleteId);
    const proposed = bw.sessions.map((s) => ({
      id: "proposed",
      dateISO: safeISO(s.dateISO) || weekStart,
      minutes: clamp(toNum(s.minutes, 0), 0, 600),
      rpe: clamp(toNum(s.rpe, 0), 0, 10),
      type: String(s.type || "practice"),
      notes: String(s.notes || "")
    }));

    const combined = current.concat(proposed);
    const meta = workloadRiskIndex(combined, weekEnd);

    el.textContent =
      `As-of ${weekEnd} (simulated with proposed sessions):\n` +
      `ACWR: ${meta.acwr ?? "—"}\n` +
      `Monotony: ${meta.monotony}\n` +
      `Strain: ${meta.strain}\n` +
      `Risk index: ${meta.index}`;
  }

  function renderWorkoutWeekEditor(athleteId) {
    const out = $("workoutWeekOut");
    if (!out) return;

    const bw = state.workouts.builtWeeks[athleteId] || null;
    if (!bw?.sessions?.length) {
      out.innerHTML = `<div class="small muted">No week built yet. Click “Build Week”.</div>`;
      return;
    }

    const typeOptions = ["practice", "lift", "skills", "conditioning", "game", "recovery"];

    const rows = bw.sessions
      .slice()
      .sort((a, b) => String(a.dateISO).localeCompare(String(b.dateISO)))
      .map((s, idx) => {
        const load = Math.round(toNum(s.minutes, 0) * toNum(s.rpe, 0));
        const typeSel = `
          <select data-wtype="${idx}">
            ${typeOptions.map((t) => `<option value="${t}" ${String(s.type) === t ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        `;
        return `
          <div class="item workoutItem">
            <div class="grow">
              <div class="row gap wrap">
                <span class="pill">${escHTML(s.dateISO)}</span>
                <span class="pill ghost">${escHTML(s.day || "")}</span>
                <span class="pill">${escHTML(s.title || "Session")}</span>
              </div>
              <div class="small muted" style="margin-top:6px">Type: ${typeSel}</div>
              <div class="small muted" style="margin-top:6px">
                <input data-wnotes="${idx}" placeholder="notes…" value="${escHTML(s.notes || "")}" style="width:100%" />
              </div>
            </div>

            <div class="row gap wrap">
              <div class="field" style="min-width:120px">
                <label>Minutes</label>
                <input type="number" min="0" max="600" value="${escHTML(s.minutes)}" data-wmin="${idx}">
              </div>
              <div class="field" style="min-width:120px">
                <label>sRPE</label>
                <input type="number" min="0" max="10" step="1" value="${escHTML(s.rpe)}" data-wrpe="${idx}">
              </div>
              <div class="field" style="min-width:140px">
                <label>Load</label>
                <input value="${escHTML(load)}" disabled>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    out.innerHTML = rows;

    qa("input[data-wmin]").forEach((inp) => {
      inp.addEventListener("input", () => {
        const i = Number(inp.getAttribute("data-wmin"));
        const v = clamp(toNum(inp.value, 0), 0, 600);
        const bw2 = state.workouts.builtWeeks[athleteId];
        if (!bw2?.sessions?.[i]) return;
        bw2.sessions[i].minutes = v;
        bw2.updatedAtMs = Date.now();
        saveState();
        renderWorkoutWeekEditor(athleteId);
        renderWorkoutLoadPreview(athleteId);
        renderWorkoutRiskPreview(athleteId);
      });
    });

    qa("input[data-wrpe]").forEach((inp) => {
      inp.addEventListener("input", () => {
        const i = Number(inp.getAttribute("data-wrpe"));
        const v = clamp(toNum(inp.value, 0), 0, 10);
        const bw2 = state.workouts.builtWeeks[athleteId];
        if (!bw2?.sessions?.[i]) return;
        bw2.sessions[i].rpe = v;
        bw2.updatedAtMs = Date.now();
        saveState();
        renderWorkoutWeekEditor(athleteId);
        renderWorkoutLoadPreview(athleteId);
        renderWorkoutRiskPreview(athleteId);
      });
    });

    qa("select[data-wtype]").forEach((sel) => {
      sel.addEventListener("change", () => {
        const i = Number(sel.getAttribute("data-wtype"));
        const v = String(sel.value || "practice");
        const bw2 = state.workouts.builtWeeks[athleteId];
        if (!bw2?.sessions?.[i]) return;
        bw2.sessions[i].type = v;
        bw2.updatedAtMs = Date.now();
        saveState();
        renderWorkoutLoadPreview(athleteId);
        renderWorkoutRiskPreview(athleteId);
      });
    });

    qa("input[data-wnotes]").forEach((inp) => {
      inp.addEventListener("input", () => {
        const i = Number(inp.getAttribute("data-wnotes"));
        const v = String(inp.value || "");
        const bw2 = state.workouts.builtWeeks[athleteId];
        if (!bw2?.sessions?.[i]) return;
        bw2.sessions[i].notes = v;
        bw2.updatedAtMs = Date.now();
        saveState();
      });
    });
  }

  function renderWorkouts() {
    fillAthleteSelectsAll();

    const athletes = getAthletes();
    const athleteId = $("workoutAthlete")?.value || (athletes[0]?.id || "");
    if (!athleteId) {
      if ($("workoutWeekOut")) $("workoutWeekOut").innerHTML = `<div class="small muted">Add athletes in Team tab.</div>`;
      if ($("workoutPerMeta")) $("workoutPerMeta").textContent = "—";
      if ($("workoutLoadPreview")) $("workoutLoadPreview").textContent = "—";
      if ($("workoutRiskPreview")) $("workoutRiskPreview").textContent = "—";
      return;
    }

    const prefs = defaultWorkoutPrefs(athleteId);

    if ($("workoutMode")) $("workoutMode").value = prefs.mode || "standard";
    if ($("workoutSource")) $("workoutSource").value = prefs.source || "auto";
    if ($("advIntensity")) $("advIntensity").value = prefs.advIntensity || "0.05";
    if ($("advPowerPair")) $("advPowerPair").value = prefs.advPowerPair || "yes";

    const weekStartEl = $("workoutWeekStart");
    if (weekStartEl && !safeISO(weekStartEl.value)) weekStartEl.value = mondayOf(todayISO());
    const weekStart = mondayOf(weekStartEl?.value || todayISO());

    if ($("advExplain")) {
      $("advExplain").textContent =
        `Advanced mode bumps intensity and can add a power pairing note.\n` +
        `You still control final minutes/RPE per session before write-back or pushing to log.`;
    }

    renderWorkoutPerMeta(athleteId, weekStart);
    renderWorkoutWeekEditor(athleteId);
    renderWorkoutLoadPreview(athleteId);
    renderWorkoutRiskPreview(athleteId);

    function savePrefsFromUI() {
      const p = defaultWorkoutPrefs(athleteId);
      p.mode = String($("workoutMode")?.value || "standard");
      p.source = String($("workoutSource")?.value || "auto");
      p.advIntensity = String($("advIntensity")?.value || "0.05");
      p.advPowerPair = String($("advPowerPair")?.value || "yes");
      saveState();
      if ($("workoutNote")) $("workoutNote").textContent = `Saved preferences for this athlete (${p.mode}, source: ${p.source}).`;
    }

    $("btnSaveWorkoutPrefs")?.addEventListener("click", () => {
      savePrefsFromUI();
      renderWorkouts();
    });

    $("btnBuildWorkoutWeek")?.addEventListener("click", () => {
      savePrefsFromUI();
      const p = defaultWorkoutPrefs(athleteId);
      const ws = mondayOf($("workoutWeekStart")?.value || todayISO());
      buildWorkoutWeek(athleteId, ws, p);
      if ($("workoutNote")) $("workoutNote").textContent = `Built week starting ${ws}. Edit sessions → write-back or push to log.`;
      renderWorkouts();
    });

    // Risk Guardrails before push
    $("btnPushWeekToLog")?.addEventListener("click", () => {
      const bw = state.workouts.builtWeeks[athleteId] || null;
      if (!bw?.sessions?.length) return alert("Build a week first.");

      const weekStart2 = mondayOf(bw.weekStartISO);
      const weekEnd = addDaysISO(weekStart2, 6);

      const current = getTraining(athleteId);
      const proposed = bw.sessions.map((s) => ({
        id: "proposed",
        dateISO: safeISO(s.dateISO) || weekStart2,
        minutes: clamp(toNum(s.minutes, 0), 0, 600),
        rpe: clamp(toNum(s.rpe, 0), 0, 10),
        type: String(s.type || "practice"),
        notes: String(s.notes || "")
      }));

      const meta = workloadRiskIndex(current.concat(proposed), weekEnd);

      const spike = (meta.acwr !== null && meta.acwr > 1.5) || meta.index >= 70;
      const msg =
        `About to push this week into Training Log.\n\n` +
        `Simulated as-of ${weekEnd}:\n` +
        `ACWR: ${meta.acwr ?? "—"}\n` +
        `Risk index: ${meta.index}\n` +
        `Monotony: ${meta.monotony}\n` +
        `Strain: ${meta.strain}\n\n` +
        (spike ? `⚠️ Warning: potential workload spike.\n\nProceed anyway?` : `Proceed?`);

      if (!confirm(msg)) return;

      try {
        pushWorkoutWeekToLog(athleteId, bw);
        alert("Pushed into Training Log.");
        renderLog();
        renderDashboard();
        renderWorkouts();
      } catch (e) {
        alert("Push failed: " + (e?.message || e));
      }
    });

    // WRITE-BACK button
    $("btnWriteBackToPeriodization")?.addEventListener("click", () => {
      try {
        const wk = writeBackToPeriodization(athleteId);
        if ($("workoutNote")) $("workoutNote").textContent = `Write-back complete: updated Periodization week starting ${wk.weekStartISO}.`;
        renderPeriodization();
        renderWorkouts();
      } catch (e) {
        alert("Write-back failed: " + (e?.message || e));
      }
    });

    $("workoutAthlete")?.addEventListener("change", renderWorkouts);
    $("workoutMode")?.addEventListener("change", () => { savePrefsFromUI(); renderWorkouts(); });
    $("workoutSource")?.addEventListener("change", () => { savePrefsFromUI(); renderWorkouts(); });
    $("workoutWeekStart")?.addEventListener("change", () => {
      const ws = mondayOf($("workoutWeekStart")?.value || todayISO());
      renderWorkoutPerMeta(athleteId, ws);
      renderWorkoutLoadPreview(athleteId);
      renderWorkoutRiskPreview(athleteId);
    });
    $("advIntensity")?.addEventListener("change", () => { savePrefsFromUI(); renderWorkouts(); });
    $("advPowerPair")?.addEventListener("change", () => { savePrefsFromUI(); renderWorkouts(); });
  }

  // -------------------------
  // Settings
  // -------------------------
  function renderSettings() {
    applyRoleUI();

    if ($("roleSelect")) $("roleSelect").value = getRole();

    $("btnSaveRole")?.addEventListener("click", () => {
      const v = String($("roleSelect")?.value || "coach");
      state.meta.role = (v === "athlete") ? "athlete" : "coach";
      saveState();
      applyRoleUI();
      if ($("roleNote")) $("roleNote").textContent = `Saved role: ${state.meta.role}`;
      showView("dashboard");
    });

    const info = $("appInfo");
    if (info) {
      info.textContent =
        `PerformanceIQ v${APP_VERSION}\n` +
        `Role: ${getRole()}\n` +
        `Elite Nutrition: ${eliteNutritionEnabled() ? "ON" : "OFF"}\n` +
        `LocalStorage key: ${STORAGE_KEY}\n` +
        `Updated: ${new Date(state.meta.updatedAtMs || Date.now()).toLocaleString()}\n` +
        `Athletes: ${state.athletes.length}`;
    }

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
    if (!confirm("Seed demo data? This will merge into your current state.")) return;

    if (!state.athletes.length) {
      const a1 = { id: uid("ath"), name: "Jordan Smith", position: "PG", heightIn: 70, weightLb: 155 };
      const a2 = { id: uid("ath"), name: "Cam Johnson", position: "SG", heightIn: 72, weightLb: 165 };
      state.athletes.push(a1, a2);
      [a1, a2].forEach((a) => {
        ensureTargetsForAthlete(a.id);
        defaultWorkoutPrefs(a.id);
      });
    }

    // enable elite nutrition for demo
    state.meta.entitlements.eliteNutrition = true;

    // seed periodization for first athlete
    const first = state.athletes[0];
    if (first && !state.periodization[first.id]) {
      generatePeriodizationPlan({ athleteId: first.id, startISO: mondayOf(todayISO()), weeks: 8, goal: "inseason", deloadEvery: 4 });
    }

    // seed some training logs
    const aid = first?.id;
    if (aid) {
      const start = addDaysISO(todayISO(), -10);
      for (let i = 0; i < 10; i++) {
        const d = addDaysISO(start, i);
        addTrainingSession(aid, {
          id: uid("sess"),
          dateISO: d,
          minutes: 60,
          rpe: (i % 3 === 0) ? 7 : 6,
          type: (i % 4 === 0) ? "lift" : "practice",
          notes: "Demo session",
          load: 60 * ((i % 3 === 0) ? 7 : 6)
        });
      }
    }

    saveState();
    alert("Seeded demo data.");
    fillAthleteSelectsAll();
    applyRoleUI();
    showView("dashboard");
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
        applyRoleUI();
        fillAthleteSelectsAll();
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
    hideSplash();
    applyRoleUI();
    wireNav();

    $("btnSeed")?.addEventListener("click", seedDemo);
    $("btnExport")?.addEventListener("click", exportJSON);

    $("fileImport")?.addEventListener("change", (e) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      importJSON(file);
      e.target.value = "";
    });

    fillAthleteSelectsAll();

    // default view
    showView("dashboard");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
