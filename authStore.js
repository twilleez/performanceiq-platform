// authStore.js — PRODUCTION-READY (FULL FILE) — v1.1.1
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

      // Priority: PIQ_CONFIG.auth.redirectTo → origin + pathname (GitHub Pages safe)
      const redirectTo =
        (window.PIQ_CONFIG && window.PIQ_CONFIG.auth && window.PIQ_CONFIG.auth.redirectTo) ||
        (location.origin + location.pathname);

      const { error } = await window.supabaseClient.auth.signInWithOtp({
        email: clean,
        options: {
          emailRedirectTo: redirectTo  // was hardcoded to window.location.origin — now uses computed redirectTo
        }
      });

      if (error) throw error;
      return true;
    },

    async signOut() {
      if (!hasClient()) return true;
      const { error } = await window.supabaseClient.auth.signOut();
      // Now throws on error (consistent with signInWithOtp) instead of silently returning false
      if (error) throw error;
      return true;
    }
  };

  window.PIQ_AuthStore = AuthStore;

  // Supabase v2 handles magic-link callbacks automatically via onAuthStateChange.
  // No manual session consumption needed here.
  try {
    if (hasClient()) {
      window.supabaseClient.auth.onAuthStateChange(function (event, session) {
        if (event === "SIGNED_IN") {
          console.log("[PIQ_AuthStore] Signed in:", session && session.user ? session.user.email : "unknown");
        } else if (event === "SIGNED_OUT") {
          console.log("[PIQ_AuthStore] Signed out.");
        }
      });
    }
  } catch (e) {
    console.warn("[PIQ_AuthStore.onAuthStateChange]", e);
  }

  // Online/offline status logging
  try {
    window.addEventListener("offline", function () { console.log("[PIQ_AuthStore] Offline."); });
    window.addEventListener("online", function () { console.log("[PIQ_AuthStore] Online."); });
  } catch (e) {}
})();
