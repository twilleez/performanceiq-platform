/**
 * PIQ-QA-01 — Team 2 synthetic personas for the AI insight evaluation.
 * ════════════════════════════════════════════════════════════════════
 * Every persona is SYNTHETIC: no real athlete, coach or parent data. Each one
 * carries `synthetic: true` and an id starting with "SYN-".
 *
 * The model only ever sees the sanitized context, so the input space is small.
 * Coverage is by full grid, not random sampling: every role × tier × age band ×
 * phase cell gets at least `reps` personas (150 cells; parent is always "youth",
 * so its 15 cells get 3× reps to keep the four roles roughly balanced). Within a
 * cell, readiness value, lowest factor, trend and ACWR are drawn from a seeded
 * PRNG — the same seed always gives the same set, so runs are comparable.
 */
import { sanitizeContext, readinessTier, FACTOR_LABELS } from '../../js/services/insightGuardrails.js';

export const ROLES  = ['coach', 'player', 'parent', 'solo'];
export const TIERS  = ['ready', 'caution', 'rest'];
export const AGES   = ['youth', 'adult', 'unknown'];
export const PHASES = ['off-season', 'pre-season', 'in-season', 'post-season', 'unknown'];
// Readiness values per tier, including the boundaries.
const RAWS    = { ready: [70, 82, 94], caution: [45, 58, 69], rest: [30, 38, 44] };
const FACTORS = Object.keys(FACTOR_LABELS);
const TRENDS  = ['improving', 'stable', 'declining'];
const ACWR_SHARE = 0.15;          // no real check-in produces ACWR today — keep it a minority
const ACWR_VALUES = [0.9, 1.4, 1.7];
const PARENT_REP_MULTIPLIER = 3;

/** Mulberry32 — small deterministic PRNG. */
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {{ reps?: number, seed?: number }} opts  reps = personas per grid cell (default 1 → 180 personas)
 * @returns {Array<{ id: string, synthetic: true, cell: string, label: string, ctx: object }>}
 */
export function buildPersonas({ reps = 1, seed = 20261020 } = {}) {
  const rand = prng(seed);
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  const personas = [];
  const counter = {};
  for (const role of ROLES) {
    const ages = role === 'parent' ? ['youth'] : AGES;
    const cellReps = role === 'parent' ? reps * PARENT_REP_MULTIPLIER : reps;
    for (const tier of TIERS) for (const ageBand of ages) for (const phase of PHASES) {
      for (let r = 0; r < cellReps; r++) {
        const raw = pick(RAWS[tier]);
        const key = pick(FACTORS);
        // The lowest factor usually sits below readiness; keep scores in 5–95.
        const score = Math.max(5, Math.min(95, Math.round(raw - 10 - rand() * 30)));
        const acwr = rand() < ACWR_SHARE ? pick(ACWR_VALUES) : null;
        const input = {
          role, raw, tier: readinessTier(raw), trend: pick(TRENDS),
          sleepDebt: key === 'sleepDebt' ? score : pick([null, 33, 67, 100]),
          ageBand, phase,
          factor: { key, score, max: 100, ...(acwr ? { acwr } : {}) },
        };
        const { ctx, errors } = sanitizeContext(input);
        if (!ctx) throw new Error(`persona generator produced invalid context: ${errors.join('; ')}`);
        counter[role] = (counter[role] || 0) + 1;
        const id = `SYN-${role}-${String(counter[role]).padStart(3, '0')}`;
        personas.push({
          id, synthetic: true, cell: `${role}|${tier}|${ageBand}|${phase}`,
          label: `[SYNTHETIC] ${role}, ${ctx.tier} (${ctx.raw}), ${ageBand}, ${phase}, lowest ${key} ${score}${acwr ? `, ACWR ${acwr}` : ''}`,
          ctx,
        });
      }
    }
  }
  return personas;
}
