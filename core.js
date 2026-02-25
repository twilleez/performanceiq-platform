// core.js — v2.3.0 (FULL FILE) — Offline-first • Role-based views • Athlete can see Nutrition + Periodization
// Self-contained app logic for your current index.html structure.
//
// Roles:
// - athlete: can use Dashboard, Log, Nutrition, Periodization, Settings (no Team management)
// - coach/admin: full access
//
// NOTE: Client-only role gating. True security requires backend auth + RLS.

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
  const clamp = (n, a, b) => Math.min(Math.max(Number(n) || 0, a), b);

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
      meta: { version: 1, updatedAtMs: now, appVersion: APP_VERSION },
      auth: {
        role: "coach",          // athlete | coach | admin
        coachPin: ""            // optional gate for switching into coach/admin
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
        training: {},  // training[athleteId] -> array of sessions
        readiness: {}, // readiness[athleteId] -> array of daily check-ins
        nutrition: {}  // nutrition[athleteId] -> array of daily nutrition logs
      },
      targets: {},        // targets[athleteId] = {protein, carbs, fat, waterOz}
      periodization: {},  // periodization[athleteId] = plan
      nutritionPlans: {}  // nutritionPlans[athleteId] = generated meal plan object
    };
  }

  function normalizeState(s) {
    const d = defaultState();
    if (!s || typeof s !== "object") return d;

    s.meta = s.meta && typeof s.meta === "object" ? s.meta : d.meta;

    s.auth = s.auth && typeof s.auth === "object" ? s.auth : d.auth;
    s.auth.role = ["athlete", "coach", "admin"].includes(s.auth.role) ? s.auth.role : "coach";
    s.auth.coachPin = typeof s.auth.coachPin === "string" ? s.auth.coachPin : "";

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
    s.nutritionPlans = s.nutritionPlans && typeof s.nutritionPlans === "object" ? s.nutritionPlans : {};

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

  // Expose bridge for add-ons (nutritionEngine.js, etc.)
  window.PIQ = window.PIQ || {};
  window.PIQ.getState = () => state;
  window.PIQ.saveState = () => saveState();

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
  window.hideSplashNow = hideSplash;

  // -------------------------
  // Role gating (workflow)
  // -------------------------
  const ROLE = () => state.auth?.role || "coach";
  const canManageTeam = () => ROLE() === "coach" || ROLE() === "admin";

  function applyRoleUI() {
    // Nav gating: athlete cannot see Team tab (but CAN see nutrition+periodization)
    qa(".navbtn").forEach((btn) => {
      const v = btn.getAttribute("data-view");
      if (!v) return;

      if (v === "team") {
        btn.style.display = canManageTeam() ? "" : "none";
      } else {
        btn.style.display = "";
      }
    });

    // Team view itself
    const teamView = $("view-team");
    if (teamView) teamView.hidden = !canManageTeam() && currentView === "team";

    // Pill: role label
    const pill = $("activeTeamPill");
    if (pill) pill.title = `Active role: ${ROLE()}`;
  }

  // -------------------------
  // View switching
  // -------------------------
  const VIEWS = ["dashboard", "team", "log", "nutrition", "periodization", "settings"];
  let currentView = "dashboard";

  function showView(name) {
    let view = String(name || "dashboard");
    if (!VIEWS.includes(view)) view = "dashboard";

    // athlete cannot open team
    if (view === "team" && !canManageTeam()) view = "dashboard";

    currentView = view;

    VIEWS.forEach((v) => {
      const el = $(`view-${v}`);
      if (!el) return;
      el.hidden = v !== view;
    });

    qa(".navbtn").forEach((b) => {
      const v = b.getAttribute("data-view");
      b.classList.toggle("active", v === view);
    });

    applyRoleUI();

    // Render target view
    if (view === "dashboard") renderDashboard();
    if (view === "team") renderTeam();
    if (view === "log") renderLog();
    if (view === "nutrition") renderNutrition();
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
  // Athlete helpers
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
    selectEl.innerHTML = athletes.map((a) => `<option value="${escHTML(a.id)}">${escHTML(athleteLabel(a))}</option>`).join("");
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
    const score = 100 - dev * 100;
    return clamp(Math.round(score), 0, 100);
  }

  function sessionLoad(sess) {
    return clamp(toNum(sess.minutes, 0) * toNum(sess.rpe, 0), 0, 6000);
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

  function sumLoads(trainingSessions, fromISO, toISOInclusive) {
    const f = safeISO(fromISO);
    const t = safeISO(toISOInclusive);
    if (!f || !t) return 0;
    return (trainingSessions || [])
      .filter((s) => s && safeISO(s.dateISO) && s.dateISO >= f && s.dateISO <= t)
      .reduce((acc, s) => acc + sessionLoad(s), 0);
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
    if (w.strain >= 12000) flags.push("High training strain");
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
  // Heatmap styles
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
      .heattable td, .heattable th { text-align:center; padding:8px; }
      .heattable td { cursor:pointer; user-select:none; border:1px solid rgba(255,255,255,.06); }
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
        { day: "Mon", minutes: 60, rpe: isDeload ? 5 : 6 },
        { day: "Tue", minutes: 75, rpe: isDeload ? 5 : 7 },
        { day: "Thu", minutes: 60, rpe: isDeload ? 4 : 6 },
        { day: "Sat", minutes: 75, rpe: isDeload ? 5 : 7 }
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
    const wk = plan?.weeksPlan?.find((w) => w.weekStartISO === weekStartISO);
    return wk ? (wk.targetLoad || 0) : 0;
  }

  function actualLoadForWeek(trainingSessions, weekStartISO) {
    const start = safeISO(weekStartISO);
    if (!start) return 0;
    const end = addDaysISO(start, 6);
    return sumLoads(trainingSessions, start, end);
  }

  // -------------------------
  // Elite Meal Plan Generator (inside core.js)
  // -------------------------
  function splitMacrosByDayType(targets, dayType) {
    const p = targets.protein;
    const f = targets.fat;
    const c = targets.carbs;

    let carbMult = 1.0;
    if (dayType === "recovery") carbMult = 0.80;
    if (dayType === "game") carbMult = 1.15;

    const cAdj = Math.round(c * carbMult);

    const meals = [
      { name: "Breakfast", p: 0.25, c: 0.22, f: 0.25 },
      { name: "Lunch", p: 0.25, c: 0.26, f: 0.25 },
      { name: "Pre-session / Snack", p: 0.15, c: 0.22, f: 0.10 },
      { name: "Post-session", p: 0.15, c: 0.22, f: 0.10 },
      { name: "Dinner", p: 0.20, c: 0.08, f: 0.30 }
    ];

    const plan = meals.map((m) => ({
      name: m.name,
      protein: Math.round(p * m.p),
      carbs: Math.round(cAdj * m.c),
      fat: Math.round(f * m.f)
    }));

    const sum = (k) => plan.reduce((s, x) => s + (x[k] || 0), 0);
    plan[0].protein += (p - sum("protein"));
    plan[0].carbs += (cAdj - sum("carbs"));
    plan[0].fat += (f - sum("fat"));

    const microFocus =
      dayType === "game"
        ? "Micronutrient focus: sodium + potassium (sweat), vitamin C foods, easy-to-digest carbs."
        : dayType === "recovery"
        ? "Micronutrient focus: omega-3 foods, magnesium-rich foods, colorful fruit/veg for antioxidants."
        : "Micronutrient focus: iron + B-vitamins, calcium + vitamin D, hydrate consistently.";

    const timing =
      dayType === "game"
        ? "Timing: carb-forward earlier; avoid heavy fats close to game."
        : dayType === "recovery"
        ? "Timing: steady protein across meals; carbs moderate; prioritize sleep support."
        : "Timing: place carbs around training; protein evenly spaced.";

    return { dayType, targets: { ...targets, carbs: cAdj }, meals: plan, microFocus, timing };
  }

  function buildFoodSuggestions(meal, dayType) {
    const p = meal.protein, c = meal.carbs, f = meal.fat;
    const easy = dayType === "game" ? " (game-day lighter fiber)" : "";
    return [
      `Option A: Lean protein + carbs + fruit/veg${easy} (aim ~P${p}/C${c}/F${f})`,
      `Option B: Bowl: rice/potatoes/pasta + chicken/turkey/fish + olive oil/avocado`,
      `Option C: Greek yogurt + oats + berries + nut butter (adjust portions)`
    ];
  }

  function generateMealPlan(athleteId, startISO, days, dayType) {
    const start = safeISO(startISO) || todayISO();
    const nDays = clamp(days, 1, 21);
    const t = ensureTargetsForAthlete(athleteId);

    const out = [];
    for (let i = 0; i < nDays; i++) {
      const d = addDaysISO(start, i);
      const dt = ["training", "game", "recovery"].includes(dayType) ? dayType : "training";
      const split = splitMacrosByDayType(t, dt);

      out.push({
        dateISO: d,
        dayType: split.dayType,
        targets: split.targets,
        microFocus: split.microFocus,
        timing: split.timing,
        meals: split.meals
      });
    }

    state.nutritionPlans[String(athleteId)] = {
      athleteId: String(athleteId),
      startISO: start,
      days: nDays,
      dayType: dayType || "training",
      createdAtMs: Date.now(),
      plan: out
    };
    saveState();
    return state.nutritionPlans[String(athleteId)];
  }

  function renderMealPlan(planObj, mountEl) {
    if (!mountEl) return;
    if (!planObj?.plan?.length) {
      mountEl.innerHTML = `<div class="small muted">No plan generated yet.</div>`;
      return;
    }

    mountEl.innerHTML = planObj.plan.map((day) => {
      const mealLines = day.meals.map((m) => {
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
            <div style="font-weight:800">${escHTML(day.dateISO)} • ${escHTML(String(day.dayType).toUpperCase())}</div>
            <div class="small muted">Targets: P${escHTML(day.targets.protein)} / C${escHTML(day.targets.carbs)} / F${escHTML(day.targets.fat)} • Water ${escHTML(day.targets.waterOz)}oz</div>
          </div>
          <div class="small muted" style="margin-top:6px">${escHTML(day.timing || "")}</div>
          <div class="small muted" style="margin-top:6px">${escHTML(day.microFocus || "")}</div>
          <div style="margin-top:10px">${mealLines}</div>
        </div>
      `;
    }).join("");
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
        $("piqBand").textContent = canManageTeam() ? "Add athletes in Team tab" : "Ask coach to add you to roster";
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
        $("riskSummary").textContent = canManageTeam() ? "Add athletes in Team tab" : "Ask coach to add you to roster";
        return;
      }
      const r = runRiskDetection(athleteId, dateISO);

      $("riskSummary").textContent =
        `${r.headline} • Risk index ${r.index}/100 • ${r.flags.length ? r.flags.join(", ") : "No major flags"}`;

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
            val = clamp(runRiskDetection(a.id, d).index, 0, 100);
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
    updateRisk();
  }

  // -------------------------
  // Render: Team (coach/admin only)
  // -------------------------
  function renderTeam() {
    if (!canManageTeam()) {
      // Safety: if athlete somehow lands here
      showView("dashboard");
      return;
    }

    const pill = $("activeTeamPill");
    if (pill) pill.textContent = `Team: ${state.team?.name || "Default"} • Role: ${ROLE()}`;

    const list = $("rosterList");
    const athletes = getAthletes();
    if (list) {
      if (!athletes.length) {
        list.innerHTML = `<div class="muted small">No athletes yet. Add one above or click “Seed Demo”.</div>`;
      } else {
        list.innerHTML = athletes
          .map((a) => {
            const t = ensureTargetsForAthlete(a.id);
            return `
              <div class="item">
                <div>
                  <div><b>${escHTML(a.name || "—")}</b> <span class="muted small">${escHTML(a.position || "")}</span></div>
                  <div class="muted small">Ht: ${escHTML(a.heightIn ?? "—")} in • Wt: ${escHTML(a.weightLb ?? "—")} lb</div>
                  <div class="muted small">Targets: P ${escHTML(t.protein)} / C ${escHTML(t.carbs)} / F ${escHTML(t.fat)} • Water ${escHTML(t.waterOz)}oz</div>
                </div>
                <div class="row gap">
                  <button class="btn ghost" data-edit="${escHTML(a.id)}">Edit targets</button>
                  <button class="btn danger" data-del="${escHTML(a.id)}">Remove</button>
                </div>
              </div>
            `;
          })
          .join("");

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
            delete state.nutritionPlans[id];
            saveState();
            renderTeam();
            renderDashboard();
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

    // Add athlete
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
      renderTeam();
      renderDashboard();
      renderLog();
      renderNutrition();
      renderPeriodization();
    });

    // Team settings
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

    // Macro defaults
    if ($("defProt")) $("defProt").value = state.team.macroDefaults.protein;
    if ($("defCarb")) $("defCarb").value = state.team.macroDefaults.carbs;
    if ($("defFat")) $("defFat").value = state.team.macroDefaults.fat;

    $("btnSaveMacroDefaults")?.addEventListener("click", () => {
      state.team.macroDefaults.protein = clamp(toNum($("defProt")?.value, 160), 0, 400);
      state.team.macroDefaults.carbs = clamp(toNum($("defCarb")?.value, 240), 0, 800);
      state.team.macroDefaults.fat = clamp(toNum($("defFat")?.value, 70), 0, 300);
      saveState();
      alert("Saved macro defaults.");
    });

    // PIQ weights
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
    const readyAthleteId = $("readyAthlete")?.value || (athletes[0]?.id || "");

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
      if (!athleteId) return alert(canManageTeam() ? "Add athletes first (Team tab)." : "Ask coach to add you to roster.");

      const dateISO = safeISO($("logDate")?.value) || todayISO();
      const minutes = clamp(toNum($("logMin")?.value, 0), 0, 600);
      const rpe = clamp(toNum($("logRpe")?.value, 0), 0, 10);
      const type = String($("logType")?.value || "practice");
      const notes = ($("logNotes")?.value || "").trim();

      addTrainingSession(athleteId, {
        id: uid("sess"),
        dateISO,
        minutes,
        rpe,
        type,
        notes,
        load: Math.round(minutes * rpe)
      });

      $("logNotes").value = "";
      updateTrainingComputed();
      renderLog();
      renderDashboard();
    });

    const tList = $("trainingList");
    if (tList) {
      if (!logAthleteId) {
        tList.innerHTML = `<div class="muted small">${canManageTeam() ? "Add athletes in Team tab." : "Ask coach to add you to roster."}</div>`;
      } else {
        const sessions = getTraining(logAthleteId).slice(0, 20);
        tList.innerHTML = sessions.length
          ? sessions.map((s) => `
              <div class="item">
                <div>
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
      if (!athleteId) return alert(canManageTeam() ? "Add athletes first (Team tab)." : "Ask coach to add you to roster.");

      const dateISO = safeISO($("readyDate")?.value) || todayISO();
      upsertReadiness(athleteId, {
        dateISO,
        sleep: clamp(toNum($("readySleep")?.value, 0), 0, 16),
        soreness: clamp(toNum($("readySore")?.value, 0), 0, 10),
        stress: clamp(toNum($("readyStress")?.value, 0), 0, 10),
        energy: clamp(toNum($("readyEnergy")?.value, 0), 0, 10),
        injuryNote: ($("readyInjury")?.value || "").trim()
      });

      $("readyInjury").value = "";
      renderLog();
      renderDashboard();
    });

    const rList = $("readinessList");
    if (rList) {
      if (!readyAthleteId) {
        rList.innerHTML = `<div class="muted small">${canManageTeam() ? "Add athletes in Team tab." : "Ask coach to add you to roster."}</div>`;
      } else {
        const rows = getReadiness(readyAthleteId).slice().sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO))).slice(0, 14);
        rList.innerHTML = rows.length
          ? rows.map((r) => {
              const score = calcReadinessScore(r);
              return `
                <div class="item">
                  <div>
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
  // Render: Nutrition (athlete + coach/admin)
  // -------------------------
  function renderNutrition() {
    const athletes = getAthletes();
    fillAthleteSelect($("nutAthlete"), $("nutAthlete")?.value);
    fillAthleteSelect($("targetAthlete"), $("targetAthlete")?.value);

    if ($("nutDate") && !safeISO($("nutDate").value)) $("nutDate").value = todayISO();

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
        `Targets for this athlete:\nP ${t.protein} / C ${t.carbs} / F ${t.fat} • Water ${t.waterOz}oz`;
    }

    ["nutProt", "nutCarb", "nutFat", "nutWater"].forEach((id) => $(id)?.addEventListener("input", updateNutComputed));
    $("nutAthlete")?.addEventListener("change", () => { updateNutComputed(); renderNutrition(); });
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
      if (!a) return alert(canManageTeam() ? "Add athletes first (Team tab)." : "Ask coach to add you to roster.");
      const d = safeISO($("nutDate")?.value) || todayISO();

      upsertNutrition(a, {
        dateISO: d,
        protein: clamp(toNum($("nutProt")?.value, 0), 0, 500),
        carbs: clamp(toNum($("nutCarb")?.value, 0), 0, 1000),
        fat: clamp(toNum($("nutFat")?.value, 0), 0, 400),
        waterOz: clamp(toNum($("nutWater")?.value, 0), 0, 300),
        notes: ($("nutNotes")?.value || "").trim()
      });

      renderNutrition();
      renderDashboard();
      alert("Saved.");
    });

    $("btnQuickMeal")?.addEventListener("click", () => {
      const a = $("nutAthlete")?.value || "";
      if (!a) return alert(canManageTeam() ? "Add athletes first (Team tab)." : "Ask coach to add you to roster.");
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

    // Targets editing: athlete CAN edit their targets (top-tier workflow)
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

    // Meal plan generator wiring (Elite)
    $("btnGenerateMealPlan")?.addEventListener("click", () => {
      const a =
        $("mealAthlete")?.value ||
        $("nutAthlete")?.value ||
        $("targetAthlete")?.value ||
        "";

      const athleteIdResolved = a || (athletes[0]?.id || "");
      if (!athleteIdResolved) return alert(canManageTeam() ? "Add athletes first (Team tab)." : "Ask coach to add you to roster.");

      const start =
        safeISO($("mealStart")?.value) ||
        safeISO($("nutDate")?.value) ||
        todayISO();

      const days = clamp(toNum($("mealDays")?.value, 7), 1, 21);
      const dayType = String($("mealDayType")?.value || "training"); // training | game | recovery

      const planObj = generateMealPlan(athleteIdResolved, start, days, dayType);
      const out = $("mealPlanOut") || $("mealPlanList") || $("mealPlanOutput");
      if (out) renderMealPlan(planObj, out);
      else alert("Meal plan generated. Add a container with id='mealPlanOut' to display it.");
    });

    // List logs
    const list = $("nutritionList");
    if (list) {
      if (!athleteId) {
        list.innerHTML = `<div class="muted small">${canManageTeam() ? "Add athletes in Team tab." : "Ask coach to add you to roster."}</div>`;
      } else {
        const rows = getNutrition(athleteId).slice().sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO))).slice(0, 14);
        const t = ensureTargetsForAthlete(athleteId);
        list.innerHTML = rows.length
          ? rows.map((r) => {
              const score = calcNutritionAdherence(r, t);
              return `
                <div class="item">
                  <div>
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

    // If a plan already exists, render it
    const existingPlan = athleteId ? state.nutritionPlans[String(athleteId)] : null;
    const out = $("mealPlanOut") || $("mealPlanList") || $("mealPlanOutput");
    if (existingPlan && out) renderMealPlan(existingPlan, out);

    // Allow nutritionEngine.js to hook in if present
    try { window.PIQ_Nutrition?.init?.(); } catch {}
  }

  // -------------------------
  // Render: Periodization (athlete + coach/admin)
  // -------------------------
  function renderPeriodization() {
    const athletes = getAthletes();
    fillAthleteSelect($("perAthlete"), $("perAthlete")?.value);
    fillAthleteSelect($("monAthlete"), $("monAthlete")?.value);

    if ($("perStart") && !safeISO($("perStart").value)) $("perStart").value = todayISO();
    if ($("monWeek") && !safeISO($("monWeek").value)) $("monWeek").value = todayISO();

    $("btnGeneratePlan")?.addEventListener("click", () => {
      const athleteId = $("perAthlete")?.value || "";
      if (!athleteId) return alert(canManageTeam() ? "Add athletes first (Team tab)." : "Ask coach to add you to roster.");

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
        planList.innerHTML = `<div class="muted small">${canManageTeam() ? "Add athletes in Team tab." : "Ask coach to add you to roster."}</div>`;
      } else if (!plan || !plan.weeksPlan?.length) {
        planList.innerHTML = `<div class="muted small">No plan yet. Generate one above.</div>`;
      } else {
        planList.innerHTML = plan.weeksPlan.map((w) => `
          <div class="item">
            <div>
              <div><b>Week ${escHTML(w.week)}</b> • ${escHTML(w.weekStartISO)} ${w.deload ? `<span class="pill">DELOAD</span>` : ""}</div>
              <div class="muted small">Target load: <b>${escHTML(w.targetLoad)}</b></div>
              <div class="muted small">
                ${w.sessions.map((s) => `${escHTML(s.day)} ${escHTML(s.minutes)}min @ RPE ${escHTML(s.rpe)} (load ${escHTML(s.minutes * s.rpe)})`).join(" • ")}
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
        planned
          ? `Planned ${planned} vs Actual ${actual} (${diff >= 0 ? "+" : ""}${diff}% )`
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
        .forEach((s) => {
          details.push(`- ${s.dateISO}: ${s.minutes}min @ RPE ${s.rpe} (${sessionLoad(s)}) • ${s.type}`);
        });

      $("compareDetail").textContent = details.join("\n");
    });
  }

  // -------------------------
  // Render: Settings (role switch + wipe)
  // -------------------------
  function renderSettings() {
    const info = $("appInfo");
    if (info) {
      info.textContent =
        `PerformanceIQ v${APP_VERSION}\n` +
        `Role: ${ROLE()}\n` +
        `LocalStorage key: ${STORAGE_KEY}\n` +
        `Updated: ${new Date(state.meta.updatedAtMs || Date.now()).toLocaleString()}\n` +
        `Athletes: ${state.athletes.length}`;
    }

    // Inject role switch UI if missing
    const settingsView = $("view-settings");
    if (settingsView && !q("#piqRolePanel", settingsView)) {
      const panel = document.createElement("div");
      panel.className = "mini";
      panel.id = "piqRolePanel";
      panel.innerHTML = `
        <div class="minihead">Role & Access</div>
        <div class="minibody small muted">
          Offline-first demo roles. For real security, use auth + server rules (RLS).
        </div>
        <div class="row gap wrap">
          <div class="field">
            <label>Current role</label>
            <select id="roleSelect">
              <option value="athlete">Athlete</option>
              <option value="coach">Coach</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="field">
            <label>Coach/Admin PIN (optional)</label>
            <input id="rolePin" type="password" placeholder="Set or enter PIN" />
          </div>
          <div class="field">
            <label>&nbsp;</label>
            <button class="btn" id="btnApplyRole">Apply Role</button>
          </div>
        </div>
        <div class="small muted" id="roleNote"></div>
        <hr class="sep" />
      `;
      // Add at top of Settings card
      const card = q(".card", settingsView);
      if (card) {
        const grid = q(".grid2", card) || card;
        grid.prepend(panel);
      } else {
        settingsView.prepend(panel);
      }
    }

    const sel = $("roleSelect");
    const pin = $("rolePin");
    const note = $("roleNote");
    if (sel) sel.value = ROLE();
    if (note) note.textContent = state.auth.coachPin ? "PIN is set for coach/admin switching." : "No PIN set yet (optional).";

    $("btnApplyRole")?.addEventListener("click", () => {
      const nextRole = String(sel?.value || "athlete");
      const entered = String(pin?.value || "");

      // If switching into coach/admin and pin is set, require it
      if ((nextRole === "coach" || nextRole === "admin") && state.auth.coachPin) {
        if (entered !== state.auth.coachPin) {
          alert("Incorrect PIN for coach/admin.");
          return;
        }
      }

      // If user entered a new pin while currently coach/admin, allow setting it
      if (canManageTeam() && entered && entered.length >= 4) {
        state.auth.coachPin = entered;
      }

      state.auth.role = ["athlete", "coach", "admin"].includes(nextRole) ? nextRole : "athlete";
      saveState();
      if (pin) pin.value = "";
      applyRoleUI();
      alert(`Role set to ${state.auth.role}.`);
      showView("dashboard");
    });

    $("btnWipe")?.addEventListener("click", () => {
      if (!confirm("Wipe ALL local data? This cannot be undone.")) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      location.reload();
    });
  }

  // -------------------------
  // Topbar actions: Seed / Export / Import
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
    if (canManageTeam()) renderTeam();
    renderDashboard();
    renderLog();
    renderNutrition();
    renderPeriodization();
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
  // Boot entry
  // -------------------------
  function boot() {
    hideSplash();
    wireNav();
    applyRoleUI();

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

    showView("dashboard");
  }

  // Expose startApp for boot.js
  window.startApp = boot;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
