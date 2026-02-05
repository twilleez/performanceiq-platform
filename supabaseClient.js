// supabaseClient.js  (COPY/PASTE)
(function () {
  "use strict";

  // Prevent double init even if script is loaded twice
  if (window.__PIQ_SUPABASE_LOADED__) return;
  window.__PIQ_SUPABASE_LOADED__ = true;

  // Always provide a stable accessor so other files can call sb()
  // sb() returns a Supabase client OR null (offline / misconfigured)
  window.sb = window.sb || function () {
    return window.supabaseClient || null;
  };

  const url = String(window.SUPABASE_URL || "").trim();
  const key = String(window.SUPABASE_ANON_KEY || "").trim();

  function isValidHttpUrl(s) {
    try {
      const u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  // If config is missing, keep app usable offline
  if (!isValidHttpUrl(url)) {
    console.error(
      "[supabaseClient.js] Invalid SUPABASE_URL. It must be a full https:// URL. Got:",
      url
    );
    return;
  }

  if (!key) {
    console.error("[supabaseClient.js] Missing SUPABASE_ANON_KEY.");
    return;
  }

  // Ensure the Supabase CDN loaded
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error(
      "[supabaseClient.js] Supabase CDN not available. Ensure this is loaded BEFORE supabaseClient.js:",
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
    );
    return;
  }

  // Create client once
  window.supabaseClient = window.supabase.createClient(url, key);

  // Optional: tiny signal for debugging
  window.__PIQ_SUPABASE_READY__ = true;
})();
