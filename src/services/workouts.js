import { supabase } from "./supabase.js";

// ─── Fetch today's workout for the logged-in athlete ──────────────────────
export async function getTodaysWorkout(athleteId) {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("scheduled_date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data; // null if no workout today
}

// ─── Fetch recent workouts (last N days) ──────────────────────────────────
export async function getRecentWorkouts(athleteId, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("athlete_id", athleteId)
    .gte("scheduled_date", since)
    .order("scheduled_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Create a new workout ─────────────────────────────────────────────────
export async function createWorkout(athleteId, workout) {
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      athlete_id:     athleteId,
      title:          workout.title,
      sport:          workout.sport,
      day_type:       workout.dayType,
      notes:          workout.notes ?? "",
      recovery_cue:   workout.recoveryCue ?? "",
      exercises:      workout.exercises,
      scheduled_date: new Date().toISOString().split("T")[0],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Save exercise progress mid-session ───────────────────────────────────
// Persists the full exercises JSONB (with done flags updated).
export async function saveWorkoutProgress(workoutId, exercises) {
  const { error } = await supabase
    .from("workouts")
    .update({ exercises })
    .eq("id", workoutId);
  if (error) throw error;
}

// ─── Mark workout complete ─────────────────────────────────────────────────
export async function completeWorkout(workoutId, exercises) {
  const { error } = await supabase
    .from("workouts")
    .update({
      exercises,
      completed_at: new Date().toISOString(),
    })
    .eq("id", workoutId);
  if (error) throw error;
}

// ─── Coach: fetch all workouts for a team's athletes ─────────────────────
export async function getTeamWorkouts(teamId, date) {
  const { data, error } = await supabase
    .from("workouts")
    .select(`
      *,
      profiles:athlete_id ( id, name, sport, position ),
      team_members!inner ( team_id )
    `)
    .eq("team_members.team_id", teamId)
    .eq("scheduled_date", date);
  if (error) throw error;
  return data ?? [];
}
