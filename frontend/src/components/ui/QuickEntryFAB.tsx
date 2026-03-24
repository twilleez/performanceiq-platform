================================================================
FILE: frontend/src/components/ui/QuickEntryFAB.tsx
================================================================

// ============================================================
// QuickEntryFAB — Phase 1
// 3-tap workout log from any screen
// Position-aware: sits above bottom nav + safe area
// Hides when overlapping content
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDevice } from "../../hooks/useDevice";
import { useUndo } from "../ui/UndoToast";
import { analytics } from "../../lib/analytics";
import { trainingService } from "../../lib/trainingService";

interface FABProps {
  onLogComplete?: (entry: QuickLogEntry) => void;
}

interface QuickLogEntry {
  type: "workout" | "wellness" | "nutrition";
  activityType?: string;
  duration?: number;  // minutes
  intensity?: number; // 1-10 RPE
  wellnessScore?: number;
  notes?: string;
  timestamp: string;
}

type FABState = "closed" | "menu" | "log-workout" | "log-wellness";

const ACTIVITY_TYPES = [
  { id: "run",      label: "Run",       icon: "🏃" },
  { id: "lift",     label: "Lift",      icon: "🏋️" },
  { id: "swim",     label: "Swim",      icon: "🏊" },
  { id: "cycle",    label: "Cycle",     icon: "🚴" },
  { id: "practice", label: "Practice",  icon: "⚽" },
  { id: "other",    label: "Other",     icon: "💪" },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90];
const RPE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const QuickEntryFAB: React.FC<FABProps> = ({ onLogComplete }) => {
  const { isMobile, isDesktop, navHeight, safeAreaInsets, fabOffset } = useDevice();
  const { pushUndo } = useUndo();
  const [fabState, setFabState] = useState<FABState>("closed");
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [entry, setEntry] = useState<Partial<QuickLogEntry>>({});
  const [fabVisible, setFabVisible] = useState(true);
  const sheetRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const fabRef = useRef<HTMLButtonElement>(null);

  // Hide FAB on scroll down, show on scroll up (mobile only)
  useEffect(() => {
    if (!isMobile) return;
    const handleScroll = () => {
      const currentY = window.scrollY;
      const diff = currentY - lastScrollY.current;
      if (diff > 8) setFabVisible(false);
      else if (diff < -8) setFabVisible(true);
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile]);

  // Close sheet on backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setFabState("closed");
      setStep(0);
      setEntry({});
    }
  }, []);

  // Handle escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fabState !== "closed") {
        setFabState("closed");
        setStep(0);
        fabRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [fabState]);

  const openMenu = () => {
    setFabState("menu");
    analytics.track("fab_opened");
  };

  const startWorkoutLog = () => {
    setFabState("log-workout");
    setStep(0);
    setEntry({ type: "workout", timestamp: new Date().toISOString() });
    analytics.track("fab_start_workout_log");
  };

  const startWellnessLog = () => {
    setFabState("log-wellness");
    setStep(0);
    setEntry({ type: "wellness", timestamp: new Date().toISOString() });
    analytics.track("fab_start_wellness_log");
  };

  const handleWorkoutNext = (field: Partial<QuickLogEntry>) => {
    const updated = { ...entry, ...field };
    setEntry(updated);
    if (step < 2) {
      setStep(s => (s + 1) as 0 | 1 | 2);
    } else {
      handleSubmit(updated);
    }
  };

  const handleSubmit = async (finalEntry: Partial<QuickLogEntry>) => {
    const complete = { ...finalEntry, timestamp: new Date().toISOString() } as QuickLogEntry;

    // Optimistic: close immediately
    setFabState("closed");
    setStep(0);
    setEntry({});

    // Push undo window
    const savedId = `log-${Date.now()}`;
    pushUndo({
      id: savedId,
      label: `${complete.type === "workout" ? "Workout" : "Wellness check-in"} logged`,
      severity: "default",
      onUndo: async () => {
        await trainingService.deleteLog(savedId);
        analytics.track("fab_log_undone", { type: complete.type });
      },
      onCommit: async () => {
        await trainingService.saveLog(savedId, complete);
        analytics.track("fab_log_committed", { type: complete.type, activity: complete.activityType, duration: complete.duration });
      },
    });

    onLogComplete?.(complete);
  };

  const bottomPosition = isMobile
    ? fabOffset + "px"
    : isDesktop
    ? "32px"
    : "24px";

  return (
    <>
      {/* FAB Button */}
      <button
        ref={fabRef}
        className="piq-fab"
        aria-label="Quick log — tap to log a workout or wellness check-in"
        aria-expanded={fabState !== "closed"}
        aria-haspopup="dialog"
        onClick={fabState === "closed" ? openMenu : () => setFabState("closed")}
        style={{
          bottom: bottomPosition,
          transform: fabVisible ? "scale(1)" : "scale(0) translateY(20px)",
          opacity: fabVisible ? 1 : 0,
          transition: "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease, box-shadow 150ms ease, bottom 300ms ease",
          background: fabState !== "closed" ? "#C0392B" : "var(--theme-primary)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            fontSize: 22,
            transition: "transform 200ms ease",
            transform: fabState !== "closed" ? "rotate(45deg)" : "rotate(0deg)",
            display: "block",
          }}
        >
          {fabState !== "closed" ? "+" : "+"}
        </span>
      </button>

      {/* Sheet */}
      {fabState !== "closed" && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(10,10,20,0.5)",
            zIndex: 300,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: isMobile ? "stretch" : "flex-end",
          }}
          onClick={handleBackdropClick}
        >
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={fabState === "menu" ? "Quick log options" : "Log entry"}
            style={{
              background: "var(--bg-card)",
              width: isMobile ? "100%" : "360px",
              maxHeight: "80dvh",
              borderRadius: isMobile ? "20px 20px 0 0" : "14px",
              padding: isMobile ? `20px 20px calc(20px + env(safe-area-inset-bottom))` : "20px",
              overflowY: "auto",
              animation: "sheet-up 250ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
              marginBottom: isMobile ? 0 : bottomPosition,
              marginRight: isDesktop ? "max(24px, env(safe-area-inset-right))" : 0,
            }}
            onClick={e => e.stopPropagation()}
          >
            {fabState === "menu" && (
              <MenuOptions onWorkout={startWorkoutLog} onWellness={startWellnessLog} />
            )}
            {fabState === "log-workout" && (
              <WorkoutLogSteps step={step} entry={entry} onNext={handleWorkoutNext} onBack={() => { if (step > 0) setStep(s => (s - 1) as 0 | 1 | 2); else setFabState("menu"); }} />
            )}
            {fabState === "log-wellness" && (
              <WellnessLogStep entry={entry} onSubmit={handleSubmit} onBack={() => setFabState("menu")} />
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes sheet-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
};

// ── MENU OPTIONS (tap 1) ──────────────────────────────────────
const MenuOptions: React.FC<{
  onWorkout: () => void;
  onWellness: () => void;
}> = ({ onWorkout, onWellness }) => (
  <div>
    <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 16 }}>
      Quick Log
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {[
        { label: "Workout", icon: "🏋️", description: "Log activity + intensity", action: onWorkout },
        { label: "Wellness", icon: "💚", description: "Check in how you feel", action: onWellness },
      ].map(opt => (
        <button
          key={opt.label}
          onClick={opt.action}
          style={{
            padding: "16px 14px", borderRadius: 10, textAlign: "left", cursor: "pointer",
            border: "1px solid var(--border-default)", background: "#fff",
            transition: "all 150ms ease", minHeight: 44,
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--theme-primary)")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-default)")}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>{opt.icon}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>{opt.label}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{opt.description}</div>
        </button>
      ))}
    </div>
  </div>
);

// ── WORKOUT LOG 3-STEP (taps 2–4) ────────────────────────────
const WorkoutLogSteps: React.FC<{
  step: 0 | 1 | 2;
  entry: Partial<QuickLogEntry>;
  onNext: (v: Partial<QuickLogEntry>) => void;
  onBack: () => void;
}> = ({ step, entry, onNext, onBack }) => {
  const steps = ["Activity", "Duration", "Intensity"];

  return (
    <div>
      {/* Mini progress */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? "var(--theme-primary)" : "var(--border-default)", transition: "background 200ms" }} />
        ))}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
        {steps[step]}
      </div>

      {step === 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 12 }}>
          {ACTIVITY_TYPES.map(a => (
            <button
              key={a.id}
              onClick={() => onNext({ activityType: a.id })}
              style={{
                padding: "12px 8px", borderRadius: 8, textAlign: "center", cursor: "pointer",
                border: `2px solid ${entry.activityType === a.id ? "var(--theme-primary)" : "var(--border-default)"}`,
                background: entry.activityType === a.id ? "var(--bg-raised)" : "#fff",
                minHeight: 44,
              }}
            >
              <div style={{ fontSize: 22 }}>{a.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>{a.label}</div>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {DURATION_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => onNext({ duration: d })}
              style={{
                flex: "0 0 calc(33% - 4px)", height: 44, borderRadius: 8, cursor: "pointer",
                border: `2px solid ${entry.duration === d ? "var(--theme-primary)" : "var(--border-default)"}`,
                background: entry.duration === d ? "var(--theme-primary)" : "#fff",
                color: entry.duration === d ? "#fff" : "var(--text-primary)",
                fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700,
              }}
            >
              {d}m
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, marginTop: 4 }}>
            RPE: Rate of Perceived Exertion (1 = easy, 10 = max effort)
          </p>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {RPE_OPTIONS.map(r => {
              const color = r <= 3 ? "#27AE60" : r <= 6 ? "#E67E22" : r <= 8 ? "#C0392B" : "#922B21";
              return (
                <button
                  key={r}
                  onClick={() => onNext({ intensity: r })}
                  style={{
                    flex: "0 0 calc(10% - 4px)", height: 44, borderRadius: 8, cursor: "pointer",
                    border: `2px solid ${entry.intensity === r ? color : "var(--border-default)"}`,
                    background: entry.intensity === r ? color : "#fff",
                    color: entry.intensity === r ? "#fff" : "var(--text-primary)",
                    fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700,
                  }}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={onBack}
        style={{ marginTop: 16, background: "none", border: "none", fontSize: 13, color: "var(--text-muted)", cursor: "pointer", minHeight: 32 }}
      >
        ← Back
      </button>
    </div>
  );
};

// ── WELLNESS LOG ───────────────────────────────────────────────
const WellnessLogStep: React.FC<{
  entry: Partial<QuickLogEntry>;
  onSubmit: (e: Partial<QuickLogEntry>) => void;
  onBack: () => void;
}> = ({ entry, onSubmit, onBack }) => {
  const [score, setScore] = useState<number | null>(null);
  const SCORES = [
    { v: 1, label: "Awful",  icon: "😫", color: "#C0392B" },
    { v: 3, label: "Poor",   icon: "😕", color: "#E67E22" },
    { v: 5, label: "Ok",     icon: "😐", color: "#B7770D" },
    { v: 7, label: "Good",   icon: "🙂", color: "#27AE60" },
    { v: 9, label: "Great",  icon: "😄", color: "#1A7A4A" },
  ];

  return (
    <div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
        How are you feeling?
      </div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
        Takes 5 seconds — this data powers your readiness score.
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        {SCORES.map(s => (
          <button
            key={s.v}
            onClick={() => { setScore(s.v); onSubmit({ ...entry, wellnessScore: s.v }); }}
            style={{
              flex: 1, padding: "12px 4px", borderRadius: 8, textAlign: "center", cursor: "pointer",
              border: `2px solid ${score === s.v ? s.color : "var(--border-default)"}`,
              background: score === s.v ? s.color + "15" : "#fff",
              transition: "all 150ms ease", minHeight: 44,
            }}
          >
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div style={{ fontSize: 10, color: score === s.v ? s.color : "var(--text-muted)", fontWeight: 600, marginTop: 4 }}>{s.label}</div>
          </button>
        ))}
      </div>
      <button onClick={onBack} style={{ marginTop: 16, background: "none", border: "none", fontSize: 13, color: "var(--text-muted)", cursor: "pointer", minHeight: 32 }}>
        ← Back
      </button>
    </div>
  );
};
