// periodizationEngine.js — v1.0.0

(function () {
  "use strict";
  if (window.periodizationEngine) return;

  function adjustVolume(baseVolume, phase) {
    switch (phase) {
      case "ACCUMULATION": return baseVolume * 1.1;
      case "INTENSIFICATION": return baseVolume * 0.9;
      case "DELOAD": return baseVolume * 0.6;
      case "PEAK": return baseVolume * 0.75;
      default: return baseVolume;
    }
  }

  function getCurrentPhase(week) {
    if (week % 4 === 0) return "DELOAD";
    if (week % 8 === 0) return "PEAK";
    return "ACCUMULATION";
  }

  window.periodizationEngine = { adjustVolume, getCurrentPhase };
})();
