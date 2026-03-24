// ============================================================
// Supabase client — shared singleton
// Used by all frontend components that need DB access
// ============================================================
import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
  ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? "https://jijqjbgmhhlvokgtuema.supabase.co";

const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? "";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
