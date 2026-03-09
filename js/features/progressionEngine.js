export function getProgressionForWeek(week = 1){
  const cycleWeek = ((week - 1) % 4) + 1;
  return {
    1: { label:'Base', setAdjust:0, repStyle:'base', intensity:'moderate' },
    2: { label:'Build', setAdjust:0, repStyle:'base_plus', intensity:'moderate_high' },
    3: { label:'Intensify', setAdjust:1, repStyle:'intensify', intensity:'high' },
    4: { label:'Deload', setAdjust:-1, repStyle:'deload', intensity:'light' },
  }[cycleWeek];
}
export function applyProgression(exercise, week){
  const prog = getProgressionForWeek(week);
  let sets = Math.max(1, exercise.default_sets + prog.setAdjust);
  let reps = exercise.default_reps;
  if(prog.repStyle === 'intensify'){
    if(reps === '8') reps = '6'; if(reps === '10') reps = '8'; if(reps === '12') reps = '10';
  }
  if(prog.repStyle === 'deload'){
    sets = Math.max(1, sets - 1);
    if(reps === '8') reps = '6'; if(reps === '10') reps = '8'; if(reps === '12') reps = '10';
  }
  return { ...exercise, programmed_sets: sets, programmed_reps: reps, phaseLabel: prog.label, intensity: prog.intensity };
}
