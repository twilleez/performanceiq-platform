// boot.js (COPY/PASTE FULL FILE)

(function () {
  console.log("boot.js loaded v1.0.4");

  function hideSplash() {
    const s = document.getElementById("splash");
    if (!s) return;
    s.classList.add("hidden");
    s.style.display = "none";
    s.style.visibility = "hidden";
    s.style.opacity = "0";
    try { s.remove(); } catch {}
  }

  function showRoleChooserSafe() {
    const ob = document.getElementById("onboard");
    if (ob) ob.style.display = "";

    if (typeof window.showRoleChooser === "function") {
      window.showRoleChooser();
    } else {
      console.error("showRoleChooser() not found. Ensure core.js loads before boot.js.");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Hide splash ASAP + guaranteed fallback
    setTimeout(hideSplash, 0);
    setTimeout(hideSplash, 2000);
    window.addEventListener("click", hideSplash, { once: true });
    window.addEventListener("touchstart", hideSplash, { once: true });

    // Switch Role
    document.getElementById("btnSwitchRole")?.addEventListener("click", () => {
      if (!confirm("Switch role? This will return you to role setup.")) return;

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
