// dataStore.js — v2.3.0 (offline-first, safe, Phase 8–12 ready)
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
      meta: { updated_at: nowISO(), version: "2.3.0" },
      profile: {
        role: "coach",
        sport: "basketball",
        preferred_session_type: "practice",
        injuries: [],
        onboarded: false,
        theme: { mode: "dark" },

        // optional fields for future modules
        weight_lbs: 160,
        goal: "maintain",
        activity: "med"
      },
      team: { active_team_id: null, teams: [] },

      sessions: [],

      periodization: { plan: null, updated_at: null },
      insights: { weekly: [], updated_at: null },

      ui: { view: "home", todaySession: null }
    };
  }

  function load() {
    const raw = localStorage.getItem(KEY);
    const base = baseState();
    if (!raw) return base;

    const parsed = safeParse(raw, base);
    const merged = Object.assign({}, base, parsed);

    merged.profile = Object.assign({}, base.profile, (merged.profile || {}));
    merged.profile.injuries = Array.isArray(merged.profile.injuries) ? merged.profile.injuries : [];
    merged.profile.onboarded = !!merged.profile.onboarded;
    merged.profile.theme = merged.profile.theme && typeof merged.profile.theme === "object" ? merged.profile.theme : base.profile.theme;

    merged.sessions = Array.isArray(merged.sessions) ? merged.sessions : [];
    merged.team = Object.assign({}, base.team, (merged.team || {}));
    merged.team.teams = Array.isArray(merged.team.teams) ? merged.team.teams : [];
    merged.periodization = Object.assign({}, base.periodization, (merged.periodization || {}));
    merged.insights = Object.assign({}, base.insights, (merged.insights || {}));

    merged.ui = Object.assign({}, base.ui, (merged.ui || {}));
    if (!merged.ui.view) merged.ui.view = "home";
    if (!("todaySession" in merged.ui)) merged.ui.todaySession = null;

    merged.meta = Object.assign({}, base.meta, (merged.meta || {}));
    return merged;
  }

  function save(state) {
    const s = (state && typeof state === "object") ? state : baseState();
    s.meta = s.meta || {};
    s.meta.updated_at = nowISO();
    localStorage.setItem(KEY, JSON.stringify(s));
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
