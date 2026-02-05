// supabaseClient.js
(function () {
  "use strict";

  // Prevent redeclare / double init
  if (window.supabaseClient) return;

  const url = (window.SUPABASE_URL || "").trim();
  const key = (window.SUPABASE_ANON_KEY || "").trim();

  // Hard validation to avoid: "Invalid supabaseUrl"
  const isValidHttpUrl = (s) => {
    try {
      const u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  if (!isValidHttpUrl(url)) {
    console.error("Supabase URL is invalid. config.js must set window.SUPABASE_URL to a full https:// URL.", url);
    // Don't throw—allow offline mode to still run
    return;
  }

  if (!key) {
    console.error("Supabase anon key missing. config.js must set window.SUPABASE_ANON_KEY.");
    return;
  }

  // Supabase CDN exposes global `supabase`
  window.supabaseClient = window.supabase.createClient(url, key);
})();
