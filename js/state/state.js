export const DEFAULT_STATE = {
  profile: {
    name: 'Athlete',
    sport: 'basketball',
    position: 'guard',
    experience: 'intermediate',
    training_days: 4,
    equipment: ['bodyweight','dumbbells'],
    goal: 'strength_speed',
    team_mode: false,
    meal_plan_enabled: false,
  },
  onboardingComplete: false,
  week: 1,
  readiness: { sleep: 7, soreness: 3, fatigue: 3, stress: 3, score: 76, lastUpdated: null },
  logs: { workouts: [], readiness: [], performance: [] },
  activeSession: null,
  generatedWeek: [],
  settings: { restSeconds: 75 }
};
