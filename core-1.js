// core.js — PerformanceIQ Next Phase (Top-tier foundation)
// v2.0.0 — PIQ Score + Heatmap + Elite Nutrition (paid) + Risk + Periodization

(function () {
  "use strict";
  if (window.PIQ_App) return;

  const S = window.PIQ_Store;
  if (!S) throw new Error("PIQ_Store missing. Ensure dataStore.js is loaded before core.js.");

  // ---------- DOM helpers ----------
  const $ = (id) => document.getElementById(id);
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function setText(el, txt) {
    if (!el) return;
    el.textContent = txt;
  }

  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }

  function setDisplay(el, display) {
    if (el) el.style.display = display;
  }

  function fmt(n, digits = 0) {
    const x = Number(n);
    if (Number.isNaN(x)) return "—";
    return x.toFixed(digits);
  }

  function isoAddDays(iso, days) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + Number(days || 0));
    return d.toISOString().slice(0, 10);
  }

  function isoToNice(iso) {
    if (!iso) return "—";
    return iso;
  }

  function safeSum(arr, fn) {
    return (arr || []).reduce((acc, x) => acc + (Number(fn(x)) || 0), 0);
  }

  // ---------- Splash ----------
  function endSplash() {
    const splash = $("splash");
    if (!splash) return;
    splash.classList.add("hide");
    splash.setAttribute("aria-hidden", "true");
    setTimeout(() => { splash.remove(); }, 250);
  }

  // ---------- Navigation ----------
  function setView(name) {
    qsa(".view[data-view]").forEach((v) => {
      const is = v.id === "view-" + name;
      v.hidden = !is;
    });
    qsa(".navbtn").forEach((b) => {
      b.classList.toggle("active", b.dataset.view === name);
    });
    // view-specific refresh
    if (name === "dashboard") refreshDashboard();
    if (name === "team") refreshTeam();
    if (name === "log") refreshLog();
    if (name === "nutrition") refreshNutrition();
    if (name === "periodization") refreshPeriodization();
    if (name === "settings") refreshSettings();
  }

  function wireNav() {
    qsa(".navbtn").forEach((b) => {
      b.addEventListener("click", () => setView(b.dataset.view));
    });
  }

  // ---------- Core computed metrics ----------
  function calcSessionLoad(session) {
    const min = Number(session?.minutes) || 0;
    const rpe = Number(session?.rpe) || 0;
    return Math.max(0, min * rpe);
  }

  function calcDailyLoad(athleteId, dateISO) {
    const sessions = S.getTrainingForDate(athleteId, dateISO);
    return safeSum(sessions, calcSessionLoad);
  }

  function calcReadinessScore(entry) {
    // Simple, explainable: sleep is positive; soreness/stress reduce; energy increases.
    // Output 0–100.
    if (!entry) return null;
    const sleep = S.clamp(entry.sleepHrs, 0, 16);        // 0..16
    const sore = S.clamp(entry.sore, 0, 10);             // 0..10
    const stress = S.clamp(entry.stress, 0, 10);         // 0..10
    const energy = S.clamp(entry.energy, 0, 10);         // 0..10

    // Normalize
    const sleepScore = S.clamp((sleep / 9) * 35, 0, 35); // 9hrs ~= strong baseline
    const energyScore = S.clamp((energy / 10) * 35, 0, 35);
    const penalty = S.clamp(((sore + stress) / 20) * 30, 0, 30);

    const out = S.clamp(sleepScore + energyScore + (30 - penalty), 0, 100);
    return out;
  }

  function calcNutritionAdherence(athleteId, dateISO) {
    const n = S.getNutritionForDate(athleteId, dateISO);
    if (!n) return null;

    const t = S.getTargetsForAthlete(athleteId);
    const p = Number(n.p) || 0, c = Number(n.c) || 0, f = Number(n.f) || 0, w = Number(n.w) || 0;

    // component adherence = 100 - % deviation, clipped.
    function comp(actual, target, weight) {
      if (!target || target <= 0) return { score: 100, detail: "target=0 => 100" };
      const dev = Math.abs(actual - target) / target; // 0..inf
      const s = S.clamp(100 - dev * 120, 0, 100);     // allow small miss; big miss drops
      return { score: s, detail: `${actual}/${target}` };
    }

    const pc = comp(p, t.p, 1);
    const cc = comp(c, t.c, 1);
    const fc = comp(f, t.f, 1);
    const wc = comp(w, t.w, 1);

    // protein slightly more important; hydration important
    const total =
      (pc.score * 0.35) +
      (cc.score * 0.25) +
      (fc.score * 0.15) +
      (wc.score * 0.25);

    return {
      score: Math.round(S.clamp(total, 0, 100)),
      parts: { protein: pc, carbs: cc, fat: fc, water: wc },
      targets: t,
      actuals: { p, c, f, w }
    };
  }

  function calcTrainingSubScore(athleteId, dateISO) {
    // Training score is "appropriate load" vs athlete's rolling baseline.
    // Too low or too high reduces; medium is best.
    const load = calcDailyLoad(athleteId, dateISO); // 0.. large
    const chronic = calcChronicLoad(athleteId, dateISO, 28); // avg daily over 28d
    const baseline = Math.max(1, chronic);

    const ratio = load / baseline; // ~1.0 ideal-ish
    // Score peaks near 1.0; falls as diverges
    const score = S.clamp(100 - Math.abs(ratio - 1) * 70, 0, 100);
    return { score: Math.round(score), load, baseline, ratio: Number(ratio.toFixed(2)) };
  }

  function calcChronicLoad(athleteId, dateISO, windowDays) {
    const days = Number(windowDays || 28);
    let sum = 0;
    for (let i = 0; i < days; i++) {
      sum += calcDailyLoad(athleteId, isoAddDays(dateISO, -i));
    }
    return sum / days;
  }

  function calcAcuteLoad(athleteId, dateISO, windowDays) {
    const days = Number(windowDays || 7);
    let sum = 0;
    for (let i = 0; i < days; i++) {
      sum += calcDailyLoad(athleteId, isoAddDays(dateISO, -i));
    }
    return sum / days;
  }

  function calcMonotonyAndStrain(athleteId, dateISO) {
    // 7-day load monotony = mean / sd; strain = mean * monotony
    const loads = [];
    for (let i = 0; i < 7; i++) loads.push(calcDailyLoad(athleteId, isoAddDays(dateISO, -i)));
    const mean = loads.reduce((a, b) => a + b, 0) / 7;
    const variance = loads.reduce((a, x) => a + Math.pow(x - mean, 2), 0) / 7;
    const sd = Math.sqrt(variance);
    const monotony = sd === 0 ? (mean > 0 ? 5 : 0) : mean / sd;
    const strain = mean * monotony;
    return { mean, sd, monotony, strain, loads };
  }

  function calcRiskIndex(athleteId, dateISO) {
    // Heuristic risk: acute:chronic, monotony, low readiness, low sleep, soreness, pain note, low nutrition adherence.
    const acute = calcAcuteLoad(athleteId, dateISO, 7);
    const chronic = calcChronicLoad(athleteId, dateISO, 28);
    const acr = chronic > 0 ? acute / chronic : (acute > 0 ? 2 : 0);

    const ms = calcMonotonyAndStrain(athleteId, dateISO);

    const rEntry = S.getReadinessForDate(athleteId, dateISO);
    const readiness = calcReadinessScore(rEntry);
    const sleep = rEntry ? Number(rEntry.sleepHrs) || 0 : null;
    const sore = rEntry ? Number(rEntry.sore) || 0 : null;
    const pain = rEntry ? String(rEntry.injuryNote || "").trim() : "";

    const nut = calcNutritionAdherence(athleteId, dateISO);
    const nutScore = nut ? nut.score : null;

    let risk = 0;
    const flags = [];

    // ACR
    if (acr >= 1.5) { risk += 22; flags.push("Acute load high vs baseline (ACR ≥ 1.5)"); }
    else if (acr >= 1.3) { risk += 12; flags.push("Acute load elevated (ACR ≥ 1.3)"); }
    else if (acr <= 0.5 && chronic > 0) { risk += 6; flags.push("Acute load very low vs baseline (possible detraining)"); }

    // Monotony
    if (ms.monotony >= 2.0) { risk += 14; flags.push("High monotony (little day-to-day variation)"); }
    if (ms.strain >= 2500) { risk += 10; flags.push("High 7-day strain"); }

    // Readiness
    if (readiness !== null && readiness < 55) { risk += 18; flags.push("Low readiness score"); }
    if (sleep !== null && sleep < 7) { risk += 10; flags.push("Sleep < 7h"); }
    if (sore !== null && sore >= 7) { risk += 10; flags.push("High soreness (≥7)"); }
    if (pain) { risk += 14; flags.push("Pain/Injury note present"); }

    // Nutrition
    if (nutScore !== null && nutScore < 60) { risk += 10; flags.push("Low nutrition adherence"); }
    if (nutScore === null) { risk += 4; flags.push("No nutrition log (unknown)"); }

    // Cap and map to 0–100
    risk = S.clamp(risk, 0, 100);

    // Build short summary bucket
    let band = "LOW";
    if (risk >= 65) band = "HIGH";
    else if (risk >= 40) band = "MODERATE";

    return {
      risk: Math.round(risk),
      band,
      inputs: {
        acute: Number(acute.toFixed(1)),
        chronic: Number(chronic.toFixed(1)),
        acr: Number(acr.toFixed(2)),
        monotony: Number(ms.monotony.toFixed(2)),
        strain: Number(ms.strain.toFixed(0)),
        readiness: readiness === null ? null : Math.round(readiness),
        sleep,
        sore,
        nutScore
      },
      flags
    };
  }

  function calcRecoverySubScore(athleteId, dateISO) {
    // Recovery sub-score driven by sleep and soreness/stress; uses readiness entry
    const r = S.getReadinessForDate(athleteId, dateISO);
    if (!r) return { score: 50, note: "No check-in logged (default 50)" };

    const sleep = Number(r.sleepHrs) || 0;
    const sore = Number(r.sore) || 0;
    const stress = Number(r.stress) || 0;

    const sleepScore = S.clamp((sleep / 9) * 60, 0, 60);
    const penalty = S.clamp(((sore + stress) / 20) * 40, 0, 40);

    const out = S.clamp(sleepScore + (40 - penalty), 0, 100);
    return { score: Math.round(out), note: `sleep=${sleep}h, sore=${sore}, stress=${stress}` };
  }

  function calcPIQScore(athleteId, dateISO) {
    const weights = S.getState().team.weights;

    const rEntry = S.getReadinessForDate(athleteId, dateISO);
    const readiness = rEntry ? calcReadinessScore(rEntry) : null;

    const training = calcTrainingSubScore(athleteId, dateISO);
    const recovery = calcRecoverySubScore(athleteId, dateISO);
    const nutrition = calcNutritionAdherence(athleteId, dateISO);
    const risk = calcRiskIndex(athleteId, dateISO);

    const readinessScore = readiness === null ? 50 : readiness;
    const nutritionScore = nutrition ? nutrition.score : 50;
    const riskScore = 100 - risk.risk; // invert: higher risk -> lower score

    const wSum = weights.readiness + weights.training + weights.recovery + weights.nutrition + weights.risk;
    const w = wSum === 100 ? weights : { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 };

    const blended =
      (readinessScore * (w.readiness / 100)) +
      (training.score * (w.training / 100)) +
      (recovery.score * (w.recovery / 100)) +
      (nutritionScore * (w.nutrition / 100)) +
      (riskScore * (w.risk / 100));

    const score = Math.round(S.clamp(blended, 0, 100));

    let band = "DEVELOPING";
    if (score >= 85) band = "ELITE";
    else if (score >= 70) band = "COMPETITIVE";
    else if (score >= 55) band = "BUILDING";

    const explain = [
      `PIQ Score = weighted blend (0–100)`,
      ``,
      `Readiness: ${fmt(readinessScore, 0)} (weight ${w.readiness}%)`,
      `Training:  ${fmt(training.score, 0)} (weight ${w.training}%)`,
      `Recovery:  ${fmt(recovery.score, 0)} (weight ${w.recovery}%)`,
      `Nutrition: ${fmt(nutritionScore, 0)} (weight ${w.nutrition}%)`,
      `Risk:      ${fmt(riskScore, 0)} (weight ${w.risk}%)  [computed as 100 - riskIndex]`,
      ``,
      `Training details: load=${fmt(training.load, 0)}, baseline=${fmt(training.baseline, 0)}, ratio=${training.ratio}`,
      `Recovery details: ${recovery.note}`,
      `Risk details: riskIndex=${risk.risk} (${risk.band}), ACR=${risk.inputs.acr}, monotony=${risk.inputs.monotony}`,
      nutrition ? `Nutrition details: p ${nutrition.actuals.p}/${nutrition.targets.p}, c ${nutrition.actuals.c}/${nutrition.targets.c}, f ${nutrition.actuals.f}/${nutrition.targets.f}, w ${nutrition.actuals.w}/${nutrition.targets.w}` : `Nutrition details: no entry (default 50)`,
    ].join("\n");

    return {
      score,
      band,
      subs: {
        readiness: Math.round(readinessScore),
        training: training.score,
        recovery: recovery.score,
        nutrition: Math.round(nutritionScore),
        risk: Math.round(riskScore),
        riskIndex: risk.risk
      },
      explain
    };
  }

  // ---------- UI: roster + selects ----------
  function roster() {
    return S.getState().roster || [];
  }

  function ensureRoster() {
    const r = roster();
    if (r.length) return;
    // keep empty by default; seed button provides demo
  }

  function fillAthleteSelect(selectEl, selectedId) {
    if (!selectEl) return;
    const r = roster();
    selectEl.innerHTML = "";
    r.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = a.name;
      selectEl.appendChild(opt);
    });
    if (selectedId && r.some((x) => x.id === selectedId)) selectEl.value = selectedId;
  }

  function syncAllAthleteSelects() {
    const ids = [
      "dashAthlete","riskAthlete","logAthlete","readyAthlete","nutAthlete","targetAthlete","perAthlete","monAthlete"
    ];
    const primary = roster()[0]?.id || "";
    ids.forEach((id) => fillAthleteSelect($(id), $(id)?.value || primary));
  }

  // ---------- TEAM VIEW ----------
  function refreshTeam() {
    const st = S.getState();
    setText($("activeTeamPill"), `Team: ${st.team.name || "Default"}`);

    $("teamName").value = st.team.name || "";
    $("seasonStart").value = st.team.seasonStart || "";
    $("seasonEnd").value = st.team.seasonEnd || "";

    $("defProt").value = st.team.macroDefaults.p;
    $("defCarb").value = st.team.macroDefaults.c;
    $("defFat").value = st.team.macroDefaults.f;

    $("wReadiness").value = st.team.weights.readiness;
    $("wTraining").value = st.team.weights.training;
    $("wRecovery").value = st.team.weights.recovery;
    $("wNutrition").value = st.team.weights.nutrition;
    $("wRisk").value = st.team.weights.risk;

    renderRosterList();
    syncAllAthleteSelects();

    // weights note
    const sum = st.team.weights.readiness + st.team.weights.training + st.team.weights.recovery + st.team.weights.nutrition + st.team.weights.risk;
    setText($("weightsNote"), sum === 100 ? "✅ Weights total 100." : `⚠️ Weights total ${sum}. Adjust to 100 for best results.`);
  }

  function renderRosterList() {
    const list = $("rosterList");
    if (!list) return;
    const r = roster();
    if (!r.length) {
      list.innerHTML = `<div class="empty">No athletes yet. Add one above or click <b>Seed Demo</b>.</div>`;
      return;
    }
    list.innerHTML = r.map((a) => {
      const t = a.targets ? `Targets: P${a.targets.p}/C${a.targets.c}/F${a.targets.f}/W${a.targets.w}` : `Targets: team default`;
      return `
        <div class="item">
          <div class="itemmain">
            <div><b>${escapeHTML(a.name)}</b> <span class="muted">(${escapeHTML(a.pos || "—")})</span></div>
            <div class="small muted">Ht ${a.heightIn} in • Wt ${a.weightLb} lb • ${escapeHTML(t)}</div>
          </div>
          <div class="itemactions">
            <button class="btn ghost" data-act="setTargets" data-id="${a.id}">Targets</button>
            <button class="btn danger ghost" data-act="remove" data-id="${a.id}">Remove</button>
          </div>
        </div>
      `;
    }).join("");

    qsa("button[data-act]", list).forEach((btn) => {
      btn.addEventListener("click", () => {
        const act = btn.dataset.act;
        const id = btn.dataset.id;
        if (act === "remove") {
          S.removeAthlete(id);
          refreshTeam();
          refreshDashboard();
          refreshLog();
          refreshNutrition();
          refreshPeriodization();
        }
        if (act === "setTargets") {
          setView("nutrition");
          // select athlete in targets section
          if ($("targetAthlete")) $("targetAthlete").value = id;
          loadTargetsUI();
        }
      });
    });
  }

  function wireTeam() {
    $("btnAddAthlete").addEventListener("click", () => {
      try {
        const a = S.addAthlete(
          $("athName").value,
          $("athPos").value,
          $("athHt").value,
          $("athWt").value
        );
        $("athName").value = "";
        $("athPos").value = "";
        $("athHt").value = "";
        $("athWt").value = "";
        refreshTeam();
        // also refresh dependent views
        refreshDashboard();
        refreshLog();
        refreshNutrition();
        refreshPeriodization();
        // select new athlete in all selects
        syncAllAthleteSelects();
        if ($("dashAthlete")) $("dashAthlete").value = a.id;
      } catch (e) {
        alert(e.message || String(e));
      }
    });

    $("btnSaveTeam").addEventListener("click", () => {
      S.setTeam({
        name: String($("teamName").value || "Default").trim() || "Default",
        seasonStart: $("seasonStart").value || "",
        seasonEnd: $("seasonEnd").value || "",
      });
      refreshTeam();
    });

    $("btnSaveMacroDefaults").addEventListener("click", () => {
      // keep water default untouched here; adjust in code if needed
      const st = S.getState();
      S.setMacroDefaults($("defProt").value, $("defCarb").value, $("defFat").value, st.team.macroDefaults.w);
      refreshTeam();
      refreshNutrition();
    });

    $("btnSaveWeights").addEventListener("click", () => {
      S.setWeights({
        readiness: $("wReadiness").value,
        training: $("wTraining").value,
        recovery: $("wRecovery").value,
        nutrition: $("wNutrition").value,
        risk: $("wRisk").value,
      });
      refreshTeam();
      refreshDashboard();
    });
  }

  // ---------- LOG VIEW ----------
  function refreshLog() {
    syncAllAthleteSelects();
    const t = S.todayISO();
    if ($("logDate") && !$("logDate").value) $("logDate").value = t;
    if ($("readyDate") && !$("readyDate").value) $("readyDate").value = t;

    updateTrainingComputed();
    updateReadinessComputed();
    renderTrainingList();
    renderReadinessList();
  }

  function updateTrainingComputed() {
    const minutes = Number($("logMin")?.value) || 0;
    const rpe = Number($("logRpe")?.value) || 0;
    const load = minutes * rpe;
    setText($("logComputed"), `Load: ${fmt(load, 0)} (minutes × sRPE)`);
  }

  function updateReadinessComputed() {
    const entry = {
      sleepHrs: Number($("readySleep")?.value) || 0,
      sore: Number($("readySore")?.value) || 0,
      stress: Number($("readyStress")?.value) || 0,
      energy: Number($("readyEnergy")?.value) || 0,
    };
    const score = calcReadinessScore(entry);
    setText($("readyComputed"), score === null ? "—" : `${fmt(score, 0)} / 100`);
  }

  function renderTrainingList() {
    const list = $("trainingList");
    if (!list) return;
    const athleteId = $("logAthlete")?.value;
    if (!athleteId) { list.innerHTML = `<div class="empty">Add an athlete first.</div>`; return; }
    const items = S.listTraining(athleteId, 30);
    if (!items.length) { list.innerHTML = `<div class="empty">No sessions yet.</div>`; return; }

    list.innerHTML = items.map((x) => {
      return `
        <div class="item">
          <div class="itemmain">
            <div><b>${escapeHTML(x.date)}</b> <span class="pill mini">${escapeHTML(x.type)}</span></div>
            <div class="small muted">Min ${x.minutes} • sRPE ${x.rpe} • Load <b>${fmt(calcSessionLoad(x), 0)}</b>${x.notes ? ` • ${escapeHTML(x.notes)}` : ""}</div>
          </div>
          <div class="itemactions">
            <button class="btn danger ghost" data-act="delTrain" data-id="${x.id}">Delete</button>
          </div>
        </div>
      `;
    }).join("");

    qsa("button[data-act='delTrain']", list).forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.dataset.id;
        const st = S.getState();
        st.logs.training = st.logs.training.filter((t) => t.id !== id);
        S.setState(st);
        renderTrainingList();
        refreshDashboard();
      });
    });
  }

  function renderReadinessList() {
    const list = $("readinessList");
    if (!list) return;
    const athleteId = $("readyAthlete")?.value;
    if (!athleteId) { list.innerHTML = `<div class="empty">Add an athlete first.</div>`; return; }
    const items = S.listReadiness(athleteId, 30);
    if (!items.length) { list.innerHTML = `<div class="empty">No check-ins yet.</div>`; return; }

    list.innerHTML = items.map((x) => {
      const score = calcReadinessScore(x);
      const injury = x.injuryNote ? ` • ⚠️ ${escapeHTML(x.injuryNote)}` : "";
      return `
        <div class="item">
          <div class="itemmain">
            <div><b>${escapeHTML(x.date)}</b> <span class="pill mini">Readiness ${fmt(score, 0)}</span></div>
            <div class="small muted">Sleep ${x.sleepHrs}h • Sore ${x.sore} • Stress ${x.stress} • Energy ${x.energy}${injury}</div>
          </div>
          <div class="itemactions">
            <button class="btn danger ghost" data-act="delReady" data-id="${x.id}">Delete</button>
          </div>
        </div>
      `;
    }).join("");

    qsa("button[data-act='delReady']", list).forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.dataset.id;
        const st = S.getState();
        st.logs.readiness = st.logs.readiness.filter((t) => t.id !== id);
        S.setState(st);
        renderReadinessList();
        refreshDashboard();
      });
    });
  }

  function wireLog() {
    $("logMin").addEventListener("input", updateTrainingComputed);
    $("logRpe").addEventListener("input", updateTrainingComputed);

    $("readySleep").addEventListener("input", updateReadinessComputed);
    $("readySore").addEventListener("input", updateReadinessComputed);
    $("readyStress").addEventListener("input", updateReadinessComputed);
    $("readyEnergy").addEventListener("input", updateReadinessComputed);

    $("btnSaveTraining").addEventListener("click", () => {
      try {
        const athleteId = $("logAthlete").value;
        S.upsertTraining({
          athleteId,
          date: $("logDate").value,
          minutes: $("logMin").value,
          rpe: $("logRpe").value,
          type: $("logType").value,
          notes: $("logNotes").value,
        });
        $("logNotes").value = "";
        renderTrainingList();
        refreshDashboard();
      } catch (e) {
        alert(e.message || String(e));
      }
    });

    $("btnSaveReadiness").addEventListener("click", () => {
      try {
        const athleteId = $("readyAthlete").value;
        S.upsertReadiness({
          athleteId,
          date: $("readyDate").value,
          sleepHrs: $("readySleep").value,
          sore: $("readySore").value,
          stress: $("readyStress").value,
          energy: $("readyEnergy").value,
          injuryNote: $("readyInjury").value,
        });
        $("readyInjury").value = "";
        renderReadinessList();
        refreshDashboard();
      } catch (e) {
        alert(e.message || String(e));
      }
    });

    // Jump sync
    $("logAthlete").addEventListener("change", () => { renderTrainingList(); });
    $("readyAthlete").addEventListener("change", () => { renderReadinessList(); });
  }

  // ---------- DASHBOARD (PIQ + Risk + Heatmap) ----------
  function refreshDashboard() {
    syncAllAthleteSelects();
    const t = S.todayISO();
    if ($("dashDate") && !$("dashDate").value) $("dashDate").value = t;
    if ($("riskDate") && !$("riskDate").value) $("riskDate").value = t;
    if ($("heatStart") && !$("heatStart").value) $("heatStart").value = isoAddDays(t, -20);

    recalcPIQ();
    // don't auto-run risk; it is user-run
  }

  function applyBar(idFill, idNum, value) {
    const el = $(idFill);
    const num = $(idNum);
    const v = S.clamp(value, 0, 100);
    if (el) el.style.width = v + "%";
    setText(num, fmt(v, 0));
  }

  function recalcPIQ() {
    const athleteId = $("dashAthlete")?.value;
    const dateISO = $("dashDate")?.value;
    if (!athleteId || !dateISO) {
      setText($("piqScore"), "—");
      setText($("piqBand"), "—");
      return;
    }
    const out = calcPIQScore(athleteId, dateISO);
    setText($("piqScore"), String(out.score));
    setText($("piqBand"), out.band);

    applyBar("barReadiness","numReadiness", out.subs.readiness);
    applyBar("barTraining","numTraining", out.subs.training);
    applyBar("barRecovery","numRecovery", out.subs.recovery);
    applyBar("barNutrition","numNutrition", out.subs.nutrition);
    applyBar("barRisk","numRisk", out.subs.risk);

    setText($("piqExplain"), out.explain);
  }

  function wireDashboard() {
    $("btnRecalcScore").addEventListener("click", recalcPIQ);
    $("dashAthlete").addEventListener("change", recalcPIQ);
    $("dashDate").addEventListener("change", recalcPIQ);

    $("btnRunRisk").addEventListener("click", () => {
      const athleteId = $("riskAthlete")?.value;
      const dateISO = $("riskDate")?.value;
      if (!athleteId || !dateISO) return;
      const r = calcRiskIndex(athleteId, dateISO);

      setText($("riskSummary"), `${r.band} • Risk Index ${r.risk}/100 • ${r.flags.length ? r.flags[0] : "No major flags."}`);

      const wl = [
        `Acute (7d avg): ${r.inputs.acute}`,
        `Chronic (28d avg): ${r.inputs.chronic}`,
        `ACR: ${r.inputs.acr}`,
        `Monotony: ${r.inputs.monotony}`,
        `Strain: ${r.inputs.strain}`,
        ``,
        `Flags:`,
        ...(r.flags.length ? r.flags.map((x) => `- ${x}`) : ["- None"])
      ].join("\n");

      const rr = [
        `Readiness: ${r.inputs.readiness === null ? "—" : r.inputs.readiness}`,
        `Sleep: ${r.inputs.sleep === null ? "—" : r.inputs.sleep}`,
        `Soreness: ${r.inputs.sore === null ? "—" : r.inputs.sore}`,
        `Nutrition adherence: ${r.inputs.nutScore === null ? "—" : r.inputs.nutScore}`,
      ].join("\n");

      setText($("riskWorkload"), wl);
      setText($("riskReadiness"), rr);
    });

    $("btnHeatmap").addEventListener("click", renderHeatmap);
  }

  function metricForCell(metric, athleteId, dateISO) {
    if (metric === "load") return calcDailyLoad(athleteId, dateISO);
    if (metric === "readiness") {
      const r = S.getReadinessForDate(athleteId, dateISO);
      const s = r ? calcReadinessScore(r) : null;
      return s === null ? null : Math.round(s);
    }
    if (metric === "nutrition") {
      const n = calcNutritionAdherence(athleteId, dateISO);
      return n ? n.score : null;
    }
    if (metric === "risk") {
      const r = calcRiskIndex(athleteId, dateISO);
      return r.risk;
    }
    return null;
  }

  function cellClass(metric, value) {
    if (value === null || value === undefined) return "cell empty";
    if (metric === "load") {
      // normalize to "low/med/high" by rough bands
      if (value < 200) return "cell l1";
      if (value < 500) return "cell l2";
      if (value < 900) return "cell l3";
      return "cell l4";
    }
    // for 0-100 scales
    if (value < 40) return "cell l1";
    if (value < 60) return "cell l2";
    if (value < 80) return "cell l3";
    return "cell l4";
  }

  function renderHeatmap() {
    const table = $("heatTable");
    if (!table) return;
    const r = roster();
    if (!r.length) { table.innerHTML = `<tr><td class="muted small">Add athletes first.</td></tr>`; return; }

    const start = $("heatStart").value || isoAddDays(S.todayISO(), -20);
    const days = S.clamp($("heatDays").value, 7, 60);
    const metric = $("heatMetric").value;

    // header row
    let html = `<tr><th class="stickycol">Athlete</th>`;
    for (let i = 0; i < days; i++) {
      const d = isoAddDays(start, i);
      html += `<th class="datecol">${d.slice(5)}</th>`;
    }
    html += `</tr>`;

    r.forEach((a) => {
      html += `<tr><td class="stickycol"><b>${escapeHTML(a.name)}</b><div class="small muted">${escapeHTML(a.pos || "")}</div></td>`;
      for (let i = 0; i < days; i++) {
        const d = isoAddDays(start, i);
        const val = metricForCell(metric, a.id, d);
        const cls = cellClass(metric, val);
        const disp = val === null ? "—" : (metric === "load" ? fmt(val, 0) : fmt(val, 0));
        html += `<td class="${cls}" data-ath="${a.id}" data-date="${d}" title="Click to jump">${disp}</td>`;
      }
      html += `</tr>`;
    });

    table.innerHTML = html;

    // click to jump to Log view
    qsa("td.cell", table).forEach((td) => {
      td.addEventListener("click", () => {
        const ath = td.dataset.ath;
        const d = td.dataset.date;
        if (!ath || !d) return;
        setView("log");
        $("logAthlete").value = ath;
        $("readyAthlete").value = ath;
        $("logDate").value = d;
        $("readyDate").value = d;
        renderTrainingList();
        renderReadinessList();
      });
    });
  }

  // ---------- NUTRITION (paid + plans) ----------
  function isElite() {
    return !!S.getState().entitlements.eliteNutrition;
  }

  // Simple “unlock” mechanism for demos. Replace with Stripe/Server later.
  function validUnlock(code) {
    const c = String(code || "").trim().toUpperCase();
    // You can rotate this later; also support “ELITE-TEAM”
    return c === "PIQ-ELITE" || c === "ELITE-TEAM" || c === "UNLOCK";
  }

  function refreshNutrition() {
    syncAllAthleteSelects();
    const t = S.todayISO();
    if ($("nutDate") && !$("nutDate").value) $("nutDate").value = t;

    // Paywall gating
    const elite = isElite();
    setDisplay($("nutPaywall"), elite ? "none" : "block");
    setDisplay($("nutMain"), elite ? "block" : "none");
    setDisplay($("targetsBlock"), elite ? "block" : "none");
    $("unlockHint").textContent = elite ? "" : "Demo unlock codes: PIQ-ELITE, ELITE-TEAM, UNLOCK";

    if (elite) {
      renderNutritionList();
      updateNutritionComputed();
      loadTargetsUI();
    } else {
      // still allow athlete selects to show, but nothing else
      if ($("mealPlanOut")) $("mealPlanOut").textContent = "—";
    }
  }

  function updateNutritionComputed() {
    const athleteId = $("nutAthlete")?.value;
    const dateISO = $("nutDate")?.value;
    if (!athleteId || !dateISO) { setText($("nutComputed"), "—"); return; }

    const adh = calcNutritionAdherence(athleteId, dateISO);
    if (!adh) { setText($("nutComputed"), "—"); return; }
    setText($("nutComputed"), `${adh.score} / 100`);
    const explain = [
      `Adherence compares logged macros vs targets.`,
      `Protein: ${adh.parts.protein.detail}`,
      `Carbs:   ${adh.parts.carbs.detail}`,
      `Fat:     ${adh.parts.fat.detail}`,
      `Water:   ${adh.parts.water.detail}`,
      ``,
      `Scoring: each macro gets 0–100 based on deviation; blended (protein weighted slightly higher; hydration important).`
    ].join("\n");
    setText($("nutExplain"), explain);
  }

  function renderNutritionList() {
    const list = $("nutritionList");
    if (!list) return;
    const athleteId = $("nutAthlete")?.value;
    if (!athleteId) { list.innerHTML = `<div class="empty">Add an athlete first.</div>`; return; }
    const items = S.listNutrition(athleteId, 30);
    if (!items.length) { list.innerHTML = `<div class="empty">No nutrition logs yet.</div>`; return; }

    list.innerHTML = items.map((x) => {
      const adh = calcNutritionAdherence(athleteId, x.date);
      return `
        <div class="item">
          <div class="itemmain">
            <div><b>${escapeHTML(x.date)}</b> <span class="pill mini">Adh ${adh ? adh.score : "—"}</span></div>
            <div class="small muted">P ${x.p} • C ${x.c} • F ${x.f} • W ${x.w}${x.notes ? ` • ${escapeHTML(x.notes)}` : ""}</div>
          </div>
          <div class="itemactions">
            <button class="btn danger ghost" data-act="delNut" data-id="${x.id}">Delete</button>
          </div>
        </div>
      `;
    }).join("");

    qsa("button[data-act='delNut']", list).forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.dataset.id;
        const st = S.getState();
        st.logs.nutrition = st.logs.nutrition.filter((t) => t.id !== id);
        S.setState(st);
        renderNutritionList();
        refreshDashboard();
      });
    });
  }

  function loadTargetsUI() {
    const athleteId = $("targetAthlete")?.value || roster()[0]?.id;
    if (!athleteId) return;

    const t = S.getTargetsForAthlete(athleteId);
    $("tProt").value = t.p;
    $("tCarb").value = t.c;
    $("tFat").value = t.f;
    $("tWater").value = t.w;
  }

  function generateMealPlan(athleteId, dayType, dietPref) {
    // This is intentionally “clean + practical” and avoids pseudo-medical claims.
    // It uses macro targets and gives food block suggestions + micronutrient focus.
    const t = S.getTargetsForAthlete(athleteId);
    const st = S.getState();
    const a = st.roster.find((x) => x.id === athleteId);

    // Adjust carbs based on day type
    let carbMultiplier = 1.0;
    if (dayType === "game") carbMultiplier = 1.15;
    if (dayType === "recovery") carbMultiplier = 0.85;

    let protein = t.p;
    let carbs = Math.round(t.c * carbMultiplier);
    let fat = t.f;

    if (dietPref === "highprotein") protein = Math.round(protein * 1.1);
    if (dietPref === "lowerfat") fat = Math.round(fat * 0.85);

    // Meal split template
    const meals = [
      { name: "Breakfast", pct: 0.25 },
      { name: "Lunch", pct: 0.30 },
      { name: "Pre-training snack", pct: 0.12 },
      { name: "Post-training", pct: 0.15 },
      { name: "Dinner", pct: 0.18 },
    ];

    function split(total, pct) { return Math.round(total * pct); }

    const microFocus =
      dayType === "game"
        ? ["Sodium + fluids (hydration)", "Carb quality (rice/pasta/fruit)", "Low-fiber pre-game window"]
        : dayType === "recovery"
          ? ["Omega-3 sources (salmon/chia)", "Colorful produce (polyphenols)", "Calcium + vitamin D foods"]
          : ["Iron + B-vitamins (lean meats/beans)", "Potassium (bananas/potatoes)", "Magnesium (nuts/whole grains)"];

    const timing =
      dayType === "game"
        ? ["2–3 hrs pre: carb-forward + moderate protein", "0–60 min post: carbs + protein", "Sip fluids throughout"]
        : dayType === "recovery"
          ? ["Even protein distribution across meals", "Higher produce + hydration emphasis", "Sleep-supporting dinner routine"]
          : ["Pre: easy carbs + protein", "Post: protein + carbs within ~2 hrs", "Evening: balanced meal + hydration"];

    const examples = [
      "Breakfast: eggs + oatmeal + berries",
      "Lunch: chicken/rice bowl + veggies + olive oil",
      "Snack: Greek yogurt + banana / or turkey sandwich",
      "Post: chocolate milk + fruit / or whey + cereal",
      "Dinner: salmon/potatoes + salad + yogurt",
    ];

    const lines = [];
    lines.push(`Athlete: ${a ? a.name : athleteId}`);
    lines.push(`Day type: ${dayType} • Preference: ${dietPref}`);
    lines.push(`Targets (adjusted): Protein ${protein}g • Carbs ${carbs}g • Fat ${fat}g • Water ${t.w}oz`);
    lines.push("");
    lines.push("Meal split (approx):");
    meals.forEach((m) => {
      lines.push(
        `- ${m.name}: P${split(protein, m.pct)} C${split(carbs, m.pct)} F${split(fat, m.pct)}`
      );
    });
    lines.push("");
    lines.push("Micronutrient focus:");
    microFocus.forEach((x) => lines.push(`- ${x}`));
    lines.push("");
    lines.push("Timing priorities:");
    timing.forEach((x) => lines.push(`- ${x}`));
    lines.push("");
    lines.push("Example food ideas:");
    examples.forEach((x) => lines.push(`- ${x}`));

    return lines.join("\n");
  }

  function wireNutrition() {
    $("btnUnlock").addEventListener("click", () => {
      const code = $("unlockCode").value;
      if (validUnlock(code)) {
        S.enableEliteNutrition();
        $("unlockCode").value = "";
        refreshNutrition();
        refreshDashboard();
      } else {
        alert("Invalid unlock code.");
      }
    });

    $("btnSaveNutrition").addEventListener("click", () => {
      try {
        const athleteId = $("nutAthlete").value;
        S.upsertNutrition({
          athleteId,
          date: $("nutDate").value,
          p: $("nutProt").value,
          c: $("nutCarb").value,
          f: $("nutFat").value,
          w: $("nutWater").value,
          notes: $("nutNotes").value,
        });
        $("nutNotes").value = "";
        renderNutritionList();
        updateNutritionComputed();
        refreshDashboard();
      } catch (e) {
        alert(e.message || String(e));
      }
    });

    $("nutAthlete").addEventListener("change", () => {
      renderNutritionList();
      updateNutritionComputed();
      loadTargetsUI();
    });
    $("nutDate").addEventListener("change", updateNutritionComputed);

    $("btnSaveTargets").addEventListener("click", () => {
      try {
        const athleteId = $("targetAthlete").value;
        S.setAthleteTargets(athleteId, {
          p: $("tProt").value,
          c: $("tCarb").value,
          f: $("tFat").value,
          w: $("tWater").value,
        });
        loadTargetsUI();
        refreshNutrition();
        refreshDashboard();
      } catch (e) {
        alert(e.message || String(e));
      }
    });

    $("targetAthlete").addEventListener("change", loadTargetsUI);

    $("btnQuickMeal").addEventListener("click", () => {
      try {
        const athleteId = $("nutAthlete").value;
        const dateISO = $("nutDate").value;
        const existing = S.getNutritionForDate(athleteId, dateISO) || { p: 0, c: 0, f: 0, w: 0, notes: "" };

        S.upsertNutrition({
          athleteId,
          date: dateISO,
          p: (Number(existing.p) || 0) + (Number($("qmProt").value) || 0),
          c: (Number(existing.c) || 0) + (Number($("qmCarb").value) || 0),
          f: (Number(existing.f) || 0) + (Number($("qmFat").value) || 0),
          w: (Number(existing.w) || 0) + (Number($("qmWater").value) || 0),
          notes: existing.notes || "",
        });

        renderNutritionList();
        updateNutritionComputed();
        refreshDashboard();
      } catch (e) {
        alert(e.message || String(e));
      }
    });

    $("btnGenerateMealPlan").addEventListener("click", () => {
      const elite = isElite();
      if (!elite) { alert("Elite Nutrition is locked."); return; }
      const athleteId = $("targetAthlete").value || $("nutAthlete").value;
      if (!athleteId) return;
      const plan = generateMealPlan(athleteId, $("mealDayType").value, $("mealDiet").value);
      setText($("mealPlanOut"), plan);
    });
  }

  // ---------- PERIODIZATION ----------
  function refreshPeriodization() {
    syncAllAthleteSelects();
    const t = S.todayISO();
    if ($("perStart") && !$("perStart").value) $("perStart").value = t;

    renderPlanList();
  }

  function generatePeriodizationPlan(athleteId, startISO, weeks, goal, deloadEvery) {
    // Creates weekly targets of total load and “session suggestions”
    const baseChronic = calcChronicLoad(athleteId, startISO, 28);
    const baseWeekly = baseChronic * 7;

    let goalMult = 1.0;
    if (goal === "offseason") goalMult = 1.12;
    if (goal === "rehab") goalMult = 0.72;

    const deloadFreq = Number(deloadEvery || 4);
    const outWeeks = [];

    for (let w = 1; w <= weeks; w++) {
      const isDeload = (w % deloadFreq === 0);
      const weekLoad = Math.round(baseWeekly * goalMult * (isDeload ? 0.7 : 1.05));
      const intensityNote = isDeload ? "Deload (reduce volume, keep quality)" : "Build (progress volume/intensity)";

      // session template (7 days)
      // Keep it simple: 4 main sessions + 2 light + 1 off; adjust by goal
      const sessions = [
        { day: "Mon", label: "Main", minutes: goal === "rehab" ? 35 : 60, rpe: isDeload ? 5 : 7 },
        { day: "Tue", label: "Light", minutes: goal === "rehab" ? 25 : 40, rpe: isDeload ? 3 : 4 },
        { day: "Wed", label: "Main", minutes: goal === "rehab" ? 35 : 60, rpe: isDeload ? 5 : 7 },
        { day: "Thu", label: "Off", minutes: 0, rpe: 0 },
        { day: "Fri", label: "Main", minutes: goal === "rehab" ? 30 : 55, rpe: isDeload ? 5 : 7 },
        { day: "Sat", label: "Main/Skills", minutes: goal === "rehab" ? 30 : 50, rpe: isDeload ? 4 : 6 },
        { day: "Sun", label: "Recovery", minutes: 25, rpe: 2 },
      ];

      const planned = sessions.reduce((acc, s) => acc + (s.minutes * s.rpe), 0);

      outWeeks.push({
        week: w,
        startISO: isoAddDays(startISO, (w - 1) * 7),
        isDeload,
        targetWeeklyLoad: weekLoad,
        templatePlannedLoad: planned,
        note: intensityNote,
        sessions
      });
    }

    return outWeeks;
  }

  function renderPlanList() {
    const list = $("planList");
    if (!list) return;
    const athleteId = $("perAthlete")?.value;
    if (!athleteId) { list.innerHTML = `<div class="empty">Add an athlete first.</div>`; return; }

    const plans = S.listPlans(athleteId, 5);
    if (!plans.length) {
      list.innerHTML = `<div class="empty">No plans yet. Generate one above.</div>`;
      return;
    }

    list.innerHTML = plans.map((p) => {
      return `
        <div class="item">
          <div class="itemmain">
            <div><b>Plan</b> • start ${escapeHTML(p.startISO)} • ${p.weeks} weeks • goal ${escapeHTML(p.goal)} • deload every ${p.deloadEvery}</div>
            <div class="small muted">Weeks: ${p.weeksData.length} • Created ${escapeHTML(p.createdAt.slice(0,10))}</div>
          </div>
          <div class="itemactions">
            <button class="btn ghost" data-act="viewPlan" data-id="${p.id}">View</button>
          </div>
        </div>
      `;
    }).join("");

    qsa("button[data-act='viewPlan']", list).forEach((b) => {
      b.addEventListener("click", () => {
        const planId = b.dataset.id;
        const st = S.getState();
        const plan = st.plans.periodization.find((x) => x.id === planId);
        if (!plan) return;
        const detail = plan.weeksData.map((w) => {
          const s = w.sessions.map((x) => `${x.day}:${x.minutes}×${x.rpe}`).join("  ");
          return `W${w.week} (${w.startISO}) • target ${w.targetWeeklyLoad} • template ${w.templatePlannedLoad} • ${w.note}\n${s}`;
        }).join("\n\n");
        alert(detail);
      });
    });
  }

  function compareWeekToPlan(athleteId, weekStartISO) {
    const plan = S.getLatestPlan(athleteId);
    if (!plan) return { ok: false, msg: "No plan found for athlete." };

    const wk = plan.weeksData.find((x) => x.startISO === weekStartISO);
    if (!wk) return { ok: false, msg: "Week not found in latest plan (pick a week start that matches)." };

    // Actual week load: sum of 7 days from weekStartISO
    let actual = 0;
    for (let i = 0; i < 7; i++) actual += calcDailyLoad(athleteId, isoAddDays(weekStartISO, i));
    const planned = wk.templatePlannedLoad;

    const diff = actual - planned;
    const pct = planned > 0 ? (actual / planned) : 0;

    let band = "ON TARGET";
    if (pct >= 1.25) band = "OVER";
    else if (pct <= 0.75) band = "UNDER";

    return {
      ok: true,
      planned,
      actual: Math.round(actual),
      diff: Math.round(diff),
      pct: Number(pct.toFixed(2)),
      band,
      wk
    };
  }

  function wirePeriodization() {
    $("btnGeneratePlan").addEventListener("click", () => {
      try {
        const athleteId = $("perAthlete").value;
        const startISO = $("perStart").value;
        const weeks = Number($("perWeeks").value) || 8;
        const goal = $("perGoal").value;
        const deloadEvery = Number($("perDeload").value) || 4;

        const weeksData = generatePeriodizationPlan(athleteId, startISO, weeks, goal, deloadEvery);
        S.savePeriodizationPlan({ athleteId, startISO, weeks, goal, deloadEvery, weeksData });
        renderPlanList();
        // default monitor week to plan start
        $("monAthlete").value = athleteId;
        $("monWeek").value = startISO;
      } catch (e) {
        alert(e.message || String(e));
      }
    });

    $("btnCompareWeek").addEventListener("click", () => {
      const athleteId = $("monAthlete").value;
      const weekStart = $("monWeek").value;
      const res = compareWeekToPlan(athleteId, weekStart);
      if (!res.ok) {
        setText($("compareSummary"), res.msg);
        setText($("compareDetail"), "—");
        return;
      }
      setText($("compareSummary"), `${res.band} • Planned ${res.planned} vs Actual ${res.actual} (x${res.pct})`);
      setText($("compareDetail"), [
        `Week: ${res.wk.startISO}`,
        `Plan note: ${res.wk.note}`,
        `Diff: ${res.diff}`,
        ``,
        `Session template:`,
        ...res.wk.sessions.map((s) => `- ${s.day} ${s.label}: ${s.minutes} min @ sRPE ${s.rpe} => load ${s.minutes * s.rpe}`)
      ].join("\n"));
    });
  }

  // ---------- SETTINGS + Import/Export ----------
  function refreshSettings() {
    const st = S.getState();
    setText($("appInfo"), `Store=${S.LS_KEY}\nVersion=${st.version}\nUpdated=${st.updatedAt}`);
    setText($("eliteState"), `Elite Nutrition: ${st.entitlements.eliteNutrition ? "ENABLED" : "DISABLED"}`);
  }

  function wireSettings() {
    $("btnWipe").addEventListener("click", () => {
      if (!confirm("Wipe ALL local data on this device?")) return;
      S.wipe();
      location.reload();
    });

    $("btnEnableElite").addEventListener("click", () => {
      S.enableEliteNutrition();
      refreshNutrition();
      refreshSettings();
    });

    $("btnDisableElite").addEventListener("click", () => {
      S.disableEliteNutrition();
      refreshNutrition();
      refreshSettings();
    });
  }

  function wireImportExport() {
    $("btnExport").addEventListener("click", () => {
      const data = S.getState();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `performanceiq_export_${S.todayISO()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    $("fileImport").addEventListener("change", async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed || parsed.version !== 2) throw new Error("Invalid import file (expected version 2).");
        S.setState(parsed);
        alert("Import successful.");
        location.reload();
      } catch (e) {
        alert("Import failed: " + (e.message || String(e)));
      } finally {
        ev.target.value = "";
      }
    });

    $("btnSeed").addEventListener("click", () => {
      seedDemo();
    });
  }

  // ---------- Seed demo data ----------
  function seedDemo() {
    const st = S.getState();
    if (st.roster.length) {
      if (!confirm("This will add demo logs to your existing athletes. Continue?")) return;
    }
    // Ensure at least 3 athletes
    if (!st.roster.length) {
      S.addAthlete("Jordan Smith", "PG", 70, 155);
      S.addAthlete("Avery Johnson", "SG", 72, 165);
      S.addAthlete("Taylor Reed", "SF", 74, 180);
    }

    const r = roster();
    const base = S.todayISO();
    // 21 days of plausible data
    for (let i = 0; i < 21; i++) {
      const d = isoAddDays(base, -i);
      r.forEach((a, idx) => {
        const mins = 45 + ((i + idx) % 4) * 15; // 45..90
        const rpe = 4 + ((i + idx) % 5);        // 4..8
        const type = (i % 6 === 0) ? "game" : ((i % 3 === 0) ? "lift" : "practice");
        if (i % 7 !== 0) {
          S.upsertTraining({ athleteId: a.id, date: d, minutes: mins, rpe, type, notes: "" });
        }
        if (i % 2 === 0) {
          S.upsertReadiness({
            athleteId: a.id, date: d,
            sleepHrs: 6.5 + ((idx + i) % 5) * 0.5,
            sore: ((i + idx) % 7),
            stress: ((i + 2 * idx) % 6),
            energy: 5 + ((i + idx) % 5),
            injuryNote: (i === 10 && idx === 1) ? "ankle tightness" : ""
          });
        }
        if (isElite() || i % 3 === 0) {
          const t = S.getTargetsForAthlete(a.id);
          S.upsertNutrition({
            athleteId: a.id, date: d,
            p: Math.round(t.p * (0.85 + ((i + idx) % 6) * 0.03)),
            c: Math.round(t.c * (0.75 + ((i + idx) % 7) * 0.04)),
            f: Math.round(t.f * (0.8 + ((i + idx) % 5) * 0.05)),
            w: Math.round(t.w * (0.7 + ((i + idx) % 6) * 0.05)),
            notes: ""
          });
        }
      });
    }

    refreshTeam();
    refreshLog();
    refreshDashboard();
    refreshNutrition();
    alert("Seed complete.");
  }

  // ---------- Utilities ----------
  function escapeHTML(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------- App boot ----------
  function boot() {
    ensureRoster();
    wireNav();
    wireTeam();
    wireLog();
    wireDashboard();
    wireNutrition();
    wirePeriodization();
    wireSettings();
    wireImportExport();

    // set default dates
    const t = S.todayISO();
    if ($("dashDate")) $("dashDate").value = t;
    if ($("riskDate")) $("riskDate").value = t;
    if ($("logDate")) $("logDate").value = t;
    if ($("readyDate")) $("readyDate").value = t;
    if ($("nutDate")) $("nutDate").value = t;
    if ($("perStart")) $("perStart").value = t;
    if ($("heatStart")) $("heatStart").value = isoAddDays(t, -20);

    refreshTeam();
    refreshDashboard();
    refreshLog();
    refreshNutrition();
    refreshPeriodization();
    refreshSettings();

    setView("dashboard");
    endSplash();
  }

  window.PIQ_App = { boot };
  boot();
})();
