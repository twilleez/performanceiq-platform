// supabase/functions/generate-insight/index.ts
// Server-side proxy to the Anthropic API for the PIQ AI insight layer.
//
// Why this exists: insightBuilder.js runs in a static GitHub Pages bundle.
// An Anthropic API key must never ship to that client. This edge function
// holds the key as a Supabase secret and is the ONLY place the key lives.
//
// Deploy: supabase functions deploy generate-insight
// Secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Input  (built by insightGuardrails.buildInsightContext on the client):
//   { role, raw, tier, trend, sleepDebt, ageBand, phase, factor: { key, label, score, max, acwr? } }
// Output (checked by insightGuardrails.validateInsight on BOTH sides):
//   { headline, explanation, action, calculation, evidenceTag, confidence }
//   A rejected generation is returned as { confidence: 'low', guardrail: [...reasons] }
//   so the client falls back to static copy. Reasons are for logging, not display.
//
// The prompt and validator come from ../_shared/insightGuardrails.js, a mirror
// of js/services/insightGuardrails.js (see scripts/sync-insight-guardrails.mjs).

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import {
  buildSystemPrompt,
  validateContext,
  validateInsight,
} from '../_shared/insightGuardrails.js';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const MODEL = 'claude-sonnet-4-6';
const SYSTEM_PROMPT = buildSystemPrompt();

const ALLOWED_ORIGINS = ['https://twilleez.github.io'];
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.includes(origin) || LOCAL_ORIGIN.test(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  });
}

serve(async (req: Request) => {
  // Browsers send a CORS preflight before a JSON POST; without this the call never reaches POST.
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'POST only' }, 405);
  if (!ANTHROPIC_API_KEY) return json(req, { error: 'server misconfigured' }, 500);

  let ctx;
  try {
    ctx = await req.json();
  } catch {
    return json(req, { error: 'invalid JSON body' }, 400);
  }

  const inputErrors = validateContext(ctx);
  if (inputErrors.length) return json(req, { error: 'invalid input', details: inputErrors }, 400);

  // Forward only the whitelisted context fields — never pass arbitrary client JSON to the model.
  const { role, raw, tier, trend, sleepDebt, ageBand, phase, factor } = ctx;
  const userMessage = JSON.stringify({ role, raw, tier, trend, sleepDebt, ageBand, phase, factor });

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
      console.error('Anthropic API error:', anthropicRes.status, await anthropicRes.text());
      return json(req, { error: 'generation upstream error' }, 502);
    }

    const data = await anthropicRes.json();
    const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
    if (!textBlock?.text) return json(req, { error: 'no text in model response' }, 502);

    let parsed;
    try {
      parsed = JSON.parse(textBlock.text.replace(/```json|```/g, '').trim());
    } catch {
      return json(req, { error: 'model returned non-JSON' }, 502);
    }

    // First line of defense. The client re-runs the same validator independently.
    const verdict = validateInsight(parsed, { role, raw, tier, trend, sleepDebt, ageBand, phase, factor });
    if (!verdict.ok) {
      console.warn('generate-insight guardrail rejection:', verdict.reasons.join('; '));
      return json(req, { confidence: 'low', guardrail: verdict.reasons });
    }

    const { headline, explanation, action, calculation = '', evidenceTag, confidence } = parsed;
    return json(req, { headline, explanation, action, calculation, evidenceTag, confidence });
  } catch (err) {
    console.error('generate-insight error:', err);
    return json(req, { error: 'internal error' }, 500);
  }
});
