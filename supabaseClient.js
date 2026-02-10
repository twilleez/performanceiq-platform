// supabaseClient.js (PLAIN SCRIPT)
(function () {
  "use strict";

  // Guard against double load
  if (window.__PIQ_SB_LOADED__) return;
  window.__PIQ_SB_LOADED__ = true;

  function isValidHttpUrl(s) {
    try {
      const u = new URL(String(s || ""));
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  const url = (window.SUPABASE_URL || "").trim();
  const key = (window.SUPABASE_ANON_KEY || "").trim();

  // Define sb() no matter what (so callers can detect offline)
  window.sb = function sb() {
    return window.supabaseClient || null;
  };

  // If config missing/invalid, stay offline (don’t crash app)
  if (!isValidHttpUrl(url)) {
    console.warn("[supabase] Offline mode: SUPABASE_URL invalid/missing:", url);
    return;
  }
  if (!key) {
    console.warn("[supabase] Offline mode: SUPABASE_ANON_KEY missing.");
    return;
  }
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.warn("[supabase] Offline mode: Supabase CDN not loaded.");
    return;
  }

  // Create once
  window.supabaseClient = window.supabase.createClient(url, key);
})();
