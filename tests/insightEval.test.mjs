/**
 * PIQ-QA-01 — tests for the insight evaluation harness (mock target only; no API calls).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPersonas } from '../scripts/insight-eval/personas.mjs';
import { runEval, summarize, buildReport, spotCheckSample } from '../scripts/insight-eval/run.mjs';
import { GENERATION_MODEL } from '../scripts/insight-eval/models.mjs';
import { sanitizeContext } from '../js/services/insightGuardrails.js';

test('personas are deterministic, synthetic-labeled, and valid server contexts', () => {
  const a = buildPersonas({ perRole: 30, seed: 1 });
  const b = buildPersonas({ perRole: 30, seed: 1 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, buildPersonas({ perRole: 30, seed: 2 }));
  assert.equal(a.length, 120);
  for (const p of a) {
    assert.equal(p.synthetic, true);
    assert.match(p.id, /^SYN-/);
    assert.match(p.label, /^\[SYNTHETIC\]/);
    assert.deepEqual(sanitizeContext(p.ctx).errors, []);
  }
});

test('personas cover every role, tier, age band and the conservative cases', () => {
  const ps = buildPersonas();
  const has = (k, v) => ps.some(p => p.ctx[k] === v);
  for (const r of ['coach', 'player', 'parent', 'solo']) assert.ok(has('role', r));
  for (const t of ['ready', 'caution', 'rest']) assert.ok(has('tier', t));
  for (const a of ['youth', 'adult', 'unknown']) assert.ok(has('ageBand', a));
  assert.ok(has('phase', 'post-season'));
  assert.ok(ps.some(p => Number.isFinite(p.ctx.factor.acwr)));
  assert.ok(ps.filter(p => p.ctx.role === 'parent').every(p => p.ctx.ageBand === 'youth'));
});

test('mock run: a leak the validator misses is caught by the judge and fails AC2', async () => {
  const results = await runEval({ target: 'mock', perRole: 20 });
  const s = summarize(results);
  assert.equal(s.ac2, 'FAIL');
  assert.ok(s.leaks.length > 0);
  assert.ok(s.leaks.every(r => r.output.action.includes('stacking sessions')));
  assert.ok(s.caughtUnsafe > 0, 'validator should block the obvious unsafe mock outputs');
  assert.ok(results.filter(r => r.output?.confidence === 'low').every(r => !r.shown && r.judge === null));
});

test('AC2 passes only with zero shown leaks, and is inconclusive when the run mostly errored', () => {
  const ctx = buildPersonas({ perRole: 1 })[0].ctx;
  const ok = { ctx, output: {}, validator: { ok: true, reasons: [] }, shown: true, judge: { verdict: 'safe', violations: [] } };
  assert.match(summarize([ok, ok]).ac2, /^PASS/);
  assert.equal(summarize([ok, { ...ok, judge: { verdict: 'uncertain', violations: [] } }]).ac2, 'FAIL');
  const err = { ctx, runError: 'Anthropic API 529', shown: false };
  assert.equal(summarize([ok, err, err]).ac2, 'INCONCLUSIVE');
});

test('report and spot-check sample are built from shown insights only', async () => {
  const results = await runEval({ target: 'mock', perRole: 20 });
  const { markdown } = buildReport(results, { target: 'mock', model: 'mock', judgeModel: 'mock', seed: 1, commit: 'x', started: 'now' });
  assert.match(markdown, /MOCK RUN/);
  assert.match(markdown, /## AC2: FAIL/);
  const sample = spotCheckSample(results, 12);
  assert.equal(sample.length, 12);
  assert.ok(sample.every(r => r.shown));
  assert.equal(new Set(sample.map(r => r.ctx.role)).size, 4);
});

test('harness generation model matches the edge function', () => {
  const src = readFileSync(new URL('../supabase/functions/generate-insight/index.ts', import.meta.url), 'utf8');
  assert.equal(src.match(/const MODEL = '([^']+)'/)[1], GENERATION_MODEL);
});
