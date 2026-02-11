// config.js — FULL REPLACEMENT
(function () {
  "use strict";

  // IMPORTANT:
  // - If either value is missing, cloud sync is disabled automatically (offline-first still works).
  // - Do not commit secret keys. Supabase "anon" key is okay to ship.

  window.PIQ_CONFIG = window.PIQ_CONFIG || {
    SUPABASE_URL: "",       // e.g. "https://xxxx.supabase.co"
    SUPABASE_ANON_KEY: ""   // e.g. "eyJhbGciOiJIUzI1NiIs..."
  };
})();
