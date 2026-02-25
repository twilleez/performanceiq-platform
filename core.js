// core.js — v2.6.0 (FULL FILE)
// Includes: Dashboard + Team + Log + Workouts + Elite Nutrition + Periodization + Analytics (if analyticsEngine.js present)
// Offline-first • localStorage
(function () {
  "use strict";
  if (window.__PIQ_CORE_V260__) return;
  window.__PIQ_CORE_V260__ = true;

  const APP_VERSION = "2.6.0";
  const STORAGE_KEY = "piq_v2_state";
  const DEFAULT_TEAM_ID = "default";

  const $ = (id) => document.getElementById(id);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const q = (sel, root = document) => root.querySelector(sel);
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

  function uid(prefix = "id") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  }

  function escHTML(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }

  function setText(id, txt) {
    const el = typeof id === "string" ? $(id) : id;
    if (el) el.textContent = String(txt ?? "");
  }

  // -------------------------
  // UX helpers (competitor-grade)
  // -------------------------
  function ensureToast() {
    if ($("piqToast")) return;
    const t = document.createElement("div");
    t.id = "piqToast";
    t.style.position = "fixed";
    t.style.right = "16px";
    t.style.bottom = "16px";
    t.style.zIndex = "99999";
    t.style.maxWidth = "360px";
    t.style.display = "none";
    t.style.padding = "10px 12px";
    t.style.border = "1px solid var(--border2)";
    t.style.borderRadius = "6px";
    t.style.background = "rgba(20,22,26,0.96)";
    t.style.backdropFilter = "blur(10px)";
    t.style.color = "var(--text)";
    t.style.fontFamily = "var(--mono)";
    t.style.fontSize = "12px";
    t.style.letterSpacing = "0.02em";
    t.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
    document.body.appendChild(t);
  }

  let toastTimer = null;
  function toast(msg, kind = "info") {
    ensureToast();
    const el = $("piqToast");
    if (!el) return;

    const border =
      kind === "danger" ? "rgba(230,57,70,0.7)" :
      kind === "warn" ? "rgba(255,183,3,0.7)" :
      kind === "ok" ? "rgba(61,220,132,0.7)" :
      "var(--border2)";

    el.style.borderColor = border;
    el.innerHTML = escHTML(msg);
    el.style.display = "block";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.display = "none"; }, 2200);
  }

  function onceBind(el, key, fn) {
    if (!el) return;
    const k = `__piq_once_${key}__`;
    if (el[k]) return;
    el[k] = true;
    el.addEventListener("click", fn);
  }

  // -------------------------
  // State
  // -------------------------
  function defaultState() {
    const now = Date.now();
    return {
      meta: { version: 1, updatedAtMs: now, appVersion: APP_VERSION },
      ui: {
        lastView: "dashboard",
        selections: {
          dashboardAthlete: "",
          riskAthlete: "",
          logAthlete: "",
          readyAthlete: "",
          nutAthlete: "",
          targetAthlete: "",
          perAthlete: "",
          monAthlete: "",
          wkAthlete: ""
        }
      },
      user: { role: "coach" }, // coach | athlete
      team: {
        id: DEFAULT_TEAM_ID,
        name: "Default",
        seasonStart: "",
        seasonEnd: "",
        macroDefaults: { protein: 160, carbs: 240, fat: 70, waterOz: 80 },
        piqWeights: { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 }
      },
      athletes: [], // {id,name,position,heightIn,weightLb,sportId}
      logs: { training: {}, readiness: {}, nutrition: {} },
      targets: {},          // per athlete macro targets
      periodization: {},    // per athlete plans
      workouts: {}          // per athlete workout plans (sport engine)
    };
  }

  function normalizeState(s) {
    const d = defaultState();
    if (!s || typeof s !== "object") return d;

    s.meta = s.meta && typeof s.meta === "object" ? s.meta : d.meta;
    s.ui = s.ui && typeof s.ui === "object" ? s.ui : d.ui;
    s.ui.lastView = s.ui.lastView || "dashboard";
    s.ui.selections = s.ui.selections && typeof s.ui.selections === "object" ? s.ui.selections : d.ui.selections;

    s.user = s.user && typeof s.user === "object" ? s.user : d.user;
    if (!s.user.role) s.user.role = "coach";

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
    s.workouts = s.workouts && typeof s.workouts === "object" ? s.workouts : {};

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
      toast("Save failed (storage full?)", "warn");
    }
  }

  // -------------------------
  // Splash
  // -------------------------
  function hideSplash() {
    const s = $("splash");
    if (!s) return;
    s.classList?.add("hidden");
    s.style.pointerEvents = "none";
    setTimeout(() => { try { s.remove(); } catch {} }, 600);
  }

  // -------------------------
  // Athletes / targets
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
  // Logs
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

  function sessionLoad(sess) {
    return clamp(toNum(sess?.minutes, 0) * toNum(sess?.rpe, 0), 0, 6000);
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
  // Scoring
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
  // Inject Workout view + nav button (no HTML edits)
  // -------------------------
  function ensureWorkoutViewInjected() {
    const nav = q(".nav");
    if (nav && !q(".navbtn[data-view='workouts']", nav)) {
      const btn = document.createElement("button");
      btn.className = "navbtn";
      btn.setAttribute("data-view", "workouts");
      btn.textContent = "Workouts";
      const logBtn = q(".navbtn[data-view='log']", nav);
      if (logBtn && logBtn.nextSibling) nav.insertBefore(btn, logBtn.nextSibling);
      else nav.appendChild(btn);
    }

    const content = q(".content");
    if (content && !$("view-workouts")) {
      const sec = document.createElement("section");
      sec.className = "view";
      sec.id = "view-workouts";
      sec.setAttribute("data-view", "");
      sec.hidden = true;
      sec.innerHTML = `
        <div class="grid2">
          <div class="card">
            <div class="cardhead">
              <h2>Workout Builder</h2>
              <span class="muted">Standard vs Advanced • Sport-tailored</span>
            </div>

            <div class="row gap wrap">
              <div class="field">
                <label>Athlete</label>
                <select id="wkAthlete"></select>
              </div>
              <div class="field">
                <label>Sport</label>
                <select id="wkSport"></select>
              </div>
              <div class="field">
                <label>Level</label>
                <select id="wkLevel">
                  <option value="standard">Standard</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div class="field">
                <label>Start (Mon)</label>
                <input id="wkStart" type="date" />
              </div>
              <div class="field">
                <label>Weeks</label>
                <input id="wkWeeks" type="number" min="2" max="16" value="6" />
              </div>
              <div class="field">
                <label>Day Type</label>
                <select id="wkDayType">
                  <option value="training">Training</option>
                  <option value="game">Game</option>
                  <option value="recovery">Recovery</option>
                </select>
              </div>
              <div class="field">
                <label>&nbsp;</label>
                <button class="btn" id="btnGenWorkout">Generate Plan</button>
              </div>
            </div>

            <div class="mini">
              <div class="minihead">Plan summary</div>
              <div class="minibody mono small" id="wkSummary">—</div>
            </div>

            <div class="list" id="wkWeeksOut"></div>
          </div>

          <div class="card">
            <div class="cardhead">
              <h2>Session Detail</h2>
              <span class="muted">Exercises + writeback</span>
            </div>

            <div class="mini">
              <div class="minihead">Selected session</div>
              <div class="minibody mono small" id="wkSelected">Pick a session from the plan.</div>
            </div>

            <div id="wkDetail"></div>

            <div class="row gap wrap" style="margin-top:12px">
              <button class="btn" id="btnLogSession" disabled>Log this session</button>
              <button class="btn ghost" id="btnEditSession" disabled>Edit minutes/RPE</button>
            </div>

            <div class="small muted" style="margin-top:10px">
              “Log this session” writes into Training Log with minutes × sRPE load and exercises in notes.
            </div>
          </div>
        </div>
      `;
      content.appendChild(sec);
    }
  }

  // -------------------------
  // Views
  // -------------------------
  const VIEWS = ["dashboard", "team", "log", "workouts", "nutrition", "periodization", "settings"];

  function showView(name) {
    const view = String(name || "dashboard");
    VIEWS.forEach((v) => {
      const el = $(`view-${v}`);
      if (el) el.hidden = v !== view;
    });
    qa(".navbtn").forEach((b) => b.classList.toggle("active", b.getAttribute("data-view") === view));

    state.ui.lastView = view;
    saveState();

    if (view === "dashboard") renderDashboard();
    if (view === "team") renderTeam();
    if (view === "log") renderLog();
    if (view === "workouts") renderWorkouts();
    if (view === "nutrition") renderNutrition();
    if (view === "periodization") renderPeriodization();
    if (view === "settings") renderSettings();
  }

  function wireNav() {
    qa(".navbtn").forEach((btn) => {
      if (btn.__piqNavBound) return;
      btn.__piqNavBound = true;
      btn.addEventListener("click", () => showView(btn.getAttribute("data-view") || "dashboard"));
    });
  }

  // -------------------------
  // Analytics injection (if analyticsEngine.js exists)
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

    const readinessRows = readinessRaw.map((r) => ({ ...r, computedScore: calcReadinessScore(r) }));
    const nutritionRows = nutritionRaw.map((n) => ({ ...n, adherenceScore: calcNutritionAdherence(n, target) }));

    const engine = window.analyticsEngine;
    if (!engine?.computeSummary) {
      setText("anaWorkload", "analyticsEngine.js not loaded.");
      setText("anaRecovery", "Include analyticsEngine.js before core.js.");
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
          const cls = a.level === "danger" ? "pill danger" : a.level === "warn" ? "pill warn" : a.level === "ok" ? "pill ok" : "pill";
          return `<div class="row gap wrap" style="margin:6px 0"><span class="${cls}">${escHTML(a.level.toUpperCase())}</span><span class="small">${escHTML(a.msg)}</span></div>`;
        }).join("");
      }
    }
  }

  // -------------------------
  // DASHBOARD
  // -------------------------
  function renderDashboard() {
    const athletes = getAthletes();

    const athSel = $("dashAthlete");
    const dateEl = $("dashDate");

    fillAthleteSelect(athSel, state.ui.selections.dashboardAthlete || athSel?.value);
    if (athSel) state.ui.selections.dashboardAthlete = athSel.value || "";
    if (dateEl && !safeISO(dateEl.value)) dateEl.value = todayISO();

    const riskAthSel = $("riskAthlete");
    const riskDateEl = $("riskDate");
    fillAthleteSelect(riskAthSel, state.ui.selections.riskAthlete || riskAthSel?.value);
    if (riskAthSel) state.ui.selections.riskAthlete = riskAthSel.value || "";
    if (riskDateEl && !safeISO(riskDateEl.value)) riskDateEl.value = todayISO();

    function updatePIQ() {
      const athleteId = athSel?.value || "";
      const dateISO = safeISO(dateEl?.value) || todayISO();
      state.ui.selections.dashboardAthlete = athleteId;
      saveState();

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

      renderAnalyticsFor(athleteId, dateISO);
    }

    onceBind($("btnRecalcScore"), "recalc", updatePIQ);
    if (athSel && !athSel.__piqBound) { athSel.__piqBound = true; athSel.addEventListener("change", updatePIQ); }
    if (dateEl && !dateEl.__piqBound) { dateEl.__piqBound = true; dateEl.addEventListener("change", updatePIQ); }
    updatePIQ();

    function updateRisk() {
      const athleteId = riskAthSel?.value || "";
      const dateISO = safeISO(riskDateEl?.value) || todayISO();
      state.ui.selections.riskAthlete = athleteId;
      saveState();

      if (!athleteId) {
        setText("riskSummary", "Add athletes in Team tab");
        setText("riskWorkload", "—");
        setText("riskReadiness", "—");
        return;
      }
      const r = runRiskDetection(athleteId, dateISO);
      setText("riskSummary", `${r.headline} • Risk index ${r.index}/100 • ${r.flags.length ? r.flags.join(", ") : "No major flags"}`);
      setText("riskWorkload",
        `Acute(7d): ${r.workload.acute}\nChronic avg(7d-eq): ${r.workload.chronicAvg7}\nACWR: ${r.workload.acwr === null ? "—" : r.workload.acwr}\nMonotony: ${r.workload.monotony}\nStrain: ${r.workload.strain}\nRisk index: ${r.workload.index}`);
      setText("riskReadiness",
        `Readiness score: ${r.readinessScore}\nNutrition adherence: ${r.nutritionScore}\nFlags:\n- ${r.flags.length ? r.flags.join("\n- ") : "None"}`);
    }

    onceBind($("btnRunRisk"), "risk", updateRisk);
    if (riskAthSel && !riskAthSel.__piqBound) { riskAthSel.__piqBound = true; riskAthSel.addEventListener("change", updateRisk); }
    if (riskDateEl && !riskDateEl.__piqBound) { riskDateEl.__piqBound = true; riskDateEl.addEventListener("change", updateRisk); }
    updateRisk();

    // HEATMAP
    onceBind($("btnHeatmap"), "heatmap", () => {
      if (!athletes.length) return toast("Add athletes first (Team tab).", "warn");
      const start = safeISO($("heatStart")?.value) || addDaysISO(todayISO(), -20);
      const days = clamp(toNum($("heatDays")?.value, 21), 7, 60);
      const metric = $("heatMetric")?.value || "load";
      renderHeatmap(start, days, metric);
    });

    const heatStart = $("heatStart");
    if (heatStart && !safeISO(heatStart.value)) heatStart.value = addDaysISO(todayISO(), -20);
  }

  function renderHeatmap(startISO, days, metric) {
    const table = $("heatTable");
    if (!table) return;

    const athletes = getAthletes();
    const dates = Array.from({ length: days }, (_, i) => addDaysISO(startISO, i));

    const getCellValue = (athleteId, dateISO) => {
      if (metric === "load") {
        const sessions = getTraining(athleteId).filter((s) => s.dateISO === dateISO);
        return sessions.reduce((a, s) => a + sessionLoad(s), 0);
      }
      if (metric === "readiness") {
        const row = getReadiness(athleteId).find((r) => r.dateISO === dateISO);
        return row ? calcReadinessScore(row) : "";
      }
      if (metric === "nutrition") {
        const row = getNutrition(athleteId).find((n) => n.dateISO === dateISO);
        if (!row) return "";
        const target = ensureTargetsForAthlete(athleteId);
        return calcNutritionAdherence(row, target);
      }
      if (metric === "risk") {
        const r = runRiskDetection(athleteId, dateISO);
        return r.index;
      }
      return "";
    };

    const header = `
      <tr>
        <th style="text-align:left">Athlete</th>
        ${dates.map((d) => `<th>${escHTML(d.slice(5))}</th>`).join("")}
      </tr>
    `;

    const rows = athletes.map((a) => {
      const cells = dates.map((d) => {
        const v = getCellValue(a.id, d);
        const num = (v === "" ? "" : Number(v));
        const intensity = Number.isFinite(num) ? clamp(Math.round(num), 0, 99999) : "";
        const title = `${a.name} • ${d} • ${metric}: ${intensity}`;
        const style =
          (metric === "load" && intensity > 500) ? "background:rgba(255,183,3,0.12)" :
          (metric === "risk" && intensity >= 60) ? "background:rgba(230,57,70,0.12)" :
          (metric !== "load" && metric !== "risk" && intensity >= 80) ? "background:rgba(61,220,132,0.10)" :
          "";
        return `<td style="${style}; cursor:pointer" data-jump="${escHTML(a.id)}|${escHTML(d)}" title="${escHTML(title)}">${escHTML(intensity)}</td>`;
      }).join("");

      return `<tr><td style="text-align:left; white-space:nowrap"><b>${escHTML(a.name)}</b></td>${cells}</tr>`;
    }).join("");

    table.innerHTML = header + rows;

    qa("[data-jump]", table).forEach((td) => {
      if (td.__b) return; td.__b = true;
      td.addEventListener("click", () => {
        const [athId, d] = (td.getAttribute("data-jump") || "").split("|");
        if (!athId || !d) return;
        showView("log");
        if ($("logAthlete")) $("logAthlete").value = athId;
        if ($("logDate")) $("logDate").value = d;
        if ($("readyAthlete")) $("readyAthlete").value = athId;
        if ($("readyDate")) $("readyDate").value = d;
        renderLog();
      });
    });
  }

  // -------------------------
  // TEAM (adds sport selector)
  // -------------------------
  function renderTeam() {
    const pill = $("activeTeamPill");
    if (pill) pill.textContent = `Team: ${state.team?.name || "Default"}`;

    const list = $("rosterList");
    const athletes = getAthletes();
    const sports = window.sportEngine?.SPORTS || [];

    if (list) {
      if (!athletes.length) list.innerHTML = `<div class="muted small">No athletes yet. Add one above.</div>`;
      else {
        list.innerHTML = athletes.map((a) => {
          const t = ensureTargetsForAthlete(a.id);
          const sportLabel = sports.find((s) => s.id === a.sportId)?.label || "Not set";
          return `
            <div class="item">
              <div class="grow">
                <div><b>${escHTML(a.name || "—")}</b> <span class="muted small">${escHTML(a.position || "")}</span></div>
                <div class="muted small">Sport: <b>${escHTML(sportLabel)}</b></div>
                <div class="muted small">Ht: ${escHTML(a.heightIn ?? "—")} in • Wt: ${escHTML(a.weightLb ?? "—")} lb</div>
                <div class="muted small">Targets: P ${escHTML(t.protein)} / C ${escHTML(t.carbs)} / F ${escHTML(t.fat)} • Water ${escHTML(t.waterOz)}oz</div>
              </div>
              <div class="row gap wrap">
                <button class="btn ghost small" data-sport="${escHTML(a.id)}">Set sport</button>
                <button class="btn ghost small" data-edit="${escHTML(a.id)}">Edit targets</button>
                <button class="btn danger small" data-del="${escHTML(a.id)}">Remove</button>
              </div>
            </div>
          `;
        }).join("");

        qa("[data-del]", list).forEach((btn) => {
          if (btn.__b) return; btn.__b = true;
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
            delete state.workouts[id];
            saveState();
            toast("Athlete removed.", "ok");
            renderTeam(); renderDashboard();
          });
        });

        qa("[data-edit]", list).forEach((btn) => {
          if (btn.__b) return; btn.__b = true;
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-edit");
            if (!id) return;
            showView("nutrition");
            state.ui.selections.targetAthlete = id;
            saveState();
            renderNutrition();
          });
        });

        qa("[data-sport]", list).forEach((btn) => {
          if (btn.__b) return; btn.__b = true;
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-sport");
            const a = getAthlete(id);
            if (!a) return;

            if (!sports.length) return toast("sportEngine.js not loaded.", "warn");

            const options = sports.map((s) => `${s.id}:${s.label}`).join("\n");
            const pick = prompt(`Set sport for ${a.name}.\nType one id:\n${options}`, a.sportId || "basketball");
            if (!pick) return;
            const ok = sports.some((s) => s.id === pick.trim());
            if (!ok) return alert("Invalid sport id.");
            a.sportId = pick.trim();
            saveState();
            toast("Sport updated.", "ok");
            renderTeam();
          });
        });
      }
    }

    onceBind($("btnAddAthlete"), "addAthlete", () => {
      const name = ($("athName")?.value || "").trim();
      const pos = ($("athPos")?.value || "").trim();
      const ht = toNum($("athHt")?.value, null);
      const wt = toNum($("athWt")?.value, null);
      if (!name) return toast("Enter athlete full name.", "warn");

      const a = { id: uid("ath"), name, position: pos, heightIn: ht, weightLb: wt, sportId: "basketball" };
      state.athletes.push(a);
      ensureTargetsForAthlete(a.id);

      if ($("athName")) $("athName").value = "";
      if ($("athPos")) $("athPos").value = "";
      if ($("athHt")) $("athHt").value = "";
      if ($("athWt")) $("athWt").value = "";

      saveState();
      toast("Athlete added.", "ok");
      renderTeam(); renderDashboard(); renderLog(); renderNutrition(); renderPeriodization();
    });

    // Team settings
    onceBind($("btnSaveTeam"), "saveTeam", () => {
      state.team.name = ($("teamName")?.value || state.team.name || "Default").trim() || "Default";
      state.team.seasonStart = safeISO($("seasonStart")?.value) || "";
      state.team.seasonEnd = safeISO($("seasonEnd")?.value) || "";
      saveState();
      toast("Team saved.", "ok");
      renderTeam();
    });

    if ($("teamName")) $("teamName").value = state.team.name || "Default";
    if ($("seasonStart")) $("seasonStart").value = state.team.seasonStart || "";
    if ($("seasonEnd")) $("seasonEnd").value = state.team.seasonEnd || "";

    onceBind($("btnSaveMacroDefaults"), "saveMacroDefaults", () => {
      state.team.macroDefaults = {
        protein: clamp(toNum($("defProt")?.value, 160), 0, 500),
        carbs: clamp(toNum($("defCarb")?.value, 240), 0, 1200),
        fat: clamp(toNum($("defFat")?.value, 70), 0, 400),
        waterOz: (state.team.macroDefaults?.waterOz ?? 80)
      };
      saveState();
      toast("Macro defaults saved.", "ok");
    });

    if ($("defProt")) $("defProt").value = state.team.macroDefaults.protein;
    if ($("defCarb")) $("defCarb").value = state.team.macroDefaults.carbs;
    if ($("defFat")) $("defFat").value = state.team.macroDefaults.fat;

    onceBind($("btnSaveWeights"), "saveWeights", () => {
      const w = {
        readiness: clamp(toNum($("wReadiness")?.value, 30), 0, 100),
        training: clamp(toNum($("wTraining")?.value, 25), 0, 100),
        recovery: clamp(toNum($("wRecovery")?.value, 20), 0, 100),
        nutrition: clamp(toNum($("wNutrition")?.value, 15), 0, 100),
        risk: clamp(toNum($("wRisk")?.value, 10), 0, 100)
      };
      const sum = w.readiness + w.training + w.recovery + w.nutrition + w.risk;
      if (sum !== 100) {
        setText("weightsNote", `Weights must total 100. Current: ${sum}`);
        return toast("Fix weights (must total 100).", "warn");
      }
      state.team.piqWeights = w;
      saveState();
      setText("weightsNote", "Saved.");
      toast("Weights saved.", "ok");
    });

    if ($("wReadiness")) $("wReadiness").value = state.team.piqWeights.readiness;
    if ($("wTraining")) $("wTraining").value = state.team.piqWeights.training;
    if ($("wRecovery")) $("wRecovery").value = state.team.piqWeights.recovery;
    if ($("wNutrition")) $("wNutrition").value = state.team.piqWeights.nutrition;
    if ($("wRisk")) $("wRisk").value = state.team.piqWeights.risk;
  }

  // -------------------------
  // LOG (full rendering)
  // -------------------------
  function renderLog() {
    const athletes = getAthletes();

    fillAthleteSelect($("logAthlete"), state.ui.selections.logAthlete || $("logAthlete")?.value);
    fillAthleteSelect($("readyAthlete"), state.ui.selections.readyAthlete || $("readyAthlete")?.value);

    if ($("logDate") && !safeISO($("logDate").value)) $("logDate").value = todayISO();
    if ($("readyDate") && !safeISO($("readyDate").value)) $("readyDate").value = todayISO();

    const logAthleteId = $("logAthlete")?.value || athletes[0]?.id || "";
    const readyAthleteId = $("readyAthlete")?.value || athletes[0]?.id || "";

    state.ui.selections.logAthlete = logAthleteId;
    state.ui.selections.readyAthlete = readyAthleteId;
    saveState();

    function updateTrainingPreview() {
      const min = toNum($("logMin")?.value, 0);
      const rpe = toNum($("logRpe")?.value, 0);
      setText("logComputed", `Load: ${Math.round(min * rpe)}`);
    }
    $("logMin")?.addEventListener("input", updateTrainingPreview);
    $("logRpe")?.addEventListener("input", updateTrainingPreview);
    updateTrainingPreview();

    onceBind($("btnSaveTraining"), "saveTraining", () => {
      const athleteId = $("logAthlete")?.value || "";
      if (!athleteId) return toast("Select an athlete.", "warn");

      const dateISO = safeISO($("logDate")?.value) || todayISO();
      const minutes = clamp(toNum($("logMin")?.value, 0), 0, 600);
      const rpe = clamp(toNum($("logRpe")?.value, 0), 0, 10);
      const type = $("logType")?.value || "practice";
      const notes = $("logNotes")?.value || "";

      if (!minutes || !rpe) return toast("Enter minutes and RPE.", "warn");

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
      toast("Training saved.", "ok");
      renderLog();
      renderDashboard();
    });

    onceBind($("btnSaveReadiness"), "saveReadiness", () => {
      const athleteId = $("readyAthlete")?.value || "";
      if (!athleteId) return toast("Select an athlete.", "warn");

      const row = {
        dateISO: safeISO($("readyDate")?.value) || todayISO(),
        sleep: clamp(toNum($("readySleep")?.value, 0), 0, 16),
        soreness: clamp(toNum($("readySore")?.value, 0), 0, 10),
        stress: clamp(toNum($("readyStress")?.value, 0), 0, 10),
        energy: clamp(toNum($("readyEnergy")?.value, 0), 0, 10),
        injury: $("readyInjury")?.value || ""
      };

      upsertReadiness(athleteId, row);
      toast("Readiness saved.", "ok");
      renderLog();
      renderDashboard();
    });

    function renderTrainingList(athleteId) {
      const list = $("trainingList");
      if (!list) return;
      const sessions = getTraining(athleteId);
      if (!sessions.length) return (list.innerHTML = `<div class="muted small">No training sessions logged yet.</div>`);

      list.innerHTML = sessions.map((s) => `
        <div class="item">
          <div class="grow">
            <div><b>${escHTML(s.dateISO)}</b> • ${escHTML(s.type)}</div>
            <div class="muted small">Minutes ${escHTML(s.minutes)} • RPE ${escHTML(s.rpe)} • Load <b>${escHTML(sessionLoad(s))}</b></div>
            ${s.notes ? `<div class="muted small" style="white-space:pre-wrap">${escHTML(s.notes)}</div>` : ""}
          </div>
          <button class="btn danger small" data-del-train="${escHTML(s.id)}">Delete</button>
        </div>
      `).join("");

      qa("[data-del-train]", list).forEach((btn) => {
        if (btn.__b) return; btn.__b = true;
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-del-train");
          state.logs.training[athleteId] = getTraining(athleteId).filter((x) => x.id !== id);
          saveState();
          toast("Deleted.", "ok");
          renderLog(); renderDashboard();
        });
      });
    }

    function renderReadinessList(athleteId) {
      const list = $("readinessList");
      if (!list) return;
      const rows = getReadiness(athleteId).slice().sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO))).slice(0, 14);
      if (!rows.length) return (list.innerHTML = `<div class="muted small">No readiness entries yet.</div>`);

      list.innerHTML = rows.map((r) => {
        const score = calcReadinessScore(r);
        return `
          <div class="item">
            <div class="grow">
              <div><b>${escHTML(r.dateISO)}</b> • Score <b>${score}</b></div>
              <div class="muted small">Sleep ${escHTML(r.sleep)}h • Sore ${escHTML(r.soreness)} • Stress ${escHTML(r.stress)} • Energy ${escHTML(r.energy)}</div>
              ${r.injury ? `<div class="muted small">Note: ${escHTML(r.injury)}</div>` : ""}
            </div>
            <button class="btn danger small" data-del-ready="${escHTML(r.dateISO)}">Delete</button>
          </div>
        `;
      }).join("");

      qa("[data-del-ready]", list).forEach((btn) => {
        if (btn.__b) return; btn.__b = true;
        btn.addEventListener("click", () => {
          const d = btn.getAttribute("data-del-ready");
          state.logs.readiness[athleteId] = getReadiness(athleteId).filter((x) => x.dateISO !== d);
          saveState();
          toast("Deleted.", "ok");
          renderLog(); renderDashboard();
        });
      });
    }

    if (logAthleteId) renderTrainingList(logAthleteId);
    if (readyAthleteId) renderReadinessList(readyAthleteId);
  }

  // -------------------------
  // WORKOUTS (unchanged logic; expects sportEngine.js + workoutEngine.js)
  // -------------------------
  let selectedSession = null;

  function renderWorkouts() {
    ensureWorkoutViewInjected();
    wireNav();

    const athletes = getAthletes();
    const se = window.sportEngine;
    const we = window.workoutEngine;

    fillAthleteSelect($("wkAthlete"), state.ui.selections.wkAthlete || $("wkAthlete")?.value);
    if ($("wkAthlete")) state.ui.selections.wkAthlete = $("wkAthlete").value || "";
    saveState();

    const sportSel = $("wkSport");
    if (sportSel && se?.SPORTS?.length) {
      sportSel.innerHTML = se.SPORTS.map((s) => `<option value="${escHTML(s.id)}">${escHTML(s.label)}</option>`).join("");
    }

    if ($("wkStart") && !safeISO($("wkStart").value)) {
      $("wkStart").value = (we?.weekStartMondayISO ? we.weekStartMondayISO(todayISO()) : todayISO());
    }

    const athleteId = $("wkAthlete")?.value || athletes[0]?.id || "";
    if (!athleteId) {
      setText("wkSummary", "Add athletes in Team tab.");
      const out = $("wkWeeksOut"); if (out) out.innerHTML = `<div class="muted small">No athletes yet.</div>`;
      return;
    }

    const a = getAthlete(athleteId);
    const existing = state.workouts[athleteId] || null;
    const sportId = existing?.sportId || a?.sportId || "basketball";
    const level = existing?.level || "standard";

    if (sportSel) sportSel.value = sportId;
    if ($("wkLevel")) $("wkLevel").value = level;

    const plan = existing;

    function updateSummary(planObj) {
      if (!planObj) {
        setText("wkSummary", `No workout plan yet for ${a?.name || "athlete"}. Generate one above.`);
        return;
      }
      const total = planObj.weeksPlan.reduce((acc, w) => acc + (w.weeklyLoad || 0), 0);
      setText("wkSummary",
        `Sport: ${planObj.sportId} • Level: ${planObj.level}\n` +
        `Start: ${planObj.startISO} • Weeks: ${planObj.weeks}\n` +
        `Total planned load: ${Math.round(total)}`
      );
    }

    function findSessionById(planObj, id) {
      for (const w of (planObj?.weeksPlan || [])) {
        const s = (w.sessions || []).find((x) => x.id === id);
        if (s) return s;
      }
      return null;
    }

    function renderSessionDetail(sess) {
      setText("wkSelected",
        `${sess.dateISO} • ${sess.dayType.toUpperCase()} • Phase ${sess.phase}\n` +
        `Minutes ${sess.minutes} • RPE ${sess.rpe} • Load ${sess.load}`
      );

      const wrap = $("wkDetail");
      if (!wrap) return;

      const blocksHTML = (sess.blocks || []).map((b) => {
        const ex = (b.exercises || []).map((e) => `
          <div class="exercise">
            <div>
              <b>${escHTML(e.name)}</b>
              <div class="muted">${escHTML(e.notes || "")}</div>
            </div>
            <div class="mono muted">${escHTML(e.sets || "")} × ${escHTML(e.reps || "")}</div>
          </div>
        `).join("");

        return `
          <div class="block">
            <div class="block-title">
              <span>${escHTML(b.title)}</span>
              <span class="muted">${escHTML(b.focus || "")}</span>
            </div>
            ${ex || `<div class="muted small">No exercises</div>`}
          </div>
        `;
      }).join("");

      wrap.innerHTML = blocksHTML || `<div class="muted small">No blocks.</div>`;

      const logBtn = $("btnLogSession");
      const editBtn = $("btnEditSession");
      if (logBtn) logBtn.disabled = false;
      if (editBtn) editBtn.disabled = false;
    }

    function renderWeeks(planObj) {
      const out = $("wkWeeksOut");
      if (!out) return;

      if (!planObj?.weeksPlan?.length) {
        out.innerHTML = `<div class="muted small">No plan yet. Generate above.</div>`;
        return;
      }

      out.innerHTML = planObj.weeksPlan.map((w) => {
        const pills = w.phase ? `<span class="pill">${escHTML(w.phase)}</span>` : "";
        return `
          <div class="item">
            <div class="grow">
              <div><b>Week ${escHTML(w.weekIndex1)}</b> • ${escHTML(w.weekStartISO)} ${pills}</div>
              <div class="muted small">Planned weekly load: <b>${escHTML(w.weeklyLoad)}</b></div>
              <div class="muted small">Tap a session below:</div>
              <div class="row gap wrap" style="margin-top:8px">
                ${w.sessions.map((s) => `
                  <button class="btn ghost small"
                    data-wk-sess="${escHTML(s.id)}"
                    title="Load ${escHTML(s.load)}">
                    ${escHTML(s.dateISO.slice(5))} • ${escHTML(s.dayType)} • ${escHTML(s.minutes)}m @ ${escHTML(s.rpe)}
                  </button>
                `).join("")}
              </div>
            </div>
          </div>
        `;
      }).join("");

      qa("[data-wk-sess]", out).forEach((btn) => {
        if (btn.__b) return; btn.__b = true;
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-wk-sess");
          const sess = findSessionById(planObj, id);
          if (!sess) return;
          selectedSession = sess;
          renderSessionDetail(sess);
        });
      });
    }

    onceBind($("btnGenWorkout"), "genWorkout", () => {
      if (!we?.generate) return toast("workoutEngine.js not loaded.", "warn");
      if (!se?.SPORTS?.length) return toast("sportEngine.js not loaded.", "warn");

      const aId = $("wkAthlete")?.value || "";
      if (!aId) return toast("Select athlete.", "warn");

      const sportId = $("wkSport")?.value || "basketball";
      const level = $("wkLevel")?.value || "standard";
      const startISO = safeISO($("wkStart")?.value) || todayISO();
      const weeks = clamp(toNum($("wkWeeks")?.value, 6), 2, 16);
      const dayType = $("wkDayType")?.value || "training";

      const planObj = we.generate({ athleteId: aId, sportId, level, startISO, weeks, defaultDayType: dayType });
      state.workouts[aId] = planObj;

      const ath = getAthlete(aId);
      if (ath) ath.sportId = sportId;

      saveState();

      selectedSession = null;
      setText("wkSelected", "Pick a session from the plan.");
      const detail = $("wkDetail"); if (detail) detail.innerHTML = "";

      updateSummary(planObj);
      renderWeeks(planObj);
      toast("Workout plan generated.", "ok");
    });

    onceBind($("btnLogSession"), "logSession", () => {
      if (!selectedSession) return;

      const aId = selectedSession.athleteId;
      const notes = [
        `[WORKOUT PLAN] Sport: ${selectedSession.sportId} • Level: ${selectedSession.level} • Phase: ${selectedSession.phase}`,
        `Blocks:`,
        ...(selectedSession.blocks || []).flatMap((b) => [
          `- ${b.title}:`,
          ...(b.exercises || []).map((e) => `  • ${e.name} (${e.sets}×${e.reps})${e.notes ? " — " + e.notes : ""}`)
        ])
      ].join("\n");

      addTrainingSession(aId, {
        id: uid("sess"),
        dateISO: selectedSession.dateISO,
        minutes: selectedSession.minutes,
        rpe: selectedSession.rpe,
        type: selectedSession.logType || (selectedSession.dayType === "game" ? "game" : "practice"),
        notes,
        load: selectedSession.load
      });

      toast("Logged to Training Log.", "ok");
      renderDashboard();
      showView("log");
      if ($("logAthlete")) $("logAthlete").value = aId;
      if ($("logDate")) $("logDate").value = selectedSession.dateISO;
      renderLog();
    });

    onceBind($("btnEditSession"), "editSession", () => {
      if (!selectedSession) return;
      const min = prompt("Edit minutes:", String(selectedSession.minutes));
      const rpe = prompt("Edit RPE (0–10):", String(selectedSession.rpe));
      const newMin = clamp(toNum(min, selectedSession.minutes), 0, 240);
      const newRpe = clamp(toNum(rpe, selectedSession.rpe), 0, 10);
      selectedSession.minutes = newMin;
      selectedSession.rpe = newRpe;
      selectedSession.load = Math.round(newMin * newRpe);

      const p = state.workouts[selectedSession.athleteId];
      if (p?.weeksPlan) {
        p.weeksPlan.forEach((w) => {
          w.sessions.forEach((s) => {
            if (s.id === selectedSession.id) {
              s.minutes = newMin;
              s.rpe = newRpe;
              s.load = selectedSession.load;
            }
          });
          w.weeklyLoad = (w.sessions || []).reduce((a, s) => a + (s.load || 0), 0);
        });
      }
      saveState();
      toast("Session updated.", "ok");
      renderWorkouts();
    });

    updateSummary(plan);
    renderWeeks(plan);
  }

  // -------------------------
  // NUTRITION (FULL RENDER)
  // -------------------------
  function renderNutrition() {
    const athletes = getAthletes();
    const nutAth = $("nutAthlete");
    const targAth = $("targetAthlete");

    fillAthleteSelect(nutAth, state.ui.selections.nutAthlete || nutAth?.value);
    fillAthleteSelect(targAth, state.ui.selections.targetAthlete || targAth?.value);

    if (nutAth) state.ui.selections.nutAthlete = nutAth.value || "";
    if (targAth) state.ui.selections.targetAthlete = targAth.value || "";
    saveState();

    if ($("nutDate") && !safeISO($("nutDate").value)) $("nutDate").value = todayISO();

    // paywall: keep it simple (always unlocked offline-first)
    const paywall = $("nutPaywall");
    const main = $("nutMain");
    if (paywall) paywall.style.display = "none";
    if (main) main.style.display = "block";

    function currentAthleteId() {
      return nutAth?.value || athletes[0]?.id || "";
    }

    function renderTargetsPanel() {
      const aid = targAth?.value || athletes[0]?.id || "";
      if (!aid) return;

      const t = ensureTargetsForAthlete(aid);
      if ($("tProt")) $("tProt").value = t.protein;
      if ($("tCarb")) $("tCarb").value = t.carbs;
      if ($("tFat")) $("tFat").value = t.fat;
      if ($("tWater")) $("tWater").value = t.waterOz;

      setText("nutExplain",
        [
          "Adherence (0–100) is based on deviation from targets.",
          "Lower deviation = higher score.",
          "Tracks: protein, carbs, fat, water.",
          "",
          "Tip: Set realistic targets per athlete first."
        ].join("\n")
      );
    }

    onceBind($("btnSaveTargets"), "saveTargets", () => {
      const aid = targAth?.value || "";
      if (!aid) return toast("Select athlete.", "warn");

      state.targets[aid] = {
        protein: clamp(toNum($("tProt")?.value, 160), 0, 500),
        carbs: clamp(toNum($("tCarb")?.value, 240), 0, 1200),
        fat: clamp(toNum($("tFat")?.value, 70), 0, 400),
        waterOz: clamp(toNum($("tWater")?.value, 80), 0, 300)
      };
      saveState();
      toast("Targets saved.", "ok");
      renderNutrition();
      renderDashboard();
    });

    function computeNutritionPreview(aid, dateISO) {
      const target = ensureTargetsForAthlete(aid);
      const row = {
        protein: clamp(toNum($("nutProt")?.value, 0), 0, 500),
        carbs: clamp(toNum($("nutCarb")?.value, 0), 0, 1200),
        fat: clamp(toNum($("nutFat")?.value, 0), 0, 400),
        waterOz: clamp(toNum($("nutWater")?.value, 0), 0, 300)
      };
      const adh = calcNutritionAdherence(row, target);
      setText("nutComputed", `${adh}/100`);
    }

    function renderNutritionList(aid) {
      const list = $("nutritionList");
      if (!list) return;
      const rows = getNutrition(aid).slice().sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO))).slice(0, 21);
      if (!rows.length) {
        list.innerHTML = `<div class="muted small">No nutrition entries yet.</div>`;
        return;
      }

      const target = ensureTargetsForAthlete(aid);

      list.innerHTML = rows.map((r) => {
        const score = calcNutritionAdherence(r, target);
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
      }).join("");

      qa("[data-del-nut]", list).forEach((btn) => {
        if (btn.__b) return; btn.__b = true;
        btn.addEventListener("click", () => {
          const d = btn.getAttribute("data-del-nut");
          state.logs.nutrition[aid] = getNutrition(aid).filter((x) => x.dateISO !== d);
          saveState();
          toast("Deleted.", "ok");
          renderNutrition();
          renderDashboard();
        });
      });
    }

    onceBind($("btnSaveNutrition"), "saveNutrition", () => {
      const aid = currentAthleteId();
      if (!aid) return toast("Select athlete.", "warn");

      const dateISO = safeISO($("nutDate")?.value) || todayISO();

      const row = {
        dateISO,
        protein: clamp(toNum($("nutProt")?.value, 0), 0, 500),
        carbs: clamp(toNum($("nutCarb")?.value, 0), 0, 1200),
        fat: clamp(toNum($("nutFat")?.value, 0), 0, 400),
        waterOz: clamp(toNum($("nutWater")?.value, 0), 0, 300),
        notes: ($("nutNotes")?.value || "").trim()
      };

      upsertNutrition(aid, row);
      toast("Nutrition saved.", "ok");
      renderNutrition();
      renderDashboard();
    });

    onceBind($("btnQuickMeal"), "quickMeal", () => {
      const aid = currentAthleteId();
      if (!aid) return toast("Select athlete.", "warn");

      const d = safeISO($("nutDate")?.value) || todayISO();
      const existing = getNutrition(aid).find((n) => n.dateISO === d) || { dateISO: d, protein: 0, carbs: 0, fat: 0, waterOz: 0, notes: "" };

      const updated = {
        ...existing,
        protein: clamp(toNum(existing.protein) + toNum($("qmProt")?.value, 0), 0, 9999),
        carbs: clamp(toNum(existing.carbs) + toNum($("qmCarb")?.value, 0), 0, 9999),
        fat: clamp(toNum(existing.fat) + toNum($("qmFat")?.value, 0), 0, 9999),
        waterOz: clamp(toNum(existing.waterOz) + toNum($("qmWater")?.value, 0), 0, 9999)
      };

      upsertNutrition(aid, updated);
      toast("Added to today.", "ok");
      renderNutrition();
      renderDashboard();
    });

    // Meal plan generator (simple, target-driven)
    onceBind($("btnGenerateMealPlan"), "mealPlan", () => {
      const aid = $("mealAthlete")?.value || currentAthleteId();
      if (!aid) return toast("Select athlete.", "warn");

      const start = safeISO($("mealStart")?.value) || todayISO();
      const days = clamp(toNum($("mealDays")?.value, 7), 1, 21);
      const dayType = $("mealDayType")?.value || "training";
      const diet = $("mealDiet")?.value || "standard";

      const t = ensureTargetsForAthlete(aid);
      const out = $("mealPlanOut");
      if (!out) return;

      const lines = [];
      for (let i = 0; i < days; i++) {
        const d = addDaysISO(start, i);
        const type = (dayType === "auto")
          ? ((new Date(d).getDay() === 0 || new Date(d).getDay() === 6) ? "rest" : "training")
          : dayType;

        let p = t.protein, c = t.carbs, f = t.fat;
        if (type === "rest") { c = Math.round(c * 0.85); }
        if (type === "game") { c = Math.round(c * 1.10); }
        if (diet === "highprotein") { p = Math.round(p * 1.10); f = Math.round(f * 0.95); }
        if (diet === "lowerfat") { f = Math.round(f * 0.80); c = Math.round(c * 1.05); }

        lines.push(`
          <div class="item">
            <div class="grow">
              <div><b>${escHTML(d)}</b> • ${escHTML(type.toUpperCase())}</div>
              <div class="muted small">Targets: P ${p} • C ${c} • F ${f} • Water ${t.waterOz}oz</div>
              <div class="muted small">Example structure: Breakfast + Lunch + Dinner + 1–2 snacks (hit totals)</div>
            </div>
          </div>
        `);
      }

      out.innerHTML = lines.join("");
      toast("Meal plan generated.", "ok");
    });

    // Sync meal athlete selector list too
    fillAthleteSelect($("mealAthlete"), state.ui.selections.nutAthlete || currentAthleteId());
    if ($("mealStart") && !safeISO($("mealStart").value)) $("mealStart").value = todayISO();

    // Bind change events
    if (nutAth && !nutAth.__b) {
      nutAth.__b = true;
      nutAth.addEventListener("change", () => {
        state.ui.selections.nutAthlete = nutAth.value || "";
        saveState();
        renderNutrition();
      });
    }
    if (targAth && !targAth.__b) {
      targAth.__b = true;
      targAth.addEventListener("change", () => {
        state.ui.selections.targetAthlete = targAth.value || "";
        saveState();
        renderNutrition();
      });
    }

    // Render current day values if already exist
    const aid = currentAthleteId();
    const dateISO = safeISO($("nutDate")?.value) || todayISO();
    const existing = aid ? getNutrition(aid).find((n) => n.dateISO === dateISO) : null;

    if (existing) {
      if ($("nutProt")) $("nutProt").value = existing.protein ?? 0;
      if ($("nutCarb")) $("nutCarb").value = existing.carbs ?? 0;
      if ($("nutFat")) $("nutFat").value = existing.fat ?? 0;
      if ($("nutWater")) $("nutWater").value = existing.waterOz ?? 0;
      if ($("nutNotes")) $("nutNotes").value = existing.notes ?? "";
    }

    // Live adherence preview
    ["nutProt", "nutCarb", "nutFat", "nutWater"].forEach((id) => {
      const el = $(id);
      if (!el || el.__b) return;
      el.__b = true;
      el.addEventListener("input", () => computeNutritionPreview(aid, dateISO));
    });
    computeNutritionPreview(aid, dateISO);

    renderTargetsPanel();
    if (aid) renderNutritionList(aid);
  }

  // -------------------------
  // PERIODIZATION (FULL RENDER)
  // -------------------------
  function renderPeriodization() {
    const athletes = getAthletes();
    const perAth = $("perAthlete");
    const monAth = $("monAthlete");

    fillAthleteSelect(perAth, state.ui.selections.perAthlete || perAth?.value);
    fillAthleteSelect(monAth, state.ui.selections.monAthlete || monAth?.value);

    if (perAth) state.ui.selections.perAthlete = perAth.value || "";
    if (monAth) state.ui.selections.monAthlete = monAth.value || "";
    saveState();

    if ($("perStart") && !safeISO($("perStart").value)) $("perStart").value = todayISO();
    if ($("monWeek") && !safeISO($("monWeek").value)) $("monWeek").value = todayISO();

    function getPhaseForWeek(weekIndex1, deloadEvery) {
      const pe = window.periodizationEngine;

      // Force deload based on selected frequency
      if (deloadEvery && weekIndex1 % deloadEvery === 0) return "DELOAD";

      // Otherwise use engine if present
      if (pe?.getCurrentPhase) return pe.getCurrentPhase(weekIndex1);

      // fallback
      if (weekIndex1 % 4 === 0) return "DELOAD";
      if (weekIndex1 % 8 === 0) return "PEAK";
      return "ACCUMULATION";
    }

    function baseWeekTemplate(goal) {
      // Simple, usable defaults. Coaches can adjust by logging actual sessions.
      if (goal === "offseason") {
        return [
          { day: "Mon", type: "lift", minutes: 75, rpe: 7 },
          { day: "Tue", type: "skills", minutes: 70, rpe: 6.5 },
          { day: "Thu", type: "lift", minutes: 75, rpe: 7 },
          { day: "Sat", type: "conditioning", minutes: 55, rpe: 6.5 }
        ];
      }
      if (goal === "rehab") {
        return [
          { day: "Mon", type: "recovery", minutes: 45, rpe: 4.5 },
          { day: "Wed", type: "skills", minutes: 50, rpe: 5 },
          { day: "Fri", type: "lift", minutes: 50, rpe: 5.5 }
        ];
      }
      // inseason
      return [
        { day: "Mon", type: "practice", minutes: 75, rpe: 6.5 },
        { day: "Wed", type: "lift", minutes: 55, rpe: 6 },
        { day: "Fri", type: "practice", minutes: 70, rpe: 6.5 }
      ];
    }

    function adjustByPhase(minutes, rpe, phase) {
      const pe = window.periodizationEngine;
      let m = minutes, r = rpe;

      if (phase === "DELOAD") { m *= 0.65; r -= 1.0; }
      if (phase === "ACCUMULATION") { m *= 1.05; r += 0.25; }
      if (phase === "INTENSIFICATION") { m *= 0.95; r += 0.5; }
      if (phase === "PEAK") { m *= 0.85; r += 0.25; }

      // allow engine volume adjust
      if (pe?.adjustVolume) m = pe.adjustVolume(m, phase);

      return { minutes: clamp(Math.round(m), 20, 120), rpe: clamp(Math.round(r * 2) / 2, 3, 10) };
    }

    function weekStartMondayISO(iso) {
      const d = new Date(safeISO(iso) || todayISO());
      const day = d.getDay(); // 0=Sun
      const diff = (day === 0 ? -6 : 1) - day;
      d.setDate(d.getDate() + diff);
      return d.toISOString().slice(0, 10);
    }

    function generatePlan({ athleteId, startISO, weeks, goal, deloadEvery }) {
      const start = weekStartMondayISO(startISO);
      const W = clamp(weeks, 2, 24);
      const tmpl = baseWeekTemplate(goal);

      const weeksPlan = [];
      for (let i = 1; i <= W; i++) {
        const wkStart = addDaysISO(start, (i - 1) * 7);
        const phase = getPhaseForWeek(i, deloadEvery);

        const sessions = tmpl.map((t) => {
          const dayIndex =
            t.day === "Mon" ? 0 :
            t.day === "Tue" ? 1 :
            t.day === "Wed" ? 2 :
            t.day === "Thu" ? 3 :
            t.day === "Fri" ? 4 :
            t.day === "Sat" ? 5 : 6;

          const dateISO = addDaysISO(wkStart, dayIndex);
          const adj = adjustByPhase(t.minutes, t.rpe, phase);
          const load = Math.round(adj.minutes * adj.rpe);

          return {
            id: uid("planSess"),
            dateISO,
            day: t.day,
            type: t.type,
            phase,
            minutes: adj.minutes,
            rpe: adj.rpe,
            load
          };
        });

        const weeklyLoad = sessions.reduce((a, s) => a + (s.load || 0), 0);
        weeksPlan.push({ weekIndex1: i, weekStartISO: wkStart, phase, sessions, weeklyLoad });
      }

      return { athleteId, startISO: start, weeks: W, goal, deloadEvery, weeksPlan };
    }

    function renderPlanList(plan) {
      const list = $("planList");
      if (!list) return;

      if (!plan?.weeksPlan?.length) {
        list.innerHTML = `<div class="muted small">No plan yet. Generate above.</div>`;
        return;
      }

      list.innerHTML = plan.weeksPlan.map((w) => `
        <div class="item">
          <div class="grow">
            <div><b>Week ${escHTML(w.weekIndex1)}</b> • ${escHTML(w.weekStartISO)} • <span class="pill">${escHTML(w.phase)}</span></div>
            <div class="muted small">Planned weekly load: <b>${escHTML(w.weeklyLoad)}</b></div>
            <div class="muted small">Sessions:</div>
            <div class="row gap wrap" style="margin-top:8px">
              ${w.sessions.map((s) => `
                <span class="pill" title="Load ${escHTML(s.load)}">${escHTML(s.day)} • ${escHTML(s.type)} • ${escHTML(s.minutes)}m @ ${escHTML(s.rpe)}</span>
              `).join("")}
            </div>
          </div>
        </div>
      `).join("");
    }

    onceBind($("btnGeneratePlan"), "genPlan", () => {
      const athleteId = perAth?.value || "";
      if (!athleteId) return toast("Select athlete.", "warn");

      const startISO = safeISO($("perStart")?.value) || todayISO();
      const weeks = clamp(toNum($("perWeeks")?.value, 8), 2, 24);
      const goal = $("perGoal")?.value || "inseason";
      const deloadEvery = clamp(toNum($("perDeload")?.value, 4), 3, 6);

      const plan = generatePlan({ athleteId, startISO, weeks, goal, deloadEvery });
      state.periodization[athleteId] = plan;
      saveState();
      toast("Periodization plan generated.", "ok");
      renderPlanList(plan);
    });

    onceBind($("btnCompareWeek"), "compareWeek", () => {
      const athleteId = monAth?.value || "";
      if (!athleteId) return toast("Select athlete.", "warn");

      const wkStart = weekStartMondayISO(safeISO($("monWeek")?.value) || todayISO());
      const wkEnd = addDaysISO(wkStart, 6);

      const plan = state.periodization[athleteId];
      const plannedWeek = plan?.weeksPlan?.find((w) => w.weekStartISO === wkStart) || null;

      const actualSessions = getTraining(athleteId).filter((s) => s.dateISO >= wkStart && s.dateISO <= wkEnd);
      const actualLoad = actualSessions.reduce((a, s) => a + sessionLoad(s), 0);

      const plannedLoad = plannedWeek ? plannedWeek.weeklyLoad : 0;

      const delta = plannedWeek ? Math.round(actualLoad - plannedLoad) : null;
      const pct = plannedWeek && plannedLoad > 0 ? Math.round((actualLoad / plannedLoad) * 100) : null;

      const summary = plannedWeek
        ? `Week ${wkStart}: Planned ${plannedLoad} • Actual ${actualLoad} • ${pct}% (${delta >= 0 ? "+" : ""}${delta})`
        : `Week ${wkStart}: No planned week found • Actual ${actualLoad}`;

      setText("compareSummary", summary);

      const detail = [
        `Week range: ${wkStart} to ${wkEnd}`,
        plannedWeek ? `Plan phase: ${plannedWeek.phase}` : `Plan phase: —`,
        "",
        "Actual sessions:",
        actualSessions.length
          ? actualSessions.map((s) => `- ${s.dateISO} • ${s.type} • ${s.minutes}m @ ${s.rpe} • load ${sessionLoad(s)}`).join("\n")
          : "- none",
        "",
        plannedWeek
          ? ("Planned sessions:\n" + plannedWeek.sessions.map((s) => `- ${s.dateISO} • ${s.type} • ${s.minutes}m @ ${s.rpe} • load ${s.load}`).join("\n"))
          : "Planned sessions:\n- none"
      ].join("\n");

      setText("compareDetail", detail);
      toast("Week comparison ready.", "ok");
    });

    // Load existing plan if present
    const athleteId = perAth?.value || athletes[0]?.id || "";
    const plan = athleteId ? state.periodization[athleteId] : null;
    renderPlanList(plan);
  }

  // -------------------------
  // SETTINGS
  // -------------------------
  function renderSettings() {
    const view = $("view-settings");
    if (view && !$("roleToggleBlock")) {
      const card = q(".card", view);
      if (card) {
        const block = document.createElement("div");
        block.className = "mini";
        block.id = "roleToggleBlock";
        block.innerHTML = `
          <div class="minihead">Role</div>
          <div class="minibody small muted">Controls what the UI emphasizes (coach vs athlete).</div>
          <div class="row gap wrap" style="margin-top:10px">
            <button class="btn ghost" id="btnRoleCoach">Coach</button>
            <button class="btn ghost" id="btnRoleAthlete">Athlete</button>
            <span class="pill" id="rolePill">—</span>
          </div>
        `;
        card.appendChild(block);

        onceBind($("btnRoleCoach"), "roleCoach", () => { state.user.role = "coach"; saveState(); toast("Role: coach", "ok"); renderSettings(); });
        onceBind($("btnRoleAthlete"), "roleAth", () => { state.user.role = "athlete"; saveState(); toast("Role: athlete", "ok"); renderSettings(); });
      }
    }
    const roleP = $("rolePill");
    if (roleP) roleP.textContent = `Role: ${state.user.role}`;

    const info = $("appInfo");
    if (info) {
      info.textContent =
        `PerformanceIQ v${APP_VERSION}\n` +
        `Role: ${state.user.role}\n` +
        `LocalStorage: ${STORAGE_KEY}\n` +
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
  // Boot
  // -------------------------
  function boot() {
    ensureToast();
    ensureWorkoutViewInjected();
    hideSplash();
    wireNav();

    // If no athletes, push to Team view (competitor-style guided onboarding)
    if (!state.athletes.length) {
      toast("Start by adding an athlete (Team tab).", "warn");
      showView("team");
      return;
    }

    // Resume last view
    showView(state.ui.lastView || "dashboard");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
