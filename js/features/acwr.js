// /js/features/acwr.js
// Acute: last 7 days load. Chronic: last 28 days load.
// Returns null if insufficient data.

function toLocalMidnight(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseLogDate(l) {
  // Prefer explicit YYYY-MM-DD
  if (typeof l?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(l.date)) {
    const [y, m, d] = l.date.split("-").map(Number);
    return new Date(y, m - 1, d); // local midnight
  }
  // Fallback to created_at or Date-compatible
  const dt = new Date(l?.created_at || 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function computeACWR(sessionLogs = [], refDate = new Date()) {
  const logs = Array.isArray(sessionLogs) ? sessionLogs : [];
  const ref = toLocalMidnight(refDate);
  const dayMs = 24 * 60 * 60 * 1000;

  function inRange(daysBack) {
    const start = new Date(ref.getTime() - (daysBack - 1) * dayMs);
    return logs.filter(l => {
      const d = parseLogDate(l);
      if (!d) return false;
      const dd = toLocalMidnight(d);
      return dd >= start && dd <= ref;
    });
  }

  const acute = inRange(7).reduce((sum, l) => sum + (Number(l.load) || 0), 0);
  const chronic = inRange(28).reduce((sum, l) => sum + (Number(l.load) || 0), 0);

  const chronicWeeklyAvg = chronic / 4;
  if (chronicWeeklyAvg <= 0) return null;

  return acute / chronicWeeklyAvg;
}
