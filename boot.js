// boot.js — v2.3.0 (FULL REPLACEMENT)
// Ultra-safe boot: always hides splash even if JS errors occur.

(function () {
  "use strict";

  function tryHideSplash() {
    try { window.hideSplashNow?.(); } catch {}
    try {
      const s = document.getElementById("splash");
      if (!s) return;
      s.style.pointerEvents = "none";
      s.style.opacity = "0";
      s.style.visibility = "hidden";
      s.style.display = "none";
      try { s.remove(); } catch {}
    } catch {}
  }

  function safeStart() {
    try {
      if (typeof window.startApp === "function") window.startApp();
    } catch (e) {
      console.warn("[boot.startApp]", e);
      tryHideSplash();
    }
  }

  // DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeStart, { once: true });
  } else {
    safeStart();
  }

  // Window load safety
  window.addEventListener("load", () => {
    tryHideSplash();
  }, { once: true });

  // Hard failsafe (never leave splash stuck)
  setTimeout(() => {
    tryHideSplash();
  }, 2200);
})();
