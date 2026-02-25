// sportEngine.js — v1.0.0
// Sport-specific training templates + scaling helpers (Standard vs Advanced)
(function () {
  "use strict";
  if (window.sportEngine) return;

  const SPORTS = [
    { id: "basketball", label: "Basketball" },
    { id: "football", label: "Football" },
    { id: "soccer", label: "Soccer" },
    { id: "baseball", label: "Baseball" },
    { id: "volleyball", label: "Volleyball" },
    { id: "track", label: "Track / Sprint" }
  ];

  function clamp(n, a, b) {
    n = Number(n) || 0;
    return Math.min(Math.max(n, a), b);
  }

  function scaleRPE(baseRPE, level, phase) {
    let r = Number(baseRPE) || 6;

    // Level scaling
    if (level === "advanced") r += 0.5;

    // Phase scaling
    if (phase === "DELOAD") r -= 1.5;
    if (phase === "INTENSIFICATION") r += 0.5;
    if (phase === "PEAK") r += 0.25;

    return clamp(Math.round(r * 2) / 2, 3, 10); // nearest 0.5
  }

  function scaleMinutes(baseMin, level, phase) {
    let m = Number(baseMin) || 60;

    if (level === "advanced") m *= 1.1;

    if (phase === "DELOAD") m *= 0.75;
    if (phase === "PEAK") m *= 0.9;

    return clamp(Math.round(m), 30, 120);
  }

  // Exercises: keep simple & clear (no medical claims)
  // Each block returns: { title, focus, exercises:[{name, sets, reps, notes}] }
  function templatesBySport(sportId) {
    switch (sportId) {
      case "basketball":
        return {
          focus: ["Explosiveness", "Deceleration", "Ankles/Knees resilience", "Conditioning", "Skill volume"],
          strength: [
            { name: "Trap Bar Deadlift", sets: "4", reps: "3–6", notes: "Explosive concentric, crisp reps" },
            { name: "Rear-Foot Elevated Split Squat", sets: "3", reps: "6–8/side", notes: "Control the bottom" },
            { name: "DB Bench Press", sets: "3", reps: "6–10", notes: "Full range, stable shoulder" },
            { name: "Pull-ups / Lat Pulldown", sets: "3", reps: "6–10", notes: "Smooth reps" },
            { name: "Copenhagen Plank", sets: "3", reps: "20–30s/side", notes: "Adductors + groin" }
          ],
          plyo: [
            { name: "Pogo Hops", sets: "3", reps: "20–30", notes: "Stiff ankles, quick contacts" },
            { name: "Broad Jump (stick)", sets: "4", reps: "2–3", notes: "Land quiet, knees track" },
            { name: "Lateral Bounds", sets: "3", reps: "4–6/side", notes: "Absorb + re-accelerate" }
          ],
          conditioning: [
            { name: "Court Tempo Runs", sets: "1", reps: "8–12 x 60–75% effort", notes: "45–60s rest" },
            { name: "Shuttle Change-of-Direction", sets: "1", reps: "6–10 reps", notes: "Quality cuts, stop on balance" }
          ],
          skills: [
            { name: "Ball-handling series", sets: "1", reps: "10–15 min", notes: "Both hands + change pace" },
            { name: "Shooting (form + game reps)", sets: "1", reps: "150–300 shots", notes: "Track makes + spots" }
          ]
        };

      case "football":
        return {
          focus: ["Acceleration", "Max velocity", "Strength/Power", "Contact readiness", "Energy systems"],
          strength: [
            { name: "Back Squat / Front Squat", sets: "4", reps: "3–6", notes: "Brace + speed up" },
            { name: "RDL", sets: "3", reps: "6–8", notes: "Hamstrings + hinge pattern" },
            { name: "Incline Press", sets: "3", reps: "5–8", notes: "Power off chest" },
            { name: "Row (barbell/cable)", sets: "3", reps: "8–12", notes: "Back thickness" },
            { name: "Farmer Carry", sets: "4", reps: "25–40 yd", notes: "Grip + trunk" }
          ],
          plyo: [
            { name: "Hurdle Hops (low)", sets: "4", reps: "3–5", notes: "Quick, tall posture" },
            { name: "Box Jump", sets: "4", reps: "2–3", notes: "No knee cave" }
          ],
          conditioning: [
            { name: "Sprint Intervals", sets: "1", reps: "8–12 x 10–30 yd", notes: "Full recovery for speed" },
            { name: "Gassers (controlled)", sets: "1", reps: "6–10", notes: "Build capacity, not sloppy" }
          ],
          skills: [
            { name: "Position skill block", sets: "1", reps: "20–40 min", notes: "Routes/footwork/starts" }
          ]
        };

      case "soccer":
        return {
          focus: ["Aerobic base", "Repeated sprint ability", "Decel/COD", "Single-leg strength"],
          strength: [
            { name: "Split Squat", sets: "4", reps: "6–8/side", notes: "Strong knee tracking" },
            { name: "Hip Thrust", sets: "3", reps: "6–10", notes: "Full lockout" },
            { name: "Nordic Hamstring (assisted)", sets: "3", reps: "3–6", notes: "Slow eccentrics" },
            { name: "Single-leg calf raises", sets: "3", reps: "10–15/side", notes: "Full range" }
          ],
          plyo: [
            { name: "Lateral Skater Jumps", sets: "3", reps: "5–8/side", notes: "Stick landings" },
            { name: "Acceleration Bounds", sets: "3", reps: "10–20m", notes: "Lean + punch ground" }
          ],
          conditioning: [
            { name: "Tempo Intervals", sets: "1", reps: "6–10 x 2 min", notes: "1 min easy jog" },
            { name: "Repeated Sprints", sets: "1", reps: "8–12 x 20–30m", notes: "Short rest, keep form" }
          ],
          skills: [
            { name: "Touch + passing circuit", sets: "1", reps: "15–25 min", notes: "Both feet" },
            { name: "Finishing reps", sets: "1", reps: "20–40 reps", notes: "Quality strikes" }
          ]
        };

      case "baseball":
        return {
          focus: ["Rotational power", "Shoulder/scap stability", "Sprint speed", "Posterior chain"],
          strength: [
            { name: "Trap Bar Deadlift", sets: "4", reps: "3–5", notes: "Power focus" },
            { name: "DB Row", sets: "3", reps: "8–12", notes: "Scap control" },
            { name: "Landmine Press", sets: "3", reps: "6–10", notes: "Shoulder-friendly angle" },
            { name: "Pallof Press", sets: "3", reps: "10–12/side", notes: "Anti-rotation" }
          ],
          plyo: [
            { name: "Med Ball Rotational Throws", sets: "4", reps: "4–6/side", notes: "Explosive hips" },
            { name: "Lateral Hop + Stick", sets: "3", reps: "4–6/side", notes: "Fielding movement" }
          ],
          conditioning: [
            { name: "Sprint Starts", sets: "1", reps: "8–12 x 10–20 yd", notes: "Full recovery" }
          ],
          skills: [
            { name: "Throwing / Arm care", sets: "1", reps: "10–20 min", notes: "Band work + mechanics" },
            { name: "Hitting reps", sets: "1", reps: "50–120 swings", notes: "Intent + precision" }
          ]
        };

      case "volleyball":
        return {
          focus: ["Jump power", "Shoulder durability", "Landing mechanics", "Speed endurance"],
          strength: [
            { name: "Front Squat / Goblet Squat", sets: "4", reps: "4–8", notes: "Upright torso" },
            { name: "RDL", sets: "3", reps: "6–10", notes: "Hamstrings + hinge" },
            { name: "DB Shoulder Press", sets: "3", reps: "6–10", notes: "Control overhead" },
            { name: "Face Pulls", sets: "3", reps: "12–15", notes: "Scap health" }
          ],
          plyo: [
            { name: "Approach Jumps", sets: "5", reps: "2–3", notes: "Game-like approach" },
            { name: "Depth Drop to Stick", sets: "4", reps: "2–3", notes: "Landing quality" }
          ],
          conditioning: [
            { name: "Court Repeats", sets: "1", reps: "8–12", notes: "Short bursts + rest" }
          ],
          skills: [
            { name: "Serving reps", sets: "1", reps: "30–80", notes: "Target zones" },
            { name: "Passing reps", sets: "1", reps: "10–20 min", notes: "Platform consistency" }
          ]
        };

      case "track":
      default:
        return {
          focus: ["Acceleration", "Max velocity", "Elasticity", "Strength-to-power"],
          strength: [
            { name: "Hex Bar Deadlift", sets: "4", reps: "3–5", notes: "Fast reps, no grind" },
            { name: "Split Squat", sets: "3", reps: "6–8/side", notes: "Strong hips" },
            { name: "Hip Thrust", sets: "3", reps: "6–10", notes: "Explode up" },
            { name: "Core (hollow/side plank)", sets: "3", reps: "20–40s", notes: "Stiff trunk" }
          ],
          plyo: [
            { name: "A-Skips / Drills", sets: "3", reps: "20–30m", notes: "Posture + rhythm" },
            { name: "Bounds", sets: "3", reps: "20–30m", notes: "Elastic contacts" }
          ],
          conditioning: [
            { name: "Speed Reps", sets: "1", reps: "6–10 x 30–60m", notes: "Full recovery" }
          ],
          skills: [
            { name: "Starts + mechanics", sets: "1", reps: "10–20 min", notes: "Quality > volume" }
          ]
        };
    }
  }

  // Build a session with sport blocks based on day type + phase + level
  function buildSession({ sportId, level, phase, dayType }) {
    const t = templatesBySport(sportId);
    const blocks = [];

    // Always include strength (unless rest)
    if (dayType !== "rest") blocks.push({ title: "Strength", focus: t.focus[0] || "Strength", exercises: t.strength });

    // Plyo on training/game days
    if (dayType === "training" || dayType === "game") blocks.push({ title: "Plyometric / Power", focus: "Explosiveness", exercises: t.plyo });

    // Conditioning depends on sport; recovery day keeps it light
    if (dayType === "training") blocks.push({ title: "Conditioning", focus: "Engine", exercises: t.conditioning });
    if (dayType === "recovery") blocks.push({ title: "Recovery Conditioning", focus: "Low intensity", exercises: [{ name: "Zone 2 easy", sets: "1", reps: "20–30 min", notes: "Easy breathing" }] });

    // Skills for ball sports
    if (t.skills && (dayType === "training" || dayType === "game")) blocks.push({ title: "Skill Work", focus: "Sport skill", exercises: t.skills });

    // Advanced adds one extra accessory block
    if (level === "advanced" && dayType !== "rest") {
      blocks.push({
        title: "Advanced Add-on",
        focus: "Durability + detail",
        exercises: [
          { name: "Isometric split squat hold", sets: "3", reps: "20–30s/side", notes: "Controlled" },
          { name: "Ankle/foot series", sets: "1", reps: "8–12 min", notes: "Tib raises + calf + mobility" }
        ]
      });
    }

    // Recommended minutes/RPE baseline by type
    const base = (function () {
      if (dayType === "game") return { min: 80, rpe: 7.5, type: "game" };
      if (dayType === "recovery") return { min: 45, rpe: 4.5, type: "recovery" };
      if (dayType === "rest") return { min: 0, rpe: 0, type: "recovery" };
      return { min: 70, rpe: 6.5, type: "practice" };
    })();

    const minutes = scaleMinutes(base.min, level, phase);
    const rpe = base.rpe ? scaleRPE(base.rpe, level, phase) : 0;

    return {
      dayType,
      phase,
      minutes,
      rpe,
      logType: base.type,
      blocks
    };
  }

  window.sportEngine = {
    SPORTS,
    templatesBySport,
    buildSession
  };
})();
