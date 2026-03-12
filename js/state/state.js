export const STATE = {
  session: { loggedIn: false, user: null, role: "athlete" },
  mode: { athleteOnly: true, hasTeam: true },
  ui: { tab: "today", activeSheet: null, activeExerciseId: null, teamTab: "home" },
  athlete: {
    id: "athlete_1",
    name: "Willie Athlete",
    sport: "basketball",
    position: "PG",
    equipment: ["Dumbbells", "Bands", "Bench"],
    goals: ["Explosiveness", "Strength", "Durability"],
    block: "Explosive Foundation",
    week: "Week 4",
    mealPlanEnabled: false,
    readiness: { hrv: "Stable", sleep: 7.8, soreness: "Low", score: 83 },
    progress: { strength: 78, conditioning: 71, mobility: 84, streak: 12, weeklyVolume: 218 },
    prs: [
      { label: "Goblet Squat", value: "70 lb x 8", delta: "+10 lb" },
      { label: "10 yd Sprint", value: "1.82 sec", delta: "-0.06" }
    ],
    session: {
      title: "Today • Lower Power",
      status: "ready",
      notes: "Explosive intent on every rep. Own the landing.",
      exercises: [
        { id: "bb_bound", sets: [{ target: "4/side", done: false }, { target: "4/side", done: false }, { target: "4/side", done: false }] },
        { id: "bb_squat", sets: [{ target: "8", done: false }, { target: "8", done: false }, { target: "8", done: false }] },
        { id: "bb_rdl", sets: [{ target: "6/side", done: false }, { target: "6/side", done: false }, { target: "6/side", done: false }] },
        { id: "bb_sprint", sets: [{ target: "2 reps", done: false }, { target: "2 reps", done: false }, { target: "2 reps", done: false }] },
        { id: "bb_core", sets: [{ target: "8/side", done: false }, { target: "8/side", done: false }] }
      ]
    }
  },
  team: {
    name: "Virginia Trailblazers",
    announcements: ["Lift moved to 5:30 PM.", "Bring bands to Thursday recovery session."],
    homeEvents: ["Practice • 6 PM", "Team Lift • Fri 4 PM", "Film • Sat 10 AM"],
    schedule: { Mon:["Practice","Lift"], Tue:["Recovery"], Wed:["Practice"], Thu:["Speed"], Fri:["Lift"], Sat:["Game"], Sun:["Off"] },
    roster: [
      { id: "athlete_1", name: "Willie Athlete", pos: "PG", piq: 83, readiness: 83, role: "captain" },
      { id: "athlete_2", name: "Jay Carter", pos: "SG", piq: 79, readiness: 76, role: "athlete" },
      { id: "athlete_3", name: "Coach Davis", pos: "Coach", piq: null, readiness: null, role: "coach" }
    ],
    activity: ["Willie hit a new sprint PR.", "Jay completed all sessions this week.", "Block milestone: Week 4 complete."]
  }
};
