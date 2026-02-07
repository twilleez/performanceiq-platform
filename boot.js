// boot.js
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
    console.error("showRoleChooser() not found. core.js must define it before boot.js runs.");
    return false;
  }

  function wireSwitchRole() {
    const btn = document.getElementById("btnSwitchRole");
    if (!btn) return;

    btn.addEventListener("click", () => {
      if (!confirm("Switch role? This will return you to setup.")) return;

      // Clear role + app state
      try { localStorage.removeItem("role"); } catch {}
      try { localStorage.removeItem("selectedRole"); } catch {}
      try { localStorage.removeItem("athleteProfile"); } catch {}
      try { localStorage.removeItem("appState"); } catch {}
      try { localStorage.removeItem("piq_state_v1"); } catch {}

      showRoleChooserSafe();
    });
  }

  function roleExists() {
    const storedRole = (
      localStorage.getItem("role") ||
      localStorage.getItem("selectedRole") ||
      ""
    ).trim();
    return !!storedRole;
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Always remove splash after 2s and on first tap/click
    setTimeout(hideSplash, 2000);
    window.addEventListener("click", hideSplash, { once: true });
    window.addEventListener("touchstart", hideSplash, { once: true });

    wireSwitchRole();

    if (!roleExists()) {
      // show chooser and remove splash so they can see it
      setTimeout(() => {
        showRoleChooserSafe();
        hideSplash();
      }, 0);
      return;
    }

    // If core exposes a starter, call it
    if (typeof window.startApp === "function") {
      window.startApp();
    }
  });
})();
