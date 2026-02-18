// dataStore.js — PRODUCTION-READY (FULL FILE REPLACEMENT) — v1.1.4 (Join Code)
// Aligned to your CURRENT Supabase schema (per your CSV) + OPTIONAL join-code support:
// - workout_logs: athlete_id, date, program_day, volume, wellness, energy, hydration, injury_flag, injury_pain, sleep_quality, ...
// - performance_metrics: athlete_id, date, vert_inches, sprint_seconds, cod_seconds, bw_lbs, sleep_hours, ...
// - teams: id, name, sport, coach_id, created_at   (+ optional: join_code, join_code_enabled)
// - team_members: id, team_id, user_id, role_in_team, linked_athlete_id, joined_at
//
// This module only runs if Supabase is configured + user is signed in.
//
// Provides:
// - pushState(state), pullState()
// - upsertWorkoutLog(row), upsertPerformanceMetric(row)
// - Athlete history: listWorkoutLogsForAthlete, listMetricsForAthlete
// - Team APIs: createTeam, listMyTeams, listTeamMembers, addTeamMember, removeTeamMember
// - Join-code flow (recommended):
//     - joinTeamByCode(code, roleInTeam="athlete", linkedAthleteId=null)
//     - regenerateTeamJoinCode(teamId)
//     - enableTeamJoinCode(teamId, enabled)
//     - getTeamJoinCode(teamId)  (coach use; requires RLS allowing read)
// - Team readiness helpers for core.js coach readiness:
//     - getTeamRosterSummary(teamId)
//     - listWorkoutLogsForUsers(userIds, fromISO, toISO)
//     - listPerformanceMetricsForUsers(userIds, fromISO, toISO)
//
// IMPORTANT:
// - "state" snapshot table is configurable via window.PIQ_CONFIG.tables.state (not included in your CSV).
// - If your unique constraints differ, update the onConflict strings to match your DB.
// - Join-code support assumes OPTIONAL columns on teams: join_code, join_code_enabled.
//   If those columns do NOT exist yet, createTeam will still work (it will fall back automatically),
//   but join-code functions will not work until you add them + RLS.

(function () {
  "use strict";

  if (window.__PIQ_DATASTORE_LOADED__) return;
  window.__PIQ_DATASTORE_LOADED__ = true;

  const DEFAULT_TABLES = Object.freeze({
    state: "piq_user_state",
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

  function isISODate(d) {
    const s = String(d || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s);
  }

  function clampLimit(n, fallback = 7, max = 200) {
    const x = Number(n);
    if (!Number.isFinite(x)) return fallback;
    return Math.max(1, Math.min(Math.floor(x), max));
  }

  // =========================================================
  // Join code helpers (client-side generator)
  // =========================================================
  function _cryptoBytes(len) {
    const out = new Uint8Array(len);
    const c = (typeof crypto !== "undefined" && crypto.getRandomValues) ? crypto : null;
    if (!c) throw new Error("Secure crypto not available");
    c.getRandomValues(out);
    return out;
  }

  function generateJoinCode(length = 8) {
    const L = Math.max(6, Math.min(Number(length) || 8, 16));
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/1/0 to reduce confusion
    const bytes = _cryptoBytes(L);
    let s = "";
    for (let i = 0; i < L; i++) {
      s += alphabet[bytes[i] % alphabet.length];
    }
    return s;
  }

  function normalizeJoinCode(code) {
    return String(code || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .trim();
  }

  function looksLikeMissingJoinColumns(err) {
    const m = String(err?.message || "").toLowerCase();
    // Postgres undefined_column is 42703, but Supabase JS may not always expose code.
    const c = String(err?.code || "").trim();
    return c === "42703" || m.includes("join_code") || m.includes("join code") || m.includes("column") && m.includes("join");
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

    const { data, error } = await window.supabaseClient
      .from(T.state)
      .select("state")
      .eq("user_id", u.id)
      .maybeSingle();

    if (error) throw normalizeErr(error);
    return data || null; // { state: {...} } or null
  }

  // =========================================================
  // Workout logs upsert (single athlete = current auth user)
  // =========================================================
  async function upsertWorkoutLog(row) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    if (!row || !row.date) throw new Error("Missing row.date");

    const payload = { ...row, athlete_id: u.id };

    // IMPORTANT: DB must have UNIQUE(athlete_id, date) (recommended)
    const { error } = await window.supabaseClient
      .from(T.workout_logs)
      .upsert(payload, { onConflict: "athlete_id,date" });

    if (error) throw normalizeErr(error);
    return true;
  }

  // =========================================================
  // Performance metrics upsert (single athlete = current auth user)
  // =========================================================
  async function upsertPerformanceMetric(row) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    if (!row || !row.date) throw new Error("Missing row.date");

    const payload = { ...row, athlete_id: u.id };

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
        "athlete_id,date,program_day,volume,wellness,energy,hydration,injury_flag,injury_pain,sleep_quality,practice_intensity,practice_duration_min,extra_gym,extra_gym_duration_min,created_at,updated_at"
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
      .select("athlete_id,date,vert_inches,sprint_seconds,cod_seconds,bw_lbs,sleep_hours,created_at,updated_at")
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

    // Prefer join-code columns if they exist
    const join_code = generateJoinCode(8);
    const insertWithCode = { name: teamName, sport: teamSport, coach_id: u.id, join_code, join_code_enabled: true };
    const insertBasic = { name: teamName, sport: teamSport, coach_id: u.id };

    let team = null;

    // Attempt #1: with join_code
    {
      const { data, error } = await window.supabaseClient
        .from(T.teams)
        .insert(insertWithCode)
        .select("*")
        .single();

      if (!error) {
        team = data;
      } else if (looksLikeMissingJoinColumns(error)) {
        // Attempt #2: fall back without join_code columns (schema not updated yet)
        const { data: d2, error: e2 } = await window.supabaseClient
          .from(T.teams)
          .insert(insertBasic)
          .select("*")
          .single();

        if (e2) throw normalizeErr(e2);
        team = d2;
      } else {
        throw normalizeErr(error);
      }
    }

    // Add creator as coach member row
    const { error: eMember } = await window.supabaseClient.from(T.team_members).insert({
      team_id: team.id,
      user_id: u.id,
      role_in_team: "coach",
      linked_athlete_id: null
    });
    if (eMember) throw normalizeErr(eMember);

    return team;
  }

  async function listMyTeams() {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();

    // We attempt to select join columns as well; if they don't exist, we retry without them.
    const selectWithJoin = "id,name,sport,created_at,coach_id,join_code,join_code_enabled";
    const selectBasic = "id,name,sport,created_at,coach_id";

    const { data, error } = await window.supabaseClient
      .from(T.teams)
      .select(selectWithJoin)
      .eq("coach_id", u.id)
      .order("created_at", { ascending: false });

    if (!error) return data || [];

    if (looksLikeMissingJoinColumns(error)) {
      const { data: d2, error: e2 } = await window.supabaseClient
        .from(T.teams)
        .select(selectBasic)
        .eq("coach_id", u.id)
        .order("created_at", { ascending: false });

      if (e2) throw normalizeErr(e2);
      return d2 || [];
    }

    throw normalizeErr(error);
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

    const { error } = await window.supabaseClient
      .from(T.team_members)
      .delete()
      .eq("team_id", tid)
      .eq("id", mid);

    if (error) throw normalizeErr(error);
    return true;
  }

  // =========================================================
  // Join-code APIs (recommended flow)
  // =========================================================

  // Coach-only (requires RLS): fetch join_code (+ enabled) for team
  async function getTeamJoinCode(teamId) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const tid = String(teamId || "").trim();
    if (!tid) throw new Error("teamId required");

    const { data, error } = await window.supabaseClient
      .from(T.teams)
      .select("id,join_code,join_code_enabled,coach_id")
      .eq("id", tid)
      .maybeSingle();

    if (error) throw normalizeErr(error);
    return data || null;
  }

  // Coach-only (requires columns + RLS): regenerate join code
  async function regenerateTeamJoinCode(teamId) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const tid = String(teamId || "").trim();
    if (!tid) throw new Error("teamId required");

    const join_code = generateJoinCode(8);

    const { data, error } = await window.supabaseClient
      .from(T.teams)
      .update({ join_code, join_code_enabled: true })
      .eq("id", tid)
      .select("id,join_code,join_code_enabled")
      .single();

    if (error) throw normalizeErr(error);
    return data || null;
  }

  // Coach-only (requires columns + RLS): enable/disable
  async function enableTeamJoinCode(teamId, enabled) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const tid = String(teamId || "").trim();
    if (!tid) throw new Error("teamId required");

    const en = !!enabled;

    const { data, error } = await window.supabaseClient
      .from(T.teams)
      .update({ join_code_enabled: en })
      .eq("id", tid)
      .select("id,join_code,join_code_enabled")
      .single();

    if (error) throw normalizeErr(error);
    return data || null;
  }

  // Athlete self-join by code: resolves team by join_code and inserts team_members row for current user.
  // Requires:
  // - teams.join_code (+ enabled)
  // - RLS allowing select of teams by join_code (or an RPC), and insert into team_members for auth.uid()
  async function joinTeamByCode(code, roleInTeam = "athlete", linkedAthleteId = null) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const c = normalizeJoinCode(code);
    if (!c) throw new Error("Join code required");

    const { data: team, error: eTeam } = await window.supabaseClient
      .from(T.teams)
      .select("id,join_code,join_code_enabled")
      .eq("join_code", c)
      .maybeSingle();

    if (eTeam) throw normalizeErr(eTeam);
    if (!team || !team.id) throw new Error("Invalid code");
    if (team.join_code_enabled === false) throw new Error("Code disabled");

    const r = String(roleInTeam || "athlete").trim() || "athlete";
    const lid = linkedAthleteId ? String(linkedAthleteId).trim() : null;

    const { error: eIns } = await window.supabaseClient.from(T.team_members).insert({
      team_id: team.id,
      user_id: u.id,
      role_in_team: r,
      linked_athlete_id: lid
    });

    if (eIns) throw normalizeErr(eIns);
    return { team_id: team.id };
  }

  // =========================================================
  // Team readiness helpers (used by core.js coach readiness)
  // =========================================================

  // Returns { athletes: [{ user_id, display_name, last_log_date }] }
  // NOTE: "display_name" is not in your CSV. We fall back to a short user id label.
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

    const { data, error } = await window.supabaseClient
      .from(T.workout_logs)
      .select(
        "athlete_id as user_id,date,program_day,volume,wellness,energy,hydration,injury_flag,injury_pain,sleep_quality,practice_intensity,practice_duration_min,extra_gym,extra_gym_duration_min,created_at,updated_at"
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
      .select("athlete_id as user_id,date,vert_inches,sprint_seconds,cod_seconds,bw_lbs,sleep_hours,created_at,updated_at")
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

    // join-code
    getTeamJoinCode,
    regenerateTeamJoinCode,
    enableTeamJoinCode,
    joinTeamByCode,

    // team readiness helpers
    getTeamRosterSummary,
    listWorkoutLogsForUsers,
    listPerformanceMetricsForUsers
  };
})();
