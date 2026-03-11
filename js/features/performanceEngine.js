import { exerciseLibrary } from "../data/exerciseLibrary.js";

export function getExercise(id){
  return exerciseLibrary.find(x => x.id === id) || null;
}

export function getSwapOptions(exerciseId){
  const current = getExercise(exerciseId);
  if (!current) return [];
  return exerciseLibrary.filter(x => x.id !== current.id && x.pattern === current.pattern);
}

export function swapExerciseInWorkout(workout, oldId, newId){
  workout.exercises = workout.exercises.map(id => id === oldId ? newId : id);
}

export function buildRecruitingProfile(a){
  if (!a) return "No athlete selected.";
  return [
    `Athlete: ${a.name}`,
    `Position: ${a.pos || "-"}`,
    "Sport: Basketball",
    `PIQ: ${a.piq ?? "-"}`,
    `Readiness: ${a.readiness ?? "-"}`,
    `Weekly Load: ${a.load ?? 0}`,
    `ACR: ${a.acr ?? "-"}`
  ].join("\n");
}
