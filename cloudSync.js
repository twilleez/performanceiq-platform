// cloudSync.js — v13.0.0 (UMD-safe Supabase v2)
// Cloud table expectation (recommended):
// public.piq_team_state (team_id uuid PK, state jsonb, updated_at timestamptz default now(), updated_by uuid default auth.uid())
// RLS should allow select/upsert only for team members via is_team_member(team_id).

(function () {
  "use strict";
  if (window.cloudSync) return;

  let client = null;
  let cfg = { url: "", anon: "" };

  const CLOUD_CFG_KEY = "piq_cloud_cfg_v13";

  function loadCfg() {
    try {
      const raw = localStorage.getItem(CLOUD_CFG_KEY);
      if (!raw) return { url: "", anon: "" };
      const j = JSON.parse(raw);
      return { url: String(j.url || ""), anon: String(j.anon || "") };
    } catch {
      return { url: "", anon: "" };
    }
  }

  function saveCfg(next) {
    cfg = { url: String(next.url || ""), anon: String(next.anon || "") };
    try { localStorage.setItem(CLOUD_CFG_KEY, JSON.stringify(cfg)); } catch {}
    return cfg;
  }

  function hasSupabase() {
    return typeof window.supabase !== "undefined" && typeof window.supabase.createClient === "function";
  }

  function isConfigured() {
    return !!(cfg.url && cfg.anon);
  }

  function initFromStorage() {
    cfg = loadCfg();
    if (!hasSupabase() || !isConfigured()) {
      client = null;
      return { ok: false, reason: !hasSupabase() ? "Supabase library missing" : "Not configured" };
    }
    try {
      client = window.supabase.createClient(cfg.url, cfg.anon, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      return { ok: true };
    } catch (e) {
      client = null;
      return { ok: false, reason: e?.message || String(e) };
    }
  }

  async function testConnection() {
    if (!client) return { ok: false, reason: "Cloud not initialized" };
    try {
      const { data, error } = await client.auth.getSession();
      if (error) return { ok: false, reason: error.message };
      return { ok: true, session: data?.session || null };
    } catch (e) {
      return { ok: false, reason: e?.message || String(e) };
    }
  }

  async function signUp(email, password) {
    if (!client) return { ok: false, reason: "Cloud not initialized" };
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) return { ok: false, reason: error.message };
    return { ok: true, data };
  }

  async function signIn(email, password) {
    if (!client) return { ok: false, reason: "Cloud not initialized" };
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, reason: error.message };
    return { ok: true, data };
  }

  async function signOut() {
    if (!client) return { ok: false, reason: "Cloud not initialized" };
    const { error } = await client.auth.signOut();
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  }

  async function getSession() {
    if (!client) return { ok: false, session: null, reason: "Cloud not initialized" };
    const { data, error } = await client.auth.getSession();
    if (error) return { ok: false, session: null, reason: error.message };
    return { ok: true, session: data?.session || null };
  }

  function onAuthChange(cb) {
    if (!client) return () => {};
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      try { cb(session || null); } catch {}
    });
    return () => { try { data?.subscription?.unsubscribe?.(); } catch {} };
  }

  async function pullTeamState(teamId) {
    if (!client) return { ok: false, reason: "Cloud not initialized" };
    const id = String(teamId || "");
    if (!id) return { ok: false, reason: "Missing teamId" };

    const { data, error } = await client
      .from("piq_team_state")
      .select("team_id, state, updated_at")
      .eq("team_id", id)
      .maybeSingle();

    if (error) return { ok: false, reason: error.message };
    return { ok: true, row: data || null };
  }

  async function pushTeamState(teamId, stateObj) {
    if (!client) return { ok: false, reason: "Cloud not initialized" };
    const id = String(teamId || "");
    if (!id) return { ok: false, reason: "Missing teamId" };

    const payload = {
      team_id: id,
      state: stateObj
      // updated_at/updated_by recommended as server defaults/trigger
    };

    const { data, error } = await client
      .from("piq_team_state")
      .upsert(payload, { onConflict: "team_id" })
      .select("team_id, updated_at")
      .single();

    if (error) return { ok: false, reason: error.message };
    return { ok: true, data };
  }

  window.cloudSync = {
    loadCfg,
    saveCfg,
    initFromStorage,
    testConnection,
    signUp,
    signIn,
    signOut,
    getSession,
    onAuthChange,
    pullTeamState,
    pushTeamState,
    isReady: () => !!client,
    isConfigured: () => isConfigured(),
    getClient: () => client
  };
})();
