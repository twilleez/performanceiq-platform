// workoutEngine.js — v1.1.0
// Adds: "today workout" with target minutes + target sRPE by sport + phase

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
      ],
      target: { minutes: 60, rpe: 6 }
    },
    football: {
      base: [
        "Dynamic Warm-up",
        "Linear Sprint Work",
        "Power Clean Pattern",
        "Broad Jumps",
        "Bench Press",
        "Agility Ladder"
      ],
      advanced: [
        "Cluster Sets",
        "Resisted Sled Sprints",
        "Explosive Med Ball Throws"
      ],
      target: { minutes: 70, rpe: 7 }
    },
    soccer: {
      base: [
        "Dynamic Warm-up",
        "Aerobic Tempo Runs",
        "Change of Direction Drills",
        "Single-leg Strength",
        "Core + Groin Stability"
      ],
      advanced: [
        "Repeated Sprint Ability",
        "Nordic Hamstrings",
        "Plyometric Bounding"
      ],
      target: { minutes: 65, rpe: 6 }
    }
  };

  function generateWorkout({ sport = "basketball", advanced = false, phase = "ACCUMULATION" }) {
    const lib = SPORT_LIBRARY[sport] || SPORT_LIBRARY.basketball;
    const exercises = [...lib.base];
    if (advanced) exercises.push(...lib.advanced);

    // Phase-based target tweaks
    let minutes = lib.target.minutes;
    let rpe = lib.target.rpe;

    if (phase === "DELOAD") { minutes = Math.round(minutes * 0.65); rpe = Math.max(4, rpe - 2); }
    if (phase === "INTENSIFICATION") { minutes = Math.round(minutes * 0.9); rpe = Math.min(9, rpe + 1); }
    if (phase === "PEAK") { minutes = Math.round(minutes * 0.75); rpe = Math.min(9, rpe + 1); }

    return { sport, advanced, phase, minutes, rpe, exercises };
  }

  window.workoutEngine = { generateWorkout };
})();
