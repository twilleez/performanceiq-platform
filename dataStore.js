// dataStore.js — v2.3.0 (offline-first, safe, Phase 3–7 ready)
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
        role: "coach", // owner|coach|athlete|parent|viewer
        sport: "basketball",
        preferred_session_type: "practice",
        injuries: [],
        onboarded: false,

        // Nutrition defaults
        weight_lbs: 160,
        goal: "maintain", // cut|maintain|bulk
        activity: "med",  // low|med|high
        theme: { mode: "dark" }
      },

      team: {
        active_team_id: null,
        teams: [
          // { id, name, sport, join_code, created_at }
        ],
        members: [
          // { id, team_id, name, role, created_at }
        ]
      },

      // Core records
      sessions: [],

      // Phase 6: nutrition logs
      nutrition: {
        logs: [
          // { id, created_at, date, calories, protein_g, carbs_g, fat_g, notes }
        ],
        enabled: true
      },

      // Phase 7: wellness logs (optional)
      wellness: {
        logs: [
          // { id, created_at, date, sleep_hrs, soreness_1_10, stress_1_10, notes }
        ],
        enabled: true
      },

      // Phase 7: cached risk flags
      risk: {
        flags: [],
        updated_at: null
      },

      // Phase 3+: cached dashboards
      dashboards: {
        heatmap: null,
        updated_at: null
      },

      // Phase 7: PerformanceIQ score snapshot (optional)
      piq: {
        score: null,
        updated_at: null
      },

      // Phase 7: periodization
      periodization: {
        plan: null,
        updated_at: null
      },

      // Cached rollups (optional)
      insights: {
        weekly: [],
        updated_at: null
      },

      ui: { view: "home", todaySession: null }
    };
  }

  function normalize(merged, base) {
    merged.meta = merged.meta || base.meta;
    merged.profile = merged.profile || base.profile;
    merged.profile.injuries = Array.isArray(merged.profile.injuries) ? merged.profile.injuries : [];
    merged.profile.theme = merged.profile.theme || base.profile.theme;
    merged.profile.onboarded = !!merged.profile.onboarded;

    merged.sessions = Array.isArray(merged.sessions) ? merged.sessions : [];

    merged.team = merged.team || base.team;
    merged.team.teams = Array.isArray(merged.team.teams) ? merged.team.teams : [];
    merged.team.members = Array.isArray(merged.team.members) ? merged.team.members : [];

    merged.nutrition = merged.nutrition || base.nutrition;
    merged.nutrition.logs = Array.isArray(merged.nutrition.logs) ? merged.nutrition.logs : [];
    merged.nutrition.enabled = merged.nutrition.enabled !== false;

    merged.wellness = merged.wellness || base.wellness;
    merged.wellness.logs = Array.isArray(merged.wellness.logs) ? merged.wellness.logs : [];
    merged.wellness.enabled = merged.wellness.enabled !== false;

    merged.risk = merged.risk || base.risk;
    merged.risk.flags = Array.isArray(merged.risk.flags) ? merged.risk.flags : [];
    merged.dashboards = merged.dashboards || base.dashboards;

    merged.piq = merged.piq || base.piq;
    merged.periodization = merged.periodization || base.periodization;

    merged.insights = merged.insights || base.insights;
    merged.insights.weekly = Array.isArray(merged.insights.weekly) ? merged.insights.weekly : [];

    merged.ui = merged.ui || base.ui;
    merged.ui.view = merged.ui.view || "home";
    merged.ui.todaySession = merged.ui.todaySession || null;

    return merged;
  }

  function load() {
    const raw = localStorage.getItem(KEY);
    const base = baseState();
    if (!raw) return base;
    const parsed = safeParse(raw, base);
    const merged = Object.assign(base, parsed);
    return normalize(merged, base);
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
    // normalize before saving so legacy imports don’t break
    const base = baseState();
    const merged = Object.assign(base, parsed);
    save(normalize(merged, base));
    return true;
  }

  function clear() {
    localStorage.removeItem(KEY);
    return true;
  }

  window.dataStore = { load, save, exportJSON, importJSON, clear };
})();
