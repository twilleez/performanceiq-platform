// core.js — PerformanceIQ v2.8.0 (Automation Layer + Athlete Mode)
// Offline-first • localStorage state • sport + workouts + nutrition + periodization wiring
(function () {
  "use strict";
  if (window.corePIQ) return;

  // ---------------------------
  // Small utils
  // ---------------------------
  const LS_KEY = "piq_state_v280";

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const clamp = (n, a, b) => Math.min(Math.max(Number(n) || 0, a), b);

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }
  function safeISO(d) {
    const s = String(d || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }
  function addDaysISO(iso, days) {
    const d = safeISO(iso) || todayISO();
    const ms = Date.parse(d);
    return new Date(ms + days * 86400000).toISOString().slice(0, 10);
  }
  function weekStartMondayISO(iso) {
    // also available in workoutEngine; keep local for safety
    const d = new Date(safeISO(iso) || todayISO());
    const day = d.getDay(); // 0 Sun..6 Sat
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }
  function uid(prefix = "id") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  }

  function isMobile() {
    return window.matchMedia("(max-width: 820px)").matches;
  }

  // ---------------------------
  // State
  // ---------------------------
  const defaultState = () => ({
    meta: {
      version: "2.8.0",
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
      device: {}
    },
    team: {
      id: "team_default",
      name: "Default",
      seasonStart: todayISO(),
      seasonEnd: addDaysISO(todayISO(), 120),
      macroDefaults: { protein: 160, carbs: 240, fat: 70, water: 90 },
      weights: { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 }
    },
    ui: {
      view: "dashboard",
      role: "coach", // "coach" | "athlete"
      activeAthleteId: null,
      onboardingDone: false
    },
    athletes: [
      // {id,name,position,heightIn,weightLb,sportId,macroTargets:{...},workoutLevel:"standard"}
    ],
    trainingLogs: [
      // {id,athleteId,dateISO,minutes,rpe,type,notes,load,createdAt}
    ],
    readinessLogs: [
      // {id,athleteId,dateISO,sleepHrs,soreness,stress,energy,injury,score,createdAt}
    ],
    nutritionLogs: [
      // {id,athleteId,dateISO,protein,carbs,fat,water,notes,adherence,createdAt}
    ],
    workouts: {
      // athleteId: { athleteId,sportId,level,startISO,weeks,createdAt,weeksPlan:[...] }
    }
  });

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return migrate(parsed);
    } catch (e) {
      return defaultState();
    }
  }

  function saveState() {
    state.meta.lastOpenedAt = Date.now();
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      // ignore
    }
  }

  function migrate(s) {
    // shallow safety
    const base = defaultState();
    const out = typeof s === "object" && s ? s : base;

    out.meta = { ...base.meta, ...(out.meta || {}) };
    out.team = { ...base.team, ...(out.team || {}) };
    out.ui = { ...base.ui, ...(out.ui || {}) };

    out.athletes = Array.isArray(out.athletes) ? out.athletes : [];
    out.trainingLogs = Array.isArray(out.trainingLogs) ? out.trainingLogs : [];
    out.readinessLogs = Array.isArray(out.readinessLogs) ? out.readinessLogs : [];
    out.nutritionLogs = Array.isArray(out.nutritionLogs) ? out.nutritionLogs : [];
    out.workouts = out.workouts && typeof out.workouts === "object" ? out.workouts : {};

    // ensure weights/macro defaults exist
    out.team.macroDefaults = { ...base.team.macroDefaults, ...(out.team.macroDefaults || {}) };
    out.team.weights = { ...base.team.weights, ...(out.team.weights || {}) };

    // ensure athlete fields
    out.athletes = out.athletes.map(a => ({
      id: a.id || uid("ath"),
      name: a.name || "Athlete",
      position: a.position || "",
      heightIn: Number(a.heightIn) || null,
      weightLb: Number(a.weightLb) || null,
      sportId: a.sportId || "basketball",
      workoutLevel: a.workoutLevel || "standard",
      macroTargets: {
        protein: Number(a?.macroTargets?.protein) || out.team.macroDefaults.protein,
        carbs: Number(a?.macroTargets?.carbs) || out.team.macroDefaults.carbs,
        fat: Number(a?.macroTargets?.fat) || out.team.macroDefaults.fat,
        water: Number(a?.macroTargets?.water) || out.team.macroDefaults.water
      }
    }));

    if (!out.ui.activeAthleteId && out.athletes[0]) out.ui.activeAthleteId = out.athletes[0].id;

    return out;
  }

  // ---------------------------
  // Device info + responsive mode
  // ---------------------------
  function updateDeviceFlags() {
    const dpr = window.devicePixelRatio || 1;
    state.meta.device = {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr,
      ua: navigator.userAgent || ""
    };
    document.body.classList.toggle("is-mobile", isMobile());
    saveState();
  }

  // ---------------------------
  // Navigation
  // ---------------------------
  function setView(view) {
    state.ui.view = view;
    saveState();
    render();
  }

  function wireNav() {
    document.querySelectorAll(".navbtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = btn.getAttribute("data-view");
        if (!v) return;
        setView(v);
      });
    });
  }

  function applyViewVisibility() {
    const view = state.ui.view;
    document.querySelectorAll(".view").forEach(sec => (sec.hidden = true));
    const active = $("view-" + view);
    if (active) active.hidden = false;

    document.querySelectorAll(".navbtn").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-view") === view);
    });

    // Athlete mode: hide “Team” (and any heavy analytics feel) but keep Log/Workouts/Nutrition/Settings
    const role = state.ui.role;
    const hideInAthlete = new Set(["team"]); // keep dashboard but render athlete version
    document.querySelectorAll(".navbtn").forEach(b => {
      const v = b.getAttribute("data-view");
      if (!v) return;
      const shouldHide = role === "athlete" && hideInAthlete.has(v);
      b.style.display = shouldHide ? "none" : "";
    });
  }

  // ---------------------------
  // Athlete helpers
  // ---------------------------
  function getAthlete(id) {
    const aid = id || state.ui.activeAthleteId;
    return state.athletes.find(a => a.id === aid) || state.athletes[0] || null;
  }

  function fillSelect(selectEl, options, selectedValue) {
    if (!selectEl) return;
    selectEl.innerHTML = options
      .map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`)
      .join("");
    if (selectedValue) selectEl.value = selectedValue;
  }

  function athleteOptions() {
    return state.athletes.map(a => ({ value: a.id, label: a.name }));
  }

  // ---------------------------
  // Log computations
  // ---------------------------
  function computeTrainingLoad(minutes, rpe) {
    const m = clamp(minutes, 0, 600);
    const r = clamp(rpe, 0, 10);
    return Math.round(m * r);
  }

  function computeReadinessScore({ sleepHrs, soreness, stress, energy }) {
    // simple normalized score 0–100
    const sleep = clamp(sleepHrs, 0, 16) / 8; // 1.0 at 8 hours
    const sore = 1 - clamp(soreness, 0, 10) / 10;
    const str = 1 - clamp(stress, 0, 10) / 10;
    const eng = clamp(energy, 0, 10) / 10;
    const raw = (sleep * 0.35 + sore * 0.25 + str * 0.20 + eng * 0.20) * 100;
    return Math.round(clamp(raw, 0, 100));
  }

  function computeNutritionAdherence(athlete, { protein, carbs, fat, water }) {
    const t = athlete?.macroTargets || state.team.macroDefaults;
    const p = Math.max(0, Number(protein) || 0);
    const c = Math.max(0, Number(carbs) || 0);
    const f = Math.max(0, Number(fat) || 0);
    const w = Math.max(0, Number(water) || 0);

    const scorePart = (actual, target) => {
      const T = Math.max(1, Number(target) || 1);
      const ratio = actual / T;
      // perfect at 1.0; penalty grows if too low or too high
      const delta = Math.abs(1 - ratio);
      const s = 1 - Math.min(1, delta); // 0..1
      return s;
    };

    const sp = scorePart(p, t.protein);
    const sc = scorePart(c, t.carbs);
    const sf = scorePart(f, t.fat);
    const sw = scorePart(w, t.water);

    const raw = (sp * 0.35 + sc * 0.35 + sf * 0.20 + sw * 0.10) * 100;
    return Math.round(clamp(raw, 0, 100));
  }

  // ---------------------------
  // Automation Layer (Phase 1)
  // ---------------------------
  function getRecentLogsByDays(arr, athleteId, endISO, days) {
    const end = safeISO(endISO) || todayISO();
    const start = addDaysISO(end, -(days - 1));
    return arr
      .filter(x => x.athleteId === athleteId && x.dateISO >= start && x.dateISO <= end)
      .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
  }

  function sumLoads(logs) {
    return logs.reduce((s, x) => s + (Number(x.load) || 0), 0);
  }

  function avg(nums) {
    if (!nums.length) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  function computeACWRish(athleteId, dateISO) {
    const acute = sumLoads(getRecentLogsByDays(state.trainingLogs, athleteId, dateISO, 7));
    const chronic = sumLoads(getRecentLogsByDays(state.trainingLogs, athleteId, dateISO, 28));
    const chronicPerWeek = chronic / 4;
    const ratio = chronicPerWeek > 0 ? acute / chronicPerWeek : 0;
    return { acute, chronicPerWeek: Math.round(chronicPerWeek), ratio: Number(ratio.toFixed(2)) };
  }

  function computeLoadSpike(athleteId, dateISO) {
    const end = safeISO(dateISO) || todayISO();
    const todayLogs = getRecentLogsByDays(state.trainingLogs, athleteId, end, 1);
    const todayLoad = sumLoads(todayLogs);

    const prev7 = getRecentLogsByDays(state.trainingLogs, athleteId, addDaysISO(end, -1), 7);
    const avg7 = prev7.length ? sumLoads(prev7) / 7 : 0;

    const spike = avg7 > 0 ? todayLoad / avg7 : 0;
    return { todayLoad, avg7: Math.round(avg7), spike: Number(spike.toFixed(2)) };
  }

  function computeNutritionTrendWarning(athleteId, dateISO) {
    const logs = getRecentLogsByDays(state.nutritionLogs, athleteId, dateISO, 3);
    if (!logs.length) return { warn: false, avg: 0, detail: "No recent nutrition logs." };
    const a = Math.round(avg(logs.map(x => Number(x.adherence) || 0)));
    return {
      warn: a > 0 && a < 70,
      avg: a,
      detail: `3-day nutrition adherence avg: ${a}/100`
    };
  }

  function computeSuggestedDeload(athleteId, dateISO) {
    // rule: suggest deload if ACWR > 1.5 OR spike > 1.6 OR readiness avg < 55
    const acwr = computeACWRish(athleteId, dateISO);
    const spike = computeLoadSpike(athleteId, dateISO);
    const ready = getRecentLogsByDays(state.readinessLogs, athleteId, dateISO, 7);
    const readyAvg = ready.length ? Math.round(avg(ready.map(x => Number(x.score) || 0))) : 0;

    const suggest =
      (acwr.ratio >= 1.5 && acwr.chronicPerWeek > 0) ||
      (spike.spike >= 1.6 && spike.avg7 > 0) ||
      (readyAvg > 0 && readyAvg < 55);

    const reasons = [];
    if (acwr.ratio >= 1.5 && acwr.chronicPerWeek > 0) reasons.push(`ACWR-ish ${acwr.ratio} (high)`);
    if (spike.spike >= 1.6 && spike.avg7 > 0) reasons.push(`Load spike ${spike.spike}× vs 7-day avg`);
    if (readyAvg > 0 && readyAvg < 55) reasons.push(`Low readiness avg ${readyAvg}`);

    return { suggest, reasons, acwr, spike, readyAvg };
  }

  function computeRiskBadge(athleteId, dateISO) {
    // simple grade: based on ACWR-ish + readiness + nutrition adherence
    const acwr = computeACWRish(athleteId, dateISO);
    const spike = computeLoadSpike(athleteId, dateISO);
    const ready = getRecentLogsByDays(state.readinessLogs, athleteId, dateISO, 3);
    const readyAvg = ready.length ? avg(ready.map(x => Number(x.score) || 0)) : 0;

    const nut = getRecentLogsByDays(state.nutritionLogs, athleteId, dateISO, 3);
    const nutAvg = nut.length ? avg(nut.map(x => Number(x.adherence) || 0)) : 0;

    let risk = 20;
    if (acwr.ratio >= 1.5 && acwr.chronicPerWeek > 0) risk += 30;
    if (acwr.ratio >= 2.0 && acwr.chronicPerWeek > 0) risk += 20;
    if (spike.spike >= 1.6 && spike.avg7 > 0) risk += 20;

    if (readyAvg > 0) {
      if (readyAvg < 55) risk += 20;
      else if (readyAvg < 65) risk += 10;
      else risk -= 5;
    }
    if (nutAvg > 0) {
      if (nutAvg < 70) risk += 10;
      else if (nutAvg >= 85) risk -= 5;
    }

    risk = clamp(Math.round(risk), 0, 100);

    const band =
      risk >= 75 ? "HIGH" :
      risk >= 55 ? "MODERATE" :
      "LOW";

    return { risk, band, acwr, spike, readyAvg: Math.round(readyAvg || 0), nutAvg: Math.round(nutAvg || 0) };
  }

  function computeWeeklySummary(athleteId, endISO) {
    const end = safeISO(endISO) || todayISO();
    const train = getRecentLogsByDays(state.trainingLogs, athleteId, end, 7);
    const read = getRecentLogsByDays(state.readinessLogs, athleteId, end, 7);
    const nut = getRecentLogsByDays(state.nutritionLogs, athleteId, end, 7);

    const load = sumLoads(train);
    const sessions = train.length;
    const readinessAvg = read.length ? Math.round(avg(read.map(x => Number(x.score) || 0))) : 0;
    const nutAvg = nut.length ? Math.round(avg(nut.map(x => Number(x.adherence) || 0))) : 0;

    return { endISO: end, load, sessions, readinessAvg, nutAvg };
  }

  // ---------------------------
  // PIQ Score (simple blend)
  // ---------------------------
  function computePIQ(athleteId, dateISO) {
    const w = state.team.weights;
    const sumW = (w.readiness + w.training + w.recovery + w.nutrition + w.risk);
    const weights = sumW === 100 ? w : { ...w, readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 };

    // readiness: last 3 days avg
    const ready3 = getRecentLogsByDays(state.readinessLogs, athleteId, dateISO, 3);
    const readiness = ready3.length ? Math.round(avg(ready3.map(x => Number(x.score) || 0))) : 50;

    // training: based on weekly load vs chronic (stable is better than spiky)
    const acwr = computeACWRish(athleteId, dateISO);
    let training = 70;
    if (acwr.chronicPerWeek > 0) {
      const r = acwr.ratio;
      // 0.8–1.3 “good”; outside penalized
      const penalty = Math.min(40, Math.abs(1.05 - r) * 60);
      training = Math.round(clamp(85 - penalty, 0, 100));
    }

    // recovery: inverse of soreness+stress (use last readiness log)
    const rLast = getRecentLogsByDays(state.readinessLogs, athleteId, dateISO, 1)[0];
    let recovery = 60;
    if (rLast) {
      const sore = clamp(rLast.soreness, 0, 10);
      const str = clamp(rLast.stress, 0, 10);
      recovery = Math.round(clamp(100 - (sore * 5 + str * 5), 0, 100));
    }

    // nutrition: last 3 days avg
    const nut3 = getRecentLogsByDays(state.nutritionLogs, athleteId, dateISO, 3);
    const nutrition = nut3.length ? Math.round(avg(nut3.map(x => Number(x.adherence) || 0))) : 55;

    // risk: inverse of risk index
    const riskObj = computeRiskBadge(athleteId, dateISO);
    const risk = Math.round(clamp(100 - riskObj.risk, 0, 100));

    const piq =
      readiness * (weights.readiness / 100) +
      training * (weights.training / 100) +
      recovery * (weights.recovery / 100) +
      nutrition * (weights.nutrition / 100) +
      risk * (weights.risk / 100);

    const score = Math.round(clamp(piq, 0, 100));
    const band =
      score >= 85 ? "Elite" :
      score >= 70 ? "Strong" :
      score >= 55 ? "Building" :
      "Needs Attention";

    const explain =
      `Readiness (3d avg): ${readiness}\n` +
      `Training (ACWR-ish): ${training}  (acute=${acwr.acute}, chronic/wk=${acwr.chronicPerWeek}, ratio=${acwr.ratio})\n` +
      `Recovery (stress+sore): ${recovery}\n` +
      `Nutrition (3d avg): ${nutrition}\n` +
      `Risk inverse: ${risk} (risk=${riskObj.risk}, band=${riskObj.band})\n\n` +
      `Weights: Rdy ${weights.readiness}, Trn ${weights.training}, Rec ${weights.recovery}, Nut ${weights.nutrition}, Risk ${weights.risk}`;

    return { score, band, readiness, training, recovery, nutrition, riskInverse: risk, explain };
  }

  // ---------------------------
  // Rendering: Team / Log / Nutrition / Periodization / Workouts
  // ---------------------------
  function renderTeamPill() {
    const pill = $("activeTeamPill");
    if (pill) pill.textContent = `Team: ${state.team.name || "Default"}`;
  }

  function renderDashboard() {
    const role = state.ui.role;
    const a = getAthlete();
    const dashAthlete = $("dashAthlete");
    const dashDate = $("dashDate");

    // fill athlete selects
    const opts = athleteOptions();
    fillSelect(dashAthlete, opts, a?.id || "");
    fillSelect($("riskAthlete"), opts, a?.id || "");
    fillSelect($("logAthlete"), opts, a?.id || "");
    fillSelect($("readyAthlete"), opts, a?.id || "");
    fillSelect($("nutAthlete"), opts, a?.id || "");
    fillSelect($("targetAthlete"), opts, a?.id || "");
    fillSelect($("mealAthlete"), opts, a?.id || "");
    fillSelect($("perAthlete"), opts, a?.id || "");
    fillSelect($("monAthlete"), opts, a?.id || "");

    const dateVal = safeISO(dashDate?.value) || todayISO();
    if (dashDate) dashDate.value = dateVal;
    const athleteId = a?.id || (opts[0]?.value || null);

    if (!athleteId) {
      // no athletes yet — prompt wizard
      injectCoachSummaryCards(true);
      setPIQEmpty("Add an athlete to begin.");
      return;
    }

    // Athlete mode = compliance view
    if (role === "athlete") {
      renderAthleteDashboard(athleteId, dateVal);
    } else {
      renderCoachDashboard(athleteId, dateVal);
    }
  }

  function setPIQEmpty(msg) {
    const piqScore = $("piqScore");
    const piqBand = $("piqBand");
    const piqExplain = $("piqExplain");
    if (piqScore) piqScore.textContent = "—";
    if (piqBand) piqBand.textContent = msg || "—";
    if (piqExplain) piqExplain.textContent = "—";
  }

  function setBar(id, v) {
    const el = $(id);
    if (!el) return;
    const pct = clamp(v, 0, 100);
    el.style.width = pct + "%";
  }

  function injectCoachSummaryCards(empty = false) {
    // Create/inject a coach dashboard summary section (no changes to index.html required)
    let container = $("coachSummaryCards");
    if (!container) {
      container = document.createElement("div");
      container.id = "coachSummaryCards";
      container.className = "grid2";
      const dash = $("view-dashboard");
      if (dash) dash.insertBefore(container, dash.children[1] || null);
    }

    if (state.ui.role === "athlete") {
      container.style.display = "none";
      return;
    }
    container.style.display = "";

    if (empty) {
      container.innerHTML = `
        <div class="card"><div class="cardhead"><h2>Coach Summary</h2><span class="muted">Add athletes to begin</span></div>
          <div class="callout">Use Settings → Onboarding Wizard or Team → Add Athlete.</div></div>
        <div class="card"><div class="cardhead"><h2>Automation</h2><span class="muted">Phase 1 enabled</span></div>
          <div class="mini"><div class="minihead">What turns on after logs exist</div>
            <div class="minibody small muted">Risk badges, spikes, deload suggestion, weekly summary, nutrition warnings.</div></div></div>
      `;
      return;
    }

    // coach team summary: top risk + weekly totals
    const end = todayISO();
    const top = state.athletes
      .map(x => ({ athlete: x, risk: computeRiskBadge(x.id, end) }))
      .sort((a, b) => b.risk.risk - a.risk.risk)
      .slice(0, 3);

    const weeklyLoads = state.athletes.map(x => computeWeeklySummary(x.id, end).load);
    const totalLoad = weeklyLoads.reduce((s, n) => s + n, 0);

    const topHtml = top.map(t => {
      const badge =
        t.risk.band === "HIGH" ? `<span class="pill danger">HIGH</span>` :
        t.risk.band === "MODERATE" ? `<span class="pill warn">MOD</span>` :
        `<span class="pill ok">LOW</span>`;
      return `<div class="item"><div style="flex:1">
        <b>${esc(t.athlete.name)}</b><div class="muted small mono">Risk ${t.risk.risk}/100 • ACWR ${t.risk.acwr.ratio}</div>
      </div>${badge}</div>`;
    }).join("");

    container.innerHTML = `
      <div class="card">
        <div class="cardhead"><h2>Coach Summary</h2><span class="muted">This week</span></div>
        <div class="row gap wrap">
          <span class="pill">Team load: ${totalLoad}</span>
          <span class="pill">Athletes: ${state.athletes.length}</span>
          <span class="pill">Device: ${state.meta.device.width}×${state.meta.device.height}</span>
        </div>
        <div class="mini">
          <div class="minihead">Top risk athletes</div>
          <div class="list">${topHtml || `<div class="muted small">No data yet.</div>`}</div>
        </div>
      </div>

      <div class="card">
        <div class="cardhead"><h2>Automation</h2><span class="muted">Phase 1</span></div>
        <div class="mini">
          <div class="minihead">What we’re running automatically</div>
          <div class="minibody small">
            • risk badges • weekly summaries • deload suggestions • spike banners • nutrition warnings
          </div>
        </div>
        <div class="mini">
          <div class="minihead">Next</div>
          <div class="minibody small muted">
            Athlete Mode is enabled now (clean dashboard + Today pages).
          </div>
        </div>
      </div>
    `;
  }

  function renderCoachDashboard(athleteId, dateISO) {
    injectCoachSummaryCards(false);

    const piq = computePIQ(athleteId, dateISO);
    const riskObj = computeRiskBadge(athleteId, dateISO);
    const weekly = computeWeeklySummary(athleteId, dateISO);
    const deload = computeSuggestedDeload(athleteId, dateISO);
    const nutWarn = computeNutritionTrendWarning(athleteId, dateISO);

    // PIQ UI
    $("piqScore").textContent = String(piq.score);
    $("piqBand").textContent = piq.band;
    $("piqExplain").textContent = piq.explain;

    setBar("barReadiness", piq.readiness);
    setBar("barTraining", piq.training);
    setBar("barRecovery", piq.recovery);
    setBar("barNutrition", piq.nutrition);
    setBar("barRisk", piq.riskInverse);

    $("numReadiness").textContent = String(piq.readiness);
    $("numTraining").textContent = String(piq.training);
    $("numRecovery").textContent = String(piq.recovery);
    $("numNutrition").textContent = String(piq.nutrition);
    $("numRisk").textContent = String(piq.riskInverse);

    // Risk panel
    $("riskDate").value = dateISO;
    renderRiskPanel(athleteId, dateISO);

    // Automation banners inside riskSummary if needed
    const banners = [];
    if (deload.suggest) {
      banners.push(`Suggested deload: ${deload.reasons.join(" • ") || "high strain pattern"}`);
    }
    if (riskObj.spike.spike >= 1.6 && riskObj.spike.avg7 > 0) {
      banners.push(`Load spike detected: ${riskObj.spike.spike}× vs 7-day avg`);
    }
    if (nutWarn.warn) {
      banners.push(`Nutrition warning: ${nutWarn.detail}`);
    }

    const riskSummary = $("riskSummary");
    if (riskSummary) {
      const base =
        riskObj.band === "HIGH" ? `HIGH risk pattern (${riskObj.risk}/100)` :
        riskObj.band === "MODERATE" ? `MODERATE risk pattern (${riskObj.risk}/100)` :
        `LOW risk pattern (${riskObj.risk}/100)`;

      riskSummary.innerHTML =
        `<b>${esc(base)}</b>` +
        (banners.length ? `<div class="small muted" style="margin-top:6px">${esc(banners.join(" | "))}</div>` : "");
    }

    // Heat defaults
    if ($("heatStart")) $("heatStart").value = addDaysISO(dateISO, -14);
  }

  function renderAthleteDashboard(athleteId, dateISO) {
    // Hide coach summary cards
    injectCoachSummaryCards(false); // will auto-hide in athlete mode

    const a = getAthlete(athleteId);
    const weekly = computeWeeklySummary(athleteId, dateISO);
    const riskObj = computeRiskBadge(athleteId, dateISO);
    const deload = computeSuggestedDeload(athleteId, dateISO);
    const nutWarn = computeNutritionTrendWarning(athleteId, dateISO);

    // Replace PIQ area with “Today” compliance focus, but reuse same widgets (keeps HTML stable)
    const piq = computePIQ(athleteId, dateISO);

    $("piqScore").textContent = String(piq.score);
    $("piqBand").textContent = `Today for ${a ? a.name : "Athlete"}`;

    const actions = [];
    if (deload.suggest) actions.push("Go lighter today (deload suggested).");
    if (riskObj.band === "HIGH") actions.push("Reduce intensity + prioritize recovery.");
    if (nutWarn.warn) actions.push("Hit your nutrition targets (low adherence trend).");
    if (!actions.length) actions.push("Stay consistent: complete today’s plan + log it.");

    const todayWorkout = findTodayWorkout(athleteId, dateISO);
    const workoutLine = todayWorkout ? `Today's workout: ${todayWorkout.theme.replaceAll("_", " ")}` : "No workout planned today.";
    const targetLine = formatTodayNutritionTarget(athleteId);

    $("piqExplain").textContent =
      `✅ ACTIONS\n- ${actions.join("\n- ")}\n\n` +
      `📌 ${workoutLine}\n` +
      `🥗 ${targetLine}\n\n` +
      `THIS WEEK\n- Sessions: ${weekly.sessions}\n- Total load: ${weekly.load}\n- Readiness avg: ${weekly.readinessAvg || "—"}\n- Nutrition avg: ${weekly.nutAvg || "—"}\n\n` +
      `Risk badge: ${riskObj.band} (${riskObj.risk}/100)`;

    // Bars become “progress signals” (still useful)
    setBar("barReadiness", piq.readiness);
    setBar("barTraining", piq.training);
    setBar("barRecovery", piq.recovery);
    setBar("barNutrition", piq.nutrition);
    setBar("barRisk", piq.riskInverse);

    $("numReadiness").textContent = String(piq.readiness);
    $("numTraining").textContent = String(piq.training);
    $("numRecovery").textContent = String(piq.recovery);
    $("numNutrition").textContent = String(piq.nutrition);
    $("numRisk").textContent = String(piq.riskInverse);

    // Risk panel for athlete: simplified text
    const riskSummary = $("riskSummary");
    if (riskSummary) {
      const badge =
        riskObj.band === "HIGH" ? `<span class="pill danger">HIGH</span>` :
        riskObj.band === "MODERATE" ? `<span class="pill warn">MOD</span>` :
        `<span class="pill ok">LOW</span>`;
      const banner = deload.suggest ? `<div class="small muted" style="margin-top:6px">Suggested deload: ${esc(deload.reasons.join(" • "))}</div>` : "";
      const nutBanner = nutWarn.warn ? `<div class="small muted" style="margin-top:6px">Nutrition warning: ${esc(nutWarn.detail)}</div>` : "";
      riskSummary.innerHTML = `<b>Risk badge:</b> ${badge}${banner}${nutBanner}`;
    }
  }

  function renderRiskPanel(athleteId, dateISO) {
    const riskObj = computeRiskBadge(athleteId, dateISO);
    const acwr = riskObj.acwr;
    const spike = riskObj.spike;

    const workload =
      `Acute (7d) load: ${acwr.acute}\n` +
      `Chronic/wk (28d/4): ${acwr.chronicPerWeek}\n` +
      `ACWR-ish ratio: ${acwr.ratio}\n` +
      `Today load: ${spike.todayLoad}\n` +
      `7-day avg: ${spike.avg7}\n` +
      `Spike factor: ${spike.spike}x`;

    const readinessNut =
      `Readiness (3d avg): ${riskObj.readyAvg || "—"}\n` +
      `Nutrition (3d avg): ${riskObj.nutAvg || "—"}\n` +
      `Risk index: ${riskObj.risk}/100 (${riskObj.band})`;

    const elW = $("riskWorkload");
    const elR = $("riskReadiness");
    if (elW) elW.textContent = workload;
    if (elR) elR.textContent = readinessNut;
  }

  // ---------------------------
  // TEAM render
  // ---------------------------
  function renderTeam() {
    // team inputs
    if ($("teamName")) $("teamName").value = state.team.name || "Default";
    if ($("seasonStart")) $("seasonStart").value = state.team.seasonStart || todayISO();
    if ($("seasonEnd")) $("seasonEnd").value = state.team.seasonEnd || addDaysISO(todayISO(), 120);

    if ($("defProt")) $("defProt").value = state.team.macroDefaults.protein;
    if ($("defCarb")) $("defCarb").value = state.team.macroDefaults.carbs;
    if ($("defFat")) $("defFat").value = state.team.macroDefaults.fat;

    if ($("wReadiness")) $("wReadiness").value = state.team.weights.readiness;
    if ($("wTraining")) $("wTraining").value = state.team.weights.training;
    if ($("wRecovery")) $("wRecovery").value = state.team.weights.recovery;
    if ($("wNutrition")) $("wNutrition").value = state.team.weights.nutrition;
    if ($("wRisk")) $("wRisk").value = state.team.weights.risk;

    renderRoster();
  }

  function renderRoster() {
    const list = $("rosterList");
    if (!list) return;

    if (!state.athletes.length) {
      list.innerHTML = `<div class="muted small">No athletes yet. Use the Onboarding Wizard in Settings.</div>`;
      return;
    }

    const end = todayISO();
    list.innerHTML = state.athletes.map(a => {
      const risk = computeRiskBadge(a.id, end);
      const badge =
        risk.band === "HIGH" ? `<span class="pill danger">HIGH</span>` :
        risk.band === "MODERATE" ? `<span class="pill warn">MOD</span>` :
        `<span class="pill ok">LOW</span>`;

      const active = state.ui.activeAthleteId === a.id ? " (active)" : "";
      const sport = window.sportEngine ? window.sportEngine.getSport(a.sportId).label : a.sportId;

      return `
        <div class="item">
          <div style="flex:1">
            <b>${esc(a.name)}${esc(active)}</b>
            <div class="muted small mono">Sport: ${esc(sport)} • Level: ${esc(a.workoutLevel)}</div>
            <div class="muted small mono">Risk ${risk.risk}/100 • ACWR ${risk.acwr.ratio}</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center">
            ${badge}
            <button class="btn ghost small" data-action="setActive" data-id="${esc(a.id)}">Use</button>
            <button class="btn danger small" data-action="delAth" data-id="${esc(a.id)}">Delete</button>
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll("button[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const act = btn.getAttribute("data-action");
        const id = btn.getAttribute("data-id");
        if (!id) return;

        if (act === "setActive") {
          state.ui.activeAthleteId = id;
          saveState();
          render();
        } else if (act === "delAth") {
          state.athletes = state.athletes.filter(x => x.id !== id);
          // cleanup logs/workouts
          state.trainingLogs = state.trainingLogs.filter(x => x.athleteId !== id);
          state.readinessLogs = state.readinessLogs.filter(x => x.athleteId !== id);
          state.nutritionLogs = state.nutritionLogs.filter(x => x.athleteId !== id);
          delete state.workouts[id];
          if (state.ui.activeAthleteId === id) state.ui.activeAthleteId = state.athletes[0]?.id || null;
          saveState();
          render();
        }
      });
    });
  }

  // ---------------------------
  // LOG render (full)
  // ---------------------------
  function renderLog() {
    const a = getAthlete();
    const opts = athleteOptions();
    fillSelect($("logAthlete"), opts, a?.id || "");
    fillSelect($("readyAthlete"), opts, a?.id || "");

    // defaults
    if ($("logDate")) $("logDate").value = safeISO($("logDate").value) || todayISO();
    if ($("readyDate")) $("readyDate").value = safeISO($("readyDate").value) || todayISO();

    updateComputedLoadPill();
    renderTrainingList();
    renderReadinessList();
  }

  function updateComputedLoadPill() {
    const min = Number($("logMin")?.value) || 0;
    const rpe = Number($("logRpe")?.value) || 0;
    const load = computeTrainingLoad(min, rpe);
    const el = $("logComputed");
    if (el) el.textContent = `Load: ${load}`;
  }

  function renderTrainingList() {
    const list = $("trainingList");
    if (!list) return;
    const athleteId = $("logAthlete")?.value || state.ui.activeAthleteId;
    if (!athleteId) { list.innerHTML = `<div class="muted small">Add an athlete first.</div>`; return; }

    const logs = state.trainingLogs
      .filter(x => x.athleteId === athleteId)
      .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1))
      .slice(0, 15);

    list.innerHTML = logs.map(l => `
      <div class="item">
        <div style="flex:1">
          <b>${esc(l.dateISO)} • ${esc(l.type)}</b>
          <div class="muted small mono">Minutes ${l.minutes} • RPE ${l.rpe} • Load ${l.load}</div>
          ${l.notes ? `<div class="muted small">${esc(l.notes)}</div>` : ""}
        </div>
        <button class="btn danger small" data-del="${esc(l.id)}">Delete</button>
      </div>
    `).join("") || `<div class="muted small">No sessions logged.</div>`;

    list.querySelectorAll("button[data-del]").forEach(b => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-del");
        state.trainingLogs = state.trainingLogs.filter(x => x.id !== id);
        saveState();
        renderTrainingList();
      });
    });
  }

  function renderReadinessList() {
    const list = $("readinessList");
    if (!list) return;
    const athleteId = $("readyAthlete")?.value || state.ui.activeAthleteId;
    if (!athleteId) { list.innerHTML = `<div class="muted small">Add an athlete first.</div>`; return; }

    const logs = state.readinessLogs
      .filter(x => x.athleteId === athleteId)
      .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1))
      .slice(0, 15);

    list.innerHTML = logs.map(l => `
      <div class="item">
        <div style="flex:1">
          <b>${esc(l.dateISO)} • Score ${l.score}</b>
          <div class="muted small mono">Sleep ${l.sleepHrs} • Sore ${l.soreness} • Stress ${l.stress} • Energy ${l.energy}</div>
          ${l.injury ? `<div class="muted small">${esc(l.injury)}</div>` : ""}
        </div>
        <button class="btn danger small" data-del="${esc(l.id)}">Delete</button>
      </div>
    `).join("") || `<div class="muted small">No readiness logged.</div>`;

    list.querySelectorAll("button[data-del]").forEach(b => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-del");
        state.readinessLogs = state.readinessLogs.filter(x => x.id !== id);
        saveState();
        renderReadinessList();
      });
    });
  }

  // ---------------------------
  // NUTRITION render (full)
  // ---------------------------
  function renderNutrition() {
    const a = getAthlete();
    const opts = athleteOptions();
    fillSelect($("nutAthlete"), opts, a?.id || "");
    fillSelect($("targetAthlete"), opts, a?.id || "");
    fillSelect($("mealAthlete"), opts, a?.id || "");

    if ($("nutDate")) $("nutDate").value = safeISO($("nutDate").value) || todayISO();

    // targets inputs for selected athlete
    const tAid = $("targetAthlete")?.value || state.ui.activeAthleteId;
    const ath = getAthlete(tAid);
    if (ath) {
      if ($("tProt")) $("tProt").value = ath.macroTargets.protein;
      if ($("tCarb")) $("tCarb").value = ath.macroTargets.carbs;
      if ($("tFat")) $("tFat").value = ath.macroTargets.fat;
      if ($("tWater")) $("tWater").value = ath.macroTargets.water;
    }

    // explanation
    const ex = $("nutExplain");
    if (ex) {
      ex.textContent =
        "Adherence is a 0–100 score comparing your logged macros/water to your targets.\n" +
        "It rewards close-to-target intake and penalizes large misses (too low or too high).";
    }

    renderNutritionList();
    renderTodayTargetsPanel();
  }

  function renderTodayTargetsPanel() {
    // Athlete Mode: turn nutrition view into “Today’s target + quick log”
    if (state.ui.role !== "athlete") return;

    const a = getAthlete();
    if (!a) return;

    // Inject a “Today” block at top of nutrition view
    const view = $("view-nutrition");
    if (!view) return;

    let block = $("athleteNutritionTodayBlock");
    if (!block) {
      block = document.createElement("div");
      block.id = "athleteNutritionTodayBlock";
      block.className = "card";
      view.insertBefore(block, view.firstChild);
    }

    block.innerHTML = `
      <div class="cardhead"><h2>Today’s Nutrition Target</h2><span class="muted">${esc(a.name)} • ${esc(todayISO())}</span></div>
      <div class="row gap wrap">
        <span class="pill">Protein: ${a.macroTargets.protein}g</span>
        <span class="pill">Carbs: ${a.macroTargets.carbs}g</span>
        <span class="pill">Fat: ${a.macroTargets.fat}g</span>
        <span class="pill">Water: ${a.macroTargets.water}oz</span>
      </div>
      <div class="callout small" style="margin-top:12px">
        Quick tip: log “good enough” estimates — compliance matters more than perfection.
      </div>
    `;
  }

  function renderNutritionList() {
    const list = $("nutritionList");
    if (!list) return;

    const athleteId = $("nutAthlete")?.value || state.ui.activeAthleteId;
    if (!athleteId) { list.innerHTML = `<div class="muted small">Add an athlete first.</div>`; return; }

    const logs = state.nutritionLogs
      .filter(x => x.athleteId === athleteId)
      .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1))
      .slice(0, 15);

    list.innerHTML = logs.map(l => `
      <div class="item">
        <div style="flex:1">
          <b>${esc(l.dateISO)} • Adherence ${l.adherence}/100</b>
          <div class="muted small mono">P ${l.protein} • C ${l.carbs} • F ${l.fat} • Water ${l.water}</div>
          ${l.notes ? `<div class="muted small">${esc(l.notes)}</div>` : ""}
        </div>
        <button class="btn danger small" data-del="${esc(l.id)}">Delete</button>
      </div>
    `).join("") || `<div class="muted small">No nutrition logged.</div>`;

    list.querySelectorAll("button[data-del]").forEach(b => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-del");
        state.nutritionLogs = state.nutritionLogs.filter(x => x.id !== id);
        saveState();
        renderNutritionList();
      });
    });
  }

  function formatTodayNutritionTarget(athleteId) {
    const a = getAthlete(athleteId);
    if (!a) return "No targets set.";
    const t = a.macroTargets;
    return `Today's targets — P ${t.protein}g, C ${t.carbs}g, F ${t.fat}g, Water ${t.water}oz`;
  }

  // ---------------------------
  // Workouts (interactive + sport tailored)
  // ---------------------------
  function renderWorkouts() {
    const view = $("view-workouts");
    if (!view) return;

    const a = getAthlete();
    if (!a) {
      view.innerHTML = `<div class="card"><div class="cardhead"><h2>Workouts</h2><span class="muted">Add an athlete first</span></div></div>`;
      return;
    }

    const sportList = window.sportEngine ? window.sportEngine.listSports() : [{ id: "basketball", label: "Basketball" }];
    const sportOptions = sportList.map(s => `<option value="${esc(s.id)}">${esc(s.label)}</option>`).join("");

    const existing = state.workouts[a.id] || null;
    const role = state.ui.role;

    view.innerHTML = `
      <div class="grid2">
        <div class="card">
          <div class="cardhead">
            <h2>${role === "athlete" ? "Today’s Workout" : "Workout Builder"}</h2>
            <span class="muted">${esc(a.name)} • Sport-tailored</span>
          </div>

          <div class="row gap wrap">
            <div class="field">
              <label>Athlete</label>
              <select id="wkAthSel">${athleteOptions().map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("")}</select>
            </div>
            <div class="field">
              <label>Sport</label>
              <select id="wkSportSel">${sportOptions}</select>
            </div>
            <div class="field">
              <label>Level</label>
              <select id="wkLevelSel">
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
              <input id="wkWeeks" type="number" min="2" max="16" value="8" />
            </div>
            <div class="field">
              <label>&nbsp;</label>
              <button class="btn" id="btnGenWorkout">${existing ? "Regenerate" : "Generate"}</button>
            </div>
          </div>

          <div id="todayWorkoutPanel" class="mini" style="margin-top:12px"></div>
        </div>

        <div class="card">
          <div class="cardhead">
            <h2>${role === "athlete" ? "Quick Log" : "Plan Controls"}</h2>
            <span class="muted">sRPE load + writeback</span>
          </div>

          <div class="mini">
            <div class="minihead">One-tap session log</div>
            <div class="row gap wrap">
              <div class="field"><label>Minutes</label><input id="qlMin" type="number" value="60" /></div>
              <div class="field"><label>RPE</label><input id="qlRpe" type="number" step="0.5" value="6" /></div>
              <div class="field"><label>Type</label>
                <select id="qlType">
                  <option value="practice">Practice</option>
                  <option value="lift">Lift</option>
                  <option value="conditioning">Conditioning</option>
                  <option value="game">Game</option>
                  <option value="recovery">Recovery</option>
                </select>
              </div>
              <div class="field grow"><label>Notes</label><input id="qlNotes" type="text" placeholder="optional" /></div>
              <div class="field"><label>&nbsp;</label><button class="btn" id="btnQuickLogWorkout">Log</button></div>
            </div>
            <div class="pill" id="qlLoadPill" style="margin-top:10px">Load: —</div>
          </div>

          <div class="mini">
            <div class="minihead">Plan info</div>
            <div class="minibody small muted" id="planInfo">—</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="cardhead">
          <h2>Plan Sessions</h2>
          <span class="muted">${role === "athlete" ? "Your upcoming sessions" : "Click to view details"}</span>
        </div>
        <div id="wkPlanList" class="list"></div>
      </div>
    `;

    // Set defaults
    const wkAthSel = $("wkAthSel");
    const wkSportSel = $("wkSportSel");
    const wkLevelSel = $("wkLevelSel");
    const wkStart = $("wkStart");
    const wkWeeks = $("wkWeeks");

    if (wkAthSel) wkAthSel.value = a.id;
    if (wkSportSel) wkSportSel.value = a.sportId || "basketball";
    if (wkLevelSel) wkLevelSel.value = a.workoutLevel || "standard";
    if (wkStart) wkStart.value = weekStartMondayISO(todayISO());

    // Write athlete preferences back
    wkSportSel?.addEventListener("change", () => {
      const aid = wkAthSel.value;
      const ath = getAthlete(aid);
      if (!ath) return;
      ath.sportId = wkSportSel.value;
      saveState();
      renderWorkouts();
    });
    wkLevelSel?.addEventListener("change", () => {
      const aid = wkAthSel.value;
      const ath = getAthlete(aid);
      if (!ath) return;
      ath.workoutLevel = wkLevelSel.value;
      saveState();
      renderWorkouts();
    });
    wkAthSel?.addEventListener("change", () => {
      state.ui.activeAthleteId = wkAthSel.value;
      saveState();
      renderWorkouts();
    });

    // Quick log computed load
    const qlMin = $("qlMin");
    const qlRpe = $("qlRpe");
    const qlLoadPill = $("qlLoadPill");
    function updQL() {
      const load = computeTrainingLoad(Number(qlMin.value), Number(qlRpe.value));
      if (qlLoadPill) qlLoadPill.textContent = `Load: ${load}`;
    }
    qlMin?.addEventListener("input", updQL);
    qlRpe?.addEventListener("input", updQL);
    updQL();

    // Generate plan
    $("btnGenWorkout")?.addEventListener("click", () => {
      const aid = wkAthSel.value;
      const ath = getAthlete(aid);
      if (!ath) return;

      if (!window.workoutEngine) {
        alert("workoutEngine.js missing.");
        return;
      }

      const plan = window.workoutEngine.generate({
        athleteId: ath.id,
        sportId: wkSportSel.value,
        level: wkLevelSel.value,
        startISO: weekStartMondayISO(wkStart.value || todayISO()),
        weeks: Number(wkWeeks.value) || 8,
        defaultDayType: "training"
      });

      state.workouts[ath.id] = plan;
      saveState();
      renderWorkouts();
    });

    // Quick log write-back (Phase 1/2 compliance)
    $("btnQuickLogWorkout")?.addEventListener("click", () => {
      const aid = wkAthSel.value;
      const dateISO = todayISO();
      const minutes = Number($("qlMin").value) || 0;
      const rpe = Number($("qlRpe").value) || 0;
      const type = $("qlType").value || "practice";
      const notes = $("qlNotes").value || "";

      const load = computeTrainingLoad(minutes, rpe);
      state.trainingLogs.push({
        id: uid("tr"),
        athleteId: aid,
        dateISO,
        minutes,
        rpe,
        type,
        notes,
        load,
        createdAt: Date.now()
      });
      saveState();
      // push user to Log for confirmation in coach mode; keep on page in athlete mode
      if (state.ui.role === "coach") {
        setView("log");
      } else {
        renderWorkouts();
      }
    });

    // render plan + today workout
    const plan = state.workouts[a.id] || null;
    $("planInfo").textContent = plan
      ? `Plan: ${plan.weeks} weeks • Level ${plan.level} • Sport ${plan.sportId} • Start ${plan.startISO}`
      : "No plan yet. Generate one.";

    const panel = $("todayWorkoutPanel");
    const todaySess = findTodayWorkout(a.id, todayISO());
    panel.innerHTML = todaySess ? renderSessionDetail(todaySess) : `<div class="muted small">No session planned today. (Generate a plan or pick a session below.)</div>`;

    // list sessions
    const list = $("wkPlanList");
    if (!plan) {
      list.innerHTML = `<div class="muted small">Generate a plan to see sessions.</div>`;
      return;
    }

    const flat = plan.weeksPlan.flatMap(w => w.sessions.map(s => ({ ...s, weekPhase: w.phase })));
    flat.sort((x, y) => (x.dateISO < y.dateISO ? -1 : 1));

    list.innerHTML = flat.map(s => {
      const isToday = s.dateISO === todayISO();
      const phase = s.phase || s.weekPhase || "ACCUMULATION";
      const badge =
        phase === "DELOAD" ? `<span class="pill warn">DELOAD</span>` :
        phase === "PEAK" ? `<span class="pill ok">PEAK</span>` :
        `<span class="pill">ACC</span>`;

      return `
        <div class="item" style="${isToday ? "border-color:rgba(245,200,66,.5)" : ""}">
          <div style="flex:1">
            <b>${esc(s.dateISO)} • ${esc(s.theme.replaceAll("_"," "))}</b>
            <div class="muted small mono">Minutes ${s.minutes} • RPE ${s.rpe} • Load ${s.load}</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center">
            ${badge}
            <button class="btn ghost small" data-view="${esc(s.id)}">View</button>
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll("button[data-view]").forEach(b => {
      b.addEventListener("click", () => {
        const sid = b.getAttribute("data-view");
        const sess = flat.find(x => x.id === sid);
        if (!sess) return;
        panel.innerHTML = renderSessionDetail(sess);
      });
    });

    // In athlete mode: make builder less dominant (still accessible but not “analytics clutter”)
    if (state.ui.role === "athlete") {
      // keep it, but reduce friction: auto-hide some advanced controls visually
      // (no CSS change needed; leave as is for now)
    }
  }

  function findTodayWorkout(athleteId, dateISO) {
    const plan = state.workouts[athleteId];
    if (!plan) return null;
    const flat = plan.weeksPlan.flatMap(w => w.sessions);
    return flat.find(s => s.dateISO === dateISO) || null;
  }

  function renderSessionDetail(sess) {
    const blocks = (sess.blocks || []).map(b => {
      const ex = (b.exercises || []).map(e => `
        <div class="exercise">
          <div style="flex:1">
            <b>${esc(e.name)}</b>
            <div class="muted small mono">${esc(e.sets)} sets • ${esc(e.reps)} reps</div>
            ${e.notes ? `<div class="muted small">${esc(e.notes)}</div>` : ""}
          </div>
          <span class="pill">${esc(b.focus || "focus")}</span>
        </div>
      `).join("");
      return `
        <div class="block">
          <div class="block-title">
            <span>${esc(b.title)}</span>
            <span class="muted mono small">${esc(sess.phase)} • ${esc(sess.theme)}</span>
          </div>
          ${ex || `<div class="muted small">No exercises listed.</div>`}
        </div>
      `;
    }).join("");

    return `
      <div class="mini">
        <div class="minihead">Session detail</div>
        <div class="row gap wrap">
          <span class="pill">${esc(sess.dateISO)}</span>
          <span class="pill">Minutes ${sess.minutes}</span>
          <span class="pill">RPE ${sess.rpe}</span>
          <span class="pill">Load ${sess.load}</span>
        </div>
        ${blocks || `<div class="muted small" style="margin-top:10px">No blocks yet.</div>`}
      </div>
    `;
  }

  // ---------------------------
  // Periodization (simple but wired)
  // ---------------------------
  function renderPeriodization() {
    const a = getAthlete();
    const opts = athleteOptions();
    fillSelect($("perAthlete"), opts, a?.id || "");
    fillSelect($("monAthlete"), opts, a?.id || "");

    if ($("perStart")) $("perStart").value = weekStartMondayISO(todayISO());
    if ($("monWeek")) $("monWeek").value = weekStartMondayISO(todayISO());

    renderPlanList();
  }

  function renderPlanList() {
    const list = $("planList");
    if (!list) return;
    const athleteId = $("perAthlete")?.value || state.ui.activeAthleteId;
    if (!athleteId) { list.innerHTML = `<div class="muted small">Add an athlete first.</div>`; return; }

    const plan = state.workouts[athleteId];
    if (!plan) {
      list.innerHTML = `<div class="muted small">No plan yet. Generate a workout plan in Workouts.</div>`;
      return;
    }

    list.innerHTML = plan.weeksPlan.map(w => {
      const phase = w.phase;
      const badge =
        phase === "DELOAD" ? `<span class="pill warn">DELOAD</span>` :
        phase === "PEAK" ? `<span class="pill ok">PEAK</span>` :
        `<span class="pill">ACC</span>`;

      return `
        <div class="item">
          <div style="flex:1">
            <b>Week ${w.weekIndex1} • ${esc(w.weekStartISO)}</b>
            <div class="muted small mono">Weekly planned load: ${w.weeklyLoad}</div>
          </div>
          ${badge}
        </div>
      `;
    }).join("");
  }

  // ---------------------------
  // Heatmap (simple)
  // ---------------------------
  function renderHeatmap() {
    const table = $("heatTable");
    if (!table) return;

    const start = safeISO($("heatStart")?.value) || addDaysISO(todayISO(), -14);
    const days = clamp($("heatDays")?.value, 7, 60);
    const metric = $("heatMetric")?.value || "load";

    const dates = [];
    for (let i = 0; i < days; i++) dates.push(addDaysISO(start, i));

    const header = `
      <tr>
        <th>Athlete</th>
        ${dates.map(d => `<th>${d.slice(5)}</th>`).join("")}
      </tr>
    `;

    function cellValue(aid, d) {
      if (metric === "load") {
        const logs = state.trainingLogs.filter(x => x.athleteId === aid && x.dateISO === d);
        return sumLoads(logs);
      }
      if (metric === "readiness") {
        const l = state.readinessLogs.find(x => x.athleteId === aid && x.dateISO === d);
        return l ? l.score : "";
      }
      if (metric === "nutrition") {
        const l = state.nutritionLogs.find(x => x.athleteId === aid && x.dateISO === d);
        return l ? l.adherence : "";
      }
      if (metric === "risk") {
        return computeRiskBadge(aid, d).risk;
      }
      return "";
    }

    const rows = state.athletes.map(a => {
      const tds = dates.map(d => {
        const v = cellValue(a.id, d);
        const num = Number(v);
        // simple shading via inline alpha on accent
        const alpha = Number.isFinite(num) ? clamp(num / 200, 0, 0.5) : 0;
        const style = alpha > 0 ? `style="background: rgba(245,200,66,${alpha})"` : "";
        return `<td ${style} data-a="${esc(a.id)}" data-d="${esc(d)}">${esc(v)}</td>`;
      }).join("");
      return `<tr><th>${esc(a.name)}</th>${tds}</tr>`;
    }).join("");

    table.innerHTML = header + rows;

    // click cell -> jump to log view for that athlete/date
    table.querySelectorAll("td[data-a]").forEach(td => {
      td.addEventListener("click", () => {
        const aid = td.getAttribute("data-a");
        const d = td.getAttribute("data-d");
        if (!aid || !d) return;
        state.ui.activeAthleteId = aid;
        saveState();
        setView("log");
        setTimeout(() => {
          if ($("logAthlete")) $("logAthlete").value = aid;
          if ($("logDate")) $("logDate").value = d;
          if ($("readyAthlete")) $("readyAthlete").value = aid;
          if ($("readyDate")) $("readyDate").value = d;
          updateComputedLoadPill();
          renderTrainingList();
          renderReadinessList();
        }, 0);
      });
    });
  }

  // ---------------------------
  // Meal plan generator (simple, target-based)
  // ---------------------------
  function generateMealPlan(athleteId, startISO, days, dayType, diet) {
    const a = getAthlete(athleteId);
    if (!a) return [];

    const t = a.macroTargets;
    const D = clamp(days, 1, 21);
    const start = safeISO(startISO) || todayISO();

    function dayMacro(dayTypeLocal) {
      let p = t.protein, c = t.carbs, f = t.fat;
      if (dayTypeLocal === "game") c = Math.round(c * 1.15);
      if (dayTypeLocal === "rest") c = Math.round(c * 0.85);
      if (diet === "highprotein") p = Math.round(p * 1.1);
      if (diet === "lowerfat") f = Math.round(f * 0.85);
      return { p, c, f, w: t.water };
    }

    const out = [];
    for (let i = 0; i < D; i++) {
      const d = addDaysISO(start, i);
      let dt = dayType;
      if (dayType === "auto") {
        const day = new Date(d).getDay(); // 0 sun
        dt = (day === 0 || day === 6) ? "rest" : "training";
      }
      const m = dayMacro(dt);
      out.push({
        dateISO: d,
        dayType: dt,
        targets: m,
        meals: [
          { name: "Breakfast", note: "Protein + carbs + fruit", pct: 0.25 },
          { name: "Lunch", note: "Lean protein + rice/potato + veggies", pct: 0.30 },
          { name: "Pre-Workout", note: "Carbs + hydration", pct: 0.15 },
          { name: "Dinner", note: "Protein + carbs (adjust by day type)", pct: 0.30 }
        ]
      });
    }
    return out;
  }

  function renderMealPlanOut(plan) {
    const out = $("mealPlanOut");
    if (!out) return;
    if (!plan || !plan.length) {
      out.innerHTML = `<div class="muted small">No plan generated.</div>`;
      return;
    }
    out.innerHTML = plan.map(d => {
      const t = d.targets;
      return `
        <div class="item">
          <div style="flex:1">
            <b>${esc(d.dateISO)} • ${esc(d.dayType)}</b>
            <div class="muted small mono">Targets: P ${t.p} • C ${t.c} • F ${t.f} • Water ${t.w}</div>
            <div class="muted small">${d.meals.map(m => `• ${m.name}: ${m.note}`).join("<br>")}</div>
          </div>
        </div>
      `;
    }).join("");
  }

  // ---------------------------
  // Settings + Onboarding Wizard (Phase 2)
  // ---------------------------
  function renderSettings() {
    const info = $("appInfo");
    if (info) {
      info.textContent =
        `Version: ${state.meta.version}\n` +
        `Role: ${state.ui.role}\n` +
        `Active athlete: ${getAthlete()?.name || "—"}\n` +
        `Device: ${state.meta.device.width}x${state.meta.device.height} DPR ${state.meta.device.dpr}\n` +
        `Athletes: ${state.athletes.length}\n` +
        `Training logs: ${state.trainingLogs.length}\n` +
        `Readiness logs: ${state.readinessLogs.length}\n` +
        `Nutrition logs: ${state.nutritionLogs.length}\n`;
    }

    // Inject role toggle + onboarding button into Settings without editing HTML
    const view = $("view-settings");
    if (!view) return;

    let tools = $("settingsToolsBlock");
    if (!tools) {
      tools = document.createElement("div");
      tools.id = "settingsToolsBlock";
      tools.className = "card";
      view.insertBefore(tools, view.children[1] || null);
    }

    tools.innerHTML = `
      <div class="cardhead"><h2>Mode</h2><span class="muted">Coach vs Athlete</span></div>
      <div class="row gap wrap">
        <button class="btn ${state.ui.role === "coach" ? "" : "ghost"}" id="btnRoleCoach">Coach Mode</button>
        <button class="btn ${state.ui.role === "athlete" ? "" : "ghost"}" id="btnRoleAthlete">Athlete Mode</button>
        <button class="btn ghost" id="btnOnboarding">Onboarding Wizard</button>
      </div>
      <div class="callout small" style="margin-top:12px">
        Athlete Mode removes clutter and shows “Today” pages to increase compliance.
      </div>
    `;

    $("btnRoleCoach")?.addEventListener("click", () => {
      state.ui.role = "coach";
      saveState();
      render();
    });
    $("btnRoleAthlete")?.addEventListener("click", () => {
      state.ui.role = "athlete";
      saveState();
      render();
    });
    $("btnOnboarding")?.addEventListener("click", () => openOnboardingWizard());
  }

  function openOnboardingWizard() {
    // modal
    const back = document.createElement("div");
    back.className = "modal-backdrop";
    back.id = "onboardBackdrop";

    const modal = document.createElement("div");
    modal.className = "modal";

    const steps = [
      { title: "Welcome", body: () => `
        <div class="progressbar"><div id="obProg"></div></div>
        <div class="muted small">This wizard sets up team + first athlete + sport + targets.</div>
      `},
      { title: "Team Name", body: () => `
        <div class="field">
          <label>Team name</label>
          <input id="obTeamName" type="text" value="${esc(state.team.name || "Default")}" />
        </div>
      `},
      { title: "Add Athlete", body: () => `
        <div class="row gap wrap">
          <div class="field grow"><label>Name</label><input id="obAthName" type="text" placeholder="Athlete name" /></div>
          <div class="field"><label>Position</label><input id="obAthPos" type="text" placeholder="PG/WR/MF" /></div>
          <div class="field"><label>Height (in)</label><input id="obAthHt" type="number" /></div>
          <div class="field"><label>Weight (lb)</label><input id="obAthWt" type="number" /></div>
        </div>
      `},
      { title: "Sport + Level", body: () => {
        const sports = window.sportEngine ? window.sportEngine.listSports() : [{ id:"basketball", label:"Basketball" }];
        return `
          <div class="row gap wrap">
            <div class="field">
              <label>Sport</label>
              <select id="obSport">
                ${sports.map(s => `<option value="${esc(s.id)}">${esc(s.label)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label>Workout level</label>
              <select id="obLevel">
                <option value="standard">Standard</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        `;
      }},
      { title: "Nutrition Targets", body: () => `
        <div class="row gap wrap">
          <div class="field"><label>Protein</label><input id="obP" type="number" value="${state.team.macroDefaults.protein}" /></div>
          <div class="field"><label>Carbs</label><input id="obC" type="number" value="${state.team.macroDefaults.carbs}" /></div>
          <div class="field"><label>Fat</label><input id="obF" type="number" value="${state.team.macroDefaults.fat}" /></div>
          <div class="field"><label>Water</label><input id="obW" type="number" value="${state.team.macroDefaults.water}" /></div>
        </div>
        <div class="callout small" style="margin-top:12px">You can change targets anytime in Nutrition.</div>
      `},
      { title: "Done", body: () => `
        <div class="callout">
          Setup complete. We’ll generate an 8-week sport-tailored plan automatically.
        </div>
        <div class="muted small">Tip: switch to Athlete Mode for “Today” workflows.</div>
      `}
    ];

    let step = 0;
    function renderStep() {
      const pct = Math.round(((step + 1) / steps.length) * 100);
      modal.innerHTML = `
        <div class="modal-head">
          <div class="modal-title">${esc(steps[step].title)}</div>
          <button class="btn ghost small" id="obClose">Close</button>
        </div>
        <div class="modal-body">
          ${steps[step].body()}
        </div>
        <div class="modal-foot">
          <button class="btn ghost" id="obBack" ${step === 0 ? "disabled" : ""}>Back</button>
          <button class="btn" id="obNext">${step === steps.length - 1 ? "Finish" : "Next"}</button>
        </div>
      `;

      const prog = modal.querySelector("#obProg");
      if (prog) prog.style.width = pct + "%";

      modal.querySelector("#obClose").onclick = close;
      modal.querySelector("#obBack").onclick = () => { if (step > 0) { step--; renderStep(); } };
      modal.querySelector("#obNext").onclick = () => { handleNext(); };
    }

    function handleNext() {
      // persist per step
      if (step === 1) {
        const tn = modal.querySelector("#obTeamName")?.value?.trim() || "Default";
        state.team.name = tn;
      }
      if (step === 2) {
        const name = modal.querySelector("#obAthName")?.value?.trim();
        if (!name) { alert("Enter athlete name."); return; }
        const position = modal.querySelector("#obAthPos")?.value?.trim() || "";
        const ht = Number(modal.querySelector("#obAthHt")?.value) || null;
        const wt = Number(modal.querySelector("#obAthWt")?.value) || null;

        // store temp in modal dataset
        modal.dataset.athName = name;
        modal.dataset.athPos = position;
        modal.dataset.athHt = String(ht || "");
        modal.dataset.athWt = String(wt || "");
      }
      if (step === 3) {
        modal.dataset.athSport = modal.querySelector("#obSport")?.value || "basketball";
        modal.dataset.athLevel = modal.querySelector("#obLevel")?.value || "standard";
      }
      if (step === 4) {
        modal.dataset.tP = modal.querySelector("#obP")?.value || "";
        modal.dataset.tC = modal.querySelector("#obC")?.value || "";
        modal.dataset.tF = modal.querySelector("#obF")?.value || "";
        modal.dataset.tW = modal.querySelector("#obW")?.value || "";
      }

      if (step === steps.length - 1) {
        // finalize: create athlete + set targets + auto plan
        const aId = uid("ath");
        const athlete = {
          id: aId,
          name: modal.dataset.athName || "Athlete",
          position: modal.dataset.athPos || "",
          heightIn: Number(modal.dataset.athHt) || null,
          weightLb: Number(modal.dataset.athWt) || null,
          sportId: modal.dataset.athSport || "basketball",
          workoutLevel: modal.dataset.athLevel || "standard",
          macroTargets: {
            protein: Number(modal.dataset.tP) || state.team.macroDefaults.protein,
            carbs: Number(modal.dataset.tC) || state.team.macroDefaults.carbs,
            fat: Number(modal.dataset.tF) || state.team.macroDefaults.fat,
            water: Number(modal.dataset.tW) || state.team.macroDefaults.water
          }
        };

        state.athletes.push(athlete);
        state.ui.activeAthleteId = aId;
        state.ui.onboardingDone = true;

        // auto generate plan
        if (window.workoutEngine) {
          state.workouts[aId] = window.workoutEngine.generate({
            athleteId: aId,
            sportId: athlete.sportId,
            level: athlete.workoutLevel,
            startISO: weekStartMondayISO(todayISO()),
            weeks: 8,
            defaultDayType: "training"
          });
        }

        saveState();
        close();
        setView("dashboard");
        return;
      }

      step++;
      renderStep();
    }

    function close() {
      back.remove();
      render();
    }

    back.appendChild(modal);
    document.body.appendChild(back);
    renderStep();
  }

  // ---------------------------
  // Button wiring
  // ---------------------------
  function wireButtons() {
    // seed demo
    $("btnSeed")?.addEventListener("click", () => {
      if (!confirm("Seed demo data? This replaces your current local data.")) return;
      state = defaultState();

      // demo athletes
      const a1 = { id: uid("ath"), name: "Jordan Smith", position: "PG", heightIn: 70, weightLb: 165, sportId: "basketball", workoutLevel: "standard",
        macroTargets: { protein: 160, carbs: 260, fat: 70, water: 96 } };
      const a2 = { id: uid("ath"), name: "Tyrell Jones", position: "WR", heightIn: 72, weightLb: 180, sportId: "football", workoutLevel: "advanced",
        macroTargets: { protein: 180, carbs: 300, fat: 75, water: 100 } };

      state.athletes.push(a1, a2);
      state.ui.activeAthleteId = a1.id;
      state.team.name = "PerformanceIQ Demo";

      // logs (last 10 days)
      for (let i = 0; i < 10; i++) {
        const d = addDaysISO(todayISO(), -i);
        // training
        state.trainingLogs.push({
          id: uid("tr"), athleteId: a1.id, dateISO: d, minutes: 60, rpe: 6 + (i % 3 === 0 ? 1 : 0),
          type: i % 4 === 0 ? "lift" : "practice", notes: "", load: 0, createdAt: Date.now()
        });
        state.trainingLogs[state.trainingLogs.length - 1].load =
          computeTrainingLoad(state.trainingLogs[state.trainingLogs.length - 1].minutes, state.trainingLogs[state.trainingLogs.length - 1].rpe);

        state.readinessLogs.push({
          id: uid("rd"), athleteId: a1.id, dateISO: d, sleepHrs: 7.5, soreness: 3 + (i % 4 === 0 ? 2 : 0),
          stress: 3, energy: 7, injury: "", score: 0, createdAt: Date.now()
        });
        state.readinessLogs[state.readinessLogs.length - 1].score =
          computeReadinessScore(state.readinessLogs[state.readinessLogs.length - 1]);

        state.nutritionLogs.push({
          id: uid("nu"), athleteId: a1.id, dateISO: d, protein: 150 + (i % 2 ? 10 : -5),
          carbs: 240 + (i % 3 ? 20 : -10), fat: 65 + (i % 5 ? 5 : -5), water: 80 + (i % 2 ? 10 : 0),
          notes: "", adherence: 0, createdAt: Date.now()
        });
        state.nutritionLogs[state.nutritionLogs.length - 1].adherence =
          computeNutritionAdherence(a1, state.nutritionLogs[state.nutritionLogs.length - 1]);
      }

      // plans
      if (window.workoutEngine) {
        state.workouts[a1.id] = window.workoutEngine.generate({ athleteId: a1.id, sportId: a1.sportId, level: a1.workoutLevel, startISO: weekStartMondayISO(todayISO()), weeks: 8 });
        state.workouts[a2.id] = window.workoutEngine.generate({ athleteId: a2.id, sportId: a2.sportId, level: a2.workoutLevel, startISO: weekStartMondayISO(todayISO()), weeks: 8 });
      }

      saveState();
      render();
    });

    // export/import
    $("btnExport")?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `performanceiq_export_${todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    $("fileImport")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        state = migrate(imported);
        saveState();
        render();
      } catch (err) {
        alert("Import failed: invalid JSON.");
      } finally {
        e.target.value = "";
      }
    });

    // wipe
    $("btnWipe")?.addEventListener("click", () => {
      if (!confirm("Wipe ALL local data for PerformanceIQ on this device?")) return;
      localStorage.removeItem(LS_KEY);
      state = defaultState();
      saveState();
      render();
    });

    // Dashboard controls
    $("dashAthlete")?.addEventListener("change", () => {
      state.ui.activeAthleteId = $("dashAthlete").value;
      saveState();
      render();
    });
    $("btnRecalcScore")?.addEventListener("click", () => renderDashboard());

    $("riskAthlete")?.addEventListener("change", () => {
      state.ui.activeAthleteId = $("riskAthlete").value;
      saveState();
      render();
    });
    $("btnRunRisk")?.addEventListener("click", () => {
      const aid = $("riskAthlete").value;
      const d = safeISO($("riskDate").value) || todayISO();
      renderRiskPanel(aid, d);
    });

    // Heatmap
    $("btnHeatmap")?.addEventListener("click", () => renderHeatmap());

    // Team
    $("btnSaveTeam")?.addEventListener("click", () => {
      state.team.name = $("teamName").value.trim() || "Default";
      state.team.seasonStart = safeISO($("seasonStart").value) || todayISO();
      state.team.seasonEnd = safeISO($("seasonEnd").value) || addDaysISO(todayISO(), 120);
      saveState();
      renderTeamPill();
    });

    $("btnSaveMacroDefaults")?.addEventListener("click", () => {
      state.team.macroDefaults.protein = Number($("defProt").value) || state.team.macroDefaults.protein;
      state.team.macroDefaults.carbs = Number($("defCarb").value) || state.team.macroDefaults.carbs;
      state.team.macroDefaults.fat = Number($("defFat").value) || state.team.macroDefaults.fat;
      saveState();
      renderTeam();
    });

    $("btnSaveWeights")?.addEventListener("click", () => {
      const w = {
        readiness: Number($("wReadiness").value) || 0,
        training: Number($("wTraining").value) || 0,
        recovery: Number($("wRecovery").value) || 0,
        nutrition: Number($("wNutrition").value) || 0,
        risk: Number($("wRisk").value) || 0
      };
      const total = w.readiness + w.training + w.recovery + w.nutrition + w.risk;
      if (total !== 100) {
        alert(`Weights must total 100. Current total: ${total}`);
        return;
      }
      state.team.weights = w;
      saveState();
      renderTeam();
    });

    $("btnAddAthlete")?.addEventListener("click", () => {
      const name = $("athName").value.trim();
      if (!name) { alert("Enter athlete name."); return; }
      const a = {
        id: uid("ath"),
        name,
        position: $("athPos").value.trim() || "",
        heightIn: Number($("athHt").value) || null,
        weightLb: Number($("athWt").value) || null,
        sportId: "basketball",
        workoutLevel: "standard",
        macroTargets: { ...state.team.macroDefaults }
      };
      state.athletes.push(a);
      state.ui.activeAthleteId = a.id;
      $("athName").value = ""; $("athPos").value = ""; $("athHt").value = ""; $("athWt").value = "";
      saveState();
      renderTeam();
    });

    // Log inputs -> computed
    $("logMin")?.addEventListener("input", updateComputedLoadPill);
    $("logRpe")?.addEventListener("input", updateComputedLoadPill);

    $("logAthlete")?.addEventListener("change", () => {
      state.ui.activeAthleteId = $("logAthlete").value;
      saveState();
      renderLog();
    });

    $("btnSaveTraining")?.addEventListener("click", () => {
      const athleteId = $("logAthlete").value || state.ui.activeAthleteId;
      const dateISO = safeISO($("logDate").value) || todayISO();
      const minutes = Number($("logMin").value) || 0;
      const rpe = Number($("logRpe").value) || 0;
      const type = $("logType").value || "practice";
      const notes = $("logNotes").value || "";
      const load = computeTrainingLoad(minutes, rpe);

      state.trainingLogs.push({ id: uid("tr"), athleteId, dateISO, minutes, rpe, type, notes, load, createdAt: Date.now() });
      saveState();
      renderLog();
    });

    $("readyAthlete")?.addEventListener("change", () => {
      state.ui.activeAthleteId = $("readyAthlete").value;
      saveState();
      renderLog();
    });

    $("btnSaveReadiness")?.addEventListener("click", () => {
      const athleteId = $("readyAthlete").value || state.ui.activeAthleteId;
      const dateISO = safeISO($("readyDate").value) || todayISO();
      const sleepHrs = Number($("readySleep").value) || 0;
      const soreness = Number($("readySore").value) || 0;
      const stress = Number($("readyStress").value) || 0;
      const energy = Number($("readyEnergy").value) || 0;
      const injury = $("readyInjury").value || "";

      const score = computeReadinessScore({ sleepHrs, soreness, stress, energy });
      state.readinessLogs.push({ id: uid("rd"), athleteId, dateISO, sleepHrs, soreness, stress, energy, injury, score, createdAt: Date.now() });
      saveState();
      renderLog();
    });

    // Nutrition save / quick add / targets / meal plan
    $("nutAthlete")?.addEventListener("change", () => {
      state.ui.activeAthleteId = $("nutAthlete").value;
      saveState();
      renderNutrition();
    });

    $("btnSaveNutrition")?.addEventListener("click", () => {
      const athleteId = $("nutAthlete").value || state.ui.activeAthleteId;
      const dateISO = safeISO($("nutDate").value) || todayISO();
      const athlete = getAthlete(athleteId);

      const protein = Number($("nutProt").value) || 0;
      const carbs = Number($("nutCarb").value) || 0;
      const fat = Number($("nutFat").value) || 0;
      const water = Number($("nutWater").value) || 0;
      const notes = $("nutNotes").value || "";

      const adherence = computeNutritionAdherence(athlete, { protein, carbs, fat, water });
      state.nutritionLogs.push({ id: uid("nu"), athleteId, dateISO, protein, carbs, fat, water, notes, adherence, createdAt: Date.now() });
      saveState();
      renderNutrition();
    });

    $("btnQuickMeal")?.addEventListener("click", () => {
      const athleteId = $("nutAthlete").value || state.ui.activeAthleteId;
      const dateISO = safeISO($("nutDate").value) || todayISO();
      const athlete = getAthlete(athleteId);

      const protein = Number($("qmProt").value) || 0;
      const carbs = Number($("qmCarb").value) || 0;
      const fat = Number($("qmFat").value) || 0;
      const water = Number($("qmWater").value) || 0;

      // find existing day log to increment; else create
      let day = state.nutritionLogs.find(x => x.athleteId === athleteId && x.dateISO === dateISO);
      if (!day) {
        day = { id: uid("nu"), athleteId, dateISO, protein: 0, carbs: 0, fat: 0, water: 0, notes: "", adherence: 0, createdAt: Date.now() };
        state.nutritionLogs.push(day);
      }
      day.protein += protein; day.carbs += carbs; day.fat += fat; day.water += water;
      day.adherence = computeNutritionAdherence(athlete, day);
      saveState();
      renderNutrition();
    });

    $("targetAthlete")?.addEventListener("change", () => {
      state.ui.activeAthleteId = $("targetAthlete").value;
      saveState();
      renderNutrition();
    });

    $("btnSaveTargets")?.addEventListener("click", () => {
      const athleteId = $("targetAthlete").value || state.ui.activeAthleteId;
      const a = getAthlete(athleteId);
      if (!a) return;

      a.macroTargets.protein = Number($("tProt").value) || a.macroTargets.protein;
      a.macroTargets.carbs = Number($("tCarb").value) || a.macroTargets.carbs;
      a.macroTargets.fat = Number($("tFat").value) || a.macroTargets.fat;
      a.macroTargets.water = Number($("tWater").value) || a.macroTargets.water;

      saveState();
      renderNutrition();
    });

    $("btnGenerateMealPlan")?.addEventListener("click", () => {
      const athleteId = $("mealAthlete").value || state.ui.activeAthleteId;
      const start = $("mealStart").value || todayISO();
      const days = Number($("mealDays").value) || 7;
      const dayType = $("mealDayType").value || "auto";
      const diet = $("mealDiet").value || "standard";
      const plan = generateMealPlan(athleteId, start, days, dayType, diet);
      renderMealPlanOut(plan);
    });

    // Periodization compare
    $("btnGeneratePlan")?.addEventListener("click", () => {
      // This build uses workout plan as periodization source.
      alert("Generate the workout plan in Workouts. Periodization reads from that plan.");
    });

    $("btnCompareWeek")?.addEventListener("click", () => {
      const athleteId = $("monAthlete").value || state.ui.activeAthleteId;
      const weekISO = weekStartMondayISO($("monWeek").value || todayISO());
      compareWeek(athleteId, weekISO);
    });
  }

  function compareWeek(athleteId, weekStartISO) {
    const plan = state.workouts[athleteId];
    if (!plan) {
      $("compareSummary").textContent = "No plan found. Generate a plan first.";
      $("compareDetail").textContent = "—";
      return;
    }

    const week = plan.weeksPlan.find(w => w.weekStartISO === weekStartISO);
    if (!week) {
      $("compareSummary").textContent = "No planned week found at that start date.";
      $("compareDetail").textContent = "—";
      return;
    }

    const planned = week.weeklyLoad || 0;

    const end = addDaysISO(weekStartISO, 6);
    const actualLogs = state.trainingLogs.filter(x => x.athleteId === athleteId && x.dateISO >= weekStartISO && x.dateISO <= end);
    const actual = sumLoads(actualLogs);

    const diff = actual - planned;
    const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0;

    $("compareSummary").textContent =
      `Week ${week.weekIndex1} (${weekStartISO})\n` +
      `Planned load: ${planned}\nActual load: ${actual}\n` +
      `Actual vs planned: ${pct}% (${diff >= 0 ? "+" : ""}${diff})`;

    $("compareDetail").textContent =
      `Sessions logged: ${actualLogs.length}\n` +
      actualLogs.map(l => `- ${l.dateISO}: ${l.type} • load ${l.load}`).join("\n");
  }

  // ---------------------------
  // Main render orchestrator
  // ---------------------------
  function render() {
    renderTeamPill();
    applyViewVisibility();

    // Always keep dashboard selects synced
    renderDashboard();

    if (state.ui.view === "team") renderTeam();
    if (state.ui.view === "log") renderLog();
    if (state.ui.view === "nutrition") renderNutrition();
    if (state.ui.view === "workouts") renderWorkouts();
    if (state.ui.view === "periodization") renderPeriodization();
    if (state.ui.view === "settings") renderSettings();

    // heatmap can be rendered on demand; but we default once if table empty and athlete exists
    if (state.ui.view === "dashboard" && $("heatTable") && !$("heatTable").innerHTML.trim()) {
      if ($("heatStart")) $("heatStart").value = addDaysISO(todayISO(), -14);
      renderHeatmap();
    }
  }

  // ---------------------------
  // Boot
  // ---------------------------
  function hideSplash() {
    const s = $("splash");
    if (!s) return;
    s.classList.add("hidden");
    setTimeout(() => { s.style.display = "none"; }, 650);
  }

  function boot() {
    updateDeviceFlags();
    window.addEventListener("resize", () => updateDeviceFlags());

    wireNav();
    wireButtons();

    // Initialize dates for dashboard
    if ($("dashDate")) $("dashDate").value = todayISO();
    if ($("riskDate")) $("riskDate").value = todayISO();
    if ($("heatStart")) $("heatStart").value = addDaysISO(todayISO(), -14);

    // Default to onboarding wizard if no athletes
    if (!state.athletes.length && !state.ui.onboardingDone) {
      // set view to settings so they can access wizard
      state.ui.view = "settings";
      saveState();
      render();
      hideSplash();
      // open wizard automatically (no extra clicks)
      setTimeout(openOnboardingWizard, 250);
      return;
    }

    render();
    hideSplash();
  }

  // Expose for debugging
  window.corePIQ = {
    getState: () => state,
    setRole: (r) => { state.ui.role = r; saveState(); render(); },
    seed: () => $("btnSeed")?.click()
  };

  boot();
})();
