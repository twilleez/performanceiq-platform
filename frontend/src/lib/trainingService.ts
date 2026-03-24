// ============================================================
// trainingService — Workout Engine
// Save / delete / query workout logs
// PIQ Score formula: consistency 35% | readiness 30% | compliance 25% | load 10%
// ACWR calculation with 7-day acute / 28-day chronic rolling windows
// ============================================================

import { supabase } from "./supabase";

export interface QuickLogEntry {
  type: "workout" | "wellness" | "nutrition";
  activityType?: string;
  duration?: number;   // minutes
  intensity?: number;  // 1–10 RPE
  wellnessScore?: number;
  notes?: string;
  timestamp: string;
}

export interface WorkoutLog {
  id: string;
  userId: string;
  activityType: string;
  durationMinutes: number;
  intensity: number;           // RPE 1–10
  trainingLoad: number;        // RPE × duration = session load (AU)
  piqScoreAtLog: number | null;
  complianceScore: number;     // 0.0–1.0
  loggedAt: string;
}

export interface PIQScoreComponents {
  consistency: number;   // 0–100
  readiness: number;     // 0–100
  compliance: number;    // 0–100
  loadManagement: number;// 0–100
  total: number;         // weighted composite 0–100
  acwr: number;          // acute:chronic workload ratio
}

// ── SAVE LOG ─────────────────────────────────────────────────
export async function saveLog(
  id: string,
  entry: QuickLogEntry
): Promise<{ logId: string; piqScore: PIQScoreComponents | null }> {

  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const trainingLoad = entry.type === "workout" && entry.intensity && entry.duration
    ? entry.intensity * entry.duration
    : 0;

  // Save raw log
  const { error: insertError } = await supabase
    .from("workout_logs")
    .insert({
      id,
      user_id: userId,
      activity_type: entry.activityType ?? "other",
      duration_minutes: entry.duration ?? 0,
      intensity: entry.intensity ?? 0,
      training_load: trainingLoad,
      wellness_score: entry.wellnessScore ?? null,
      notes: entry.notes ?? null,
      logged_at: entry.timestamp,
      compliance_score: 1.0, // full compliance for self-logged workouts
    });

  if (insertError) throw new Error(`Save failed: ${insertError.message}`);

  // Update streak
  await supabase.rpc("piq_update_streak", { p_user_id: userId });

  // Recalculate PIQ score
  const piqScore = await calculatePIQScore(userId);

  // Write back the score at this log moment
  if (piqScore) {
    await supabase
      .from("workout_logs")
      .update({ piq_score_at_log: piqScore.total })
      .eq("id", id);
  }

  return { logId: id, piqScore };
}

// ── DELETE LOG ────────────────────────────────────────────────
export async function deleteLog(id: string): Promise<void> {
  const { error } = await supabase
    .from("workout_logs")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

// ── PIQ SCORE FORMULA ─────────────────────────────────────────
// consistency 35% | readiness 30% | compliance 25% | load management 10%
export async function calculatePIQScore(userId: string): Promise<PIQScoreComponents | null> {
  const now = new Date();
  const days28 = new Date(now.getTime() - 28 * 86400000).toISOString();
  const days7  = new Date(now.getTime() -  7 * 86400000).toISOString();

  const { data: logs } = await supabase
    .from("workout_logs")
    .select("logged_at, intensity, duration_minutes, training_load, compliance_score, wellness_score")
    .eq("user_id", userId)
    .gte("logged_at", days28)
    .order("logged_at");

  if (!logs || logs.length === 0) return null;

  const recentLogs  = logs.filter((l: any) => l.logged_at >= days7);
  const acuteDays   = recentLogs.length;
  const chronicDays = logs.length;

  // ── CONSISTENCY (35%) ────────────────────────────────────
  // % of last 28 days with at least one log
  const loggedDays = new Set(
    logs.map((l: any) => l.logged_at.slice(0, 10))
  ).size;
  const consistency = Math.min(100, Math.round((loggedDays / 28) * 100));

  // ── READINESS (30%) ──────────────────────────────────────
  // Average wellness score over last 7 days, normalised 0–100
  const wellnessLogs = recentLogs.filter((l: any) => l.wellness_score != null);
  const readiness = wellnessLogs.length > 0
    ? Math.min(100, Math.round(
        (wellnessLogs.reduce((a: number, l: any) => a + (l.wellness_score / 10) * 100, 0) / wellnessLogs.length)
      ))
    : 50; // neutral default if no wellness data

  // ── COMPLIANCE (25%) ─────────────────────────────────────
  // Average compliance score over 28 days
  const compliance = Math.min(100, Math.round(
    logs.reduce((a: number, l: any) => a + (l.compliance_score ?? 0), 0)
    / logs.length * 100
  ));

  // ── LOAD MANAGEMENT (10%) ─────────────────────────────────
  // ACWR: acute 7-day avg / chronic 28-day avg
  // Ideal zone 0.8–1.3 → 100 points. Penalise deviation.
  const acuteLoad   = recentLogs.reduce((a: number, l: any) => a + (l.training_load ?? 0), 0) / 7;
  const chronicLoad = logs.reduce((a: number, l: any) => a + (l.training_load ?? 0), 0) / 28;
  const acwr        = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;

  let loadScore: number;
  if (acwr >= 0.8 && acwr <= 1.3) {
    loadScore = 100;
  } else if (acwr < 0.8) {
    loadScore = Math.max(0, Math.round(100 - (0.8 - acwr) * 200));
  } else {
    loadScore = Math.max(0, Math.round(100 - (acwr - 1.3) * 150));
  }

  // ── WEIGHTED COMPOSITE ────────────────────────────────────
  const total = Math.round(
    consistency   * 0.35 +
    readiness     * 0.30 +
    compliance    * 0.25 +
    loadScore     * 0.10
  );

  return {
    consistency,
    readiness,
    compliance,
    loadManagement: loadScore,
    total: Math.min(100, Math.max(0, total)),
    acwr: Math.round(acwr * 100) / 100,
  };
}

// ── GET LOGS FOR RANGE ────────────────────────────────────────
export async function getLogs(
  userId: string,
  dateFrom: string,
  dateTo: string
): Promise<WorkoutLog[]> {
  const { data, error } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", dateFrom)
    .lte("logged_at", dateTo)
    .order("logged_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((l: any) => ({
    id: l.id,
    userId: l.user_id,
    activityType: l.activity_type,
    durationMinutes: l.duration_minutes,
    intensity: l.intensity,
    trainingLoad: l.training_load,
    piqScoreAtLog: l.piq_score_at_log,
    complianceScore: l.compliance_score,
    loggedAt: l.logged_at,
  }));
}

// ── 30-DAY TREND ──────────────────────────────────────────────
export async function get30DayTrend(userId: string) {
  const days30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data } = await supabase
    .from("workout_logs")
    .select("logged_at, piq_score_at_log")
    .eq("user_id", userId)
    .gte("logged_at", days30)
    .order("logged_at");

  const byDate: Record<string, number | null> = {};
  (data ?? []).forEach((l: any) => {
    const d = l.logged_at.slice(0, 10);
    if (!byDate[d] || (l.piq_score_at_log && l.piq_score_at_log > (byDate[d] ?? 0))) {
      byDate[d] = l.piq_score_at_log;
    }
  });

  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10);
    return { date: d, piqScore: byDate[d] ?? null, logged: !!byDate[d] };
  });
}

export const trainingService = {
  saveLog,
  deleteLog,
  calculatePIQScore,
  getLogs,
  get30DayTrend,
};
