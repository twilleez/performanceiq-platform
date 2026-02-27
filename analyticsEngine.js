// analyticsEngine.js — v1.0.0
// Week 7–8 Analytics Layer
// Weekly summary + time series extraction (load/readiness/nutrition/risk)

(function () {
  "use strict";
  if (window.analyticsEngine) return;

  function iso(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.toISOString().slice(0, 10);
  }

  function addDays(dateISO, days) {
    const d = new Date(dateISO + "T00:00:00");
    d.setDate(d.getDate() + days);
    return iso(d);
  }

  function dateRange(endISO, daysBack) {
    const out = [];
    for (let i = daysBack - 1; i >= 0; i--) out.push(addDays(endISO, -i));
    return out;
  }

  function sum(arr) {
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += Number(arr[i] || 0);
    return s;
  }

  function getDailyLoadFromSessions(sessionsByAthlete, athleteId, dayISO) {
    const key = athleteId + "|" + dayISO;
    const arr = sessionsByAthlete[key] || [];
    let total = 0;
    for (let i = 0; i < arr.length; i++) total += Number(arr[i].load || 0);
    return total;
  }

  function weeklySummary({ athleteId, endISO, sessionsByAthlete }) {
    const days = dateRange(endISO, 7);
    const daily = days.map(d => getDailyLoadFromSessions(sessionsByAthlete, athleteId, d));
    const total = sum(daily);
    return { days, daily, total };
  }

  window.analyticsEngine = {
    iso,
    addDays,
    dateRange,
    getDailyLoadFromSessions,
    weeklySummary
  };
})();
