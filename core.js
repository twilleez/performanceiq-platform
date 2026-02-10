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

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // Base save (do not call directly; use saveState below)
  function __saveLocal(s) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) {}
  }

  function defaultState() {
    return {
      meta: { updatedAtMs: Date.now(), lastSyncedAtMs: 0 },
      role: "",
      profile: { sport: "basketball", days: 4 },
      trial: {
        startedAtMs: Date.now(),
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

  // IMPORTANT: state must live in this IIFE scope
  const state = loadState() || defaultState();
  state.meta = state.meta || {};
  if (!Number.isFinite(state.meta.updatedAtMs)) state.meta.updatedAtMs = Date.now();
  if (!Number.isFinite(state.meta.lastSyncedAtMs)) state.meta.lastSyncedAtMs = 0;

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

    // Optional: avoid noisy pushes when browser says offline
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    if (__piqPushTimer) clearTimeout(__piqPushTimer);
    __piqPushTimer = setTimeout(async () => {
      try {
        await window.dataStore.pushState(state);
        state.meta.lastSyncedAtMs = Date.now();
        __saveLocal(state);
      } catch (e) {
        // Offline / not signed in / RLS: do not break UX
        console.warn("[cloud] push skipped:", e?.message || e);
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

    saveState(state); // saves local + schedules cloud push

    if (mountEl) {
      mountEl.style.display = "none";
      mountEl.innerHTML = "";
    }

    hideSplashNow();

    if (typeof window.startApp === "function") window.startApp();
  };

  // =========================================================
  // 🧩 YOUR FULL APP LOGIC GOES HERE
  // Paste your existing working features below this line:
  // - role/onboarding UI
  // - nav routing
  // - program generation
  // - logs/tests/dashboard/team/parent/settings
  //
  // IMPORTANT RULES:
  // - Use the `state` object above (do not redeclare it)
  // - Use saveState(state) after any state changes
  // - Do NOT redeclare STORAGE_KEY
  // =========================================================



  // =========================================================
  // Failsafe: always hide splash after 2s or first interaction.
  // (Prevents black screen caused by splash overlay.)
  // =========================================================
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(hideSplashNow, 2000);
    window.addEventListener("click", hideSplashNow, { once: true });
    window.addEventListener("touchstart", hideSplashNow, { once: true });
  });
})();
