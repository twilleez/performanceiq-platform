// periodizationEngine.js — v2.1.0
// Adds: suggested weekly target load given baseline + phase multipliers

(function () {
  "use strict";
  if (window.periodizationEngine) return;

  const PHASES = {
    ACCUMULATION: { label: "Accumulation", vol: 1.1, intn: 0.9, desc: "Higher volume, moderate intensity." },
    INTENSIFICATION: { label: "Intensification", vol: 0.9, intn: 1.1, desc: "Lower volume, higher intensity." },
    DELOAD: { label: "Deload", vol: 0.6, intn: 0.8, desc: "Reduced load for recovery." },
    PEAK: { label: "Peak", vol: 0.75, intn: 1.15, desc: "Taper + performance emphasis." }
  };

  function getCurrentPhase(weekNumber) {
    if (weekNumber % 8 === 0) return "PEAK";
    if (weekNumber % 4 === 0) return "DELOAD";
    if (weekNumber % 2 === 0) return "INTENSIFICATION";
    return "ACCUMULATION";
  }

  function adjustVolume(baseVolume, phase) {
    const p = PHASES[phase] || PHASES.ACCUMULATION;
    return Math.round(baseVolume * p.vol);
  }

  function adjustIntensity(baseIntensity, phase) {
    const p = PHASES[phase] || PHASES.ACCUMULATION;
    return Math.round(baseIntensity * p.intn);
  }

  function weeklyTargetLoad({ baselineWeekLoad, weekNumber }) {
    const phase = getCurrentPhase(weekNumber);
    const p = PHASES[phase] || PHASES.ACCUMULATION;
    const target = Math.round((baselineWeekLoad || 0) * p.vol);
    return { phase, target, label: p.label, desc: p.desc };
  }

  window.periodizationEngine = {
    PHASES,
    getCurrentPhase,
    adjustVolume,
    adjustIntensity,
    weeklyTargetLoad
  };
})();
