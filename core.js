// core.js — PRODUCTION-READY REPLACEMENT (FULL FILE) — v1.2.0
// Offline-first + Boot-safe + Splash-safe + Optional Supabase sync
// Phase 2 upgrades (ALL):
// A) ACWR tracking + load-based readiness caps
// B) Expanded Log inputs (practice intensity/duration + extra gym + notes)
// C) Explain-this-score breakdown panel + diagnostics
// D) Baseline window (28-day) + baseline-building mode (min samples)
// UI: readiness text color matches grade color (already), plus “Explain” panel

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

  function defaultState() {
    const now = Date.now();
    return {
      meta: { updatedAtMs: now, lastSyncedAtMs: 0, version: 0, coreVersion: "1.2.0" },
      role: "",
      profile: {
        sport: SPORTS.BASKETBALL,
        days: 4,
        name: "",
        baselineConfig: { windowDays: 28, minSamples: 5 },
        baselines: {
          wellnessAvg: null,
          energyAvg: null,
          vertAvg: null,
          sprint10Avg: null,
          codAvg: null,
          sleepHoursAvg: null,
          sleepQualityAvg: null,
          _meta: { lastBuiltAtMs: 0, windowDays: 28, minSamples: 5, logSamples: 0, testSamples: 0 }
        }
      },
      trial: { startedAtMs: now, activated: false, licenseKey: "", licenseUntilMs: 0 },
      week: null,
      logs: [],
      tests: [],
      team: { name: "", roster: [], attendance: [], board: "", compliance: "off" },
      _ui: { activeTab: "profile", explainOpen: false }
    };
  }

  function normalizeState(s) {
    const d = defaultState();
    if (!s || typeof s !== "object") return d;

    s.meta = s.meta && typeof s.meta === "object" ? s.meta : d.meta;
    if (!Number.isFinite(s.meta.updatedAtMs)) s.meta.updatedAtMs = Date.now();
    if (!Number.isFinite(s.meta.lastSyncedAtMs)) s.meta.lastSyncedAtMs = 0;
    if (!Number.isFinite(s.meta.version)) s.meta.version = 0;
    if (typeof s.meta.coreVersion !== "string") s.meta.coreVersion = d.meta.coreVersion;

    if (typeof s.role !== "string") s.role = d.role;

    s.profile = s.profile && typeof s.profile === "object" ? s.profile : d.profile;
    if (typeof s.profile.sport !== "string") s.profile.sport = d.profile.sport;
    if (!Number.isFinite(s.profile.days)) s.profile.days = d.profile.days;
    if (typeof s.profile.name !== "string") s.profile.name = d.profile.name;

    s.profile.baselineConfig = s.profile.baselineConfig && typeof s.profile.baselineConfig === "object"
      ? s.profile.baselineConfig
      : d.profile.baselineConfig;
    if (!Number.isFinite(s.profile.baselineConfig.windowDays)) s.profile.baselineConfig.windowDays = d.profile.baselineConfig.windowDays;
    if (!Number.isFinite(s.profile.baselineConfig.minSamples)) s.profile.baselineConfig.minSamples = d.profile.baselineConfig.minSamples;

    s.profile.baselines = s.profile.baselines && typeof s.profile.baselines === "object" ? s.profile.baselines : d.profile.baselines;
    const b = s.profile.baselines;
    const bd = d.profile.baselines;

    if (!Number.isFinite(b.wellnessAvg)) b.wellnessAvg = bd.wellnessAvg;
    if (!Number.isFinite(b.energyAvg)) b.energyAvg = bd.energyAvg;
    if (!Number.isFinite(b.vertAvg)) b.vertAvg = bd.vertAvg;
    if (!Number.isFinite(b.sprint10Avg)) b.sprint10Avg = bd.sprint10Avg;
    if (!Number.isFinite(b.codAvg)) b.codAvg = bd.codAvg;
    if (!Number.isFinite(b.sleepHoursAvg)) b.sleepHoursAvg = bd.sleepHoursAvg;
    if (!Number.isFinite(b.sleepQualityAvg)) b.sleepQualityAvg = bd.sleepQualityAvg;

    b._meta = b._meta && typeof b._meta === "object" ? b._meta : bd._meta;
    if (!Number.isFinite(b._meta.lastBuiltAtMs)) b._meta.lastBuiltAtMs = 0;
    if (!Number.isFinite(b._meta.windowDays)) b._meta.windowDays = s.profile.baselineConfig.windowDays;
    if (!Number.isFinite(b._meta.minSamples)) b._meta.minSamples = s.profile.baselineConfig.minSamples;
    if (!Number.isFinite(b._meta.logSamples)) b._meta.logSamples = 0;
    if (!Number.isFinite(b._meta.testSamples)) b._meta.testSamples = 0;

    s.trial = s.trial && typeof s.trial === "object" ? s.trial : d.trial;
    if (!Number.isFinite(s.trial.startedAtMs)) s.trial.startedAtMs = d.trial.startedAtMs;
    if (typeof s.trial.activated !== "boolean") s.trial.activated = d.trial.activated;
    if (typeof s.trial.licenseKey !== "string") s.trial.licenseKey = d.trial.licenseKey;
    if (!Number.isFinite(s.trial.licenseUntilMs)) s.trial.licenseUntilMs = d.trial.licenseUntilMs;

    if (!Array.isArray(s.logs)) s.logs = [];
    if (!Array.isArray(s.tests)) s.tests = [];

    s.team = s.team && typeof s.team === "object" ? s.team : d.team;
    if (typeof s.team.name !== "string") s.team.name = d.team.name;
    if (!Array.isArray(s.team.roster)) s.team.roster = [];
    if (!Array.isArray(s.team.attendance)) s.team.attendance = [];
    if (typeof s.team.board !== "string") s.team.board = d.team.board;
    if (typeof s.team.compliance !== "string") s.team.compliance = d.team.compliance;

    s._ui = s._ui && typeof s._ui === "object" ? s._ui : d._ui;
    if (typeof s._ui.activeTab !== "string") s._ui.activeTab = "profile";
    if (typeof s._ui.explainOpen !== "boolean") s._ui.explainOpen = false;

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
    state.meta.coreVersion = "1.2.0";
  }

  function saveState() {
    bumpMeta();
    __saveLocal(state);
    scheduleCloudPush();
    try { PIQ_Readiness.updateBaselinesFromHistory(todayISO()); } catch (e) { logError("baselineUpdate", e); }
    renderActiveTab();
  }

  window.PIQ = window.PIQ || {};
  window.PIQ.getState = () => state;
  window.PIQ.getErrors = () => [...errorQueue];
  window.PIQ.saveState = window.PIQ.saveState || (() => saveState());

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
    if (!window.dataStore || typeof window.dataStore.pushState !== "function") return false;
    if (!window.PIQ_AuthStore || typeof window.PIQ_AuthStore.getUser !== "function") return false;
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
    if (!window.dataStore || typeof window.dataStore.pullState !== "function") return false;
    if (!window.PIQ_AuthStore || typeof window.PIQ_AuthStore.getUser !== "function") return false;

    try {
      const u = await window.PIQ_AuthStore.getUser();
      if (!u) return false;

      const cloud = await window.dataStore.pullState();
      if (!cloud || !cloud.state || typeof cloud.state !== "object") return false;

      const cloudUpdated = Number(cloud.state?.meta?.updatedAtMs || 0);
      const localUpdated = Number(state?.meta?.updatedAtMs || 0);

      if (cloudUpdated > localUpdated) {
        const next = normalizeState(cloud.state);
        Object.keys(state).forEach((k) => { delete state[k]; });
        Object.keys(next).forEach((k) => { state[k] = next[k]; });
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
      injury_pain: numOrNull(localLog.injury_pain),
      sleep_quality: numOrNull(localLog.sleep_quality),
      practice_intensity: typeof localLog.practice_intensity === "string" ? localLog.practice_intensity : null,
      practice_duration_min: numOrNull(localLog.practice_duration_min),
      extra_gym: typeof localLog.extra_gym === "boolean" ? localLog.extra_gym : null,
      extra_gym_duration_min: numOrNull(localLog.extra_gym_duration_min)
    };
  }

  function __localTestToMetricRow(test) {
    if (!test) return null;
    return {
      date: test.dateISO || null,
      vert_inches: numOrNull(test.vert),
      sprint_seconds: numOrNull(test.sprint10),
      cod_seconds: numOrNull(test.cod),
      bw_lbs: numOrNull(test.bw),
      sleep_hours: numOrNull(test.sleep)
    };
  }

  async function __tryUpsertWorkoutLog(localLog) {
    if (!isSupabaseReady()) return false;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
    const signed = await isSignedIn().catch(() => false);
    if (!signed) return false;
    if (!window.dataStore || typeof window.dataStore.upsertWorkoutLog !== "function") return false;

    const row = __localLogToWorkoutRow(localLog);
    if (!row || !row.date) return false;
    try { await window.dataStore.upsertWorkoutLog(row); return true; }
    catch (e) { logError("upsertWorkoutLog", e); return false; }
  }

  async function __tryUpsertMetric(localTest) {
    if (!isSupabaseReady()) return false;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
    const signed = await isSignedIn().catch(() => false);
    if (!signed) return false;
    if (!window.dataStore || typeof window.dataStore.upsertPerformanceMetric !== "function") return false;

    const row = __localTestToMetricRow(localTest);
    if (!row || !row.date) return false;

    const hasAny =
      row.vert_inches !== null ||
      row.sprint_seconds !== null ||
      row.cod_seconds !== null ||
      row.bw_lbs !== null ||
      row.sleep_hours !== null;
    if (!hasAny) return false;

    try { await window.dataStore.upsertPerformanceMetric(row); return true; }
    catch (e) { logError("upsertPerformanceMetric", e); return false; }
  }

  window.PIQ.cloud = window.PIQ.cloud || {};
  window.PIQ.cloud.upsertWorkoutLogFromLocal = (localLog) => { __tryUpsertWorkoutLog(localLog); };
  window.PIQ.cloud.upsertPerformanceMetricFromLocal = (localTest) => { __tryUpsertMetric(localTest); };

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

    // ensure baseline config exists
    state.profile.baselineConfig = state.profile.baselineConfig || { windowDays: 28, minSamples: 5 };
    if (!Number.isFinite(state.profile.baselineConfig.windowDays)) state.profile.baselineConfig.windowDays = 28;
    if (!Number.isFinite(state.profile.baselineConfig.minSamples)) state.profile.baselineConfig.minSamples = 5;
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

  const TABS = ["profile", "program", "log", "performance", "dashboard", "team", "parent", "settings"];

  function showTab(tabName) {
    for (const t of TABS) {
      const el = $(`tab-${t}`);
      if (!el) continue;
      el.style.display = (t === tabName) ? "block" : "none";
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

    // Your index.html uses id="syncPill" (not trialPill)
    const syncPill = $("syncPill");
    if (syncPill) syncPill.textContent = isSupabaseReady() ? "Offline-first + Sync" : "Offline-first";
  }

  function generateProgram(sport, days) {
    const s = (sport || SPORTS.BASKETBALL).toLowerCase();
    const d = Math.min(Math.max(Number(days || 4), 3), 5);

    const baseWarmup = [
      "5–8 min zone 2 cardio",
      "Dynamic mobility (hips, ankles, t-spine)",
      "Glute + core activation"
    ];

    const baseFinisher = [
      "Cooldown walk 5 min",
      "Breathing reset 3–5 min",
      "Stretch major muscle groups"
    ];

    function primaryLift(name) {
      return { tier: "Primary", name, sets: 4, reps: "4–6", rest: "2–3 min", rpe: "7–8" };
    }
    function secondaryLift(name) {
      return { tier: "Secondary", name, sets: 3, reps: "6–8", rest: "90 sec", rpe: "7" };
    }
    function accessory(name) {
      return { tier: "Accessory", name, sets: 3, reps: "8–12", rest: "60 sec", rpe: "6–7" };
    }

    const templates = {
      basketball: [
        {
          title: "Day 1 — Lower Strength",
          exercises: [
            primaryLift("Trap Bar Deadlift"),
            secondaryLift("Rear Foot Elevated Split Squat"),
            accessory("Hamstring Curl"),
            accessory("Core Anti-Rotation Press")
          ]
        },
        {
          title: "Day 2 — Speed + Plyo",
          exercises: [
            { tier: "Power", name: "Box Jumps", sets: 4, reps: "3", rest: "90 sec", rpe: "Fast & crisp" },
            { tier: "Speed", name: "10–20m Sprints", sets: 6, reps: "1", rest: "Full", rpe: "Max effort" },
            accessory("Calf Raises"),
            accessory("Hip Mobility Circuit")
          ]
        },
        {
          title: "Day 3 — Upper Strength",
          exercises: [
            primaryLift("Bench Press"),
            secondaryLift("Pull-Ups"),
            accessory("DB Shoulder Press"),
            accessory("Scapular Retraction Rows")
          ]
        },
        {
          title: "Day 4 — Reactive + Conditioning",
          exercises: [
            { tier: "Reactive", name: "Depth Jumps", sets: 4, reps: "3", rest: "90 sec", rpe: "Explosive" },
            { tier: "Agility", name: "Cone COD Drills", sets: 5, reps: "1", rest: "60 sec", rpe: "Sharp" },
            accessory("Core Circuit"),
            accessory("Zone 2 Bike 12–15 min")
          ]
        },
        {
          title: "Day 5 — Optional Recovery",
          exercises: [
            { tier: "Recovery", name: "Zone 2 20–30 min", sets: 1, reps: "", rest: "", rpe: "Easy" },
            accessory("Mobility Flow"),
            accessory("Soft Tissue Work")
          ]
        }
      ]
    };

    const template = templates[s] || templates.basketball;
    const picked = template.slice(0, d);

    const progression = {
      model: "4-week wave (auto load)",
      weekMultipliers: [1.0, 1.03, 1.06, 1.09],
      guidance: "Auto progression: Week 2/3/4 gradually increase load. Readiness + ACWR can override (reduce or hold load)."
    };

    return {
      sport: s,
      days: d,
      createdAtISO: new Date().toISOString(),
      progression,
      warmup: baseWarmup,
      finisher: baseFinisher,
      daysPlan: picked
    };
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
  // Readiness Engine v2.1
  // Adds: Baseline windows, Baseline-building mode, ACWR, Explain breakdown
  // =========================
  const PIQ_Readiness = (function () {
    const COLORS = Object.freeze({
      A: "#2ecc71",
      B: "#f1c40f",
      C: "#e67e22",
      D: "#e74c3c",
      OUT: "#bdc3c7"
    });

    function mean(nums) {
      const v = (nums || []).filter((x) => Number.isFinite(x));
      if (!v.length) return null;
      const sum = v.reduce((a, b) => a + b, 0);
      return sum / v.length;
    }

    function slope(vals) {
      const y = (vals || []).map((x) => Number(x)).filter((x) => Number.isFinite(x));
      const n = y.length;
      if (n < 2) return null;
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += y[i];
        sumXY += i * y[i];
        sumXX += i * i;
      }
      const denom = (n * sumXX - sumX * sumX);
      if (denom === 0) return null;
      return (n * sumXY - sumX * sumY) / denom;
    }

    function lastNLogs(n, upToISO) {
      const cut = safeDateISO(upToISO) || todayISO();
      const logs = (state.logs || [])
        .filter((l) => l && safeDateISO(l.dateISO) && l.dateISO <= cut)
        .slice()
        .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
      return logs.slice(-n);
    }

    function lastNTests(n, upToISO) {
      const cut = safeDateISO(upToISO) || todayISO();
      const tests = (state.tests || [])
        .filter((t) => t && safeDateISO(t.dateISO) && t.dateISO <= cut)
        .slice()
        .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
      return tests.slice(-n);
    }

    function withinWindowISO(items, upToISO, windowDays) {
      const cut = safeDateISO(upToISO) || todayISO();
      const w = Number.isFinite(windowDays) ? windowDays : 28;
      const cutMs = isoToMs(cut);
      if (!Number.isFinite(cutMs)) return [];

      return (items || [])
        .filter((x) => x && safeDateISO(x.dateISO) && x.dateISO <= cut)
        .filter((x) => {
          const ms = isoToMs(x.dateISO);
          if (!Number.isFinite(ms)) return false;
          const ageDays = (cutMs - ms) / (1000 * 60 * 60 * 24);
          return ageDays >= 0 && ageDays <= w;
        })
        .slice()
        .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    }

    function updateBaselinesFromHistory(asOfISO) {
      const asOf = safeDateISO(asOfISO) || todayISO();
      const cfg = state.profile?.baselineConfig || { windowDays: 28, minSamples: 5 };
      const windowDays = Number.isFinite(cfg.windowDays) ? cfg.windowDays : 28;
      const minSamples = Number.isFinite(cfg.minSamples) ? cfg.minSamples : 5;

      const logsWin = withinWindowISO(state.logs || [], asOf, windowDays);
      const testsWin = withinWindowISO(state.tests || [], asOf, windowDays);

      const b = state.profile.baselines || (state.profile.baselines = {});
      b._meta = b._meta || {};
      b._meta.windowDays = windowDays;
      b._meta.minSamples = minSamples;

      const wellnessVals = logsWin.map((l) => numOrNull(l.wellness)).filter((x) => Number.isFinite(x));
      const energyVals = logsWin.map((l) => numOrNull(l.energy)).filter((x) => Number.isFinite(x));
      const sleepQVals = logsWin.map((l) => numOrNull(l.sleep_quality)).filter((x) => Number.isFinite(x));

      const vertVals = testsWin.map((t) => numOrNull(t.vert)).filter((x) => Number.isFinite(x));
      const sprintVals = testsWin.map((t) => numOrNull(t.sprint10)).filter((x) => Number.isFinite(x));
      const codVals = testsWin.map((t) => numOrNull(t.cod)).filter((x) => Number.isFinite(x));
      const sleepHVals = testsWin.map((t) => numOrNull(t.sleep)).filter((x) => Number.isFinite(x));

      b._meta.logSamples = Math.max(wellnessVals.length, energyVals.length, sleepQVals.length);
      b._meta.testSamples = Math.max(vertVals.length, sprintVals.length, codVals.length, sleepHVals.length);
      b._meta.lastBuiltAtMs = Date.now();

      // Only set baseline values when we have enough samples for that signal.
      if (wellnessVals.length >= minSamples) b.wellnessAvg = mean(wellnessVals);
      if (energyVals.length >= minSamples) b.energyAvg = mean(energyVals);
      if (sleepQVals.length >= minSamples) b.sleepQualityAvg = mean(sleepQVals);

      if (vertVals.length >= minSamples) b.vertAvg = mean(vertVals);
      if (sprintVals.length >= minSamples) b.sprint10Avg = mean(sprintVals);
      if (codVals.length >= minSamples) b.codAvg = mean(codVals);
      if (sleepHVals.length >= minSamples) b.sleepHoursAvg = mean(sleepHVals);

      state.profile.baselines = b;
      __saveLocal(state);
    }

    function hydrationScore(h) {
      const x = String(h || "").toLowerCase().trim();
      if (x === HYDRATION_LEVELS.GREAT) return 1.0;
      if (x === HYDRATION_LEVELS.GOOD) return 0.85;
      if (x === HYDRATION_LEVELS.OK) return 0.7;
      if (x === HYDRATION_LEVELS.LOW) return 0.4;
      return 0.75;
    }

    function sleepComposite(hours, quality) {
      const h = numOrNull(hours);
      const q = numOrNull(quality);
      const hs = Number.isFinite(h) ? clamp((h - 4) / (9 - 4), 0, 1) : null;
      const qs = Number.isFinite(q) ? clamp((q - 1) / (10 - 1), 0, 1) : null;
      if (qs !== null && hs !== null) return (qs * 0.6) + (hs * 0.4);
      if (qs !== null) return qs;
      if (hs !== null) return hs;
      return null;
    }

    function percentDropFromBaseline(current, baseline) {
      const c = numOrNull(current);
      const b = numOrNull(baseline);
      if (!Number.isFinite(c) || !Number.isFinite(b) || b === 0) return null;
      return (b - c) / b;
    }

    function percentWorseFromBaseline_time(current, baseline) {
      const c = numOrNull(current);
      const b = numOrNull(baseline);
      if (!Number.isFinite(c) || !Number.isFinite(b) || b === 0) return null;
      return (c - b) / b;
    }

    function injuryTierPenalty(injuryFlag, painScore) {
      const f = String(injuryFlag || "none").toLowerCase().trim();
      if (f === "out") return { lock: true, multiplier: 0, label: "Out (no training)" };

      const p = numOrNull(painScore);
      if (Number.isFinite(p)) {
        if (p >= 7) return { lock: false, multiplier: 0.0, label: "Severe pain (D-grade override)" };
        if (p >= 5) return { lock: false, multiplier: 0.75, label: "Moderate pain (-25%)" };
        if (p >= 3) return { lock: false, multiplier: 0.9, label: "Minor soreness (-10%)" };
        return { lock: false, multiplier: 1.0, label: "No meaningful pain" };
      }

      if (f === "minor") return { lock: false, multiplier: 0.9, label: "Minor (flag) (-10%)" };
      if (f === "sore") return { lock: false, multiplier: 0.93, label: "Sore (flag) (-7%)" };
      if (f === "none") return { lock: false, multiplier: 1.0, label: "None" };
      return { lock: false, multiplier: 0.9, label: "Injury (flag) (-10%)" };
    }

    function gradeFromScore(score) {
      const s = Number(score);
      if (!Number.isFinite(s)) return "B";
      if (s >= 85) return "A";
      if (s >= 70) return "B";
      if (s >= 55) return "C";
      return "D";
    }

    function readinessToModifier(grade) {
      if (grade === "A") return 1.05;
      if (grade === "B") return 1.0;
      if (grade === "C") return 0.9;
      if (grade === "D") return 0.75;
      if (grade === "OUT") return 0.0;
      return 1.0;
    }

    // Training suggestion generator (coach-usable)
    function planForGrade(grade) {
      const g = String(grade || "").toUpperCase();
      if (g === "A") return { type: "Full", volumeDelta: 0, intensityCap: "RPE ≤ 8", avoid: "None (keep technique clean)", recovery: "Normal" };
      if (g === "B") return { type: "Normal", volumeDelta: 0, intensityCap: "RPE ≤ 8", avoid: "None", recovery: "Normal" };
      if (g === "C") return { type: "Reduced", volumeDelta: -15, intensityCap: "RPE ≤ 7", avoid: "Max jumps/sprints + heavy eccentrics", recovery: "Extra sleep + hydration focus" };
      if (g === "D") return { type: "Recovery", volumeDelta: -40, intensityCap: "RPE ≤ 6", avoid: "High impact + max strength", recovery: "Mobility + easy skill + sleep priority" };
      return { type: "Off", volumeDelta: -100, intensityCap: "N/A", avoid: "Training", recovery: "Return-to-play / medical guidance" };
    }

    function guidanceForGrade(grade, payload) {
      const p = planForGrade(grade);
      const base = {
        A: "Green light.",
        B: "Normal training.",
        C: "Caution.",
        D: "Recovery focus.",
        OUT: "No training."
      }[String(grade || "").toUpperCase()] || "Normal training.";

      const parts = [];
      parts.push(`${base} Today: ${p.type}.`);
      if (p.volumeDelta !== 0 && p.volumeDelta !== -100) parts.push(`Volume ${p.volumeDelta}% (approx).`);
      if (p.volumeDelta === -100) parts.push(`Training locked.`);
      if (p.intensityCap) parts.push(`Cap: ${p.intensityCap}.`);
      if (p.avoid) parts.push(`Avoid: ${p.avoid}.`);
      if (p.recovery) parts.push(`Recovery: ${p.recovery}.`);

      if (payload && payload.length) parts.push(payload.join(" "));

      return parts.join(" ");
    }

    // Session load + ACWR
    // Session load = practiceRPE (1-10) * durationMin
    function sessionLoadFromLog(l) {
      const rpe = numOrNull(l?.practice_intensity);
      const dur = numOrNull(l?.practice_duration_min);
      if (!Number.isFinite(rpe) || !Number.isFinite(dur)) return 0;
      return clamp(rpe, 1, 10) * clamp(dur, 0, 600);
    }

    function acwrForDate(dateISO) {
      const date = safeDateISO(dateISO) || todayISO();
      const cutMs = isoToMs(date);
      if (!Number.isFinite(cutMs)) return { acute: null, chronic: null, acwr: null, note: "Bad date" };

      const logs = (state.logs || [])
        .filter((l) => l && safeDateISO(l.dateISO) && l.dateISO <= date)
        .slice()
        .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

      const loadByDay = logs.map((l) => ({ dateISO: l.dateISO, load: sessionLoadFromLog(l) }))
        .filter((x) => Number.isFinite(x.load) && x.load > 0);

      if (!loadByDay.length) return { acute: 0, chronic: 0, acwr: null, note: "No load data" };

      // Acute: last 7 days sum
      const acute = loadByDay
        .filter((x) => {
          const ms = isoToMs(x.dateISO);
          if (!Number.isFinite(ms)) return false;
          const age = (cutMs - ms) / (1000 * 60 * 60 * 24);
          return age >= 0 && age <= 6.999; // inclusive-ish
        })
        .reduce((a, b) => a + b.load, 0);

      // Chronic: last 28 days average weekly load
      const chronic28 = loadByDay
        .filter((x) => {
          const ms = isoToMs(x.dateISO);
          if (!Number.isFinite(ms)) return false;
          const age = (cutMs - ms) / (1000 * 60 * 60 * 24);
          return age >= 0 && age <= 27.999;
        })
        .reduce((a, b) => a + b.load, 0);

      // weekly average over 4 weeks
      const chronic = chronic28 / 4;

      const acwr = (chronic > 0) ? (acute / chronic) : null;
      return { acute: Math.round(acute), chronic: Math.round(chronic), acwr: acwr !== null ? Number(acwr.toFixed(2)) : null, note: "" };
    }

    function computeForDate(dateISO) {
      const date = safeDateISO(dateISO) || todayISO();

      // build baselines using configured window
      updateBaselinesFromHistory(date);

      const b = state.profile?.baselines || {};
      const cfg = state.profile?.baselineConfig || { windowDays: 28, minSamples: 5 };
      const windowDays = Number.isFinite(cfg.windowDays) ? cfg.windowDays : 28;
      const minSamples = Number.isFinite(cfg.minSamples) ? cfg.minSamples : 5;
      const baseMeta = b._meta || { logSamples: 0, testSamples: 0 };

      const baselineBuilding =
        (Number(baseMeta.logSamples) < minSamples) ||
        (Number(baseMeta.testSamples) < minSamples);

      const logs7 = lastNLogs(7, date);
      const tests7 = lastNTests(7, date);

      const todaysLog = logs7.length ? logs7[logs7.length - 1] : null;
      const todaysTest = tests7.length ? tests7[tests7.length - 1] : null;

      const wellnessToday = numOrNull(todaysLog?.wellness);
      const energyToday = numOrNull(todaysLog?.energy);

      const sleepHours = numOrNull(todaysTest?.sleep);
      const sleepQuality = numOrNull(todaysLog?.sleep_quality);

      const hydration = String(todaysLog?.hydration || "").toLowerCase().trim();
      const injuryFlag = String(todaysLog?.injury || "none").toLowerCase().trim();
      const injuryPain = numOrNull(todaysLog?.injury_pain);

      const last3 = lastNLogs(3, date);
      const w3 = last3.map((l) => numOrNull(l.wellness)).filter((x) => Number.isFinite(x));
      const e3 = last3.map((l) => numOrNull(l.energy)).filter((x) => Number.isFinite(x));

      const wSlope = slope(w3);
      const eSlope = slope(e3);

      const redFlags = [];
      const cautions = [];
      const explain = {
        points: { neuromuscular: 0, sleep: 0, subjective: 0, hydration: 0, trend: 0 },
        deltas: {},
        modifiers: { injuryMultiplier: 1, readinessModifier: 1, acwrCap: 1 },
        overrides: [],
        baseline: { building: baselineBuilding, windowDays, minSamples, logSamples: baseMeta.logSamples || 0, testSamples: baseMeta.testSamples || 0 },
        acwr: { acute: null, chronic: null, acwr: null }
      };

      if (Number.isFinite(wSlope) && wSlope <= -0.75) redFlags.push("Wellness trend dropping fast.");
      if (Number.isFinite(eSlope) && eSlope <= -0.75) redFlags.push("Energy trend dropping fast.");

      const last2 = lastNLogs(2, date);
      const lowW = last2.filter((l) => Number.isFinite(numOrNull(l.wellness)) && numOrNull(l.wellness) <= 4).length;
      if (lowW >= 2) redFlags.push("Consecutive low wellness (≤4).");

      // neuromuscular deltas only if baseline exists AND we're not baseline-building for tests
      const vertDrop = (!baselineBuilding) ? percentDropFromBaseline(todaysTest?.vert, b.vertAvg) : null;
      const sprintWorse = (!baselineBuilding) ? percentWorseFromBaseline_time(todaysTest?.sprint10, b.sprint10Avg) : null;
      const codWorse = (!baselineBuilding) ? percentWorseFromBaseline_time(todaysTest?.cod, b.codAvg) : null;

      explain.deltas.vertDrop = vertDrop;
      explain.deltas.sprintWorse = sprintWorse;
      explain.deltas.codWorse = codWorse;

      if (Number.isFinite(vertDrop) && vertDrop >= 0.05) redFlags.push("Vertical drop ≥5% vs baseline.");
      else if (Number.isFinite(vertDrop) && vertDrop >= 0.03) cautions.push("Vertical drop ≥3% vs baseline.");

      if (Number.isFinite(sprintWorse) && sprintWorse >= 0.05) redFlags.push("Sprint time worse ≥5% vs baseline.");
      else if (Number.isFinite(sprintWorse) && sprintWorse >= 0.03) cautions.push("Sprint time worse ≥3% vs baseline.");

      if (Number.isFinite(codWorse) && codWorse >= 0.05) redFlags.push("COD time worse ≥5% vs baseline.");
      else if (Number.isFinite(codWorse) && codWorse >= 0.03) cautions.push("COD time worse ≥3% vs baseline.");

      const sleepComp = sleepComposite(sleepHours, sleepQuality);
      explain.deltas.sleepComposite = sleepComp;

      if (sleepComp !== null && sleepComp < 0.35) redFlags.push("Sleep quality/duration low.");
      else if (sleepComp !== null && sleepComp < 0.5) cautions.push("Sleep could be better.");

      const hydScore = hydrationScore(hydration);
      if (hydration === HYDRATION_LEVELS.LOW) cautions.push("Hydration low.");

      // injury modifier
      const injury = injuryTierPenalty(injuryFlag, injuryPain);
      explain.modifiers.injuryMultiplier = injury.multiplier;

      if (injury.lock) {
        const baseProg = programBaseMultiplier(date);
        return {
          dateISO: date,
          score: 0,
          grade: "OUT",
          color: COLORS.OUT,
          readinessModifier: 0,
          programWeek: programWeekIndex(date),
          baseProgressionMultiplier: baseProg,
          finalProgressionMultiplier: 0,
          guidance: guidanceForGrade("OUT", [injury.label]),
          reasons: [injury.label],
          explain,
          acwr: { acute: null, chronic: null, acwr: null }
        };
      }
      if (injury.multiplier === 0) redFlags.push("Severe pain tier.");
      else if (injury.multiplier < 1) cautions.push(injury.label);

      // ACWR
      const acwrObj = acwrForDate(date);
      explain.acwr = acwrObj;

      // ACWR rules:
      // - If ACWR > 1.5 => caution + cap progression multiplier (acwrCap 0.90)
      // - If ACWR < 0.8 => underload flag (no cap; coach note)
      let acwrCap = 1.0;
      if (Number.isFinite(acwrObj.acwr) && acwrObj.acwr > 1.5) {
        cautions.push(`ACWR high (${acwrObj.acwr}).`);
        acwrCap = 0.90;
      } else if (Number.isFinite(acwrObj.acwr) && acwrObj.acwr < 0.8 && acwrObj.acwr > 0) {
        cautions.push(`ACWR low (${acwrObj.acwr}) — possible underload.`);
      }
      explain.modifiers.acwrCap = acwrCap;

      // ===== Score build (0–100) =====
      let score = 0;

      // Neuromuscular (0–40)
      let nm = 40;
      if (Number.isFinite(vertDrop)) nm -= clamp((vertDrop / 0.10) * 20, 0, 20);
      if (Number.isFinite(sprintWorse)) nm -= clamp((sprintWorse / 0.10) * 10, 0, 10);
      if (Number.isFinite(codWorse)) nm -= clamp((codWorse / 0.10) * 10, 0, 10);
      nm = clamp(nm, 0, 40);
      score += nm;
      explain.points.neuromuscular = Math.round(nm);

      // Sleep (0–20)
      let sl = 0;
      if (sleepComp === null) sl = 12; // neutral-ish when missing
      else sl = clamp(sleepComp * 20, 0, 20);
      score += sl;
      explain.points.sleep = Math.round(sl);

      // Subjective vs baseline (0–20)
      const wBase = numOrNull(b.wellnessAvg);
      const eBase = numOrNull(b.energyAvg);

      let sub = 20;
      if (!baselineBuilding && Number.isFinite(wellnessToday) && Number.isFinite(wBase)) {
        const delta = wellnessToday - wBase;
        sub += clamp(delta * 2, -12, 4);
      } else if (Number.isFinite(wellnessToday)) {
        sub += clamp((wellnessToday - 6) * 1.5, -9, 6);
      }

      if (!baselineBuilding && Number.isFinite(energyToday) && Number.isFinite(eBase)) {
        const delta = energyToday - eBase;
        sub += clamp(delta * 2, -12, 4);
      } else if (Number.isFinite(energyToday)) {
        sub += clamp((energyToday - 6) * 1.5, -9, 6);
      }

      sub = clamp(sub, 0, 20);
      score += sub;
      explain.points.subjective = Math.round(sub);

      // Hydration (0–10)
      const hydPts = clamp(hydScore * 10, 0, 10);
      score += hydPts;
      explain.points.hydration = Math.round(hydPts);

      // Trend velocity (0–10)
      let tv = 10;
      if (Number.isFinite(wSlope) && wSlope < 0) tv -= clamp(Math.abs(wSlope) * 6, 0, 6);
      if (Number.isFinite(eSlope) && eSlope < 0) tv -= clamp(Math.abs(eSlope) * 4, 0, 4);
      tv = clamp(tv, 0, 10);
      score += tv;
      explain.points.trend = Math.round(tv);

      // apply injury multiplier
      score = score * injury.multiplier;

      // grade
      let grade = gradeFromScore(score);

      // overrides
      if (baselineBuilding) {
        // soften grading while baseline is building (avoid overreacting without baselines)
        cautions.push(`Baseline building (${Math.max(baseMeta.logSamples || 0, baseMeta.testSamples || 0)}/${minSamples} samples).`);
      }

      if (redFlags.length >= 2) {
        if (grade === "A" || grade === "B") { grade = "C"; explain.overrides.push("2+ red flags → capped to C"); }
      } else if (redFlags.length === 1) {
        if (grade === "A") { grade = "B"; explain.overrides.push("1 red flag → A→B"); }
        else if (grade === "B") { grade = "C"; explain.overrides.push("1 red flag → B→C"); }
        else if (grade === "C") { grade = "D"; explain.overrides.push("1 red flag → C→D"); }
      }

      if (sleepComp !== null && sleepComp < 0.25) {
        if (grade === "A" || grade === "B") { grade = "C"; explain.overrides.push("Very low sleep → capped to C"); }
      }

      if (hydration === HYDRATION_LEVELS.LOW && Number.isFinite(wellnessToday) && wellnessToday <= 5) {
        if (grade === "A" || grade === "B") { grade = "C"; explain.overrides.push("Low hydration + low wellness → capped to C"); }
      }

      // reasons list
      const reasons = [];
      if (redFlags.length) reasons.push(...redFlags.map((x) => `⚠️ ${x}`));
      if (cautions.length) reasons.push(...cautions.map((x) => `• ${x}`));
      if (injury.label && injury.label !== "None") reasons.push(`• Injury: ${injury.label}`);

      const readinessModifier = readinessToModifier(grade);
      explain.modifiers.readinessModifier = readinessModifier;

      const baseProg = programBaseMultiplier(date);

      // final progression multiplier: base * readiness * acwrCap
      let finalProg = clamp(baseProg * readinessModifier * acwrCap, 0, 2);

      // If severe pain tier (multiplier 0) already handled; if moderate, reduce further by readiness already.
      // Provide load text
      const w = programWeekIndex(date);
      const basePct = Math.round(baseProg * 100);
      const finalPct = Math.round(finalProg * 100);

      const loadText = (function () {
        if (grade === "OUT") return "Training locked.";
        const bits = [`Week ${w} base: ${basePct}%.`, `Adjusted: ${finalPct}%.`];
        if (Number.isFinite(acwrObj.acwr) && acwrObj.acwr > 1.5) bits.push(`ACWR cap applied.`);
        return bits.join(" ");
      })();

      const guidance = guidanceForGrade(grade, [loadText]);

      return {
        dateISO: date,
        score: Math.round(score),
        grade,
        color: COLORS[grade] || COLORS.B,
        readinessModifier,
        programWeek: w,
        baseProgressionMultiplier: baseProg,
        finalProgressionMultiplier: finalProg,
        guidance,
        reasons,
        explain,
        acwr: acwrObj
      };
    }

    return { COLORS, updateBaselinesFromHistory, computeForDate };
  })();

  window.PIQ.readiness = window.PIQ.readiness || {};
  window.PIQ.readiness.forDate = (iso) => PIQ_Readiness.computeForDate(iso);
  window.PIQ.readiness.updateBaselines = (asOfISO) => PIQ_Readiness.updateBaselinesFromHistory(asOfISO || todayISO());

  // ---- Renderers ----
  function renderProfile() {
    const el = $("tab-profile");
    if (!el) return;

    const role = (state.role || "").trim() || "—";
    const sport = state.profile?.sport || SPORTS.BASKETBALL;
    const days = Number.isFinite(state.profile?.days) ? state.profile.days : 4;
    const name = state.profile?.name || "";

    const cfg = state.profile?.baselineConfig || { windowDays: 28, minSamples: 5 };
    const b = state.profile?.baselines || {};
    const bm = b._meta || {};
    const baselineText = `
      Wellness avg: ${Number.isFinite(b.wellnessAvg) ? b.wellnessAvg.toFixed(1) : "—"} •
      Energy avg: ${Number.isFinite(b.energyAvg) ? b.energyAvg.toFixed(1) : "—"} •
      SleepQ avg: ${Number.isFinite(b.sleepQualityAvg) ? b.sleepQualityAvg.toFixed(1) : "—"} •
      Vert avg: ${Number.isFinite(b.vertAvg) ? b.vertAvg.toFixed(1) : "—"}
    `;

    el.innerHTML = `
      <h3 style="margin-top:0">Profile</h3>
      <div class="small">Offline-first. Your profile saves to this device. Sign in only if you want sync.</div>
      <div class="hr"></div>

      <div class="row">
        <div class="field">
          <label for="profileName">Name (optional)</label>
          <input id="profileName" value="${sanitizeHTML(name)}" placeholder="Athlete name" />
        </div>
        <div class="field">
          <label>Role</label>
          <div class="pill">${sanitizeHTML(role)}</div>
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div class="field">
          <label for="profileSport">Sport</label>
          <select id="profileSport">
            <option value="${SPORTS.BASKETBALL}">Basketball</option>
            <option value="${SPORTS.FOOTBALL}">Football</option>
            <option value="${SPORTS.BASEBALL}">Baseball</option>
            <option value="${SPORTS.VOLLEYBALL}">Volleyball</option>
            <option value="${SPORTS.SOCCER}">Soccer</option>
          </select>
        </div>

        <div class="field">
          <label for="profileDays">Days/week</label>
          <select id="profileDays">
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div class="field">
          <label for="baselineWindowDays">Baseline window (days)</label>
          <input id="baselineWindowDays" inputmode="numeric" placeholder="28" value="${sanitizeHTML(cfg.windowDays)}"/>
        </div>
        <div class="field">
          <label for="baselineMinSamples">Min samples per signal</label>
          <input id="baselineMinSamples" inputmode="numeric" placeholder="5" value="${sanitizeHTML(cfg.minSamples)}"/>
        </div>
      </div>

      <div class="btnRow" style="margin-top:12px">
        <button class="btn" id="btnSaveProfile" type="button">Save Profile</button>
        <button class="btn secondary" id="btnGenProgram" type="button">Generate / Update Program</button>
      </div>

      <div class="hr"></div>
      <div class="small"><b>Baselines</b> (window: ${sanitizeHTML(cfg.windowDays)}d • min samples: ${sanitizeHTML(cfg.minSamples)})</div>
      <div class="small">${sanitizeHTML(baselineText)}</div>
      <div class="small">Samples — logs: ${sanitizeHTML(bm.logSamples ?? 0)} • tests: ${sanitizeHTML(bm.testSamples ?? 0)} • last built: ${bm.lastBuiltAtMs ? sanitizeHTML(new Date(bm.lastBuiltAtMs).toLocaleString()) : "—"}</div>
    `;

    $("profileSport").value = sport;
    $("profileDays").value = String(days);

    $("btnSaveProfile")?.addEventListener("click", () => {
      const nextSport = $("profileSport")?.value || sport;
      const nextDays = $("profileDays")?.value || days;
      const nextName = $("profileName")?.value || "";

      const wDays = numOrNull($("baselineWindowDays")?.value);
      const minS = numOrNull($("baselineMinSamples")?.value);

      setProfileBasics(nextSport, nextDays, nextName);

      state.profile.baselineConfig.windowDays = Number.isFinite(wDays) ? clamp(wDays, 7, 90) : 28;
      state.profile.baselineConfig.minSamples = Number.isFinite(minS) ? clamp(minS, 3, 15) : 5;

      saveState();
      setPills();
      alert("Saved.");
    });

    $("btnGenProgram")?.addEventListener("click", () => {
      const nextSport = $("profileSport")?.value || sport;
      const nextDays = $("profileDays")?.value || days;
      setProfileBasics(nextSport, nextDays, $("profileName")?.value || "");
      state.week = generateProgram(state.profile.sport, state.profile.days);
      saveState();
      showTab("program");
      renderActiveTab();
    });
  }

  function renderProgram() {
    const el = $("tab-program");
    if (!el) return;

    const p = state.week;
    if (!p) {
      el.innerHTML = `
        <h3 style="margin-top:0">Program</h3>
        <div class="small">No program yet. Go to <b>Profile</b> → Generate / Update Program.</div>
      `;
      return;
    }

    const date = todayISO();
    const r = window.PIQ?.readiness?.forDate ? window.PIQ.readiness.forDate(date) : null;
    const wk = programWeekIndex(date);
    const baseProg = programBaseMultiplier(date);
    const finalProg = r ? r.finalProgressionMultiplier : baseProg;

    const readinessLine = r
      ? `<div class="small" style="margin-top:6px;color:${sanitizeHTML(r.color)}">
          Readiness: <b>${sanitizeHTML(r.grade)}</b> (${sanitizeHTML(r.score)}) • ${sanitizeHTML(r.guidance)}
        </div>`
      : "";

    const acwrLine = (r && r.acwr && Number.isFinite(r.acwr.acwr))
      ? `<div class="small" style="margin-top:6px">
          Load: Acute ${sanitizeHTML(r.acwr.acute)} • Chronic ${sanitizeHTML(r.acwr.chronic)} • ACWR <b>${sanitizeHTML(r.acwr.acwr)}</b>
        </div>`
      : `<div class="small" style="margin-top:6px">Load: add Practice intensity + duration in Log to enable ACWR.</div>`;

    const progLine = `
      <div class="small" style="margin-top:6px">
        Auto progression: <b>Week ${wk}</b> base multiplier <b>${baseProg.toFixed(2)}x</b> • final <b>${finalProg.toFixed(2)}x</b>
      </div>
    `;

    const daysHtml = (p.daysPlan || []).map((day) => `
      <div class="card" style="margin:16px 0;padding:14px">
        <div style="font-weight:600;margin-bottom:8px">${sanitizeHTML(day.title)}</div>
        ${(day.exercises || []).map(ex => `
          <div style="margin-bottom:10px">
            <div><b>${sanitizeHTML(ex.tier)}</b> — ${sanitizeHTML(ex.name)}</div>
            <div class="small">
              ${ex.sets ? `Sets: ${sanitizeHTML(ex.sets)} • ` : ""}
              ${ex.reps ? `Reps: ${sanitizeHTML(ex.reps)} • ` : ""}
              ${ex.rest ? `Rest: ${sanitizeHTML(ex.rest)} • ` : ""}
              ${ex.rpe ? `RPE: ${sanitizeHTML(ex.rpe)}` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    `).join("");

    el.innerHTML = `
      <h3 style="margin-top:0">Program</h3>
      <div class="small">
        Sport: <b>${sanitizeHTML(p.sport)}</b> • Days/week: <b>${sanitizeHTML(p.days)}</b>
      </div>
      ${progLine}
      ${acwrLine}
      ${readinessLine}

      <div class="hr"></div>

      <div class="small"><b>Warmup</b></div>
      <ul style="margin:8px 0 16px 18px">
        ${(p.warmup || []).map(x => `<li>${sanitizeHTML(x)}</li>`).join("")}
      </ul>

      ${daysHtml}

      <div class="small"><b>Finisher</b></div>
      <ul style="margin:8px 0 0 18px">
        ${(p.finisher || []).map(x => `<li>${sanitizeHTML(x)}</li>`).join("")}
      </ul>
    `;
  }

  // LOG TAB — expanded inputs (practice intensity/duration + extra gym + notes)
  function renderLog() {
    const el = $("tab-log");
    if (!el) return;

    const logs = Array.isArray(state.logs)
      ? state.logs.slice().sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""))
      : [];

    el.innerHTML = `
      <h3 style="margin-top:0">Log</h3>
      <div class="small">Daily log drives readiness + load (ACWR). Stored locally; can sync when signed in.</div>
      <div class="hr"></div>

      <div class="row">
        <div class="field">
          <label for="logDate">Date</label>
          <input id="logDate" type="date" value="${todayISO()}"/>
        </div>
        <div class="field">
          <label for="logTheme">Program day / theme</label>
          <input id="logTheme" placeholder="e.g., Day 1 — Lower Strength"/>
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div class="field">
          <label for="wellness">Wellness (1–10)</label>
          <input id="wellness" inputmode="numeric" placeholder="7" />
        </div>
        <div class="field">
          <label for="energy">Energy (1–10)</label>
          <input id="energy" inputmode="numeric" placeholder="7" />
        </div>
        <div class="field">
          <label for="sleepQuality">Sleep quality (1–10)</label>
          <input id="sleepQuality" inputmode="numeric" placeholder="7" />
        </div>
        <div class="field">
          <label for="hydrationLevel">Hydration level</label>
          <select id="hydrationLevel">
            <option value="low">Low</option>
            <option value="ok">OK</option>
            <option value="good" selected>Good</option>
            <option value="great">Great</option>
          </select>
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div class="field">
          <label for="injuryFlag">Injury</label>
          <select id="injuryFlag">
            <option value="none">None</option>
            <option value="sore">Sore</option>
            <option value="minor">Minor</option>
            <option value="out">Out</option>
          </select>
        </div>
        <div class="field">
          <label for="injuryPain">Pain (0–10)</label>
          <input id="injuryPain" inputmode="numeric" placeholder="0" />
        </div>
      </div>

      <div class="hr"></div>

      <div class="row">
        <div class="field">
          <label for="practiceIntensity">Practice intensity (RPE 1–10)</label>
          <input id="practiceIntensity" inputmode="numeric" placeholder="7" />
        </div>
        <div class="field">
          <label for="practiceDuration">Practice duration (minutes)</label>
          <input id="practiceDuration" inputmode="numeric" placeholder="90" />
        </div>
        <div class="field">
          <label for="extraGym">Extra gym?</label>
          <select id="extraGym">
            <option value="false" selected>No</option>
            <option value="true">Yes</option>
          </select>
        </div>
        <div class="field">
          <label for="extraGymDuration">Extra gym minutes</label>
          <input id="extraGymDuration" inputmode="numeric" placeholder="30" />
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div class="field" style="flex:1">
          <label for="logNotes">Notes (optional)</label>
          <input id="logNotes" placeholder="Any soreness location, game, travel, etc." />
        </div>
      </div>

      <div class="btnRow" style="margin-top:12px">
        <button class="btn" id="btnSaveLog" type="button">Save Log</button>
      </div>

      <div class="hr"></div>

      <div class="small"><b>Recent logs</b></div>
      <div id="logList"></div>
    `;

    function clampNumOrNull(n, min, max) {
      const x = numOrNull(n);
      if (x === null) return null;
      return clamp(x, min, max);
    }

    $("btnSaveLog")?.addEventListener("click", () => {
      const dateISO = ($("logDate")?.value || todayISO()).trim();
      const hydration = ($("hydrationLevel")?.value || "good").trim();

      const wellness = clampNumOrNull($("wellness")?.value, 1, 10);
      const energy = clampNumOrNull($("energy")?.value, 1, 10);
      const sleep_quality = clampNumOrNull($("sleepQuality")?.value, 1, 10);

      const injury = ($("injuryFlag")?.value || "none").trim();
      const injury_pain = clampNumOrNull($("injuryPain")?.value, 0, 10);

      const practice_intensity = clampNumOrNull($("practiceIntensity")?.value, 1, 10);
      const practice_duration_min = clampNumOrNull($("practiceDuration")?.value, 0, 600);

      const extra_gym = ($("extraGym")?.value || "false") === "true";
      const extra_gym_duration_min = extra_gym ? clampNumOrNull($("extraGymDuration")?.value, 0, 240) : null;

      const notes = ($("logNotes")?.value || "").trim();

      const localLog = {
        dateISO,
        theme: $("logTheme")?.value || null,
        injury,
        injury_pain,
        wellness,
        energy,
        sleep_quality,
        hydration,
        practice_intensity: practice_intensity !== null ? String(practice_intensity) : null, // keep as string for DB mapping compatibility
        practice_duration_min,
        extra_gym,
        extra_gym_duration_min,
        notes: notes || null,
        entries: []
      };

      state.logs = (state.logs || []).filter((l) => l.dateISO !== dateISO);
      state.logs.push(localLog);
      state.logs.sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));
      saveState();

      window.PIQ?.cloud?.upsertWorkoutLogFromLocal(localLog);
      alert("Saved.");
    });

    const list = $("logList");
    if (!list) return;

    if (!logs.length) {
      list.innerHTML = `<div class="small">No logs yet.</div>`;
      return;
    }

    list.innerHTML = logs.slice(0, 10).map((l) => {
      const load = (function () {
        const rpe = numOrNull(l.practice_intensity);
        const dur = numOrNull(l.practice_duration_min);
        if (!Number.isFinite(rpe) || !Number.isFinite(dur)) return "—";
        return String(Math.round(clamp(rpe, 1, 10) * clamp(dur, 0, 600)));
      })();

      return `
        <div class="card" style="margin:10px 0">
          <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
            <div><b>${sanitizeHTML(l.dateISO)}</b> — ${sanitizeHTML(l.theme || "")}</div>
            <div class="small">
              Wellness: ${sanitizeHTML(l.wellness ?? "—")} • Energy: ${sanitizeHTML(l.energy ?? "—")} • SleepQ: ${sanitizeHTML(l.sleep_quality ?? "—")}
            </div>
          </div>
          <div class="small">
            Hydration: ${sanitizeHTML(l.hydration || "—")} • Injury: ${sanitizeHTML(l.injury || "none")} • Pain: ${sanitizeHTML(l.injury_pain ?? "—")}
          </div>
          <div class="small">
            Practice RPE: ${sanitizeHTML(l.practice_intensity ?? "—")} • Minutes: ${sanitizeHTML(l.practice_duration_min ?? "—")} • Session load: <b>${sanitizeHTML(load)}</b>
            • Extra gym: ${sanitizeHTML(l.extra_gym ? "Yes" : "No")} ${l.extra_gym ? `(${sanitizeHTML(l.extra_gym_duration_min ?? "—")} min)` : ""}
          </div>
          ${l.notes ? `<div class="small">Notes: ${sanitizeHTML(l.notes)}</div>` : ``}
        </div>
      `;
    }).join("");
  }

  function renderPerformance() {
    const el = $("tab-performance");
    if (!el) return;

    const tests = Array.isArray(state.tests)
      ? state.tests.slice().sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""))
      : [];

    el.innerHTML = `
      <h3 style="margin-top:0">Performance</h3>
      <div class="small">Track key metrics. Saves locally; syncs when signed in.</div>
      <div class="hr"></div>

      <div class="row">
        <div class="field">
          <label for="testDate">Date</label>
          <input id="testDate" type="date" value="${todayISO()}"/>
        </div>
        <div class="field">
          <label for="bw">Bodyweight (lbs)</label>
          <input id="bw" inputmode="decimal" placeholder="145"/>
        </div>
        <div class="field">
          <label for="sleep">Sleep (hours)</label>
          <input id="sleep" inputmode="decimal" placeholder="8"/>
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div class="field">
          <label for="vert">Vertical (in)</label>
          <input id="vert" inputmode="decimal" placeholder="28"/>
        </div>
        <div class="field">
          <label for="sprint10">Sprint (sec)</label>
          <input id="sprint10" inputmode="decimal" placeholder="1.75"/>
        </div>
        <div class="field">
          <label for="cod">COD (sec)</label>
          <input id="cod" inputmode="decimal" placeholder="4.30"/>
        </div>
      </div>

      <div class="btnRow" style="margin-top:12px">
        <button class="btn" id="btnSaveTests" type="button">Save Tests</button>
      </div>

      <div class="hr"></div>

      <div class="small"><b>Recent tests</b></div>
      <div id="testList"></div>
    `;

    $("btnSaveTests")?.addEventListener("click", () => {
      const dateISO = ($("testDate")?.value || todayISO()).trim();
      const test = {
        dateISO,
        vert: parseInputNumOrNull("vert"),
        sprint10: parseInputNumOrNull("sprint10"),
        cod: parseInputNumOrNull("cod"),
        bw: parseInputNumOrNull("bw"),
        sleep: parseInputNumOrNull("sleep")
      };

      state.tests = (state.tests || []).filter((t) => t.dateISO !== dateISO);
      state.tests.push(test);
      state.tests.sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));
      saveState();

      window.PIQ?.cloud?.upsertPerformanceMetricFromLocal(test);
      alert("Saved.");
    });

    const list = $("testList");
    if (!list) return;

    if (!tests.length) {
      list.innerHTML = `<div class="small">No tests yet.</div>`;
      return;
    }

    list.innerHTML = tests.slice(0, 10).map((t) => `
      <div class="card" style="margin:10px 0">
        <div><b>${sanitizeHTML(t.dateISO)}</b></div>
        <div class="small">
          Vert: ${sanitizeHTML(t.vert ?? "—")} • Sprint: ${sanitizeHTML(t.sprint10 ?? "—")} • COD: ${sanitizeHTML(t.cod ?? "—")}
          • BW: ${sanitizeHTML(t.bw ?? "—")} • Sleep: ${sanitizeHTML(t.sleep ?? "—")}
        </div>
      </div>
    `).join("");
  }

  function renderDashboard() {
    const el = $("tab-dashboard");
    if (!el) return;

    const r = window.PIQ?.readiness?.forDate ? window.PIQ.readiness.forDate(todayISO()) : null;

    const explainOpen = !!state._ui?.explainOpen;

    const readinessCard = r ? `
      <div class="card" style="margin:10px 0;padding:12px">
        <div class="small"><b>Readiness today</b></div>
        <div style="margin-top:6px;color:${sanitizeHTML(r.color)};font-weight:700;font-size:18px">
          ${sanitizeHTML(r.grade)} (${sanitizeHTML(r.score)})
        </div>
        <div class="small" style="margin-top:6px;color:${sanitizeHTML(r.color)}">
          ${sanitizeHTML(r.guidance)}
        </div>

        ${r.acwr && Number.isFinite(r.acwr.acwr) ? `
          <div class="small" style="margin-top:8px">
            Load: Acute ${sanitizeHTML(r.acwr.acute)} • Chronic ${sanitizeHTML(r.acwr.chronic)} • ACWR <b>${sanitizeHTML(r.acwr.acwr)}</b>
          </div>
        ` : `
          <div class="small" style="margin-top:8px">
            Load: add Practice intensity + duration in Log to enable ACWR.
          </div>
        `}

        ${r.reasons && r.reasons.length ? `
          <div class="small" style="margin-top:8px">
            ${r.reasons.map(x => sanitizeHTML(x)).join("<br/>")}
          </div>
        ` : ``}

        <div class="btnRow" style="margin-top:10px">
          <button class="btn secondary" id="btnToggleExplain" type="button">${explainOpen ? "Hide" : "Explain this score"}</button>
        </div>

        ${explainOpen ? `
          <div class="hr"></div>
          <div class="small"><b>Explain</b></div>
          <div class="small">
            Points — Neuromuscular: <b>${sanitizeHTML(r.explain?.points?.neuromuscular ?? "—")}</b>/40 •
            Sleep: <b>${sanitizeHTML(r.explain?.points?.sleep ?? "—")}</b>/20 •
            Subjective: <b>${sanitizeHTML(r.explain?.points?.subjective ?? "—")}</b>/20 •
            Hydration: <b>${sanitizeHTML(r.explain?.points?.hydration ?? "—")}</b>/10 •
            Trend: <b>${sanitizeHTML(r.explain?.points?.trend ?? "—")}</b>/10
          </div>
          <div class="small" style="margin-top:6px">
            Modifiers — Injury: <b>${sanitizeHTML(r.explain?.modifiers?.injuryMultiplier ?? "—")}</b> •
            Readiness: <b>${sanitizeHTML(r.explain?.modifiers?.readinessModifier ?? "—")}</b> •
            ACWR cap: <b>${sanitizeHTML(r.explain?.modifiers?.acwrCap ?? "—")}</b>
          </div>
          <div class="small" style="margin-top:6px">
            Baseline — window: ${sanitizeHTML(r.explain?.baseline?.windowDays ?? "—")}d •
            min samples: ${sanitizeHTML(r.explain?.baseline?.minSamples ?? "—")} •
            logs: ${sanitizeHTML(r.explain?.baseline?.logSamples ?? "—")} • tests: ${sanitizeHTML(r.explain?.baseline?.testSamples ?? "—")}
            ${r.explain?.baseline?.building ? " • <b>building</b>" : ""}
          </div>

          ${(r.explain?.deltas && (r.explain.deltas.vertDrop !== null || r.explain.deltas.sprintWorse !== null || r.explain.deltas.codWorse !== null)) ? `
            <div class="small" style="margin-top:6px">
              Deltas vs baseline —
              Vert drop: ${Number.isFinite(r.explain.deltas.vertDrop) ? sanitizeHTML((r.explain.deltas.vertDrop * 100).toFixed(1) + "%") : "—"} •
              Sprint worse: ${Number.isFinite(r.explain.deltas.sprintWorse) ? sanitizeHTML((r.explain.deltas.sprintWorse * 100).toFixed(1) + "%") : "—"} •
              COD worse: ${Number.isFinite(r.explain.deltas.codWorse) ? sanitizeHTML((r.explain.deltas.codWorse * 100).toFixed(1) + "%") : "—"}
            </div>
          ` : ``}

          ${(r.explain?.overrides && r.explain.overrides.length) ? `
            <div class="small" style="margin-top:6px">
              Overrides:<br/>${r.explain.overrides.map(x => sanitizeHTML("• " + x)).join("<br/>")}
            </div>
          ` : ``}
        ` : ``}
      </div>
    ` : "";

    el.innerHTML = `
      <h3 style="margin-top:0">Dashboard</h3>
      <div class="small">Trends + readiness guidance.</div>
      <div class="hr"></div>

      ${readinessCard}

      <div class="card" style="margin:10px 0">
        <div class="small"><b>Wellness trend (last 14)</b></div>
        <canvas id="chartWellness" width="320" height="140" style="width:100%;max-width:640px"></canvas>
      </div>

      <div class="card" style="margin:10px 0">
        <div class="small"><b>Vertical trend (last 14)</b></div>
        <canvas id="chartVert" width="320" height="140" style="width:100%;max-width:640px"></canvas>
      </div>
    `;

    $("btnToggleExplain")?.addEventListener("click", () => {
      state._ui.explainOpen = !state._ui.explainOpen;
      __saveLocal(state);
      renderDashboard();
    });

    function drawLine(canvasId, points) {
      const c = $(canvasId);
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;

      const w = c.width, h = c.height;
      ctx.clearRect(0, 0, w, h);

      if (!points || points.length < 2) {
        ctx.fillText("Not enough data yet.", 8, 18);
        return;
      }

      const ys = points.map((p) => p.y);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const pad = 10;

      const scaleX = (i) => pad + (i / (points.length - 1)) * (w - pad * 2);
      const scaleY = (y) => {
        if (maxY === minY) return h / 2;
        const t = (y - minY) / (maxY - minY);
        return (h - pad) - t * (h - pad * 2);
      };

      ctx.beginPath();
      ctx.moveTo(pad, h - pad);
      ctx.lineTo(w - pad, h - pad);
      ctx.stroke();

      ctx.beginPath();
      points.forEach((p, i) => {
        const x = scaleX(i);
        const y = scaleY(p.y);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillText(String(minY), pad, h - pad - 2);
      ctx.fillText(String(maxY), pad, pad + 10);
    }

    const logs = (state.logs || [])
      .filter((l) => l && l.dateISO)
      .slice()
      .sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""))
      .slice(-14);

    const wellnessPts = logs
      .map((l, i) => ({ x: i, y: Number(l.wellness) }))
      .filter((p) => Number.isFinite(p.y));

    drawLine("chartWellness", wellnessPts);

    const tests = (state.tests || [])
      .filter((t) => t && t.dateISO)
      .slice()
      .sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""))
      .slice(-14);

    const vertPts = tests
      .map((t, i) => ({ x: i, y: Number(t.vert) }))
      .filter((p) => Number.isFinite(p.y));

    drawLine("chartVert", vertPts);
  }

  function renderTeam() {
    const el = $("tab-team");
    if (!el) return;
    el.innerHTML = `
      <h3 style="margin-top:0">Team</h3>
      <div class="small">Team features are stubbed for now.</div>
    `;
  }

  function renderParent() {
    const el = $("tab-parent");
    if (!el) return;
    el.innerHTML = `
      <h3 style="margin-top:0">Parent</h3>
      <div class="small">Parent view is stubbed for now.</div>
    `;
  }

  async function renderSettings() {
    const el = $("tab-settings");
    if (!el) return;

    const supaOk = isSupabaseReady();
    const signed = supaOk ? await isSignedIn() : false;

    const r = window.PIQ?.readiness?.forDate ? window.PIQ.readiness.forDate(todayISO()) : null;

    el.innerHTML = `
      <h3 style="margin-top:0">Settings</h3>
      <div class="small">Status</div>
      <div class="hr"></div>

      <div class="card" style="margin:10px 0">
        <div class="small">
          Core: <b>${sanitizeHTML(state.meta.coreVersion || "—")}</b><br/>
          Supabase: <b>${supaOk ? "Configured" : "Not configured"}</b><br/>
          Auth: <b>${signed ? "Signed in" : "Signed out"}</b><br/>
          Last synced: <b>${state.meta.lastSyncedAtMs ? sanitizeHTML(new Date(state.meta.lastSyncedAtMs).toLocaleString()) : "—"}</b>
        </div>
      </div>

      <div class="btnRow" style="margin-top:12px">
        <button class="btn secondary" id="btnSettingsSignIn" type="button" ${supaOk ? "" : "disabled"}>Sign in</button>
        <button class="btn secondary" id="btnSettingsSignOut" type="button" ${(supaOk && signed) ? "" : "disabled"}>Sign out</button>
        <button class="btn secondary" id="btnSettingsPull" type="button" ${(supaOk && signed) ? "" : "disabled"}>Pull cloud → device</button>
        <button class="btn secondary" id="btnSettingsPush" type="button" ${(supaOk && signed) ? "" : "disabled"}>Push device → cloud</button>
      </div>

      <div class="hr"></div>

      <div class="btnRow">
        <button class="btn secondary" id="btnDumpState" type="button">Copy state JSON</button>
        <button class="btn secondary" id="btnRecalcBaselines" type="button">Rebuild baselines</button>
        <button class="btn secondary" id="btnCopyReadiness" type="button">Copy readiness JSON</button>
      </div>

      <div class="small" style="margin-top:10px"><b>Diagnostics</b></div>
      <pre style="white-space:pre-wrap;max-height:240px;overflow:auto">${sanitizeHTML(JSON.stringify({
        now: new Date().toISOString(),
        coreVersion: state.meta.coreVersion,
        stateVersion: state.meta.version,
        activeTab: state._ui.activeTab,
        readiness: r ? {
          dateISO: r.dateISO, grade: r.grade, score: r.score,
          baseProgressionMultiplier: r.baseProgressionMultiplier,
          finalProgressionMultiplier: r.finalProgressionMultiplier,
          acwr: r.acwr
        } : null
      }, null, 2))}</pre>

      <div class="small" style="margin-top:10px">Errors (latest first):</div>
      <pre style="white-space:pre-wrap;max-height:240px;overflow:auto">${sanitizeHTML(JSON.stringify(errorQueue.slice().reverse().slice(0, 10), null, 2))}</pre>
    `;

    $("btnSettingsSignIn")?.addEventListener("click", async () => {
      try {
        const email = prompt("Enter email for magic-link sign-in:");
        if (!email) return;
        await window.PIQ_AuthStore.signInWithOtp(email.trim());
        alert("Check your email for the sign-in link, then return here.");
      } catch (e) {
        logError("settingsSignIn", e);
        alert("Sign-in failed: " + (e?.message || e));
      }
    });

    $("btnSettingsSignOut")?.addEventListener("click", async () => {
      try {
        await window.PIQ_AuthStore?.signOut?.();
        alert("Signed out.");
        location.reload();
      } catch (e) {
        logError("settingsSignOut", e);
        alert("Sign-out failed: " + (e?.message || e));
      }
    });

    $("btnSettingsPull")?.addEventListener("click", async () => {
      const pulled = await __pullCloudStateIfNewer();
      alert(pulled ? "Pulled newer cloud state." : "No newer cloud state found.");
      renderActiveTab();
    });

    $("btnSettingsPush")?.addEventListener("click", async () => {
      const ok = await __pushStateNow();
      alert(ok ? "Pushed current device state to cloud." : "Push skipped (not signed in / offline / error).");
      renderActiveTab();
    });

    $("btnDumpState")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
        alert("Copied.");
      } catch {
        alert("Copy failed. (Clipboard permissions)");
      }
    });

    $("btnRecalcBaselines")?.addEventListener("click", () => {
      try {
        window.PIQ?.readiness?.updateBaselines?.(todayISO());
        alert("Baselines rebuilt from configured window.");
        renderActiveTab();
      } catch (e) {
        logError("recalcBaselines", e);
        alert("Baseline rebuild failed.");
      }
    });

    $("btnCopyReadiness")?.addEventListener("click", async () => {
      try {
        const rr = window.PIQ?.readiness?.forDate ? window.PIQ.readiness.forDate(todayISO()) : null;
        await navigator.clipboard.writeText(JSON.stringify(rr, null, 2));
        alert("Copied readiness JSON.");
      } catch {
        alert("Copy failed. (Clipboard permissions)");
      }
    });
  }

  function renderActiveTab() {
    setPills();
    switch (activeTab()) {
      case "profile": renderProfile(); break;
      case "program": renderProgram(); break;
      case "log": renderLog(); break;
      case "performance": renderPerformance(); break;
      case "dashboard": renderDashboard(); break;
      case "team": renderTeam(); break;
      case "parent": renderParent(); break;
      case "settings": renderSettings(); break;
      default: renderProfile(); break;
    }
  }

  window.startApp = function () {
    const role = (state.role || "").trim() || (localStorage.getItem("role") || "").trim();
    if (!role) {
      window.showRoleChooser();
      return;
    }
    if (!state.role) setRoleEverywhere(role);

    wireNav();
    showTab(activeTab());

    try { PIQ_Readiness.updateBaselinesFromHistory(todayISO()); } catch (e) { logError("baselineInit", e); }

    renderActiveTab();
    hideSplashNow();

    console.log("PerformanceIQ core started. Role:", state.role || role, "core:", state.meta.coreVersion);
  };

  document.addEventListener("DOMContentLoaded", () => {
    $("btnSwitchRole")?.addEventListener("click", () => {
      try { localStorage.removeItem("role"); } catch {}
      try { localStorage.removeItem("selectedRole"); } catch {}
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      location.reload();
    });
  });

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      if (isSupabaseReady() && (await isSignedIn())) {
        await __pullCloudStateIfNewer();
      }
    } catch (e) {
      logError("startupPull", e);
    }

    setTimeout(hideSplashNow, SPLASH_FAILSAFE_MS);
    window.addEventListener("click", hideSplashNow, { once: true });
    window.addEventListener("touchstart", hideSplashNow, { once: true });
  });
})();
