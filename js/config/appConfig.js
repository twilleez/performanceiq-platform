export const config={supabaseUrl:window.__PIQ_SUPABASE_URL__||"",supabaseKey:window.__PIQ_SUPABASE_ANON_KEY__||""};export const hasSupabaseConfig=()=>Boolean(config.supabaseUrl&&config.supabaseKey);
