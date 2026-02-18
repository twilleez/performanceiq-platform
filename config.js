// config.js — PRODUCTION-READY REPLACEMENT (FULL FILE) v1.2.1
// Matches your described schema: workout_logs, performance_metrics, teams, team_members
// Keeps cloud snapshot table configurable (default: piq_user_state)

(function () {
  "use strict";

  window.PIQ_CONFIG = window.PIQ_CONFIG || {};

  // Feature flags
  window.PIQ_CONFIG.features = Object.assign(
    {
      teamWorkflow: true,
      teamCloudSync: true,
      csvExport: true
    },
    window.PIQ_CONFIG.features || {}
  );

  // Table mapping (MATCHES your actual table names)
  window.PIQ_CONFIG.tables = Object.assign(
    {
      // cloud snapshot table (your datastore default)
      state: "piq_user_state",

      // your CSV-described tables
      workout_logs: "workout_logs",
      performance_metrics: "performance_metrics",
      teams: "teams",
      team_members: "team_members"
    },
    window.PIQ_CONFIG.tables || {}
  );

  // Optional: Supabase keys can live here too (see supabaseClient.js below)
  window.PIQ_CONFIG.supabase = Object.assign(
    {
      url: "https://znhxaqlvkpcskvzljiev.supabase.co",
      anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuaHhhcWx2a3Bjc2t2emxqaWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNjM5MzksImV4cCI6MjA4NTczOTkzOX0.ReYzuZuGEI6aqcrXc_jIAXnamtgwCILMwcTsVYAtII0"
    },
    window.PIQ_CONFIG.supabase || {}
  );

  window.PIQ_CONFIG.app = Object.assign(
    { name: "PerformanceIQ", version: "1.2.1" },
    window.PIQ_CONFIG.app || {}
  );
})();
