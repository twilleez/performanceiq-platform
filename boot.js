document.addEventListener("DOMContentLoaded", () => {
function hideSplash() {
  const s = document.getElementById("splash");
  if (!s) return;
  s.style.display = "none";
  s.remove();
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(hideSplash, 2000);
  window.addEventListener("click", hideSplash, { once: true });
  window.addEventListener("touchstart", hideSplash, { once: true });
});

  // Force-hide regardless of CSS
  s.style.display = "none";
  s.style.visibility = "hidden";
  s.style.opacity = "0";

  // Remove from DOM (prevents it covering the app)
  s.remove();
}

document.addEventListener("DOMContentLoaded", () => {
  // Always hide splash after 2s no matter what else happens
  setTimeout(hideSplash, 2000);

  // ALSO hide splash immediately if user interacts (extra safety)
  window.addEventListener("click", hideSplash, { once: true });
  window.addEventListener("touchstart", hideSplash, { once: true });

  // ...keep the rest of your boot logic below...
});

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
