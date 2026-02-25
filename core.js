(function () {
  "use strict";

  const KEY = "piqData_v2";
  const DEFAULT_TEAM = "Default";

  // ---------- Storage ----------
  const store = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const s = raw ? JSON.parse(raw) : {};
      return normalize(s);
    } catch {
      return normalize({});
    }
  }

  function normalize(s) {
    s.team = s.team || { name: DEFAULT_TEAM };
    s.role = s.role || "coach";

    s.athletes = Array.isArray(s.athletes) ? s.athletes : [];
    s.logs = Array.isArray(s.logs) ? s.logs : [];               // {athlete,dateISO,min,rpe,load}
    s.readiness = Array.isArray(s.readiness) ? s.readiness : []; // {athlete,dateISO,sleep,sore,stress,energy,score}
    s.nutrition = Array.isArray(s.nutrition) ? s.nutrition : []; // {athlete,dateISO,p,c,f,adherence}
    s.targets = s.targets && typeof s.targets === "object" ? s.targets : {}; // targets[athlete]={p,c,f,w}
    s.periodization = s.periodization && typeof s.periodization === "object" ? s.periodization : {}; // per athlete: weeks[]
    s.piqWeights = s.piqWeights || { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 };
    return s;
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(store));
  }

  // ---------- DOM helpers ----------
  const $ = (id) => document.getElementById(id);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const todayISO = () => new Date().toISOString().slice(0, 10);
  const safeISO = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : null);

  function addDaysISO(iso, d) {
    const base = safeISO(iso) || todayISO();
    const ms = Date.parse(base);
    return new Date(ms + d * 86400000).toISOString().slice(0, 10);
  }

  function clamp(n, a, b) {
    n = Number(n);
    if (!Number.isFinite(n)) n = a;
    return Math.min(Math.max(n, a), b);
  }

  function toNum(v, f = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : f;
  }

  function bandFromScore(x) {
    if (x >= 90) return "Elite";
    if (x >= 80) return "High";
    if (x >= 70) return "Solid";
    if (x >= 55) return "At-Risk";
    return "Critical";
  }

  // ---------- Role gating ----------
  function applyRoleNav() {
    const role = store.role || "coach";
    $("rolePill").textContent = `Role: ${role[0].toUpperCase() + role.slice(1)}`;
    $("teamPill").textContent = `Team: ${store.team?.name || DEFAULT_TEAM}`;

    qa("#nav button[data-role]").forEach((btn) => {
      const required = btn.getAttribute("data-role");
      btn.style.display = required && required !== role ? "none" : "";
    });
  }

  // ---------- Athletes ----------
  function addAthlete() {
    const name = ($("athleteName")?.value || "").trim();
    if (!name) return alert("Enter athlete name.");
    if (store.athletes.includes(name)) return alert("Athlete already exists.");

    store.athletes.push(name);

    // set default targets for athlete
    if (!store.targets[name]) store.targets[name] = { p: 160, c: 240, f: 70, w: 80 };

    save();
    $("athleteName").value = "";
    refreshAthleteDropdowns();
    renderRoster();
    renderDashboard();
  }

  function refreshAthleteDropdowns() {
    const ids = ["dashAthlete", "logAthlete", "readyAthlete", "nutAthlete", "targetAthlete", "workoutAthlete", "perAthlete"];
    ids.forEach((id) => {
      const el = $(id);
      if (!el) return;
      const cur = el.value;
      el.innerHTML = "";
      store.athletes.forEach((a) => {
        const o = document.createElement("option");
        o.value = a;
        o.textContent = a;
        el.appendChild(o);
      });
      if (store.athletes.length) el.value = store.athletes.includes(cur) ? cur : store.athletes[0];
    });
  }

  function renderRoster() {
    const box = $("roster");
    if (!box) return;
    if (!store.athletes.length) {
      box.innerHTML = `<div class="muted small">No athletes yet.</div>`;
      return;
    }
    box.innerHTML = store.athletes
      .map(
        (a) => `
        <div class="item">
          <div>
            <b>${a}</b>
            <div class="muted small">Targets: P${store.targets?.[a]?.p ?? 160} C${store.targets?.[a]?.c ?? 240} F${store.targets?.[a]?.f ?? 70}</div>
          </div>
          <button class="btn danger" data-del="${a}">Remove</button>
        </div>`
      )
      .join("");

    qa("[data-del]", box).forEach((btn) => {
      btn.onclick = () => {
        const a = btn.getAttribute("data-del");
        if (!a) return;
        if (!confirm(`Remove ${a} and all their data?`)) return;

        store.athletes = store.athletes.filter((x) => x !== a);
        store.logs = store.logs.filter((x) => x.athlete !== a);
        store.readiness = store.readiness.filter((x) => x.athlete !== a);
        store.nutrition = store.nutrition.filter((x) => x.athlete !== a);
        delete store.targets[a];
        delete store.periodization[a];

        save();
        refreshAthleteDropdowns();
        renderRoster();
        renderDashboard();
        renderLogs();
        renderReadiness();
        renderNutrition();
        renderPeriodization();
      };
    });
  }

  // ---------- Training ----------
  function sessionLoad(min, rpe) {
    return clamp(Math.round(toNum(min) * toNum(rpe)), 0, 6000);
  }

  function upsertSession(athlete, dateISO, min, rpe) {
    store.logs = store.logs.filter((x) => !(x.athlete === athlete && x.dateISO === dateISO));
    store.logs.push({ athlete, dateISO, min, rpe, load: sessionLoad(min, rpe) });
    store.logs.sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
    save();
  }

  function renderLogs() {
    const list = $("logList");
    if (!list) return;

    const athlete = $("logAthlete")?.value || store.athletes[0];
    if (!athlete) {
      list.innerHTML = `<div class="muted small">Add athletes first.</div>`;
      return;
    }

    const rows = store.logs.filter((x) => x.athlete === athlete).slice(0, 20);
    list.innerHTML = rows.length
      ? rows
          .map(
            (r) => `
            <div class="item">
              <div>
                <b>${r.dateISO}</b> • ${r.min} min @ RPE ${r.rpe}
                <div class="muted small">Load: <b>${r.load}</b></div>
              </div>
              <button class="btn danger" data-del-log="${r.athlete}|${r.dateISO}">Delete</button>
            </div>`
          )
          .join("")
      : `<div class="muted small">No sessions logged.</div>`;

    qa("[data-del-log]", list).forEach((btn) => {
      btn.onclick = () => {
        const key = btn.getAttribute("data-del-log");
        const [a, d] = String(key).split("|");
        store.logs = store.logs.filter((x) => !(x.athlete === a && x.dateISO === d));
        save();
        renderLogs();
        renderDashboard();
      };
    });
  }

  function updateTrainingComputed() {
    const min = clamp(toNum($("logMinutes")?.value, 0), 0, 600);
    const rpe = clamp(toNum($("logRpe")?.value, 0), 0, 10);
    $("logComputed").textContent = `Load: ${sessionLoad(min, rpe)}`;
  }

  // ---------- Readiness ----------
  function calcReadinessScore(row) {
    const sleep = clamp(toNum(row.sleep, 0), 0, 16);
    const sore = clamp(toNum(row.sore, 0), 0, 10);
    const stress = clamp(toNum(row.stress, 0), 0, 10);
    const energy = clamp(toNum(row.energy, 0), 0, 10);

    const sleepPenalty = clamp((8 - sleep) * 7, 0, 35);
    const sorePenalty = sore * 4;
    const stressPenalty = stress * 3;
    const energyPenalty = clamp((10 - energy) * 4, 0, 40);

    const score = 100 - (sleepPenalty + sorePenalty + stressPenalty + energyPenalty) * 0.5;
    return clamp(Math.round(score), 0, 100);
  }

  function upsertReadinessRow(athlete, dateISO, sleep, sore, stress, energy) {
    store.readiness = store.readiness.filter((x) => !(x.athlete === athlete && x.dateISO === dateISO));
    const score = calcReadinessScore({ sleep, sore, stress, energy });
    store.readiness.push({ athlete, dateISO, sleep, sore, stress, energy, score });
    store.readiness.sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
    save();
  }

  function renderReadiness() {
    const list = $("readyList");
    if (!list) return;

    const athlete = $("readyAthlete")?.value || store.athletes[0];
    if (!athlete) {
      list.innerHTML = `<div class="muted small">Add athletes first.</div>`;
      return;
    }

    const rows = store.readiness.filter((x) => x.athlete === athlete).slice(0, 14);
    list.innerHTML = rows.length
      ? rows
          .map(
            (r) => `
            <div class="item">
              <div>
                <b>${r.dateISO}</b> • Readiness <b>${r.score}</b>
                <div class="muted small">Sleep ${r.sleep}h • Sore ${r.sore} • Stress ${r.stress} • Energy ${r.energy}</div>
              </div>
              <button class="btn danger" data-del-ready="${r.athlete}|${r.dateISO}">Delete</button>
            </div>`
          )
          .join("")
      : `<div class="muted small">No readiness check-ins yet.</div>`;

    qa("[data-del-ready]", list).forEach((btn) => {
      btn.onclick = () => {
        const key = btn.getAttribute("data-del-ready");
        const [a, d] = String(key).split("|");
        store.readiness = store.readiness.filter((x) => !(x.athlete === a && x.dateISO === d));
        save();
        renderReadiness();
        renderDashboard();
      };
    });
  }

  function updateReadinessComputed() {
    const sleep = clamp(toNum($("readySleep")?.value, 8), 0, 16);
    const sore = clamp(toNum($("readySore")?.value, 3), 0, 10);
    const stress = clamp(toNum($("readyStress")?.value, 3), 0, 10);
    const energy = clamp(toNum($("readyEnergy")?.value, 7), 0, 10);
    $("readyComputed").textContent = String(calcReadinessScore({ sleep, sore, stress, energy }));
  }

  // ---------- Nutrition ----------
  function getTarget(athlete) {
    const t = store.targets?.[athlete];
    return t || (store.targets[athlete] = { p: 160, c: 240, f: 70, w: 80 });
  }

  function calcNutritionAdherence(total, target) {
    if (!target) return 50;
    const p = Math.abs(toNum(total.p) - toNum(target.p)) / Math.max(1, toNum(target.p));
    const c = Math.abs(toNum(total.c) - toNum(target.c)) / Math.max(1, toNum(target.c));
    const f = Math.abs(toNum(total.f) - toNum(target.f)) / Math.max(1, toNum(target.f));
    const dev = (clamp(p, 0, 1) + clamp(c, 0, 1) + clamp(f, 0, 1)) / 3;
    return clamp(Math.round(100 - dev * 100), 0, 100);
  }

  function upsertNutrition(athlete, dateISO, p, c, f) {
    store.nutrition = store.nutrition.filter((x) => !(x.athlete === athlete && x.dateISO === dateISO));
    const t = getTarget(athlete);
    const adherence = calcNutritionAdherence({ p, c, f }, t);
    store.nutrition.push({ athlete, dateISO, p, c, f, adherence });
    store.nutrition.sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
    save();
  }

  function renderNutrition() {
    const list = $("nutList");
    if (!list) return;

    const athlete = $("nutAthlete")?.value || store.athletes[0];
    if (!athlete) {
      list.innerHTML = `<div class="muted small">Add athletes first.</div>`;
      return;
    }

    const rows = store.nutrition.filter((x) => x.athlete === athlete).slice(0, 14);
    list.innerHTML = rows.length
      ? rows
          .map(
            (r) => `
            <div class="item">
              <div>
                <b>${r.dateISO}</b> • Adherence <b>${r.adherence}</b>
                <div class="muted small">P ${r.p} • C ${r.c} • F ${r.f}</div>
              </div>
              <button class="btn danger" data-del-nut="${r.athlete}|${r.dateISO}">Delete</button>
            </div>`
          )
          .join("")
      : `<div class="muted small">No nutrition entries yet.</div>`;

    qa("[data-del-nut]", list).forEach((btn) => {
      btn.onclick = () => {
        const key = btn.getAttribute("data-del-nut");
        const [a, d] = String(key).split("|");
        store.nutrition = store.nutrition.filter((x) => !(x.athlete === a && x.dateISO === d));
        save();
        renderNutrition();
        renderDashboard();
      };
    });
  }

  function renderNutritionComputed() {
    const athlete = $("nutAthlete")?.value || store.athletes[0];
    if (!athlete) return;
    const t = getTarget(athlete);
    const p = toNum($("protein")?.value, 0);
    const c = toNum($("carbs")?.value, 0);
    const f = toNum($("fat")?.value, 0);
    const score = calcNutritionAdherence({ p, c, f }, t);
    $("nutAdherence").textContent = `${score} (Targets P${t.p} C${t.c} F${t.f})`;
    $("nutExplain").textContent =
      `Adherence compares totals vs targets.\n` +
      `Deviation averaged across P/C/F.\n` +
      `Score = 100 - avgDeviation% (capped).`;
  }

  function syncTargetsUI() {
    const athlete = $("targetAthlete")?.value || store.athletes[0];
    if (!athlete) return;
    const t = getTarget(athlete);
    $("tP").value = t.p;
    $("tC").value = t.c;
    $("tF").value = t.f;
    $("tW").value = t.w;
  }

  // ---------- Risk Engine ----------
  function dailyLoads(trainingSessions, startISO, days) {
    const map = {};
    for (let i = 0; i < days; i++) map[addDaysISO(startISO, i)] = 0;
    (trainingSessions || []).forEach((s) => {
      const d = safeISO(s.dateISO);
      if (!d || !(d in map)) return;
      map[d] += toNum(s.load, 0);
    });
    return map;
  }

  function sumLoads(trainingSessions, fromISO, toISOInclusive) {
    const f = safeISO(fromISO);
    const t = safeISO(toISOInclusive);
    if (!f || !t) return 0;
    return (trainingSessions || [])
      .filter((s) => s && safeISO(s.dateISO) && s.dateISO >= f && s.dateISO <= t)
      .reduce((acc, s) => acc + toNum(s.load, 0), 0);
  }

  function workloadRiskIndex(trainingSessions, asOfISO) {
    const asOf = safeISO(asOfISO) || todayISO();
    const acuteFrom = addDaysISO(asOf, -6);
    const chronicFrom = addDaysISO(asOf, -27);

    const acute = sumLoads(trainingSessions, acuteFrom, asOf); // 7d sum
    const chronicTotal = sumLoads(trainingSessions, chronicFrom, asOf); // 28d sum
    const chronicAvg7 = (chronicTotal / 28) * 7;

    const acwr = chronicAvg7 > 0 ? acute / chronicAvg7 : null;

    // monotony/strain from last 7 daily loads
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

  function runRiskDetection(athlete, dateISO) {
    const asOf = safeISO(dateISO) || todayISO();
    const training = store.logs.filter((x) => x.athlete === athlete);
    const w = workloadRiskIndex(training, asOf);

    const rRow =
      store.readiness.find((r) => r.athlete === athlete && r.dateISO === asOf) ||
      store.readiness.find((r) => r.athlete === athlete) ||
      null;

    const nRow =
      store.nutrition.find((n) => n.athlete === athlete && n.dateISO === asOf) ||
      store.nutrition.find((n) => n.athlete === athlete) ||
      null;

    const rScore = rRow ? toNum(rRow.score, 60) : 60;
    const nScore = nRow ? toNum(nRow.adherence, 50) : 50;

    const flags = [];
    if (w.acwr !== null && w.acwr > 1.5) flags.push("High ACWR spike");
    if (w.monotony >= 2.5) flags.push("High monotony");
    if (w.strain >= 12000) flags.push("High strain");
    if (rScore < 55) flags.push("Low readiness");
    if (rRow && toNum(rRow.sleep) < 6.5) flags.push("Sleep low");
    if (rRow && toNum(rRow.sore) >= 7) flags.push("High soreness");
    if (nScore < 60) flags.push("Nutrition adherence low");

    const index = clamp(Math.round((w.index * 0.65) + ((100 - rScore) * 0.20) + ((100 - nScore) * 0.15)), 0, 100);

    let headline = "OK";
    if (index >= 80) headline = "HIGH RISK";
    else if (index >= 60) headline = "ELEVATED";
    else if (index >= 40) headline = "WATCH";

    return { index, headline, flags, workload: w, readinessScore: rScore, nutritionScore: nScore };
  }

  // ---------- PIQ Score Engine ----------
  function trainingQualityScore(athlete, dateISO) {
    // inverse of workload risk index (stability rewarded)
    const asOf = safeISO(dateISO) || todayISO();
    const training = store.logs.filter((x) => x.athlete === athlete);
    const w = workloadRiskIndex(training, asOf);
    return clamp(100 - w.index, 0, 100);
  }

  function recoveryScoreFromReadiness(rRow) {
    if (!rRow) return 60;
    const sleep = clamp(toNum(rRow.sleep, 0), 0, 16);
    const sore = clamp(toNum(rRow.sore, 0), 0, 10);
    const stress = clamp(toNum(rRow.stress, 0), 0, 10);

    const sleepScore = clamp((sleep / 9) * 100, 0, 100);
    const soreScore = 100 - sore * 9;
    const stressScore = 100 - stress * 8;

    return clamp(Math.round(sleepScore * 0.45 + soreScore * 0.30 + stressScore * 0.25), 0, 100);
  }

  function calcPIQ(athlete, dateISO) {
    const asOf = safeISO(dateISO) || todayISO();

    const rRow =
      store.readiness.find((r) => r.athlete === athlete && r.dateISO === asOf) ||
      store.readiness.find((r) => r.athlete === athlete) ||
      null;

    const nRow =
      store.nutrition.find((n) => n.athlete === athlete && n.dateISO === asOf) ||
      store.nutrition.find((n) => n.athlete === athlete) ||
      null;

    const readiness = rRow ? toNum(rRow.score, 60) : 60;
    const nutrition = nRow ? toNum(nRow.adherence, 50) : 50;
    const training = trainingQualityScore(athlete, asOf);
    const recovery = recoveryScoreFromReadiness(rRow);

    const risk = runRiskDetection(athlete, asOf);
    const riskScore = clamp(100 - risk.index, 0, 100);

    // weights
    const w = store.piqWeights || { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 };
    const totalW = (w.readiness + w.training + w.recovery + w.nutrition + w.risk) || 100;

    const final = Math.round(
      (readiness * w.readiness +
        training * w.training +
        recovery * w.recovery +
        nutrition * w.nutrition +
        riskScore * w.risk) / totalW
    );

    return {
      final: clamp(final, 0, 100),
      band: bandFromScore(final),
      subs: { readiness, training, recovery, nutrition, risk: riskScore },
      meta: { risk }
    };
  }

  // ---------- Dashboard render ----------
  function setBar(barId, numId, v) {
    const vv = clamp(toNum(v, 0), 0, 100);
    const bar = $(barId);
    if (bar) bar.style.width = `${vv}%`;
    const num = $(numId);
    if (num) num.textContent = String(vv);
  }

  function renderTrend(athlete, asOf) {
    const out = $("trendOut");
    if (!out) return;

    const lines = [];
    lines.push(`Date       Load   Readiness  Nutrition  PIQ`);
    lines.push(`----------------------------------------------`);

    for (let i = 6; i >= 0; i--) {
      const d = addDaysISO(asOf, -i);

      const load = store.logs
        .filter((x) => x.athlete === athlete && x.dateISO === d)
        .reduce((a, b) => a + toNum(b.load, 0), 0);

      const rRow = store.readiness.find((x) => x.athlete === athlete && x.dateISO === d);
      const nRow = store.nutrition.find((x) => x.athlete === athlete && x.dateISO === d);

      const r = rRow ? rRow.score : 0;
      const n = nRow ? nRow.adherence : 0;

      const piq = calcPIQ(athlete, d).final;

      lines.push(`${d}  ${String(load).padStart(4)}   ${String(r).padStart(3)}       ${String(n).padStart(3)}      ${String(piq).padStart(3)}`);
    }

    out.textContent = lines.join("\n");
  }

  function renderDashboard() {
    const athlete = $("dashAthlete")?.value || store.athletes[0];
    const asOf = safeISO($("dashDate")?.value) || todayISO();

    if (!store.athletes.length) {
      $("piqScore").textContent = "—";
      $("piqBand").textContent = "Add athletes (Team)";
      $("riskHeadline").textContent = "—";
      $("riskWorkload").textContent = "";
      $("riskFlags").textContent = "";
      $("trendOut").textContent = "";
      return;
    }

    const r = calcPIQ(athlete, asOf);

    $("piqScore").textContent = String(r.final);
    $("piqBand").textContent = `${r.band} • ${asOf}`;

    setBar("barReadiness", "numReadiness", r.subs.readiness);
    setBar("barTraining", "numTraining", r.subs.training);
    setBar("barRecovery", "numRecovery", r.subs.recovery);
    setBar("barNutrition", "numNutrition", r.subs.nutrition);
    setBar("barRisk", "numRisk", r.subs.risk);

    const w = r.meta.risk.workload;
    $("riskHeadline").textContent = `${r.meta.risk.headline} • Risk ${r.meta.risk.index}/100 • (Lower is better)`;
    $("riskWorkload").textContent =
      `Acute (7d): ${w.acute}\n` +
      `Chronic avg(7d-eq): ${w.chronicAvg7}\n` +
      `ACWR: ${w.acwr === null ? "—" : w.acwr}\n` +
      `Monotony: ${w.monotony}\n` +
      `Strain: ${w.strain}\n` +
      `Workload risk index: ${w.index}`;

    $("riskFlags").textContent =
      `Readiness: ${r.meta.risk.readinessScore}\n` +
      `Nutrition: ${r.meta.risk.nutritionScore}\n\n` +
      `Flags:\n- ${r.meta.risk.flags.length ? r.meta.risk.flags.join("\n- ") : "None"}`;

    $("piqExplain").textContent =
      `PIQ = weighted composite (0–100)\n\n` +
      `Readiness: ${r.subs.readiness}\n` +
      `Training:  ${r.subs.training} (inverse workload risk)\n` +
      `Recovery:  ${r.subs.recovery}\n` +
      `Nutrition: ${r.subs.nutrition}\n` +
      `Risk:      ${r.subs.risk} (inverse risk index)\n\n` +
      `Workload meta:\n` +
      `Acute: ${w.acute}\nChronic(avg7): ${w.chronicAvg7}\nACWR: ${w.acwr === null ? "—" : w.acwr}\nMonotony: ${w.monotony}\nStrain: ${w.strain}\nRiskIndex: ${w.index}`;

    renderTrend(athlete, asOf);
  }

  // ---------- Workouts (interactive, writes to log) ----------
  function workoutTemplate(mode) {
    // Basketball-friendly weekly structure
    // Standard: 4 sessions
    // Advanced: 5–6 sessions with higher density
    if (mode === "advanced") {
      return [
        { day: "Mon", label: "Strength + Skill", minutes: 75, rpe: 7 },
        { day: "Tue", label: "Conditioning + Skill", minutes: 70, rpe: 8 },
        { day: "Wed", label: "Recovery + Mobility", minutes: 40, rpe: 4 },
        { day: "Thu", label: "Strength + Skill", minutes: 75, rpe: 8 },
        { day: "Fri", label: "Skill + Game-speed", minutes: 65, rpe: 8 },
        { day: "Sat", label: "Scrimmage/Live", minutes: 60, rpe: 8 },
        { day: "Sun", label: "Off / Walk", minutes: 20, rpe: 2 }
      ];
    }
    return [
      { day: "Mon", label: "Strength + Skill", minutes: 60, rpe: 6 },
      { day: "Tue", label: "Skill + Conditioning", minutes: 60, rpe: 7 },
      { day: "Thu", label: "Strength + Skill", minutes: 60, rpe: 7 },
      { day: "Sat", label: "Game-speed / Live", minutes: 55, rpe: 7 }
    ];
  }

  function buildWorkout() {
    const athlete = $("workoutAthlete")?.value || store.athletes[0];
    const mode = $("mode")?.value || "standard";
    if (!athlete) return alert("Add athletes first.");

    const week = workoutTemplate(mode);
    const out = $("workoutOutput");
    const html = [];

    html.push(`Mode: ${mode.toUpperCase()}\n`);

    week.forEach((w) => {
      const load = sessionLoad(w.minutes, w.rpe);
      html.push(
        `${w.day} — ${w.label}\n` +
        `  ${w.minutes} min @ RPE ${w.rpe} (Load ${load})\n` +
        `  [Add to Training Log]\n`
      );
    });

    // render as buttons for write-back
    out.innerHTML = week
      .map((w, idx) => {
        const load = sessionLoad(w.minutes, w.rpe);
        return `
          <div class="item">
            <div>
              <b>${w.day}</b> • ${w.label}
              <div class="muted small">${w.minutes} min @ RPE ${w.rpe} • Load <b>${load}</b></div>
            </div>
            <button class="btn" data-add-workout="${idx}">Add to Log</button>
          </div>
        `;
      })
      .join("");

    qa("[data-add-workout]", out).forEach((btn) => {
      btn.onclick = () => {
        const idx = Number(btn.getAttribute("data-add-workout"));
        const w = week[idx];
        const date = todayISO(); // quick-add as today; periodization plan uses dates
        upsertSession(athlete, date, w.minutes, w.rpe);
        renderLogs();
        renderDashboard();
        alert(`Added ${w.day} session to Log (date ${date}).`);
      };
    });
  }

  // ---------- Periodization ----------
  function generatePlan() {
    const athlete = $("perAthlete")?.value || store.athletes[0];
    if (!athlete) return alert("Add athletes first.");

    const start = safeISO($("perStart")?.value) || todayISO();
    const deloadEvery = clamp(toNum($("perDeload")?.value, 4), 3, 6);

    const weeks = [];
    const base = 2000;
    for (let i = 1; i <= 8; i++) {
      const deload = i % deloadEvery === 0;
      const wave = 1 + (i - 1) * 0.05;
      const targetLoad = Math.round(base * wave * (deload ? 0.72 : 1.0));
      weeks.push({ week: i, weekStartISO: addDaysISO(start, (i - 1) * 7), deload, targetLoad });
    }

    store.periodization[athlete] = { athlete, startISO: start, deloadEvery, weeks };
    save();
    renderPeriodization();
    alert("Generated plan.");
  }

  function renderPeriodization() {
    const out = $("planOutput");
    if (!out) return;

    const athlete = $("perAthlete")?.value || store.athletes[0];
    if (!athlete) {
      out.innerHTML = `<div class="muted small">Add athletes first.</div>`;
      return;
    }

    const plan = store.periodization[athlete];
    if (!plan?.weeks?.length) {
      out.innerHTML = `<div class="muted small">No plan yet. Generate one above.</div>`;
      return;
    }

    out.innerHTML = plan.weeks
      .map((w) => {
        return `
          <div class="item">
            <div>
              <b>Week ${w.week}</b> • ${w.weekStartISO} ${w.deload ? `<span class="muted">• DELOAD</span>` : ""}
              <div class="muted small">Target load: <b>${w.targetLoad}</b></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // ---------- View switching ----------
  function switchView(view) {
    qa(".view").forEach((v) => v.classList.add("hidden"));
    const el = $(`view-${view}`);
    if (el) el.classList.remove("hidden");

    qa("#nav button[data-view]").forEach((b) => b.classList.toggle("active", b.getAttribute("data-view") === view));

    // render view-specific
    if (view === "dashboard") renderDashboard();
    if (view === "team") renderRoster();
    if (view === "log") { renderLogs(); renderReadiness(); updateTrainingComputed(); updateReadinessComputed(); }
    if (view === "nutrition") { renderNutrition(); syncTargetsUI(); renderNutritionComputed(); }
    if (view === "workouts") buildWorkout();
    if (view === "periodization") renderPeriodization();
    if (view === "settings") renderSettings();
  }

  function renderSettings() {
    if ($("roleSelect")) $("roleSelect").value = store.role || "coach";
    if ($("appInfo")) {
      $("appInfo").textContent =
        `Storage key: ${KEY}\n` +
        `Team: ${store.team?.name || DEFAULT_TEAM}\n` +
        `Role: ${store.role}\n` +
        `Athletes: ${store.athletes.length}\n` +
        `Sessions: ${store.logs.length}\n` +
        `Readiness: ${store.readiness.length}\n` +
        `Nutrition: ${store.nutrition.length}`;
    }
  }

  // ---------- Boot ----------
  function hideSplash() {
    const s = $("splash");
    if (!s) return;
    setTimeout(() => (s.style.display = "none"), 400);
  }

  function wire() {
    // nav
    qa("#nav button[data-view]").forEach((btn) => {
      btn.onclick = () => switchView(btn.getAttribute("data-view"));
    });

    // team
    $("addAthlete") && ($("addAthlete").onclick = addAthlete);

    // log
    $("logDate") && ($("logDate").value = todayISO());
    $("readyDate") && ($("readyDate").value = todayISO());

    ["logMinutes", "logRpe"].forEach((id) => $(id)?.addEventListener("input", updateTrainingComputed));

    $("saveLog") && ($("saveLog").onclick = () => {
      const athlete = $("logAthlete")?.value || store.athletes[0];
      if (!athlete) return alert("Add athletes first.");
      const dateISO = safeISO($("logDate")?.value) || todayISO();
      const min = clamp(toNum($("logMinutes")?.value, 0), 0, 600);
      const rpe = clamp(toNum($("logRpe")?.value, 0), 0, 10);
      upsertSession(athlete, dateISO, min, rpe);
      renderLogs();
      renderDashboard();
    });

    ["readySleep", "readySore", "readyStress", "readyEnergy"].forEach((id) =>
      $(id)?.addEventListener("input", updateReadinessComputed)
    );

    $("saveReadiness") && ($("saveReadiness").onclick = () => {
      const athlete = $("readyAthlete")?.value || store.athletes[0];
      if (!athlete) return alert("Add athletes first.");
      const dateISO = safeISO($("readyDate")?.value) || todayISO();
      const sleep = clamp(toNum($("readySleep")?.value, 8), 0, 16);
      const sore = clamp(toNum($("readySore")?.value, 3), 0, 10);
      const stress = clamp(toNum($("readyStress")?.value, 3), 0, 10);
      const energy = clamp(toNum($("readyEnergy")?.value, 7), 0, 10);
      upsertReadinessRow(athlete, dateISO, sleep, sore, stress, energy);
      renderReadiness();
      renderDashboard();
    });

    // nutrition
    $("nutDate") && ($("nutDate").value = todayISO());
    ["protein", "carbs", "fat"].forEach((id) => $(id)?.addEventListener("input", renderNutritionComputed));
    $("nutAthlete")?.addEventListener("change", () => { renderNutrition(); renderNutritionComputed(); });

    $("saveNutrition") && ($("saveNutrition").onclick = () => {
      const athlete = $("nutAthlete")?.value || store.athletes[0];
      if (!athlete) return alert("Add athletes first.");
      const dateISO = safeISO($("nutDate")?.value) || todayISO();
      const p = clamp(toNum($("protein")?.value, 0), 0, 500);
      const c = clamp(toNum($("carbs")?.value, 0), 0, 1000);
      const f = clamp(toNum($("fat")?.value, 0), 0, 400);
      upsertNutrition(athlete, dateISO, p, c, f);
      renderNutrition();
      renderNutritionComputed();
      renderDashboard();
    });

    $("targetAthlete")?.addEventListener("change", () => { syncTargetsUI(); renderNutritionComputed(); });

    $("saveTargets") && ($("saveTargets").onclick = () => {
      const athlete = $("targetAthlete")?.value || store.athletes[0];
      if (!athlete) return alert("Select an athlete.");
      store.targets[athlete] = {
        p: clamp(toNum($("tP")?.value, 160), 0, 500),
        c: clamp(toNum($("tC")?.value, 240), 0, 1000),
        f: clamp(toNum($("tF")?.value, 70), 0, 400),
        w: clamp(toNum($("tW")?.value, 80), 0, 300)
      };
      save();
      syncTargetsUI();
      renderNutritionComputed();
      renderDashboard();
      alert("Targets saved.");
    });

    // dashboard
    $("dashDate") && ($("dashDate").value = todayISO());
    $("btnRecalc") && ($("btnRecalc").onclick = renderDashboard);
    $("dashAthlete")?.addEventListener("change", renderDashboard);
    $("dashDate")?.addEventListener("change", renderDashboard);

    // workouts
    $("buildWorkout") && ($("buildWorkout").onclick = buildWorkout);

    // periodization
    $("perStart") && ($("perStart").value = todayISO());
    $("generatePlan") && ($("generatePlan").onclick = generatePlan);

    // settings
    $("saveRole") && ($("saveRole").onclick = () => {
      store.role = $("roleSelect")?.value || "coach";
      save();
      applyRoleNav();
      // ensure athlete can see nutrition + periodization
      switchView("dashboard");
    });

    $("wipeData") && ($("wipeData").onclick = () => {
      if (!confirm("Wipe ALL local data?")) return;
      localStorage.removeItem(KEY);
      location.reload();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    hideSplash();

    applyRoleNav();
    refreshAthleteDropdowns();

    wire();

    // if no athletes, coach sees Team first
    if (!store.athletes.length && store.role === "coach") switchView("team");
    else switchView("dashboard");

    // safe extra render pass
    setTimeout(() => {
      applyRoleNav();
      refreshAthleteDropdowns();
      renderDashboard();
    }, 250);
  });
})();
