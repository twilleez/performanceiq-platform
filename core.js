// core.js — PRODUCTION-READY REPLACEMENT
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
    try { return localStorage.getItem(STORAGE_KEY); }
    catch (e) { logError("loadLocalRaw", e); return null; }
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
      team: { name: "", roster: [], attendance: [], board: "", compliance: "off" }
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
    if (typeof s.profile.name !== "string") s.profile.name = "";

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

    return s;
  }

  function loadState() {
    const raw = __loadLocalRaw();
    if (!raw) return null;
    try { return normalizeState(JSON.parse(raw)); }
    catch (e) { logError("loadState", e); return null; }
  }

  // ---- State manager (simple) ----
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
    try { s.remove(); } catch (e) { logError("hideSplash", e); }
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
        // mutate in place
        Object.keys(state).forEach((k) => { delete state[k]; });
        Object.keys(next).forEach((k) => { state[k] = next[k]; });
        __saveLocal(state);
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
    try { await window.dataStore.upsertWorkoutLog(row); return true; }
    catch (e) { logError("upsertWorkoutLog", e); return false; }
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

    try { await window.dataStore.upsertPerformanceMetric(row); return true; }
    catch (e) { logError("upsertPerformanceMetric", e); return false; }
  }

  window.PIQ.cloud = window.PIQ.cloud || {};
  window.PIQ.cloud.upsertWorkoutLogFromLocal = (localLog) => { __tryUpsertWorkoutLog(localLog); };
  window.PIQ.cloud.upsertPerformanceMetricFromLocal = (localTest) => { __tryUpsertMetric(localTest); };

  // ---- Role helpers ----
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
      setProfileBasics(sportSel ? sportSel.value : SPORTS.BASKETBALL, daysSel ? daysSel.value : 4);

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

  // boot.js calls this when no role is stored
  window.showRoleChooser = function () { renderRoleChooser(); };

  // ---- Tab system (THIS is what you were missing) ----
  const TABS = [
    "profile", "program", "log", "performance", "dashboard", "team", "parent", "settings"
  ];

  function showTab(tabName) {
    for (const t of TABS) {
      const el = $(`tab-${t}`);
      if (!el) continue;
      el.style.display = (t === tabName) ? "block" : "none";
    }
    state._ui = state._ui || {};
    state._ui.activeTab = tabName;
    __saveLocal(state); // UI-only, don’t bump version
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

  // ---- Program generator (simple, deterministic) ----
  function generateProgram(sport, days) {
    const d = Number(days || 4);
    const s = (sport || SPORTS.BASKETBALL).toLowerCase();

    // Minimal templates (you can expand later)
    const base = {
      warmup: ["5–8 min easy cardio", "Dynamic mobility", "Activation (glutes/core)"],
      finisher: ["Cooldown walk 5 min", "Stretch hips/ankles/hamstrings 8–10 min"]
    };

    const sportBlocks = {
      basketball: [
        { title: "Day 1 — Strength + Skill", blocks: ["Lower strength (squat/hinge)", "Core", "Shooting: form + spot ups"] },
        { title: "Day 2 — Speed + Conditioning", blocks: ["Acceleration 10–20m", "COD (cones)", "Tempo conditioning"] },
        { title: "Day 3 — Upper + Skill", blocks: ["Upper push/pull", "Shoulders + scap", "Ball handling + finishing"] },
        { title: "Day 4 — Plyos + Game Prep", blocks: ["Plyos (low volume)", "Reactive jumps", "Film + light skill"] },
        { title: "Day 5 — Optional Recovery", blocks: ["Zone 2 20–30m", "Mobility", "Soft tissue"] }
      ],
      football: [
        { title: "Day 1 — Lower Strength", blocks: ["Squat pattern", "Posterior chain", "Core"] },
        { title: "Day 2 — Speed/Agility", blocks: ["Acceleration", "Top speed mechanics", "COD"] },
        { title: "Day 3 — Upper Strength", blocks: ["Bench/push", "Rows/pull", "Neck/shoulders"] },
        { title: "Day 4 — Power/Conditioning", blocks: ["Jumps/throws", "Sled/tempo", "Mobility"] },
        { title: "Day 5 — Optional", blocks: ["Recovery", "Mobility", "Light tempo"] }
      ],
      baseball: [
        { title: "Day 1 — Full Body Strength", blocks: ["Hinge", "Single-leg", "Core/rotation"] },
        { title: "Day 2 — Speed + Mobility", blocks: ["Sprints", "Hip/shoulder mobility", "Throwing prep"] },
        { title: "Day 3 — Upper + Scap", blocks: ["Pull focus", "Scap stability", "Core/rotation"] },
        { title: "Day 4 — Power", blocks: ["Jumps/med ball", "Short sprints", "Recovery"] },
        { title: "Day 5 — Optional", blocks: ["Mobility", "Zone 2", "Soft tissue"] }
      ],
      volleyball: [
        { title: "Day 1 — Lower Strength", blocks: ["Squat/hinge", "Knee health", "Core"] },
        { title: "Day 2 — Plyos + COD", blocks: ["Jump technique", "Reactive plyos", "COD"] },
        { title: "Day 3 — Upper + Shoulder", blocks: ["Push/pull", "Scap", "Core"] },
        { title: "Day 4 — Power + Conditioning", blocks: ["Jumps/throws", "Tempo", "Mobility"] },
        { title: "Day 5 — Optional", blocks: ["Recovery", "Mobility", "Zone 2"] }
      ],
      soccer: [
        { title: "Day 1 — Strength", blocks: ["Lower strength", "Core", "Nordics (if able)"] },
        { title: "Day 2 — Speed", blocks: ["Acceleration", "Top speed", "COD"] },
        { title: "Day 3 — Upper + Core", blocks: ["Upper push/pull", "Core", "Mobility"] },
        { title: "Day 4 — Conditioning", blocks: ["Intervals", "Tempo", "Recovery"] },
        { title: "Day 5 — Optional", blocks: ["Recovery", "Mobility", "Zone 2"] }
      ]
    };

    const template = sportBlocks[s] || sportBlocks.basketball;
    const picked = template.slice(0, Math.min(Math.max(d, 3), 5));

    return {
      sport: s,
      days: d,
      createdAtISO: new Date().toISOString(),
      warmup: base.warmup,
      finisher: base.finisher,
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

    const daysHtml = (p.daysPlan || []).map((d) => `
      <div class="card" style="margin:10px 0">
        <div style="font-weight:600">${sanitizeHTML(d.title)}</div>
        <ul style="margin:8px 0 0 18px">
          ${(d.blocks || []).map((b) => `<li>${sanitizeHTML(b)}</li>`).join("")}
        </ul>
      </div>
    `).join("");

    el.innerHTML = `
      <h3 style="margin-top:0">Program</h3>
      <div class="small">Sport: <b>${sanitizeHTML(p.sport)}</b> • Days/week: <b>${sanitizeHTML(p.days)}</b></div>
      <div class="hr"></div>

      <div class="small"><b>Warmup</b></div>
      <ul style="margin:8px 0 12px 18px">${(p.warmup || []).map(x => `<li>${sanitizeHTML(x)}</li>`).join("")}</ul>

      ${daysHtml}

      <div class="small" style="margin-top:8px"><b>Finisher</b></div>
      <ul style="margin:8px 0 0 18px">${(p.finisher || []).map(x => `<li>${sanitizeHTML(x)}</li>`).join("")}</ul>
    `;
  }

function renderLog() {
  const el = $("tab-log");
  if (!el) return;

  const logs = Array.isArray(state.logs) ? state.logs.slice().sort((a,b)=>b.dateISO.localeCompare(a.dateISO)) : [];

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
        <input id="logTheme" placeholder="e.g., Day 1 — Strength + Skill"/>
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

    <div class="btnRow" style="margin-top:12px">
      <button class="btn" id="btnSaveLog" type="button">Save Log</button>
    </div>

    <div class="hr"></div>

    <div class="small"><b>Recent logs</b></div>
    <div id="logList"></div>
  `;

  $("btnSaveLog")?.addEventListener("click", () => {
    const dateISO = ($("logDate")?.value || todayISO()).trim();

    const hydration = ($("hydrationLevel")?.value || "good").trim(); // ✅ hydration level
    const localLog = {
      dateISO,
      theme: $("logTheme")?.value || null,
      injury: $("injuryFlag")?.value || "none",
      wellness: numOrNull($("wellness")?.value),
      energy: numOrNull($("energy")?.value),
      hydration, // ✅ stored in local state
      entries: []
    };

    state.logs = (state.logs || []).filter((l) => l.dateISO !== dateISO);
    state.logs.push(localLog);
    state.logs.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    saveState(state);

    // ✅ cloud write (existing mapping supports hydration -> workout_logs.hydration)
    window.PIQ?.cloud?.upsertWorkoutLogFromLocal(localLog);

    alert("Saved.");
  });

  const list = $("logList");
  if (!list) return;

  if (!logs.length) {
    list.innerHTML = `<div class="small">No logs yet.</div>`;
    return;
  }

  list.innerHTML = logs.slice(0, 10).map((l) => `
    <div class="card" style="margin:10px 0">
      <div style="display:flex;justify-content:space-between;gap:10px">
        <div><b>${sanitizeHTML(l.dateISO)}</b> — ${sanitizeHTML(l.theme || "")}</div>
        <div class="small">Wellness: ${sanitizeHTML(l.wellness ?? "—")} • Energy: ${sanitizeHTML(l.energy ?? "—")}</div>
      </div>
      <div class="small">Hydration: ${sanitizeHTML(l.hydration || "—")} • Injury: ${sanitizeHTML(l.injury || "none")}</div>
    </div>
  `).join("");
};

      state.logs = (state.logs || []).filter((l) => l.dateISO !== dateISO);
      state.logs.push(localLog);
      state.logs.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
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

    list.innerHTML = logs.slice(0, 10).map((l) => `
      <div class="card" style="margin:10px 0">
        <div style="display:flex;justify-content:space-between;gap:10px">
          <div><b>${sanitizeHTML(l.dateISO)}</b> — ${sanitizeHTML(l.theme || "")}</div>
          <div class="small">Wellness: ${sanitizeHTML(l.wellness ?? "—")} • Energy: ${sanitizeHTML(l.energy ?? "—")}</div>
        </div>
        <div class="small">Injury: ${sanitizeHTML(l.injury || "none")}</div>
      </div>
    `).join("");
  }

  function renderPerformance() {
    const el = $("tab-performance");
    if (!el) return;

    const tests = Array.isArray(state.tests) ? state.tests.slice().sort((a,b)=>b.dateISO.localeCompare(a.dateISO)) : [];

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
      state.tests.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
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

    const lastLog = Array.isArray(state.logs) && state.logs.length
      ? state.logs.slice().sort((a,b)=>b.dateISO.localeCompare(a.dateISO))[0]
      : null;

    const lastTest = Array.isArray(state.tests) && state.tests.length
      ? state.tests.slice().sort((a,b)=>b.dateISO.localeCompare(a.dateISO))[0]
      : null;

    el.innerHTML = `
      <h3 style="margin-top:0">Dashboard</h3>
      <div class="small">Quick snapshot.</div>
      <div class="hr"></div>

      <div class="card" style="margin:10px 0">
        <div><b>Profile</b></div>
        <div class="small">Sport: ${sanitizeHTML(state.profile?.sport || "—")} • Days/week: ${sanitizeHTML(state.profile?.days ?? "—")}</div>
      </div>

      <div class="card" style="margin:10px 0">
        <div><b>Latest Log</b></div>
        <div class="small">${lastLog ? sanitizeHTML(lastLog.dateISO) + " — " + sanitizeHTML(lastLog.theme || "") : "No logs yet."}</div>
      </div>

      <div class="card" style="margin:10px 0">
        <div><b>Latest Test</b></div>
        <div class="small">${lastTest ? sanitizeHTML(lastTest.dateISO) + " — Vert " + sanitizeHTML(lastTest.vert ?? "—") : "No tests yet."}</div>
      </div>
    `;
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
  $("btnSwitchRole")?.addEventListener("click", () => {
    try { localStorage.removeItem("role"); } catch {}
    try { localStorage.removeItem("selectedRole"); } catch {}
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    location.reload();
  });

  // ---- Startup ----
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      // Optional: auto-pull if signed in and cloud newer
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
