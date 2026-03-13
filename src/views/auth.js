import { requireSupabase } from "./supabase.js";

export async function signUp({ email, password, name, role = "athlete" }) {
  const sb = requireSupabase();
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { name, role } },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  const sb = requireSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithMagicLink({ email }) {
  const sb = requireSupabase();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + "/performanceiq-platform/" },
  });
  if (error) throw error;
}

export async function signOut() {
  const sb = requireSupabase();
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(callback) {
  try {
    const sb = requireSupabase();
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return () => subscription.unsubscribe();
  } catch {
    // Supabase not configured — no-op listener
    return () => {};
  }
}
