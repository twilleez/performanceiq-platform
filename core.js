// core.js — OFFLINE-FIRST + TEAM HEATMAP + PIQ SCORE + NUTRITION + RISK + PERIODIZATION
(function () {
  "use strict";

  // -----------------------------
  // Boot guards
  // -----------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const nowISODate = () => new Date().toISOString().slice(0, 10);

  function safeJSONParse(s, fallback) {
    try { return JSON.parse(s); } catch (_) { return fallback; }
  }

  // -----------------------------
  // Storage model
  // -----------------------------
  const STORAGE_KEY = "performanceiq_v2";
  const APP_VERSION = "2.0.0-offline";

  function blankState() {
    return {
      version: APP_VERSION,
      team: {
        id: "team_default",
        name: "Default",
        seasonStart: "",
        seasonEnd: "",
        macroDefaults: { protein: 160, carbs: 240, fat: 70, waterOz: 96 },
        weights: { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 }
      },
      athletes: [
        // {id, name, pos, heightIn, weightLb, createdAt}
      ],
      // session-based training
      training: [
        // {id, athleteId, date, minutes, rpe, type, notes, load}
      ],
      // daily readiness
      readiness: [
        // {id, athleteId, date, sleepHours, soreness, stress, energy, injuryNote, readinessScore}
      ],
      // daily nutrition totals
      nutrition: [
        // {id, athleteId, date, protein, carbs, fat, waterOz, notes}
      ],
      // per athlete nutrition targets overrides
      nutritionTargets: {
        // athleteId: {protein, carbs, fat, waterOz}
      },
      // periodization plans
      plans: [
        // {id, athleteId, startDate, weeks, goal, deloadEvery, createdAt, weeksPlan:[{weekIndex, weekStart, focus, plannedSessions:[...], plannedLoad}]}
      ]
    };
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const st = raw ? safeJSONParse(raw, null) : null;
    if (!st || typeof st !== "object") return blankState();

    // Soft-migrate minimal fields
    const b = blankState();
    return {
      ...b,
      ...st,
      team: { ...b.team, ...(st.team || {}) },
      athletes: Array.isArray(st.athletes) ? st.athletes : [],
      training: Array.isArray(st.training) ? st.training : [],
      readiness: Array.isArray(st.readiness) ? st.readiness : [],
      nutrition: Array.isArray(st.nutrition) ? st.nutrition : [],
      nutritionTargets: (st.nutritionTargets && typeof st.nutritionTargets === "object") ? st.nutritionTargets : {},
      plans: Array.isArray(st.plans) ? st.plans : []
    };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function uid(prefix) {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  }

  // -----------------------------
  // Math helpers
  // -----------------------------
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const round1 = (n) => Math.round(n * 10) / 10;
  const round0 = (n) => Math.round(n);

  function daysBetween(d1, d2) {
    const a = new Date(d1 + "T00:00:00");
    const b = new Date(d2 + "T00:00:00");
    return Math.round((b - a) / (24 * 3600 * 1000));
  }

  function addDays(dateISO, days) {
    const d = new Date(dateISO + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function startOfWeekMonday(dateISO) {
    const d = new Date(dateISO + "T00:00:00");
    const day = d.getDay(); // 0 Sun .. 6 Sat
    const diff = (day === 0 ? -6 : 1) - day; // move to Monday
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }

  // -----------------------------
  // Derived metrics
  // -----------------------------
  function computeSessionLoad(minutes, rpe) {
    // simple internal definition (not a claim of standardization)
    const m = Number(minutes) || 0;
    const r = Number(rpe) || 0;
    return clamp(m * r, 0, 100000);
  }

  function getAthleteById(id) {
    return state.athletes.find(a => a.id === id) || null;
  }

  function getTrainingForAthlete(athleteId) {
    return state.training.filter(t => t.athleteId === athleteId);
  }

  function getReadinessForAthlete(athleteId) {
    return state.readiness.filter(r => r.athleteId === athleteId);
  }

  function getNutritionForAthlete(athleteId) {
    return state.nutrition.filter(n => n.athleteId === athleteId);
  }

  function getDailyTrainingLoad(athleteId, dateISO) {
    const sessions = state.training.filter(s => s.athleteId === athleteId && s.date === dateISO);
    return sessions.reduce((sum, s) => sum + (Number(s.load) || 0), 0);
  }

  function getDailyReadinessScore(athleteId, dateISO) {
    const rec = state.readiness.find(r => r.athleteId === athleteId && r.date === dateISO);
    return rec ? Number(rec.readinessScore) || 0 : null;
  }

  function getDailyNutritionAdherence(athleteId, dateISO) {
    const rec = state.nutrition.find(n => n.athleteId === athleteId && n.date === dateISO);
    if (!rec) return null;
    const targets = getNutritionTargets(athleteId);
    return computeNutritionAdherence(rec, targets).adherence;
  }

  function getNutritionTargets(athleteId) {
    const t = state.nutritionTargets[athleteId];
    if (t && typeof t === "object") {
      return {
        protein: Number(t.protein) || 0,
        carbs: Number(t.carbs) || 0,
        fat: Number(t.fat) || 0,
        waterOz: Number(t.waterOz) || 0
      };
    }
    const d = state.team.macroDefaults || { protein: 160, carbs: 240, fat: 70, waterOz: 96 };
    return {
      protein: Number(d.protein) || 0,
      carbs: Number(d.carbs) || 0,
      fat: Number(d.fat) || 0,
      waterOz: Number(d.waterOz) || 0
    };
  }

  function computeReadinessScore({ sleepHours, soreness, stress, energy }) {
    // Heuristic 0–100 based on:
    // sleep (0–10h mapped), energy positive, soreness/stress negative.
    const sleep = clamp(Number(sleepHours) || 0, 0, 16);
    const sore = clamp(Number(soreness) || 0, 0, 10);
    const str = clamp(Number(stress) || 0, 0, 10);
    const en = clamp(Number(energy) || 0, 0, 10);

    const sleepScore = clamp((sleep / 10) * 100, 0, 100); // 10h -> 100
    const energyScore = (en / 10) * 100;
    const sorenessPenalty = (sore / 10) * 100;
    const stressPenalty = (str / 10) * 100;

    // Blend
    const raw = (0.45 * sleepScore) + (0.35 * energyScore) - (0.10 * sorenessPenalty) - (0.10 * stressPenalty);
    return clamp(round0(raw), 0, 100);
  }

  function computeNutritionAdherence(day, targets) {
    // Adherence uses closeness to targets (protein/carbs/fat/water).
    // Score each macro as 100 - % deviation (capped) with softer penalty for over/under.
    function scoreOne(actual, target) {
      const a = Number(actual) || 0;
      const t = Number(target) || 0;
      if (t <= 0) return 0;
      const dev = Math.abs(a - t) / t; // 0..infty
      const s = 100 - (dev * 100);
      return clamp(round0(s), 0, 100);
    }

    const sp = scoreOne(day.protein, targets.protein);
    const sc = scoreOne(day.carbs, targets.carbs);
    const sf = scoreOne(day.fat, targets.fat);
    const sw = scoreOne(day.waterOz, targets.waterOz);

    // Protein slightly prioritized
    const adherence = clamp(round0((0.35 * sp) + (0.25 * sc) + (0.20 * sf) + (0.20 * sw)), 0, 100);

    const detail = {
      protein: { actual: Number(day.protein) || 0, target: targets.protein, score: sp },
      carbs: { actual: Number(day.carbs) || 0, target: targets.carbs, score: sc },
      fat: { actual: Number(day.fat) || 0, target: targets.fat, score: sf },
      waterOz: { actual: Number(day.waterOz) || 0, target: targets.waterOz, score: sw }
    };
    return { adherence, detail };
  }

  function computeWorkloadWindow(athleteId, endDateISO, days) {
    // returns array of daily loads for [endDate - days + 1 ... endDate]
    const arr = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = addDays(endDateISO, -i);
      arr.push({ date: d, load: getDailyTrainingLoad(athleteId, d) });
    }
    return arr;
  }

  function mean(nums) {
    if (!nums.length) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  function stdev(nums) {
    if (nums.length < 2) return 0;
    const m = mean(nums);
    const v = mean(nums.map(x => (x - m) * (x - m)));
    return Math.sqrt(v);
  }

  function computeMonotonyAndStrain(loads7) {
    // loads7 = array of 7 daily loads
    const avg = mean(loads7);
    const sd = stdev(loads7);
    const monotony = sd === 0 ? (avg > 0 ? 10 : 0) : (avg / sd);
    const strain = avg * monotony * 7;
    return { avg: round1(avg), sd: round1(sd), monotony: round1(monotony), strain: round0(strain) };
  }

  function computeACWR(athleteId, asOfDateISO) {
    // Acute = last 7 days avg load, Chronic = last 28 days avg load
    const acuteArr = computeWorkloadWindow(athleteId, asOfDateISO, 7).map(x => x.load);
    const chronicArr = computeWorkloadWindow(athleteId, asOfDateISO, 28).map(x => x.load);
    const acuteAvg = mean(acuteArr);
    const chronicAvg = mean(chronicArr);
    const acwr = chronicAvg <= 0 ? (acuteAvg > 0 ? 10 : 0) : (acuteAvg / chronicAvg);
    return { acuteAvg: round1(acuteAvg), chronicAvg: round1(chronicAvg), acwr: round1(acwr) };
  }

  function computeRiskIndex(athleteId, asOfDateISO) {
    // Heuristic risk index 0–100 combining:
    // - ACWR deviation from 1.0
    // - Monotony
    // - Very low readiness
    // - Nutrition adherence low
    // - Injury note present
    const acwrObj = computeACWR(athleteId, asOfDateISO);

    const loads7 = computeWorkloadWindow(athleteId, asOfDateISO, 7).map(x => x.load);
    const ms = computeMonotonyAndStrain(loads7);

    const readiness = getDailyReadinessScore(athleteId, asOfDateISO);
    const nutAdh = getDailyNutritionAdherence(athleteId, asOfDateISO);

    const readyRec = state.readiness.find(r => r.athleteId === athleteId && r.date === asOfDateISO);
    const injuryFlag = !!(readyRec && (readyRec.injuryNote || "").trim());

    // Components -> 0..100
    const acwrDev = Math.abs((acwrObj.acwr || 0) - 1.0);         // 0..?
    const acwrScore = clamp(round0(acwrDev * 60), 0, 100);       // dev 1.0 -> 60

    const monoScore = clamp(round0((ms.monotony || 0) * 18), 0, 100); // 5.5 -> 99

    const lowReadyScore = readiness == null ? 0 : clamp(round0((50 - readiness) * 2), 0, 100); // <50 penalize
    const lowNutScore = nutAdh == null ? 0 : clamp(round0((70 - nutAdh) * 2), 0, 100); // <70 penalize

    const injuryScore = injuryFlag ? 35 : 0;

    const combined = clamp(
      round0(
        (0.30 * acwrScore) +
        (0.25 * monoScore) +
        (0.20 * lowReadyScore) +
        (0.15 * lowNutScore) +
        (0.10 * injuryScore)
      ),
      0, 100
    );

    // Flags
    const flags = [];
    if (acwrObj.chronicAvg > 0 && (acwrObj.acwr >= 1.5 || acwrObj.acwr <= 0.5)) flags.push("ACWR outlier");
    if (ms.monotony >= 2.0 && ms.avg > 0) flags.push("High monotony");
    if (readiness != null && readiness < 45) flags.push("Low readiness");
    if (nutAdh != null && nutAdh < 65) flags.push("Low nutrition adherence");
    if (injuryFlag) flags.push("Injury note present");

    let level = "Low";
    if (combined >= 70) level = "High";
    else if (combined >= 40) level = "Moderate";

    return {
      riskIndex: combined,
      level,
      flags,
      acwr: acwrObj,
      monotony: ms,
      readiness,
      nutritionAdh: nutAdh
    };
  }

  function computePIQScore(athleteId, dateISO) {
    // Build 0–100 sub-scores:
    // Readiness: daily readiness score
    // Training: reasonable load target vs last 28d (penalize huge spikes or zeros)
    // Recovery: derived from sleep + soreness + stress trend (use readiness check-in)
    // Nutrition: adherence (0–100)
    // Risk: invert risk index (100-risk)
    const w = state.team.weights || { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 };
    const wSum = (w.readiness + w.training + w.recovery + w.nutrition + w.risk) || 100;

    const readiness = getDailyReadinessScore(athleteId, dateISO);
    const readinessScore = readiness == null ? 0 : clamp(round0(readiness), 0, 100);

    const dailyLoad = getDailyTrainingLoad(athleteId, dateISO);
    const chronic = computeACWR(athleteId, dateISO).chronicAvg; // avg/day last 28
    const expected = chronic; // internal baseline
    // Training sub-score: best when near baseline; penalize spikes and very low work when baseline exists
    let trainingScore = 0;
    if (expected <= 0) {
      trainingScore = dailyLoad > 0 ? 70 : 50; // neutral if no history
    } else {
      const ratio = dailyLoad / expected; // 1.0 ideal
      const dev = Math.abs(ratio - 1);
      trainingScore = clamp(round0(100 - dev * 70), 0, 100);
    }

    // Recovery sub-score: uses readiness inputs if present
    const rec = state.readiness.find(r => r.athleteId === athleteId && r.date === dateISO);
    let recoveryScore = 0;
    if (!rec) {
      recoveryScore = 50;
    } else {
      const sleep = clamp(Number(rec.sleepHours) || 0, 0, 16);
      const sore = clamp(Number(rec.soreness) || 0, 0, 10);
      const str = clamp(Number(rec.stress) || 0, 0, 10);
      const sleepPart = clamp((sleep / 9) * 100, 0, 100); // 9h ~ 100 internal
      const sorePart = 100 - (sore / 10) * 100;
      const stressPart = 100 - (str / 10) * 100;
      recoveryScore = clamp(round0(0.50 * sleepPart + 0.25 * sorePart + 0.25 * stressPart), 0, 100);
    }

    const nutAdh = getDailyNutritionAdherence(athleteId, dateISO);
    const nutritionScore = nutAdh == null ? 0 : clamp(round0(nutAdh), 0, 100);

    const riskObj = computeRiskIndex(athleteId, dateISO);
    const riskScore = clamp(round0(100 - (riskObj.riskIndex || 0)), 0, 100);

    const score =
      (w.readiness / wSum) * readinessScore +
      (w.training / wSum) * trainingScore +
      (w.recovery / wSum) * recoveryScore +
      (w.nutrition / wSum) * nutritionScore +
      (w.risk / wSum) * riskScore;

    const total = clamp(round0(score), 0, 100);

    let band = "Developing";
    if (total >= 85) band = "Elite";
    else if (total >= 70) band = "Strong";
    else if (total >= 55) band = "Building";

    const explain = {
      weights: { ...w, sum: wSum },
      inputs: {
        readinessScore,
        dailyLoad: round0(dailyLoad),
        chronicAvg: round1(chronic),
        trainingScore,
        recoveryScore,
        nutritionScore,
        riskIndex: riskObj.riskIndex,
        riskScore
      },
      formula:
`PIQ = (R*wR + T*wT + Rec*wRec + N*wN + Risk*wRisk) / (wSum)
R=${readinessScore}, T=${trainingScore}, Rec=${recoveryScore}, N=${nutritionScore}, Risk=${riskScore}
Weights: R=${w.readiness}, T=${w.training}, Rec=${w.recovery}, N=${w.nutrition}, Risk=${w.risk} (sum=${wSum})`
    };

    return { total, band, subs: { readinessScore, trainingScore, recoveryScore, nutritionScore, riskScore }, explain, riskObj };
  }

  // -----------------------------
  // Periodization engine
  // -----------------------------
  function generatePeriodizationPlan({ athleteId, startDate, weeks, goal, deloadEvery }) {
    const delN = Number(deloadEvery) || 4;
    const plan = [];
    const base = goal === "offseason" ? { min: 2200, max: 3600 } :
                 goal === "inseason"  ? { min: 1600, max: 2800 } :
                                        { min: 900,  max: 1800 };

    function weekFocus(i) {
      if (goal === "rehab") return (i % delN === delN - 1) ? "Deload / Mobility" : "Return-to-play / Skill + Low Load";
      if (goal === "inseason") return (i % delN === delN - 1) ? "Deload / Freshen" : "Performance / Practice Priority";
      return (i % delN === delN - 1) ? "Deload / Consolidate" : "Build / Develop";
    }

    for (let i = 0; i < weeks; i++) {
      const weekStart = addDays(startDate, i * 7);
      const isDeload = (i % delN === delN - 1);

      const intensityFactor = isDeload ? 0.7 : (1.0 + Math.min(i, 6) * 0.04); // slow ramp
      const plannedLoad = clamp(round0(((base.min + base.max) / 2) * intensityFactor), 0, 999999);

      // Create 5 sessions template (Mon-Fri), weekend optional
      const sessions = [];
      const dayTypes = goal === "inseason"
        ? ["practice", "skills", "lift", "practice", "recovery"]
        : goal === "rehab"
          ? ["recovery", "skills", "recovery", "skills", "recovery"]
          : ["lift", "skills", "conditioning", "skills", "lift"];

      // Split planned load across 5 days
      const shares = isDeload ? [0.18, 0.18, 0.18, 0.18, 0.28] : [0.20, 0.20, 0.22, 0.20, 0.18];
      for (let d = 0; d < 5; d++) {
        const date = addDays(weekStart, d);
        const targetLoad = round0(plannedLoad * shares[d]);

        // Convert target load into minutes × rpe target (bounded)
        let rpe = goal === "rehab" ? 4 : (goal === "inseason" ? 6 : 7);
        if (isDeload) rpe = Math.max(3, rpe - 1);
        const minutes = clamp(round0(targetLoad / rpe), 20, 120);

        sessions.push({
          date,
          type: dayTypes[d],
          targetMinutes: minutes,
          targetRpe: rpe,
          targetLoad: computeSessionLoad(minutes, rpe)
        });
      }

      plan.push({
        weekIndex: i + 1,
        weekStart,
        focus: weekFocus(i),
        deload: isDeload,
        plannedLoad,
        plannedSessions: sessions
      });
    }

    return {
      id: uid("plan"),
      athleteId,
      startDate,
      weeks,
      goal,
      deloadEvery: delN,
      createdAt: new Date().toISOString(),
      weeksPlan: plan
    };
  }

  function getPlanForAthlete(athleteId) {
    return state.plans.filter(p => p.athleteId === athleteId);
  }

  function getPlannedLoadForWeek(plan, weekStartISO) {
    const wk = plan.weeksPlan.find(w => w.weekStart === weekStartISO);
    return wk ? Number(wk.plannedLoad) || 0 : 0;
  }

  function getActualLoadForWeek(athleteId, weekStartISO) {
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStartISO, i);
      sum += getDailyTrainingLoad(athleteId, d);
    }
    return sum;
  }

  // -----------------------------
  // UI wiring
  // -----------------------------
  const state = loadState();

  function setSplash(text) {
    const el = $("#splashText");
    if (el) el.textContent = text || "Loading…";
  }

  function hideSplash() {
    const s = $("#splash");
    if (s) s.style.display = "none";
  }

  function showView(name) {
    $$("[data-view]").forEach(v => v.hidden = true);
    const el = $("#view-" + name);
    if (el) el.hidden = false;
    $$(".navbtn").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  }

  function fillSelect(selectEl, athletes, includeBlank) {
    if (!selectEl) return;
    const val = selectEl.value;
    selectEl.innerHTML = "";
    if (includeBlank) {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "—";
      selectEl.appendChild(o);
    }
    athletes.forEach(a => {
      const o = document.createElement("option");
      o.value = a.id;
      o.textContent = a.name;
      selectEl.appendChild(o);
    });
    if (athletes.some(a => a.id === val)) selectEl.value = val;
  }

  function refreshHeader() {
    const pill = $("#activeTeamPill");
    if (pill) pill.textContent = "Team: " + (state.team.name || "Default");
  }

  function renderRoster() {
    const host = $("#rosterList");
    if (!host) return;
    host.innerHTML = "";

    if (!state.athletes.length) {
      host.innerHTML = `<div class="item"><div class="itemtitle">No athletes yet</div><div class="itemmeta">Add one above or click “Seed Demo”.</div></div>`;
      return;
    }

    state.athletes.forEach(a => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div class="itemhead">
          <div>
            <div class="itemtitle">${escapeHTML(a.name)}</div>
            <div class="itemmeta">${escapeHTML(a.pos || "—")} • ${a.heightIn || "—"} in • ${a.weightLb || "—"} lb</div>
          </div>
          <div class="itemactions">
            <button class="iconbtn" data-act="edit" data-id="${a.id}">Edit</button>
            <button class="iconbtn" data-act="del" data-id="${a.id}">Delete</button>
          </div>
        </div>
      `;
      host.appendChild(div);
    });

    host.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      const id = btn.dataset.id;
      const act = btn.dataset.act;
      const a = getAthleteById(id);
      if (!a) return;

      if (act === "del") {
        // delete athlete + their data
        state.athletes = state.athletes.filter(x => x.id !== id);
        state.training = state.training.filter(x => x.athleteId !== id);
        state.readiness = state.readiness.filter(x => x.athleteId !== id);
        state.nutrition = state.nutrition.filter(x => x.athleteId !== id);
        delete state.nutritionTargets[id];
        state.plans = state.plans.filter(x => x.athleteId !== id);
        saveState();
        fullRefresh();
      }

      if (act === "edit") {
        const name = prompt("Name:", a.name || "");
        if (name == null) return;
        const pos = prompt("Position:", a.pos || "") ?? a.pos;
        const ht = prompt("Height (in):", String(a.heightIn || "")) ?? String(a.heightIn || "");
        const wt = prompt("Weight (lb):", String(a.weightLb || "")) ?? String(a.weightLb || "");
        a.name = name.trim() || a.name;
        a.pos = (pos || "").trim();
        a.heightIn = Number(ht) || a.heightIn;
        a.weightLb = Number(wt) || a.weightLb;
        saveState();
        fullRefresh();
      }
    }, { once: true });
  }

  function renderTrainingList(athleteId) {
    const host = $("#trainingList");
    if (!host) return;
    host.innerHTML = "";

    const rows = state.training
      .filter(s => !athleteId || s.athleteId === athleteId)
      .slice()
      .sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id))
      .slice(0, 20);

    if (!rows.length) {
      host.innerHTML = `<div class="item"><div class="itemtitle">No training sessions yet</div><div class="itemmeta">Log a session to populate load + heatmap + risk.</div></div>`;
      return;
    }

    rows.forEach(s => {
      const a = getAthleteById(s.athleteId);
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div class="itemhead">
          <div>
            <div class="itemtitle">${escapeHTML(a ? a.name : "Unknown")} • ${escapeHTML(s.type || "session")}</div>
            <div class="itemmeta">${escapeHTML(s.date)} • ${s.minutes} min • sRPE ${s.rpe} • Load ${s.load}</div>
          </div>
          <div class="itemactions">
            <button class="iconbtn" data-act="del" data-id="${s.id}">Delete</button>
          </div>
        </div>
        ${s.notes ? `<div class="small muted" style="margin-top:6px">${escapeHTML(s.notes)}</div>` : ""}
      `;
      host.appendChild(div);
    });

    host.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act='del']");
      if (!btn) return;
      const id = btn.dataset.id;
      state.training = state.training.filter(x => x.id !== id);
      saveState();
      fullRefresh();
    }, { once: true });
  }

  function renderReadinessList(athleteId) {
    const host = $("#readinessList");
    if (!host) return;
    host.innerHTML = "";

    const rows = state.readiness
      .filter(r => !athleteId || r.athleteId === athleteId)
      .slice()
      .sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id))
      .slice(0, 20);

    if (!rows.length) {
      host.innerHTML = `<div class="item"><div class="itemtitle">No check-ins yet</div><div class="itemmeta">Daily check-ins improve PIQ score + risk signals.</div></div>`;
      return;
    }

    rows.forEach(r => {
      const a = getAthleteById(r.athleteId);
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div class="itemhead">
          <div>
            <div class="itemtitle">${escapeHTML(a ? a.name : "Unknown")} • Readiness ${r.readinessScore}</div>
            <div class="itemmeta">${escapeHTML(r.date)} • Sleep ${r.sleepHours}h • Sore ${r.soreness}/10 • Stress ${r.stress}/10 • Energy ${r.energy}/10</div>
          </div>
          <div class="itemactions">
            <button class="iconbtn" data-act="del" data-id="${r.id}">Delete</button>
          </div>
        </div>
        ${r.injuryNote ? `<div class="small muted" style="margin-top:6px">Injury note: ${escapeHTML(r.injuryNote)}</div>` : ""}
      `;
      host.appendChild(div);
    });

    host.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act='del']");
      if (!btn) return;
      const id = btn.dataset.id;
      state.readiness = state.readiness.filter(x => x.id !== id);
      saveState();
      fullRefresh();
    }, { once: true });
  }

  function renderNutritionList(athleteId) {
    const host = $("#nutritionList");
    if (!host) return;
    host.innerHTML = "";

    const rows = state.nutrition
      .filter(n => !athleteId || n.athleteId === athleteId)
      .slice()
      .sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id))
      .slice(0, 20);

    if (!rows.length) {
      host.innerHTML = `<div class="item"><div class="itemtitle">No nutrition logs yet</div><div class="itemmeta">Log macros + water to power adherence + PIQ.</div></div>`;
      return;
    }

    rows.forEach(n => {
      const a = getAthleteById(n.athleteId);
      const targets = getNutritionTargets(n.athleteId);
      const adh = computeNutritionAdherence(n, targets);
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div class="itemhead">
          <div>
            <div class="itemtitle">${escapeHTML(a ? a.name : "Unknown")} • Nutrition ${adh.adherence}</div>
            <div class="itemmeta">${escapeHTML(n.date)} • P ${n.protein} / C ${n.carbs} / F ${n.fat} • Water ${n.waterOz} oz</div>
          </div>
          <div class="itemactions">
            <button class="iconbtn" data-act="del" data-id="${n.id}">Delete</button>
          </div>
        </div>
        ${n.notes ? `<div class="small muted" style="margin-top:6px">${escapeHTML(n.notes)}</div>` : ""}
      `;
      host.appendChild(div);
    });

    host.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act='del']");
      if (!btn) return;
      const id = btn.dataset.id;
      state.nutrition = state.nutrition.filter(x => x.id !== id);
      saveState();
      fullRefresh();
    }, { once: true });
  }

  function renderPlans(athleteId) {
    const host = $("#planList");
    if (!host) return;
    host.innerHTML = "";

    const plans = getPlanForAthlete(athleteId)
      .slice()
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    if (!plans.length) {
      host.innerHTML = `<div class="item"><div class="itemtitle">No plan generated yet</div><div class="itemmeta">Generate a plan to create weekly targets and compare planned vs actual.</div></div>`;
      return;
    }

    plans.forEach(p => {
      const div = document.createElement("div");
      div.className = "item";
      const first = p.weeksPlan && p.weeksPlan[0] ? p.weeksPlan[0].weekStart : p.startDate;
      const last = p.weeksPlan && p.weeksPlan.length ? p.weeksPlan[p.weeksPlan.length - 1].weekStart : p.startDate;
      div.innerHTML = `
        <div class="itemhead">
          <div>
            <div class="itemtitle">${escapeHTML(p.goal)} • ${p.weeks} weeks • deload every ${p.deloadEvery}</div>
            <div class="itemmeta">Start ${escapeHTML(first)} • Last week starts ${escapeHTML(last)}</div>
          </div>
          <div class="itemactions">
            <button class="iconbtn" data-act="view" data-id="${p.id}">View</button>
            <button class="iconbtn" data-act="del" data-id="${p.id}">Delete</button>
          </div>
        </div>
        <div class="small muted" style="margin-top:6px">Created: ${escapeHTML((p.createdAt || "").slice(0,19).replace("T"," "))}</div>
      `;
      host.appendChild(div);
    });

    host.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      const id = btn.dataset.id;
      const act = btn.dataset.act;
      const p = state.plans.find(x => x.id === id);
      if (!p) return;

      if (act === "del") {
        state.plans = state.plans.filter(x => x.id !== id);
        saveState();
        fullRefresh();
      }

      if (act === "view") {
        // Render expanded
        const text = (p.weeksPlan || []).map(w => {
          const lines = [];
          lines.push(`Week ${w.weekIndex} (${w.weekStart}) ${w.deload ? "[DELOAD]" : ""} — ${w.focus}`);
          lines.push(`  Planned load: ${w.plannedLoad}`);
          (w.plannedSessions || []).forEach(s => {
            lines.push(`  - ${s.date} ${s.type}: ${s.targetMinutes} min @ sRPE ${s.targetRpe} => load ${s.targetLoad}`);
          });
          return lines.join("\n");
        }).join("\n\n");
        alert(text || "No plan details.");
      }
    }, { once: true });
  }

  function escapeHTML(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // -----------------------------
  // Heatmap
  // -----------------------------
  function heatColor(value, min, max) {
    // return rgba string from low->high (muted->accent->warn->bad)
    if (value == null) return "rgba(255,255,255,0.05)";
    const v = clamp((value - min) / (max - min || 1), 0, 1);

    // piecewise: 0..0.5 -> accent, 0.5..0.8 -> warn, 0.8..1 -> bad
    if (v < 0.5) {
      const a = 0.10 + v * 0.25;
      return `rgba(72,164,255,${a.toFixed(3)})`;
    }
    if (v < 0.8) {
      const a = 0.12 + (v - 0.5) * 0.5;
      return `rgba(255,211,110,${a.toFixed(3)})`;
    }
    const a = 0.16 + (v - 0.8) * 0.9;
    return `rgba(255,107,107,${clamp(a, 0, 0.85).toFixed(3)})`;
  }

  function renderHeatmap() {
    const table = $("#heatTable");
    if (!table) return;

    const start = $("#heatStart")?.value || startOfWeekMonday(nowISODate());
    const days = clamp(Number($("#heatDays")?.value || 21), 7, 60);
    const metric = $("#heatMetric")?.value || "load";

    // Build date columns
    const dates = [];
    for (let i = 0; i < days; i++) dates.push(addDays(start, i));

    // Collect values for scaling
    const values = [];
    const grid = []; // [{athlete, vals:[{date,val}]}]
    state.athletes.forEach(a => {
      const vals = dates.map(d => {
        let val = null;
        if (metric === "load") val = getDailyTrainingLoad(a.id, d);
        if (metric === "readiness") val = getDailyReadinessScore(a.id, d);
        if (metric === "nutrition") val = getDailyNutritionAdherence(a.id, d);
        if (metric === "risk") val = computeRiskIndex(a.id, d).riskIndex;
        if (val != null) values.push(val);
        return { date: d, val };
      });
      grid.push({ athlete: a, vals });
    });

    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;

    // Header
    let html = "<thead><tr><th>Athlete</th>";
    dates.forEach(d => {
      const short = d.slice(5);
      html += `<th title="${d}">${short}</th>`;
    });
    html += "</tr></thead><tbody>";

    // Rows
    grid.forEach(row => {
      html += `<tr><td>${escapeHTML(row.athlete.name)}</td>`;
      row.vals.forEach(cell => {
        const bg = heatColor(cell.val, min, max);
        const text = cell.val == null ? "" : (metric === "load" ? String(round0(cell.val)) : String(round0(cell.val)));
        const title = `${row.athlete.name}\n${cell.date}\n${metric}: ${cell.val == null ? "—" : round1(cell.val)}`;
        html += `<td class="heatcell" data-ath="${row.athlete.id}" data-date="${cell.date}" style="background:${bg}" title="${escapeHTML(title)}">${escapeHTML(text)}</td>`;
      });
      html += "</tr>";
    });

    html += "</tbody>";
    table.innerHTML = html;

    table.onclick = (e) => {
      const td = e.target.closest("td.heatcell");
      if (!td) return;
      const athleteId = td.dataset.ath;
      const date = td.dataset.date;
      // jump to log view and set athlete/date
      showView("log");
      $("#logAthlete").value = athleteId;
      $("#logDate").value = date;
      $("#readyAthlete").value = athleteId;
      $("#readyDate").value = date;
      $("#nutAthlete").value = athleteId;
      $("#nutDate").value = date;
      // update lists
      renderTrainingList(athleteId);
      renderReadinessList(athleteId);
      renderNutritionList(athleteId);
    };
  }

  // -----------------------------
  // Dashboard render
  // -----------------------------
  function renderScore() {
    const athleteId = $("#dashAthlete")?.value || "";
    const date = $("#dashDate")?.value || nowISODate();
    if (!athleteId) {
      $("#piqScore").textContent = "—";
      $("#piqBand").textContent = "Pick an athlete";
      $("#piqExplain").textContent = "";
      return;
    }

    const res = computePIQScore(athleteId, date);
    $("#piqScore").textContent = String(res.total);
    $("#piqBand").textContent = res.band;

    // Bars
    const setBar = (id, val) => {
      const el = $(id);
      if (!el) return;
      el.style.width = clamp(val, 0, 100) + "%";
      // color by value
      if (val >= 75) el.style.background = "rgba(62,229,139,.85)";
      else if (val >= 55) el.style.background = "rgba(255,211,110,.85)";
      else el.style.background = "rgba(255,107,107,.85)";
    };

    setBar("#barReadiness", res.subs.readinessScore);
    setBar("#barTraining", res.subs.trainingScore);
    setBar("#barRecovery", res.subs.recoveryScore);
    setBar("#barNutrition", res.subs.nutritionScore);
    setBar("#barRisk", 100 - (res.riskObj.riskIndex || 0)); // display "goodness"

    $("#numReadiness").textContent = String(res.subs.readinessScore);
    $("#numTraining").textContent = String(res.subs.trainingScore);
    $("#numRecovery").textContent = String(res.subs.recoveryScore);
    $("#numNutrition").textContent = String(res.subs.nutritionScore);
    $("#numRisk").textContent = String(100 - (res.riskObj.riskIndex || 0));

    // Explain
    $("#piqExplain").textContent =
      res.explain.formula +
      "\n\nInputs:\n" +
      JSON.stringify(res.explain.inputs, null, 2);
  }

  function renderRiskPanel() {
    const athleteId = $("#riskAthlete")?.value || "";
    const date = $("#riskDate")?.value || nowISODate();
    if (!athleteId) {
      $("#riskSummary").textContent = "Pick an athlete";
      $("#riskWorkload").textContent = "—";
      $("#riskReadiness").textContent = "—";
      return;
    }
    const r = computeRiskIndex(athleteId, date);

    $("#riskSummary").textContent =
      `Risk level: ${r.level} • Risk index: ${r.riskIndex}` +
      (r.flags.length ? ` • Flags: ${r.flags.join(", ")}` : "");

    $("#riskWorkload").textContent =
      `Acute avg (7d): ${r.acwr.acuteAvg}\nChronic avg (28d): ${r.acwr.chronicAvg}\nACWR: ${r.acwr.acwr}\n\nMonotony: ${r.monotony.monotony}\n7d avg: ${r.monotony.avg}\n7d SD: ${r.monotony.sd}\nStrain: ${r.monotony.strain}`;

    $("#riskReadiness").textContent =
      `Readiness today: ${r.readiness == null ? "—" : r.readiness}\nNutrition adherence today: ${r.nutritionAdh == null ? "—" : round0(r.nutritionAdh)}\n\nNote: heuristic only. Cannot confirm injury risk.`;
  }

  // -----------------------------
  // Nutrition explain
  // -----------------------------
  function renderNutritionExplain() {
    const txt = `Adherence = 0.35*ProteinScore + 0.25*CarbScore + 0.20*FatScore + 0.20*WaterScore

Each Score = 100 - (% deviation from target * 100), clamped 0–100.
Example: target 100g, actual 80g -> deviation 0.20 -> score 80.`;
    $("#nutExplain").textContent = txt;
  }

  // -----------------------------
  // Compare planned vs actual
  // -----------------------------
  function compareWeek() {
    const athleteId = $("#monAthlete")?.value || "";
    const weekStart = $("#monWeek")?.value || startOfWeekMonday(nowISODate());
    if (!athleteId) {
      $("#compareSummary").textContent = "Pick an athlete";
      $("#compareDetail").textContent = "—";
      return;
    }

    const plans = getPlanForAthlete(athleteId);
    if (!plans.length) {
      $("#compareSummary").textContent = "No plan found for this athlete.";
      $("#compareDetail").textContent = "Generate a plan first.";
      return;
    }

    // Choose plan where weekStart within plan range
    let chosen = null;
    for (const p of plans) {
      const first = p.startDate;
      const lastStart = addDays(p.startDate, (p.weeks - 1) * 7);
      if (daysBetween(first, weekStart) >= 0 && daysBetween(weekStart, lastStart) >= 0) { chosen = p; break; }
    }
    if (!chosen) chosen = plans[0];

    const planned = getPlannedLoadForWeek(chosen, weekStart);
    const actual = getActualLoadForWeek(athleteId, weekStart);

    const diff = actual - planned;
    const pct = planned > 0 ? round0((diff / planned) * 100) : 0;

    $("#compareSummary").textContent = `Planned: ${planned} • Actual: ${actual} • Diff: ${diff} (${pct}%)`;

    const detailLines = [];
    detailLines.push(`Plan goal: ${chosen.goal}`);
    detailLines.push(`Week start: ${weekStart}`);
    detailLines.push("");
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const dayLoad = getDailyTrainingLoad(athleteId, d);
      detailLines.push(`${d}: actual load ${dayLoad}`);
    }
    $("#compareDetail").textContent = detailLines.join("\n");
  }

  // -----------------------------
  // Export / import
  // -----------------------------
  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performanceiq-export-${nowISODate()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importJSONFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const st = safeJSONParse(String(reader.result || ""), null);
      if (!st || typeof st !== "object") {
        alert("Import failed: invalid JSON.");
        return;
      }
      // Replace state safely
      const b = blankState();
      const merged = {
        ...b,
        ...st,
        team: { ...b.team, ...(st.team || {}) },
        athletes: Array.isArray(st.athletes) ? st.athletes : [],
        training: Array.isArray(st.training) ? st.training : [],
        readiness: Array.isArray(st.readiness) ? st.readiness : [],
        nutrition: Array.isArray(st.nutrition) ? st.nutrition : [],
        nutritionTargets: (st.nutritionTargets && typeof st.nutritionTargets === "object") ? st.nutritionTargets : {},
        plans: Array.isArray(st.plans) ? st.plans : []
      };
      // overwrite in place
      Object.keys(state).forEach(k => delete state[k]);
      Object.assign(state, merged);
      saveState();
      fullRefresh();
      alert("Import complete.");
    };
    reader.readAsText(file);
  }

  // -----------------------------
  // Seed demo data
  // -----------------------------
  function seedDemo() {
    const already = state.athletes.length > 0;
    if (already && !confirm("This will add demo athletes and logs to your existing data. Continue?")) return;

    const a1 = { id: uid("ath"), name: "Demo Athlete A", pos: "PG", heightIn: 70, weightLb: 150, createdAt: new Date().toISOString() };
    const a2 = { id: uid("ath"), name: "Demo Athlete B", pos: "SF", heightIn: 74, weightLb: 175, createdAt: new Date().toISOString() };
    state.athletes.push(a1, a2);

    const start = addDays(nowISODate(), -20);
    for (let i = 0; i < 21; i++) {
      const d = addDays(start, i);
      [a1, a2].forEach((a, idx) => {
        const minutes = 50 + ((i + idx) % 25);
        const rpe = 5 + ((i + 2 * idx) % 4);
        if ((i % 7) !== 6) {
          const load = computeSessionLoad(minutes, rpe);
          state.training.push({
            id: uid("tr"),
            athleteId: a.id,
            date: d,
            minutes,
            rpe,
            type: (i % 5 === 0 ? "lift" : (i % 3 === 0 ? "conditioning" : "practice")),
            notes: "",
            load
          });
        }

        const sleep = 7.5 + ((idx + i) % 4) * 0.25;
        const sore = ((i + idx) % 7) > 4 ? 6 : 3;
        const stress = ((i + 2 * idx) % 9) > 6 ? 6 : 3;
        const energy = 6 + ((i + idx) % 5);
        const readinessScore = computeReadinessScore({ sleepHours: sleep, soreness: sore, stress, energy });

        state.readiness.push({
          id: uid("rd"),
          athleteId: a.id,
          date: d,
          sleepHours: sleep,
          soreness: sore,
          stress,
          energy,
          injuryNote: (i === 13 && idx === 1) ? "ankle tightness" : "",
          readinessScore
        });

        const targets = getNutritionTargets(a.id);
        const protein = clamp(round0(targets.protein * (0.75 + ((i + idx) % 6) * 0.05)), 0, 500);
        const carbs = clamp(round0(targets.carbs * (0.70 + ((i + 2*idx) % 7) * 0.05)), 0, 1000);
        const fat = clamp(round0(targets.fat * (0.75 + ((i + 3*idx) % 6) * 0.05)), 0, 400);
        const waterOz = clamp(round0(targets.waterOz * (0.70 + ((i + idx) % 7) * 0.05)), 0, 300);

        state.nutrition.push({
          id: uid("nu"),
          athleteId: a.id,
          date: d,
          protein, carbs, fat, waterOz,
          notes: ""
        });
      });
    }

    saveState();
    fullRefresh();
    alert("Seeded demo data.");
  }

  // -----------------------------
  // Full refresh
  // -----------------------------
  function fullRefresh() {
    refreshHeader();

    // Fill selects
    const athletes = state.athletes.slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    [
      "#dashAthlete", "#riskAthlete",
      "#logAthlete", "#readyAthlete",
      "#nutAthlete", "#targetAthlete",
      "#perAthlete", "#monAthlete"
    ].forEach(sel => fillSelect($(sel), athletes, false));

    // Defaults for dates
    const today = nowISODate();
    ["#dashDate", "#riskDate", "#logDate", "#readyDate", "#nutDate"].forEach(sel => {
      const el = $(sel);
      if (el && !el.value) el.value = today;
    });

    const heatStart = $("#heatStart");
    if (heatStart && !heatStart.value) heatStart.value = startOfWeekMonday(today);

    const perStart = $("#perStart");
    if (perStart && !perStart.value) perStart.value = startOfWeekMonday(today);

    const monWeek = $("#monWeek");
    if (monWeek && !monWeek.value) monWeek.value = startOfWeekMonday(today);

    // Team settings fields
    $("#teamName").value = state.team.name || "Default";
    $("#seasonStart").value = state.team.seasonStart || "";
    $("#seasonEnd").value = state.team.seasonEnd || "";
    $("#defProt").value = Number(state.team.macroDefaults?.protein || 160);
    $("#defCarb").value = Number(state.team.macroDefaults?.carbs || 240);
    $("#defFat").value = Number(state.team.macroDefaults?.fat || 70);

    $("#wReadiness").value = Number(state.team.weights?.readiness ?? 30);
    $("#wTraining").value = Number(state.team.weights?.training ?? 25);
    $("#wRecovery").value = Number(state.team.weights?.recovery ?? 20);
    $("#wNutrition").value = Number(state.team.weights?.nutrition ?? 15);
    $("#wRisk").value = Number(state.team.weights?.risk ?? 10);
    validateWeights();

    // Computed log text
    updateTrainingComputed();

    // Lists
    const currentLogAth = $("#logAthlete")?.value || "";
    renderRoster();
    renderTrainingList(currentLogAth);
    renderReadinessList($("#readyAthlete")?.value || "");
    renderNutritionList($("#nutAthlete")?.value || "");
    renderPlans($("#perAthlete")?.value || "");

    // Score & risk panels
    renderScore();
    renderRiskPanel();

    // Nutrition explain
    renderNutritionExplain();

    // App info
    const info = $("#appInfo");
    if (info) {
      info.textContent = JSON.stringify({
        appVersion: APP_VERSION,
        storageKey: STORAGE_KEY,
        athletes: state.athletes.length,
        trainingSessions: state.training.length,
        readinessEntries: state.readiness.length,
        nutritionEntries: state.nutrition.length,
        plans: state.plans.length
      }, null, 2);
    }
  }

  function validateWeights() {
    const wR = Number($("#wReadiness").value || 0);
    const wT = Number($("#wTraining").value || 0);
    const wRec = Number($("#wRecovery").value || 0);
    const wN = Number($("#wNutrition").value || 0);
    const wRisk = Number($("#wRisk").value || 0);
    const sum = wR + wT + wRec + wN + wRisk;
    const note = $("#weightsNote");
    if (!note) return;
    note.textContent = (sum === 100) ? "Weights OK (total 100)." : `Weights total ${sum}. Adjust to 100 for clean scoring.`;
  }

  function updateTrainingComputed() {
    const m = Number($("#logMin")?.value || 0);
    const r = Number($("#logRpe")?.value || 0);
    const load = computeSessionLoad(m, r);
    const el = $("#logComputed");
    if (el) el.textContent = `Load: ${load} (minutes × sRPE)`;
  }

  // -----------------------------
  // Event listeners
  // -----------------------------
  function wireNav() {
    $$(".navbtn").forEach(btn => {
      btn.addEventListener("click", () => showView(btn.dataset.view));
    });
  }

  function wireActions() {
    $("#btnExport")?.addEventListener("click", exportJSON);
    $("#fileImport")?.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importJSONFile(f);
      e.target.value = "";
    });

    $("#btnWipe")?.addEventListener("click", () => {
      if (!confirm("Wipe ALL local PerformanceIQ data on this device?")) return;
      localStorage.removeItem(STORAGE_KEY);
      const fresh = blankState();
      Object.keys(state).forEach(k => delete state[k]);
      Object.assign(state, fresh);
      saveState();
      fullRefresh();
      alert("Wiped.");
    });

    $("#btnSeed")?.addEventListener("click", seedDemo);

    // Add athlete
    $("#btnAddAthlete")?.addEventListener("click", () => {
      const name = ($("#athName").value || "").trim();
      if (!name) { alert("Name required."); return; }
      const pos = ($("#athPos").value || "").trim();
      const ht = Number($("#athHt").value || 0) || null;
      const wt = Number($("#athWt").value || 0) || null;
      state.athletes.push({ id: uid("ath"), name, pos, heightIn: ht, weightLb: wt, createdAt: new Date().toISOString() });
      $("#athName").value = ""; $("#athPos").value = ""; $("#athHt").value = ""; $("#athWt").value = "";
      saveState();
      fullRefresh();
    });

    // Save team
    $("#btnSaveTeam")?.addEventListener("click", () => {
      state.team.name = ($("#teamName").value || "Default").trim() || "Default";
      state.team.seasonStart = $("#seasonStart").value || "";
      state.team.seasonEnd = $("#seasonEnd").value || "";
      saveState();
      fullRefresh();
      alert("Saved team settings.");
    });

    // Save macro defaults
    $("#btnSaveMacroDefaults")?.addEventListener("click", () => {
      state.team.macroDefaults = {
        protein: Number($("#defProt").value || 0),
        carbs: Number($("#defCarb").value || 0),
        fat: Number($("#defFat").value || 0),
        waterOz: Number(state.team.macroDefaults?.waterOz || 96)
      };
      saveState();
      fullRefresh();
      alert("Saved macro defaults.");
    });

    // Save weights
    ["#wReadiness","#wTraining","#wRecovery","#wNutrition","#wRisk"].forEach(sel => {
      $(sel)?.addEventListener("input", validateWeights);
    });
    $("#btnSaveWeights")?.addEventListener("click", () => {
      const w = {
        readiness: Number($("#wReadiness").value || 0),
        training: Number($("#wTraining").value || 0),
        recovery: Number($("#wRecovery").value || 0),
        nutrition: Number($("#wNutrition").value || 0),
        risk: Number($("#wRisk").value || 0)
      };
      const sum = w.readiness + w.training + w.recovery + w.nutrition + w.risk;
      if (sum !== 100) {
        alert(`Weights must total 100. Current total: ${sum}`);
        return;
      }
      state.team.weights = w;
      saveState();
      fullRefresh();
      alert("Saved PIQ weights.");
    });

    // Training inputs -> computed load
    $("#logMin")?.addEventListener("input", updateTrainingComputed);
    $("#logRpe")?.addEventListener("input", updateTrainingComputed);

    // Save training session
    $("#btnSaveTraining")?.addEventListener("click", () => {
      const athleteId = $("#logAthlete").value;
      if (!athleteId) { alert("Pick athlete."); return; }
      const date = $("#logDate").value || nowISODate();
      const minutes = clamp(Number($("#logMin").value || 0), 0, 600);
      const rpe = clamp(Number($("#logRpe").value || 0), 0, 10);
      const type = $("#logType").value || "practice";
      const notes = ($("#logNotes").value || "").trim();
      const load = computeSessionLoad(minutes, rpe);

      state.training.push({ id: uid("tr"), athleteId, date, minutes, rpe, type, notes, load });
      $("#logNotes").value = "";
      saveState();
      fullRefresh();
    });

    // Save readiness
    $("#btnSaveReadiness")?.addEventListener("click", () => {
      const athleteId = $("#readyAthlete").value;
      if (!athleteId) { alert("Pick athlete."); return; }
      const date = $("#readyDate").value || nowISODate();
      const sleepHours = clamp(Number($("#readySleep").value || 0), 0, 16);
      const soreness = clamp(Number($("#readySore").value || 0), 0, 10);
      const stress = clamp(Number($("#readyStress").value || 0), 0, 10);
      const energy = clamp(Number($("#readyEnergy").value || 0), 0, 10);
      const injuryNote = ($("#readyInjury").value || "").trim();
      const readinessScore = computeReadinessScore({ sleepHours, soreness, stress, energy });

      // Upsert by athlete+date
      const idx = state.readiness.findIndex(r => r.athleteId === athleteId && r.date === date);
      const obj = { id: idx >= 0 ? state.readiness[idx].id : uid("rd"), athleteId, date, sleepHours, soreness, stress, energy, injuryNote, readinessScore };
      if (idx >= 0) state.readiness[idx] = obj; else state.readiness.push(obj);

      $("#readyComputed").textContent = `Readiness: ${readinessScore}`;
      saveState();
      fullRefresh();
    });

    // Save nutrition
    $("#btnSaveNutrition")?.addEventListener("click", () => {
      const athleteId = $("#nutAthlete").value;
      if (!athleteId) { alert("Pick athlete."); return; }
      const date = $("#nutDate").value || nowISODate();
      const protein = clamp(Number($("#nutProt").value || 0), 0, 500);
      const carbs = clamp(Number($("#nutCarb").value || 0), 0, 1000);
      const fat = clamp(Number($("#nutFat").value || 0), 0, 400);
      const waterOz = clamp(Number($("#nutWater").value || 0), 0, 300);
      const notes = ($("#nutNotes").value || "").trim();

      const idx = state.nutrition.findIndex(n => n.athleteId === athleteId && n.date === date);
      const obj = { id: idx >= 0 ? state.nutrition[idx].id : uid("nu"), athleteId, date, protein, carbs, fat, waterOz, notes };
      if (idx >= 0) state.nutrition[idx] = obj; else state.nutrition.push(obj);

      const targets = getNutritionTargets(athleteId);
      const adh = computeNutritionAdherence(obj, targets);
      $("#nutComputed").textContent = `Adherence: ${adh.adherence} (P:${adh.detail.protein.score} C:${adh.detail.carbs.score} F:${adh.detail.fat.score} W:${adh.detail.waterOz.score})`;

      saveState();
      fullRefresh();
    });

    // Quick meal add to today
    $("#btnQuickMeal")?.addEventListener("click", () => {
      const athleteId = $("#nutAthlete").value;
      if (!athleteId) { alert("Pick athlete in Elite Nutrition."); return; }
      const date = $("#nutDate").value || nowISODate();

      const addP = clamp(Number($("#qmProt").value || 0), 0, 200);
      const addC = clamp(Number($("#qmCarb").value || 0), 0, 300);
      const addF = clamp(Number($("#qmFat").value || 0), 0, 150);
      const addW = clamp(Number($("#qmWater").value || 0), 0, 80);

      const idx = state.nutrition.findIndex(n => n.athleteId === athleteId && n.date === date);
      let obj;
      if (idx >= 0) {
        obj = state.nutrition[idx];
        obj.protein = clamp((Number(obj.protein) || 0) + addP, 0, 500);
        obj.carbs = clamp((Number(obj.carbs) || 0) + addC, 0, 1000);
        obj.fat = clamp((Number(obj.fat) || 0) + addF, 0, 400);
        obj.waterOz = clamp((Number(obj.waterOz) || 0) + addW, 0, 300);
      } else {
        obj = { id: uid("nu"), athleteId, date, protein: addP, carbs: addC, fat: addF, waterOz: addW, notes: "" };
        state.nutrition.push(obj);
      }

      saveState();
      fullRefresh();
      alert("Added to today.");
    });

    // Save targets
    $("#btnSaveTargets")?.addEventListener("click", () => {
      const athleteId = $("#targetAthlete").value;
      if (!athleteId) { alert("Pick athlete."); return; }
      state.nutritionTargets[athleteId] = {
        protein: Number($("#tProt").value || 0),
        carbs: Number($("#tCarb").value || 0),
        fat: Number($("#tFat").value || 0),
        waterOz: Number($("#tWater").value || 0)
      };
      saveState();
      fullRefresh();
      alert("Saved nutrition targets.");
    });

    // When target athlete changes, load targets into fields
    $("#targetAthlete")?.addEventListener("change", () => {
      const athleteId = $("#targetAthlete").value;
      if (!athleteId) return;
      const t = getNutritionTargets(athleteId);
      $("#tProt").value = t.protein;
      $("#tCarb").value = t.carbs;
      $("#tFat").value = t.fat;
      $("#tWater").value = t.waterOz;
    });

    // Recalc score
    $("#btnRecalcScore")?.addEventListener("click", renderScore);
    $("#dashAthlete")?.addEventListener("change", renderScore);
    $("#dashDate")?.addEventListener("change", renderScore);

    // Risk run
    $("#btnRunRisk")?.addEventListener("click", renderRiskPanel);
    $("#riskAthlete")?.addEventListener("change", renderRiskPanel);
    $("#riskDate")?.addEventListener("change", renderRiskPanel);

    // Heatmap
    $("#btnHeatmap")?.addEventListener("click", renderHeatmap);

    // Periodization generate
    $("#btnGeneratePlan")?.addEventListener("click", () => {
      const athleteId = $("#perAthlete").value;
      if (!athleteId) { alert("Pick athlete."); return; }
      const startDate = $("#perStart").value || startOfWeekMonday(nowISODate());
      const weeks = clamp(Number($("#perWeeks").value || 8), 2, 24);
      const goal = $("#perGoal").value || "inseason";
      const deloadEvery = Number($("#perDeload").value || 4);

      const plan = generatePeriodizationPlan({ athleteId, startDate, weeks, goal, deloadEvery });
      state.plans.unshift(plan);
      saveState();
      fullRefresh();
      alert("Plan generated.");
    });

    // Plan compare
    $("#btnCompareWeek")?.addEventListener("click", compareWeek);

    // When athlete selection changes, refresh lists
    $("#logAthlete")?.addEventListener("change", () => renderTrainingList($("#logAthlete").value));
    $("#readyAthlete")?.addEventListener("change", () => renderReadinessList($("#readyAthlete").value));
    $("#nutAthlete")?.addEventListener("change", () => renderNutritionList($("#nutAthlete").value));
    $("#perAthlete")?.addEventListener("change", () => renderPlans($("#perAthlete").value));

    // Update readiness/nutrition computed on date changes
    $("#readyDate")?.addEventListener("change", () => {
      const athleteId = $("#readyAthlete").value;
      const date = $("#readyDate").value;
      if (!athleteId || !date) return;
      const r = state.readiness.find(x => x.athleteId === athleteId && x.date === date);
      if (r) $("#readyComputed").textContent = `Readiness: ${r.readinessScore}`;
    });

    $("#nutDate")?.addEventListener("change", () => {
      const athleteId = $("#nutAthlete").value;
      const date = $("#nutDate").value;
      if (!athleteId || !date) return;
      const n = state.nutrition.find(x => x.athleteId === athleteId && x.date === date);
      if (n) {
        const targets = getNutritionTargets(athleteId);
        const adh = computeNutritionAdherence(n, targets);
        $("#nutComputed").textContent = `Adherence: ${adh.adherence} (P:${adh.detail.protein.score} C:${adh.detail.carbs.score} F:${adh.detail.fat.score} W:${adh.detail.waterOz.score})`;
      }
    });
  }

  // -----------------------------
  // Init
  // -----------------------------
  function init() {
    setSplash("Initializing…");

    // Ensure at least one athlete exists? (No — allow empty state)
    refreshHeader();
    wireNav();
    wireActions();

    // Default view
    showView("dashboard");

    // Render
    fullRefresh();
    renderHeatmap();

    hideSplash();
  }

  // Start when DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();
