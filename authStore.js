// authStore.js
(function () {
  const sb = () => window.supabaseClient;

  window.authStore = window.authStore || {};

  window.authStore.signUp = async function (email, password) {
    const client = sb();
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  window.authStore.signIn = async function (email, password) {
    const client = sb();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  window.authStore.signOut = async function () {
    const client = sb();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  };
})();
