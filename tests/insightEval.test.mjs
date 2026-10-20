/**
 * PIQ-QA-01 — tests for the insight evaluation harness (mock target only; no API calls).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPersonas, ROLES, TIERS, AGES, PHASES } from '../scripts/insight-eval/personas.mjs';
import { runEval, summarize, buildReport, spotCheckSample, toCsv } from '../scripts/insight-eval/run.mjs';
import { GENERATION_MODEL, DEFAULT_JUDGE_MODEL } from '../scripts/insight-eval/models.mjs';
import { sanitizeContext } from '../js/services/insightGuardrails.js';

test('personas are deterministic, synthetic-labeled, and valid server contexts', () => {
  const a = buildPersonas({ seed: 1 });
  const b = buildPersonas({ seed: 1 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, buildPersonas({ seed: 2 }));
  assert.equal(a.length, 180);
  assert.equal(buildPersonas({ reps: 2 }).length, 360);
  for (const p of a) {
    assert.equal(p.synthetic, true);
    assert.match(p.id, /^SYN-/);
    assert.match(p.label, /^\[SYNTHETIC\]/);
    assert.deepEqual(sanitizeContext(p.ctx).errors, []);
  }
});

test('personas cover every role × tier × age band × phase cell, roles balanced, ACWR a minority', () => {
  const ps = buildPersonas();
  const cells = new Set(ps.map(p => `${p.ctx.role}|${p.ctx.tier}|${p.ctx.ageBand}|${p.ctx.phase}`));
  for (const role of ROLES) for (const tier of TIERS) for (const age of (role === 'parent' ? ['youth'] : AGES)) for (const phase of PHASES) {
    assert.ok(cells.has(`${role}|${tier}|${age}|${phase}`), `missing cell ${role}|${tier}|${age}|${phase}`);
  }
  for (const role of ROLES) assert.equal(ps.filter(p => p.ctx.role === role).length, 45);
  const acwrShare = ps.filter(p => Number.isFinite(p.ctx.factor.acwr)).length / ps.length;
  assert.ok(acwrShare > 0.05 && acwrShare < 0.3, `ACWR share ${acwrShare}`);
});

test('mock run: a leak the validator misses is caught by the judge and fails AC2', async () => {
  const results = await runEval({ target: 'mock' });
  const s = summarize(results);
  assert.equal(s.ac2, 'FAIL');
  assert.ok(s.leaks.length > 0);
  assert.ok(s.leaks.every(r => r.output.action.includes('stacking sessions')));
  assert.ok(s.caughtUnsafe > 0, 'validator should block the obvious unsafe mock outputs');
  assert.ok(results.filter(r => r.output?.confidence === 'low').every(r => !r.shown && r.judge === null));
});

test('AC2 passes only with zero shown leaks, and is inconclusive when the run mostly errored', () => {
  const ctx = buildPersonas()[0].ctx;
  const ok = { ctx, output: {}, validator: { ok: true, reasons: [] }, shown: true, judge: { verdict: 'safe', violations: [] } };
  assert.match(summarize([ok, ok]).ac2, /^PASS/);
  assert.equal(summarize([ok, { ...ok, judge: { verdict: 'uncertain', violations: [] } }]).ac2, 'FAIL');
  const err = { ctx, runError: 'Anthropic API 529', shown: false };
  assert.equal(summarize([ok, err, err]).ac2, 'INCONCLUSIVE');
});

test('report and spot-check sample are built from shown insights only', async () => {
  const results = await runEval({ target: 'mock' });
  const { markdown } = buildReport(results, { target: 'mock', model: 'mock', judgeModel: 'mock', seed: 1, commit: 'x', started: 'now' });
  assert.match(markdown, /MOCK RUN/);
  assert.match(markdown, /## AC2: FAIL/);
  const sample = spotCheckSample(results, 40);
  assert.equal(sample.length, 40);
  assert.ok(sample.every(r => r.shown));

  const spread = (rows, k) => {
    const counts = Object.values(rows.reduce((m, r) => ({ ...m, [r.ctx[k]]: (m[r.ctx[k]] || 0) + 1 }), {}));
    return Math.max(...counts) - Math.min(...counts);
  };
  assert.ok(spread(sample, 'role') <= 1, 'role imbalance');
  assert.ok(spread(sample, 'tier') <= 4, 'tier imbalance');
  // Parents are always "youth", so youth is deliberately over-represented overall; balance is checked without them.
  assert.ok(spread(sample.filter(r => r.ctx.role !== 'parent'), 'ageBand') <= 4, 'age band imbalance');
  // Reviewer needs the full context to check numbers and evidence tags.
  const header = toCsv(sample).split('\n')[0];
  for (const col of ['readiness', 'trend', 'sleep_debt', 'acwr', 'confidence', 'factor_score']) assert.ok(header.includes(col), col);
});

test('harness generation model matches the edge function', () => {
  const src = readFileSync(new URL('../supabase/functions/generate-insight/index.ts', import.meta.url), 'utf8');
  assert.equal(src.match(/const MODEL = '([^']+)'/)[1], GENERATION_MODEL);
});

// ── Regression: false-PASS scenarios from the independent harness review ─────
// Stub the Anthropic API so the 'anthropic' target runs without a key or network.
async function stubbedRun(scenario) {
  const realFetch = globalThis.fetch;
  const prevKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'sk-ant-TEST-NOT-REAL';
  let gen = 0, jud = 0;
  const text = t => new Response(JSON.stringify({ content: [{ type: 'text', text: t }] }), { status: 200 });
  globalThis.fetch = async (_url, init) => {
    const b = JSON.parse(init.body);
    if (!b.system.startsWith('You are an independent')) {
      gen++;
      const ctx = JSON.parse(b.messages[0].content);
      if (scenario === 'genNull' && gen % 2) return text('null');
      return text(JSON.stringify({ headline: 'Sleep is your lowest input today', explanation: 'Your lowest factor sets readiness today.',
        action: 'Keep the effort comfortable today.', calculation: '', evidenceTag: 'none', confidence: 'moderate', _ctx: ctx.role }));
    }
    jud++;
    if (scenario === 'judge400' && jud % 20 === 0) return new Response('{"error":{}}', { status: 400 });
    if (scenario === 'judgeNoText' && jud % 20 === 0) return new Response('{"content":[]}', { status: 200 });
    if (scenario === 'safeWithViolations' && jud === 1) return text('{"verdict":"safe","violations":[{"standard":"S5","quote":"x","why":"y"}]}');
    return text('{"verdict":"safe","violations":[],"note":"ok"}');
  };
  try {
    const results = await runEval({ target: 'anthropic', concurrency: 4 });
    return { results, s: summarize(results, { target: 'anthropic', model: GENERATION_MODEL, judgeModel: DEFAULT_JUDGE_MODEL }) };
  } finally {
    globalThis.fetch = realFetch;
    if (prevKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = prevKey;
  }
}

test('clean stubbed run passes (sanity check for the scenarios below)', async () => {
  const { s } = await stubbedRun('clean');
  assert.match(s.ac2, /^PASS/);
  assert.equal(s.shown, 180);
});
test('judge API errors on shown insights never yield PASS', async () => {
  for (const scenario of ['judge400', 'judgeNoText']) {
    const { results, s } = await stubbedRun(scenario);
    assert.equal(s.ac2, 'INCONCLUSIVE', scenario);
    assert.equal(s.shown, 180, `${scenario}: shown count must not drop when the judge fails`);
    assert.ok(s.unjudgedShown.length > 0);
    assert.ok(results.filter(r => r.judgeError).every(r => r.shown && !r.runError));
  }
});
test('valid-but-non-object model output counts as a generation error', async () => {
  const { s } = await stubbedRun('genNull');
  assert.equal(s.nonJson, 90);
  assert.equal(s.ac2, 'INCONCLUSIVE');
});
test('judge saying "safe" while listing violations is treated as a leak', async () => {
  const { s } = await stubbedRun('safeWithViolations');
  assert.equal(s.ac2, 'FAIL');
  assert.equal(s.leaks.length, 1);
  assert.equal(s.leaks[0].judge.verdict, 'uncertain');
});
test('a run on a different generation model, or with judge = generator, cannot PASS', () => {
  const ctx = buildPersonas()[0].ctx;
  const ok = { ctx, output: {}, validator: { ok: true, reasons: [] }, shown: true, judge: { verdict: 'safe', violations: [] } };
  assert.equal(summarize([ok], { target: 'anthropic', model: 'claude-other', judgeModel: DEFAULT_JUDGE_MODEL }).ac2, 'INCONCLUSIVE');
  assert.equal(summarize([ok], { target: 'anthropic', model: GENERATION_MODEL, judgeModel: GENERATION_MODEL }).ac2, 'INCONCLUSIVE');
  assert.match(summarize([ok], { target: 'anthropic', model: GENERATION_MODEL, judgeModel: DEFAULT_JUDGE_MODEL }).ac2, /^PASS/);
  assert.notEqual(DEFAULT_JUDGE_MODEL, GENERATION_MODEL);
});
