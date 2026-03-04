// dataStore.js — v3.0.0  (PerformanceIQ — fully compatible with core.js v4)
(function () {
  "use strict";
  if (window.dataStore) return;

  const KEY     = "piq_v3";          // new key — clean break from old schema
  const KEY_OLD = "piq_local_state_v2"; // migrate from old key if present
  const VERSION = "3.0.0";

  function nowISO() { return new Date().toISOString(); }
  function safeParse(json, fb) { try { return JSON.parse(json); } catch { return fb; } }
  function isObj(x)  { return !!x && typeof x === "object" && !Array.isArray(x); }
  function arr(v)    { return Array.isArray(v) ? v : []; }
  function obj(v)    { return isObj(v) ? v : {}; }

  function baseState() {
    return {
      meta:          { version:VERSION, updated_at:nowISO() },
      profile: {
        role:                 "coach",
        sport:                "basketball",
        preferred_session_type: "practice",
        injuries:             [],
        weight_lbs:           160,
        goal:                 "maintain",
        activity:             "med",
        level:                "intermediate",   // beginner | intermediate | advanced
        equipmentProfile:     "barbell",        // key into EQUIPMENT_PROFILES
        equipment:            [],               // individual equip checkboxes (Wave2)
      },
      team:          { teams:[], active_team_id:null },
      sessions:      [],                        // unified session log
      periodization: { plan:null, updated_at:null },
      insights:      { weekly:[], updated_at:null },
      ui:            { view:"home", todaySession:null, mealPlan:null },
      prs:           {},
      badges:        {},
      messaging:     { threads:{}, unread:0 },
      health:        { connected:false, source:"", latestHR:null, dailySteps:null, sleepHrs:null, hrv:null, lastSync:null, history:[] },
      parentPortal:  { tokens:{} },
      nutrition:     { log:[], scans:[] },
      reportLinks:   { links:[] },
      adAnalytics:   { seasons:{} },
      wearable:      { platform:"", connected:false, deviceName:"", currentHR:null, sessionHR:[], lastSync:null },
    };
  }

  // Merge saved data onto baseState so new keys always exist
  function normalize(saved) {
    const base  = baseState();
    if (!isObj(saved)) return base;

    const s = Object.assign({}, base, saved);

    // Deep-merge objects that need it
    s.meta          = Object.assign({}, base.meta,          obj(saved.meta));
    s.profile       = Object.assign({}, base.profile,       obj(saved.profile));
    s.team          = Object.assign({}, base.team,          obj(saved.team));
    s.periodization = Object.assign({}, base.periodization, obj(saved.periodization));
    s.insights      = Object.assign({}, base.insights,      obj(saved.insights));
    s.ui            = Object.assign({}, base.ui,            obj(saved.ui));
    s.health        = Object.assign({}, base.health,        obj(saved.health));
    s.parentPortal  = Object.assign({}, base.parentPortal,  obj(saved.parentPortal));
    s.messaging     = Object.assign({}, base.messaging,     obj(saved.messaging));
    s.wearable      = Object.assign({}, base.wearable,      obj(saved.wearable));
    s.adAnalytics   = Object.assign({}, base.adAnalytics,   obj(saved.adAnalytics));
    s.nutrition     = Object.assign({}, base.nutrition,     obj(saved.nutrition));
    s.reportLinks   = Object.assign({}, base.reportLinks,   obj(saved.reportLinks));
    s.prs           = obj(saved.prs);
    s.badges        = obj(saved.badges);

    // Arrays
    s.team.teams       = arr(s.team.teams);
    s.sessions         = arr(saved.sessions || saved.training_sessions); // migrate old key
    s.health.history   = arr(s.health.history);
    s.wearable.sessionHR = arr(s.wearable.sessionHR);
    s.nutrition.log    = arr(s.nutrition?.log);
    s.nutrition.scans  = arr(s.nutrition?.scans);
    s.reportLinks.links = arr(s.reportLinks?.links);
    s.profile.injuries  = arr(s.profile.injuries);
    s.profile.equipment = arr(s.profile.equipment);
    s.insights.weekly   = arr(s.insights.weekly);

    // Stamp version
    s.meta.version    = VERSION;
    s.meta.updated_at = s.meta.updated_at || nowISO();

    return s;
  }

  function readRaw() {
    try {
      return localStorage.getItem(KEY)
          || localStorage.getItem(KEY_OLD)   // migrate old key
          || null;
    } catch { return null; }
  }

  function writeRaw(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn("[dataStore] write failed:", e);
      return false;
    }
  }

  function load() {
    const raw = readRaw();
    if (!raw) return baseState();
    return normalize(safeParse(raw, null));
  }

  function save(state) {
    const s = normalize(state);
    s.meta.updated_at = nowISO();
    return writeRaw(s);
  }

  function exportJSON() {
    return JSON.stringify(load(), null, 2);
  }

  function importJSON(text) {
    if (typeof text !== "string" || !text.trim()) throw new Error("Empty file");
    const parsed = safeParse(text, null);
    if (!isObj(parsed)) throw new Error("Expected JSON object");
    if (!save(parsed)) throw new Error("Storage write failed");
    return true;
  }

  window.dataStore = { load, save, exportJSON, importJSON };
})();
