/**
 * PerformanceIQ — Workout Generation Engine v3
 * Generates periodised, readiness-adjusted workouts.
 * Sport × Phase × Readiness × Day-of-week → complete session.
 */

export const PLIABILITY_PROTOCOLS = {
  pre_workout: {
    label: 'Pre-Workout Pliability',
    duration: '8–10 min',
    description: 'Prepare muscles for high-velocity movement',
    note: 'TB12: Pliable muscles generate more force and absorb impact better.',
    exercises: [
      { name: 'Foam Roll — Thoracic Spine', duration: '1 × 60s', cue: 'Arms crossed on chest, extend over roller.' },
      { name: 'Foam Roll — Lats', duration: '1 × 45s each', cue: 'Slow passes from armpit to mid-back.' },
      { name: 'Hip Flexor Stretch', duration: '1 × 45s each', cue: 'Posterior pelvic tilt, avoid lumbar extension.' },
      { name: 'Glute / Piriformis Release', duration: '1 × 45s each', cue: 'Figure-4 position on foam roller.' },
    ],
  },
  post_workout: {
    label: 'Post-Workout Pliability',
    duration: '10–12 min',
    description: 'Restore muscle length and flush metabolic waste',
    note: 'Post-session work accelerates recovery and reduces DOMS onset.',
    exercises: [
      { name: 'Foam Roll — Quads', duration: '1 × 60s each', cue: 'Roll slowly, pause on tight spots. Breathe through tension.' },
      { name: 'Foam Roll — Hamstrings', duration: '1 × 60s each leg', cue: 'Keep core engaged. Rotate leg inward/outward.' },
      { name: 'Foam Roll — IT Band / Glutes', duration: '1 × 60s each side', cue: 'Work from hip to knee.' },
      { name: 'Lacrosse Ball — Calves', duration: '1 × 45s each', cue: 'Cross one ankle over the other for added pressure.' },
      { name: 'Lacrosse Ball — Glutes / Piriformis', duration: '1 × 45s each', cue: 'Figure-4 position. Find the tender spot and breathe.' },
    ],
  },
  daily_maintenance: {
    label: 'Daily Maintenance Pliability',
    duration: '10–15 min',
    description: 'Maintain tissue health on recovery days',
    exercises: [
      { name: 'Full Body Foam Roll', duration: '5 min', cue: 'Slow, deliberate passes. 2s on tight spots.' },
      { name: 'Couch Stretch', duration: '90s each side', cue: 'Against wall. Squeeze glute, tuck pelvis.' },
      { name: 'Pigeon Pose', duration: '90s each side', cue: 'Hips square. Breathe into tightness.' },
      { name: 'Doorway Chest Stretch', duration: '60s', cue: 'Arms at 90°. Gentle pressure forward.' },
    ],
  },
};

export const WARMUP_PROTOCOLS = {
  dynamic: {
    label: 'Dynamic Athletic Warm-Up',
    duration: '8–10 min',
    exercises: [
      { name: 'High Knees', duration: '2 × 20', cue: 'Drive knees to hip height. Pump arms.' },
      { name: 'Butt Kicks', duration: '2 × 20', cue: 'Focus on hamstring contraction. Stay on toes.' },
      { name: 'Lateral Shuffle', duration: '2 × 10 each', cue: 'Low athletic stance. Quick feet.' },
      { name: 'Leg Swings (forward/back)', duration: '1 × 15 each', cue: 'Hold wall. Controlled range of motion.' },
      { name: 'Arm Circles + Shoulder Rolls', duration: '1 × 10 each', cue: 'Full range. Both directions.' },
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
      { name: 'Shoulder Circles + Arm Swings', duration: '10 each direction', cue: 'Full range. Warm the rotator cuff.' },
    ],
  },
};

const WORKOUTS = {
  basketball: {
    'in-season': [
      { title: 'Explosive Athleticism', rpeTarget: '7–8', estimatedDuration: 55, intensityNote: 'Sport-specific power day.',
        badge: { label: 'High Power', color: '#22c955' }, mindsetNote: 'Fast-twitch activation — fire from the first rep.',
        exercises: [
          { name: 'Lateral Bound', sets: 4, reps: 6, load: 'Explosive', cue: 'Maximum horizontal distance each bound.' },
          { name: 'Box Jump', sets: 4, reps: 5, cue: 'Full hip extension at top. Soft landing.' },
          { name: 'Bulgarian Split Squat', sets: 3, reps: 8, load: 'Moderate', cue: 'Knee tracks over 2nd toe.' },
          { name: 'Single-Leg RDL', sets: 3, reps: 10, cue: 'Hip hinge. Feel the hamstring stretch.' },
          { name: 'Defensive Slides', sets: 4, reps: '30s', cue: 'Low stance. Never cross feet.' },
          { name: 'Court Sprints (full)', sets: 6, reps: '1 length', cue: 'Maximum effort. Walk back.' },
        ],
      },
      { title: 'Strength + Conditioning', rpeTarget: '6–7', estimatedDuration: 60, intensityNote: 'Build a powerful base.',
        badge: { label: 'Strength', color: '#3b82f6' }, mindsetNote: 'Consistent effort beats sporadic intensity.',
        exercises: [
          { name: 'Back Squat', sets: 4, reps: 6, load: '75% 1RM', cue: 'Brace core, drive knees out, chest up.' },
          { name: 'Romanian Deadlift', sets: 3, reps: 8, load: 'Moderate', cue: 'Hip hinge dominant. Bar close to legs.' },
          { name: 'Bench Press', sets: 3, reps: 8, load: '70% 1RM', cue: 'Retract scapulae. Controlled descent.' },
          { name: 'Bent-Over Row', sets: 3, reps: 10, cue: 'Pull to lower chest. Squeeze at top.' },
          { name: 'Plank Variations', sets: 3, reps: '45s', cue: 'Neutral spine. Brace through entire core.' },
        ],
      },
      { title: 'Speed & Agility', rpeTarget: '7–8', estimatedDuration: 45, intensityNote: 'Quickness and change of direction.',
        badge: { label: 'Speed', color: '#f59e0b' }, mindsetNote: 'React faster than you think.',
        exercises: [
          { name: '5–10–5 Shuttle', sets: 6, reps: 1, cue: 'Explosive first step. Low COD.' },
          { name: 'T-Drill', sets: 4, reps: 1, cue: 'Open hips to direction of travel.' },
          { name: 'Reaction Ball Drill', sets: 3, reps: '30s', cue: 'Low athletic ready position.' },
          { name: '40-Yard Dash', sets: 4, reps: 1, cue: 'Drive phase first 10 yards. Relax and run.' },
          { name: 'Resistance Band Sprint', sets: 4, reps: '15 yards', cue: 'Lean into band. Powerful arm drive.' },
        ],
      },
    ],
    'off-season': [
      { title: 'Off-Season Strength Block', rpeTarget: '8–9', estimatedDuration: 70, intensityNote: 'Build maximum strength.',
        badge: { label: 'Max Strength', color: '#ef4444' }, mindsetNote: 'Off-season is where champions are made.',
        exercises: [
          { name: 'Back Squat', sets: 5, reps: 5, load: '80–85% 1RM', cue: 'Full depth. Controlled descent.' },
          { name: 'Deadlift', sets: 4, reps: 4, load: '80% 1RM', cue: 'Brace hard. Drive floor away.' },
          { name: 'Weighted Pull-Up', sets: 4, reps: 6, cue: 'Full hang to chin over bar.' },
          { name: 'Incline DB Press', sets: 3, reps: 8, cue: 'Squeeze pecs. Control the negative.' },
          { name: 'Hip Thrust', sets: 4, reps: 10, load: 'Heavy', cue: 'Full hip extension. Glute squeeze.' },
        ],
      },
    ],
  },
  football: {
    'in-season': [
      { title: 'Explosive Power Session', rpeTarget: '7–8', estimatedDuration: 55, intensityNote: 'Game-speed power.',
        badge: { label: 'Power', color: '#ef4444' }, mindsetNote: '100% effort on every rep.',
        exercises: [
          { name: 'Power Clean', sets: 4, reps: 4, load: '70% 1RM', cue: 'Triple extension. Elbows high.' },
          { name: 'Trap Bar Deadlift', sets: 4, reps: 5, load: 'Heavy', cue: 'Push the floor down.' },
          { name: 'Box Squat', sets: 3, reps: 6, load: '75% 1RM', cue: 'Sit back onto box. Explode up.' },
          { name: 'Med Ball Overhead Slam', sets: 4, reps: 8, cue: 'Full hip extension. Violent downstroke.' },
          { name: 'Cone Drill — L-Shape', sets: 5, reps: 1, cue: 'First step explosiveness. Stay low.' },
        ],
      },
    ],
  },
  soccer: {
    'in-season': [
      { title: 'Soccer Conditioning', rpeTarget: '7–8', estimatedDuration: 50, intensityNote: 'Aerobic + sprint capacity.',
        badge: { label: 'Conditioning', color: '#22c955' }, mindsetNote: 'The last 10 minutes separate good from great.',
        exercises: [
          { name: '1-Mile Tempo Run', sets: 1, reps: '~7 min pace', cue: 'Conversational effort. Build to finish.' },
          { name: 'High-Intensity Intervals (4×4)', sets: 4, reps: '4 min on / 3 min off', cue: '90–95% HRmax. Recover fully.' },
          { name: 'Nordic Hamstring Curl', sets: 3, reps: 8, cue: 'Control the eccentric. Prevent hamstring injury.' },
          { name: 'Single-Leg Calf Raise', sets: 3, reps: 15, cue: 'Full range. Ankle stability focus.' },
          { name: 'Lateral Squat', sets: 3, reps: 10, cue: 'Push hips back. Stretch inner thigh.' },
        ],
      },
    ],
  },
  track: {
    'in-season': [
      { title: 'Speed Development', rpeTarget: '8–9', estimatedDuration: 55, intensityNote: 'Max velocity work.',
        badge: { label: 'Speed', color: '#f59e0b' }, mindsetNote: 'Mechanics first. Speed follows.',
        exercises: [
          { name: 'A-Skip Drill', sets: 3, reps: '20m', cue: 'High knees. Dorsiflexion at top.' },
          { name: 'B-Skip Drill', sets: 3, reps: '20m', cue: 'Extend to full hip extension.' },
          { name: '30m Fly (rolling start)', sets: 5, reps: 1, cue: 'Relaxed face. Tall posture. Arms drive.' },
          { name: '60m Sprint', sets: 4, reps: 1, cue: 'Acceleration phase 30m, then max velocity.' },
          { name: 'Wicket Drills', sets: 3, reps: '30m', cue: 'Consistent stride length. No stutter steps.' },
        ],
      },
    ],
  },
  baseball: {
    'in-season': [
      { title: 'Baseball Athletic Development', rpeTarget: '6–7', estimatedDuration: 50, intensityNote: 'Rotational power + arm care.',
        badge: { label: 'Baseball Specific', color: '#f59e0b' }, mindsetNote: 'Every rep builds arm health.',
        exercises: [
          { name: 'Rotational Med Ball Throw', sets: 4, reps: 8, cue: 'Hip-to-shoulder sequence. Decelerate safely.' },
          { name: 'Trap Bar RDL', sets: 3, reps: 8, load: 'Moderate', cue: 'Hinge at hip. Neutral spine.' },
          { name: 'Band Pull-Aparts', sets: 4, reps: 15, cue: 'Scapular retraction. Elbows straight.' },
          { name: '90-Ft Sprint', sets: 6, reps: 1, cue: 'First-step explosion. Accelerate through base.' },
          { name: 'Pallof Press', sets: 3, reps: 10, cue: 'Anti-rotation. Brace core. Slow movement.' },
        ],
      },
    ],
  },
  volleyball: {
    'in-season': [
      { title: 'Vertical Jump Mastery', rpeTarget: '7–8', estimatedDuration: 55, intensityNote: 'Explosive power + shoulder health.',
        badge: { label: 'Jump Power', color: '#22c955' }, mindsetNote: 'Your vertical is earned in the gym.',
        exercises: [
          { name: 'Depth Jump', sets: 4, reps: 5, cue: 'Minimal ground contact. Explode immediately up.' },
          { name: 'Box Jump (max height)', sets: 4, reps: 5, cue: 'Maximal effort. Soft landing.' },
          { name: 'Squat Jump', sets: 3, reps: 8, cue: 'Countermovement. Arm swing for height.' },
          { name: 'Hollow Body Hold', sets: 3, reps: '30s', cue: 'Lower back pressed to floor. Deep core.' },
          { name: 'Band Lateral Walk', sets: 3, reps: '15 each way', cue: 'Hip abduction. Knee doesn\'t cave in.' },
        ],
      },
    ],
  },
};

const RECOVERY_SESSION = {
  title: 'Active Recovery Day',
  isRecoveryDay: true,
  rpeTarget: '3–4',
  estimatedDuration: 30,
  badge: { label: 'Recovery', color: '#22c955' },
  intensityNote: 'Low intensity. Let your body repair.',
  mindsetNote: 'Recovery is training. Your body gets stronger at rest.',
  exercises: [],
};

export function generateTodayWorkout(sport = 'basketball', phase = 'in-season', level = 'intermediate', readiness = 72, dow = 1, primaryGoal = null, secondaryGoals = []) {
  // Recovery day if readiness is very low or it's a scheduled rest day (Sun)
  if (readiness < 45 || dow === 0) {
    return {
      ...RECOVERY_SESSION,
      pliabilityProtocol: PLIABILITY_PROTOCOLS.daily_maintenance,
      warmupProtocol: null,
      cooldownProtocol: null,
    };
  }

  const sportWorkouts = WORKOUTS[sport] || WORKOUTS.basketball;
  const phaseWorkouts = sportWorkouts[phase] || sportWorkouts['in-season'] || Object.values(sportWorkouts)[0] || [];

  if (!phaseWorkouts.length) {
    return {
      ...RECOVERY_SESSION,
      title: 'General Athletic Session',
      isRecoveryDay: false,
      pliabilityProtocol: PLIABILITY_PROTOCOLS.pre_workout,
      warmupProtocol: WARMUP_PROTOCOLS.dynamic,
      cooldownProtocol: PLIABILITY_PROTOCOLS.post_workout,
    };
  }

  // Rotate through sessions by day of week
  const sessionIndex = (dow - 1 + phaseWorkouts.length) % phaseWorkouts.length;
  const base = phaseWorkouts[sessionIndex];

  // Adjust intensity based on readiness
  let exercises = [...base.exercises];
  let badge = { ...base.badge };
  let intensityNote = base.intensityNote;

  if (readiness < 60) {
    badge = { label: 'Light Session', color: '#f59e0b' };
    intensityNote = 'Readiness low — reduce volume 20%. Quality over quantity.';
    exercises = exercises.slice(0, Math.max(3, exercises.length - 1));
  } else if (readiness >= 85) {
    badge = { ...badge, label: badge.label + ' ⚡' };
    intensityNote = intensityNote + ' Peak readiness — push hard.';
  }

  return {
    ...base,
    badge,
    intensityNote,
    exercises,
    pliabilityProtocol: PLIABILITY_PROTOCOLS.pre_workout,
    warmupProtocol: base.title.toLowerCase().includes('strength') ? WARMUP_PROTOCOLS.strength : WARMUP_PROTOCOLS.dynamic,
    cooldownProtocol: PLIABILITY_PROTOCOLS.post_workout,
  };
}
