// performanceEngine.js — v1.0.0

(function () {
  "use strict";
  if (window.performanceEngine) return;

  function avg(arr) {
    if (!arr?.length) return 0;
    return arr.reduce((a,b)=>a+b,0)/arr.length;
  }

  function normalizeTrend(current, previous) {
    if (!previous) return 50;
    const pct = (current - previous) / previous;
    return Math.max(0, Math.min(100, 50 + (pct * 100)));
  }

  function computePerformanceIQ(metrics) {
    const {
      consistency,
      strengthCurrent,
      strengthPrevious,
      speedCurrent,
      speedPrevious,
      readinessAvg,
      recoveryScore,
      loadBalance
    } = metrics;

    const strengthTrend = normalizeTrend(strengthCurrent, strengthPrevious);
    const speedTrend = normalizeTrend(speedCurrent, speedPrevious);

    const score =
      (consistency * 0.20) +
      (strengthTrend * 0.20) +
      (speedTrend * 0.15) +
      (readinessAvg * 0.20) +
      (recoveryScore * 0.15) +
      (loadBalance * 0.10);

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  window.performanceEngine = {
    computePerformanceIQ
  };
})();
