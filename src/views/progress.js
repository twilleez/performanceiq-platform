function sparkline(values, color = "#53b5ff") {
  if (!values || values.length < 2) return "";
  const w = 120, h = 36, pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (pad + (i / (values.length - 1)) * (w - pad * 2)).toFixed(1);
    const y = (h - pad - ((v - min) / range) * (h - pad * 2)).toFixed(1);
    return `${x},${y}`;
  });
  const [lx, ly] = pts[pts.length - 1].split(",");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;margin-top:10px">
    <polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>
    <circle cx="${lx}" cy="${ly}" r="3.5" fill="${color}"/>
  </svg>`;
}

export function progressView(state) {
  const { prs, readinessTrend } = state;

  // Pillar percentages derived from recent readiness trend
  const avgReadiness = readinessTrend.length
    ? Math.round(readinessTrend.reduce((s, r) => s + r.score, 0) / readinessTrend.length)
    : null;

  const pillars = [
    ["Readiness Avg", avgReadiness !== null ? avgReadiness : "—", "#53b5ff"],
    ["Sessions",      state.recentWorkouts?.filter(w => w.completed_at).length ?? "—", "#ff6b35"],
    ["PRs Set",       prs.length, "#34d399"],
  ];

  const pillarCards = pillars.map(([l, p, c]) => `
    <div class="card">
      <div class="metric-sm" style="color:${c}">${p}${typeof p === "number" && l === "Readiness Avg" ? "%" : ""}</div>
      <div class="muted">${l}</div>
      ${typeof p === "number" && l === "Readiness Avg"
        ? `<div style="margin-top:8px;height:4px;border-radius:4px;background:rgba(255,255,255,.07)">
             <div style="width:${p}%;height:100%;border-radius:4px;background:${c};opacity:.75"></div>
           </div>`
        : ""}
    </div>
  `).join("");

  // Readiness trend sparkline
  const trendValues = readinessTrend.map(r => r.score);
  const trendCard = readinessTrend.length >= 2 ? `
    <div class="card section">
      <div class="title-md">Readiness Trend (14 days)</div>
      ${sparkline(trendValues, "#53b5ff")}
      <div class="row section" style="justify-content:space-between">
        <span class="muted small">Low: ${Math.min(...trendValues)}</span>
        <span class="muted small">High: ${Math.max(...trendValues)}</span>
        <span class="muted small">Avg: ${avgReadiness}</span>
      </div>
    </div>
  ` : `<div class="card section"><div class="muted">Log at least 2 days of readiness to see your trend.</div></div>`;

  // PRs
  const prItems = prs.length ? prs.map(pr => `
    <div class="item">
      <strong>${pr.exercise_id}</strong>
      <div class="muted">${pr.label}</div>
      <div class="muted small" style="font-size:11px;margin-top:4px">${pr.set_at}</div>
    </div>
  `).join("") : `<div class="item muted">No PRs logged yet. Complete a session to start tracking.</div>`;

  return `
    <div class="screen">
      <div class="topbar">
        <div><div class="muted">Progress</div><div class="title-xl">Depth Over Noise</div></div>
      </div>
      <div class="grid three section">${pillarCards}</div>
      ${trendCard}
      <div class="card section">
        <div class="title-md">Personal Records</div>
        <div class="list section">${prItems}</div>
      </div>
    </div>`;
}
