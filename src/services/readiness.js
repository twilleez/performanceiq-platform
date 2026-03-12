import { supabase } from "./supabase.js";

// ─── Get today's log (may be null) ────────────────────────────────────────
export async function getTodaysReadiness(athleteId) {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("readiness_logs")
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("log_date", today)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Upsert today's check-in ───────────────────────────────────────────────
export async function saveReadiness(athleteId, values) {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("readiness_logs")
    .upsert(
      {
        athlete_id:   athleteId,
        log_date:     today,
        score:        values.score       ?? 75,
        hrv:          values.hrv         ?? "",
        sleep_hrs:    values.sleep       ?? 7.0,
        soreness:     values.soreness    ?? "Low",
        hydration:    values.hydration   ?? "On target",
        body_battery: values.bodyBattery ?? 70,
        notes:        values.notes       ?? "",
      },
      { onConflict: "athlete_id,log_date" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Get last N days of readiness (for trend display) ─────────────────────
export async function getReadinessTrend(athleteId, days = 14) {
  const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("readiness_logs")
    .select("log_date, score, sleep_hrs, soreness, hrv")
    .eq("athlete_id", athleteId)
    .gte("log_date", since)
    .order("log_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ─── Coach: get today's readiness for all athletes on a team ─────────────
export async function getTeamReadiness(teamId) {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("readiness_logs")
    .select(`
      *,
      profiles:athlete_id ( id, name, sport, position ),
      team_members!inner ( team_id )
    `)
    .eq("team_members.team_id", teamId)
    .eq("log_date", today)
    .order("score", { ascending: true }); // lowest readiness first — flags at top
  if (error) throw error;
  return data ?? [];
}
