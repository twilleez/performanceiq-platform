// supabaseClient.js — PRODUCTION-READY (FULL FILE) v1.2.1
// Initializes window.supabaseClient ONLY if URL + anon key are provided.
// Otherwise stays offline-first (supabaseClient = null).

(function () {
  "use strict";

  function getCfg() {
    const fromCfg = window.PIQ_CONFIG?.supabase || {};
    const url =
      (typeof fromCfg.url === "string" && fromCfg.url.trim()) ||
      (typeof window.PIQ_SUPABASE_URL === "string" && window.PIQ_SUPABASE_URL.trim()) ||
      "";

    const anonKey =
      (typeof fromCfg.anonKey === "string" && fromCfg.anonKey.trim()) ||
      (typeof window.PIQ_SUPABASE_ANON_KEY === "string" && window.PIQ_SUPABASE_ANON_KEY.trim()) ||
      "";

    return { url: url.trim(), anonKey: anonKey.trim() };
  }

  function canInit(url, anonKey) {
    return !!(
      typeof window.supabase !== "undefined" &&
      window.supabase &&
      typeof window.supabase.createClient === "function" &&
      typeof url === "string" &&
      url &&
      typeof anonKey === "string" &&
      anonKey
    );
  }

  try {
    const { url, anonKey } = getCfg();

    if (canInit(url, anonKey)) {
      window.supabaseClient = window.supabase.createClient(url, anonKey);
    } else {
      window.supabaseClient = null;
    }
  } catch (e) {
    console.warn("[supabaseClient-init]", e);
    window.supabaseClient = null;
  }
})();
