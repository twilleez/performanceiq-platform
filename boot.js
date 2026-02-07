// boot.js (clean)
(function () {
  "use strict";

  if (window.__PIQ_BOOT_LOADED__) return;
  window.__PIQ_BOOT_LOADED__ = true;

  function hideSplash() {
    const s = document.getElementById("splash");
    if (!s) return;
    s.classList.add("hidden");
    s.style.display = "none";
    try { s.remove(); } catch {}
  }

  function showRoleChooserSafe() {
    if (typeof window.showRoleChooser === "function") {
      window.showRoleChooser();
      return true;
    }
    console.error("showRoleChooser() not found (core.js did not run).");
    return false;
  }

  function wireSwitchRole() {
    const btn = document.getElementById("btnSwitchRole");
    if (!btn) return;

    btn.addEventListener("click", () => {
      if (!confirm("Switch role? This will return you to role setup.")) return;

      try { localStorage.removeItem("role"); } catch {}
      try { localStorage.removeItem("selectedRole"); } catch {}
      try { localStorage.removeItem("athleteProfile"); } catch {}
      try { localStorage.removeItem("appState"); } catch {}
      try { localStorage.removeItem("piq_state_v1"); } catch {}

      hideSplash();
      if (!showRoleChooserSafe()) location.reload();
    });
  }

  function hasRole() {
    const storedRole = (
      localStorage.getItem("role") ||
      localStorage.getItem("selectedRole") ||
      ""
    ).trim();
    return !!storedRole;
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(hideSplash, 2000);
    window.addEventListener("click", hideSplash, { once: true });
    window.addEventListener("touchstart", hideSplash, { once: true });

    wireSwitchRole();

    if (!hasRole()) {
      hideSplash();
      showRoleChooserSafe();
      return;
    }

    if (typeof window.startApp === "function") window.startApp();
  });
})();
