// /js/data/exerciseBank.js
export const EXERCISE_BANK = Object.freeze({
  basketball: [
    { name: "Trap bar deadlift", sets: 4, reps: "3–6", load: "RPE 7–8" },
    { name: "Rear-foot elevated split squat", sets: 3, reps: "6–8/side", load: "Moderate" },
    { name: "DB bench press", sets: 3, reps: "6–10", load: "Moderate" },
    { name: "Pull-ups / Lat pulldown", sets: 3, reps: "6–10", load: "Controlled" },
    { name: "Acceleration sprints", sets: 6, reps: "10–20 yd", load: "Full rest" },
    { name: "Shooting: form + rhythm", sets: 5, reps: "8 makes", load: "Build range" }
  ],
  football: [
    { name: "Back squat", sets: 4, reps: "3–6", load: "RPE 7–8" },
    { name: "Bench press", sets: 4, reps: "3–6", load: "Bar speed" },
    { name: "RDL", sets: 3, reps: "6–8", load: "Moderate" },
    { name: "5-10-5 pro agility", sets: 5, reps: "1 rep", load: "Full rest" }
  ],
  soccer: [
    { name: "Acceleration sprints", sets: 6, reps: "15–25 m", load: "Full rest" },
    { name: "Intervals", sets: 10, reps: "30s on / 30s off", load: "Game pace" }
  ]
});
export default EXERCISE_BANK;
