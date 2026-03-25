// ============================================================
// OnboardingFlow — Phase 1
// 5-step role-personalized guided tour with first-action prompt
// Focal point scroll on each step
// ============================================================

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useDevice, useFocalPoint } from "../../hooks/useDevice";
import { SPORT_THEMES } from "../../assets/tokens/theme";
import type { UserRole } from "../../config/navigation";
import type { SportThemeId } from "../../assets/tokens/theme";
import { analytics } from "../../lib/analytics";

interface OnboardingState {
  role: UserRole | null;
  sport: SportThemeId | null;
  teamName: string;
  athleteName: string;
  firstGoal: string;
}

interface OnboardingFlowProps {
  onComplete: (state: OnboardingState) => void;
  onSkip: () => void;
}

type Step = 0 | 1 | 2 | 3 | 4;

const STEP_COUNT = 5;

const ROLE_CONFIG: Record<UserRole, {
  label: string;
  icon: string;
  description: string;
  firstAction: string;
  defaultTab: string;
}> = {
  coach: {
    label: "Coach",
    icon: "📋",
    description: "Manage your team, build training plans, and share reports with parents.",
    firstAction: "Add your first athlete to get started",
    defaultTab: "Team Overview",
  },
  athlete: {
    label: "Athlete",
    icon: "🏃",
    description: "Track your training, monitor your readiness, and hit your performance goals.",
    firstAction: "Log your first workout to calculate your PIQ Score",
    defaultTab: "Dashboard",
  },
  parent: {
    label: "Parent",
    icon: "👨‍👩‍👧",
    description: "Follow your athlete's progress, receive weekly reports, and stay connected to their training.",
    firstAction: "Connect to your athlete's profile to get started",
    defaultTab: "Reports",
  },
  solo_athlete: {
    label: "Solo Athlete",
    icon: "⚡",
    description: "Train independently with full access to all logging, analytics, and body tracking tools.",
    firstAction: "Log your first workout to calculate your PIQ Score",
    defaultTab: "Dashboard",
  },
  admin: {
    label: "Administrator",
    icon: "🏛️",
    description: "Oversee all teams, programs, and performance data across your institution.",
    firstAction: "Set up your first sport program",
    defaultTab: "Programs",
  },
};

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onSkip }) => {
  const device = useDevice();
  const { setFocal, jumpToFocal } = useFocalPoint();
  const [step, setStep] = useState<Step>(0);
  const [state, setState] = useState<OnboardingState>({
    role: null, sport: null, teamName: "", athleteName: "", firstGoal: "",
  });
  const [animating, setAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Jump focus to container on step change
  useEffect(() => {
    if (containerRef.current) {
      setFocal(containerRef.current);
      jumpToFocal({ behavior: "smooth", highlightDuration: 0 });
    }
    analytics.track("onboarding_step_viewed", { step, role: state.role });
  }, [step]);

  const nextStep = useCallback(() => {
    if (step < STEP_COUNT - 1) {
      setAnimating(true);
      setTimeout(() => {
        setStep(s => (s + 1) as Step);
        setAnimating(false);
      }, 200);
    }
  }, [step]);

  const prevStep = useCallback(() => {
    if (step > 0) setStep(s => (s - 1) as Step);
  }, [step]);

  const handleComplete = () => {
    analytics.track("onboarding_completed", { role: state.role, sport: state.sport });
    onComplete(state);
  };

  const canProceed: boolean[] = [
    state.role !== null,          // step 0: role selected
    state.sport !== null,         // step 1: sport selected
    true,                          // step 2: team/name optional
    true,                          // step 3: goal optional
    true,                          // step 4: PIQ score reveal
  ];

  const isLast = step === STEP_COUNT - 1;

  return (
    <div
      className="piq-onboarding-overlay"
      aria-label="Welcome to PerformanceIQ — getting started"
    >
      <div
        ref={containerRef}
        className="piq-onboarding-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Onboarding step ${step + 1} of ${STEP_COUNT}`}
        style={{ opacity: animating ? 0 : 1, transition: "opacity 200ms ease" }}
      >
        {/* Progress bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i <= step ? "var(--theme-primary)" : "var(--border-default)",
                transition: "background 300ms ease",
              }}
            />
          ))}
        </div>

        {/* Step label */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>
          Step {step + 1} of {STEP_COUNT}
        </div>

        {/* Step content */}
        {step === 0 && (
          <RoleSelectionStep
            selected={state.role}
            onSelect={role => setState(s => ({ ...s, role }))}
          />
        )}
        {step === 1 && (
          <SportSelectionStep
            selected={state.sport}
            onSelect={sport => setState(s => ({ ...s, sport }))}
          />
        )}
        {step === 2 && (
          <ProfileSetupStep
            role={state.role!}
            teamName={state.teamName}
            athleteName={state.athleteName}
            onTeamNameChange={v => setState(s => ({ ...s, teamName: v }))}
            onAthleteNameChange={v => setState(s => ({ ...s, athleteName: v }))}
          />
        )}
        {step === 3 && (
          <GoalSetupStep
            role={state.role!}
            goal={state.firstGoal}
            onGoalChange={v => setState(s => ({ ...s, firstGoal: v }))}
          />
        )}
        {step === 4 && (
          <PIQScoreRevealStep role={state.role!} />
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 10, marginTop: 24, flexDirection: device.isMobile ? "column" : "row" }}>
          {step > 0 && (
            <button
              onClick={prevStep}
              style={{
                height: 44, flex: device.isMobile ? "none" : "0 0 80px",
                border: "1px solid var(--border-default)",
                borderRadius: 8, background: "transparent",
                fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600,
                color: "var(--text-muted)", cursor: "pointer",
              }}
            >
              ← Back
            </button>
          )}

          <button
            onClick={isLast ? handleComplete : nextStep}
            disabled={!canProceed[step]}
            style={{
              height: 44, flex: 1,
              border: "none", borderRadius: 8,
              background: canProceed[step] ? "var(--theme-primary)" : "var(--border-default)",
              fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 700,
              color: canProceed[step] ? "#fff" : "var(--text-disabled)",
              cursor: canProceed[step] ? "pointer" : "not-allowed",
              transition: "background 150ms ease",
            }}
          >
            {isLast
              ? state.role ? `Go to ${ROLE_CONFIG[state.role].defaultTab} →` : "Get Started →"
              : "Continue →"
            }
          </button>
        </div>

        {/* Skip — available from step 1 */}
        {step > 0 && (
          <button
            onClick={() => { analytics.track("onboarding_skipped", { step }); onSkip(); }}
            style={{
              display: "block", width: "100%", marginTop: 12, background: "none",
              border: "none", fontFamily: "var(--font-body)", fontSize: 12,
              color: "var(--text-muted)", cursor: "pointer", minHeight: 32,
            }}
          >
            Skip setup — I'll explore on my own
          </button>
        )}
      </div>
    </div>
  );
};

// ── STEP 0: ROLE SELECTION ────────────────────────────────────
const RoleSelectionStep: React.FC<{
  selected: UserRole | null;
  onSelect: (r: UserRole) => void;
}> = ({ selected, onSelect }) => (
  <div>
    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,5vw,28px)", fontWeight: 900, marginBottom: 8 }}>
      Welcome to PerformanceIQ
    </h2>
    <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 20 }}>
      Tell us your role so we can personalize your experience.
    </p>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(([role, cfg]) => (
        <button
          key={role}
          onClick={() => onSelect(role)}
          aria-pressed={selected === role}
          style={{
            padding: 16, borderRadius: 10, textAlign: "left", cursor: "pointer",
            border: `2px solid ${selected === role ? "var(--theme-primary)" : "var(--border-default)"}`,
            background: selected === role ? "var(--bg-raised)" : "#fff",
            transition: "all 150ms ease",
            minHeight: 44,
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>{cfg.icon}</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700, color: selected === role ? "var(--theme-primary)" : "var(--text-primary)", marginBottom: 4 }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
            {cfg.description.split(".")[0]}.
          </div>
        </button>
      ))}
    </div>
    {selected && (
      <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--semantic-infoBg)", border: "1px solid var(--semantic-infoBorder)", borderRadius: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--semantic-info)", marginBottom: 4 }}>Your first action</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {ROLE_CONFIG[selected].firstAction}
        </div>
      </div>
    )}
  </div>
);

// ── STEP 1: SPORT SELECTION ───────────────────────────────────
const SportSelectionStep: React.FC<{
  selected: SportThemeId | null;
  onSelect: (s: SportThemeId) => void;
}> = ({ selected, onSelect }) => (
  <div>
    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(20px,5vw,26px)", fontWeight: 900, marginBottom: 8 }}>
      Choose your sport
    </h2>
    <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 20 }}>
      This sets your color theme and sport-specific defaults.
    </p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
      {(Object.entries(SPORT_THEMES) as [SportThemeId, typeof SPORT_THEMES[SportThemeId]][]).map(([id, theme]) => {
        const isSelected = selected === id;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            aria-pressed={isSelected}
            style={{
              padding: "14px 10px",
              borderRadius: 10,
              textAlign: "center",
              cursor: "pointer",
              border: `2px solid ${isSelected ? theme.primary : "var(--border-default)"}`,
              background: isSelected ? theme.primary + "15" : "#fff",
              transition: "all 150ms ease",
              minHeight: 44,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>{theme.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? theme.primary : "var(--text-secondary)" }}>
              {theme.label}
            </div>
            {isSelected && (
              <div style={{ width: 16, height: 4, borderRadius: 2, background: theme.primary, margin: "6px auto 0" }} />
            )}
          </button>
        );
      })}
    </div>
  </div>
);

// ── STEP 2: PROFILE SETUP ─────────────────────────────────────
const ProfileSetupStep: React.FC<{
  role: UserRole;
  teamName: string;
  athleteName: string;
  onTeamNameChange: (v: string) => void;
  onAthleteNameChange: (v: string) => void;
}> = ({ role, teamName, athleteName, onTeamNameChange, onAthleteNameChange }) => (
  <div>
    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(20px,5vw,26px)", fontWeight: 900, marginBottom: 8 }}>
      {role === "coach" ? "Set up your team" : "Personalize your profile"}
    </h2>
    <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 20 }}>
      Optional — you can always update these in Settings.
    </p>
    {(role === "coach" || role === "admin") && (
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="team-name" style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
          Team or Program Name
        </label>
        <input
          id="team-name"
          value={teamName}
          onChange={e => onTeamNameChange(e.target.value)}
          placeholder="e.g. Central HS Track"
          style={{ width: "100%", height: 44, border: "1px solid var(--border-default)", borderRadius: 8, padding: "0 14px", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-primary)", outline: "none" }}
          onFocus={e => (e.target.style.borderColor = "var(--theme-primary)")}
          onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
        />
      </div>
    )}
    {(role === "athlete" || role === "solo_athlete") && (
      <div>
        <label htmlFor="athlete-name" style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
          Your Name (for your profile)
        </label>
        <input
          id="athlete-name"
          value={athleteName}
          onChange={e => onAthleteNameChange(e.target.value)}
          placeholder="Your preferred name"
          style={{ width: "100%", height: 44, border: "1px solid var(--border-default)", borderRadius: 8, padding: "0 14px", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-primary)", outline: "none" }}
          onFocus={e => (e.target.style.borderColor = "var(--theme-primary)")}
          onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
        />
      </div>
    )}
  </div>
);

// ── STEP 3: FIRST GOAL ────────────────────────────────────────
const GoalSetupStep: React.FC<{
  role: UserRole;
  goal: string;
  onGoalChange: (v: string) => void;
}> = ({ role, goal, onGoalChange }) => {
  const GOAL_SUGGESTIONS: Record<UserRole, string[]> = {
    coach:        ["Reduce injury rate by 20%", "Improve team compliance to 85%", "Win district championship"],
    athlete:      ["Run a sub-5 mile", "Improve vertical by 3 inches", "Hit 90% training compliance"],
    parent:       ["Stay connected to my athlete's training", "Understand their weekly load"],
    solo_athlete: ["Log workouts 5x per week", "Hit my macro targets daily"],
    admin:        ["Launch 3 new sport programs", "Reach 80% platform adoption across programs"],
  };

  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(20px,5vw,26px)", fontWeight: 900, marginBottom: 8 }}>
        What's your main goal?
      </h2>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 16 }}>
        We'll customize your dashboard to keep it front and center.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {GOAL_SUGGESTIONS[role].map(s => (
          <button
            key={s}
            onClick={() => onGoalChange(s)}
            style={{
              padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: `1.5px solid ${goal === s ? "var(--theme-primary)" : "var(--border-default)"}`,
              background: goal === s ? "var(--theme-primary)" : "#fff",
              color: goal === s ? "#fff" : "var(--text-secondary)",
              cursor: "pointer", transition: "all 150ms ease", minHeight: 36,
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <textarea
        value={goal}
        onChange={e => onGoalChange(e.target.value)}
        placeholder="Or type your own goal..."
        rows={2}
        style={{
          width: "100%", border: "1px solid var(--border-default)", borderRadius: 8,
          padding: "10px 14px", fontFamily: "var(--font-body)", fontSize: 14,
          color: "var(--text-primary)", resize: "none", outline: "none", lineHeight: 1.5,
        }}
        onFocus={e => (e.target.style.borderColor = "var(--theme-primary)")}
        onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
      />
    </div>
  );
};

// ── STEP 4: PIQ SCORE REVEAL ──────────────────────────────────
const PIQScoreRevealStep: React.FC<{ role: UserRole }> = ({ role }) => {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "8px 0" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(20px,5vw,26px)", fontWeight: 900, marginBottom: 8 }}>
        You're all set!
      </h2>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 24 }}>
        {role === "athlete" || role === "solo_athlete"
          ? "Log your first workout and your PIQ Score will calculate instantly."
          : role === "coach"
          ? "Add your first athlete and your team dashboard will come alive."
          : "Your personalized view is ready. Here's what to expect."}
      </p>
      <div style={{
        width: 120, height: 120, borderRadius: "50%", margin: "0 auto 24px",
        background: revealed ? "var(--theme-primary)" : "var(--border-default)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        transition: "background 500ms ease, transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: revealed ? "scale(1)" : "scale(0.8)",
        boxShadow: revealed ? "0 8px 32px rgba(26,82,118,.3)" : "none",
      }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 900, color: "#fff", lineHeight: 1 }}>
          {(role === "athlete" || role === "solo_athlete") ? "--" : "✓"}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.8)", marginTop: 4, fontWeight: 600 }}>
          {(role === "athlete" || role === "solo_athlete") ? "PIQ Score" : "Ready"}
        </div>
      </div>
      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
        {ROLE_CONFIG[role].firstAction}
      </div>
    </div>
  );
};
