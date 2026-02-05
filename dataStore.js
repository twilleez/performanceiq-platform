// dataStore.js (plain script)
(function () {
  "use strict";
  if (window.PIQ_DataStore) return;

  const api = {
    // stub: add cloud sync later
    save: async () => true,
    load: async () => null
  };

  window.PIQ_DataStore = api;
})();  window.dataStore.addWorkoutLog = async function (log) {
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
  const { data, error } = await sb
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
