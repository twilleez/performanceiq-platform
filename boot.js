// boot.js  (COPY/PASTE)
(function () {
  "use strict";

  // Prevent double-load
  if (window.__PIQ_BOOT_LOADED__) return;
  window.__PIQ_BOOT_LOADED__ = true;

  // Adjust splash timing here (ms)
  const SPLASH_MS = 2000;

  function hideSplash() {
    const s = document.getElementById("splash");
    if (!s) return;

    // Make sure it cannot cover the UI
    s.classList.add("hidden");
    s.style.display = "none";
    s.style.visibility = "hidden";
    s.style.opacity = "0";

    try { s.remove(); } catch (e) {}
  }

  function showRoleChooserSafe() {
    // Prefer a dedicated role chooser if your core defines it
    if (typeof window.showRoleChooser === "function") {
      window.showRoleChooser();
      return true;
    }

    // Fallback: if your core uses onboarding modal, call it
    if (typeof window.showOnboarding === "function") {
      window.showOnboarding();
      return true;
    }

    console.error(
      "[boot.js] No role chooser found. Expected window.showRoleChooser() or window.showOnboarding()."
    );
    return false;
  }

  function storedRole() {
    return String(
      localStorage.getItem("role") ||
      localStorage.getItem("selectedRole") ||
      ""
    ).trim();
  }

  function clearRoleState() {
    // Clear only role/profile keys (keep other data unless you want a full reset)
    try { localStorage.removeItem("role"); } catch (e) {}
    try { localStorage.removeItem("selectedRole"); } catch (e) {}
    try { localStorage.removeItem("athleteProfile"); } catch (e) {}
    try { localStorage.removeItem("appState"); } catch (e) {}
    // If your app stores everything in one key, clear it too:
    // try { localStorage.removeItem("piq_state_v1"); } catch (e) {}
  }

  function wireSwitchRole() {
    const btn = document.getElementById("btnSwitchRole");
    if (!btn) return;

    // Avoid double-binding if DOMContentLoaded somehow fires twice
    if (btn.__piq_bound__) return;
    btn.__piq_bound__ = true;

    btn.addEventListener("click", function () {
      const ok = confirm("Switch role? This will return you to role setup.");
      if (!ok) return;

      clearRoleState();

      // Show chooser and ensure splash isn't blocking it
      hideSplash();

      // Defer so core has a tick to be ready
      setTimeout(function () {
        const shown = showRoleChooserSafe();
        if (!shown) location.reload();
      }, 0);
    });
  }

  function gateRoleThenStart() {
    const role = storedRole();

    if (!role) {
      // Ensure user can SEE the chooser (splash must not trap them)
      hideSplash();

      // Let core register its globals first
      setTimeout(function () {
        const shown = showRoleChooserSafe();
        if (!shown) {
          // As a last fallback, at least show the Profile tab
          location.hash = "#profile";
        }
      }, 0);

      return; // STOP boot until role is set
    }

    // Role exists: proceed. Most of your app already initializes in core.js,
    // but call startApp if you have it.
    if (typeof window.startApp === "function") {
      window.startApp();
    } else if (typeof window.renderApp === "function") {
      window.renderApp();
    }
  }

  document.addEventListener("DOMContentLoaded", function      try { localStorage.removeItem("piq_state_v1"); } catch {}

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
