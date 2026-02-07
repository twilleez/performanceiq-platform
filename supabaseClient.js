// supabaseClient.js
(function () {
  "use strict";

  // Prevent double init
  if (window.supabaseClient) return;

  const url = (window.SUPABASE_URL || "").trim();
  const key = (window.SUPABASE_ANON_KEY || "").trim();

  function isValidHttpUrl(s) {
    try {
      const u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  // If not configured, keep app in offline mode
  if (!isValidHttpUrl(url) || !key) {
    console.warn("[supabaseClient] Offline mode. Missing/invalid SUPABASE_URL or SUPABASE_ANON_KEY.");
    // Still define sb() so callers can check it safely.
    window.sb = function () {
      return null;
    };
    return;
  }

  // Supabase CDN exposes window.supabase
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("[supabaseClient] Supabase CDN not loaded. Make sure the CDN script is included BEFORE this file.");
    window.sb = function () {
      return null;
    };
    return;
  }

  window.supabaseClient = window.supabase.createClient(url, key);

  // ✅ Define sb(): dataStore depends on this
  window.sb = function () {
    return window.supabaseClient || null;
  };
})();
