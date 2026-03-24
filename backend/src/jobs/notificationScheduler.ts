================================================================
FILE: backend/src/jobs/notificationScheduler.ts
================================================================

// ============================================================
// Notification Scheduler — Phase 3
// Daily streak reminders + weekly athlete summaries for parents
// Rate limited: max 1 per type per 23 hours per user
// ============================================================

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// ── TYPES ─────────────────────────────────────────────────────
interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// ── SEND PUSH ─────────────────────────────────────────────────
async function sendPush(subscription: PushSubscription, payload: PushPayload): Promise<boolean> {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        ...payload,
        icon: payload.icon ?? "/icons/piq-192.png",
        badge: payload.badge ?? "/icons/piq-badge-96.png",
      }),
      { TTL: 86400 } // 24h TTL
    );
    return true;
  } catch (err: any) {
    // 410 = subscription expired, remove it
    if (err.statusCode === 410) {
      await supabase
        .from("piq_push_subscriptions")
        .update({ is_active: false })
        .eq("endpoint", subscription.endpoint);
    }
    console.error("Push send failed:", err.message);
    return false;
  }
}

// ── LOG NOTIFICATION ──────────────────────────────────────────
async function logNotification(
  userId: string,
  type: string,
  payload: PushPayload
): Promise<void> {
  await supabase.from("piq_notification_log").insert({
    user_id: userId,
    notification_type: type,
    payload,
  });
}

// ── CHECK RATE LIMIT ──────────────────────────────────────────
async function canSend(userId: string, type: string): Promise<boolean> {
  const { data } = await supabase.rpc("piq_can_send_notification", {
    p_user_id: userId,
    p_type: type,
  });
  return data === true;
}

// ── STREAK REMINDERS (runs at 3pm user local time) ────────────
export async function sendStreakReminders(): Promise<void> {
  console.log("[NotifScheduler] Running streak reminders...");

  // Get users whose streak is at risk (logged yesterday, not today)
  const { data: atRiskUsers } = await supabase
    .from("piq_streaks")
    .select(`
      user_id,
      current_streak,
      piq_push_subscriptions!inner(endpoint, p256dh_key, auth_key, is_active)
    `)
    .eq("streak_at_risk", true)
    .eq("piq_push_subscriptions.is_active", true);

  if (!atRiskUsers?.length) return;

  let sent = 0;
  for (const user of atRiskUsers) {
    if (!(await canSend(user.user_id, "streak_reminder"))) continue;

    const payload: PushPayload = {
      title: `🔥 ${user.current_streak}-day streak at risk!`,
      body: "Log a workout or wellness check-in before midnight to keep it going.",
      tag: "streak-reminder",
      url: "/training/log",
      data: { type: "streak_reminder", streak: user.current_streak },
    };

    const subs = (user as any).piq_push_subscriptions;
    for (const sub of Array.isArray(subs) ? subs : [subs]) {
      const ok = await sendPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
        payload
      );
      if (ok) {
        await logNotification(user.user_id, "streak_reminder", payload);
        sent++;
        break; // Only send to first active subscription per user
      }
    }
  }

  console.log(`[NotifScheduler] Streak reminders sent: ${sent}`);
}

// ── WEEKLY PARENT SUMMARIES (runs Sunday 7pm) ─────────────────
export async function sendWeeklyParentSummaries(): Promise<void> {
  console.log("[NotifScheduler] Running weekly parent summaries...");

  // Get all parents with active push subs
  const { data: parents } = await supabase
    .from("profiles")
    .select(`
      id,
      first_name,
      piq_push_subscriptions!inner(endpoint, p256dh_key, auth_key, is_active)
    `)
    .eq("role", "parent")
    .eq("piq_push_subscriptions.is_active", true);

  if (!parents?.length) return;

  let sent = 0;
  for (const parent of parents) {
    if (!(await canSend(parent.id, "weekly_parent_summary"))) continue;

    // Get linked athletes
    const { data: athletes } = await supabase
      .from("parent_athlete_links")
      .select(`
        athlete:profiles!athlete_id(first_name, id),
        piq_streaks(current_streak)
      `)
      .eq("parent_id", parent.id);

    if (!athletes?.length) continue;

    const athleteCount = athletes.length;
    const totalSessions = await getWeeklySessionCount(athletes.map((a: any) => a.athlete.id));
    const hasStreak = athletes.some((a: any) => a.piq_streaks?.current_streak >= 3);

    const firstName = athletes[0]?.athlete?.first_name ?? "your athlete";
    const payload: PushPayload = {
      title: `📊 ${firstName}'s weekly training summary is ready`,
      body: `${totalSessions} session${totalSessions !== 1 ? "s" : ""} logged this week${hasStreak ? " 🔥" : ""}. Tap to view the full report.`,
      tag: "weekly-summary",
      url: "/insights/reports",
      data: { type: "weekly_parent_summary" },
    };

    const subs = (parent as any).piq_push_subscriptions;
    for (const sub of Array.isArray(subs) ? subs : [subs]) {
      const ok = await sendPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
        payload
      );
      if (ok) {
        await logNotification(parent.id, "weekly_parent_summary", payload);
        sent++;
        break;
      }
    }
  }

  console.log(`[NotifScheduler] Weekly parent summaries sent: ${sent}`);
}

// ── MILESTONE NOTIFICATIONS ───────────────────────────────────
export async function sendMilestoneNotifications(): Promise<void> {
  // Get newly achieved, unnotified milestones
  const { data: milestones } = await supabase
    .from("piq_milestones")
    .select(`
      user_id, milestone_id,
      piq_push_subscriptions!inner(endpoint, p256dh_key, auth_key, is_active)
    `)
    .eq("achieved", true)
    .eq("notified", false)
    .eq("piq_push_subscriptions.is_active", true);

  if (!milestones?.length) return;

  const MILESTONE_META: Record<string, { label: string; icon: string }> = {
    first_log:    { label: "First Step", icon: "🏁" },
    week_streak:  { label: "On a Roll", icon: "🔥" },
    "10_workouts":{ label: "Getting Real", icon: "💪" },
    month_streak: { label: "Habit Formed", icon: "⚡" },
  };

  for (const m of milestones) {
    const meta = MILESTONE_META[m.milestone_id] ?? { label: m.milestone_id, icon: "🏆" };
    const payload: PushPayload = {
      title: `${meta.icon} Milestone unlocked: ${meta.label}!`,
      body: "Tap to see your achievement.",
      tag: `milestone-${m.milestone_id}`,
      url: "/dashboard",
      data: { type: "milestone", milestone_id: m.milestone_id },
    };

    const subs = (m as any).piq_push_subscriptions;
    for (const sub of Array.isArray(subs) ? subs : [subs]) {
      await sendPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
        payload
      );
      break;
    }

    // Mark as notified
    await supabase
      .from("piq_milestones")
      .update({ notified: true })
      .eq("user_id", m.user_id)
      .eq("milestone_id", m.milestone_id);
  }
}

// ── HELPERS ───────────────────────────────────────────────────
async function getWeeklySessionCount(athleteIds: string[]): Promise<number> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count } = await supabase
    .from("workout_logs")
    .select("id", { count: "exact", head: true })
    .in("user_id", athleteIds)
    .gte("logged_at", weekAgo.toISOString());

  return count ?? 0;
}

// ── CRON ENTRY POINTS ─────────────────────────────────────────
// Call these from your cron job runner (e.g. pg_cron, Supabase Edge Functions, or server cron)

// Every day at 3pm: streak reminders
export async function dailyStreakJob() {
  try {
    await sendStreakReminders();
    await sendMilestoneNotifications();
  } catch (err) {
    console.error("[DailyStreakJob] Failed:", err);
  }
}

// Every Sunday at 7pm: parent summaries
export async function weeklyParentJob() {
  try {
    await sendWeeklyParentSummaries();
  } catch (err) {
    console.error("[WeeklyParentJob] Failed:", err);
  }
}
