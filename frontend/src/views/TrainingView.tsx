// ============================================================
// TrainingView — Training hub with sub-nav routing
// Sub-pages: Log Workout | Workouts | Season Plan | Wellness
// ============================================================

import React, { useState, useEffect } from "react";
import { useDevice } from "../hooks/useDevice";
import { useAppStore } from "../context/AppStore";
import { PeriodizationTimeline, PeriodizationWizard } from "../components/periodization/PeriodizationTimeline";
import { Tooltip } from "../components/ui/TooltipSystem";
import { trainingService } from "../lib/trainingService";
import { analytics } from "../lib/analytics";

type SubPage = "log" | "workouts" | "periodization" | "wellness";

const WELLNESS_LABELS = [
  { score: 1, label: "Awful",   icon: "😫", color: "#C0392B" },
  { score: 2, label: "Bad",     icon: "😕", color: "#E67E22" },
  { score: 3, label: "Poor",    icon: "😔", color: "#E67E22" },
  { score: 4, label: "Below avg",icon:"😐", color: "#B7770D" },
  { score: 5, label: "Average", icon: "🙂", color: "#B7770D" },
  { score: 6, label: "Decent",  icon: "🙂", color: "#1E8449" },
  { score: 7, label: "Good",    icon: "😊", color: "#1E8449" },
  { score: 8, label: "Great",   icon: "😄", color: "#1A5276" },
  { score: 9, label: "Excellent",icon:"🤩", color: "#1A5276" },
  { score:10, label: "Peak",    icon: "🔥", color: "#6C3483" },
];

export default function TrainingView() {
  const { user } = useAppStore();
  const { isMobile } = useDevice();
  const [subPage, setSubPage] = useState<SubPage>("log");
  const [seasonPlan, setSeasonPlan] = useState<any>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    if (user) loadRecentLogs();
    analytics.track("training_view_opened", { sub_page: subPage });
  }, [user?.id]);

  const loadRecentLogs = async () => {
    if (!user) return;
    const to   = new Date().toISOString();
    const from = new Date(Date.now() - 14 * 86400000).toISOString();
    const logs = await trainingService.getLogs(user.id, from, to);
    setRecentLogs(logs);
  };

  const SUB_PAGES: { id: SubPage; label: string; icon: string }[] = [
    { id: "log",           label: "Log",       icon: "📝" },
    { id: "workouts",      label: "Workouts",  icon: "🏋️" },
    { id: "periodization", label: "Season",    icon: "📅" },
    { id: "wellness",      label: "Wellness",  icon: "💚" },
  ];

  return (
    <div className="piq-page">
      {/* Sub-nav */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
        {SUB_PAGES.map(sp => (
          <button
            key={sp.id}
            onClick={() => { setSubPage(sp.id); analytics.track("training_subnav", { page: sp.id }); }}
            style={{
              padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
              whiteSpace: "nowrap", cursor: "pointer", minHeight: 36, minWidth: "auto",
              border: `1.5px solid ${subPage === sp.id ? "var(--theme-primary)" : "var(--border-default)"}`,
              background: subPage === sp.id ? "var(--theme-primary)" : "var(--bg-card)",
              color: subPage === sp.id ? "#fff" : "var(--text-secondary)",
              transition: "all 150ms ease",
            }}
          >
            {sp.icon} {sp.label}
          </button>
        ))}
      </div>

      {/* Log Workout */}
      {subPage === "log" && (
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Recent Sessions</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Last 14 days · Use the + button to log a new session</div>

          {recentLogs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
              <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65 }}>No sessions logged yet.<br />Tap the + button to log your first workout.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentLogs.map(log => (
                <div key={log.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900, color: "var(--theme-primary)", minWidth: 44, textAlign: "center", lineHeight: 1 }}>
                    {log.intensity ?? "--"}
                    <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", fontFamily: "var(--font-body)" }}>RPE</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize", marginBottom: 3 }}>{log.activityType}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {log.durationMinutes}min · {log.trainingLoad} AU load ·
                      {new Date(log.loggedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  {log.piqScoreAtLog && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--theme-primary)", lineHeight: 1 }}>{log.piqScoreAtLog}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)" }}>PIQ</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Workouts library */}
      {subPage === "workouts" && (
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Workout Library</div>
          <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏋️</div>
            <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65 }}>Workout templates coming in the next sprint.<br />Browse and assign sport-specific sessions.</div>
          </div>
        </div>
      )}

      {/* Season Plan / Periodization */}
      {subPage === "periodization" && (
        <div>
          {showWizard ? (
            <PeriodizationWizard
              onComplete={plan => { setSeasonPlan(plan); setShowWizard(false); analytics.track("periodization_plan_created"); }}
              onSkip={() => setShowWizard(false)}
            />
          ) : seasonPlan ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800 }}>Your Season Plan</div>
                <button onClick={() => setShowWizard(true)} style={{ fontSize: 12, color: "var(--theme-primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, minHeight: 32 }}>Edit →</button>
              </div>
              <PeriodizationTimeline plan={seasonPlan} />
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Build Your Season Plan</div>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65, maxWidth: 340, margin: "0 auto 20px" }}>
                <Tooltip id="periodization.overview" inline>
                  <span>Set up your season structure in 4 steps. Plain language, no jargon.</span>
                </Tooltip>
              </p>
              <button
                onClick={() => setShowWizard(true)}
                style={{ height: 44, padding: "0 28px", borderRadius: 10, border: "none", background: "var(--theme-primary)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                Set Up Season Plan →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Wellness */}
      {subPage === "wellness" && (
        <WellnessLogSubPage userId={user?.id ?? ""} />
      )}
    </div>
  );
}

// ── WELLNESS LOG ──────────────────────────────────────────────
const WellnessLogSubPage: React.FC<{ userId: string }> = ({ userId }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [logged, setLogged] = useState(false);

  const handleLog = async (score: number) => {
    setSelected(score);
    const id = `wellness-${Date.now()}`;
    await trainingService.saveLog(id, {
      type: "wellness",
      wellnessScore: score,
      timestamp: new Date().toISOString(),
    });
    setLogged(true);
    analytics.track("wellness_logged", { score });
  };

  if (logged) {
    const entry = WELLNESS_LABELS.find(w => w.score === selected);
    return (
      <div style={{ textAlign: "center", padding: "48px 20px" }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>{entry?.icon}</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: entry?.color, marginBottom: 8 }}>
          {entry?.label} — {selected}/10
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Wellness check-in saved. Your readiness score will update.</p>
        <button onClick={() => { setLogged(false); setSelected(null); }} style={{ marginTop: 20, background: "none", border: "1px solid var(--border-default)", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)", minHeight: 36 }}>
          Log again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800 }}>How are you feeling today?</div>
        <Tooltip id="wellness.score" />
      </div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Takes 5 seconds. Powers your readiness score.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
        {WELLNESS_LABELS.filter(w => w.score % 2 !== 0 || w.score === 10).map(w => (
          <button
            key={w.score}
            onClick={() => handleLog(w.score)}
            style={{
              padding: "14px 8px", borderRadius: 10, textAlign: "center", cursor: "pointer",
              border: `2px solid ${selected === w.score ? w.color : "var(--border-default)"}`,
              background: selected === w.score ? w.color + "18" : "var(--bg-card)",
              transition: "all 150ms ease", minHeight: 44,
            }}
          >
            <div style={{ fontSize: 24 }}>{w.icon}</div>
            <div style={{ fontSize: 11, color: selected === w.score ? w.color : "var(--text-muted)", fontWeight: 600, marginTop: 4 }}>{w.label}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{w.score}/10</div>
          </button>
        ))}
      </div>
    </div>
  );
};
