// supabaseClient.js (plain script, no exports)
(function () {
  "use strict";

  // Don't double-init
  if (window.supabaseClient) {
    // Ensure sb() exists even if client already exists
    window.sb = window.sb || (() => window.supabaseClient);
    return;
  }

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

  if (!isValidHttpUrl(url)) {
    console.error("[supabaseClient] Invalid SUPABASE_URL:", url);
    return; // allow offline mode
  }

  if (!key) {
    console.error("[supabaseClient] Missing SUPABASE_ANON_KEY");
    return; // allow offline mode
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("[supabaseClient] Supabase CDN not loaded. Check script tag for @supabase/supabase-js@2");
    return;
  }

  window.supabaseClient = window.supabase.createClient(url, key);

  // ✅ This is what your dataStore expects
  window.sb = () => window.supabaseClient;
})();
