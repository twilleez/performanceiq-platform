/**
 * insightBuilder.js — PIQ AI Insight Layer
 * ═══════════════════════════════════════════════════════════════
 * Consumes the EXISTING readiness/PIQ Score engine output (unchanged)
 * and generates a role-specific narrative insight via a server-side
 * proxy (Supabase Edge Function — see supabase/functions/generate-insight).
 *
 * This module never calls the Anthropic API directly from the client.
 * The API key must never be shipped to a static GitHub Pages bundle —
 * the edge function holds it server-side.
 *
 * Guardrails: the Response Standards are enforced by insightGuardrails.js —
 * the same prompt/validator runs in the edge function (first line) and
 * here (second line, independent re-check).
 *
 * Hard rule: if generation fails OR fails validation, this module
 * falls back to the existing static copy in readiness-copy.js.
 * The user never sees a broken or ungrounded insight.
 */

import { getReadinessScoreElite } from '../state/selectorsElite.js';
import { getState }               from '../state/state.js';
import { getCurrentRole }         from '../core/auth.js';
import { supabase }               from '../core/supabase.js';
import { getReadinessCopy }       from '../components/readiness-copy.js';
import {
  buildInsightContext,
  validateInsight,
  EVIDENCE_SOURCES,
} from './insightGuardrails.js';

const FUNCTION_NAME = 'generate-insight';

// v2: output contract gained `calculation`; v1 entries may also hold the
// pre-fix fallback copy, so they are intentionally abandoned.
const CACHE_KEY_PREFIX = 'piq_insight_v2';

// readinessTier() → READINESS_COPY keys in readiness-copy.js
const TIER_TO_COPY_KEY = { ready: 'high', caution: 'moderate', rest: 'low' };

/**
 * Public entry point. Returns a validated insight object, or the
 * static fallback shape if generation/validation fails for any reason.
 *
 * @returns {Promise<{headline:string, explanation:string, action:string,
 *                     calculation:string, evidenceTag:string, evidenceSource:string|null,
 *                     confidence:string, source:'ai'|'fallback'}>}
 */
export async function getInsight() {
  const readiness = getReadinessScoreElite(); // { score, raw, color, explain, factors, trend, sleepDebt }
  const ctx = buildInsightContext({
    role: getCurrentRole(),
    readiness,
    profile: getState()?.athleteProfile || {},
  });

  const cached = _readCache(ctx.role, ctx.raw);
  if (cached) return cached;

  let result;
  if (!ctx.factor) {
    // No check-in factors today → nothing grounded to explain. Don't call the model.
    result = _fallback(readiness, ctx);
  } else {
    try {
      const generated = await _generate(ctx);
      const verdict = validateInsight(generated, ctx);
      if (verdict.ok) {
        result = {
          headline:       generated.headline,
          explanation:    generated.explanation,
          action:         generated.action,
          calculation:    generated.calculation || '',
          evidenceTag:    generated.evidenceTag,
          evidenceSource: EVIDENCE_SOURCES[generated.evidenceTag] || null,
          confidence:     generated.confidence,
          source:         'ai',
        };
      } else {
        console.warn('[insightBuilder] guardrail rejection, using static fallback:',
          (generated?.guardrail || verdict.reasons).join('; '));
        result = _fallback(readiness, ctx);
      }
    } catch (err) {
      // Network/edge-function failure — never surface this to the user as an error.
      console.warn('[insightBuilder] generation failed, using static fallback:', err.message);
      result = _fallback(readiness, ctx);
    }
  }

  _writeCache(ctx.role, ctx.raw, result);
  return result;
}

/**
 * Calls the edge function. supabase.functions.invoke attaches the apikey and
 * Authorization headers the Functions gateway requires.
 */
async function _generate(ctx) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body: ctx });
  if (error) throw new Error(error.message || 'edge function error');
  return data; // { headline, explanation, action, calculation, evidenceTag, confidence } | { confidence:'low', guardrail }
}

/**
 * Falls back to the existing static, already-shipped copy.
 * This is the safe floor — worst case, behavior is identical to today.
 */
function _fallback(readiness, ctx) {
  const staticCopy = getReadinessCopy(TIER_TO_COPY_KEY[ctx.tier] || '');
  return {
    headline:       staticCopy.label,
    explanation:    readiness.explain,
    action:         staticCopy.action,
    calculation:    '',
    evidenceTag:    'none',
    evidenceSource: null,
    confidence:     'high',
    source:         'fallback',
  };
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
