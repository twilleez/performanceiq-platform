// core.js — BOOT-SAFE + SPLASH-SAFE + CLOUD-PUSH-READY (PLAIN SCRIPT)
(function () {
  "use strict";

  // ---- Guard: prevent double-load ----
  if (window.__PIQ_CORE_LOADED__) return;
  window.__PIQ_CORE_LOADED__ = true;

  // ---- Constants ----
  const STORAGE_KEY = "piq_state_v1";

  // ---- Helpers ----
  const $ = (id) => document.getElementById(id) || null;

  function __loadLocal() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  // Base save (do not call directly; use saveState below)
  function __saveLocal(s) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return true;
    } catch (e) {
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
    const raw = __loadLocal();
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return normalizeState(parsed);
    } catch (e) {
      return null;
    }
  }

  // IMPORTANT: state must live in this IIFE scope
  const state = loadState() || defaultState();

  // Optional: expose minimal handle for debugging
  window.PIQ = window.PIQ || {};
  window.PIQ.getState = () => state;

  // ---- Safe splash hide (prevents “stuck splash”) ----
  function hideSplashNow() {
    const s = $("splash");
    if (!s) return;
    s.classList.add("hidden");
    s.style.display = "none";
    s.style.visibility = "hidden";
    s.style.opacity = "0";
    try { s.remove(); } catch (e) {}
  }

  // Make available to other files / handlers
  window.hideSplashNow = window.hideSplashNow || hideSplashNow;

  // ---- Cloud push (debounced) ----
  // Uses window.dataStore.pushState(state) if available.
  // MUST NOT break offline mode.
  let __piqPushTimer = null;

  function scheduleCloudPush() {
    if (!window.dataStore || typeof window.dataStore.pushState !== "function") return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    if (__piqPushTimer) clearTimeout(__piqPushTimer);
    __piqPushTimer = setTimeout(async () => {
      try {
        await window.dataStore.pushState(state);
        state.meta.lastSyncedAtMs = Date.now();
        __saveLocal(state);
      } catch (e) {
        // Offline / not signed in / RLS: do not break UX
        console.warn("[cloud] push skipped:", e && e.message ? e.message : e);
      }
    }, 800);
  }

  // ---- Public saveState (always updates meta + local + schedules cloud push) ----
  function saveState(s) {
    try {
      s.meta = s.meta || {};
      s.meta.updatedAtMs = Date.now();
    } catch (e) {}

    __saveLocal(s);
    scheduleCloudPush();
  }

  // Expose saveState so other scripts can call it if needed
  window.PIQ.saveState = window.PIQ.saveState || saveState;

  // ---- Minimal start hook so boot.js can continue ----
  window.startApp =
    window.startApp ||
    function () {
      console.log("PerformanceIQ core loaded.");
    };

  // =========================================================
  // ✅ REQUIRED PATCH POINT YOU ASKED FOR:
  // Use this helper inside onboarding "Save & continue" handler.
  // =========================================================
  window.PIQ_applyOnboardingSavePatch = function PIQ_applyOnboardingSavePatch(mountEl) {
    // 1) Persist (local + cloud if enabled via saveState wrapper)
    try {
      saveState(state);
    } catch (e) {
      console.warn("[onboarding] saveState failed:", e && e.message ? e.message : e);
    }

    // 2) Close modal safely
    try {
      if (mountEl && mountEl.style) {
        mountEl.style.display = "none";
        mountEl.innerHTML = "";
      }
    } catch (e) {
      console.warn("[onboarding] mount cleanup failed:", e && e.message ? e.message : e);
    }

    // 3) Hide splash safely
    try {
      if (typeof window.hideSplashNow === "function") window.hideSplashNow();
      else hideSplashNow();
    } catch (e) {
      console.warn("[onboarding] hideSplashNow failed:", e && e.message ? e.message : e);
    }

    // 4) Continue app start
    try {
      if (typeof window.startApp === "function") window.startApp();
    } catch (e) {
      console.warn("[onboarding] startApp failed:", e && e.message ? e.message : e);
    }
  };

  // =========================================================
  // ✅ CLOUD HELPERS + TWO ONE-LINERS READY
  // You will call these from saveLog() and saveTests()
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

    const numOrNull = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

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

  function __piqLocalTestToMetricRow(test) {
    if (!test) return null;

    const numOrNull = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

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
      console.warn("[cloud] workout_logs upsert skipped:", e && e.message ? e.message : e);
      return false;
    }
  }

  async function __piqTryUpsertPerformanceMetric(localTest) {
    if (
      !window.dataStore ||
      typeof window.dataStore.upsertPerformanceMetric !== "function"
    ) return false;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;

    const row = __piqLocalTestToMetricRow(localTest);
    if (!row || !row.date) return false;

    try {
      await window.dataStore.upsertPerformanceMetric(row);
      return true;
    } catch (e) {
      console.warn("[cloud] performance_metrics upsert skipped:", e && e.message ? e.message : e);
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

        // mutate in place
        Object.keys(state).forEach((k) => { delete state[k]; });
        Object.keys(next).forEach((k) => { state[k] = next[k]; });

        try { __saveLocal(state); } catch {}
        console.log("[cloud] pulled newer state");
      }
    } catch (e) {
      console.warn("[cloud] pull skipped:", e && e.message ? e.message : e);
    }
  }

  // Expose "two one-liners" targets
  window.PIQ.cloud = window.PIQ.cloud || {};

  // ONE-LINER target for saveLog(): window.PIQ.cloud.upsertWorkoutLogFromLocal(localLog)
  window.PIQ.cloud.upsertWorkoutLogFromLocal = function (localLog) {
    __piqTryUpsertWorkoutLog(localLog);
  };

  // ONE-LINER target for saveTests(): window.PIQ.cloud.upsertPerformanceMetricFromLocal(localTest)
  window.PIQ.cloud.upsertPerformanceMetricFromLocal = function (localTest) {
    __piqTryUpsertPerformanceMetric(localTest);
  };

  // Optional: pull once after sign-in (if authStore supports onAuthChange)
  (function __wirePullOnAuth() {
    const auth = window.PIQ_AuthStore;
    if (!auth || typeof auth.onAuthChange !== "function") return;
    auth.onAuthChange((user) => {
      if (user) __piqTryPullCloudStateIfNewer();
    });
  })();

  // =========================================================
  // ✅ ROLE CHOOSER + OFFLINE-FIRST SYNC
  // =========================================================

  function isSupabaseReady() {
    return !!(window.supabaseClient && window.PIQ_AuthStore && window.dataStore);
  }

  async function isSignedIn() {
    try {
      if (!window.PIQ_AuthStore) return false;
      const u = await window.PIQ_AuthStore.getUser();
      return !!u;
    } catch {
      return false;
    }
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

  function setRoleEverywhere(role) {
    state.role = role;

    // boot.js reads these keys for gating
    try { localStorage.setItem("role", role); } catch {}
    try { localStorage.setItem("selectedRole", role); } catch {}
  }

  function setProfileBasics(sport, days) {
    state.profile = state.profile || {};
    state.profile.sport = sport || state.profile.sport || "basketball";
    state.profile.days = Number(days || state.profile.days || 4);
  }

  async function tryCloudPullIntoLocal() {
    if (!isSupabaseReady()) return false;
    const signed = await isSignedIn();
    if (!signed) return false;

    try {
      const remote = await window.dataStore.pullState(); // expects {state, updated_at} or null
      if (!remote || !remote.state) return false;
      if (typeof remote.state !== "object") return false;

      const remoteUpdated = Number(remote.state?.meta?.updatedAtMs || 0);
      const localUpdated = Number(state?.meta?.updatedAtMs || 0);

      if (remoteUpdated > localUpdated) {
        const next = normalizeState(remote.state);

        // mutate-in-place so `state` reference stays stable
        Object.keys(state).forEach((k) => { delete state[k]; });
        Object.keys(next).forEach((k) => { state[k] = next[k]; });

        if (state.role) setRoleEverywhere(state.role);

        try { __saveLocal(state); } catch {}
        return true;
      }

      return false;
    } catch (e) {
      console.warn("[cloud] pull skipped:", e && e.message ? e.message : e);
      return false;
    }
  }

  async function renderRoleChooser() {
    const mount = ensureOnboardMount();
    mount.style.display = "block";

    const supaOk = isSupabaseReady();
    const signed = supaOk ? await isSignedIn() : false;

    const currentRole = (state.role || "").trim();
    const currentSport = (state.profile && state.profile.sport) ? state.profile.sport : "basketball";
    const currentDays = (state.profile && Number.isFinite(state.profile.days)) ? String(state.profile.days) : "4";

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
            Offline-first: the app works without signing in. Sync is optional and only runs when signed in.
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
      else syncEl.innerHTML = "Cloud sync: <b>Signed in</b> — you can pull/push.";
    }

    $("piqSaveRole")?.addEventListener("click", () => {
      const role = roleSel ? roleSel.value : "athlete";
      const sport = sportSel ? sportSel.value : "basketball";
      const days = daysSel ? daysSel.value : "4";

      setRoleEverywhere(role);
      setProfileBasics(sport, days);

      // this saves local + schedules cloud push (if signed in)
      if (typeof window.PIQ_applyOnboardingSavePatch === "function") {
        window.PIQ_applyOnboardingSavePatch(mount);
      } else {
        try { saveState(state); } catch {}
        try { mount.style.display = "none"; mount.innerHTML = ""; } catch {}
        try { hideSplashNow(); } catch {}
        try { window.startApp?.(); } catch {}
      }
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
        alert("Sign-in failed: " + (e && e.message ? e.message : e));
      }
    });

    $("piqSignOut")?.addEventListener("click", async () => {
      try {
        await window.PIQ_AuthStore?.signOut?.();
        alert("Signed out.");
        location.reload();
      } catch (e) {
        alert("Sign-out failed: " + (e && e.message ? e.message : e));
      }
    });

    $("piqPull")?.addEventListener("click", async () => {
      const pulled = await tryCloudPullIntoLocal();
      alert(pulled ? "Pulled newer cloud state to this device." : "No newer cloud state found.");
      location.reload();
    });
  }

  // boot.js calls this when no role is stored
  window.showRoleChooser = function () {
    renderRoleChooser();
  };

  // Optional: pull once at startup if signed in and cloud is newer
  document.addEventListener("DOMContentLoaded", async () => {
    try { await tryCloudPullIntoLocal(); } catch {}
  });

  // =========================================================
  // Failsafe: hide splash after 2s or on first interaction.
  // NOTE: If boot.js already does this, you can remove this block.
  // =========================================================
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(hideSplashNow, 2000);
    window.addEventListener("click", hideSplashNow, { once: true });
    window.addEventListener("touchstart", hideSplashNow, { once: true });
  });

  /* =========================================================
     ✅ YOUR APP LOGIC GOES BELOW THIS LINE
     When you add your saveLog() and saveTests(), add:

     (1) After saveState(state) in saveLog():
         window.PIQ?.cloud?.upsertWorkoutLogFromLocal(state.logs[state.logs.length - 1]);

     (2) After saveState(state) in saveTests():
         window.PIQ?.cloud?.upsertPerformanceMetricFromLocal(state.tests[state.tests.length - 1]);

     ========================================================= */

})();
