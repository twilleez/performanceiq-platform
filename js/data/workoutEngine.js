/**
 * PerformanceIQ Elite Workout Engine — v2 (Enhanced)
 * ═══════════════════════════════════════════════════════════════
 *
 * ENHANCEMENTS OVER v1:
 *   1. MODULE TAXONOMY — 24 named training modules mapped to phases/tiers
 *      (speed_development, agility_cod, plyometrics, strength_for_speed,
 *       conditioning, hypertrophy, strength, functional_conditioning,
 *       hybrid_athlete, aesthetic_finisher, movement_screening,
 *       corrective_exercise, pain_free_strength, manual_therapy_integration,
 *       return_to_performance, vertical_jump, explosive_strength,
 *       speed_mechanics, sport_specific_movement, power_density,
 *       durability, jump_optimization, pain_to_performance)
 *
 *   2. MODULE-AWARE SESSION SELECTION — exercises are now tagged to
 *      modules rather than flat category buckets. The session resolver
 *      picks the correct module for each readiness tier, phase, and sport.
 *
 *   3. SESSION TEMPLATES — each module defines a canonical session
 *      structure (warmup → primary blocks → cooldown) that the generator
 *      follows, matching real coaching practice.
 *
 *   4. CONSTRAINT ENFORCEMENT — module constraints (e.g. "fresh CNS",
 *      "48-72hr spacing", "low fatigue") are checked against the athlete's
 *      current readiness and ACWR before a module is selected.
 *
 *   5. CNS-LOAD TAGGING — exercises carry a cnsLoad property ('high' |
 *      'moderate' | 'low') so the generator can gate high-CNS work behind
 *      adequate readiness.
 *
 *   6. PLYOMETRIC AMPLITUDE PROGRESSION — plyo exercises are tiered
 *      (low → medium → high) and the generator selects the correct tier
 *      based on readiness and ACWR, preventing dangerous load spikes.
 *
 *   7. PAIN-TO-PERFORMANCE PATHWAY — new recovery/return modules give
 *      athletes a progressive pain-free → controlled → full-intensity path.
 *
 *   8. GOAL-MODULE ALIGNMENT — goal injections (speed, strength, etc.) now
 *      reference the matching module's exercise pool and constraints, not a
 *      flat list.
 *
 *   9. DURABILITY MODULE — dedicated injury prevention block (tibialis,
 *      reverse sled, ATG progression) injected during deload and recovery
 *      sessions when appropriate.
 *
 *  10. SPORT-SPECIFIC MOVEMENT MODULE — sport_specific_movement replaces
 *      generic "agility" for in-season and pre-season phases.
 *
 * Evidence base:
 *   Bompa & Buzzichelli 2019 — Periodization: Theory & Methodology
 *   Gabbett TJ. BJSM 2016 — ACWR injury risk (sweet spot 0.8–1.3)
 *   Hulin et al. 2014, 2016 — EWMA superiority over rolling avg
 *   NSCA CSCS 2022 — Essentials of Strength & Conditioning
 *   Morin & Samozino 2016 — Mechanical basis of sprint & jump
 *   Triplett & Stone 2016 — Plyometric training for power
 *   IOC Consensus Statement 2016 — athlete load monitoring
 *   Halson SL. Sports Med 2014 — sleep as primary recovery indicator
 *   Buchheit & Laursen 2013 — HRV & autonomic monitoring
 *   Tom Brady TB12 Method — pliability-first programming
 *   NSCA LTAD Model — developmental-appropriate programming
 *
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

// ─────────────────────────────────────────────────────────────
// SECTION 1 — MODULE TAXONOMY
// Source: PIQ Training Module Spec (24 modules)
// Each module defines: focus, exercise_tags, progression, constraints,
// session_template, cnsLoad, and an internal priority score used
// when multiple modules compete for the same slot.
// ─────────────────────────────────────────────────────────────

export const TRAINING_MODULES = {
  speed_development: {
    label: 'Speed Development',
    focus: ['acceleration', 'max_velocity', 'mechanics'],
    exercise_tags: ['sprint', 'acceleration', 'maxV', 'drills'],
    progression: 'Increase distance or intensity weekly; maintain full recovery between reps.',
    constraints: ['low_fatigue', 'fresh_cns'],
    session_template: ['warmup', 'mechanics', 'acceleration_reps', 'maxV_reps', 'cooldown'],
    cnsLoad: 'high',
    priority: 10,
    minReadiness: 75,
    minACWR: 0.7,
    maxACWR: 1.35,
  },

  agility_cod: {
    label: 'Agility & Change of Direction',
    focus: ['deceleration', 'shin_angle', 'reactive_agility'],
    exercise_tags: ['COD', 'agility', 'reactive', 'decel'],
    progression: 'Increase complexity or speed; add reactive cues when mechanics are locked in.',
    constraints: ['moderate_fatigue_ok'],
    session_template: ['warmup', 'decel_drills', 'COD_patterns', 'reactive_drills'],
    cnsLoad: 'moderate',
    priority: 8,
    minReadiness: 55,
    minACWR: 0.6,
    maxACWR: 1.40,
  },

  plyometrics: {
    label: 'Plyometric Training',
    focus: ['reactive_strength', 'tendon_stiffness', 'elasticity'],
    exercise_tags: ['plyo_low', 'plyo_med', 'plyo_high'],
    progression: 'Low amplitude → medium → high; track ground contact time; do not progress amplitude if GCT is increasing.',
    constraints: ['48_72hr_spacing', 'low_volume'],
    session_template: ['warmup', 'low_amp', 'medium_amp', 'high_amp'],
    cnsLoad: 'high',
    priority: 9,
    minReadiness: 70,
    minACWR: 0.7,
    maxACWR: 1.30,
    // Amplitude gating by readiness — enforced in selectPlyoAmplitude()
    amplitudeGates: { high: 80, medium: 65, low: 45 },
  },

  strength_for_speed: {
    label: 'Strength for Speed',
    focus: ['posterior_chain', 'unilateral_strength', 'power'],
    exercise_tags: ['hinge', 'squat', 'split_squat', 'posterior_chain'],
    progression: 'Linear or undulating; low reps (3–6), high intent; avoid excessive fatigue before speed days.',
    constraints: ['avoid_fatigue_before_speed'],
    session_template: ['warmup', 'primary_lift', 'secondary_lift', 'accessories'],
    cnsLoad: 'high',
    priority: 9,
    minReadiness: 65,
    minACWR: 0.65,
    maxACWR: 1.40,
  },

  conditioning: {
    label: 'Conditioning',
    focus: ['alactic', 'tempo_runs', 'sport_specific'],
    exercise_tags: ['tempo', 'interval', 'sport_conditioning'],
    progression: 'Increase volume or density; maintain quality on each rep.',
    constraints: ['avoid_cns_fatigue'],
    session_template: ['warmup', 'tempo_runs', 'intervals'],
    cnsLoad: 'low',
    priority: 6,
    minReadiness: 45,
    minACWR: 0.5,
    maxACWR: 1.50,
  },

  hypertrophy: {
    label: 'Hypertrophy',
    focus: ['mechanical_tension', 'volume_progression'],
    exercise_tags: ['hypertrophy', 'isolation', 'compound'],
    progression: 'Increase sets or reps weekly (10–20 weekly sets per muscle group; Schoenfeld 2017).',
    constraints: ['avoid_overlap_with_cns_days'],
    session_template: ['warmup', 'compound', 'secondary', 'isolation'],
    cnsLoad: 'moderate',
    priority: 5,
    minReadiness: 55,
    minACWR: 0.6,
    maxACWR: 1.45,
  },

  strength: {
    label: 'Maximal Strength',
    focus: ['compound_lifts', 'RPE_based', 'low_rep'],
    exercise_tags: ['squat', 'bench', 'deadlift', 'OHP'],
    progression: 'Linear or RPE autoregulated; 1–5 reps, 80–95% intensity.',
    constraints: ['requires_equipment'],
    session_template: ['warmup', 'primary', 'secondary', 'accessories'],
    cnsLoad: 'high',
    priority: 9,
    minReadiness: 70,
    minACWR: 0.65,
    maxACWR: 1.35,
  },

  functional_conditioning: {
    label: 'Functional Conditioning',
    focus: ['sled', 'carries', 'circuits'],
    exercise_tags: ['sled', 'carry', 'conditioning'],
    progression: 'Increase load or distance; low technical skill requirement allows use on moderate-fatigue days.',
    constraints: ['low_skill'],
    session_template: ['warmup', 'sled', 'carries', 'circuit'],
    cnsLoad: 'low',
    priority: 5,
    minReadiness: 40,
    minACWR: 0.5,
    maxACWR: 1.55,
  },

  hybrid_athlete: {
    label: 'Hybrid Athlete',
    focus: ['strength_and_conditioning', 'mobility'],
    exercise_tags: ['strength', 'conditioning', 'mobility'],
    progression: 'Alternate intensities weekly; monitor HRV to detect accumulated fatigue.',
    constraints: ['avoid_overtraining'],
    session_template: ['strength_block', 'conditioning_block', 'mobility'],
    cnsLoad: 'moderate',
    priority: 6,
    minReadiness: 55,
    minACWR: 0.65,
    maxACWR: 1.40,
  },

  aesthetic_finisher: {
    label: 'Aesthetic Finisher',
    focus: ['pump', 'metabolic_stress'],
    exercise_tags: ['isolation', 'high_rep'],
    progression: 'Add sets or intensity techniques (supersets, dropsets).',
    constraints: ['end_of_session_only'],
    session_template: ['supersets', 'dropsets'],
    cnsLoad: 'low',
    priority: 3,
    minReadiness: 50,
    minACWR: 0.5,
    maxACWR: 1.60,
  },

  movement_screening: {
    label: 'Movement Screening',
    focus: ['hip', 'shoulder', 'ankle', 'breathing'],
    exercise_tags: ['assessment'],
    progression: 'Retest monthly; track asymmetries over time.',
    constraints: ['low_fatigue'],
    session_template: ['screen', 'notes'],
    cnsLoad: 'low',
    priority: 7,
    minReadiness: 30,
    minACWR: 0.0,
    maxACWR: 2.0,
  },

  corrective_exercise: {
    label: 'Corrective Exercise',
    focus: ['PRI', 'scapular_control', 'hip_shift'],
    exercise_tags: ['corrective', 'mobility', 'activation'],
    progression: 'Increase complexity only when the simpler pattern is pain-free and automatic.',
    constraints: ['low_load'],
    session_template: ['breathing', 'activation', 'integration'],
    cnsLoad: 'low',
    priority: 7,
    minReadiness: 25,
    minACWR: 0.0,
    maxACWR: 2.0,
  },

  pain_free_strength: {
    label: 'Pain-Free Strength',
    focus: ['tempo', 'reduced_ROM', 'unilateral'],
    exercise_tags: ['tempo', 'unilateral', 'pain_free'],
    progression: 'Increase ROM or load slowly; never push through pain.',
    constraints: ['no_pain'],
    session_template: ['warmup', 'controlled_lifts', 'stability'],
    cnsLoad: 'low',
    priority: 8,
    minReadiness: 25,
    minACWR: 0.0,
    maxACWR: 2.0,
  },

  manual_therapy_integration: {
    label: 'Manual Therapy Integration',
    focus: ['soft_tissue', 'joint_mob', 'activation'],
    exercise_tags: ['manual', 'activation'],
    progression: 'Move toward strength once soft tissue and joint mobility are addressed.',
    constraints: ['requires_therapist'],
    session_template: ['prep', 'activation', 'integration'],
    cnsLoad: 'low',
    priority: 9,
    minReadiness: 20,
    minACWR: 0.0,
    maxACWR: 2.0,
  },

  return_to_performance: {
    label: 'Return to Performance',
    focus: ['plyo_reintro', 'sprint_progression', 'load_tolerance'],
    exercise_tags: ['low_plyo', 'controlled_sprint'],
    progression: 'Gradual exposure — never progress to next intensity level if symptoms emerge.',
    constraints: ['monitor_pain'],
    session_template: ['warmup', 'controlled_plyo', 'controlled_sprint'],
    cnsLoad: 'moderate',
    priority: 10,
    minReadiness: 40,
    minACWR: 0.4,
    maxACWR: 1.20,
  },

  vertical_jump: {
    label: 'Vertical Jump Optimization',
    focus: ['approach', 'penultimate', 'reactive'],
    exercise_tags: ['jump', 'plyo', 'approach'],
    progression: 'Increase height or approach complexity; track jump height over 4-week blocks.',
    constraints: ['fresh_cns'],
    session_template: ['mechanics', 'reactive', 'approach_jumps'],
    cnsLoad: 'high',
    priority: 9,
    minReadiness: 75,
    minACWR: 0.7,
    maxACWR: 1.30,
  },

  explosive_strength: {
    label: 'Explosive Strength',
    focus: ['olympic_derivatives', 'medball', 'trapbar_jump'],
    exercise_tags: ['power', 'medball', 'olympic'],
    progression: 'Increase velocity or load; prioritize bar speed over absolute load.',
    constraints: ['low_fatigue'],
    session_template: ['warmup', 'power_lifts', 'medball'],
    cnsLoad: 'high',
    priority: 10,
    minReadiness: 72,
    minACWR: 0.7,
    maxACWR: 1.35,
  },

  speed_mechanics: {
    label: 'Speed Mechanics',
    focus: ['front_side', 'projection', 'stiffness'],
    exercise_tags: ['mechanics', 'drills'],
    progression: 'Increase speed or distance only when mechanics are sound.',
    constraints: ['fresh'],
    session_template: ['drills', 'short_sprints'],
    cnsLoad: 'moderate',
    priority: 8,
    minReadiness: 65,
    minACWR: 0.65,
    maxACWR: 1.40,
  },

  sport_specific_movement: {
    label: 'Sport-Specific Movement',
    focus: ['first_step', 'lateral', 'closeouts', 'break_steps'],
    exercise_tags: ['sport_movement'],
    progression: 'Increase speed or complexity; add defensive/offensive context for realism.',
    constraints: ['moderate_fatigue_ok'],
    session_template: ['movement_drills', 'reactive'],
    cnsLoad: 'moderate',
    priority: 8,
    minReadiness: 55,
    minACWR: 0.55,
    maxACWR: 1.45,
  },

  power_density: {
    label: 'Power Density (Contrast Training)',
    focus: ['cluster_sets', 'contrast_training', 'VBT'],
    exercise_tags: ['power', 'contrast'],
    progression: 'Increase velocity or reduce rest between potentiation and expression sets.',
    constraints: ['requires_equipment'],
    session_template: ['heavy_block', 'explosive_block'],
    cnsLoad: 'high',
    priority: 9,
    minReadiness: 78,
    minACWR: 0.75,
    maxACWR: 1.30,
  },

  durability: {
    label: 'Durability & Resilience',
    focus: ['knees_over_toes', 'tibialis', 'reverse_sled'],
    exercise_tags: ['durability', 'mobility', 'strength'],
    progression: 'Increase ROM or load slowly; build tissue tolerance over 8+ weeks.',
    constraints: ['low_fatigue'],
    session_template: ['reverse_sled', 'tibialis', 'ATG_split_squat'],
    cnsLoad: 'low',
    priority: 7,
    minReadiness: 30,
    minACWR: 0.0,
    maxACWR: 2.0,
  },

  jump_optimization: {
    label: 'Jump Optimization',
    focus: ['force_velocity', 'reactive', 'tendon'],
    exercise_tags: ['plyo', 'jump'],
    progression: 'Profile first (force vs. velocity dominant), then target the deficit.',
    constraints: ['fresh'],
    session_template: ['profiling', 'reactive', 'approach'],
    cnsLoad: 'high',
    priority: 9,
    minReadiness: 75,
    minACWR: 0.7,
    maxACWR: 1.30,
  },

  pain_to_performance: {
    label: 'Pain-to-Performance Pathway',
    focus: ['movement_audit', 'load_tolerance', 'return_to_sport'],
    exercise_tags: ['corrective', 'strength', 'plyo'],
    progression: 'Pain-free → controlled loading → full expression; never skip a stage.',
    constraints: ['monitor_symptoms'],
    session_template: ['corrective', 'strength', 'controlled_plyo'],
    cnsLoad: 'low',
    priority: 10,
    minReadiness: 25,
    minACWR: 0.0,
    maxACWR: 1.50,
  },
};


// ─────────────────────────────────────────────────────────────
// SECTION 2 — MODULE ROUTING TABLE
// Maps [readiness_tier][season_phase][sport_type] → ordered module list.
// The generator walks this list and picks the first module whose
// constraints pass for the athlete's current state.
//
// sport_type: 'explosive' (basketball, football, volleyball, track)
//             'endurance' (soccer)
//             'skill' (baseball)
// ─────────────────────────────────────────────────────────────

const MODULE_ROUTING = {
  // ── FULL READINESS (score ≥ 75, ACWR 0.8–1.3) ─────────────
  peak: {
    'Off-Season': {
      explosive: ['strength_for_speed', 'explosive_strength', 'plyometrics', 'speed_development', 'durability'],
      endurance:  ['strength_for_speed', 'conditioning',      'agility_cod',  'speed_mechanics',   'durability'],
      skill:      ['strength_for_speed', 'explosive_strength', 'speed_mechanics', 'agility_cod',   'durability'],
    },
    'Pre-Season': {
      explosive: ['speed_development', 'power_density', 'sport_specific_movement', 'plyometrics', 'durability'],
      endurance:  ['speed_mechanics',  'conditioning',   'sport_specific_movement', 'agility_cod', 'durability'],
      skill:      ['speed_mechanics',  'explosive_strength', 'sport_specific_movement', 'agility_cod', 'durability'],
    },
    'In-Season': {
      explosive: ['sport_specific_movement', 'explosive_strength', 'strength', 'durability'],
      endurance:  ['sport_specific_movement', 'conditioning',      'strength', 'durability'],
      skill:      ['sport_specific_movement', 'strength',          'agility_cod', 'durability'],
    },
    'Post-Season': {
      explosive: ['movement_screening', 'corrective_exercise', 'durability', 'pain_free_strength'],
      endurance:  ['movement_screening', 'corrective_exercise', 'durability', 'conditioning'],
      skill:      ['movement_screening', 'corrective_exercise', 'durability', 'pain_free_strength'],
    },
  },

  // ── STANDARD READINESS (score 55–74, ACWR 0.8–1.3) ─────────
  standard: {
    'Off-Season': {
      explosive: ['strength_for_speed', 'hypertrophy',  'agility_cod',  'functional_conditioning', 'durability'],
      endurance:  ['strength_for_speed', 'conditioning', 'agility_cod',  'durability'],
      skill:      ['strength_for_speed', 'hypertrophy',  'speed_mechanics', 'agility_cod', 'durability'],
    },
    'Pre-Season': {
      explosive: ['agility_cod', 'strength_for_speed', 'speed_mechanics', 'functional_conditioning', 'durability'],
      endurance:  ['agility_cod', 'conditioning',       'speed_mechanics', 'durability'],
      skill:      ['agility_cod', 'speed_mechanics',    'strength',        'durability'],
    },
    'In-Season': {
      explosive: ['sport_specific_movement', 'strength', 'agility_cod', 'durability'],
      endurance:  ['sport_specific_movement', 'conditioning', 'strength', 'durability'],
      skill:      ['sport_specific_movement', 'strength', 'corrective_exercise', 'durability'],
    },
    'Post-Season': {
      explosive: ['corrective_exercise', 'durability', 'hybrid_athlete'],
      endurance:  ['corrective_exercise', 'durability', 'conditioning'],
      skill:      ['corrective_exercise', 'durability', 'pain_free_strength'],
    },
  },

  // ── DELOAD / CAUTION (score 45–54 OR ACWR spike 1.3–1.5) ────
  deload: {
    'Off-Season': {
      explosive: ['durability', 'corrective_exercise', 'functional_conditioning', 'pain_free_strength'],
      endurance:  ['durability', 'corrective_exercise', 'conditioning',           'pain_free_strength'],
      skill:      ['durability', 'corrective_exercise', 'pain_free_strength'],
    },
    'Pre-Season': {
      explosive: ['durability', 'corrective_exercise', 'speed_mechanics', 'pain_free_strength'],
      endurance:  ['durability', 'corrective_exercise', 'conditioning',   'pain_free_strength'],
      skill:      ['durability', 'corrective_exercise', 'pain_free_strength'],
    },
    'In-Season': {
      explosive: ['durability', 'corrective_exercise', 'pain_free_strength', 'movement_screening'],
      endurance:  ['durability', 'corrective_exercise', 'pain_free_strength', 'movement_screening'],
      skill:      ['durability', 'corrective_exercise', 'pain_free_strength'],
    },
    'Post-Season': {
      explosive: ['movement_screening', 'durability', 'corrective_exercise', 'pain_to_performance'],
      endurance:  ['movement_screening', 'durability', 'corrective_exercise', 'pain_to_performance'],
      skill:      ['movement_screening', 'durability', 'corrective_exercise', 'pain_to_performance'],
    },
  },

  // ── RECOVERY (score < 45 OR ACWR danger > 1.5) ──────────────
  recovery: {
    _all: {
      _all: ['corrective_exercise', 'durability', 'movement_screening', 'pain_to_performance'],
    },
  },
};


// ─────────────────────────────────────────────────────────────
// SECTION 3 — SPORT TYPE CLASSIFIER
// ─────────────────────────────────────────────────────────────

const SPORT_TYPES = {
  basketball: 'explosive',
  football:   'explosive',
  volleyball: 'explosive',
  track:      'explosive',
  soccer:     'endurance',
  baseball:   'skill',
};

function getSportType(sport) {
  return SPORT_TYPES[(sport || '').toLowerCase()] || 'explosive';
}


// ─────────────────────────────────────────────────────────────
// SECTION 4 — READINESS TIER RESOLVER
// Maps readiness score + ACWR zone → session tier.
// Mirrors the logic in engines.js calcReadiness() but is kept
// local here so workoutEngine.js can operate independently
// when called with a pre-computed readiness object.
// ─────────────────────────────────────────────────────────────

/**
 * @param {Object} readiness — output of calcReadiness() from engines.js
 *   { score:Number, tier:'ready'|'caution'|'recovery', acwrZone:String, acwr:Number }
 * @returns {'peak'|'standard'|'deload'|'recovery'}
 */
export function resolveSessionTier(readiness) {
  const { score, tier, acwrZone, acwr } = readiness;

  // ACWR danger overrides all — complete rest only
  if (acwrZone === 'danger' || acwr > 1.50) return 'recovery';

  // Wellness-driven recovery
  if (tier === 'recovery' || score < 45) return 'recovery';

  // ACWR spike → protective deload regardless of wellness
  if (acwrZone === 'spike' || tier === 'caution') return 'deload';

  // Score-gated peak vs. standard
  return score >= 75 ? 'peak' : 'standard';
}


// ─────────────────────────────────────────────────────────────
// SECTION 5 — MODULE CONSTRAINT VALIDATOR
// Returns true if the athlete's current state satisfies
// the module's constraints.
// ─────────────────────────────────────────────────────────────

/**
 * @param {Object} module — entry from TRAINING_MODULES
 * @param {Object} ctx — { readinessScore, acwr, acwrZone, tier }
 * @returns {Boolean}
 */
function moduleConstraintsMet(module, ctx) {
  const { readinessScore, acwr, acwrZone } = ctx;

  // Readiness floor
  if (readinessScore < module.minReadiness) return false;

  // ACWR ceiling (don't assign high-CNS work at dangerous loads)
  if (module.cnsLoad === 'high' && (acwrZone === 'spike' || acwrZone === 'danger')) return false;

  // Module-specific ACWR bounds
  if (acwr !== null && (acwr < module.minACWR || acwr > module.maxACWR)) return false;

  // Constraint string checks
  const c = module.constraints || [];
  if (c.includes('fresh_cns') && readinessScore < 70)    return false;
  if (c.includes('low_fatigue') && readinessScore < 55)  return false;
  if (c.includes('no_pain'))                              /* coach/athlete must self-certify */ {}

  return true;
}


// ─────────────────────────────────────────────────────────────
// SECTION 6 — MODULE SELECTOR
// Walks the routing table and returns the best valid module key
// for this athlete's current state.
// ─────────────────────────────────────────────────────────────

/**
 * @param {String} tier — session tier from resolveSessionTier()
 * @param {String} phase — season phase label
 * @param {String} sport — sport name
 * @param {Object} ctx — constraint context { readinessScore, acwr, acwrZone }
 * @returns {String} moduleKey
 */
export function selectModule(tier, phase, sport, ctx) {
  const sportType = getSportType(sport);

  // Recovery tier always routes to universal table
  if (tier === 'recovery') {
    const candidates = MODULE_ROUTING.recovery._all._all;
    return candidates.find(k => moduleConstraintsMet(TRAINING_MODULES[k], ctx))
        || 'corrective_exercise';
  }

  const tierRoutes  = MODULE_ROUTING[tier]         || MODULE_ROUTING.standard;
  const phaseRoutes = tierRoutes[phase]             || tierRoutes['In-Season'] || tierRoutes['Off-Season'];
  const candidates  = phaseRoutes?.[sportType]      || phaseRoutes?.explosive   || [];

  const selected = candidates.find(k => moduleConstraintsMet(TRAINING_MODULES[k], ctx));
  return selected || 'corrective_exercise';
}


// ─────────────────────────────────────────────────────────────
// SECTION 7 — PLYOMETRIC AMPLITUDE GATING
// Evidence: Triplett & Stone 2016 — plyo volume/intensity must
// be matched to athlete readiness to avoid acute load spikes.
// ─────────────────────────────────────────────────────────────

/**
 * Returns the appropriate plyo amplitude for the session.
 * 'high' → max-effort reactive work (depth jumps, hurdle hops)
 * 'medium' → moderate (box jumps, lateral bounds)
 * 'low' → intro (pogos, ankle hops, squat jumps)
 *
 * @param {Number} readinessScore
 * @param {String} acwrZone
 * @returns {'high'|'medium'|'low'}
 */
export function selectPlyoAmplitude(readinessScore, acwrZone) {
  const gates = TRAINING_MODULES.plyometrics.amplitudeGates;
  if (acwrZone === 'spike' || acwrZone === 'danger') return 'low';
  if (readinessScore >= gates.high)   return 'high';
  if (readinessScore >= gates.medium) return 'medium';
  return 'low';
}


// ─────────────────────────────────────────────────────────────
// SECTION 8 — TB12 PLIABILITY PROTOCOLS (unchanged from v1)
// Based on Tom Brady TB12 Method.
// ─────────────────────────────────────────────────────────────

export const PLIABILITY_PROTOCOLS = {
  pre_workout: {
    label: 'Pre-Workout Pliability (TB12)',
    duration: '8–10 min',
    description: 'Rhythmic deep-tissue work to prepare muscles for training. Muscles should be soft and pliable before any loading.',
    note: 'Based on TB12 Method: "Pliability is the missing leg of performance training."',
    exercises: [
      { name: 'Foam Roll — Quads',              sets: 1, duration: '60 sec each leg',  cue: 'Roll slowly, pause on tight spots. Breathe through tension.' },
      { name: 'Foam Roll — Hamstrings',         sets: 1, duration: '60 sec each leg',  cue: 'Keep core engaged. Rotate leg inward/outward to hit all fibers.' },
      { name: 'Foam Roll — IT Band / Glutes',   sets: 1, duration: '60 sec each side', cue: 'Work from hip to knee. Pause on tender areas.' },
      { name: 'Foam Roll — Thoracic Spine',     sets: 1, duration: '60 sec',           cue: 'Arms crossed over chest. Extend over the roller at each segment.' },
      { name: 'Lacrosse Ball — Calves',         sets: 1, duration: '45 sec each',      cue: 'Cross one ankle over the other for added pressure.' },
      { name: 'Lacrosse Ball — Glutes/Piriformis', sets: 1, duration: '45 sec each',  cue: 'Figure-4 position. Find the tender spot and breathe.' },
    ],
  },
  post_workout: {
    label: 'Post-Workout Pliability (TB12)',
    duration: '10–15 min',
    description: 'Critical recovery work immediately after training. Restores muscle length and begins the recovery process.',
    note: 'TB12 principle: "Recovery is training. Post-workout pliability is non-negotiable."',
    exercises: [
      { name: 'Foam Roll — Full Body Flush',     sets: 1, duration: '2 min',            cue: 'Light pressure, continuous movement. Flush metabolic waste.' },
      { name: 'Hip Flexor Stretch (Kneeling)',   sets: 2, duration: '45 sec each side', cue: 'Posterior pelvic tilt. Feel the stretch in the front of the hip.' },
      { name: 'Pigeon Pose / Figure-4 Stretch',  sets: 2, duration: '60 sec each side', cue: 'Breathe deeply. Allow the hip to release progressively.' },
      { name: 'Doorway Chest Stretch',           sets: 2, duration: '30 sec',           cue: 'Elbows at 90°. Lean forward gently. No pain.' },
      { name: 'Thoracic Rotation (Quadruped)',   sets: 2, duration: '30 sec each side', cue: 'Rotate from mid-back. Stabilize through the planted arm.' },
      { name: 'Breathing Reset (Box 4-4-4-4)',   sets: 1, duration: '3 min',            cue: 'Inhale 4s — hold 4s — exhale 4s — hold 4s. Activates parasympathetic recovery.' },
    ],
  },
  daily_maintenance: {
    label: 'Daily Maintenance Pliability (TB12)',
    duration: '15–20 min',
    description: 'Recovery-day pliability to maintain muscle length and accelerate supercompensation.',
    exercises: [
      { name: 'Full Body Foam Roll',             sets: 1, duration: '10 min', cue: 'All major muscle groups. Spend extra time on yesterday\'s worked muscles.' },
      { name: 'Hip 90/90 Stretch',               sets: 2, duration: '60 sec each side', cue: 'Active breathing. Progress range as hip releases.' },
      { name: 'World\'s Greatest Stretch',       sets: 2, duration: '5 reps each side', cue: 'Lunge + thoracic rotation + reach. Full sequence on each rep.' },
      { name: 'Breathing Reset',                 sets: 1, duration: '5 min',  cue: 'Box breathing. Parasympathetic activation for recovery.' },
    ],
  },
};


// ─────────────────────────────────────────────────────────────
// SECTION 9 — WARMUP PROTOCOLS
// Matched to session intensity via module cnsLoad.
// ─────────────────────────────────────────────────────────────

export const WARMUP_PROTOCOLS = {
  // High-CNS session warmup — primes neuromuscular system
  speed: {
    label: 'Dynamic Warmup — Speed/Power',
    duration: '12–15 min',
    exercises: [
      { name: 'A-Skip',                   sets: 2, reps: '20m',         cue: 'High knee drive. Dorsiflexed foot. Rhythmic arm drive.' },
      { name: 'B-Skip',                   sets: 2, reps: '20m',         cue: 'Extend knee at top. Paw the ground back. Posture tall.' },
      { name: 'High Knees',               sets: 2, reps: '20m',         cue: 'Drive knee to hip height. Stay on balls of feet.' },
      { name: 'Lateral Hip Circles',      sets: 2, reps: '10 each dir', cue: 'Controlled. Full hip range.' },
      { name: 'Glute Bridge (BW)',        sets: 2, reps: '15',          cue: 'Activate glutes before loading. Full hip lock at top.' },
      { name: 'Build-Up Sprints (50–80%)', sets: 3, reps: '30m',        cue: 'Gradually accelerate to 80%. Prepare CNS for max-effort work.' },
    ],
  },
  // Strength session warmup — activates posterior chain
  strength: {
    label: 'Dynamic Warmup — Strength',
    duration: '10–12 min',
    exercises: [
      { name: 'World\'s Greatest Stretch', sets: 2, reps: '5 each side', cue: 'Lunge + rotation + reach. Full mobility circuit in one movement.' },
      { name: 'Band Pull-Apart',           sets: 3, reps: '20',          cue: 'Horizontal abduction. Scapular retraction. Shoulder health.' },
      { name: 'Hip Hinge (BW)',            sets: 2, reps: '10',          cue: 'Groove the hinge pattern before loading. Neutral spine.' },
      { name: 'Glute Bridge (BW)',         sets: 2, reps: '15',          cue: 'Prime the posterior chain before barbell work.' },
      { name: 'Goblet Squat (BW)',         sets: 2, reps: '10',          cue: 'Full depth. Elbows in. Upright torso. Motor pattern rehearsal.' },
    ],
  },
  // General/recovery warmup — gentle activation
  general: {
    label: 'General Activation Warmup',
    duration: '8–10 min',
    exercises: [
      { name: 'Light Walk or Jog',        sets: 1, reps: '3–5 min',    cue: 'Raise core temperature. RPE 2–3.' },
      { name: 'Leg Swings (Fwd/Back)',    sets: 2, reps: '10 each leg', cue: 'Dynamic hip mobility. Control the swing — no momentum.' },
      { name: 'Arm Circles',             sets: 2, reps: '10 each dir', cue: 'Full shoulder ROM. Gradually increase range.' },
      { name: 'Bodyweight Squat',        sets: 2, reps: '10',          cue: 'Full depth. Controlled. Assess any asymmetries.' },
      { name: 'Dead Bug',                sets: 2, reps: '8 each side', cue: 'Brace core. Opposite arm/leg extension. Lower back stays flat.' },
    ],
  },
};


// ─────────────────────────────────────────────────────────────
// SECTION 10 — COOLDOWN PROTOCOLS
// ─────────────────────────────────────────────────────────────

export const COOLDOWN_PROTOCOLS = {
  standard: {
    label: 'Standard Cooldown',
    duration: '8–10 min',
    exercises: [
      { name: 'Easy Walk / Jog',          sets: 1, reps: '3 min',       cue: 'HR recovery. RPE 2. Active flush.' },
      { name: 'Major Muscle Group Stretch', sets: 1, reps: '30 sec each', cue: 'Quads, hamstrings, hip flexors, calves. No bouncing.' },
      { name: 'Post-Workout Pliability',  sets: 1, reps: 'See protocol', cue: 'Full TB12 post-workout sequence.' },
    ],
  },
  extended: {
    label: 'Extended Recovery Cooldown',
    duration: '15–20 min',
    note: 'Used on high-intensity or high-volume sessions.',
    exercises: [
      { name: 'Easy Walk',                sets: 1, reps: '5 min',       cue: 'RPE 1–2. Parasympathetic shift.' },
      { name: 'Extended Static Stretching', sets: 1, reps: '60 sec each', cue: 'All major muscle groups. Extended holds for recovery-focused sessions.' },
      { name: 'Breathing Reset',          sets: 1, reps: '5 min',       cue: 'Box breathing 4-4-4-4. Activate parasympathetic system.' },
      { name: 'Post-Workout Pliability',  sets: 1, reps: 'Full protocol', cue: 'Full TB12 sequence.' },
    ],
  },
};


// ─────────────────────────────────────────────────────────────
// SECTION 11 — MODULE-TAGGED EXERCISE LIBRARY
// Exercises are tagged with their primary module(s) and a
// cnsLoad property. This replaces the flat category buckets
// from v1 and allows the generator to pull exercises that
// genuinely match the selected module's focus.
//
// Evidence: NSCA CSCS 2022 exercise selection guidelines;
// Morin & Samozino 2016 for sprint/jump categorisation.
// ─────────────────────────────────────────────────────────────

const MODULE_EXERCISE_LIBRARY = {

  // ── SPEED DEVELOPMENT ────────────────────────────────────
  speed_development: {
    basketball: [
      { name: '10-Yard Acceleration Sprint', sets: 6, reps: '1', load: 'Max effort', cnsLoad: 'high',
        cue: 'Drive phase: 45° lean, powerful arm drive, triple extension. Full rest (90–120s) between reps.' },
      { name: '20-Yard Flying Sprint',       sets: 4, reps: '1', load: 'Max velocity', cnsLoad: 'high',
        cue: 'Upright posture. Front-side mechanics. Minimal ground contact time.' },
      { name: 'Resisted Sprint (Sled)',      sets: 4, reps: '20 yds', load: 'Light — 10–15% BM', cnsLoad: 'high',
        cue: 'Maintain mechanics under load. No more than 10% velocity decrease (Morin & Samozino 2016).' },
    ],
    football: [
      { name: '10-Yard Burst',               sets: 6, reps: '1', load: 'Max effort', cnsLoad: 'high',
        cue: 'Low angle. Drive through the ground. Arm drive equals leg drive.' },
      { name: '40-Yard Dash (Build-Up)',     sets: 4, reps: '1', load: '80–90% effort', cnsLoad: 'high',
        cue: 'Drive phase focus — first 10 yards determine the 40. Upright by 20 yards.' },
      { name: 'Resisted Sprint (Band)',      sets: 4, reps: '20 yds', load: 'Light resistance band', cnsLoad: 'high',
        cue: 'Maintain mechanics under resistance. Do not let band alter stride pattern.' },
    ],
    soccer: [
      { name: '10-Yard Sprint',              sets: 6, reps: '1', load: 'Max effort', cnsLoad: 'high',
        cue: 'First step is the race. Explosive push from full plant. Triple extension.' },
      { name: 'Flying 20m',                  sets: 4, reps: '1', load: 'Max velocity', cnsLoad: 'high',
        cue: 'Upright sprint mechanics. Relax the face and hands. Stiffness comes from the ankle.' },
    ],
    track: [
      { name: 'Flying 20m Sprint',           sets: 5, reps: '1', load: 'Max velocity', cnsLoad: 'high',
        cue: 'Full warm-up. 30m build-up then flying 20m. Time every rep.' },
      { name: 'Wicket Runs',                 sets: 4, reps: '40m', load: 'Technical', cnsLoad: 'moderate',
        cue: 'Stride length and frequency work. Land under the COM on each step.' },
      { name: '30m Block Start',             sets: 5, reps: '1', load: 'Max effort', cnsLoad: 'high',
        cue: 'Set position: hips slightly above shoulders. Drive forward — not up — on the gun.' },
    ],
    volleyball: [
      { name: '5-Yard Burst',                sets: 6, reps: '1', load: 'Max effort', cnsLoad: 'high',
        cue: 'Explosive first step. Court speed. Full rest between reps.' },
    ],
    baseball: [
      { name: '90-Foot Sprint',              sets: 6, reps: '1', load: 'Max effort', cnsLoad: 'high',
        cue: 'Explosive start. Drive through the bag. Time each rep.' },
    ],
    _universal: [
      { name: '10-Yard Acceleration Sprint', sets: 5, reps: '1', load: 'Max effort', cnsLoad: 'high',
        cue: 'Drive phase: 45° lean, powerful arm drive, triple extension. Full rest.' },
    ],
  },

  // ── AGILITY & COD ────────────────────────────────────────
  agility_cod: {
    _universal: [
      { name: '5-10-5 Shuttle (Pro Agility)', sets: 4, reps: '1', load: 'Max effort', cnsLoad: 'moderate',
        cue: 'Drive off outside foot on cuts. Low shin angle on deceleration. Eyes up.' },
      { name: 'T-Drill',                      sets: 4, reps: '1', load: 'Max effort', cnsLoad: 'moderate',
        cue: 'Touch every cone. Lateral shuffle — do not cross feet. Sprint back.' },
      { name: 'Reactive Cone Drill',           sets: 5, reps: '1', load: 'Reactive', cnsLoad: 'moderate',
        cue: 'Partner or coach signals direction. First-step quickness is the goal.' },
      { name: 'Deceleration Drill (3-Step)',   sets: 4, reps: '5 each', load: 'BW', cnsLoad: 'low',
        cue: 'Sprint → brake into athletic stance. Shin angle controls stopping power (NSCA COD principles).' },
      { name: 'Defensive Slide × 15m',        sets: 4, reps: '2', load: 'BW', cnsLoad: 'low',
        cue: 'Stay low. Push — do not drag. Hips back and below shoulders.' },
    ],
  },

  // ── PLYOMETRICS (amplitude-gated) ────────────────────────
  plyometrics: {
    low: [
      { name: 'Ankle Hops',              sets: 3, reps: '15', load: 'BW', cnsLoad: 'low',
        cue: 'Stiff ankle. Minimal knee bend. Rapid ground contact. Triplett & Stone 2016: begin all new athletes here.' },
      { name: 'Squat Jump',              sets: 3, reps: '8',  load: 'BW', cnsLoad: 'low',
        cue: 'Full squat. Explode up. Soft landing — absorb through hip-knee-ankle sequence.' },
      { name: 'Standing Broad Jump',     sets: 3, reps: '5',  load: 'BW', cnsLoad: 'low',
        cue: 'Arm swing. Stick landing. Measure distance for progress tracking.' },
    ],
    medium: [
      { name: 'Box Jump',                sets: 4, reps: '5',  load: 'BW', cnsLoad: 'moderate',
        cue: 'Max height. Reset fully between reps. Step down — never jump down.' },
      { name: 'Lateral Bound',           sets: 4, reps: '6 each', load: 'BW', cnsLoad: 'moderate',
        cue: 'Single-leg takeoff. Stick landing. Build distance progressively.' },
      { name: 'Depth Jump (Low Box)',    sets: 3, reps: '5',  load: 'BW (30cm box)', cnsLoad: 'moderate',
        cue: 'Step off — do not jump off. Minimal GCT. Immediate vertical jump.' },
    ],
    high: [
      { name: 'Depth Jump (Full)',       sets: 4, reps: '5',  load: 'BW (45–60cm)', cnsLoad: 'high',
        cue: 'Elite reactive strength drill. GCT < 250ms target. Full jump after contact.' },
      { name: 'Hurdle Hop Series',       sets: 4, reps: '6 hurdles', load: 'BW', cnsLoad: 'high',
        cue: 'Continuous. Minimal GCT. High amplitude. Tendon stiffness focus.' },
      { name: 'Reactive Drop Jump',      sets: 3, reps: '6',  load: 'BW', cnsLoad: 'high',
        cue: 'Drop. React immediately. Maximum height on jump. Track GCT if possible.' },
    ],
  },

  // ── STRENGTH FOR SPEED ───────────────────────────────────
  strength_for_speed: {
    _universal: [
      { name: 'Trap Bar Deadlift',       sets: 4, reps: '4', load: '75–82%', cnsLoad: 'high',
        cue: 'Controlled descent, explosive ascent. Posterior chain — the engine of sprint speed.' },
      { name: 'Bulgarian Split Squat',   sets: 3, reps: '6 each', load: 'Moderate', cnsLoad: 'high',
        cue: '90° front knee, upright torso. Unilateral strength transfers directly to sprint force.' },
      { name: 'Nordic Hamstring Curl',   sets: 3, reps: '5', load: 'BW', cnsLoad: 'moderate',
        cue: '4-second eccentric descent. Evidence: Petersen et al. 2011 — 51% reduction in hamstring injury.' },
      { name: 'Hip Thrust',              sets: 4, reps: '6', load: 'Heavy', cnsLoad: 'moderate',
        cue: 'Full hip lock at top. 1-sec pause. Glute force = sprint propulsion force.' },
      { name: 'Single-Leg RDL',          sets: 3, reps: '8 each', load: 'Moderate', cnsLoad: 'moderate',
        cue: 'Balance challenge. Hinge on standing leg. Proprioception + posterior chain in one.' },
    ],
  },

  // ── EXPLOSIVE STRENGTH ───────────────────────────────────
  explosive_strength: {
    _universal: [
      { name: 'Hang Power Clean',        sets: 4, reps: '3', load: '70–78%', cnsLoad: 'high',
        cue: 'Triple extension: ankle → knee → hip. Pull under the bar. Catch in quarter-squat.' },
      { name: 'Trap Bar Jump',           sets: 4, reps: '4', load: 'Light (20–30% BM)', cnsLoad: 'high',
        cue: 'Maximal intent every rep. Bar speed > absolute load. VBT target: > 1.5 m/s.' },
      { name: 'Med Ball Slam',           sets: 4, reps: '8', load: '6–10 lb', cnsLoad: 'moderate',
        cue: 'Full hip extension overhead. Slam with intent. Total-body power expression.' },
      { name: 'Med Ball Rotational Throw', sets: 3, reps: '6 each', load: '8–12 lb', cnsLoad: 'moderate',
        cue: 'Load the hip. Rotate from hips — not arms. Wall or partner.' },
      { name: 'Broad Jump',              sets: 4, reps: '5', load: 'BW', cnsLoad: 'high',
        cue: 'Arm swing. Two-foot takeoff. Stick landing. Horizontal power production.' },
    ],
  },

  // ── STRENGTH ─────────────────────────────────────────────
  strength: {
    _universal: [
      { name: 'Back Squat',              sets: 4, reps: '4', load: '78–85%', cnsLoad: 'high',
        cue: 'Brace 360°. Break parallel. Drive knees out. Explosive concentric intent.' },
      { name: 'Bench Press',             sets: 4, reps: '4', load: '78–85%', cnsLoad: 'high',
        cue: 'Full leg drive. Packed shoulders. Controlled descent — press explosively.' },
      { name: 'Trap Bar Deadlift',       sets: 4, reps: '4', load: '80–87%', cnsLoad: 'high',
        cue: 'Hip-dominant. Brace hard. Explosive ascent. Reset each rep.' },
      { name: 'Bent-Over Row',           sets: 3, reps: '6', load: 'Moderate-Heavy', cnsLoad: 'moderate',
        cue: 'Horizontal pull. Scapular retraction at top. Core braced throughout.' },
    ],
  },

  // ── SPORT-SPECIFIC MOVEMENT ──────────────────────────────
  sport_specific_movement: {
    basketball: [
      { name: 'Defensive Slide Series',  sets: 4, reps: '2 × 15m', load: 'BW', cnsLoad: 'moderate',
        cue: 'Stay low. Push with outside foot. Eyes on the ball. Simulate game speed.' },
      { name: 'First-Step Closeout',     sets: 5, reps: '5 each dir', load: 'BW', cnsLoad: 'moderate',
        cue: 'Explosive first step to contest. Chop feet at contest — do not fly past.' },
      { name: 'Jab-Step Reaction Drill', sets: 4, reps: '30 sec', load: 'BW', cnsLoad: 'moderate',
        cue: 'React to jab. Stay in front. Lateral quickness is the defensive skill.' },
    ],
    football: [
      { name: 'Linebacker Drop Drill',   sets: 4, reps: '5 each', load: 'BW', cnsLoad: 'moderate',
        cue: 'Open hips. Cross-over step. Sink and redirect. Position-specific.' },
      { name: '5-Yard Route Cut',        sets: 5, reps: '3 each dir', load: 'BW', cnsLoad: 'moderate',
        cue: 'Plant and cut. Explosive re-acceleration out of the break.' },
      { name: 'Mirror Drill',            sets: 4, reps: '30 sec', load: 'BW', cnsLoad: 'moderate',
        cue: 'Reactive. Stay in athletic stance. Change direction faster than the ballcarrier.' },
    ],
    soccer: [
      { name: 'Dribble + Accelerate',    sets: 5, reps: '20m', load: 'Ball', cnsLoad: 'moderate',
        cue: 'Ball close. Explosive sprint on cue. Simulates match transition moments.' },
      { name: 'Defensive Press Drill',   sets: 4, reps: '30 sec', load: 'BW', cnsLoad: 'moderate',
        cue: 'Jockey — contain — press. Defensive footwork patterns.' },
    ],
    volleyball: [
      { name: 'Approach Jump Series',    sets: 5, reps: '8 jumps', load: 'BW', cnsLoad: 'high',
        cue: 'Consistent penultimate step. Max jump height every rep. Arm swing is critical.' },
      { name: '5-Yard Shuffle Sprint',   sets: 5, reps: '1', load: 'Max effort', cnsLoad: 'moderate',
        cue: 'Defensive range. Lateral quickness. Full rest.' },
    ],
    baseball: [
      { name: 'Reaction to Pitch Drill', sets: 5, reps: '5', load: 'BW', cnsLoad: 'moderate',
        cue: 'First step on ball identification. Bat speed starts with hip rotation.' },
      { name: '90-Foot Baserunning Drill', sets: 4, reps: '2', load: 'Max effort', cnsLoad: 'moderate',
        cue: 'Explosive from the bag. Round the base — or go through it — decision-making.' },
    ],
    track: [
      { name: 'Block Start Drills',      sets: 5, reps: '20m', load: 'Max effort', cnsLoad: 'high',
        cue: 'Hips above shoulders in set. Drive forward. Do not stand up early.' },
    ],
    _universal: [
      { name: 'Reactive Agility Drill',  sets: 5, reps: '30 sec', load: 'BW', cnsLoad: 'moderate',
        cue: 'React to visual or auditory cue. Randomize direction. Game-speed movement.' },
    ],
  },

  // ── DURABILITY ───────────────────────────────────────────
  durability: {
    _universal: [
      { name: 'Reverse Sled Drag',       sets: 3, reps: '20m', load: 'Light', cnsLoad: 'low',
        cue: 'Backwards walking with sled. Knee-over-toe loading. Tendon and quad conditioning.' },
      { name: 'Tibialis Raise',          sets: 3, reps: '20', load: 'BW or Ankle Weight', cnsLoad: 'low',
        cue: 'Heel on step or slant board. Dorsiflexion. Tibialis anterior strengthening — shin splint prevention.' },
      { name: 'ATG Split Squat',         sets: 3, reps: '8 each', load: 'BW/Light Load', cnsLoad: 'low',
        cue: 'Knee far over toe. Full ROM. Ben Patrick (ATG): "Knee strength = athletic longevity."' },
      { name: 'Single-Leg Calf Raise',   sets: 3, reps: '15', load: 'BW or Added Load', cnsLoad: 'low',
        cue: 'Full ROM. Slow eccentric (3 sec down). Achilles tendon resilience.' },
      { name: 'Hamstring Curl (Nordic)', sets: 3, reps: '5', load: 'BW', cnsLoad: 'low',
        cue: '4-second eccentric. Evidence: 51% reduction in hamstring strain (Petersen et al. 2011).' },
      { name: 'Copenhagen Plank',        sets: 3, reps: '20 sec each', load: 'BW', cnsLoad: 'low',
        cue: 'Hip adductor strengthening. Evidence-based groin injury prevention protocol.' },
    ],
  },

  // ── CORRECTIVE EXERCISE ──────────────────────────────────
  corrective_exercise: {
    _universal: [
      { name: '90-90 Breathing (PRI)',   sets: 3, reps: '5 breaths', load: 'BW', cnsLoad: 'low',
        cue: 'Feet on wall. Posterior pelvic tilt. Exhale fully. Re-establish respiratory mechanics.' },
      { name: 'Dead Bug',                sets: 3, reps: '8 each side', load: 'BW', cnsLoad: 'low',
        cue: 'Brace core. Opposite arm/leg extension. Lower back stays flat against the floor.' },
      { name: 'Band Clamshell',          sets: 3, reps: '20 each', load: 'Light Band', cnsLoad: 'low',
        cue: 'Glute med activation. No hip rotation. Slow and controlled.' },
      { name: 'Scapular Wall Slide',     sets: 3, reps: '10', load: 'BW', cnsLoad: 'low',
        cue: 'Maintain contact with wall throughout. Upward rotation of scapula. Overhead health.' },
      { name: 'Thoracic Rotation (Quadruped)', sets: 2, reps: '10 each', load: 'BW', cnsLoad: 'low',
        cue: 'Rotate from mid-back. Stabilize through the planted arm. No lumbar compensation.' },
    ],
  },

  // ── PAIN-FREE STRENGTH ───────────────────────────────────
  pain_free_strength: {
    _universal: [
      { name: 'Tempo Goblet Squat (3-1-3)', sets: 3, reps: '8', load: 'Light', cnsLoad: 'low',
        cue: '3 sec down — 1 sec pause — 3 sec up. Slow tempo builds tissue tolerance safely.' },
      { name: 'Unilateral Hip Hinge (BW)',  sets: 3, reps: '10 each', load: 'BW', cnsLoad: 'low',
        cue: 'No load until pain-free through full ROM. Groove the pattern.' },
      { name: 'Band Pull-Apart',            sets: 3, reps: '20', load: 'Light Band', cnsLoad: 'low',
        cue: 'Horizontal abduction. Scapular health. Pain-free shoulder rehab entry point.' },
      { name: 'Wall Sit (Isometric)',       sets: 3, reps: '30–45 sec', load: 'BW', cnsLoad: 'low',
        cue: 'Isometric loading reduces pain acutely (Rio et al. 2015). 70° knee angle.' },
      { name: 'Hip Thrust (BW or Light)',   sets: 3, reps: '15', load: 'BW/Light', cnsLoad: 'low',
        cue: 'Full hip extension. Pain-free loading of glutes and hamstrings.' },
    ],
  },

  // ── RETURN TO PERFORMANCE ────────────────────────────────
  return_to_performance: {
    _universal: [
      { name: 'Controlled Broad Jump (50%)', sets: 3, reps: '4', load: 'Half effort', cnsLoad: 'low',
        cue: 'Half intensity. Assess landing mechanics. Any pain → stop and regress.' },
      { name: 'Walk-Jog-Run Progression',   sets: 1, reps: '10 min', load: 'Progressive', cnsLoad: 'low',
        cue: '2 min walk → 2 min jog → 2 min run → assess. Pain-free at each level.' },
      { name: 'Controlled Sprint (60%)',    sets: 4, reps: '20m', load: '60% effort', cnsLoad: 'moderate',
        cue: 'Controlled speed. Assess mechanics and symptoms. No sharp changes of direction yet.' },
      { name: 'Reactive Step (Slow Cue)',   sets: 3, reps: '6 each dir', load: 'BW', cnsLoad: 'low',
        cue: 'Slow reaction speed. Reintroduce lateral movement. Monitor for symptom provocation.' },
    ],
  },

  // ── VERTICAL JUMP / JUMP OPTIMIZATION ───────────────────
  vertical_jump: {
    _universal: [
      { name: 'Approach Jump (Max)',       sets: 5, reps: '6', load: 'BW', cnsLoad: 'high',
        cue: 'Consistent penultimate step. Arm swing drives force production. Max height every rep.' },
      { name: 'Drop-Stick (Reactive)',     sets: 4, reps: '6', load: 'BW', cnsLoad: 'high',
        cue: 'Minimal GCT. Jump immediately on contact. Builds elastic power.' },
      { name: 'Single-Leg Jump to Box',    sets: 3, reps: '5 each', load: 'BW', cnsLoad: 'moderate',
        cue: 'Unilateral power expression. Stick landing. Progress box height as strength improves.' },
    ],
  },

  // ── POWER DENSITY (CONTRAST TRAINING) ───────────────────
  power_density: {
    _universal: [
      { name: 'Back Squat (Heavy)',        sets: 3, reps: '3', load: '82–87%', cnsLoad: 'high',
        cue: 'PAP primer — heavy lift fires high-threshold motor units. Rest 3–5 min before jumps.' },
      { name: 'Box Jump (Post-PAP)',       sets: 3, reps: '5', load: 'BW', cnsLoad: 'high',
        cue: 'Express the PAP effect. Max height. Use the neural drive from the heavy squat.' },
      { name: 'Trap Bar Deadlift (Heavy)', sets: 3, reps: '3', load: '82–87%', cnsLoad: 'high',
        cue: 'Heavy hinge for PAP. Followed immediately by trap bar jump to express power.' },
      { name: 'Trap Bar Jump (Post-PAP)', sets: 3, reps: '4', load: '20–30% BM', cnsLoad: 'high',
        cue: 'Maximal bar velocity. VBT target > 1.5 m/s. Contrast with the heavy pull above.' },
    ],
  },

  // ── CONDITIONING ─────────────────────────────────────────
  conditioning: {
    basketball: [
      { name: 'Basketball Sprint Intervals', sets: 6, reps: '1', load: 'Max — full court', cnsLoad: 'low',
        cue: 'Full-court × 6. 30s rest. Mirrors match sprint density (Stølen et al. 2005).' },
      { name: '17-Cone Drill (17 in 60)',    sets: 4, reps: '1', load: 'Max', cnsLoad: 'low',
        cue: 'NBA benchmark conditioning test. 17 baseline-to-baseline runs in 60 seconds.' },
    ],
    soccer: [
      { name: 'Aerobic Tempo Run',           sets: 1, reps: '20 min', load: '65–70% max HR', cnsLoad: 'low',
        cue: 'Conversational pace. Nasal breathing if possible. Maffetone aerobic base building.' },
      { name: '30-15 Intermittent Fitness',  sets: 15, reps: '30s on / 15s off', load: 'RPE 8–9', cnsLoad: 'low',
        cue: 'Buchheit 2008 protocol. Optimizes VO2max and match-specific conditioning.' },
    ],
    football: [
      { name: 'Gassers × 4',                sets: 4, reps: '1', load: 'Max effort', cnsLoad: 'low',
        cue: 'Side-to-side across the field × 4. Rest = 2 min. Football conditioning standard.' },
    ],
    track: [
      { name: '400m Tempo Runs',             sets: 4, reps: '1', load: '75% effort', cnsLoad: 'low',
        cue: 'Aerobic capacity at race pace minus ~20%. 3 min rest.' },
    ],
    _universal: [
      { name: 'HIIT Intervals (30/30)',      sets: 8, reps: '30s on / 30s off', load: '85–90% effort', cnsLoad: 'low',
        cue: 'Stølen et al. (2005): High-intensity intervals mirror match demands.' },
      { name: 'Tempo Runs × 10',            sets: 10, reps: '100m', load: '65–70%', cnsLoad: 'low',
        cue: 'Alactic + aerobic base. 30s rest. Not sprint — controlled tempo.' },
    ],
  },

  // ── FUNCTIONAL CONDITIONING ──────────────────────────────
  functional_conditioning: {
    _universal: [
      { name: 'Sled Push × 20m',            sets: 4, reps: '1', load: 'Moderate', cnsLoad: 'low',
        cue: 'Low angle. Drive through heels. Full hip extension on every step.' },
      { name: 'Farmer Carry × 40m',         sets: 4, reps: '1', load: 'Challenging but unbroken', cnsLoad: 'low',
        cue: 'Tall posture. Packed shoulders. Core braced. Grip and core conditioning.' },
      { name: 'Sled Drag (Backward)',        sets: 3, reps: '20m', load: 'Moderate', cnsLoad: 'low',
        cue: 'Knee-over-toe mechanics. Quad and tendon conditioning. Low technical demand.' },
    ],
  },

  // ── MOVEMENT SCREENING ───────────────────────────────────
  movement_screening: {
    _universal: [
      { name: 'Overhead Squat Assessment',   sets: 1, reps: '5', load: 'BW/Dowel', cnsLoad: 'low',
        cue: 'Identify ankle, hip, or thoracic restriction. Note asymmetries. Retest monthly.' },
      { name: 'Single-Leg Squat (Pistol Progression)', sets: 1, reps: '5 each', load: 'BW', cnsLoad: 'low',
        cue: 'Assess hip control, knee tracking, and trunk stability. Note left-right differences.' },
      { name: 'Hip Hinge Screen',            sets: 1, reps: '5', load: 'Dowel on spine', cnsLoad: 'low',
        cue: 'Dowel maintains 3 contact points. Identifies hip hinge vs. spinal flexion pattern.' },
      { name: 'Shoulder Mobility Screen',    sets: 1, reps: '3', load: 'BW', cnsLoad: 'low',
        cue: 'Apley scratch test. Note side-to-side differences. Flag for corrective follow-up.' },
    ],
  },
};


// ─────────────────────────────────────────────────────────────
// SECTION 12 — EXERCISE SELECTOR
// Pulls exercises for a given module and sport. Falls back to
// _universal pool if no sport-specific exercises exist.
// ─────────────────────────────────────────────────────────────

/**
 * @param {String} moduleKey — key in MODULE_EXERCISE_LIBRARY
 * @param {String} sport — sport name (lowercase)
 * @param {String} amplitude — for plyometrics: 'low'|'medium'|'high'
 * @param {Number} dayOffset — deterministic day-based variety
 * @param {Number} count — how many exercises to select
 * @returns {Array<Object>} exercises
 */
function selectExercises(moduleKey, sport, amplitude, dayOffset, count) {
  const lib = MODULE_EXERCISE_LIBRARY[moduleKey];
  if (!lib) return [];

  let pool;
  if (moduleKey === 'plyometrics') {
    pool = lib[amplitude] || lib.low;
  } else {
    pool = lib[sport.toLowerCase()] || lib._universal || [];
  }

  if (!pool.length) return [];

  const selected = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    selected.push({ ...pool[(dayOffset + i) % pool.length] });
  }
  return selected;
}


// ─────────────────────────────────────────────────────────────
// SECTION 13 — GOAL MODIFIER INJECTIONS
// Injects 1–2 goal-specific exercises into the session.
// Evidence-based selection from NSCA and sport science literature.
// References module constraints to avoid fatigue conflicts.
// ─────────────────────────────────────────────────────────────

const GOAL_INJECTIONS = {
  strength: [
    { name: 'Barbell Back Squat',     sets: 3, reps: '5', load: 'Heavy (80–85%)', cnsLoad: 'high',
      cue: 'Primary lower-body strength driver. Drive through heels. Explosive concentric.' },
    { name: 'Trap Bar Deadlift',      sets: 3, reps: '5', load: 'Heavy (80–85%)', cnsLoad: 'high',
      cue: 'Neutral spine. Full hip extension. Reset between reps. Hip power = sprint power.' },
  ],
  speed: [
    { name: '10-Yard Acceleration Sprint', sets: 6, reps: '1', load: 'Max effort', cnsLoad: 'high',
      cue: 'Drive phase: 45° lean, powerful arm drive, triple extension. Full rest between reps.' },
    { name: 'Resisted Sprint (Band)',  sets: 4, reps: '20 yds', load: 'Light band', cnsLoad: 'high',
      cue: 'Maintain mechanics under resistance. Max 10% velocity loss (Morin & Samozino 2016).' },
  ],
  endurance: [
    { name: 'Aerobic Tempo Run',      sets: 1, reps: '15–20 min', load: '65–70% max HR', cnsLoad: 'low',
      cue: 'Conversational pace. Nasal breathing if possible. Maffetone aerobic base method.' },
  ],
  flexibility: [
    { name: 'Hip Flexor Stretch (90/90)', sets: 2, reps: '60 sec/side', load: 'BW', cnsLoad: 'low',
      cue: 'Tight hip flexors limit sprint mechanics and increase lower back stress. Breathe and hold.' },
    { name: 'Thoracic Rotation Stretch',  sets: 2, reps: '10/side', load: 'BW', cnsLoad: 'low',
      cue: 'Rotate from mid-back. Improves throwing, swinging, and overhead mechanics.' },
  ],
  vertical: [
    { name: 'Approach Jump (Max)',     sets: 5, reps: '6', load: 'BW', cnsLoad: 'high',
      cue: 'Consistent penultimate step. Arm swing drives force production. Max height every rep.' },
    { name: 'Depth Jump → Approach',   sets: 3, reps: '4', load: 'BW (45cm)', cnsLoad: 'high',
      cue: 'Reactive strength → approach jump. Combines elastic power with approach mechanics.' },
  ],
  power: [
    { name: 'Hang Power Clean',        sets: 4, reps: '3', load: '70–78%', cnsLoad: 'high',
      cue: 'Triple extension. Explosive. Elbows high in the catch. Power output = sport performance.' },
    { name: 'Trap Bar Jump',           sets: 4, reps: '4', load: 'Light (20–30% BM)', cnsLoad: 'high',
      cue: 'Max bar velocity. Express power — do not chase load.' },
  ],
  conditioning: [
    { name: 'HIIT Intervals (30/30)',  sets: 8, reps: '30s on / 30s off', load: '85–90% effort', cnsLoad: 'low',
      cue: 'Stølen et al. (2005): High-intensity intervals mirror match demands.' },
  ],
};

/**
 * Injects goal-specific exercises into the session.
 * Only injects high-CNS goal exercises if readiness permits.
 *
 * @param {Object} workout — from generateTodayWorkout
 * @param {String} primaryGoal
 * @param {Array<String>} secondaryGoals
 * @param {Object} readiness — { score, tier, acwrZone }
 * @returns {Object} modified workout
 */
export function applyGoalModifiers(workout, primaryGoal, secondaryGoals, readiness) {
  const goals = [primaryGoal, ...(secondaryGoals || [])].filter(Boolean);
  const injected = [];

  for (const goal of goals.slice(0, 2)) {
    const pool = GOAL_INJECTIONS[goal] || [];
    if (!pool.length) continue;

    const ex = pool[0];

    // Block high-CNS injections if athlete is in caution/recovery
    if (ex.cnsLoad === 'high' && (readiness.tier === 'recovery' || readiness.tier === 'caution')) {
      // Offer the second exercise if available and lower CNS load
      const alt = pool.find(e => e.cnsLoad !== 'high');
      if (alt) injected.push({ ...alt, goalTag: goal });
    } else {
      injected.push({ ...ex, goalTag: goal });
    }
  }

  return {
    ...workout,
    exercises: [...(workout.exercises || []), ...injected],
  };
}


// ─────────────────────────────────────────────────────────────
// SECTION 14 — READINESS ADAPTATION LAYER
// Scales the generated workout to the athlete's readiness score.
// Evidence: NSCA load management principles; Halson 2014.
// ─────────────────────────────────────────────────────────────

/**
 * @param {Object} workout — base workout
 * @param {Number} readinessScore
 * @returns {Object} adapted workout
 */
export function adaptWorkoutToReadiness(workout, readinessScore) {
  if (readinessScore >= 85) {
    return {
      ...workout,
      intensityNote: 'High Readiness — Train at full prescribed intensity. Push hard on primary exercises.',
      intensityMultiplier: 1.0,
      rpeTarget: '7–8',
      badge: { label: 'Full Intensity', color: '#22c955' },
    };
  } else if (readinessScore >= 70) {
    return {
      ...workout,
      intensityNote: 'Moderate Readiness — Train at 85–90% of prescribed load. Technique focus.',
      intensityMultiplier: 0.88,
      rpeTarget: '6–7',
      badge: { label: 'Moderate Intensity', color: '#f59e0b' },
    };
  } else if (readinessScore >= 55) {
    return {
      ...workout,
      intensityNote: 'Low-Moderate Readiness — Reduce volume by 20%. Movement quality over load.',
      intensityMultiplier: 0.75,
      rpeTarget: '5–6',
      badge: { label: 'Reduced Volume', color: '#f59e0b' },
    };
  } else {
    return {
      ...workout,
      intensityNote: 'Low Readiness — Recovery session only. Pliability, mobility, and light movement. No heavy loading.',
      intensityMultiplier: 0.0,
      rpeTarget: '3–4',
      badge: { label: 'Recovery Day', color: '#ef4444' },
      isRecoveryDay: true,
    };
  }
}


// ─────────────────────────────────────────────────────────────
// SECTION 15 — SESSION DURATION ESTIMATOR
// ─────────────────────────────────────────────────────────────

function estimateDuration(exercises, tier) {
  if (!exercises || !exercises.length) return 45;
  const sets = exercises.reduce((s, e) => s + (parseInt(e.sets) || 3), 0);
  const base = Math.round(sets * 3.5 + 15); // ~3.5 min per set + warmup
  const caps = { peak: 70, standard: 55, deload: 40, recovery: 30 };
  return Math.min(base, caps[tier] || 55);
}


// ─────────────────────────────────────────────────────────────
// SECTION 16 — PHASE VOLUME/INTENSITY MULTIPLIERS
// Based on Bompa & Buzzichelli 2019 periodization model.
// ─────────────────────────────────────────────────────────────

const PHASE_MULTIPLIERS = {
  'Pre-Season':  { volumeMultiplier: 1.05, intensityMultiplier: 1.00, rpeLabel: '7–9 RPE' },
  'In-Season':   { volumeMultiplier: 0.80, intensityMultiplier: 0.85, rpeLabel: '6–7 RPE' },
  'Post-Season': { volumeMultiplier: 0.60, intensityMultiplier: 0.70, rpeLabel: '5–6 RPE' },
  'Off-Season':  { volumeMultiplier: 1.20, intensityMultiplier: 0.90, rpeLabel: '6–8 RPE' },
};


// ─────────────────────────────────────────────────────────────
// SECTION 17 — MAIN DAILY WORKOUT GENERATOR
// The primary export. Replaces generateTodayWorkout() from v1.
//
// Key improvements over v1:
//   - Module-aware session construction (not flat category buckets)
//   - Constraint-validated module selection
//   - Plyo amplitude gating
//   - CNS-load-aware goal injection
//   - Correct session template structure per module
//
// @param {String} sport
// @param {String} compPhase — 'off_season'|'pre_season'|'in_season'|'post_season'
// @param {String} trainingLevel — 'beginner'|'intermediate'|'advanced'
// @param {Object} readiness — output of calcReadiness() from engines.js
// @param {Number} dayOfWeek — 0=Sun … 6=Sat
// @param {String} primaryGoal
// @param {Array<String>} secondaryGoals
// @returns {Object} workout
// ─────────────────────────────────────────────────────────────

export function generateTodayWorkout(
  sport,
  compPhase,
  trainingLevel,
  readiness,
  dayOfWeek,
  primaryGoal,
  secondaryGoals,
) {
  // Normalize inputs
  const sportNorm  = (sport || 'basketball').toLowerCase();
  const phaseLabel = _normalizePhase(compPhase);
  const dayOffset  = Math.floor(Date.now() / 86_400_000) + dayOfWeek;

  // Resolve session tier from readiness state
  const tier = resolveSessionTier(readiness);

  // Phase volume/intensity configuration
  const phaseConfig = PHASE_MULTIPLIERS[phaseLabel] || PHASE_MULTIPLIERS['In-Season'];

  // Constraint context for module validation
  const ctx = {
    readinessScore: readiness.score,
    acwr:           readiness.acwr,
    acwrZone:       readiness.acwrZone,
    tier,
  };

  // Select primary training module
  const moduleKey = selectModule(tier, phaseLabel, sportNorm, ctx);
  const module    = TRAINING_MODULES[moduleKey];

  // Plyo amplitude (only relevant if module is plyometrics)
  const plyoAmplitude = selectPlyoAmplitude(readiness.score, readiness.acwrZone);

  // Exercise count by tier
  const exerciseCount = { peak: 6, standard: 5, deload: 4, recovery: 3 }[tier] || 5;

  // Pull primary module exercises
  const primaryExercises = selectExercises(moduleKey, sportNorm, plyoAmplitude, dayOffset, exerciseCount);

  // Pull supporting durability exercises (injected on all non-peak tiers; 2 on peak)
  const durabilityCount = tier === 'peak' ? 2 : tier === 'recovery' ? 2 : 1;
  const durabilityExercises = selectExercises('durability', sportNorm, null, dayOffset + 10, durabilityCount);

  // Scale sets by tier + phase volume multiplier
  const scaleMultiplier = phaseConfig.volumeMultiplier * (
    { peak: 1.10, standard: 1.00, deload: 0.75, recovery: 0.55 }[tier] || 1.0
  );

  const exercises = [...primaryExercises, ...durabilityExercises].map(ex => ({
    ...ex,
    sets: Math.max(1, Math.round((ex.sets || 3) * scaleMultiplier)),
    module: moduleKey,
  }));

  // Select warmup and cooldown protocols based on module CNS load
  const warmupKey   = module.cnsLoad === 'high' ? 'speed' : module.cnsLoad === 'moderate' ? 'strength' : 'general';
  const cooldownKey = tier === 'peak' || tier === 'standard' ? 'extended' : 'standard';

  // Session metadata
  const intensity = { peak: 'high', standard: 'moderate', deload: 'low', recovery: 'recovery' }[tier];

  const rationale = _buildRationale(tier, readiness, phaseLabel, module.label);

  // Mindset note
  const mindsetNotes = _getMindsetNotes(sport);
  const mindsetNote  = mindsetNotes[dayOffset % mindsetNotes.length];

  // Assemble base workout
  const baseWorkout = {
    title:              `${module.label} — ${phaseLabel}`,
    moduleKey,
    moduleLabel:        module.label,
    sport:              sportNorm,
    phase:              phaseLabel,
    tier,
    level:              trainingLevel,
    intensity,
    durationMins:       estimateDuration(exercises, tier),
    exercises,
    pliabilityProtocol: PLIABILITY_PROTOCOLS.pre_workout,
    warmupProtocol:     WARMUP_PROTOCOLS[warmupKey],
    cooldownProtocol:   COOLDOWN_PROTOCOLS[cooldownKey],
    postPliability:     PLIABILITY_PROTOCOLS.post_workout,
    rationale,
    mindsetNote,
    plyoAmplitude:      moduleKey === 'plyometrics' ? plyoAmplitude : null,
    moduleProgression:  module.progression,
    moduleConstraints:  module.constraints,
    rpeTarget:          phaseConfig.rpeLabel,
    sessionTemplate:    module.session_template,
  };

  // Apply readiness intensity adaptation
  const adaptedWorkout = adaptWorkoutToReadiness(baseWorkout, readiness.score);

  // Apply goal-specific exercise injections
  return applyGoalModifiers(adaptedWorkout, primaryGoal, secondaryGoals, readiness);
}


// ─────────────────────────────────────────────────────────────
// SECTION 18 — HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

function _normalizePhase(compPhase) {
  const map = {
    'off_season': 'Off-Season', 'offseason':   'Off-Season',
    'pre_season': 'Pre-Season', 'preseason':   'Pre-Season',
    'in_season':  'In-Season',  'inseason':    'In-Season',
    'post_season':'Post-Season','postseason':  'Post-Season',
    // Allow through already-normalized labels
    'Off-Season': 'Off-Season', 'Pre-Season':  'Pre-Season',
    'In-Season':  'In-Season',  'Post-Season': 'Post-Season',
  };
  return map[compPhase] || 'In-Season';
}

function _buildRationale(tier, readiness, phase, moduleLabel) {
  const { score, acwr, acwrZone } = readiness;
  if (tier === 'peak') {
    return `Readiness ${score}/100 — optimal training window. ${phase} protocol: ${moduleLabel}. ACWR ${acwr?.toFixed(2) || 'N/A'} within sweet spot — full training stimulus appropriate.`;
  }
  if (tier === 'deload') {
    return `ACWR ${acwr?.toFixed(2) || 'N/A'} indicates load management required (Gabbett BJSM 2016). Deload session selected: ${moduleLabel}. Maintain movement quality — protect the next 3 weeks.`;
  }
  if (tier === 'recovery') {
    return `Readiness ${score}/100 — recovery protocol activated. ${acwrZone === 'danger' ? 'ACWR danger zone: complete rest or light movement only.' : 'Active recovery: tissue quality work accelerates supercompensation.'} Selected: ${moduleLabel}.`;
  }
  return `Readiness ${score}/100 supports quality training. ${phase} maintenance: ${moduleLabel}. Consistent moderate sessions build the chronic base that enables peak performance.`;
}

function _getMindsetNotes(sport) {
  const universal = [
    'TB12: "The best ability is availability." Staying healthy is the most important performance metric.',
    'NSCA: Progressive overload is the driver of adaptation. Add load only when technique is perfect.',
    'Halson 2014: Sleep quality is the single most powerful recovery tool available to athletes.',
    'Gabbett 2016: One session modification today can prevent 2–4 weeks of missed training tomorrow.',
    'Buchheit 2013: HRV-guided training increases performance adaptations. Trust your readiness data.',
  ];
  const sportSpecific = {
    basketball: ['In-season is about maintenance. Two sessions per week is evidence-based and sufficient.'],
    football:   ['Pre-season is the proving ground. Trust the off-season work.'],
    soccer:     ['Hamstring strength is the #1 injury prevention tool in soccer. Never skip Nordic curls.'],
    volleyball: ['Shoulder health is a season-long investment. Every session. Every warm-up.'],
    baseball:   ['Rotational power starts at the ground. Hip strength precedes bat speed.'],
    track:      ['Speed is a skill. You cannot train speed under fatigue — protect the CNS.'],
  };
  return [...universal, ...(sportSpecific[sport?.toLowerCase()] || [])];
}


// ─────────────────────────────────────────────────────────────
// SECTION 19 — LEGACY COMPATIBILITY SHIM
// Maintains backward compatibility with engines.js generateWorkout()
// callers that pass a flat state object.
// ─────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for engines.js generateWorkout(state).
 * Accepts the same state object and returns the same output shape.
 *
 * IMPORTANT: Requires calcReadiness() from engines.js to be imported
 * and called first, then pass its output as state.readiness.
 *
 * @param {Object} state — PIQ app state object
 * @returns {Object} workout (compatible with existing UI renderers)
 */
export function generateWorkout(state) {
  // Support both pre-computed and raw state
  const readiness = state.readiness || {
    score:    60,
    tier:     'caution',
    acwr:     1.0,
    acwrZone: 'sweet-spot',
  };

  const dayOfWeek = new Date().getDay();

  const workout = generateTodayWorkout(
    state.sport       || 'basketball',
    state.seasonPhase || 'in_season',
    state.trainingLevel || 'intermediate',
    readiness,
    dayOfWeek,
    state.primaryGoal   || null,
    state.secondaryGoals || [],
  );

  // Normalize output shape for legacy callers
  return {
    tier:       workout.tier,
    intensity:  workout.intensity,
    sport:      workout.sport,
    phase:      workout.phase,
    durationMins: workout.durationMins,
    warmup:     workout.warmupProtocol,
    exercises:  workout.exercises,
    cooldown:   workout.cooldownProtocol,
    rationale:  workout.rationale,
    readiness:  readiness.tier,
    acwrZone:   readiness.acwrZone,
    // v2 additions (backwards-compatible additions)
    moduleKey:        workout.moduleKey,
    moduleLabel:      workout.moduleLabel,
    pliability:       workout.pliabilityProtocol,
    postPliability:   workout.postPliability,
    mindsetNote:      workout.mindsetNote,
    rpeTarget:        workout.rpeTarget,
    badge:            workout.badge,
    intensityNote:    workout.intensityNote,
    moduleProgression: workout.moduleProgression,
    sessionTemplate:  workout.sessionTemplate,
    plyoAmplitude:    workout.plyoAmplitude,
  };
}


// ─────────────────────────────────────────────────────────────
// SECTION 20 — PUBLIC API SURFACE
// ─────────────────────────────────────────────────────────────
//
// Primary exports:
//   generateTodayWorkout(sport, compPhase, trainingLevel, readiness, dayOfWeek, primaryGoal, secondaryGoals)
//   generateWorkout(state)            — legacy-compatible shim
//   adaptWorkoutToReadiness(workout, readinessScore)
//   applyGoalModifiers(workout, primaryGoal, secondaryGoals, readiness)
//   resolveSessionTier(readiness)
//   selectModule(tier, phase, sport, ctx)
//   selectPlyoAmplitude(readinessScore, acwrZone)
//
// Data exports:
//   TRAINING_MODULES                  — full 24-module taxonomy
//   PLIABILITY_PROTOCOLS              — TB12 pre/post/daily protocols
//   WARMUP_PROTOCOLS                  — speed / strength / general warmups
//   COOLDOWN_PROTOCOLS                — standard / extended cooldowns
//   MODULE_ROUTING                    — tier × phase × sport routing table
