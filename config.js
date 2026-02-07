// config.js
(function () {
  "use strict";

  window.SUPABASE_URL = "https://znhxaqlvkpcskvzljiev.supabase.co";
  window.SUPABASE_ANON_KEY = "PASTE_YOUR_ANON_KEY_HERE_AS_A_STRING";

  window.PIQ_VERSION = "1.0.5";

  // Debug validation (logs only)
  try {
    const u = new URL(window.SUPABASE_URL);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      console.error("[config.js] SUPABASE_URL must start with https:// or http://");
    }
  } catch (e) {
    console.error("[config.js] SUPABASE_URL is not a valid URL:", window.SUPABASE_URL);
  }
})();
