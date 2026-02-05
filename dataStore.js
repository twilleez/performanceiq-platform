window.dataStore.listPerformanceMetrics = async function (athleteId, limit = 60) {
  const client = sb(); // sb() must return a Supabase client

  // 1) Performance metrics
  const { data: metrics, error: metricsError } = await client
    .from("performance_metrics")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("date", { ascending: false })
    .limit(limit);

  if (metricsError) throw metricsError;

  // 2) Workout logs
  const { data: logs, error: logsError } = await client
    .from("workout_logs")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("date", { ascending: false })
    .limit(limit);

  if (logsError) throw logsError;

  return {
    metrics: metrics || [],
    logs: logs || []
  };
};    const client = sb();
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
