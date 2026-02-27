// cloudSync.js — v1.0.0
// Week 9–10 Cloud Write-back Hooks (SAFE)
// - If Supabase is not configured or offline: no-op.
// - If Supabase is configured: uses window.supabaseClient.
// NOTE: This file does NOT create tables. It only writes if your schema exists.

(function () {
  "use strict";
  if (window.cloudSync) return;

  function hasClient() {
    return !!(window.supabaseClient && window.supabaseClient.from);
  }

  async function safeUpsert(table, payload, conflictKeys) {
    if (!hasClient()) return { ok: false, localOnly: true };
    try {
      const q = window.supabaseClient.from(table).upsert(payload, conflictKeys ? { onConflict: conflictKeys } : undefined);
      const { error } = await q;
      if (error) return { ok: false, error };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e };
    }
  }

  // Suggested table mappings (adjust if your schema differs)
  // workout_logs: athlete_id, date, minutes, rpe, load, type, notes
  async function writeTrainingSession(row) {
    return safeUpsert("workout_logs", row, "athlete_id,date");
  }

  // readiness: athlete_id, date, sleep_hours, soreness, stress, energy, note
  async function writeReadiness(row) {
    return safeUpsert("readiness", row, "athlete_id,date");
  }

  // nutrition: athlete_id, date, adherence, notes
  async function writeNutrition(row) {
    return safeUpsert("nutrition", row, "athlete_id,date");
  }

  window.cloudSync = {
    hasClient,
    writeTrainingSession,
    writeReadiness,
    writeNutrition
  };
})();
