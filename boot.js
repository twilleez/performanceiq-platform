document.addEventListener("DOMContentLoaded", () => {
  // 1) Splash: always hide after 2s
  window.setTimeout(() => {
    const s = document.getElementById("splash");
    if (s) s.classList.add("hidden");
  }, 2000);

  // 2) Switch Role button
  document.getElementById("btnSwitchRole")?.addEventListener("click", async () => {
    if (!confirm("Switch role? This will return you to role setup.")) return;

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
