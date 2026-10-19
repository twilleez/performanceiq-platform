/**
 * PerformanceIQ — AI insight guardrail tests (PIQ-AI-01)
 * Each test maps to a section of the "Performance IQ App – AI Response Standards".
 * All fixtures are synthetic.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildInsightContext, validateContext, validateInsight, selectExplanatoryFactor,
  deriveAgeBand, normalizePhase, readinessTier, buildSystemPrompt, EVIDENCE_TAGS, EVIDENCE_SOURCES,
} from '../js/services/insightGuardrails.js';

// Real selector shape from getReadinessScoreElite(): factors is an OBJECT of 0–100 scores.
const readiness = (raw = 58, factors = { sleep: 40, energy: 80, soreness: 72, mood: 80, stress: 70, sleepDebt: 67, hrv: 10 }) =>
  ({ raw, trend: 'stable', sleepDebt: factors.sleepDebt ?? null, factors });
const adultReady = buildInsightContext({ role: 'solo', readiness: readiness(82), profile: { age: 24, compPhase: 'off-season' } });
const youthCaution = buildInsightContext({ role: 'player', readiness: readiness(58), profile: { age: 16, compPhase: 'in-season' } });

const good = (o = {}) => ({
  headline: 'Sleep is holding your readiness back today',
  explanation: 'Your sleep quality score is the lowest factor in today\'s check-in. Keep the session controlled and technique-focused.',
  action: 'Train at a comfortable effort and prioritize sleep tonight.',
  calculation: '',
  evidenceTag: 'Halson2014',
  confidence: 'moderate',
  ...o,
});
const reject = (out, ctx, re) => {
  const v = validateInsight(out, ctx);
  assert.equal(v.ok, false, `expected rejection, got ok for: ${JSON.stringify(out)}`);
  if (re) assert.ok(v.reasons.some(r => re.test(r)), `reasons ${JSON.stringify(v.reasons)} did not match ${re}`);
};

// ── Context / data minimization ─────────────────────────────────────────────
test('factor selection handles the real object shape (previously always null)', () => {
  const f = selectExplanatoryFactor(readiness().factors);
  assert.deepEqual(f, { key: 'sleep', label: 'Sleep quality score', score: 40, max: 100 });
});
test('simulated HRV is never selected as an explanatory factor', () => {
  assert.equal(selectExplanatoryFactor({ hrv: 5, sleep: 90 }).key, 'sleep');
  assert.equal(selectExplanatoryFactor({ hrv: 5 }), null);
});
test('legacy array factor shape still works; empty input yields null', () => {
  assert.equal(selectExplanatoryFactor([{ label: 'A', score: 8, max: 10 }, { label: 'B', score: 2, max: 10 }]).label, 'B');
  assert.equal(selectExplanatoryFactor({}), null);
  assert.equal(selectExplanatoryFactor(undefined), null);
});
test('context contains only whitelisted fields — no name, exact age, or injury history', () => {
  const ctx = buildInsightContext({ role: 'player', readiness: readiness(), profile: { age: 16, name: 'X', injuryHistory: 'ACL', compPhase: 'in_season' } });
  assert.deepEqual(Object.keys(ctx).sort(), ['ageBand', 'factor', 'phase', 'raw', 'role', 'sleepDebt', 'tier', 'trend']);
  assert.equal(ctx.ageBand, 'youth');
  assert.equal(ctx.phase, 'in-season');
  assert.deepEqual(validateContext(ctx), []);
});
test('age band: parent role and unknown age are never treated as adult (§7)', () => {
  assert.equal(deriveAgeBand({ age: 30 }, 'parent'), 'youth');
  assert.equal(deriveAgeBand({ age: '' }, 'solo'), 'unknown');
  assert.equal(deriveAgeBand({ level: 'high_school' }, 'solo'), 'youth');
  assert.equal(deriveAgeBand({ level: 'collegiate' }, 'solo'), 'adult');
  assert.equal(deriveAgeBand({ age: 17, level: 'collegiate' }, 'solo'), 'youth');
});
test('tier thresholds match the existing fallback thresholds', () => {
  assert.equal(readinessTier(70), 'ready'); assert.equal(readinessTier(69), 'caution');
  assert.equal(readinessTier(45), 'caution'); assert.equal(readinessTier(44), 'rest');
  assert.equal(normalizePhase('post_season'), 'post-season'); assert.equal(normalizePhase('peak'), 'unknown');
});
test('server rejects malformed or inconsistent input', () => {
  assert.ok(validateContext({ ...youthCaution, tier: 'ready' }).includes('tier inconsistent with raw'));
  assert.ok(validateContext({ ...youthCaution, factor: null }).includes('factor missing or malformed'));
  assert.ok(validateContext({ ...youthCaution, role: 'admin' }).includes('role invalid'));
});

// ── Contract ────────────────────────────────────────────────────────────────
test('a well-formed, grounded insight passes', () => {
  assert.deepEqual(validateInsight(good(), youthCaution), { ok: true, reasons: [] });
});
test('contract: missing fields, bad tag, invalid or low confidence are rejected', () => {
  reject(good({ action: '' }), youthCaution, /action missing/);
  reject(good({ evidenceTag: 'Smith2021' }), youthCaution, /evidenceTag/);
  reject(good({ confidence: 'certain' }), youthCaution, /confidence invalid/);
  reject(good({ confidence: 'low' }), youthCaution, /low confidence/);
});
test('length limits: headline ≤12 words, explanation ≤2 sentences, action 1 sentence', () => {
  reject(good({ headline: 'one two three four five six seven eight nine ten eleven twelve thirteen' }), youthCaution, /headline/);
  reject(good({ explanation: 'One. Two. Three.' }), youthCaution, /explanation/);
  reject(good({ action: 'Rest. Then stretch.' }), youthCaution, /action/);
});

// ── §2 Evidence ─────────────────────────────────────────────────────────────
test('evidence tag must be supported by the supplied data', () => {
  const energyCtx = { ...adultReady, factor: { key: 'energy', label: 'Energy score', score: 50, max: 100 } };
  reject(good(), energyCtx, /Halson2014 used without a sleep factor/);
  reject(good({ evidenceTag: 'Gabbett2016' }), youthCaution, /without ACWR data/);
  reject(good({ evidenceTag: 'Bompa2019' }), { ...youthCaution, phase: 'unknown' }, /without a known phase/);
});
test('ACWR insights cannot claim high confidence; reference values allowed only with the tag', () => {
  const acwrCtx = { ...adultReady, factor: { key: null, label: 'Workload', score: 60, max: 100, acwr: 1.6 } };
  const acwr = good({ evidenceTag: 'Gabbett2016', explanation: 'Your workload ratio is 1.6, above the 1.5 spike marker.',
                      calculation: 'ACWR 1.6 supplied by load engine; 1.5 = Gabbett 2016 spike marker' });
  assert.equal(validateInsight(acwr, acwrCtx).ok, true);
  reject({ ...acwr, confidence: 'high' }, acwrCtx, /high confidence/);
  reject({ ...acwr, evidenceTag: 'none' }, acwrCtx, /ungrounded number/);
});
test('every tag has a source label except none', () => {
  for (const t of EVIDENCE_TAGS) assert.equal(t === 'none' ? EVIDENCE_SOURCES[t] === null : typeof EVIDENCE_SOURCES[t] === 'string', true);
});

// ── §3 Numbers ──────────────────────────────────────────────────────────────
test('numbers must come from input and be accompanied by a calculation', () => {
  const withNum = good({ explanation: 'Readiness is 58 and your sleep score is 40/100.' });
  reject(withNum, youthCaution, /numbers used without calculation/);
  assert.equal(validateInsight({ ...withNum, calculation: 'Readiness 58 from check-in model; sleep score 40 of 100' }, youthCaution).ok, true);
  reject(good({ action: 'Reduce volume by 20% today.', calculation: 'estimate' }), youthCaution, /ungrounded number\(s\): 20/);
  reject(good({ action: 'Aim for 9 hours of sleep tonight.', calculation: 'target' }), youthCaution, /ungrounded/);
});

// ── §4 / §6 Medical and unsafe language ────────────────────────────────────
test('medical / diagnostic language is rejected', () => {
  reject(good({ explanation: 'You may have a strain in your hamstring.' }), youthCaution, /medical/);
  reject(good({ action: 'Take ibuprofen as prescribed.' }), youthCaution, /medical/);
  reject(good({ explanation: 'This pattern can indicate a concussion.' }), youthCaution, /medical/);
});
test('mentioning pain requires a qualified-professional referral; a coach alone is not enough', () => {
  reject(good({ action: 'If anything causes pain, tell your coach.' }), youthCaution, /referral/);
  assert.equal(validateInsight(good({ action: 'If anything causes pain, stop and check in with an athletic trainer.' }), youthCaution).ok, true);
});
test('overclaiming, push-through, and measured-HRV language are rejected', () => {
  reject(good({ action: 'Push through the soreness today.' }), adultReady, /unsafe/);
  reject(good({ explanation: 'This plan is guaranteed to keep you healthy.' }), adultReady, /unsafe/);
  reject(good({ explanation: 'Your HRV is low today.' }), adultReady, /unsafe/);
  reject(good({ explanation: 'Recovery work will prevent injuries this week.' }), adultReady, /unsafe/);
});

// ── §7 Safety, developmental stage, periodization ──────────────────────────
test('no intensity escalation in caution/rest tiers', () => {
  const adultCaution = { ...youthCaution, ageBand: 'adult' };
  reject(good({ action: 'Go for a 1RM attempt on squat.' }), adultCaution, /intensity escalation/);
  reject(good({ action: 'Add extra sets to make up for yesterday.' }), adultCaution, /intensity escalation/);
});
test('no intensity escalation for youth even when ready', () => {
  const youthReady = { ...adultReady, ageBand: 'youth' };
  reject(good({ action: 'Go all-out on your sprints today.' }), youthReady, /intensity escalation/);
  reject(good({ action: 'Consider cutting weight before the next game.' }), youthReady, /youth/);
});
test('no peak loading in post-season (recovery phase) even for a ready adult', () => {
  reject(good({ action: 'Increase your training volume this week.' }), { ...adultReady, phase: 'post-season' }, /intensity escalation/);
});
test('a ready adult in a normal phase may train hard', () => {
  assert.equal(validateInsight(good({ action: 'Push hard on your main lift today.' }), adultReady).ok, true);
});

// ── Prompt + deployment integrity ──────────────────────────────────────────
test('system prompt encodes each standard area', () => {
  const p = buildSystemPrompt();
  for (const s of ['ONLY the JSON', 'calculation', 'Halson2014', 'Not medical', 'Safety over performance',
                   'youth', 'post-season', 'coach:', 'parent:', 'confidence']) assert.ok(p.includes(s), `prompt missing: ${s}`);
});
test('edge function _shared mirror is identical to the canonical module', () => {
  const a = readFileSync(new URL('../js/services/insightGuardrails.js', import.meta.url), 'utf8');
  const b = readFileSync(new URL('../supabase/functions/_shared/insightGuardrails.js', import.meta.url), 'utf8');
  assert.equal(b, a, 'run: node scripts/sync-insight-guardrails.mjs');
});
test('edge function imports the shared guardrails and handles CORS preflight', () => {
  const src = readFileSync(new URL('../supabase/functions/generate-insight/index.ts', import.meta.url), 'utf8');
  assert.match(src, /from '\.\.\/_shared\/insightGuardrails\.js'/);
  assert.match(src, /validateInsight\(/);
  assert.match(src, /validateContext\(/);
  assert.match(src, /req\.method === 'OPTIONS'/);
});
test('fallback tier mapping targets real READINESS_COPY keys (previously returned "Log your wellness" copy)', async () => {
  const { READINESS_COPY } = await import('../js/components/readiness-copy.js');
  const src = readFileSync(new URL('../js/services/insightBuilder.js', import.meta.url), 'utf8');
  const map = src.match(/TIER_TO_COPY_KEY\s*=\s*\{([^}]+)\}/)[1];
  const pairs = Object.fromEntries([...map.matchAll(/(\w+)\s*:\s*'(\w+)'/g)].map(m => [m[1], m[2]]));
  assert.deepEqual(Object.keys(pairs).sort(), ['caution', 'ready', 'rest']);
  for (const k of Object.values(pairs)) assert.ok(READINESS_COPY[k], `READINESS_COPY has no key "${k}"`);
});
