// dataStore.js
(function () {
  const sb = () => window.supabaseClient;

  window.dataStore = window.dataStore || {};

  window.dataStore.getCurrentUser = async function () {
    const client = sb();
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    return data.user || null;
  };

  window.dataStore.getAthleteProfile = async function (userId) {
    const client = sb();
    const { data, error } = await client
      .from("athlete_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error && error.code !== "PGRST116") throw error; // no row
    return data || null;
  };

  window.dataStore.upsertAthleteProfile = async function (profile) {
    const client = sb();
    const { data, error } = await client
      .from("athlete_profiles")
      .upsert(profile, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  window.dataStore.addWorkoutLog = async function (log) {
    const client = sb();
    const { data, error } = await client
      .from("workout_logs")
      .insert(log)
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  window.dataStore.listWorkoutLogs = async function (athleteId, limit) {
    const client = sb();
    const { data, error } = await client
      .from("workout_logs")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("date", { ascending: false })
      .limit(limit || 60);
    if (error) throw error;
    return data || [];
  };

  window.dataStore.addPerformanceMetric = async function (metric) {
    const client = sb();
    const { data, error } = await client
      .from("performance_metrics")
      .insert(metric)
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  window.dataStore.listPerformanceMetrics = async function (athleteId, limit) {
    const client = sb();
    const { data, error } = await client
      .from("performance_metrics")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("date", { ascending: false })
      .limit(limit || 60);
    if (error) throw error;
    return data || [];
  };
})();  const { data, error } = await sb
    .from("workout_logs")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
export async function addPerformanceMetric(metric) {
  const { data, error } = await sb
    .from("performance_metrics")
    .insert(metric)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listPerformanceMetrics(athleteId, limit = 60) {
  const { data, error } = await sb
    .from("performance_metrics")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
