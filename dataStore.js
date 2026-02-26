// dataStore.js — v2.0.0 (offline-first + optional Supabase sync)
// Keeps app running with zero cloud. If cloud configured, uses Supabase client.

(function () {
  "use strict";
  if (window.dataStore) return;

  const LS_KEY = "piq_local_state_v2";

  const defaultState = () => ({
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activeTeamId: "local-default",
      mode: "coach", // coach | athlete
      device: { isMobile: false, w: 0, h: 0, dpr: 1 }
    },
    cloud: {
      url: "",
      anon: "",
      enabled: false
    },
    team: {
      teams: [{ id: "local-default", name: "Default", sport: "basketball" }],
      members: [] // cloud-side truth; kept for UI summary
    },
    athleteProfile: {
      name: "",
      sport: "basketball",
      primary_focus: "speed",
      secondary_focus: "mobility",
      days_per_week: 4,
      level: "high_school"
    },
    logs: {
      workout_logs: [],
      nutrition: [],
      readiness: [],
      performance_metrics: []
    }
  });

  function nowIso() { return new Date().toISOString(); }

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      // Merge forward-compatible
      return deepMerge(defaultState(), parsed);
    } catch (e) {
      return defaultState();
    }
  }

  function save(state) {
    state.meta.updatedAt = nowIso();
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    return state;
  }

  function deepMerge(base, patch) {
    if (!patch || typeof patch !== "object") return base;
    const out = Array.isArray(base) ? base.slice() : { ...base };
    for (const k of Object.keys(patch)) {
      const bv = base?.[k];
      const pv = patch[k];
      if (pv && typeof pv === "object" && !Array.isArray(pv) && bv && typeof bv === "object" && !Array.isArray(bv)) {
        out[k] = deepMerge(bv, pv);
      } else {
        out[k] = pv;
      }
    }
    return out;
  }

  // Cloud (optional)
  function hasSupabaseLib() {
    return typeof window.supabase !== "undefined" && typeof window.supabase.createClient === "function";
  }

  function getCloudConfig(state) {
    const url = String(state.cloud.url || "").trim();
    const anon = String(state.cloud.anon || "").trim();
    const enabled = !!state.cloud.enabled;
    if (!enabled) return null;
    if (!url || !anon) return null;
    if (!hasSupabaseLib()) return null;
    return { url, anon };
  }

  function ensureSupabaseClient(state) {
    const cfg = getCloudConfig(state);
    if (!cfg) return null;
    try {
      if (!window.supabaseClient || window.supabaseClient.__piq_url !== cfg.url) {
        const client = window.supabase.createClient(cfg.url, cfg.anon);
        client.__piq_url = cfg.url;
        window.supabaseClient = client;
      }
      return window.supabaseClient;
    } catch (e) {
      return null;
    }
  }

  // Public API
  const store = {
    state: load(),

    getState() { return this.state; },
    setState(next) { this.state = save(next); return this.state; },

    update(fn) {
      const next = fn(this.getState());
      return this.setState(next);
    },

    setDevice(device) {
      return this.update(s => {
        s.meta.device = { ...s.meta.device, ...device };
        return s;
      });
    },

    setMode(mode) {
      return this.update(s => {
        s.meta.mode = (mode === "athlete") ? "athlete" : "coach";
        return s;
      });
    },

    setActiveTeam(teamId) {
      return this.update(s => {
        s.meta.activeTeamId = teamId || "local-default";
        return s;
      });
    },

    setAthleteProfile(profilePatch) {
      return this.update(s => {
        s.athleteProfile = { ...s.athleteProfile, ...profilePatch };
        return s;
      });
    },

    addLog(kind, row) {
      return this.update(s => {
        const arr = s.logs[kind] || (s.logs[kind] = []);
        arr.unshift({ ...row });
        return s;
      });
    },

    // Cloud helpers
    cloud: {
      ensure() { return ensureSupabaseClient(store.getState()); },
      enabled() { return !!getCloudConfig(store.getState()); },
      config() { return getCloudConfig(store.getState()); }
    }
  };

  window.dataStore = store;
})();
