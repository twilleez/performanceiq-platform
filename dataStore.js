// dataStore.js (plain script)
(function () {
  "use strict";

  if (window.dataStore) return;

  function requireClient() {
    const client = window.sb ? window.sb() : null;
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

      return { metrics: metrics || [], logs: logs || [] };
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
    }
  };
})();
    async addPerformanceMetric(metric) {
      const client = requireClient();

      const { data, error } = await client
        .from("performance_metrics")
        .insert(metric)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  };
})();
    const { data, error } = await client
      .from("performance_metrics")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("date", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  };

  // --- Workout Logs ---
  window.dataStore.addWorkoutLog = async function (log) {
    const client = requireClient();

    const { data, error } = await client
      .from("workout_logs")
      .insert(log)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  };

  window.dataStore.listWorkoutLogs = async function (athleteId, limit = 60) {
    const client = requireClient();

    const { data, error } = await client
      .from("workout_logs")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("date", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  };

  // Convenience: fetch both together (what you were trying to do)
  window.dataStore.listPerformanceAndLogs = async function (athleteId, limit = 60) {
    const [metrics, logs] = await Promise.all([
      window.dataStore.listPerformanceMetrics(athleteId, limit),
      window.dataStore.listWorkoutLogs(athleteId, limit)
    ]);

    return { metrics, logs };
  };
})();
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
