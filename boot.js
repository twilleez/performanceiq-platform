// boot.js
(function () {
  "use strict";

  if (window.__PIQ_BOOT_LOADED__) return;
  window.__PIQ_BOOT_LOADED__ = true;

  function hideSplash() {
    const s = document.getElementById("splash");
    if (!s) return;
    s.classList.add("hidden");   // works with your CSS
    s.style.display = "none";    // hard-force
    try { s.remove(); } catch {}
  }

  function showRoleChooserSafe() {
    if (typeof window.showRoleChooser === "function") {
      window.showRoleChooser();
      return true;
    }
    console.error("showRoleChooser() not found. Make sure core.js defines it before boot.js runs.");
    return false;
  }

  function wireSwitchRole() {
    const btn = document.getElementById("btnSwitchRole");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const ok = confirm("Switch role? This will return you to role setup.");
      if (!ok) return;

      try { localStorage.removeItem("role"); } catch {}
      try { localStorage.removeItem("selectedRole"); } catch {}
      try { localStorage.removeItem("athleteProfile"); } catch {}
      try { localStorage.removeItem("appState"); } catch {}
      try { localStorage.removeItem("piq_state_v1"); } catch {}

      // Go to onboarding/role chooser
      const shown = showRoleChooserSafe();
      if (!shown) location.reload();
    });
  }

  function bootGateRole() {
    const storedRole = (
      localStorage.getItem("role") ||
      localStorage.getItem("selectedRole") ||
      ""
    ).trim();

    if (!storedRole) {
      // Ensure UI exists and core loaded before showing chooser
      setTimeout(() => {
        showRoleChooserSafe();
        // still remove splash so they can see the chooser
        hideSplash();
      }, 0);
      return false;
    }
    return true;
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Splash lifecycle (3.5s? change here)
    const SPLASH_MS = 2000;
    setTimeout(hideSplash, SPLASH_MS);
    window.addEventListener("click", hideSplash, { once: true });
    window.addEventListener("touchstart", hideSplash, { once: true });

    // Buttons
    wireSwitchRole();

    // Gate
    const okRole = bootGateRole();
    if (!okRole) return;

    // Start app if core exposes a starter
    if (typeof window.startApp === "function") {
      window.startApp();
    }
    // If core auto-inits on DOMContentLoaded, this is fine too.
  });
})();      try { localStorage.removeItem("appState"); } catch {}

      // Optional: also sign out
      // try { await window.authStore?.signOut(); } catch {}

      showRoleChooserSafe();
    });

    const storedRole = (
      localStorage.getItem("role") ||
      localStorage.getItem("selectedRole") ||
      ""
    ).trim();

    if (!storedRole) {
      setTimeout(showRoleChooserSafe, 0);
      return;
    }

    if (typeof window.startApp === "function") window.startApp();
    else if (typeof window.renderApp === "function") window.renderApp();
  });
})();
      try { localStorage.removeItem("role"); } catch {}
      try { localStorage.removeItem("selectedRole"); } catch {}
      try { localStorage.removeItem("athleteProfile"); } catch {}
      try { localStorage.removeItem("appState"); } catch {}

      showRoleChooserSafe();
    });

    // Role gate
    const storedRole = (
      localStorage.getItem("role") ||
      localStorage.getItem("selectedRole") ||
      ""
    ).trim();

    if (!storedRole) {
      setTimeout(showRoleChooserSafe, 0);
      return;
    }

    // Continue init if exposed
    if (typeof window.startApp === "function") window.startApp();
    else if (typeof window.renderApp === "function") window.renderApp();
  });
})();      try { localStorage.removeItem("role"); } catch {}
      try { localStorage.removeItem("selectedRole"); } catch {}
      try { localStorage.removeItem("athleteProfile"); } catch {}
      try { localStorage.removeItem("appState"); } catch {}

      showRoleChooserSafe();
    });

    // Require role selection
    const storedRole = (
      localStorage.getItem("role") ||
      localStorage.getItem("selectedRole") ||
      ""
    ).trim();

    if (!storedRole) {
      setTimeout(showRoleChooserSafe, 0);
      return;
    }

    // Continue normal init if your app provides a starter function
    if (typeof window.startApp === "function") window.startApp();
    else if (typeof window.renderApp === "function") window.renderApp();
  });
})();      if (!confirm("Switch role? This will return you to role setup.")) return;

      // Clear local app state
      try { localStorage.removeItem("role"); } catch {}
      try { localStorage.removeItem("selectedRole"); } catch {}
      try { localStorage.removeItem("athleteProfile"); } catch {}
      try { localStorage.removeItem("appState"); } catch {}

      // Optional: sign out if you want role changes to require re-login
      // try { await window.supabaseClient?.auth?.signOut(); } catch {}

      showRoleChooserSafe();
    });

    // 3) Boot gate: require role selection
    const storedRole = (
      localStorage.getItem("role") ||
      localStorage.getItem("selectedRole") ||
      ""
    ).trim();

    if (!storedRole) {
      // Let core finish registering global functions, then show chooser
      setTimeout(showRoleChooserSafe, 0);
      return; // STOP boot until role is selected
    }

    // 4) Role exists: proceed to app init (if your core exposes an init)
    if (typeof window.startApp === "function") {
      window.startApp();
    } else if (typeof window.renderApp === "function") {
      window.renderApp();
    } else {
      // If your core auto-initializes, this is fine
      console.log("Boot complete. Role:", storedRole);
    }
  });
})();    if (!confirm("Switch role? This will return you to role setup.")) return;

    try { localStorage.removeItem("role"); } catch {}
    try { localStorage.removeItem("athleteProfile"); } catch {}
    try { localStorage.removeItem("selectedRole"); } catch {}
    try { localStorage.removeItem("appState"); } catch {}

    // If you want role-switch to also log out, uncomment:
    // try { await window.supabaseClient?.auth?.signOut(); } catch {}

    // Force UI back to role chooser
    if (typeof window.showRoleChooser === "function") {
      window.showRoleChooser();
    } else {
      // If chooser isn't available yet, reload (ensures correct boot)
      location.reload();
    }
  });

  // 3) Boot gate: require role selection before app proceeds
  const storedRole =
    (localStorage.getItem("role") || localStorage.getItem("selectedRole") || "").trim();

  if (!storedRole) {
    // Delay one tick to ensure other scripts finished registering global functions
    setTimeout(() => {
      if (typeof window.showRoleChooser === "function") {
        window.showRoleChooser();
      } else {
        console.error("showRoleChooser() not found. Ensure core.js loads before boot.js.");
      }
    }, 0);
    return; // STOP boot until role is set
  }

  // 4) Role exists: continue into normal app init
  // If you have a function that starts the app, call it here.
  // Example: window.startApp?.();
  if (typeof window.startApp === "function") {
    window.startApp();
  } else if (typeof window.renderApp === "function") {
    window.renderApp();
  } else {
    // fallback: do nothing; your existing scripts may auto-render
    console.log("Boot complete. Role:", storedRole);
  }
});});
});
