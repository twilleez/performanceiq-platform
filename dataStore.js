// dataStore.js (plain script)
(function () {
  "use strict";

  if (window.dataStore) return;

  function requireClient() {
    const client = (typeof window.sb === "function") ? window.sb() : null;
    if (!client) throw new Error("Supabase not configured (offline mode).");
    return client;
  }

  window.dataStore = {
    async listPerformanceMetrics(athleteId, limit = 60) {
      const client = requireClient();

      const { data: metrics, error: metricsError } = await client
        .from("performance_metrics")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("date", { ascending: false })
        .limit(limit);

      if (metricsError) throw metricsError;

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
    },

    async addPerformanceMetric(metric) {
      const client = requireClient();

      const { data, error } = await client
        .from("performance_metrics")
        .insert(metric)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async addWorkoutLog(log) {
      const client = requireClient();

      const { data, error } = await client
        .from("workout_logs")
        .insert(log)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  };
})();
