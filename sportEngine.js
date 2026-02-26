// sportEngine.js — v1.0.0 (offline-first sport programming)
// Creates sport-specific sessions + exercise lists.

(function () {
  "use strict";
  if (window.sportEngine) return;

  const SPORT_LABELS = {
    basketball: "Basketball",
    football: "Football",
    soccer: "Soccer",
    baseball: "Baseball",
    volleyball: "Volleyball",
  };

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function buildWeeklyTemplate({ sport, daysPerWeek, primary, secondary, level }) {
    const d = clamp(Number(daysPerWeek || 4), 3, 5);

    // Base pillars per sport
    const pillarsBySport = {
      basketball: ["Lower Power", "Upper Strength", "Speed + COD", "Conditioning + Core", "Mobility + Prehab"],
      football: ["Max Strength", "Acceleration", "Power + Jumps", "Conditioning", "Prehab + Mobility"],
      soccer: ["Aerobic Base", "Speed Endurance", "Lower Strength", "COD + Plyo", "Mobility + Prehab"],
      baseball: ["Rotational Power", "Upper Strength", "Lower Strength", "Speed + Agility", "Shoulder Care"],
      volleyball: ["Jump Power", "Lower Strength", "Upper Strength", "COD + Reactive", "Mobility + Prehab"],
    };

    const base = (pillarsBySport[sport] || pillarsBySport.basketball).slice(0, d);

    // Focus overlays
    const focusBoost = [];
    if (primary === "speed") focusBoost.push("Speed Microdose");
    if (primary === "strength") focusBoost.push("Strength Priority");
    if (primary === "power") focusBoost.push("Plyo Priority");
    if (primary === "conditioning") focusBoost.push("Conditioning Priority");
    if (primary === "mobility") focusBoost.push("Mobility Priority");

    if (secondary === "speed") focusBoost.push("Speed Microdose");
    if (secondary === "strength") focusBoost.push("Strength Accessory");
    if (secondary === "power") focusBoost.push("Power Accessory");
    if (secondary === "conditioning") focusBoost.push("Tempo / Aerobic");
    if (secondary === "mobility") focusBoost.push("Mobility / Tissue");

    const intensityHint =
      level === "college" ? "Higher intensity, lower junk volume." :
      level === "middle_school" ? "Technique first, low impact, low load." :
      "Balanced volume with quality reps.";

    return {
      sport,
      sportLabel: SPORT_LABELS[sport] || "Sport",
      days: base.map((title, idx) => ({
        dayIndex: idx + 1,
        title,
        overlays: focusBoost.slice(0, 2),
      })),
      notes: intensityHint,
    };
  }

  function exercisesForSession({ sport, sessionTitle }) {
    // Library by sport + session type
    const LIB = {
      commonWarmup: [
        "Breathing reset (2 min)",
        "Ankle rocks + calf raise (2×10)",
        "Hip airplanes (2×6/side)",
        "World’s greatest stretch (2×5/side)",
        "A-skip / marching (2×20m)"
      ],
      commonCore: [
        "Dead bug (3×8/side)",
        "Side plank (3×25s/side)",
        "Pallof press (3×10/side)"
      ],
      basketball: {
        "Lower Power": ["Trap bar jump shrug (4×3)", "Front squat (4×4)", "Split squat (3×8/side)", "Nordic eccentric (3×4)", "Calf pogo (3×20)"],
        "Upper Strength": ["Bench press (4×4)", "1-arm row (4×8/side)", "Pull-ups (3×AMRAP)", "DB incline (3×8)", "Face pulls (3×15)"],
        "Speed + COD": ["10m accelerations (6 reps)", "Pro agility (5 reps)", "Lateral bound (4×4/side)", "Decel drops (3×5)"],
        "Conditioning + Core": ["Tempo runs (10×100m @ easy)", "Bike intervals (8×30s)", "Farmer carry (4×30m)"],
        "Mobility + Prehab": ["Couch stretch (2×60s/side)", "90/90 hips (2×8/side)", "T-spine openers (2×8/side)", "Band external rotation (3×15)"],
      },
      football: {
        "Max Strength": ["Back squat (5×3)", "RDL (4×5)", "Bench press (5×3)", "Weighted row (4×6)", "Neck isometrics (3×20s)"],
        "Acceleration": ["Sled push (6×15m)", "10m starts (8 reps)", "Wall drills (3×20s)", "Broad jump (5×2)"],
        "Power + Jumps": ["Hang clean (5×2)", "Box jump (5×2)", "Med ball slam (4×5)", "Trap bar deadlift (4×3)"],
        "Conditioning": ["Shuttle repeats (10×20yd)", "Assault bike (10×20s)", "Carry circuit (8 min)"],
        "Prehab + Mobility": ["Hips + ankles (10 min)", "Hamstring ISO (3×30s)", "Scap retraction (3×12)", "Band rotator cuff (3×15)"],
      },
      soccer: {
        "Aerobic Base": ["Zone 2 run (25–35 min)", "Strides (6×60m)", "Mobility flow (10 min)"],
        "Speed Endurance": ["150m repeats (6–8 reps)", "Shuttle 30-30s (10 min)", "Cooldown jog (8 min)"],
        "Lower Strength": ["Front squat (4×4)", "RDL (4×6)", "Split squat (3×8/side)", "Copenhagen plank (3×20s/side)"],
        "COD + Plyo": ["5-10-5 (6 reps)", "Lateral hops (4×10)", "Single-leg pogo (3×15/side)", "Decel mechanics (3×5)"],
        "Mobility + Prehab": ["Adductor rockbacks (2×10)", "Ankles (2×10)", "Calf ISO (3×30s)", "T-spine (2×8)"],
      },
      baseball: {
        "Rotational Power": ["Med ball scoop toss (5×3/side)", "Med ball shotput (5×3/side)", "Cable chop (3×10/side)", "Hip hinge (3×8)"],
        "Upper Strength": ["Incline DB press (4×6)", "Chest-supported row (4×8)", "Pull-ups (3×AMRAP)", "Landmine press (3×8/side)"],
        "Lower Strength": ["Trap bar deadlift (4×4)", "Rear-foot split squat (3×8/side)", "Hamstring curl (3×10)", "Calf work (3×12)"],
        "Speed + Agility": ["10–20m sprints (8 reps)", "Ladder / quick feet (8 min)", "Lateral shuffle (6×10m)"],
        "Shoulder Care": ["Band ER/IR (3×15)", "Y-T-W (2×10)", "Scap push-ups (2×12)", "Sleeper stretch (2×45s)"],
      },
      volleyball: {
        "Jump Power": ["Approach jumps (6×2)", "Depth drop (4×3)", "Trap bar jump (4×3)", "Single-leg bound (4×3/side)"],
        "Lower Strength": ["Front squat (4×4)", "RDL (4×6)", "Step-ups (3×8/side)", "Nordic eccentric (3×4)"],
        "Upper Strength": ["Bench press (4×4)", "1-arm row (4×8/side)", "Overhead press (3×6)", "Face pulls (3×15)"],
        "COD + Reactive": ["Lateral shuffle (6×10m)", "Reactive hops (4×10)", "Short sprints (8×10m)", "Decel work (3×5)"],
        "Mobility + Prehab": ["Ankles + hips (10 min)", "Thoracic mobility (2×8)", "Band rotator cuff (3×15)", "Calf ISO (3×30s)"],
      }
    };

    const map = LIB[sport] || LIB.basketball;
    const main = map[sessionTitle] || ["General strength circuit (30 min)", "Core (10 min)", "Mobility (10 min)"];
    return {
      warmup: LIB.commonWarmup.slice(),
      main: main.slice(),
      core: LIB.commonCore.slice()
    };
  }

  window.sportEngine = {
    SPORT_LABELS,
    buildWeeklyTemplate,
    exercisesForSession
  };
})();
