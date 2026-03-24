================================================================
FILE: frontend/src/components/retention/RetentionEngine.tsx
================================================================

// ============================================================
// Retention Engine — Phase 3
// Streak tracking, milestone system, progress visualization
// Push notification scheduling
// ============================================================

import React, { useEffect, useState } from "react";
import { useDevice } from "../../hooks/useDevice";
import { analytics } from "../../lib/analytics";

// ── TYPES ─────────────────────────────────────────────────────
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string | null;
  streakAtRisk: boolean;   // true if no log today and it's after 3pm
  weekActivity: boolean[]; // 7 bools, Mon–Sun
}

export interface Milestone {
  id: string;
  label: string;
  description: string;
  icon: string;
  threshold: number;
  unit: "days" | "workouts" | "streak" | "score";
  achieved: boolean;
  achievedAt?: string;
  progress: number; // 0–100
}

export const MILESTONES: Omit<Milestone, "achieved" | "achievedAt" | "progress">[] = [
  { id: "first_log",       label: "First Step",      description: "Log your first workout",        icon: "🏁", threshold: 1,  unit: "workouts" },
  { id: "week_streak",     label: "On a Roll",       description: "Log 7 days in a row",           icon: "🔥", threshold: 7,  unit: "streak"   },
  { id: "10_workouts",     label: "Getting Real",    description: "Complete 10 workouts",          icon: "💪", threshold: 10, unit: "workouts" },
  { id: "month_streak",    label: "Habit Formed",    description: "Log 30 days in a row",          icon: "⚡", threshold: 30, unit: "streak"   },
  { id: "piq_70",          label: "Rising Star",     description: "Reach a PIQ Score of 70",       icon: "⭐", threshold: 70, unit: "score"    },
  { id: "piq_85",          label: "Elite Performer", description: "Reach a PIQ Score of 85",       icon: "🏆", threshold: 85, unit: "score"    },
  { id: "50_workouts",     label: "Committed",       description: "Complete 50 workouts",          icon: "🎯", threshold: 50, unit: "workouts" },
  { id: "100_days",        label: "Century",         description: "100 days on PerformanceIQ",     icon: "💯", threshold: 100,unit: "days"     },
];

// ── STREAK CARD ───────────────────────────────────────────────
export const StreakCard: React.FC<{ streak: StreakData }> = ({ streak }) => {
  const { isMobile } = useDevice();
  const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${streak.streakAtRisk ? "#FAD7A0" : "#e8e6e0"}`,
        borderRadius: 12,
        padding: isMobile ? "14px 16px" : "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      {/* Streak number */}
      <div style={{ flexShrink: 0, textAlign: "center" }}>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 42, fontWeight: 900, color: "#E67E22", lineHeight: 1 }}>
          {streak.currentStreak}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#9494a8", textTransform: "uppercase", letterSpacing: ".06em" }}>
          day streak
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {/* Week dots */}
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          {streak.weekActivity.map((active, i) => (
            <div key={i} style={{ textAlign: "center", flex: 1 }}>
              <div
                style={{
                  width: "100%", aspectRatio: "1",
                  borderRadius: "50%",
                  background: active ? "#E67E22" : "#f0ede8",
                  transition: "background 200ms ease",
                }}
              />
              <div style={{ fontSize: 9, color: "#aaa", marginTop: 2 }}>{DAYS[i]}</div>
            </div>
          ))}
        </div>

        {/* At risk warning */}
        {streak.streakAtRisk && (
          <div style={{
            fontSize: 11, color: "#E67E22", fontWeight: 600,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <span>⚠️</span> Log today to keep your streak!
          </div>
        )}
        {!streak.streakAtRisk && streak.currentStreak > 0 && (
          <div style={{ fontSize: 11, color: "#27AE60", fontWeight: 600 }}>
            ✓ Logged today — streak safe
          </div>
        )}
      </div>

      {/* Best badge */}
      {streak.currentStreak === streak.longestStreak && streak.longestStreak >= 7 && (
        <div style={{
          background: "#FEF9EC", border: "1px solid #F5D97A",
          borderRadius: 6, padding: "4px 8px", flexShrink: 0,
          fontSize: 10, fontWeight: 700, color: "#B7770D",
        }}>
          🏆 Best
        </div>
      )}
    </div>
  );
};

// ── MILESTONE GRID ────────────────────────────────────────────
export const MilestoneGrid: React.FC<{ milestones: Milestone[]; onNew?: (m: Milestone) => void }> = ({
  milestones, onNew,
}) => {
  const [justAchieved, setJustAchieved] = useState<string | null>(null);
  const prevRef = React.useRef<Milestone[]>([]);

  // Detect newly achieved milestones
  useEffect(() => {
    const newlyDone = milestones.filter(m =>
      m.achieved && !prevRef.current.find(p => p.id === m.id)?.achieved
    );
    if (newlyDone.length > 0) {
      setJustAchieved(newlyDone[0].id);
      onNew?.(newlyDone[0]);
      analytics.track("milestone_achieved", { milestone_id: newlyDone[0].id });
      setTimeout(() => setJustAchieved(null), 3000);
    }
    prevRef.current = milestones;
  }, [milestones, onNew]);

  return (
    <div>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
        Milestones
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {milestones.map(m => (
          <MilestoneBadge key={m.id} milestone={m} isNew={justAchieved === m.id} />
        ))}
      </div>
    </div>
  );
};

const MilestoneBadge: React.FC<{ milestone: Milestone; isNew: boolean }> = ({ milestone: m, isNew }) => (
  <div
    title={`${m.label}: ${m.description}`}
    aria-label={`${m.label} — ${m.achieved ? "achieved" : `${m.progress}% complete`}`}
    style={{
      padding: "10px 6px",
      borderRadius: 10,
      textAlign: "center",
      border: `1.5px solid ${m.achieved ? "#E67E22" : "#e8e6e0"}`,
      background: m.achieved ? "#FEF9EC" : "#fafaf8",
      position: "relative",
      overflow: "hidden",
      transition: "all 200ms ease",
      animation: isNew ? "milestone-pop 500ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards" : "none",
    }}
  >
    <div style={{
      fontSize: 22,
      filter: m.achieved ? "none" : "grayscale(1) opacity(0.4)",
      transition: "filter 300ms ease",
    }}>
      {m.icon}
    </div>
    <div style={{
      fontSize: 9, fontWeight: 700, color: m.achieved ? "#B7770D" : "#aaa",
      marginTop: 4, lineHeight: 1.3,
    }}>
      {m.label}
    </div>
    {!m.achieved && m.progress > 0 && (
      <div style={{ height: 2, background: "#e8e6e0", borderRadius: 1, marginTop: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${m.progress}%`, background: "#E67E22", borderRadius: 1 }} />
      </div>
    )}
    {isNew && (
      <div style={{
        position: "absolute", inset: 0, borderRadius: 10,
        boxShadow: "inset 0 0 0 2px #E67E22",
        animation: "milestone-ring 600ms ease forwards",
      }} />
    )}
  </div>
);

// ── 30-DAY PROGRESS TREND ─────────────────────────────────────
export const ProgressTrend: React.FC<{
  data: Array<{ date: string; piqScore: number | null; logged: boolean }>;
  label?: string;
}> = ({ data, label = "30-Day PIQ Score Trend" }) => {
  const { isMobile } = useDevice();
  const w = isMobile ? 280 : 340;
  const h = 80;
  const p = 8;

  const values = data.map(d => d.piqScore ?? 0);
  const min = Math.min(...values.filter(v => v > 0), 40) - 5;
  const max = Math.max(...values, 70) + 5;

  const xs = data.map((_, i) => p + (i / (data.length - 1)) * (w - p * 2));
  const ys = data.map(d =>
    d.piqScore
      ? h - p - ((d.piqScore - min) / (max - min)) * (h - p * 2)
      : h - p
  );

  const points = xs
    .map((x, i) => data[i].piqScore ? `${x},${ys[i]}` : null)
    .filter(Boolean)
    .join(" ");

  const latest = data.filter(d => d.piqScore !== null).pop()?.piqScore ?? 0;
  const prev = data.filter(d => d.piqScore !== null).slice(-8, -1).reduce((a, d) => a + (d.piqScore ?? 0), 0) / 7;
  const delta = latest - Math.round(prev);

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 12, padding: isMobile ? "14px 16px" : "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#6b6b80", textTransform: "uppercase", letterSpacing: ".06em" }}>
          {label}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, color: "#1A5276", lineHeight: 1 }}>
            {latest}
          </div>
          {delta !== 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: delta > 0 ? "#27AE60" : "#C0392B" }}>
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
            </span>
          )}
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
        {/* Area fill */}
        {points && (
          <path
            d={`M ${xs[0]},${h} ${xs.map((x, i) => data[i].piqScore ? `L ${x},${ys[i]}` : "").filter(Boolean).join(" ")} L ${xs.filter((_, i) => data[i].piqScore)[xs.filter((_, i) => data[i].piqScore).length - 1]},${h} Z`}
            fill="rgba(26,82,118,0.08)"
          />
        )}
        {/* Line */}
        {points && <polyline points={points} fill="none" stroke="#1A5276" strokeWidth="2" strokeLinejoin="round" />}
        {/* Log dots */}
        {data.map((d, i) => d.logged && (
          <circle key={i} cx={xs[i]} cy={d.piqScore ? ys[i] : h - p} r={3}
            fill={d.piqScore ? "#1A5276" : "#e8e6e0"}
            stroke={d.piqScore ? "#fff" : "none"} strokeWidth="1.5"
          />
        ))}
      </svg>
    </div>
  );
};

// ── CSS for animations ────────────────────────────────────────
export const RetentionStyles = () => (
  <style>{`
    @keyframes milestone-pop {
      0%   { transform: scale(0.8); }
      60%  { transform: scale(1.12); }
      100% { transform: scale(1); }
    }
    @keyframes milestone-ring {
      0%   { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(1.3); }
    }
  `}</style>
);

