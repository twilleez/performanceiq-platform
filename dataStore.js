// dataStore.js (plain script)
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

  function isOnline() {
    // navigator.onLine is imperfect, but good enough for gating sync attempts.
    return typeof navigator !== "undefined" ? !!navigator.onLine : true;
  }

  // ---------- Whole app state sync (piq_state) ----------
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

  // Debounced push to reduce friction / network spam
  let _pushTimer = null;
  let _lastQueuedState = null;

  function schedulePush(stateObj, delayMs) {
    _lastQueuedState = stateObj;
    const ms = Number.isFinite(delayMs) ? delayMs : 1200;

    if (_pushTimer) clearTimeout(_pushTimer);
    _pushTimer = setTimeout(async () => {
      _pushTimer = null;
      if (!isOnline()) return;

      try {
        await pushState(_lastQueuedState);
      } catch (e) {
        // Don’t throw from background push; keep app usable offline.
        console.warn("[dataStore] schedulePush failed:", e?.message || e);
      }
    }, ms);
  }

  // Compare timestamps for merge decisions
  function getLocalUpdatedAtMs(stateObj) {
    const m = stateObj && stateObj.meta ? stateObj.meta : null;
    const v = m && Number.isFinite(m.updatedAtMs) ? m.updatedAtMs : 0;
    return v;
  }

  function getCloudUpdatedAtMs(cloudRow) {
    if (!cloudRow) return 0;
    const cloudState = cloudRow.state || null;

    // Prefer meta.updatedAtMs if present
    const msFromMeta =
      cloudState &&
      cloudState.meta &&
      Number.isFinite(cloudState.meta.updatedAtMs)
        ? cloudState.meta.updatedAtMs
        : 0;

    if (msFromMeta) return msFromMeta;

    // Fallback to updated_at column
    const iso = cloudRow.updated_at;
    const t = iso ? Date.parse(iso) : 0;
    return Number.isFinite(t) ? t : 0;
  }

  // One-call sync: pull, choose winner, push if local wins
  async function syncNow(localStateObj) {
    if (!isOnline()) {
      return { ok: false, reason: "offline" };
    }

    // If no client or no auth, treat as offline mode
    let cloudRow = null;
    try {
      cloudRow = await pullState();
    } catch (e) {
      return { ok: false, reason: "no-auth-or-no-client", error: e };
    }

    const cloudState = cloudRow ? cloudRow.state : null;

    const localMs = getLocalUpdatedAtMs(localStateObj);
    const cloudMs = getCloudUpdatedAtMs(cloudRow);

    // If cloud has newer state, return it to be applied by core.
    if (cloudState && cloudMs > localMs) {
      return { ok: true, action: "pulled-cloud", cloudState, cloudMs, localMs };
    }

    // Otherwise local is newer (or cloud empty) → push local
    try {
      await pushState(localStateObj);
      return { ok: true, action: "pushed-local", cloudMs, localMs };
    } catch (e) {
      return { ok: false, reason: "push-failed", error: e };
    }
  }

  // ---------- Performance metrics ----------
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

  // ---------- Workout logs ----------
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
    schedulePush,
    syncNow,
    isOnline,

    upsertPerformanceMetric,
    listPerformanceMetrics,
    upsertWorkoutLog,
    listWorkoutLogs
  };
})();
