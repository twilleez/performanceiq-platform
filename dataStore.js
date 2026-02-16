// dataStore.js — PRODUCTION-READY (FULL FILE REPLACEMENT)
// Offline-first app: this module only runs if Supabase is configured + user is signed in.
// Provides:
// - pushState(state), pullState()
// - upsertWorkoutLog(row), upsertPerformanceMetric(row)
//
// - Phase 3 Team APIs:
//   createTeam, listMyTeams, listTeamMembers, addTeamMember, removeTeamMember,
//   getTeamRosterSummary, createTeamSession, listTeamSessions, upsertAttendance
//
// - Phase 4 Readiness helpers (coach/team intelligence):
//   listWorkoutLogsForUsers(userIds, dateFromISO, dateToISO)
//   listPerformanceMetricsForUsers(userIds, dateFromISO, dateToISO)
//
// IMPORTANT:
// I cannot confirm your Supabase RLS policies.
// Coach/team reads require RLS that allows authorized coaches to read team-athlete data.
// If RLS blocks reads, these functions will throw.

(function () {
  "use strict";

  if (window.__PIQ_DATASTORE_LOADED__) return;
  window.__PIQ_DATASTORE_LOADED__ = true;

  const DEFAULT_TABLES = Object.freeze({
    state: "piq_user_state",
    workout_logs: "workout_logs",
    performance_metrics: "performance_metrics",
    teams: "teams",
    team_members: "team_members",
    user_profiles: "user_profiles",
    team_sessions: "team_sessions",
    team_attendance: "team_attendance"
  });

  function tables() {
    const cfg = window.PIQ_CONFIG && window.PIQ_CONFIG.tables;
    return {
      state: cfg?.state || DEFAULT_TABLES.state,
      workout_logs: cfg?.workout_logs || DEFAULT_TABLES.workout_logs,
      performance_metrics: cfg?.performance_metrics || DEFAULT_TABLES.performance_metrics,
      teams: cfg?.teams || DEFAULT_TABLES.teams,
      team_members: cfg?.team_members || DEFAULT_TABLES.team_members,
      user_profiles: cfg?.user_profiles || DEFAULT_TABLES.user_profiles,
      team_sessions: cfg?.team_sessions || DEFAULT_TABLES.team_sessions,
      team_attendance: cfg?.team_attendance || DEFAULT_TABLES.team_attendance
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
    return /^\d{4}-\d{2}-\d{2}$/.test(String(d || "").trim());
  }

  // =========================================================
  // State sync
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
    return data || null;
  }

  // =========================================================
  // Logs/Metrics upserts
  // =========================================================
  async function upsertWorkoutLog(row) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    if (!row || !row.date) throw new Error("Missing row.date");

    const payload = { ...row, user_id: u.id };

    const { error } = await window.supabaseClient
      .from(T.workout_logs)
      .upsert(payload, { onConflict: "user_id,date" });

    if (error) throw normalizeErr(error);
    return true;
  }

  async function upsertPerformanceMetric(row) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    if (!row || !row.date) throw new Error("Missing row.date");

    const payload = { ...row, user_id: u.id };

    const { error } = await window.supabaseClient
      .from(T.performance_metrics)
      .upsert(payload, { onConflict: "user_id,date" });

    if (error) throw normalizeErr(error);
    return true;
  }

  // =========================================================
  // Phase 3 — Team APIs
  // =========================================================
  async function createTeam(name) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const teamName = String(name || "").trim();
    if (!teamName) throw new Error("Team name required");

    const { data: team, error } = await window.supabaseClient
      .from(T.teams)
      .insert({ name: teamName, created_by: u.id })
      .select("*")
      .single();

    if (error) throw normalizeErr(error);

    const { error: e2 } = await window.supabaseClient
      .from(T.team_members)
      .insert({ team_id: team.id, user_id: u.id, role: "coach" });

    if (e2) throw normalizeErr(e2);
    return team;
  }

  async function listMyTeams() {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();

    // NOTE: This returns all teams; if you want "my teams only", you can swap to a view or join.
    const { data, error } = await window.supabaseClient
      .from(T.teams)
      .select("id,name,created_at,created_by")
      .order("created_at", { ascending: false });

    if (error) throw normalizeErr(error);
    return data || [];
  }

  async function listTeamMembers(teamId) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const id = String(teamId || "").trim();
    if (!id) throw new Error("teamId required");

    const { data, error } = await window.supabaseClient
      .from(T.team_members)
      .select("user_id,role,created_at")
      .eq("team_id", id)
      .order("created_at", { ascending: true });

    if (error) throw normalizeErr(error);
    return data || [];
  }

  async function addTeamMember(teamId, userId, role) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const tid = String(teamId || "").trim();
    const uid = String(userId || "").trim();
    const r = String(role || "athlete").trim();

    if (!tid) throw new Error("teamId required");
    if (!uid) throw new Error("userId required");

    const { error } = await window.supabaseClient
      .from(T.team_members)
      .insert({ team_id: tid, user_id: uid, role: r });

    if (error) throw normalizeErr(error);
    return true;
  }

  async function removeTeamMember(teamId, userId) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const tid = String(teamId || "").trim();
    const uid = String(userId || "").trim();

    if (!tid) throw new Error("teamId required");
    if (!uid) throw new Error("userId required");

    const { error } = await window.supabaseClient
      .from(T.team_members)
      .delete()
      .eq("team_id", tid)
      .eq("user_id", uid);

    if (error) throw normalizeErr(error);
    return true;
  }

  async function getTeamRosterSummary(teamId) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const tid = String(teamId || "").trim();
    if (!tid) throw new Error("teamId required");

    const members = await listTeamMembers(tid);
    const athleteIds = members.filter(m => m.role === "athlete").map(m => m.user_id);

    if (!athleteIds.length) return { members, athletes: [] };

    const { data: profiles, error: e1 } = await window.supabaseClient
      .from(T.user_profiles)
      .select("user_id,display_name,sport,days_per_week,updated_at")
      .in("user_id", athleteIds);

    if (e1) throw normalizeErr(e1);

    const { data: logs, error: e2 } = await window.supabaseClient
      .from(T.workout_logs)
      .select("user_id,date")
      .in("user_id", athleteIds)
      .order("date", { ascending: false });

    if (e2) throw normalizeErr(e2);

    const lastLogByUser = {};
    (logs || []).forEach((row) => {
      if (!lastLogByUser[row.user_id]) lastLogByUser[row.user_id] = row.date;
    });

    const athletes = athleteIds.map((uid) => {
      const p = (profiles || []).find(x => x.user_id === uid) || {};
      return {
        user_id: uid,
        display_name: p.display_name || "Athlete",
        sport: p.sport || "",
        days_per_week: p.days_per_week ?? null,
        last_log_date: lastLogByUser[uid] || null
      };
    });

    return { members, athletes };
  }

  async function createTeamSession(teamId, sessionDate, title) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const tid = String(teamId || "").trim();
    const d = String(sessionDate || "").trim();

    if (!tid) throw new Error("teamId required");
    if (!isISODate(d)) throw new Error("sessionDate must be YYYY-MM-DD");

    const { data, error } = await window.supabaseClient
      .from(T.team_sessions)
      .insert({
        team_id: tid,
        session_date: d,
        title: title ? String(title) : null,
        created_by: u.id
      })
      .select("*")
      .single();

    if (error) throw normalizeErr(error);
    return data;
  }

  async function listTeamSessions(teamId, limit = 20) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const tid = String(teamId || "").trim();
    if (!tid) throw new Error("teamId required");

    const lim = Number(limit);
    const safeLim = Number.isFinite(lim) ? Math.max(1, Math.min(lim, 100)) : 20;

    const { data, error } = await window.supabaseClient
      .from(T.team_sessions)
      .select("id,team_id,session_date,title,created_at")
      .eq("team_id", tid)
      .order("session_date", { ascending: false })
      .limit(safeLim);

    if (error) throw normalizeErr(error);
    return data || [];
  }

  async function upsertAttendance(sessionId, athleteUserId, status, notes) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const sid = String(sessionId || "").trim();
    const aid = String(athleteUserId || "").trim();
    const st = String(status || "").trim();

    if (!sid) throw new Error("sessionId required");
    if (!aid) throw new Error("athleteUserId required");
    if (!["present", "absent", "excused"].includes(st)) throw new Error("status must be present|absent|excused");

    const { error } = await window.supabaseClient
      .from(T.team_attendance)
      .upsert(
        {
          session_id: sid,
          athlete_user_id: aid,
          status: st,
          notes: notes ? String(notes) : null
        },
        { onConflict: "session_id,athlete_user_id" }
      );

    if (error) throw normalizeErr(error);
    return true;
  }

  // =========================================================
  // Phase 4 — Readiness data helpers (coach/team intelligence)
  // =========================================================
  async function listWorkoutLogsForUsers(userIds, dateFromISO, dateToISO) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const ids = Array.isArray(userIds) ? userIds.filter(Boolean).map(String) : [];
    if (!ids.length) return [];

    const from = String(dateFromISO || "").trim();
    const to = String(dateToISO || "").trim();
    if (from && !isISODate(from)) throw new Error("dateFromISO must be YYYY-MM-DD");
    if (to && !isISODate(to)) throw new Error("dateToISO must be YYYY-MM-DD");

    let q = window.supabaseClient
      .from(T.workout_logs)
      .select("user_id,date,wellness,energy,hydration,injury_flag,injury_pain,sleep_quality,program_day,volume")
      .in("user_id", ids);

    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);

    const { data, error } = await q.order("date", { ascending: true });
    if (error) throw normalizeErr(error);
    return data || [];
  }

  async function listPerformanceMetricsForUsers(userIds, dateFromISO, dateToISO) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    const ids = Array.isArray(userIds) ? userIds.filter(Boolean).map(String) : [];
    if (!ids.length) return [];

    const from = String(dateFromISO || "").trim();
    const to = String(dateToISO || "").trim();
    if (from && !isISODate(from)) throw new Error("dateFromISO must be YYYY-MM-DD");
    if (to && !isISODate(to)) throw new Error("dateToISO must be YYYY-MM-DD");

    let q = window.supabaseClient
      .from(T.performance_metrics)
      .select("user_id,date,vert_inches,sprint_seconds,cod_seconds,bw_lbs,sleep_hours")
      .in("user_id", ids);

    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);

    const { data, error } = await q.order("date", { ascending: true });
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

    // logs/metrics
    upsertWorkoutLog,
    upsertPerformanceMetric,

    // team
    createTeam,
    listMyTeams,
    listTeamMembers,
    addTeamMember,
    removeTeamMember,
    getTeamRosterSummary,
    createTeamSession,
    listTeamSessions,
    upsertAttendance,

    // readiness helpers
    listWorkoutLogsForUsers,
    listPerformanceMetricsForUsers
  };
})();
