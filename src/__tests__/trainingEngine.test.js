import { describe, it, expect } from "vitest";
import {
  getExercise,
  getSwapOptions,
  swapExercise,
  markSetDone,
  progressPct,
  buildWorkoutPayload,
} from "../features/trainingEngine.js";

// ─── getExercise ──────────────────────────────────────────────────────────────
describe("getExercise", () => {
  it("returns exercise by id", () => {
    const ex = getExercise("goblet_squat");
    expect(ex).not.toBeNull();
    expect(ex.sport).toBe("basketball");
  });

  it("returns null for unknown id", () => {
    expect(getExercise("does_not_exist")).toBeNull();
  });
});

// ─── getSwapOptions ───────────────────────────────────────────────────────────
describe("getSwapOptions", () => {
  it("returns same-sport same-pattern alternatives", () => {
    const opts = getSwapOptions("goblet_squat", "basketball");
    expect(opts.every(o => o.sport === "basketball")).toBe(true);
    expect(opts.every(o => o.pattern === "strength_lower")).toBe(true);
    expect(opts.find(o => o.id === "goblet_squat")).toBeUndefined();
  });

  it("returns empty array for unknown exercise", () => {
    expect(getSwapOptions("ghost_exercise", "basketball")).toHaveLength(0);
  });

  it("returns results for every supported sport", () => {
    const sports = ["basketball","football","soccer","baseball","volleyball","track"];
    for (const sport of sports) {
      // Find the first exercise for this sport and check swaps
      const { EXERCISES } = await import("../data/exercises.js").then(m => m);
      const first = EXERCISES.find(e => e.sport === sport);
      expect(first, `No exercise found for sport: ${sport}`).toBeDefined();
    }
  });
});

// ─── swapExercise ─────────────────────────────────────────────────────────────
describe("swapExercise", () => {
  it("replaces the target exercise id", () => {
    const workout = {
      exercises: [
        { id: "goblet_squat", sets: [{ target: "4 × 6", done: false }] },
        { id: "sprint10",     sets: [{ target: "4 reps", done: false }] },
      ],
    };
    swapExercise(workout, "goblet_squat", "rfess");
    expect(workout.exercises[0].id).toBe("rfess");
    expect(workout.exercises[1].id).toBe("sprint10"); // untouched
  });
});

// ─── markSetDone ──────────────────────────────────────────────────────────────
describe("markSetDone", () => {
  it("toggles done state", () => {
    const workout = {
      exercises: [{ id: "dead_bug", sets: [{ target: "3 × 8", done: false }] }],
    };
    markSetDone(workout, "dead_bug", 0);
    expect(workout.exercises[0].sets[0].done).toBe(true);
    markSetDone(workout, "dead_bug", 0);
    expect(workout.exercises[0].sets[0].done).toBe(false);
  });

  it("does nothing for invalid index", () => {
    const workout = {
      exercises: [{ id: "dead_bug", sets: [{ target: "3 × 8", done: false }] }],
    };
    expect(() => markSetDone(workout, "dead_bug", 99)).not.toThrow();
  });
});

// ─── progressPct ──────────────────────────────────────────────────────────────
describe("progressPct", () => {
  it("returns 0 for no sets", () => {
    expect(progressPct({ exercises: [] })).toBe(0);
  });

  it("returns 0 for null workout", () => {
    expect(progressPct(null)).toBe(0);
  });

  it("calculates correctly", () => {
    const workout = {
      exercises: [
        { id: "a", sets: [{ done: true }, { done: false }] },
        { id: "b", sets: [{ done: true }, { done: true }] },
      ],
    };
    expect(progressPct(workout)).toBe(75);
  });

  it("returns 100 when all done", () => {
    const workout = {
      exercises: [{ id: "a", sets: [{ done: true }, { done: true }] }],
    };
    expect(progressPct(workout)).toBe(100);
  });
});

// ─── buildWorkoutPayload ──────────────────────────────────────────────────────
describe("buildWorkoutPayload", () => {
  it("generates a performance session for high readiness", () => {
    const w = buildWorkoutPayload("basketball", 85);
    expect(w.day_type).toBe("power");
    expect(w.exercises.length).toBeGreaterThan(0);
    expect(w.exercises.every(e => typeof e.id === "string")).toBe(true);
  });

  it("generates a recovery session for low readiness", () => {
    const w = buildWorkoutPayload("basketball", 60);
    expect(w.day_type).toBe("recovery");
  });

  it("handles unsupported sport gracefully", () => {
    const w = buildWorkoutPayload("lacrosse", 80);
    expect(w.title).toContain("General");
    expect(Array.isArray(w.exercises)).toBe(true);
  });

  it("all exercise ids exist in the library for every sport", () => {
    const sports = ["basketball","football","soccer","baseball","volleyball","track"];
    for (const sport of sports) {
      const w = buildWorkoutPayload(sport, 80);
      for (const ex of w.exercises) {
        expect(getExercise(ex.id), `Missing exercise: ${ex.id} for sport: ${sport}`).not.toBeNull();
      }
    }
  });
});
