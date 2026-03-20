/** Workout generation engine. */
const REST_SESSIONS = [
  {name:'Active Recovery',exercises:[{name:'Light Jog',sets:1,reps:'10 min',load:'Easy'},{name:'Foam Roll',sets:1,reps:'10 min',load:'Self'},{name:'Static Stretch',sets:1,reps:'10 min',load:'Easy'}]}
];
const SESSIONS = {
  basketball: {
    'in-season': [
      {name:'Skill + Conditioning',exercises:[{name:'Ball Handling',sets:3,reps:'5 min',load:'Moderate'},{name:'Defensive Slides',sets:4,reps:'30s',load:'High'},{name:'Court Sprints',sets:6,reps:'Full court',load:'High'}]},
    ],
  }
};
export function generateTodayWorkout(sport='basketball', phase='in-season', level='intermediate', readiness=75, dow=1) {
  if (readiness < 50) return REST_SESSIONS[0];
  const sportSessions = SESSIONS[sport]?.[phase] || SESSIONS.basketball['in-season'];
  return sportSessions[dow % sportSessions.length] || sportSessions[0];
}
