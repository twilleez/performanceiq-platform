// dataStore.js (Phase 4) — schema-aligned for athlete_id + created_at
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

  // ---------
  // State Sync
  // ---------
  async function pushState(stateObj) {
    const supabase = requireClient();
    const uid = await getUserId();
    if (!uid) throw new Error("Not signed in");

    // expects table: piq_user_state (user_id PK, state jsonb, updated_at timestamptz default now())
    const { error } = await supabase
      .from("piq_user_state")
      .upsert({ user_id: uid, state: stateObj, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

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

    // row must include: date, program_day, volume, wellness, energy, ...
    // table expects athlete_id
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

    // Teams where I'm a member
    const { data, error } = await supabase
      .from("teams")
      .select("id,name,sport,created_at")
      .in(
        "id",
        (await supabase.from("team_members").select("team_id").eq("user_id", uid)).data?.map((x) => x.team_id) || []
      );

    if (error) throw error;
    return data || [];
  }

  async function createTeam(name, sport) {
    const supabase = requireClient();
    const uid = await getUserId();
    if (!uid) throw new Error("Not signed in");

    // NOTE: This assumes teams table has created_by (uuid) or owner_id etc.
    // If your teams table has NO owner column, tell me the columns and I'll adjust.
    const { data: team, error: e1 } = await supabase
      .from("teams")
      .insert({ name, sport: sport || null, created_by: uid })
      .select("*")
      .single();
    if (e1) throw e1;

    // add yourself as coach
    const { error: e2 } = await supabase.from("team_members").insert({
      team_id: team.id,
      user_id: uid,
      role_in_team: "coach",
      linked_athlete_id: null
    });
    if (e2) throw e2;

    return team;
  }

  async function listTeamMembers(teamId) {
    const supabase = requireClient();
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function addTeamMember(teamId, userId, roleInTeam, linkedAthleteId) {
    const supabase = requireClient();
    const { error } = await supabase.from("team_members").insert({
      team_id: teamId,
      user_id: userId,
      role_in_team: roleInTeam,
      linked_athlete_id: linkedAthleteId || null
    });
    if (error) throw error;
    return true;
  }

  async function removeTeamMember(teamId, memberId) {
    const supabase = requireClient();
    const { error } = await supabase.from("team_members").delete().eq("team_id", teamId).eq("id", memberId);
    if (error) throw error;
    return true;
  }

  window.dataStore = {
    pushState,
    pullState,
    upsertWorkoutLog,
    upsertPerformanceMetric,
    listWorkoutLogsForAthlete,
    listMetricsForAthlete,
    listMyTeams,
    createTeam,
    listTeamMembers,
    addTeamMember,
    removeTeamMember
  };
})();
