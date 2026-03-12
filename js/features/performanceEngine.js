import { exerciseLibrary } from "../data/exerciseLibrary.js";
export function getExercise(id){ return exerciseLibrary.find(x=>x.id===id)||null; }
export function getSportLibrary(sport){ return exerciseLibrary.filter(x=>x.sport===sport); }
export function getSwapOptions(exerciseId){ const current=getExercise(exerciseId); if(!current) return []; return exerciseLibrary.filter(x=>x.id!==current.id&&x.sport===current.sport&&x.pattern===current.pattern); }
export function swapExerciseInWorkout(workout,oldId,newId){ workout.exercises=workout.exercises.map(id=>id===oldId?newId:id); }
export function addExerciseToWorkout(workout,exerciseId){ if(!workout.exercises.includes(exerciseId)) workout.exercises.push(exerciseId); }
export function buildRecruitingProfile(a){ if(!a) return "No athlete selected."; return [`Athlete: ${a.name}`,`Sport: ${a.sport}`,`Position/Event: ${a.pos||"-"}`,`PIQ: ${a.piq??"-"}`,`Readiness: ${a.readiness??"-"}`,`Weekly Load: ${a.load??0}`,`ACR: ${a.acr??"-"}`].join("\n"); }
export function generateAutoWorkout(athlete){ const lib=getSportLibrary(athlete.sport); const pick=p=>lib.find(x=>x.pattern===p)?.id; return { title:`${athlete.sport[0].toUpperCase()+athlete.sport.slice(1)} Auto Session`, dayType:athlete.readiness<70?"recovery":"power", status:"assigned", notes:`Auto-generated for ${athlete.sport} based on readiness ${athlete.readiness}.`, exercises:[pick("power"),pick("strength_lower"),pick("hinge"),pick("speed"),pick("core")].filter(Boolean) }; }
