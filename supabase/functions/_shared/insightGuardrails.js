/**
 * insightGuardrails.js — PIQ AI Insight Layer: Response Standards enforcement
 * ═══════════════════════════════════════════════════════════════════════════
 * Encodes the "Performance IQ App – AI Response Standards" as code:
 *   1. buildSystemPrompt()   — the instructions the model generates under
 *   2. buildInsightContext() — the ONLY data the model is allowed to reference
 *   3. sanitizeContext()     — server-side rebuild of that context from a whitelist
 *   4. validateInsight()     — deterministic checks every output must pass
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
 * behavior — never an unsafe or ungrounded insight. The pattern lists are a
 * backstop behind the prompt, not a proof of safety: new paraphrases can
 * still get through, so the lists are covered by regression tests and should
 * grow as synthetic testing finds gaps.
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
// These labels are the ONLY factor text the model ever sees: the server
// replaces any client-supplied label with the entry here.
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
const TRENDS = ['improving', 'stable', 'declining'];
const AGE_BANDS = ['youth', 'adult', 'unknown'];
const YOUTH_LEVELS = ['youth', 'middle_school', 'high_school'];
const ADULT_LEVELS = ['collegiate', 'professional'];
const ACWR_MAX = 3; // values above this are not physiologically plausible input

// Published reference values the model may quote ONLY with the matching tag.
// Gabbett 2016: ACWR ~0.8–1.3 described as the lower-risk range, ≥1.5 as a spike.
const REFERENCE_NUMBERS = {
  Gabbett2016: [0.8, 1.3, 1.5],
  HulinEWMA:   [0.8, 1.3, 1.5],
};

// Publication year of each tag — the only extra number a calculation line may cite.
const EVIDENCE_YEARS = { Gabbett2016: 2016, Halson2014: 2014, Bompa2019: 2019 };

const LIMITS = {
  headlineWords: 12, explanationSentences: 2, actionSentences: 1,
  explanationWords: 45, actionWords: 25,
  fieldChars: 320, calculationChars: 240,
};

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
 * Picks the single lowest-scoring wellness factor, normalized to 0–100.
 * Accepts the real selector shape ({ sleep: 62, energy: 80, ... }) and the
 * legacy array shape ([{ key, score, max, acwr? }]); array items whose key is
 * not in FACTOR_LABELS are ignored. Returns null when nothing is explainable —
 * the caller must then skip generation and use the static fallback.
 */
export function selectExplanatoryFactor(factors) {
  let entries;
  if (Array.isArray(factors)) {
    entries = factors
      .filter(f => f && FACTOR_LABELS[f.key] && Number.isFinite(f.score) && Number.isFinite(f.max) && f.max > 0)
      .map(f => ({
        key: f.key, label: FACTOR_LABELS[f.key],
        score: _clamp(_round((f.score / f.max) * 100), 0, 100), max: 100,
        ...(_validAcwr(f.acwr) ? { acwr: _round(f.acwr, 2) } : {}),
      }));
  } else if (factors && typeof factors === 'object') {
    entries = Object.keys(FACTOR_LABELS)
      .filter(k => Number.isFinite(factors[k]))
      .map(k => ({ key: k, label: FACTOR_LABELS[k], score: _clamp(_round(factors[k]), 0, 100), max: 100 }));
  } else {
    return null;
  }
  if (!entries.length) return null;
  return entries.reduce((w, f) => f.score < w.score ? f : w);
}

/**
 * The complete, minimal payload sent to the model. Nothing else about the
 * athlete (name, exact age, injury history, notes) is included.
 */
export function buildInsightContext({ role, readiness = {}, profile = {} } = {}) {
  const raw = Number.isFinite(readiness.raw) ? _clamp(Math.round(readiness.raw), 0, 100) : null;
  return {
    role:      normalizeRole(role),
    raw,
    tier:      raw == null ? null : readinessTier(raw),
    trend:     TRENDS.includes(readiness.trend) ? readiness.trend : 'stable',
    sleepDebt: Number.isFinite(readiness.sleepDebt) ? _clamp(_round(readiness.sleepDebt), 0, 100) : null,
    ageBand:   deriveAgeBand(profile, role),
    phase:     normalizePhase(profile.compPhase),
    factor:    selectExplanatoryFactor(readiness.factors),
  };
}

/**
 * Server-side input gate. Rebuilds the context field by field from the
 * whitelist above; nothing the client sent is forwarded as-is. Free text
 * (factor labels, unknown keys, extra fields) is dropped, so client input
 * cannot inject instructions or personal data into the model call.
 *
 * @returns {{ ctx: object|null, errors: string[] }}  ctx is null when errors is non-empty
 */
export function sanitizeContext(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ctx: null, errors: ['context missing'] };
  const errors = [];

  const role = ROLES.includes(input.role) ? input.role : null;
  if (!role) errors.push('role invalid');

  const raw = Number.isFinite(input.raw) && input.raw >= 0 && input.raw <= 100 ? Math.round(input.raw) : null;
  if (raw == null) errors.push('raw must be 0–100');
  const tier = raw == null ? null : readinessTier(raw);
  if (input.tier !== undefined && input.tier !== tier) errors.push('tier inconsistent with raw');

  const trend = input.trend === undefined ? 'stable' : input.trend;
  if (!TRENDS.includes(trend)) errors.push('trend invalid');

  let sleepDebt = null;
  if (input.sleepDebt != null) {
    if (Number.isFinite(input.sleepDebt) && input.sleepDebt >= 0 && input.sleepDebt <= 100) sleepDebt = _round(input.sleepDebt);
    else errors.push('sleepDebt must be 0–100 or null');
  }

  const ageBand = input.ageBand === undefined ? 'unknown' : input.ageBand;
  if (!AGE_BANDS.includes(ageBand)) errors.push('ageBand invalid');

  const phase = input.phase === undefined ? 'unknown' : input.phase;
  if (![...PHASES, 'unknown'].includes(phase)) errors.push('phase invalid');

  let factor = null;
  const f = input.factor;
  if (!f || typeof f !== 'object' || !FACTOR_LABELS[f.key] || !Number.isFinite(f.score) || f.max !== 100 || f.score < 0 || f.score > 100) {
    errors.push('factor missing or malformed');
  } else {
    factor = { key: f.key, label: FACTOR_LABELS[f.key], score: _round(f.score), max: 100 };
    if (f.acwr != null) {
      if (_validAcwr(f.acwr)) factor.acwr = _round(f.acwr, 2);
      else errors.push(`factor.acwr must be between 0 and ${ACWR_MAX}`);
    }
  }

  if (errors.length) return { ctx: null, errors };
  return { ctx: { role, raw, tier, trend, sleepDebt, ageBand, phase, factor }, errors };
}

/** Input check only. Returns an array of problems (empty = valid). */
export function validateContext(input) {
  return sanitizeContext(input).errors;
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
   device measurement. Say "score", never imply a measurement. Never mention HRV or the
   nervous system.
3. If the data cannot explain readiness, say so plainly and set confidence "low".

NUMBERS (Standards §3)
4. The only numbers you may write are raw (readiness), factor.score, factor.max, sleepDebt,
   and factor.acwr. Always write a number right next to the metric it belongs to, e.g.
   "readiness 58" or "sleep score 40/100". Never attach units (%, minutes, hours, sets, reps,
   pounds) and never prescribe an amount of anything. Prefer no numbers over unsupported ones.
5. If you use any number, fill "calculation" with one plain line that repeats each number and
   says where it came from, e.g. "Readiness 58 = today's check-in model; lowest factor is
   sleep score 40/100". Otherwise "calculation" is "".

EVIDENCE (Standards §2)
6. evidenceTag is exactly one of: ${EVIDENCE_TAGS.join(', ')}. Use a tag only when the data supports it:
   - Halson2014: only when the factor is sleep quality or sleep debt.
   - Gabbett2016 / HulinEWMA: only when factor.acwr is present. ACWR evidence is debated, so
     present it as a monitoring signal, never as an injury prediction, and confidence must be
     "moderate", not "high". You may cite 0.8–1.3 (lower-risk range) and 1.5 (spike) only here.
   - Bompa2019: only when phase is known and the insight is about phase-appropriate training.
   - Otherwise "none". Never force a citation.

SAFETY (Standards §4, §7)
7. Not medical. No diagnosis, no named conditions or injuries, no body-part injuries, no
   medication, supplements, or first-aid treatment, no "see a doctor immediately". If pain,
   soreness in a specific area, injury, or feeling unwell is relevant, say to check in with an
   athletic trainer or qualified healthcare professional.
8. Safety over performance. Never encourage training through pain or fatigue, never promise
   outcomes ("guaranteed", "injury-free"), never suggest less sleep or less food.
9. When tier is "caution" or "rest", or phase is "post-season", do not suggest max or all-out
   efforts, 1RM/PR attempts, going heavier or harder, or adding volume, intensity or sessions.
10. When ageBand is "youth" or "unknown", treat the athlete as developing: the rule above
    applies even when tier is "ready". Never give weight-loss, weight-cutting or
    food-restriction advice to anyone.
11. Stay consistent with the phase: in-season = manage fatigue around competition,
    post-season = recovery; never recommend peak loading in a recovery context.
12. Say what TO do ("keep the effort comfortable") rather than listing risky things not to do.

TONE AND ROLE (Standards §4, §5)
Neutral and professional: no hype, slang, or exclamation marks. Write in English.
- coach: options and decision levers ("consider…", "one option is…"); never dictate.
- player: plain language, second person, one clear step.
- parent: calm, non-alarming, about long-term development and safety; nothing urgent-sounding.
- solo: plain language, second person; light technical terms are fine if briefly explained.

FORMAT
headline ≤ ${LIMITS.headlineWords} words. explanation ≤ ${LIMITS.explanationSentences} sentences and ≤ ${LIMITS.explanationWords} words.
action exactly 1 sentence, ≤ ${LIMITS.actionWords} words, no lists. confidence is "high", "moderate", or "low".
Respond with ONLY this JSON object — no markdown, no preamble:
{"headline":"...","explanation":"...","action":"...","calculation":"...","evidenceTag":"...","confidence":"..."}`;
}

// ── Output validation ────────────────────────────────────────────────────────
// Each list is tagged with whether a preceding negation ("avoid", "don't",
// "rather than", …) makes the phrase safe. Medical, pain and overclaiming
// language is never excused by negation.

const BODY_PART = '(ankles?|hamstrings?|groins?|knees?|backs?|shoulders?|wrists?|calf|calves|quads?|hips?|elbows?|necks?|feet|foot|achilles|muscles?|ligaments?|tendons?)';

const MEDICAL_PATTERNS = [
  /\bdiagnos/i, /\bprescri/i, /\bmedicat/i, /\bmedical condition\b/i, /\bovertrain/i,
  /\byou (have|might have|may have|probably have)\b.{0,30}\b(injur|condition|disorder|concussion|fracture|tear|strain|sprain|infection|illness)/i,
  /\b(concussion|fracture|tendin|tendon(itis)?|stress reaction|rhabdo)/i,
  /\bsee a doctor immediately\b/i, /\bemergency\b/i,
  /\b(sprain(ed)?|fractured?|torn|meniscus|ACL|MCL|shin splints)\b/i,
  /\b(ibuprofen|acetaminophen|paracetamol|naproxen|aspirin|advil|motrin|tylenol|aleve|excedrin|nsaids?|anti-?inflammator\w*|painkillers?|pain relievers?|pills?|tablets?|meds)\b/i,
  /\bic(e|ing) (the|your|it|that|this)\b/i,
  new RegExp(`\\b(rolled|tweaked|pulled|strained|twisted|jammed|bruised|sore|aching|achy|injured|hurt|bad|banged[- ]up) (\\w+ )?${BODY_PART}\\b`, 'i'),
];
// Pain/injury words require a qualified-professional referral in the same insight.
// "injury risk" / "injury-free" are excluded here (the latter is caught as an overclaim).
const PAIN_PATTERN = /\b(pain|painful|hurts?|hurting|unwell|sick|aches?|aching|achy|sore|tender|discomfort|injur(y|ies|ed)(?![- ](risk|free)))\b/i;
// A coach alone does not satisfy the referral rule (Standards §4: "qualified professional").
const REFERRAL_PATTERN = /\b(athletic trainer|physio|physiotherapist|physical therapist|doctor|physician|qualified (healthcare |health |medical )?professional|healthcare provider)\b/i;

const OVERCLAIM_PATTERNS = [
  /\bno pain,? no gain\b/i, /\bguarantee/i, /\b100\s?%/i, /\bproven to\b/i, /\brisk[- ]free\b/i,
  /\binjury[- ]free\b/i, /\bcertain(ly)? to\b/i, /\bkeep you (healthy|safe|injury)/i,
  /\b(will|to) prevent (an |all )?injur/i, /\beliminat\w* (the |any |all )?(injury )?risk/i,
  /\bHRV\b/i, /\bheart rate variability\b/i, /\bnervous system\b/i, /\bCNS\b/,
];
const HYPE_PATTERNS = [
  /!/, /\b(beast|crush(ing|ed)? (it|today|this|the)|dominat\w*|unstoppable|insane|monster|killer|epic|legendary|go crazy|beast mode)\b/i,
];

// Negation-aware: "don't push through pain" is safe, "push through pain" is not.
const UNSAFE_NEGATABLE = [
  /\b(push|pushing|grind|grinding|play|playing|fight|fighting|power|powering|battle|battling|gut|gutting) (it )?through\b/i,
  /\b(work|working|train|training) through (the |your |any )?(pain|soreness|discomfort|fatigue|tiredness|aches?)\b/i,
  /\btough(ing)? it out\b/i, /\bsuck it up\b/i,
  /\bignor(e|ing) (the |your |any )?(soreness|pain|fatigue|tiredness|warning signs?|discomfort|aches?)\b/i,
  /\b(sacrific\w* (some |your )?(sleep|rest)|fewer hours of sleep|sleep less|less sleep (tonight|this week)|get by on (less|little) sleep|cut(ting)? (back on |down on )?(your )?sleep|all[- ]nighters?|stay(ing)? up (late|later|all night)|skip(ping)? (sleep|rest|recovery|rest days?)|go(ing)? to bed later)\b/i,
];
const INTENSITY_ESCALATION = [
  /\bmax(imum|imal)?[- ]?(effort|out|intensity|attempts?|lifts?|weights?|sets?|reps?)\b/i, /\bmax(ing)? out\b/i,
  /\b1\s*-?\s*RM\b/i, /\bone[- ]rep[- ]max/i, /\bPRs?\b/, /\bpersonal (record|best)s?\b/i,
  /\bgo(ing)? (hard|heavy|big)\b/i, /\b(heavier|harder)\b/i, /\ball[- ]?out\b/i,
  /\bpush(ing)? (hard|harder|it|the pace)\b/i,
  /\b(increase|increasing|raise|raising|bump(ing)? up|ramp(ing)? up|pile on|piling on|crank(ing)? up)\b.{0,20}\b(volume|load|intensity|sessions?|weights?|sets|reps|mileage)\b/i,
  /\b(add|adding)\b.{0,12}\b(sets|reps|volume|sessions?|load|weight|sprints?|conditioning|workouts?)\b/i,
  /\bmore (volume|load|weight|sets|reps|intensity|sessions?|sprints?|workouts?|mileage)\b/i,
  /\b(another|second|third|fourth|extra|additional|one more) (hard |heavy )?(sets?|workouts?|sessions?|practices?|runs?|lifts?|rounds?)\b/i,
  /\bdouble (session|workout|practice|day)s?\b/i, /\btwo[- ]a[- ]days?\b/i,
];
// Applies to every role: a readiness insight has no weight or diet data to ground this in.
const WEIGHT_RESTRICTION = [
  /\b(drop|dropping|lose|losing|shed|shedding|cut|cutting)\b.{0,15}\b(pounds|lbs|kilos?|kg|weight|body ?fat)\b/i,
  /\bmake weight\b/i, /\bweight[- ]?cut/i, /\bcalorie deficit\b/i,
  /\b(cut|cutting|restrict\w*|limit\w*) (out |back on )?(carbs|carbohydrates|calories|food|meals?|eating)\b/i,
  /\b(skip|skipping) (meals?|breakfast|lunch|dinner)\b/i, /\bfast(ing|ed)\b/i,
];

const NEGATOR = /\b(avoid|avoiding|don'?t|do not|does not|doesn'?t|not|no|never|skip|skipping|without|instead of|rather than|hold off( on)?|stay away from|limit|limiting|minimi[sz]e|minimi[sz]ing|steer clear of)\b/i;
// Phrases that turn a negator back into encouragement ("don't hesitate to…", "never miss a chance to…").
const NEGATION_CANCEL = /\b(hesitate|afraid|hold back|fear|shy away|forget|miss|chance|opportunity|reason not|wait)\b/i;

// Plain English check: a field of 4+ words with none of these is treated as non-English.
const ENGLISH_HINTS = new Set(('the a an to and or of in on for with at by from is are was be it this that your you ' +
  'do does did if as so but can will may more less than then how what when up down out over about into ' +
  'get go make try aim help take use stay good well all any each every just only also very much ' +
  'today tonight tomorrow week day keep sleep bed score readiness recovery recover train training session ' +
  'practice game games effort rest light easy low high warm cool consider their they them he she we our ' +
  'athlete check focus lower lowest steady caution ready').split(' '));

/**
 * @param {object} out  model output { headline, explanation, action, calculation, evidenceTag, confidence }
 * @param {object} ctx  the context built by buildInsightContext() / sanitizeContext()
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function validateInsight(out, ctx) {
  const reasons = [];
  if (!out || typeof out !== 'object') return { ok: false, reasons: ['output not an object'] };
  if (!ctx || typeof ctx !== 'object') return { ok: false, reasons: ['context missing'] };

  const { evidenceTag, confidence } = out;
  const rawCalc = out.calculation == null ? '' : out.calculation;

  // Contract
  for (const k of ['headline', 'explanation', 'action']) {
    const v = out[k];
    if (typeof v !== 'string' || !v.trim()) reasons.push(`${k} missing`);
    else if (v.length > LIMITS.fieldChars) reasons.push(`${k} too long`);
  }
  if (typeof rawCalc !== 'string') reasons.push('calculation must be a string');
  else if (rawCalc.length > LIMITS.calculationChars) reasons.push('calculation too long');
  if (!EVIDENCE_TAGS.includes(evidenceTag)) reasons.push('evidenceTag not allowed');
  if (!['high', 'moderate', 'low'].includes(confidence)) reasons.push('confidence invalid');
  if (confidence === 'low') reasons.push('low confidence');
  if (reasons.length) return { ok: false, reasons };

  // Normalize: NFKC folds look-alikes (full-width, superscripts); \p{Cf} strips
  // zero-width and other invisible format characters used to split keywords.
  const headline    = _clean(out.headline);
  const explanation = _clean(out.explanation);
  const action      = _clean(out.action);
  const calculation = _clean(rawCalc);

  if (_words(headline) > LIMITS.headlineWords) reasons.push('headline over word limit');
  if (_sentences(explanation) > LIMITS.explanationSentences) reasons.push('explanation over sentence limit');
  if (_words(explanation) > LIMITS.explanationWords) reasons.push('explanation over word limit');
  if (_sentences(action) > LIMITS.actionSentences) reasons.push('action over sentence limit');
  if (_words(action) > LIMITS.actionWords) reasons.push('action over word limit');

  const text = `${headline}\n${explanation}\n${action}`;
  const all  = `${text}\n${calculation}`;

  // §5 — English, neutral tone
  if ([headline, explanation, action].some(_nonEnglish)) reasons.push('not plain English');
  if (HYPE_PATTERNS.some(rx => rx.test(text))) reasons.push('hype or non-neutral tone');

  // §4 / §6 — medical, pain, overclaiming, and unsafe language
  if (MEDICAL_PATTERNS.some(rx => rx.test(all))) reasons.push('medical or diagnostic language');
  if (PAIN_PATTERN.test(text) && !REFERRAL_PATTERN.test(text)) reasons.push('pain/injury mentioned without professional referral');
  if (OVERCLAIM_PATTERNS.some(rx => rx.test(all))) reasons.push('overclaiming or unsupported-measurement language');
  if (UNSAFE_NEGATABLE.some(rx => _affirmed(rx, text))) reasons.push('unsafe training or sleep advice');
  if (WEIGHT_RESTRICTION.some(rx => _affirmed(rx, text))) reasons.push('weight-cutting or food-restriction language');

  // §7 — tier, phase and developmental-stage consistency
  const conservative = ctx.tier !== 'ready' || ctx.phase === 'post-season' || ctx.ageBand !== 'adult';
  if (conservative && INTENSITY_ESCALATION.some(rx => _affirmed(rx, text))) {
    reasons.push(`intensity escalation not allowed (tier=${ctx.tier}, phase=${ctx.phase}, ageBand=${ctx.ageBand})`);
  }

  // §2 — evidence tag must be supported by the supplied data
  const f = ctx.factor || {};
  if (evidenceTag === 'Halson2014' && !['sleep', 'sleepDebt'].includes(f.key)) {
    reasons.push('Halson2014 used without a sleep factor');
  }
  if (evidenceTag === 'Gabbett2016' || evidenceTag === 'HulinEWMA') {
    if (!Number.isFinite(f.acwr)) reasons.push(`${evidenceTag} used without ACWR data`);
    if (confidence === 'high') reasons.push('ACWR-based insight cannot claim high confidence (evidence is debated)');
  }
  if (evidenceTag === 'Bompa2019' && ctx.phase === 'unknown') reasons.push('Bompa2019 used without a known phase');

  // §3 — every number must be a supplied value, tied to its metric, unit-free,
  // and repeated in the calculation line.
  reasons.push(..._numberReasons(text, calculation, ctx, evidenceTag));

  return { ok: reasons.length === 0, reasons };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function _round(n, dp = 0) { const m = 10 ** dp; return Math.round(n * m) / m; }
function _clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function _validAcwr(v) { return Number.isFinite(v) && v > 0 && v <= ACWR_MAX; }
function _clean(s) { return String(s).normalize('NFKC').replace(/\p{Cf}/gu, ''); }
function _words(s) { return s.trim().split(/\s+/).filter(Boolean).length; }

function _sentences(s) {
  // Abbreviations and decimals are not sentence ends.
  const t = s.trim()
    .replace(/\b(vs|e\.g|i\.e|etc|approx|incl)\./gi, '$1')
    .replace(/(\d)\.(\d)/g, '$1$2');
  // Hard breaks: terminators, line breaks, bullets.
  const hard = (t.match(/[.!?]+(?=\s|$)|\n+|[•·▪◦]/g) || []).length;
  const endsClean = /[.!?]$/.test(t);
  let n = Math.max(1, endsClean ? hard : hard + 1);
  // Soft breaks: one semicolon or dash is a normal clause; chains of them are run-ons.
  const soft = (t.match(/;|[—–]|\s-\s/g) || []).length;
  n += Math.floor(soft / 2);
  return n;
}

function _nonEnglish(s) {
  if (/[^\P{L}A-Za-z]/u.test(s)) return true; // any letter outside basic Latin
  const words = s.toLowerCase().match(/[a-z']+/g) || [];
  return words.length >= 4 && !words.some(w => ENGLISH_HINTS.has(w));
}

/** True when rx matches somewhere in text without a negation in front of it (same clause, ≤5 words back). */
function _affirmed(rx, text) {
  const g = new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : rx.flags + 'g');
  for (const m of text.matchAll(g)) {
    const clause = text.slice(0, m.index).split(/[.;:!?—–,•\n()]/).pop();
    const window = clause.trim().split(/\s+/).slice(-5).join(' ');
    if (NEGATOR.test(window) && !NEGATION_CANCEL.test(window)) continue;
    return true;
  }
  return false;
}

// Number words count as numbers so "twenty extra minutes" can't bypass grounding.
// "one" is excluded (article use: "one option"); "half"/"quarter" are handled as
// fraction phrases below because both are common basketball terms.
const NUMBER_WORDS = { two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10,
  eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18,
  nineteen:19, twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90,
  hundred:100, dozen:12, twice:2, thrice:3 };
const FRACTION_PHRASE = /\b((by|in|to) (a |one )?(half|third|quarter|fifth|tenth)|(half|a third|a quarter|two thirds|three quarters) (of|as much)|halve|halving)\b/i;
const UNIT_AFTER = /^\s*(%|percent\b|per ?cent\b|pct\b|×|x\b|(min|mins|minutes?|hrs?|hours?|secs?|seconds?|reps?|sets?|lbs?|pounds?|kgs?|kilos?|kilograms?|miles?|km|meters?|metres?|yards?|yds|laps?|sprints?|burpees?|days?|weeks?|nights?|times|rounds?|workouts?|sessions?|calories|grams?|oz|ounces?|cups?)\b)/i;
const METRIC_WORD = /\b(score|scores|readiness|ratio|acwr|workload|marker|range|spike|sleep[- ]debt)\b/i;

function _numberTokens(s) {
  const t = s.replace(/(\d),(\d{3})/g, '$1$2');
  const out = [];
  for (const m of t.matchAll(/\d+(?:\.\d+)?/g)) {
    // "1RM" is a term, not a quantity; whether it is allowed is decided by INTENSITY_ESCALATION.
    if (/^\s*-?\s*RM\b/i.test(t.slice(m.index + m[0].length))) continue;
    out.push({ value: Number(m[0]), index: m.index, end: m.index + m[0].length });
  }
  for (const m of t.matchAll(/[A-Za-z]+/g)) {
    const w = m[0].toLowerCase();
    if (w in NUMBER_WORDS) out.push({ value: NUMBER_WORDS[w], index: m.index, end: m.index + m[0].length });
  }
  return { t, out };
}

function _numberReasons(text, calculation, ctx, tag) {
  const reasons = [];
  const f = ctx.factor || {};
  const allowed = [ctx.raw, ctx.sleepDebt, f.score, f.max, f.acwr, ...(REFERENCE_NUMBERS[tag] || [])].filter(Number.isFinite);
  const isAllowed = n => allowed.some(a => Math.abs(a - n) <= 0.051);

  if (FRACTION_PHRASE.test(text)) reasons.push('ungrounded quantity (fraction)');

  const { t, out } = _numberTokens(text);
  const stray = [], unitBearing = [], untied = [];
  for (const tok of out) {
    if (!isAllowed(tok.value)) { stray.push(tok.value); continue; }
    if (UNIT_AFTER.test(t.slice(tok.end))) { unitBearing.push(tok.value); continue; }
    const before = t.slice(0, tok.index);
    const isDenominator = tok.value === f.max && /(\/|\bout of|\bof)\s*$/i.test(before);
    const back = before.split(/[.;!?\n]/).pop().trim().split(/\s+/).slice(-6).join(' ');
    const ahead = t.slice(tok.end).split(/[.;!?\n]/)[0].trim().split(/\s+/).slice(0, 3).join(' ');
    if (!isDenominator && !METRIC_WORD.test(back) && !METRIC_WORD.test(ahead) && !/^\//.test(t.slice(tok.end))) {
      untied.push(tok.value);
    }
  }
  if (stray.length) reasons.push(`ungrounded number(s): ${stray.join(', ')}`);
  if (unitBearing.length) reasons.push(`number used as a unit or prescribed amount: ${unitBearing.join(', ')}`);
  if (untied.length) reasons.push(`number not tied to a supplied metric: ${untied.join(', ')}`);

  if (out.length) {
    if (!calculation.trim()) {
      reasons.push('numbers used without calculation');
    } else {
      const calcNums = _numberTokens(calculation).out.map(x => x.value);
      const missing = [...new Set(out.map(x => x.value))].filter(n => !calcNums.some(c => Math.abs(c - n) <= 0.051));
      if (missing.length) reasons.push(`number(s) missing from calculation: ${missing.join(', ')}`);
    }
  }
  const calcStray = _numberTokens(calculation).out.map(x => x.value)
    .filter(n => !isAllowed(n) && n !== EVIDENCE_YEARS[tag]);
  if (calcStray.length) reasons.push(`calculation uses ungrounded number(s): ${calcStray.join(', ')}`);
  return reasons;
}
