// core.js — v3.0.0 (Production hardening + role views + onboarding + sport engine + workouts)
// Offline-first • Defensive DOM • Works even if optional engines (nutrition/periodization/sport/supabase) are missing.

(function () {
  "use strict";
  if (window.__PIQ_CORE_V3__) return;
  window.__PIQ_CORE_V3__ = true;

  // -----------------------------
  // Tiny helpers
  // -----------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const todayISO = () => new Date().toISOString().slice(0, 10);

  function safeText(el, v) {
    if (!el) return;
    el.textContent = v;
  }
  function safeHTML(el, v) {
    if (!el) return;
    el.innerHTML = v;
  }
  function safeValue(el, v) {
    if (!el) return;
    el.value = v;
  }
  function show(el, on = true) {
    if (!el) return;
    el.hidden = !on ? true : false;
    el.style.display = on ? "" : "none";
  }

  // -----------------------------
  // Storage (uses dataStore.js if present; falls back to localStorage)
  // -----------------------------
  const LS_KEY = "piq_state_v3";
  const ENT_KEY = "piq_entitlements_v1";

  function lsGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  function lsSet(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }

  const store = (() => {
    const ds = window.dataStore;
    const hasDS =
      ds &&
      (typeof ds.getState === "function" || typeof ds.load === "function") &&
      (typeof ds.setState === "function" || typeof ds.save === "function");

    function get() {
      if (hasDS) {
        try {
          if (typeof ds.getState === "function") return ds.getState();
          if (typeof ds.load === "function") return ds.load();
        } catch {}
      }
      return lsGet(LS_KEY, null);
    }

    function set(next) {
      if (hasDS) {
        try {
          if (typeof ds.setState === "function") return ds.setState(next);
          if (typeof ds.save === "function") return ds.save(next);
        } catch {}
      }
      lsSet(LS_KEY, next);
    }

    function wipe() {
      if (hasDS && typeof ds.wipe === "function") {
        try {
          ds.wipe();
          return;
        } catch {}
      }
      try {
        localStorage.removeItem(LS_KEY);
      } catch {}
    }

    function exportJSON() {
      const s = get() || defaultState();
      return JSON.stringify(s, null, 2);
    }

    function importJSON(obj) {
      const next = normalizeState(obj || {});
      set(next);
      return next;
    }

    return { get, set, wipe, exportJSON, importJSON };
  })();

  // -----------------------------
  // Entitlements / roles
  // -----------------------------
  function getEntitlements() {
    return lsGet(ENT_KEY, { elite: false });
  }
  function setEntitlements(next) {
    lsSet(ENT_KEY, next);
  }

  // -----------------------------
  // Data model
  // -----------------------------
  function uuid() {
    // good enough for client-side IDs
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function defaultState() {
    const teamId = uuid();
    return normalizeState({
      version: "3.0.0",
      ui: {
        activeView: "dashboard",
        role: "coach", // 'coach' | 'athlete'
        onboardingComplete: false,
        device: detectDevice(),
      },
      activeTeamId: teamId,
      teams: [
        {
          id: teamId,
          name: "Default",
          seasonStart: "",
          seasonEnd: "",
          sport: "basketball",
          macroDefaults: { protein: 160, carbs: 240, fat: 70, water: 100 },
          weights: { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 },
        },
      ],
      athletes: [],
      logs: {
        training: [],
        readiness: [],
        nutrition: [],
        workouts: [], // completed workouts (Today’s Workout)
      },
      plans: {
        periodization: [], // generated plans
        workoutsTemplates: {}, // per sport templates
      },
    });
  }

  function normalizeState(s) {
    const base = s && typeof s === "object" ? s : {};
    const out = {
      version: base.version || "3.0.0",
      ui: Object.assign(
        {
          activeView: "dashboard",
          role: "coach",
          onboardingComplete: false,
          device: detectDevice(),
        },
        base.ui || {}
      ),
      activeTeamId: base.activeTeamId || (base.teams && base.teams[0] && base.teams[0].id) || uuid(),
      teams: Array.isArray(base.teams) && base.teams.length ? base.teams : [],
      athletes: Array.isArray(base.athletes) ? base.athletes : [],
      logs: Object.assign(
        { training: [], readiness: [], nutrition: [], workouts: [] },
        base.logs || {}
      ),
      plans: Object.assign(
        { periodization: [], workoutsTemplates: {} },
        base.plans || {}
      ),
    };

    if (!out.teams.length) {
      const tid = out.activeTeamId || uuid();
      out.activeTeamId = tid;
      out.teams = [
        {
          id: tid,
          name: "Default",
          seasonStart: "",
          seasonEnd: "",
          sport: "basketball",
          macroDefaults: { protein: 160, carbs: 240, fat: 70, water: 100 },
          weights: { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 },
        },
      ];
    }
    if (!out.activeTeamId) out.activeTeamId = out.teams[0].id;

    // ensure team fields
    out.teams = out.teams.map((t) => ({
      id: t.id || uuid(),
      name: t.name || "Team",
      seasonStart: t.seasonStart || "",
      seasonEnd: t.seasonEnd || "",
      sport: t.sport || "basketball",
      macroDefaults: Object.assign({ protein: 160, carbs: 240, fat: 70, water: 100 }, t.macroDefaults || {}),
      weights: Object.assign({ readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 }, t.weights || {}),
    }));

    // ensure athletes fields
    out.athletes = out.athletes.map((a) => ({
      id: a.id || uuid(),
      teamId: a.teamId || out.activeTeamId,
      name: a.name || "Athlete",
      position: a.position || "",
      heightIn: Number(a.heightIn || a.height || 0) || 0,
      weightLb: Number(a.weightLb || a.weight || 0) || 0,
      sport: a.sport || "", // optional per-athlete sport override
      targets: Object.assign({ protein: null, carbs: null, fat: null, water: null }, a.targets || {}),
    }));

    // ensure logs arrays
    out.logs.training = Array.isArray(out.logs.training) ? out.logs.training : [];
    out.logs.readiness = Array.isArray(out.logs.readiness) ? out.logs.readiness : [];
    out.logs.nutrition = Array.isArray(out.logs.nutrition) ? out.logs.nutrition : [];
    out.logs.workouts = Array.isArray(out.logs.workouts) ? out.logs.workouts : [];

    // ensure plans
    out.plans.periodization = Array.isArray(out.plans.periodization) ? out.plans.periodization : [];
    out.plans.workoutsTemplates = out.plans.workoutsTemplates && typeof out.plans.workoutsTemplates === "object"
      ? out.plans.workoutsTemplates
      : {};

    return out;
  }

  function getState() {
    return normalizeState(store.get() || defaultState());
  }
  function setState(mutator) {
    const s = getState();
    const next = typeof mutator === "function" ? mutator(structuredClone(s)) : normalizeState(mutator);
    store.set(next);
    return next;
  }

  function activeTeam(state) {
    return state.teams.find((t) => t.id === state.activeTeamId) || state.teams[0];
  }

  // -----------------------------
  // Device detection + responsive flags
  // -----------------------------
  function detectDevice() {
    const w = window.innerWidth || 0;
    const h = window.innerHeight || 0;
    const ua = navigator.userAgent || "";
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const size =
      w < 520 ? "xs" : w < 768 ? "sm" : w < 1024 ? "md" : w < 1280 ? "lg" : "xl";
    return { w, h, size, isTouch, ua: ua.slice(0, 120) };
  }

  function applyDeviceClass() {
    const d = detectDevice();
    document.body.dataset.deviceSize = d.size;
    document.body.dataset.touch = d.isTouch ? "1" : "0";
    setState((s) => {
      s.ui.device = d;
      return s;
    });
  }

  // -----------------------------
  // Sport Engine (built-in fallback; overrides if window.sportEngine exists)
  // -----------------------------
  const fallbackSportEngine = (() => {
    const SPORTS = [
      { id: "basketball", name: "Basketball" },
      { id: "football", name: "Football" },
      { id: "soccer", name: "Soccer" },
      { id: "baseball", name: "Baseball" },
      { id: "volleyball", name: "Volleyball" },
      { id: "track", name: "Track/Sprint" },
    ];

    // Minimal templates (Standard + Advanced) — tuned to sRPE load + sport needs
    const TEMPLATES = {
      basketball: {
        standard: [
          day("Mon", "Lower + Shoulders + Core", [
            ex("Back Squat", "3×6", "RPE 7"),
            ex("DB Split Squat", "3×8/leg", "controlled"),
            ex("Standing DB Press", "3×8", "RPE 7"),
            ex("Lateral Raise", "3×12", "burn"),
            ex("Core: Dead Bug", "3×10/side", ""),
            ex("Core: Pallof Press", "3×10/side", ""),
          ], 60, 6),
          day("Tue", "Chest + Triceps", [
            ex("Bench Press", "3×6", "RPE 7"),
            ex("Incline DB Press", "3×8", ""),
            ex("Push-ups", "2×AMRAP", ""),
            ex("Cable/DB Triceps Pressdown", "3×12", ""),
          ], 55, 6),
          day("Wed", "Legs + Core (lighter)", [
            ex("Trap Bar Deadlift", "3×5", "RPE 7"),
            ex("RDL", "3×8", ""),
            ex("Calf Raises", "3×12", ""),
            ex("Core: Plank", "3×45s", ""),
          ], 55, 5),
          day("Thu", "Back + Biceps", [
            ex("Pull-ups (assisted ok)", "3×6–10", ""),
            ex("1-Arm DB Row", "3×10/side", ""),
            ex("Face Pull", "3×12", ""),
            ex("DB Curl", "3×10", ""),
          ], 55, 6),
          day("Fri", "Court Skill/Conditioning", [
            ex("Form shooting", "15 min", ""),
            ex("Ball-handling", "15 min", ""),
            ex("Conditioning intervals", "10–15 min", "on-court"),
          ], 45, 6),
        ],
        advanced: [
          day("Mon", "Lower Strength + Elasticity", [
            ex("Back Squat", "5×3", "RPE 8"),
            ex("Nordic/Assisted Ham Curl", "3×6", ""),
            ex("Depth Jump", "4×3", "quality"),
            ex("Sled Push", "6×15m", "fast"),
            ex("Core: Hanging Knee Raise", "3×10", ""),
          ], 70, 7),
          day("Tue", "Upper Strength + Scap", [
            ex("Bench Press", "5×3", "RPE 8"),
            ex("Weighted Pull-up", "4×4–6", ""),
            ex("Landmine Press", "3×8/side", ""),
            ex("Face Pull", "3×15", ""),
            ex("Triceps Dips", "3×8", ""),
          ], 70, 7),
          day("Wed", "Speed + COD", [
            ex("Acceleration Sprints", "6×20m", "full rest"),
            ex("Pro-Agility", "6 reps", ""),
            ex("Lateral Bound", "4×4/side", ""),
            ex("Mobility + tissue", "15 min", ""),
          ], 55, 6),
          day("Thu", "Lower Power + Posterior", [
            ex("Trap Bar Deadlift", "4×3", "RPE 8"),
            ex("RDL", "3×6", "RPE 7–8"),
            ex("Box Jump", "5×2", "quality"),
            ex("Calf ISO + pogo", "3 rounds", ""),
            ex("Core: Pallof Press", "3×12/side", ""),
          ], 70, 7),
          day("Fri", "Court: High intensity", [
            ex("Shooting under fatigue", "20 min", ""),
            ex("1v1/2v2 constraints", "20 min", ""),
            ex("Conditioning: 10× (15s on/45s off)", "10 min", ""),
          ], 60, 7),
        ],
      },
      football: {
        standard: [
          day("Mon", "Lower Strength", [
            ex("Back Squat", "4×5", "RPE 7"),
            ex("RDL", "3×8", ""),
            ex("Split Squat", "3×8/leg", ""),
            ex("Core: Plank", "3×45s", ""),
          ], 60, 6),
          day("Tue", "Upper Strength", [
            ex("Bench Press", "4×5", "RPE 7"),
            ex("Row", "3×10", ""),
            ex("Shoulder prehab", "10 min", ""),
            ex("Triceps", "3×12", ""),
          ], 60, 6),
          day("Wed", "Speed/Agility", [
            ex("Sprints", "8×20m", "full rest"),
            ex("Ladder/Footwork", "10 min", ""),
            ex("Med Ball Throws", "4×5", ""),
          ], 45, 6),
        ],
        advanced: [
          day("Mon", "Lower Max Strength", [
            ex("Back Squat", "5×3", "RPE 8"),
            ex("Trap Bar Deadlift", "4×3", "RPE 8"),
            ex("Nordic/ham", "3×6", ""),
            ex("Sled Push", "8×10m", ""),
          ], 75, 7),
          day("Tue", "Upper Power", [
            ex("Bench Press", "6×2", "RPE 8"),
            ex("Weighted Pull-up", "4×5", ""),
            ex("Push Press", "4×3", ""),
            ex("Neck + trunk", "10 min", ""),
          ], 75, 7),
          day("Wed", "Speed/COD", [
            ex("Acceleration", "8×10–20m", ""),
            ex("COD drills", "10–15 min", ""),
            ex("Jumps", "4×3", ""),
          ], 55, 6),
        ],
      },
      soccer: {
        standard: [
          day("Mon", "Lower + Core", [ex("Front Squat", "3×6", ""), ex("RDL", "3×8", ""), ex("Core", "10 min", "")], 55, 6),
          day("Tue", "Aerobic + Technique", [ex("Tempo runs", "20–25 min", ""), ex("Ball work", "20 min", "")], 50, 6),
          day("Thu", "Speed + Upper", [ex("Sprints", "6×30m", ""), ex("Rows + push", "20 min", "")], 50, 6),
        ],
        advanced: [
          day("Mon", "Lower Strength", [ex("Trap Bar Deadlift", "4×3", "RPE 8"), ex("Split Squat", "3×6/leg", ""), ex("Calf/soleus", "3×12", "")], 65, 7),
          day("Tue", "Repeat Sprint", [ex("RSA", "2–3 sets", "work:rest 1:5"), ex("Ball under fatigue", "20 min", "")], 60, 7),
          day("Thu", "Speed/COD", [ex("Sprints", "8×20m", ""), ex("COD", "12 min", ""), ex("Jumps", "4×3", "")], 55, 6),
        ],
      },
    };

    function ex(name, sets, notes) {
      return { name, sets, notes };
    }
    function day(code, title, exercises, minutes, srpe) {
      return { code, title, exercises, minutes, srpe };
    }

    function listSports() {
      return SPORTS.slice();
    }
    function getTemplate(sportId, level) {
      const s = (sportId || "basketball").toLowerCase();
      const lvl = level === "advanced" ? "advanced" : "standard";
      const tpl = (TEMPLATES[s] && TEMPLATES[s][lvl]) || (TEMPLATES.basketball && TEMPLATES.basketball[lvl]);
      return Array.isArray(tpl) ? tpl : [];
    }

    return { listSports, getTemplate };
  })();

  function sportEngine() {
    return window.sportEngine && typeof window.sportEngine.getTemplate === "function"
      ? window.sportEngine
      : fallbackSportEngine;
  }

  // -----------------------------
  // Nutrition Engine (fallback scoring)
  // -----------------------------
  function calcNutritionAdherence(actual, target) {
    // simple distance-based adherence score 0–100
    const aP = Number(actual.protein || 0), aC = Number(actual.carbs || 0), aF = Number(actual.fat || 0), aW = Number(actual.water || 0);
    const tP = Number(target.protein || 0), tC = Number(target.carbs || 0), tF = Number(target.fat || 0), tW = Number(target.water || 0);

    function sub(a, t) {
      if (!t) return 100;
      const diff = Math.abs(a - t);
      const pct = clamp(1 - diff / Math.max(t, 1), 0, 1);
      return Math.round(pct * 100);
    }
    const p = sub(aP, tP), c = sub(aC, tC), f = sub(aF, tF), w = sub(aW, tW);
    return Math.round((p * 0.35 + c * 0.35 + f * 0.2 + w * 0.1));
  }

  // -----------------------------
  // Periodization Engine (fallback)
  // -----------------------------
  const period = (() => {
    const pe = window.periodizationEngine;
    const has = pe && typeof pe.getCurrentPhase === "function" && typeof pe.adjustVolume === "function";
    function getPhase(week) {
      if (has) return pe.getCurrentPhase(week);
      if (week % 8 === 0) return "PEAK";
      if (week % 4 === 0) return "DELOAD";
      return "ACCUMULATION";
    }
    function adjust(base, phase) {
      if (has) return pe.adjustVolume(base, phase);
      if (phase === "DELOAD") return base * 0.6;
      if (phase === "PEAK") return base * 0.75;
      if (phase === "INTENSIFICATION") return base * 0.9;
      if (phase === "ACCUMULATION") return base * 1.1;
      return base;
    }
    return { getPhase, adjust };
  })();

  // -----------------------------
  // UI Injection: Workouts view + sport picker (if missing in HTML)
  // -----------------------------
  function ensureWorkoutsView() {
    // If nav has "Workouts" button already, keep it. If not, inject.
    const nav = $(".nav");
    const content = $(".content");
    if (!nav || !content) return;

    const hasBtn = $(`.navbtn[data-view="workouts"]`, nav);
    if (!hasBtn) {
      const btn = document.createElement("button");
      btn.className = "navbtn";
      btn.dataset.view = "workouts";
      btn.textContent = "Workouts";
      // Insert before Periodization if present, else before Settings
      const per = $(`.navbtn[data-view="periodization"]`, nav);
      const set = $(`.navbtn[data-view="settings"]`, nav);
      if (per) nav.insertBefore(btn, per);
      else if (set) nav.insertBefore(btn, set);
      else nav.appendChild(btn);
    }

    const hasView = byId("view-workouts");
    if (!hasView) {
      const section = document.createElement("section");
      section.className = "view";
      section.id = "view-workouts";
      section.setAttribute("data-view", "");
      section.hidden = true;
      section.innerHTML = `
        <div class="grid2">
          <div class="card">
            <div class="cardhead">
              <h2>Workouts</h2>
              <span class="muted">Sport-tailored plan • Standard vs Advanced</span>
            </div>

            <div class="row gap wrap">
              <div class="field">
                <label>Athlete</label>
                <select id="woAthlete"></select>
              </div>

              <div class="field">
                <label>Sport</label>
                <select id="woSport"></select>
              </div>

              <div class="field">
                <label>Level</label>
                <select id="woLevel">
                  <option value="standard">Standard</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div class="field">
                <label>Date</label>
                <input id="woDate" type="date" />
              </div>

              <div class="field">
                <label>&nbsp;</label>
                <button class="btn" id="btnLoadTodayWorkout">Load Today</button>
              </div>
            </div>

            <div class="mini" style="margin-top:12px">
              <div class="minihead">Today’s Workout</div>
              <div class="minibody" id="todayWorkoutOut">—</div>
            </div>

            <div class="row gap wrap" style="margin-top:12px">
              <div class="field">
                <label>Minutes</label>
                <input id="woMinutes" type="number" min="10" max="240" value="60" />
              </div>
              <div class="field">
                <label>sRPE (0–10)</label>
                <input id="woSrpe" type="number" min="0" max="10" step="1" value="6" />
              </div>
              <div class="field">
                <label>&nbsp;</label>
                <button class="btn" id="btnSaveWorkoutDone">Mark Complete</button>
              </div>
            </div>

            <div class="mini">
              <div class="minihead">Computed Load</div>
              <div class="minibody mono small" id="woLoadComputed">Load: —</div>
            </div>
          </div>

          <div class="card">
            <div class="cardhead">
              <h2>History</h2>
              <span class="muted">Completed workouts (write-back)</span>
            </div>
            <div class="list" id="workoutsList"></div>
          </div>
        </div>
      `;
      content.appendChild(section);
    }
  }

  function ensureSportPickerInTeamSettings() {
    // Adds sport picker into TEAM settings card if not present (safe injection)
    const teamView = byId("view-team");
    if (!teamView) return;
    const teamCard = $(".card", teamView);
    if (!teamCard) return;

    if (byId("teamSport")) return; // already exists
    // Find "Team name" field row
    const row = $(".row.gap.wrap", teamView);
    if (!row) return;

    const field = document.createElement("div");
    field.className = "field";
    field.innerHTML = `
      <label>Sport</label>
      <select id="teamSport"></select>
    `;
    row.insertBefore(field, row.children[1] || null);
  }

  // -----------------------------
  // Rendering utilities
  // -----------------------------
  function renderSelect(el, options, selected) {
    if (!el) return;
    el.innerHTML = "";
    options.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      el.appendChild(o);
    });
    if (selected != null) el.value = String(selected);
  }

  function teamAthletes(state) {
    return state.athletes.filter((a) => a.teamId === state.activeTeamId);
  }

  function ensureDefaultAthlete(state) {
    const list = teamAthletes(state);
    if (list.length) return state;
    // Create a default athlete for UX so dashboards don't look empty
    const a = {
      id: uuid(),
      teamId: state.activeTeamId,
      name: "Demo Athlete",
      position: "PG",
      heightIn: 70,
      weightLb: 150,
      sport: "",
      targets: { protein: null, carbs: null, fat: null, water: null },
    };
    state.athletes.push(a);
    return state;
  }

  function pickTargets(state, athleteId) {
    const t = activeTeam(state);
    const a = state.athletes.find((x) => x.id === athleteId);
    const md = t.macroDefaults || { protein: 160, carbs: 240, fat: 70, water: 100 };
    const at = (a && a.targets) || {};
    return {
      protein: Number(at.protein ?? md.protein ?? 0) || 0,
      carbs: Number(at.carbs ?? md.carbs ?? 0) || 0,
      fat: Number(at.fat ?? md.fat ?? 0) || 0,
      water: Number(at.water ?? md.water ?? 0) || 0,
    };
  }

  function getAthleteSport(state, athleteId) {
    const t = activeTeam(state);
    const a = state.athletes.find((x) => x.id === athleteId);
    return (a && a.sport) || t.sport || "basketball";
  }

  // -----------------------------
  // Role-based visibility
  // -----------------------------
  function applyRoleUI(state) {
    const role = state.ui.role || "coach";
    const nav = $(".nav");
    if (!nav) return;

    // Athlete mode: keep it clean
    const athleteAllowed = new Set(["dashboard", "log", "nutrition", "workouts", "periodization", "settings"]);
    $$(".navbtn", nav).forEach((btn) => {
      const v = btn.dataset.view;
      if (!v) return;
      if (role === "athlete") btn.style.display = athleteAllowed.has(v) ? "" : "none";
      else btn.style.display = "";
    });

    // Ensure athlete can see nutrition + periodization as requested
    // (no further hiding)
  }

  // -----------------------------
  // Navigation / Views
  // -----------------------------
  function setView(viewName) {
    setState((s) => {
      s.ui.activeView = viewName;
      return s;
    });

    const views = $$(`section.view[data-view]`);
    views.forEach((v) => {
      const name = (v.id || "").replace("view-", "");
      v.hidden = name !== viewName;
    });

    const nav = $(".nav");
    if (nav) {
      $$(".navbtn", nav).forEach((b) => {
        b.classList.toggle("active", b.dataset.view === viewName);
      });
    }

    // Render on view switch
    renderAll();
  }

  // -----------------------------
  // Splash handling (always hides, even if render fails)
  // -----------------------------
  function hideSplash() {
    const splash = byId("splash");
    if (!splash) return;
    splash.classList.add("hidden");
    splash.setAttribute("aria-hidden", "true");
    // remove after animation
    setTimeout(() => {
      try { splash.remove(); } catch {}
    }, 600);
  }

  // -----------------------------
  // Dashboard rendering (defensive)
  // -----------------------------
  function renderDashboard(state) {
    // dropdowns
    const athletes = teamAthletes(state);
    const options = athletes.map((a) => ({ value: a.id, label: a.name }));

    const dashAthlete = byId("dashAthlete");
    const riskAthlete = byId("riskAthlete");
    if (dashAthlete) {
      if (!dashAthlete.value && options[0]) dashAthlete.value = options[0].value;
      renderSelect(dashAthlete, options, dashAthlete.value || (options[0] && options[0].value));
    }
    if (riskAthlete) {
      if (!riskAthlete.value && options[0]) riskAthlete.value = options[0].value;
      renderSelect(riskAthlete, options, riskAthlete.value || (options[0] && options[0].value));
    }

    const dashDate = byId("dashDate");
    const riskDate = byId("riskDate");
    if (dashDate && !dashDate.value) dashDate.value = todayISO();
    if (riskDate && !riskDate.value) riskDate.value = todayISO();

    // compute PIQ score (simple, transparent)
    const athleteId = dashAthlete ? dashAthlete.value : (options[0] && options[0].value);
    const date = dashDate ? dashDate.value : todayISO();

    const sub = computeSubScores(state, athleteId, date);
    const t = activeTeam(state);
    const w = t.weights || { readiness: 30, training: 25, recovery: 20, nutrition: 15, risk: 10 };
    const totalW = (w.readiness + w.training + w.recovery + w.nutrition + w.risk) || 100;

    const piq =
      (sub.readiness * w.readiness +
        sub.training * w.training +
        sub.recovery * w.recovery +
        sub.nutrition * w.nutrition +
        sub.risk * w.risk) / totalW;

    safeText(byId("piqScore"), isFinite(piq) ? Math.round(piq) : "—");
    safeText(byId("piqBand"), band(Math.round(piq)));

    setBar("barReadiness", "numReadiness", sub.readiness);
    setBar("barTraining", "numTraining", sub.training);
    setBar("barRecovery", "numRecovery", sub.recovery);
    setBar("barNutrition", "numNutrition", sub.nutrition);
    setBar("barRisk", "numRisk", sub.risk);

    safeText(
      byId("piqExplain"),
      [
        `Date: ${date}`,
        `Readiness: ${sub.readiness}`,
        `Training: ${sub.training}`,
        `Recovery: ${sub.recovery}`,
        `Nutrition: ${sub.nutrition}`,
        `Risk: ${sub.risk}`,
        `Weights: R${w.readiness} / T${w.training} / Rec${w.recovery} / N${w.nutrition} / Risk${w.risk} (total ${totalW})`,
        `PIQ = weighted average`,
      ].join("\n")
    );

    // risk tool render
    const rAth = riskAthlete ? riskAthlete.value : athleteId;
    const rDate = riskDate ? riskDate.value : date;
    const risk = computeRisk(state, rAth, rDate);
    const summary = byId("riskSummary");
    const workload = byId("riskWorkload");
    const readNut = byId("riskReadiness");
    if (summary) summary.textContent = risk.summary;
    if (workload) workload.textContent = risk.workloadDetail;
    if (readNut) readNut.textContent = risk.readinessDetail;

    // Heatmap table (only renders on click)
  }

  function setBar(barId, numId, val) {
    const bar = byId(barId);
    const num = byId(numId);
    if (bar) bar.style.width = clamp(Number(val || 0), 0, 100) + "%";
    if (num) num.textContent = isFinite(val) ? String(Math.round(val)) : "—";
  }

  function band(n) {
    if (!isFinite(n)) return "—";
    if (n >= 85) return "Elite";
    if (n >= 70) return "Strong";
    if (n >= 55) return "Developing";
    return "Needs Attention";
  }

  function computeSubScores(state, athleteId, dateISO) {
    // Readiness score (0-100): from readiness log same day if exists
    const ready = state.logs.readiness
      .filter((r) => r.athleteId === athleteId && r.date === dateISO)
      .slice(-1)[0];

    const readinessScore = ready ? calcReadinessScore(ready) : 60;

    // Training score (0-100): based on last 7d load vs reasonable range
    const load7 = sumTrainingLoad(state, athleteId, dateISO, 7);
    const trainingScore = clamp(100 - Math.abs(load7 - 1800) / 25, 0, 100); // heuristic

    // Recovery score (0-100): uses sleep + soreness trend if available
    const recScore = ready
      ? clamp((Number(ready.sleep || 0) / 9) * 70 + (10 - Number(ready.soreness || 0)) * 3, 0, 100)
      : 60;

    // Nutrition score (0-100): adherence same day if exists
    const nut = state.logs.nutrition
      .filter((n) => n.athleteId === athleteId && n.date === dateISO)
      .slice(-1)[0];

    const t = pickTargets(state, athleteId);
    const nutritionScore = nut ? calcNutritionAdherence(nut, t) : 60;

    // Risk index (0-100, higher=better): derived from risk flags (invert)
    const risk = computeRisk(state, athleteId, dateISO);
    const riskScore = clamp(100 - risk.riskIndex, 0, 100);

    return {
      readiness: Math.round(readinessScore),
      training: Math.round(trainingScore),
      recovery: Math.round(recScore),
      nutrition: Math.round(nutritionScore),
      risk: Math.round(riskScore),
    };
  }

  function calcReadinessScore(r) {
    const sleep = clamp(Number(r.sleep || 0), 0, 16);
    const sore = clamp(Number(r.soreness || 0), 0, 10);
    const stress = clamp(Number(r.stress || 0), 0, 10);
    const energy = clamp(Number(r.energy || 0), 0, 10);
    // simple weighted
    const score = (sleep / 9) * 35 + (10 - sore) * 4 + (10 - stress) * 2.5 + energy * 2.5;
    return clamp(score, 0, 100);
  }

  function dateAddDays(iso, delta) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + delta);
    return d.toISOString().slice(0, 10);
  }

  function sumTrainingLoad(state, athleteId, dateISO, days) {
    const start = dateAddDays(dateISO, -(days - 1));
    const rows = state.logs.training.filter((x) => x.athleteId === athleteId && x.date >= start && x.date <= dateISO);
    return rows.reduce((acc, x) => acc + (Number(x.minutes || 0) * Number(x.srpe || 0)), 0);
  }

  function computeRisk(state, athleteId, dateISO) {
    // Heuristic:
    // - Load spike (today vs 7d avg)
    // - High soreness + low sleep
    // - Low nutrition adherence
    const loadToday = sumTrainingLoad(state, athleteId, dateISO, 1);
    const load7 = sumTrainingLoad(state, athleteId, dateISO, 7);
    const avg = load7 / 7;

    const ready = state.logs.readiness
      .filter((r) => r.athleteId === athleteId && r.date === dateISO)
      .slice(-1)[0];

    const nut = state.logs.nutrition
      .filter((n) => n.athleteId === athleteId && n.date === dateISO)
      .slice(-1)[0];

    const targets = pickTargets(state, athleteId);
    const nutScore = nut ? calcNutritionAdherence(nut, targets) : 60;

    const spike = avg > 0 ? loadToday / avg : 0;
    const spikeFlag = spike >= 1.8 && loadToday > 0;

    const sore = ready ? Number(ready.soreness || 0) : 3;
    const sleep = ready ? Number(ready.sleep || 0) : 8;

    const sleepFlag = sleep < 6.5;
    const soreFlag = sore >= 7;
    const nutFlag = nutScore < 55;

    let riskIndex = 0;
    if (spikeFlag) riskIndex += 35;
    if (sleepFlag) riskIndex += 20;
    if (soreFlag) riskIndex += 25;
    if (nutFlag) riskIndex += 20;
    riskIndex = clamp(riskIndex, 0, 100);

    const flags = [];
    if (spikeFlag) flags.push("Load spike");
    if (sleepFlag) flags.push("Low sleep");
    if (soreFlag) flags.push("High soreness");
    if (nutFlag) flags.push("Low nutrition adherence");

    return {
      riskIndex,
      summary: flags.length ? `Flags: ${flags.join(" • ")} (risk ${riskIndex}/100)` : `No major flags detected (risk ${riskIndex}/100)`,
      workloadDetail: `Today load: ${Math.round(loadToday)} • 7d avg: ${Math.round(avg)} • Spike ratio: ${avg ? spike.toFixed(2) : "—"}`,
      readinessDetail: `Sleep: ${sleep}h • Soreness: ${sore}/10 • Nutrition: ${Math.round(nutScore)}/100`,
    };
  }

  // -----------------------------
  // Team view rendering
  // -----------------------------
  function renderTeam(state) {
    const t = activeTeam(state);
    safeText(byId("activeTeamPill"), `Team: ${t.name || "Default"}`);

    safeValue(byId("teamName"), t.name || "Default");
    safeValue(byId("seasonStart"), t.seasonStart || "");
    safeValue(byId("seasonEnd"), t.seasonEnd || "");

    // sport selector (injected)
    const sportSel = byId("teamSport");
    if (sportSel) {
      const sports = sportEngine().listSports();
      renderSelect(
        sportSel,
        sports.map((s) => ({ value: s.id, label: s.name })),
        t.sport || "basketball"
      );
    }

    // macro defaults
    safeValue(byId("defProt"), (t.macroDefaults && t.macroDefaults.protein) ?? 160);
    safeValue(byId("defCarb"), (t.macroDefaults && t.macroDefaults.carbs) ?? 240);
    safeValue(byId("defFat"), (t.macroDefaults && t.macroDefaults.fat) ?? 70);

    // weights
    safeValue(byId("wReadiness"), t.weights.readiness);
    safeValue(byId("wTraining"), t.weights.training);
    safeValue(byId("wRecovery"), t.weights.recovery);
    safeValue(byId("wNutrition"), t.weights.nutrition);
    safeValue(byId("wRisk"), t.weights.risk);

    const totalW =
      Number(t.weights.readiness) +
      Number(t.weights.training) +
      Number(t.weights.recovery) +
      Number(t.weights.nutrition) +
      Number(t.weights.risk);

    safeText(byId("weightsNote"), totalW === 100 ? "✅ totals 100" : `⚠ totals ${totalW} (should be 100)`);

    // roster list
    const list = byId("rosterList");
    if (list) {
      const athletes = teamAthletes(state);
      if (!athletes.length) {
        list.innerHTML = `<div class="small muted">No athletes yet. Add one above.</div>`;
      } else {
        list.innerHTML = athletes
          .map((a) => {
            const sport = a.sport || t.sport || "basketball";
            return `
              <div class="row between" style="padding:10px 0;border-bottom:1px solid var(--border)">
                <div>
                  <div><b>${escapeHtml(a.name)}</b> <span class="muted small">${escapeHtml(a.position || "")}</span></div>
                  <div class="small muted">Ht: ${a.heightIn || "—"} in • Wt: ${a.weightLb || "—"} lb • Sport: ${escapeHtml(sport)}</div>
                </div>
                <div class="row gap">
                  <button class="btn ghost small" data-action="editAthlete" data-id="${a.id}">Edit</button>
                  <button class="btn danger small" data-action="delAthlete" data-id="${a.id}">Remove</button>
                </div>
              </div>
            `;
          })
          .join("");
      }
    }
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // -----------------------------
  // Log view rendering (FULL, self-contained)
  // -----------------------------
  function renderLog(state) {
    const athletes = teamAthletes(state);
    const options = athletes.map((a) => ({ value: a.id, label: a.name }));

    // Training selects + defaults
    const logAthlete = byId("logAthlete");
    const readyAthlete = byId("readyAthlete");
    renderSelect(logAthlete, options, logAthlete && (logAthlete.value || (options[0] && options[0].value)));
    renderSelect(readyAthlete, options, readyAthlete && (readyAthlete.value || (options[0] && options[0].value)));

    const logDate = byId("logDate");
    const readyDate = byId("readyDate");
    if (logDate && !logDate.value) logDate.value = todayISO();
    if (readyDate && !readyDate.value) readyDate.value = todayISO();

    // Training computed
    const minEl = byId("logMin");
    const rpeEl = byId("logRpe");
    const mins = Number(minEl && minEl.value) || 0;
    const srpe = Number(rpeEl && rpeEl.value) || 0;
    safeText(byId("logComputed"), `Load: ${Math.round(mins * srpe) || 0}`);

    // Readiness computed
    const rs = Number(byId("readySleep")?.value || 0);
    const rso = Number(byId("readySore")?.value || 0);
    const rst = Number(byId("readyStress")?.value || 0);
    const re = Number(byId("readyEnergy")?.value || 0);
    safeText(byId("readyComputed"), `${Math.round(calcReadinessScore({ sleep: rs, soreness: rso, stress: rst, energy: re }))}`);

    // Lists
    const tList = byId("trainingList");
    const rList = byId("readinessList");

    if (tList) {
      const aid = logAthlete ? logAthlete.value : (options[0] && options[0].value);
      const items = state.logs.training
        .filter((x) => x.athleteId === aid)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 50);

      tList.innerHTML = items.length
        ? items
            .map((x) => {
              const load = Math.round(Number(x.minutes || 0) * Number(x.srpe || 0));
              return `
                <div style="padding:10px 0;border-bottom:1px solid var(--border)">
                  <div class="row between">
                    <div><b>${x.date}</b> <span class="muted small">${escapeHtml(x.type || "")}</span></div>
                    <div class="mono small">Load: ${load}</div>
                  </div>
                  <div class="small muted">Min: ${x.minutes} • sRPE: ${x.srpe} • Notes: ${escapeHtml(x.notes || "—")}</div>
                </div>
              `;
            })
            .join("")
        : `<div class="small muted">No sessions yet.</div>`;
    }

    if (rList) {
      const aid = readyAthlete ? readyAthlete.value : (options[0] && options[0].value);
      const items = state.logs.readiness
        .filter((x) => x.athleteId === aid)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 50);

      rList.innerHTML = items.length
        ? items
            .map((x) => {
              const score = Math.round(calcReadinessScore(x));
              return `
                <div style="padding:10px 0;border-bottom:1px solid var(--border)">
                  <div class="row between">
                    <div><b>${x.date}</b></div>
                    <div class="mono small">Score: ${score}</div>
                  </div>
                  <div class="small muted">Sleep: ${x.sleep}h • Soreness: ${x.soreness}/10 • Stress: ${x.stress}/10 • Energy: ${x.energy}/10</div>
                  <div class="small muted">Injury note: ${escapeHtml(x.injury || "—")}</div>
                </div>
              `;
            })
            .join("")
        : `<div class="small muted">No check-ins yet.</div>`;
    }
  }

  // -----------------------------
  // Nutrition view rendering (paywall + targets + meal plan)
  // -----------------------------
  function renderNutrition(state) {
    const ent = getEntitlements();
    const elite = !!ent.elite;

    const paywall = byId("nutPaywall");
    const main = byId("nutMain");
    if (paywall && main) {
      paywall.style.display = elite ? "none" : "";
      main.style.display = elite ? "" : "none";
    }

    const athletes = teamAthletes(state);
    const options = athletes.map((a) => ({ value: a.id, label: a.name }));

    const nutAthlete = byId("nutAthlete");
    const targetAthlete = byId("targetAthlete");
    const mealAthlete = byId("mealAthlete");

    renderSelect(nutAthlete, options, nutAthlete && (nutAthlete.value || (options[0] && options[0].value)));
    renderSelect(targetAthlete, options, targetAthlete && (targetAthlete.value || (options[0] && options[0].value)));
    renderSelect(mealAthlete, options, mealAthlete && (mealAthlete.value || (options[0] && options[0].value)));

    const nutDate = byId("nutDate");
    if (nutDate && !nutDate.value) nutDate.value = todayISO();

    // Targets panel
    const aId = targetAthlete ? targetAthlete.value : (options[0] && options[0].value);
    const targets = pickTargets(state, aId);
    safeValue(byId("tProt"), targets.protein);
    safeValue(byId("tCarb"), targets.carbs);
    safeValue(byId("tFat"), targets.fat);
    safeValue(byId("tWater"), targets.water);

    // Adherence computed
    const act = {
      protein: Number(byId("nutProt")?.value || 0),
      carbs: Number(byId("nutCarb")?.value || 0),
      fat: Number(byId("nutFat")?.value || 0),
      water: Number(byId("nutWater")?.value || 0),
    };
    const adherence = calcNutritionAdherence(act, targets);
    safeText(byId("nutComputed"), `${adherence}`);

    safeText(
      byId("nutExplain"),
      `Adherence is a macro-distance score (0–100) vs targets.\nProtein/Carb weighted higher than Fat/Water.\nThis is a coaching signal, not a medical tool.`
    );

    // Nutrition list
    const list = byId("nutritionList");
    if (list) {
      const aid = nutAthlete ? nutAthlete.value : aId;
      const items = state.logs.nutrition
        .filter((x) => x.athleteId === aid)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 50);

      list.innerHTML = items.length
        ? items
            .map((x) => {
              const t = pickTargets(state, aid);
              const score = calcNutritionAdherence(x, t);
              return `
                <div style="padding:10px 0;border-bottom:1px solid var(--border)">
                  <div class="row between">
                    <div><b>${x.date}</b></div>
                    <div class="mono small">Adherence: ${Math.round(score)}</div>
                  </div>
                  <div class="small muted">P ${x.protein} • C ${x.carbs} • F ${x.fat} • Water ${x.water}oz</div>
                  <div class="small muted">Notes: ${escapeHtml(x.notes || "—")}</div>
                </div>
              `;
            })
            .join("")
        : `<div class="small muted">No nutrition logs yet.</div>`;
    }

    // Meal plan output placeholder if elite
    const mealOut = byId("mealPlanOut");
    if (mealOut && elite && !mealOut.innerHTML.trim()) {
      mealOut.innerHTML = `<div class="small muted">Choose settings and click “Generate Plan”.</div>`;
    }
  }

  function generateMealPlan(state, athleteId, startISO, days, dayType, diet) {
    const t = pickTargets(state, athleteId);
    const sport = getAthleteSport(state, athleteId);

    // simple distribution based on dayType + diet
    let carbBias = dayType === "game" ? 1.15 : dayType === "training" ? 1.05 : dayType === "recovery" ? 0.9 : 0.85;
    let fatBias = diet === "lowerfat" ? 0.85 : 1.0;
    let protBias = diet === "highprotein" ? 1.1 : 1.0;

    const out = [];
    for (let i = 0; i < days; i++) {
      const date = dateAddDays(startISO, i);
      const autoType =
        dayType === "auto"
          ? (() => {
              const d = new Date(date + "T00:00:00");
              const wd = d.getDay(); // 0 Sun .. 6 Sat
              return wd === 0 || wd === 6 ? "rest" : "training";
            })()
          : dayType;

      const p = Math.round(t.protein * protBias);
      const c = Math.round(t.carbs * (autoType === "rest" ? 0.85 : carbBias));
      const f = Math.round(t.fat * fatBias);
      const w = Math.round(t.water);

      out.push({
        date,
        type: autoType,
        macros: { p, c, f, w },
        notes: mealNotes(autoType, sport),
        meals: mealBlocks(p, c, f),
      });
    }
    return out;
  }

  function mealNotes(type, sport) {
    const s = sport || "basketball";
    if (type === "game") return `Higher carbs + hydration focus for ${s}. Emphasize familiar foods.`;
    if (type === "training") return `Balanced fuel for ${s}. Pre + post workout protein + carbs.`;
    if (type === "recovery") return `Slightly lower carbs, high micronutrients, extra sleep support.`;
    if (type === "rest") return `Lower calories, keep protein high, hydration steady.`;
    return `Standard fueling day.`;
  }

  function mealBlocks(p, c, f) {
    // 4-block day
    const b1 = { name: "Breakfast", p: Math.round(p * 0.25), c: Math.round(c * 0.25), f: Math.round(f * 0.25) };
    const b2 = { name: "Lunch", p: Math.round(p * 0.3), c: Math.round(c * 0.3), f: Math.round(f * 0.25) };
    const b3 = { name: "Snack/Pre", p: Math.round(p * 0.15), c: Math.round(c * 0.2), f: Math.round(f * 0.15) };
    const b4 = { name: "Dinner/Post", p: Math.round(p * 0.3), c: Math.round(c * 0.25), f: Math.round(f * 0.35) };
    return [b1, b2, b3, b4];
  }

  // -----------------------------
  // Periodization rendering
  // -----------------------------
  function renderPeriodization(state) {
    const athletes = teamAthletes(state);
    const options = athletes.map((a) => ({ value: a.id, label: a.name }));

    const perAthlete = byId("perAthlete");
    const monAthlete = byId("monAthlete");
    renderSelect(perAthlete, options, perAthlete && (perAthlete.value || (options[0] && options[0].value)));
    renderSelect(monAthlete, options, monAthlete && (monAthlete.value || (options[0] && options[0].value)));

    const perStart = byId("perStart");
    if (perStart && !perStart.value) perStart.value = todayISO();

    const monWeek = byId("monWeek");
    if (monWeek && !monWeek.value) {
      // set to most recent Monday
      const d = new Date();
      const day = d.getDay(); // 0 Sun
      const diff = (day + 6) % 7; // days since Monday
      d.setDate(d.getDate() - diff);
      monWeek.value = d.toISOString().slice(0, 10);
    }

    // plan list
    const planList = byId("planList");
    if (planList) {
      const aid = perAthlete ? perAthlete.value : (options[0] && options[0].value);
      const plans = state.plans.periodization
        .filter((p) => p.athleteId === aid)
        .sort((a, b) => (a.start < b.start ? 1 : -1))
        .slice(0, 10);

      planList.innerHTML = plans.length
        ? plans
            .map((p) => {
              return `
                <div style="padding:10px 0;border-bottom:1px solid var(--border)">
                  <div class="row between">
                    <div><b>${p.goal}</b> <span class="muted small">(${p.weeks} weeks)</span></div>
                    <div class="mono small">Start: ${p.start}</div>
                  </div>
                  <div class="small muted">${escapeHtml(p.summary || "")}</div>
                </div>
              `;
            })
            .join("")
        : `<div class="small muted">No plans yet. Click Generate.</div>`;
    }
  }

  function generatePeriodizationPlan(state, athleteId, startISO, weeks, goal, deloadEvery) {
    const sport = getAthleteSport(state, athleteId);
    const tpl = sportEngine().getTemplate(sport, "standard");
    const baseWeeklyLoad = tpl.reduce((acc, d) => acc + (Number(d.minutes || 0) * Number(d.srpe || 0)), 0) || 1800;

    const weeksArr = [];
    for (let w = 1; w <= weeks; w++) {
      const phase = (w % Number(deloadEvery || 4) === 0) ? "DELOAD" : period.getPhase(w);
      const weekLoad = Math.round(period.adjust(baseWeeklyLoad, phase));
      weeksArr.push({ week: w, phase, targetLoad: weekLoad });
    }

    const summary = `Sport: ${sport} • Base weekly load ~${Math.round(baseWeeklyLoad)} • Deload every ${deloadEvery}w`;
    return {
      id: uuid(),
      athleteId,
      sport,
      start: startISO,
      weeks,
      goal,
      deloadEvery: Number(deloadEvery || 4),
      weeksArr,
      summary,
      createdAt: new Date().toISOString(),
    };
  }

  function comparePlannedVsActual(state, athleteId, weekStartISO) {
    // Find latest plan that covers weekStart
    const plans = state.plans.periodization
      .filter((p) => p.athleteId === athleteId)
      .sort((a, b) => (a.start < b.start ? 1 : -1));

    const plan = plans[0];
    if (!plan) return { ok: false, summary: "No plan found for this athlete.", detail: "" };

    // compute week index
    const ws = new Date(weekStartISO + "T00:00:00");
    const ps = new Date(plan.start + "T00:00:00");
    const diffDays = Math.floor((ws - ps) / (1000 * 60 * 60 * 24));
    const weekIdx = Math.floor(diffDays / 7) + 1;
    const weekMeta = plan.weeksArr.find((x) => x.week === weekIdx);
    if (!weekMeta) return { ok: false, summary: "Week is outside the plan range.", detail: "" };

    // actual load that week
    const end = dateAddDays(weekStartISO, 6);
    const rows = state.logs.training.filter((x) => x.athleteId === athleteId && x.date >= weekStartISO && x.date <= end);
    const actual = rows.reduce((acc, x) => acc + Number(x.minutes || 0) * Number(x.srpe || 0), 0);

    const planned = Number(weekMeta.targetLoad || 0);
    const pct = planned ? (actual / planned) * 100 : 0;

    const summary = `Week ${weekIdx} (${weekMeta.phase}) • Planned: ${Math.round(planned)} • Actual: ${Math.round(actual)} • ${Math.round(pct)}%`;
    const detail = rows
      .map((x) => `${x.date} • ${x.type} • ${x.minutes}m @${x.srpe} = ${Math.round(Number(x.minutes) * Number(x.srpe))}`)
      .join("\n");

    return { ok: true, summary, detail };
  }

  // -----------------------------
  // Workouts rendering
  // -----------------------------
  function renderWorkouts(state) {
    const athletes = teamAthletes(state);
    const options = athletes.map((a) => ({ value: a.id, label: a.name }));
    renderSelect(byId("woAthlete"), options, byId("woAthlete")?.value || (options[0] && options[0].value));

    const aid = byId("woAthlete")?.value || (options[0] && options[0].value);
    const sportSel = byId("woSport");
    const sports = sportEngine().listSports();
    renderSelect(
      sportSel,
      sports.map((s) => ({ value: s.id, label: s.name })),
      getAthleteSport(state, aid)
    );

    const woDate = byId("woDate");
    if (woDate && !woDate.value) woDate.value = todayISO();

    // computed load
    const mins = Number(byId("woMinutes")?.value || 0);
    const srpe = Number(byId("woSrpe")?.value || 0);
    safeText(byId("woLoadComputed"), `Load: ${Math.round(mins * srpe) || 0}`);

    // list history
    const list = byId("workoutsList");
    if (list) {
      const items = state.logs.workouts
        .filter((x) => x.athleteId === aid)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 50);

      list.innerHTML = items.length
        ? items
            .map((x) => {
              return `
                <div style="padding:10px 0;border-bottom:1px solid var(--border)">
                  <div class="row between">
                    <div><b>${x.date}</b> <span class="muted small">${escapeHtml(x.sport)} • ${escapeHtml(x.level)}</span></div>
                    <div class="mono small">Load: ${Math.round(Number(x.minutes) * Number(x.srpe))}</div>
                  </div>
                  <div class="small muted">${escapeHtml(x.title || "Workout")}</div>
                </div>
              `;
            })
            .join("")
        : `<div class="small muted">No completed workouts yet.</div>`;
    }
  }

  function renderTodayWorkout(state) {
    const aid = byId("woAthlete")?.value;
    if (!aid) return;

    const sport = byId("woSport")?.value || getAthleteSport(state, aid);
    const level = byId("woLevel")?.value || "standard";
    const date = byId("woDate")?.value || todayISO();

    // pick day based on weekday
    const tpl = sportEngine().getTemplate(sport, level);
    if (!tpl.length) {
      safeHTML(byId("todayWorkoutOut"), `<div class="small muted">No template for this sport yet.</div>`);
      return;
    }

    const d = new Date(date + "T00:00:00");
    const weekday = d.getDay(); // 0 Sun .. 6 Sat
    // Map to template index: prefer weekdays; if weekend pick last day
    const idx = weekday === 0 ? tpl.length - 1 : weekday === 6 ? tpl.length - 1 : Math.min(weekday - 1, tpl.length - 1);
    const day = tpl[idx];

    // write back "today workout context" (used by compliance and periodization comparison)
    setState((s) => {
      s.ui.todayWorkout = { athleteId: aid, date, sport, level, templateIndex: idx };
      return s;
    });

    safeHTML(
      byId("todayWorkoutOut"),
      `
      <div class="row between" style="margin-bottom:6px">
        <div><b>${escapeHtml(day.title)}</b> <span class="muted small">(${escapeHtml(day.code)})</span></div>
        <div class="mono small">Suggested: ${day.minutes}m • sRPE ${day.srpe} • Load ~${Math.round(day.minutes * day.srpe)}</div>
      </div>
      <div style="margin-top:8px">
        ${day.exercises
          .map(
            (e) => `
          <div style="padding:8px 0;border-bottom:1px solid var(--border)">
            <div><b>${escapeHtml(e.name)}</b></div>
            <div class="small muted">${escapeHtml(e.sets)} ${e.notes ? "• " + escapeHtml(e.notes) : ""}</div>
          </div>`
          )
          .join("")}
      </div>
      `
    );

    // set defaults for logging
    safeValue(byId("woMinutes"), day.minutes);
    safeValue(byId("woSrpe"), day.srpe);
    safeText(byId("woLoadComputed"), `Load: ${Math.round(day.minutes * day.srpe)}`);
  }

  // -----------------------------
  // Settings render
  // -----------------------------
  function renderSettings(state) {
    const info = byId("appInfo");
    if (info) {
      const t = activeTeam(state);
      const d = state.ui.device || detectDevice();
      info.textContent = [
        `v${state.version}`,
        `Role: ${state.ui.role}`,
        `Team: ${t.name}`,
        `Sport: ${t.sport}`,
        `Device: ${d.size} ${d.w}×${d.h} touch=${d.isTouch ? "yes" : "no"}`,
      ].join("\n");
    }
    const eliteState = byId("eliteState");
    if (eliteState) eliteState.textContent = getEntitlements().elite ? "Elite: enabled" : "Elite: disabled";
  }

  // -----------------------------
  // Global render
  // -----------------------------
  function renderAll() {
    const state = getState();

    // Ensure not empty
    setState((s) => ensureDefaultAthlete(s));

    applyRoleUI(state);

    const view = state.ui.activeView || "dashboard";
    if (view === "dashboard") renderDashboard(state);
    if (view === "team") renderTeam(state);
    if (view === "log") renderLog(state);
    if (view === "nutrition") renderNutrition(state);
    if (view === "periodization") renderPeriodization(state);
    if (view === "workouts") renderWorkouts(state);
    if (view === "settings") renderSettings(state);

    // Ensure active team pill always reflects
    safeText(byId("activeTeamPill"), `Team: ${activeTeam(state).name || "Default"}`);
  }

  // -----------------------------
  // Onboarding wizard (simple, production-safe)
  // -----------------------------
  function ensureOnboarding() {
    if (byId("piqOnboard")) return;

    const modal = document.createElement("div");
    modal.id = "piqOnboard";
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 9998;
      background: rgba(0,0,0,0.55);
      display: none; align-items: center; justify-content: center;
      padding: 16px;
    `;
    modal.innerHTML = `
      <div class="card" style="max-width:720px;width:100%;">
        <div class="cardhead">
          <h2>Welcome to PerformanceIQ</h2>
          <span class="muted">2-minute setup</span>
        </div>

        <div class="grid2">
          <div class="mini">
            <div class="minihead">Role</div>
            <div class="minibody small muted">Choose how you’re using the app.</div>
            <div class="row gap wrap" style="margin-top:10px">
              <button class="btn" id="obRoleCoach">Coach</button>
              <button class="btn ghost" id="obRoleAthlete">Athlete</button>
            </div>
            <div class="small muted" id="obRoleNote" style="margin-top:8px">Current: coach</div>
          </div>

          <div class="mini">
            <div class="minihead">Sport</div>
            <div class="minibody small muted">Workouts + guidance will tailor to this.</div>
            <div class="row gap wrap" style="margin-top:10px">
              <div class="field">
                <label>Team sport</label>
                <select id="obSport"></select>
              </div>
            </div>
          </div>
        </div>

        <div class="mini" style="margin-top:12px">
          <div class="minihead">Team + first athlete</div>
          <div class="row gap wrap" style="margin-top:10px">
            <div class="field grow">
              <label>Team name</label>
              <input id="obTeamName" placeholder="e.g., Varsity Raiders" />
            </div>
            <div class="field grow">
              <label>Athlete name</label>
              <input id="obAthName" placeholder="e.g., Jordan Smith" />
            </div>
          </div>
        </div>

        <div class="row between" style="margin-top:14px">
          <button class="btn ghost" id="obSeed">One-click Demo Seed</button>
          <div class="row gap">
            <button class="btn ghost" id="obSkip">Skip</button>
            <button class="btn" id="obFinish">Finish</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // populate sport list
    const s = sportEngine().listSports();
    renderSelect(byId("obSport"), s.map((x) => ({ value: x.id, label: x.name })), "basketball");

    // role buttons
    byId("obRoleCoach")?.addEventListener("click", () => {
      setState((st) => { st.ui.role = "coach"; return st; });
      safeText(byId("obRoleNote"), "Current: coach");
      applyRoleUI(getState());
    });
    byId("obRoleAthlete")?.addEventListener("click", () => {
      setState((st) => { st.ui.role = "athlete"; return st; });
      safeText(byId("obRoleNote"), "Current: athlete");
      applyRoleUI(getState());
    });

    byId("obSeed")?.addEventListener("click", () => seedDemo(true));

    byId("obSkip")?.addEventListener("click", () => {
      setState((st) => { st.ui.onboardingComplete = true; return st; });
      modal.style.display = "none";
      renderAll();
    });

    byId("obFinish")?.addEventListener("click", () => {
      const sport = byId("obSport")?.value || "basketball";
      const teamName = (byId("obTeamName")?.value || "").trim();
      const athName = (byId("obAthName")?.value || "").trim();

      setState((st) => {
        const t = activeTeam(st);
        t.sport = sport;
        if (teamName) t.name = teamName;
        if (athName) {
          st.athletes.push({
            id: uuid(),
            teamId: st.activeTeamId,
            name: athName,
            position: "",
            heightIn: 0,
            weightLb: 0,
            sport: "",
            targets: { protein: null, carbs: null, fat: null, water: null },
          });
        }
        st.ui.onboardingComplete = true;
        return st;
      });

      modal.style.display = "none";
      renderAll();
    });
  }

  function maybeShowOnboarding() {
    const st = getState();
    const modal = byId("piqOnboard");
    if (!modal) return;
    modal.style.display = st.ui.onboardingComplete ? "none" : "flex";
  }

  // -----------------------------
  // Demo seed
  // -----------------------------
  function seedDemo(fromWizard) {
    setState((st) => {
      const t = activeTeam(st);
      t.name = t.name && t.name !== "Default" ? t.name : "Team Demo";
      t.sport = t.sport || "basketball";

      const a1 = { id: uuid(), teamId: st.activeTeamId, name: "Jordan Smith", position: "PG", heightIn: 70, weightLb: 150, sport: "", targets: {} };
      const a2 = { id: uuid(), teamId: st.activeTeamId, name: "Taylor Brown", position: "SG", heightIn: 72, weightLb: 160, sport: "", targets: {} };
      st.athletes = [a1, a2];

      // logs
      const base = todayISO();
      st.logs.training = [];
      st.logs.readiness = [];
      st.logs.nutrition = [];
      st.logs.workouts = [];

      for (let i = 0; i < 10; i++) {
        const d = dateAddDays(base, -i);
        [a1, a2].forEach((a, idx) => {
          st.logs.training.push({
            id: uuid(),
            athleteId: a.id,
            date: d,
            minutes: 60 - i,
            srpe: 6 + ((i + idx) % 3),
            type: "practice",
            notes: i % 3 === 0 ? "High intensity" : "",
          });
          st.logs.readiness.push({
            id: uuid(),
            athleteId: a.id,
            date: d,
            sleep: 7.5 + ((idx + i) % 2) * 0.5,
            soreness: 3 + (i % 4),
            stress: 3 + (idx % 2),
            energy: 7 - (i % 3),
            injury: "",
          });
          st.logs.nutrition.push({
            id: uuid(),
            athleteId: a.id,
            date: d,
            protein: 150 + (idx * 10),
            carbs: 230 + (i * 2),
            fat: 65 + (idx * 5),
            water: 100,
            notes: "",
          });
        });
      }

      // one plan
      st.plans.periodization = [
        generatePeriodizationPlan(st, a1.id, base, 8, "inseason", 4),
      ];

      st.ui.onboardingComplete = true;
      return st;
    });

    // enable elite for demo automatically only when seeded
    setEntitlements({ elite: true });

    if (!fromWizard) setView("dashboard");
    renderAll();
  }

  // -----------------------------
  // Events / bindings
  // -----------------------------
  function bindNav() {
    const nav = $(".nav");
    if (!nav) return;
    nav.addEventListener("click", (e) => {
      const btn = e.target.closest(".navbtn");
      if (!btn) return;
      const view = btn.dataset.view;
      if (!view) return;
      setView(view);
    });
  }

  function bindTopbar() {
    byId("btnSeed")?.addEventListener("click", () => seedDemo(false));

    byId("btnExport")?.addEventListener("click", () => {
      const blob = new Blob([store.exportJSON()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `performanceiq-export-${todayISO()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 500);
    });

    byId("fileImport")?.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const obj = JSON.parse(text);
        store.importJSON(obj);
        renderAll();
        setView(getState().ui.activeView || "dashboard");
      } catch (err) {
        alert("Import failed: invalid JSON.");
      } finally {
        e.target.value = "";
      }
    });
  }

  function bindTeamActions() {
    // Add athlete
    byId("btnAddAthlete")?.addEventListener("click", () => {
      const name = (byId("athName")?.value || "").trim();
      const pos = (byId("athPos")?.value || "").trim();
      const ht = Number(byId("athHt")?.value || 0);
      const wt = Number(byId("athWt")?.value || 0);
      if (!name) return alert("Enter full name.");

      setState((st) => {
        st.athletes.push({
          id: uuid(),
          teamId: st.activeTeamId,
          name,
          position: pos,
          heightIn: ht,
          weightLb: wt,
          sport: "",
          targets: { protein: null, carbs: null, fat: null, water: null },
        });
        return st;
      });

      ["athName", "athPos", "athHt", "athWt"].forEach((id) => {
        const el = byId(id);
        if (el) el.value = "";
      });

      renderAll();
    });

    // Save team
    byId("btnSaveTeam")?.addEventListener("click", () => {
      const name = (byId("teamName")?.value || "").trim() || "Default";
      const start = byId("seasonStart")?.value || "";
      const end = byId("seasonEnd")?.value || "";
      const sport = byId("teamSport")?.value || "basketball";

      setState((st) => {
        const t = activeTeam(st);
        t.name = name;
        t.seasonStart = start;
        t.seasonEnd = end;
        t.sport = sport;
        return st;
      });

      renderAll();
    });

    // Save macro defaults
    byId("btnSaveMacroDefaults")?.addEventListener("click", () => {
      const p = Number(byId("defProt")?.value || 0);
      const c = Number(byId("defCarb")?.value || 0);
      const f = Number(byId("defFat")?.value || 0);

      setState((st) => {
        const t = activeTeam(st);
        t.macroDefaults = Object.assign({}, t.macroDefaults, { protein: p, carbs: c, fat: f });
        return st;
      });

      renderAll();
    });

    // Save weights
    byId("btnSaveWeights")?.addEventListener("click", () => {
      const w = {
        readiness: Number(byId("wReadiness")?.value || 0),
        training: Number(byId("wTraining")?.value || 0),
        recovery: Number(byId("wRecovery")?.value || 0),
        nutrition: Number(byId("wNutrition")?.value || 0),
        risk: Number(byId("wRisk")?.value || 0),
      };
      setState((st) => {
        activeTeam(st).weights = w;
        return st;
      });
      renderAll();
    });

    // roster list actions
    byId("rosterList")?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (!id) return;

      if (action === "delAthlete") {
        if (!confirm("Remove athlete?")) return;
        setState((st) => {
          st.athletes = st.athletes.filter((a) => a.id !== id);
          // also remove logs for that athlete
          st.logs.training = st.logs.training.filter((x) => x.athleteId !== id);
          st.logs.readiness = st.logs.readiness.filter((x) => x.athleteId !== id);
          st.logs.nutrition = st.logs.nutrition.filter((x) => x.athleteId !== id);
          st.logs.workouts = st.logs.workouts.filter((x) => x.athleteId !== id);
          st.plans.periodization = st.plans.periodization.filter((p) => p.athleteId !== id);
          return st;
        });
        renderAll();
      }

      if (action === "editAthlete") {
        const st = getState();
        const a = st.athletes.find((x) => x.id === id);
        if (!a) return;

        const newName = prompt("Athlete name:", a.name) ?? a.name;
        const newPos = prompt("Position:", a.position) ?? a.position;
        setState((s) => {
          const aa = s.athletes.find((x) => x.id === id);
          if (aa) {
            aa.name = (newName || aa.name).trim();
            aa.position = (newPos || aa.position).trim();
          }
          return s;
        });
        renderAll();
      }
    });
  }

  function bindLogActions() {
    // live recompute
    ["logMin", "logRpe"].forEach((id) => byId(id)?.addEventListener("input", () => renderAll()));
    ["readySleep", "readySore", "readyStress", "readyEnergy"].forEach((id) => byId(id)?.addEventListener("input", () => renderAll()));

    // Save training
    byId("btnSaveTraining")?.addEventListener("click", () => {
      const athleteId = byId("logAthlete")?.value;
      const date = byId("logDate")?.value || todayISO();
      const minutes = Number(byId("logMin")?.value || 0);
      const srpe = Number(byId("logRpe")?.value || 0);
      const type = byId("logType")?.value || "practice";
      const notes = (byId("logNotes")?.value || "").trim();

      if (!athleteId) return alert("Pick an athlete.");
      setState((st) => {
        st.logs.training.push({ id: uuid(), athleteId, date, minutes, srpe, type, notes });
        return st;
      });

      renderAll();
    });

    // Save readiness
    byId("btnSaveReadiness")?.addEventListener("click", () => {
      const athleteId = byId("readyAthlete")?.value;
      const date = byId("readyDate")?.value || todayISO();
      const sleep = Number(byId("readySleep")?.value || 0);
      const soreness = Number(byId("readySore")?.value || 0);
      const stress = Number(byId("readyStress")?.value || 0);
      const energy = Number(byId("readyEnergy")?.value || 0);
      const injury = (byId("readyInjury")?.value || "").trim();

      if (!athleteId) return alert("Pick an athlete.");
      setState((st) => {
        st.logs.readiness.push({ id: uuid(), athleteId, date, sleep, soreness, stress, energy, injury });
        return st;
      });

      renderAll();
    });
  }

  function bindNutritionActions() {
    // Save nutrition
    byId("btnSaveNutrition")?.addEventListener("click", () => {
      const athleteId = byId("nutAthlete")?.value;
      const date = byId("nutDate")?.value || todayISO();
      const protein = Number(byId("nutProt")?.value || 0);
      const carbs = Number(byId("nutCarb")?.value || 0);
      const fat = Number(byId("nutFat")?.value || 0);
      const water = Number(byId("nutWater")?.value || 0);
      const notes = (byId("nutNotes")?.value || "").trim();

      if (!athleteId) return alert("Pick an athlete.");
      setState((st) => {
        st.logs.nutrition.push({ id: uuid(), athleteId, date, protein, carbs, fat, water, notes });
        return st;
      });

      renderAll();
    });

    // Save targets
    byId("btnSaveTargets")?.addEventListener("click", () => {
      const athleteId = byId("targetAthlete")?.value;
      if (!athleteId) return alert("Pick an athlete.");

      const tProt = Number(byId("tProt")?.value || 0);
      const tCarb = Number(byId("tCarb")?.value || 0);
      const tFat = Number(byId("tFat")?.value || 0);
      const tWater = Number(byId("tWater")?.value || 0);

      setState((st) => {
        const a = st.athletes.find((x) => x.id === athleteId);
        if (a) a.targets = { protein: tProt, carbs: tCarb, fat: tFat, water: tWater };
        return st;
      });

      renderAll();
    });

    // Quick meal add
    byId("btnQuickMeal")?.addEventListener("click", () => {
      const athleteId = byId("nutAthlete")?.value;
      const date = byId("nutDate")?.value || todayISO();
      if (!athleteId) return alert("Pick an athlete.");

      const qp = Number(byId("qmProt")?.value || 0);
      const qc = Number(byId("qmCarb")?.value || 0);
      const qf = Number(byId("qmFat")?.value || 0);
      const qw = Number(byId("qmWater")?.value || 0);

      setState((st) => {
        // find existing log for date or create
        let row = st.logs.nutrition.find((x) => x.athleteId === athleteId && x.date === date);
        if (!row) {
          row = { id: uuid(), athleteId, date, protein: 0, carbs: 0, fat: 0, water: 0, notes: "" };
          st.logs.nutrition.push(row);
        }
        row.protein = Number(row.protein || 0) + qp;
        row.carbs = Number(row.carbs || 0) + qc;
        row.fat = Number(row.fat || 0) + qf;
        row.water = Number(row.water || 0) + qw;
        return st;
      });

      renderAll();
    });

    // Unlock (simple demo code)
    byId("btnUnlock")?.addEventListener("click", () => {
      const code = (byId("unlockCode")?.value || "").trim().toUpperCase();
      const ok = code === "ELITE" || code === "PIQ-ELITE";
      if (ok) {
        setEntitlements({ elite: true });
        safeText(byId("unlockHint"), "✅ Elite unlocked on this device.");
        renderAll();
      } else {
        safeText(byId("unlockHint"), "Invalid code.");
      }
    });

    // Meal plan generate
    byId("btnGenerateMealPlan")?.addEventListener("click", () => {
      const ent = getEntitlements();
      if (!ent.elite) return alert("Elite Nutrition is locked. Unlock in this view or enable Elite for demos.");

      const athleteId = byId("mealAthlete")?.value || byId("targetAthlete")?.value;
      const start = byId("mealStart")?.value || todayISO();
      const days = clamp(Number(byId("mealDays")?.value || 7), 1, 21);
      const dayType = byId("mealDayType")?.value || "training";
      const diet = byId("mealDiet")?.value || "standard";

      if (!athleteId) return alert("Pick an athlete.");
      const plan = generateMealPlan(getState(), athleteId, start, days, dayType, diet);

      const out = byId("mealPlanOut");
      if (out) {
        out.innerHTML = plan
          .map((d) => {
            return `
              <div style="padding:10px 0;border-bottom:1px solid var(--border)">
                <div class="row between">
                  <div><b>${d.date}</b> <span class="muted small">${escapeHtml(d.type)}</span></div>
                  <div class="mono small">P${d.macros.p} C${d.macros.c} F${d.macros.f} • Water ${d.macros.w}oz</div>
                </div>
                <div class="small muted">${escapeHtml(d.notes)}</div>
                <div class="small" style="margin-top:6px">
                  ${d.meals.map((m) => `<div class="row between"><span>${escapeHtml(m.name)}</span><span class="mono small">P${m.p} C${m.c} F${m.f}</span></div>`).join("")}
                </div>
              </div>
            `;
          })
          .join("");
      }
    });
  }

  function bindPeriodizationActions() {
    byId("btnGeneratePlan")?.addEventListener("click", () => {
      const athleteId = byId("perAthlete")?.value;
      const start = byId("perStart")?.value || todayISO();
      const weeks = clamp(Number(byId("perWeeks")?.value || 8), 2, 24);
      const goal = byId("perGoal")?.value || "inseason";
      const deload = Number(byId("perDeload")?.value || 4);

      if (!athleteId) return alert("Pick an athlete.");
      setState((st) => {
        st.plans.periodization.unshift(generatePeriodizationPlan(st, athleteId, start, weeks, goal, deload));
        return st;
      });

      renderAll();
    });

    byId("btnCompareWeek")?.addEventListener("click", () => {
      const athleteId = byId("monAthlete")?.value;
      const week = byId("monWeek")?.value || todayISO();
      if (!athleteId) return alert("Pick an athlete.");

      const res = comparePlannedVsActual(getState(), athleteId, week);
      safeText(byId("compareSummary"), res.summary || "—");
      safeText(byId("compareDetail"), res.detail || "—");
    });
  }

  function bindWorkoutActions() {
    byId("btnLoadTodayWorkout")?.addEventListener("click", () => renderTodayWorkout(getState()));
    ["woMinutes", "woSrpe"].forEach((id) => byId(id)?.addEventListener("input", () => renderAll()));
    byId("woAthlete")?.addEventListener("change", () => renderAll());
    byId("woSport")?.addEventListener("change", () => renderAll());
    byId("woLevel")?.addEventListener("change", () => renderAll());
    byId("woDate")?.addEventListener("change", () => renderAll());

    byId("btnSaveWorkoutDone")?.addEventListener("click", () => {
      const st = getState();
      const athleteId = byId("woAthlete")?.value;
      const date = byId("woDate")?.value || todayISO();
      const sport = byId("woSport")?.value || getAthleteSport(st, athleteId);
      const level = byId("woLevel")?.value || "standard";
      const minutes = Number(byId("woMinutes")?.value || 0);
      const srpe = Number(byId("woSrpe")?.value || 0);

      if (!athleteId) return alert("Pick an athlete.");

      // Also write back into Training Log for unified analytics
      const title = byId("todayWorkoutOut")?.querySelector("b")?.textContent || "Workout";

      setState((s) => {
        s.logs.workouts.push({ id: uuid(), athleteId, date, sport, level, minutes, srpe, title });
        s.logs.training.push({ id: uuid(), athleteId, date, minutes, srpe, type: "lift", notes: `Workout: ${title}` });
        return s;
      });

      renderAll();
    });
  }

  function bindSettingsActions() {
    byId("btnWipe")?.addEventListener("click", () => {
      if (!confirm("Wipe ALL local data on this device?")) return;
      store.wipe();
      // keep entitlements? wipe too:
      try { localStorage.removeItem(ENT_KEY); } catch {}
      // reload state
      store.set(defaultState());
      location.reload();
    });

    // If you have buttons for demo entitlements
    byId("btnEnableElite")?.addEventListener("click", () => {
      setEntitlements({ elite: true });
      renderAll();
    });
    byId("btnDisableElite")?.addEventListener("click", () => {
      setEntitlements({ elite: false });
      renderAll();
    });
  }

  function bindDashboardActions() {
    byId("btnRecalcScore")?.addEventListener("click", () => renderAll());
    byId("btnRunRisk")?.addEventListener("click", () => renderAll());

    byId("btnHeatmap")?.addEventListener("click", () => {
      const st = getState();
      const start = byId("heatStart")?.value || dateAddDays(todayISO(), -20);
      const days = clamp(Number(byId("heatDays")?.value || 21), 7, 60);
      const metric = byId("heatMetric")?.value || "load";
      renderHeatmap(st, start, days, metric);
    });

    const heatTable = byId("heatTable");
    heatTable?.addEventListener("click", (e) => {
      const cell = e.target.closest("td[data-aid][data-date]");
      if (!cell) return;
      const aid = cell.dataset.aid;
      const date = cell.dataset.date;
      if (!aid || !date) return;

      // Jump to log view and set selectors
      setView("log");
      // Defer until view is shown
      setTimeout(() => {
        const la = byId("logAthlete");
        const ld = byId("logDate");
        const ra = byId("readyAthlete");
        const rd = byId("readyDate");
        if (la) la.value = aid;
        if (ld) ld.value = date;
        if (ra) ra.value = aid;
        if (rd) rd.value = date;
        renderAll();
      }, 0);
    });
  }

  function renderHeatmap(state, startISO, days, metric) {
    const table = byId("heatTable");
    if (!table) return;

    const athletes = teamAthletes(state);
    if (!athletes.length) {
      table.innerHTML = "";
      return;
    }

    const dates = Array.from({ length: days }, (_, i) => dateAddDays(startISO, i));
    const header = `
      <tr>
        <th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Athlete</th>
        ${dates.map((d) => `<th class="mono small" style="padding:8px;border-bottom:1px solid var(--border)">${d.slice(5)}</th>`).join("")}
      </tr>
    `;

    const rows = athletes
      .map((a) => {
        const tds = dates
          .map((d) => {
            const v = heatValue(state, a.id, d, metric);
            const intensity = clamp(Math.round(v), 0, 100);
            return `<td data-aid="${a.id}" data-date="${d}" title="${v}" style="padding:6px;border-bottom:1px solid var(--border);cursor:pointer;background:rgba(245,200,66,${intensity / 220})"></td>`;
          })
          .join("");
        return `<tr><td style="padding:8px;border-bottom:1px solid var(--border)"><b>${escapeHtml(a.name)}</b></td>${tds}</tr>`;
      })
      .join("");

    table.innerHTML = header + rows;
  }

  function heatValue(state, athleteId, dateISO, metric) {
    if (metric === "load") {
      const rows = state.logs.training.filter((x) => x.athleteId === athleteId && x.date === dateISO);
      const load = rows.reduce((acc, x) => acc + Number(x.minutes || 0) * Number(x.srpe || 0), 0);
      // scale to 0–100 (heuristic)
      return clamp((load / 3000) * 100, 0, 100);
    }
    if (metric === "readiness") {
      const r = state.logs.readiness.filter((x) => x.athleteId === athleteId && x.date === dateISO).slice(-1)[0];
      return r ? clamp(calcReadinessScore(r), 0, 100) : 0;
    }
    if (metric === "nutrition") {
      const n = state.logs.nutrition.filter((x) => x.athleteId === athleteId && x.date === dateISO).slice(-1)[0];
      if (!n) return 0;
      const t = pickTargets(state, athleteId);
      return clamp(calcNutritionAdherence(n, t), 0, 100);
    }
    if (metric === "risk") {
      const r = computeRisk(state, athleteId, dateISO);
      return clamp(r.riskIndex, 0, 100);
    }
    return 0;
  }

  // -----------------------------
  // Cloud sign-in modal safety (prevents null errors)
  // (If your HTML includes cloud elements, this ensures no crashes)
  // -----------------------------
  function hardenNullReads() {
    // This function intentionally does nothing visible—its purpose is to avoid app-wide crash patterns.
    // The core’s render functions already guard null nodes; this is just a placeholder for future cloud modules.
  }

  // -----------------------------
  // Boot
  // -----------------------------
  function boot() {
    try {
      applyDeviceClass();
      window.addEventListener("resize", () => {
        applyDeviceClass();
        // lightweight re-render on resize
        renderAll();
      });

      ensureWorkoutsView();
      ensureSportPickerInTeamSettings();
      ensureOnboarding();

      // If state missing, create
      if (!store.get()) store.set(defaultState());

      // Bind once
      bindNav();
      bindTopbar();
      bindTeamActions();
      bindLogActions();
      bindNutritionActions();
      bindPeriodizationActions();
      bindWorkoutActions();
      bindSettingsActions();
      bindDashboardActions();
      hardenNullReads();

      // Set initial view
      const st = getState();
      applyRoleUI(st);
      setView(st.ui.activeView || "dashboard");

      // Default heatmap dates
      const heatStart = byId("heatStart");
      if (heatStart && !heatStart.value) heatStart.value = dateAddDays(todayISO(), -20);

      // Meal plan start default
      const mealStart = byId("mealStart");
      if (mealStart && !mealStart.value) mealStart.value = todayISO();

      // Show onboarding if needed
      maybeShowOnboarding();

    } catch (err) {
      // Never leave splash stuck if anything fails
      console.error("[PIQ] boot error:", err);
    } finally {
      hideSplash();
      // Always render at least once even if boot had partial failure
      try { renderAll(); } catch (e) { console.error("[PIQ] render error:", e); }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

})();
