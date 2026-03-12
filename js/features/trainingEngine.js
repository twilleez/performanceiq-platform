import { EXERCISES } from "../data/exercises.js";

export function getExercise(id) {
  return EXERCISES.find(x => x.id === id) || null;
}

export function getSwapOptions(exerciseId, sport) {
  const current = getExercise(exerciseId);
  if (!current) return [];
  return EXERCISES.filter(
    x => x.id !== current.id && x.sport === sport && x.pattern === current.pattern
  );
}

export function swapExercise(workout, oldId, newId) {
  workout.exercises = workout.exercises.map(ex =>
    ex.id === oldId ? { ...ex, id: newId } : ex
  );
}

export function markSetDone(workout, exerciseId, setIndex) {
  const ex = workout.exercises.find(x => x.id === exerciseId);
  if (!ex || !ex.sets[setIndex]) return;
  ex.sets[setIndex].done = !ex.sets[setIndex].done;
}

export function progressPct(workout) {
  const sets = workout.exercises.flatMap(ex => ex.sets);
  if (!sets.length) return 0;
  return Math.round((sets.filter(s => s.done).length / sets.length) * 100);
}

export function autoGenerateWorkout(sport, readiness) {
  const sportLib = EXERCISES.filter(x => x.sport === sport);

  if (!sportLib.length) {
    // Sport not yet in library — return a safe fallback
    return {
      id: `auto_${Date.now()}`,
      title: "General Conditioning",
      sport,
      dayType: "recovery",
      notes: `No exercises found for "${sport}" yet. A bodyweight session has been generated.`,
      active: false,
      recoveryCue: "Move well and stay within your limits.",
      exercises: [
        { id: "dead_bug",   sets: [{ target: "3 × 8/side", done: false }] },
        { id: "side_plank", sets: [{ target: "3 × 20s/side", done: false }] },
      ].filter(e => getExercise(e.id)), // only include if they exist
    };
  }

  const pick = pattern => sportLib.find(x => x.pattern === pattern)?.id;
  const recovery = readiness < 70;

  const exercises = [
    { id: pick("power"),          sets: [{ target: "3 × 4",      done: false }] },
    { id: pick("strength_lower"), sets: [{ target: "3 × 6",      done: false }] },
    { id: pick("hinge"),          sets: [{ target: "3 × 6",      done: false }] },
    { id: pick("speed"),          sets: [{ target: "4 reps",     done: false }] },
    { id: pick("core"),           sets: [{ target: "3 × 8/side", done: false }] },
  ].filter(e => !!e.id); // remove any patterns not covered for this sport

  return {
    id: `auto_${Date.now()}`,
    title: `${sport[0].toUpperCase() + sport.slice(1)} ${recovery ? "Recovery" : "Performance"} Session`,
    sport,
    dayType: recovery ? "recovery" : "power",
    notes: recovery
      ? "Auto-generated lower-strain session."
      : "Auto-generated performance session.",
    active: false,
    recoveryCue: recovery
      ? "Move well and leave fresher than you started."
      : "Quality first. Chase clean outputs.",
    exercises,
  };
}
