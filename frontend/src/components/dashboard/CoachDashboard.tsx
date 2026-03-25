// ============================================================
// CoachDashboard — Phase 1
// Team roster as default landing state
// Athlete rows: PIQ score, streak, ACWR, compliance, last log
// At-risk alerts, quick message, sort/filter
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
import { useDevice } from "../../hooks/useDevice";
import { trainingService, type PIQScoreComponents } from "../../lib/trainingService";
import { supabase } from "../../lib/supabase";
import { Tooltip } from "../ui/TooltipSystem";
import { analytics } from "../../lib/analytics";

// ── TYPES ──────────────────────────────────────────────────
interface AthleteRow {
  id: string;
  firstName: string;
  lastName: string;
  sport: string | null;
  piqScore: number | null;
  piqDelta: number | null;      // vs last week
  streak: number;
  streakAtRisk: boolean;
  acwr: number | null;
  compliance: number | null;    // 0–100
  lastLogDate: string | null;
  alertCount: number;
}

type SortKey = "piqScore" | "compliance" | "streak" | "lastLog" | "name";
type FilterKey = "all" | "at_risk" | "no_log_3d" | "low_compliance";

const ACWR_COLOR = (v: number | null) => {
  if (!v) return "#9CA3AF";
  if (v >= 0.8 && v <= 1.3) return "#16A34A";
  if (v > 1.3 && v <= 1.5)  return "#D97706";
  if (v > 1.5)               return "#DC2626";
  return "#D97706"; // below 0.8
};

const PIQ_COLOR = (v: number | null) => {
  if (!v) return "#9CA3AF";
  if (v >= 80) return "#16A34A";
  if (v >= 65) return "#2563EB";
  if (v >= 50) return "#D97706";
  return "#DC2626";
};

const daysSince = (dateStr: string | null): number | null => {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
};

// ── COMPONENT ──────────────────────────────────────────────
export const CoachDashboard: React.FC<{ coachId: string }> = ({ coachId }) => {
  const { isMobile } = useDevice();
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("piqScore");
  const [sortAsc, setSortAsc] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    loadTeam();
    analytics.track("coach_dashboard_viewed");
  }, [coachId]);

  const loadTeam = async () => {
    setLoading(true);
    try {
      // Get linked athletes
      const { data: links } = await supabase
        .from("coach_athlete_links")
        .select("athlete_id")
        .eq("coach_id", coachId)
        .eq("is_active", true);

      if (!links?.length) { setAthletes([]); setLoading(false); return; }

      const athleteIds = links.map((l: any) => l.athlete_id);

      const [profilesRes, streaksRes, scoresRes] = await Promise.all([
        supabase.from("profiles")
          .select("id,first_name,last_name,sport")
          .in("id", athleteIds),
        supabase.from("piq_streaks")
          .select("user_id,current_streak,streak_at_risk,last_log_date")
          .in("user_id", athleteIds),
        supabase.from("piq_score_history")
          .select("user_id,total,acwr,compliance,calculated_at")
          .in("user_id", athleteIds)
          .order("calculated_at", { ascending: false }),
      ]);

      const profiles  = profilesRes.data  ?? [];
      const streaks   = streaksRes.data   ?? [];
      const scores    = scoresRes.data    ?? [];

      // Dedupe scores — latest per user
      const latestScore: Record<string, any> = {};
      const prevScore:   Record<string, any> = {};
      for (const s of scores) {
        if (!latestScore[s.user_id]) { latestScore[s.user_id] = s; continue; }
        if (!prevScore[s.user_id])     prevScore[s.user_id] = s;
      }

      const rows: AthleteRow[] = profiles.map((p: any) => {
        const streak  = streaks.find((s: any) => s.user_id === p.id);
        const latest  = latestScore[p.id];
        const prev    = prevScore[p.id];
        const daysSinceLog = daysSince(streak?.last_log_date);
        let alerts = 0;
        if (streak?.streak_at_risk)                             alerts++;
        if (latest?.acwr > 1.5)                                 alerts++;
        if (latest?.compliance < 70)                            alerts++;
        if (daysSinceLog !== null && daysSinceLog > 3)          alerts++;

        return {
          id:           p.id,
          firstName:    p.first_name ?? "Athlete",
          lastName:     p.last_name  ?? "",
          sport:        p.sport,
          piqScore:     latest?.total ?? null,
          piqDelta:     latest && prev ? latest.total - prev.total : null,
          streak:       streak?.current_streak ?? 0,
          streakAtRisk: streak?.streak_at_risk ?? false,
          acwr:         latest?.acwr ?? null,
          compliance:   latest?.compliance ?? null,
          lastLogDate:  streak?.last_log_date ?? null,
          alertCount:   alerts,
        };
      });

      setAthletes(rows);
    } catch (err) {
      console.error("Coach dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Sort + filter
  const sortedFiltered = useCallback(() => {
    let list = [...athletes];

    // Filter
    if (filter === "at_risk")      list = list.filter(a => a.alertCount > 0);
    if (filter === "no_log_3d")    list = list.filter(a => { const d = daysSince(a.lastLogDate); return d === null || d > 3; });
    if (filter === "low_compliance") list = list.filter(a => a.compliance !== null && a.compliance < 70);

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        a.firstName.toLowerCase().includes(q) ||
        a.lastName.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "piqScore")    { av = a.piqScore ?? -1;    bv = b.piqScore ?? -1; }
      if (sortKey === "compliance")  { av = a.compliance ?? -1;  bv = b.compliance ?? -1; }
      if (sortKey === "streak")      { av = a.streak;             bv = b.streak; }
      if (sortKey === "lastLog")     { av = a.lastLogDate ?? ""; bv = b.lastLogDate ?? ""; }
      if (sortKey === "name")        { av = a.firstName;          bv = b.firstName; }
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

    return list;
  }, [athletes, filter, searchQuery, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const atRiskCount = athletes.filter(a => a.alertCount > 0).length;
  const displayed = sortedFiltered();

  // ── EMPTY STATE ──────────────────────────────────────────
  if (!loading && athletes.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 20px", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
          Add your first athlete
        </div>
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65, maxWidth: 340, margin: "0 auto 20px" }}>
          Invite athletes to connect with your coaching profile to see their PIQ scores, compliance, and training load here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800 }}>
            Team Roster
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {athletes.length} athletes
            {atRiskCount > 0 && (
              <span style={{ marginLeft: 8, color: "#DC2626", fontWeight: 700 }}>
                · {atRiskCount} need attention
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search athletes..."
          style={{
            height: 36, minWidth: 180, border: "1px solid var(--border-default)",
            borderRadius: 8, padding: "0 12px", fontFamily: "var(--font-body)", fontSize: 13,
            outline: "none", background: "var(--bg-card)",
          }}
          onFocus={e => (e.target.style.borderColor = "var(--theme-primary)")}
          onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
        />

        {/* Refresh */}
        <button
          onClick={loadTeam}
          style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-card)", cursor: "pointer", fontSize: 13, color: "var(--text-muted)", minHeight: 36, minWidth: "auto" }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { id: "all" as FilterKey,          label: `All (${athletes.length})` },
          { id: "at_risk" as FilterKey,       label: `⚠ At Risk (${atRiskCount})`, danger: atRiskCount > 0 },
          { id: "no_log_3d" as FilterKey,    label: "No log 3d+" },
          { id: "low_compliance" as FilterKey, label: "Low compliance" },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: "pointer", minHeight: 32, minWidth: "auto",
              border: `1.5px solid ${filter === f.id ? (f.danger ? "#DC2626" : "var(--theme-primary)") : "var(--border-default)"}`,
              background: filter === f.id ? (f.danger ? "#FEF2F2" : "var(--bg-raised)") : "var(--bg-card)",
              color: filter === f.id ? (f.danger ? "#DC2626" : "var(--theme-primary)") : "var(--text-muted)",
              transition: "all 150ms ease",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>Loading roster...</div>
      ) : isMobile ? (
        // Mobile: card list
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {displayed.map(a => <AthleteCard key={a.id} athlete={a} isSelected={selected === a.id} onSelect={() => setSelected(selected === a.id ? null : a.id)} />)}
        </div>
      ) : (
        // Desktop: sortable table
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 80px 90px 90px 90px", gap: 0, borderBottom: "1px solid var(--border-default)", padding: "0 16px" }}>
            {[
              { key: "name" as SortKey,       label: "Athlete",    },
              { key: "piqScore" as SortKey,   label: "PIQ",   tooltip: "piq.score" },
              { key: "streak" as SortKey,     label: "Streak", tooltip: "retention.streak" },
              { key: "compliance" as SortKey, label: "Comply", tooltip: "piq.compliance" },
              { key: "lastLog" as SortKey,    label: "Last log" },
              { key: null,                    label: "ACWR",   tooltip: "acwr" },
            ].map((col, i) => (
              <div
                key={i}
                onClick={col.key ? () => handleSort(col.key as SortKey) : undefined}
                style={{
                  padding: "10px 8px",
                  fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                  textTransform: "uppercase", letterSpacing: ".06em",
                  cursor: col.key ? "pointer" : "default",
                  userSelect: "none",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                {col.label}
                {col.tooltip && <Tooltip id={col.tooltip} />}
                {col.key && sortKey === col.key && (
                  <span style={{ fontSize: 9 }}>{sortAsc ? "▲" : "▼"}</span>
                )}
              </div>
            ))}
          </div>

          {/* Rows */}
          {displayed.map(a => (
            <AthleteTableRow
              key={a.id}
              athlete={a}
              isSelected={selected === a.id}
              onSelect={() => setSelected(selected === a.id ? null : a.id)}
            />
          ))}

          {displayed.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No athletes match this filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── DESKTOP TABLE ROW ─────────────────────────────────────
const AthleteTableRow: React.FC<{
  athlete: AthleteRow;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ athlete: a, isSelected, onSelect }) => {
  const daysAgo = daysSince(a.lastLogDate);
  const logColor = daysAgo === null ? "#9CA3AF"
    : daysAgo === 0 ? "#16A34A"
    : daysAgo <= 1 ? "#2563EB"
    : daysAgo <= 3 ? "#D97706"
    : "#DC2626";

  return (
    <div
      onClick={onSelect}
      style={{
        display: "grid", gridTemplateColumns: "1fr 90px 80px 90px 90px 90px",
        padding: "0 16px", borderBottom: "1px solid var(--border-default)",
        background: isSelected ? "var(--bg-raised)" : "transparent",
        cursor: "pointer", transition: "background 150ms ease",
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--bg-raised)"; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
    >
      {/* Name + alert */}
      <div style={{ padding: "12px 8px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: "var(--theme-primary)",
          color: "#fff", fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {a.firstName[0]}{a.lastName[0]}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            {a.firstName} {a.lastName}
          </div>
          {a.sport && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{a.sport}</div>}
        </div>
        {a.alertCount > 0 && (
          <div style={{
            background: "#DC2626", color: "#fff", fontSize: 10, fontWeight: 700,
            borderRadius: 10, padding: "1px 6px", minWidth: 16, textAlign: "center", flexShrink: 0,
          }}>
            {a.alertCount}
          </div>
        )}
      </div>

      {/* PIQ score — tabular-nums */}
      <div style={{ padding: "12px 8px", display: "flex", alignItems: "center" }}>
        {a.piqScore !== null ? (
          <div>
            <div style={{
              fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900,
              color: PIQ_COLOR(a.piqScore), lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              fontFeatureSettings: '"tnum" 1',
            }}>
              {a.piqScore}
            </div>
            {a.piqDelta !== null && a.piqDelta !== 0 && (
              <div style={{ fontSize: 10, color: a.piqDelta > 0 ? "#16A34A" : "#DC2626", fontWeight: 700 }}>
                {a.piqDelta > 0 ? "▲" : "▼"}{Math.abs(a.piqDelta)}
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>—</div>
        )}
      </div>

      {/* Streak — tabular-nums */}
      <div style={{ padding: "12px 8px", display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 14 }}>{a.streakAtRisk ? "⚠️" : "🔥"}</span>
          <span style={{
            fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800,
            color: a.streakAtRisk ? "#D97706" : "#E67E22", lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            fontFeatureSettings: '"tnum" 1',
          }}>
            {a.streak}
          </span>
        </div>
      </div>

      {/* Compliance — tabular-nums */}
      <div style={{ padding: "12px 8px", display: "flex", alignItems: "center" }}>
        {a.compliance !== null ? (
          <div>
            <div style={{
              fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800,
              color: a.compliance >= 80 ? "#16A34A" : a.compliance >= 60 ? "#D97706" : "#DC2626",
              fontVariantNumeric: "tabular-nums",
              fontFeatureSettings: '"tnum" 1',
            }}>
              {a.compliance}%
            </div>
          </div>
        ) : <div style={{ fontSize: 13, color: "var(--text-muted)" }}>—</div>}
      </div>

      {/* Last log */}
      <div style={{ padding: "12px 8px", display: "flex", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: logColor, fontWeight: 600 }}>
          {daysAgo === null ? "Never"
            : daysAgo === 0  ? "Today"
            : daysAgo === 1  ? "Yesterday"
            : `${daysAgo}d ago`}
        </div>
      </div>

      {/* ACWR — tabular-nums */}
      <div style={{ padding: "12px 8px", display: "flex", alignItems: "center" }}>
        {a.acwr !== null ? (
          <div style={{
            fontSize: 13, fontWeight: 700, color: ACWR_COLOR(a.acwr),
            fontVariantNumeric: "tabular-nums",
            fontFeatureSettings: '"tnum" 1',
          }}>
            {a.acwr.toFixed(2)}
          </div>
        ) : <div style={{ fontSize: 13, color: "var(--text-muted)" }}>—</div>}
      </div>
    </div>
  );
};

// ── MOBILE ATHLETE CARD ───────────────────────────────────
const AthleteCard: React.FC<{
  athlete: AthleteRow;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ athlete: a, isSelected, onSelect }) => {
  const daysAgo = daysSince(a.lastLogDate);

  return (
    <div
      onClick={onSelect}
      style={{
        background: "var(--bg-card)", border: "1px solid var(--border-default)",
        borderLeft: a.alertCount > 0 ? "3px solid #DC2626" : "1px solid var(--border-default)",
        borderRadius: 10, padding: "12px 14px", cursor: "pointer",
        transition: "all 150ms ease",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: "var(--theme-primary)",
          color: "#fff", fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {a.firstName[0]}{a.lastName[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            {a.firstName} {a.lastName}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {a.sport ?? "Athlete"} · Last log: {
              daysAgo === null ? "Never" : daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`
            }
          </div>
        </div>
        {a.alertCount > 0 && (
          <div style={{ background: "#DC2626", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "2px 7px" }}>
            {a.alertCount} alert{a.alertCount > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Stats row — all tabular-nums */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        {[
          { l: "PIQ", v: a.piqScore !== null ? String(a.piqScore) : "—", c: PIQ_COLOR(a.piqScore) },
          { l: "Streak", v: String(a.streak), c: "#E67E22" },
          { l: "Comply", v: a.compliance !== null ? `${a.compliance}%` : "—", c: a.compliance && a.compliance >= 80 ? "#16A34A" : a.compliance && a.compliance >= 60 ? "#D97706" : "#DC2626" },
          { l: "ACWR", v: a.acwr !== null ? a.acwr.toFixed(2) : "—", c: ACWR_COLOR(a.acwr) },
        ].map(s => (
          <div key={s.l} style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: s.c, lineHeight: 1,
              // URGENT FIX: tabular numerals on all stat columns
              fontVariantNumeric: "tabular-nums",
              fontFeatureSettings: '"tnum" 1',
            }}>
              {s.v}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── PARENT DASHBOARD ──────────────────────────────────────
export const ParentDashboard: React.FC<{
  parentId: string;
  onGoToReports: () => void;
}> = ({ parentId, onGoToReports }) => {
  const { isMobile } = useDevice();
  const [athletes, setAthletes] = useState<Array<{
    id: string; firstName: string; piqScore: number | null; streak: number; lastLogDate: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLinkedAthletes();
  }, [parentId]);

  const loadLinkedAthletes = async () => {
    setLoading(true);
    try {
      const { data: links } = await supabase
        .from("parent_athlete_links")
        .select("athlete_id, profiles!athlete_id(first_name, last_name)")
        .eq("parent_id", parentId);

      if (!links?.length) { setAthletes([]); setLoading(false); return; }

      const athleteIds = links.map((l: any) => l.athlete_id);
      const [scoresRes, streaksRes] = await Promise.all([
        supabase.from("piq_score_history").select("user_id,total").in("user_id", athleteIds).order("calculated_at", { ascending: false }),
        supabase.from("piq_streaks").select("user_id,current_streak,last_log_date").in("user_id", athleteIds),
      ]);

      const latestScore: Record<string, number> = {};
      for (const s of (scoresRes.data ?? [])) {
        if (!latestScore[s.user_id]) latestScore[s.user_id] = s.total;
      }
      const streakMap: Record<string, any> = {};
      for (const s of (streaksRes.data ?? [])) streakMap[s.user_id] = s;

      setAthletes(links.map((l: any) => ({
        id:          l.athlete_id,
        firstName:   l.profiles?.first_name ?? "Your athlete",
        piqScore:    latestScore[l.athlete_id] ?? null,
        streak:      streakMap[l.athlete_id]?.current_streak ?? 0,
        lastLogDate: streakMap[l.athlete_id]?.last_log_date ?? null,
      })));
    } catch (err) {
      console.error("Parent dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!loading && athletes.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>👨‍👩‍👧</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
          Connect to your athlete
        </div>
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65 }}>
          Ask your athlete's coach to send you an invite link. Once connected, you'll see their training progress here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 16 }}>
        Athlete Overview
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>Loading...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {athletes.map(a => {
            const daysAgo = daysSince(a.lastLogDate);
            return (
              <div key={a.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800 }}>{a.firstName}</div>
                  <div style={{ fontSize: 11, color: daysAgo !== null && daysAgo > 3 ? "#DC2626" : "var(--text-muted)" }}>
                    Last logged: {daysAgo === null ? "Never" : daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 900,
                      color: PIQ_COLOR(a.piqScore), lineHeight: 1,
                      fontVariantNumeric: "tabular-nums",
                      fontFeatureSettings: '"tnum" 1',
                    }}>
                      {a.piqScore ?? "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>PIQ Score</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 900, color: "#E67E22", lineHeight: 1,
                      fontVariantNumeric: "tabular-nums",
                      fontFeatureSettings: '"tnum" 1',
                    }}>
                      {a.streak}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Day streak</div>
                  </div>
                </div>
                <button
                  onClick={onGoToReports}
                  style={{ marginTop: 14, width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--border-default)", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--theme-primary)", transition: "background 150ms ease" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-raised)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  View Full Report →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
