/**
 * PerformanceIQ Elite Workout Engine
 * Powered by:
 *   - Tom Brady TB12 Method: Pliability-first, resistance bands, functional movement
 *   - Kelsey Poulter principles: Fueling-aware programming, sustainable habits
 *   - NSCA Periodization Science: Block periodization, load management, RPE-based intensity
 *   - LTAD Model: Developmental-appropriate programming for youth athletes
 *
 * All exercise prescriptions follow evidence-based guidelines.
 * Safety is prioritized over performance gains (per Performance IQ standards).
 */

// ── TB12 PLIABILITY PROTOCOLS ─────────────────────────────────
// Based on Tom Brady's TB12 Method: muscles must be long, soft, pliable.
// Pliability work is performed BEFORE and AFTER every training session.
export const PLIABILITY_PROTOCOLS = {
  pre_workout: {
    label: 'Pre-Workout Pliability (TB12)',
    duration: '8–10 min',
    description: 'Rhythmic deep-tissue work to prepare muscles for training. Muscles should be soft and pliable before any loading.',
    note: 'Based on TB12 Method: "Pliability is the missing leg of performance training."',
    exercises: [
      { name: 'Foam Roll — Quads', sets: 1, duration: '60 sec each leg', cue: 'Roll slowly, pause on tight spots. Breathe through tension.' },
      { name: 'Foam Roll — Hamstrings', sets: 1, duration: '60 sec each leg', cue: 'Keep core engaged. Rotate leg inward/outward to hit all fibers.' },
      { name: 'Foam Roll — IT Band / Glutes', sets: 1, duration: '60 sec each side', cue: 'Work from hip to knee. Pause on tender areas.' },
      { name: 'Foam Roll — Thoracic Spine', sets: 1, duration: '60 sec', cue: 'Arms crossed over chest. Extend over the roller at each segment.' },
      { name: 'Lacrosse Ball — Calves', sets: 1, duration: '45 sec each', cue: 'Cross one ankle over the other for added pressure.' },
      { name: 'Lacrosse Ball — Glutes / Piriformis', sets: 1, duration: '45 sec each', cue: 'Figure-4 position. Find the tender spot and breathe.' },
    ],
  },
  post_workout: {
    label: 'Post-Workout Pliability (TB12)',
    duration: '10–15 min',
    description: 'Critical recovery work immediately after training. Restores muscle length and begins the recovery process.',
    note: 'TB12 principle: "Recovery is training. Post-workout pliability is non-negotiable."',
    exercises: [
      { name: 'Foam Roll — Full Body Flush', sets: 1, duration: '2 min', cue: 'Light pressure, continuous movement. Flush metabolic waste.' },
      { name: 'Hip Flexor Stretch (Kneeling)', sets: 2, duration: '45 sec each side', cue: 'Posterior pelvic tilt. Feel the stretch in the front of the hip.' },
      { name: 'Pigeon Pose / Figure-4 Stretch', sets: 2, duration: '60 sec each side', cue: 'Breathe deeply. Allow the hip to release progressively.' },
      { name: 'Doorway Chest Stretch', sets: 2, duration: '30 sec', cue: 'Elbows at 90°. Lean forward gently. No pain.' },
      { name: 'Child\'s Pose with Lat Reach', sets: 2, duration: '45 sec', cue: 'Walk hands to each side. Feel the lateral chain lengthen.' },
      { name: 'Supine Hamstring Stretch (Band)', sets: 2, duration: '45 sec each leg', cue: 'Resistance band around foot. Keep knee soft, not locked.' },
      { name: 'Diaphragmatic Breathing', sets: 1, duration: '2 min', cue: '4-count inhale, 4-count hold, 6-count exhale. Activates parasympathetic recovery.' },
    ],
  },
  daily_maintenance: {
    label: 'Daily Pliability Maintenance',
    duration: '5 min',
    description: 'Morning or evening routine to maintain muscle pliability on non-training days.',
    exercises: [
      { name: 'Foam Roll — Quads + Hamstrings', sets: 1, duration: '90 sec total', cue: 'Light to moderate pressure. Focus on any areas of tightness.' },
      { name: 'Hip Flexor + Quad Stretch', sets: 1, duration: '30 sec each side', cue: 'Standing or kneeling. Breathe and relax into the stretch.' },
      { name: 'Thoracic Rotation (Seated)', sets: 1, duration: '10 reps each side', cue: 'Sit tall. Rotate from the mid-back, not the lower back.' },
      { name: 'Ankle Circles + Calf Stretch', sets: 1, duration: '30 sec each', cue: 'Full range of motion. Calves are often neglected.' },
    ],
  },
};

// ── WARM-UP PROTOCOLS ─────────────────────────────────────────
export const WARMUP_PROTOCOLS = {
  general: {
    label: 'General Athletic Warm-Up',
    duration: '8–12 min',
    exercises: [
      { name: 'Light Jog / Bike', duration: '3 min', cue: 'Elevate heart rate gradually. RPE 3–4.' },
      { name: 'Leg Swings (Front/Back)', sets: '10 each leg', cue: 'Hold wall for balance. Controlled swing, not forced.' },
      { name: 'Leg Swings (Side/Side)', sets: '10 each leg', cue: 'Hip abduction/adduction. Increase range gradually.' },
      { name: 'Hip Circles', sets: '10 each direction', cue: 'Large circles. Loosen the hip capsule.' },
      { name: 'Inchworm to Push-Up', sets: '5 reps', cue: 'Walk hands out, push-up, walk back. Full body activation.' },
      { name: 'Lateral Shuffle', sets: '2 × 10m each way', cue: 'Stay low, quick feet. Activate glutes and adductors.' },
      { name: 'High Knees', sets: '2 × 15m', cue: 'Drive knees to hip height. Arm action matches legs.' },
      { name: 'Butt Kicks', sets: '2 × 15m', cue: 'Heel to glute. Maintain forward lean.' },
      { name: 'A-Skip', sets: '2 × 15m', cue: 'Rhythmic. Dorsiflexed foot, drive knee up.' },
    ],
  },
  strength: {
    label: 'Strength Session Warm-Up',
    duration: '10 min',
    exercises: [
      { name: 'Foam Roll — Target Muscles', duration: '3 min', cue: 'Focus on muscles being trained today.' },
      { name: 'Band Pull-Aparts', sets: '2 × 15', cue: 'Scapular retraction. Elbows straight.' },
      { name: 'Glute Bridge', sets: '2 × 15', cue: 'Squeeze glutes at top. No lumbar hyperextension.' },
      { name: 'Goblet Squat (light)', sets: '2 × 10', cue: 'Elbows inside knees. Chest tall. Full depth.' },
      { name: 'Shoulder Circles + Arm Swings', sets: '10 each direction', cue: 'Full range. Warm the rotator cuff.' },
      { name: 'Activation Set (target lift, 40%)', sets: '1 × 10', cue: 'Movement rehearsal. Perfect form only.' },
    ],
  },
  speed: {
    label: 'Speed / Power Session Warm-Up',
    duration: '12–15 min',
    exercises: [
      { name: 'Light Jog', duration: '3 min', cue: 'Gradual elevation. Do not rush this phase.' },
      { name: 'Dynamic Hip Flexor Stretch', sets: '8 each side', cue: 'Lunge forward, reach up. Thoracic extension.' },
      { name: 'Ankle Hops', sets: '2 × 10', cue: 'Stiff ankle. Minimal ground contact time.' },
      { name: 'Skipping for Height', sets: '2 × 20m', cue: 'Max height per rep. Drive arms.' },
      { name: 'Skipping for Distance', sets: '2 × 20m', cue: 'Max horizontal distance. Aggressive arm drive.' },
      { name: 'Build-Up Runs (50–70–90%)', sets: '3 × 30m', cue: 'Progressive acceleration. Last rep at 90% effort.' },
    ],
  },
};

// ── RESISTANCE BAND TRAINING (TB12 Method) ────────────────────
// Brady: "Resistance bands allow you to mirror everyday movements and
// target accelerating and decelerating muscle groups simultaneously."
export const BAND_EXERCISES = [
  { name: 'Band Pull-Apart', category: 'Upper Body', muscles: ['Rear Delts', 'Rhomboids'], sets: '3', reps: '20', cue: 'Arms straight. Squeeze shoulder blades together at end range.' },
  { name: 'Band Face Pull', category: 'Upper Body', muscles: ['Rear Delts', 'External Rotators'], sets: '3', reps: '15', cue: 'Pull to forehead level. External rotate at end. Elbows high.' },
  { name: 'Band Chest Press', category: 'Upper Body', muscles: ['Chest', 'Triceps'], sets: '3', reps: '15', cue: 'Anchor behind. Full extension without locking elbows.' },
  { name: 'Band Row', category: 'Upper Body', muscles: ['Lats', 'Biceps', 'Rear Delts'], sets: '3', reps: '15', cue: 'Drive elbows back. Squeeze lats. No shrugging.' },
  { name: 'Band Lateral Raise', category: 'Upper Body', muscles: ['Lateral Deltoid'], sets: '3', reps: '15', cue: 'Slight forward lean. Raise to shoulder height only.' },
  { name: 'Band Squat', category: 'Lower Body', muscles: ['Quads', 'Glutes', 'Hamstrings'], sets: '3', reps: '15', cue: 'Band under feet. Sit back and down. Knees track toes.' },
  { name: 'Band Hip Hinge / RDL', category: 'Lower Body', muscles: ['Hamstrings', 'Glutes'], sets: '3', reps: '12', cue: 'Hinge at hips. Soft knee. Feel hamstring stretch at bottom.' },
  { name: 'Band Glute Bridge', category: 'Lower Body', muscles: ['Glutes', 'Hamstrings'], sets: '3', reps: '20', cue: 'Band across hips. Drive through heels. Full hip extension.' },
  { name: 'Band Clamshell', category: 'Lower Body', muscles: ['Glute Med', 'Hip Abductors'], sets: '3', reps: '20 each', cue: 'Feet together. Open like a clamshell. No hip rotation.' },
  { name: 'Band Monster Walk', category: 'Lower Body', muscles: ['Glute Med', 'Hip Abductors'], sets: '2', reps: '15 steps each way', cue: 'Stay low. Maintain tension throughout. No knee cave.' },
  { name: 'Band Pallof Press', category: 'Core', muscles: ['Obliques', 'Transverse Abdominis'], sets: '3', reps: '12 each side', cue: 'Resist rotation. Slow and controlled. Breathe out on press.' },
  { name: 'Band Chop (High to Low)', category: 'Core', muscles: ['Obliques', 'Lats'], sets: '3', reps: '12 each side', cue: 'Rotate from thoracic spine. Hips stay square.' },
  { name: 'Band Lift (Low to High)', category: 'Core', muscles: ['Obliques', 'Glutes'], sets: '3', reps: '12 each side', cue: 'Drive from hips. Reach overhead. Control the return.' },
];

// ── ELITE WORKOUT PROGRAMS ────────────────────────────────────
// Periodized blocks: Accumulation → Transmutation → Realization
// Based on NSCA block periodization principles
export const ELITE_PROGRAMS = {
  // ── BASKETBALL ──────────────────────────────────────────────
  basketball: {
    off_season: {
      id: 'bball-offseason-12w',
      title: 'Basketball Off-Season Athletic Development — 12 Weeks',
      sport: 'basketball',
      phase: 'off-season',
      duration: 12,
      sessionsPerWeek: 4,
      level: 'intermediate',
      focus: 'Full Athletic Development',
      description: 'Build the athletic foundation for next season. Emphasis on strength, pliability, and movement quality.',
      blocks: [
        {
          name: 'Block 1 — Accumulation (Weeks 1–4)',
          goal: 'Build work capacity, movement quality, and pliability base',
          rpeTarget: '6–7',
          days: [
            {
              day: 'Monday',
              label: 'Lower Body Strength + Pliability',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Goblet Squat', sets: 4, reps: '10', load: 'Moderate', cue: 'Chest tall, elbows inside knees, full depth. Quality over load.' },
                { name: 'Romanian Deadlift', sets: 3, reps: '12', load: 'Moderate', cue: 'Hinge at hips. Feel hamstring stretch. Neutral spine throughout.' },
                { name: 'Walking Lunge', sets: 3, reps: '10 each leg', load: 'Bodyweight/Light', cue: 'Long stride. Front knee tracks toe. Upright torso.' },
                { name: 'Glute Bridge (Barbell or Bodyweight)', sets: 3, reps: '15', load: 'Moderate', cue: 'Drive through heels. Full hip extension. Squeeze at top.' },
                { name: 'Band Clamshell', sets: 3, reps: '20 each', load: 'Band', cue: 'Activate glute med. No hip rotation.' },
                { name: 'Pallof Press', sets: 3, reps: '12 each side', load: 'Band/Cable', cue: 'Anti-rotation core. Breathe out on press.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Tuesday',
              label: 'Upper Body + Band Work (TB12)',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Band Pull-Apart', sets: 3, reps: '20', load: 'Band', cue: 'Scapular health. Do these every session.' },
                { name: 'Push-Up (Tempo 3-1-1)', sets: 4, reps: '12', load: 'Bodyweight', cue: '3-sec down, 1-sec pause, 1-sec up. Full range.' },
                { name: 'Band Row', sets: 4, reps: '15', load: 'Band', cue: 'Drive elbows back. Squeeze lats at end range.' },
                { name: 'Band Face Pull', sets: 3, reps: '15', load: 'Band', cue: 'External rotation at end. Elbows high.' },
                { name: 'Dumbbell Shoulder Press', sets: 3, reps: '10', load: 'Moderate', cue: 'Neutral grip. Full extension without shrugging.' },
                { name: 'Farmer Carry', sets: 3, reps: '30m', load: 'Moderate', cue: 'Tall posture. Shoulder blades down and back.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Thursday',
              label: 'Speed + Plyometrics',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Box Jump', sets: 4, reps: '5', load: 'Bodyweight', cue: 'Land softly — absorb force through hips and knees. Step down, never jump down.' },
                { name: 'Broad Jump', sets: 4, reps: '5', load: 'Bodyweight', cue: 'Arm swing. Land balanced. Full hip extension at takeoff.' },
                { name: 'Lateral Bound', sets: 3, reps: '6 each side', load: 'Bodyweight', cue: 'Stick the landing. Control before next rep.' },
                { name: '10-Yard Sprint', sets: 6, reps: '1', load: 'Max effort', cue: 'Drive phase. Low angle. Powerful arm drive. 90s rest between.' },
                { name: 'Lateral Shuffle Sprint (5-10-5)', sets: 4, reps: '1', load: 'Max effort', cue: 'Low hips. Quick direction change. Touch the line.' },
                { name: 'Defensive Slide', sets: 3, reps: '20m each way', load: 'Bodyweight', cue: 'Stay low. Wide base. Do not cross feet.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Saturday',
              label: 'Full Body + Skill Integration',
              pliability: 'pre_workout',
              warmup: 'general',
              exercises: [
                { name: 'Trap Bar Deadlift', sets: 4, reps: '8', load: 'Moderate-Heavy', cue: 'Hips back, chest up. Drive floor away. Lock out hips and knees simultaneously.' },
                { name: 'Single-Leg RDL', sets: 3, reps: '8 each', load: 'Light-Moderate', cue: 'Balance challenge. Hinge on standing leg. Reach back foot.' },
                { name: 'Med Ball Chest Pass (Wall)', sets: 3, reps: '10', load: 'Med Ball', cue: 'Explosive push. Catch and immediately rebound.' },
                { name: 'Med Ball Slam', sets: 3, reps: '10', load: 'Med Ball', cue: 'Full extension overhead. Slam with intent. Core braced.' },
                { name: 'Band Pallof Press', sets: 3, reps: '12 each', load: 'Band', cue: 'Anti-rotation. Breathe out on press.' },
                { name: 'Plank Variations', sets: '3 × 30–45 sec', reps: '—', load: 'Bodyweight', cue: 'Hollow body position. Breathe. No sagging hips.' },
              ],
              cooldown: 'post_workout',
            },
          ],
        },
        {
          name: 'Block 2 — Transmutation (Weeks 5–8)',
          goal: 'Convert strength base into sport-specific power and speed',
          rpeTarget: '7–8',
          days: [
            {
              day: 'Monday',
              label: 'Power Lower Body',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Power Clean (from hang)', sets: 4, reps: '4', load: 'Moderate (60–70% 1RM)', cue: 'Triple extension: ankle, knee, hip. Shrug and pull under bar. Catch in quarter squat.' },
                { name: 'Back Squat', sets: 4, reps: '6', load: 'Moderate-Heavy (70–75%)', cue: 'Brace core. Break at hips and knees simultaneously. Drive knees out.' },
                { name: 'Depth Jump', sets: 3, reps: '5', load: 'Bodyweight', cue: 'Step off box. Minimal ground contact. Explode up immediately.' },
                { name: 'Nordic Hamstring Curl', sets: 3, reps: '5', load: 'Bodyweight', cue: 'Eccentric focus. Lower slowly (3–5 sec). Hamstring injury prevention.' },
                { name: 'Single-Leg Glute Bridge', sets: 3, reps: '15 each', load: 'Bodyweight/Band', cue: 'Maintain level hips. Full hip extension.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Wednesday',
              label: 'Upper Body Power + Band',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Bench Press', sets: 4, reps: '5', load: 'Heavy (80–85%)', cue: 'Leg drive. Bar to lower chest. Full lockout.' },
                { name: 'Bent-Over Row', sets: 4, reps: '6', load: 'Heavy', cue: 'Hinge 45°. Drive elbows back. Bar to lower chest.' },
                { name: 'Band Chest Press (Explosive)', sets: 3, reps: '12', load: 'Band', cue: 'Explosive concentric. Controlled eccentric. Pliability principle.' },
                { name: 'Band Pull-Apart', sets: 3, reps: '20', load: 'Band', cue: 'Shoulder health. Non-negotiable every session.' },
                { name: 'Overhead Press', sets: 3, reps: '8', load: 'Moderate', cue: 'Brace core. Press straight up. Avoid lumbar extension.' },
                { name: 'Chin-Up', sets: 3, reps: 'Max (quality)', load: 'Bodyweight', cue: 'Full hang to chin over bar. No kipping.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Friday',
              label: 'Speed + Court Conditioning',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Flying 20m Sprint', sets: 5, reps: '1', load: 'Max velocity', cue: '20m build-up, then 20m max. Focus on top-end speed mechanics.' },
                { name: 'Reactive Agility Drill', sets: 6, reps: '1', load: 'Max effort', cue: 'React to visual cue. First-step quickness is the goal.' },
                { name: 'Cone Drill (T-Drill)', sets: 4, reps: '1', load: 'Max effort', cue: 'Low hips on cuts. Plant and drive. Time each rep.' },
                { name: 'Suicide Sprints', sets: '3 sets', reps: '1', load: 'Max effort', cue: 'Touch each line. Compete against your own time.' },
                { name: 'Jump Rope', sets: 3, reps: '60 sec', load: 'Bodyweight', cue: 'Ankle stiffness. Minimal ground contact. Rhythm.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Sunday',
              label: 'Recovery + Pliability Day',
              pliability: 'daily_maintenance',
              warmup: null,
              exercises: [
                { name: 'Full Body Foam Roll', sets: 1, reps: '15 min', load: 'Bodyweight', cue: 'TB12 recovery principle: muscles must be restored after training stress.' },
                { name: 'Yoga Flow / Mobility Circuit', sets: 1, reps: '20 min', load: 'Bodyweight', cue: 'Focus on hip flexors, thoracic spine, and ankles.' },
                { name: 'Light Walk or Swim', sets: 1, reps: '20–30 min', load: 'Easy', cue: 'Active recovery. RPE 2–3. Promote blood flow without adding stress.' },
              ],
              cooldown: null,
            },
          ],
        },
      ],
      mindsetNotes: [
        'TB12 Principle: "I can always be better." Every session is an opportunity to improve — not just physically, but in focus, preparation, and recovery.',
        'Kelsey Poulter: "Training uses energy. Fueling creates it." You cannot out-train poor nutrition. Eat to support your work.',
        'NSCA Principle: Leave 2–3 reps in reserve on all strength work during accumulation. Adaptation happens during recovery, not during the set.',
        'TB12 Principle: Pliability is non-negotiable. Skip the pre/post pliability work and you are leaving performance on the table.',
      ],
    },
  },

    pre_season: {
      id: 'bball-preseason-4w',
      title: 'Basketball Pre-Season Sharpening — 4 Weeks',
      sport: 'basketball',
      phase: 'pre-season',
      duration: 4,
      sessionsPerWeek: 4,
      level: 'intermediate',
      focus: 'Speed, Sharpness, and Court Readiness',
      description: 'Convert your off-season fitness into game-ready sharpness. Reduce volume, increase sport-specificity, and peak for opening tip-off.',
      blocks: [
        {
          name: 'Block 1 — Pre-Season Sharpening (Weeks 1–4)',
          goal: 'Peak speed, court agility, and game-ready conditioning',
          rpeTarget: '7–9',
          days: [
            {
              day: 'Monday',
              label: 'Strength Maintenance + Explosive Power',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Back Squat', sets: 3, reps: '4', load: '80–85%', cue: 'Maintain strength. Reduce volume. Trust the off-season base.' },
                { name: 'Power Clean (from hang)', sets: 3, reps: '3', load: '70%', cue: 'Explosive. Maintain power output entering the season.' },
                { name: 'Nordic Hamstring Curl', sets: 3, reps: '5', load: 'Bodyweight', cue: 'Non-negotiable. Hamstring protection entering the season.' },
                { name: 'Band Pull-Apart', sets: 3, reps: '20', load: 'Band', cue: 'Shoulder health maintenance. Every session.' },
                { name: 'Depth Jump', sets: 3, reps: '4', load: 'Bodyweight', cue: 'Reactive strength. Minimal ground contact. Stay sharp.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Wednesday',
              label: 'Court Speed + Agility',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: '10-Yard Sprint', sets: 6, reps: '1', load: 'Max effort', cue: 'First-step quickness. Drive phase. Full rest between reps.' },
                { name: '5-10-5 Shuttle', sets: 5, reps: '1', load: 'Max effort', cue: 'Low hips on cuts. Touch the line. Time each rep.' },
                { name: 'Defensive Slide (Full Court)', sets: 4, reps: '1 length', load: 'Max effort', cue: 'Stay low. Wide base. Do not cross feet. Game-speed intensity.' },
                { name: 'Reactive Cone Drill', sets: 5, reps: '1', load: 'Max effort', cue: 'React to signal. First-step decision-making.' },
                { name: 'Closeout Drill', sets: 4, reps: '5 each', load: 'Bodyweight', cue: 'Sprint to closeout, chop feet, contest. Defensive fundamentals.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Friday',
              label: 'Game Conditioning + Skill Integration',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: '17s Conditioning Test', sets: 3, reps: '1', load: 'Max effort', cue: 'Baseline to baseline 17 times in under 60 sec. Standard NBA/NCAA conditioning benchmark.' },
                { name: 'Full-Court Dribble Sprints', sets: 4, reps: '1 length', load: 'Max effort', cue: 'Ball-handling under fatigue. Game-speed decision-making.' },
                { name: 'Box Jump to Sprint', sets: 4, reps: '3', load: 'Bodyweight', cue: 'Jump, land, immediately sprint 10m. Reactive power to acceleration.' },
                { name: 'Jump Rope', sets: 3, reps: '60 sec', load: 'Bodyweight', cue: 'Ankle stiffness. Rhythm. Footwork coordination.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Saturday',
              label: 'Recovery + Activation',
              pliability: 'daily_maintenance',
              warmup: null,
              exercises: [
                { name: 'Foam Roll + Stretch', sets: 1, reps: '15 min', load: 'Bodyweight', cue: 'Full body. Focus on quads, hamstrings, calves, and thoracic spine.' },
                { name: 'Activation Band Circuit', sets: 2, reps: '15 each', load: 'Band', cue: 'Glute bridge, clamshell, band walk. Prime the hips for game day.' },
              ],
              cooldown: null,
            },
          ],
        },
      ],
      mindsetNotes: [
        'Pre-season is about sharpening, not building. Trust the off-season work you put in.',
        'TB12: "Pliability is your competitive advantage." Every opponent is athletic. Not every opponent is pliable and recovered.',
        'Kelsey Poulter: "Fuel for the game you want to play, not the practice you just had." Carb-load the night before game day.',
      ],
    },
    in_season: {
      id: 'bball-inseason',
      title: 'Basketball In-Season Maintenance',
      sport: 'basketball',
      phase: 'in-season',
      duration: 20,
      sessionsPerWeek: 2,
      level: 'intermediate',
      focus: 'Strength Maintenance + Injury Prevention',
      description: 'Maintain the physical qualities built in the off-season. Minimum effective dose — maximum carry-over to the court.',
      blocks: [
        {
          name: 'In-Season Maintenance Block',
          goal: 'Maintain strength, prevent injury, and manage fatigue across a long season',
          rpeTarget: '6–7',
          days: [
            {
              day: 'Tuesday',
              label: 'In-Season Strength (Non-Game Day)',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Back Squat', sets: 2, reps: '4', load: '75–80%', cue: 'Minimum effective dose. NSCA: 2 sessions/week is sufficient to maintain off-season strength gains.' },
                { name: 'Nordic Hamstring Curl', sets: 2, reps: '5', load: 'Bodyweight', cue: 'Non-negotiable in-season. Hamstring health is a season-long commitment.' },
                { name: 'Single-Leg RDL', sets: 2, reps: '8 each', load: 'Moderate', cue: 'Unilateral stability. Ankle and knee proprioception for cutting and landing.' },
                { name: 'Band Pull-Apart', sets: 3, reps: '20', load: 'Band', cue: 'Shoulder health. 2 minutes of work that prevents weeks of missed games.' },
                { name: 'Glute Bridge', sets: 2, reps: '15', load: 'Band/BW', cue: 'Glute activation. Maintain hip power for explosiveness.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Thursday',
              label: 'Speed Maintenance + Activation',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: '10-Yard Sprint', sets: 4, reps: '1', load: 'Max effort', cue: 'Maintain first-step quickness. Full rest. Quality over volume.' },
                { name: 'Defensive Slide', sets: 3, reps: '15m each way', load: 'Bodyweight', cue: 'Lateral quickness maintenance. Stay low.' },
                { name: 'Jump Rope', sets: 2, reps: '60 sec', load: 'Bodyweight', cue: 'Footwork and ankle stiffness maintenance.' },
              ],
              cooldown: 'post_workout',
            },
          ],
        },
      ],
      mindsetNotes: [
        'In-season training is about maintenance, not gains. Protect what you built. Two sessions per week is all you need.',
        'TB12: "The best ability is availability." Staying on the court is the most important performance metric during the season.',
        'Kelsey Poulter: "Refuel within 30 minutes post-game." Glycogen replenishment starts immediately. Chocolate milk or a protein + carb shake is evidence-based and effective.',
      ],
    },

  // ── FOOTBALL ────────────────────────────────────────────────
  football: {
    off_season: {
      id: 'fb-offseason-12w',
      title: 'Football Off-Season Power Development — 12 Weeks',
      sport: 'football',
      phase: 'off-season',
      duration: 12,
      sessionsPerWeek: 4,
      level: 'intermediate',
      focus: 'Strength + Power',
      description: 'Build elite football athleticism: explosive power, functional strength, and injury resilience.',
      blocks: [
        {
          name: 'Block 1 — Foundation (Weeks 1–4)',
          goal: 'Movement quality, pliability base, and work capacity',
          rpeTarget: '6–7',
          days: [
            {
              day: 'Monday',
              label: 'Lower Body Strength',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Back Squat', sets: 4, reps: '8', load: 'Moderate (65–70%)', cue: 'Brace 360°. Break parallel. Drive knees out.' },
                { name: 'Romanian Deadlift', sets: 3, reps: '10', load: 'Moderate', cue: 'Hinge pattern. Hamstring tension throughout. Neutral spine.' },
                { name: 'Bulgarian Split Squat', sets: 3, reps: '8 each', load: 'Moderate', cue: 'Front foot forward. Vertical shin. Deep range.' },
                { name: 'Hip Thrust', sets: 3, reps: '15', load: 'Moderate', cue: 'Full hip extension. Posterior pelvic tilt at top.' },
                { name: 'Band Monster Walk', sets: 3, reps: '15 each way', load: 'Band', cue: 'Stay low. Maintain tension. Glute med activation.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Wednesday',
              label: 'Upper Body Strength + Band',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Bench Press', sets: 4, reps: '8', load: 'Moderate (65–70%)', cue: 'Leg drive. Controlled descent. Explosive press.' },
                { name: 'Bent-Over Row', sets: 4, reps: '8', load: 'Moderate', cue: 'Hinge 45°. Pull to lower chest. Squeeze lats.' },
                { name: 'Band Pull-Apart', sets: 4, reps: '20', load: 'Band', cue: 'Shoulder health. Every session, every time.' },
                { name: 'Incline Dumbbell Press', sets: 3, reps: '10', load: 'Moderate', cue: 'Neutral grip option. Full range.' },
                { name: 'Seated Cable Row', sets: 3, reps: '12', load: 'Moderate', cue: 'Chest up. Drive elbows back. No momentum.' },
                { name: 'Tricep Dip / Push-Down', sets: 3, reps: '12', load: 'Bodyweight/Cable', cue: 'Full extension. Controlled.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Friday',
              label: 'Power + Explosiveness',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Box Jump', sets: 4, reps: '5', load: 'Bodyweight', cue: 'Land softly. Step down. Quality over height.' },
                { name: 'Broad Jump', sets: 4, reps: '5', load: 'Bodyweight', cue: 'Arm swing. Stick landing. Full hip extension.' },
                { name: '40-Yard Dash (Build-Up)', sets: 4, reps: '1', load: '80–90% effort', cue: 'Drive phase focus. Low angle. Powerful arm drive.' },
                { name: 'Med Ball Rotational Throw', sets: 3, reps: '8 each side', load: 'Med Ball', cue: 'Rotate from hips. Explosive release. Catch or wall throw.' },
                { name: 'Sled Push', sets: 4, reps: '20m', load: 'Moderate', cue: 'Low angle. Drive through heels. Full hip extension.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Saturday',
              label: 'Recovery + Pliability',
              pliability: 'daily_maintenance',
              warmup: null,
              exercises: [
                { name: 'Full Body Foam Roll', sets: 1, reps: '15 min', load: 'Bodyweight', cue: 'Focus on quads, hamstrings, IT band, and thoracic spine.' },
                { name: 'Mobility Flow', sets: 1, reps: '20 min', load: 'Bodyweight', cue: 'Hip flexors, thoracic rotation, ankle mobility.' },
              ],
              cooldown: null,
            },
          ],
        },
      ],
      mindsetNotes: [
        'TB12: "The best ability is availability." Staying healthy is the most important performance metric.',
        'NSCA: Progressive overload is the driver of adaptation. Add load only when technique is perfect.',
        'Kelsey Poulter: "Under-fueled athletes are undertrained athletes." Pre-workout carbs and post-workout protein are non-negotiable.',
      ],
    },
  },


    pre_season: {
      id: 'fb-preseason-4w',
      title: 'Football Pre-Season Sharpening — 4 Weeks',
      sport: 'football',
      phase: 'pre-season',
      duration: 4,
      sessionsPerWeek: 4,
      level: 'intermediate',
      focus: 'Explosive Power + Contact Readiness',
      description: 'Peak for training camp and opening week. Sharpen speed, power, and conditioning. Reduce volume — increase intensity and sport-specificity.',
      blocks: [
        {
          name: 'Block 1 — Pre-Season Sharpening (Weeks 1–4)',
          goal: 'Peak explosive power, contact readiness, and position-specific conditioning',
          rpeTarget: '7–9',
          days: [
            {
              day: 'Monday',
              label: 'Max Strength + Power Maintenance',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Back Squat', sets: 3, reps: '3', load: '82–87%', cue: 'Maintain max strength. Reduce volume. Explosive concentric intent.' },
                { name: 'Power Clean', sets: 4, reps: '3', load: '72–78%', cue: 'Max velocity. Triple extension. Peak power output entering camp.' },
                { name: 'Bench Press', sets: 3, reps: '3', load: '82–87%', cue: 'Maintain upper body strength. Leg drive. Full lockout.' },
                { name: 'Band Pull-Apart', sets: 3, reps: '20', load: 'Band', cue: 'Shoulder health. Every session. Non-negotiable.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Wednesday',
              label: 'Speed + Explosiveness',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: '40-Yard Dash', sets: 4, reps: '1', load: 'Max effort', cue: 'Drive phase to top speed. Full rest (4 min). Time each rep.' },
                { name: '10-Yard Burst', sets: 6, reps: '1', load: 'Max effort', cue: 'First-step explosion. Football is a game of 10-yard bursts.' },
                { name: 'Pro Agility (5-10-5)', sets: 5, reps: '1', load: 'Max effort', cue: 'Low hips. Plant and drive. Change of direction speed.' },
                { name: 'Sled Push (Heavy)', sets: 4, reps: '15m', load: 'Heavy', cue: 'Drive through heels. Full hip extension. Contact simulation.' },
                { name: 'Med Ball Rotational Throw', sets: 3, reps: '8 each side', load: 'Med Ball', cue: 'Rotational power. Explosive hip drive.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Friday',
              label: 'Position-Specific Conditioning',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Gassers (Half-Field)', sets: 4, reps: '1', load: 'Max effort', cue: 'Sprint half-field width and back. Standard football conditioning benchmark.' },
                { name: 'Reactive Agility Drill', sets: 6, reps: '1', load: 'Max effort', cue: 'React to signal. First-step quickness under fatigue.' },
                { name: 'Box Jump to Sprint', sets: 4, reps: '3', load: 'Bodyweight', cue: 'Reactive power to acceleration. Game-speed transitions.' },
                { name: 'Jump Rope', sets: 3, reps: '60 sec', load: 'Bodyweight', cue: 'Footwork and coordination. Ankle stiffness.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Saturday',
              label: 'Recovery + Pliability',
              pliability: 'daily_maintenance',
              warmup: null,
              exercises: [
                { name: 'Full Body Foam Roll', sets: 1, reps: '15 min', load: 'Bodyweight', cue: 'Focus on quads, hamstrings, IT band, thoracic spine, and hip flexors.' },
                { name: 'Mobility Flow', sets: 1, reps: '15 min', load: 'Bodyweight', cue: 'Hip flexors, thoracic rotation, ankle mobility. Prepare for camp volume.' },
              ],
              cooldown: null,
            },
          ],
        },
      ],
      mindsetNotes: [
        'Pre-season is the proving ground. The work you did in the off-season either shows up here or it does not.',
        'TB12: "Pliability is your competitive advantage." At this level, everyone is strong. The player who stays healthy wins.',
        'Kelsey Poulter: "Fuel for the game you want to play." Pre-practice carbohydrates and post-practice protein are the two most important habits in training camp.',
      ],
    },
    in_season: {
      id: 'fb-inseason',
      title: 'Football In-Season Maintenance',
      sport: 'football',
      phase: 'in-season',
      duration: 18,
      sessionsPerWeek: 2,
      level: 'intermediate',
      focus: 'Strength Maintenance + Contact Recovery',
      description: 'Maintain strength and power through an 18-week season. Manage fatigue from practice and game contact while preserving the physical qualities built in the off-season.',
      blocks: [
        {
          name: 'In-Season Maintenance Block',
          goal: 'Maintain strength, manage contact fatigue, and protect the body through the season',
          rpeTarget: '6–7',
          days: [
            {
              day: 'Tuesday',
              label: 'In-Season Strength (Post-Game Recovery)',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Back Squat', sets: 2, reps: '4', load: '72–78%', cue: 'Minimum effective dose. Maintain lower body strength. NSCA: 2 sessions/week maintains off-season gains.' },
                { name: 'Bench Press', sets: 2, reps: '4', load: '72–78%', cue: 'Maintain upper body strength. Manage contact fatigue.' },
                { name: 'Band Pull-Apart', sets: 3, reps: '20', load: 'Band', cue: 'Shoulder health. Non-negotiable every session. Prevents impingement from contact.' },
                { name: 'Hip Thrust', sets: 2, reps: '12', load: 'Moderate', cue: 'Maintain glute power. Hip extension force for acceleration.' },
                { name: 'Pallof Press', sets: 2, reps: '12 each', load: 'Band', cue: 'Core stability maintenance. Power transfer foundation.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Thursday',
              label: 'Speed Maintenance + Activation (Pre-Game)',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: '10-Yard Burst', sets: 4, reps: '1', load: 'Max effort', cue: 'Maintain first-step explosion. Full rest. Quality over volume.' },
                { name: 'Box Jump', sets: 3, reps: '4', load: 'Bodyweight', cue: 'Maintain reactive power. Minimal volume. Stay sharp.' },
                { name: 'Glute Bridge', sets: 2, reps: '15', load: 'Band/BW', cue: 'Pre-game glute activation. Prime the posterior chain.' },
              ],
              cooldown: 'post_workout',
            },
          ],
        },
      ],
      mindsetNotes: [
        'In-season is about maintenance and recovery. Protect what you built. Two sessions per week is evidence-based and sufficient.',
        'TB12: "The best ability is availability." In football, staying healthy through 18 weeks is the most important physical achievement.',
        'Kelsey Poulter: "Post-game nutrition is non-negotiable." Refuel within 30 minutes. Protein + carbohydrates start the recovery process immediately.',
      ],
    },

  // ── SOCCER ──────────────────────────────────────────────────
  soccer: {
    off_season: {
      id: 'soccer-offseason-12w',
      title: 'Soccer Off-Season Athletic Development — 12 Weeks',
      sport: 'soccer',
      phase: 'off-season',
      duration: 12,
      sessionsPerWeek: 4,
      level: 'intermediate',
      focus: 'Aerobic Base + Functional Strength',
      description: 'Build the physical foundation for a dominant season. Emphasis on posterior chain strength, single-leg stability, pliability, and aerobic capacity — the pillars of elite soccer fitness.',
      blocks: [
        {
          name: 'Block 1 — Accumulation (Weeks 1–4)',
          goal: 'Aerobic base, movement quality, pliability, and injury prevention',
          rpeTarget: '6–7',
          days: [
            {
              day: 'Monday',
              label: 'Lower Body Strength + Pliability',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Goblet Squat', sets: 4, reps: '10', load: 'Moderate', cue: 'Chest tall, elbows inside knees. Full depth. Builds quad and glute strength critical for sprinting and shooting.' },
                { name: 'Romanian Deadlift', sets: 4, reps: '10', load: 'Moderate', cue: 'Hinge at hips. Feel hamstring tension. Neutral spine. Hamstring strength is the #1 injury prevention tool in soccer.' },
                { name: 'Single-Leg Romanian Deadlift', sets: 3, reps: '8 each', load: 'Light-Moderate', cue: 'Balance challenge. Hinge on standing leg. Builds unilateral stability for cutting and landing.' },
                { name: 'Nordic Hamstring Curl', sets: 3, reps: '5', load: 'Bodyweight', cue: 'Eccentric focus — lower as slowly as possible (4–6 sec). Evidence-based hamstring injury prevention (Petersen et al., 2011).' },
                { name: 'Glute Bridge (Barbell)', sets: 3, reps: '15', load: 'Moderate', cue: 'Drive through heels. Full hip extension. Glute strength transfers directly to sprint speed.' },
                { name: 'Band Clamshell', sets: 3, reps: '20 each', load: 'Band', cue: 'Hip abductor activation. Prevents knee valgus on landing and cutting.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Tuesday',
              label: 'Aerobic Base + Movement Skills',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Continuous Run (Aerobic Threshold)', sets: 1, reps: '25–30 min', load: 'RPE 5–6', cue: 'Conversational pace. Builds aerobic engine. Soccer demands 10–13 km per match (Bangsbo et al., 2006).' },
                { name: 'Lateral Shuffle Drill', sets: 4, reps: '15m each way', load: 'Bodyweight', cue: 'Stay low. Quick feet. Mimics defensive positioning.' },
                { name: 'Backpedal to Sprint', sets: 5, reps: '10m back + 10m forward', load: 'Max effort', cue: 'Transition speed. React and drive. First-step quickness.' },
                { name: 'Cone Weave Drill', sets: 4, reps: '1 pass', load: 'Max effort', cue: 'Tight turns. Plant and drive. Ankle and knee stability.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Thursday',
              label: 'Upper Body + Core Stability',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Band Pull-Apart', sets: 4, reps: '20', load: 'Band', cue: 'Shoulder health. Non-negotiable. Prevents shoulder impingement from throw-ins and aerial duels.' },
                { name: 'Push-Up (Tempo 3-1-1)', sets: 4, reps: '12', load: 'Bodyweight', cue: '3-sec down, 1-sec pause, explode up. Full range of motion.' },
                { name: 'Band Row', sets: 4, reps: '15', load: 'Band', cue: 'Drive elbows back. Scapular retraction. Postural strength for 90-minute matches.' },
                { name: 'Pallof Press', sets: 3, reps: '12 each side', load: 'Band/Cable', cue: 'Anti-rotation core. Resist the band. Breathe out on press.' },
                { name: 'Dead Bug', sets: 3, reps: '10 each side', load: 'Bodyweight', cue: 'Lower back pressed to floor. Opposite arm and leg. Core stability for kicking power.' },
                { name: 'Copenhagen Plank', sets: 3, reps: '20 sec each side', load: 'Bodyweight', cue: 'Adductor strength. Groin injury prevention. Evidence-based (Harøy et al., 2019).' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Saturday',
              label: 'Power + Plyometrics',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Box Jump', sets: 4, reps: '5', load: 'Bodyweight', cue: 'Land softly — absorb through hips and knees. Step down. Builds vertical power for aerial duels.' },
                { name: 'Broad Jump', sets: 4, reps: '5', load: 'Bodyweight', cue: 'Arm swing. Stick landing. Horizontal power for acceleration.' },
                { name: 'Single-Leg Hop (Stick Landing)', sets: 3, reps: '6 each', load: 'Bodyweight', cue: 'Land on one foot and hold 2 sec. Builds single-leg stability for cutting.' },
                { name: '10-Yard Sprint', sets: 6, reps: '1', load: 'Max effort', cue: 'Drive phase. Low angle. Powerful arm drive. 90s full rest.' },
                { name: 'Med Ball Rotational Throw (Wall)', sets: 3, reps: '10 each side', load: 'Med Ball', cue: 'Rotate from hips. Explosive release. Builds rotational power for shooting.' },
              ],
              cooldown: 'post_workout',
            },
          ],
        },
        {
          name: 'Block 2 — Transmutation (Weeks 5–8)',
          goal: 'Convert strength base into soccer-specific power, speed, and change of direction',
          rpeTarget: '7–8',
          days: [
            {
              day: 'Monday',
              label: 'Power Lower Body + Sprint Mechanics',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Hang Power Clean', sets: 4, reps: '4', load: 'Moderate (60–65%)', cue: 'Triple extension: ankle, knee, hip. Fast elbows. Catch in quarter squat. Explosive hip extension = sprint power.' },
                { name: 'Back Squat', sets: 4, reps: '5', load: 'Heavy (75–80%)', cue: 'Brace 360°. Break parallel. Drive knees out. Explosive concentric.' },
                { name: 'Depth Jump', sets: 3, reps: '5', load: 'Bodyweight', cue: 'Step off box. Minimal ground contact. Reactive strength for quick direction changes.' },
                { name: 'Nordic Hamstring Curl', sets: 3, reps: '6', load: 'Bodyweight', cue: 'Maintain eccentric focus. Add a band assist if needed. Hamstring resilience.' },
                { name: 'Single-Leg Glute Bridge (Weighted)', sets: 3, reps: '12 each', load: 'Plate/Band', cue: 'Level hips. Full extension. Unilateral glute strength.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Wednesday',
              label: 'High-Intensity Interval Training (HIIT)',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: '30/30 Intervals (Run)', sets: 8, reps: '30 sec on / 30 sec off', load: 'RPE 8–9 on, RPE 3 off', cue: 'Max aerobic speed on work intervals. Soccer match demands repeated high-intensity efforts (Stølen et al., 2005).' },
                { name: 'Reactive Agility Drill', sets: 6, reps: '1', load: 'Max effort', cue: 'React to visual or verbal cue. First-step quickness. Simulates match decision-making.' },
                { name: 'T-Drill', sets: 4, reps: '1', load: 'Max effort', cue: 'Low hips on cuts. Plant and drive. Time each rep. Compete against yourself.' },
                { name: 'Lateral Bound (Continuous)', sets: 3, reps: '10 each side', load: 'Bodyweight', cue: 'Continuous side-to-side. Stick each landing briefly. Lateral power.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Friday',
              label: 'Upper Body Power + Core',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Bench Press', sets: 4, reps: '5', load: 'Heavy (78–82%)', cue: 'Full range. Explosive press. Upper body strength for aerial duels and throw-ins.' },
                { name: 'Bent-Over Row', sets: 4, reps: '6', load: 'Heavy', cue: 'Hinge 45°. Drive elbows back. Postural endurance for 90 minutes.' },
                { name: 'Band Pull-Apart', sets: 3, reps: '20', load: 'Band', cue: 'Every session. Shoulder health and scapular stability.' },
                { name: 'Med Ball Slam', sets: 3, reps: '10', load: 'Med Ball', cue: 'Full extension overhead. Slam with intent. Total body power expression.' },
                { name: 'Hanging Leg Raise', sets: 3, reps: '12', load: 'Bodyweight', cue: 'Control the descent. No swinging. Hip flexor + core strength for kicking.' },
                { name: 'Side Plank (with Hip Dip)', sets: 3, reps: '10 each side', load: 'Bodyweight', cue: 'Lateral core stability. Oblique strength. Injury prevention.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Sunday',
              label: 'Recovery + Pliability Day',
              pliability: 'daily_maintenance',
              warmup: null,
              exercises: [
                { name: 'Full Body Foam Roll', sets: 1, reps: '15 min', load: 'Bodyweight', cue: 'TB12 recovery principle: muscles must be restored after training stress. Focus on quads, hamstrings, IT band, and calves.' },
                { name: 'Yoga / Mobility Flow', sets: 1, reps: '20 min', load: 'Bodyweight', cue: 'Hip flexors, thoracic rotation, ankle mobility. Soccer demands full hip range of motion.' },
                { name: 'Light Jog or Swim', sets: 1, reps: '20 min', load: 'RPE 2–3', cue: 'Active recovery. Promote blood flow. No intensity.' },
              ],
              cooldown: null,
            },
          ],
        },
        {
          name: 'Block 3 — Realization (Weeks 9–12)',
          goal: 'Peak sport-specific performance, speed, and match readiness',
          rpeTarget: '8–9',
          days: [
            {
              day: 'Monday',
              label: 'Max Strength + Explosive Power',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Back Squat (Heavy)', sets: 4, reps: '3', load: '85–90% 1RM', cue: 'Max strength expression. Perfect technique. Spot required.' },
                { name: 'Power Clean', sets: 4, reps: '3', load: '70–75%', cue: 'Max velocity. Triple extension. Explosive.' },
                { name: 'Reactive Box Jump (with sprint)', sets: 4, reps: '3', load: 'Bodyweight', cue: 'Jump, land, immediately sprint 10m. Combines reactive strength with acceleration.' },
                { name: 'Nordic Hamstring Curl', sets: 3, reps: '5', load: 'Bodyweight', cue: 'Maintain throughout the season. Hamstring resilience is season-long.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Wednesday',
              label: 'Match Simulation Conditioning',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Small-Sided Game Simulation (5v5 or solo)', sets: 1, reps: '4 × 6 min', load: 'Max effort', cue: 'Replicate match intensity. High-intensity efforts with brief recovery. Mirrors actual match demands.' },
                { name: '40m Sprint (Max Velocity)', sets: 5, reps: '1', load: 'Max effort', cue: 'Full recovery between reps (3 min). Top-end speed development.' },
                { name: 'Deceleration Drill', sets: 4, reps: '1', load: 'Max effort', cue: 'Sprint 15m, decelerate to stop in 3m. Eccentric loading. Knee and hamstring protection.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Friday',
              label: 'Upper Body Maintenance + Core',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Band Pull-Apart', sets: 3, reps: '20', load: 'Band', cue: 'Shoulder maintenance. Every session.' },
                { name: 'Push-Up Variations', sets: 3, reps: '15', load: 'Bodyweight', cue: 'Maintain upper body strength without adding fatigue before match week.' },
                { name: 'Pallof Press', sets: 3, reps: '12 each', load: 'Band', cue: 'Core stability. Anti-rotation. Kicking power foundation.' },
                { name: 'Copenhagen Plank', sets: 3, reps: '25 sec each', load: 'Bodyweight', cue: 'Adductor maintenance. Groin protection through the season.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Saturday',
              label: 'Recovery + Pre-Match Activation',
              pliability: 'daily_maintenance',
              warmup: null,
              exercises: [
                { name: 'Foam Roll — Quads + Hamstrings + Calves', sets: 1, reps: '10 min', load: 'Bodyweight', cue: 'Light pressure. Flush metabolic waste. Prepare for tomorrow.' },
                { name: 'Dynamic Warm-Up (Short)', sets: 1, reps: '8 min', load: 'Bodyweight', cue: 'Leg swings, hip circles, lateral shuffles. Activate without fatiguing.' },
                { name: 'Activation Band Work', sets: 1, reps: '2 × 15 each', load: 'Band', cue: 'Glute bridge, clamshell, band walk. Prime the hips for match day.' },
              ],
              cooldown: null,
            },
          ],
        },
      ],
      mindsetNotes: [
        'TB12 Principle: "Pliability is the missing leg of performance training." Hamstring and hip flexor pliability directly determines your sprint speed and injury risk on the pitch.',
        'Kelsey Poulter: "Fueling is a skill." Pre-match carbohydrate loading (3–4 g/kg, 3–4 hours before) is evidence-based and non-negotiable for 90-minute performance.',
        'NSCA Principle: Nordic Hamstring Curls reduce hamstring injury risk by up to 51% (Petersen et al., 2011). Do them every week, not just when you feel tight.',
        'TB12: "I can always be better." Every training session is a chance to improve your movement quality, not just your fitness numbers.',
        'Kelsey Poulter: "Recovery is where adaptation happens." Sleep 8–9 hours. Hydrate. Eat within 30 minutes post-training. These are not optional.',
        'NSCA: Change of direction speed is trainable. Deceleration mechanics — not just acceleration — separate elite players from average ones.',
      ],
    },
    pre_season: {
      id: 'soccer-preseason-4w',
      title: 'Soccer Pre-Season Sharpening — 4 Weeks',
      sport: 'soccer',
      phase: 'pre-season',
      duration: 4,
      sessionsPerWeek: 4,
      level: 'intermediate',
      focus: 'Speed, Sharpness, and Match Readiness',
      description: 'Convert your off-season fitness base into match-ready sharpness. Reduce volume, increase intensity and sport-specificity.',
      blocks: [
        {
          name: 'Block 1 — Pre-Season Sharpening (Weeks 1–4)',
          goal: 'Peak speed, agility, and match fitness',
          rpeTarget: '7–9',
          days: [
            {
              day: 'Monday',
              label: 'Strength Maintenance + Power',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Back Squat', sets: 3, reps: '4', load: '80–85%', cue: 'Maintain strength. Reduce volume. Quality over quantity in pre-season.' },
                { name: 'Power Clean', sets: 3, reps: '3', load: '70%', cue: 'Explosive. Maintain power output.' },
                { name: 'Nordic Hamstring Curl', sets: 3, reps: '5', load: 'Bodyweight', cue: 'Non-negotiable. Hamstring protection entering the season.' },
                { name: 'Band Pull-Apart', sets: 3, reps: '20', load: 'Band', cue: 'Shoulder health maintenance.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Wednesday',
              label: 'Speed + Agility',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: '10-Yard Sprint', sets: 6, reps: '1', load: 'Max effort', cue: 'First-step quickness. Drive phase mechanics. Full rest between reps.' },
                { name: '40m Sprint', sets: 4, reps: '1', load: 'Max effort', cue: 'Top-end speed. Upright mechanics. Full rest.' },
                { name: 'T-Drill', sets: 4, reps: '1', load: 'Max effort', cue: 'Change of direction speed. Time each rep.' },
                { name: 'Reactive Cone Drill', sets: 5, reps: '1', load: 'Max effort', cue: 'React to coach signal. Simulates match decision-making.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Friday',
              label: 'Match Simulation + Conditioning',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Interval Run (90/30)', sets: 6, reps: '90 sec on / 30 sec off', load: 'RPE 8–9', cue: 'Match-intensity aerobic work. Builds capacity for repeated sprints in the 80th–90th minute.' },
                { name: 'Small-Sided Game Simulation', sets: 1, reps: '3 × 8 min', load: 'Max effort', cue: 'Competitive intensity. Decision-making under fatigue.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Saturday',
              label: 'Recovery + Activation',
              pliability: 'daily_maintenance',
              warmup: null,
              exercises: [
                { name: 'Foam Roll + Stretch', sets: 1, reps: '15 min', load: 'Bodyweight', cue: 'Full body. Prepare for the week ahead.' },
                { name: 'Activation Band Circuit', sets: 2, reps: '15 each', load: 'Band', cue: 'Glute bridge, clamshell, band walk. Prime the hips.' },
              ],
              cooldown: null,
            },
          ],
        },
      ],
      mindsetNotes: [
        'Pre-season is not the time to get fit — it is the time to sharpen what you built. Trust the off-season work.',
        'TB12: "Pliability is your competitive advantage." Every opponent is strong. Not every opponent is pliable.',
        'Kelsey Poulter: "Sharpen the knife, do not break it." Reduce volume in pre-season. Intensity is the key variable now.',
      ],
    },
    in_season: {
      id: 'soccer-inseason',
      title: 'Soccer In-Season Maintenance',
      sport: 'soccer',
      phase: 'in-season',
      duration: 16,
      sessionsPerWeek: 2,
      level: 'intermediate',
      focus: 'Strength Maintenance + Injury Prevention',
      description: 'Maintain strength and power during the competitive season. Minimize fatigue while preserving the physical qualities built in the off-season.',
      blocks: [
        {
          name: 'In-Season Maintenance Block',
          goal: 'Maintain strength, prevent injury, and manage fatigue',
          rpeTarget: '6–7',
          days: [
            {
              day: 'Tuesday',
              label: 'In-Season Strength (Post-Match)',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Back Squat', sets: 2, reps: '4', load: '75–80%', cue: 'Minimum effective dose. Maintain strength without adding fatigue. NSCA: 2 sessions/week maintains off-season strength gains.' },
                { name: 'Nordic Hamstring Curl', sets: 2, reps: '5', load: 'Bodyweight', cue: 'Non-negotiable in-season. Hamstring injury prevention is a season-long commitment.' },
                { name: 'Single-Leg RDL', sets: 2, reps: '8 each', load: 'Light-Moderate', cue: 'Unilateral stability. Maintain balance and proprioception.' },
                { name: 'Band Pull-Apart', sets: 2, reps: '20', load: 'Band', cue: 'Shoulder health. 2 minutes of work that prevents weeks of missed training.' },
                { name: 'Copenhagen Plank', sets: 2, reps: '20 sec each', load: 'Bodyweight', cue: 'Adductor maintenance. Groin protection.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Thursday',
              label: 'Speed Maintenance + Activation',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: '10-Yard Sprint', sets: 4, reps: '1', load: 'Max effort', cue: 'Maintain first-step quickness. Full rest. Quality over volume.' },
                { name: 'Lateral Shuffle Drill', sets: 3, reps: '15m each way', load: 'Bodyweight', cue: 'Defensive positioning. Maintain lateral quickness.' },
                { name: 'Glute Bridge', sets: 2, reps: '15', load: 'Bodyweight/Band', cue: 'Glute activation before match day. Prime the posterior chain.' },
              ],
              cooldown: 'post_workout',
            },
          ],
        },
      ],
      mindsetNotes: [
        'In-season training is about maintenance, not gains. Protect what you built. Two sessions per week is all you need (NSCA evidence-based).',
        'TB12: "The best ability is availability." Staying on the field is the most important performance metric during the season.',
        'Kelsey Poulter: "Refuel within 30 minutes post-match." Glycogen replenishment starts immediately. Do not skip the post-match meal.',
      ],
    },
  },


  // ── BASEBALL ────────────────────────────────────────────────
  baseball: {
    off_season: {
      id: 'baseball-offseason-12w',
      title: 'Baseball Off-Season Athletic Development — 12 Weeks',
      sport: 'baseball',
      phase: 'off-season',
      duration: 12,
      sessionsPerWeek: 4,
      level: 'intermediate',
      focus: 'Rotational Power + Arm Care + Posterior Chain',
      description: 'Build elite baseball athleticism: rotational power for hitting and throwing, posterior chain strength, shoulder health, and pliability. The off-season is where baseball players are made.',
      blocks: [
        {
          name: 'Block 1 — Accumulation (Weeks 1–4)',
          goal: 'Movement quality, arm care base, rotational strength foundation, and pliability',
          rpeTarget: '6–7',
          days: [
            {
              day: 'Monday',
              label: 'Lower Body Strength + Rotational Foundation',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Trap Bar Deadlift', sets: 4, reps: '8', load: 'Moderate (65–70%)', cue: 'Hip hinge pattern. Drive floor away. Builds posterior chain power that transfers directly to hitting and throwing velocity.' },
                { name: 'Goblet Squat', sets: 4, reps: '10', load: 'Moderate', cue: 'Chest tall. Full depth. Quad and glute strength for explosive first step and base running.' },
                { name: 'Bulgarian Split Squat', sets: 3, reps: '8 each', load: 'Moderate', cue: 'Unilateral stability. Mimics the stride leg in hitting and pitching mechanics.' },
                { name: 'Hip Thrust', sets: 3, reps: '15', load: 'Moderate', cue: 'Full hip extension. Glute power is the engine of rotational force.' },
                { name: 'Band Monster Walk', sets: 3, reps: '15 each way', load: 'Band', cue: 'Hip abductor activation. Knee stability for lateral movements.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Tuesday',
              label: 'Arm Care + Shoulder Health (TB12 Band Protocol)',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Band Pull-Apart', sets: 4, reps: '20', load: 'Band', cue: 'Scapular retraction. Elbows straight. The single most important exercise for pitcher and thrower shoulder health.' },
                { name: 'Band Face Pull', sets: 4, reps: '15', load: 'Band', cue: 'Pull to forehead. External rotate at end. Elbows high. Strengthens the posterior rotator cuff.' },
                { name: 'Band External Rotation (90/90)', sets: 3, reps: '15 each', load: 'Band', cue: 'Elbow at 90°, shoulder at 90°. Slow and controlled. Rotator cuff integrity.' },
                { name: 'Band Internal Rotation', sets: 3, reps: '15 each', load: 'Band', cue: 'Controlled. Balance with external rotation work. Maintain strength ratio.' },
                { name: 'Prone Y-T-W', sets: 3, reps: '10 each', load: 'Bodyweight/Light DB', cue: 'Lower trap and scapular stabilizer activation. Critical for overhead athletes.' },
                { name: 'Wrist Flexion/Extension (Light DB)', sets: 3, reps: '15 each', load: 'Light', cue: 'Forearm and wrist strength. Grip strength correlates with bat speed and throwing velocity.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Thursday',
              label: 'Rotational Power + Core',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Med Ball Rotational Throw (Wall)', sets: 4, reps: '10 each side', load: 'Med Ball (6–10 lb)', cue: 'Rotate from hips, not shoulders. Explosive release. Builds rotational power for hitting and throwing.' },
                { name: 'Med Ball Slam', sets: 3, reps: '10', load: 'Med Ball', cue: 'Full extension overhead. Slam with intent. Total body power expression.' },
                { name: 'Cable/Band Chop (High to Low)', sets: 3, reps: '12 each side', load: 'Band/Cable', cue: 'Rotate from thoracic spine. Hips stay square. Diagonal power pattern = hitting pattern.' },
                { name: 'Cable/Band Lift (Low to High)', sets: 3, reps: '12 each side', load: 'Band/Cable', cue: 'Drive from hips. Reach overhead. Reverse chop. Throwing deceleration pattern.' },
                { name: 'Pallof Press', sets: 3, reps: '12 each side', load: 'Band/Cable', cue: 'Anti-rotation core. Resist the band. The core must resist rotation before it can create it.' },
                { name: 'Dead Bug', sets: 3, reps: '10 each side', load: 'Bodyweight', cue: 'Lower back pressed to floor. Contralateral limb. Core stability for power transfer.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Saturday',
              label: 'Speed + Athleticism',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Box Jump', sets: 4, reps: '5', load: 'Bodyweight', cue: 'Land softly. Step down. Vertical power for explosive first step.' },
                { name: '10-Yard Sprint', sets: 6, reps: '1', load: 'Max effort', cue: 'Drive phase. Low angle. Baseball speed is about 0–10 yards, not top-end speed.' },
                { name: 'Lateral Bound', sets: 3, reps: '6 each side', load: 'Bodyweight', cue: 'Stick the landing. Lateral power for fielding range.' },
                { name: 'Broad Jump', sets: 4, reps: '5', load: 'Bodyweight', cue: 'Arm swing. Stick landing. Horizontal power.' },
                { name: 'Farmer Carry', sets: 3, reps: '30m', load: 'Heavy', cue: 'Tall posture. Shoulder blades down and back. Grip and core strength.' },
              ],
              cooldown: 'post_workout',
            },
          ],
        },
        {
          name: 'Block 2 — Transmutation (Weeks 5–8)',
          goal: 'Convert strength into baseball-specific rotational power, throwing velocity, and bat speed',
          rpeTarget: '7–8',
          days: [
            {
              day: 'Monday',
              label: 'Power Lower Body + Hip Drive',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Power Clean (from hang)', sets: 4, reps: '4', load: '60–65%', cue: 'Triple extension: ankle, knee, hip. Fast elbows. Hip drive is the engine of throwing and hitting velocity.' },
                { name: 'Back Squat', sets: 4, reps: '5', load: '75–80%', cue: 'Explosive concentric. Brace 360°. Heavy lower body strength transfers to rotational power.' },
                { name: 'Depth Jump', sets: 3, reps: '5', load: 'Bodyweight', cue: 'Reactive strength. Minimal ground contact. Explosive hip extension.' },
                { name: 'Single-Leg RDL (Loaded)', sets: 3, reps: '8 each', load: 'Moderate', cue: 'Stride leg stability. Mimics the landing leg in pitching and hitting.' },
                { name: 'Hip Thrust (Heavy)', sets: 3, reps: '8', load: 'Heavy', cue: 'Max glute power. Hip extension force = bat speed and throwing velocity.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Wednesday',
              label: 'Rotational Power + Arm Care',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Med Ball Rotational Throw (Explosive)', sets: 5, reps: '8 each side', load: 'Med Ball (8–12 lb)', cue: 'Max intent. Rotate through the ball. This is the most sport-specific power exercise for hitters.' },
                { name: 'Med Ball Scoop Toss', sets: 4, reps: '8 each side', load: 'Med Ball', cue: 'Load hips, scoop upward. Mimics the hip-to-shoulder sequence in hitting.' },
                { name: 'Band Pull-Apart', sets: 4, reps: '20', load: 'Band', cue: 'Shoulder health. Every session. Throwers must earn the right to throw hard.' },
                { name: 'Band Face Pull', sets: 3, reps: '15', load: 'Band', cue: 'Posterior rotator cuff. Counterbalances the internal rotation demands of throwing.' },
                { name: 'Cable Chop (Heavy)', sets: 4, reps: '10 each side', load: 'Heavy Cable', cue: 'Resist and then drive. Diagonal power pattern. Core-to-extremity force transfer.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Friday',
              label: 'Upper Body Strength + Grip',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Bench Press', sets: 4, reps: '5', load: '78–82%', cue: 'Full range. Explosive press. Upper body strength for throwing deceleration and contact.' },
                { name: 'Bent-Over Row', sets: 4, reps: '6', load: 'Heavy', cue: 'Hinge 45°. Drive elbows back. Posterior chain and scapular strength.' },
                { name: 'Chin-Up', sets: 3, reps: 'Max quality', load: 'Bodyweight', cue: 'Full hang to chin over bar. Lat strength for throwing deceleration.' },
                { name: 'Farmer Carry (Heavy)', sets: 4, reps: '30m', load: 'Heavy', cue: 'Grip strength correlates directly with bat speed and throwing velocity (Cronin & Owen, 2004).' },
                { name: 'Wrist Roller', sets: 3, reps: '3 up and down', load: 'Light-Moderate', cue: 'Forearm endurance. Grip and wrist strength for bat control.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Sunday',
              label: 'Recovery + Pliability',
              pliability: 'daily_maintenance',
              warmup: null,
              exercises: [
                { name: 'Full Body Foam Roll', sets: 1, reps: '15 min', load: 'Bodyweight', cue: 'TB12: muscles must be restored. Focus on thoracic spine, lats, hip flexors, and forearms.' },
                { name: 'Thoracic Rotation Mobility', sets: 1, reps: '10 each side', load: 'Bodyweight', cue: 'Seated or kneeling. Rotate from mid-back. Thoracic mobility is critical for throwing mechanics.' },
                { name: 'Sleeper Stretch', sets: 2, reps: '30 sec each side', load: 'Bodyweight', cue: 'Posterior shoulder capsule stretch. Evidence-based for thrower shoulder health (Burkhart et al., 2003).' },
                { name: 'Hip Flexor Stretch', sets: 2, reps: '45 sec each', load: 'Bodyweight', cue: 'Kneeling. Posterior pelvic tilt. Hip flexor length affects stride length and hip rotation.' },
              ],
              cooldown: null,
            },
          ],
        },
        {
          name: 'Block 3 — Realization (Weeks 9–12)',
          goal: 'Peak power output, throwing velocity, bat speed, and field readiness',
          rpeTarget: '8–9',
          days: [
            {
              day: 'Monday',
              label: 'Max Strength + Explosive Power',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Trap Bar Deadlift (Heavy)', sets: 4, reps: '3', load: '85–90%', cue: 'Max strength expression. Perfect technique. Posterior chain peak.' },
                { name: 'Power Clean', sets: 4, reps: '3', load: '72–78%', cue: 'Max velocity. Explosive hip drive. Peak power output.' },
                { name: 'Box Jump (Max Height)', sets: 4, reps: '4', load: 'Bodyweight', cue: 'Max effort. Reactive. Peak vertical power.' },
                { name: 'Hip Thrust (Max)', sets: 3, reps: '5', load: 'Heavy', cue: 'Peak glute power. Hip extension force at its highest.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Wednesday',
              label: 'Rotational Power Peak + Arm Care',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Med Ball Rotational Throw (Max Intent)', sets: 5, reps: '6 each side', load: 'Med Ball (10–14 lb)', cue: 'Maximum rotational intent. This is the peak expression of hitting and throwing power.' },
                { name: 'Med Ball Overhead Slam', sets: 4, reps: '8', load: 'Med Ball', cue: 'Full extension. Max force. Total body power.' },
                { name: 'Band Pull-Apart', sets: 4, reps: '20', load: 'Band', cue: 'Non-negotiable. Shoulder health is the most important asset in baseball.' },
                { name: 'Band External Rotation', sets: 3, reps: '15 each', load: 'Band', cue: 'Maintain rotator cuff health entering the season.' },
                { name: 'Sleeper Stretch', sets: 2, reps: '30 sec each', load: 'Bodyweight', cue: 'Posterior capsule maintenance. Throwing shoulder care.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Friday',
              label: 'Speed + Fielding Athleticism',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: '10-Yard Sprint', sets: 6, reps: '1', load: 'Max effort', cue: 'First-step quickness. Drive phase. Baseball speed is 0–10 yards.' },
                { name: 'Lateral Shuffle to Sprint', sets: 4, reps: '1', load: 'Max effort', cue: 'Shuffle 5m, plant, sprint 10m. Fielding range simulation.' },
                { name: 'Drop Step Drill', sets: 4, reps: '5 each side', load: 'Bodyweight', cue: 'Outfield drop step. Hip turn and go. Reaction and acceleration.' },
                { name: 'Broad Jump', sets: 4, reps: '5', load: 'Bodyweight', cue: 'Horizontal power. Base running acceleration.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Saturday',
              label: 'Recovery + Arm Care',
              pliability: 'daily_maintenance',
              warmup: null,
              exercises: [
                { name: 'Foam Roll — Full Body', sets: 1, reps: '12 min', load: 'Bodyweight', cue: 'Focus on thoracic spine, lats, forearms, and hip flexors.' },
                { name: 'Band Arm Care Circuit', sets: 2, reps: '15 each', load: 'Band', cue: 'Pull-apart, face pull, external rotation, internal rotation. Full shoulder maintenance circuit.' },
                { name: 'Sleeper Stretch + Cross-Body Stretch', sets: 2, reps: '30 sec each', load: 'Bodyweight', cue: 'Posterior shoulder capsule. Maintain range of motion entering the season.' },
              ],
              cooldown: null,
            },
          ],
        },
      ],
      mindsetNotes: [
        'TB12 Principle: "Pliability is your competitive advantage." Thoracic spine and hip flexor pliability directly determines throwing mechanics and bat speed. Foam roll your lats and thoracic spine every single day.',
        'Kelsey Poulter: "You cannot throw hard on an empty tank." Pre-workout carbohydrates and post-workout protein are the two most important nutritional habits for a baseball player.',
        'NSCA: Rotational power is trainable. Med ball throws, cable chops, and hip thrusts are the evidence-based exercises that increase bat speed and throwing velocity.',
        'TB12: "The best ability is availability." Arm care is not optional. Band pull-aparts and face pulls take 4 minutes. Missing them takes 4 weeks.',
        'Kelsey Poulter: "Sleep is the most powerful recovery tool you have." 8–9 hours of sleep increases reaction time, decision-making, and sprint speed — all critical in baseball.',
        'NSCA: Grip strength correlates with bat speed and throwing velocity. Farmer carries and wrist work are not accessories — they are performance drivers.',
      ],
    },
    pre_season: {
      id: 'baseball-preseason-4w',
      title: 'Baseball Pre-Season Sharpening — 4 Weeks',
      sport: 'baseball',
      phase: 'pre-season',
      duration: 4,
      sessionsPerWeek: 4,
      level: 'intermediate',
      focus: 'Rotational Power Peak + Arm Readiness',
      description: 'Sharpen your physical tools for opening day. Reduce volume, increase sport-specificity, and protect the arm.',
      blocks: [
        {
          name: 'Block 1 — Pre-Season Sharpening (Weeks 1–4)',
          goal: 'Peak rotational power, arm readiness, and field athleticism',
          rpeTarget: '7–9',
          days: [
            {
              day: 'Monday',
              label: 'Strength Maintenance + Power',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Trap Bar Deadlift', sets: 3, reps: '3', load: '80–85%', cue: 'Maintain posterior chain strength. Reduce volume. Quality over quantity.' },
                { name: 'Power Clean', sets: 3, reps: '3', load: '70%', cue: 'Explosive. Maintain power output entering the season.' },
                { name: 'Band Pull-Apart', sets: 4, reps: '20', load: 'Band', cue: 'Shoulder health. Every session. Non-negotiable.' },
                { name: 'Band External Rotation', sets: 3, reps: '15 each', load: 'Band', cue: 'Rotator cuff maintenance. Prepare for throwing volume.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Wednesday',
              label: 'Rotational Power + Speed',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Med Ball Rotational Throw (Max Intent)', sets: 4, reps: '8 each side', load: 'Med Ball', cue: 'Max rotational intent. Peak bat speed and throwing power expression.' },
                { name: '10-Yard Sprint', sets: 6, reps: '1', load: 'Max effort', cue: 'First-step quickness. Drive phase. Full rest.' },
                { name: 'Lateral Shuffle to Sprint', sets: 4, reps: '1', load: 'Max effort', cue: 'Fielding range simulation. React and drive.' },
                { name: 'Drop Step Drill', sets: 4, reps: '5 each side', load: 'Bodyweight', cue: 'Outfield read and react. Hip turn and go.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Friday',
              label: 'Arm Care + Activation',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Band Arm Care Circuit', sets: 3, reps: '15 each', load: 'Band', cue: 'Pull-apart, face pull, external rotation, internal rotation, Y-T-W. Full shoulder prep before throwing.' },
                { name: 'Wrist Flexion/Extension', sets: 3, reps: '15 each', load: 'Light DB', cue: 'Forearm and grip maintenance. Bat control and throwing endurance.' },
                { name: 'Pallof Press', sets: 3, reps: '12 each', load: 'Band', cue: 'Core stability. Anti-rotation. Power transfer foundation.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Saturday',
              label: 'Recovery + Arm Care',
              pliability: 'daily_maintenance',
              warmup: null,
              exercises: [
                { name: 'Foam Roll — Thoracic + Lats + Forearms', sets: 1, reps: '12 min', load: 'Bodyweight', cue: 'Prepare the arm for increased throwing volume. Thoracic mobility is critical.' },
                { name: 'Sleeper Stretch', sets: 2, reps: '30 sec each', load: 'Bodyweight', cue: 'Posterior capsule. Maintain range of motion.' },
                { name: 'Hip Flexor Stretch', sets: 2, reps: '45 sec each', load: 'Bodyweight', cue: 'Stride length and hip rotation. Pitching and hitting mechanics.' },
              ],
              cooldown: null,
            },
          ],
        },
      ],
      mindsetNotes: [
        'Pre-season is about sharpening, not building. Trust the work you did in the off-season.',
        'TB12: Arm care is not a warm-up — it is training. Treat band work with the same focus as your heaviest lift.',
        'Kelsey Poulter: "Fuel the performance you want, not the one you had." Eat for the intensity of pre-season, not the rest day before it.',
      ],
    },
    in_season: {
      id: 'baseball-inseason',
      title: 'Baseball In-Season Maintenance',
      sport: 'baseball',
      phase: 'in-season',
      duration: 20,
      sessionsPerWeek: 2,
      level: 'intermediate',
      focus: 'Arm Care + Strength Maintenance',
      description: 'Maintain physical qualities and protect the arm through the competitive season. Minimum effective dose — maximum carry-over.',
      blocks: [
        {
          name: 'In-Season Maintenance Block',
          goal: 'Maintain strength, protect the arm, and manage fatigue',
          rpeTarget: '6–7',
          days: [
            {
              day: 'Tuesday',
              label: 'In-Season Strength (Non-Throwing Day)',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Trap Bar Deadlift', sets: 2, reps: '4', load: '75%', cue: 'Minimum effective dose. Maintain posterior chain strength. NSCA: 2 sessions/week maintains off-season gains.' },
                { name: 'Band Pull-Apart', sets: 3, reps: '20', load: 'Band', cue: 'Non-negotiable every session. Arm health is the most important in-season priority.' },
                { name: 'Band External Rotation', sets: 3, reps: '15 each', load: 'Band', cue: 'Rotator cuff maintenance. Counterbalances throwing stress.' },
                { name: 'Med Ball Rotational Throw', sets: 3, reps: '6 each side', load: 'Med Ball', cue: 'Maintain rotational power. Light volume, full intent.' },
                { name: 'Pallof Press', sets: 2, reps: '12 each', load: 'Band', cue: 'Core stability maintenance. Power transfer foundation.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Thursday',
              label: 'Arm Care + Activation',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Band Arm Care Circuit', sets: 3, reps: '15 each', load: 'Band', cue: 'Full shoulder circuit. Pull-apart, face pull, external rotation, Y-T-W. Protect the arm.' },
                { name: 'Sleeper Stretch', sets: 2, reps: '30 sec each', load: 'Bodyweight', cue: 'Posterior capsule. Maintain range of motion through the season.' },
                { name: '10-Yard Sprint', sets: 4, reps: '1', load: 'Max effort', cue: 'Maintain first-step quickness. Full rest. Quality over volume.' },
                { name: 'Glute Bridge', sets: 2, reps: '15', load: 'Bodyweight', cue: 'Glute activation. Maintain hip power for throwing and hitting.' },
              ],
              cooldown: 'post_workout',
            },
          ],
        },
      ],
      mindsetNotes: [
        'In-season is about maintenance and protection. Two sessions per week is evidence-based and sufficient (NSCA).',
        'TB12: "The best ability is availability." Arm care every single day — even on rest days. 4 minutes of band work prevents 4 weeks on the injured list.',
        'Kelsey Poulter: "Refuel within 30 minutes post-game." Glycogen replenishment and protein synthesis begin immediately. Do not skip the post-game meal.',
      ],
    },
  },


  // ── VOLLEYBALL ──────────────────────────────────────────────
  volleyball: {
    off_season: {
      id: 'vball-offseason-12w',
      title: 'Volleyball Off-Season Athletic Development — 12 Weeks',
      sport: 'volleyball',
      phase: 'off-season',
      duration: 12,
      sessionsPerWeek: 4,
      level: 'intermediate',
      focus: 'Vertical Power + Shoulder Health + Pliability',
      description: 'Build the athletic foundation for a dominant season. Volleyball demands elite vertical jump, shoulder durability, core stability, and repeated explosive efforts. This program addresses all four.',
      blocks: [
        {
          name: 'Block 1 — Accumulation (Weeks 1–4)',
          goal: 'Movement quality, shoulder health base, posterior chain strength, and pliability',
          rpeTarget: '6–7',
          days: [
            {
              day: 'Monday',
              label: 'Lower Body Strength + Vertical Foundation',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Goblet Squat', sets: 4, reps: '10', load: 'Moderate', cue: 'Full depth. Chest tall. Builds quad and glute strength — the engine of vertical jump.' },
                { name: 'Romanian Deadlift', sets: 4, reps: '10', load: 'Moderate', cue: 'Hinge at hips. Hamstring tension throughout. Posterior chain foundation for jumping.' },
                { name: 'Bulgarian Split Squat', sets: 3, reps: '8 each', load: 'Moderate', cue: 'Unilateral strength and stability. Volleyball requires single-leg landings and cuts.' },
                { name: 'Glute Bridge (Barbell)', sets: 3, reps: '15', load: 'Moderate', cue: 'Full hip extension. Glute power transfers directly to vertical jump height.' },
                { name: 'Calf Raise (Single Leg)', sets: 3, reps: '15 each', load: 'Bodyweight/Weighted', cue: 'Full range. Ankle strength and stiffness for explosive push-off.' },
                { name: 'Band Clamshell', sets: 3, reps: '20 each', load: 'Band', cue: 'Hip abductor activation. Prevents knee valgus on landing — critical for volleyball.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Tuesday',
              label: 'Shoulder Health + Upper Body (TB12 Arm Care)',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Band Pull-Apart', sets: 4, reps: '20', load: 'Band', cue: 'Scapular retraction. Elbows straight. The most important exercise for overhead athletes. Do these every session.' },
                { name: 'Band Face Pull', sets: 4, reps: '15', load: 'Band', cue: 'Pull to forehead. External rotate at end. Elbows high. Posterior rotator cuff health for spiking and serving.' },
                { name: 'Band External Rotation (90/90)', sets: 3, reps: '15 each', load: 'Band', cue: 'Elbow at 90°, shoulder at 90°. Slow and controlled. Rotator cuff integrity for overhead loading.' },
                { name: 'Prone Y-T-W', sets: 3, reps: '10 each', load: 'Bodyweight/Light DB', cue: 'Lower trap and scapular stabilizer activation. Critical for overhead athletes (Cools et al., 2007).' },
                { name: 'Push-Up (Tempo 3-1-1)', sets: 4, reps: '12', load: 'Bodyweight', cue: '3-sec down, 1-sec pause, explosive up. Full range of motion.' },
                { name: 'Dumbbell Row', sets: 4, reps: '12 each', load: 'Moderate', cue: 'Drive elbow back. Squeeze lat. Postural strength for 5-set matches.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Thursday',
              label: 'Plyometrics + Vertical Jump Development',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Box Jump', sets: 4, reps: '6', load: 'Bodyweight', cue: 'Land softly — absorb through hips and knees. Step down. Vertical power is the #1 physical attribute in volleyball.' },
                { name: 'Broad Jump', sets: 4, reps: '5', load: 'Bodyweight', cue: 'Arm swing. Stick landing. Horizontal power.' },
                { name: 'Approach Jump (3-step)', sets: 5, reps: '5', load: 'Bodyweight', cue: 'Left-right-left (right-handed) or right-left-right. Penultimate step is the key. Arm swing drives height.' },
                { name: 'Ankle Hops', sets: 3, reps: '15', load: 'Bodyweight', cue: 'Stiff ankle. Minimal ground contact time. Builds reactive stiffness for quick jumps.' },
                { name: 'Lateral Bound', sets: 3, reps: '6 each side', load: 'Bodyweight', cue: 'Stick the landing. Lateral power for defensive range.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Saturday',
              label: 'Core + Rotational Power',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Med Ball Overhead Slam', sets: 4, reps: '10', load: 'Med Ball (8–10 lb)', cue: 'Full extension overhead. Slam with intent. Mimics the spiking motion — full body power expression.' },
                { name: 'Med Ball Rotational Throw (Wall)', sets: 3, reps: '10 each side', load: 'Med Ball', cue: 'Rotate from hips. Explosive release. Builds rotational power for spiking.' },
                { name: 'Pallof Press', sets: 3, reps: '12 each side', load: 'Band/Cable', cue: 'Anti-rotation core. Resist the band. Core stability for powerful, controlled spikes.' },
                { name: 'Dead Bug', sets: 3, reps: '10 each side', load: 'Bodyweight', cue: 'Lower back pressed to floor. Contralateral limb. Core stability foundation.' },
                { name: 'Plank (Hollow Body)', sets: 3, reps: '40 sec', load: 'Bodyweight', cue: 'Posterior pelvic tilt. Ribs down. True hollow body position.' },
              ],
              cooldown: 'post_workout',
            },
          ],
        },
        {
          name: 'Block 2 — Transmutation (Weeks 5–8)',
          goal: 'Convert strength base into volleyball-specific vertical power, shoulder durability, and court speed',
          rpeTarget: '7–8',
          days: [
            {
              day: 'Monday',
              label: 'Power Lower Body + Vertical Peak',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Back Squat', sets: 4, reps: '5', load: '75–80%', cue: 'Explosive concentric. Brace 360°. Heavy squat strength is the foundation of vertical jump.' },
                { name: 'Hang Power Clean', sets: 4, reps: '4', load: '60–65%', cue: 'Triple extension: ankle, knee, hip. Fast elbows. Explosive hip drive = vertical jump power.' },
                { name: 'Depth Jump', sets: 4, reps: '5', load: 'Bodyweight', cue: 'Step off box. Minimal ground contact. Reactive strength for quick second jumps.' },
                { name: 'Approach Jump (Loaded — Vest)', sets: 4, reps: '5', load: 'Light Vest (5–10 lb)', cue: 'Full 3-step approach. Weighted to build strength in the jump pattern.' },
                { name: 'Nordic Hamstring Curl', sets: 3, reps: '5', load: 'Bodyweight', cue: 'Eccentric hamstring. Injury prevention for repeated jumping.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Wednesday',
              label: 'Shoulder Strength + Upper Body Power',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Overhead Press', sets: 4, reps: '6', load: 'Moderate-Heavy', cue: 'Brace core. Press straight up. Overhead strength for spiking power and serve velocity.' },
                { name: 'Lat Pull-Down', sets: 4, reps: '8', load: 'Moderate-Heavy', cue: 'Full range. Squeeze lats at bottom. Shoulder stability for overhead loading.' },
                { name: 'Band Pull-Apart', sets: 4, reps: '20', load: 'Band', cue: 'Shoulder health. Every session. Non-negotiable for overhead athletes.' },
                { name: 'Band Face Pull', sets: 3, reps: '15', load: 'Band', cue: 'Posterior rotator cuff. Counterbalances the internal rotation demands of spiking.' },
                { name: 'Med Ball Overhead Slam (Explosive)', sets: 4, reps: '8', load: 'Med Ball (10–12 lb)', cue: 'Max intent. Full extension. Peak spiking power expression.' },
                { name: 'Chin-Up', sets: 3, reps: 'Max quality', load: 'Bodyweight', cue: 'Full hang to chin over bar. Lat and bicep strength for spike deceleration.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Friday',
              label: 'Court Speed + Reactive Agility',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Reactive Box Jump', sets: 4, reps: '5', load: 'Bodyweight', cue: 'React to signal, jump immediately. Simulates reading the setter and attacking.' },
                { name: '5-Yard Shuffle Sprint', sets: 6, reps: '1', load: 'Max effort', cue: 'Defensive range. Quick lateral steps to sprint. Volleyball defense is all about first-step reaction.' },
                { name: 'Approach Jump (Max Effort)', sets: 5, reps: '5', load: 'Bodyweight', cue: 'Max height. Compete against yourself every rep. Track your best.' },
                { name: 'Lateral Bound (Continuous)', sets: 3, reps: '10 each side', load: 'Bodyweight', cue: 'Continuous side-to-side. Stick briefly. Lateral power for defensive range.' },
                { name: 'Jump Rope (Double Under attempts)', sets: 3, reps: '45 sec', load: 'Bodyweight', cue: 'Ankle stiffness. Coordination. Footwork speed.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Sunday',
              label: 'Recovery + Pliability Day',
              pliability: 'daily_maintenance',
              warmup: null,
              exercises: [
                { name: 'Full Body Foam Roll', sets: 1, reps: '15 min', load: 'Bodyweight', cue: 'TB12 recovery principle. Focus on quads, calves, thoracic spine, and lats.' },
                { name: 'Yoga / Mobility Flow', sets: 1, reps: '20 min', load: 'Bodyweight', cue: 'Hip flexors, thoracic rotation, ankle mobility, shoulder range of motion.' },
                { name: 'Band Shoulder Care Circuit', sets: 2, reps: '15 each', load: 'Band', cue: 'Pull-apart, face pull, external rotation. Shoulder maintenance on rest days.' },
              ],
              cooldown: null,
            },
          ],
        },
        {
          name: 'Block 3 — Realization (Weeks 9–12)',
          goal: 'Peak vertical jump, spiking power, and match readiness',
          rpeTarget: '8–9',
          days: [
            {
              day: 'Monday',
              label: 'Max Strength + Vertical Peak',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Back Squat (Heavy)', sets: 4, reps: '3', load: '85–90%', cue: 'Max strength expression. Perfect technique. Spot required.' },
                { name: 'Power Clean', sets: 4, reps: '3', load: '72–78%', cue: 'Max velocity. Explosive hip drive. Peak power output.' },
                { name: 'Approach Jump (Max Height)', sets: 5, reps: '5', load: 'Bodyweight', cue: 'Max effort every rep. Track your peak. This is your vertical jump test.' },
                { name: 'Depth Jump to Approach', sets: 4, reps: '4', load: 'Bodyweight', cue: 'Step off box, land, immediately transition to approach jump. Reactive to approach.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Wednesday',
              label: 'Spiking Power + Shoulder Peak',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Overhead Press (Heavy)', sets: 4, reps: '4', load: '80–85%', cue: 'Peak overhead strength. Spiking power foundation.' },
                { name: 'Med Ball Overhead Slam (Max Intent)', sets: 5, reps: '8', load: 'Med Ball (12–14 lb)', cue: 'Maximum intent. Full extension. Peak spiking power expression.' },
                { name: 'Band Pull-Apart', sets: 4, reps: '20', load: 'Band', cue: 'Shoulder health maintained at peak training load.' },
                { name: 'Band Face Pull', sets: 3, reps: '15', load: 'Band', cue: 'Posterior rotator cuff. Protect the shoulder at peak intensity.' },
                { name: 'Lat Pull-Down (Heavy)', sets: 3, reps: '6', load: 'Heavy', cue: 'Peak lat strength for spike deceleration and shoulder stability.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Friday',
              label: 'Match Simulation + Conditioning',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Approach Jump Series (Continuous)', sets: 4, reps: '8 jumps', load: 'Bodyweight', cue: 'Continuous approach jumps with 15-sec rest between sets. Simulates match jump volume.' },
                { name: 'Reactive Agility Drill', sets: 6, reps: '1', load: 'Max effort', cue: 'React to signal. First-step quickness. Defensive read and react.' },
                { name: '5-Set Conditioning (Interval)', sets: 5, reps: '90 sec on / 30 sec off', load: 'RPE 8–9', cue: 'Simulates 5-set match intensity. Repeated explosive efforts with brief recovery.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Saturday',
              label: 'Recovery + Pre-Season Activation',
              pliability: 'daily_maintenance',
              warmup: null,
              exercises: [
                { name: 'Foam Roll — Quads + Calves + Thoracic', sets: 1, reps: '10 min', load: 'Bodyweight', cue: 'Light pressure. Flush metabolic waste. Prepare for the season.' },
                { name: 'Band Shoulder Circuit', sets: 2, reps: '15 each', load: 'Band', cue: 'Pull-apart, face pull, external rotation. Prime the shoulder for increased volume.' },
                { name: 'Approach Jump (Light)', sets: 2, reps: '5', load: 'Bodyweight', cue: 'Movement rehearsal. Feel the pattern. No max effort.' },
              ],
              cooldown: null,
            },
          ],
        },
      ],
      mindsetNotes: [
        'TB12 Principle: "Pliability is the missing leg of performance training." Shoulder and hip flexor pliability directly determines your spike mechanics and jump height. Foam roll your lats and thoracic spine daily.',
        'Kelsey Poulter: "Fueling is a skill." Pre-practice carbohydrates and post-practice protein are non-negotiable for a sport that demands repeated explosive efforts across 5 sets.',
        'NSCA: Vertical jump is highly trainable. Depth jumps, approach jumps, and heavy squats combined produce the greatest gains (Markovic, 2007).',
        'TB12: "I can always be better." Track your approach jump height every week. Small improvements compound into a dominant season.',
        'Kelsey Poulter: "Recovery is where adaptation happens." Sleep 8–9 hours. Hydrate. Eat within 30 minutes post-practice. These are not optional.',
        'NSCA: Shoulder health is the most important injury prevention priority for volleyball players. Band pull-aparts and face pulls every session — no exceptions.',
      ],
    },
    pre_season: {
      id: 'vball-preseason-4w',
      title: 'Volleyball Pre-Season Sharpening — 4 Weeks',
      sport: 'volleyball',
      phase: 'pre-season',
      duration: 4,
      sessionsPerWeek: 4,
      level: 'intermediate',
      focus: 'Vertical Peak + Shoulder Readiness',
      description: 'Convert your off-season fitness into match-ready sharpness. Peak vertical jump, protect the shoulder, and build match conditioning.',
      blocks: [
        {
          name: 'Block 1 — Pre-Season Sharpening (Weeks 1–4)',
          goal: 'Peak vertical jump, shoulder readiness, and match conditioning',
          rpeTarget: '7–9',
          days: [
            {
              day: 'Monday',
              label: 'Strength Maintenance + Vertical Power',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Back Squat', sets: 3, reps: '4', load: '80–85%', cue: 'Maintain strength. Reduce volume. Trust the off-season base.' },
                { name: 'Power Clean', sets: 3, reps: '3', load: '70%', cue: 'Explosive. Maintain power output.' },
                { name: 'Approach Jump (Max Effort)', sets: 4, reps: '6', load: 'Bodyweight', cue: 'Max height every rep. This is your peak vertical expression.' },
                { name: 'Band Pull-Apart', sets: 4, reps: '20', load: 'Band', cue: 'Shoulder health. Every session. Non-negotiable.' },
                { name: 'Nordic Hamstring Curl', sets: 2, reps: '5', load: 'Bodyweight', cue: 'Hamstring protection entering the season.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Wednesday',
              label: 'Shoulder Power + Court Speed',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Med Ball Overhead Slam (Max)', sets: 4, reps: '8', load: 'Med Ball (12 lb)', cue: 'Max spiking power. Full extension. Peak expression.' },
                { name: 'Band Face Pull', sets: 3, reps: '15', load: 'Band', cue: 'Posterior rotator cuff. Prepare for increased spiking volume.' },
                { name: '5-Yard Shuffle Sprint', sets: 5, reps: '1', load: 'Max effort', cue: 'Defensive range. Lateral quickness. Full rest.' },
                { name: 'Reactive Agility Drill', sets: 5, reps: '1', load: 'Max effort', cue: 'React to signal. First-step quickness.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Friday',
              label: 'Match Simulation Conditioning',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Approach Jump Series (Continuous)', sets: 5, reps: '8 jumps', load: 'Bodyweight', cue: 'Match jump volume. Repeated explosive efforts.' },
                { name: 'Interval Conditioning (90/30)', sets: 5, reps: '90 sec on / 30 sec off', load: 'RPE 8–9', cue: 'Match-intensity conditioning. Repeated explosive efforts with brief recovery.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Saturday',
              label: 'Recovery + Shoulder Care',
              pliability: 'daily_maintenance',
              warmup: null,
              exercises: [
                { name: 'Foam Roll + Stretch', sets: 1, reps: '15 min', load: 'Bodyweight', cue: 'Full body. Focus on quads, calves, thoracic spine, and lats.' },
                { name: 'Band Shoulder Circuit', sets: 3, reps: '15 each', load: 'Band', cue: 'Pull-apart, face pull, external rotation. Full shoulder maintenance.' },
              ],
              cooldown: null,
            },
          ],
        },
      ],
      mindsetNotes: [
        'Pre-season is about sharpening what you built. Trust the off-season work.',
        'TB12: "Pliability is your competitive advantage." Shoulder pliability determines spike mechanics and injury risk.',
        'Kelsey Poulter: "Sharpen the knife, do not break it." Reduce volume. Increase intensity and sport-specificity.',
      ],
    },
    in_season: {
      id: 'vball-inseason',
      title: 'Volleyball In-Season Maintenance',
      sport: 'volleyball',
      phase: 'in-season',
      duration: 16,
      sessionsPerWeek: 2,
      level: 'intermediate',
      focus: 'Shoulder Health + Vertical Maintenance',
      description: 'Maintain vertical jump and protect the shoulder through the competitive season. Minimum effective dose — maximum carry-over.',
      blocks: [
        {
          name: 'In-Season Maintenance Block',
          goal: 'Maintain vertical jump, protect the shoulder, and manage fatigue',
          rpeTarget: '6–7',
          days: [
            {
              day: 'Tuesday',
              label: 'In-Season Strength + Shoulder Care',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Back Squat', sets: 2, reps: '4', load: '75%', cue: 'Minimum effective dose. Maintain vertical jump foundation. NSCA: 2 sessions/week maintains off-season strength.' },
                { name: 'Band Pull-Apart', sets: 4, reps: '20', load: 'Band', cue: 'Non-negotiable every session. Shoulder health is the most important in-season priority for volleyball.' },
                { name: 'Band Face Pull', sets: 3, reps: '15', load: 'Band', cue: 'Posterior rotator cuff. Counterbalances the internal rotation demands of spiking.' },
                { name: 'Nordic Hamstring Curl', sets: 2, reps: '5', load: 'Bodyweight', cue: 'Hamstring protection. Repeated jumping creates hamstring fatigue.' },
                { name: 'Approach Jump', sets: 3, reps: '5', load: 'Bodyweight', cue: 'Maintain vertical jump. Light volume, full intent.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Thursday',
              label: 'Activation + Court Speed',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'Box Jump', sets: 3, reps: '4', load: 'Bodyweight', cue: 'Maintain reactive power. Minimal volume. Stay sharp.' },
                { name: '5-Yard Shuffle Sprint', sets: 3, reps: '1', load: 'Max effort', cue: 'Maintain lateral quickness. Full rest.' },
                { name: 'Band External Rotation', sets: 3, reps: '15 each', load: 'Band', cue: 'Rotator cuff maintenance. Protect the shoulder through the season.' },
              ],
              cooldown: 'post_workout',
            },
          ],
        },
      ],
      mindsetNotes: [
        'In-season training is about maintenance and protection. Two sessions per week is evidence-based and sufficient.',
        'TB12: "The best ability is availability." Shoulder health is the most important physical asset in volleyball. Protect it every day.',
        'Kelsey Poulter: "Refuel within 30 minutes post-match." Protein + carbohydrates start the recovery process immediately. Do not skip the post-match meal.',
      ],
    },
  },

  // ── TRACK & FIELD ───────────────────────────────────────────
  track: {
    off_season: {
      id: 'track-offseason-10w',
      title: 'Track & Field Off-Season Speed Development — 10 Weeks',
      sport: 'track',
      phase: 'off-season',
      duration: 10,
      sessionsPerWeek: 4,
      level: 'intermediate',
      focus: 'Speed + Posterior Chain',
      description: 'Build the speed and strength foundation for a breakthrough season.',
      blocks: [
        {
          name: 'Block 1 — Accumulation (Weeks 1–4)',
          goal: 'Aerobic base, movement quality, posterior chain strength',
          rpeTarget: '6–7',
          days: [
            {
              day: 'Monday',
              label: 'Speed Mechanics + Posterior Chain',
              pliability: 'pre_workout',
              warmup: 'speed',
              exercises: [
                { name: 'A-Skip Drill', sets: 4, reps: '30m', load: 'Bodyweight', cue: 'Rhythmic. Dorsiflexed foot. Drive knee to hip height.' },
                { name: 'B-Skip Drill', sets: 4, reps: '30m', load: 'Bodyweight', cue: 'Extend and claw back. Hamstring activation.' },
                { name: 'Acceleration Run (10m)', sets: 6, reps: '1', load: 'Max effort', cue: 'Drive phase. Low angle. 3-point stance start.' },
                { name: 'Romanian Deadlift', sets: 4, reps: '8', load: 'Moderate', cue: 'Posterior chain foundation. Hamstring tension throughout.' },
                { name: 'Nordic Hamstring Curl', sets: 3, reps: '5', load: 'Bodyweight', cue: 'Eccentric hamstring. Injury prevention priority.' },
                { name: 'Glute Bridge (Single Leg)', sets: 3, reps: '12 each', load: 'Bodyweight', cue: 'Level hips. Full extension. Hamstring + glute co-contraction.' },
              ],
              cooldown: 'post_workout',
            },
            {
              day: 'Wednesday',
              label: 'Strength + Plyometrics',
              pliability: 'pre_workout',
              warmup: 'strength',
              exercises: [
                { name: 'Front Squat', sets: 4, reps: '6', load: 'Moderate (65%)', cue: 'Elbows high. Upright torso. Quad dominant. Speed-specific.' },
                { name: 'Hang Power Clean', sets: 4, reps: '4', load: 'Moderate (60%)', cue: 'Triple extension. Fast elbows. Catch in quarter squat.' },
                { name: 'Box Jump', sets: 4, reps: '5', load: 'Bodyweight', cue: 'Reactive. Minimal ground contact time.' },
                { name: 'Hurdle Hop Series', sets: 3, reps: '8', load: 'Bodyweight', cue: 'Stiff ankle. Rhythm. Consistent height.' },
                { name: 'Band Hip Hinge', sets: 3, reps: '15', load: 'Band', cue: 'Reinforce hinge pattern. Glute activation.' },
              ],
              cooldown: 'post_workout',
            },
          ],
        },
      ],
      mindsetNotes: [
        'Speed is a skill. Every sprint rep is practice. Execute with perfect mechanics even when fatigued.',
        'TB12: Pliability is your injury insurance. Hamstring and hip flexor pliability directly determines sprint performance.',
        'NSCA: Plyometric volume must be managed carefully. Quality > quantity. Rest fully between sets.',
      ],
    },
  },
};

// ── READINESS-ADAPTIVE WORKOUT MODIFIER ──────────────────────
/**
 * Adjusts workout intensity based on readiness score.
 * Based on NSCA load management principles.
 */
export function adaptWorkoutToReadiness(workout, readinessScore) {
  if (readinessScore >= 85) {
    return {
      ...workout,
      intensityNote: 'High Readiness — Train at full prescribed intensity. Push hard on main lifts.',
      intensityMultiplier: 1.0,
      rpeTarget: '7–8',
      badge: { label: 'Full Intensity', color: '#22c955' },
    };
  } else if (readinessScore >= 70) {
    return {
      ...workout,
      intensityNote: 'Moderate Readiness — Train at 85–90% of prescribed load. Focus on technique.',
      intensityMultiplier: 0.88,
      rpeTarget: '6–7',
      badge: { label: 'Moderate Intensity', color: '#f59e0b' },
    };
  } else if (readinessScore >= 55) {
    return {
      ...workout,
      intensityNote: 'Low-Moderate Readiness — Reduce volume by 20%. Prioritize movement quality over load.',
      intensityMultiplier: 0.75,
      rpeTarget: '5–6',
      badge: { label: 'Reduced Volume', color: '#f59e0b' },
    };
  } else {
    return {
      ...workout,
      intensityNote: 'Low Readiness — Recovery session only. Pliability, mobility, and light movement. No heavy loading.',
      intensityMultiplier: 0,
      rpeTarget: '3–4',
      badge: { label: 'Recovery Day', color: '#ef4444' },
      isRecoveryDay: true,
    };
  }
}

// ── DAILY WORKOUT GENERATOR ───────────────────────────────────
/**
 * Generates today's workout based on sport, phase, level, and readiness.
 * Returns a structured workout object ready for display.
 */
export function generateTodayWorkout(sport, compPhase, trainingLevel, readinessScore, dayOfWeek, primaryGoal, secondaryGoals) {
  const sportProgram = ELITE_PROGRAMS[sport] || ELITE_PROGRAMS.basketball;
  const phaseProgram = sportProgram[compPhase] || sportProgram.off_season;

  // Find today's session from the first block
  const block = phaseProgram.blocks[0];
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const todayName = dayNames[dayOfWeek];
  const daySession = block.days.find(d => d.day === todayName) || block.days[dayOfWeek % block.days.length];

  const baseWorkout = {
    title: daySession.label,
    sport,
    phase: compPhase,
    level: trainingLevel,
    exercises: daySession.exercises,
    pliabilityProtocol: daySession.pliability ? PLIABILITY_PROTOCOLS[daySession.pliability] : null,
    warmupProtocol: daySession.warmup ? WARMUP_PROTOCOLS[daySession.warmup] : WARMUP_PROTOCOLS.general,
    cooldownProtocol: daySession.cooldown ? PLIABILITY_PROTOCOLS[daySession.cooldown] : null,
    mindsetNote: phaseProgram.mindsetNotes[Math.floor(Math.random() * phaseProgram.mindsetNotes.length)],
    estimatedDuration: _estimateDuration(daySession.exercises),
  };

  const readinessWorkout = adaptWorkoutToReadiness(baseWorkout, readinessScore);
  // Apply goal-specific exercise injections
  return applyGoalModifiers(readinessWorkout, primaryGoal, secondaryGoals);
}

function _estimateDuration(exercises) {
  if (!exercises || !exercises.length) return 45;
  const sets = exercises.reduce((s, e) => s + (parseInt(e.sets) || 3), 0);
  return Math.round(sets * 3.5 + 15); // ~3.5 min per set + 15 min warmup
}


// ── GOAL-ADAPTIVE EXERCISE LIBRARY ───────────────────────────
/**
 * Extra exercises injected based on user goals.
 * Each goal adds 1–3 targeted exercises to the session.
 * Based on NSCA and sport science best practices.
 */
const GOAL_EXERCISE_INJECTIONS = {
  strength: [
    { name: 'Barbell Back Squat', sets: 3, reps: '5', load: 'Heavy (80–85%)', cue: 'TB12: Pliability first. Squat deep only through full range. Drive through heels.', goalTag: 'strength' },
    { name: 'Trap Bar Deadlift', sets: 3, reps: '5', load: 'Heavy (80–85%)', cue: 'Neutral spine. Full hip extension at top. Reset between reps.', goalTag: 'strength' },
  ],
  speed: [
    { name: '10-Yard Acceleration Sprint', sets: 6, reps: '1', load: 'Max effort', cue: 'Drive phase: 45° lean, powerful arm drive, triple extension. Full rest between reps.', goalTag: 'speed' },
    { name: 'Resisted Sprint (Band)', sets: 4, reps: '20 yds', load: 'Light resistance band', cue: 'Maintain mechanics under resistance. Do not let band alter stride pattern.', goalTag: 'speed' },
  ],
  endurance: [
    { name: 'Aerobic Tempo Run', sets: 1, reps: '15–20 min', load: '65–70% max HR', cue: 'Conversational pace. Nasal breathing if possible. Builds aerobic base per Maffetone method.', goalTag: 'endurance' },
  ],
  flexibility: [
    { name: 'Hip Flexor Stretch (90/90)', sets: 2, reps: '60 sec/side', load: 'Bodyweight', cue: 'TB12: Tight hip flexors limit sprint mechanics and increase lower back stress. Hold and breathe.', goalTag: 'flexibility' },
    { name: 'Thoracic Rotation Stretch', sets: 2, reps: '10/side', load: 'Bodyweight', cue: 'Rotate from mid-back, not lower back. Improves throwing, swinging, and overhead mechanics.', goalTag: 'flexibility' },
  ],
  conditioning: [
    { name: 'HIIT Intervals (30/30)', sets: 8, reps: '30 sec on / 30 sec off', load: '85–90% max effort', cue: 'Stølen et al. (2005): High-intensity intervals mirror match demands. Full effort on work intervals.', goalTag: 'conditioning' },
  ],
  recovery: [
    { name: 'Foam Roll — Full Body', sets: 1, reps: '5 min', load: 'Bodyweight', cue: 'TB12: Pliability work is not optional. Roll slowly, pause on tender spots, breathe through them.', goalTag: 'recovery' },
    { name: 'Diaphragmatic Breathing', sets: 3, reps: '10 breaths', load: 'Bodyweight', cue: 'Inhale 4 sec, hold 2, exhale 6. Activates parasympathetic system. Reduces cortisol post-training.', goalTag: 'recovery' },
  ],
  vertical: [
    { name: 'Depth Jump', sets: 4, reps: '5', load: 'Bodyweight', cue: 'Step off box, land, immediately jump. Minimize ground contact time. Reactive strength index focus.', goalTag: 'vertical' },
    { name: 'Jump Squat', sets: 3, reps: '8', load: '20–30% 1RM', cue: 'NSCA: Loaded jump squats at 20–30% 1RM maximize power output. Explode through full extension.', goalTag: 'vertical' },
  ],
  recruiting: [
    { name: 'Position-Specific Drill', sets: 4, reps: '5 reps', load: 'Bodyweight / sport-specific', cue: 'Film every set. Coaches and scouts evaluate mechanics, effort, and consistency under fatigue.', goalTag: 'recruiting' },
    { name: '40-Yard Dash / Pro Agility', sets: 3, reps: '1', load: 'Max effort', cue: 'Recruiting metric. Drive phase mechanics critical for first 10 yards. Record times every session.', goalTag: 'recruiting' },
  ],
  injury_prev: [
    { name: 'Nordic Hamstring Curl', sets: 3, reps: '6', load: 'Bodyweight', cue: 'Petersen et al. (2011): 51% reduction in hamstring injuries. Lower slowly (3–4 sec), use hands to assist up.', goalTag: 'injury_prev' },
    { name: 'Copenhagen Plank', sets: 3, reps: '20 sec/side', load: 'Bodyweight', cue: 'Harøy et al. (2019): Groin injury prevention. Keep hips level. Progress to longer holds over weeks.', goalTag: 'injury_prev' },
  ],
  nutrition: [
    { name: 'Post-Workout Nutrition Window', sets: 1, reps: 'Action item', load: 'N/A', cue: 'TB12: Consume protein + carbohydrates within 30 min of training. Target 0.3g protein/kg bodyweight. Check your Nutrition tab.', goalTag: 'nutrition' },
  ],
};

/**
 * Goal priority map — determines which exercises get added first
 * and how many extra exercises are injected per session.
 */
const GOAL_PRIORITY = {
  strength:    { maxInject: 2, position: 'main'    },
  speed:       { maxInject: 2, position: 'main'    },
  endurance:   { maxInject: 1, position: 'end'     },
  flexibility: { maxInject: 2, position: 'end'     },
  conditioning:{ maxInject: 1, position: 'end'     },
  recovery:    { maxInject: 2, position: 'end'     },
  vertical:    { maxInject: 2, position: 'main'    },
  recruiting:  { maxInject: 2, position: 'end'     },
  injury_prev: { maxInject: 2, position: 'warmup'  },
  nutrition:   { maxInject: 1, position: 'end'     },
};

/**
 * applyGoalModifiers — injects goal-specific exercises into a workout.
 * Primary goal gets full injection (up to maxInject exercises).
 * Secondary goals each get 1 exercise.
 *
 * @param {Object} workout          - Base workout from generateTodayWorkout
 * @param {string} primaryGoal      - User's primary goal ID (e.g. 'strength')
 * @param {string[]} secondaryGoals - User's secondary goal IDs
 * @returns {Object} Modified workout with goal-specific exercises added
 */
export function applyGoalModifiers(workout, primaryGoal, secondaryGoals = []) {
  if (!workout || (!primaryGoal && !secondaryGoals.length)) return workout;

  const mainExercises   = [...(workout.exercises || [])];
  const warmupAdditions = [];
  const endAdditions    = [];

  function injectGoal(goalId, maxCount) {
    const injections = GOAL_EXERCISE_INJECTIONS[goalId];
    if (!injections || !injections.length) return;
    const priority = GOAL_PRIORITY[goalId] || { maxInject: 1, position: 'end' };
    const toAdd = injections.slice(0, maxCount || priority.maxInject);
    toAdd.forEach(ex => {
      // Don't duplicate if already in the workout
      const alreadyPresent = mainExercises.some(e => e.name === ex.name);
      if (alreadyPresent) return;
      if (priority.position === 'warmup') {
        warmupAdditions.push(ex);
      } else if (priority.position === 'main') {
        // Insert before last exercise (before cooldown/finisher)
        const insertAt = Math.max(mainExercises.length - 1, 0);
        mainExercises.splice(insertAt, 0, ex);
      } else {
        endAdditions.push(ex);
      }
    });
  }

  // Primary goal: full injection
  if (primaryGoal) injectGoal(primaryGoal, GOAL_PRIORITY[primaryGoal]?.maxInject || 2);

  // Secondary goals: 1 exercise each
  (secondaryGoals || []).slice(0, 3).forEach(g => {
    if (g && g !== primaryGoal) injectGoal(g, 1);
  });

  // Build goal summary label for display
  const allGoals = [primaryGoal, ...(secondaryGoals || [])].filter(Boolean);
  const goalLabel = allGoals.length
    ? 'Goal focus: ' + allGoals.map(g => g.replace('_', ' ')).join(', ')
    : null;

  return {
    ...workout,
    exercises: [...warmupAdditions, ...mainExercises, ...endAdditions],
    goalLabel,
    primaryGoal,
    secondaryGoals,
    goalModified: allGoals.length > 0,
  };
}

// ── SPORT POSITIONS ───────────────────────────────────────────
export const SPORT_POSITIONS = {
  basketball: ['Point Guard','Shooting Guard','Small Forward','Power Forward','Center'],
  football:   ['QB','RB','WR','TE','OL','DL','LB','CB','S','K/P'],
  soccer:     ['Goalkeeper','Defender','Midfielder','Forward','Winger'],
  baseball:   ['Pitcher','Catcher','1B','2B','3B','SS','LF','CF','RF','DH'],
  volleyball: ['Setter','Outside Hitter','Middle Blocker','Opposite','Libero'],
  track:      ['Sprinter (100/200m)','Middle Distance (400/800m)','Long Distance','Jumper','Thrower','Hurdler','Multi-Event'],
};
