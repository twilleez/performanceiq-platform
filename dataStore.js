// dataStore.js — v2.1.0 (offline-first, safe, forward-compatible)
(function () {
  "use strict";
  if (window.dataStore) return;

  const KEY = "piq_local_state_v2";
  const VERSION = "2.1.0";

  function nowISO() { return new Date().toISOString(); }

  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch { return fallback; }
  }

  function isObj(x) {
    return !!x && typeof x === "object" && !Array.isArray(x);
  }

  function safeArray(val) {
    return Array.isArray(val) ? val : [];
  }

  function baseState() {
    return {
      meta: { updated_at: nowISO(), version: VERSION },
      profile: {
        role: "coach",
        sport: "basketball",
        weight_lbs: 160,
        goal: "maintain",   // maintain|gain|cut
        activity: "med"     // low|med|high
      },
      team: { active_team_id: null, teams: [] },

      // legacy buckets (kept for compatibility)
      logs: [],
      workouts: [],
      nutrition: [],

      // unified training session store (Train tab writes here)
      // {id, date, sport, difficulty, minutes, srpe, load,
      //  phase, focus, exercises:[{key,name,sets,reps,note,category}],
      //  notes, created_at}
      training_sessions: [],

      ui: { view: "home" }
    };
  }

  function normalize(s) {
    const base = baseState();

    if (!isObj(s)) return base;

    // Deep-merge known nested objects rather than replacing wholesale
    const state = Object.assign({}, base, s);

    state.meta    = Object.assign({}, base.meta,    isObj(s.meta)    ? s.meta    : {});
    state.profile = Object.assign({}, base.profile, isObj(s.profile) ? s.profile : {});
    state.team    = Object.assign({}, base.team,    isObj(s.team)    ? s.team    : {});
    state.ui      = Object.assign({}, base.ui,      isObj(s.ui)      ? s.ui      : {});

    // Always stamp current version
    state.meta.version    = VERSION;
    state.meta.updated_at = state.meta.updated_at || nowISO();

    // Enforce array types for all buckets
    state.team.teams        = safeArray(state.team.teams);
    state.logs              = safeArray(state.logs);
    state.workouts          = safeArray(state.workouts);
    state.nutrition         = safeArray(state.nutrition);
    state.training_sessions = safeArray(state.training_sessions);

    return state;
  }

  // ---- Storage helpers (guarded against private-mode / quota errors)
  function readStorage() {
    try { return localStorage.getItem(KEY); } catch { return null; }
  }

  function writeStorage(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn("[dataStore] localStorage write failed:", e);
      return false;
    }
  }

  // ---- Public API
  function load() {
    const raw = readStorage();
    if (!raw) return baseState();
    return normalize(safeParse(raw, null));
  }

  function save(state) {
    const s = normalize(state);
    s.meta.updated_at = nowISO();
    return writeStorage(s);
  }

  function exportJSON() {
    return JSON.stringify(load(), null, 2);
  }

  function importJSON(text) {
    if (typeof text !== "string" || !text.trim()) throw new Error("Invalid file: empty input");
    const parsed = safeParse(text, null);
    if (!isObj(parsed)) throw new Error("Invalid file: expected a JSON object");
    const ok = save(parsed);
    if (!ok) throw new Error("Could not save imported data (storage may be full or unavailable)");
    return true;
  }

  window.dataStore = { load, save, exportJSON, importJSON };
})();
