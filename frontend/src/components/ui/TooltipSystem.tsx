================================================================
FILE: frontend/src/components/ui/TooltipSystem.tsx
================================================================

// ============================================================
// Tooltip System — Phase 1
// Registry of every annotatable element on the platform
// Contextual help, dismissal tracking, search sidebar
// ============================================================

import React, {
  createContext, useContext, useState, useRef,
  useCallback, useEffect, useId, type ReactNode,
} from "react";
import { useDevice } from "../../hooks/useDevice";
import { analytics } from "../../lib/analytics";

// ── TOOLTIP REGISTRY ─────────────────────────────────────────
// Every module, nav tab, and data field must have an entry here

export const TOOLTIP_REGISTRY: Record<string, TooltipContent> = {
  // ── NAV TABS ──────────────────────────────────────────────
  "nav.dashboard": {
    title: "Dashboard",
    body: "Your home base. Shows your PIQ Score, today's alerts, streak, and quick-access to recent activity.",
    example: "Check here first every day to see if you're on track.",
    tags: ["navigation", "home"],
  },
  "nav.training": {
    title: "Training",
    body: "Everything about your workouts — log sessions, build workout templates, and view your season plan.",
    example: "After practice, tap Training → Log Workout to record your session.",
    tags: ["navigation", "workouts", "logging"],
  },
  "nav.body": {
    title: "Body",
    body: "Track nutrition, recovery, and body metrics like weight and sleep quality.",
    example: "Log your meals here and see your macro totals for the day.",
    tags: ["navigation", "nutrition", "recovery"],
  },
  "nav.insights": {
    title: "Insights",
    body: "Analytics, trend charts, and shareable reports. Coaches use this to review team performance.",
    example: "Coaches: go here to generate a progress report to share with parents.",
    tags: ["navigation", "analytics", "reports"],
  },

  // ── PIQ SCORE ─────────────────────────────────────────────
  "piq.score": {
    title: "PIQ Score",
    body: "Your overall performance intelligence score, calculated from four factors: Training Consistency (35%), Readiness (30%), Compliance (25%), and Load Management (10%). Scored 0–100.",
    example: "A score of 78 means you're training consistently, feeling recovered, and managing load well.",
    tags: ["score", "formula", "performance"],
    learnMoreUrl: "/help/piq-score",
  },
  "piq.consistency": {
    title: "Consistency (35%)",
    body: "How regularly you complete planned training sessions. Calculated over the past 28 days.",
    example: "Logging 4 of 5 planned sessions per week gives you ~80% consistency.",
    tags: ["score", "consistency"],
  },
  "piq.readiness": {
    title: "Readiness (30%)",
    body: "How recovered and prepared your body is based on your wellness check-ins, sleep quality, and HRV trends.",
    example: "Log your wellness score daily to keep this accurate.",
    tags: ["score", "readiness", "wellness"],
  },
  "piq.compliance": {
    title: "Compliance (25%)",
    body: "How closely your actual training matches what your coach prescribed. Only applies to coached athletes.",
    example: "Completing a prescribed 45-min tempo run at the right intensity = 100% compliance for that session.",
    tags: ["score", "compliance", "coach"],
  },
  "piq.load": {
    title: "Load Management (10%)",
    body: "Whether your training load is building at a safe rate. Measures Acute:Chronic Workload Ratio (ACWR). Ideal range: 0.8–1.3.",
    example: "If your ACWR goes above 1.5, your injury risk increases — the platform will alert you.",
    tags: ["score", "load", "acwr", "injury"],
  },

  // ── ACWR ──────────────────────────────────────────────────
  "acwr": {
    title: "ACWR — Acute:Chronic Workload Ratio",
    body: "Compares your training load over the last 7 days (acute) to your average over the last 28 days (chronic). The 'sweet spot' is 0.8–1.3.",
    example: "ACWR 0.9 = well-prepared. ACWR 1.6 = spiking too fast — high injury risk zone.",
    tags: ["load", "injury", "science", "formula"],
    learnMoreUrl: "/help/acwr",
  },

  // ── PERIODIZATION ─────────────────────────────────────────
  "periodization.overview": {
    title: "Season Plan (Periodization)",
    body: "A structured approach to planning your training year in phases — building fitness progressively so you peak at the right time.",
    example: "A swimmer might have: Base Phase (Sept–Nov) → Build Phase (Dec–Feb) → Peak Phase (Mar) → Competition (Apr).",
    tags: ["periodization", "season", "planning"],
  },
  "periodization.macrocycle": {
    title: "Macrocycle",
    body: "The full training year or season — your biggest time block. Usually 3–12 months.",
    example: "A high school track athlete's macrocycle runs from August to June.",
    tags: ["periodization", "macrocycle"],
  },
  "periodization.mesocycle": {
    title: "Mesocycle",
    body: "A medium-length training block within the season — usually 3–6 weeks with a specific focus like 'strength' or 'speed'.",
    example: "A 4-week mesocycle might focus on building aerobic base before adding intensity.",
    tags: ["periodization", "mesocycle"],
  },
  "periodization.microcycle": {
    title: "Microcycle",
    body: "A single training week. Contains your day-by-day workout plan including rest days.",
    example: "Mon: Speed · Tue: Tempo · Wed: Rest · Thu: Strength · Fri: Easy · Sat: Long run · Sun: Rest",
    tags: ["periodization", "microcycle", "weekly"],
  },
  "periodization.taper": {
    title: "Taper",
    body: "A planned reduction in training volume (usually 1–3 weeks) before a major competition, so your body recovers and you peak on race day.",
    example: "If your championship is March 15th, your taper week starts March 8th — lower volume, maintain intensity.",
    tags: ["periodization", "taper", "competition"],
  },
  "periodization.deload": {
    title: "Deload Week",
    body: "A scheduled lighter week (usually every 3–4 weeks) where volume drops 30–50% to allow recovery and adaptation.",
    example: "3 hard weeks followed by 1 deload week prevents accumulated fatigue and reduces injury risk.",
    tags: ["periodization", "deload", "recovery"],
  },

  // ── NUTRITION ─────────────────────────────────────────────
  "nutrition.macros": {
    title: "Macronutrients",
    body: "The three main fuel sources: Protein (muscle repair), Carbohydrates (energy), and Fat (hormones, sustained energy). Measured in grams.",
    example: "An 150lb athlete might target: 150g protein · 250g carbs · 60g fat on a training day.",
    tags: ["nutrition", "macros", "protein", "carbs", "fat"],
  },
  "nutrition.calories": {
    title: "Calories",
    body: "Total energy intake. Protein and carbs have 4 calories per gram; fat has 9 calories per gram.",
    example: "Eating 150g protein + 250g carbs + 60g fat = 2,140 calories.",
    tags: ["nutrition", "calories"],
  },
  "nutrition.mealType": {
    title: "Meal Type",
    body: "Categorizes when you ate: Breakfast, Lunch, Dinner, Snack, or Supplement. Helps track eating patterns around training.",
    example: "Log a pre-workout meal as 'Snack' and your recovery protein as 'Supplement'.",
    tags: ["nutrition", "meal"],
  },

  // ── WELLNESS ──────────────────────────────────────────────
  "wellness.score": {
    title: "Wellness Score",
    body: "Your daily self-reported readiness on a 1–10 scale. Factors in how you physically feel, sleep quality, and mood. Drives your Readiness component in the PIQ Score.",
    example: "1 = Exhausted/sick. 5 = Average. 10 = Best you've ever felt.",
    tags: ["wellness", "readiness", "daily"],
  },
  "wellness.hrv": {
    title: "Heart Rate Variability (HRV)",
    body: "The variation in time between your heartbeats. Higher HRV generally indicates better recovery. Synced from Apple Health or Garmin if connected.",
    example: "Your baseline HRV might be 65ms. If it drops to 45ms, your body is signaling it needs recovery.",
    tags: ["wellness", "hrv", "recovery", "science"],
  },
  "wellness.rpe": {
    title: "RPE — Rate of Perceived Exertion",
    body: "How hard a workout felt on a scale of 1–10. Used to calculate session load (RPE × duration in minutes).",
    example: "A 60-minute run at RPE 7 = 420 AU (arbitrary units) of training load.",
    tags: ["wellness", "rpe", "intensity", "load"],
  },

  // ── ANALYTICS ─────────────────────────────────────────────
  "analytics.trend": {
    title: "Trend Chart",
    body: "Shows how a metric changes over time. Green = improving, Red = declining. Select date range to zoom in or out.",
    example: "A rising PIQ Score trend over 4 weeks means your training system is working.",
    tags: ["analytics", "chart", "trend"],
  },
  "analytics.team": {
    title: "Team Overview",
    body: "Coach-only view. Shows all athletes' PIQ Scores, compliance rates, and streak status in one table.",
    example: "Sort by PIQ Score to quickly spot which athletes need check-ins this week.",
    tags: ["analytics", "team", "coach"],
  },
  "analytics.acwrBand": {
    title: "ACWR Safe Zone",
    body: "The green band on the load chart shows the safe training zone (0.8–1.3 ACWR). Points outside this zone are flagged.",
    example: "A red dot above 1.5 = spike warning. A grey dot below 0.8 = undertraining risk.",
    tags: ["analytics", "acwr", "load", "injury"],
  },

  // ── REPORTS ───────────────────────────────────────────────
  "reports.generate": {
    title: "Generate Report",
    body: "Creates a branded PDF progress report for a specific athlete over a date range. Can be sent via shareable link — no login required for parents.",
    example: "Select athlete → date range → metrics to include → Share link. Parent opens PDF on any device.",
    tags: ["reports", "pdf", "parent", "share"],
  },
  "reports.linkExpiry": {
    title: "Link Expiry",
    body: "Choose how long the shareable report link stays active: 7 days, 30 days, 90 days, or permanent.",
    example: "Select 'Permanent' if you want parents to bookmark the link and come back to it.",
    tags: ["reports", "link", "expiry"],
  },

  // ── STREAK / RETENTION ────────────────────────────────────
  "retention.streak": {
    title: "Training Streak",
    body: "The number of consecutive days you've logged at least one workout or wellness check-in. Resets if you miss a full day.",
    example: "Log something every day — even a quick wellness check-in counts to maintain your streak.",
    tags: ["streak", "retention", "habit"],
  },
  "retention.milestone": {
    title: "Milestones",
    body: "Achievements unlocked when you hit training landmarks — your first log, a 7-day streak, 10 workouts completed, and more.",
    example: "Unlock 'On a Roll' after 7 consecutive days of logging.",
    tags: ["milestone", "achievement", "retention"],
  },
};

// ── TYPES ─────────────────────────────────────────────────────
interface TooltipContent {
  title: string;
  body: string;
  example?: string;
  tags: string[];
  learnMoreUrl?: string;
}

interface TooltipContextValue {
  dismissed: Set<string>;
  dismiss: (id: string) => void;
  isDismissed: (id: string) => boolean;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

// ── PROVIDER ──────────────────────────────────────────────────
export const TooltipProvider: React.FC<{
  children: ReactNode;
  userId?: string;
}> = ({ children, userId }) => {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`piq_tooltips_dismissed_${userId ?? "anon"}`);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch { return new Set(); }
  });

  const dismiss = useCallback((id: string) => {
    setDismissed(prev => {
      const next = new Set(prev).add(id);
      localStorage.setItem(
        `piq_tooltips_dismissed_${userId ?? "anon"}`,
        JSON.stringify([...next])
      );
      analytics.track("tooltip_dismissed", { tooltip_id: id });
      return next;
    });
  }, [userId]);

  const isDismissed = useCallback((id: string) => dismissed.has(id), [dismissed]);

  return (
    <TooltipContext.Provider value={{ dismissed, dismiss, isDismissed }}>
      {children}
    </TooltipContext.Provider>
  );
};

// ── TOOLTIP TRIGGER ───────────────────────────────────────────
interface TooltipProps {
  id: string;         // key in TOOLTIP_REGISTRY
  placement?: "top" | "bottom" | "left" | "right" | "auto";
  children?: ReactNode;
  inline?: boolean;   // render as inline ? icon next to content
}

export const Tooltip: React.FC<TooltipProps> = ({
  id, placement = "auto", children, inline = false,
}) => {
  const ctx = useContext(TooltipContext);
  const { isMobile } = useDevice();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const content = TOOLTIP_REGISTRY[id];

  if (!content) return <>{children}</>;

  const handleOpen = () => {
    analytics.track("tooltip_shown", { tooltip_id: id });
    setOpen(true);
    if (isMobile) return; // mobile uses bottom sheet, no positioning needed

    // Calculate panel position
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const panelW = 280;
    const panelH = 180;

    let top = rect.bottom + 8;
    let left = rect.left - panelW / 2 + rect.width / 2;

    // Keep within viewport
    left = Math.max(8, Math.min(left, window.innerWidth - panelW - 8));
    if (top + panelH > window.innerHeight - 16) {
      top = rect.top - panelH - 8; // flip to above
    }
    setPos({ top, left });
  };

  const handleClose = () => setOpen(false);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node) &&
          !triggerRef.current?.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const trigger = (
    <button
      ref={triggerRef}
      aria-label={`Help: ${content.title}`}
      aria-expanded={open}
      aria-controls={tooltipId}
      onClick={handleOpen}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: inline ? 16 : 20,
        height: inline ? 16 : 20,
        minHeight: "auto",
        minWidth: "auto",
        borderRadius: "50%",
        border: "1.5px solid currentColor",
        background: "transparent",
        fontSize: inline ? 10 : 11,
        fontWeight: 700,
        color: "var(--text-muted)",
        cursor: "pointer",
        flexShrink: 0,
        lineHeight: 1,
        padding: 0,
        transition: "color 150ms ease, border-color 150ms ease",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = "var(--theme-primary)";
        e.currentTarget.style.borderColor = "var(--theme-primary)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = "var(--text-muted)";
        e.currentTarget.style.borderColor = "var(--text-muted)";
      }}
    >
      ?
    </button>
  );

  const panel = open && (
    isMobile
      ? <TooltipSheet content={content} onClose={handleClose} id={tooltipId} />
      : <TooltipPanel content={content} onClose={handleClose} id={tooltipId} ref={panelRef} style={{ top: pos.top, left: pos.left, position: "fixed" }} />
  );

  if (inline) {
    return (
      <>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          {children}
          {trigger}
        </span>
        {panel}
      </>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {children}
      {trigger}
      {panel}
    </div>
  );
};

// ── DESKTOP TOOLTIP PANEL ─────────────────────────────────────
const TooltipPanel = React.forwardRef<
  HTMLDivElement,
  { content: TooltipContent; onClose: () => void; id: string; style?: React.CSSProperties }
>(({ content, onClose, id, style }, ref) => (
  <div
    ref={ref}
    id={id}
    role="tooltip"
    style={{
      ...style,
      width: 280,
      background: "#1a1a2e",
      color: "#e8eaf0",
      borderRadius: 10,
      padding: "14px 16px",
      boxShadow: "0 8px 32px rgba(0,0,0,.24)",
      zIndex: 600,
      animation: "tooltip-in 150ms ease forwards",
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{content.title}</div>
      <button
        onClick={onClose}
        aria-label="Close help"
        style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0, minHeight: "auto", minWidth: "auto" }}
      >×</button>
    </div>
    <p style={{ fontSize: 12, color: "rgba(255,255,255,.7)", lineHeight: 1.65, marginBottom: content.example ? 10 : 0 }}>
      {content.body}
    </p>
    {content.example && (
      <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 6, padding: "8px 10px", fontSize: 11, color: "rgba(255,255,255,.5)", lineHeight: 1.5 }}>
        <strong style={{ color: "rgba(255,255,255,.6)" }}>Example: </strong>{content.example}
      </div>
    )}
    <style>{`
      @keyframes tooltip-in { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
    `}</style>
  </div>
));
TooltipPanel.displayName = "TooltipPanel";

// ── MOBILE TOOLTIP SHEET ──────────────────────────────────────
const TooltipSheet: React.FC<{ content: TooltipContent; onClose: () => void; id: string }> = ({
  content, onClose, id,
}) => (
  <div
    style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,.5)", zIndex: 600, display: "flex", alignItems: "flex-end" }}
    onClick={e => e.target === e.currentTarget && onClose()}
  >
    <div
      id={id}
      role="tooltip"
      style={{
        background: "#fff",
        width: "100%",
        borderRadius: "20px 20px 0 0",
        padding: `20px 20px calc(20px + env(safe-area-inset-bottom))`,
        animation: "sheet-up 250ms cubic-bezier(0.34,1.56,0.64,1) forwards",
      }}
    >
      <div style={{ width: 36, height: 4, borderRadius: 2, background: "#e8e6e0", margin: "0 auto 16px" }} />
      <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e", marginBottom: 10 }}>{content.title}</div>
      <p style={{ fontSize: 14, color: "#4a4a62", lineHeight: 1.7, marginBottom: content.example ? 12 : 0 }}>
        {content.body}
      </p>
      {content.example && (
        <div style={{ background: "#f0f8ff", border: "1px solid #b4d4f0", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#1A5276", lineHeight: 1.6 }}>
          <strong>Example: </strong>{content.example}
        </div>
      )}
      <button
        onClick={onClose}
        style={{ marginTop: 16, width: "100%", height: 44, borderRadius: 8, border: "none", background: "#f0ede8", fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#6b6b80", cursor: "pointer" }}
      >
        Got it
      </button>
    </div>
  </div>
);

// ── HELP SIDEBAR (⌘K) ─────────────────────────────────────────
interface HelpSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpSidebar: React.FC<HelpSidebarProps> = ({ isOpen, onClose }) => {
  const { isMobile } = useDevice();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const results = query.length >= 2
    ? Object.entries(TOOLTIP_REGISTRY).filter(([, c]) =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.body.toLowerCase().includes(query.toLowerCase()) ||
        c.tags.some(t => t.includes(query.toLowerCase()))
      ).slice(0, 8)
    : Object.entries(TOOLTIP_REGISTRY).slice(0, 12);

  if (!isOpen) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,.5)", zIndex: 350, display: "flex", justifyContent: isMobile ? "stretch" : "flex-end" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-label="Help and documentation"
        style={{
          background: "#fff",
          width: isMobile ? "100%" : 360,
          height: "100%",
          overflowY: "auto",
          boxShadow: "-4px 0 24px rgba(0,0,0,.12)",
          padding: "20px 20px env(safe-area-inset-bottom)",
          animation: `slide-in-right 250ms ease forwards`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>Help</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#aaa", cursor: "pointer", minHeight: 44, minWidth: 44 }}>×</button>
        </div>

        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search help topics..."
          style={{
            width: "100%", height: 44, border: "1px solid #e8e6e0", borderRadius: 8,
            padding: "0 14px", fontFamily: "var(--font-body)", fontSize: 15,
            color: "#1a1a2e", marginBottom: 16, outline: "none",
          }}
          onFocus={e => (e.target.style.borderColor = "var(--theme-primary)")}
          onBlur={e => (e.target.style.borderColor = "#e8e6e0")}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {results.map(([id, content]) => (
            <div
              key={id}
              style={{ padding: "12px 14px", borderRadius: 8, cursor: "pointer", transition: "background 150ms" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f5f3ef")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>{content.title}</div>
              <div style={{ fontSize: 12, color: "#6b6b80", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {content.body}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                {content.tags.slice(0, 3).map(t => (
                  <span key={t} style={{ fontSize: 10, color: "#aaa", background: "#f0ede8", padding: "2px 6px", borderRadius: 4 }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {results.length === 0 && query.length >= 2 && (
          <div style={{ textAlign: "center", color: "#aaa", fontSize: 13, padding: "32px 0" }}>
            No results for "{query}"<br />
            <span style={{ fontSize: 12 }}>Try: score, nutrition, streak, coach, analytics</span>
          </div>
        )}
      </div>
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

