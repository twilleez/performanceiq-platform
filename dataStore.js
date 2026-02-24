// dataStore.js — PerformanceIQ Offline Store (single source of truth)
// v2.0.0 — supports PIQ Score, Heatmap, Nutrition (paid), Risk, Periodization

(function () {
  "use strict";
  if (window.PIQ_Store) return;

  const LS_KEY = "piq_state_v2";

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function uid() {
    return "id_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function clamp(n, a, b) {
    const x = Number(n);
    if (Number.isNaN(x)) return a;
    return Math.max(a, Math.min(b, x));
  }

  function deepCopy(x) {
    return JSON.parse(JSON.stringify(x));
  }

  function defaultState() {
    return {
      version: 2,
      updatedAt: new Date().toISOString(),
      team: {
        id: "team_default",
        name: "Default",
        seasonStart: "",
        seasonEnd: "",
        macroDefaults: { p: 160, c: 240, f: 70, w: 96 }, // water oz default
        weights: { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 },
      },
      entitlements: {
        eliteNutrition: false,
        eliteSince: null,
      },
      roster: [
        // {id,name,pos,heightIn,weightLb, targets:{p,c,f,w}}
      ],
      logs: {
        training: [
          // {id, athleteId, date, minutes, rpe, type, notes}
        ],
        readiness: [
          // {id, athleteId, date, sleepHrs, sore, stress, energy, injuryNote}
        ],
        nutrition: [
          // {id, athleteId, date, p,c,f,w, notes}
        ],
      },
      plans: {
        periodization: [
          // {id, athleteId, startISO, weeks, goal, deloadEvery, createdAt, weeksData:[...]}
        ],
      },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return defaultState();
      if (!parsed.version) return defaultState();
      // light migration guard
      if (parsed.version !== 2) return defaultState();
      return parsed;
    } catch (_) {
      return defaultState();
    }
  }

  let STATE = load();

  function save() {
    STATE.updatedAt = new Date().toISOString();
    localStorage.setItem(LS_KEY, JSON.stringify(STATE));
  }

  function getState() {
    return deepCopy(STATE);
  }

  function setState(next) {
    STATE = next && typeof next === "object" ? next : defaultState();
    save();
  }

  function wipe() {
    localStorage.removeItem(LS_KEY);
    STATE = defaultState();
  }

  // -------- TEAM --------
  function setTeam(patch) {
    STATE.team = { ...STATE.team, ...(patch || {}) };
    save();
  }

  function setMacroDefaults(p, c, f, w) {
    STATE.team.macroDefaults = {
      p: clamp(p, 0, 500),
      c: clamp(c, 0, 1200),
      f: clamp(f, 0, 400),
      w: clamp(w, 0, 300),
    };
    save();
  }

  function setWeights(w) {
    const next = {
      readiness: clamp(w?.readiness, 0, 100),
      training: clamp(w?.training, 0, 100),
      recovery: clamp(w?.recovery, 0, 100),
      nutrition: clamp(w?.nutrition, 0, 100),
      risk: clamp(w?.risk, 0, 100),
    };
    STATE.team.weights = next;
    save();
  }

  // -------- ENTITLEMENTS --------
  function enableEliteNutrition() {
    STATE.entitlements.eliteNutrition = true;
    STATE.entitlements.eliteSince = new Date().toISOString();
    save();
  }
  function disableEliteNutrition() {
    STATE.entitlements.eliteNutrition = false;
    save();
  }

  // -------- ROSTER --------
  function addAthlete(name, pos, heightIn, weightLb) {
    const clean = String(name || "").trim();
    if (!clean) throw new Error("Name required");
    const a = {
      id: uid(),
      name: clean,
      pos: String(pos || "").trim(),
      heightIn: clamp(heightIn, 40, 96),
      weightLb: clamp(weightLb, 60, 400),
      targets: null, // per-athlete macros; if null, uses team defaults
    };
    STATE.roster.push(a);
    save();
    return deepCopy(a);
  }

  function removeAthlete(athleteId) {
    STATE.roster = STATE.roster.filter((a) => a.id !== athleteId);
    // also prune logs/plans
    STATE.logs.training = STATE.logs.training.filter((x) => x.athleteId !== athleteId);
    STATE.logs.readiness = STATE.logs.readiness.filter((x) => x.athleteId !== athleteId);
    STATE.logs.nutrition = STATE.logs.nutrition.filter((x) => x.athleteId !== athleteId);
    STATE.plans.periodization = STATE.plans.periodization.filter((x) => x.athleteId !== athleteId);
    save();
  }

  function setAthleteTargets(athleteId, targets) {
    const a = STATE.roster.find((x) => x.id === athleteId);
    if (!a) throw new Error("Athlete not found");
    a.targets = {
      p: clamp(targets?.p, 0, 500),
      c: clamp(targets?.c, 0, 1200),
      f: clamp(targets?.f, 0, 400),
      w: clamp(targets?.w, 0, 300),
    };
    save();
  }

  function getTargetsForAthlete(athleteId) {
    const a = STATE.roster.find((x) => x.id === athleteId);
    const def = STATE.team.macroDefaults;
    const t = a?.targets;
    return {
      p: t?.p ?? def.p,
      c: t?.c ?? def.c,
      f: t?.f ?? def.f,
      w: t?.w ?? def.w,
    };
  }

  // -------- LOGS --------
  function upsertTraining(entry) {
    const e = { ...(entry || {}) };
    if (!e.athleteId) throw new Error("athleteId required");
    if (!e.date) throw new Error("date required");
    const minutes = clamp(e.minutes, 0, 600);
    const rpe = clamp(e.rpe, 0, 10);
    const out = {
      id: e.id || uid(),
      athleteId: e.athleteId,
      date: String(e.date).slice(0, 10),
      minutes,
      rpe,
      type: String(e.type || "practice"),
      notes: String(e.notes || "").slice(0, 240),
    };
    // allow multiple sessions/day; upsert by id
    const idx = STATE.logs.training.findIndex((x) => x.id === out.id);
    if (idx >= 0) STATE.logs.training[idx] = out;
    else STATE.logs.training.push(out);
    save();
    return deepCopy(out);
  }

  function upsertReadiness(entry) {
    const e = { ...(entry || {}) };
    if (!e.athleteId) throw new Error("athleteId required");
    if (!e.date) throw new Error("date required");
    const out = {
      id: e.id || uid(),
      athleteId: e.athleteId,
      date: String(e.date).slice(0, 10),
      sleepHrs: clamp(e.sleepHrs, 0, 16),
      sore: clamp(e.sore, 0, 10),
      stress: clamp(e.stress, 0, 10),
      energy: clamp(e.energy, 0, 10),
      injuryNote: String(e.injuryNote || "").slice(0, 120),
    };
    // one per day per athlete => upsert by athlete+date
    const idx = STATE.logs.readiness.findIndex((x) => x.athleteId === out.athleteId && x.date === out.date);
    if (idx >= 0) STATE.logs.readiness[idx] = { ...STATE.logs.readiness[idx], ...out, id: STATE.logs.readiness[idx].id };
    else STATE.logs.readiness.push(out);
    save();
    return deepCopy(out);
  }

  function upsertNutrition(entry) {
    const e = { ...(entry || {}) };
    if (!e.athleteId) throw new Error("athleteId required");
    if (!e.date) throw new Error("date required");
    const out = {
      id: e.id || uid(),
      athleteId: e.athleteId,
      date: String(e.date).slice(0, 10),
      p: clamp(e.p, 0, 800),
      c: clamp(e.c, 0, 1500),
      f: clamp(e.f, 0, 500),
      w: clamp(e.w, 0, 400),
      notes: String(e.notes || "").slice(0, 240),
    };
    // one per day per athlete
    const idx = STATE.logs.nutrition.findIndex((x) => x.athleteId === out.athleteId && x.date === out.date);
    if (idx >= 0) STATE.logs.nutrition[idx] = { ...STATE.logs.nutrition[idx], ...out, id: STATE.logs.nutrition[idx].id };
    else STATE.logs.nutrition.push(out);
    save();
    return deepCopy(out);
  }

  function listTraining(athleteId, limit = 14) {
    return deepCopy(
      STATE.logs.training
        .filter((x) => x.athleteId === athleteId)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, limit)
    );
  }

  function listReadiness(athleteId, limit = 14) {
    return deepCopy(
      STATE.logs.readiness
        .filter((x) => x.athleteId === athleteId)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, limit)
    );
  }

  function listNutrition(athleteId, limit = 14) {
    return deepCopy(
      STATE.logs.nutrition
        .filter((x) => x.athleteId === athleteId)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, limit)
    );
  }

  function getTrainingForDate(athleteId, dateISO) {
    const d = String(dateISO).slice(0, 10);
    return deepCopy(STATE.logs.training.filter((x) => x.athleteId === athleteId && x.date === d));
  }

  function getReadinessForDate(athleteId, dateISO) {
    const d = String(dateISO).slice(0, 10);
    const r = STATE.logs.readiness.find((x) => x.athleteId === athleteId && x.date === d);
    return r ? deepCopy(r) : null;
  }

  function getNutritionForDate(athleteId, dateISO) {
    const d = String(dateISO).slice(0, 10);
    const n = STATE.logs.nutrition.find((x) => x.athleteId === athleteId && x.date === d);
    return n ? deepCopy(n) : null;
  }

  // -------- PLANS --------
  function savePeriodizationPlan(plan) {
    const p = { ...(plan || {}) };
    if (!p.athleteId) throw new Error("athleteId required");
    if (!p.startISO) throw new Error("startISO required");
    const out = {
      id: p.id || uid(),
      athleteId: p.athleteId,
      startISO: String(p.startISO).slice(0, 10),
      weeks: clamp(p.weeks, 2, 24),
      goal: String(p.goal || "inseason"),
      deloadEvery: clamp(p.deloadEvery, 3, 5),
      createdAt: new Date().toISOString(),
      weeksData: Array.isArray(p.weeksData) ? p.weeksData : [],
    };
    const idx = STATE.plans.periodization.findIndex((x) => x.id === out.id);
    if (idx >= 0) STATE.plans.periodization[idx] = out;
    else STATE.plans.periodization.unshift(out);
    save();
    return deepCopy(out);
  }

  function listPlans(athleteId, limit = 5) {
    return deepCopy(STATE.plans.periodization.filter((x) => x.athleteId === athleteId).slice(0, limit));
  }

  function getLatestPlan(athleteId) {
    const p = STATE.plans.periodization.find((x) => x.athleteId === athleteId);
    return p ? deepCopy(p) : null;
  }

  window.PIQ_Store = {
    LS_KEY,
    todayISO,
    clamp,
    uid,

    getState,
    setState,
    save,
    wipe,

    setTeam,
    setMacroDefaults,
    setWeights,

    enableEliteNutrition,
    disableEliteNutrition,

    addAthlete,
    removeAthlete,
    setAthleteTargets,
    getTargetsForAthlete,

    upsertTraining,
    upsertReadiness,
    upsertNutrition,

    listTraining,
    listReadiness,
    listNutrition,

    getTrainingForDate,
    getReadinessForDate,
    getNutritionForDate,

    savePeriodizationPlan,
    listPlans,
    getLatestPlan,
  };
})();
