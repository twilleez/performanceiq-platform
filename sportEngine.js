// sportEngine.js — v1.0.0 (FULL FILE)
(function () {
  "use strict";
  if (window.sportEngine) return;

  const SPORTS = [
    { id: "basketball", label: "Basketball", traits: ["power", "speed", "skill", "change_of_direction"], emphasis: { power: 0.25, speed: 0.20, strength: 0.20, endurance: 0.10, skill: 0.25 } },
    { id: "football", label: "Football", traits: ["power", "speed", "strength"], emphasis: { power: 0.30, speed: 0.20, strength: 0.35, endurance: 0.05, skill: 0.10 } },
    { id: "soccer", label: "Soccer", traits: ["endurance", "speed", "skill"], emphasis: { power: 0.10, speed: 0.20, strength: 0.15, endurance: 0.35, skill: 0.20 } },
    { id: "baseball", label: "Baseball", traits: ["power", "skill", "mobility"], emphasis: { power: 0.25, speed: 0.10, strength: 0.25, endurance: 0.05, skill: 0.35 } },
    { id: "volleyball", label: "Volleyball", traits: ["power", "speed", "skill"], emphasis: { power: 0.30, speed: 0.15, strength: 0.20, endurance: 0.05, skill: 0.30 } },
    { id: "track", label: "Track & Field", traits: ["speed", "power"], emphasis: { power: 0.25, speed: 0.35, strength: 0.25, endurance: 0.10, skill: 0.05 } }
  ];

  function getSport(sportId) {
    const id = String(sportId || "").toLowerCase();
    return SPORTS.find(s => s.id === id) || SPORTS[0];
  }

  function listSports() {
    return SPORTS.slice();
  }

  window.sportEngine = {
    SPORTS,
    getSport,
    listSports
  };
})();
