// automationEngine.js — v13.0.0
// Week 13–14: keep lightweight. Core will call these hooks.
// (Later phases can expand these into smart alerts, weekly summaries, etc.)

(function () {
  "use strict";
  if (window.automationEngine) return;

  function computeAutoBadges(teamState) {
    // Return small, non-intrusive “badges” for Home cards.
    // Kept conservative for production.
    const out = [];
    try {
      const athletes = teamState?.athletes || [];
      if (!athletes.length) out.push({ type: "info", text: "Add athletes to begin tracking." });
    } catch {}
    return out;
  }

  window.automationEngine = {
    computeAutoBadges
  };
})();
