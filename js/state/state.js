export const STATE = {
  bootMode: "local-fallback",
  session: { loggedIn: false, user: null, role: "coach" },
  ui: { view: "dashboard", activeAthleteId: "a1", swapTarget: null },
  team: { name: "Demo Team", joinCode: "DEMO1234", sport: "basketball" },
  roster: [
    {
      id: "a1", name: "Player One", pos: "PG", piq: 82, readiness: 79, load: 412, acr: 1.18, risk: "low",
      workouts: [{ id: "w1", title: "Basketball Explosive Lower", dayType: "power", status: "assigned", notes: "Landing mechanics + unilateral force", exercises: ["lateral_bound","goblet_squat","single_leg_rdl","sprint_10","dead_bug"] }]
    },
    {
      id: "a2", name: "Player Two", pos: "SG", piq: 76, readiness: 68, load: 455, acr: 1.38, risk: "medium",
      workouts: [{ id: "w2", title: "Basketball Upper Power", dayType: "strength", status: "assigned", notes: "Shoulder integrity + push/pull balance", exercises: ["push_up_plus","1arm_row","half_kneeling_press","shuffle_sprint","pallof_press"] }]
    },
    {
      id: "a3", name: "Player Three", pos: "SF", piq: 59, readiness: 57, load: 510, acr: 1.61, risk: "high",
      workouts: [{ id: "w3", title: "Basketball Recovery Reset", dayType: "recovery", status: "assigned", notes: "Movement quality + reset", exercises: ["mobility_flow","ankle_hip_flow","breathing_reset","dead_bug","side_plank_reach"] }]
    }
  ],
  summary: { piq: 72, readiness: 68, weeklyLoad: 1377, atRisk: 2 },
  alerts: ["Player Two: medium risk due to readiness / ACR", "Player Three: high risk due to readiness / ACR"],
  builder: { title: "", dayType: "strength", notes: "", athleteId: "a1" }
};
