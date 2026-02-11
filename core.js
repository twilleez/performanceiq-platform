// core.js — PRODUCTION-READY REPLACEMENT (MERGED WITH UI/ROUTER FIX)
// Boot-safe + Splash-safe + Offline-first + Optional Supabase sync (state + logs + metrics)
(function () {
  "use strict";

  // ---- Guard: prevent double-load ----
  if (window.__PIQ_CORE_LOADED__) return;
  window.__PIQ_CORE_LOADED__ = true;

  // ---- Constants ----
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

  // ---- Error Queue ----
  const errorQueue = [];
  function logError(context, error) {
    const entry = {
      context,
      message: error?.message || String(error),
      ts: Date.now()
    };
    errorQueue.push(entry);
    if (errorQueue.length > MAX_ERROR_QUEUE_SIZE) errorQueue.shift();
    console.warn(`[${context}]`, error);
  }

  // ---- Helpers ----
  const $ = (id) => document.getElementById(id) || null;

  function $$(ids) {
    return ids.reduce((acc, id) => {
      acc[id] = document.getElementById(id);
      return acc;
    }, {});
  }

  function sanitizeHTML(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }

  const numOrNull = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

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

  /**
   * @returns {any}
   */
  function defaultState() {
    const now = Date.now();
    return {
      meta: { updatedAtMs: now, lastSyncedAtMs: 0, version: 0 },
      role: "",
      profile: { sport: SPORTS.BASKETBALL, days: 4, athleteName: "" },
      trial: {
        startedAtMs: now,
        activated: false,
        licenseKey: "",
        licenseUntilMs: 0
      },
      week: null,
      logs: [],
      tests: [],
      team: {
        name: "",
        roster: [],
        attendance: [],
        board: "",
        compliance: "off"
      },
      ui: { route: "profile" }
    };
  }

  function normalizeState(s) {
    const d = defaultState();
    if (!s || typeof s !== "object") return d;

    // meta
    s.meta = s.meta && typeof s.meta === "object" ? s.meta : d.meta;
    if (!Number.isFinite(s.meta.updatedAtMs)) s.meta.updatedAtMs = Date.now();
    if (!Number.isFinite(s.meta.lastSyncedAtMs)) s.meta.lastSyncedAtMs = 0;
    if (!Number.isFinite(s.meta.version)) s.meta.version = 0;

    // role
    if (typeof s.role !== "string") s.role = d.role;

    // profile
    s.profile = s.profile && typeof s.profile === "object" ? s.profile : d.profile;
    if (typeof s.profile.sport !== "string") s.profile.sport = d.profile.sport;
    if (!Number.isFinite(s.profile.days)) s.profile.days = d.profile.days;
    if (typeof s.profile.athleteName !== "string") s.profile.athleteName = d.profile.athleteName;

    // trial
    s.trial = s.trial && typeof s.trial === "object" ? s.trial : d.trial;
    if (!Number.isFinite(s.trial.startedAtMs)) s.trial.startedAtMs = d.trial.startedAtMs;
    if (typeof s.trial.activated !== "boolean") s.trial.activated = d.trial.activated;
    if (typeof s.trial.licenseKey !== "string") s.trial.licenseKey = d.trial.licenseKey;
    if (!Number.isFinite(s.trial.licenseUntilMs)) s.trial.licenseUntilMs = d.trial.licenseUntilMs;

    // collections
    if (!Array.isArray(s.logs)) s.logs = [];
    if (!Array.isArray(s.tests)) s.tests = [];

    // team
    s.team = s.team && typeof s.team === "object" ? s.team : d.team;
    if (typeof s.team.name !== "string") s.team.name = d.team.name;
    if (!Array.isArray(s.team.roster)) s.team.roster = [];
    if (!Array.isArray(s.team.attendance)) s.team.attendance = [];
    if (typeof s.team.board !== "string") s.team.board = d.team.board;
    if (typeof s.team.compliance !== "string") s.team.compliance = d.team.compliance;

    // ui
    s.ui = s.ui && typeof s.ui === "object" ? s.ui : d.ui;
    if (typeof s.ui.route !== "string") s.ui.route = "profile";

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

  // ---- State Manager Class ----
  class StateManager {
    constructor(initialState) {
      this._state = initialState;
      this._listeners = new Set();
    }

    get state() {
      return this._state;
    }

    update(updater) {
      const next = typeof updater === "function" ? updater(this._state) : updater;
      this._state = normalizeState(next);
      this._state.meta.updatedAtMs = Date.now();
      this._state.meta.version = (this._state.meta.version || 0) + 1;
      __saveLocal(this._state);
      this.notify();
      return this._state;
    }

    mergeFromCloud(cloudState) {
      const normalized = normalizeState(cloudState);
      Object.assign(this._state, normalized);
      __saveLocal(this._state);
      this.notify();
    }

    subscribe(listener) {
      this._listeners.add(listener);
      return () => this._listeners.delete(listener);
    }

    notify() {
      this._listeners.forEach((fn) => {
        try {
          fn(this._state);
        } catch (e) {
          logError("stateListener", e);
        }
      });
    }
  }

  // Initialize state manager
  const stateManager = new StateManager(loadState() || defaultState());
  const state = stateManager.state;

  // ---- Cloud Sync Queue ----
  class CloudSyncQueue {
    constructor() {
      this.queue = [];
      this.processing = false;
    }

    async enqueue(operation) {
      this.queue.push(operation);
      if (!this.processing) await this.process();
    }

    async process() {
      this.processing = true;
      while (this.queue.length > 0) {
        const op = this.queue.shift();
        try {
          await op();
        } catch (e) {
          logError("cloudSyncQueue", e);
        }
      }
      this.processing = false;
    }
  }
  const syncQueue = new CloudSyncQueue();

  // ---- Expose debug handles ----
  window.PIQ = window.PIQ || {};
  window.PIQ.getState = () => state;
  window.PIQ.getErrors = () => [...errorQueue];

  // ---- Splash safe hide ----
  function hideSplashNow() {
    const s = $("splash");
    if (!s) return;
    s.classList.add("hidden");
    s.style.display = "none";
    s.style.visibility = "hidden";
    s.style.opacity = "0";
    try {
      s.remove();
    } catch (e) {
      logError("hideSplash", e);
    }
  }
  window.hideSplashNow = window.hideSplashNow || hideSplashNow;

  // ---- Supabase readiness helpers ----
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

  // ---- Cloud push (state) debounced ----
  async function __pushStateNow() {
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
    } catch (error) {
      logError("pushState", error);
      return false;
    }
  }

  const scheduleCloudPush = debounce(async () => {
    if (!window.dataStore || typeof window.dataStore.pushState !== "function") return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    await syncQueue.enqueue(async () => {
      await __pushStateNow();
    });
  }, CLOUD_PUSH_DEBOUNCE_MS);

  function saveState(s) {
    stateManager.update(s);
    scheduleCloudPush();
  }
  window.PIQ.saveState = window.PIQ.saveState || saveState;

  // =========================================================
  // CLOUD HELPERS (logs + metrics)
  // =========================================================

  function __piqComputeVolumeFromEntries(entries) {
    let vol = 0;
    (entries || []).forEach((e) => {
      const w = Number(e && e.weight);
      const reps = Number(String(e && e.reps ? e.reps : "").replace(/[^0-9]/g, ""));
      if (Number.isFinite(w) && Number.isFinite(reps)) vol += w * reps;
    });
    return vol;
  }

  function __piqLocalLogToWorkoutRow(localLog) {
    if (!localLog) return null;
    return {
      date: localLog.dateISO || null,
      program_day: localLog.theme || null,
      volume: __piqComputeVolumeFromEntries(localLog.entries || []),
      wellness: numOrNull(localLog.wellness),
      energy: numOrNull(localLog.energy),
      hydration: typeof localLog.hydration === "string" ? localLog.hydration : null,
      injury_flag: typeof localLog.injury === "string" ? localLog.injury : "none",
      practice_intensity:
        typeof localLog.practice_intensity === "string" ? localLog.practice_intensity : null,
      practice_duration_min: numOrNull(localLog.practice_duration_min),
      extra_gym: typeof localLog.extra_gym === "boolean" ? localLog.extra_gym : null,
      extra_gym_duration_min: numOrNull(localLog.extra_gym_duration_min)
    };
  }

  function __piqLocalTestToMetricRow(test) {
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

  async function __piqTryUpsertWorkoutLog(localLog) {
    if (!window.dataStore || typeof window.dataStore.upsertWorkoutLog !== "function") return false;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;

    const row = __piqLocalLogToWorkoutRow(localLog);
    if (!row || !row.date) return false;

    try {
      await window.dataStore.upsertWorkoutLog(row);
      return true;
    } catch (e) {
      logError("upsertWorkoutLog", e);
      return false;
    }
  }

  async function __piqTryUpsertPerformanceMetric(localTest) {
    if (!window.dataStore || typeof window.dataStore.upsertPerformanceMetric !== "function")
      return false;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;

    const row = __piqLocalTestToMetricRow(localTest);
    if (!row || !row.date) return false;

    const hasAny =
      row.vert_inches !== null ||
      row.sprint_seconds !== null ||
      row.cod_seconds !== null ||
      row.bw_lbs !== null ||
      row.sleep_hours !== null;
    if (!hasAny) return false;

    try {
      await window.dataStore.upsertPerformanceMetric(row);
      return true;
    } catch (e) {
      logError("upsertPerformanceMetric", e);
      return false;
    }
  }

  async function __piqTryPullCloudStateIfNewer() {
    if (!window.dataStore || typeof window.dataStore.pullState !== "function") return;
    if (!window.PIQ_AuthStore || typeof window.PIQ_AuthStore.getUser !== "function") return;

    try {
      const u = await window.PIQ_AuthStore.getUser();
      if (!u) return;

      const cloud = await window.dataStore.pullState();
      if (!cloud || !cloud.state || typeof cloud.state !== "object") return;

      const cloudUpdated = Number(cloud.state?.meta?.updatedAtMs || 0);
      const localUpdated = Number(state?.meta?.updatedAtMs || 0);

      if (cloudUpdated > localUpdated) {
        stateManager.mergeFromCloud(cloud.state);
        console.log("[cloud] pulled newer state");
      }
    } catch (e) {
      logError("pullCloudState", e);
    }
  }

  window.PIQ.cloud = window.PIQ.cloud || {};
  window.PIQ.cloud.upsertWorkoutLogFromLocal = function (localLog) {
    syncQueue.enqueue(() => __piqTryUpsertWorkoutLog(localLog));
  };
  window.PIQ.cloud.upsertPerformanceMetricFromLocal = function (localTest) {
    syncQueue.enqueue(() => __piqTryUpsertPerformanceMetric(localTest));
  };

  (function wirePullOnAuth() {
    const auth = window.PIQ_AuthStore;
    if (!auth || typeof auth.onAuthChange !== "function") return;
    auth.onAuthChange((user) => {
      if (user) syncQueue.enqueue(() => __piqTryPullCloudStateIfNewer());
    });
  })();

  // =========================================================
  // ROLE CHOOSER
  // =========================================================

  function ensureOnboardMount() {
    let mount = $("onboard");
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "onboard";
      document.body.appendChild(mount);
    }
    return mount;
  }

  function setRoleEverywhere(role) {
    state.role = role || "";
    try { localStorage.setItem("role", state.role); } catch (e) { logError("setRole", e); }
    try { localStorage.setItem("selectedRole", state.role); } catch (e) { logError("setSelectedRole", e); }
  }

  function setProfileBasics(sport, days) {
    state.profile = state.profile || {};
    state.profile.sport = sport || state.profile.sport || SPORTS.BASKETBALL;
    state.profile.days = Number(days || state.profile.days || 4);
    if (!Number.isFinite(state.profile.days) || state.profile.days <= 0) state.profile.days = 4;
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
            <button class="btn secondary" id="piqSignOut" type="button" ${supaOk && signed ? "" : "disabled"}>Sign out</button>
            <button class="btn secondary" id="piqPull" type="button" ${supaOk && signed ? "" : "disabled"}>Pull cloud → device</button>
          </div>

          <div class="small" style="margin-top:8px">
            Offline-first: works without signing in. Sync is optional and only runs when signed in.
          </div>
        </div>
      </div>
    `;

    const elements = $$(["piqRole", "piqSport", "piqDays", "piqSyncStatus"]);
    if (elements.piqRole) elements.piqRole.value = currentRole || ROLES.ATHLETE;
    if (elements.piqSport) elements.piqSport.value = currentSport;
    if (elements.piqDays) elements.piqDays.value = currentDays;

    if (elements.piqSyncStatus) {
      if (!supaOk) elements.piqSyncStatus.innerHTML = "Cloud sync: <b>Unavailable</b> (Supabase not configured).";
      else if (!signed) elements.piqSyncStatus.innerHTML = "Cloud sync: <b>Available</b> — not signed in.";
      else elements.piqSyncStatus.innerHTML = "Cloud sync: <b>Signed in</b> — pull/push enabled.";
    }

    $("piqSaveRole")?.addEventListener("click", () => {
      const role = elements.piqRole ? elements.piqRole.value : ROLES.ATHLETE;
      const sport = elements.piqSport ? elements.piqSport.value : SPORTS.BASKETBALL;
      const days = elements.piqDays ? elements.piqDays.value : "4";

      setRoleEverywhere(role);
      setProfileBasics(sport, days);

      saveState(state);

      try { mount.style.display = "none"; mount.innerHTML = ""; } catch (e) { logError("hideRoleChooser", e); }
      hideSplashNow();
      if (typeof
