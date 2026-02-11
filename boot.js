// boot.js — FULL REPLACEMENT
(function () {
  "use strict";

  function safeHideSplash() {
    try {
      if (typeof window.hideSplashNow === "function") window.hideSplashNow();
    } catch {}
  }

  document.addEventListener("DOMContentLoaded", () => {
    // If core isn't ready, don't crash the page.
    if (typeof window.startApp !== "function" || typeof window.showRoleChooser !== "function") {
      console.warn("[boot] core not ready.");
      safeHideSplash();
      return;
    }

    try {
      // Start app (core handles role gating + rendering)
      window.startApp();
    } catch (e) {
      console.warn("[boot] startApp failed:", e?.message || e);
      safeHideSplash();
    }

    // Failsafe splash
    setTimeout(safeHideSplash, 2000);
    window.addEventListener("click", safeHideSplash, { once: true });
    window.addEventListener("touchstart", safeHideSplash, { once: true });
  });
})();
