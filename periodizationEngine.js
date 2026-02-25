// periodizationEngine.js — v1.1.0
// Backward compatible with v1.0.0 (keeps adjustVolume + getCurrentPhase)
// Adds: getSportBaseLoad(), getPhase(), getWeeklyTargetLoad()

(function () {
  "use strict";
  if (window.periodizationEngine) return;

  // Phase order matters (PEAK must be checked before DELOAD)
  function getCurrentPhase(week) {
    const w = Number(week) || 1;
    // Week 8, 16, 24 ... should be PEAK (not deload)
    if (w % 8 === 0) return "PEAK";
    if (w % 4 === 0) return "DELOAD";
    // (Optional) intensification every 3rd week that's not deload/peak
    if (w % 3 === 0) return "INTENSIFICATION";
    return "ACCUMULATION";
  }

  // Backward-compatible name
  function adjustVolume(baseVolume, phase) {
    const v = Number(baseVolume) || 0;
    switch (String(phase || "").toUpperCase()) {
      case "ACCUMULATION":     return v * 1.10;
      case "INTENSIFICATION":  return v * 0.95;
      case "DELOAD":           return v * 0.60;
      case "PEAK":             return v * 0.75;
      default:                 return v;
    }
  }

  // Sport-aware base weekly load (sRPE × minutes)
  function getSportBaseLoad(sport, goal) {
    const s = String(sport || "").toLowerCase();
    const g = String(goal || "").toLowerCase();

    // Goal baseline modifier
    let goalMult = 1.0;
    if (g === "offseason") goalMult = 1.12;
    if (g === "inseason")  goalMult = 0.95;
    if (g === "rehab")     goalMult = 0.70;

    // Sport baseline
    let base = 1800; // general team sport baseline
    if (s === "basketball") base = 1850;
    if (s === "football")   base = 2100;
    if (s === "soccer")     base = 2000;
    if (s === "baseball")   base = 1600;
    if (s === "volleyball") base = 1750;
    if (s === "track")      base = 1900;
    if (s === "wrestling")  base = 1950;
    if (s === "lacrosse")   base = 1900;
    if (s === "hockey")     base = 2050;

    return Math.round(base * goalMult);
  }

  // Slight progressive overload across weeks (very safe)
  function progressiveWaveFactor(week) {
    const w = Math.max(1, Number(week) || 1);
    // ~4% per week up to week 10 then flatten
    const f = 1 + Math.min(9, (w - 1)) * 0.04;
    return f;
  }

  // Expanded API: returns the phase (uses getCurrentPhase for compatibility)
  function getPhase(week) {
    return getCurrentPhase(week);
  }

  // Expanded API: compute a target load for a given sport/goal/week
  function getWeeklyTargetLoad({ sport, goal, week, baseLoad }) {
    const w = Math.max(1, Number(week) || 1);
    const phase = getPhase(w);

    const base = Number(baseLoad) > 0 ? Number(baseLoad) : getSportBaseLoad(sport, goal);
    const wave = progressiveWaveFactor(w);

    const raw = base * wave;
    const adjusted = adjustVolume(raw, phase);

    return {
      week: w,
      phase,
      baseLoad: Math.round(base),
      targetLoad: Math.round(adjusted)
    };
  }

  window.periodizationEngine = {
    adjustVolume,
    getCurrentPhase, // keep old name
    getPhase,
    getSportBaseLoad,
    getWeeklyTargetLoad
  };
})();
