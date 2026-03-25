// ============================================================
// DashboardView — Phase 1 complete
// Role-aware: Coach → Team Roster | Athlete → PIQ + Streak
// Parent → Athlete Summary | Admin → Overview
// ============================================================

import React, { useEffect, useState, useRef } from "react";
import { useDevice, useFocalPoint } from "../hooks/useDevice";
import { useAppStore } from "../context/AppStore";
import { trainingService, type PIQScoreComponents } from "../lib/trainingService";
import { StreakCard, ProgressTrend } from "../components/retention/RetentionEngine";
import { DashboardKPIGrid } from "../components/ui/AccessibilitySystem";
import { CoachDashboard, ParentDashboard } from "../components/dashboard/CoachDashboard";
import { Tooltip } from "../components/ui/TooltipSystem";
import { analytics } from "../lib/analytics";

export default function DashboardView() {
  const { user } = useAppStore();
  const { isMobile } = useDevice();
  const { setFocal, jumpToFocal } = useFocalPoint();
  const focalRef = useRef<HTMLDivElement>(null);
  const [piq, setPiq] = useState<PIQScoreComponents | null>(null);
  const [streak] = useState({
    currentStreak: 0, longestStreak: 0,
    lastLogDate: null as string | null,
    streakAtRisk: false,
    weekActivity: Array(7).fill(false),
  });
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [insightsTab, setInsightsTab] = useState("analytics");

  useEffect(() => {
    if (!user) return;
    setFocal(focalRef.current);
    jumpToFocal({ behavior: "smooth", highlightDuration: 0 });
    loadData();
    analytics.track("dashboard_viewed", { role: user.role });
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    if (user.role === "coach" || user.role === "admin") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [piqScore, trendData] = await Promise.all([
        trainingService.calculatePIQScore(user.id),
        trainingService.get30DayTrend(user.id),
      ]);
      setPiq(piqScore);
      setTrend(trendData);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── COACH: team roster as default ──────────────────────
  if (user?.role === "coach" || user?.role === "admin") {
    return (
      <div ref={focalRef} className="piq-page">
        <CoachDashboard coachId={user.id} />
      </div>
    );
  }

  // ── PARENT: athlete summary ─────────────────────────────
  if (user?.role === "parent") {
    return (
      <div ref={focalRef} className="piq-page">
        <ParentDashboard parentId={user.id} onGoToReports={() => {}} />
      </div>
    );
  }

  // ── ATHLETE / SOLO ATHLETE: PIQ + streak + trend ────────
  const kpiData = piq ? {
    piqScore:    { value: piq.total,      trend: "flat" as const },
    streak:      { value: streak.currentStreak },
    acwr:        { value: piq.acwr },
    wellness:    { value: piq.readiness > 0 ? (piq.readiness / 10).toFixed(1) : "--" },
    compliance:  { value: piq.compliance },
  } : {};

  return (
    <div ref={focalRef} className="piq-page">
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: 14 }}>
          Loading your dashboard...
        </div>
      ) : (
        <>
          {/* KPI grid */}
          <div style={{ marginBottom: 20 }}>
            <DashboardKPIGrid role={user?.role ?? "athlete"} data={kpiData} />
          </div>

          {/* PIQ score breakdown */}
          {piq && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12, padding: isMobile ? "14px 16px" : "16px 20px", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Score Breakdown
                </span>
                <Tooltip id="piq.score" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {[
                  { id: "piq.consistency", label: "Consistency", value: piq.consistency,    weight: "35%", color: "#1A5276" },
                  { id: "piq.readiness",   label: "Readiness",   value: piq.readiness,      weight: "30%", color: "#1E8449" },
                  { id: "piq.compliance",  label: "Compliance",  value: piq.compliance,     weight: "25%", color: "#6C3483" },
                  { id: "piq.load",        label: "Load Mgmt",   value: piq.loadManagement, weight: "10%", color: "#B7770D" },
                ].map(c => (
                  <div key={c.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
                      <Tooltip id={c.id} inline>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{c.label}</span>
                      </Tooltip>
                      <span
                        style={{
                          fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: c.color,
                          // URGENT FIX: tabular-nums on all score display
                          fontVariantNumeric: "tabular-nums",
                          fontFeatureSettings: '"tnum" 1',
                        }}
                      >
                        {c.value}
                      </span>
                    </div>
                    <div style={{ height: 5, background: "var(--border-default)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${c.value}%`, background: c.color, borderRadius: 3, transition: "width 600ms ease" }} />
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, textAlign: "right" }}>{c.weight} weight</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACWR alert */}
          {piq && (piq.acwr > 1.3 || piq.acwr < 0.8) && (
            <div style={{
              background: piq.acwr > 1.3 ? "var(--semantic-errorBg)" : "var(--semantic-warningBg)",
              border: `1px solid ${piq.acwr > 1.3 ? "var(--semantic-errorBorder)" : "var(--semantic-warningBorder)"}`,
              borderLeft: `4px solid ${piq.acwr > 1.3 ? "var(--semantic-error)" : "var(--semantic-warning)"}`,
              borderRadius: 10, padding: "12px 16px", marginBottom: 20,
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{piq.acwr > 1.3 ? "⚠️" : "📉"}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>
                  {piq.acwr > 1.3 ? "Training load spike detected" : "Training load too low"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  <Tooltip id="acwr" inline>
                    <span>
                      ACWR{" "}
                      <span style={{ fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum" 1' }}>
                        {piq.acwr.toFixed(2)}
                      </span>
                      {" "}— {piq.acwr > 1.3
                        ? "above the 1.3 safe ceiling. Consider a lighter session today."
                        : "below 0.8 minimum. Fitness may be declining — increase training volume."}
                    </span>
                  </Tooltip>
                </div>
              </div>
            </div>
          )}

          {/* Streak */}
          <div style={{ marginBottom: 20 }}>
            <StreakCard streak={streak} />
          </div>

          {/* 30-day trend */}
          {trend.length > 0 && piq && (
            <ProgressTrend data={trend} label="30-Day PIQ Score Trend" />
          )}

          {/* Empty state — new user */}
          {!piq && !loading && (
            <div style={{
              textAlign: "center", padding: "40px 20px",
              background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12,
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
                Your PIQ Score is ready to calculate
              </div>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65, maxWidth: 360, margin: "0 auto" }}>
                Log your first workout using the <strong>+</strong> button below to see your score instantly.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
