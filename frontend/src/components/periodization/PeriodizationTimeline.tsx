================================================================
FILE: frontend/src/components/periodization/PeriodizationTimeline.tsx
================================================================

// ============================================================
// Periodization — Phase 4
// Visual season timeline + plain-language setup wizard
// Zero jargon on first encounter; tooltips for all terms
// ============================================================

import React, { useState, useRef, useEffect } from "react";
import { useDevice, useFocalPoint } from "../../hooks/useDevice";
import { Tooltip } from "../ui/TooltipSystem";
import { analytics } from "../../lib/analytics";

// ── TYPES ─────────────────────────────────────────────────────
type PhaseType = "base" | "build" | "peak" | "competition" | "recovery" | "transition";

interface SeasonPhase {
  id: string;
  type: PhaseType;
  label: string;
  startWeek: number;  // relative to season start
  durationWeeks: number;
  intensity: number;  // 1–10
  volume: number;     // 1–10
  keyFocus: string;
  color: string;
}

interface SeasonPlan {
  id: string;
  sport: string;
  seasonStartDate: string;
  targetCompetitionDate: string;
  totalWeeks: number;
  phases: SeasonPhase[];
  createdAt: string;
}

const PHASE_CONFIG: Record<PhaseType, {
  label: string; color: string; bg: string;
  plainLabel: string;         // no jargon
  description: string;
  intensityLevel: string;
  volumeLevel: string;
}> = {
  base:        { label: "Base", color: "#1E8449", bg: "#EAFAF1", plainLabel: "Foundation Building", description: "Build your aerobic engine and strength foundation. Lower intensity, higher volume. Think of this as laying the groundwork.", intensityLevel: "Low–Moderate", volumeLevel: "High" },
  build:       { label: "Build", color: "#1A5276", bg: "#EBF5FB", plainLabel: "Getting Stronger", description: "Increase intensity as your base improves. Add sport-specific work. This is where fitness gains compound.", intensityLevel: "Moderate–High", volumeLevel: "Moderate–High" },
  peak:        { label: "Peak", color: "#B7770D", bg: "#FEF9EC", plainLabel: "Sharpening Up", description: "High intensity, lower volume. Your fitness is built — now sharpen it. Quality over quantity.", intensityLevel: "High", volumeLevel: "Moderate" },
  competition: { label: "Competition", color: "#C0392B", bg: "#FDECEA", plainLabel: "Race / Game Season", description: "Maintain fitness while performing. Recovery between events is critical.", intensityLevel: "Variable", volumeLevel: "Low–Moderate" },
  recovery:    { label: "Recovery", color: "#8E44AD", bg: "#F4ECF7", plainLabel: "Rest & Recover", description: "Active recovery or full rest. Let adaptations set in. Don't skip this.", intensityLevel: "Very Low", volumeLevel: "Very Low" },
  transition:  { label: "Transition", color: "#5D6D7E", bg: "#F2F3F4", plainLabel: "Off-Season", description: "Between macrocycles. Unstructured activity. Mental and physical refresh.", intensityLevel: "Low", volumeLevel: "Low" },
};

// ── WIZARD ────────────────────────────────────────────────────
type WizardStep = 0 | 1 | 2 | 3;

interface WizardState {
  sport: string;
  seasonStart: string;
  competitionDate: string;
  primaryGoal: string;
}

export const PeriodizationWizard: React.FC<{
  onComplete: (plan: SeasonPlan) => void;
  onSkip: () => void;
}> = ({ onComplete, onSkip }) => {
  const { isMobile } = useDevice();
  const { setFocal, jumpToFocal } = useFocalPoint();
  const [step, setStep] = useState<WizardStep>(0);
  const [state, setState] = useState<WizardState>({
    sport: "", seasonStart: "", competitionDate: "", primaryGoal: "",
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      setFocal(containerRef.current);
      jumpToFocal({ behavior: "smooth", highlightDuration: 0 });
    }
    analytics.track("periodization_wizard_step", { step });
  }, [step]);

  const generatePlan = (): SeasonPlan => {
    const start = new Date(state.seasonStart);
    const comp  = new Date(state.competitionDate);
    const totalWeeks = Math.max(12, Math.round((comp.getTime() - start.getTime()) / (7 * 86400000)));

    const phases: SeasonPhase[] = [];
    const base = Math.round(totalWeeks * 0.35);
    const build = Math.round(totalWeeks * 0.30);
    const peak  = Math.round(totalWeeks * 0.15);
    const comp_ = Math.round(totalWeeks * 0.15);
    const rec   = totalWeeks - base - build - peak - comp_;

    phases.push({ id: "base",  type: "base",        label: "Foundation", startWeek: 0,               durationWeeks: base,  intensity: 4, volume: 8, keyFocus: "Aerobic base + strength foundation", color: PHASE_CONFIG.base.color });
    phases.push({ id: "build", type: "build",       label: "Build",      startWeek: base,             durationWeeks: build, intensity: 7, volume: 7, keyFocus: "Sport-specific fitness gains",       color: PHASE_CONFIG.build.color });
    phases.push({ id: "peak",  type: "peak",        label: "Peak",       startWeek: base + build,     durationWeeks: peak,  intensity: 9, volume: 5, keyFocus: "Sharpen speed and power",            color: PHASE_CONFIG.peak.color });
    phases.push({ id: "comp",  type: "competition", label: "Season",     startWeek: base+build+peak,  durationWeeks: comp_, intensity: 8, volume: 4, keyFocus: "Perform and recover",                color: PHASE_CONFIG.competition.color });
    if (rec > 0) {
      phases.push({ id: "rec", type: "recovery",    label: "Recovery",   startWeek: base+build+peak+comp_, durationWeeks: rec, intensity: 2, volume: 2, keyFocus: "Rest and absorb adaptations", color: PHASE_CONFIG.recovery.color });
    }

    return {
      id: `plan-${Date.now()}`, sport: state.sport,
      seasonStartDate: state.seasonStart,
      targetCompetitionDate: state.competitionDate,
      totalWeeks, phases, createdAt: new Date().toISOString(),
    };
  };

  const SPORTS = ["Track & Field", "Swimming", "Basketball", "Football", "Soccer", "Cross Country", "Wrestling", "Baseball", "Volleyball", "Tennis", "Other"];
  const GOALS = ["Peak for championship", "Build overall fitness", "Reduce injury risk", "Improve specific event performance", "First season on this platform"];

  const canProceed = [
    !!state.sport,
    !!state.seasonStart,
    !!state.competitionDate,
    true,
  ];

  return (
    <div ref={containerRef} style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px" }}>
      {/* Step progress */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
        {["Sport", "Season Start", "Competition", "Confirm"].map((s, i) => (
          <div key={s} style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              height: 4, borderRadius: 2, marginBottom: 6,
              background: i <= step ? "var(--theme-primary)" : "var(--border-default)",
              transition: "background 300ms ease",
            }} />
            <div style={{ fontSize: 10, color: i <= step ? "var(--theme-primary)" : "var(--text-muted)", fontWeight: i === step ? 700 : 400 }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Step 0: Sport */}
      {step === 0 && (
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900, marginBottom: 6 }}>What sport are you training for?</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>This sets phase names and suggested intensities for your sport.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SPORTS.map(s => (
              <button key={s} onClick={() => setState(st => ({ ...st, sport: s }))}
                style={{
                  padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: `1.5px solid ${state.sport === s ? "var(--theme-primary)" : "var(--border-default)"}`,
                  background: state.sport === s ? "var(--theme-primary)" : "var(--bg-card)",
                  color: state.sport === s ? "#fff" : "var(--text-secondary)",
                  transition: "all 150ms", minHeight: 36,
                }}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Season start */}
      {step === 1 && (
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900, marginBottom: 6 }}>When does your season start?</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>This is when structured training begins — not your first competition.</p>
          <input type="date" value={state.seasonStart} onChange={e => setState(s => ({ ...s, seasonStart: e.target.value }))}
            min={new Date().toISOString().slice(0, 10)}
            style={{ height: 48, border: "1px solid var(--border-default)", borderRadius: 8, padding: "0 16px", fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text-primary)", outline: "none", width: "100%" }}
            onFocus={e => (e.target.style.borderColor = "var(--theme-primary)")}
            onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
          />
        </div>
      )}

      {/* Step 2: Target competition */}
      {step === 2 && (
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900, marginBottom: 6 }}>When is your most important competition?</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Your season plan will automatically build toward this date — peaking at the right time.</p>
          <input type="date" value={state.competitionDate} onChange={e => setState(s => ({ ...s, competitionDate: e.target.value }))}
            min={state.seasonStart || new Date().toISOString().slice(0, 10)}
            style={{ height: 48, border: "1px solid var(--border-default)", borderRadius: 8, padding: "0 16px", fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text-primary)", outline: "none", width: "100%" }}
            onFocus={e => (e.target.style.borderColor = "var(--theme-primary)")}
            onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
          />
        </div>
      )}

      {/* Step 3: Goal + preview */}
      {step === 3 && (
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900, marginBottom: 6 }}>What's your main goal this season?</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {GOALS.map(g => (
              <button key={g} onClick={() => setState(s => ({ ...s, primaryGoal: g }))}
                style={{
                  padding: "12px 16px", borderRadius: 8, textAlign: "left", cursor: "pointer",
                  border: `1.5px solid ${state.primaryGoal === g ? "var(--theme-primary)" : "var(--border-default)"}`,
                  background: state.primaryGoal === g ? "var(--bg-raised)" : "var(--bg-card)",
                  fontSize: 13, fontWeight: 500, color: state.primaryGoal === g ? "var(--theme-primary)" : "var(--text-secondary)",
                  minHeight: 44,
                }}>{g}</button>
            ))}
          </div>
          {state.seasonStart && state.competitionDate && (
            <PeriodizationTimeline plan={generatePlan()} preview />
          )}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
        {step > 0 && <button onClick={() => setStep(s => (s - 1) as WizardStep)} style={{ height: 44, flex: "0 0 80px", border: "1px solid var(--border-default)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: 14, color: "var(--text-muted)" }}>← Back</button>}
        <button
          disabled={!canProceed[step]}
          onClick={() => {
            if (step < 3) { setStep(s => (s + 1) as WizardStep); }
            else { const plan = generatePlan(); analytics.track("periodization_plan_created", { sport: state.sport, total_weeks: plan.totalWeeks }); onComplete(plan); }
          }}
          style={{ flex: 1, height: 44, border: "none", borderRadius: 8, background: canProceed[step] ? "var(--theme-primary)" : "var(--border-default)", color: "#fff", cursor: canProceed[step] ? "pointer" : "not-allowed", fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 700 }}
        >
          {step === 3 ? "Create My Season Plan →" : "Continue →"}
        </button>
      </div>
      {step > 0 && <button onClick={onSkip} style={{ display: "block", width: "100%", marginTop: 10, background: "none", border: "none", fontSize: 12, color: "var(--text-muted)", cursor: "pointer", minHeight: 32 }}>Skip — I'll set this up later</button>}
    </div>
  );
};

// ── VISUAL TIMELINE ───────────────────────────────────────────
export const PeriodizationTimeline: React.FC<{
  plan: SeasonPlan;
  preview?: boolean;
}> = ({ plan, preview = false }) => {
  const { isMobile } = useDevice();

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12, padding: preview ? "14px 16px" : "18px 20px" }}>
      {!preview && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, marginBottom: 2 }}>Season Plan — {plan.sport}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {new Date(plan.seasonStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} → {new Date(plan.targetCompetitionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {plan.totalWeeks} weeks
            </div>
          </div>
        </div>
      )}

      {/* Horizontal phase bar */}
      <div style={{ display: "flex", height: 36, borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
        {plan.phases.map(phase => {
          const cfg = PHASE_CONFIG[phase.type];
          const pct = (phase.durationWeeks / plan.totalWeeks) * 100;
          return (
            <div
              key={phase.id}
              title={`${cfg.plainLabel}: ${phase.durationWeeks} weeks`}
              style={{
                width: `${pct}%`,
                background: phase.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
                transition: "opacity 150ms",
                cursor: "default",
              }}
            >
              {pct > 12 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", textAlign: "center", lineHeight: 1.2, padding: "0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {isMobile ? phase.durationWeeks + "w" : cfg.plainLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Phase legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {plan.phases.map(phase => {
          const cfg = PHASE_CONFIG[phase.type];
          return (
            <Tooltip key={phase.id} id={`periodization.${phase.type}`} inline>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: phase.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{cfg.plainLabel}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({phase.durationWeeks}w)</span>
              </div>
            </Tooltip>
          );
        })}
      </div>

      {/* Phase details — plain language */}
      {!preview && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {plan.phases.map(phase => {
            const cfg = PHASE_CONFIG[phase.type];
            const startDate = new Date(plan.seasonStartDate);
            startDate.setDate(startDate.getDate() + phase.startWeek * 7);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + phase.durationWeeks * 7 - 1);

            return (
              <div key={phase.id} style={{ background: cfg.bg, border: `1px solid ${phase.color}30`, borderLeft: `3px solid ${phase.color}`, borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <Tooltip id={`periodization.${phase.type}`} inline>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800, color: phase.color }}>{cfg.plainLabel}</span>
                    </Tooltip>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {phase.durationWeeks} weeks
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 11, color: "var(--text-muted)" }}>
                    <div>Intensity: <strong style={{ color: phase.color }}>{cfg.intensityLevel}</strong></div>
                    <div>Volume: <strong style={{ color: phase.color }}>{cfg.volumeLevel}</strong></div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 4 }}>{cfg.description}</p>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Focus: {phase.keyFocus}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
