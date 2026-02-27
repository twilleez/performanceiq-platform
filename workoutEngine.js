// workoutEngine.js — v1.0.0
// Sport-aware workout generator + advanced toggle

(function () {
  "use strict";
  if (window.workoutEngine) return;

  const SPORT_LIBRARY = {
    basketball: {
      base: [
        "Dynamic Warm-up",
        "Acceleration Sprints",
        "Lateral Defensive Slides",
        "Core Stability Circuit",
        "Plyometric Jumps"
      ],
      advanced: [
        "Contrast Jumps",
        "Reactive Change of Direction",
        "Heavy Trap Bar Deadlift",
        "Single-leg Bulgarian Split Squats"
      ]
    },
    football: {
      base: [
        "Linear Sprint Work",
        "Power Cleans",
        "Broad Jumps",
        "Bench Press",
        "Agility Ladder"
      ],
      advanced: [
        "Cluster Sets",
        "Resisted Sled Sprints",
        "Explosive Med Ball Throws"
      ]
    }
  };

  function generateWorkout({ sport = "basketball", advanced = false }) {
    const lib = SPORT_LIBRARY[sport] || SPORT_LIBRARY.basketball;
    const exercises = [...lib.base];

    if (advanced) exercises.push(...lib.advanced);

    return {
      sport,
      advanced,
      exercises
    };
  }

  window.workoutEngine = {
    generateWorkout
  };
})();
