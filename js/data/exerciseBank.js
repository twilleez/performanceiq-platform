// /js/data/exerciseBank.js
// Provides BOTH named + default exports to prevent import mismatches.

export const EXERCISE_BANK = Object.freeze({
  basketball: Object.freeze({
    warmup: Object.freeze([
      { name: "Dynamic warm-up flow", sets: 1, reps: "8–10 min", notes: "Hips/ankles/T-spine" },
      { name: "A-skip / B-skip", sets: 2, reps: "20 yd", notes: "Tall posture, fast contacts" },
      { name: "Lateral shuffle + open/close", sets: 2, reps: "20 yd", notes: "Stay low, quick feet" }
    ]),
    skill: Object.freeze([
      { name: "Ball-handling (2-ball series)", sets: 3, reps: "30–45s", notes: "Low/High/Pounds/Cross" },
      { name: "Change of pace (Hesi → burst)", sets: 4, reps: "6 reps", notes: "Game-speed" },
      { name: "Finishing (2-foot + 1-foot)", sets: 4, reps: "6 reps", notes: "Both sides" },
      { name: "Shooting: form + rhythm", sets: 5, reps: "8 makes", notes: "Start close, build out" }
    ]),
    strength: Object.freeze([
      { name: "Trap bar deadlift", sets: 4, reps: "3–6", notes: "RPE 7–8" },
      { name: "Rear-foot elevated split squat", sets: 3, reps: "6–8/side", notes: "Control eccentric" },
      { name: "DB bench press", sets: 3, reps: "6–10", notes: "Full range" },
      { name: "Pull-ups / Lat pulldown", sets: 3, reps: "6–10", notes: "Scap control" }
    ]),
    speed: Object.freeze([
      { name: "Acceleration sprints", sets: 6, reps: "10–20 yd", notes: "Full rest" },
      { name: "Lateral bounds", sets: 4, reps: "5/side", notes: "Stick landing" },
      { name: "Reactive closeout → backpedal", sets: 4, reps: "20s", notes: "Fast decel" }
    ]),
    conditioning: Object.freeze([
      { name: "Shuttle runs (suicides)", sets: 6, reps: "1 rep", notes: "60–90s rest" },
      { name: "Court tempo", sets: 8, reps: "20s on / 40s off", notes: "Smooth pace" }
    ]),
    recovery: Object.freeze([
      { name: "Bike / walk", sets: 1, reps: "15–20 min", notes: "Zone 1–2" },
      { name: "Mobility reset", sets: 1, reps: "8–10 min", notes: "Hips/ankles/hamstrings" }
    ])
  }),

  football: Object.freeze({
    warmup: Object.freeze([
      { name: "Dynamic warm-up flow", sets: 1, reps: "8–10 min", notes: "Hips/ankles/T-spine" },
      { name: "Sprint mechanics drills", sets: 3, reps: "10–15 yd", notes: "A-march/A-skip" }
    ]),
    strength: Object.freeze([
      { name: "Back squat", sets: 4, reps: "3–6", notes: "RPE 7–8" },
      { name: "Bench press", sets: 4, reps: "3–6", notes: "Bar speed focus" },
      { name: "RDL", sets: 3, reps: "6–8", notes: "Hamstrings" },
      { name: "Row variation", sets: 3, reps: "8–10", notes: "Upper back" }
    ]),
    speed: Object.freeze([
      { name: "Acceleration sprints", sets: 8, reps: "10–20 yd", notes: "Full rest" },
      { name: "5-10-5 pro agility", sets: 5, reps: "1 rep", notes: "Sharp cuts" }
    ]),
    conditioning: Object.freeze([
      { name: "Gassers", sets: 8, reps: "1 rep", notes: "1:2 work:rest" }
    ]),
    recovery: Object.freeze([
      { name: "Mobility + breathing", sets: 1, reps: "10–15 min", notes: "Downshift" }
    ])
  }),

  soccer: Object.freeze({
    warmup: Object.freeze([
      { name: "Dynamic warm-up flow", sets: 1, reps: "8–10 min", notes: "Hips/ankles" }
    ]),
    skill: Object.freeze([
      { name: "First touch wall work", sets: 4, reps: "60s", notes: "Both feet" },
      { name: "Dribbling patterns", sets: 5, reps: "30–45s", notes: "Change direction" }
    ]),
    speed: Object.freeze([
      { name: "Acceleration sprints", sets: 6, reps: "15–25 m", notes: "Full rest" }
    ]),
    conditioning: Object.freeze([
      { name: "Intervals", sets: 10, reps: "30s on / 30s off", notes: "Game pace" }
    ]),
    recovery: Object.freeze([
      { name: "Easy jog + mobility", sets: 1, reps: "15–20 min", notes: "Flush legs" }
    ])
  })
});

// Default export too, to support `import EXERCISE_BANK from ...`
export default EXERCISE_BANK;
