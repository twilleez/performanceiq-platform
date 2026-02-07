// supabaseClient.js
(function () {
  "use strict";

  // Prevent double-init
  if (window.__PIQ_SUPABASE_LOADED__) return;
  window.__PIQ_SUPABASE_LOADED__ = true;

  const url = String(window.SUPABASE_URL || "").trim();
  const key = String(window.SUPABASE_ANON_KEY || "").trim();

  function isValidHttpUrl(s) {
    try {
      const u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  // Always expose sb() so other files don't crash in offline mode
  window.sb = function sb() {
    return window.supabaseClient || null;
  };

  if (!isValidHttpUrl(url)) {
    console.error("[supabaseClient.js] Invalid SUPABASE_URL (offline mode).", url);
    return; // offline mode ok
  }

  if (!key) {
    console.error("[supabaseClient.js] Missing SUPABASE_ANON_KEY (offline mode).");
    return; // offline mode ok
  }

  if (!window.supabase || !window.supabase.createClient) {
    console.error("[supabaseClient.js] Supabase CDN not loaded. Check script order.");
    return;
  }

  window.supabaseClient = window.supabase.createClient(url, key);
})();    console.error("[supabaseClient.js] Missing SUPABASE_ANON_KEY.");
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
