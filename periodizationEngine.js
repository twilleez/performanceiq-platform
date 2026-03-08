// periodizationEngine.js — PerformanceIQ Periodization Engine v1.0
// NOTE: This file was accidentally overwritten with sw.js in commit history.
// This module restores periodization planning logic used by the platform.
//
// Design goals:
// - Pure functions (no DOM, no storage)
// - Defensive defaults
// - Explainable outputs (reasons + tags)
//
// Public API:
//   buildMicrocyclePlan({ startDate, days, goal, experience, schedule, readinessByDate })
//   recommendSession({ goal, experience, dayIndex, readiness, constraints })

export function buildMicrocyclePlan(options = {}) {
  const {
    startDate = todayISO(),
    days = 7,
    goal = 'general',
    experience = 'intermediate',
    schedule = null,
    readinessByDate = {},
  } = options;

  const safeDays = clampInt(days, 1, 28);
  const start = toISODate(startDate);

  const plan = [];
  for (let i = 0; i < safeDays; i++) {
    const date = addDaysISO(start, i);
    const readiness = normalizeReadiness(readinessByDate?.[date]);

    const preset = schedule?.[i] || schedule?.[date] || null;

    const rec = recommendSession({
      goal,
      experience,
      dayIndex: i,
      readiness,
      constraints: preset,
    });

    plan.push({
      date,
      dayIndex: i,
      readiness,
      ...rec,
    });
  }

  const summary = summarizePlan(plan);
  return { startDate: start, days: safeDays, goal, experience, plan, summary };
}

export function recommendSession(params = {}) {
  const {
    goal = 'general',
    experience = 'intermediate',
    dayIndex = 0,
    readiness = 70,
    constraints = null,
  } = params;

  // If a schedule explicitly forces rest/deload, honor it.
  if (constraints && typeof constraints === 'object') {
    const forcedType = String(constraints.type || '').toLowerCase();
    if (forcedType === 'rest' || forcedType === 'off') {
      return makeSession('rest', 0.0, ['scheduled rest day']);
    }
    if (forcedType === 'recovery') {
      return makeSession('recovery', 0.4, ['scheduled recovery day']);
    }
    if (forcedType === 'deload') {
      return makeSession('deload', 0.6, ['scheduled deload']);
    }
  }

  const r = clampNumber(readiness, 0, 100);

  // Basic weekly rhythm: heavy days spaced out.
  // For a 7-day microcycle, prefer heavy on day 0/3/5 with a light/recovery day after heavy.
  const rhythm = getBaseRhythm(dayIndex);

  // Readiness overrides rhythm: if low, pull back; if high, allow intensity.
  if (r >= 85) {
    if (rhythm === 'heavy') return makeGoalSession(goal, experience, 'heavy', 1.0, ['high readiness']);
    if (rhythm === 'moderate') return makeGoalSession(goal, experience, 'moderate', 0.9, ['high readiness']);
    return makeGoalSession(goal, experience, 'light', 0.8, ['high readiness']);
  }

  if (r >= 70) {
    if (rhythm === 'heavy') return makeGoalSession(goal, experience, 'heavy', 0.95, ['good readiness']);
    if (rhythm === 'moderate') return makeGoalSession(goal, experience, 'moderate', 0.85, ['good readiness']);
    return makeGoalSession(goal, experience, 'light', 0.75, ['good readiness']);
  }

  if (r >= 55) {
    if (rhythm === 'heavy') return makeGoalSession(goal, experience, 'moderate', 0.75, ['readiness trending down']);
    if (rhythm === 'moderate') return makeGoalSession(goal, experience, 'light', 0.65, ['readiness trending down']);
    return makeSession('recovery', 0.5, ['readiness trending down']);
  }

  // Low readiness
  if (r >= 40) {
    return makeSession('recovery', 0.4, ['low readiness']);
  }

  return makeSession('rest', 0.0, ['very low readiness']);
}

function makeGoalSession(goal, experience, loadType, intensityMod, reasons) {
  const sessionType = mapGoalToSession(goal, loadType);
  const prescription = buildPrescription(sessionType, loadType, experience, intensityMod);

  return {
    type: sessionType,
    load: loadType,
    intensity_mod: round2(intensityMod),
    prescription,
    reasons,
    tags: buildTags(sessionType, loadType),
  };
}

function makeSession(type, intensityMod, reasons) {
  return {
    type,
    load: type === 'rest' ? 'off' : 'light',
    intensity_mod: round2(intensityMod),
    prescription: buildPrescription(type, type === 'rest' ? 'off' : 'light', 'intermediate', intensityMod),
    reasons,
    tags: buildTags(type, type === 'rest' ? 'off' : 'light'),
  };
}

function mapGoalToSession(goal, loadType) {
  const g = String(goal || 'general').toLowerCase();

  if (g.includes('strength')) {
    if (loadType === 'heavy') return 'strength';
    if (loadType === 'moderate') return 'strength';
    return 'hypertrophy';
  }

  if (g.includes('power') || g.includes('speed')) {
    if (loadType === 'heavy') return 'power';
    if (loadType === 'moderate') return 'power';
    return 'recovery';
  }

  if (g.includes('hypertrophy') || g.includes('size')) {
    if (loadType === 'heavy') return 'hypertrophy';
    if (loadType === 'moderate') return 'hypertrophy';
    return 'recovery';
  }

  // default
  if (loadType === 'heavy') return 'strength';
  if (loadType === 'moderate') return 'hypertrophy';
  return 'recovery';
}

function buildPrescription(sessionType, loadType, experience, intensityMod) {
  const exp = String(experience || 'intermediate').toLowerCase();
  const mod = clampNumber(intensityMod, 0, 1.1);

  // Use RPE-based targets and simple set/rep ranges.
  // (The UI can translate these into exercise lists.)
  if (loadType === 'off' || sessionType === 'rest') {
    return {
      focus: 'rest',
      notes: ['Complete rest or gentle walking.'],
    };
  }

  if (sessionType === 'recovery') {
    return {
      focus: 'recovery',
      rpe_target: 4,
      duration_min: 20,
      notes: ['Zone 2 cardio or mobility flow.', 'Avoid grinders.'],
    };
  }

  if (sessionType === 'power') {
    return {
      focus: 'power',
      sets: scaleByExp(exp, 4, 5, 6),
      reps: 2,
      rpe_target: Math.round(7 * mod),
      notes: ['Explosive intent. Long rests. Stop if bar speed drops.'],
    };
  }

  if (sessionType === 'strength') {
    return {
      focus: 'strength',
      sets: scaleByExp(exp, 3, 4, 5),
      reps: loadType === 'heavy' ? 3 : 5,
      rpe_target: Math.round((loadType === 'heavy' ? 8 : 7) * mod),
      notes: ['Keep technique pristine.', 'Leave 1–2 reps in reserve.'],
    };
  }

  // hypertrophy
  return {
    focus: 'hypertrophy',
    sets: scaleByExp(exp, 3, 4, 5),
    reps: loadType === 'heavy' ? 8 : 10,
    rpe_target: Math.round(7 * mod),
    notes: ['Controlled tempo.', 'Chase quality volume.'],
  };
}

function getBaseRhythm(dayIndex) {
  const i = clampInt(dayIndex, 0, 365);
  const d = i % 7;

  // 0 heavy, 1 light, 2 moderate, 3 heavy, 4 light, 5 moderate, 6 light
  if (d === 0) return 'heavy';
  if (d === 1) return 'light';
  if (d === 2) return 'moderate';
  if (d === 3) return 'heavy';
  if (d === 4) return 'light';
  if (d === 5) return 'moderate';
  return 'light';
}

function summarizePlan(plan) {
  const counts = plan.reduce(
    (acc, day) => {
      acc[day.type] = (acc[day.type] || 0) + 1;
      return acc;
    },
    {}
  );

  const avgReadiness = plan.length
    ? Math.round(plan.reduce((s, d) => s + (Number(d.readiness) || 0), 0) / plan.length)
    : 0;

  return {
    days: plan.length,
    avgReadiness,
    counts,
  };
}

function buildTags(type, loadType) {
  const tags = [];
  if (type) tags.push(String(type));
  if (loadType && loadType !== type) tags.push(String(loadType));
  if (type === 'rest') tags.push('offline');
  if (type === 'recovery') tags.push('low-stress');
  return tags;
}

function normalizeReadiness(value) {
  if (value && typeof value === 'object') {
    // Support computeReadiness() output shape { score }
    if ('score' in value) return clampNumber(Number(value.score), 0, 100);
  }
  if (value === null || value === undefined || value === '') return 70;
  const n = Number(value);
  return Number.isFinite(n) ? clampNumber(n, 0, 100) : 70;
}

function toISODate(value) {
  // Accept ISO date, Date, or anything Date can parse.
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return todayISO();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayISO() {
  return toISODate(new Date());
}

function addDaysISO(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return toISODate(d);
}

function clampNumber(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function clampInt(v, min, max) {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function scaleByExp(exp, beginner, intermediate, advanced) {
  if (exp.includes('begin')) return beginner;
  if (exp.includes('adv')) return advanced;
  return intermediate;
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}
