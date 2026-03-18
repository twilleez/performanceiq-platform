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
export function generateTodayWorkout(sport, compPhase, trainingLevel, readinessScore, dayOfWeek) {
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

  return adaptWorkoutToReadiness(baseWorkout, readinessScore);
}

function _estimateDuration(exercises) {
  if (!exercises || !exercises.length) return 45;
  const sets = exercises.reduce((s, e) => s + (parseInt(e.sets) || 3), 0);
  return Math.round(sets * 3.5 + 15); // ~3.5 min per set + 15 min warmup
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
