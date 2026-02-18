// dataStore.js — PRODUCTION-READY (FULL FILE REPLACEMENT) — v1.1.4
// Aligned to your CURRENT Supabase schema (per your uploaded CSV):
// - workout_logs columns: id, athlete_id, date, program_day, volume, wellness, energy, hydration, injury_flag,
//   practice_intensity, practice_duration_min, extra_gym, extra_gym_duration_min, created_at, updated_at
// - performance_metrics columns: id, athlete_id, date, vert_inches, sprint_seconds, cod_seconds, bw_lbs, sleep_hours, created_at
// - teams columns: id, name, sport, coach_id, created_at
// - team_members columns: id, team_id, user_id, role_in_team, linked_athlete_id, joined_at
//
// This module only runs if Supabase is configured + user is signed in.
//
// Provides:
// - pushState(state), pullState()
// - upsertWorkoutLog(row), upsertPerformanceMetric(row)
// - Athlete history: listWorkoutLogsForAthlete, listMetricsForAthlete
// - Team APIs: createTeam, listMyTeams, listTeamMembers, addTeamMember, removeTeamMember
// - Team readiness helpers (for core.js coach tools):
//   - getTeamRosterSummary(teamId)
//   - listWorkoutLogsForUsers(userIds, fromISO, toISO)
//   - listPerformanceMetricsForUsers(userIds, fromISO, toISO)
//
// IMPORTANT:
// - This file maps "current auth user id" => athlete_id/coach_id where appropriate.
// - "state" snapshot table is configurable via window.PIQ_CONFIG.tables.state (not included in your CSV).
// - If your unique constraints differ, update the onConflict strings to match your DB.
// - Any extra fields passed from core.js that are NOT in your DB schema are stripped before upsert.

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

  // Allowed columns per uploaded CSV (used to strip unknown fields safely)
  const ALLOWED = Object.freeze({
    workout_logs: new Set([
      "athlete_id",
      "date",
      "program_day",
      "volume",
      "wellness",
      "energy",
      "hydration",
      "injury_flag",
      "practice_intensity",
      "practice_duration_min",
      "extra_gym",
      "extra_gym_duration_min"
    ]),
    performance_metrics: new Set([
      "athlete_id",
      "date",
      "vert_inches",
      "sprint_seconds",
      "cod_seconds",
      "bw_lbs",
      "sleep_hours"
    ])
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

  function isISODate(d) {
    const s = String(d || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s);
  }

  function clampLimit(n, fallback = 7, max = 200) {
    const x = Number(n);
    if (!Number.isFinite(x)) return fallback;
    return Math.max(1, Math.min(Math.floor(x), max));
  }

  function pickAllowed(obj, allowedSet) {
    const out = {};
    if (!obj || typeof obj !== "object") return out;
    Object.keys(obj).forEach((k) => {
      if (allowedSet.has(k)) out[k] = obj[k];
    });
    return out;
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

    const { error } = await window.supabaseClient.from(T.state).upsert(payload, { onConflict: "user_id" });
    if (error) throw normalizeErr(error);
    return true;
  }

  async function pullState() {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const { data, error } = await window.supabaseClient.from(T.state).select("state").eq("user_id", u.id).maybeSingle();
    if (error) throw normalizeErr(error);
    return data || null; // { state: {...} } or null
  }

  // =========================================================
  // Workout logs upsert
  // core.js passes extra fields sometimes; we STRIP to DB schema.
  // Table expects athlete_id instead of user_id.
  // =========================================================
  async function upsertWorkoutLog(row) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    if (!row || !row.date) throw new Error("Missing row.date");
    if (!isISODate(row.date)) throw new Error("row.date must be YYYY-MM-DD");

    // strip to schema + enforce athlete_id
    const base = pickAllowed(row, ALLOWED.workout_logs);
    const payload = { ...base, athlete_id: u.id };

    // IMPORTANT: DB must have UNIQUE(athlete_id, date) (recommended)
    const { error } = await window.supabaseClient.from(T.workout_logs).upsert(payload, { onConflict: "athlete_id,date" });
    if (error) throw normalizeErr(error);
    return true;
  }

  // =========================================================
  // Performance metrics upsert
  // core.js may pass extra; we STRIP to DB schema.
  // Table expects athlete_id instead of user_id.
  // =========================================================
  async function upsertPerformanceMetric(row) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    if (!row || !row.date) throw new Error("Missing row.date");
    if (!isISODate(row.date)) throw new Error("row.date must be YYYY-MM-DD");

    const base = pickAllowed(row, ALLOWED.performance_metrics);
    const payload = { ...base, athlete_id: u.id };

    // IMPORTANT: DB must have UNIQUE(athlete_id, date) (recommended)
    const { error } = await window.supabaseClient
      .from(T.performance_metrics)
      .upsert(payload, { onConflict: "athlete_id,date" });

    if (error) throw normalizeErr(error);
    return true;
  }

  // =========================================================
  // Athlete history helpers (single athlete)
  // =========================================================
  async function listWorkoutLogsForAthlete(athleteId, upToDateISO, limit = 7) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const aid = String(athleteId || "").trim();
    const d = String(upToDateISO || "").trim();

    if (!aid) throw new Error("athleteId required");
    if (!isISODate(d)) throw new Error("upToDateISO must be YYYY-MM-DD");

    const safeLim = clampLimit(limit, 7, 200);

    const { data, error } = await window.supabaseClient
      .from(T.workout_logs)
      .select(
        "athlete_id,date,program_day,volume,wellness,energy,hydration,injury_flag,practice_intensity,practice_duration_min,extra_gym,extra_gym_duration_min,created_at,updated_at"
      )
      .eq("athlete_id", aid)
      .lte("date", d)
      .order("date", { ascending: true })
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
    if (!isISODate(d)) throw new Error("upToDateISO must be YYYY-MM-DD");

    const safeLim = clampLimit(limit, 7, 200);

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
  // Team APIs
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

    // Add creator as coach member row
    const { error: e2 } = await window.supabaseClient.from(T.team_members).insert({
      team_id: team.id,
      user_id: u.id,
      role_in_team: "coach",
      linked_athlete_id: null
    });

    if (e2) throw normalizeErr(e2);
    return team;
  }

  async function listMyTeams() {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();

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

    const { error } = await window.supabaseClient.from(T.team_members).insert({
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

    const { error } = await window.supabaseClient.from(T.team_members).delete().eq("team_id", tid).eq("id", mid);
    if (error) throw normalizeErr(error);
    return true;
  }

  // =========================================================
  // Team readiness helpers (for core.js Coach/Team readiness)
  // =========================================================

  // Returns { athletes: [{ user_id, display_name, last_log_date }] }
  // NOTE: "display_name" is not in your CSV; we generate a fallback.
  async function getTeamRosterSummary(teamId) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const tid = String(teamId || "").trim();
    if (!tid) throw new Error("teamId required");

    const { data: members, error: e1 } = await window.supabaseClient
      .from(T.team_members)
      .select("id,team_id,user_id,role_in_team,linked_athlete_id,joined_at")
      .eq("team_id", tid);

    if (e1) throw normalizeErr(e1);

    const athletes = (members || [])
      .map((m) => {
        const role = String(m.role_in_team || "").toLowerCase().trim();
        const athleteUid = m.linked_athlete_id ? String(m.linked_athlete_id) : String(m.user_id || "");
        if (!athleteUid) return null;
        if (role === "athlete" || m.linked_athlete_id) return { user_id: athleteUid };
        return null;
      })
      .filter(Boolean);

    const uniq = {};
    athletes.forEach((a) => (uniq[a.user_id] = a));
    const athleteIds = Object.keys(uniq);

    let lastLogByAthlete = {};
    if (athleteIds.length) {
      const { data: logs, error: e2 } = await window.supabaseClient
        .from(T.workout_logs)
        .select("athlete_id,date")
        .in("athlete_id", athleteIds)
        .order("date", { ascending: false })
        .limit(Math.min(athleteIds.length * 10, 1000));

      if (e2) throw normalizeErr(e2);

      (logs || []).forEach((r) => {
        const aid = r.athlete_id;
        const d = r.date;
        if (!aid || !isISODate(d)) return;
        if (!lastLogByAthlete[aid]) lastLogByAthlete[aid] = d;
      });
    }

    const athletesOut = athleteIds.map((id) => ({
      user_id: id,
      display_name: `Athlete ${String(id).slice(0, 6)}`,
      last_log_date: lastLogByAthlete[id] || null
    }));

    return { athletes: athletesOut };
  }

  async function listWorkoutLogsForUsers(userIds, fromISO, toISO) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const ids = Array.isArray(userIds) ? userIds.map((x) => String(x).trim()).filter(Boolean) : [];
    const from = String(fromISO || "").trim();
    const to = String(toISO || "").trim();

    if (!ids.length) return [];
    if (!isISODate(from) || !isISODate(to)) throw new Error("fromISO/toISO must be YYYY-MM-DD");

    // PostgREST rename syntax: athlete_id:user_id
    const { data, error } = await window.supabaseClient
      .from(T.workout_logs)
      .select(
        "athlete_id:user_id,date,program_day,volume,wellness,energy,hydration,injury_flag,practice_intensity,practice_duration_min,extra_gym,extra_gym_duration_min,created_at,updated_at"
      )
      .in("athlete_id", ids)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true });

    if (error) throw normalizeErr(error);
    return data || [];
  }

  async function listPerformanceMetricsForUsers(userIds, fromISO, toISO) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const ids = Array.isArray(userIds) ? userIds.map((x) => String(x).trim()).filter(Boolean) : [];
    const from = String(fromISO || "").trim();
    const to = String(toISO || "").trim();

    if (!ids.length) return [];
    if (!isISODate(from) || !isISODate(to)) throw new Error("fromISO/toISO must be YYYY-MM-DD");

    const { data, error } = await window.supabaseClient
      .from(T.performance_metrics)
      .select("athlete_id:user_id,date,vert_inches,sprint_seconds,cod_seconds,bw_lbs,sleep_hours,created_at")
      .in("athlete_id", ids)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true });

    if (error) throw normalizeErr(error);
    return data || [];
  }

  // =========================================================
  // Public API
  // =========================================================
  window.dataStore = {
    // state sync
    pushState,
    pullState,

    // athlete upserts
    upsertWorkoutLog,
    upsertPerformanceMetric,

    // athlete history
    listWorkoutLogsForAthlete,
    listMetricsForAthlete,

    // team
    createTeam,
    listMyTeams,
    listTeamMembers,
    addTeamMember,
    removeTeamMember,

    // team readiness helpers
    getTeamRosterSummary,
    listWorkoutLogsForUsers,
    listPerformanceMetricsForUsers
  };
})();
