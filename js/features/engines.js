import { exerciseLibrary } from "../data/exerciseLibrary.js";
export function getExercise(id){ return exerciseLibrary.find(x => x.id === id) || { id, title: id, sport: "basketball", pattern: "unknown", quick: "" }; }
export function getSwapOptions(exerciseId, sport){ const current = getExercise(exerciseId); return exerciseLibrary.filter(x => x.id !== exerciseId && x.sport === sport && x.pattern === current.pattern); }
export function swapExercise(session, oldId, newId){ session.exercises = session.exercises.map(ex => ex.id === oldId ? { ...ex, id: newId } : ex); }
export function completeSet(session, exerciseId, setIndex){ session.exercises = session.exercises.map(ex => ex.id !== exerciseId ? ex : { ...ex, sets: ex.sets.map((s,i) => i===setIndex ? { ...s, done: !s.done } : s) }); }
export function overallCompletion(session){ const all = session.exercises.flatMap(ex => ex.sets); const done = all.filter(x => x.done).length; return { done, total: all.length, pct: all.length ? Math.round(done / all.length * 100) : 0 }; }
