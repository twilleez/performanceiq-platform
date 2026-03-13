function sparkline(values, color = "#53b5ff", height = 44) {
  if (!values || values.length < 2) return "";
  const w = 260, h = height, pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (pad + (i / (values.length - 1)) * (w - pad * 2)).toFixed(1);
    const y = (h - pad - ((v - min) / range) * (h - pad * 2)).toFixed(1);
    return `${x},${y}`;
  });
  const [lx, ly] = pts[pts.length - 1].split(",");
  // Area fill path
  const areaPath = `M${pts[0].split(",")[0]},${h} L${pts.join(" L")} L${lx},${h} Z`;
  return `
    <svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"
      style="display:block;margin-top:10px;height:${h}px">
      <defs>
        <linearGradient id="sg${color.replace("#","")}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity=".22"/>
          <stop offset="100%" stop-color="${color}" stop-opacity=".01"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#sg${color.replace("#","")})" />
      <polyline points="${pts.join(" ")}" fill="none" stroke="${color}"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${lx}" cy="${ly}" r="4" fill="${color}" opacity=".9"/>
    </svg>`;
}

function streakCount(workouts) {
  if (!workouts?.length) return 0;
  const sorted = [...workouts]
    .filter(w => w.completed_at)
    .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));
  if (!sorted.length) return 0;
  let streak = 0;
  let prev = null;
  for (const w of sorted) {
    if (!prev) { streak = 1; prev = w.scheduled_date; continue; }
    const diff = (new Date(prev) - new Date(w.scheduled_date)) / 86400000;
    if (diff <= 2) { streak++; prev = w.scheduled_date; }
    else break;
  }
  return streak;
}

export function progressView(state) {
  const { prs, readinessTrend } = state;
  const recentWorkouts = state.recentWorkouts ?? [];

  const completedWorkouts = recentWorkouts.filter(w => w.completed_at);
  const avgReadiness = readinessTrend.length
    ? Math.round(readinessTrend.reduce((s, r) => s + r.score, 0) / readinessTrend.length)
    : null;
  const streak = streakCount(recentWorkouts);
  const trendValues = readinessTrend.map(r => r.score);
  const latestScore = trendValues[trendValues.length - 1] ?? null;
  const prevScore   = trendValues[trendValues.length - 2] ?? null;
  const trendArrow  = latestScore === null || prevScore === null ? "" :
    latestScore > prevScore ? " ↑" : latestScore < prevScore ? " ↓" : " →";

  // ── Pillar cards ────────────────────────────────────────────────────────
  const pillars = [
    {
      label: "Avg Readiness",
      value: avgReadiness !== null ? `${avgReadiness}` : "—",
      sub:   avgReadiness !== null ? `${trendArrow} last 14 days` : "No data yet",
      color: avgReadiness === null ? "var(--muted)" :
             avgReadiness >= 80    ? "#34d399" :
             avgReadiness >= 65    ? "#fbbf24" : "#f87171",
      bar:   avgReadiness,
    },
    {
      label: "Sessions",
      value: completedWorkouts.length || "0",
      sub:   "completed this month",
      color: "#ff6b35",
      bar:   null,
    },
    {
      label: "Streak",
      value: streak ? `${streak}` : "0",
      sub:   streak ? "days in a row 🔥" : "start one today",
      color: streak >= 5 ? "#fbbf24" : "#53b5ff",
      bar:   null,
    },
  ];

  const pillarCards = pillars.map(p => `
    <div class="card">
      <div class="muted small" style="margin-bottom:4px">${p.label}</div>
      <div class="metric-sm" style="color:${p.color}">${p.value}</div>
      <div class="muted small" style="margin-top:4px;font-size:11px">${p.sub}</div>
      ${p.bar !== null ? `
        <div style="margin-top:8px;height:3px;border-radius:3px;background:rgba(255,255,255,.07)">
          <div style="width:${p.bar}%;height:100%;border-radius:3px;background:${p.color};opacity:.7"></div>
        </div>` : ""}
    </div>
  `).join("");

  // ── Readiness trend ──────────────────────────────────────────────────────
  const trendCard = readinessTrend.length >= 2 ? `
    <div class="card section">
      <div class="space">
        <div class="title-md">Readiness Trend</div>
        <span class="muted small">14 days</span>
      </div>
      ${sparkline(trendValues, "#53b5ff")}
      <div class="row" style="justify-content:space-between;margin-top:10px;flex-wrap:wrap;gap:6px">
        <span class="stat-chip" style="font-size:11px">Low ${Math.min(...trendValues)}</span>
        <span class="stat-chip" style="font-size:11px">High ${Math.max(...trendValues)}</span>
        <span class="stat-chip" style="font-size:11px">Avg ${avgReadiness}</span>
        <span class="stat-chip" style="font-size:11px">${trendValues.length} logs</span>
      </div>
    </div>
  ` : `
    <div class="card section" style="opacity:.6;text-align:center;padding:24px 16px">
      <div style="font-size:32px;margin-bottom:8px">📈</div>
      <div class="title-md">No Trend Yet</div>
      <div class="muted" style="font-size:13px;margin-top:6px">Log readiness on 2+ days to see your trend chart.</div>
    </div>
  `;

  // ── Session history ──────────────────────────────────────────────────────
  const sessionHistory = completedWorkouts.length
    ? completedWorkouts.slice(0, 8).map(w => {
        const date = new Date(w.scheduled_date).toLocaleDateString("en-US", {
          weekday: "short", month: "short", day: "numeric"
        });
        const exCount = w.exercises?.length ?? 0;
        const dayTypeColor = {
          power:    "#fbbf24",
          recovery: "#34d399",
          build:    "#53b5ff",
        }[w.day_type] ?? "var(--muted)";
        return `
          <div class="item space">
            <div>
              <div style="font-weight:600;font-size:14px">${w.title}</div>
              <div class="muted small">${date} · ${exCount} exercise${exCount !== 1 ? "s" : ""}</div>
            </div>
            <span class="pill" style="font-size:11px;color:${dayTypeColor};border-color:${dayTypeColor}33">
              ${w.day_type ?? "session"}
            </span>
          </div>
        `;
      }).join("")
    : `<div class="item muted" style="text-align:center;padding:20px">No completed sessions yet. Finish a workout to start tracking.</div>`;

  // ── PRs ──────────────────────────────────────────────────────────────────
  const prItems = prs.length
    ? prs.slice(0, 10).map(pr => `
        <div class="item space">
          <div>
            <div style="font-weight:600">${pr.exercise_id.replace(/_/g, " ")}</div>
            <div class="muted small">${pr.label}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700;color:#34d399">${pr.value} ${pr.unit ?? ""}</div>
            <div class="muted small">${pr.set_at}</div>
          </div>
        </div>
      `).join("")
    : `<div class="item muted" style="text-align:center;padding:20px">No PRs logged yet. Complete a session to start tracking.</div>`;

  return `
    <div class="screen">
      <div class="topbar">
        <div><div class="muted">Progress</div><div class="title-xl">Depth Over Noise</div></div>
      </div>

      <div class="grid three section">${pillarCards}</div>

      ${trendCard}

      <div class="card section">
        <div class="space" style="margin-bottom:12px">
          <div class="title-md">Session History</div>
          <span class="muted small">${completedWorkouts.length} sessions</span>
        </div>
        <div class="list">${sessionHistory}</div>
      </div>

      <div class="card section">
        <div class="space" style="margin-bottom:12px">
          <div class="title-md">Personal Records</div>
          <span class="muted small">${prs.length} recorded</span>
        </div>
        <div class="list">${prItems}</div>
      </div>
    </div>
  `;
}
