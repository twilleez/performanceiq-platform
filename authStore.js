// authStore.js — PRODUCTION-READY (FULL FILE) — v1.1.0
// Magic-link auth for Supabase v2. Safe on static hosting (GitHub Pages).
(function () {
  "use strict";

  if (window.__PIQ_AUTHSTORE_LOADED__) return;
  window.__PIQ_AUTHSTORE_LOADED__ = true;

  function hasClient() {
    return !!window.supabaseClient && !!window.supabaseClient.auth;
  }

  const AuthStore = {
    async getUser() {
      try {
        if (!hasClient()) return null;
        const { data, error } = await window.supabaseClient.auth.getUser();
        if (error) return null;
        return data && data.user ? data.user : null;
      } catch (e) {
        console.warn("[PIQ_AuthStore.getUser]", e);
        return null;
      }
    },

    async getSession() {
      try {
        if (!hasClient()) return null;
        const { data, error } = await window.supabaseClient.auth.getSession();
        if (error) return null;
        return data && data.session ? data.session : null;
      } catch (e) {
        console.warn("[PIQ_AuthStore.getSession]", e);
        return null;
      }
    },

    async signInWithOtp(email) {
      if (!hasClient()) throw new Error("Supabase not configured.");
      const clean = String(email || "").trim();
      if (!clean) throw new Error("Email required.");

      // IMPORTANT: set this to your deployed URL (GitHub Pages)
      // I cannot confirm your exact URL. Use your real deployed base path.
      const redirectTo =
        (window.PIQ_CONFIG && window.PIQ_CONFIG.auth && window.PIQ_CONFIG.auth.redirectTo) ||
        (location.origin + location.pathname);

      const { error } = await window.supabaseClient.auth.signInWithOtp({
        email: clean,
        options: {
  emailRedirectTo: window.location.origin
}
        
      });

      if (error) throw error;
      return true;
    },

    async signOut() {
      try {
        if (!hasClient()) return true;
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) throw error;
        return true;
      } catch (e) {
        console.warn("[PIQ_AuthStore.signOut]", e);
        return false;
      }
    }
  };

  window.PIQ_AuthStore = AuthStore;

  // Consume callback on load (helps after magic-link redirect)
  try {
    if (hasClient()) {
      window.supabaseClient.auth.getSession().catch(function (e) {
        console.warn("[auth.consumeCallback]", e);
      });
    }
  } catch (e) {
    console.warn("[auth.consumeCallback.outer]", e);
  }

  // Optional online/offline logs
  try {
    window.addEventListener("offline", function () { console.log("Offline"); });
    window.addEventListener("online", function () { console.log("Online"); });
  } catch (e) {}
})();
