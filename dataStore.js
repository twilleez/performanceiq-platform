// dataStore.js (PLAIN SCRIPT)
(function () {
  "use strict";

  if (window.dataStore) return;

  function requireClient() {
    const c = typeof window.sb === "function" ? window.sb() : null;
    if (!c) throw new Error("Supabase not configured (offline mode).");
    return c;
  }

  async function requireUserId() {
    const auth = window.PIQ_AuthStore;
    if (!auth) throw new Error("Auth store not loaded.");
    const user = await auth.getUser();
    if (!user) throw new Error("Not signed in.");
    return user.id;
  }

  async function pullState() {
    const client = requireClient();
    const userId = await requireUserId();

    const { data, error } = await client
      .from("piq_state")
      .select("state, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  async function pushState(stateObj) {
    const client = requireClient();
    const userId = await requireUserId();

    const payload = {
      user_id: userId,
      state: stateObj,
      updated_at: new Date().toISOString()
    };

    const { error } = await client
      .from("piq_state")
      .upsert(payload, { onConflict: "user_id" });

    if (error) throw error;
    return true;
  }

  async function upsertPerformanceMetric(metric) {
    const client = requireClient();
    const userId = await requireUserId();

    const row = { ...metric, athlete_id: userId };

    const { data, error } = await client
      .from("performance_metrics")
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function listPerformanceMetrics(limit = 60) {
    const client = requireClient();
    const userId = await requireUserId();

    const { data, error } = await client
      .from("performance_metrics")
      .select("*")
      .eq("athlete_id", userId)
      .order("date", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async function upsertWorkoutLog(logRow) {
    const client = requireClient();
    const userId = await requireUserId();

    const row = {
      athlete_id: userId,
      date: logRow.date,
      day_index: logRow.day_index ?? null,
      theme: logRow.theme ?? null,
      injury: logRow.injury ?? null,
      wellness: logRow.wellness ?? null,
      entries: logRow.entries ?? []
    };

    const { data, error } = await client
      .from("workout_logs")
      .upsert(row, { onConflict: "athlete_id,date" })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function listWorkoutLogs(limit = 60) {
    const client = requireClient();
    const userId = await requireUserId();

    const { data, error } = await client
      .from("workout_logs")
      .select("*")
      .eq("athlete_id", userId)
      .order("date", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  window.dataStore = {
    pullState,
    pushState,
    upsertPerformanceMetric,
    listPerformanceMetrics,
    upsertWorkoutLog,
    listWorkoutLogs
  };
})();
