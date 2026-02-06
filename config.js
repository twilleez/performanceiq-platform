// config.js  (COPY/PASTE)
(function () {
  "use strict";

  // ✅ Replace with values from Supabase Dashboard → Project Settings → API
  window.SUPABASE_URL = https://znhxaqlvkpcskvzljiev.supabase.co;
  window.SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuaHhhcWx2a3Bjc2t2emxqaWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNjM5MzksImV4cCI6MjA4NTczOTkzOX0.ReYzuZuGEI6aqcrXc_jIAXnamtgwCILMwcTsVYAtII0;

  window.PIQ_VERSION = "1.0.5";

  // Debug validation (won't break app; just logs)
  try {
    const u = new URL(window.SUPABASE_URL);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      console.error("[config.js] SUPABASE_URL must start with https:// or http://");
    }
  } catch (e) {
    console.error("[config.js] SUPABASE_URL is not a valid URL:", window.SUPABASE_URL);
  }

  if (!window.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY.includes("YOUR_")) {
    console.error("[config.js] SUPABASE_ANON_KEY is not set to a real anon public key.");
  }
})();
