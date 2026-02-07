// authStore.js (plain script)
(function () {
  "use strict";

  if (window.PIQ_AuthStore) return;

  function client() {
    return window.supabaseClient || null;
  }

  async function getUser() {
    const c = client();
    if (!c) return null;
    const { data, error } = await c.auth.getUser();
    if (error) return null;
    return data?.user || null;
  }

  async function signInWithOtp(email) {
    const c = client();
    if (!c) throw new Error("Supabase not configured.");
    const { error } = await c.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href }
    });
    if (error) throw error;
    return true;
  }

  async function signOut() {
    const c = client();
    if (!c) return;
    await c.auth.signOut();
  }

  function onAuthChange(cb) {
    const c = client();
    if (!c) return () => {};
    const { data } = c.auth.onAuthStateChange((_event, session) => {
      cb(session?.user || null);
    });
    return () => {
      try { data?.subscription?.unsubscribe(); } catch {}
    };
  }

  window.PIQ_AuthStore = { getUser, signInWithOtp, signOut, onAuthChange };
})();
