// authStore.js  (COPY/PASTE)
(function () {
  "use strict";

  if (window.__PIQ_AUTHSTORE_LOADED__) return;
  window.__PIQ_AUTHSTORE_LOADED__ = true;

  function client() {
    return (typeof window.sb === "function") ? window.sb() : null;
  }

  const api = {
    // Returns current user if Supabase auth is available, else null
    async user() {
      const c = client();
      if (!c || !c.auth) return null;
      const { data, error } = await c.auth.getUser();
      if (error) return null;
      return data?.user || null;
    },

    // Optional helpers (safe stubs if you haven’t enabled auth yet)
    async signInWithOtp(email) {
      const c = client();
      if (!c || !c.auth) throw new Error("Auth not available (offline or not configured).");
      const { error } = await c.auth.signInWithOtp({ email });
      if (error) throw error;
      return true;
    },

    async signOut() {
      const c = client();
      if (!c || !c.auth) return true;
      const { error } = await c.auth.signOut();
      if (error) throw error;
      return true;
    }
  };

  window.PIQ_AuthStore = api;
})();
