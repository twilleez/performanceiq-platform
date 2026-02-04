// authStore.js
const sb = window.supabaseClient;

export async function signUp(email, password) {
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data, error } = await sb.auth.getUser();
  if (error) throw error;
  return data.user; // null if not logged in
}
