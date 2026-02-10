// authStore.js (plain script)
(function () {
  "use strict";
  if (window.PIQ_AuthStore) return;

  function client() {
    return window.supabaseClient || null;
  }

  // Small cache to reduce repeated getUser calls
  let _cachedUser = null;

  async function getUser() {
    const c = client();
    if (!c) return null;

    // If we already have a cached user, return it quickly
    if (_cachedUser && _cachedUser.id) return _cachedUser;

    const { data, error } = await c.auth.getUser();
    if (error) return null;
    _cachedUser = data?.user || null;
    return _cachedUser;
  }

  async function signInWithOtp(email) {
    const c = client();
    if (!c) throw new Error("Supabase not configured.");

    const clean = String(email || "").trim();
    if (!clean || !clean.includes("@")) throw new Error("Enter a valid email.");

    // Use current page as redirect target (works on GitHub Pages)
    const redirectTo = window.location.origin + window.location.pathname;

    const { error } = await c.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: redirectTo }
    });

    if (error) throw error;
    return true;
  }

  async function signOut() {
    const c = client();
    if (!c) return;
    _cachedUser = null;
    await c.auth.signOut();
  }

  function onAuthChange(cb) {
    const c = client();
    if (!c) return () => {};
    const { data } = c.auth.onAuthStateChange((_event, session) => {
      _cachedUser = session?.user || null;
      try { cb(_cachedUser); } catch {}
    });
    return () => {
      try { data?.subscription?.unsubscribe(); } catch {}
    };
  }

  window.PIQ_AuthStore = { getUser, signInWithOtp, signOut, onAuthChange };
})();
