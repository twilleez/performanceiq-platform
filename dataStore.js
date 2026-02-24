// dataStore.js — NEXT PHASE (join codes + clean queries) v1.3.1
// Offline-first app still works without Supabase; these APIs require window.supabaseClient.
// Tables expected (public):
// - piq_user_state (user_id uuid PK, state jsonb, updated_at timestamptz)
// - workout_logs (athlete_id uuid, date date, ...)
// - performance_metrics (athlete_id uuid, date date, ...)
// - teams (id uuid PK, name text, sport text, owner_id uuid, coach_id uuid, join_code text UNIQUE, created_at timestamptz)
// - team_members (id uuid PK, team_id uuid, user_id uuid, role_in_team text, linked_athlete_id uuid NULL, created_at timestamptz)
//
// IMPORTANT (RLS):
// - To allow non-members to join via code when teams SELECT is restricted,
//   install RPC: public.get_team_by_join_code(code text)
//   (see /sql/002_rpc_get_team_by_join_code.sql in your patch)

(function () {
  "use strict";
  if (window.dataStore) return;

  function requireClient() {
    if (!window.supabaseClient) throw new Error("supabaseClient not initialized");
    return window.supabaseClient;
  }

  async function getUserId() {
    if (!window.PIQ_AuthStore?.getUser) return null;
    const u = await window.PIQ_AuthStore.getUser();
    return u?.id || null;
  }

  // ----------------
  // Join code helper
  // ----------------
  function generateJoinCode(length) {
    const len = Math.max(6, Math.min(10, Number(length || 6)));
    // uppercase A-Z0-9 only
    const raw = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "");
    return raw.slice(0, len);
  }

  async function ensureUniqueJoinCode(supabase, length) {
    // Best practice: enforce UNIQUE(join_code) in DB.
    for (let i = 0; i < 25; i++) {
      const code = generateJoinCode(length);
      const { data, error } = await supabase
        .from("teams")
        .select("id")
        .eq("join_code", code)
        .maybeSingle();
      if (error) throw error;
      if (!data) return code;
    }
    throw new Error("Could not generate unique join code. Increase length and retry.");
  }

  // ---------
  // State Sync
  // ---------
  async function pushState(stateObj) {
    const supabase = requireClient();
    const uid = await getUserId();
    if (!uid) throw new Error("Not signed in");

    const { error } = await supabase
      .from("piq_user_state")
      .upsert(
        { user_id: uid, state: stateObj, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    if (error) throw error;
    return true;
  }

  async function pullState() {
    const supabase = requireClient();
    const uid = await getUserId();
    if (!uid) throw new Error("Not signed in");

    const { data, error } = await supabase
      .from("piq_user_state")
      .select("state, updated_at")
      .eq("user_id", uid)
      .maybeSingle();

    if (error) throw error;
    return data ? { state: data.state, updated_at: data.updated_at } : null;
  }

  // -----------------
  // Workout Logs CRUD
  // -----------------
  async function upsertWorkoutLog(row) {
    const supabase = requireClient();
    const uid = await getUserId();
    if (!uid) throw new Error("Not signed in");

    const payload = { ...row, athlete_id: uid };

    const { error } = await supabase.from("workout_logs").upsert(payload, {
      onConflict: "athlete_id,date"
    });

    if (error) throw error;
    return true;
  }

  async function listWorkoutLogsForAthlete(athleteId, upToISO, limit) {
    const supabase = requireClient();
    const upTo = String(upToISO || "").slice(0, 10);
    const lim = Number(limit || 14);

    const { data, error } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("athlete_id", athleteId)
      .lte("date", upTo)
      .order("date", { ascending: false })
      .limit(lim);

    if (error) throw error;
    return data || [];
  }

  // -----------------------
  // Performance Metrics CRUD
  // -----------------------
  async function upsertPerformanceMetric(row) {
    const supabase = requireClient();
    const uid = await getUserId();
    if (!uid) throw new Error("Not signed in");

    const payload = { ...row, athlete_id: uid };

    const { error } = await supabase.from("performance_metrics").upsert(payload, {
      onConflict: "athlete_id,date"
    });

    if (error) throw error;
    return true;
  }

  async function listMetricsForAthlete(athleteId, upToISO, limit) {
    const supabase = requireClient();
    const upTo = String(upToISO || "").slice(0, 10);
    const lim = Number(limit || 14);

    const { data, error } = await supabase
      .from("performance_metrics")
      .select("*")
      .eq("athlete_id", athleteId)
      .lte("date", upTo)
      .order("date", { ascending: false })
      .limit(lim);

    if (error) throw error;
    return data || [];
  }

  // -----
  // Teams
  // -----

  async function listMyTeams() {
    const supabase = requireClient();
    const uid = await getUserId();
    if (!uid) throw new Error("Not signed in");

    const { data: membership, error: mErr } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", uid);

    if (mErr) throw mErr;

    const teamIds = (membership || []).map((x) => x.team_id).filter(Boolean);
    if (!teamIds.length) return [];

    const { data, error } = await supabase
      .from("teams")
      .select("id,name,sport,join_code,owner_id,coach_id,created_at")
      .in("id", teamIds);

    if (error) throw error;
    return data || [];
  }

  async function createTeam(name, sport, options) {
    const supabase = requireClient();
    const uid = await getUserId();
    if (!uid) throw new Error("Not signed in");

    const cleanName = String(name || "").trim();
    if (!cleanName) throw new Error("Team name is required");

    const cleanSport = sport ? String(sport).trim() : null;

    const opts = options && typeof options === "object" ? options : {};
    const codeLen = Number(opts.joinCodeLength || 6);

    const joinCode = await ensureUniqueJoinCode(supabase, codeLen);

    const { data: team, error: e1 } = await supabase
      .from("teams")
      .insert({
        name: cleanName,
        sport: cleanSport,
        owner_id: uid,
        coach_id: uid,
        join_code: joinCode
      })
      .select("*")
      .single();

    if (e1) throw e1;

    // auto-add creator as coach
    const { error: e2 } = await supabase.from("team_members").insert({
      team_id: team.id,
      user_id: uid,
      role_in_team: "coach",
      linked_athlete_id: null
    });
    if (e2) throw e2;

    return team;
  }

  async function renewJoinCode(teamId, options) {
    const supabase = requireClient();
    const uid = await getUserId();
    if (!uid) throw new Error("Not signed in");

    const tid = String(teamId || "").trim();
    if (!tid) throw new Error("teamId is required");

    const opts = options && typeof options === "object" ? options : {};
    const codeLen = Number(opts.joinCodeLength || 6);

    const joinCode = await ensureUniqueJoinCode(supabase, codeLen);

    // RLS should allow only coach/owner to update join_code
    const { data: updated, error } = await supabase
      .from("teams")
      .update({ join_code: joinCode })
      .eq("id", tid)
      .select("*")
      .single();

    if (error) throw error;
    return updated;
  }

  async function getTeamByJoinCode(joinCode) {
    const supabase = requireClient();
    const code = String(joinCode || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!code) throw new Error("Join code is required");

    // Try RPC first (supports RLS where teams select is blocked for non-members)
    const { data: rpcData, error: rpcErr } = await supabase.rpc("get_team_by_join_code", { code });
    if (!rpcErr) {
      if (Array.isArray(rpcData) && rpcData.length) return rpcData[0];
      if (rpcData && rpcData.id) return rpcData;
    }

    // Fallback direct query (may fail under strict RLS)
    const { data, error } = await supabase
      .from("teams")
      .select("id,name,sport,join_code,owner_id,coach_id,created_at")
      .eq("join_code", code)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Invalid join code");
    return data;
  }

  async function joinTeamByCode(joinCode, roleInTeam, linkedAthleteId) {
    const supabase = requireClient();
    const uid = await getUserId();
    if (!uid) throw new Error("Not signed in");

    const team = await getTeamByJoinCode(joinCode);
    if (!team?.id) throw new Error("Invalid join code");

    const role = String(roleInTeam || "athlete").trim() || "athlete";

    const { error } = await supabase.from("team_members").insert({
      team_id: team.id,
      user_id: uid,
      role_in_team: role,
      linked_athlete_id: linkedAthleteId || null
    });

    if (error) throw error;
    return team;
  }

  async function listTeamMembers(teamId) {
    const supabase = requireClient();
    const tid = String(teamId || "").trim();
    if (!tid) throw new Error("teamId is required");

    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_id", tid)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async function addTeamMember(teamId, userId, roleInTeam, linkedAthleteId) {
    const supabase = requireClient();
    const tid = String(teamId || "").trim();
    const uid = String(userId || "").trim();
    if (!tid) throw new Error("teamId is required");
    if (!uid) throw new Error("userId is required");

    const { error } = await supabase.from("team_members").insert({
      team_id: tid,
      user_id: uid,
      role_in_team: String(roleInTeam || "athlete").trim() || "athlete",
      linked_athlete_id: linkedAthleteId || null
    });

    if (error) throw error;
    return true;
  }

  async function removeTeamMember(teamId, memberId) {
    const supabase = requireClient();
    const tid = String(teamId || "").trim();
    const mid = String(memberId || "").trim();
    if (!tid) throw new Error("teamId is required");
    if (!mid) throw new Error("memberId is required");

    const { error } = await supabase.from("team_members").delete().eq("team_id", tid).eq("id", mid);
    if (error) throw error;
    return true;
  }

  window.dataStore = {
    // state
    pushState,
    pullState,

    // logs/metrics
    upsertWorkoutLog,
    upsertPerformanceMetric,
    listWorkoutLogsForAthlete,
    listMetricsForAthlete,

    // teams
    listMyTeams,
    createTeam,
    renewJoinCode,
    getTeamByJoinCode,
    joinTeamByCode,

    // roster
    listTeamMembers,
    addTeamMember,
    removeTeamMember
  };
})();
