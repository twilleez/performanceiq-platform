// core.js — PRODUCTION-READY REPLACEMENT (FULL FILE) — v1.3.0 (Top Tier Systems)
// Boot-safe + Splash-safe + Offline-first + Optional Supabase sync
// Adds: PerformanceIQ Score, Team Heatmap, Elite Nutrition Add-on, Risk Detection, Periodization Engine
//
// Requires: piq_engines.js loaded BEFORE core.js
// Uses existing dataStore APIs:
// listMyTeams, createTeam, renewJoinCode, getTeamByJoinCode, joinTeamByCode, listTeamMembers,
// addTeamMember, removeTeamMember, listWorkoutLogsForAthlete, listMetricsForAthlete,
// upsertWorkoutLog, upsertPerformanceMetric, pushState, pullState.
//
// NOTE: Team member names not guaranteed by schema -> show "Athlete <shortId>"

(function () {
  "use strict";

  if (window.__PIQ_CORE_LOADED__) return;
  window.__PIQ_CORE_LOADED__ = true;

  const STORAGE_KEY = "piq_state_v1";
  const CLOUD_PUSH_DEBOUNCE_MS = 800;
  const SPLASH_FAILSAFE_MS = 2000;
  const MAX_ERROR_QUEUE_SIZE = 50;

  const ROLES = Object.freeze({
    ATHLETE: "athlete",
    COACH: "coach",
    PARENT: "parent",
    ADMIN: "admin"
  });

  const SPORTS = Object.freeze({
    BASKETBALL: "basketball",
    FOOTBALL: "football",
    BASEBALL: "baseball",
    VOLLEYBALL: "volleyball",
    SOCCER: "soccer"
  });

  const HYDRATION_LEVELS = Object.freeze({
    LOW: "low",
    OK: "ok",
    GOOD: "good",
    GREAT: "great"
  });

  const errorQueue = [];
  function logError(context, error) {
    const entry = { context, message: error?.message || String(error), ts: Date.now() };
    errorQueue.push(entry);
    if (errorQueue.length > MAX_ERROR_QUEUE_SIZE) errorQueue.shift();
    console.warn(`[${context}]`, error);
  }

  const $ = (id) => document.getElementById(id) || null;

  function sanitizeHTML(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }

  const numOrNull = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const clamp = (n, a, b) => Math.min(Math.max(n, a), b);

  const parseInputNumOrNull = (id) => {
    const el = $(id);
    const raw = (el?.value || "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const todayISO = () => new Date().toISOString().slice(0, 10);

  function debounce(fn, delay) {
    let timer = null;
    return function debounced(...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
      return timer;
    };
  }

  function safeDateISO(d) {
    const s = String(d || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }

  function isoToMs(iso) {
    const d = safeDateISO(iso);
    if (!d) return null;
    const ms = Date.parse(d);
    return Number.isFinite(ms) ? ms : null;
  }

  function daysBetweenISO(aISO, bISO) {
    const a = isoToMs(aISO);
    const b = isoToMs(bISO);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return (b - a) / (1000 * 60 * 60 * 24);
  }

  function isoAddDays(iso, delta) {
    const ms = isoToMs(iso);
    if (!Number.isFinite(ms)) return todayISO();
    const out = new Date(ms + delta * 86400000);
    return out.toISOString().slice(0, 10);
  }

  function __loadLocalRaw() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      logError("loadLocalRaw", e);
      return null;
    }
  }

  function __saveLocal(stateObj) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateObj));
      return true;
    } catch (e) {
      logError("saveLocal", e);
      return false;
    }
  }

  // =========================
  // Default + normalize state
  // =========================
  function defaultState() {
    const now = Date.now();
    return {
      meta: { updatedAtMs: now, lastSyncedAtMs: 0, version: 0 },
      role: "",
      profile: {
        sport: SPORTS.BASKETBALL,
        days: 4,
        name: "",
        age: 16,
        sex: "male",
        heightIn: 70,
        weightLbs: 145,
        goal: "lean_bulk",
        baselines: {
          wellnessAvg: null,
          energyAvg: null,
          vertAvg: null,
          sprint10Avg: null,
          codAvg: null,
          sleepHoursAvg: null,
          sleepQualityAvg: null
        }
      },
      trial: { startedAtMs: now, activated: false, licenseKey: "", licenseUntilMs: 0 },

      // paid upgrades / entitlements
      entitlements: {
        eliteNutrition: false
      },

      // nutrition tracking (elite)
      nutrition: {
        targets: null, // {calories, proteinG, carbsG, fatG}
        mealsPerDay: 4,
        dayActualsByISO: {
          // "YYYY-MM-DD": { calories, proteinG, carbsG, fatG }
        }
      },

      // periodization
      periodization: {
        startISO: todayISO(),
        goal: "performance",
        plan12w: null // built by PIQ_Engines.periodization.buildPeriodization
      },

      week: null,
      logs: [],
      tests: [],

      team: {
        roster: [],
        members: [],
        selectedTeamId: "",
        selectedTeamJoinCode: "",
        sessions: {},
        attendanceByDate: {},
        cache: {
          dateISO: "",
          members: [],
          readinessByUser: {},
          teamSummary: null,
          teamDecision: null,
          riskByUser: {},
          heatmap: null,
          updatedAtMs: 0,
          error: ""
        }
      },
      _ui: { activeTab: "profile" }
    };
  }

  function normalizeState(s) {
    const d = defaultState();
    if (!s || typeof s !== "object") return d;

    s.meta = s.meta && typeof s.meta === "object" ? s.meta : d.meta;
    if (!Number.isFinite(s.meta.updatedAtMs)) s.meta.updatedAtMs = Date.now();
    if (!Number.isFinite(s.meta.lastSyncedAtMs)) s.meta.lastSyncedAtMs = 0;
    if (!Number.isFinite(s.meta.version)) s.meta.version = 0;

    if (typeof s.role !== "string") s.role = d.role;

    s.profile = s.profile && typeof s.profile === "object" ? s.profile : d.profile;
    if (typeof s.profile.sport !== "string") s.profile.sport = d.profile.sport;
    if (!Number.isFinite(s.profile.days)) s.profile.days = d.profile.days;
    if (typeof s.profile.name !== "string") s.profile.name = d.profile.name;

    if (!Number.isFinite(s.profile.age)) s.profile.age = d.profile.age;
    if (typeof s.profile.sex !== "string") s.profile.sex = d.profile.sex;
    if (!Number.isFinite(s.profile.heightIn)) s.profile.heightIn = d.profile.heightIn;
    if (!Number.isFinite(s.profile.weightLbs)) s.profile.weightLbs = d.profile.weightLbs;
    if (typeof s.profile.goal !== "string") s.profile.goal = d.profile.goal;

    s.profile.baselines =
      s.profile.baselines && typeof s.profile.baselines === "object" ? s.profile.baselines : d.profile.baselines;

    s.trial = s.trial && typeof s.trial === "object" ? s.trial : d.trial;

    s.entitlements = s.entitlements && typeof s.entitlements === "object" ? s.entitlements : d.entitlements;
    if (typeof s.entitlements.eliteNutrition !== "boolean") s.entitlements.eliteNutrition = false;

    s.nutrition = s.nutrition && typeof s.nutrition === "object" ? s.nutrition : d.nutrition;
    if (!("targets" in s.nutrition)) s.nutrition.targets = null;
    if (!Number.isFinite(s.nutrition.mealsPerDay)) s.nutrition.mealsPerDay = 4;
    if (!s.nutrition.dayActualsByISO || typeof s.nutrition.dayActualsByISO !== "object") s.nutrition.dayActualsByISO = {};

    s.periodization = s.periodization && typeof s.periodization === "object" ? s.periodization : d.periodization;
    if (typeof s.periodization.startISO !== "string") s.periodization.startISO = d.periodization.startISO;
    if (typeof s.periodization.goal !== "string") s.periodization.goal = d.periodization.goal;
    if (!("plan12w" in s.periodization)) s.periodization.plan12w = null;

    if (!Array.isArray(s.logs)) s.logs = [];
    if (!Array.isArray(s.tests)) s.tests = [];

    s.team = s.team && typeof s.team === "object" ? s.team : d.team;
    if (!Array.isArray(s.team.roster)) s.team.roster = [];
    if (!Array.isArray(s.team.members)) s.team.members = [];
    if (typeof s.team.selectedTeamId !== "string") s.team.selectedTeamId = "";
    if (typeof s.team.selectedTeamJoinCode !== "string") s.team.selectedTeamJoinCode = "";

    if (!s.team.sessions || typeof s.team.sessions !== "object") s.team.sessions = {};
    if (!s.team.attendanceByDate || typeof s.team.attendanceByDate !== "object") s.team.attendanceByDate = {};

    s.team.cache = s.team.cache && typeof s.team.cache === "object" ? s.team.cache : d.team.cache;
    if (typeof s.team.cache.dateISO !== "string") s.team.cache.dateISO = "";
    if (!Array.isArray(s.team.cache.members)) s.team.cache.members = [];
    if (!s.team.cache.readinessByUser || typeof s.team.cache.readinessByUser !== "object") s.team.cache.readinessByUser = {};
    if (!("teamSummary" in s.team.cache)) s.team.cache.teamSummary = null;
    if (!("teamDecision" in s.team.cache)) s.team.cache.teamDecision = null;
    if (!("riskByUser" in s.team.cache)) s.team.cache.riskByUser = {};
    if (!("heatmap" in s.team.cache)) s.team.cache.heatmap = null;
    if (!Number.isFinite(s.team.cache.updatedAtMs)) s.team.cache.updatedAtMs = 0;
    if (typeof s.team.cache.error !== "string") s.team.cache.error = "";

    s._ui = s._ui && typeof s._ui === "object" ? s._ui : d._ui;
    if (typeof s._ui.activeTab !== "string") s._ui.activeTab = "profile";

    return s;
  }

  function loadState() {
    const raw = __loadLocalRaw();
    if (!raw) return null;
    try {
      return normalizeState(JSON.parse(raw));
    } catch (e) {
      logError("loadState", e);
      return null;
    }
  }

  const state = loadState() || defaultState();

  function bumpMeta() {
    state.meta.updatedAtMs = Date.now();
    state.meta.version = (state.meta.version || 0) + 1;
  }

  function saveState() {
    bumpMeta();
    __saveLocal(state);
    scheduleCloudPush();
    try {
      window.PIQ?.readiness?.updateBaselines?.();
    } catch (e) {
      logError("baselineUpdate", e);
    }
    renderActiveTab();
  }

  window.PIQ = window.PIQ || {};
  window.PIQ.getState = () => state;
  window.PIQ.getErrors = () => [...errorQueue];
  window.PIQ.saveState = window.PIQ.saveState || (() => saveState());

  // =========================
  // Splash + role utilities
  // =========================
  function hideSplashNow() {
    const s = $("splash");
    if (!s) return;
    s.classList.add("hidden");
    s.style.display = "none";
    s.style.visibility = "hidden";
    s.style.opacity = "0";
    try { s.remove(); } catch (e) { logError("hideSplash", e); }
  }
  window.hideSplashNow = window.hideSplashNow || hideSplashNow;

  function isSupabaseReady() {
    return !!(window.supabaseClient && window.PIQ_AuthStore && window.dataStore);
  }

  async function isSignedIn() {
    try {
      if (!window.PIQ_AuthStore || typeof window.PIQ_AuthStore.getUser !== "function") return false;
      const u = await window.PIQ_AuthStore.getUser();
      return !!u;
    } catch (e) {
      logError("isSignedIn", e);
      return false;
    }
  }

  async function __pushStateNow() {
    if (!isSupabaseReady()) return false;
    if (!window.dataStore?.pushState) return false;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;

    try {
      const u = await window.PIQ_AuthStore.getUser();
      if (!u) return false;

      await window.dataStore.pushState(state);
      state.meta.lastSyncedAtMs = Date.now();
      __saveLocal(state);
      return true;
    } catch (e) {
      logError("pushState", e);
      return false;
    }
  }

  const scheduleCloudPush = debounce(async () => {
    if (!isSupabaseReady()) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    const signed = await isSignedIn().catch(() => false);
    if (!signed) return;
    await __pushStateNow();
  }, CLOUD_PUSH_DEBOUNCE_MS);

  async function __pullCloudStateIfNewer() {
    if (!isSupabaseReady()) return false;
    if (!window.dataStore?.pullState) return false;

    try {
      const u = await window.PIQ_AuthStore.getUser();
      if (!u) return false;

      const cloud = await window.dataStore.pullState();
      if (!cloud?.state || typeof cloud.state !== "object") return false;

      const cloudUpdated = Number(cloud.state?.meta?.updatedAtMs || 0);
      const localUpdated = Number(state?.meta?.updatedAtMs || 0);

      if (cloudUpdated > localUpdated) {
        const next = normalizeState(cloud.state);
        Object.keys(state).forEach((k) => delete state[k]);
        Object.keys(next).forEach((k) => (state[k] = next[k]));
        __saveLocal(state);
        renderActiveTab();
        return true;
      }
      return false;
    } catch (e) {
      logError("pullState", e);
      return false;
    }
  }

  function setRoleEverywhere(role) {
    state.role = role || "";
    try { localStorage.setItem("role", state.role); } catch (e) { logError("setRole", e); }
    try { localStorage.setItem("selectedRole", state.role); } catch (e) { logError("setSelectedRole", e); }
  }

  function setProfileBasics(sport, days, name) {
    state.profile = state.profile || {};
    state.profile.sport = sport || state.profile.sport || SPORTS.BASKETBALL;
    state.profile.days = Number(days || state.profile.days || 4);
    if (!Number.isFinite(state.profile.days) || state.profile.days <= 0) state.profile.days = 4;
    if (typeof name === "string") state.profile.name = name;
  }

  function ensureOnboardMount() {
    let mount = $("onboard");
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "onboard";
      document.body.appendChild(mount);
    }
    return mount;
  }

  async function renderRoleChooser() {
    const mount = ensureOnboardMount();
    mount.style.display = "block";

    const supaOk = isSupabaseReady();
    const signed = supaOk ? await isSignedIn() : false;

    const currentRole = (state.role || "").trim();
    const currentSport = state.profile?.sport || SPORTS.BASKETBALL;
    const currentDays = Number.isFinite(state.profile?.days) ? String(state.profile.days) : "4";

    mount.innerHTML = `
      <div class="modalBack">
        <div class="modal">
          <h3 style="margin:0 0 6px 0">Choose your role</h3>
          <div class="small">Required to continue.</div>
          <div class="hr"></div>

          <div class="row">
            <div class="field">
              <label for="piqRole">Role (required)</label>
              <select id="piqRole">
                <option value="${ROLES.ATHLETE}">Athlete</option>
                <option value="${ROLES.COACH}">Coach</option>
                <option value="${ROLES.PARENT}">Parent</option>
                <option value="${ROLES.ADMIN}">Administrator</option>
              </select>
            </div>

            <div class="field">
              <label for="piqSport">Sport</label>
              <select id="piqSport">
                <option value="${SPORTS.BASKETBALL}">Basketball</option>
                <option value="${SPORTS.FOOTBALL}">Football</option>
                <option value="${SPORTS.BASEBALL}">Baseball</option>
                <option value="${SPORTS.VOLLEYBALL}">Volleyball</option>
                <option value="${SPORTS.SOCCER}">Soccer</option>
              </select>
            </div>

            <div class="field">
              <label for="piqDays">Days/week</label>
              <select id="piqDays">
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>
          </div>

          <div class="btnRow" style="margin-top:12px">
            <button class="btn" id="piqSaveRole" type="button">Save & continue</button>
            <button class="btn secondary" id="piqResetRole" type="button">Reset local data</button>
          </div>

          <div class="hr"></div>
          <div class="small" id="piqSyncStatus"></div>

          <div class="btnRow" style="margin-top:10px">
            <button class="btn secondary" id="piqSignIn" type="button" ${supaOk ? "" : "disabled"}>Sign in to sync</button>
            <button class="btn secondary" id="piqSignOut" type="button" ${(supaOk && signed) ? "" : "disabled"}>Sign out</button>
            <button class="btn secondary" id="piqPull" type="button" ${(supaOk && signed) ? "" : "disabled"}>Pull cloud → device</button>
          </div>

          <div class="small" style="margin-top:8px">
            Offline-first: works without signing in. Sync is optional and only runs when signed in.
          </div>
        </div>
      </div>
    `;

    const roleSel = $("piqRole");
    const sportSel = $("piqSport");
    const daysSel = $("piqDays");
    const syncEl = $("piqSyncStatus");

    if (roleSel) roleSel.value = currentRole || ROLES.ATHLETE;
    if (sportSel) sportSel.value = currentSport;
    if (daysSel) daysSel.value = currentDays;

    if (syncEl) {
      if (!supaOk) syncEl.innerHTML = "Cloud sync: <b>Unavailable</b> (Supabase not configured).";
      else if (!signed) syncEl.innerHTML = "Cloud sync: <b>Available</b> — not signed in.";
      else syncEl.innerHTML = "Cloud sync: <b>Signed in</b> — pull/push enabled.";
    }

    $("piqSaveRole")?.addEventListener("click", () => {
      setRoleEverywhere(roleSel ? roleSel.value : ROLES.ATHLETE);
      setProfileBasics(
        sportSel ? sportSel.value : SPORTS.BASKETBALL,
        daysSel ? daysSel.value : 4,
        state.profile?.name || ""
      );
      saveState();

      try { mount.style.display = "none"; mount.innerHTML = ""; } catch (e) { logError("hideRoleChooser", e); }
      hideSplashNow();
      window.startApp?.();
    });

    $("piqResetRole")?.addEventListener("click", () => {
      if (!confirm("Clear ALL saved data on this device?")) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      try { localStorage.removeItem("role"); } catch {}
      try { localStorage.removeItem("selectedRole"); } catch {}
      location.reload();
    });

    $("piqSignIn")?.addEventListener("click", async () => {
      try {
        if (!window.PIQ_AuthStore) return alert("Auth not available.");
        const email = prompt("Enter email for magic-link sign-in:");
        if (!email) return;
        await window.PIQ_AuthStore.signInWithOtp(email.trim());
        alert("Check your email for the sign-in link, then return here.");
      } catch (e) {
        logError("signIn", e);
        alert("Sign-in failed: " + (e?.message || e));
      }
    });

    $("piqSignOut")?.addEventListener("click", async () => {
      try {
        await window.PIQ_AuthStore?.signOut?.();
        alert("Signed out.");
        location.reload();
      } catch (e) {
        logError("signOut", e);
        alert("Sign-out failed: " + (e?.message || e));
      }
    });

    $("piqPull")?.addEventListener("click", async () => {
      try {
        const pulled = await __pullCloudStateIfNewer();
        alert(pulled ? "Pulled newer cloud state." : "No newer cloud state found.");
        location.reload();
      } catch (e) {
        logError("pullCloud", e);
        alert("Pull failed: " + (e?.message || e));
      }
    });
  }

  window.showRoleChooser = function () { renderRoleChooser(); };

  // =========================
  // Tabs/nav
  // =========================
  const TABS = ["profile", "program", "log", "performance", "dashboard", "team", "parent", "settings"];

  function showTab(tabName) {
    for (const t of TABS) {
      const el = $(`tab-${t}`);
      if (!el) continue;
      el.style.display = t === tabName ? "block" : "none";
    }
    state._ui = state._ui || {};
    state._ui.activeTab = tabName;
    __saveLocal(state);
  }

  function activeTab() {
    const fromState = state?._ui?.activeTab;
    if (fromState && TABS.includes(fromState)) return fromState;
    return "profile";
  }

  function wireNav() {
    for (const t of TABS) {
      $(`nav-${t}`)?.addEventListener("click", () => {
        showTab(t);
        renderActiveTab();
      });
    }
  }

  function setPills() {
    const role = (state.role || "").trim() || (localStorage.getItem("role") || "").trim() || "—";
    const rolePill = $("rolePill");
    if (rolePill) rolePill.textContent = `Role: ${role}`;

    const syncPill = $("syncPill");
    if (syncPill) syncPill.textContent = isSupabaseReady() ? "Offline-first + Sync" : "Offline-first";
  }

  // =========================
  // Program generator (unchanged)
  // =========================
  function generateProgram(sport, days) {
    const s = (sport || SPORTS.BASKETBALL).toLowerCase();
    const d = Math.min(Math.max(Number(days || 4), 3), 5);

    const baseWarmup = ["5–8 min zone 2 cardio", "Dynamic mobility (hips, ankles, t-spine)", "Glute + core activation"];
    const baseFinisher = ["Cooldown walk 5 min", "Breathing reset 3–5 min", "Stretch major muscle groups"];

    function primaryLift(name) { return { tier: "Primary", name, sets: 4, reps: "4–6", rest: "2–3 min", rpe: "7–8" }; }
    function secondaryLift(name) { return { tier: "Secondary", name, sets: 3, reps: "6–8", rest: "90 sec", rpe: "7" }; }
    function accessory(name) { return { tier: "Accessory", name, sets: 3, reps: "8–12", rest: "60 sec", rpe: "6–7" }; }

    const templates = {
      basketball: [
        { title: "Day 1 — Lower Strength", exercises: [primaryLift("Trap Bar Deadlift"), secondaryLift("Rear Foot Elevated Split Squat"), accessory("Hamstring Curl"), accessory("Core Anti-Rotation Press")] },
        { title: "Day 2 — Speed + Plyo", exercises: [{ tier: "Power", name: "Box Jumps", sets: 4, reps: "3", rest: "90 sec", rpe: "Fast & crisp" }, { tier: "Speed", name: "10–20m Sprints", sets: 6, reps: "1", rest: "Full", rpe: "Max effort" }, accessory("Calf Raises"), accessory("Hip Mobility Circuit")] },
        { title: "Day 3 — Upper Strength", exercises: [primaryLift("Bench Press"), secondaryLift("Pull-Ups"), accessory("DB Shoulder Press"), accessory("Scapular Retraction Rows")] },
        { title: "Day 4 — Reactive + Conditioning", exercises: [{ tier: "Reactive", name: "Depth Jumps", sets: 4, reps: "3", rest: "90 sec", rpe: "Explosive" }, { tier: "Agility", name: "Cone COD Drills", sets: 5, reps: "1", rest: "60 sec", rpe: "Sharp" }, accessory("Core Circuit"), accessory("Zone 2 Bike 12–15 min")] },
        { title: "Day 5 — Optional Recovery", exercises: [{ tier: "Recovery", name: "Zone 2 20–30 min", sets: 1, reps: "", rest: "", rpe: "Easy" }, accessory("Mobility Flow"), accessory("Soft Tissue Work")] }
      ]
    };

    const template = templates[s] || templates.basketball;
    const picked = template.slice(0, d);

    const progression = {
      model: "4-week wave (auto load)",
      weekMultipliers: [1.0, 1.03, 1.06, 1.09],
      guidance: "Auto progression: Week 2/3/4 gradually increase load. Readiness can override this (reduce or hold load)."
    };

    return { sport: s, days: d, createdAtISO: new Date().toISOString(), progression, warmup: baseWarmup, finisher: baseFinisher, daysPlan: picked };
  }

  function programWeekIndex(todayIso) {
    const p = state.week;
    if (!p?.createdAtISO) return 1;
    const createdIso = String(p.createdAtISO).slice(0, 10);
    const createdDay = safeDateISO(createdIso) ? createdIso : todayISO();
    const diffDays = daysBetweenISO(createdDay, todayIso);
    if (!Number.isFinite(diffDays)) return 1;
    const week = Math.floor(diffDays / 7) + 1;
    return ((week - 1) % 4) + 1;
  }

  function programBaseMultiplier(todayIso) {
    const p = state.week;
    const w = programWeekIndex(todayIso);
    const arr = p?.progression?.weekMultipliers;
    if (Array.isArray(arr) && Number.isFinite(arr[w - 1])) return arr[w - 1];
    return [1.0, 1.03, 1.06, 1.09][w - 1] || 1.0;
  }

  // =========================
  // Cloud upserts (logs/metrics)
  // =========================
  function __piqComputeVolumeFromEntries(entries) {
    let vol = 0;
    (entries || []).forEach((e) => {
      const w = Number(e && e.weight);
      const reps = Number(String(e && e.reps ? e.reps : "").replace(/[^0-9]/g, ""));
      if (Number.isFinite(w) && Number.isFinite(reps)) vol += w * reps;
    });
    return vol;
  }

  function __localLogToWorkoutRow(localLog) {
    if (!localLog) return null;
    return {
      date: localLog.dateISO || null,
      program_day: localLog.theme || null,
      volume: __piqComputeVolumeFromEntries(localLog.entries || []),
      wellness: numOrNull(localLog.wellness),
      energy: numOrNull(localLog.energy),
      hydration: typeof localLog.hydration === "string" ? localLog.hydration : null,
      injury_flag: typeof localLog.injury === "string" ? localLog.injury : "none",
