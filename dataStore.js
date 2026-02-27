// dataStore.js — v2.0.0 (offline-first, safe)
(function () {
  "use strict";
  if (window.dataStore) return;

  const KEY = "piq_local_state_v2";

  function nowISO() { return new Date().toISOString(); }

  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch { return fallback; }
  }

  function load() {
    const raw = localStorage.getItem(KEY);
    const base = {
      meta: { updated_at: nowISO(), version: "2.0.0" },
      profile: { role: "coach", sport: "basketball" },
      team: { active_team_id: null, teams: [] },
      logs: [],
      workouts: [],
      nutrition: []
    };
    if (!raw) return base;
    const parsed = safeParse(raw, base);
    return Object.assign(base, parsed);
  }

  function save(state) {
    state.meta = state.meta || {};
    state.meta.updated_at = nowISO();
    localStorage.setItem(KEY, JSON.stringify(state));
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
