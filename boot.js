// boot.js (PLAIN SCRIPT)
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
    console.error("showRoleChooser() not found. core.js must load before boot.js.");
    return false;
  }

  function wireSwitchRole() {
    const btn = document.getElementById("btnSwitchRole");
    if (!btn) return;

    btn.addEventListener("click", () => {
      if (!confirm("Switch role? This will return you to role setup.")) return;

      try { localStorage.removeItem("role"); } catch {}
      try { localStorage.removeItem("selectedRole"); } catch {}

      // Let core handle the chooser UI
      const shown = showRoleChooserSafe();
      hideSplash();
      if (!shown) location.reload();
    });
  }

  function roleGate() {
    const storedRole = (
      localStorage.getItem("role") ||
      localStorage.getItem("selectedRole") ||
      ""
    ).trim();

    if (!storedRole) {
      setTimeout(() => {
        showRoleChooserSafe();
        hideSplash();
      }, 0);
      return false;
    }
    return true;
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Always kill splash (even if something else fails)
    setTimeout(hideSplash, 1200);
    window.addEventListener("click", hideSplash, { once: true });
    window.addEventListener("touchstart", hideSplash, { once: true });

    wireSwitchRole();

    if (!roleGate()) return;

    if (typeof window.startApp === "function") window.startApp();
  });
})();
