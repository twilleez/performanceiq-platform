// periodizationEngine.js — v1.0.0 (Periodization Engine, offline-safe)
(function () {
  "use strict";
  if (window.periodizationEngine) return;

  function nowISO() { return new Date().toISOString(); }

  // Very simple 4-week wave generator (base load minutes target)
  function generate4WeekPlan(opts) {
    const sport = opts?.sport || "basketball";
    const baseMinutes = Number(opts?.baseMinutes || 180); // total minutes/week target
    const start = opts?.startISO || new Date().toISOString().slice(0, 10);

    // Wave: build, build, deload, peak
    const factors = [1.00, 1.10, 0.75, 1.15];

    const weeks = factors.map((f, i) => {
      const target = Math.round(baseMinutes * f);
      return {
        week: i + 1,
        sport,
        target_minutes: target,
        notes:
          i === 2 ? "Deload week: reduce volume, keep quality."
          : i === 3 ? "Peak week: crisp intensity, manage fatigue."
          : "Build week: progressive volume + quality."
      };
    });

    return {
      id: "plan_" + Math.random().toString(36).slice(2, 9),
      created_at: nowISO(),
      start_date: start,
      sport,
      base_minutes: baseMinutes,
      weeks
    };
  }

  window.periodizationEngine = { generate4WeekPlan };
})();
