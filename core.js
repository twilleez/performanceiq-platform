// core.js — PRODUCTION-READY (FULL FILE) — v2.4.0
// Offline-first localStorage build
// Requires (optional): analyticsEngine.js, periodizationEngine.js
(function () {
  "use strict";

  if (window.__PIQ_CORE_V240__) return;
  window.__PIQ_CORE_V240__ = true;

  const APP_VERSION = "2.4.0";
  const STORAGE_KEY = "piq_v2_state";
  const DEFAULT_TEAM_ID = "default";

  // -------------------------
  // DOM helpers
  // -------------------------
  const $ = (id) => document.getElementById(id);
  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (n, a, b) => Math.min(Math.max(n, a), b);

  function setText(id, text) {
    const el = typeof id === "string" ? $(id) : id;
    if (el) el.textContent = String(text ?? "");
  }

  function onceBind(el, key, fn) {
    if (!el) return;
    const k = `__piq_once_${key}__`;
    if (el[k]) return;
    el[k] = true;
    el.addEventListener("click", fn);
  }

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
      team: {
        id: DEFAULT_TEAM_ID,
        name: "Default",
        seasonStart: "",
        seasonEnd: "",
        macroDefaults: { protein: 160, carbs: 240, fat: 70, waterOz: 80 },
        piqWeights: { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 }
      },
      athletes: [],
      logs: { training: {}, readiness: {}, nutrition: {} },
      targets: {},
      periodization: {}
    };
  }

  function normalizeState(s) {
    const d = defaultState();
    if (!s || typeof s !== "object") return d;

    s.meta = s.meta && typeof s.meta === "object" ? s.meta : d.meta;
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

  // -------------------------
  // Splash safety
  // -------------------------
  function hideSplash() {
    const s = $("splash");
    if (!s) return;
    s.classList?.add("hidden");
    s.style.pointerEvents = "none";
    setTimeout(() => {
      try { s.remove(); } catch {}
    }, 600);
  }

  // -------------------------
  // Views
  // -------------------------
  const VIEWS = ["dashboard", "team", "log", "nutrition", "periodization", "settings"];

  function showView(name) {
    const view = String(name || "dashboard");
    VIEWS.forEach((v) => {
      const el = $(`view-${v}`);
      if (el) el.hidden = v !== view;
    });

    qa(".navbtn").forEach((b) => b.classList.toggle("active", b.getAttribute("data-view") === view));

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
      if (btn.__piqNavBound) return;
      btn.__piqNavBound = true;
      btn.addEventListener("click", () => showView(btn.getAttribute("data-view") || "dashboard"));
    });
  }

  // -------------------------
  // Athletes
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
    const name = (a?.name || "").trim();
    const pos = (a?.position || "").trim();
    return name ? (pos ? `${name} (${pos})` : name) : (a?.id || "—");
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
  function getTraining(athleteId) { return Array.isArray(state.logs.training[athleteId]) ? state.logs.training[athleteId].slice() : []; }
  function getReadiness(athleteId) { return Array.isArray(state.logs.readiness[athleteId]) ? state.logs.readiness[athleteId].slice() : []; }
  function getNutrition(athleteId) { return Array.isArray(state.logs.nutrition[athleteId]) ? state.logs.nutrition[athleteId].slice() : []; }

  function upsertByDate(arr, row) {
    const d = safeISO(row.dateISO);
    if (!d) return arr || [];
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

  function sessionLoad(sess) { return clamp(toNum(sess?.minutes, 0) * toNum(sess?.rpe, 0), 0, 6000); }

  function dailyLoads(trainingSessions, startISO, days) {
    const map = {};
    for (let i = 0; i < days; i++) map[addDaysISO(startISO, i)] = 0;
    (trainingSessions || []).forEach((s) => {
      const d = safeISO(s?.dateISO);
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

    return { dateISO: date, final, band, subs: { readiness, training: trainingQ, recovery, nutrition, risk }, meta: { workload: riskMeta } };
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
  // Heatmap
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
  // Analytics Phase — dashboard injection
  // -------------------------
  function ensureAnalyticsCard() {
    const dash = $("view-dashboard");
    if (!dash) return null;
    let card = $("analyticsCard");
    if (card) return card;

    card = document.createElement("div");
    card.className = "card";
    card.id = "analyticsCard";
    card.innerHTML = `
      <div class="cardhead">
        <h2>Analytics</h2>
        <span class="muted">Trends + alerts</span>
      </div>
      <div class="grid2">
        <div class="mini">
          <div class="minihead">Workload trend (as-of)</div>
          <div class="minibody mono small" id="anaWorkload">—</div>
        </div>
        <div class="mini">
          <div class="minihead">Recovery trend</div>
          <div class="minibody mono small" id="anaRecovery">—</div>
        </div>
      </div>
      <div class="mini">
        <div class="minihead">Coach alerts</div>
        <div class="minibody" id="anaAlerts">—</div>
      </div>
      <div class="small muted">
        Uses your logged training + readiness + nutrition. Offline-first.
      </div>
    `;
    dash.appendChild(card);
    return card;
  }

  function renderAnalyticsFor(athleteId, asOfISO) {
    ensureAnalyticsCard();
    if (!athleteId) {
      setText("anaWorkload", "Add athletes in Team tab.");
      setText("anaRecovery", "—");
      setText("anaAlerts", "—");
      return;
    }

    const training = getTraining(athleteId);
    const readinessRaw = getReadiness(athleteId);
    const target = ensureTargetsForAthlete(athleteId);
    const nutritionRaw = getNutrition(athleteId);

    // Add computed fields for analytics consumption
    const readinessRows = readinessRaw.map((r) => ({ ...r, computedScore: calcReadinessScore(r) }));
    const nutritionRows = nutritionRaw.map((n) => ({ ...n, adherenceScore: calcNutritionAdherence(n, target) }));

    const engine = window.analyticsEngine;
    if (!engine?.computeSummary) {
      setText("anaWorkload", "analyticsEngine.js not loaded.");
      setText("anaRecovery", "Include <script src='./analyticsEngine.js'></script> before core.js.");
      setText("anaAlerts", "—");
      return;
    }

    const s = engine.computeSummary({ trainingSessions: training, readinessRows, nutritionRows, asOfISO });

    setText(
      "anaWorkload",
      `Acute(7d): ${s.acwrMeta.acute}\n` +
      `Chronic avg(7d-eq): ${s.acwrMeta.chronicAvg7}\n` +
      `ACWR: ${s.acwrMeta.acwr === null ? "—" : s.acwrMeta.acwr}\n` +
      `Monotony: ${s.acwrMeta.monotony}\n` +
      `Strain: ${s.acwrMeta.strain}`
    );

    setText(
      "anaRecovery",
      `Readiness avg(7d): ${s.readinessMeta.avg7 === null ? "—" : s.readinessMeta.avg7}\n` +
      `Δ vs prior week: ${s.readinessMeta.delta === null ? "—" : s.readinessMeta.delta}\n` +
      `Sleep avg(7d): ${s.sleepMeta?.avgSleep ?? "—"}\n` +
      `Sleep debt/wk: ${s.sleepMeta?.weeklyDebt ?? "—"}\n` +
      `Nutrition avg(7d): ${s.nutritionAvg ?? "—"}`
    );

    const alertsEl = $("anaAlerts");
    if (alertsEl) {
      if (!s.alerts.length) {
        alertsEl.innerHTML = `<div class="muted small">No alerts.</div>`;
      } else {
        alertsEl.innerHTML = s.alerts.map((a) => {
          const cls = a.level === "danger" ? "pill danger" : a.level === "warn" ? "pill warn" : "pill";
          return `<div class="row gap wrap" style="margin:6px 0"><span class="${cls}">${escHTML(a.level.toUpperCase())}</span><span class="small">${escHTML(a.msg)}</span></div>`;
        }).join("");
      }
    }
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
        setText("piqScore", "—");
        setText("piqBand", "Add athletes in Team tab");
        renderAnalyticsFor("", dateISO);
        return;
      }

      const r = calcPIQScore(athleteId, dateISO);

      setText("piqScore", r.final);
      setText("piqBand", `${r.band} • ${r.dateISO}`);

      const setBar = (barId, numId, v) => {
        const vv = clamp(toNum(v, 0), 0, 100);
        const bar = $(barId);
        if (bar) bar.style.width = `${vv}%`;
        setText(numId, vv);
      };

      setBar("barReadiness", "numReadiness", r.subs.readiness);
      setBar("barTraining", "numTraining", r.subs.training);
      setBar("barRecovery", "numRecovery", r.subs.recovery);
      setBar("barNutrition", "numNutrition", r.subs.nutrition);
      setBar("barRisk", "numRisk", r.subs.risk);

      setText(
        "piqExplain",
        [
          `PIQ Score (${r.final}) = weighted blend of 5 sub-scores (0–100).`,
          ``,
          `Readiness: ${r.subs.readiness}`,
          `Training: ${r.subs.training}`,
          `Recovery: ${r.subs.recovery}`,
          `Nutrition: ${r.subs.nutrition}`,
          `Risk: ${r.subs.risk}`,
          ``,
          `Workload (7d): acute ${r.meta.workload.acute} • chronic(7d-eq) ${r.meta.workload.chronicAvg7}`,
          `ACWR: ${r.meta.workload.acwr === null ? "—" : r.meta.workload.acwr} • Monotony: ${r.meta.workload.monotony} • Strain: ${r.meta.workload.strain}`,
          `Risk index: ${r.meta.workload.index}`
        ].join("\n")
      );

      // Analytics (phase)
      renderAnalyticsFor(athleteId, dateISO);
    }

    if ($("btnRecalcScore") && !$("btnRecalcScore").__piqBoundPIQ) {
      $("btnRecalcScore").__piqBoundPIQ = true;
      $("btnRecalcScore").addEventListener("click", updatePIQ);
    }
    if (athSel && !athSel.__piqBoundPIQ) {
      athSel.__piqBoundPIQ = true;
      athSel.addEventListener("change", updatePIQ);
    }
    if (dateEl && !dateEl.__piqBoundPIQ) {
      dateEl.__piqBoundPIQ = true;
      dateEl.addEventListener("change", updatePIQ);
    }
    updatePIQ();

    function updateRisk() {
      const athleteId = $("riskAthlete")?.value || "";
      const dateISO = safeISO($("riskDate")?.value) || todayISO();
      if (!athleteId) {
        setText("riskSummary", "Add athletes in Team tab");
        return;
      }
      const r = runRiskDetection(athleteId, dateISO);

      setText("riskSummary", `${r.headline} • Risk index ${r.index}/100 • ${r.flags.length ? r.flags.join(", ") : "No major flags"}`);
      setText(
        "riskWorkload",
        `Acute(7d): ${r.workload.acute}\n` +
          `Chronic avg(7d-eq): ${r.workload.chronicAvg7}\n` +
          `ACWR: ${r.workload.acwr === null ? "—" : r.workload.acwr}\n` +
          `Monotony: ${r.workload.monotony}\n` +
          `Strain: ${r.workload.strain}\n` +
          `Risk index: ${r.workload.index}`
      );
      setText(
        "riskReadiness",
        `Readiness score: ${r.readinessScore}\n` +
          `Nutrition adherence: ${r.nutritionScore}\n` +
          `Flags:\n- ${r.flags.length ? r.flags.join("\n- ") : "None"}`
      );
    }

    if ($("btnRunRisk") && !$("btnRunRisk").__piqBoundRisk) {
      $("btnRunRisk").__piqBoundRisk = true;
      $("btnRunRisk").addEventListener("click", updateRisk);
    }
    if ($("riskAthlete") && !$("riskAthlete").__piqBoundRisk) {
      $("riskAthlete").__piqBoundRisk = true;
      $("riskAthlete").addEventListener("change", updateRisk);
    }
    if ($("riskDate") && !$("riskDate").__piqBoundRisk) {
      $("riskDate").__piqBoundRisk = true;
      $("riskDate").addEventListener("change", updateRisk);
    }

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
        if (cell.__piqBoundHeat) return;
        cell.__piqBoundHeat = true;
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

    if ($("btnHeatmap") && !$("btnHeatmap").__piqBoundHeatBtn) {
      $("btnHeatmap").__piqBoundHeatBtn = true;
      $("btnHeatmap").addEventListener("click", renderHeatmap);
    }
    renderHeatmap();
    updateRisk();
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
        list.innerHTML = `<div class="muted small">No athletes yet. Add one above.</div>`;
      } else {
        list.innerHTML = athletes
          .map((a) => {
            const t = ensureTargetsForAthlete(a.id);
            return `
              <div class="item">
                <div class="grow">
                  <div><b>${escHTML(a.name || "—")}</b> <span class="muted small">${escHTML(a.position || "")}</span></div>
                  <div class="muted small">Ht: ${escHTML(a.heightIn ?? "—")} in • Wt: ${escHTML(a.weightLb ?? "—")} lb</div>
                  <div class="muted small">Targets: P ${escHTML(t.protein)} / C ${escHTML(t.carbs)} / F ${escHTML(t.fat)} • Water ${escHTML(t.waterOz)}oz</div>
                </div>
                <div class="row gap wrap">
                  <button class="btn ghost small" data-edit="${escHTML(a.id)}">Edit targets</button>
                  <button class="btn danger small" data-del="${escHTML(a.id)}">Remove</button>
                </div>
              </div>
            `;
          })
          .join("");

        qa("[data-del]", list).forEach((btn) => {
          if (btn.__piqBoundDelAth) return;
          btn.__piqBoundDelAth = true;
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
            saveState();
            renderTeam();
            renderDashboard();
          });
        });

        qa("[data-edit]", list).forEach((btn) => {
          if (btn.__piqBoundEditAth) return;
          btn.__piqBoundEditAth = true;
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

    onceBind($("btnAddAthlete"), "addAthlete", () => {
      const name = ($("athName")?.value || "").trim();
      const pos = ($("athPos")?.value || "").trim();
      const ht = toNum($("athHt")?.value, null);
      const wt = toNum($("athWt")?.value, null);
      if (!name) return alert("Enter athlete full name.");

      const a = { id: uid("ath"), name, position: pos, heightIn: ht, weightLb: wt };
      state.athletes.push(a);
      ensureTargetsForAthlete(a.id);

      if ($("athName")) $("athName").value = "";
      if ($("athPos")) $("athPos").value = "";
      if ($("athHt")) $("athHt").value = "";
      if ($("athWt")) $("athWt").value = "";

      saveState();
      renderTeam();
      renderDashboard();
      renderLog();
      renderNutrition();
      renderPeriodization();
    });

    if ($("teamName")) $("teamName").value = state.team?.name || "Default";
    if ($("seasonStart")) $("seasonStart").value = state.team?.seasonStart || "";
    if ($("seasonEnd")) $("seasonEnd").value = state.team?.seasonEnd || "";

    onceBind($("btnSaveTeam"), "saveTeam", () => {
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

    onceBind($("btnSaveMacroDefaults"), "saveMacroDefaults", () => {
      state.team.macroDefaults.protein = clamp(toNum($("defProt")?.value, 160), 0, 400);
      state.team.macroDefaults.carbs = clamp(toNum($("defCarb")?.value, 240), 0, 800);
      state.team.macroDefaults.fat = clamp(toNum($("defFat")?.value, 70), 0, 300);
      saveState();
      alert("Saved macro defaults.");
    });

    if ($("wReadiness")) $("wReadiness").value = state.team.piqWeights.readiness;
    if ($("wTraining")) $("wTraining").value = state.team.piqWeights.training;
    if ($("wRecovery")) $("wRecovery").value = state.team.piqWeights.recovery;
    if ($("wNutrition")) $("wNutrition").value = state.team.piqWeights.nutrition;
    if ($("wRisk")) $("wRisk").value = state.team.piqWeights.risk;

    onceBind($("btnSaveWeights"), "saveWeights", () => {
      const w = {
        readiness: clamp(toNum($("wReadiness")?.value, 30), 0, 100),
        training: clamp(toNum($("wTraining")?.value, 25), 0, 100),
        recovery: clamp(toNum($("wRecovery")?.value, 20), 0, 100),
        nutrition: clamp(toNum($("wNutrition")?.value, 15), 0, 100),
        risk: clamp(toNum($("wRisk")?.value, 10), 0, 100)
      };
      const total = w.readiness + w.training + w.recovery + w.nutrition + w.risk;
      if ($("weightsNote")) $("weightsNote").textContent = total === 100 ? "OK (totals 100)" : `Totals ${total} (should be 100)`;
      state.team.piqWeights = w;
      saveState();
      alert("Saved weights.");
      renderDashboard();
    });
  }

  // -------------------------
  // ✅ Render: Log (FULL from earlier, embedded)
  // -------------------------
  function renderLog() {
    const athletes = getAthletes();

    fillAthleteSelect($("logAthlete"), $("logAthlete")?.value);
    fillAthleteSelect($("readyAthlete"), $("readyAthlete")?.value);

    if ($("logDate") && !safeISO($("logDate").value)) $("logDate").value = todayISO();
    if ($("readyDate") && !safeISO($("readyDate").value)) $("readyDate").value = todayISO();

    const logAthleteId = $("logAthlete")?.value || athletes[0]?.id || "";
    const readyAthleteId = $("readyAthlete")?.value || athletes[0]?.id || "";

    function updateTrainingPreview() {
      const min = toNum($("logMin")?.value, 0);
      const rpe = toNum($("logRpe")?.value, 0);
      const load = clamp(Math.round(min * rpe), 0, 6000);
      setText("logComputed", `Load: ${load}`);
    }

    $("logMin")?.addEventListener("input", updateTrainingPreview);
    $("logRpe")?.addEventListener("input", updateTrainingPreview);
    updateTrainingPreview();

    onceBind($("btnSaveTraining"), "saveTraining", () => {
      const athleteId = $("logAthlete")?.value || "";
      if (!athleteId) return alert("Select an athlete.");

      const dateISO = safeISO($("logDate")?.value) || todayISO();
      const minutes = toNum($("logMin")?.value, 0);
      const rpe = toNum($("logRpe")?.value, 0);
      const type = $("logType")?.value || "practice";
      const notes = $("logNotes")?.value || "";

      if (!minutes || !rpe) return alert("Enter minutes and RPE.");

      addTrainingSession(athleteId, {
        id: uid("sess"),
        dateISO,
        minutes,
        rpe,
        type,
        notes,
        load: minutes * rpe
      });

      if ($("logNotes")) $("logNotes").value = "";
      renderTrainingList(athleteId);
      renderDashboard();
    });

    function renderTrainingList(athleteId) {
      const list = $("trainingList");
      if (!list) return;

      const sessions = getTraining(athleteId);

      if (!sessions.length) {
        list.innerHTML = `<div class="muted small">No training sessions logged yet.</div>`;
        return;
      }

      list.innerHTML = sessions.map((s) => `
        <div class="item">
          <div class="grow">
            <div><b>${escHTML(s.dateISO)}</b> • ${escHTML(s.type)}</div>
            <div class="muted small">
              Minutes ${escHTML(s.minutes)} • RPE ${escHTML(s.rpe)} • Load <b>${escHTML(sessionLoad(s))}</b>
            </div>
            ${s.notes ? `<div class="muted small">${escHTML(s.notes)}</div>` : ""}
          </div>
          <button class="btn danger small" data-del-train="${escHTML(s.id)}">Delete</button>
        </div>
      `).join("");

      qa("[data-del-train]").forEach((btn) => {
        if (btn.__piqBoundDelTrain) return;
        btn.__piqBoundDelTrain = true;
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-del-train");
          state.logs.training[athleteId] = getTraining(athleteId).filter((x) => x.id !== id);
          saveState();
          renderTrainingList(athleteId);
          renderDashboard();
        });
      });
    }

    onceBind($("btnSaveReadiness"), "saveReadiness", () => {
      const athleteId = $("readyAthlete")?.value || "";
      if (!athleteId) return alert("Select an athlete.");

      const row = {
        dateISO: safeISO($("readyDate")?.value) || todayISO(),
        sleep: toNum($("readySleep")?.value, 0),
        soreness: toNum($("readySore")?.value, 0),
        stress: toNum($("readyStress")?.value, 0),
        energy: toNum($("readyEnergy")?.value, 0),
        injury: $("readyInjury")?.value || ""
      };

      upsertReadiness(athleteId, row);
      renderReadinessList(athleteId);
      renderDashboard();
    });

    function updateReadinessPreview() {
      const score = calcReadinessScore({
        sleep: $("readySleep")?.value,
        soreness: $("readySore")?.value,
        stress: $("readyStress")?.value,
        energy: $("readyEnergy")?.value
      });
      setText("readyComputed", score);
    }

    ["readySleep", "readySore", "readyStress", "readyEnergy"].forEach((id) => {
      $(id)?.addEventListener("input", updateReadinessPreview);
    });
    updateReadinessPreview();

    function renderReadinessList(athleteId) {
      const list = $("readinessList");
      if (!list) return;

      const rows = getReadiness(athleteId).slice().sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO))).slice(0, 14);

      if (!rows.length) {
        list.innerHTML = `<div class="muted small">No readiness entries yet.</div>`;
        return;
      }

      list.innerHTML = rows.map((r) => {
        const score = calcReadinessScore(r);
        return `
          <div class="item">
            <div class="grow">
              <div><b>${escHTML(r.dateISO)}</b> • Score <b>${score}</b></div>
              <div class="muted small">
                Sleep ${escHTML(r.sleep)}h • Sore ${escHTML(r.soreness)} • Stress ${escHTML(r.stress)} • Energy ${escHTML(r.energy)}
              </div>
              ${r.injury ? `<div class="muted small">Note: ${escHTML(r.injury)}</div>` : ""}
            </div>
            <button class="btn danger small" data-del-ready="${escHTML(r.dateISO)}">Delete</button>
          </div>
        `;
      }).join("");

      qa("[data-del-ready]").forEach((btn) => {
        if (btn.__piqBoundDelReady) return;
        btn.__piqBoundDelReady = true;
        btn.addEventListener("click", () => {
          const d = btn.getAttribute("data-del-ready");
          state.logs.readiness[athleteId] = getReadiness(athleteId).filter((x) => x.dateISO !== d);
          saveState();
          renderReadinessList(athleteId);
          renderDashboard();
        });
      });
    }

    if (logAthleteId) renderTrainingList(logAthleteId);
    if (readyAthleteId) renderReadinessList(readyAthleteId);
  }

  // -------------------------
  // Render: Nutrition (kept compatible)
  // -------------------------
  function renderNutrition() {
    const athletes = getAthletes();
    fillAthleteSelect($("nutAthlete"), $("nutAthlete")?.value);
    fillAthleteSelect($("targetAthlete"), $("targetAthlete")?.value);
    fillAthleteSelect($("mealAthlete"), $("mealAthlete")?.value);

    if ($("nutDate") && !safeISO($("nutDate").value)) $("nutDate").value = todayISO();
    if ($("mealStart") && !safeISO($("mealStart").value)) $("mealStart").value = todayISO();

    const athleteId = $("nutAthlete")?.value || athletes[0]?.id || "";
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
      setText("nutComputed", score);
      setText(
        "nutExplain",
        `Adherence compares totals vs targets.\nScore = 100 - avgDeviation%.\n\nTargets:\nP ${t.protein} / C ${t.carbs} / F ${t.fat} • Water ${t.waterOz}oz`
      );
    }

    ["nutProt", "nutCarb", "nutFat", "nutWater"].forEach((id) => $(id)?.addEventListener("input", updateNutComputed));

    if ($("nutAthlete") && !$("nutAthlete").__piqBoundNutAth) {
      $("nutAthlete").__piqBoundNutAth = true;
      $("nutAthlete").addEventListener("change", () => {
        renderNutrition();
        renderDashboard();
      });
    }
    if ($("nutDate") && !$("nutDate").__piqBoundNutDate) {
      $("nutDate").__piqBoundNutDate = true;
      $("nutDate").addEventListener("change", renderNutrition);
    }

    if (athleteId) {
      const existing = getNutrition(athleteId).find((n) => n.dateISO === dateISO);
      if (existing) {
        if ($("nutProt")) $("nutProt").value = toNum(existing.protein, 0);
        if ($("nutCarb")) $("nutCarb").value = toNum(existing.carbs, 0);
        if ($("nutFat")) $("nutFat").value = toNum(existing.fat, 0);
        if ($("nutWater")) $("nutWater").value = toNum(existing.waterOz, 0);
        if ($("nutNotes")) $("nutNotes").value = existing.notes || "";
      } else {
        if ($("nutProt")) $("nutProt").value = 0;
        if ($("nutCarb")) $("nutCarb").value = 0;
        if ($("nutFat")) $("nutFat").value = 0;
        if ($("nutWater")) $("nutWater").value = 0;
        if ($("nutNotes")) $("nutNotes").value = "";
      }
    }

    updateNutComputed();

    onceBind($("btnSaveNutrition"), "saveNutrition", () => {
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
    });

    onceBind($("btnSaveTargets"), "saveTargets", () => {
      const a = $("targetAthlete")?.value || "";
      if (!a) return alert("Select an athlete.");
      state.targets[a] = {
        protein: clamp(toNum($("tProt")?.value, 160), 0, 500),
        carbs: clamp(toNum($("tCarb")?.value, 240), 0, 1000),
        fat: clamp(toNum($("tFat")?.value, 70), 0, 400),
        waterOz: clamp(toNum($("tWater")?.value, 80), 0, 300)
      };
      saveState();
      renderNutrition();
      renderDashboard();
      alert("Saved targets.");
    });

    // Meal plan generator hook (delegated to nutritionEngine.js if you implement it there)
    onceBind($("btnGenerateMealPlan"), "genMealPlan", () => {
      const a = $("mealAthlete")?.value || "";
      if (!a) return alert("Select athlete.");
      const start = safeISO($("mealStart")?.value) || todayISO();
      const days = clamp(toNum($("mealDays")?.value, 7), 1, 21);
      const dayType = String($("mealDayType")?.value || "training");
      const diet = String($("mealDiet")?.value || "standard");

      const t = ensureTargetsForAthlete(a);
      // Simple, offline generator (placeholder until your full nutritionEngine planner)
      const out = [];
      for (let i = 0; i < days; i++) {
        const d = addDaysISO(start, i);
        const isWeekend = [0, 6].includes(new Date(d).getDay());
        const type = dayType === "auto" ? (isWeekend ? "rest" : "training") : dayType;

        let p = t.protein, c = t.carbs, f = t.fat;
        if (type === "game") c = Math.round(c * 1.15);
        if (type === "recovery") c = Math.round(c * 0.85);
        if (type === "rest") c = Math.round(c * 0.75);

        if (diet === "highprotein") p = Math.round(p * 1.15);
        if (diet === "lowerfat") f = Math.round(f * 0.80);

        out.push(`<div class="item"><div class="grow"><b>${escHTML(d)}</b> • <span class="muted small">${escHTML(type)}</span><div class="muted small">Targets: P ${p} • C ${c} • F ${f} • Water ${t.waterOz}oz</div></div></div>`);
      }
      const el = $("mealPlanOut");
      if (el) el.innerHTML = out.join("");
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
                  <div class="grow">
                    <div><b>${escHTML(r.dateISO)}</b> • Adherence <b>${escHTML(score)}</b></div>
                    <div class="muted small">P ${escHTML(r.protein)} • C ${escHTML(r.carbs)} • F ${escHTML(r.fat)} • Water ${escHTML(r.waterOz)}oz</div>
                    ${r.notes ? `<div class="muted small">${escHTML(r.notes)}</div>` : ""}
                  </div>
                  <button class="btn danger small" data-del-nut="${escHTML(r.dateISO)}">Delete</button>
                </div>
              `;
            }).join("")
          : `<div class="muted small">No nutrition entries yet.</div>`;

        qa("[data-del-nut]", list).forEach((btn) => {
          if (btn.__piqBoundDelNut) return;
          btn.__piqBoundDelNut = true;
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
  }

  // -------------------------
  // Render: Periodization (compatible with your periodizationEngine.js)
  // -------------------------
  function renderPeriodization() {
    const athletes = getAthletes();
    fillAthleteSelect($("perAthlete"), $("perAthlete")?.value);
    fillAthleteSelect($("monAthlete"), $("monAthlete")?.value);

    if ($("perStart") && !safeISO($("perStart").value)) $("perStart").value = todayISO();
    if ($("monWeek") && !safeISO($("monWeek").value)) $("monWeek").value = todayISO();

    function generatePlan({ athleteId, startISO, weeks, goal, deloadEvery }) {
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
        let targetLoad = Math.round(base * wave * (isDeload ? 0.72 : 1.0));

        // Optional periodizationEngine adjustment
        const phase = window.periodizationEngine?.getCurrentPhase?.(i) || (isDeload ? "DELOAD" : "ACCUMULATION");
        if (window.periodizationEngine?.adjustVolume) {
          targetLoad = Math.round(window.periodizationEngine.adjustVolume(targetLoad, phase));
        }

        const sessions = [
          { day: "Mon", minutes: 60, rpe: isDeload ? 5 : 6 },
          { day: "Tue", minutes: 75, rpe: isDeload ? 5 : 7 },
          { day: "Thu", minutes: 60, rpe: isDeload ? 4 : 6 },
          { day: "Sat", minutes: 75, rpe: isDeload ? 5 : 7 }
        ];

        const current = sessions.reduce((s, x) => s + x.minutes * x.rpe, 0);
        const scale = current > 0 ? targetLoad / current : 1;
        const scaled = sessions.map((x) => ({ ...x, minutes: clamp(Math.round(x.minutes * scale), 30, 120) }));

        const weekStart = addDaysISO(start, (i - 1) * 7);
        weeksPlan.push({ week: i, weekStartISO: weekStart, phase, deload: isDeload, targetLoad, sessions: scaled });
      }

      state.periodization[athleteId] = { athleteId, startISO: start, weeks: W, goal, deloadEvery: deloadN, weeksPlan };
      saveState();
      return state.periodization[athleteId];
    }

    function plannedLoadForWeek(plan, weekStartISO) {
      const wk = plan?.weeksPlan?.find((w) => w.weekStartISO === weekStartISO);
      return wk?.targetLoad || 0;
    }

    function actualLoadForWeek(trainingSessions, weekStartISO) {
      const start = safeISO(weekStartISO);
      if (!start) return 0;
      const end = addDaysISO(start, 6);
      return sumLoads(trainingSessions, start, end);
    }

    onceBind($("btnGeneratePlan"), "genPlan", () => {
      const athleteId = $("perAthlete")?.value || "";
      if (!athleteId) return alert("Add athletes first (Team tab).");

      const startISO = safeISO($("perStart")?.value) || todayISO();
      const weeks = clamp(toNum($("perWeeks")?.value, 8), 2, 24);
      const goal = String($("perGoal")?.value || "inseason");
      const deloadEvery = clamp(toNum($("perDeload")?.value, 4), 3, 6);

      generatePlan({ athleteId, startISO, weeks, goal, deloadEvery });
      renderPeriodization();
      alert("Plan generated.");
    });

    const planList = $("planList");
    const athleteId = $("perAthlete")?.value || athletes[0]?.id || "";
    const plan = athleteId ? state.periodization[athleteId] : null;

    if (planList) {
      if (!athleteId) planList.innerHTML = `<div class="muted small">Add athletes in Team tab.</div>`;
      else if (!plan?.weeksPlan?.length) planList.innerHTML = `<div class="muted small">No plan yet. Generate one above.</div>`;
      else {
        planList.innerHTML = plan.weeksPlan.map((w) => `
          <div class="item">
            <div class="grow">
              <div><b>Week ${escHTML(w.week)}</b> • ${escHTML(w.weekStartISO)} • <span class="muted small">${escHTML(w.phase || "")}</span> ${w.deload ? `<span class="pill">DELOAD</span>` : ""}</div>
              <div class="muted small">Target load: <b>${escHTML(w.targetLoad)}</b></div>
              <div class="muted small">${w.sessions.map((s) => `${escHTML(s.day)} ${escHTML(s.minutes)}min @ RPE ${escHTML(s.rpe)} (load ${escHTML(s.minutes * s.rpe)})`).join(" • ")}</div>
            </div>
          </div>
        `).join("");
      }
    }

    onceBind($("btnCompareWeek"), "compareWeek", () => {
      const a = $("monAthlete")?.value || "";
      if (!a) return alert("Select an athlete.");
      const weekStart = safeISO($("monWeek")?.value) || todayISO();
      const plan = state.periodization[a] || null;
      const training = getTraining(a);

      const planned = plannedLoadForWeek(plan, weekStart);
      const actual = actualLoadForWeek(training, weekStart);
      const diff = planned ? Math.round(((actual - planned) / planned) * 100) : null;

      setText("compareSummary", planned ? `Planned ${planned} vs Actual ${actual} (${diff >= 0 ? "+" : ""}${diff}% )` : `No planned week found starting ${weekStart}.`);
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
      setText("compareDetail", details.join("\n"));
    });
  }

  // -------------------------
  // Render: Settings
  // -------------------------
  function renderSettings() {
    const info = $("appInfo");
    if (info) {
      info.textContent =
        `PerformanceIQ v${APP_VERSION}\n` +
        `LocalStorage key: ${STORAGE_KEY}\n` +
        `Updated: ${new Date(state.meta.updatedAtMs || Date.now()).toLocaleString()}\n` +
        `Athletes: ${state.athletes.length}`;
    }

    onceBind($("btnWipe"), "wipe", () => {
      if (!confirm("Wipe ALL local data? This cannot be undone.")) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      location.reload();
    });
  }

  // -------------------------
  // Topbar actions (seed/export/import)
  // -------------------------
  function seedDemo() {
    if (!confirm("Seed demo data? This will add demo athletes/logs.")) return;

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
          injury: ""
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
    renderTeam();
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
  // Boot
  // -------------------------
  function boot() {
    hideSplash();
    wireNav();

    onceBind($("btnSeed"), "seed", seedDemo);
    onceBind($("btnExport"), "export", exportJSON);

    const imp = $("fileImport");
    if (imp && !imp.__piqImportBound) {
      imp.__piqImportBound = true;
      imp.addEventListener("change", (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        importJSON(file);
        e.target.value = "";
      });
    }

    if ($("dashDate")) $("dashDate").value = todayISO();
    if ($("riskDate")) $("riskDate").value = todayISO();

    showView("dashboard");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
