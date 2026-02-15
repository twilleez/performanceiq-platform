// auth.js
(function () {
  "use strict";

  function noopFalse() { return false; }

  const AuthStore = {
    async getUser() {
      try {
        if (!window.supabaseClient) return null;
        const { data, error } = await window.supabaseClient.auth.getUser();
        if (error) return null;
        return data?.user || null;
      } catch (e) {
        console.warn("[auth.getUser]", e);
        return null;
      }
    },

    async signInWithOtp(email) {
      if (!window.supabaseClient) throw new Error("Supabase not configured.");
      const clean = String(email || "").trim();
      if (!clean) throw new Error("Email required.");
      const { error } = await window.supabaseClient.auth.signInWithOtp({
        email: clean,
        options: {
          // For static hosting (GitHub Pages), this should be your deployed URL.
          // If omitted, Supabase uses its defaults.
        }
      });
      if (error) throw error;
      return true;
    },

    async signOut() {
      try {
        if (!window.supabaseClient) return true;
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) throw error;
        return true;
      } catch (e) {
        console.warn("[auth.signOut]", e);
        return false;
      }
    }
  };

  window.PIQ_AuthStore = AuthStore;

  // Optional: basic online/offline logging
  try {
    window.addEventListener("offline", () => console.log("Offline"));
    window.addEventListener("online", () => console.log("Online"));
  } catch {}
})();
