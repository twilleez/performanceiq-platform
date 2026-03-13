import { requireSupabase } from "./supabase.js";
const supabase = requireSupabase();

// ─── Sign up ───────────────────────────────────────────────────────────────
// role: 'athlete' | 'coach'
export async function signUp({ email, password, name, role = "athlete" }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role },
    },
  });
  if (error) throw error;
  return data;
}

// ─── Sign in with password ─────────────────────────────────────────────────
export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ─── Magic link (passwordless) ─────────────────────────────────────────────
export async function signInWithMagicLink({ email }) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + "/performanceiq-platform/",
    },
  });
  if (error) throw error;
}

// ─── Sign out ──────────────────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ─── Get current session (non-reactive) ───────────────────────────────────
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ─── Get current user ─────────────────────────────────────────────────────
export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// ─── Auth state listener ───────────────────────────────────────────────────
// Calls callback(session) whenever auth state changes.
// Returns the unsubscribe function.
export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}
