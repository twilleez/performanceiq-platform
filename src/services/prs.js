import { supabase } from "./supabase.js";

// ─── Get all PRs for an athlete ────────────────────────────────────────────
export async function getPersonalRecords(athleteId) {
  const { data, error } = await supabase
    .from("personal_records")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("set_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Get PR history for a specific exercise (for sparkline) ───────────────
export async function getPRHistory(athleteId, exerciseId, limit = 10) {
  const { data, error } = await supabase
    .from("personal_records")
    .select("value, unit, label, set_at")
    .eq("athlete_id", athleteId)
    .eq("exercise_id", exerciseId)
    .order("set_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─── Save a new PR ─────────────────────────────────────────────────────────
// Only inserts if the new value beats the current best.
export async function maybeSetPR(athleteId, { exerciseId, value, unit, label, workoutId }) {
  // Get current best
  const { data: current } = await supabase
    .from("personal_records")
    .select("value")
    .eq("athlete_id", athleteId)
    .eq("exercise_id", exerciseId)
    .order("value", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Don't insert if not a new best (for time-based metrics, lower is better — caller handles this)
  if (current && value <= current.value) return null;

  const { data, error } = await supabase
    .from("personal_records")
    .insert({
      athlete_id:  athleteId,
      exercise_id: exerciseId,
      value,
      unit,
      label,
      workout_id:  workoutId ?? null,
      set_at:      new Date().toISOString().split("T")[0],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
