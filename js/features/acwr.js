// /js/features/acwr.js
// Acute: last 7 days load. Chronic: last 28 days load.
// Returns null if insufficient data.

export function computeACWR(sessionLogs = [], refDate = new Date()) {
  const logs = Array.isArray(sessionLogs) ? sessionLogs : [];
  const ref = new Date(refDate);
  const dayMs = 24 * 60 * 60 * 1000;

  function inRange(daysBack) {
    const start = new Date(ref.getTime() - daysBack * dayMs);
    return logs.filter(l => {
      const d = new Date(l.date || l.created_at || 0);
      return d >= start && d <= ref;
    });
  }

  const acute = inRange(7).reduce((sum, l) => sum + (Number(l.load) || 0), 0);
  const chronic = inRange(28).reduce((sum, l) => sum + (Number(l.load) || 0), 0);

  // Chronic is 4 weeks, so compare weekly acute to weekly chronic average
  const chronicWeeklyAvg = chronic / 4;

  if (chronicWeeklyAvg <= 0) return null;
  return acute / chronicWeeklyAvg;
}
