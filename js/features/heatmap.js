// /js/features/heatmap.js
// Team Heatmap: compact visualization of recent training loads per athlete.

function safeSessions(athlete) {
  const s = athlete?.history?.sessions;
  return Array.isArray(s) ? s : [];
}

function dayKey(d) {
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

// Build last N days ending today (local date).
export function buildDays(n = 14) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
}

// Returns an array of numbers length=daysCount representing load per day.
export function athleteDailyLoad(athlete, days = buildDays(14)) {
  const sessions = safeSessions(athlete);
  const map = new Map();
  for (const s of sessions) {
    const k = dayKey(s.date);
    if (!k) continue;
    const load = Number(s.load);
    if (!Number.isFinite(load)) continue;
    map.set(k, (map.get(k) || 0) + load);
  }
  return days.map((d) => {
    const k = d.toISOString().slice(0, 10);
    return map.get(k) || 0;
  });
}

// Convert load to a small set of levels (0..4)
export function loadLevel(load) {
  const x = Number(load) || 0;
  if (x <= 0) return 0;
  if (x < 40) return 1;
  if (x < 70) return 2;
  if (x < 100) return 3;
  return 4;
}

export function renderHeatmapHTML(athletes, days = buildDays(14)) {
  const cols = days.length;
  const dayLabels = days
    .map((d) => {
      const m = d.toLocaleString(undefined, { month: "short" });
      const dd = String(d.getDate()).padStart(2, "0");
      return `${m} ${dd}`;
    })
    .join("|");

  const rows = (athletes || []).map((a) => {
    const loads = athleteDailyLoad(a, days);
    const cells = loads
      .map((v) => {
        const lv = loadLevel(v);
        const tip = `Load: ${Math.round(v)}\n${a.name || "Athlete"}`;
        return `<div class="hm-cell lv-${lv}" title="${tip.replace(/"/g, "&quot;")}"></div>`;
      })
      .join("");
    return `
      <div class="hm-row">
        <div class="hm-name">${(a.name || "Athlete").replace(/</g, "&lt;")}</div>
        <div class="hm-grid" style="grid-template-columns: repeat(${cols}, 1fr)">${cells}</div>
      </div>
    `;
  });

  const headerCells = days
    .map((d) => {
      const wd = d.toLocaleString(undefined, { weekday: "narrow" });
      return `<div class="hm-day" title="${d.toDateString()}">${wd}</div>`;
    })
    .join("");

  return `
    <div class="hm" data-days="${dayLabels.replace(/"/g, "&quot;")}">
      <div class="hm-head">
        <div class="hm-name hm-name-head">Athlete</div>
        <div class="hm-days" style="grid-template-columns: repeat(${cols}, 1fr)">${headerCells}</div>
      </div>
      ${rows.join("") || `<div class="hm-empty">No athletes yet</div>`}
      <div class="hm-legend">
        <span class="hm-legend-label">Load</span>
        <span class="hm-legend-dot lv-0" title="0"></span>
        <span class="hm-legend-dot lv-1" title="Low"></span>
        <span class="hm-legend-dot lv-2" title="Moderate"></span>
        <span class="hm-legend-dot lv-3" title="High"></span>
        <span class="hm-legend-dot lv-4" title="Very High"></span>
      </div>
    </div>
  `;
}
