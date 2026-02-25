// workoutEngine.js — v1.0.0
// Generates weekly workout plans by sport + level + periodization phase.
// Writeback-ready: each session can be logged as Training Log (minutes x RPE).
(function () {
  "use strict";
  if (window.workoutEngine) return;

  const clamp = (n, a, b) => Math.min(Math.max(Number(n) || 0, a), b);

  function safeISO(d) {
    const s = String(d || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }
  const todayISO = () => new Date().toISOString().slice(0, 10);

  function addDaysISO(iso, deltaDays) {
    const d = safeISO(iso) || todayISO();
    const ms = Date.parse(d);
    if (!Number.isFinite(ms)) return todayISO();
    return new Date(ms + deltaDays * 86400000).toISOString().slice(0, 10);
  }

  function weekStartMondayISO(iso) {
    const d = new Date(safeISO(iso) || todayISO());
    const day = d.getDay(); // 0=Sun
    const diff = (day === 0 ? -6 : 1) - day; // to Monday
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }

  function phaseForWeek(weekIndex1) {
    // Prefer periodizationEngine if available
    const pe = window.periodizationEngine;
    if (pe?.getCurrentPhase) return pe.getCurrentPhase(weekIndex1);
    if (weekIndex1 % 4 === 0) return "DELOAD";
    if (weekIndex1 % 8 === 0) return "PEAK";
    return "ACCUMULATION";
  }

  function planWeek({ athleteId, sportId, level, weekStartISO, weekIndex1, defaultDayType }) {
    const se = window.sportEngine;
    if (!se?.buildSession) throw new Error("sportEngine missing");

    const phase = phaseForWeek(weekIndex1);

    // Pattern: Mon/Tue/Thu/Sat sessions + optional Wed recovery
    const pattern = [
      { dow: 1, dayType: defaultDayType || "training" }, // Mon
      { dow: 2, dayType: defaultDayType || "training" }, // Tue
      { dow: 3, dayType: "recovery" },                   // Wed
      { dow: 4, dayType: defaultDayType || "training" }, // Thu
      { dow: 6, dayType: defaultDayType === "game" ? "game" : "training" }, // Sat
      { dow: 0, dayType: "rest" } // Sun
    ];

    const sessions = pattern.map((p) => {
      const dateISO = addDaysISO(weekStartISO, p.dow === 0 ? 6 : (p.dow - 1)); // Mon=0 index
      const sess = se.buildSession({ sportId, level, phase, dayType: p.dayType });
      const load = Math.round((sess.minutes || 0) * (sess.rpe || 0));
      return {
        id: `${athleteId}_${dateISO}_${Math.random().toString(16).slice(2)}`,
        athleteId,
        sportId,
        level,
        weekIndex1,
        weekStartISO,
        dateISO,
        dayType: p.dayType,
        phase,
        minutes: sess.minutes,
        rpe: sess.rpe,
        load,
        logType: sess.logType,
        blocks: sess.blocks
      };
    });

    const weeklyLoad = sessions.reduce((a, s) => a + (s.load || 0), 0);

    return {
      athleteId,
      sportId,
      level,
      weekIndex1,
      weekStartISO,
      phase,
      sessions,
      weeklyLoad
    };
  }

  function generate({ athleteId, sportId, level, startISO, weeks, defaultDayType }) {
    const start = weekStartMondayISO(startISO || todayISO());
    const W = clamp(weeks, 2, 16);

    const weeksPlan = [];
    for (let i = 1; i <= W; i++) {
      const wkStart = addDaysISO(start, (i - 1) * 7);
      weeksPlan.push(planWeek({ athleteId, sportId, level, weekStartISO: wkStart, weekIndex1: i, defaultDayType }));
    }

    return {
      athleteId,
      sportId,
      level,
      startISO: start,
      weeks: W,
      defaultDayType: defaultDayType || "training",
      weeksPlan
    };
  }

  window.workoutEngine = {
    weekStartMondayISO,
    generate
  };
})();
