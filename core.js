// core.js — COPY/PASTE (adds cloud-push after saveState + safe splash hide)
(function () {
  "use strict";

  // ---- Guard: prevent double-load ----
  if (window.__PIQ_CORE_LOADED__) return;
  window.__PIQ_CORE_LOADED__ = true;

  // ---- Safety stub so boot.js never fails ----
  window.showRoleChooser =
    window.showRoleChooser ||
    function () {
      alert("Role chooser not implemented yet.");
    };

  // ---- Constants ----
  const STORAGE_KEY = "piq_state_v1";

  // ---- Helpers ----
  const $ = (id) => document.getElementById(id);

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveState(s) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {}
  }

  function defaultState() {
    return {
      role: "",
      profile: { sport: "basketball", days: 4 },
      trial: { startedAtMs: Date.now(), activated: false, licenseKey: "", licenseUntilMs: 0 },
      week: null,
      logs: [],
      tests: [],
      team: { name: "", roster: [], attendance: [], board: "", compliance: "off" }
    };
  }

  // IMPORTANT: state must live in this IIFE scope
  const state = loadState() || defaultState();

  // ---- Safe splash hide (prevents “stuck splash”) ----
  function hideSplashNow() {
    const s = $("splash");
    if (!s) return;
    s.classList.add("hidden");
    s.style.display = "none";
    try {
      s.remove();
    } catch {}
  }

  // ---- Cloud push (debounced) ----
  let __piqPushTimer = null;

  function scheduleCloudPush() {
    // Only push if your cloud hooks exist
    if (!window.dataStore || typeof window.dataStore.pushState !== "function") return;

    clearTimeout(__piqPushTimer);
    __piqPushTimer = setTimeout(async () => {
      try {
        await window.dataStore.pushState(state);
      } catch (e) {
        // Offline / not logged in / blocked: do not break UX
        console.warn("[cloud] push skipped:", e?.message || e);
      }
    }, 800);
  }

  // ---- Minimal start hook so boot.js can continue ----
  window.startApp =
    window.startApp ||
    function () {
      // If you have a bigger init(), call it here instead.
      console.log("PerformanceIQ core loaded.");
    };

  // =========================================================
  // ✅ EXAMPLE: where you asked to add it (Save profile -> close modal -> start)
  // Put this inside your onboarding “Save & continue” click handler.
  // =========================================================
  window.__PIQ_applyOnboardingSavePatch = function applyOnboardingSavePatch(mountEl) {
    // mountEl is your onboarding modal container element (the one you call `mount`)
    // Update state as you already do above this line...
    // state.role = ...
    // state.profile.sport = ...
    // state.profile.days = ...

    saveState(state);
    scheduleCloudPush(); // ✅ ADD THIS LINE

    // Close modal + remove splash
    if (mountEl) {
      mountEl.style.display = "none";
      mountEl.innerHTML = "";
    }
    hideSplashNow();

    // Continue app start
    if (typeof window.startApp === "function") window.startApp();
  };

  // If you want splash to always hide even if something fails:
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(hideSplashNow, 2000);
    window.addEventListener("click", hideSplashNow, { once: true });
    window.addEventListener("touchstart", hideSplashNow, { once: true });
  });
})();
