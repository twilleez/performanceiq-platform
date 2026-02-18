// authStore.js — PRODUCTION-READY (FULL FILE) v1.0.10
// Supabase JS v2 magic-link auth for static hosting (GitHub Pages)
// - Adds emailRedirectTo
// - Adds auth state listener (helps UI update after clicking magic link)

(function () {
  "use strict";

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

      // For GitHub Pages (static), redirect back to the current origin + path
      // Example: https://willeez.github.io/performanceiq-platform/
      const redirectTo = window.location.href.split("#")[0];

      const { error } = await window.supabaseClient.auth.signInWithOtp({
        email: clean,
        options: {
          emailRedirectTo: redirectTo
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

  // Listen for auth changes (helps the UI update after magic-link returns)
  try {
    if (window.supabaseClient?.auth?.onAuthStateChange) {
      window.supabaseClient.auth.onAuthStateChange((_event, _session) => {
        // core.js checks getUser() so we just re-render if available
        try {
          window.PIQ?.saveState?.();
        } catch {}
      });
    }
  } catch (e) {
    console.warn("[auth.onAuthStateChange]", e);
  }

  try {
    window.addEventListener("offline", () => console.log("Offline"));
    window.addEventListener("online", () => console.log("Online"));
  } catch {}
})();        if (!window.supabaseClient) return true;
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
