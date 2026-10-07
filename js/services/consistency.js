const DAY_MS = 86_400_000;
function entryTs(entry) { const ts = Number(entry?.ts); return Number.isFinite(ts) ? ts : NaN; }
function localMidnight(t) { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
function daysAgo(t, now) { return Math.round((localMidnight(now) - localMidnight(t)) / DAY_MS); }
export function isCheckIn(entry) { return entry?.type === 'checkin'; }
export function isTrainingEntry(entry) { return !!entry && !isCheckIn(entry); }
export function isSession(entry) { return isTrainingEntry(entry) && entry.completed !== false && Number.isFinite(entryTs(entry)); }
export function trainingEntries(log) { return (Array.isArray(log) ? log : []).filter(isTrainingEntry); }
export function completedSessions(log) { return (Array.isArray(log) ? log : []).filter(isSession); }
export function trainingDaysAgo(log, { now = Date.now() } = {}) {
  const days = new Set();
  for (const e of completedSessions(log)) { const ago = daysAgo(entryTs(e), now); if (ago >= 0) days.add(ago); }
  return [...days].sort((a, b) => a - b);
}
export function trainingDaysInWindow(log, { now = Date.now(), days = 28 } = {}) {
  return trainingDaysAgo(log, { now }).filter(ago => ago < days).length;
}
export function allowedRestDays(daysPerWeek) {
  const n = Math.round(Number(daysPerWeek));
  const plan = Number.isFinite(n) && n >= 1 ? Math.min(7, n) : 4;
  return 7 - plan;
}
export function currentStreak(log, { now = Date.now(), daysPerWeek = 4 } = {}) {
  const days = trainingDaysAgo(log, { now });
  if (!days.length) return 0;
  const allowed = allowedRestDays(daysPerWeek);
  const restSinceLast = Math.max(0, days[0] - 1);
  if (restSinceLast > allowed) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const restBetween = days[i] - days[i - 1] - 1;
    if (restBetween > allowed) break;
    streak++;
  }
  return streak;
}
export function planAdherence(log, { now = Date.now(), daysPerWeek = 4 } = {}) {
  const n = Math.round(Number(daysPerWeek));
  const plan = (Number.isFinite(n) && n >= 1 ? Math.min(7, n) : 4) * 4;
  const done = trainingDaysInWindow(log, { now, days: 28 });
  return Math.min(100, Math.round((done / plan) * 100));
}
