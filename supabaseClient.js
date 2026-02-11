// supabaseClient.js — FULL REPLACEMENT
(function () {
  "use strict";

  // Provide a consistent global for other scripts:
  // window.supabaseClient (Supabase v2 client) or null if not configured.

  function getCfg() {
    return window.PIQ_CONFIG || {};
  }

  function hasConfig(cfg) {
    return !!(cfg && typeof cfg.SUPABASE_URL === "string" && cfg.SUPABASE_URL.trim()
      && typeof cfg.SUPABASE_ANON_KEY === "string" && cfg.SUPABASE_ANON_KEY.trim());
  }

  try {
    const cfg = getCfg();
    if (!hasConfig(cfg)) {
      window.supabaseClient = null;
      return;
    }

    if (!window.supabase || !window.supabase.createClient) {
      console.warn("[supabaseClient] Supabase library not loaded.");
      window.supabaseClient = null;
      return;
    }

    window.supabaseClient = window.supabase.createClient(
      cfg.SUPABASE_URL.trim(),
      cfg.SUPABASE_ANON_KEY.trim(),
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
  } catch (e) {
    console.warn("[supabaseClient] init failed:", e?.message || e);
    window.supabaseClient = null;
  }
})();
