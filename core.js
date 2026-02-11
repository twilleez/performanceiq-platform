// core.js — PRODUCTION-READY REPLACEMENT (FULL FILE)
// Boot-safe + Splash-safe + Offline-first + Optional Supabase sync (state + logs + metrics)
// Includes: working tab system + working Profile + Program (structured) + Log (with hydration level) + Performance + Dashboard + Settings
// NEW: Readiness engine (0–100) using Wellness + Energy + Sleep + Hydration + Injury (computed, not stored)
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
    const entry = { context, message: error?.message || String(error), ts: Date.now() };
    errorQueue.push(entry);
    if (errorQueue.length > MAX_ERROR_QUEUE_SIZE) errorQueue.shift();
    console.warn(`[${context}]`, error);
  }

  // ---- DOM Helpers ----
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

  // ---- Local persistence ----
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
      profile: { sport: SPORTS.BASKETBALL, days: 4, name: "" },
      trial: { startedAtMs: now, activated: false, licenseKey: "", licenseUntilMs: 0 },
      week: null,
      logs: [],
      tests: [],
      team: { name: "", roster: [], attendance: [], board: "", compliance: "off" },
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

  // ---- State (simple, mutable, saved) ----
  const state = loadState() || defaultState();

  function bumpMeta() {
    state.meta.updatedAtMs = Date.now();
    state.meta.version = (state.meta.version || 0) + 1;
  }

  function saveState() {
    bumpMeta();
    __saveLocal(state);
    scheduleCloudPush();
    renderActiveTab(); // keep UI in sync
  }

  // ---- Expose debug handles ----
  window.PIQ = window.PIQ || {};
  window.PIQ.getState = () => state;
  window.PIQ.getErrors = () => [...errorQueue];
  window.PIQ.saveState = window.PIQ.saveState || (() => saveState());

  // ---- Splash hide ----
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

  // ---- Supabase readiness ----
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
    } catch (e) {
      logError("pushState", e);
      return false;
    }
  }

  const scheduleCloudPush = debounce(async () => {
    if (!isSupabaseReady()) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    await __pushStateNow();
  }, CLOUD_PUSH_DEBOUNCE_MS);

  async function __pullCloudStateIfNewer() {
    if (!window.dataStore || typeof window.dataStore.pullState !== "function") return false;
    if (!window.PIQ_AuthStore || typeof window.PIQ_AuthStore.getUser !== "function") return false;

    try {
      const u = await window.PIQ_AuthStore.getUser();
      if (!u) return false;

      const cloud = await window.dataStore.pullState(); // {state, updated_at} or null
      if (!cloud || !cloud.state || typeof cloud.state !== "object") return false;

      const cloudUpdated = Number(cloud.state?.meta?.updatedAtMs || 0);
      const localUpdated = Number(state?.meta?.updatedAtMs || 0);

      if (cloudUpdated > localUpdated) {
        const next = normalizeState(cloud.state);
        Object.keys(state).forEach((k) => {
          delete state[k];
        });
        Object.keys(next).forEach((k) => {
          state[k] = next[k];
        });
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

  // ---- Logs + Metrics cloud helpers (optional) ----
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
    if (!window.dataStore || typeof window.dataStore.upsertWorkoutLog !== "function") return false;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
    const row = __localLogToWorkoutRow(localLog);
    if (!row || !row.date) return false;
    try {
      await window.dataStore.upsertWorkoutLog(row);
      return true;
    } catch (e) {
      logError("upsertWorkoutLog", e);
      return false;
    }
  }

  async function __tryUpsertMetric(localTest) {
    if (!window.dataStore || typeof window.dataStore.upsertPerformanceMetric !== "function") return false;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
    const row = __localTestToMetricRow(localTest);
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

  window.PIQ.cloud = window.PIQ.cloud || {};
  window.PIQ.cloud.upsertWorkoutLogFromLocal = (localLog) => {
    __tryUpsertWorkoutLog(localLog);
  };
  window.PIQ.cloud.upsertPerformanceMetricFromLocal = (localTest) => {
    __tryUpsertMetric(localTest);
  };

  // ---- Role helpers ----
  function setRoleEverywhere(role) {
    state.role = role || "";
    try {
      localStorage.setItem("role", state.role);
    } catch (e) {
      logError("setRole", e);
    }
    try {
      localStorage.setItem("selectedRole", state.role);
    } catch (e) {
      logError("setSelectedRole", e);
    }
  }

  function setProfileBasics(sport, days, name) {
    state.profile = state.profile || {};
    state.profile.sport = sport || state.profile.sport || SPORTS.BASKETBALL;
    state.profile.days = Number(days || state.profile.days || 4);
    if (!Number.isFinite(state.profile.days) || state.profile.days <= 0) state.profile.days = 4;
    if (typeof name === "string") state.profile.name = name;
  }

  // ---- Minimal, real role chooser UI ----
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

      try {
        mount.style.display = "none";
        mount.innerHTML = "";
      } catch (e) {
        logError("hideRoleChooser", e);
      }
      hideSplashNow();
      window.startApp?.();
    });

    $("piqResetRole")?.addEventListener("click", () => {
      if (!confirm("Clear ALL saved data on this device?")) return;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      try {
        localStorage.removeItem("role");
      } catch {}
      try {
        localStorage.removeItem("selectedRole");
      } catch {}
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

  // boot.js calls this when no role is stored
  window.showRoleChooser = function () {
    renderRoleChooser();
  };

  // ---- Tab system ----
  const TABS = ["profile", "program", "log", "performance", "dashboard", "team", "parent", "settings"];

  function showTab(tabName) {
    for (const t of TABS) {
      const el = $(`tab-${t}`);
      if (!el) continue;
      el.style.display = t === tabName ? "block" : "none";
    }
    state._ui = state._ui || {};
    state._ui.activeTab = tabName;
    __saveLocal(state); // UI-only; don't bump meta/version
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
    const trialPill = $("trialPill");
    if (trialPill) trialPill.textContent = isSupabaseReady() ? "Offline-first + Sync" : "Offline-first";
  }

  // =========================================================
  // ✅ READINESS ENGINE (computed, not stored)
  // =========================================================

  function clamp01(x) {
    if (!Number.isFinite(x)) return null;
    if (x < 0) return 0;
    if (x > 1) return 1;
    return x;
  }

  function hydrationFactor(level) {
    const v = String(level || "").toLowerCase().trim();
    // No fractions are displayed to the user; this is internal computation only.
    if (v === "low") return 0.60;
    if (v === "ok") return 0.75;
    if (v === "good") return 0.90;
    if (v === "great") return 1.0;
    return null;
  }

  function injuryFactor(flag) {
    const v = String(flag || "").toLowerCase().trim();
    if (v === "none") return 1.0;
    if (v === "sore") return 0.90;
    if (v === "minor") return 0.75;
    if (v === "out") return 0.40;
    return null;
  }

  function sleepFactor(hours) {
    const h = Number(hours);
    if (!Number.isFinite(h)) return null;

    // simple, transparent model:
    // - target 8h -> 1.0
    // - 6h -> 0.70
    // - 9h -> 1.0 (cap)
    // - <5h -> 0.45 floor
    if (h >= 8) return 1.0;
    if (h >= 6) {
      // linear from 6->8 : 0.70 -> 1.00
      const t = (h - 6) / 2;
      return 0.70 + t * 0.30;
    }
    if (h >= 5) {
      // linear from 5->6 : 0.45 -> 0.70
      const t = (h - 5) / 1;
      return 0.45 + t * 0.25;
    }
    return 0.45;
  }

  function score0100(x01) {
    if (!Number.isFinite(x01)) return null;
    return Math.round(clamp01(x01) * 100);
  }

  function findLogByDate(dateISO) {
    const d = String(dateISO || "").trim();
    if (!d) return null;
    const logs = Array.isArray(state.logs) ? state.logs : [];
    // exact match preferred
    const exact = logs.find((l) => l && l.dateISO === d);
    if (exact) return exact;
    return null;
  }

  function findTestByDate(dateISO) {
    const d = String(dateISO || "").trim();
    if (!d) return null;
    const tests = Array.isArray(state.tests) ? state.tests : [];
    const exact = tests.find((t) => t && t.dateISO === d);
    if (exact) return exact;
    return null;
  }

  /**
   * Compute readiness 0-100 for a given date.
   * Uses available components and renormalizes weights if some are missing.
   * Returns { score, breakdown, inputs } or null if no usable inputs.
   */
  function computeReadinessForDate(dateISO, overrides) {
    const d = String(dateISO || "").trim();
    if (!d) return null;

    const log = findLogByDate(d);
    const test = findTestByDate(d);

    const wellness = overrides?.wellness ?? (log ? numOrNull(log.wellness) : null);
    const energy = overrides?.energy ?? (log ? numOrNull(log.energy) : null);
    const hydration = overrides?.hydration ?? (log ? log.hydration : null);
    const injury = overrides?.injury ?? (log ? log.injury : null);
    const sleep = overrides?.sleep ?? (test ? numOrNull(test.sleep) : null);

    const wellness01 = Number.isFinite(wellness) ? clamp01(wellness / 10) : null;
    const energy01 = Number.isFinite(energy) ? clamp01(energy / 10) : null;
    const hydration01 = hydrationFactor(hydration);
    const injury01 = injuryFactor(injury);
    const sleep01 = sleepFactor(sleep);

    // Weights (industry-style: wellness/energy/sleep dominate)
    const components = [
      { key: "wellness", value: wellness01, w: 0.35 },
      { key: "energy", value: energy01, w: 0.25 },
      { key: "sleep", value: sleep01, w: 0.25 },
      { key: "hydration", value: hydration01, w: 0.10 },
      { key: "injury", value: injury01, w: 0.05 }
    ].filter((c) => Number.isFinite(c.value));

    if (!components.length) return null;

    const totalW = components.reduce((acc, c) => acc + c.w, 0);
    const readiness01 = components.reduce((acc, c) => acc + (c.value * (c.w / totalW)), 0);

    const breakdown = {
      wellness: score0100(wellness01),
      energy: score0100(energy01),
      sleep: score0100(sleep01),
      hydration: score0100(hydration01),
      injury: score0100(injury01)
    };

    return {
      dateISO: d,
      score: score0100(readiness01),
      breakdown,
      inputs: {
        wellness,
        energy,
        sleep,
        hydration: typeof hydration === "string" ? hydration : null,
        injury: typeof injury === "string" ? injury : null
      }
    };
  }

  function computeReadinessHistory(lastN) {
    const N = Math.max(1, Math.min(Number(lastN || 14), 60));

    // Collect dates from logs/tests
    const dates = new Set();
    (state.logs || []).forEach((l) => l?.dateISO && dates.add(l.dateISO));
    (state.tests || []).forEach((t) => t?.dateISO && dates.add(t.dateISO));

    const ordered = Array.from(dates).sort((a, b) => String(a).localeCompare(String(b))).slice(-N);

    const rows = ordered
      .map((d) => computeReadinessForDate(d))
      .filter((r) => r && Number.isFinite(r.score));

    return rows;
  }

  // Expose readiness functions for debugging
  window.PIQ.readiness = window.PIQ.readiness || {};
  window.PIQ.readiness.forDate = (dateISO) => computeReadinessForDate(dateISO);
  window.PIQ.readiness.history = (n) => computeReadinessHistory(n);

  // =========================================================
  // ✅ PROGRAM GENERATOR (STRUCTURED, REAL EXERCISES)
  // =========================================================
  function generateProgram(sport, days) {
    const s = (sport || SPORTS.BASKETBALL).toLowerCase();
    const d = Math.min(Math.max(Number(days || 4), 3), 5);

    const baseWarmup = ["5–8 min zone 2 cardio", "Dynamic mobility (hips, ankles, t-spine)", "Glute + core activation"];

    const baseFinisher = ["Cooldown walk 5 min", "Breathing reset 3–5 min", "Stretch major muscle groups"];

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
          exercises: [primaryLift("Trap Bar Deadlift"), secondaryLift("Rear Foot Elevated Split Squat"), accessory("Hamstring Curl"), accessory("Core Anti-Rotation Press")]
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
          exercises: [primaryLift("Bench Press"), secondaryLift("Pull-Ups"), accessory("DB Shoulder Press"), accessory("Scapular Retraction Rows")]
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
          exercises: [{ tier: "Recovery", name: "Zone 2 20–30 min", sets: 1, reps: "", rest: "", rpe: "Easy" }, accessory("Mobility Flow"), accessory("Soft Tissue Work")]
        }
      ],
      football: [
        { title: "Day 1 — Lower Strength", exercises: [primaryLift("Back Squat"), secondaryLift("RDL"), accessory("Split Squat"), accessory("Core Bracing")] },
        {
          title: "Day 2 — Speed/Agility",
          exercises: [
            { tier: "Speed", name: "10–30m Sprints", sets: 6, reps: "1", rest: "Full", rpe: "Max" },
            { tier: "Agility", name: "5-10-5 Shuttle", sets: 5, reps: "1", rest: "90 sec", rpe: "Sharp" },
            accessory("Hip Mobility")
          ]
        },
        { title: "Day 3 — Upper Strength", exercises: [primaryLift("Bench Press"), secondaryLift("Rows"), accessory("Incline DB Press"), accessory("Face Pulls")] },
        {
          title: "Day 4 — Power/Conditioning",
          exercises: [
            { tier: "Power", name: "Med Ball Throws", sets: 5, reps: "3", rest: "60 sec", rpe: "Explosive" },
            { tier: "Conditioning", name: "Tempo Runs", sets: 8, reps: "100m", rest: "Walk back", rpe: "Moderate" },
            accessory("Mobility")
          ]
        },
        { title: "Day 5 — Optional", exercises: [{ tier: "Recovery", name: "Zone 2 20 min", sets: 1, reps: "", rest: "", rpe: "Easy" }] }
      ],
      soccer: [
        { title: "Day 1 — Strength", exercises: [primaryLift("Trap Bar Deadlift"), secondaryLift("Bulgarian Split Squat"), accessory("Nordics (if able)"), accessory("Core")] },
        {
          title: "Day 2 — Speed",
          exercises: [
            { tier: "Speed", name: "Flying 10s", sets: 6, reps: "1", rest: "Full", rpe: "Max" },
            { tier: "COD", name: "Cone COD", sets: 5, reps: "1", rest: "60–90 sec", rpe: "Sharp" },
            accessory("Mobility")
          ]
        },
        { title: "Day 3 — Upper + Core", exercises: [primaryLift("Incline Bench"), secondaryLift("Pull-Ups"), accessory("Rows"), accessory("Core Anti-Rotation")] },
        { title: "Day 4 — Conditioning", exercises: [{ tier: "Conditioning", name: "Intervals (e.g., 4x4 min)", sets: 1, reps: "", rest: "", rpe: "Hard" }, accessory("Mobility")] },
        { title: "Day 5 — Optional", exercises: [{ tier: "Recovery", name: "Zone 2 20–30 min", sets: 1, reps: "", rest: "", rpe: "Easy" }] }
      ]
    };

    const template = templates[s] || templates.basketball;
    const picked = template.slice(0, d);

    return {
      sport: s,
      days: d,
      createdAtISO: new Date().toISOString(),
      progression: { model: "4-week wave", description: "Weeks 1–3 increase load slightly; Week 4 deload (~-15% volume)." },
      warmup: baseWarmup,
      finisher: baseFinisher,
      daysPlan: picked
    };
  }

  // ---- Renderers ----
  function renderProfile() {
    const el = $("tab-profile");
    if (!el) return;

    const role = (state.role || "").trim() || "—";
    const sport = state.profile?.sport || SPORTS.BASKETBALL;
    const days = Number.isFinite(state.profile?.days) ? state.profile.days : 4;
    const name = state.profile?.name || "";

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

      <div class="btnRow" style="margin-top:12px">
        <button class="btn" id="btnSaveProfile" type="button">Save Profile</button>
        <button class="btn secondary" id="btnGenProgram" type="button">Generate / Update Program</button>
      </div>

      <div class="hr"></div>
      <div class="small">Tip: After generating a program, open the <b>Program</b> tab.</div>
    `;

    $("profileSport").value = sport;
    $("profileDays").value = String(days);

    $("btnSaveProfile")?.addEventListener("click", () => {
      const nextSport = $("profileSport")?.value || sport;
      const nextDays = $("profileDays")?.value || days;
      const nextName = $("profileName")?.value || "";
      setProfileBasics(nextSport, nextDays, nextName);
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

    const daysHtml = (p.daysPlan || [])
      .map(
        (day) => `
      <div class="card" style="margin:16px 0;padding:14px">
        <div style="font-weight:600;margin-bottom:8px">${sanitizeHTML(day.title)}</div>
        ${(day.exercises || [])
          .map(
            (ex) => `
          <div style="margin-bottom:10px">
            <div><b>${sanitizeHTML(ex.tier)}</b> — ${sanitizeHTML(ex.name)}</div>
            <div class="small">
              ${ex.sets ? `Sets: ${sanitizeHTML(ex.sets)} • ` : ""}
              ${ex.reps ? `Reps: ${sanitizeHTML(ex.reps)} • ` : ""}
              ${ex.rest ? `Rest: ${sanitizeHTML(ex.rest)} • ` : ""}
              ${ex.rpe ? `RPE: ${sanitizeHTML(ex.rpe)}` : ""}
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `
      )
      .join("");

    el.innerHTML = `
      <h3 style="margin-top:0">Program</h3>
      <div class="small">
        Sport: <b>${sanitizeHTML(p.sport)}</b> • Days/week: <b>${sanitizeHTML(p.days)}</b>
      </div>

      <div class="small" style="margin-top:4px">
        Progression Model: <b>${sanitizeHTML(p.progression?.model || "—")}</b>
      </div>
      <div class="small">${sanitizeHTML(p.progression?.description || "")}</div>

      <div class="hr"></div>

      <div class="small"><b>Warmup</b></div>
      <ul style="margin:8px 0 16px 18px">
        ${(p.warmup || []).map((x) => `<li>${sanitizeHTML(x)}</li>`).join("")}
      </ul>

      ${daysHtml}

      <div class="small"><b>Finisher</b></div>
      <ul style="margin:8px 0 0 18px">
        ${(p.finisher || []).map((x) => `<li>${sanitizeHTML(x)}</li>`).join("")}
      </ul>
    `;
  }

  function renderLog() {
    const el = $("tab-log");
    if (!el) return;

    const logs = Array.isArray(state.logs) ? state.logs.slice().sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || "")) : [];

    el.innerHTML = `
      <h3 style="margin-top:0">Log</h3>
      <div class="small">Save a quick daily log. Stored locally; can sync when signed in.</div>
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
          <input id="wellness" inputmode="numeric" placeholder="7"/>
        </div>
        <div class="field">
          <label for="energy">Energy (1–10)</label>
          <input id="energy" inputmode="numeric" placeholder="7"/>
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
        <div class="field">
          <label for="injuryFlag">Injury</label>
          <select id="injuryFlag">
            <option value="none">None</option>
            <option value="sore">Sore</option>
            <option value="minor">Minor</option>
            <option value="out">Out</option>
          </select>
        </div>
      </div>

      <div class="card" style="margin-top:12px;padding:12px">
        <div class="small"><b>Readiness (preview)</b></div>
        <div id="readinessPreview" class="small">Enter values to see today’s readiness score.</div>
      </div>

      <div class="btnRow" style="margin-top:12px">
        <button class="btn" id="btnSaveLog" type="button">Save Log</button>
      </div>

      <div class="hr"></div>

      <div class="small"><b>Recent logs</b></div>
      <div id="logList"></div>
    `;

    function updateReadinessPreview() {
      const dateISO = ($("logDate")?.value || todayISO()).trim();
      const preview = $("readinessPreview");
      if (!preview) return;

      // Pull sleep from performance test for same date if available
      const t = findTestByDate(dateISO);
      const sleep = t ? numOrNull(t.sleep) : null;

      const r = computeReadinessForDate(dateISO, {
        wellness: numOrNull($("wellness")?.value),
        energy: numOrNull($("energy")?.value),
        hydration: ($("hydrationLevel")?.value || "good").trim(),
        injury: ($("injuryFlag")?.value || "none").trim(),
        sleep
      });

      if (!r || !Number.isFinite(r.score)) {
        preview.textContent = "Enter values to see today’s readiness score.";
        return;
      }

      const bits = [];
      if (Number.isFinite(r.breakdown.wellness)) bits.push(`Wellness ${r.breakdown.wellness}`);
      if (Number.isFinite(r.breakdown.energy)) bits.push(`Energy ${r.breakdown.energy}`);
      if (Number.isFinite(r.breakdown.sleep)) bits.push(`Sleep ${r.breakdown.sleep}`);
      if (Number.isFinite(r.breakdown.hydration)) bits.push(`Hydration ${r.breakdown.hydration}`);
      if (Number.isFinite(r.breakdown.injury)) bits.push(`Injury ${r.breakdown.injury}`);

      preview.innerHTML = `Score: <b>${sanitizeHTML(r.score)}</b> / 100<br/><span class="small">${sanitizeHTML(bits.join(" • "))}</span>`;
    }

    // live preview events
    ["logDate", "wellness", "energy", "hydrationLevel", "injuryFlag"].forEach((id) => {
      $(id)?.addEventListener("input", updateReadinessPreview);
      $(id)?.addEventListener("change", updateReadinessPreview);
    });
    updateReadinessPreview();

    $("btnSaveLog")?.addEventListener("click", () => {
      const dateISO = ($("logDate")?.value || todayISO()).trim();
      const hydration = ($("hydrationLevel")?.value || "good").trim(); // hydration level (categorical)

      const localLog = {
        dateISO,
        theme: $("logTheme")?.value || null,
        injury: $("injuryFlag")?.value || "none",
        wellness: numOrNull($("wellness")?.value),
        energy: numOrNull($("energy")?.value),
        hydration, // stored in local state
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

    list.innerHTML = logs
      .slice(0, 10)
      .map((l) => {
        const r = computeReadinessForDate(l.dateISO);
        const rTxt = r && Number.isFinite(r.score) ? ` • Readiness: ${sanitizeHTML(r.score)}` : "";
        return `
        <div class="card" style="margin:10px 0">
          <div style="display:flex;justify-content:space-between;gap:10px">
            <div><b>${sanitizeHTML(l.dateISO)}</b> — ${sanitizeHTML(l.theme || "")}</div>
            <div class="small">Wellness: ${sanitizeHTML(l.wellness ?? "—")} • Energy: ${sanitizeHTML(l.energy ?? "—")}${rTxt}</div>
          </div>
          <div class="small">Hydration: ${sanitizeHTML(l.hydration || "—")} • Injury: ${sanitizeHTML(l.injury || "none")}</div>
        </div>
      `;
      })
      .join("");
  }

  function renderPerformance() {
    const el = $("tab-performance");
    if (!el) return;

    const tests = Array.isArray(state.tests) ? state.tests.slice().sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || "")) : [];

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

    list.innerHTML = tests
      .slice(0, 10)
      .map((t) => `
      <div class="card" style="margin:10px 0">
        <div><b>${sanitizeHTML(t.dateISO)}</b></div>
        <div class="small">
          Vert: ${sanitizeHTML(t.vert ?? "—")} • Sprint: ${sanitizeHTML(t.sprint10 ?? "—")} • COD: ${sanitizeHTML(t.cod ?? "—")}
          • BW: ${sanitizeHTML(t.bw ?? "—")} • Sleep: ${sanitizeHTML(t.sleep ?? "—")}
        </div>
      </div>
    `)
      .join("");
  }

  function renderDashboard() {
    const el = $("tab-dashboard");
    if (!el) return;

    el.innerHTML = `
      <h3 style="margin-top:0">Dashboard</h3>
      <div class="small">Trends from your logs, tests, and readiness.</div>
      <div class="hr"></div>

      <div class="card" style="margin:10px 0;padding:12px">
        <div class="small"><b>Latest Readiness</b></div>
        <div id="latestReadiness" class="small">No readiness yet.</div>
      </div>

      <div class="card" style="margin:10px 0">
        <div class="small"><b>Readiness trend (last 14)</b></div>
        <canvas id="chartReadiness" width="320" height="140" style="width:100%;max-width:640px"></canvas>
      </div>

      <div class="card" style="margin:10px 0">
        <div class="small"><b>Wellness trend (last 14)</b></div>
        <canvas id="chartWellness" width="320" height="140" style="width:100%;max-width:640px"></canvas>
      </div>

      <div class="card" style="margin:10px 0">
        <div class="small"><b>Vertical trend (last 14)</b></div>
        <canvas id="chartVert" width="320" height="140" style="width:100%;max-width:640px"></canvas>
      </div>
    `;

    function drawLine(canvasId, points) {
      const c = $(canvasId);
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;

      const w = c.width,
        h = c.height;
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
        return h - pad - t * (h - pad * 2);
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

    // Latest readiness
    const readinessRows = computeReadinessHistory(14);
    const latestEl = $("latestReadiness");
    if (latestEl) {
      if (!readinessRows.length) {
        latestEl.textContent = "No readiness yet. Add a Log (and Sleep in Performance for better accuracy).";
      } else {
        const last = readinessRows[readinessRows.length - 1];
        const bits = [];
        if (Number.isFinite(last.breakdown.wellness)) bits.push(`Wellness ${last.breakdown.wellness}`);
        if (Number.isFinite(last.breakdown.energy)) bits.push(`Energy ${last.breakdown.energy}`);
        if (Number.isFinite(last.breakdown.sleep)) bits.push(`Sleep ${last.breakdown.sleep}`);
        if (Number.isFinite(last.breakdown.hydration)) bits.push(`Hydration ${last.breakdown.hydration}`);
        if (Number.isFinite(last.breakdown.injury)) bits.push(`Injury ${last.breakdown.injury}`);
        latestEl.innerHTML = `<b>${sanitizeHTML(last.score)}</b> / 100 • ${sanitizeHTML(last.dateISO)}<br/><span class="small">${sanitizeHTML(bits.join(" • "))}</span>`;
      }
    }

    // Readiness trend points
    const readinessPts = readinessRows.map((r, i) => ({ x: i, y: Number(r.score) })).filter((p) => Number.isFinite(p.y));
    drawLine("chartReadiness", readinessPts);

    // Wellness trend
    const logs = (state.logs || [])
      .filter((l) => l && l.dateISO)
      .slice()
      .sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""))
      .slice(-14);

    const wellnessPts = logs.map((l, i) => ({ x: i, y: Number(l.wellness) })).filter((p) => Number.isFinite(p.y));
    drawLine("chartWellness", wellnessPts);

    // Vertical trend
    const tests = (state.tests || [])
      .filter((t) => t && t.dateISO)
      .slice()
      .sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""))
      .slice(-14);

    const vertPts = tests.map((t, i) => ({ x: i, y: Number(t.vert) })).filter((p) => Number.isFinite(p.y));
    drawLine("chartVert", vertPts);
  }

  function renderTeam() {
    const el = $("tab-team");
    if (!el) return;
    el.innerHTML = `
      <h3 style="margin-top:0">Team</h3>
      <div class="small">Team features are stubbed for now (state is ready, UI can be built next).</div>
    `;
  }

  function renderParent() {
    const el = $("tab-parent");
    if (!el) return;
    el.innerHTML = `
      <h3 style="margin-top:0">Parent</h3>
      <div class="small">Parent view is stubbed for now (we can add read-only dashboards next).</div>
    `;
  }

  async function renderSettings() {
    const el = $("tab-settings");
    if (!el) return;

    const supaOk = isSupabaseReady();
    const signed = supaOk ? await isSignedIn() : false;

    el.innerHTML = `
      <h3 style="margin-top:0">Settings</h3>
      <div class="small">Status</div>
      <div class="hr"></div>

      <div class="card" style="margin:10px 0">
        <div class="small">
          Supabase: <b>${supaOk ? "Configured" : "Not configured"}</b><br/>
          Auth: <b>${signed ? "Signed in" : "Signed out"}</b><br/>
          Last synced: <b>${state.meta.lastSyncedAtMs ? new Date(state.meta.lastSyncedAtMs).toLocaleString() : "—"}</b>
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
      </div>

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
  }

  function renderActiveTab() {
    setPills();
    switch (activeTab()) {
      case "profile":
        renderProfile();
        break;
      case "program":
        renderProgram();
        break;
      case "log":
        renderLog();
        break;
      case "performance":
        renderPerformance();
        break;
      case "dashboard":
        renderDashboard();
        break;
      case "team":
        renderTeam();
        break;
      case "parent":
        renderParent();
        break;
      case "settings":
        renderSettings();
        break;
      default:
        renderProfile();
        break;
    }
  }

  // ---- Public start hook (boot.js calls startApp if role exists) ----
  window.startApp = function () {
    const role = (state.role || "").trim() || (localStorage.getItem("role") || "").trim();
    if (!role) {
      window.showRoleChooser();
      return;
    }
    if (!state.role) setRoleEverywhere(role);

    wireNav();
    showTab(activeTab());
    renderActiveTab();
    hideSplashNow();

    console.log("PerformanceIQ core started. Role:", state.role || role);
  };

  // ---- Switch Role button support (boot.js also wires, but safe here too) ----
  document.addEventListener("DOMContentLoaded", () => {
    $("btnSwitchRole")?.addEventListener("click", () => {
      try {
        localStorage.removeItem("role");
      } catch {}
      try {
        localStorage.removeItem("selectedRole");
      } catch {}
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      location.reload();
    });
  });

  // ---- Startup ----
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      if (await isSignedIn()) {
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
