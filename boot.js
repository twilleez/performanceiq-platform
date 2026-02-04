document.addEventListener("DOMContentLoaded",()=>{
  window.setTimeout(()=>{
    const s=document.getElementById("splash");
    if(s) s.classList.add("hidden");
  },2000);
  document.getElementById("btnSwitchRole")?.addEventListener("click", async () => {
  if (!confirm("Switch role? This will return you to role setup.")) return;

  // Clear local app state (role + profile + cached UI state)
  try { localStorage.removeItem("role"); } catch {}
  try { localStorage.removeItem("athleteProfile"); } catch {}
  try { localStorage.removeItem("selectedRole"); } catch {}
  try { localStorage.removeItem("appState"); } catch {}

  // If you are using Supabase login, keep user logged in by default.
  // If you want role change to require re-login, uncomment:
  // try { await window.supabaseClient.auth.signOut(); } catch {}

  // Force UI back to role chooser
  if (typeof window.showRoleChooser === "function") {
    window.showRoleChooser();
  } else {
    // fallback: reload to trigger boot logic
    location.reload();
  }
});
});
