// supabaseClient.js
const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.PERFIQ;

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});
