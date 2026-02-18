// dataStore.js — PRODUCTION-READY (FULL FILE REPLACEMENT) — v1.1.4
// Adds "Join code" helpers WITHOUT requiring DB schema changes.
// IMPORTANT: This join code is NOT a secure invite system (no server verification / no one-time use).
// Recommended secure version requires a server-side Edge Function + join-code table.
//
// Aligned to your CURRENT Supabase schema (per your CSV):
// - workout_logs: athlete_id, date, program_day, volume, wellness, energy, hydration, injury_flag, injury_pain, sleep_quality, ...
// - performance_metrics: athlete_id, date, vert_inches, sprint_seconds, cod_seconds, bw_lbs, sleep_hours, ...
// - teams: id, name, sport, coach_id, created_at
// - team_members: id, team_id, user_id, role_in_team, linked_athlete_id, joined_at
//
// This module only runs if Supabase is configured + user is signed in.
//
// Provides:
// - pushState(state), pullState()
// - upsertWorkoutLog(row), upsertPerformanceMetric(row)
// - Athlete history: listWorkoutLogsForAthlete, listMetricsForAthlete
// - Team APIs: createTeam, listMyTeams, listTeamMembers, addTeamMember, removeTeamMember
// - Team readiness helpers: getTeamRosterSummary, listWorkoutLogsForUsers, listPerformanceMetricsForUsers
// - Join code helpers (simple): createJoinCode, joinTeamByCode

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
    return data || null;
  }

  // =========================================================
  // Workout logs upsert
  // =========================================================
  async function upsertWorkoutLog(row) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    if (!row || !row.date) throw new Error("Missing row.date");

    const payload = { ...row, athlete_id: u.id };

    // Requires UNIQUE(athlete_id, date)
    const { error } = await window.supabaseClient.from(T.workout_logs).upsert(payload, { onConflict: "athlete_id,date" });
    if (error) throw normalizeErr(error);
    return true;
  }

  // =========================================================
  // Performance metrics upsert
  // =========================================================
  async function upsertPerformanceMetric(row) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const T = tables();
    if (!row || !row.date) throw new Error("Missing row.date");

    const payload = { ...row, athlete_id: u.id };

    // Requires UNIQUE(athlete_id, date)
    const { error } = await window.supabaseClient.from(T.performance_metrics).upsert(payload, { onConflict: "athlete_id,date" });
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
      .select("athlete_id,date,program_day,volume,wellness,energy,hydration,injury_flag,injury_pain,sleep_quality,practice_intensity,practice_duration_min,extra_gym,extra_gym_duration_min,created_at,updated_at")
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

    const { data: team, error } = await window.supabaseClient
      .from(T.teams)
      .insert({ name: teamName, sport: teamSport, coach_id: u.id })
      .select("*")
      .single();

    if (error) throw normalizeErr(error);

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
  // Team readiness helpers (used by core.js coach readiness)
  // =========================================================
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
      .select("athlete_id as user_id,date,program_day,volume,wellness,energy,hydration,injury_flag,injury_pain,sleep_quality,practice_intensity,practice_duration_min,extra_gym,extra_gym_duration_min,created_at,updated_at")
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
  // Join code helpers (NO DB CHANGES)
  // Format: "PIQ1.<base64url(json)>"
  // json: { team_id, role_in_team, linked_athlete_id, exp_ms }
  // =========================================================
  function base64UrlEncode(str) {
    const b64 = btoa(unescape(encodeURIComponent(str)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlDecode(b64url) {
    const b64 = String(b64url).replace(/-/g, "+").replace(/_/g, "/") + "===".slice((String(b64url).length + 3) % 4);
    const str = decodeURIComponent(escape(atob(b64)));
    return str;
  }

  function createJoinCode(teamId, opts) {
    const tid = String(teamId || "").trim();
    if (!tid) throw new Error("teamId required");

    const role = String(opts?.role_in_team || "athlete").trim() || "athlete";
    const linked = opts?.linked_athlete_id ? String(opts.linked_athlete_id).trim() : null;

    const ttlMinutes = Number(opts?.ttl_minutes);
    const safeTtl = Number.isFinite(ttlMinutes) ? Math.max(5, Math.min(ttlMinutes, 60 * 24 * 14)) : 60 * 24; // default 24h, max 14 days
    const expMs = Date.now() + safeTtl * 60 * 1000;

    const payload = {
      team_id: tid,
      role_in_team: role,
      linked_athlete_id: linked,
      exp_ms: expMs
    };

    return "PIQ1." + base64UrlEncode(JSON.stringify(payload));
  }

  async function joinTeamByCode(code) {
    ensureReadyOrThrow();
    const u = await getUser();
    if (!u) throw new Error("Not signed in");

    const raw = String(code || "").trim();
    if (!raw) throw new Error("Join code required");
    if (!raw.startsWith("PIQ1.")) throw new Error("Invalid join code format");

    const encoded = raw.slice("PIQ1.".length);
    let payload;
    try {
      payload = JSON.parse(base64UrlDecode(encoded));
    } catch {
      throw new Error("Invalid join code payload");
    }

    const tid = String(payload?.team_id || "").trim();
    if (!tid) throw new Error("Join code missing team_id");

    const exp = Number(payload?.exp_ms);
    if (!Number.isFinite(exp)) throw new Error("Join code missing exp");
    if (Date.now() > exp) throw new Error("Join code expired");

    const role = String(payload?.role_in_team || "athlete").trim() || "athlete";
    const linked = payload?.linked_athlete_id ? String(payload.linked_athlete_id).trim() : null;

    // Insert into team_members for the CURRENT signed-in user
    await addTeamMember(tid, u.id, role, linked);
    return { team_id: tid, role_in_team: role, linked_athlete_id: linked };
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
    listPerformanceMetricsForUsers,

    // join code helpers (simple)
    createJoinCode,
    joinTeamByCode
  };
})();
