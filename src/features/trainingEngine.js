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
  if (!workout?.exercises) return;
  workout.exercises = workout.exercises.map(ex =>
    ex.id === oldId ? { ...ex, id: newId } : ex
  );
}

export function markSetDone(workout, exerciseId, setIndex) {
  if (!workout?.exercises) return;
  const ex = workout.exercises.find(x => x.id === exerciseId);
  if (!ex || !ex.sets[setIndex]) return;
  ex.sets[setIndex].done = !ex.sets[setIndex].done;
}

export function progressPct(workout) {
  if (!workout) return 0;
  const exercises = workout.exercises ?? [];
  const sets = exercises.flatMap(ex => ex.sets ?? []);
  if (!sets.length) return 0;
  return Math.round((sets.filter(s => s.done).length / sets.length) * 100);
}

// Build workout based on sport + readiness score
export function buildWorkoutPayload(sport, readiness = 75) {
  const sportLib = EXERCISES.filter(x => x.sport === sport);

  if (!sportLib.length) {
    return {
      title:        "General Conditioning",
      sport,
      day_type:     "recovery",
      notes:        `No exercises found for "${sport}" yet. Bodyweight session.`,
      recovery_cue: "Move well and stay within your limits.",
      exercises: [
        { id: "dead_bug",   sets: [{ target: "3 × 8/side", done: false }] },
        { id: "side_plank", sets: [{ target: "3 × 20s/side", done: false }] },
      ].filter(e => getExercise(e.id)),
    };
  }

  const recovery = readiness < 70;
  const pick = pattern => sportLib.find(x => x.pattern === pattern)?.id;

  // Volume scaling: high readiness = more volume
  const setsMain = readiness >= 85 ? 4 : readiness >= 70 ? 3 : 2;
  const repsStr  = readiness >= 85 ? "4" : readiness >= 70 ? "5" : "6";

  const exercises = [
    { id: pick("power"),          sets: Array(recovery ? 2 : setsMain).fill(null).map(() => ({ target: `${recovery ? 2 : setsMain} × ${repsStr}`, done: false })) },
    { id: pick("strength_lower"), sets: Array(setsMain).fill(null).map(() => ({ target: `${setsMain} × 6`, done: false })) },
    { id: pick("hinge"),          sets: Array(setsMain).fill(null).map(() => ({ target: `${setsMain} × 6`, done: false })) },
    { id: pick("speed"),          sets: [{ target: `${recovery ? 3 : 5} reps`, done: false }] },
    { id: pick("core"),           sets: Array(3).fill(null).map(() => ({ target: "3 × 8/side", done: false })) },
  ].filter(e => !!e.id);

  const sportName = sport[0].toUpperCase() + sport.slice(1);
  return {
    title:        `${sportName} ${recovery ? "Recovery" : readiness >= 85 ? "Peak Performance" : "Build"} Session`,
    sport,
    day_type:     recovery ? "recovery" : readiness >= 85 ? "power" : "build",
    notes:        recovery
      ? "Auto-generated lower-strain session. Prioritise quality over load."
      : readiness >= 85
        ? "Auto-generated peak session. You're primed — go get it."
        : "Auto-generated build session. Steady, productive work.",
    recovery_cue: recovery
      ? "Move well and leave fresher than you started."
      : readiness >= 85
        ? "Quality first. Chase clean outputs at high intent."
        : "Consistent quality. Build the habit, build the athlete.",
    exercises,
  };
}
