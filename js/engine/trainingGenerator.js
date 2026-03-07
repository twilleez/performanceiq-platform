// js/engine/trainingGenerator.js
// Rules-based training generator: sport × development_stage × season_phase → session

import { exercises } from '../data/exerciseLibrary.js';

// ── Phase rules: volume and intensity ceilings ──
const PHASE_RULES = {
  offseason:   { volume_mod: 1.2,  intensity_mod: 0.85, conditioning_load: 'moderate', focus: 'Build base strength and work capacity' },
  preseason:   { volume_mod: 1.0,  intensity_mod: 1.0,  conditioning_load: 'high',     focus: 'Peak power and sport-specific conditioning' },
  inseason:    { volume_mod: 0.75, intensity_mod: 0.9,  conditioning_load: 'low',      focus: 'Maintain strength, prioritize recovery' },
  postseason:  { volume_mod: 0.5,  intensity_mod: 0.6,  conditioning_load: 'minimal',  focus: 'Active recovery and deload' },
};

// ── Development stage rules ──
const STAGE_RULES = {
  foundation:   { max_intensity: 0.7, allow_power: false, allow_oly: false, sets_range: [2,3], rep_range: [10,15], note: 'Emphasize technique over load' },
  development:  { max_intensity: 0.8, allow_power: true,  allow_oly: false, sets_range: [3,4], rep_range: [8,12],  note: 'Introduce progressive overload' },
  performance:  { max_intensity: 0.9, allow_power: true,  allow_oly: true,  sets_range: [3,5], rep_range: [5,8],   note: 'Max strength and power focus' },
  elite:        { max_intensity: 1.0, allow_power: true,  allow_oly: true,  sets_range: [4,6], rep_range: [3,6],   note: 'Optimize force velocity curve' },
  maintenance:  { max_intensity: 0.8, allow_power: true,  allow_oly: false, sets_range: [3,4], rep_range: [6,10],  note: 'Maintain strength, minimize fatigue' },
};

// ── Sport-specific exercise selection pools ──
const SPORT_POOLS = {
  basketball: {
    primary_patterns: ['squat', 'hinge', 'push', 'pull'],
    power_pool:       ['e052', 'e053', 'e054', 'e056', 'e014', 'e008'],
    strength_lower:   ['e001', 'e005', 'e012', 'e010', 'e022'],
    strength_upper:   ['e034', 'e030', 'e040', 'e043', 'e035'],
    accessory:        ['e061', 'e045', 'e060', 'e062', 'e082'],
    conditioning:     ['e071', 'e070', 'e072'],
    warmup:           ['e084', 'e083', 'e016', 'e082', 'e085'],
  },
  football: {
    primary_patterns: ['squat', 'hinge', 'push', 'pull'],
    power_pool:       ['e050', 'e051', 'e073', 'e014', 'e008'],
    strength_lower:   ['e001', 'e011', 'e012', 'e004', 'e023'],
    strength_upper:   ['e030', 'e031', 'e034', 'e040', 'e043'],
    accessory:        ['e061', 'e060', 'e063', 'e045', 'e082'],
    conditioning:     ['e070', 'e073', 'e071'],
    warmup:           ['e084', 'e016', 'e083', 'e085', 'e082'],
  },
  volleyball: {
    primary_patterns: ['jump', 'push', 'pull', 'squat'],
    power_pool:       ['e052', 'e053', 'e055', 'e008'],
    strength_lower:   ['e001', 'e005', 'e010', 'e023'],
    strength_upper:   ['e034', 'e031', 'e040', 'e042'],
    accessory:        ['e061', 'e045', 'e060', 'e062'],
    conditioning:     ['e072', 'e070', 'e071'],
    warmup:           ['e084', 'e083', 'e016', 'e085'],
  },
  default: {
    primary_patterns: ['squat', 'hinge', 'push', 'pull'],
    power_pool:       ['e052', 'e014', 'e055', 'e008'],
    strength_lower:   ['e001', 'e010', 'e005', 'e020'],
    strength_upper:   ['e030', 'e034', 'e040', 'e043'],
    accessory:        ['e061', 'e060', 'e045', 'e062'],
    conditioning:     ['e070', 'e072', 'e074'],
    warmup:           ['e084', 'e016', 'e083', 'e085'],
  },
};

/**
 * Generate a complete training session.
 * @param {object} athlete - profile with sport, development_stage, season_phase, etc.
 * @param {object} readiness - computed readiness object {score, intensity_mod}
 * @returns {object} session with sections: warmup, main, accessory, conditioning, cooldown
 */
export function generateSession(athlete, readiness) {
  const pool   = SPORT_POOLS[athlete.sport] || SPORT_POOLS.default;
  const phase  = PHASE_RULES[athlete.season_phase] || PHASE_RULES.inseason;
  const stage  = STAGE_RULES[athlete.development_stage] || STAGE_RULES.performance;

  // Combined intensity modifier
  const intensityMod = phase.intensity_mod * stage.max_intensity * (readiness?.intensity_mod ?? 1.0);
  const volumeMod    = phase.volume_mod;

  const session = {
    title:       getSessionTitle(athlete, phase),
    phase_note:  phase.focus,
    stage_note:  stage.note,
    intensity_mod: intensityMod,
    sections: {
      warmup:      buildWarmup(pool, stage),
      main:        buildMain(pool, stage, phase, volumeMod, intensityMod),
      accessory:   buildAccessory(pool, stage, volumeMod),
      conditioning: buildConditioning(pool, phase, stage),
      cooldown:    buildCooldown(),
    },
  };

  return session;
}

// ── Section builders ──

function buildWarmup(pool, stage) {
  const ids = pool.warmup.slice(0, 4);
  return ids.map((id, i) => {
    const ex = getEx(id);
    return {
      ...ex,
      session_sets: 1,
      reps: '8-10',
      load: 'bodyweight',
      notes: i === 0 ? '5 min general movement prep' : null,
    };
  });
}

function buildMain(pool, stage, phase, volumeMod, intensityMod) {
  const useOly   = stage.allow_oly && phase !== PHASE_RULES.postseason;
  const usePower = stage.allow_power;

  const exercises = [];

  // Primary strength: 1 lower, 1 upper
  const lowerEx = getEx(pickRandom(pool.strength_lower));
  const upperEx = getEx(pickRandom(pool.strength_upper));

  const [setsLow, setsHigh] = stage.sets_range;
  const sets = Math.round(lerp(setsLow, setsHigh, volumeMod));
  const [repLow, repHigh]   = stage.rep_range;
  const reps = repLow === repHigh ? repLow : `${repLow}-${repHigh}`;

  exercises.push({
    ...lowerEx,
    session_sets: sets,
    reps,
    load: describeLoad(intensityMod),
    rpe: describeRPE(intensityMod),
    notes: `Primary lower — ${describeLoad(intensityMod)} effort`,
  });

  exercises.push({
    ...upperEx,
    session_sets: sets,
    reps,
    load: describeLoad(intensityMod),
    rpe: describeRPE(intensityMod),
    notes: `Primary upper — pair with lower if time allows`,
  });

  // Power exercise (if allowed)
  if (usePower && pool.power_pool.length > 0) {
    const powerEx = getEx(pickRandom(pool.power_pool));
    exercises.push({
      ...powerEx,
      session_sets: Math.max(3, sets - 1),
      reps: stage.allow_oly ? '3-5' : '4-6',
      load: 'moderate — focus on speed of movement',
      rpe: '7-8',
      notes: 'Do before main lifts when fresh, or after warm-up.',
    });
  }

  return exercises;
}

function buildAccessory(pool, stage, volumeMod) {
  const count = volumeMod >= 1.0 ? 3 : 2;
  const selected = shuffle(pool.accessory).slice(0, count);
  return selected.map(id => {
    const ex = getEx(id);
    return {
      ...ex,
      session_sets: 2,
      reps: '10-15',
      load: 'light-moderate',
      rpe: '6-7',
      notes: 'Controlled tempo, no failure',
    };
  });
}

function buildConditioning(pool, phase, stage) {
  if (phase.conditioning_load === 'minimal') return [];
  if (stage.development_stage === 'foundation') return [];

  const count = phase.conditioning_load === 'high' ? 2 : 1;
  const selected = shuffle(pool.conditioning).slice(0, count);
  return selected.map((id, i) => {
    const ex = getEx(id);
    const scheme = getConditioningScheme(ex, phase.conditioning_load);
    return {
      ...ex,
      session_sets: scheme.sets,
      reps: scheme.work,
      load: scheme.rest,
      notes: scheme.note,
    };
  });
}

function buildCooldown() {
  return [
    { ...getEx('e081'), session_sets: 1, reps: '60s per side', load: 'gentle pressure', notes: 'Roll out areas of soreness' },
    { ...getEx('e085'), session_sets: 1, reps: '45s per side', load: 'passive stretch', notes: 'Breathe into the stretch' },
    { ...getEx('e080'), session_sets: 1, reps: '60s per side', load: 'passive stretch', notes: 'Work through internal/external rotation' },
  ];
}

// ── Helpers ──

function getEx(id) {
  return exercises.find(e => e.id === id) || exercises[0];
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function lerp(a, b, t) { return a + (b - a) * Math.min(1, Math.max(0, t)); }

function describeLoad(intensityMod) {
  if (intensityMod >= 0.95) return '85-90% 1RM';
  if (intensityMod >= 0.85) return '75-85% 1RM';
  if (intensityMod >= 0.75) return '65-75% 1RM';
  return '50-65% 1RM';
}

function describeRPE(intensityMod) {
  if (intensityMod >= 0.95) return '8-9';
  if (intensityMod >= 0.85) return '7-8';
  if (intensityMod >= 0.75) return '6-7';
  return '5-6';
}

function getConditioningScheme(ex, load) {
  if (load === 'high') {
    return { sets: 6, work: '20s on', rest: 'Rest: 40s between', note: 'Max effort each interval' };
  }
  if (load === 'moderate') {
    return { sets: 4, work: '30s on', rest: 'Rest: 90s between', note: 'Sustainable hard pace' };
  }
  return { sets: 3, work: '4 min easy', rest: 'Rest: 2 min', note: 'Low intensity flush — keep HR < 140' };
}

function getSessionTitle(athlete, phase) {
  const phaseNames = {
    offseason:  'Off-Season Strength',
    preseason:  'Pre-Season Power',
    inseason:   'In-Season Maintenance',
    postseason: 'Post-Season Recovery',
  };
  return phaseNames[athlete.season_phase] || 'Training Session';
}
