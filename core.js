// core.js — PRODUCTION-READY REPLACEMENT (MERGED FIX)
// Boot-safe + Splash-safe + Offline-first + Optional Supabase sync (state + logs + metrics)
// FIX INCLUDED: auto-injects missing tab UI so "No information" no longer happens.
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
    div.textContent = str == null ? "" : String(str);
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

  function defaultState() {
    const now = Date.now();
    return {
      meta: { updatedAtMs: now, lastSyncedAtMs: 0, version: 0 },
      role: "",
      profile: { sport: SPORTS.BASKETBALL, days: 4 },
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
      }
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
    if (!Number.isFinite(s.profile.days) || s.profile.days <= 0) s.profile.days = d.profile.days;

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

  // ---- State Manager ----
  class StateManager {
    constructor(initialState) {
      this._state = initialState;
      this._listeners = new Set();
    }
    get state() {
      return this._state;
    }
    update(next) {
      const normalized = normalizeState(next);
      normalized.meta.updatedAtMs = Date.now();
      normalized.meta.version = (normalized.meta.version || 0) + 1;
      this._state = normalized;
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

  // ---- Cloud push (state) ----
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
    renderAll(); // <-- FIX: render after any save so UI updates
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
        renderAll();
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
  // UI INJECTION FIX (THIS IS WHY YOU HAD "NO INFORMATION")
  // =========================================================
  function ensureTabMarkup() {
    const tabs = {
      profile: $("tab-profile"),
      program: $("tab-program"),
      log: $("tab-log"),
      performance: $("tab-performance"),
      dashboard: $("tab-dashboard"),
      team: $("tab-team"),
      parent: $("tab-parent"),
      settings: $("tab-settings")
    };

    // Profile UI
    if (tabs.profile && tabs.profile.innerHTML.trim().length < 10) {
      tabs.profile.innerHTML = `
        <h2 style="margin-top:0">Profile</h2>
        <div class="row">
          <div class="field">
            <label>Sport</label>
            <select id="sport">
              <option value="${SPORTS.BASKETBALL}">Basketball</option>
              <option value="${SPORTS.FOOTBALL}">Football</option>
              <option value="${SPORTS.BASEBALL}">Baseball</option>
              <option value="${SPORTS.VOLLEYBALL}">Volleyball</option>
              <option value="${SPORTS.SOCCER}">Soccer</option>
            </select>
          </div>
          <div class="field">
            <label>Days / week</label>
            <select id="days">
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>
        </div>

        <div class="row" style="margin-top:10px">
          <div class="field">
            <label>Wellness (1–10)</label>
            <input id="wellness" type="range" min="1" max="10" value="7" />
            <div class="small">Value: <span id="wellnessNum">7</span></div>
          </div>
          <div class="field">
            <label>Notes</label>
            <textarea id="notes" rows="3" placeholder="Any notes…"></textarea>
          </div>
        </div>

        <div class="btnRow" style="margin-top:10px">
          <button class="btn" id="btnSaveProfile" type="button">Save Profile</button>
        </div>

        <div class="hr"></div>
        <div class="small" id="profileSummary"></div>
      `;
    }

    // Log UI
    if (tabs.log && tabs.log.innerHTML.trim().length < 10) {
      tabs.log.innerHTML = `
        <h2 style="margin-top:0">Log</h2>

        <div class="row">
          <div class="field">
            <label>Date</label>
            <input id="logDate" type="date" />
          </div>
          <div class="field">
            <label>Theme</label>
            <input id="logTheme" type="text" placeholder="e.g., Strength A" />
          </div>
          <div class="field">
            <label>Injury flag</label>
            <select id="injuryFlag">
              <option value="none">none</option>
              <option value="sore">sore</option>
              <option value="pain">pain</option>
              <option value="injured">injured</option>
            </select>
          </div>
        </div>

        <div class="btnRow" style="margin-top:10px">
          <button class="btn" id="btnSaveLog" type="button">Save Log</button>
        </div>

        <div class="hr"></div>
        <div class="small" id="logSummary"></div>
      `;
    }

    // Performance UI
    if (tabs.performance && tabs.performance.innerHTML.trim().length < 10) {
      tabs.performance.innerHTML = `
        <h2 style="margin-top:0">Performance</h2>
        <div class="row">
          <div class="field">
            <label>Date</label>
            <input id="testDate" type="date" />
          </div>
          <div class="field">
            <label>Vertical (in)</label>
            <input id="vert" inputmode="decimal" placeholder="e.g., 28.5" />
          </div>
          <div class="field">
            <label>Sprint (sec)</label>
            <input id="sprint10" inputmode="decimal" placeholder="e.g., 1.78" />
          </div>
        </div>
        <div class="row" style="margin-top:10px">
          <div class="field">
            <label>COD (sec)</label>
            <input id="cod" inputmode="decimal" placeholder="e.g., 4.25" />
          </div>
          <div class="field">
            <label>Bodyweight (lb)</label>
            <input id="bw" inputmode="decimal" placeholder="e.g., 150" />
          </div>
          <div class="field">
            <label>Sleep (hrs)</label>
            <input id="sleep" inputmode="decimal" placeholder="e.g., 7.5" />
          </div>
        </div>

        <div class="btnRow" style="margin-top:10px">
          <button class="btn" id="btnSaveTests" type="button">Save Test</button>
        </div>

        <div class="hr"></div>
        <div class="small" id="testsSummary"></div>
      `;
    }

    // Dashboard UI (minimal)
    if (tabs.dashboard && tabs.dashboard.innerHTML.trim().length < 10) {
      tabs.dashboard.innerHTML = `
        <h2 style="margin-top:0">Dashboard</h2>
        <div class="small" id="dashSummary"></div>
        <div class="hr"></div>
        <div class="small" id="cloudSummary"></div>
      `;
    }

    // Settings UI (minimal)
    if (tabs.settings && tabs.settings.innerHTML.trim().length < 10) {
      tabs.settings.innerHTML = `
        <h2 style="margin-top:0">Settings</h2>
        <div class="small">If you want cloud sync, use "Switch Role" then "Sign in to sync".</div>
        <div class="btnRow" style="margin-top:10px">
          <button class="btn secondary" id="btnExportAll" type="button">Export Local JSON</button>
          <button class="btn secondary" id="btnClearLocal" type="button">Clear Local Data</button>
        </div>
        <div class="hr"></div>
        <pre class="small" id="debugState" style="white-space:pre-wrap"></pre>
      `;
    }
  }

  // =========================================================
  // NAV ROUTING
  // =========================================================
  function setActiveTab(tab) {
    const tabs = ["profile","program","log","performance","dashboard","team","parent","settings"];
    tabs.forEach((t) => {
      const btn = $("nav-" + t);
      const panel = $("tab-" + t);
      if (btn) btn.classList.toggle("active", t === tab);
      if (panel) panel.style.display = t === tab ? "block" : "none";
    });
  }

  function routeFromHash() {
    const raw = (location.hash || "#profile").replace("#", "");
    const ok = new Set(["profile","program","log","performance","dashboard","team","parent","settings"]);
    const tab = ok.has(raw) ? raw : "profile";
    setActiveTab(tab);
    renderAll();
  }

  function bindNav() {
    const tabs = ["profile","program","log","performance","dashboard","team","parent","settings"];
    tabs.forEach((t) => {
      const btn = $("nav-" + t);
      if (btn) btn.addEventListener("click", () => (location.hash = "#" + t));
    });
    window.addEventListener("hashchange", routeFromHash);
  }

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
    const pill = $("rolePill");
    if (pill) pill.textContent = "Role: " + (state.role || "—");
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

    const els = $$(["piqRole", "piqSport", "piqDays", "piqSyncStatus"]);
    if (els.piqRole) els.piqRole.value = currentRole || ROLES.ATHLETE;
    if (els.piqSport) els.piqSport.value = currentSport;
    if (els.piqDays) els.piqDays.value = currentDays;

    if (els.piqSyncStatus) {
      if (!supaOk) els.piqSyncStatus.innerHTML = "Cloud sync: <b>Unavailable</b> (Supabase not configured).";
      else if (!signed) els.piqSyncStatus.innerHTML = "Cloud sync: <b>Available</b> — not signed in.";
      else els.piqSyncStatus.innerHTML = "Cloud sync: <b>Signed in</b> — pull/push enabled.";
    }

    $("piqSaveRole")?.addEventListener("click", () => {
      const role = els.piqRole ? els.piqRole.value : ROLES.ATHLETE;
      const sport = els.piqSport ? els.piqSport.value : SPORTS.BASKETBALL;
      const days = els.piqDays ? els.piqDays.value : "4";

      setRoleEverywhere(role);
      setProfileBasics(sport, days);
      saveState(state);

      try { mount.style.display = "none"; mount.innerHTML = ""; } catch (e) { logError("hideRoleChooser", e); }
      hideSplashNow();

      if (typeof window.startApp === "function") window.startApp();
    });

    $("piqResetRole")?.addEventListener("click", () => {
      if (!confirm("Clear ALL saved data on this device?")) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { logError("resetStorage", e); }
      try { localStorage.removeItem("role"); } catch (e) { logError("resetRole", e); }
      try { localStorage.removeItem("selectedRole"); } catch (e) { logError("resetSelectedRole", e); }
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
        await __piqTryPullCloudStateIfNewer();
        alert("Pulled cloud (if newer). Reloading.");
        location.reload();
      } catch (e) {
        logError("pullCloud", e);
        alert("Pull failed: " + (e?.message || e));
      }
    });
  }

  window.showRoleChooser = function () {
    renderRoleChooser();
  };

  // =========================================================
  // SAVE FUNCTIONS (EXIST + WIRED)
  // =========================================================
  async function saveTests() {
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
    state.tests.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    saveState(state);

    // one-liner to cloud
    window.PIQ?.cloud?.upsertPerformanceMetricFromLocal(test);
    renderAll();
  }

  async function saveLog() {
    const dateISO = ($("logDate")?.value || todayISO()).trim();
    const localLog = {
      dateISO,
      theme: ($("logTheme")?.value || "").trim() || null,
      injury: $("injuryFlag")?.value || "none",
      wellness: numOrNull($("wellness")?.value),
      entries: []
    };

    state.logs = (state.logs || []).filter((l) => l.dateISO !== dateISO);
    state.logs.push(localLog);
    state.logs.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    saveState(state);

    // one-liner to cloud
    window.PIQ?.cloud?.upsertWorkoutLogFromLocal(localLog);
    renderAll();
  }

  window.PIQ.saveTests = window.PIQ.saveTests || saveTests;
  window.PIQ.saveLog = window.PIQ.saveLog || saveLog;

  // =========================================================
  // RENDERERS (so something shows up!)
  // =========================================================
  function syncProfileUIFromState() {
    const sport = $("sport");
    const days = $("days");
    const wellness = $("wellness");
    const wellnessNum = $("wellnessNum");
    const notes = $("notes");

    if (sport) sport.value = state.profile?.sport || SPORTS.BASKETBALL;
    if (days) days.value = String(state.profile?.days || 4);

    const w = Number.isFinite(Number(state.profile?.wellness)) ? Number(state.profile.wellness) : 7;
    if (wellness) wellness.value = String(w);
    if (wellnessNum) wellnessNum.textContent = String(w);

    if (notes) notes.value = state.profile?.notes || "";
  }

  function renderProfileSummary() {
    const el = $("profileSummary");
    if (!el) return;
    const sport = sanitizeHTML(state.profile?.sport || "—");
    const days = sanitizeHTML(String(state.profile?.days || "—"));
    const role = sanitizeHTML(state.role || "—");
    el.innerHTML = `Saved: Role=<b>${role}</b>, Sport=<b>${sport}</b>, Days=<b>${days}</b>`;
  }

  function renderLogSummary() {
    const el = $("logSummary");
    if (!el) return;
    const last = (state.logs || [])[state.logs.length - 1];
    if (!last) {
      el.innerHTML = "No logs yet.";
      return;
    }
    el.innerHTML =
      `Latest log: <b>${sanitizeHTML(last.dateISO)}</b> • Theme: <b>${sanitizeHTML(last.theme || "—")}</b> • Injury: <b>${sanitizeHTML(last.injury || "none")}</b>`;
  }

  function renderTestsSummary() {
    const el = $("testsSummary");
    if (!el) return;
    const last = (state.tests || [])[state.tests.length - 1];
    if (!last) {
      el.innerHTML = "No tests yet.";
      return;
    }
    el.innerHTML =
      `Latest test: <b>${sanitizeHTML(last.dateISO)}</b> • Vert: <b>${sanitizeHTML(String(last.vert ?? "—"))}</b> • Sprint: <b>${sanitizeHTML(String(last.sprint10 ?? "—"))}</b>`;
  }

  async function renderCloudSummary() {
    const el = $("cloudSummary");
    if (!el) return;

    const supaOk = isSupabaseReady();
    const signed = supaOk ? await isSignedIn() : false;

    if (!supaOk) {
      el.innerHTML = "Cloud: <b>Unavailable</b> (Supabase not configured).";
      return;
    }
    if (!signed) {
      el.innerHTML = "Cloud: <b>Available</b> — not signed in.";
      return;
    }
    el.innerHTML = `Cloud: <b>Signed in</b> • Last sync: ${
      state.meta?.lastSyncedAtMs ? new Date(state.meta.lastSyncedAtMs).toLocaleString() : "—"
    }`;
  }

  function renderDebugState() {
    const el = $("debugState");
    if (!el) return;
    el.textContent = JSON.stringify(state, null, 2);
  }

  function renderDashboardSummary() {
    const el = $("dashSummary");
    if (!el) return;
    el.innerHTML =
      `Local totals: <b>${(state.logs || []).length}</b> logs • <b>${(state.tests || []).length}</b> tests`;
  }

  function renderAll() {
    // only render if tabs exist
    renderProfileSummary();
    renderLogSummary();
    renderTestsSummary();
    renderDashboardSummary();
    renderDebugState();
    // cloud summary is async
    renderCloudSummary().catch(() => {});
  }

  // =========================================================
  // START APP (wires everything)
  // =========================================================
  function wireUIHandlers() {
    $("btnSaveProfile")?.addEventListener("click", () => {
      try {
        const sport = $("sport")?.value || SPORTS.BASKETBALL;
        const days = Number($("days")?.value || 4);
        const w = Number($("wellness")?.value || 7);
        const notes = $("notes")?.value || "";

        state.profile = state.profile || {};
        state.profile.sport = sport;
        state.profile.days = Number.isFinite(days) ? days : 4;
        state.profile.wellness = Number.isFinite(w) ? w : 7;
        state.profile.notes = notes;

        saveState(state);
      } catch (e) {
        logError("saveProfile", e);
      }
    });

    $("wellness")?.addEventListener("input", () => {
      const v = $("wellness")?.value || "7";
      const wn = $("wellnessNum");
      if (wn) wn.textContent = v;
    });

    $("btnSaveTests")?.addEventListener("click", () => {
      window.PIQ.saveTests().catch((e) => logError("saveTests", e));
    });

    $("btnSaveLog")?.addEventListener("click", () => {
      window.PIQ.saveLog().catch((e) => logError("saveLog", e));
    });

    $("btnExportAll")?.addEventListener("click", () => {
      try {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "piq_all_data.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      } catch (e) {
        logError("exportAll", e);
      }
    });

    $("btnClearLocal")?.addEventListener("click", () => {
      if (!confirm("Clear ALL local data on this device?")) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      try { localStorage.removeItem("role"); } catch {}
      try { localStorage.removeItem("selectedRole"); } catch {}
      location.reload();
    });

    $("btnSwitchRole")?.addEventListener("click", () => {
      if (!confirm("Switch role? This will return you to role setup.")) return;
      try { localStorage.removeItem("role"); } catch {}
      try { localStorage.removeItem("selectedRole"); } catch {}
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      window.showRoleChooser();
    });
  }

  window.startApp =
    window.startApp ||
    function () {
      // FIX: inject UI first so tabs aren't empty
      ensureTabMarkup();
      bindNav();
      wireUIHandlers();

      // role gate
      const role = (state.role || "").trim() || (localStorage.getItem("role") || "").trim();
      if (!role) {
        window.showRoleChooser();
        return;
      }
      if (!state.role) setRoleEverywhere(role);

      // initialize dates if present
      if ($("logDate") && !$("logDate").value) $("logDate").value = todayISO();
      if ($("testDate") && !$("testDate").value) $("testDate").value = todayISO();

      // sync UI from state into injected markup
      syncProfileUIFromState();

      // default route
      if (!location.hash) location.hash = "#profile";
      routeFromHash();

      renderAll();
      console.log("PerformanceIQ core started. Role:", state.role);
    };

  // =========================================================
  // STARTUP
  // =========================================================
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      // ensure markup exists early so user sees something immediately
      ensureTabMarkup();

      // attempt cloud pull after sign-in (optional)
      if (await isSignedIn()) await syncQueue.enqueue(() => __piqTryPullCloudStateIfNewer());
    } catch (e) {
      logError("startupPull", e);
    }

    // splash failsafe
    setTimeout(hideSplashNow, SPLASH_FAILSAFE_MS);
    window.addEventListener("click", hideSplashNow, { once: true });
    window.addEventListener("touchstart", hideSplashNow, { once: true });

    // auto-start
    try { window.startApp(); } catch (e) { logError("startApp", e); }
  });
})();
