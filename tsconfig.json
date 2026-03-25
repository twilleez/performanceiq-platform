// ============================================================
// InsightsView — Analytics, Reports, Team Overview
// Role-aware: coaches see team, parents see reports, ADs see programs
// ============================================================

import React, { useState, useEffect } from "react";
import { useDevice } from "../hooks/useDevice";
import { useAppStore } from "../context/AppStore";
import { MessagingView } from "../components/messaging/MessagingView";
import { ProgressTrend, MilestoneGrid } from "../components/retention/RetentionEngine";
import { trainingService } from "../lib/trainingService";
import { Tooltip } from "../components/ui/TooltipSystem";
import { analytics } from "../lib/analytics";
import type { Milestone } from "../components/retention/RetentionEngine";

type InsightsSubPage = "analytics" | "reports" | "team" | "messages";

export default function InsightsView() {
  const { user } = useAppStore();
  const { isMobile } = useDevice();
  const [subPage, setSubPage] = useState<InsightsSubPage>(
    user?.role === "coach"  ? "team"      :
    user?.role === "parent" ? "reports"   :
    user?.role === "admin"  ? "analytics" :
    "analytics"
  );
  const [trend, setTrend] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  useEffect(() => {
    if (user) loadData();
    analytics.track("insights_viewed", { role: user?.role, sub_page: subPage });
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    const [trendData] = await Promise.all([trainingService.get30DayTrend(user.id)]);
    setTrend(trendData);
  };

  // Build sub-pages based on role
  const allPages: { id: InsightsSubPage; label: string; icon: string; roles?: string[] }[] = [
    { id: "analytics", label: "Analytics", icon: "📈" },
    { id: "team",      label: "Team",      icon: "👥", roles: ["coach", "admin"] },
    { id: "reports",   label: "Reports",   icon: "📊", roles: ["coach", "parent", "admin"] },
    { id: "messages",  label: "Messages",  icon: "💬", roles: ["coach", "athlete", "solo_athlete", "admin"] },
  ];
  const visiblePages = allPages.filter(p => !p.roles || p.roles.includes(user?.role ?? "athlete"));

  return (
    <div className="piq-page">
      {/* Sub-nav */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
        {visiblePages.map(sp => (
          <button key={sp.id} onClick={() => { setSubPage(sp.id); analytics.track("insights_subnav", { page: sp.id }); }}
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

      {/* Analytics */}
      {subPage === "analytics" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800 }}>Performance Analytics</div>
            <Tooltip id="analytics.trend" />
          </div>

          {trend.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <ProgressTrend data={trend} label="30-Day PIQ Score" />
            </div>
          )}

          {milestones.length > 0 && (
            <MilestoneGrid milestones={milestones} />
          )}

          {trend.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📈</div>
              <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65 }}>
                Analytics will appear after you log a few sessions.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team (coach/admin) */}
      {subPage === "team" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800 }}>Team Overview</div>
            <Tooltip id="analytics.team" />
          </div>
          <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Add Athletes to See Your Team</div>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65 }}>
              Invite athletes to your team to see their PIQ Scores, compliance rates, and activity streaks here.
            </p>
          </div>
        </div>
      )}

      {/* Reports (coach/parent/admin) */}
      {subPage === "reports" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800 }}>Progress Reports</div>
            <Tooltip id="reports.generate" />
          </div>

          {user?.role === "coach" || user?.role === "admin" ? (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12, padding: "20px" }}>
              <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.65 }}>
                Generate a branded PDF progress report for any athlete. Share via link — no login required for parents.
              </div>
              <button style={{ height: 44, padding: "0 24px", borderRadius: 10, border: "none", background: "var(--theme-primary)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                onClick={() => analytics.track("report_generate_clicked")}>
                Generate Report →
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
              <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65 }}>
                Your coach's reports will appear here once they generate one for your athlete.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      {subPage === "messages" && user && (
        <MessagingView
          currentUserId={user.id}
          currentUserRole={user.role === "coach" ? "coach" : "athlete"}
          currentUserName={`${user.firstName} ${user.lastName}`}
        />
      )}
    </div>
  );
}
