// dataStore.js — v2.0.0 (Phase 3: Cloud + Accounts + Teams + Sync)
// Offline-first safe: if no Supabase => uses localStorage only.
//
// Expected Supabase tables (public):
// - teams (id uuid PK, name text, owner_id uuid, join_code text UNIQUE, created_at timestamptz)
// - team_members (id uuid PK, team_id uuid, user_id uuid, role text, created_at timestamptz)
// - piq_user_state (id uuid PK, user_id uuid, team_id uuid, state jsonb, updated_at timestamptz)
//
// Suggested unique:
// - piq_user_state unique (user_id, team_id)
//
// Optional RPC (for join via code without being a member yet):
// - public.get_team_by_join_code(code text) returns teams

(function () {
  "use strict";
  if (window.dataStore) return;

  const LS_KEY = "piq_state_v300"; // new key for Phase 3 state wrapper
  const LS_LOCAL_FALLBACK = "piq_state_v280"; // we import previous state if exists

  const uid = (p="id") => `${p}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  const nowISO = () => new Date().toISOString();

  function safeParse(raw) {
    try { return JSON.parse(raw); } catch { return null; }
  }

  function getSb() {
    return window.supabaseClient?.getClient?.() || null;
  }

  async function getUser() {
    return window.authPIQ?.getUser ? await window.authPIQ.getUser() : null;
  }

  function defaultCloudWrapper() {
    return {
      meta: { version: "3.0.0", updatedAt: Date.now(), lastSyncAt: 0 },
      cloud: { enabled: false, userId: null, teamId: null, role: "coach", status: "local-only" },
      // The actual app state (compatible with core v2.8+)
      app: null
    };
  }

  function migrateFrom280IfNeeded(wrapper) {
    if (wrapper.app) return wrapper;

    const oldRaw = localStorage.getItem(LS_LOCAL_FALLBACK);
    const oldState = oldRaw ? safeParse(oldRaw) : null;
    if (oldState && typeof oldState === "object") {
      wrapper.app = oldState;
      wrapper.meta.updatedAt = Date.now();
    } else {
      // if nothing existed, core will create defaults
      wrapper.app = null;
    }
    return wrapper;
  }

  function loadWrapper() {
    const raw = localStorage.getItem(LS_KEY);
    let w = raw ? safeParse(raw) : null;
    if (!w || typeof w !== "object") w = defaultCloudWrapper();
    w = migrateFrom280IfNeeded(w);
    return w;
  }

  function saveWrapper(w) {
    w.meta.updatedAt = Date.now();
    localStorage.setItem(LS_KEY, JSON.stringify(w));
  }

  // ---------------------------
  // Teams + sync helpers
  // ---------------------------
  async function ensureDefaultTeam(sb, userId) {
    // Try to find a membership; else create default team.
    const { data: mem, error: memErr } = await sb
      .from("team_members")
      .select("team_id, role, teams(name)")
      .eq("user_id", userId)
      .limit(1);

    if (!memErr && mem && mem.length) {
      const row = mem[0];
      return { teamId: row.team_id, role: row.role || "coach", teamName: row?.teams?.name || "Team" };
    }

    // Create a new team
    const join_code = Math.random().toString(36).slice(2, 10).toUpperCase();
    const { data: team, error: tErr } = await sb
      .from("teams")
      .insert([{ name: "My Team", owner_id: userId, join_code }])
      .select("id, name")
      .single();
    if (tErr) throw tErr;

    const { error: mErr } = await sb
      .from("team_members")
      .insert([{ team_id: team.id, user_id: userId, role: "coach" }]);
    if (mErr) throw mErr;

    return { teamId: team.id, role: "coach", teamName: team.name };
  }

  async function listTeams() {
    const sb = getSb();
    const user = await getUser();
    if (!sb || !user) return [];

    const { data, error } = await sb
      .from("team_members")
      .select("team_id, role, teams(id, name, join_code)")
      .eq("user_id", user.id);

    if (error) return [];
    return (data || []).map(r => ({
      teamId: r.team_id,
      role: r.role || "coach",
      name: r?.teams?.name || "Team",
      joinCode: r?.teams?.join_code || ""
    }));
  }

  async function createTeam(name) {
    const sb = getSb();
    const user = await getUser();
    if (!sb || !user) throw new Error("Not signed in.");

    const join_code = Math.random().toString(36).slice(2, 10).toUpperCase();
    const { data: team, error: tErr } = await sb
      .from("teams")
      .insert([{ name: name || "New Team", owner_id: user.id, join_code }])
      .select("id,name,join_code")
      .single();
    if (tErr) throw tErr;

    const { error: mErr } = await sb
      .from("team_members")
      .insert([{ team_id: team.id, user_id: user.id, role: "coach" }]);
    if (mErr) throw mErr;

    return { teamId: team.id, name: team.name, joinCode: team.join_code, role: "coach" };
  }

  async function joinTeamByCode(code) {
    const sb = getSb();
    const user = await getUser();
    if (!sb || !user) throw new Error("Not signed in.");
    const join = String(code || "").trim().toUpperCase();
    if (!join) throw new Error("Enter a join code.");

    // Option A: direct select teams by join_code (requires RLS to allow)
    let team = null;
    const direct = await sb.from("teams").select("id,name,join_code").eq("join_code", join).maybeSingle();
    if (!direct.error && direct.data) team = direct.data;

    // Option B (preferred): RPC
    if (!team) {
      const rpc = await sb.rpc("get_team_by_join_code", { code: join });
      if (!rpc.error && rpc.data && rpc.data.length) team = rpc.data[0];
    }

    if (!team) throw new Error("Join code not found.");

    // Add membership
    const { error: mErr } = await sb
      .from("team_members")
      .insert([{ team_id: team.id, user_id: user.id, role: "athlete" }]);
    if (mErr) throw mErr;

    return { teamId: team.id, name: team.name, joinCode: team.join_code, role: "athlete" };
  }

  // ---------------------------
  // Cloud state (push/pull)
  // ---------------------------
  async function pullCloudState(teamId) {
    const sb = getSb();
    const user = await getUser();
    if (!sb || !user || !teamId) return null;

    const { data, error } = await sb
      .from("piq_user_state")
      .select("state, updated_at")
      .eq("user_id", user.id)
      .eq("team_id", teamId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    if (!data?.state) return null;
    return { state: data.state, updatedAt: Date.parse(data.updated_at || nowISO()) || Date.now() };
  }

  async function pushCloudState(teamId, appState) {
    const sb = getSb();
    const user = await getUser();
    if (!sb || !user || !teamId) return { ok: false, reason: "no-cloud" };

    const payload = {
      user_id: user.id,
      team_id: teamId,
      state: appState,
      updated_at: new Date().toISOString()
    };

    // Upsert on (user_id, team_id) unique
    const { error } = await sb
      .from("piq_user_state")
      .upsert(payload, { onConflict: "user_id,team_id" });

    if (error) return { ok: false, reason: error.message || "push-failed" };
    return { ok: true };
  }

  // ---------------------------
  // Public API
  // ---------------------------
  let wrapper = loadWrapper();

  function getAppState() {
    return wrapper.app;
  }

  function setAppState(appState) {
    wrapper.app = appState;
    wrapper.meta.updatedAt = Date.now();
    saveWrapper(wrapper);
  }

  function getCloudInfo() {
    return wrapper.cloud;
  }

  async function bootstrapCloud() {
    // Called after auth changes or on app boot
    const sb = getSb();
    const user = await getUser();

    if (!sb || !user) {
      wrapper.cloud.enabled = false;
      wrapper.cloud.userId = null;
      wrapper.cloud.teamId = null;
      wrapper.cloud.status = "local-only";
      saveWrapper(wrapper);
      return wrapper.cloud;
    }

    // Ensure team exists / membership exists
    try {
      const t = await ensureDefaultTeam(sb, user.id);
      wrapper.cloud.enabled = true;
      wrapper.cloud.userId = user.id;
      wrapper.cloud.teamId = t.teamId;
      wrapper.cloud.role = t.role || "coach";
      wrapper.cloud.status = "signed-in";
      saveWrapper(wrapper);

      // Pull remote state (if newer)
      const remote = await pullCloudState(wrapper.cloud.teamId);
      if (remote && remote.state) {
        // If local is missing OR remote is newer than local wrapper meta
        const localUpdated = wrapper.meta.updatedAt || 0;
        if (!wrapper.app || remote.updatedAt > localUpdated) {
          wrapper.app = remote.state;
          wrapper.meta.updatedAt = remote.updatedAt;
          wrapper.meta.lastSyncAt = Date.now();
          wrapper.cloud.status = "pulled";
          saveWrapper(wrapper);
        }
      }

      return wrapper.cloud;
    } catch (e) {
      wrapper.cloud.enabled = false;
      wrapper.cloud.status = "cloud-error";
      saveWrapper(wrapper);
      return wrapper.cloud;
    }
  }

  async function switchTeam(teamId) {
    wrapper.cloud.teamId = teamId;
    saveWrapper(wrapper);

    // pull state for that team
    const remote = await pullCloudState(teamId);
    if (remote?.state) {
      wrapper.app = remote.state;
      wrapper.meta.updatedAt = remote.updatedAt;
      wrapper.meta.lastSyncAt = Date.now();
      wrapper.cloud.status = "pulled";
      saveWrapper(wrapper);
      return true;
    }
    // If none exists, keep local and push later
    return false;
  }

  // debounced push
  let pushTimer = null;
  function schedulePush(appState, ms = 800) {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      pushTimer = null;
      if (!wrapper.cloud.enabled || !wrapper.cloud.teamId) return;

      const res = await pushCloudState(wrapper.cloud.teamId, appState);
      wrapper.meta.lastSyncAt = Date.now();
      wrapper.cloud.status = res.ok ? "synced" : ("sync-failed");
      saveWrapper(wrapper);
      window.dispatchEvent(new Event("piq-cloud-changed"));
    }, ms);
  }

  window.dataStore = {
    // local wrapper
    loadWrapper: () => (wrapper = loadWrapper()),
    saveWrapper: () => saveWrapper(wrapper),
    getAppState,
    setAppState,
    getCloudInfo,

    // cloud lifecycle
    bootstrapCloud,
    schedulePush,
    pullCloudState,
    pushCloudState,

    // teams
    listTeams,
    createTeam,
    joinTeamByCode,
    switchTeam
  };
})();
