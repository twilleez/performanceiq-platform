// dataStore.js — v2.2.0 (offline-first, safe, Phase 3-ready)
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
        preferred_session_type: "strength",
        injuries: [],
        weight_lbs: 160,
        goal: "maintain",
        activity: "med"
      },
      team: { active_team_id: null, teams: [] },

      // Core records
      sessions: [],

      // Phase 3 planning
      periodization: {
        plan: null,  // generated plan object
        updated_at: null
      },

      // Cached rollups (optional)
      insights: {
        weekly: [],
        updated_at: null
      },

      ui: { view: "home" }
    };
  }

  function load() {
    const raw = localStorage.getItem(KEY);
    const base = baseState();
    if (!raw) return base;
    const parsed = safeParse(raw, base);
    const merged = Object.assign(base, parsed);

    merged.profile = merged.profile || base.profile;
    merged.profile.injuries = Array.isArray(merged.profile.injuries) ? merged.profile.injuries : [];
    merged.sessions = Array.isArray(merged.sessions) ? merged.sessions : [];
    merged.team = merged.team || base.team;
    merged.periodization = merged.periodization || base.periodization;
    merged.insights = merged.insights || base.insights;
    merged.ui = merged.ui || base.ui;

    return merged;
  }

  function save(state) {
    state.meta = state.meta || {};
    state.meta.updated_at = nowISO();
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  }

  function exportJSON() { return JSON.stringify(load(), null, 2); }

  function importJSON(text) {
    const parsed = safeParse(text, null);
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid file");
    save(parsed);
    return true;
  }

  window.dataStore = { load, save, exportJSON, importJSON };
})();
