// supabaseClient.js
(function () {
  window.PERFIQ = window.PERFIQ || {};
  const url = window.PERFIQ.SUPABASE_URL;
  const key = window.PERFIQ.SUPABASE_ANON_KEY;

  if (!url || !/^https?:\/\//i.test(url)) {
    console.error("Supabase URL missing/invalid. Check config.js window.PERFIQ.SUPABASE_URL");
    return;
  }
  if (!key) {
    console.error("Supabase anon key missing. Check config.js window.PERFIQ.SUPABASE_ANON_KEY");
    return;
  }
  if (!window.supabase) {
    console.error("Supabase library not loaded. Check the CDN script tag in index.html.");
    return;
  }

  // Create once
  if (!window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  }
})();
