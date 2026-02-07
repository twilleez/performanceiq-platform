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
    console.error("showRoleChooser() not found");
    return false;
  }

  function wireSwitchRole() {
    const btn = document.getElementById("btnSwitchRole");
    if (!btn) return;

    btn.addEventListener("click", () => {
      if (!confirm("Switch role?")) return;

      [
        "role",
        "selectedRole",
        "athleteProfile",
        "appState",
        "piq_state_v1"
      ].forEach(k => {
        try { localStorage.removeItem(k); } catch {}
      });

      showRoleChooserSafe();
    });
  }

  function roleExists() {
    return Boolean(
      (localStorage.getItem("role") ||
       localStorage.getItem("selectedRole") ||
       "").trim()
    );
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(hideSplash, 2000);
    window.addEventListener("click", hideSplash, { once: true });
    window.addEventListener("touchstart", hideSplash, { once: true });

    wireSwitchRole();

    if (!roleExists()) {
      hideSplash();
      setTimeout(showRoleChooserSafe, 0);
      return;
    }

    if (typeof window.startApp === "function") {
      window.startApp();
    }
  });
})();
