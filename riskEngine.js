// riskEngine.js — v1.0.0

(function () {
  "use strict";
  if (window.riskEngine) return;

  function computeACWR(acute, chronic) {
    if (!chronic) return 1;
    return acute / chronic;
  }

  function detectRisk({ sleepHours, energy, acuteLoad, chronicLoad, performanceTrend }) {
    const acwr = computeACWR(acuteLoad, chronicLoad);

    let risk = "LOW";

    if (acwr > 1.5 || sleepHours < 6 || performanceTrend < -5) {
      risk = "HIGH";
    } else if (acwr > 1.3 || energy < 3) {
      risk = "MODERATE";
    }

    return { risk, acwr };
  }

  window.riskEngine = { detectRisk };
})();
