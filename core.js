// core.js — FULL FILE (Sport Engine + Workouts + Write-back) — v2.3.0
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

  function onceBind(el, key, fn) {
    if (!el) return;
    const k = "__piq_bound_" + key;
    if (el[k]) return;
    el[k] = true;
    el.addEventListener("click", fn);
  }

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = String(text ?? "");
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
        role: "coach",             // demo only
        myAthleteId: ""            // demo only
      },
      team: {
        id: DEFAULT_TEAM_ID,
        name: "Default",
        sport: "basketball",
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
        plans: {} // plans[athleteId] = { athleteId, sport, mode, weekStartISO, sessions:[...] }
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
    s.team = s.team && typeof s.team === "object" ? s.team : d.team;

    if (!s.team.sport) s.team.sport = "basketball";
    s.team.macroDefaults = s.team.macroDefaults && typeof s.team.macroDefaults === "object" ? s.team.macroDefaults : d.team.macroDefaults;
    s.team.piqWeights = s.team.piqWeights && typeof s.team.piqWeights === "object" ? s.team.piqWeights : d.team.piqWeights;

    if (!Array.isArray(s.athletes)) s.athletes = [];
    s.athletes = s.athletes.map((a) => ({
      id: String(a?.id || uid("ath")),
      name: String(a?.name || "Athlete"),
      position: String(a?.position || ""),
      heightIn: a?.heightIn ?? null,
      weightLb: a?.weightLb ?? null,
      sport: String(a?.sport || "") // per-athlete override
    }));

    s.logs = s.logs && typeof s.logs === "object" ? s.logs : d.logs;
    if (!s.logs.training || typeof s.logs.training !== "object") s.logs.training = {};
    if (!s.logs.readiness || typeof s.logs.readiness !== "object") s.logs.readiness = {};
    if (!s.logs.nutrition || typeof s.logs.nutrition !== "object") s.logs.nutrition = {};

    s.targets = s.targets && typeof s.targets === "object" ? s.targets : {};
    s.periodization = s.periodization && typeof s.periodization === "object" ? s.periodization : {};

    s.workouts = s.workouts && typeof s.workouts === "object" ? s.workouts : d.workouts;
    if (!s.workouts.plans || typeof s.workouts.plans !== "object") s.workouts.plans = {};

    if (!s.meta.role) s.meta.role = "coach";
    if (typeof s.meta.myAthleteId !== "string") s.meta.myAthleteId = "";

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
  // Views
  // -------------------------
  const VIEWS = ["dashboard", "team", "workouts", "log", "nutrition", "periodization", "settings"];

  function showView(name) {
    const view = String(name || "dashboard");
    VIEWS.forEach((v) => {
      const el = $(`view-${v}`);
      if (!el) return;
      el.hidden = v !== view;
    });

    qa(".navbtn").forEach((b) => {
      const v = b.getAttribute("data-view");
      b.classList.toggle("active", v === view);
    });

    // render
    if (view === "dashboard") renderDashboard();
    if (view === "team") renderTeam();
    if (view === "workouts") renderWorkouts();
    if (view === "log") renderLog();
    if (view === "nutrition") renderNutrition();
    if (view === "periodization") renderPeriodization();
    if (view === "settings") renderSettings();

    updateTopPills();
    saveState();
  }

  function wireNav() {
    qa(".navbtn").forEach((btn) => {
      if (btn.__piqNavBound) return;
      btn.__piqNavBound = true;
      btn.addEventListener("click", () => {
        const v = btn.getAttribute("data-view") || "dashboard";
        showView(v);
      });
    });
  }

  // -------------------------
  // Sport engine
  // -------------------------
  const SPORT_LABEL = {
    basketball: "Basketball",
    football: "Football",
    baseball: "Baseball",
    soccer: "Soccer",
    volleyball: "Volleyball",
    track: "Track",
    lacrosse: "Lacrosse",
    wrestling: "Wrestling",
    hockey: "Hockey",
    custom: "Custom"
  };

  function normSport(s) {
    const x = String(s || "").toLowerCase().trim();
    return x || "basketball";
  }

  function resolveSport(athleteId) {
    const a = getAthlete(athleteId);
    const fromAth = normSport(a?.sport || "");
    if (a?.sport) return { sport: fromAth, source: "athlete" };
    const fromTeam = normSport(state.team?.sport || "basketball");
    return { sport: fromTeam, source: "team" };
  }

  function sportName(s) {
    const k = normSport(s);
    return SPORT_LABEL[k] || (k.charAt(0).toUpperCase() + k.slice(1));
  }

  function updateTopPills() {
    const pill = $("activeTeamPill");
    if (pill) pill.textContent = `Team: ${state.team?.name || "Default"}`;

    // pick a sport to show: use my athlete if selected, else team
    const my = state.meta.myAthleteId || "";
    const { sport } = resolveSport(my || (state.athletes[0]?.id || ""));
    const sp = $("activeSportPill");
    if (sp) sp.textContent = `Sport: ${sportName(sport)}`;
  }

  // -------------------------
  // Athletes helpers
  // -------------------------
  function getAthletes() { return state.athletes.slice(); }
  function getAthlete(id) { return state.athletes.find((a) => a && a.id === id) || null; }

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
  // Targets/log helpers (from your existing system)
  // -------------------------
  function ensureTargetsForAthlete(athleteId) {
    if (!athleteId) return null;
    if (!state.targets[athleteId]) {
      const d = state.team.macroDefaults || { protein: 160, carbs: 240, fat: 70, waterOz: 80 };
      state.targets[athleteId] = { protein: d.protein, carbs: d.carbs, fat: d.fat, waterOz: d.waterOz };
      saveState();
    }
    return state.targets[athleteId];
  }

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

  function sessionLoad(sess) {
    return clamp(toNum(sess.minutes, 0) * toNum(sess.rpe, 0), 0, 6000);
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
  // Minimal scoring stubs (kept safe)
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

  // -------------------------
  // Periodization (your existing plan structure)
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
        { day: "Mon", minutes: 60, rpe: isDeload ? 5 : 6, type: "workout" },
        { day: "Tue", minutes: 75, rpe: isDeload ? 5 : 7, type: "workout" },
        { day: "Thu", minutes: 60, rpe: isDeload ? 4 : 6, type: "workout" },
        { day: "Sat", minutes: 75, rpe: isDeload ? 5 : 7, type: "workout" }
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

  function getWeekFromPeriodization(athleteId, weekStartISO) {
    const plan = state.periodization[athleteId];
    if (!plan?.weeksPlan?.length) return null;
    return plan.weeksPlan.find((w) => w.weekStartISO === weekStartISO) || null;
  }

  // -------------------------
  // Sport-tailored workout library
  // -------------------------
  function sportExerciseLibrary(sport, mode) {
    const adv = mode === "advanced";

    const base = {
      warmup: [
        "Dynamic warm-up (8–10 min)",
        "Mobility: ankles/hips/T-spine (5 min)",
        "Activation: glute + core (5 min)"
      ],
      strength: [],
      power: [],
      conditioning: [],
      skill: [],
      prehab: []
    };

    const s = normSport(sport);

    if (s === "basketball") {
      base.power = [
        "Pogo hops (3×20s)",
        "Broad jump (4×3)",
        "Med ball slam (4×5)"
      ];
      base.strength = [
        adv ? "Front squat (5×3)" : "Goblet squat (3×8)",
        adv ? "Trap bar deadlift (4×4)" : "RDL (3×8)",
        "Split squat (3×8/side)",
        "Pull-ups or lat pulldown (3×6–10)",
        "DB bench (3×8)"
      ];
      base.skill = [
        "Ball-handling + finishing (15–25 min)",
        "Shooting: form + game-speed (25–40 min)"
      ];
      base.conditioning = [
        adv ? "Repeat sprint: 10×20s on / 40s off" : "Intervals: 8×15s on / 45s off",
        "Lateral COD: 6×10–15m"
      ];
      base.prehab = ["Copenhagen plank (2×20s/side)", "Calf raises (3×12)", "Rotator cuff band work (2×15)"];
    }

    if (s === "football") {
      base.power = [
        adv ? "Hang clean (5×2)" : "Med ball throw (5×3)",
        "Box jump (4×3)",
        "Sled push (6×15m)"
      ];
      base.strength = [
        adv ? "Back squat (5×3)" : "Trap bar deadlift (3×6)",
        adv ? "Bench press (5×3)" : "DB bench (3×8)",
        "Row (3×8)",
        "Nordic hamstring (2×4–6)"
      ];
      base.conditioning = [
        adv ? "Speed: 6×30m + 4×10m" : "Accel: 8×10m",
        "Position conditioning (short bursts)"
      ];
      base.prehab = ["Neck + shoulder stability (2×12)", "Hamstring isometrics (2×30s)"];
    }

    if (s === "soccer") {
      base.power = ["Plyo bounds (3×10/side)", "Vertical jump (4×3)"];
      base.strength = [
        "RDL (3×6–8)",
        "Split squat (3×8/side)",
        "Copenhagen plank (3×20s/side)",
        "Calf raises (4×10–12)"
      ];
      base.conditioning = [
        adv ? "Intervals: 6×3 min @ hard / 2 min easy" : "Tempo: 12×1 min @ moderate / 1 min easy",
        "Repeat sprint: 8×10s on / 50s off"
      ];
      base.skill = ["Touch + passing (15–25 min)", "Small-sided games (if available)"];
      base.prehab = ["Hamstring eccentrics (2×6)", "Adductor squeeze (2×20s)"];
    }

    if (s === "baseball") {
      base.power = ["Rotational med ball throw (6×3/side)", "Sprint 6×20m"];
      base.strength = [
        "Trap bar deadlift (3×5)",
        "Single-leg RDL (3×8/side)",
        "Row (3×10)",
        "Landmine press (3×8)"
      ];
      base.prehab = [
        "Scap circuit (Y/T/W 2×10)",
        "Band external rotation (2×15)",
        "Thoracic mobility (5 min)"
      ];
      base.skill = ["Throwing program (volume-managed)", "Bat swings (quality reps)"];
      base.conditioning = ["Intervals: 8×20s on / 40s off"];
    }

    if (s === "volleyball") {
      base.power = ["Approach jump (5×2)", "Med ball toss (5×3)"];
      base.strength = [
        "Front squat (3×5) or goblet squat (3×8)",
        "Hip thrust (3×8)",
        "Row (3×10)",
        "DB bench (3×8)"
      ];
      base.prehab = ["Shoulder stability (2×12)", "Ankles/calves (3×12)"];
      base.conditioning = ["Short burst: 10×10s on / 50s off"];
      base.skill = ["Jump timing + landing mechanics (10 min)", "Serve/receive reps (15–30 min)"];
    }

    if (s === "track") {
      base.power = ["Sprint drills + buildups", "Plyo hops 3×20s"];
      base.strength = ["RDL (3×6)", "Split squat (3×8)", "Core anti-rotation (3×10)"];
      base.conditioning = adv ? ["Speed endurance work (event-based)"] : ["Technique + moderate intervals"];
      base.prehab = ["Hip flexor mobility (5 min)", "Hamstring isometrics (2×30s)"];
    }

    // fallback
    if (!base.strength.length) {
      base.strength = ["Full-body strength (3×8)", "Core (3×10)"];
      base.conditioning = ["Intervals (8–12 min total work)"];
      base.prehab = ["Mobility (10 min)"];
    }

    return base;
  }

  function buildSessionFromLibrary({ athleteId, dateISO, title, focus, minutes, rpe, sport, mode }) {
    const lib = sportExerciseLibrary(sport, mode);

    const blocks = [];
    blocks.push({ label: "Warm-up", items: lib.warmup });

    if (focus === "power") blocks.push({ label: "Power", items: lib.power });
    if (focus === "strength") blocks.push({ label: "Strength", items: lib.strength });
    if (focus === "conditioning") blocks.push({ label: "Conditioning", items: lib.conditioning });
    if (focus === "skill") blocks.push({ label: "Skill", items: lib.skill });

    // always add prehab
    blocks.push({ label: "Prehab", items: lib.prehab });

    return {
      id: uid("wk"),
      athleteId,
      dateISO,
      title,
      sport: normSport(sport),
      mode,
      focus,
      minutes,
      rpe,
      load: Math.round(minutes * rpe),
      blocks
    };
  }

  function defaultWeeklyTemplateForSport(sport) {
    const s = normSport(sport);
    // simple templates; periodization overrides this if present
    if (s === "basketball") {
      return [
        { dow: 1, title: "Lower Power + Skills", focus: "strength", minutes: 70, rpe: 6 },
        { dow: 2, title: "Conditioning + Skills", focus: "conditioning", minutes: 60, rpe: 6 },
        { dow: 4, title: "Upper + Prehab", focus: "strength", minutes: 55, rpe: 5 },
        { dow: 6, title: "Game-Speed Skills", focus: "skill", minutes: 70, rpe: 6 }
      ];
    }
    if (s === "football") {
      return [
        { dow: 1, title: "Max Strength + Power", focus: "strength", minutes: 75, rpe: 7 },
        { dow: 3, title: "Speed + Accel", focus: "conditioning", minutes: 55, rpe: 6 },
        { dow: 4, title: "Upper Strength", focus: "strength", minutes: 70, rpe: 7 },
        { dow: 6, title: "Power + Sled", focus: "power", minutes: 65, rpe: 6 }
      ];
    }
    if (s === "soccer") {
      return [
        { dow: 1, title: "Strength + Hamstrings", focus: "strength", minutes: 65, rpe: 6 },
        { dow: 2, title: "Intervals", focus: "conditioning", minutes: 55, rpe: 6 },
        { dow: 4, title: "COD + Power", focus: "power", minutes: 55, rpe: 6 },
        { dow: 6, title: "Tempo + Touch", focus: "skill", minutes: 60, rpe: 5 }
      ];
    }
    if (s === "baseball") {
      return [
        { dow: 1, title: "Posterior Chain + Rotational Power", focus: "power", minutes: 60, rpe: 6 },
        { dow: 3, title: "Upper + Scap", focus: "strength", minutes: 55, rpe: 5 },
        { dow: 5, title: "Speed + Mobility", focus: "conditioning", minutes: 50, rpe: 5 }
      ];
    }
    if (s === "volleyball") {
      return [
        { dow: 1, title: "Jump Power + Lower", focus: "power", minutes: 60, rpe: 6 },
        { dow: 3, title: "Upper + Shoulder", focus: "strength", minutes: 55, rpe: 5 },
        { dow: 5, title: "Skills + Conditioning", focus: "skill", minutes: 60, rpe: 6 }
      ];
    }
    return [
      { dow: 1, title: "Strength", focus: "strength", minutes: 60, rpe: 6 },
      { dow: 3, title: "Conditioning", focus: "conditioning", minutes: 55, rpe: 6 },
      { dow: 5, title: "Skills", focus: "skill", minutes: 60, rpe: 5 }
    ];
  }

  function applyModeScaling(sess, mode) {
    if (mode !== "advanced") return sess;
    // advanced: slightly more minutes + slightly higher RPE (not crazy)
    return {
      ...sess,
      minutes: clamp(Math.round(sess.minutes * 1.12), 35, 120),
      rpe: clamp(sess.rpe + 1, 4, 9)
    };
  }

  function generateWorkoutWeek(athleteId, weekStartISO, mode) {
    const weekStart = safeISO(weekStartISO) || todayISO();
    const { sport, source } = resolveSport(athleteId);

    // If periodization has this week, follow it
    const pWeek = getWeekFromPeriodization(athleteId, weekStart);
    const sessions = [];

    if (pWeek?.sessions?.length) {
      // Map Mon/Tue/Thu/Sat -> dates from weekStart
      const dayMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
      for (const s of pWeek.sessions) {
        const delta = dayMap[String(s.day || "Mon")] ?? 0;
        const d = addDaysISO(weekStart, delta);
        const base = { title: `Periodized Session (${s.day})`, focus: "strength", minutes: s.minutes, rpe: s.rpe };
        const scaled = applyModeScaling(base, mode);
        sessions.push(buildSessionFromLibrary({
          athleteId, dateISO: d,
          title: scaled.title,
          focus: "strength",
          minutes: scaled.minutes,
          rpe: scaled.rpe,
          sport, mode
        }));
      }
    } else {
      // Sport template
      const tmpl = defaultWeeklyTemplateForSport(sport);
      for (const t of tmpl) {
        const d = addDaysISO(weekStart, (t.dow - 1));
        const scaled = applyModeScaling(t, mode);
        sessions.push(buildSessionFromLibrary({
          athleteId, dateISO: d,
          title: scaled.title,
          focus: scaled.focus,
          minutes: scaled.minutes,
          rpe: scaled.rpe,
          sport, mode
        }));
      }
    }

    const plan = {
      athleteId,
      weekStartISO: weekStart,
      sport,
      sportSource: source,
      mode,
      createdAtMs: Date.now(),
      sessions
    };

    state.workouts.plans[athleteId] = plan;
    saveState();
    return plan;
  }

  // -------------------------
  // Dashboard (minimal compatibility)
  // -------------------------
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

  function heatColorClass(v) {
    const x = clamp(toNum(v, 0), 0, 100);
    if (x >= 85) return "heat4";
    if (x >= 70) return "heat3";
    if (x >= 55) return "heat2";
    if (x >= 40) return "heat1";
    return "heat0";
  }

  // Stub PIQ score so dashboard doesn't blank if you haven't pasted the full scoring
  function calcPIQScore(athleteId, dateISO) {
    const date = safeISO(dateISO) || todayISO();
    const readinessList = getReadiness(athleteId);
    const nutritionList = getNutrition(athleteId);
    const training = getTraining(athleteId);
    const target = ensureTargetsForAthlete(athleteId);

    const readinessRow = readinessList.find((r) => r.dateISO === date) || readinessList[readinessList.length - 1] || null;
    const nutritionRow = nutritionList.find((n) => n.dateISO === date) || nutritionList[nutritionList.length - 1] || null;

    const readiness = readinessRow ? calcReadinessScore(readinessRow) : 60;
    const nutrition = nutritionRow ? calcNutritionAdherence(nutritionRow, target) : 50;

    const last7 = training.filter((s) => s.dateISO >= addDaysISO(date, -6) && s.dateISO <= date);
    const load = last7.reduce((acc, s) => acc + sessionLoad(s), 0);
    const trainingScore = clamp(Math.round(100 - (load / 6000) * 40), 40, 100);

    const final = clamp(Math.round(readiness * 0.45 + nutrition * 0.25 + trainingScore * 0.30), 0, 100);
    const band = final >= 90 ? "Elite" : final >= 80 ? "High" : final >= 70 ? "Solid" : final >= 55 ? "At-Risk" : "Critical";

    return { dateISO: date, final, band, subs: { readiness, training: trainingScore, recovery: readiness, nutrition, risk: 100 - trainingScore }, meta: { workload: { acute: load, chronicAvg7: load, acwr: null, monotony: 0, strain: load, index: 100 - trainingScore } } };
  }

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
      const d = safeISO(dateEl?.value) || todayISO();
      if (!athleteId) {
        setText("piqScore", "—");
        setText("piqBand", "Add athletes in Team tab");
        return;
      }
      const r = calcPIQScore(athleteId, d);
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

      setText("piqExplain", `PIQ Score (${r.final}) — basic stub is active.\nPaste your full scoring model if needed.\n\nReadiness ${r.subs.readiness}\nTraining ${r.subs.training}\nNutrition ${r.subs.nutrition}`);
    }

    if ($("btnRecalcScore") && !$("btnRecalcScore").__piqPIQBound) {
      $("btnRecalcScore").__piqPIQBound = true;
      $("btnRecalcScore").addEventListener("click", updatePIQ);
      athSel?.addEventListener("change", updatePIQ);
      dateEl?.addEventListener("change", updatePIQ);
    }
    updatePIQ();

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
            const day = training.filter((s) => s.dateISO === d).reduce((acc, s) => acc + sessionLoad(s), 0);
            val = clamp(Math.round((day / 600) * 100), 0, 100);
          } else if (metric === "readiness") {
            const row = readiness.find((r) => r.dateISO === d);
            val = row ? calcReadinessScore(row) : 0;
          } else if (metric === "nutrition") {
            const row = nutrition.find((n) => n.dateISO === d);
            val = row ? calcNutritionAdherence(row, target) : 0;
          } else if (metric === "risk") {
            val = 0;
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

    if ($("btnHeatmap") && !$("btnHeatmap").__piqHeatBound) {
      $("btnHeatmap").__piqHeatBound = true;
      $("btnHeatmap").addEventListener("click", renderHeatmap);
    }
    renderHeatmap();
  }

  // -------------------------
  // Render: Team (with sport controls)
  // -------------------------
  function renderTeam() {
    updateTopPills();

    // roster list
    const list = $("rosterList");
    const athletes = getAthletes();

    if (list) {
      if (!athletes.length) {
        list.innerHTML = `<div class="muted small">No athletes yet. Add one above or click “Seed Demo”.</div>`;
      } else {
        list.innerHTML = athletes.map((a) => {
          const t = ensureTargetsForAthlete(a.id);
          const resolved = resolveSport(a.id);
          return `
            <div class="item">
              <div class="grow">
                <div><b>${escHTML(a.name || "—")}</b> <span class="muted small">${escHTML(a.position || "")}</span></div>
                <div class="muted small">Ht: ${escHTML(a.heightIn ?? "—")} in • Wt: ${escHTML(a.weightLb ?? "—")} lb</div>
                <div class="muted small">Sport: <b>${escHTML(sportName(resolved.sport))}</b> <span class="muted">(${escHTML(resolved.source)})</span></div>
                <div class="muted small">Targets: P ${escHTML(t.protein)} / C ${escHTML(t.carbs)} / F ${escHTML(t.fat)} • Water ${escHTML(t.waterOz)}oz</div>

                <div class="row gap wrap" style="margin-top:.6rem">
                  <div class="field" style="min-width:200px">
                    <label>Override sport</label>
                    <select data-ath-sport="${escHTML(a.id)}">
                      <option value="">(Use team sport)</option>
                      <option value="basketball">Basketball</option>
                      <option value="football">Football</option>
                      <option value="baseball">Baseball</option>
                      <option value="soccer">Soccer</option>
                      <option value="volleyball">Volleyball</option>
                      <option value="track">Track</option>
                      <option value="lacrosse">Lacrosse</option>
                      <option value="wrestling">Wrestling</option>
                      <option value="hockey">Hockey</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="row gap">
                <button class="btn ghost" data-go-workouts="${escHTML(a.id)}">Workouts</button>
                <button class="btn danger" data-del="${escHTML(a.id)}">Remove</button>
              </div>
            </div>
          `;
        }).join("");

        qa("select[data-ath-sport]", list).forEach((sel) => {
          const id = sel.getAttribute("data-ath-sport");
          const a = getAthlete(id);
          sel.value = a?.sport || "";
          if (sel.__piqBoundSport) return;
          sel.__piqBoundSport = true;
          sel.addEventListener("change", () => {
            const v = String(sel.value || "");
            const ath = getAthlete(id);
            if (!ath) return;
            ath.sport = v;
            saveState();
            updateTopPills();
            renderTeam();
          });
        });

        qa("[data-go-workouts]", list).forEach((btn) => {
          if (btn.__piqBoundGoWk) return;
          btn.__piqBoundGoWk = true;
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-go-workouts");
            if (!id) return;
            showView("workouts");
            if ($("wkAthlete")) $("wkAthlete").value = id;
            renderWorkouts();
          });
        });

        qa("[data-del]", list).forEach((btn) => {
          if (btn.__piqBoundDel) return;
          btn.__piqBoundDel = true;
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
            delete state.workouts.plans[id];
            if (state.meta.myAthleteId === id) state.meta.myAthleteId = "";
            saveState();
            renderTeam();
            renderDashboard();
          });
        });
      }
    }

    // add athlete
    onceBind($("btnAddAthlete"), "addAthlete", () => {
      const name = ($("athName")?.value || "").trim();
      const pos = ($("athPos")?.value || "").trim();
      const ht = toNum($("athHt")?.value, null);
      const wt = toNum($("athWt")?.value, null);
      const sp = String($("athSport")?.value || "");

      if (!name) return alert("Enter athlete full name.");
      const a = { id: uid("ath"), name, position: pos, heightIn: ht, weightLb: wt, sport: sp };
      state.athletes.push(a);
      ensureTargetsForAthlete(a.id);

      $("athName").value = "";
      $("athPos").value = "";
      $("athHt").value = "";
      $("athWt").value = "";
      if ($("athSport")) $("athSport").value = "";

      saveState();
      renderTeam();
      renderDashboard();
      renderWorkouts();
      renderLog();
    });

    // team settings
    if ($("teamName")) $("teamName").value = state.team?.name || "Default";
    if ($("teamSport")) $("teamSport").value = normSport(state.team?.sport || "basketball");
    if ($("seasonStart")) $("seasonStart").value = state.team?.seasonStart || "";
    if ($("seasonEnd")) $("seasonEnd").value = state.team?.seasonEnd || "";

    onceBind($("btnSaveTeam"), "saveTeam", () => {
      state.team.name = ($("teamName")?.value || "Default").trim() || "Default";
      state.team.sport = normSport($("teamSport")?.value || "basketball");
      state.team.seasonStart = safeISO($("seasonStart")?.value) || "";
      state.team.seasonEnd = safeISO($("seasonEnd")?.value) || "";
      saveState();
      updateTopPills();
      renderTeam();
      alert("Saved team settings.");
    });

    // macro defaults
    if ($("defProt")) $("defProt").value = state.team.macroDefaults.protein;
    if ($("defCarb")) $("defCarb").value = state.team.macroDefaults.carbs;
    if ($("defFat")) $("defFat").value = state.team.macroDefaults.fat;

    onceBind($("btnSaveMacroDefaults"), "saveMacros", () => {
      state.team.macroDefaults.protein = clamp(toNum($("defProt")?.value, 160), 0, 400);
      state.team.macroDefaults.carbs = clamp(toNum($("defCarb")?.value, 240), 0, 800);
      state.team.macroDefaults.fat = clamp(toNum($("defFat")?.value, 70), 0, 300);
      saveState();
      alert("Saved macro defaults.");
    });

    // weights
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
      setText("weightsNote", total === 100 ? "OK (totals 100)" : `Totals ${total} (should be 100)`);
      state.team.piqWeights = w;
      saveState();
      alert("Saved weights.");
      renderDashboard();
    });
  }

  // -------------------------
  // Render: Workouts (Sport-tailored + write-back)
  // -------------------------
  function renderWorkouts() {
    const athletes = getAthletes();
    fillAthleteSelect($("wkAthlete"), $("wkAthlete")?.value);

    const wkStart = $("wkStart");
    if (wkStart && !safeISO(wkStart.value)) wkStart.value = todayISO();

    const athleteId = $("wkAthlete")?.value || (athletes[0]?.id || "");
    const { sport, source } = resolveSport(athleteId);
    setText("wkSportPill", `Sport: ${sportName(sport)} (${source})`);

    const modeEl = $("wkMode");
    const mode = String(modeEl?.value || "standard");

    const note = $("wkNote");
    if (note) {
      const hasP = !!getWeekFromPeriodization(athleteId, safeISO(wkStart?.value) || todayISO());
      note.textContent = hasP
        ? "Periodization week found — workouts follow the plan automatically."
        : "No periodization week found — using sport template. (Generate a periodization plan to override.)";
    }

    function renderPlan(plan) {
      const list = $("wkPlanList");
      if (!list) return;
      if (!plan?.sessions?.length) {
        list.innerHTML = `<div class="muted small">No workout plan yet. Click “Generate Week”.</div>`;
        return;
      }

      list.innerHTML = plan.sessions
        .sort((a, b) => String(a.dateISO).localeCompare(String(b.dateISO)))
        .map((s) => {
          return `
            <div class="item" data-wk="${escHTML(s.id)}">
              <div class="grow">
                <div><b>${escHTML(s.dateISO)}</b> • ${escHTML(s.title)} • <span class="muted">Mode:</span> ${escHTML(plan.mode)}</div>
                <div class="muted small">Minutes ${escHTML(s.minutes)} • RPE ${escHTML(s.rpe)} • Load <b>${escHTML(s.load)}</b> • Focus ${escHTML(s.focus)}</div>
              </div>
              <div class="row gap">
                <button class="btn ghost" data-view-wk="${escHTML(s.id)}">View</button>
                <button class="btn" data-add-log="${escHTML(s.id)}">Add to Training Log</button>
              </div>
            </div>
          `;
        })
        .join("");

      qa("[data-view-wk]", list).forEach((btn) => {
        if (btn.__piqBoundViewWk) return;
        btn.__piqBoundViewWk = true;
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-view-wk");
          const sess = plan.sessions.find((x) => x.id === id);
          if (!sess) return;
          renderWorkoutDetail(sess);
        });
      });

      qa("[data-add-log]", list).forEach((btn) => {
        if (btn.__piqBoundAddLog) return;
        btn.__piqBoundAddLog = true;
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-add-log");
          const sess = plan.sessions.find((x) => x.id === id);
          if (!sess) return;
          const ath = sess.athleteId;
          addTrainingSession(ath, {
            id: uid("sess"),
            dateISO: sess.dateISO,
            minutes: sess.minutes,
            rpe: sess.rpe,
            type: "workout",
            notes: `[Workout Builder] ${sess.title} • Sport ${sportName(sess.sport)} • Mode ${sess.mode}`,
            load: sess.load
          });
          alert("Added to Training Log.");
          renderDashboard();
          renderLog();
        });
      });
    }

    function renderWorkoutDetail(sess) {
      const out = $("wkSessionDetail");
      if (!out) return;

      const blocksHtml = (sess.blocks || []).map((b) => {
        const items = (b.items || []).map((x) => `<li>${escHTML(x)}</li>`).join("");
        return `
          <div class="mini" style="margin-top:.75rem">
            <div class="minihead">${escHTML(b.label)}</div>
            <div class="minibody">
              <ul class="small" style="padding-left:1.1rem; margin-top:.35rem">${items}</ul>
            </div>
          </div>
        `;
      }).join("");

      out.innerHTML = `
        <div>
          <div><b>${escHTML(sess.dateISO)}</b> • ${escHTML(sess.title)}</div>
          <div class="muted small">Sport: ${escHTML(sportName(sess.sport))} • Mode: ${escHTML(sess.mode)} • Focus: ${escHTML(sess.focus)}</div>
          <div class="muted small">Minutes ${escHTML(sess.minutes)} • RPE ${escHTML(sess.rpe)} • Load <b>${escHTML(sess.load)}</b></div>
          ${blocksHtml}
        </div>
      `;
    }

    // generate button
    if ($("btnGenerateWorkouts") && !$("btnGenerateWorkouts").__piqBoundGenWk) {
      $("btnGenerateWorkouts").__piqBoundGenWk = true;
      $("btnGenerateWorkouts").addEventListener("click", () => {
        const a = $("wkAthlete")?.value || "";
        if (!a) return alert("Add athletes first (Team tab).");
        const ws = safeISO($("wkStart")?.value) || todayISO();
        const mode = String($("wkMode")?.value || "standard");
        const plan = generateWorkoutWeek(a, ws, mode);
        renderPlan(plan);
      });
    }

    // auto render existing plan if present
    if (athleteId) {
      const existing = state.workouts.plans[athleteId];
      if (existing && existing.weekStartISO === (safeISO(wkStart?.value) || todayISO())) renderPlan(existing);
      else renderPlan(null);
    }
  }

  // -------------------------
  // Render: Log (kept compatible)
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
      setText("logComputed", `Load: ${Math.round(min * rpe)}`);
    }
    if (!$("logMin")?.__piqBoundInput) {
      $("logMin").__piqBoundInput = true;
      $("logMin")?.addEventListener("input", updateTrainingComputed);
      $("logRpe")?.addEventListener("input", updateTrainingComputed);
    }
    updateTrainingComputed();

    onceBind($("btnSaveTraining"), "saveTraining", () => {
      const athleteId = $("logAthlete")?.value || "";
      if (!athleteId) return alert("Add athletes first (Team tab).");

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
      if ($("logNotes")) $("logNotes").value = "";
      updateTrainingComputed();
      renderLog();
      renderDashboard();
    });

    // training list
    const tList = $("trainingList");
    if (tList) {
      if (!logAthleteId) {
        tList.innerHTML = `<div class="muted small">Add athletes in Team tab.</div>`;
      } else {
        const sessions = getTraining(logAthleteId).slice(0, 25);
        tList.innerHTML = sessions.length
          ? sessions.map((s) => `
              <div class="item">
                <div class="grow">
                  <div><b>${escHTML(s.dateISO)}</b> • ${escHTML(s.type)} • ${escHTML(s.minutes)} min • sRPE ${escHTML(s.rpe)}</div>
                  <div class="muted small">Load: <b>${escHTML(s.load ?? Math.round(s.minutes*s.rpe))}</b>${s.notes ? ` • ${escHTML(s.notes)}` : ""}</div>
                </div>
                <button class="btn danger" data-del-session="${escHTML(s.id)}">Delete</button>
              </div>
            `).join("")
          : `<div class="muted small">No sessions yet.</div>`;

        qa("[data-del-session]", tList).forEach((btn) => {
          if (btn.__piqBoundDelSess) return;
          btn.__piqBoundDelSess = true;
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

    // readiness computed
    function updateReadinessComputed() {
      const row = {
        sleep: toNum($("readySleep")?.value, 8),
        soreness: toNum($("readySore")?.value, 3),
        stress: toNum($("readyStress")?.value, 3),
        energy: toNum($("readyEnergy")?.value, 7)
      };
      setText("readyComputed", calcReadinessScore(row));
    }
    ["readySleep", "readySore", "readyStress", "readyEnergy"].forEach((id) => {
      const el = $(id);
      if (!el || el.__piqBoundReadyInput) return;
      el.__piqBoundReadyInput = true;
      el.addEventListener("input", updateReadinessComputed);
    });
    updateReadinessComputed();

    onceBind($("btnSaveReadiness"), "saveReadiness", () => {
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
      if ($("readyInjury")) $("readyInjury").value = "";
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
                  <div class="grow">
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
          if (btn.__piqBoundDelReady) return;
          btn.__piqBoundDelReady = true;
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
  // Render: Nutrition / Periodization
  // (kept minimal here so your existing pages still run;
  //  you can paste your full versions back in if needed)
  // -------------------------
  function renderNutrition() {
    // Keep your existing nutritionEngine.js powering the UI.
    // This stub prevents blank rendering if you temporarily simplified HTML.
  }

  function renderPeriodization() {
    // If you have full periodization HTML, keep your previous renderPeriodization here.
    // For now, we keep the generator available via code.
    // (You can paste your full periodization UI back in and it will still work.)
  }

  // -------------------------
  // Settings
  // -------------------------
  function renderSettings() {
    const info = $("appInfo");
    if (info) {
      info.textContent =
        `PerformanceIQ v${APP_VERSION}\n` +
        `LocalStorage key: ${STORAGE_KEY}\n` +
        `Updated: ${new Date(state.meta.updatedAtMs || Date.now()).toLocaleString()}\n` +
        `Athletes: ${state.athletes.length}\n` +
        `Team sport: ${sportName(state.team?.sport)}`;
    }

    const roleSelect = $("roleSelect");
    const myAthSel = $("myAthleteSelect");
    if (roleSelect) roleSelect.value = state.meta.role || "coach";
    fillAthleteSelect(myAthSel, state.meta.myAthleteId);

    onceBind($("btnSaveRole"), "saveRole", () => {
      state.meta.role = String($("roleSelect")?.value || "coach");
      state.meta.myAthleteId = String($("myAthleteSelect")?.value || "");
      saveState();
      setText("roleNote", `Saved. Role=${state.meta.role}${state.meta.myAthleteId ? ` • MyAthlete=${athleteLabel(getAthlete(state.meta.myAthleteId))}` : ""}`);
      updateTopPills();
    });

    onceBind($("btnWipe"), "wipe", () => {
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

    state.team.name = state.team.name || "Default";
    state.team.sport = state.team.sport || "basketball";

    if (!state.athletes.length) {
      const a1 = { id: uid("ath"), name: "Jordan Smith", position: "PG", heightIn: 70, weightLb: 155, sport: "basketball" };
      const a2 = { id: uid("ath"), name: "Cam Johnson", position: "WR", heightIn: 72, weightLb: 165, sport: "football" };
      const a3 = { id: uid("ath"), name: "Avery Lee", position: "MF", heightIn: 74, weightLb: 175, sport: "soccer" };
      state.athletes.push(a1, a2, a3);
      [a1, a2, a3].forEach((a) => ensureTargetsForAthlete(a.id));
    }

    const athletes = state.athletes.slice(0, 3);
    const start = addDaysISO(todayISO(), -14);

    athletes.forEach((a, idx) => {
      for (let i = 0; i < 10; i++) {
        const d = addDaysISO(start, i);
        const minutes = 45 + ((i + idx) % 4) * 15;
        const rpe = 5 + ((i + idx) % 4);
        addTrainingSession(a.id, { id: uid("sess"), dateISO: d, minutes, rpe, type: "workout", notes: "Seed", load: minutes * rpe });
      }
      for (let i = 0; i < 10; i++) {
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
      for (let i = 0; i < 10; i++) {
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
    renderWorkouts();
    renderLog();
    updateTopPills();
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

    if ($("btnSeed") && !$("btnSeed").__piqBoundSeed) {
      $("btnSeed").__piqBoundSeed = true;
      $("btnSeed").addEventListener("click", seedDemo);
    }
    if ($("btnExport") && !$("btnExport").__piqBoundExport) {
      $("btnExport").__piqBoundExport = true;
      $("btnExport").addEventListener("click", exportJSON);
    }
    if ($("fileImport") && !$("fileImport").__piqBoundImport) {
      $("fileImport").__piqBoundImport = true;
      $("fileImport").addEventListener("change", (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        importJSON(file);
        e.target.value = "";
      });
    }

    // defaults
    if ($("dashDate")) $("dashDate").value = todayISO();
    if ($("riskDate")) $("riskDate").value = todayISO();

    updateTopPills();
    showView("dashboard");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
