// config.js — PRODUCTION-READY REPLACEMENT (FULL FILE) v1.2.0
// Adds table mapping + feature flags (safe even if you don’t use cloud).
// NOTE: Update index.html cache-buster to config.js?v=1.2.0 (recommended).

(function () {
  "use strict";

  window.PIQ_CONFIG = window.PIQ_CONFIG || {};

  // Feature flags (local + optional cloud)
  window.PIQ_CONFIG.features = Object.assign(
    {
      teamWorkflow: true,
      teamCloudSync: true, // only used if dataStore implements team ops
      csvExport: true
    },
    window.PIQ_CONFIG.features || {}
  );

  // Optional Supabase table mapping (if your dataStore.js uses these)
  window.PIQ_CONFIG.tables = Object.assign(
    {
      state: "piq_state",
      workout_logs: "piq_workout_logs",
      performance_metrics: "piq_performance_metrics",
      // Phase 4: teams
      teams: "piq_teams",
      roster: "piq_roster",
      sessions: "piq_sessions",
      attendance: "piq_attendance"
    },
    window.PIQ_CONFIG.tables || {}
  );

  // App metadata
  window.PIQ_CONFIG.app = Object.assign(
    {
      name: "PerformanceIQ",
      version: "1.2.0"
    },
    window.PIQ_CONFIG.app || {}
  );
})();
