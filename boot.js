// boot.js — v1.1.0
// Guarantees splash hides + app starts even if scripts fail.

(function () {
  "use strict";

  const MAX_SPLASH_MS = 1800;

  function hideSplashNow() {
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

  // Expose for core.js fallback
  window.hideSplashNow = hideSplashNow;

  function safeStart() {
    try {
      // core.js exposes startApp
      if (typeof window.startApp === "function") {
        window.startApp();
      } else {
        // If core hasn't loaded yet, try again shortly
        setTimeout(() => {
          try { window.startApp?.(); } catch {}
        }, 50);
      }
    } catch (e) {
      console.warn("[boot.startApp]", e);
      hideSplashNow();
    }
  }

  // Fail-safe: never keep splash forever
  setTimeout(hideSplashNow, MAX_SPLASH_MS);

  // If any unhandled error happens, remove splash so user can interact
  window.addEventListener("error", () => hideSplashNow());
  window.addEventListener("unhandledrejection", () => hideSplashNow());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeStart);
  } else {
    safeStart();
  }
})();
