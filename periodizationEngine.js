// periodizationEngine.js — v2.0.0
// Week 5–6 Production Engine
// Handles training phase detection + volume scaling + load strategy

(function () {
  "use strict";
  if (window.periodizationEngine) return;

  const PHASES = {
    ACCUMULATION: {
      label: "Accumulation",
      volumeMultiplier: 1.1,
      intensityMultiplier: 0.9,
      description: "Higher volume, moderate intensity."
    },
    INTENSIFICATION: {
      label: "Intensification",
      volumeMultiplier: 0.9,
      intensityMultiplier: 1.1,
      description: "Lower volume, higher intensity."
    },
    DELOAD: {
      label: "Deload",
      volumeMultiplier: 0.6,
      intensityMultiplier: 0.8,
      description: "Reduced load for recovery."
    },
    PEAK: {
      label: "Peak",
      volumeMultiplier: 0.75,
      intensityMultiplier: 1.15,
      description: "Performance peak taper."
    }
  };

  function getCurrentPhase(weekNumber) {
    if (weekNumber % 8 === 0) return "PEAK";
    if (weekNumber % 4 === 0) return "DELOAD";
    if (weekNumber % 2 === 0) return "INTENSIFICATION";
    return "ACCUMULATION";
  }

  function adjustVolume(baseVolume, phase) {
    const p = PHASES[phase] || PHASES.ACCUMULATION;
    return Math.round(baseVolume * p.volumeMultiplier);
  }

  function adjustIntensity(baseIntensity, phase) {
    const p = PHASES[phase] || PHASES.ACCUMULATION;
    return Math.round(baseIntensity * p.intensityMultiplier);
  }

  window.periodizationEngine = {
    PHASES,
    getCurrentPhase,
    adjustVolume,
    adjustIntensity
  };
})();
