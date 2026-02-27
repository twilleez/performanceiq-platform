// periodizationEngine.js — v1.1.0 (phase + volume/intensity helpers)
(function () {
  "use strict";
  if (window.periodizationEngine) return;

  function adjustVolume(baseVolume, phase) {
    const v = Number(baseVolume) || 0;
    switch (phase) {
      case "ACCUMULATION": return v * 1.1;
      case "INTENSIFICATION": return v * 0.9;
      case "DELOAD": return v * 0.6;
      case "PEAK": return v * 0.75;
      default: return v;
    }
  }

  function getCurrentPhase(week) {
    const w = Math.max(1, Number(week) || 1);
    if (w % 8 === 0) return "PEAK";
    if (w % 4 === 0) return "DELOAD";
    // simple alternation to feel realistic
    if (w % 3 === 0) return "INTENSIFICATION";
    return "ACCUMULATION";
  }

  function phaseHint(phase) {
    const map = {
      ACCUMULATION: "Build volume + capacity.",
      INTENSIFICATION: "Raise intensity, reduce volume slightly.",
      DELOAD: "Reduce load, recover, sharpen technique.",
      PEAK: "Keep quality high, lower fatigue."
    };
    return map[phase] || "";
  }

  window.periodizationEngine = {
    adjustVolume,
    getCurrentPhase,
    phaseHint
  };
})();
