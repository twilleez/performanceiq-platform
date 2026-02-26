// supabaseClient.js — v1.0.0 (optional cloud)
// Safe: if supabase-js isn't loaded OR credentials missing => no-op.

(function () {
  "use strict";
  if (window.supabaseClient) return;

  // ✅ Fill these in from your Supabase project settings (API)
  const SUPABASE_URL = "https://znhxaqlvkpcskvzljiev.supabase.co";      // e.g. https://xxxxx.supabase.co
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuaHhhcWx2a3Bjc2t2emxqaWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNjM5MzksImV4cCI6MjA4NTczOTkzOX0.ReYzuZuGEI6aqcrXc_jIAXnamtgwCILMwcTsVYAtII0"; // e.g. eyJhbGciOiJIUzI1NiIsInR5cCI...

  function hasCreds() {
    return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
  }

  function canInit() {
    return typeof window.supabase !== "undefined" && typeof window.supabase.createClient === "function";
  }

  let client = null;

  function init() {
    if (client) return client;
    if (!hasCreds()) return null;
    if (!canInit()) return null;

    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    return client;
  }

  window.supabaseClient = {
    getClient: () => init(),
    hasCreds,
    canInit,
    url: SUPABASE_URL ? SUPABASE_URL : "(not set)"
  };
})();
