/* ================================================================
   exerciseLibrary.js — PerformanceIQ Elite Training Engine Library
   Lightweight offline exercise metadata and swap helpers
   ================================================================ */
(function(){
  'use strict';

  const LIB = {
    basketball: [
      {
        id: 'goblet_squat', title: 'Goblet Squat', type: 'strength', movement: 'squat',
        equipment: ['dumbbells','bodyweight'], difficulty: 'beginner',
        defaultSets: 3, defaultReps: '8-10', defaultRest: 75,
        cues: ['Brace before each rep', 'Sit between hips', 'Keep chest tall'],
        mistakes: ['Knees collapsing inward', 'Heels lifting', 'Losing torso position'],
        progressions: ['Front Squat', 'Barbell Back Squat'],
        regressions: ['Box Squat', 'Bodyweight Squat'],
        alternatives: ['front_squat','bodyweight_squat','split_squat']
      },
      {
        id: 'front_squat', title: 'Front Squat', type: 'strength', movement: 'squat',
        equipment: ['barbell'], difficulty: 'intermediate',
        defaultSets: 4, defaultReps: '5-6', defaultRest: 120,
        cues: ['Elbows high', 'Full foot pressure', 'Drive straight up'],
        mistakes: ['Elbows dropping', 'Caving at bottom', 'Rushing eccentric'],
        progressions: ['Paused Front Squat'], regressions: ['Goblet Squat'],
        alternatives: ['goblet_squat','split_squat']
      },
      {
        id: 'rdl', title: 'Romanian Deadlift', type: 'strength', movement: 'hinge',
        equipment: ['barbell','dumbbells'], difficulty: 'intermediate',
        defaultSets: 4, defaultReps: '6-8', defaultRest: 120,
        cues: ['Push hips back', 'Soft knees', 'Keep lats tight'],
        mistakes: ['Rounding low back', 'Squatting instead of hinging', 'Bar drifting away'],
        progressions: ['Single-Leg RDL'], regressions: ['Hip Hinge Drill'],
        alternatives: ['db_rdl','hip_thrust']
      },
      {
        id: 'db_rdl', title: 'DB Romanian Deadlift', type: 'strength', movement: 'hinge',
        equipment: ['dumbbells'], difficulty: 'beginner',
        defaultSets: 3, defaultReps: '8-10', defaultRest: 90,
        cues: ['Neutral spine', 'Hips back', 'Feel hamstrings load'],
        mistakes: ['Weight too far forward', 'Shoulders rounding'],
        progressions: ['RDL'], regressions: ['Hip Hinge Drill'],
        alternatives: ['rdl','hip_thrust']
      },
      {
        id: 'split_squat', title: 'Split Squat', type: 'strength', movement: 'single_leg',
        equipment: ['bodyweight','dumbbells'], difficulty: 'beginner',
        defaultSets: 3, defaultReps: '8 each', defaultRest: 60,
        cues: ['Front foot flat', 'Torso tall', 'Drop straight down'],
        mistakes: ['Front heel coming up', 'Leaning too far forward'],
        progressions: ['Rear-Foot Elevated Split Squat'], regressions: ['Assisted Split Squat'],
        alternatives: ['lunge','goblet_squat']
      },
      {
        id: 'bench_press', title: 'Bench Press', type: 'strength', movement: 'horizontal_push',
        equipment: ['barbell'], difficulty: 'intermediate',
        defaultSets: 4, defaultReps: '5-6', defaultRest: 120,
        cues: ['Set shoulder blades', 'Feet drive into floor', 'Lower with control'],
        mistakes: ['Flared elbows', 'Bouncing bar', 'Loose upper back'],
        progressions: ['Close-Grip Bench'], regressions: ['DB Floor Press'],
        alternatives: ['pushup','db_floor_press']
      },
      {
        id: 'pushup', title: 'Push-up', type: 'strength', movement: 'horizontal_push',
        equipment: ['bodyweight'], difficulty: 'beginner',
        defaultSets: 3, defaultReps: '10-15', defaultRest: 45,
        cues: ['Straight line from head to heel', 'Full range', 'Hands under shoulders'],
        mistakes: ['Sagging hips', 'Short reps', 'Neck jutting forward'],
        progressions: ['Tempo Push-up'], regressions: ['Incline Push-up'],
        alternatives: ['bench_press','db_floor_press']
      },
      {
        id: 'row', title: 'Bent Over Row', type: 'strength', movement: 'horizontal_pull',
        equipment: ['barbell','dumbbells'], difficulty: 'intermediate',
        defaultSets: 4, defaultReps: '8', defaultRest: 90,
        cues: ['Pull elbows to hip', 'Keep torso fixed', 'Pause at top'],
        mistakes: ['Jerking weight', 'Standing up each rep'],
        progressions: ['Chest Supported Row'], regressions: ['Band Row'],
        alternatives: ['band_row','db_row']
      },
      {
        id: 'db_row', title: 'Single-Arm DB Row', type: 'strength', movement: 'horizontal_pull',
        equipment: ['dumbbells'], difficulty: 'beginner',
        defaultSets: 3, defaultReps: '10 each', defaultRest: 60,
        cues: ['Flat back', 'Pull to pocket', 'Full stretch'],
        mistakes: ['Twisting torso', 'Shrugging shoulder'],
        progressions: ['Bent Over Row'], regressions: ['Band Row'],
        alternatives: ['row','band_row']
      },
      {
        id: 'band_row', title: 'Band Row', type: 'strength', movement: 'horizontal_pull',
        equipment: ['bands'], difficulty: 'beginner',
        defaultSets: 3, defaultReps: '12-15', defaultRest: 45,
        cues: ['Lead with elbows', 'Pause at squeeze', 'Brace core'],
        mistakes: ['Shoulders rolling forward'],
        progressions: ['DB Row'], regressions: ['Scap Retraction Drill'],
        alternatives: ['db_row','row']
      },
      {
        id: 'box_jump', title: 'Box Jump', type: 'power', movement: 'jump',
        equipment: ['box','bodyweight'], difficulty: 'intermediate',
        defaultSets: 4, defaultReps: '4', defaultRest: 75,
        cues: ['Explode through floor', 'Land softly', 'Step down'],
        mistakes: ['Tucking knees to fake height', 'Jumping down'],
        progressions: ['Depth Jump'], regressions: ['Squat Jump'],
        alternatives: ['broad_jump','squat_jump']
      },
      {
        id: 'broad_jump', title: 'Broad Jump', type: 'power', movement: 'jump',
        equipment: ['bodyweight'], difficulty: 'beginner',
        defaultSets: 4, defaultReps: '4', defaultRest: 60,
        cues: ['Use arms', 'Stick the landing', 'Reset each rep'],
        mistakes: ['Falling forward on landing'],
        progressions: ['Box Jump'], regressions: ['Snap Down'],
        alternatives: ['box_jump','squat_jump']
      },
      {
        id: 'squat_jump', title: 'Squat Jump', type: 'power', movement: 'jump',
        equipment: ['bodyweight'], difficulty: 'beginner',
        defaultSets: 3, defaultReps: '5', defaultRest: 45,
        cues: ['Quick countermovement', 'Full extension', 'Soft landing'],
        mistakes: ['Landing stiff', 'Too much forward lean'],
        progressions: ['Box Jump'], regressions: ['Pogo Jump'],
        alternatives: ['broad_jump','box_jump']
      },
      {
        id: 'shuttle_run', title: '5-10-5 Shuttle', type: 'speed', movement: 'change_of_direction',
        equipment: ['field','court'], difficulty: 'intermediate',
        defaultSets: 5, defaultReps: '1 rep', defaultRest: 75,
        cues: ['Low hips on turn', 'Push out of plant foot', 'Eyes up'],
        mistakes: ['Standing tall at cut', 'Slow first step'],
        progressions: ['Reactive Shuttle'], regressions: ['Lateral Shuffle Drill'],
        alternatives: ['accel_sprint','tempo_runs']
      },
      {
        id: 'accel_sprint', title: 'Acceleration Sprint', type: 'speed', movement: 'sprint',
        equipment: ['field','court'], difficulty: 'beginner',
        defaultSets: 6, defaultReps: '15 yd', defaultRest: 60,
        cues: ['45° shin angle', 'Big first push', 'Drive arms'],
        mistakes: ['Popping up early', 'Choppy steps'],
        progressions: ['Resisted Sprint'], regressions: ['Wall Drill'],
        alternatives: ['shuttle_run','tempo_runs']
      },
      {
        id: 'tempo_runs', title: 'Tempo Runs', type: 'conditioning', movement: 'conditioning',
        equipment: ['field','court'], difficulty: 'beginner',
        defaultSets: 8, defaultReps: '60 yd', defaultRest: 30,
        cues: ['Relaxed rhythm', 'Nasal breathing when possible'],
        mistakes: ['Going too hard', 'Poor posture'],
        progressions: ['Shuttle Repeat'], regressions: ['Bike Intervals'],
        alternatives: ['bike_intervals','shuttle_run']
      },
      {
        id: 'bike_intervals', title: 'Bike Intervals', type: 'conditioning', movement: 'conditioning',
        equipment: ['machines'], difficulty: 'beginner',
        defaultSets: 6, defaultReps: '30s on / 30s off', defaultRest: 30,
        cues: ['Stay tall', 'Push hard on work interval'],
        mistakes: ['Starting too hot', 'Cadence collapse'],
        progressions: ['Longer work interval'], regressions: ['Steady Bike'],
        alternatives: ['tempo_runs']
      },
      {
        id: 'plank', title: 'Front Plank', type: 'accessory', movement: 'core',
        equipment: ['bodyweight'], difficulty: 'beginner',
        defaultSets: 3, defaultReps: '30-45s', defaultRest: 30,
        cues: ['Ribs down', 'Glutes tight', 'Push forearms into floor'],
        mistakes: ['Hips sagging', 'Head hanging'],
        progressions: ['Body Saw'], regressions: ['Short Plank'],
        alternatives: ['dead_bug']
      },
      {
        id: 'dead_bug', title: 'Dead Bug', type: 'accessory', movement: 'core',
        equipment: ['bodyweight'], difficulty: 'beginner',
        defaultSets: 3, defaultReps: '8 each', defaultRest: 30,
        cues: ['Low back flat', 'Slow limb reach', 'Exhale fully'],
        mistakes: ['Back arching'],
        progressions: ['Loaded Dead Bug'], regressions: ['Heel Tap'],
        alternatives: ['plank']
      },
      {
        id: 'lunge', title: 'Walking Lunge', type: 'strength', movement: 'single_leg',
        equipment: ['bodyweight','dumbbells'], difficulty: 'beginner',
        defaultSets: 3, defaultReps: '8 each', defaultRest: 60,
        cues: ['Long enough step', 'Front heel stays down'],
        mistakes: ['Collapsing inward', 'Short stride'],
        progressions: ['DB Walking Lunge'], regressions: ['Split Squat'],
        alternatives: ['split_squat']
      },
      {
        id: 'hip_thrust', title: 'Hip Thrust', type: 'strength', movement: 'hinge',
        equipment: ['barbell','bodyweight'], difficulty: 'beginner',
        defaultSets: 4, defaultReps: '8-10', defaultRest: 90,
        cues: ['Ribs down', 'Drive through heels', 'Pause at top'],
        mistakes: ['Hyperextending low back'],
        progressions: ['Single-Leg Hip Thrust'], regressions: ['Glute Bridge'],
        alternatives: ['rdl','db_rdl']
      }
    ]
  };

  function getSportLibrary(sport){
    return LIB[sport] || LIB.basketball;
  }

  function hasEquipment(ex, equipment){
    const eq = new Set((equipment || []).map(x => String(x).toLowerCase()));
    return (ex.equipment || []).some(e => eq.has(String(e).toLowerCase()));
  }

  function getExerciseById(id, sport){
    return getSportLibrary(sport).find(x => x.id === id) || null;
  }

  function getAlternatives(exercise, context = {}){
    const sport = context.sport || 'basketball';
    const equipment = context.equipment || ['bodyweight'];
    const lib = getSportLibrary(sport);
    const current = typeof exercise === 'string' ? getExerciseById(exercise, sport) : exercise;
    if (!current) return [];

    const ids = new Set(current.alternatives || []);
    const sameMovement = lib.filter(x => x.id !== current.id && x.movement === current.movement);
    const preferred = lib.filter(x => ids.has(x.id));
    const merged = [...preferred, ...sameMovement].filter((x, i, arr) => arr.findIndex(y => y.id === x.id) === i);

    return merged.filter(x => hasEquipment(x, equipment)).slice(0, 5);
  }

  function repEstimate(repText){
    const t = String(repText || '').trim();
    const nums = t.match(/\d+/g);
    if (!nums || !nums.length) return 8;
    if (nums.length === 1) return Number(nums[0]);
    return Math.round((Number(nums[0]) + Number(nums[1])) / 2);
  }

  window.PIQExerciseLibrary = {
    LIB,
    getSportLibrary,
    getExerciseById,
    getAlternatives,
    hasEquipment,
    repEstimate,
  };
})();
