// dataStore.js — FULL REPLACEMENT (plain script)
(function () {
  "use strict";

  if (window.dataStore) return;

  function requireClient() {
    const c = window.supabaseClient || null;
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

  // --- App state sync (whole blob) ---
  async function pullState() {
    const client = requireClient();
    const userId = await requireUserId();

    const { data, error } = await client
      .from("piq_state")
      .select("state, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data || null; // {state, updated_at} or null
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

  // --- Performance metrics ---
  async function upsertPerformanceMetric(metric) {
    const client = requireClient();
    const userId = await requireUserId();

    // Force ownership
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

  // --- Workout logs ---
  async function upsertWorkoutLog(logRow) {
    const client = requireClient();
    const userId = await requireUserId();

    // Map to your real table columns
    const row = {
      athlete_id: userId,
      date: logRow.date, // required
      program_day: logRow.program_day ?? null,
      volume: logRow.volume ?? null,
      wellness: logRow.wellness ?? null,
      energy: logRow.energy ?? null,
      hydration: logRow.hydration ?? null,
      injury_flag: logRow.injury_flag ?? null,
      practice_intensity: logRow.practice_intensity ?? null,
      practice_duration_min: logRow.practice_duration_min ?? null,
      extra_gym: logRow.extra_gym ?? null,
      extra_gym_duration_min: logRow.extra_gym_duration_min ?? null,
      updated_at: new Date().toISOString()
    };

    // Upsert by (athlete_id, date) — you must have a unique index for this
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
