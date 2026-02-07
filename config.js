// config.js
(function () {
  "use strict";

  // ✅ From Supabase Dashboard → Project Settings → API
  // These MUST be strings in quotes.
  window.SUPABASE_URL = "https://znhxaqlvkpcskvzljiev.supabase.co";
  window.SUPABASE_ANON_KEY = "PASTE_YOUR_ANON_PUBLIC_KEY_HERE";

  window.PIQ_VERSION = "1.0.6";

  // Debug validation (logs only)
  try {
    const u = new URL(window.SUPABASE_URL);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      console.error("[config.js] SUPABASE_URL must start with https:// or http://");
    }
  } catch (e) {
    console.error("[config.js] SUPABASE_URL is not a valid URL:", window.SUPABASE_URL);
  }

  if (!window.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY.length < 20) {
    console.error("[config.js] SUPABASE_ANON_KEY missing/too short.");
  }
})();
