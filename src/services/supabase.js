import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Allow placeholder values in CI test environment
const isPlaceholder = !url || url.includes("placeholder");

export const supabase = isPlaceholder
  ? null  // tests that import this won't call it
  : createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

export function requireSupabase() {
  if (!supabase) throw new Error(
    "Missing Supabase env vars. Copy .env.example → .env.local and fill in your project values."
  );
  return supabase;
}
