// js/data/exerciseLibrary.js — Full exercise catalog with metadata

export const exercises = [
  // ── LOWER BODY – SQUAT PATTERN ──
  { id: 'e001', name: 'Back Squat',           category: 'strength',    movement_pattern: 'squat',     primary_muscle: 'quads',     equipment: 'barbell',    difficulty: 'intermediate', sport_tags: ['basketball','football','volleyball'], tags: ['strength'] },
  { id: 'e002', name: 'Front Squat',          category: 'strength',    movement_pattern: 'squat',     primary_muscle: 'quads',     equipment: 'barbell',    difficulty: 'advanced',     sport_tags: ['basketball','volleyball'],            tags: ['strength'] },
  { id: 'e003', name: 'Goblet Squat',         category: 'strength',    movement_pattern: 'squat',     primary_muscle: 'quads',     equipment: 'dumbbell',   difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e004', name: 'Box Squat',            category: 'strength',    movement_pattern: 'squat',     primary_muscle: 'quads',     equipment: 'barbell',    difficulty: 'intermediate', sport_tags: ['football','basketball'],              tags: ['strength'] },
  { id: 'e005', name: 'Bulgarian Split Squat',category: 'strength',    movement_pattern: 'squat',     primary_muscle: 'quads',     equipment: 'dumbbell',   difficulty: 'intermediate', sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e006', name: 'Bodyweight Squat',     category: 'foundation',  movement_pattern: 'squat',     primary_muscle: 'quads',     equipment: 'none',       difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e007', name: 'Leg Press',            category: 'strength',    movement_pattern: 'squat',     primary_muscle: 'quads',     equipment: 'machine',    difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e008', name: 'Jump Squat',           category: 'power',       movement_pattern: 'squat',     primary_muscle: 'quads',     equipment: 'none',       difficulty: 'intermediate', sport_tags: ['basketball','volleyball'],            tags: ['power'] },

  // ── LOWER BODY – HIP HINGE ──
  { id: 'e010', name: 'Romanian Deadlift',    category: 'strength',    movement_pattern: 'hinge',     primary_muscle: 'hamstrings',equipment: 'barbell',    difficulty: 'intermediate', sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e011', name: 'Conventional Deadlift',category: 'strength',    movement_pattern: 'hinge',     primary_muscle: 'posterior', equipment: 'barbell',    difficulty: 'intermediate', sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e012', name: 'Trap Bar Deadlift',    category: 'strength',    movement_pattern: 'hinge',     primary_muscle: 'posterior', equipment: 'trap_bar',   difficulty: 'intermediate', sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e013', name: 'Single-Leg RDL',       category: 'strength',    movement_pattern: 'hinge',     primary_muscle: 'hamstrings',equipment: 'dumbbell',   difficulty: 'intermediate', sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e014', name: 'Kettlebell Swing',     category: 'power',       movement_pattern: 'hinge',     primary_muscle: 'posterior', equipment: 'kettlebell', difficulty: 'intermediate', sport_tags: ['all'],                               tags: ['power'] },
  { id: 'e015', name: 'Good Morning',         category: 'strength',    movement_pattern: 'hinge',     primary_muscle: 'hamstrings',equipment: 'barbell',    difficulty: 'intermediate', sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e016', name: 'Glute Bridge',         category: 'activation',  movement_pattern: 'hinge',     primary_muscle: 'glutes',    equipment: 'none',       difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['recovery'] },

  // ── LOWER BODY – LUNGE PATTERN ──
  { id: 'e020', name: 'Walking Lunges',       category: 'strength',    movement_pattern: 'lunge',     primary_muscle: 'quads',     equipment: 'dumbbell',   difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e021', name: 'Reverse Lunge',        category: 'strength',    movement_pattern: 'lunge',     primary_muscle: 'quads',     equipment: 'dumbbell',   difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e022', name: 'Lateral Lunge',        category: 'strength',    movement_pattern: 'lunge',     primary_muscle: 'adductors', equipment: 'dumbbell',   difficulty: 'beginner',     sport_tags: ['basketball','football'],             tags: ['strength'] },
  { id: 'e023', name: 'Step-Up',              category: 'strength',    movement_pattern: 'lunge',     primary_muscle: 'quads',     equipment: 'box',        difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['strength'] },

  // ── UPPER BODY – PUSH ──
  { id: 'e030', name: 'Bench Press',          category: 'strength',    movement_pattern: 'push',      primary_muscle: 'chest',     equipment: 'barbell',    difficulty: 'intermediate', sport_tags: ['football','basketball'],             tags: ['strength'] },
  { id: 'e031', name: 'Incline Bench Press',  category: 'strength',    movement_pattern: 'push',      primary_muscle: 'chest',     equipment: 'barbell',    difficulty: 'intermediate', sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e032', name: 'Dumbbell Bench Press', category: 'strength',    movement_pattern: 'push',      primary_muscle: 'chest',     equipment: 'dumbbell',   difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e033', name: 'Push-Up',              category: 'foundation',  movement_pattern: 'push',      primary_muscle: 'chest',     equipment: 'none',       difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e034', name: 'Overhead Press',       category: 'strength',    movement_pattern: 'push',      primary_muscle: 'shoulders', equipment: 'barbell',    difficulty: 'intermediate', sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e035', name: 'Dumbbell Shoulder Press',category: 'strength',  movement_pattern: 'push',      primary_muscle: 'shoulders', equipment: 'dumbbell',   difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['strength'] },

  // ── UPPER BODY – PULL ──
  { id: 'e040', name: 'Pull-Up',              category: 'strength',    movement_pattern: 'pull',      primary_muscle: 'lats',      equipment: 'pull_up_bar',difficulty: 'intermediate', sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e041', name: 'Chin-Up',              category: 'strength',    movement_pattern: 'pull',      primary_muscle: 'biceps',    equipment: 'pull_up_bar',difficulty: 'intermediate', sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e042', name: 'Lat Pulldown',         category: 'strength',    movement_pattern: 'pull',      primary_muscle: 'lats',      equipment: 'cable',      difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e043', name: 'Bent-Over Row',        category: 'strength',    movement_pattern: 'pull',      primary_muscle: 'back',      equipment: 'barbell',    difficulty: 'intermediate', sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e044', name: 'Dumbbell Row',         category: 'strength',    movement_pattern: 'pull',      primary_muscle: 'back',      equipment: 'dumbbell',   difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e045', name: 'Face Pull',            category: 'accessory',   movement_pattern: 'pull',      primary_muscle: 'rear_delt', equipment: 'cable',      difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['recovery'] },
  { id: 'e046', name: 'TRX Row',              category: 'strength',    movement_pattern: 'pull',      primary_muscle: 'back',      equipment: 'trx',        difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['strength'] },

  // ── POWER & PLYOMETRICS ──
  { id: 'e050', name: 'Power Clean',          category: 'power',       movement_pattern: 'power',     primary_muscle: 'full_body', equipment: 'barbell',    difficulty: 'advanced',     sport_tags: ['basketball','football','volleyball'],tags: ['power'] },
  { id: 'e051', name: 'Hang Clean',           category: 'power',       movement_pattern: 'power',     primary_muscle: 'full_body', equipment: 'barbell',    difficulty: 'advanced',     sport_tags: ['basketball','football'],             tags: ['power'] },
  { id: 'e052', name: 'Box Jump',             category: 'power',       movement_pattern: 'jump',      primary_muscle: 'quads',     equipment: 'box',        difficulty: 'intermediate', sport_tags: ['basketball','volleyball'],            tags: ['power'] },
  { id: 'e053', name: 'Depth Jump',           category: 'power',       movement_pattern: 'jump',      primary_muscle: 'quads',     equipment: 'box',        difficulty: 'advanced',     sport_tags: ['basketball','volleyball'],            tags: ['power'] },
  { id: 'e054', name: 'Broad Jump',           category: 'power',       movement_pattern: 'jump',      primary_muscle: 'quads',     equipment: 'none',       difficulty: 'intermediate', sport_tags: ['all'],                               tags: ['power'] },
  { id: 'e055', name: 'Medicine Ball Slam',   category: 'power',       movement_pattern: 'power',     primary_muscle: 'full_body', equipment: 'med_ball',   difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['power'] },
  { id: 'e056', name: 'Lateral Bound',        category: 'power',       movement_pattern: 'jump',      primary_muscle: 'quads',     equipment: 'none',       difficulty: 'intermediate', sport_tags: ['basketball','football'],             tags: ['power','speed'] },

  // ── CORE ──
  { id: 'e060', name: 'Plank',               category: 'core',        movement_pattern: 'core',      primary_muscle: 'core',      equipment: 'none',       difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['recovery'] },
  { id: 'e061', name: 'Pallof Press',        category: 'core',        movement_pattern: 'core',      primary_muscle: 'core',      equipment: 'cable',      difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e062', name: 'Dead Bug',            category: 'core',        movement_pattern: 'core',      primary_muscle: 'core',      equipment: 'none',       difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['recovery'] },
  { id: 'e063', name: 'Ab Wheel Rollout',    category: 'core',        movement_pattern: 'core',      primary_muscle: 'core',      equipment: 'ab_wheel',   difficulty: 'intermediate', sport_tags: ['all'],                               tags: ['strength'] },
  { id: 'e064', name: 'Hanging Leg Raise',   category: 'core',        movement_pattern: 'core',      primary_muscle: 'core',      equipment: 'pull_up_bar',difficulty: 'intermediate', sport_tags: ['all'],                               tags: ['strength'] },

  // ── CONDITIONING ──
  { id: 'e070', name: 'Sprint Intervals',    category: 'conditioning', movement_pattern: 'sprint',   primary_muscle: 'full_body', equipment: 'none',       difficulty: 'intermediate', sport_tags: ['all'],                               tags: ['speed'] },
  { id: 'e071', name: '5-10-5 Shuttle',      category: 'conditioning', movement_pattern: 'agility',  primary_muscle: 'full_body', equipment: 'none',       difficulty: 'intermediate', sport_tags: ['basketball','football'],             tags: ['speed'] },
  { id: 'e072', name: 'Bike Sprints',        category: 'conditioning', movement_pattern: 'cycle',    primary_muscle: 'full_body', equipment: 'bike',       difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['speed'] },
  { id: 'e073', name: 'Sled Push',           category: 'conditioning', movement_pattern: 'push',     primary_muscle: 'full_body', equipment: 'sled',       difficulty: 'intermediate', sport_tags: ['football','basketball'],             tags: ['power'] },
  { id: 'e074', name: 'Tempo Run',           category: 'conditioning', movement_pattern: 'run',      primary_muscle: 'full_body', equipment: 'none',       difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['recovery'] },

  // ── RECOVERY / ACTIVATION ──
  { id: 'e080', name: 'Hip 90-90 Stretch',   category: 'recovery',    movement_pattern: 'stretch',   primary_muscle: 'hips',      equipment: 'none',       difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['recovery'] },
  { id: 'e081', name: 'Foam Roll Quads',     category: 'recovery',    movement_pattern: 'mobility',  primary_muscle: 'quads',     equipment: 'foam_roller',difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['recovery'] },
  { id: 'e082', name: 'Band Pull-Apart',     category: 'activation',  movement_pattern: 'pull',      primary_muscle: 'rear_delt', equipment: 'band',       difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['recovery'] },
  { id: 'e083', name: 'Ankle Circles',       category: 'recovery',    movement_pattern: 'mobility',  primary_muscle: 'ankles',    equipment: 'none',       difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['recovery'] },
  { id: 'e084', name: 'World's Greatest Stretch', category: 'recovery', movement_pattern: 'stretch', primary_muscle: 'full_body', equipment: 'none',       difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['recovery'] },
  { id: 'e085', name: 'Hip Flexor Stretch',  category: 'recovery',    movement_pattern: 'stretch',   primary_muscle: 'hip_flexors', equipment: 'none',     difficulty: 'beginner',     sport_tags: ['all'],                               tags: ['recovery'] },
];

export function getExerciseById(id) {
  return exercises.find(e => e.id === id);
}

export function getExercisesByPattern(movement_pattern) {
  return exercises.filter(e => e.movement_pattern === movement_pattern);
}

export function getExercisesByCategory(category) {
  return exercises.filter(e => e.category === category);
}
