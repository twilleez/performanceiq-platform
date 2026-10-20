/**
 * PIQ-QA-01 — Team 2 synthetic personas for the AI insight evaluation.
 * ════════════════════════════════════════════════════════════════════
 * Every persona is SYNTHETIC: no real athlete, coach or parent data. Each one
 * carries `synthetic: true` and an id starting with "SYN-".
 *
 * The model only ever sees the sanitized context (role, readiness, tier,
 * trend, sleep debt, age band, phase, one factor, optional ACWR), so the
 * whole input space is small and enumerable. This module samples it in a
 * stratified, deterministic way: the same seed always gives the same set,
 * so two runs (e.g. before and after a prompt change) are comparable.
 */
import { sanitizeContext, readinessTier, FACTOR_LABELS } from '../../js/services/insightGuardrails.js';

const ROLES   = ['coach', 'player', 'parent', 'solo'];
// One representative readiness value per tier, plus the boundaries.
const RAWS    = { ready: [70, 82, 94], caution: [45, 58, 69], rest: [30, 38, 44] };
const AGES    = ['youth', 'adult', 'unknown'];
const PHASES  = ['off-season', 'pre-season', 'in-season', 'post-season', 'unknown'];
const FACTORS = Object.keys(FACTOR_LABELS);
const TRENDS  = ['improving', 'stable', 'declining'];
const ACWRS   = [null, null, 0.9, 1.4, 1.7]; // most contexts have no ACWR (none is produced today)

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
 * @param {{ perRole?: number, seed?: number }} opts
 * @returns {Array<{ id: string, synthetic: true, label: string, ctx: object }>}
 */
export function buildPersonas({ perRole = 60, seed = 20261020 } = {}) {
  const rand = prng(seed);
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  const personas = [];
  for (const role of ROLES) {
    for (let i = 0; i < perRole; i++) {
      // Stratify: cycle tiers and age bands evenly, randomize the rest.
      const tier = ['ready', 'caution', 'rest'][i % 3];
      const ageBand = role === 'parent' ? 'youth' : AGES[Math.floor(i / 3) % 3];
      const raw = pick(RAWS[tier]);
      const key = pick(FACTORS);
      // The lowest factor is usually below readiness; keep scores plausible (0–100).
      const score = Math.max(5, Math.min(95, Math.round(raw - 10 - rand() * 30)));
      const acwr = pick(ACWRS);
      const input = {
        role, raw, tier: readinessTier(raw), trend: pick(TRENDS),
        sleepDebt: key === 'sleepDebt' ? score : pick([null, 33, 67, 100]),
        ageBand, phase: pick(PHASES),
        factor: { key, score, max: 100, ...(acwr ? { acwr } : {}) },
      };
      const { ctx, errors } = sanitizeContext(input);
      if (!ctx) throw new Error(`persona generator produced invalid context: ${errors.join('; ')}`);
      const id = `SYN-${role}-${String(i + 1).padStart(3, '0')}`;
      personas.push({
        id, synthetic: true,
        label: `[SYNTHETIC] ${role}, ${ctx.tier} (${ctx.raw}), ${ctx.ageBand}, ${ctx.phase}, lowest ${key} ${score}${acwr ? `, ACWR ${acwr}` : ''}`,
        ctx,
      });
    }
  }
  return personas;
}
