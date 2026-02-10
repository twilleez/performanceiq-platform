// core.js — FULL REPLACEMENT (PLAIN SCRIPT)
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

  // ---- Helpers ----
  const $ = (id) => document.getElementById(id) || null;

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

  function __loadLocalRaw() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function __saveLocal(stateObj) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateObj));
      return true;
    } catch {
      return false;
    }
  }

  function defaultState() {
    const now = Date.now();
    return {
      meta: { updatedAtMs: now, lastSyncedAtMs: 0 },
      role: "",
      profile: { sport: "basketball", days: 4 },
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

    // role
    if (typeof s.role !== "string") s.role = d.role;

    // profile
    s.profile = s.profile && typeof s.profile === "object" ? s.profile : d.profile;
    if (typeof s.profile.sport !== "string") s.profile.sport = d.profile.sport;
    if (!Number.isFinite(s.profile.days)) s.profile.days = d.profile.days;

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

    // week can be null or object; leave unchanged
    return s;
  }

  function loadState() {
    const raw = __loadLocalRaw();
    if (!raw) return null;
    try {
      return normalizeState(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  // IMPORTANT: state must live in this IIFE scope
  const state = loadState() || defaultState();

  // ---- Expose debug handles ----
  window.PIQ = window.PIQ || {};
  window.PIQ.getState = () => state;

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
    } catch {}
  }
  window.hideSplashNow = window.hideSplashNow || hideSplashNow;

  // ---- Supabase readiness helpers ----
  function isSupabaseReady() {
    // Must have: supabaseClient + auth store + data store
    return !!(window.supabaseClient && window.PIQ_AuthStore && window.dataStore);
  }

  async function isSignedIn() {
    try {
      if (!window.PIQ_AuthStore || typeof window.PIQ_AuthStore.getUser !== "function") return false;
      const u = await window.PIQ_AuthStore.getUser();
      return !!u;
    } catch {
      return false;
    }
  }

  // ---- Cloud push (state) debounced ----
  let __pushTimer = null;

  async function __pushStateNow() {
    if (!window.dataStore || typeof window.dataStore.pushState !== "function") return false;
    if (!window.PIQ_AuthStore || typeof window.PIQ_AuthStore.getUser !== "function") return false;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;

    const u = await window.PIQ_AuthStore.getUser();
    if (!u) return false;

    await window.dataStore.pushState(state);
    state.meta.lastSyncedAtMs = Date.now();
    __saveLocal(state);
    return true;
  }

  function scheduleCloudPush() {
    // Do not break offline mode
    if (!window.dataStore || typeof window.dataStore.pushState !== "function") return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    if (__pushTimer) clearTimeout(__pushTimer);
    __pushTimer = setTimeout(async () => {
      try {
        await __pushStateNow();
      } catch (e) {
        console.warn("[cloud] state push skipped:", e?.message || e);
      }
    }, CLOUD_PUSH_DEBOUNCE_MS);
  }

  // ---- Public saveState wrapper ----
  function saveState(s) {
    try {
      s.meta = s.meta || {};
      s.meta.updatedAtMs = Date.now();
    } catch {}
    __saveLocal(s);
    scheduleCloudPush();
  }
  window.PIQ.saveState = window.PIQ.saveState || saveState;

  // =========================================================
  // CLOUD HELPERS (logs + metrics) — match YOUR Supabase schema
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

  // workout_logs columns you listed:
  // date, program_day, volume, wellness, energy, hydration, injury_flag, practice_intensity,
  // practice_duration_min, extra_gym, extra_gym_duration_min
  function __piqLocalLogToWorkoutRow(localLog) {
    if (!localLog) return null;

    return {
      // dataStore injects athlete_id = auth.uid()
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

  // performance_metrics columns you listed:
  // date, vert_inches, sprint_seconds, cod_seconds, bw_lbs, sleep_hours
  function __piqLocalTestToMetricRow(test) {
    if (!test) return null;

    return {
      // dataStore injects athlete_id = auth.uid()
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
      console.warn("[cloud] workout_logs upsert skipped:", e?.message || e);
      return false;
    }
  }

  async function __piqTryUpsertPerformanceMetric(localTest) {
    if (!window.dataStore || typeof window.dataStore.upsertPerformanceMetric !== "function") return false;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;

    const row = __piqLocalTestToMetricRow(localTest);
    if (!row || !row.date) return false;

    // Don’t write an all-null row
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
      console.warn("[cloud] performance_metrics upsert skipped:", e?.message || e);
      return false;
    }
  }

  async function __piqTryPullCloudStateIfNewer() {
    if (!window.dataStore || typeof window.dataStore.pullState !== "function") return;
    if (!window.PIQ_AuthStore || typeof window.PIQ_AuthStore.getUser !== "function") return;

    try {
      const u = await window.PIQ_AuthStore.getUser();
      if (!u) return;

      const cloud = await window.dataStore.pullState(); // {state, updated_at} or null
      if (!cloud || !cloud.state || typeof cloud.state !== "object") return;

      const cloudUpdated = Number(cloud.state?.meta?.updatedAtMs || 0);
      const localUpdated = Number(state?.meta?.updatedAtMs || 0);

      if (cloudUpdated > localUpdated) {
        const next = normalizeState(cloud.state);

        // mutate in place so references remain stable
        Object.keys(state).forEach((k) => delete state[k]);
        Object.keys(next).forEach((k) => (state[k] = next[k]));

        __saveLocal(state);
        console.log("[cloud] pulled newer state");
      }
    } catch (e) {
      console.warn("[cloud] pull skipped:", e?.message || e);
    }
  }

  // Expose the two “one-liners” you wanted
  window.PIQ.cloud = window.PIQ.cloud || {};
  window.PIQ.cloud.upsertWorkoutLogFromLocal = function (localLog) {
    __piqTryUpsertWorkoutLog(localLog);
  };
  window.PIQ.cloud.upsertPerformanceMetricFromLocal = function (localTest) {
    __piqTryUpsertPerformanceMetric(localTest);
  };

  // Pull once after sign-in if auth store supports onAuthChange
  (function wirePullOnAuth() {
    const auth = window.PIQ_AuthStore;
    if (!auth || typeof auth.onAuthChange !== "function") return;
    auth.onAuthChange((user) => {
      if (user) __piqTryPullCloudStateIfNewer();
    });
  })();

  // =========================================================
  // ROLE CHOOSER (replaces alert stub)
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
    // boot.js gate reads these keys
    try { localStorage.setItem("role", state.role); } catch {}
    try { localStorage.setItem("selectedRole", state.role); } catch {}
  }

  function setProfileBasics(sport, days) {
    state.profile = state.profile || {};
    state.profile.sport = sport || state.profile.sport || "basketball";
    state.profile.days = Number(days || state.profile.days || 4);
    if (!Number.isFinite(state.profile.days) || state.profile.days <= 0) state.profile.days = 4;
  }

  async function renderRoleChooser() {
    const mount = ensureOnboardMount();
    mount.style.display = "block";

    const supaOk = isSupabaseReady();
    const signed = supaOk ? await isSignedIn() : false;

    const currentRole = (state.role || "").trim();
    const currentSport = state.profile?.sport || "basketball";
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
                <option value="athlete">Athlete</option>
                <option value="coach">Coach</option>
                <option value="parent">Parent</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div class="field">
              <label for="piqSport">Sport</label>
              <select id="piqSport">
                <option value="basketball">Basketball</option>
                <option value="football">Football</option>
                <option value="baseball">Baseball</option>
                <option value="volleyball">Volleyball</option>
                <option value="soccer">Soccer</option>
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

    if (roleSel) roleSel.value = currentRole || "athlete";
    if (sportSel) sportSel.value = currentSport;
    if (daysSel) daysSel.value = currentDays;

    if (syncEl) {
      if (!supaOk) syncEl.innerHTML = "Cloud sync: <b>Unavailable</b> (Supabase not configured).";
      else if (!signed) syncEl.innerHTML = "Cloud sync: <b>Available</b> — not signed in.";
      else syncEl.innerHTML = "Cloud sync: <b>Signed in</b> — pull/push enabled.";
    }

    $("piqSaveRole")?.addEventListener("click", () => {
      const role = roleSel ? roleSel.value : "athlete";
      const sport = sportSel ? sportSel.value : "basketball";
      const days = daysSel ? daysSel.value : "4";

      setRoleEverywhere(role);
      setProfileBasics(sport, days);

      saveState(state);

      try {
        mount.style.display = "none";
        mount.innerHTML = "";
      } catch {}

      hideSplashNow();

      if (typeof window.startApp === "function") window.startApp();
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
        alert("Sign-in failed: " + (e?.message || e));
      }
    });

    $("piqSignOut")?.addEventListener("click", async () => {
      try {
        await window.PIQ_AuthStore?.signOut?.();
        alert("Signed out.");
        location.reload();
      } catch (e) {
        alert("Sign-out failed: " + (e?.message || e));
      }
    });

    $("piqPull")?.addEventListener("click", async () => {
      try {
        await __piqTryPullCloudStateIfNewer();
        alert("Pulled cloud (if newer). Reloading.");
        location.reload();
      } catch (e) {
        alert("Pull failed: " + (e?.message || e));
      }
    });
  }

  // boot.js calls this when no role is stored
  window.showRoleChooser = function () {
    renderRoleChooser();
  };

  // =========================================================
  // OPTIONAL: Minimal saveTests + saveLog implementations
  // (Safe even if your UI doesn't have these fields/buttons yet)
  // =========================================================

  async function saveTestsMinimal() {
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

    // one-liner cloud sync
    window.PIQ?.cloud?.upsertPerformanceMetricFromLocal(test);
  }

  async function saveLogMinimal() {
    const dateISO = ($("logDate")?.value || todayISO()).trim();

    // If you have a richer log builder elsewhere, keep it; this is a safe fallback.
    const localLog = {
      dateISO,
      theme: $("logTheme")?.value || null,
      injury: $("injuryFlag")?.value || "none",
      wellness: numOrNull($("wellness")?.value),
      entries: [] // you can populate this from your log table inputs later
    };

    state.logs = (state.logs || []).filter((l) => l.dateISO !== dateISO);
    state.logs.push(localLog);
    state.logs.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    saveState(state);

    // one-liner cloud sync
    window.PIQ?.cloud?.upsertWorkoutLogFromLocal(localLog);
  }

  // Expose so buttons/other files can call them
  window.PIQ.saveTests = window.PIQ.saveTests || saveTestsMinimal;
  window.PIQ.saveLog = window.PIQ.saveLog || saveLogMinimal;

  // =========================================================
  // startApp — safe init: ensures role gate + wires optional buttons
  // =========================================================
  window.startApp =
    window.startApp ||
    function () {
      // Ensure role is present; if not, show chooser.
      const role = (state.role || "").trim() || (localStorage.getItem("role") || "").trim();
      if (!role) {
        window.showRoleChooser();
        return;
      }
      if (!state.role) setRoleEverywhere(role);

      // Wire optional buttons if present in your HTML
      $("btnSaveTests")?.addEventListener("click", () => {
        window.PIQ.saveTests().catch((e) => console.warn("[saveTests]", e?.message || e));
      });

      $("btnSaveLog")?.addEventListener("click", () => {
        window.PIQ.saveLog().catch((e) => console.warn("[saveLog]", e?.message || e));
      });

      console.log("PerformanceIQ core started. Role:", state.role || role);
    };

  // =========================================================
  // Startup: optional pull + splash failsafe
  // =========================================================
  document.addEventListener("DOMContentLoaded", async () => {
    // Pull once at startup if signed in & cloud is newer
    try {
      if (await isSignedIn()) await __piqTryPullCloudStateIfNewer();
    } catch {}

    // Splash failsafe
    setTimeout(hideSplashNow, SPLASH_FAILSAFE_MS);
    window.addEventListener("click", hideSplashNow, { once: true });
    window.addEventListener("touchstart", hideSplashNow, { once: true });
  });
})();
