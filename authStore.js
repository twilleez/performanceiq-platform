// authStore.js — PRODUCTION-SAFE FIXED FILE
// Supabase JS v2 — Magic-link auth for static hosting

(function () {
  "use strict";

  const AuthStore = {
    async getUser() {
      if (!window.supabaseClient) return null;
      try {
        const { data, error } = await window.supabaseClient.auth.getUser();
        if (error) return null;
        return data?.user || null;
      } catch (e) {
        console.warn("[auth.getUser]", e);
        return null;
      }
    },
(async function () {
  if (!window.supabaseClient) return;

  // This ensures the auth callback URL is processed
  try {
    await window.supabaseClient.auth.getSession();
  } catch (e) {
    console.warn("[auth callback consume]", e);
  }
})();

    
    const { error } = await window.supabaseClient.auth.signInWithOtp({
  email: clean,
  options: {
    emailRedirectTo: "https://willeez.github.io/performanceiq-platform/"
  }
});

      if (error) throw error;
      return true;
    },

    async signOut() {
      if (!window.supabaseClient) return true;
      try {
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) throw error;
        return true;
      } catch (e) {
        console.warn("[auth.signOut]", e);
        return false;
      }
    }
  };

  // ✅ This line must execute — previously it never did
  window.PIQ_AuthStore = AuthStore;

  // Optional logging
  try {
    window.addEventListener("offline", () => console.log("Offline"));
    window.addEventListener("online", () => console.log("Online"));
  } catch {}
})();
