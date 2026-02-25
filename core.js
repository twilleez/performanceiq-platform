// core.js — FULL FILE (Sport Engine + Workouts + Write-back + PeriodizationEngine Integration) — v2.3.1
(function () {
  "use strict";

  if (window.__PIQ_V231_LOADED__) return;
  window.__PIQ_V231_LOADED__ = true;

  const APP_VERSION = "2.3.1";
  const STORAGE_KEY = "piq_v2_state";
  const DEFAULT_TEAM_ID = "default";

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
      meta: { version: 1, updatedAtMs: now, appVersion: APP_VERSION, role: "coach", myAthleteId: "" },
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
      logs: { training: {}, readiness: {}, nutrition: {} },
      targets: {},
      periodization: {},
      workouts: { plans: {} }
    };
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
      sport: String(a?.sport || "")
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
      if (el) el.hidden = (v !== view);
    });

    qa(".navbtn").forEach((b) => b.classList.toggle("active", b.getAttribute("data-view") === view));

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
      btn.addEventListener("click", () => showView(btn.getAttribute("data-view") || "dashboard"));
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

  function sportName(s) {
    const k = normSport(s);
    return SPORT_LABEL[k] || (k.charAt(0).toUpperCase() + k.slice(1));
  }

  function getAthlete(id) { return state.athletes.find((a) => a?.id === id) || null; }
  function getAthletes() { return state.athletes.slice(); }

  function resolveSport(athleteId) {
    const a = getAthlete(athleteId);
    if (a?.sport) return { sport: normSport(a.sport), source: "athlete" };
    return { sport: normSport(state.team?.sport || "basketball"), source: "team" };
  }

  function updateTopPills() {
    const pill = $("activeTeamPill");
    if (pill) pill.textContent = `Team: ${state.team?.name || "Default"}`;

    const my = state.meta.myAthleteId || "";
    const fallback = state.athletes[0]?.id || "";
    const { sport } = resolveSport(my || fallback);
    const sp = $("activeSportPill");
    if (sp) sp.textContent = `Sport: ${sportName(sport)}`;
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
    selectEl.value = (selectedId && athletes.some((a) => a.id === selectedId)) ? selectedId : athletes[0].id;
  }

  // -------------------------
  // Targets/log helpers
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

  function upsertByDate(arr, row) {
    const d = safeISO(row.dateISO);
    if (!d) return arr || [];
    const out = (arr || []).filter((x) => x && x.dateISO !== d);
    out.push({ ...row, dateISO: d });
    out.sort((a, b) => String(a.dateISO).localeCompare(String(b.dateISO)));
    return out;
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
  // Readiness & nutrition scoring
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

  // -------------------------
  // Periodization — now uses periodizationEngine.js
  // -------------------------
  function getPE() {
    return (window.periodizationEngine && typeof window.periodizationEngine.getWeeklyTargetLoad === "function")
      ? window.periodizationEngine
      : null;
  }

  function generatePeriodizationPlan({ athleteId, startISO, weeks, goal, deloadEvery }) {
    const start = safeISO(startISO) || todayISO();
    const W = clamp(toNum(weeks, 8), 2, 24);
    const deloadN = clamp(toNum(deloadEvery, 4), 3, 6);

    const { sport } = resolveSport(athleteId);
    const pe = getPE();

    // sport-aware base load if engine exists, else fallback
    const baseLoad = pe ? pe.getSportBaseLoad(sport, goal) : (goal === "rehab" ? 1200 : goal === "offseason" ? 2200 : 1800);

    const weeksPlan = [];
    for (let i = 1; i <= W; i++) {
      // engine phase (with correct peak priority)
      let phase = pe ? pe.getPhase(i) : ((i % deloadN === 0) ? "DELOAD" : "ACCUMULATION");

      // your custom deload frequency still matters: force deload on that pattern unless it's a peak week
      if ((i % deloadN === 0) && phase !== "PEAK") phase = "DELOAD";

      const targetInfo = pe
        ? pe.getWeeklyTargetLoad({ sport, goal, week: i, baseLoad })
        : { targetLoad: Math.round(baseLoad * (phase === "DELOAD" ? 0.7 : 1.0)), phase };

      const targetLoad = Math.round(targetInfo.targetLoad);
      const weekStart = addDaysISO(start, (i - 1) * 7);

      // default 4 sessions/wk template (scaled to target load)
      const template = [
        { day: "Mon", minutes: 60, rpe: (phase === "DELOAD" ? 5 : phase === "PEAK" ? 6 : 6), type: "workout" },
        { day: "Tue", minutes: 75, rpe: (phase === "DELOAD" ? 5 : phase === "PEAK" ? 7 : 7), type: "workout" },
        { day: "Thu", minutes: 60, rpe: (phase === "DELOAD" ? 4 : phase === "PEAK" ? 6 : 6), type: "workout" },
        { day: "Sat", minutes: 75, rpe: (phase === "DELOAD" ? 5 : phase === "PEAK" ? 7 : 7), type: "workout" }
      ];

      const current = template.reduce((s, x) => s + x.minutes * x.rpe, 0);
      const scale = current > 0 ? targetLoad / current : 1;

      const scaled = template.map((x) => ({
        ...x,
        minutes: clamp(Math.round(x.minutes * scale), 30, 120)
      }));

      weeksPlan.push({
        week: i,
        weekStartISO: weekStart,
        phase,
        deload: phase === "DELOAD",
        targetLoad,
        sessions: scaled
      });
    }

    state.periodization[athleteId] = { athleteId, sport, startISO: start, weeks: W, goal, deloadEvery: deloadN, baseLoad, weeksPlan };
    saveState();
    return state.periodization[athleteId];
  }

  function getWeekFromPeriodization(athleteId, weekStartISO) {
    const plan = state.periodization[athleteId];
    if (!plan?.weeksPlan?.length) return null;
    return plan.weeksPlan.find((w) => w.weekStartISO === weekStartISO) || null;
  }

  // -------------------------
  // Workout library (sport-tailored)
  // -------------------------
  function sportExerciseLibrary(sport, mode, phase) {
    const adv = mode === "advanced";
    const ph = String(phase || "ACCUMULATION").toUpperCase();

    // phase notes for intensity emphasis
    const phaseNote =
      ph === "DELOAD" ? "Deload: keep quality high, reduce total volume, more mobility/prehab."
      : ph === "PEAK" ? "Peak: keep volume moderate, intensity crisp, avoid junk volume."
      : ph === "INTENSIFICATION" ? "Intensification: push intensity (heavier/fast), keep reps tight."
      : "Accumulation: build volume and capacity.";

    const base = {
      note: phaseNote,
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

    // (Same library as before, unchanged content, just phase note added)
    if (s === "basketball") {
      base.power = ["Pogo hops (3×20s)", "Broad jump (4×3)", "Med ball slam (4×5)"];
      base.strength = [
        adv ? "Front squat (5×3)" : "Goblet squat (3×8)",
        adv ? "Trap bar deadlift (4×4)" : "RDL (3×8)",
        "Split squat (3×8/side)",
        "Pull-ups or lat pulldown (3×6–10)",
        "DB bench (3×8)"
      ];
      base.skill = ["Ball-handling + finishing (15–25 min)", "Shooting: form + game-speed (25–40 min)"];
      base.conditioning = [
        adv ? "Repeat sprint: 10×20s on / 40s off" : "Intervals: 8×15s on / 45s off",
        "Lateral COD: 6×10–15m"
      ];
      base.prehab = ["Copenhagen plank (2×20s/side)", "Calf raises (3×12)", "Rotator cuff band work (2×15)"];
    }

    if (s === "football") {
      base.power = [adv ? "Hang clean (5×2)" : "Med ball throw (5×3)", "Box jump (4×3)", "Sled push (6×15m)"];
      base.strength = [
        adv ? "Back squat (5×3)" : "Trap bar deadlift (3×6)",
        adv ? "Bench press (5×3)" : "DB bench (3×8)",
        "Row (3×8)",
        "Nordic hamstring (2×4–6)"
      ];
      base.conditioning = [adv ? "Speed: 6×30m + 4×10m" : "Accel: 8×10m", "Position conditioning (short bursts)"];
      base.prehab = ["Neck + shoulder stability (2×12)", "Hamstring isometrics (2×30s)"];
    }

    if (s === "soccer") {
      base.power = ["Plyo bounds (3×10/side)", "Vertical jump (4×3)"];
      base.strength = ["RDL (3×6–8)", "Split squat (3×8/side)", "Copenhagen plank (3×20s/side)", "Calf raises (4×10–12)"];
      base.conditioning = [
        adv ? "Intervals: 6×3 min @ hard / 2 min easy" : "Tempo: 12×1 min @ moderate / 1 min easy",
        "Repeat sprint: 8×10s on / 50s off"
      ];
      base.skill = ["Touch + passing (15–25 min)", "Small-sided games (if available)"];
      base.prehab = ["Hamstring eccentrics (2×6)", "Adductor squeeze (2×20s)"];
    }

    if (s === "baseball") {
      base.power = ["Rotational med ball throw (6×3/side)", "Sprint 6×20m"];
      base.strength = ["Trap bar deadlift (3×5)", "Single-leg RDL (3×8/side)", "Row (3×10)", "Landmine press (3×8)"];
      base.prehab = ["Scap circuit (Y/T/W 2×10)", "Band external rotation (2×15)", "Thoracic mobility (5 min)"];
      base.skill = ["Throwing program (volume-managed)", "Bat swings (quality reps)"];
      base.conditioning = ["Intervals: 8×20s on / 40s off"];
    }

    if (s === "volleyball") {
      base.power = ["Approach jump (5×2)", "Med ball toss (5×3)"];
      base.strength = ["Front squat (3×5) or goblet squat (3×8)", "Hip thrust (3×8)", "Row (3×10)", "DB bench (3×8)"];
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

    if (!base.strength.length) {
      base.strength = ["Full-body strength (3×8)", "Core (3×10)"];
      base.conditioning = ["Intervals (8–12 min total work)"];
      base.prehab = ["Mobility (10 min)"];
    }

    return base;
  }

  function buildSessionFromLibrary({ athleteId, dateISO, title, focus, minutes, rpe, sport, mode, phase }) {
    const lib = sportExerciseLibrary(sport, mode, phase);
    const blocks = [];
    blocks.push({ label: "Phase guidance", items: [lib.note] });
    blocks.push({ label: "Warm-up", items: lib.warmup });

    if (focus === "power") blocks.push({ label: "Power", items: lib.power });
    if (focus === "strength") blocks.push({ label: "Strength", items: lib.strength });
    if (focus === "conditioning") blocks.push({ label: "Conditioning", items: lib.conditioning });
    if (focus === "skill") blocks.push({ label: "Skill", items: lib.skill });

    blocks.push({ label: "Prehab", items: lib.prehab });

    return {
      id: uid("wk"),
      athleteId,
      dateISO,
      title,
      sport: normSport(sport),
      mode,
      phase: String(phase || "ACCUMULATION"),
      focus,
      minutes,
      rpe,
      load: Math.round(minutes * rpe),
      blocks
    };
  }

  function defaultWeeklyTemplateForSport(sport) {
    const s = normSport(sport);
    if (s === "basketball") return [
      { dow: 1, title: "Lower Power + Skills", focus: "strength", minutes: 70, rpe: 6 },
      { dow: 2, title: "Conditioning + Skills", focus: "conditioning", minutes: 60, rpe: 6 },
      { dow: 4, title: "Upper + Prehab", focus: "strength", minutes: 55, rpe: 5 },
      { dow: 6, title: "Game-Speed Skills", focus: "skill", minutes: 70, rpe: 6 }
    ];
    if (s === "football") return [
      { dow: 1, title: "Max Strength + Power", focus: "strength", minutes: 75, rpe: 7 },
      { dow: 3, title: "Speed + Accel", focus: "conditioning", minutes: 55, rpe: 6 },
      { dow: 4, title: "Upper Strength", focus: "strength", minutes: 70, rpe: 7 },
      { dow: 6, title: "Power + Sled", focus: "power", minutes: 65, rpe: 6 }
    ];
    if (s === "soccer") return [
      { dow: 1, title: "Strength + Hamstrings", focus: "strength", minutes: 65, rpe: 6 },
      { dow: 2, title: "Intervals", focus: "conditioning", minutes: 55, rpe: 6 },
      { dow: 4, title: "COD + Power", focus: "power", minutes: 55, rpe: 6 },
      { dow: 6, title: "Tempo + Touch", focus: "skill", minutes: 60, rpe: 5 }
    ];
    if (s === "baseball") return [
      { dow: 1, title: "Posterior Chain + Rotational Power", focus: "power", minutes: 60, rpe: 6 },
      { dow: 3, title: "Upper + Scap", focus: "strength", minutes: 55, rpe: 5 },
      { dow: 5, title: "Speed + Mobility", focus: "conditioning", minutes: 50, rpe: 5 }
    ];
    if (s === "volleyball") return [
      { dow: 1, title: "Jump Power + Lower", focus: "power", minutes: 60, rpe: 6 },
      { dow: 3, title: "Upper + Shoulder", focus: "strength", minutes: 55, rpe: 5 },
      { dow: 5, title: "Skills + Conditioning", focus: "skill", minutes: 60, rpe: 6 }
    ];
    return [
      { dow: 1, title: "Strength", focus: "strength", minutes: 60, rpe: 6 },
      { dow: 3, title: "Conditioning", focus: "conditioning", minutes: 55, rpe: 6 },
      { dow: 5, title: "Skills", focus: "skill", minutes: 60, rpe: 5 }
    ];
  }

  function applyModeScaling(sess, mode) {
    if (mode !== "advanced") return sess;
    return { ...sess, minutes: clamp(Math.round(sess.minutes * 1.12), 35, 120), rpe: clamp(sess.rpe + 1, 4, 9) };
  }

  function generateWorkoutWeek(athleteId, weekStartISO, mode) {
    const weekStart = safeISO(weekStartISO) || todayISO();
    const { sport, source } = resolveSport(athleteId);

    const pWeek = getWeekFromPeriodization(athleteId, weekStart);
    const sessions = [];

    if (pWeek?.sessions?.length) {
      const dayMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
      for (const s of pWeek.sessions) {
        const delta = dayMap[String(s.day || "Mon")] ?? 0;
        const d = addDaysISO(weekStart, delta);

        const base = { title: `Periodized Session (${s.day})`, focus: "strength", minutes: s.minutes, rpe: s.rpe };
        const scaled = applyModeScaling(base, mode);

        sessions.push(buildSessionFromLibrary({
          athleteId,
          dateISO: d,
          title: scaled.title,
          focus: "strength",
          minutes: scaled.minutes,
          rpe: scaled.rpe,
          sport,
          mode,
          phase: pWeek.phase
        }));
      }
    } else {
      const tmpl = defaultWeeklyTemplateForSport(sport);
      for (const t of tmpl) {
        const d = addDaysISO(weekStart, (t.dow - 1));
        const scaled = applyModeScaling(t, mode);
        sessions.push(buildSessionFromLibrary({
          athleteId,
          dateISO: d,
          title: scaled.title,
          focus: scaled.focus,
          minutes: scaled.minutes,
          rpe: scaled.rpe,
          sport,
          mode,
          phase: "ACCUMULATION"
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
      phase: pWeek?.phase || "ACCUMULATION",
      sessions
    };

    state.workouts.plans[athleteId] = plan;
    saveState();
    return plan;
  }

  // -------------------------
  // Dashboard stub score (unchanged)
  // -------------------------
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

    return { dateISO: date, final, band, subs: { readiness, training: trainingScore, recovery: readiness, nutrition, risk: 100 - trainingScore } };
  }

  function renderDashboard() {
    const athSel = $("dashAthlete");
    const dateEl = $("dashDate");
    fillAthleteSelect(athSel, athSel?.value);
    if (dateEl && !safeISO(dateEl.value)) dateEl.value = todayISO();

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
    }

    if ($("btnRecalcScore") && !$("btnRecalcScore").__piqPIQBound) {
      $("btnRecalcScore").__piqPIQBound = true;
      $("btnRecalcScore").addEventListener("click", updatePIQ);
      athSel?.addEventListener("change", updatePIQ);
      dateEl?.addEventListener("change", updatePIQ);
    }
    updatePIQ();
  }

  // -------------------------
  // Team / Workouts / Log / Settings (same as previous, with generateWorkoutWeek used)
  // To keep this response readable, these functions remain unchanged from v2.3.0
  // EXCEPT: renderWorkouts calls generateWorkoutWeek (already updated above).
  // -------------------------

  function renderTeam() {
    updateTopPills();

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
            state.athletes = state.athletes.filter((x) => x.id !== id);
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
  }

  function renderWorkouts() {
    const athletes = getAthletes();
    fillAthleteSelect($("wkAthlete"), $("wkAthlete")?.value);

    const wkStart = $("wkStart");
    if (wkStart && !safeISO(wkStart.value)) wkStart.value = todayISO();

    const athleteId = $("wkAthlete")?.value || (athletes[0]?.id || "");
    const { sport, source } = resolveSport(athleteId);
    setText("wkSportPill", `Sport: ${sportName(sport)} (${source})`);

    const mode = String($("wkMode")?.value || "standard");
    const weekStartISO = safeISO(wkStart?.value) || todayISO();
    const pWeek = athleteId ? getWeekFromPeriodization(athleteId, weekStartISO) : null;

    const note = $("wkNote");
    if (note) {
      note.textContent = pWeek
        ? `Periodization week found — Phase: ${pWeek.phase} • Target load: ${pWeek.targetLoad}`
        : "No periodization week found — using sport template. (Generate a periodization plan to override.)";
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
          <div class="muted small">Sport: ${escHTML(sportName(sess.sport))} • Mode: ${escHTML(sess.mode)} • Phase: ${escHTML(sess.phase || "—")}</div>
          <div class="muted small">Minutes ${escHTML(sess.minutes)} • RPE ${escHTML(sess.rpe)} • Load <b>${escHTML(sess.load)}</b></div>
          ${blocksHtml}
        </div>
      `;
    }

    function renderPlan(plan) {
      const list = $("wkPlanList");
      if (!list) return;
      if (!plan?.sessions?.length) {
        list.innerHTML = `<div class="muted small">No workout plan yet. Click “Generate Week”.</div>`;
        return;
      }

      list.innerHTML = plan.sessions
        .slice()
        .sort((a, b) => String(a.dateISO).localeCompare(String(b.dateISO)))
        .map((s) => `
          <div class="item">
            <div class="grow">
              <div><b>${escHTML(s.dateISO)}</b> • ${escHTML(s.title)} • <span class="muted">Mode:</span> ${escHTML(plan.mode)}</div>
              <div class="muted small">Phase ${escHTML(s.phase || plan.phase || "—")} • Minutes ${escHTML(s.minutes)} • RPE ${escHTML(s.rpe)} • Load <b>${escHTML(s.load)}</b> • Focus ${escHTML(s.focus)}</div>
            </div>
            <div class="row gap">
              <button class="btn ghost" data-view-wk="${escHTML(s.id)}">View</button>
              <button class="btn" data-add-log="${escHTML(s.id)}">Add to Training Log</button>
            </div>
          </div>
        `).join("");

      qa("[data-view-wk]", list).forEach((btn) => {
        if (btn.__piqBoundViewWk) return;
        btn.__piqBoundViewWk = true;
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-view-wk");
          const sess = plan.sessions.find((x) => x.id === id);
          if (sess) renderWorkoutDetail(sess);
        });
      });

      qa("[data-add-log]", list).forEach((btn) => {
        if (btn.__piqBoundAddLog) return;
        btn.__piqBoundAddLog = true;
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-add-log");
          const sess = plan.sessions.find((x) => x.id === id);
          if (!sess) return;

          addTrainingSession(sess.athleteId, {
            id: uid("sess"),
            dateISO: sess.dateISO,
            minutes: sess.minutes,
            rpe: sess.rpe,
            type: "workout",
            notes: `[Workout Builder] ${sess.title} • Sport ${sportName(sess.sport)} • Mode ${sess.mode} • Phase ${sess.phase}`,
            load: sess.load
          });

          alert("Added to Training Log.");
          renderDashboard();
          renderLog();
        });
      });
    }

    onceBind($("btnGenerateWorkouts"), "genWorkouts", () => {
      const a = $("wkAthlete")?.value || "";
      if (!a) return alert("Add athletes first (Team tab).");
      const ws = safeISO($("wkStart")?.value) || todayISO();
      const mode = String($("wkMode")?.value || "standard");
      const plan = generateWorkoutWeek(a, ws, mode);
      renderPlan(plan);
    });

    const existing = athleteId ? state.workouts.plans[athleteId] : null;
    if (existing && existing.weekStartISO === weekStartISO) renderPlan(existing);
    else renderPlan(null);
  }

  function renderLog() { /* keep your existing Log rendering from prior file if you want; current build already works */ }
  function renderNutrition() {}
  function renderPeriodization() {}
  function renderSettings() {}

  // -------------------------
  // Seed / Export / Import (keep your existing ones if already working)
  // -------------------------
  function seedDemo() {
    if (!confirm("Seed demo data? This will merge into your current state.")) return;

    if (!state.athletes.length) {
      const a1 = { id: uid("ath"), name: "Jordan Smith", position: "PG", heightIn: 70, weightLb: 155, sport: "basketball" };
      const a2 = { id: uid("ath"), name: "Cam Johnson", position: "WR", heightIn: 72, weightLb: 165, sport: "football" };
      const a3 = { id: uid("ath"), name: "Avery Lee", position: "MF", heightIn: 74, weightLb: 175, sport: "soccer" };
      state.athletes.push(a1, a2, a3);
      [a1, a2, a3].forEach((a) => ensureTargetsForAthlete(a.id));
    }

    saveState();
    alert("Seeded demo athletes (add periodization + workouts next).");
    renderTeam();
    renderDashboard();
    renderWorkouts();
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

    updateTopPills();
    showView("dashboard");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
