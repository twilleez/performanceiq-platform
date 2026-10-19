/**
 * insightGuardrails.js — PIQ AI Insight Layer: Response Standards enforcement
 * ═══════════════════════════════════════════════════════════════════════════
 * Encodes the "Performance IQ App – AI Response Standards" as code:
 *   1. buildSystemPrompt()   — the instructions the model generates under
 *   2. buildInsightContext() — the ONLY data the model is allowed to reference
 *   3. validateInsight()     — deterministic checks every output must pass
 *
 * PURE MODULE: no imports, no DOM, no Deno/Node APIs. It runs unchanged in
 * the browser (insightBuilder.js), in the Supabase Edge Function, and in
 * node:test.
 *
 * CANONICAL COPY lives at js/services/insightGuardrails.js.
 * supabase/functions/_shared/insightGuardrails.js is a byte-identical mirror
 * produced by `node scripts/sync-insight-guardrails.mjs`; a unit test fails
 * if the two drift. Edit this file, then run the sync script.
 *
 * Safety model: the validator only ever REJECTS. A rejected insight is
 * replaced by the static readiness copy, so the worst case is today's
 * behavior — never an unsafe or ungrounded insight.
 */

// ── Evidence base ────────────────────────────────────────────────────────────
// Tags must match the platform's evidence table. Do not add a tag without a
// verified primary source.
export const EVIDENCE_TAGS = ['Gabbett2016', 'Halson2014', 'Bompa2019', 'HulinEWMA', 'none'];

export const EVIDENCE_SOURCES = {
  Gabbett2016: 'Gabbett TJ (2016), British Journal of Sports Medicine — training–injury prevention paradox',
  Halson2014:  'Halson SL (2014), Sports Medicine — sleep in elite athletes',
  Bompa2019:   'Bompa & Buzzichelli (2019), Periodization: Theory and Methodology of Training, 6th ed.',
  HulinEWMA:   'Hulin et al. — acute:chronic workload ratio methodology',
  none:        null,
};

// Wellness factors produced by getReadinessScoreElite(). All are 0–100 where
// higher = better. 'hrv' is deliberately absent: selectorsElite._simulateHRV
// derives it from check-in answers — it is NOT a measured HRV and must never
// be presented to a user as one.
export const FACTOR_LABELS = {
  sleep:     'Sleep quality score',
  energy:    'Energy score',
  soreness:  'Soreness score (higher = less sore)',
  mood:      'Mood score',
  stress:    'Stress score (higher = less stressed)',
  sleepDebt: 'Sleep-debt score (higher = less sleep debt)',
};

const ROLES  = ['coach', 'player', 'parent', 'solo'];
const PHASES = ['off-season', 'pre-season', 'in-season', 'post-season'];
const YOUTH_LEVELS = ['youth', 'middle_school', 'high_school'];
const ADULT_LEVELS = ['collegiate', 'professional'];

// Published reference values the model may quote ONLY with the matching tag.
// Gabbett 2016: ACWR ~0.8–1.3 described as the lower-risk range, ≥1.5 as a spike.
const REFERENCE_NUMBERS = {
  Gabbett2016: [0.8, 1.3, 1.5],
  HulinEWMA:   [0.8, 1.3, 1.5],
};

const LIMITS = { headlineWords: 12, explanationSentences: 2, actionSentences: 1, fieldChars: 320, calculationChars: 240 };

// ── Context ──────────────────────────────────────────────────────────────────

export function readinessTier(raw) {
  if (raw >= 70) return 'ready';
  if (raw >= 45) return 'caution';
  return 'rest';
}

export function normalizeRole(role) {
  const r = String(role || 'solo').toLowerCase();
  return ROLES.includes(r) ? r : 'solo';
}

export function normalizePhase(phase) {
  const p = String(phase || '').toLowerCase().replace(/_/g, '-');
  return PHASES.includes(p) ? p : 'unknown';
}

/**
 * 'youth' | 'adult' | 'unknown'. Exact age never leaves the device — only the
 * band is sent to the model (data minimization). Anything other than 'adult'
 * gets youth-conservative rules (Standards §7: respect developmental stages).
 */
export function deriveAgeBand(profile = {}, role) {
  if (normalizeRole(role) === 'parent') return 'youth';
  const age = Number(profile.age);
  if (profile.age !== '' && profile.age != null && Number.isFinite(age) && age > 0) {
    return age < 18 ? 'youth' : 'adult';
  }
  if (YOUTH_LEVELS.includes(profile.level)) return 'youth';
  if (ADULT_LEVELS.includes(profile.level)) return 'adult';
  return 'unknown';
}

/**
 * Picks the single lowest-scoring wellness factor. Accepts the real selector
 * shape ({ sleep: 62, energy: 80, ... }) and the legacy array shape
 * ([{ label, score, max }]). Returns null when nothing is explainable — the
 * caller must then skip generation and use the static fallback.
 */
export function selectExplanatoryFactor(factors) {
  if (Array.isArray(factors)) {
    const valid = factors.filter(f => f && Number.isFinite(f.score) && Number.isFinite(f.max) && f.max > 0);
    if (!valid.length) return null;
    const worst = valid.reduce((w, f) => (f.score / f.max) < (w.score / w.max) ? f : w);
    return { key: worst.key || null, label: String(worst.label || worst.key || 'factor'),
             score: _round(worst.score), max: worst.max,
             ...(Number.isFinite(worst.acwr) ? { acwr: _round(worst.acwr, 2) } : {}) };
  }
  if (!factors || typeof factors !== 'object') return null;
  const entries = Object.keys(FACTOR_LABELS)
    .filter(k => Number.isFinite(factors[k]))
    .map(k => ({ key: k, label: FACTOR_LABELS[k], score: _round(factors[k]), max: 100 }));
  if (!entries.length) return null;
  return entries.reduce((w, f) => f.score < w.score ? f : w);
}

/**
 * The complete, minimal payload sent to the model. Nothing else about the
 * athlete (name, exact age, injury history, notes) is included.
 */
export function buildInsightContext({ role, readiness = {}, profile = {} } = {}) {
  const raw = Number.isFinite(readiness.raw) ? Math.round(readiness.raw) : null;
  return {
    role:      normalizeRole(role),
    raw,
    tier:      raw == null ? null : readinessTier(raw),
    trend:     ['improving', 'stable', 'declining'].includes(readiness.trend) ? readiness.trend : 'stable',
    sleepDebt: Number.isFinite(readiness.sleepDebt) ? _round(readiness.sleepDebt) : null,
    ageBand:   deriveAgeBand(profile, role),
    phase:     normalizePhase(profile.compPhase),
    factor:    selectExplanatoryFactor(readiness.factors),
  };
}

/** Server-side input check. Returns an array of problems (empty = valid). */
export function validateContext(ctx) {
  const errs = [];
  if (!ctx || typeof ctx !== 'object') return ['context missing'];
  if (!ROLES.includes(ctx.role)) errs.push('role invalid');
  if (!Number.isFinite(ctx.raw) || ctx.raw < 0 || ctx.raw > 100) errs.push('raw must be 0–100');
  if (ctx.tier !== readinessTier(ctx.raw)) errs.push('tier inconsistent with raw');
  if (!['youth', 'adult', 'unknown'].includes(ctx.ageBand)) errs.push('ageBand invalid');
  if (![...PHASES, 'unknown'].includes(ctx.phase)) errs.push('phase invalid');
  const f = ctx.factor;
  if (!f || typeof f.label !== 'string' || !Number.isFinite(f.score) || !Number.isFinite(f.max) || f.max <= 0) {
    errs.push('factor missing or malformed');
  }
  return errs;
}

// ── System prompt ────────────────────────────────────────────────────────────

export function buildSystemPrompt() {
  return `You write one short training-readiness insight for the PerformanceIQ app.
Athletes, coaches and parents act on it, so accuracy and safety outrank sounding impressive.
Any output that breaks a rule below is discarded and replaced with static copy — when unsure,
set confidence to "low"; that is always the correct choice over guessing.

DATA (Standards §1, §6)
1. Use ONLY the JSON in the user message. Never invent a number, factor, trend, history, or cause.
2. Every factor is a 0–100 app score derived from a self-reported check-in, not a lab or
   device measurement. Say "score", never imply a measurement. Never mention HRV.
3. If the data cannot explain readiness, say so plainly and set confidence "low".

NUMBERS (Standards §3)
4. Any number in headline/explanation/action must come from the input (raw, factor.score,
   factor.max, sleepDebt, factor.acwr). Do not invent percentages, durations, set/rep counts,
   or hours. Prefer no numbers over unsupported ones.
5. If you use any number, fill "calculation" with one plain line showing where it came from,
   e.g. "Readiness 58 = today's check-in model; lowest factor is sleep score 40/100".
   Otherwise "calculation" is "".

EVIDENCE (Standards §2)
6. evidenceTag is exactly one of: ${EVIDENCE_TAGS.join(', ')}. Use a tag only when the data supports it:
   - Halson2014: only when the factor is sleep quality or sleep debt.
   - Gabbett2016 / HulinEWMA: only when factor.acwr is present. ACWR evidence is debated, so
     present it as a monitoring signal, never as an injury prediction, and confidence must be
     "moderate", not "high". You may cite 0.8–1.3 (lower-risk range) and 1.5 (spike) only here.
   - Bompa2019: only when phase is known and the insight is about phase-appropriate training.
   - Otherwise "none". Never force a citation.

SAFETY (Standards §4, §7)
7. Not medical. No diagnosis, no named conditions or injuries, no medication, no
   "see a doctor immediately". If pain, injury or feeling unwell is relevant, say to check in
   with a coach, athletic trainer, or qualified healthcare professional.
8. Safety over performance. Never "push through", "no pain no gain", or guarantees.
9. When tier is "caution" or "rest", or phase is "post-season", do not suggest maxing out,
   1RM/PR attempts, all-out efforts, or adding volume/intensity/sessions.
10. When ageBand is "youth" or "unknown", treat the athlete as developing: no max-effort or
    1RM work, no weight-cutting or calorie-deficit advice, no extra sessions, regardless of tier.
11. Stay consistent with the phase: in-season = manage fatigue around competition,
    post-season = recovery; never recommend peak loading in a recovery context.

ROLE (Standards §4)
- coach: options and decision levers ("consider…", "one option is…"); never dictate.
- player: plain language, second person, one clear step.
- parent: calm, non-alarming, about long-term development and safety; nothing urgent-sounding.
- solo: plain language, second person; light technical terms are fine if briefly explained.

FORMAT
headline ≤ ${LIMITS.headlineWords} words. explanation ≤ ${LIMITS.explanationSentences} sentences. action exactly 1 sentence.
confidence is "high", "moderate", or "low".
Respond with ONLY this JSON object — no markdown, no preamble:
{"headline":"...","explanation":"...","action":"...","calculation":"...","evidenceTag":"...","confidence":"..."}`;
}

// ── Output validation ────────────────────────────────────────────────────────

const MEDICAL_PATTERNS = [
  /\bdiagnos/i, /\bprescri/i, /\bmedicat/i, /\bmedical condition\b/i,
  /\byou (have|might have|may have|probably have)\b.{0,30}\b(injur|condition|disorder|concussion|fracture|tear|strain|sprain|infection|illness)/i,
  /\b(concussion|fracture|tendin|tendon(itis)?|stress reaction|overtraining syndrome|rhabdo)/i,
  /\bsee a doctor immediately\b/i, /\bemergency\b/i,
  /\b(sprain(ed)?|fractured?|torn|ligament|meniscus|ACL|MCL|shin splints)\b/i,
  /\b(ibuprofen|acetaminophen|paracetamol|naproxen|aspirin|anti-?inflammator\w*|painkillers?|pain relievers?)\b/i,
];
const PAIN_PATTERN = /\b(pain|painful|injur|hurt|hurting|unwell|sick)/i;
// A coach alone does not satisfy the referral rule (Standards §4: "qualified professional").
const REFERRAL_PATTERN = /\b(athletic trainer|physio|physiotherapist|physical therapist|doctor|physician|qualified (healthcare |health |medical )?professional|healthcare provider)\b/i;
const UNSAFE_PATTERNS = [
  /\bpush(ing)? through\b/i, /\bno pain,? no gain\b/i, /\btrain(ing)? through (the )?pain\b/i,
  /\bguarantee/i, /\b100\s?%/i, /\bproven to\b/i, /\brisk[- ]free\b/i,
  /\b(will|to) prevent (an |all )?injur/i, /\beliminat\w* (the |any |all )?(injury )?risk/i,
  /\bHRV\b/i, /\bheart rate variability\b/i,
  /\bignor(e|ing) (the |your |any )?(soreness|pain|fatigue|tiredness|warning signs?)\b/i,
  /\b(stay(ing)? up late|less sleep|cut(ting)? (back on )?sleep|skip(ping)? (sleep|rest|recovery))\b/i,
];
const INTENSITY_ESCALATION = [
  /\bmax(imal)?[- ](effort|out|intensity|attempt)/i, /\bmax out\b/i, /\b1\s?RM\b/i, /\bone[- ]rep max/i,
  /\bPR attempt/i, /\bPRs?\b/, /\bpersonal (record|best)\b/i, /\bgo (hard|heavy|big)\b/i,
  /\b(another|second|extra|additional) (workout|session|practice|run|lift)\b/i,
  /\b(lift|go|train|run) (heavier|harder|longer)\b/i, /\b(heavier|harder|longer) than (usual|normal)\b/i, /\ball[- ]out\b/i, /\bpush (hard|harder|it)\b/i,
  /\b(increase|raise|bump up|ramp up)\b.{0,20}\b(volume|load|intensity|sessions?)\b/i,
  /\badd(ing)? (more |extra )?(sets|reps|volume|sessions?|load)\b/i,
  /\b(double|extra) sessions?\b/i, /\btwo[- ]a[- ]days?\b/i,
];
const YOUTH_ONLY = [
  /\bcut(ting)? weight\b/i, /\bweight[- ]cut/i, /\blose weight\b/i, /\bcalorie deficit\b/i,
  /\b(skip|skipping) meals?\b/i, /\bfast(ing|ed)\b/i,
];

/**
 * @param {object} out  model output { headline, explanation, action, calculation, evidenceTag, confidence }
 * @param {object} ctx  the context built by buildInsightContext()
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function validateInsight(out, ctx) {
  const reasons = [];
  if (!out || typeof out !== 'object') return { ok: false, reasons: ['output not an object'] };
  if (!ctx || typeof ctx !== 'object') return { ok: false, reasons: ['context missing'] };

  const { headline, explanation, action, evidenceTag, confidence } = out;
  const calculation = out.calculation == null ? '' : out.calculation;

  // Contract
  for (const [k, v] of Object.entries({ headline, explanation, action })) {
    if (typeof v !== 'string' || !v.trim()) reasons.push(`${k} missing`);
    else if (v.length > LIMITS.fieldChars) reasons.push(`${k} too long`);
  }
  if (typeof calculation !== 'string') reasons.push('calculation must be a string');
  else if (calculation.length > LIMITS.calculationChars) reasons.push('calculation too long');
  if (!EVIDENCE_TAGS.includes(evidenceTag)) reasons.push('evidenceTag not allowed');
  if (!['high', 'moderate', 'low'].includes(confidence)) reasons.push('confidence invalid');
  if (confidence === 'low') reasons.push('low confidence');
  if (reasons.length) return { ok: false, reasons };

  if (_words(headline) > LIMITS.headlineWords) reasons.push('headline over word limit');
  if (_sentences(explanation) > LIMITS.explanationSentences) reasons.push('explanation over sentence limit');
  if (_sentences(action) > LIMITS.actionSentences) reasons.push('action over sentence limit');

  // NFKC folds look-alike Unicode (e.g. full-width "１ＲＭ") before pattern checks.
  const text = `${headline} ${explanation} ${action}`.normalize('NFKC');
  const all  = `${text} ${calculation.normalize('NFKC')}`;

  // §4 / §6 — medical and unsafe language
  if (MEDICAL_PATTERNS.some(rx => rx.test(all))) reasons.push('medical or diagnostic language');
  if (PAIN_PATTERN.test(text) && !REFERRAL_PATTERN.test(text)) reasons.push('pain/injury mentioned without professional referral');
  if (UNSAFE_PATTERNS.some(rx => rx.test(all))) reasons.push('unsafe, overclaiming, or unsupported-measurement language');

  // §7 — tier, phase and developmental-stage consistency
  const conservative = ctx.tier !== 'ready' || ctx.phase === 'post-season' || ctx.ageBand !== 'adult';
  if (conservative && INTENSITY_ESCALATION.some(rx => rx.test(text))) {
    reasons.push(`intensity escalation not allowed (tier=${ctx.tier}, phase=${ctx.phase}, ageBand=${ctx.ageBand})`);
  }
  if (ctx.ageBand !== 'adult' && YOUTH_ONLY.some(rx => rx.test(text))) reasons.push('weight-cutting/restriction language for youth athlete');

  // §2 — evidence tag must be supported by the supplied data
  const f = ctx.factor || {};
  if (evidenceTag === 'Halson2014' && !['sleep', 'sleepDebt'].includes(f.key) && !/sleep/i.test(f.label || '')) {
    reasons.push('Halson2014 used without a sleep factor');
  }
  if ((evidenceTag === 'Gabbett2016' || evidenceTag === 'HulinEWMA')) {
    if (!Number.isFinite(f.acwr)) reasons.push(`${evidenceTag} used without ACWR data`);
    if (confidence === 'high') reasons.push('ACWR-based insight cannot claim high confidence (evidence is debated)');
  }
  if (evidenceTag === 'Bompa2019' && ctx.phase === 'unknown') reasons.push('Bompa2019 used without a known phase');

  // §3 — every number must be traceable to input, and derivations shown
  const allowed = _allowedNumbers(ctx, evidenceTag);
  const textNums = _numbers(text);
  const stray = textNums.filter(n => !allowed.some(a => Math.abs(a - n) <= 0.051));
  if (stray.length) reasons.push(`ungrounded number(s): ${stray.join(', ')}`);
  if (textNums.length && !calculation.trim()) reasons.push('numbers used without calculation');

  return { ok: reasons.length === 0, reasons };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function _round(n, dp = 0) { const m = 10 ** dp; return Math.round(n * m) / m; }
function _words(s) { return s.trim().split(/\s+/).filter(Boolean).length; }
function _sentences(s) {
  // Terminators, semicolons and line breaks all split sentences; decimals ("1.3") do not.
  const t = s.trim().replace(/(\d)\.(\d)/g, '$1$2');
  const n = (t.match(/([.!?]+|;)(\s|$)|\n+/g) || []).length;
  const endsClean = /[.!?;]$/.test(t);
  return Math.max(1, endsClean ? n : n + 1);
}
// Number words count as numbers so "twenty extra minutes" can't bypass grounding.
// "one" is excluded: it is overwhelmingly used as an article ("one option").
const NUMBER_WORDS = { two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10,
  eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18,
  nineteen:19, twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90, hundred:100 };
function _numbers(s) {
  const t = s.normalize('NFKC').replace(/(\d),(\d{3})/g, '$1$2');
  const digits = (t.match(/\d+(\.\d+)?/g) || []).map(Number);
  const words = (t.toLowerCase().match(/\b[a-z]+\b/g) || []).filter(w => w in NUMBER_WORDS).map(w => NUMBER_WORDS[w]);
  return [...digits, ...words];
}
function _allowedNumbers(ctx, tag) {
  const f = ctx.factor || {};
  return [ctx.raw, ctx.sleepDebt, f.score, f.max, f.acwr, ...(REFERENCE_NUMBERS[tag] || [])]
    .filter(Number.isFinite);
}
