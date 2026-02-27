// dataStore.js — v2.1.0 (offline-first + clear save/sync meta, safe migrations)
(function () {
  "use strict";
  if (window.dataStore) return;

  const KEY = "piq_local_state_v2";
  const VERSION = "2.1.0";

  function nowISO() { return new Date().toISOString(); }

  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch { return fallback; }
  }

  function isObj(x) {
    return !!x && typeof x === "object" && !Array.isArray(x);
  }

  // ---- Base schema (non-breaking additive)
  function baseState() {
    const t = nowISO();
    return {
      meta: {
        version: VERSION,
        created_at: t,
        updated_at: t,

        sync: {
          dirty: false,
          change_count: 0,
          last_local_save_at: t,

          cloud_enabled: false,
          cloud_ready: false,
          cloud_signed_in: false,

          last_push_at: null,
          last_pull_at: null,
          last_cloud_error: null,

          last_cloud_op: null,        // "push" | "pull" | "test" | null
          last_cloud_op_status: null  // "ok" | "fail" | null
        }
      },

      profile: {
        role: "coach",
        sport: "basketball",
        weight_lbs: 160,
        goal: "maintain",   // "maintain" | "gain" | "cut"
        activity: "med"     // "low" | "med" | "high"
      },

      team: {
        active_team_id: null,
        teams: []
      },

      logs: [],
      workouts: [],
      nutrition: []
    };
  }

  // ---- Normalization / migration
  function normalizeState(input) {
    const base = baseState();

    if (!isObj(input)) return base;

    // Merge top-level, then deep-merge known nested objects
    const out = Object.assign({}, base, input);

    out.meta    = Object.assign({}, base.meta,    isObj(input.meta)    ? input.meta    : {});
    out.profile = Object.assign({}, base.profile, isObj(input.profile) ? input.profile : {});
    out.team    = Object.assign({}, base.team,    isObj(input.team)    ? input.team    : {});

    // Enforce array types
    out.team.teams = Array.isArray(out.team.teams) ? out.team.teams : [];
    out.logs       = Array.isArray(out.logs)       ? out.logs       : [];
    out.workouts   = Array.isArray(out.workouts)   ? out.workouts   : [];
    out.nutrition  = Array.isArray(out.nutrition)  ? out.nutrition  : [];

    // Deep-merge sync — always on top of base defaults
    const inSync = isObj(input.meta?.sync) ? input.meta.sync : {};
    out.meta.sync = Object.assign({}, base.meta.sync, inSync);

    // Sanitize change_count — must always be a non-negative integer
    out.meta.sync.change_count = Math.max(0, parseInt(out.meta.sync.change_count, 10) || 0);

    // Guarantee timestamps exist
    out.meta.created_at = out.meta.created_at || base.meta.created_at;
    out.meta.updated_at = out.meta.updated_at || base.meta.updated_at;
    out.meta.sync.last_local_save_at = out.meta.sync.last_local_save_at || out.meta.updated_at;

    // Always stamp current version (preserves older fields)
    out.meta.version = VERSION;

    return out;
  }

  // ---- Storage helpers
  function readStorage() {
    try { return localStorage.getItem(KEY); } catch { return null; }
  }

  function writeStorage(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      // localStorage can throw in private browsing or when storage is full
      console.warn("[dataStore] Could not write to localStorage:", e);
      return false;
    }
  }

  // ---- Public API
  function load() {
    const raw = readStorage();
    if (!raw) return baseState();
    return normalizeState(safeParse(raw, null));
  }

  function save(state) {
    const normalized = normalizeState(state);
    const t = nowISO();

    normalized.meta.updated_at = t;
    normalized.meta.sync.last_local_save_at = t;
    normalized.meta.sync.dirty = false;
    // change_count is already sanitized by normalizeState

    return writeStorage(normalized);
  }

  function markDirty(state, reason) {
    const normalized = normalizeState(state);
    normalized.meta.sync.dirty = true;
    normalized.meta.sync.change_count += 1;

    // Clear stale cloud error on fresh user edits
    if (reason === "edit") {
      normalized.meta.sync.last_cloud_error = null;
    }

    return normalized;
  }

  function setCloudStatus(state, patch) {
    if (!isObj(patch)) return normalizeState(state);
    const normalized = normalizeState(state);
    normalized.meta.sync = Object.assign({}, normalized.meta.sync, patch);
    normalized.meta.updated_at = nowISO();
    // Caller is responsible for persisting
    return normalized;
  }

  function noteCloudOp(state, op, ok, errMsg) {
    const normalized = normalizeState(state);
    const t = nowISO();

    normalized.meta.sync.last_cloud_op = op || null;
    normalized.meta.sync.last_cloud_op_status = ok ? "ok" : "fail";
    normalized.meta.sync.last_cloud_error = ok
      ? null
      : String(errMsg || "Cloud operation failed");

    if (op === "push") normalized.meta.sync.last_push_at = ok ? t : normalized.meta.sync.last_push_at;
    if (op === "pull") normalized.meta.sync.last_pull_at = ok ? t : normalized.meta.sync.last_pull_at;

    normalized.meta.updated_at = t;
    return normalized;
  }

  // ---- Export / Import
  function exportJSON() {
    return JSON.stringify(load(), null, 2);
  }

  function importJSON(text) {
    if (typeof text !== "string" || !text.trim()) throw new Error("Invalid file: empty input");

    const parsed = safeParse(text, null);
    if (!isObj(parsed)) throw new Error("Invalid file: expected a JSON object");

    const normalized = normalizeState(parsed);
    const t = nowISO();

    normalized.meta.created_at = normalized.meta.created_at || t;
    normalized.meta.updated_at = t;
    normalized.meta.sync.dirty = false;
    normalized.meta.sync.last_local_save_at = t;

    const ok = writeStorage(normalized);
    if (!ok) throw new Error("Could not save imported data (storage may be full or unavailable)");
    return true;
  }

  function resetAll() {
    const fresh = baseState();
    writeStorage(fresh);
    return fresh;
  }

  window.dataStore = {
    load,
    save,

    // optional helpers (safe to ignore if unused)
    markDirty,
    setCloudStatus,
    noteCloudOp,

    exportJSON,
    importJSON,
    resetAll
  };
})();
