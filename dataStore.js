// datastore.js
(function () {
  "use strict";

  // Tables used (you must create these in Supabase if you enable sync):
  // - piq_states
  // - piq_workout_logs
  // - piq_performance_metrics

  function sb() {
    return window.supabaseClient || null;
  }

  async function requireUser() {
    if (!window.PIQ_AuthStore) return null;
    return await window.PIQ_AuthStore.getUser();
  }

  const dataStore = {
    async pushState(stateObj) {
      const client = sb();
      if (!client) throw new Error("Supabase not configured.");
      const user = await requireUser();
      if (!user) throw new Error("Not signed in.");

      const payload = {
        user_id: user.id,
        state: stateObj,
        updated_at: new Date().toISOString()
      };

      // Upsert by user_id
      const { error } = await client
        .from("piq_states")
        .upsert(payload, { onConflict: "user_id" });

      if (error) throw error;
      return true;
    },

    async pullState() {
      const client = sb();
      if (!client) return null;
      const user = await requireUser();
      if (!user) return null;

      const { data, error } = await client
        .from("piq_states")
        .select("state, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data?.state) return null;

      return { state: data.state, updated_at: data.updated_at };
    },

    async upsertWorkoutLog(row) {
      const client = sb();
      if (!client) throw new Error("Supabase not configured.");
      const user = await requireUser();
      if (!user) throw new Error("Not signed in.");
      if (!row || !row.date) throw new Error("Row.date required.");

      const payload = { ...row, user_id: user.id, updated_at: new Date().toISOString() };

      // Unique constraint should be (user_id, date)
      const { error } = await client
        .from("piq_workout_logs")
        .upsert(payload, { onConflict: "user_id,date" });

      if (error) throw error;
      return true;
    },

    async upsertPerformanceMetric(row) {
      const client = sb();
      if (!client) throw new Error("Supabase not configured.");
      const user = await requireUser();
      if (!user) throw new Error("Not signed in.");
      if (!row || !row.date) throw new Error("Row.date required.");

      const payload = { ...row, user_id: user.id, updated_at: new Date().toISOString() };

      // Unique constraint should be (user_id, date)
      const { error } = await client
        .from("piq_performance_metrics")
        .upsert(payload, { onConflict: "user_id,date" });

      if (error) throw error;
      return true;
    }
  };

  window.dataStore = dataStore;
})();
