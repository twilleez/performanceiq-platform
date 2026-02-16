// dataStore.js — PRODUCTION-READY (FULL FILE REPLACEMENT)
// Aligned to your CURRENT Supabase schema (per your CSV):
// - workout_logs: athlete_id, date, program_day, volume, wellness, energy, hydration, injury_flag, ...
// - performance_metrics: athlete_id, date, vert_inches, sprint_seconds, cod_seconds, bw_lbs, sleep_hours
// - teams: id, name, sport, coach_id, created_at
// - team_members: id, team_id, user_id, role_in_team, linked_athlete_id, joined_at
//
// This module only runs if Supabase is configured + user is signed in.
//
// Provides:
// - pushState(state), pullState()
// - upsertWorkoutLog(row), upsertPerformanceMetric(row)
// - Team APIs: createTeam, listMyTeams, listTeamMembers, addTeamMember, removeTeamMember
//
// IMPORTANT:
// - This file maps "current auth user id" => athlete_id/coach_id where appropriate.
// - Your "state" table is still configurable via window.PIQ_CONFIG.tables.state (not included in your CSV).
// - If your unique constraints differ, update the onConflict strings to match your DB.

(function () {
  "use strict";

  if (window.__PIQ_DATASTORE_LOADED__) return;
  window.__PIQ_DATASTORE_LOADED__ = true;

  const DEFAULT_TABLES = Object.freeze({
    // Cloud snapshot table (not in your CSV, keep configurable)
    // Expected: user_id uuid (pk), state jsonb
    state: "piq_user_state",

    // From your CSV
    workout_logs: "workout_logs",
    performance_metrics: "performance_metrics",
    teams: "teams",
    team_members: "team_members"
  });

  function tables() {
    const cfg = window.PIQ_CONFIG && window.PIQ_CONFIG.tables;
    return {
      state: cfg?.state || DEFAULT_TABLES.state,
      workout_logs: cfg?.workout_logs || DEFAULT_TABLES.workout_logs,
      performance_metrics: cfg?.performance_metrics || DEFAULT_TABLES.performance_metrics,
      teams: cfg?.teams || DEFAULT_TABLES.teams,
      team_members: cfg?.team_members || DEFAULT_TABLES.team_members
    };
  }

  function hasClient() {
    return !!window.supabaseClient && typeof window.supabaseClient.from === "function";
  }

  async function getUser() {
    if (!window.PIQ_AuthStore || typeof window.PIQ_AuthStore.getUser !== "function") return null;
    try {
      const u = await window.PIQ_AuthStore.getUser();
      return u || null;
    } catch {
      return null;
    }
  }

  function online() {
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
    } catch {}
    return true;
  }

  function ensureReadyOrThrow() {
    if (!hasClient()) throw new Error("Supabase client not available");
    if (!online()) throw new Error("Offline");
  }

  function normalizeErr(e) {
    const msg = e?.message || String(e);
    return new Error(msg);
  }

  // =========================================================
  // State sync (device <-> cloud)
  // =========================================================
  async function pushState(stateObj) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const payload = { user_id: u.id, state: stateObj };

    const { error } = await window.supabaseClient
      .from(T.state)
      .upsert(payload, { onConflict: "user_id" });

    if (error) throw normalizeErr(error);
    return true;
  }

  async function pullState() {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();

    const { data, error } = await window.supabaseClient
      .from(T.state)
      .select("state")
      .eq("user_id", u.id)
      .maybeSingle();

    if (error) throw normalizeErr(error);
    return data || null; // { state: {...} } or null
  }

  // =========================================================
  // Workout logs upsert
  // core.js passes: { date, program_day, volume, wellness, energy, hydration, injury_flag, ... }
  // Your table expects athlete_id instead of user_id.
  // =========================================================
  async function upsertWorkoutLog(row) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();

    if (!row || !row.date) throw new Error("Missing row.date");

    // Map auth user -> athlete_id
    const payload = { ...row, athlete_id: u.id };

    // IMPORTANT: your DB must have a UNIQUE constraint matching this onConflict.
    // Recommended: UNIQUE(athlete_id, date)
    const { error } = await window.supabaseClient
      .from(T.workout_logs)
      .upsert(payload, { onConflict: "athlete_id,date" });

    if (error) throw normalizeErr(error);
    return true;
  }

  // =========================================================
  // Performance metrics upsert
  // core.js passes: { date, vert_inches, sprint_seconds, cod_seconds, bw_lbs, sleep_hours }
  // Your table expects athlete_id instead of user_id.
  // =========================================================
  async function upsertPerformanceMetric(row) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();

    if (!row || !row.date) throw new Error("Missing row.date");

    const payload = { ...row, athlete_id: u.id };

    // IMPORTANT: your DB must have a UNIQUE constraint matching this onConflict.
    // Recommended: UNIQUE(athlete_id, date)
    const { error } = await window.supabaseClient
      .from(T.performance_metrics)
      .upsert(payload, { onConflict: "athlete_id,date" });

    if (error) throw normalizeErr(error);
    return true;
  }

  // =========================================================
  // Team APIs (Aligned to your schema)
  // teams: coach_id, name, sport
  // team_members: team_id, user_id, role_in_team, linked_athlete_id
  // =========================================================
  async function createTeam(name, sport) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const teamName = String(name || "").trim();
    if (!teamName) throw new Error("Team name required");

    const teamSport = String(sport || "").trim() || null;

    const { data: team, error } = await window.supabaseClient
      .from(T.teams)
      .insert({ name: teamName, sport: teamSport, coach_id: u.id })
      .select("*")
      .single();

    if (error) throw normalizeErr(error);

    // Add creator as coach member row too (common pattern)
    const { error: e2 } = await window.supabaseClient
      .from(T.team_members)
      .insert({
        team_id: team.id,
        user_id: u.id,
        role_in_team: "coach",
        linked_athlete_id: null
      });

    // If you already auto-insert via trigger, you can ignore duplicate errors here.
    if (e2) throw normalizeErr(e2);

    return team;
  }

  async function listMyTeams() {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();

    // Your teams table includes coach_id; simplest: list teams where coach_id = current user
    const { data, error } = await window.supabaseClient
      .from(T.teams)
      .select("id,name,sport,created_at,coach_id")
      .eq("coach_id", u.id)
      .order("created_at", { ascending: false });

    if (error) throw normalizeErr(error);
    return data || [];
  }

  async function listTeamMembers(teamId) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const tid = String(teamId || "").trim();
    if (!tid) throw new Error("teamId required");

    const { data, error } = await window.supabaseClient
      .from(T.team_members)
      .select("id,team_id,user_id,role_in_team,linked_athlete_id,joined_at")
      .eq("team_id", tid)
      .order("joined_at", { ascending: true });

    if (error) throw normalizeErr(error);
    return data || [];
  }

  // roleInTeam examples: "coach" | "athlete" | "parent" | "manager"
  // linkedAthleteId is optional and supports a "parent user" linking to an athlete user.
  async function addTeamMember(teamId, userId, roleInTeam, linkedAthleteId) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const tid = String(teamId || "").trim();
    const uid = String(userId || "").trim();
    const r = String(roleInTeam || "athlete").trim();

    const lid = linkedAthleteId ? String(linkedAthleteId).trim() : null;

    if (!tid) throw new Error("teamId required");
    if (!uid) throw new Error("userId required");

    const { error } = await window.supabaseClient
      .from(T.team_members)
      .insert({
        team_id: tid,
        user_id: uid,
        role_in_team: r,
        linked_athlete_id: lid
      });

    if (error) throw normalizeErr(error);
    return true;
  }

  async function removeTeamMember(teamId, memberRowId) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const tid = String(teamId || "").trim();
    const mid = String(memberRowId || "").trim();

    if (!tid) throw new Error("teamId required");
    if (!mid) throw new Error("memberRowId required");

    // Because your table has an 'id' column, safest delete is by id + team_id.
    const { error } = await window.supabaseClient
      .from(T.team_members)
      .delete()
      .eq("team_id", tid)
      .eq("id", mid);

    if (error) throw normalizeErr(error);
    return true;
  }
async function listWorkoutLogsForAthlete(athleteId, upToDateISO, limit = 7) {
  ensureReadyOrThrow();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");

  const T = tables();
  const aid = String(athleteId || "").trim();
  const d = String(upToDateISO || "").trim();
  if (!aid) throw new Error("athleteId required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error("upToDateISO must be YYYY-MM-DD");

  const lim = Number(limit);
  const safeLim = Number.isFinite(lim) ? Math.max(1, Math.min(lim, 30)) : 7;

  const { data, error } = await window.supabaseClient
    .from(T.workout_logs)
    .select("athlete_id,date,program_day,volume,wellness,energy,hydration,injury_flag,injury_pain,sleep_quality,created_at,updated_at")
    .eq("athlete_id", aid)
    .lte("date", d)
    .order("date", { ascending: true })   // ascending so "last" is latest
    .limit(safeLim);

  if (error) throw normalizeErr(error);
  return data || [];
}

async function listMetricsForAthlete(athleteId, upToDateISO, limit = 7) {
  ensureReadyOrThrow();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");

  const T = tables();
  const aid = String(athleteId || "").trim();
  const d = String(upToDateISO || "").trim();
  if (!aid) throw new Error("athleteId required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error("upToDateISO must be YYYY-MM-DD");

  const lim = Number(limit);
  const safeLim = Number.isFinite(lim) ? Math.max(1, Math.min(lim, 30)) : 7;

  const { data, error } = await window.supabaseClient
    .from(T.performance_metrics)
    .select("athlete_id,date,vert_inches,sprint_seconds,cod_seconds,bw_lbs,sleep_hours,created_at")
    .eq("athlete_id", aid)
    .lte("date", d)
    .order("date", { ascending: true })
    .limit(safeLim);

  if (error) throw normalizeErr(error);
  return data || [];
}
  
  // =========================================================
  // Public API
  // =========================================================
  window.dataStore = {
    pushState,
    pullState,
    upsertWorkoutLog,
    upsertPerformanceMetric,
    window.dataStore = {
  // ...existing
  listWorkoutLogsForAthlete,
  listMetricsForAthlete
};

    // team
    createTeam,
    listMyTeams,
    listTeamMembers,
    addTeamMember,
    removeTeamMember
  };
})();
