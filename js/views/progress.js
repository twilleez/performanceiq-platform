// ─── Mini sparkline SVG from an array of 5 data points ───────────────────────
function sparkline(values, color = "#53b5ff") {
  if (!values || values.length < 2) return "";
  const w = 120, h = 36, pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;margin-top:10px">
      <polyline
        points="${pts.join(" ")}"
        fill="none"
        stroke="${color}"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.85"
      />
      <circle cx="${pts[pts.length-1].split(",")[0]}" cy="${pts[pts.length-1].split(",")[1]}" r="3.5" fill="${color}" />
    </svg>
  `;
}

export function progressView(state) {
  const pillars = [
    ["Strength",      state.progress.strength,      "#53b5ff"],
    ["Conditioning",  state.progress.conditioning,  "#ff6b35"],
    ["Mobility",      state.progress.mobility,       "#34d399"],
  ];

  const pillarCards = pillars.map(([l, p, c]) => `
    <div class="card">
      <div class="metric-sm" style="color:${c}">${p}%</div>
      <div class="muted">${l}</div>
      <div style="margin-top:8px;height:4px;border-radius:4px;background:rgba(255,255,255,.07)">
        <div style="width:${p}%;height:100%;border-radius:4px;background:${c};opacity:.75;transition:width .4s"></div>
      </div>
    </div>
  `).join("");

  const timelineItems = state.progress.timeline.map(x => `
    <div class="timeline-item space">
      <span>${x.week}</span>
      <span class="muted">${x.delta}</span>
    </div>
  `).join("");

  const prItems = state.progress.prs.map(pr => `
    <div class="item">
      <strong>${pr.label}</strong>
      <div class="muted">${pr.value}</div>
      ${sparkline(pr.history)}
    </div>
  `).join("");

  const insightItems = state.progress.insights.map(x => `
    <div class="item">${x}</div>
  `).join("");

  return `
    <div class="screen">
      <div class="topbar">
        <div>
          <div class="muted">Progress</div>
          <div class="title-xl">Depth Over Noise</div>
        </div>
      </div>

      <div class="grid three section">${pillarCards}</div>

      <div class="grid two section">
        <div class="card">
          <div class="title-md">Block Timeline</div>
          <div class="list section">${timelineItems}</div>
        </div>
        <div class="card">
          <div class="title-md">PR History</div>
          <div class="list section">${prItems}</div>
        </div>
      </div>

      <div class="card section">
        <div class="title-md">Insights</div>
        <div class="list section">${insightItems}</div>
      </div>
    </div>
  `;
}
