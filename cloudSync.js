// cloudSync.js — v13.2.0
// Safe cloud layer: validates Supabase URL/anon; prevents hitting GitHub Pages.
// No console logging. Returns {ok:false, reason} for UI display.

(function () {
  "use strict";

  if (window.cloudSync) return;

  const CFG_KEY = "piq_cloud_cfg_v1";

  function loadCfg() {
    try {
      const raw = localStorage.getItem(CFG_KEY);
      if (!raw) return { url: "", anon: "" };
      const parsed = JSON.parse(raw);
      return {
        url: String(parsed.url || ""),
        anon: String(parsed.anon || "")
      };
    } catch {
      return { url: "", anon: "" };
    }
  }

  function saveCfg(cfg) {
    const url = String(cfg?.url || "").trim();
    const anon = String(cfg?.anon || "").trim();
    localStorage.setItem(CFG_KEY, JSON.stringify({ url, anon }));
    return { ok: true };
  }

  function validateSupabaseUrl(url) {
    if (!url) return { ok: false, reason: "Supabase URL is empty." };
    let u;
    try { u = new URL(url); } catch { return { ok: false, reason: "Supabase URL is not a valid URL." }; }
    if (u.protocol !== "https:") return { ok: false, reason: "Supabase URL must start with https://." };

    const host = (u.hostname || "").toLowerCase();

    // HARD BLOCK: prevent GitHub Pages / non-supabase hosts from being used (fixes 405)
    if (host.includes("github.io") || host.includes("githubusercontent.com")) {
      return { ok: false, reason: "Invalid Supabase URL (looks like GitHub Pages). Use https://xxxx.supabase.co" };
    }

    // Most Supabase projects use *.supabase.co
    if (!host.endsWith(".supabase.co")) {
      return { ok: false, reason: "Supabase URL must end with .supabase.co" };
    }

    // Normalize: no trailing slash
    const normalized = u.origin;
    return { ok: true, normalized };
  }

  function validateAnonKey(anon) {
    if (!anon) return { ok: false, reason: "Anon key is empty." };
    // very light validation (avoid rejecting valid keys)
    if (anon.length < 40) return { ok: false, reason: "Anon key looks too short." };
    return { ok: true };
  }

  let client = null;
  let authListenerAttached = false;
  let authCallbacks = [];

  function isConfigured() {
    const cfg = loadCfg();
    const u = validateSupabaseUrl(cfg.url);
    const k = validateAnonKey(cfg.anon);
    return u.ok && k.ok;
  }

  function isReady() {
    return !!client;
  }

  function initFromStorage() {
    const cfg = loadCfg();
    const u = validateSupabaseUrl(cfg.url);
    const k = validateAnonKey(cfg.anon);
    if (!u.ok) return { ok: false, reason: u.reason };
    if (!k.ok) return { ok: false, reason: k.reason };

    // supabase-js loaded?
    if (!window.supabase?.createClient) {
      return { ok: false, reason: "Supabase SDK not loaded." };
    }

    // Create client
    client = window.supabase.createClient(u.normalized, cfg.anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    if (!authListenerAttached) {
      authListenerAttached = true;
      client.auth.onAuthStateChange((_event, session) => {
        authCallbacks.forEach(fn => {
          try { fn(session); } catch {}
        });
      });
    }

    return { ok: true };
  }

  async function testConnection() {
    if (!isConfigured()) return { ok: false, reason: "Cloud not configured (URL/Key)." };
    if (!client) {
      const init = initFromStorage();
      if (!init.ok) return init;
    }
    // lightweight call: check auth session endpoint works
    try {
      const res = await client.auth.getSession();
      if (res?.error) return { ok: false, reason: res.error.message || "Auth session error." };
      return { ok: true };
    } catch {
      return { ok: false, reason: "Network error contacting Supabase." };
    }
  }

  async function signUp(email, password) {
    if (!client) {
      const init = initFromStorage();
      if (!init.ok) return init;
    }
    try {
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) return { ok: false, reason: error.message || "Sign up failed." };
      return { ok: true, data };
    } catch {
      return { ok: false, reason: "Sign up request failed." };
    }
  }

  async function signIn(email, password) {
    if (!client) {
      const init = initFromStorage();
      if (!init.ok) return init;
    }
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, reason: error.message || "Sign in failed." };
      return { ok: true, data };
    } catch {
      return { ok: false, reason: "Sign in request failed." };
    }
  }

  async function signOut() {
    if (!client) return { ok: true };
    try {
      const { error } = await client.auth.signOut();
      if (error) return { ok: false, reason: error.message || "Sign out failed." };
      return { ok: true };
    } catch {
      return { ok: false, reason: "Sign out request failed." };
    }
  }

  async function getSession() {
    if (!client) {
      const init = initFromStorage();
      if (!init.ok) return { ok: false, reason: init.reason };
    }
    try {
      const { data, error } = await client.auth.getSession();
      if (error) return { ok: false, reason: error.message || "Session error." };
      return { ok: true, session: data?.session || null };
    } catch {
      return { ok: false, reason: "Session request failed." };
    }
  }

  function onAuthChange(cb) {
    if (typeof cb !== "function") return;
    authCallbacks.push(cb);
  }

  // Cloud state per team stored in table: public.piq_team_state (team_id uuid PK, state jsonb, updated_at timestamptz)
  async function pullTeamState(teamId) {
    if (!client) {
      const init = initFromStorage();
      if (!init.ok) return init;
    }
    try {
      const { data, error } = await client
        .from("piq_team_state")
        .select("team_id,state,updated_at")
        .eq("team_id", teamId)
        .maybeSingle();

      if (error) return { ok: false, reason: error.message || "Pull failed." };
      return { ok: true, row: data || null };
    } catch {
      return { ok: false, reason: "Pull request failed." };
    }
  }

  async function pushTeamState(teamId, stateObj) {
    if (!client) {
      const init = initFromStorage();
      if (!init.ok) return init;
    }
    try {
      const payload = { team_id: teamId, state: stateObj };
      const { error } = await client
        .from("piq_team_state")
        .upsert(payload, { onConflict: "team_id" });

      if (error) return { ok: false, reason: error.message || "Push failed." };
      return { ok: true };
    } catch {
      return { ok: false, reason: "Push request failed." };
    }
  }

  window.cloudSync = {
    loadCfg,
    saveCfg,
    validateSupabaseUrl,
    validateAnonKey,
    isConfigured,
    isReady,
    initFromStorage,
    testConnection,
    signUp,
    signIn,
    signOut,
    getSession,
    onAuthChange,
    pullTeamState,
    pushTeamState
  };
})();
