// dataStore.js — v2.1.0 (offline-first, safe, expanded training model)
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
      meta: { updated_at: nowISO(), version: "2.1.0" },
      profile: {
        role: "coach",
        sport: "basketball",
        weight_lbs: 160,
        goal: "maintain",     // maintain | gain | cut
        activity: "med"       // low | med | high
      },
      team: { active_team_id: null, teams: [] },

      // training history
      sessions: [], // unified session log
      // nutrition logs (optional, later)
      nutrition: [],
      // UI
      ui: { view: "home" }
    };
  }

  function load() {
    const raw = localStorage.getItem(KEY);
    const base = baseState();
    if (!raw) return base;
    const parsed = safeParse(raw, base);
    // merge but preserve base defaults
    const out = Object.assign({}, base, parsed);
    out.profile = Object.assign({}, base.profile, parsed.profile || {});
    out.team = Object.assign({}, base.team, parsed.team || {});
    out.ui = Object.assign({}, base.ui, parsed.ui || {});
    out.sessions = Array.isArray(parsed.sessions) ? parsed.sessions : base.sessions;
    out.nutrition = Array.isArray(parsed.nutrition) ? parsed.nutrition : base.nutrition;
    out.meta = Object.assign({}, base.meta, parsed.meta || {});
    return out;
  }

  function save(state) {
    const s = state && typeof state === "object" ? state : baseState();
    s.meta = s.meta || {};
    s.meta.updated_at = nowISO();
    if (!s.meta.version) s.meta.version = "2.1.0";
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
