// boot.js
(function () {
  "use strict";

  function safeStart() {
    try {
      if (typeof window.startApp === "function") window.startApp();
    } catch (e) {
      console.warn("[boot.startApp]", e);
      try { window.hideSplashNow?.(); } catch {}
    }
  }

  // Start after everything is loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeStart);
  } else {
    safeStart();
  }
})();
