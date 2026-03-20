/** Exercise library data. */
export const EXERCISES = [
  {id:'sq',name:'Back Squat',category:'Strength',muscle:'Quads',sport:['all']},
  {id:'dl',name:'Deadlift',category:'Strength',muscle:'Posterior Chain',sport:['all']},
  {id:'bp',name:'Bench Press',category:'Strength',muscle:'Chest',sport:['all']},
  {id:'sp',name:'Sprint 40yd',category:'Speed',muscle:'Full Body',sport:['football','basketball','track']},
  {id:'vj',name:'Vertical Jump',category:'Power',muscle:'Legs',sport:['basketball','volleyball']},
];
export function getExercisesByCategory(cat) { return cat?EXERCISES.filter(e=>e.category===cat):EXERCISES; }
export function getExercisesBySport(sport) { return EXERCISES.filter(e=>e.sport.includes(sport)||e.sport.includes('all')); }
