================================================================
FILE: frontend/src/lib/analytics.ts
================================================================

// ============================================================
// Analytics — PIQ event instrumentation
// All focus group recovery events tracked here
// Wraps PostHog / Mixpanel / custom backend
// ============================================================

type EventProperties = Record<string, string | number | boolean | null | undefined>;

class Analytics {
  private isEnabled: boolean;
  private queue: Array<{ event: string; props: EventProperties }> = [];
  private userId: string | null = null;
  private userProps: EventProperties = {};

  constructor() {
    this.isEnabled = process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
  }

  identify(userId: string, props: EventProperties = {}) {
    this.userId = userId;
    this.userProps = props;
    if (this.isEnabled && typeof window !== "undefined") {
      (window as any).posthog?.identify(userId, props);
    }
  }

  track(event: string, properties: EventProperties = {}) {
    const enriched: EventProperties = {
      ...properties,
      ...this.userProps,
      user_id: this.userId,
      timestamp: new Date().toISOString(),
      platform: typeof window !== "undefined" ? "web" : "server",
      device: this.getDeviceType(),
      session_id: this.getSessionId(),
    };

    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] ${event}`, enriched);
    }

    if (this.isEnabled && typeof window !== "undefined") {
      (window as any).posthog?.capture(event, enriched);
    }

    this.queue.push({ event, props: enriched });
  }

  // ── PHASE 0 EVENTS ────────────────────────────────────────
  // seed_demo_gate_opened
  // seed_demo_gate_step { step }
  // seed_demo_gate_cancelled { step }
  // seed_demo_confirmed
  // undo_toast_shown { action_id, label, severity }
  // undo_triggered { action_id }
  // undo_toast_expired { action_id }
  // sync_failed { error, retry_count }
  // sync_recovered { error, retry_count }

  // ── PHASE 1 EVENTS ────────────────────────────────────────
  // onboarding_step_viewed { step, role }
  // onboarding_completed { role, sport }
  // onboarding_skipped { step }
  // nav_tab_changed { from, to, device }
  // fab_opened
  // fab_start_workout_log
  // fab_start_wellness_log
  // fab_log_undone { type }
  // fab_log_committed { type, activity, duration }
  // tooltip_shown { tooltip_id }
  // tooltip_dismissed { tooltip_id }

  // ── PHASE 3 EVENTS ────────────────────────────────────────
  // milestone_achieved { milestone_id }
  // streak_broken { streak_count }
  // push_notification_sent { type }
  // push_notification_opened { type }
  // message_sent { thread_id }
  // message_read { thread_id, latency_seconds }

  // ── PHASE 4 EVENTS ────────────────────────────────────────
  // report_generated { athlete_id, date_range_days }
  // report_shared { report_id, expires_in }
  // report_opened { report_id }
  // nutrition_barcode_scan { success, food_found }
  // nutrition_logged { source, meal_type }

  // ── RETENTION METRICS ─────────────────────────────────────
  trackSessionStart() {
    this.track("session_start", {
      page: typeof window !== "undefined" ? window.location.pathname : "",
    });
  }

  trackRetentionSignal(signal: "day_1" | "day_3" | "day_7" | "day_14" | "day_30") {
    this.track("retention_signal", { cohort: signal });
  }

  trackFirstValue(action: "first_log" | "first_piq_score" | "first_report" | "first_message") {
    this.track("first_value_moment", { action });
  }

  // ── HELPERS ───────────────────────────────────────────────
  private getDeviceType(): string {
    if (typeof window === "undefined") return "server";
    const w = window.innerWidth;
    if (w < 768) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  }

  private getSessionId(): string {
    if (typeof window === "undefined") return "";
    let id = sessionStorage.getItem("piq_session_id");
    if (!id) {
      id = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem("piq_session_id", id);
    }
    return id;
  }
}

export const analytics = new Analytics();

