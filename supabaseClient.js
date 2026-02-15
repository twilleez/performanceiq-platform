// supabase-config.js
// Leave values as empty strings to keep sync disabled.
// When you paste real values, cloud sync becomes available.

(function () {
  "use strict";

  // ✅ YOU must fill these from your Supabase project settings.
  // I cannot confirm your URL/keys.
  window.PIQ_SUPABASE_URL = "";     // e.g. https://xxxx.supabase.co
  window.PIQ_SUPABASE_ANON_KEY = ""; // anon public key

  function canInit() {
    return (
      typeof window.supabase !== "undefined" &&
      typeof window.PIQ_SUPABASE_URL === "string" &&
      window.PIQ_SUPABASE_URL.trim() &&
      typeof window.PIQ_SUPABASE_ANON_KEY === "string" &&
      window.PIQ_SUPABASE_ANON_KEY.trim()
    );
  }

  try {
    if (canInit()) {
      window.supabaseClient = window.supabase.createClient(
        window.PIQ_SUPABASE_URL.trim(),
        window.PIQ_SUPABASE_ANON_KEY.trim()
      );
    } else {
      window.supabaseClient = null; // keeps app offline-first
    }
  } catch (e) {
    console.warn("[supabase-init]", e);
    window.supabaseClient = null;
  }
})();
