// dataStore.js — v2.2.0 (offline-first, safe, forward-compatible)
(function () {
  "use strict";
  if (window.dataStore) return;

  const KEY = "piq_local_state_v2";

  function nowISO() { return new Date().toISOString(); }

  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch { return fallback; }
  }

  function baseState() {
    return {
      meta: { updated_at: nowISO(), version: "2.2.0" },
      profile: {
        role: "coach",
        sport: "basketball",

        // nutrition inputs (already used)
        weight_lbs: 160,
        goal: "maintain",   // maintain|gain|cut
        activity: "med",    // low|med|high

        // NEW: training preferences
        train_level: "standard", // standard|advanced
        equipment: "full",       // none|bands|dumbbells|barbell|full

        // NEW: injury filters (simple, user-controlled)
        injuries: {
          knee: false,
          shoulder: false,
          back: false,
          ankle: false
        }
      },
      team: { active_team_id: null, teams: [] },

      // legacy buckets (kept for compatibility)
      logs: [],
      workouts: [],
      nutrition: [],

      // unified training sessions
      training_sessions: [],

      ui: { view: "home" }
    };
  }

  function normalize(s) {
    const base = baseState();
    const state = (s && typeof s === "object") ? s : base;

    state.meta = state.meta || {};
    state.meta.version = state.meta.version || base.meta.version;
    state.meta.updated_at = state.meta.updated_at || nowISO();

    state.profile = state.profile || base.profile;
    state.profile.injuries = state.profile.injuries || {};
    state.profile.injuries.knee = !!state.profile.injuries.knee;
    state.profile.injuries.shoulder = !!state.profile.injuries.shoulder;
    state.profile.injuries.back = !!state.profile.injuries.back;
    state.profile.injuries.ankle = !!state.profile.injuries.ankle;

    state.profile.train_level = state.profile.train_level || "standard";
    state.profile.equipment = state.profile.equipment || "full";

    state.team = state.team || base.team;
    state.ui = state.ui || base.ui;

    state.logs = Array.isArray(state.logs) ? state.logs : [];
    state.workouts = Array.isArray(state.workouts) ? state.workouts : [];
    state.nutrition = Array.isArray(state.nutrition) ? state.nutrition : [];
    state.training_sessions = Array.isArray(state.training_sessions) ? state.training_sessions : [];

    return state;
  }

  function load() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return normalize(baseState());
    const parsed = safeParse(raw, null);
    return normalize(parsed);
  }

  function save(state) {
    const s = normalize(state);
    s.meta.updated_at = nowISO();
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  }

  function exportJSON() {
    return JSON.stringify(load(), null, 2);
  }

  function importJSON(text) {
    const parsed = safeParse(text, null);
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid file");
    save(parsed);
    return true;
  }

  window.dataStore = { load, save, exportJSON, importJSON };
})();
