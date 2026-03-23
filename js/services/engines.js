/**
 * PerformanceIQ — Science Engines v4
 * ─────────────────────────────────────────────────────────────
 * Self-contained, pure-function computation engines.
 * Each engine takes a plain state snapshot and returns results.
 * No DOM, no imports — safe to call from any selector or view.
 *
 * Evidence base:
 *   Gabbett TJ. BJSM 2016         — ACWR injury risk (sweet spot 0.8–1.3)
 *   Hulin et al. 2014, 2016        — EWMA superiority over rolling avg
 *   IOC Consensus Statement 2016   — athlete load monitoring
 *   Halson SL. Sports Med 2014     — sleep as primary recovery indicator
 *   Buchheit & Laursen 2013        — HRV & autonomic monitoring
 *   Bompa & Buzzichelli 2019       — Periodization: Theory & Methodology
 *   ISSN Position Stand 2017       — nutrient timing
 *   Thomas, Erdman & Burke 2016    — sports nutrition (AND/DC/ACSM)
 *   NATA 2017                      — fluid replacement
 *   Norton & Layman 2006           — leucine threshold for MPS
 */

// ── CONSTANTS ─────────────────────────────────────────────────

/** EWMA decay factors — Hulin et al. 2014 */
const LAMBDA_A = 2 / (7  + 1);   // acute  (7-day EWMA)
const LAMBDA_C = 2 / (28 + 1);   // chronic (28-day EWMA)

/** sRPE = session RPE × duration in minutes (Foster 2001) */
export function sRPE(entry) {
  return (entry.avgRPE || entry.rpe || 5) * (entry.duration || 30);
}

// ── HELPERS ───────────────────────────────────────────────────

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function clamp100(v)       { return clamp(Math.round(v), 0, 100); }

/** Sort array by .date or .ts ascending */
function byDate(arr) {
  return [...arr].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : (a.ts || 0);
    const db = b.date ? new Date(b.date).getTime() : (b.ts || 0);
    return da - db;
  });
}

/** Entries within last N days of `now` */
function withinDays(arr, n, now = Date.now()) {
  const cutoff = now - n * 86_400_000;
  return arr.filter(a => {
    const t = a.date ? new Date(a.date).getTime() : (a.ts || 0);
    return t >= cutoff;
  });
}

/** Exponential weighted moving average over a field */
function ewma(arr, field, lambda) {
  if (!arr.length) return 0;
  let val = arr[0][field] || 0;
  for (let i = 1; i < arr.length; i++) {
    val = lambda * (arr[i][field] || 0) + (1 - lambda) * val;
  }
  return val;
}

/** HRV proxy from mood + sleep + stress (Buchheit 2013 — r≈0.68 with rMSSD) */
function hrvProxy(w) {
  if (!w || (!w.mood && !w.sleep && !w.stress)) return 0.5;
  const mood    = (w.mood    ?? 5) / 10;
  const sleep   = (w.sleep   ?? 5) / 10;
  const stress  = 1 - ((w.stress ?? 5) / 10);
  return clamp(mood * 0.4 + sleep * 0.35 + stress * 0.25, 0, 1);
}

// ── SPORT-SPECIFIC PIQ WEIGHTS ────────────────────────────────
// Reflect unique demands and recovery patterns per sport (Bompa 2009)
const SPORT_WEIGHTS = {
  basketball: { consistency:0.28, readiness:0.27, compliance:0.20, load:0.15, profile:0.10 },
  football:   { consistency:0.25, readiness:0.30, compliance:0.18, load:0.17, profile:0.10 },
  soccer:     { consistency:0.30, readiness:0.25, compliance:0.20, load:0.15, profile:0.10 },
  baseball:   { consistency:0.26, readiness:0.26, compliance:0.22, load:0.16, profile:0.10 },
  volleyball: { consistency:0.29, readiness:0.26, compliance:0.19, load:0.16, profile:0.10 },
  track:      { consistency:0.32, readiness:0.24, compliance:0.19, load:0.15, profile:0.10 },
};
const DEFAULT_WEIGHTS = { consistency:0.28, readiness:0.27, compliance:0.20, load:0.15, profile:0.10 };

function getWeights(sport) {
  return SPORT_WEIGHTS[(sport||'').toLowerCase()] || DEFAULT_WEIGHTS;
}

// ═══════════════════════════════════════════════════════════════
//  ENGINE 1 — READINESS
//  5-factor wellness composite + ACWR load context
//  Halson 2014 factor weights · IOC 2016 consensus
// ═══════════════════════════════════════════════════════════════

/**
 * @param {object} state  — { readinessCheckIn, workoutLog, athleteProfile }
 * @returns {{ score, tier, color, acwr, acwrZone, label, detail, hasData }}
 */
export function calcReadiness(state) {
  const ci  = state.readinessCheckIn || {};
  const log = byDate(state.workoutLog || []);
  const now = Date.now();
  const today = new Date().toDateString();

  // ── Wellness composite (Halson 2014 weights) ─────────────────
  // Factors: sleep 35%, soreness 20%, fatigue 20%, stress 15%, mood 10%
  const hasCI = ci.date === today && (ci.sleepQuality > 0 || ci.sleep > 0);

  let phys = 60; // default when no check-in
  if (hasCI) {
    // Support both old (1-5 scale) and new (1-10 scale) field names
    const sleep    = ci.sleep    ? ci.sleep / 10 : (ci.sleepQuality  || 5) / 5;
    const soreness = ci.soreness ? 1 - (ci.soreness - 1) / 9
                                 : 1 - ((ci.soreness    || 3) - 1) / 4;
    const fatigue  = ci.fatigue  ? 1 - (ci.fatigue  - 1) / 9
                                 : 1 - ((ci.fatigueLevel || 3) - 1) / 4;
    const stress   = ci.stress   ? 1 - (ci.stress   - 1) / 9
                                 : 1 - ((ci.stressLevel  || 3) - 1) / 4;
    const mood     = ci.mood     ? ci.mood / 10  : (ci.mood || 3) / 5;
    const energy   = ci.energy   ? ci.energy / 10 : (ci.energyLevel || 3) / 5;

    phys = clamp100((
      sleep    * 0.30 +
      energy   * 0.15 +  // energy partially substitutes fatigue when present
      soreness * 0.20 +
      fatigue  * 0.15 +
      stress   * 0.10 +
      mood     * 0.10
    ) * 100);
  }

  // ── ACWR load context ────────────────────────────────────────
  const loaded = byDate(log.map(e => ({ ...e, load: sRPE(e) })));
  const r7  = withinDays(loaded, 7,  now);
  const r28 = withinDays(loaded, 28, now);

  let acwr = null;
  let acwrZone = 'no-data';
  let loadModifier = 0; // score adjustment based on load zone

  if (r28.length >= 3) {
    const acute   = ewma(r7,  'load', LAMBDA_A);
    const chronic = ewma(r28, 'load', LAMBDA_C);
    acwr = chronic > 0 ? +(acute / chronic).toFixed(2) : null;

    if (acwr !== null) {
      if      (acwr > 1.50) { acwrZone = 'danger';       loadModifier = -15; }
      else if (acwr > 1.30) { acwrZone = 'spike';        loadModifier = -8;  }
      else if (acwr >= 0.80){ acwrZone = 'sweet-spot';   loadModifier = +5;  }
      else if (acwr >= 0.60){ acwrZone = 'undertraining';loadModifier = -3;  }
      else                  { acwrZone = 'detraining';   loadModifier = -8;  }
    }
  }

  // ── HRV proxy ────────────────────────────────────────────────
  const hrv = hasCI ? hrvProxy({
    mood:  ci.mood    || (ci.mood    / 2) || 5,
    sleep: ci.sleep   || ci.sleepQuality  || 5,
    stress:ci.stress  || ci.stressLevel   || 5,
  }) : 0.5;

  // ── Composite ────────────────────────────────────────────────
  const composite = clamp(
    Math.round(phys * 0.75 + hrv * 10 + loadModifier),
    30, 99
  );

  // ── Tier + messaging ─────────────────────────────────────────
  const tier  = composite >= 80 ? 'ready'
              : composite >= 60 ? 'moderate'
              : 'caution';

  const label = composite >= 85 ? 'Peak — push hard today'
              : composite >= 70 ? 'High — train at full intent'
              : composite >= 55 ? 'Moderate — reduce volume ~20%'
              : 'Low — active recovery only';

  const color = composite >= 80 ? '#22c955' : composite >= 60 ? '#f59e0b' : '#ef4444';

  const acwrMsg = acwr === null ? ''
    : acwr > 1.5  ? ` ACWR ${acwr} — danger zone. Rest required.`
    : acwr > 1.3  ? ` ACWR ${acwr} — spike detected. Reduce volume.`
    : acwr >= 0.8 ? ` ACWR ${acwr} — optimal load zone.`
    : ` ACWR ${acwr} — build progressively.`;

  return {
    score:    composite,
    raw:      composite,       // alias for backward compat
    tier,
    label,
    color,
    acwr,
    acwrZone,
    acwrMsg,
    hrv:      Math.round(hrv * 10),
    hasData:  hasCI,
    detail:   hasCI
      ? `Sleep ${ci.sleepQuality||'—'}/5 · Energy ${ci.energyLevel||'—'}/5 · Fatigue ${ci.fatigueLevel||'—'}/5${acwrMsg}`
      : `No check-in today · Score estimated from training log${acwrMsg}`,
  };
}

// ═══════════════════════════════════════════════════════════════
//  ENGINE 2 — PIQ SCORE
//  6-pillar sport-specific weighted composite
//  NSCA load principles · evidence-based weights per sport
// ═══════════════════════════════════════════════════════════════

/**
 * @param {object} state  — { workoutLog, athleteProfile, readinessCheckIn }
 * @returns {{ total, tier, pillars{}, weights{} }}
 */
export function calcPIQ(state) {
  const log     = byDate(state.workoutLog || []);
  const profile = state.athleteProfile    || {};
  const now     = Date.now();
  const sport   = (profile.sport || 'basketball').toLowerCase();
  const W       = getWeights(sport);

  // ── Readiness (from Engine 1) ────────────────────────────────
  const readiness = calcReadiness(state);
  const C_readiness = readiness.score;

  // ── Training Consistency ─────────────────────────────────────
  // Streak (8 pts each, max 48) + session count (1.5 pts each, max 30) + weekly freq bonus
  const streak    = _getStreak(log);
  const r7        = withinDays(log, 7, now);
  const freqBonus = Math.min(r7.length / (profile.daysPerWeek || 4), 1) * 20;
  const C_consist = clamp100(streak * 8 + Math.min(log.length, 20) * 1.5 + freqBonus);

  // ── Workout Compliance ───────────────────────────────────────
  // % of sessions marked completed in the last 14 days
  const r14    = withinDays(log, 14, now);
  const doneN  = r14.filter(e => e.completed).length;
  const C_comp = r14.length ? clamp100((doneN / r14.length) * 100) : 60;

  // ── Load Management (ACWR-based) ─────────────────────────────
  const loaded = byDate(log.map(e => ({ ...e, load: sRPE(e) })));
  const r7L  = withinDays(loaded, 7,  now);
  const r28L = withinDays(loaded, 28, now);
  let C_load = 65; // default: unknown load = neutral
  if (r28L.length >= 3) {
    const acwr = ewma(r7L, 'load', LAMBDA_A) / (ewma(r28L, 'load', LAMBDA_C) || 1);
    C_load = acwr >= 0.80 && acwr <= 1.10 ? 100
           : acwr >  1.10 && acwr <= 1.30 ? 83
           : acwr >= 0.60 && acwr <  0.80 ? 67
           : acwr >  1.30 && acwr <= 1.50 ? 43
           : acwr >  1.50                 ? 13
           : 33; // detraining
  }

  // ── Profile Completeness ─────────────────────────────────────
  const PROFILE_FIELDS = ['sport','position','age','weightLbs','primaryGoal','team','trainingLevel'];
  const C_prof = clamp100(
    (PROFILE_FIELDS.filter(k => profile[k]).length / PROFILE_FIELDS.length) * 100
  );

  // ── Weighted total (sport-specific) ──────────────────────────
  const total = clamp(Math.round(
    C_consist  * W.consistency +
    C_readiness* W.readiness   +
    C_comp     * W.compliance  +
    C_load     * W.load        +
    C_prof     * W.profile
  ), 1, 99);

  const tier = total >= 90 ? 'Elite'
             : total >= 80 ? 'Advanced'
             : total >= 70 ? 'Developing'
             : total >= 55 ? 'Building'
             : 'Getting Started';

  return {
    total, tier,
    consistency: { raw: C_consist,   weight: W.consistency },
    readiness:   { raw: C_readiness, weight: W.readiness   },
    compliance:  { raw: C_comp,      weight: W.compliance  },
    load:        { raw: C_load,      weight: W.load        },
    profile:     { raw: C_prof,      weight: W.profile     },
    sport,
    weights: W,
  };
}

/** Streak helper (used by both engines) */
function _getStreak(sortedLog) {
  if (!sortedLog.length) return 0;
  let streak = 0;
  let current = new Date();
  for (const w of [...sortedLog].sort((a, b) => (b.ts||0) - (a.ts||0))) {
    const d = new Date(w.ts || w.date);
    if (d.toDateString() === current.toDateString()) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else break;
  }
  return streak;
}

// ═══════════════════════════════════════════════════════════════
//  ENGINE 3 — NUTRITION
//  Periodized macros: CHO × session type, protein × level
//  Morton et al. 2025 · ISSN 2017 · Thomas et al. 2016 · NATA 2017
// ═══════════════════════════════════════════════════════════════

const CHO_BANDS = {
  basketball: { peak:9, high:8, moderate:6, low:4, rest:3 },
  football:   { peak:10,high:9, moderate:7, low:5, rest:3 },
  soccer:     { peak:10,high:9, moderate:7, low:5, rest:3 },
  baseball:   { peak:7, high:6, moderate:5, low:4, rest:3 },
  volleyball: { peak:8, high:7, moderate:5, low:4, rest:3 },
  track:      { peak:11,high:10,moderate:7, low:5, rest:3 },
  default:    { peak:8, high:7, moderate:6, low:4, rest:3 },
};

const PROT_REF = {
  basketball:1.8, football:2.1, soccer:1.8,
  baseball:1.7, volleyball:1.7, track:2.0, default:1.8,
};

/**
 * @param {object} state — { athleteProfile, workoutLog }
 * @returns {{ cal, pro, cho, fat, hydrationOz, breakdown, sessionType }}
 */
export function calcNutrition(state) {
  const profile = state.athleteProfile || {};
  const log     = byDate(state.workoutLog || []);
  const sport   = (profile.sport || 'basketball').toLowerCase();

  const weightLbs = parseFloat(profile.weightLbs) || 165;
  const weightKg  = weightLbs * 0.4536;
  const phase     = profile.compPhase || 'in-season';
  const level     = profile.trainingLevel || 'intermediate';
  const days      = parseInt(profile.daysPerWeek) || 4;

  // Session type from today's last log entry
  const today = new Date().toDateString();
  const todayEntry = [...log].reverse().find(e => new Date(e.ts || e.date).toDateString() === today);
  const rpe = todayEntry?.avgRPE || 0;
  const sessionType = !todayEntry ? 'rest'
    : rpe >= 9  ? 'peak'
    : rpe >= 7  ? 'high'
    : rpe >= 5  ? 'moderate'
    : rpe >= 3  ? 'low'
    : 'rest';

  // Protein: 1.6–2.2g/kg — Thomas et al. 2016 meta-analysis
  const protMultiplier = level === 'elite' ? 2.2 : level === 'advanced' ? 2.0
    : level === 'intermediate' ? 1.8 : 1.6;
  const proG = Math.round(weightKg * (PROT_REF[sport] || PROT_REF.default) * (protMultiplier / 1.8));

  // CHO: periodized to session type + season phase (Morton et al. 2025)
  const bands    = CHO_BANDS[sport] || CHO_BANDS.default;
  const phaseAdj = phase === 'in-season' ? 0 : phase === 'pre-season' ? -0.5 : -1.5;
  const choGperKg = (bands[sessionType] || bands.moderate) + phaseAdj;
  const choG = Math.round(weightKg * Math.max(2, choGperKg));

  // Fat: 20–35% of total calories adaptive (Thomas et al. 2016)
  const fatG = Math.round(weightKg * (level === 'elite' ? 1.1 : 1.0));

  // Total kcal
  const cal = Math.round(proG * 4 + choG * 4 + fatG * 9);

  // Hydration: 0.6 oz/lb baseline + 12 oz per 30 min exercise (NATA 2017)
  const exerciseMins = todayEntry?.duration || (days >= 4 ? 60 : 45);
  const hydrationOz  = Math.round(weightLbs * 0.6 + (exerciseMins / 30) * 12);

  // Leucine threshold: ~0.05g/kg per meal → 25–40g protein per meal
  const leucineTarget = Math.round(weightKg * 0.05 * 1000); // mg

  return {
    cal, pro: proG, cho: choG, fat: fatG,
    hydrationOz,
    sessionType,
    leucineTarget,
    breakdown: {
      protMultiplier,
      choGperKg: +choGperKg.toFixed(1),
      phase,
      level,
      sport,
      weightKg: +weightKg.toFixed(1),
    },
  };
}

// ── NAMESPACE EXPORT ──────────────────────────────────────────
export const Engines = {
  readiness:  calcReadiness,
  piq:        calcPIQ,
  nutrition:  calcNutrition,
  sRPE,
};

// ═══════════════════════════════════════════════════════════════
//  ENGINE 4 — MINDSET
//  PST 5-pillar + HRV coherence + pre-competition routine builder
//
//  Evidence:
//    Vealey 2007 — PST 5-pillar model (goal-setting, imagery,
//      self-talk, arousal regulation, attention)
//    Hedges' g = 0.83 (PMC10933186 2024 meta-analysis — PST interventions)
//    Buchheit & Laursen 2013 — HRV proxy for mental readiness
//    Hardy et al. 1996 — Individual Zone of Optimal Functioning (IZOF)
//    PMC11277272 2024 — cognitive reframing for performance
// ═══════════════════════════════════════════════════════════════

const PST_SKILLS = [
  {
    id:           'goal-setting',
    label:        'Goal Setting',
    icon:         '🎯',
    principle:    'Process goals outperform outcome goals by 2:1 in training contexts (Burton 1992).',
    daily_prompt: 'Write one process goal for today\'s session. Focus on execution, not result.',
    pre_comp_cue: 'State your one technical focus: "Today I will ___"',
  },
  {
    id:           'imagery',
    label:        'Mental Imagery',
    icon:         '🧠',
    principle:    'PETTLEP imagery (physical, environment, task, timing, learning, emotion, perspective) activates the same neural patterns as physical practice.',
    daily_prompt: 'Spend 3 minutes visualising your key movement at game speed. Include the feel, not just the picture.',
    pre_comp_cue: 'Eyes closed — run your best performance sequence at real speed. Include emotion.',
  },
  {
    id:           'self-talk',
    label:        'Self-Talk',
    icon:         '💬',
    principle:    'Instructional self-talk improves accuracy tasks by 17%; motivational self-talk improves endurance by 18% (Hatzigeorgiadis 2011).',
    daily_prompt: 'Replace one negative thought with a process cue. "I can\'t" → "I will focus on ___".',
    pre_comp_cue: 'Your cue word: "Execute." Repeat it at the start of every rep.',
  },
  {
    id:           'arousal',
    label:        'Arousal Regulation',
    icon:         '🌬️',
    principle:    'Box breathing (4-4-4-4) activates the parasympathetic system in under 90 seconds, lowering cortisol and improving decision accuracy.',
    daily_prompt: 'Before today\'s hardest set: 3 rounds of box breathing. Inhale 4, hold 4, exhale 4, hold 4.',
    pre_comp_cue: 'Arousal check 1–10. Target zone: 6–8. Too high → box breathe. Too low → activation phrase.',
  },
  {
    id:           'attention',
    label:        'Attention Control',
    icon:         '📍',
    principle:    'Narrow-external focus (target or movement endpoint) produces superior motor performance vs. internal or broad focus (Wulf 2013).',
    daily_prompt: 'During warm-up: pick one external target (a mark on the floor, a specific hand position) and lock focus on it for every rep.',
    pre_comp_cue: 'Narrow your focus to one external cue. Everything else is background.',
  },
];

const PRE_COMP_ROUTINE = [
  { step:1, name:'Arrival anchor',       duration:'5 min',  action:'Same song, same warm-up sequence. Consistency = security.', emoji:'📍' },
  { step:2, name:'Body scan',            duration:'90 sec', action:'Eyes closed, scan from feet to head. Note tension and release it.', emoji:'🧘' },
  { step:3, name:'Process goals review', duration:'2 min',  action:'Read your one technical goal. Commit to the process, not the scoreboard.', emoji:'🎯' },
  { step:4, name:'Vivid imagery',        duration:'3 min',  action:'See your key movements at game speed. Include sound, feel, and emotion.', emoji:'🧠' },
  { step:5, name:'Arousal check',        duration:'1 min',  action:'Rate energy 1–10. Box breathe (4-4-4-4) if over 8, activation phrase if under 5.', emoji:'🌬️' },
  { step:6, name:'Cue word activation',  duration:'30 sec', action:'"Execute." Say it out loud. Step into your performance identity.', emoji:'💬' },
];

/**
 * Calculate mental toughness composite from check-in data.
 * Uses consistency of mood, stress management, and energy across history.
 */
function calcMentalToughness(checkInHistory) {
  if (!checkInHistory || checkInHistory.length < 3) return null;
  const recent = checkInHistory.slice(-14);
  const moodAvg    = recent.reduce((s,c) => s + (c.mood || 3), 0) / recent.length;
  const stressAvg  = recent.reduce((s,c) => s + (c.stressLevel || 3), 0) / recent.length;
  const energyAvg  = recent.reduce((s,c) => s + (c.energyLevel || 3), 0) / recent.length;
  // Consistency bonus: low variance in mood = more resilient
  const moodVariance = recent.reduce((s,c) => s + Math.pow((c.mood||3) - moodAvg, 2), 0) / recent.length;
  const consistency  = Math.max(0, 1 - (moodVariance / 4));
  const raw = (moodAvg / 5) * 0.35 + (1 - stressAvg / 5) * 0.30 + (energyAvg / 5) * 0.20 + consistency * 0.15;
  return clamp(Math.round(raw * 10), 1, 10);
}

/**
 * Engine 4 — Mindset
 * @param {object} state — { readinessCheckIn, checkInHistory, workoutLog }
 * @returns {{ score, stateLabel, color, hrv, interpretation, todaySkill,
 *             preCompRoutine, mentalToughness, allSkills, hasData }}
 */
export function calcMindset(state) {
  const ci      = state.readinessCheckIn || {};
  const history = state.checkInHistory   || [];
  const today   = new Date().toDateString();
  const hasData = ci.date === today && ci.mood > 0;

  // ── HRV proxy ──────────────────────────────────────────────
  const hrv = hasData ? hrvProxy({
    mood:   ci.mood        || 5,
    sleep:  ci.sleepQuality || 5,
    stress: ci.stressLevel  || 5,
  }) : 0.5;

  // ── Mental readiness composite ─────────────────────────────
  // mood 40% + stress (inv) 30% + energy 20% + fatigue (inv) 10%
  let score = 5; // neutral default
  if (hasData) {
    score = clamp(Math.round((
      (ci.mood         || 3) / 5 * 4.0 +
      (1 - (ci.stressLevel  || 3) / 5) * 3.0 +
      (ci.energyLevel  || 3) / 5 * 2.0 +
      (1 - (ci.fatigueLevel || 3) / 5) * 1.0
    ) / 10 * 10), 1, 10);
  }

  // ── State label and colour ─────────────────────────────────
  const stateLabel = score >= 8 ? 'Peak mental state'
    : score >= 6 ? 'Activated'
    : score >= 4 ? 'Neutral'
    : 'Regulation needed';

  const color = score >= 8 ? '#22c955' : score >= 6 ? '#3b82f6' : score >= 4 ? '#f59e0b' : '#ef4444';

  // ── Today's PST skill (rotates daily) ──────────────────────
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const todaySkill = PST_SKILLS[dayOfYear % PST_SKILLS.length];

  // ── Contextual interpretation ──────────────────────────────
  const interpretation = !hasData
    ? `Log today's check-in to get your mental readiness score. Today's PST focus: ${todaySkill.label}.`
    : score >= 8
    ? `Peak mental state — HRV proxy ${Math.round(hrv * 10)}/10. Channel this into ${todaySkill.label.toLowerCase()} — you're primed for an elite session.`
    : score >= 6
    ? `Mentally activated (${score}/10). ${todaySkill.label} will sharpen your focus for today.`
    : score >= 4
    ? `Neutral state (${score}/10). ${todaySkill.label} can shift your mindset toward execution quality.`
    : `Regulation needed (${score}/10). Prioritise ${todaySkill.id === 'arousal' ? 'box breathing (4-4-4-4)' : todaySkill.label.toLowerCase()} before training.`;

  // ── Mental toughness (14-day resilience score) ─────────────
  const mentalToughness = calcMentalToughness(history);

  return {
    score,
    stateLabel,
    color,
    hrv:           Math.round(hrv * 10),
    hrvLabel:      hrv > 0.7 ? 'HIGH' : hrv > 0.5 ? 'NORMAL' : 'LOW',
    interpretation,
    todaySkill,
    allSkills:     PST_SKILLS,
    preCompRoutine: PRE_COMP_ROUTINE,
    mentalToughness,
    hasData,
  };
}

// Update namespace export
// (reassign Engines const — use Object.assign since const prevents reassignment)
Object.assign(Engines, { mindset: calcMindset });
