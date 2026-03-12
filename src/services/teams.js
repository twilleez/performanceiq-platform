import { supabase } from "./supabase.js";

// ─── Get teams the current user coaches ────────────────────────────────────
export async function getCoachTeams(coachId) {
  const { data, error } = await supabase
    .from("teams")
    .select("*, team_members(athlete_id, profiles:athlete_id(name, sport, position))")
    .eq("coach_id", coachId);
  if (error) throw error;
  return data ?? [];
}

// ─── Get team an athlete belongs to ───────────────────────────────────────
export async function getAthleteTeam(athleteId) {
  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, teams(*)")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  if (error) throw error;
  return data?.teams ?? null;
}

// ─── Create a team ─────────────────────────────────────────────────────────
export async function createTeam(coachId, { name, sport }) {
  const { data, error } = await supabase
    .from("teams")
    .insert({ name, sport, coach_id: coachId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Add athlete to team ───────────────────────────────────────────────────
export async function addAthlete(teamId, athleteId) {
  const { error } = await supabase
    .from("team_members")
    .insert({ team_id: teamId, athlete_id: athleteId });
  if (error && error.code !== "23505") throw error; // ignore duplicate
}

// ─── Get team announcements ────────────────────────────────────────────────
export async function getAnnouncements(teamId, limit = 10) {
  const { data, error } = await supabase
    .from("team_announcements")
    .select("*, profiles:author_id(name)")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─── Post announcement ─────────────────────────────────────────────────────
export async function postAnnouncement(teamId, authorId, body) {
  const { data, error } = await supabase
    .from("team_announcements")
    .insert({ team_id: teamId, author_id: authorId, body })
    .select()
    .single();
  if (error) throw error;
  return data;
}
