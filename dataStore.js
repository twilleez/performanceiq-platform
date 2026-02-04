// dataStore.js
const sb = window.supabaseClient;

// Create or update athlete profile
export async function upsertAthleteProfile(profile) {
  // profile must include user_id
  const { data, error } = await sb
    .from("athlete_profiles")
    .upsert(profile, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAthleteProfile(userId) {
  const { data, error } = await sb
    .from("athlete_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error; // no row
  return data ?? null;
}
