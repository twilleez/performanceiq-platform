/**
 * insightBuilder.js — PIQ AI Insight Layer, Phase 2 PoC
 * ═══════════════════════════════════════════════════════════════
 * Consumes the EXISTING readiness/PIQ Score engine output (unchanged)
 * and generates a role-specific narrative insight via a server-side
 * proxy (Supabase Edge Function — see supabase/functions/generate-insight).
 *
 * This module never calls the Anthropic API directly from the client.
 * The API key must never be shipped to a static GitHub Pages bundle —
 * the edge function holds it server-side.
 *
 * Hard rule: if generation fails OR fails validation, this module
 * falls back to the existing static copy in readiness-copy.js.
 * The user never sees a broken or ungrounded insight.
 *
 * Evidence tags this module is allowed to emit (must match engines.js
 * evidence base — do not add new tags here without updating the
 * Phase 1 proposal's evidence table):
 *   Gabbett2016 | Halson2014 | Bompa2019 | HulinEWMA | none
 */

import { getReadinessScoreElite } from '../state/selectorsElite.js';
import { getCurrentRole }         from '../core/auth.js';
import { getReadinessCopy }       from '../components/readiness-copy.js';

const EDGE_FUNCTION_URL = 'https://jijqjbgmhhlvokgtuema.supabase.co/functions/v1/generate-insight';

const VALID_EVIDENCE_TAGS = new Set(['Gabbett2016', 'Halson2014', 'Bompa2019', 'HulinEWMA', 'none']);

// Deny-list: any generated output containing these terms is rejected outright.
// Pattern-level check only — kept intentionally short and non-exhaustive.
const MEDICAL_DENY_PATTERNS = [
  /\bdiagnos/i, /\binjur(y|ed|ies)\b.*\b(you have|you're suffering|is caused by)/i,
  /\bsee a doctor immediately\b/i, /\bmedical condition\b/i, /\bprescri/i,
];

const CACHE_KEY_PREFIX = 'piq_insight_v1'; // scoped alongside existing v7 state key

/**
 * Public entry point. Returns a validated insight object, or the
 * static fallback shape if generation/validation fails for any reason.
 *
 * @returns {Promise<{headline:string, explanation:string, action:string,
 *                     evidenceTag:string, confidence:string, source:'ai'|'fallback'}>}
 */
export async function getInsight() {
  const role = _normalizeRole(getCurrentRole());
  const readiness = getReadinessScoreElite(); // { score, raw, color, explain, factors, trend, sleepDebt }

  const cached = _readCache(role, readiness.raw);
  if (cached) return cached;

  let result;
  try {
    const generated = await _generate(role, readiness);
    result = _validate(generated, readiness)
      ? { ...generated, source: 'ai' }
      : _fallback(readiness);
  } catch (err) {
    // Network/edge-function failure — never surface this to the user as an error.
    console.warn('[insightBuilder] generation failed, using static fallback:', err.message);
    result = _fallback(readiness);
  }

  _writeCache(role, readiness.raw, result);
  return result;
}

/**
 * Builds the structured request and calls the Supabase Edge Function proxy.
 * The edge function is responsible for the actual Anthropic API call and
 * for enforcing the output contract server-side as a first line of defense;
 * this module re-validates independently as a second line of defense.
 */
async function _generate(role, readiness) {
  const explanatoryFactor = _selectExplanatoryFactor(readiness.factors);

  const payload = {
    role,                                  // 'coach' | 'player' | 'parent' | 'solo'
    raw: readiness.raw,
    trend: readiness.trend,
    sleepDebt: readiness.sleepDebt,
    factor: explanatoryFactor,             // the single most explanatory factor only
  };

  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`edge function returned ${res.status}`);
  return res.json(); // expected shape: { headline, explanation, action, evidenceTag, confidence }
}

/**
 * Picks the single factor most worth explaining: lowest-scoring factor,
 * or largest negative day-over-day change if that data is available.
 * Deliberately simple for the PoC — refine once Team 2 synthetic testing
 * shows which selection heuristic produces the most useful insights.
 */
function _selectExplanatoryFactor(factors = []) {
  if (!factors.length) return null;
  return factors.reduce((worst, f) =>
    (f.score / f.max) < (worst.score / worst.max) ? f : worst
  );
}

/**
 * Validation — the second guardrail layer. Rejects anything that:
 *  - is missing required fields
 *  - uses an evidence tag not in the approved set
 *  - trips the medical/diagnostic deny-list
 *  - claims confidence without contract fields present
 */
function _validate(generated, readiness) {
  if (!generated) return false;
  const { headline, explanation, action, evidenceTag, confidence } = generated;

  if (!headline || !explanation || !action) return false;
  if (!VALID_EVIDENCE_TAGS.has(evidenceTag)) return false;
  if (!['high', 'moderate', 'low'].includes(confidence)) return false;
  if (confidence === 'low') return false; // low-confidence output always falls back

  const combinedText = `${headline} ${explanation} ${action}`;
  if (MEDICAL_DENY_PATTERNS.some(rx => rx.test(combinedText))) return false;

  return true;
}

/**
 * Falls back to the existing static, already-shipped copy.
 * This is the safe floor — worst case, behavior is identical to today.
 */
function _fallback(readiness) {
  const tierKey = _tierFromRaw(readiness.raw);
  const staticCopy = getReadinessCopy(tierKey);
  return {
    headline: staticCopy.label,
    explanation: readiness.explain,
    action: staticCopy.action,
    evidenceTag: 'none',
    confidence: 'high',
    source: 'fallback',
  };
}

function _tierFromRaw(raw) {
  if (raw >= 70) return 'ready';
  if (raw >= 45) return 'caution';
  return 'rest';
}

function _normalizeRole(role) {
  const r = (role || 'solo').toLowerCase();
  return ['coach', 'player', 'parent', 'solo'].includes(r) ? r : 'solo';
}

// ── Cache: one insight per user per day per role, avoids re-generating
//    on every dashboard render. Scoped separately from main v7 state key
//    so it can be cleared independently without touching core app state.
function _cacheKey(role, raw) {
  const today = new Date().toDateString();
  return `${CACHE_KEY_PREFIX}:${role}:${today}:${raw}`;
}

function _readCache(role, raw) {
  try {
    const stored = localStorage.getItem(_cacheKey(role, raw));
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function _writeCache(role, raw, value) {
  try {
    localStorage.setItem(_cacheKey(role, raw), JSON.stringify(value));
  } catch {
    // Storage full or unavailable — non-fatal, just skip caching.
  }
}
