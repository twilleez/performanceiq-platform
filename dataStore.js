// dataStore.js — v2.3.0 (Offline-first + Cloud optional)
// - Local state is always the source of truth when offline.
// - If Supabase configured + signed in, we sync state to public.piq_user_state.
// - Uses zero imports; safe for GitHub Pages.

(function () {
  "use strict";
  if (window.dataStore) return;

  const LS_KEY = "piq_state_v2";
  const LS_SETTINGS = "piq_settings_v1";

  const nowIso = () => new Date().toISOString();
  const today = () => new Date().toISOString().slice(0, 10);

  function uid() {
    return "id_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }

  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch { return fallback; }
  }

  // ---------------------------
  // Default state shape
  // ---------------------------
  function defaultState() {
    return {
      version: "2.3.0",
      updated_at: nowIso(),

      // global mode + UI
      role: "coach",              // "coach" | "athlete"
      active_view: "dashboard",
      device: { w: 0, h: 0, dpr: 1, isMobile: false },

      // teams + sport engine
      teams: [
        { id: "team_default", name: "Default", sport: "basketball", seasonStart: "", seasonEnd: "", macroDefaults: { p:160, c:240, f:70, w:96 } }
      ],
      activeTeamId: "team_default",

      // roster + athlete selection
      athletes: [
        // {id, team_id, name, pos, ht, wt, sport}
      ],
      activeAthleteId: "",

      // logs
      trainingLogs: [
        // {id, athlete_id, team_id, date, minutes, rpe, type, notes, load}
      ],
      readinessLogs: [
        // {id, athlete_id, team_id, date, sleep, soreness, stress, energy, injury, readiness}
      ],
      nutritionLogs: [
        // {id, athlete_id, team_id, date, p,c,f,water, notes, adherence}
      ],

      // nutrition targets
      nutritionTargets: {
        // athlete_id: {p,c,f,water}
      },

      // workouts (interactive)
      workoutPrefs: {
        // athlete_id: { level: "standard"|"advanced", sport: "...", focus:"inseason|offseason", updated_at }
      },
      workoutPlans: {
        // athlete_id: { startDate, weeks, days:[{date, name, blocks:[...], plannedMinutes, plannedRpe}] }
      },

      // cloud metadata
      cloud: {
        enabled: false,
        status: "local",   // local | ready | authed | syncing | error
        lastSyncAt: "",
        lastError: ""
      }
    };
  }

  // ---------------------------
  // Settings
  // ---------------------------
  function getSettings() {
    return safeParse(localStorage.getItem(LS_SETTINGS) || "{}", {});
  }
  function setSettings(patch) {
    const cur = getSettings();
    const next = Object.assign({}, cur, patch, { updated_at: nowIso() });
    localStorage.setItem(LS_SETTINGS, JSON.stringify(next));
    return next;
  }

  // ---------------------------
  // Local state read/write
  // ---------------------------
  let _state = null;

  function loadState() {
    const saved = safeParse(localStorage.getItem(LS_KEY) || "null", null);
    _state = saved && typeof saved === "object" ? saved : defaultState();
    _state.updated_at = _state.updated_at || nowIso();
    return _state;
  }

  function getState() {
    if (!_state) loadState();
    return _state;
  }

  function saveState(next) {
    _state = next;
    _state.updated_at = nowIso();
    localStorage.setItem(LS_KEY, JSON.stringify(_state));
    window.dispatchEvent(new CustomEvent("piq:state"));
    // cloud write-back (debounced) if available
    cloudSchedulePush();
    return _state;
  }

  function patchState(patch) {
    const cur = getState();
    return saveState(Object.assign({}, cur, patch));
  }

  function wipeAll() {
    localStorage.removeItem(LS_KEY);
    // settings intentionally NOT wiped unless user wants it
    _state = defaultState();
    localStorage.setItem(LS_KEY, JSON.stringify(_state));
    window.dispatchEvent(new CustomEvent("piq:state"));
  }

  // ---------------------------
  // Helpers
  // ---------------------------
  function getActiveTeam(state) {
    const t = state.teams.find(x => x.id === state.activeTeamId);
    return t || state.teams[0];
  }

  function getAthlete(state, athleteId) {
    return state.athletes.find(a => a.id === athleteId) || null;
  }

  function ensureActiveAthlete(state) {
    if (state.activeAthleteId && getAthlete(state, state.activeAthleteId)) return state;
    const first = state.athletes.find(a => a.team_id === state.activeTeamId) || state.athletes[0];
    state.activeAthleteId = first ? first.id : "";
    return state;
  }

  // ---------------------------
  // Cloud (Supabase optional)
  // ---------------------------
  let _supabase = null;
  let _cloudPushTimer = null;

  function supabaseAvailable() {
    return !!(window.supabase && typeof window.supabase.createClient === "function");
  }

  function initSupabaseFromSettings() {
    const settings = getSettings();
    if (!supabaseAvailable()) return null;
    if (!settings.supabaseUrl || !settings.supabaseAnonKey) return null;

    try {
      _supabase = window.supabase.createClient(settings.supabaseUrl, settings.supabaseAnonKey);
      return _supabase;
    } catch (e) {
      console.warn("Supabase init failed", e);
      _supabase = null;
      return null;
    }
  }

  function getSupabase() {
    if (_supabase) return _supabase;
    return initSupabaseFromSettings();
  }

  async function cloudGetUser() {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getUser();
    return data && data.user ? data.user : null;
  }

  async function cloudSignIn(email, password) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function cloudSignUp(email, password) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async function cloudSignOut() {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
  }

  async function cloudPull() {
    const sb = getSupabase();
    if (!sb) return { ok:false, reason:"no-supabase" };

    const user = await cloudGetUser();
    if (!user) return { ok:false, reason:"no-user" };

    patchCloud({ status: "syncing", lastError: "" });

    const { data, error } = await sb
      .from("piq_user_state")
      .select("state, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      patchCloud({ status: "error", lastError: String(error.message || error) });
      return { ok:false, error };
    }

    if (!data || !data.state) {
      // no remote state yet
      patchCloud({ status: "authed", lastSyncAt: nowIso(), lastError: "" });
      return { ok:true, merged:false };
    }

    // merge rule: newest updated_at wins (simple, safe for MVP)
    const local = getState();
    const remoteUpdated = new Date(data.updated_at || 0).getTime();
    const localUpdated = new Date(local.updated_at || 0).getTime();

    if (remoteUpdated > localUpdated) {
      const merged = Object.assign({}, data.state);
      merged.updated_at = data.updated_at || nowIso();
      localStorage.setItem(LS_KEY, JSON.stringify(merged));
      _state = merged;
      window.dispatchEvent(new CustomEvent("piq:state"));
      patchCloud({ status: "authed", lastSyncAt: nowIso(), lastError: "" });
      return { ok:true, merged:true, direction:"remote->local" };
    }

    patchCloud({ status: "authed", lastSyncAt: nowIso(), lastError: "" });
    return { ok:true, merged:false, direction:"local-kept" };
  }

  async function cloudPush() {
    const sb = getSupabase();
    if (!sb) return { ok:false, reason:"no-supabase" };

    const user = await cloudGetUser();
    if (!user) return { ok:false, reason:"no-user" };

    patchCloud({ status: "syncing", lastError: "" });

    const st = getState();
    const payload = { user_id: user.id, state: st, updated_at: nowIso() };

    const { error } = await sb
      .from("piq_user_state")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      patchCloud({ status: "error", lastError: String(error.message || error) });
      return { ok:false, error };
    }

    patchCloud({ status: "authed", lastSyncAt: nowIso(), lastError: "" });
    return { ok:true };
  }

  function patchCloud(patch) {
    const st = getState();
    st.cloud = Object.assign({}, st.cloud, patch);
    localStorage.setItem(LS_KEY, JSON.stringify(st));
    _state = st;
    window.dispatchEvent(new CustomEvent("piq:state"));
  }

  function cloudSchedulePush() {
    const st = getState();
    const settings = getSettings();

    const sb = getSupabase();
    const configured = !!sb && !!settings.supabaseUrl && !!settings.supabaseAnonKey;
    if (!configured) {
      if (st.cloud.status !== "local") patchCloud({ status: "local" });
      return;
    }

    // only schedule if signed in (we don’t block offline usage)
    if (_cloudPushTimer) clearTimeout(_cloudPushTimer);
    _cloudPushTimer = setTimeout(async () => {
      try {
        const user = await cloudGetUser();
        if (!user) {
          patchCloud({ status: "ready" });
          return;
        }
        await cloudPush();
      } catch (e) {
        patchCloud({ status: "error", lastError: String(e.message || e) });
      }
    }, 900);
  }

  // ---------------------------
  // Public API
  // ---------------------------
  window.dataStore = {
    uid,
    today,
    nowIso,

    getSettings,
    setSettings,

    loadState,
    getState,
    saveState,
    patchState,
    wipeAll,

    getActiveTeam,
    getAthlete,
    ensureActiveAthlete,

    // cloud api
    getSupabase,
    initSupabaseFromSettings,
    cloudGetUser,
    cloudSignIn,
    cloudSignUp,
    cloudSignOut,
    cloudPull,
    cloudPush
  };
})();
