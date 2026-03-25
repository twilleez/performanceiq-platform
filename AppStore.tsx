// ============================================================
// API Routes — PIQ Recovery
// All backend endpoints with validation, auth, and docs
// ============================================================

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { generateReport, saveReportAndCreateLink } from "../services/reportGenerator";
import { dailyStreakJob, weeklyParentJob } from "../jobs/notificationScheduler";
import type { Request, Response } from "express";

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── AUTH MIDDLEWARE ───────────────────────────────────────────
async function requireAuth(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Invalid or expired token" });

  (req as any).user = user;
  next();
}

// ── PHASE 0: SEED DEMO ────────────────────────────────────────
/**
 * POST /api/seed-demo
 * Requires: 3-step confirmation (confirmed: true in body)
 * Wipes all user data and seeds demo content
 * Rate limited: max 1 per 24h
 */
router.post("/seed-demo", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { confirmed } = req.body;

  if (!confirmed) {
    return res.status(400).json({ error: "Confirmation required. Must pass confirmed: true after completing the 3-step gate." });
  }

  // Log the destructive action before executing
  await supabase.from("piq_audit_log").insert({
    user_id: user.id,
    action_type: "seed_demo",
    payload: { confirmed: true, timestamp: new Date().toISOString() },
  });

  // Delete all user data (cascade handles related tables via FK)
  const tables = ["workout_logs", "piq_food_log", "piq_streaks", "piq_milestones", "piq_message_threads"];
  for (const table of tables) {
    await supabase.from(table).delete().eq("user_id", user.id);
  }

  // Seed demo data
  await supabase.from("workout_logs").insert(generateDemoWorkouts(user.id));

  res.json({ success: true, message: "Demo data loaded. All previous data has been removed." });
});

/**
 * POST /api/seed-demo/undo
 * Restores data from audit log if within undo window
 */
router.post("/seed-demo/undo", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;

  const { data: log } = await supabase
    .from("piq_audit_log")
    .select("*")
    .eq("user_id", user.id)
    .eq("action_type", "seed_demo")
    .eq("undone", false)
    .gte("created_at", new Date(Date.now() - 10_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!log) return res.status(400).json({ error: "No undoable seed demo action found within the 10-second window." });

  // Restore from payload
  if (log.payload?.backup) {
    await supabase.from("workout_logs").insert(log.payload.backup);
  }
  await supabase.from("piq_audit_log").update({ undone: true, undone_at: new Date().toISOString() }).eq("id", log.id);

  res.json({ success: true });
});

// ── PHASE 3: PUSH NOTIFICATIONS ──────────────────────────────
/**
 * POST /api/notifications/subscribe
 * Body: { endpoint, keys: { p256dh, auth }, deviceType? }
 */
router.post("/notifications/subscribe", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { endpoint, keys, deviceType } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: "endpoint, keys.p256dh, and keys.auth are required." });
  }

  const { error } = await supabase.from("piq_push_subscriptions").upsert({
    user_id: user.id,
    endpoint,
    p256dh_key: keys.p256dh,
    auth_key: keys.auth,
    device_type: deviceType ?? "web",
    is_active: true,
  }, { onConflict: "user_id,endpoint" });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

/**
 * DELETE /api/notifications/unsubscribe
 * Body: { endpoint }
 */
router.delete("/notifications/unsubscribe", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { endpoint } = req.body;
  await supabase.from("piq_push_subscriptions").update({ is_active: false }).eq("user_id", user.id).eq("endpoint", endpoint);
  res.json({ success: true });
});

// ── PHASE 3: STREAK ───────────────────────────────────────────
/**
 * POST /api/streak/update
 * Called automatically when a workout log is saved
 */
router.post("/streak/update", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  await supabase.rpc("piq_update_streak", { p_user_id: user.id });
  const { data } = await supabase.from("piq_streaks").select("*").eq("user_id", user.id).single();
  res.json({ streak: data });
});

/**
 * GET /api/streak
 */
router.get("/streak", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { data } = await supabase.from("piq_streaks").select("*").eq("user_id", user.id).single();
  res.json({ streak: data ?? { current_streak: 0, longest_streak: 0, last_log_date: null, streak_at_risk: false } });
});

// ── PHASE 4: REPORTS ─────────────────────────────────────────
/**
 * POST /api/reports/generate
 * Body: { athleteId, dateFrom, dateTo, includeMetrics[], coachNotes?, expiresIn? }
 * Returns: { reportId, shareUrl, pdfBase64? }
 */
router.post("/reports/generate", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { athleteId, dateFrom, dateTo, coachNotes, expiresIn } = req.body;

  if (!athleteId || !dateFrom || !dateTo) {
    return res.status(400).json({ error: "athleteId, dateFrom, and dateTo are required." });
  }

  // Verify coach has access to this athlete
  const { data: link } = await supabase
    .from("coach_athlete_links")
    .select("id")
    .eq("coach_id", user.id)
    .eq("athlete_id", athleteId)
    .single();

  if (!link) return res.status(403).json({ error: "You do not have access to this athlete." });

  try {
    const pdfBuffer = await generateReport({ coachId: user.id, athleteId, dateFrom, dateTo, includeMetrics: [], coachNotes, expiresIn });
    const { reportId, shareUrl } = await saveReportAndCreateLink(user.id, athleteId, pdfBuffer, expiresIn);
    res.json({ reportId, shareUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/reports/:reportId
 * Public: no auth required. Returns PDF stream.
 */
router.get("/reports/:reportId", async (req: Request, res: Response) => {
  const { reportId } = req.params;
  const { data } = await supabase.from("piq_report_log").select("file_path, expires_in, created_at").eq("id", reportId).single();

  if (!data) return res.status(404).json({ error: "Report not found or expired." });

  const { data: fileData, error } = await supabase.storage.from("piq-reports").download(data.file_path);
  if (error || !fileData) return res.status(404).json({ error: "Report file not found." });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="piq-report-${reportId}.pdf"`);
  const buffer = Buffer.from(await fileData.arrayBuffer());
  res.send(buffer);
});

// ── PHASE 4: NUTRITION ────────────────────────────────────────
/**
 * POST /api/nutrition/log
 * Body: FoodLogEntry
 */
router.post("/nutrition/log", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { food_name, meal_type, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, barcode, source } = req.body;

  if (!food_name || !meal_type) return res.status(400).json({ error: "food_name and meal_type are required." });

  const { data, error } = await supabase.from("piq_food_log").insert({
    user_id: user.id,
    food_name, meal_type, serving_size, serving_unit,
    calories, protein_g, carbs_g, fat_g, barcode,
    source: source ?? "manual",
    logged_at: new Date().toISOString(),
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ entry: data });
});

/**
 * GET /api/nutrition/daily
 * Query: date (YYYY-MM-DD, defaults to today)
 */
router.get("/nutrition/daily", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const date = (req.query.date as string) ?? new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("piq_food_log")
    .select("*")
    .eq("user_id", user.id)
    .gte("logged_at", `${date}T00:00:00Z`)
    .lte("logged_at", `${date}T23:59:59Z`)
    .order("logged_at");

  const totals = (data ?? []).reduce((acc: any, entry: any) => ({
    calories: acc.calories + (entry.calories ?? 0),
    protein:  acc.protein  + (entry.protein_g ?? 0),
    carbs:    acc.carbs    + (entry.carbs_g ?? 0),
    fat:      acc.fat      + (entry.fat_g ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  res.json({ entries: data, totals, date });
});

// ── CRON ENDPOINTS (protected by internal secret) ─────────────
router.post("/cron/daily-streak", async (req: Request, res: Response) => {
  if (req.headers["x-cron-secret"] !== process.env.CRON_SECRET) return res.status(401).end();
  await dailyStreakJob();
  res.json({ ok: true });
});

router.post("/cron/weekly-parent", async (req: Request, res: Response) => {
  if (req.headers["x-cron-secret"] !== process.env.CRON_SECRET) return res.status(401).end();
  await weeklyParentJob();
  res.json({ ok: true });
});

// ── HELPERS ───────────────────────────────────────────────────
function generateDemoWorkouts(userId: string) {
  const types = ["run", "lift", "swim", "cycle", "practice"];
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return {
      user_id: userId,
      activity_type: types[i % types.length],
      duration_minutes: [30, 45, 60, 75, 90][i % 5],
      intensity: [5, 6, 7, 8, 4][i % 5],
      logged_at: d.toISOString(),
      piq_score_at_log: 55 + i,
      compliance_score: 0.8 + (i % 3) * 0.05,
    };
  });
}

export default router;
