// supabaseClient.js
(function () {
  "use strict";

  // Prevent double-init
  if (window.__PIQ_SUPABASE_LOADED__) return;
  window.__PIQ_SUPABASE_LOADED__ = true;

  function isValidHttpUrl(s) {
    try {
      const u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  function init() {
    const url = (window.SUPABASE_URL || "").trim();
    const key = (window.SUPABASE_ANON_KEY || "").trim();

    if (!isValidHttpUrl(url)) {
      console.warn("[supabaseClient] Supabase URL invalid or missing. Running offline mode.");
      return null;
    }
    if (!key) {
      console.warn("[supabaseClient] Supabase anon key missing. Running offline mode.");
      return null;
    }
    if (!window.supabase || !window.supabase.createClient) {
      console.error("[supabaseClient] supabase-js CDN not loaded (window.supabase missing).");
      return null;
    }

    return window.supabase.createClient(url, key);
  }

  // Create client once
  const client = init();
  if (client) window.supabaseClient = client;

  // ✅ sb() accessor used everywhere else
  window.sb = function () {
    return window.supabaseClient || null;
  };
})();
