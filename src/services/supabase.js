import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  !!url && !!key && !url.includes("placeholder") && !key.includes("placeholder");

export const supabase = isSupabaseConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

export function requireSupabase() {
  if (!supabase) throw new Error(
    "Supabase not configured. Running in solo/offline mode."
  );
  return supabase;
}
