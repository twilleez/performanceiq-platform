// core.js — BOOT-SAFE + SPLASH-SAFE + CLOUD-PUSH-READY (PLAIN SCRIPT)
(function () {
  "use strict";

  // ---- Guard: prevent double-load ----
  if (window.__PIQ_CORE_LOADED__) return;
  window.__PIQ_CORE_LOADED__ = true;

  // ---- Safety stub so boot.js never fails ----
  // Replace later with your real role chooser implementation.
  window.showRoleChooser =
    window.showRoleChooser ||
    function () {
      alert("Role chooser not implemented yet.");
    };

  // ---- Constants ----
  const STORAGE_KEY = "piq_state_v1";

  // ---- Helpers ----
  const $ = (id) => document.getElementById(id) || null;

  function __loadLocal() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  // Base save (do not call directly; use saveState below)
  function __saveLocal(s) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return true;
    } catch (e) {
      return false;
    }
  }

  function defaultState() {
    const now = Date.now();
    return {
      meta: { updatedAtMs: now, lastSyncedAtMs: 0 },
      role: "",
      profile: { sport: "basketball", days: 4 },
      trial: {
        startedAtMs: now,
        activated: false,
        licenseKey: "",
        licenseUntilMs: 0
      },
      week: null,
      logs: [],
      tests: [],
      team: {
        name: "",
        roster: [],
        attendance: [],
        board: "",
        compliance: "off"
      }
    };
  }

  function normalizeState(s) {
    const d = defaultState();

    if (!s || typeof s !== "object") return d;

    // meta
    s.meta = s.meta && typeof s.meta === "object" ? s.meta : d.meta;
    if (!Number.isFinite(s.meta.updatedAtMs)) s.meta.updatedAtMs = Date.now();
    if (!Number.isFinite(s.meta.lastSyncedAtMs)) s.meta.lastSyncedAtMs = 0;

    // role
    if (typeof s.role !== "string") s.role = d.role;

    // profile
    s.profile = s.profile && typeof s.profile === "object" ? s.profile : d.profile;
    if (typeof s.profile.sport !== "string") s.profile.sport = d.profile.sport;
    if (!Number.isFinite(s.profile.days)) s.profile.days = d.profile.days;

    // trial
    s.trial = s.trial && typeof s.trial === "object" ? s.trial : d.trial;
    if (!Number.isFinite(s.trial.startedAtMs)) s.trial.startedAtMs = d.trial.startedAtMs;
    if (typeof s.trial.activated !== "boolean") s.trial.activated = d.trial.activated;
    if (typeof s.trial.licenseKey !== "string") s.trial.licenseKey = d.trial.licenseKey;
    if (!Number.isFinite(s.trial.licenseUntilMs)) s.trial.licenseUntilMs = d.trial.licenseUntilMs;

    // collections
    if (!Array.isArray(s.logs)) s.logs = [];
    if (!Array.isArray(s.tests)) s.tests = [];

    // team
    s.team = s.team && typeof s.team === "object" ? s.team : d.team;
    if (typeof s.team.name !== "string") s.team.name = d.team.name;
    if (!Array.isArray(s.team.roster)) s.team.roster = [];
    if (!Array.isArray(s.team.attendance)) s.team.attendance = [];
    if (typeof s.team.board !== "string") s.team.board = d.team.board;
    if (typeof s.team.compliance !== "string") s.team.compliance = d.team.compliance;

    // week can be null or object; leave unchanged
    return s;
  }

  function loadState() {
    const raw = __loadLocal();
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return normalizeState(parsed);
    } catch (e) {
      return null;
    }
  }

  // IMPORTANT: state must live in this IIFE scope
  const state = loadState() || defaultState();

  // Optional: expose minimal handle for debugging
  window.PIQ = window.PIQ || {};
  window.PIQ.getState = () => state;

  // ---- Safe splash hide (prevents “stuck splash”) ----
  function hideSplashNow() {
    const s = $("splash");
    if (!s) return;
    s.classList.add("hidden");
    s.style.display = "none";
    s.style.visibility = "hidden";
    s.style.opacity = "0";
    try { s.remove(); } catch (e) {}
  }

  // Make available to other files / handlers
  window.hideSplashNow = window.hideSplashNow || hideSplashNow;

  // ---- Cloud push (debounced) ----
  // Uses window.dataStore.pushState(state) if available.
  // MUST NOT break offline mode.
  let __piqPushTimer = null;

  function scheduleCloudPush() {
    if (!window.dataStore || typeof window.dataStore.pushState !== "function") return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    if (__piqPushTimer) clearTimeout(__piqPushTimer);
    __piqPushTimer = setTimeout(async () => {
      try {
        await window.dataStore.pushState(state);
        state.meta.lastSyncedAtMs = Date.now();
        __saveLocal(state);
      } catch (e) {
        // Offline / not signed in / RLS: do not break UX
        console.warn("[cloud] push skipped:", e && e.message ? e.message : e);
      }
    }, 800);
  }

  // ---- Public saveState (always updates meta + local + schedules cloud push) ----
  function saveState(s) {
    try {
      s.meta = s.meta || {};
      s.meta.updatedAtMs = Date.now();
    } catch (e) {}

    __saveLocal(s);
    scheduleCloudPush();
  }

  // Expose saveState so other scripts can call it if needed
  window.PIQ.saveState = window.PIQ.saveState || saveState;

  // ---- Minimal start hook so boot.js can continue ----
  // If you have a real init() (bindNav, route, render), call it here.
  window.startApp =
    window.startApp ||
    function () {
      console.log("PerformanceIQ core loaded.");
    };

  // =========================================================
  // ✅ REQUIRED PATCH POINT YOU ASKED FOR:
  // Use this helper inside onboarding "Save & continue" handler.
  // =========================================================
  window.PIQ_applyOnboardingSavePatch = function PIQ_applyOnboardingSavePatch(mountEl) {
    // You should have already updated:
    // state.role = ...
    // state.profile.sport = ...
    // state.profile.days = ...
    // etc.

    saveState(state);

    if (mountEl) {
      mountEl.style.display = "none";
      mountEl.innerHTML = "";
    }

    hideSplashNow();

    if (typeof window.startApp === "function") window.startApp();
  };

  // =========================================================
  // Failsafe: hide splash after 2s or on first interaction.
  // NOTE: If boot.js already does this, you can remove this block.
  // =========================================================
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(hideSplashNow, 2000);
    window.addEventListener("click", hideSplashNow, { once: true });
    window.addEventListener("touchstart", hideSplashNow, { once: true });
  });
})();
