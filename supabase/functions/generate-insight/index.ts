// supabase/functions/generate-insight/index.ts
// Phase 2 PoC — server-side proxy to the Anthropic API.
//
// Why this exists: insightBuilder.js runs in a static GitHub Pages bundle.
// An Anthropic API key must never ship to that client. This edge function
// holds the key as a Supabase secret and is the ONLY place the key lives.
//
// Deploy: supabase functions deploy generate-insight
// Secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Input (from insightBuilder.js):
//   { role, raw, trend, sleepDebt, factor: { label, score, max, reason, tip, acwr?, zone? } }
//
// Output (must match insightBuilder.js's _validate contract):
//   { headline, explanation, action, evidenceTag, confidence }

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const MODEL = 'claude-sonnet-4-6';

const ALLOWED_EVIDENCE_TAGS = ['Gabbett2016', 'Halson2014', 'Bompa2019', 'HulinEWMA', 'none'];

const SYSTEM_PROMPT = `You generate a short training-readiness insight for the PerformanceIQ app.

STRICT RULES — violating any of these means your output will be discarded:
1. Only reference the factor data provided in the user message. Never invent a
   number, factor, or trend that wasn't supplied.
2. Never use diagnostic or medical language (no "diagnosis", no "you have [condition]",
   no prescribing medication, no "see a doctor immediately"). This is a training-load
   tool, not a medical device.
3. evidenceTag must be exactly one of: Gabbett2016, Halson2014, Bompa2019, HulinEWMA, none.
   Only use a real tag if the factor data actually supports that specific evidence base:
   - Gabbett2016: ACWR / load-spike / injury-risk framing
   - Halson2014: sleep as recovery driver
   - Bompa2019: periodization / phase-appropriate volume framing
   - HulinEWMA: acute:chronic workload ratio methodology itself
   If none of these specifically apply, use "none" — do not force a citation.
4. Set confidence to "low" if the supplied factor data is sparse, contradictory,
   or you are not confident the explanation is well-grounded. A "low" response
   will be discarded by the client and replaced with a safe static fallback, so
   it is always safer to mark low confidence than to overstate certainty.
5. Tailor tone to role:
   - coach: frame as a decision lever ("consider reducing X" / "this supports Y today")
   - player: plain-language, second person, no jargon
   - parent: non-alarming, development-safe framing, never urgent-sounding
   - solo: plain-language, second person, slightly more technical is OK
6. headline ≤ 12 words. explanation ≤ 2 sentences. action ≤ 1 sentence.

Respond ONLY with a JSON object, no markdown fences, no preamble:
{"headline": "...", "explanation": "...", "action": "...", "evidenceTag": "...", "confidence": "..."}`;

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });
  }
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'server misconfigured' }), { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), { status: 400 });
  }

  const { role, raw, trend, sleepDebt, factor } = body;
  if (!role || typeof raw !== 'number' || !factor) {
    return new Response(JSON.stringify({ error: 'missing required fields' }), { status: 400 });
  }

  const userMessage = JSON.stringify({ role, raw, trend, sleepDebt, factor });

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
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error:', anthropicRes.status, errText);
      return new Response(JSON.stringify({ error: 'generation upstream error' }), { status: 502 });
    }

    const data = await anthropicRes.json();
    const textBlock = data.content?.find((b: any) => b.type === 'text');
    if (!textBlock?.text) {
      return new Response(JSON.stringify({ error: 'no text in model response' }), { status: 502 });
    }

    let parsed;
    try {
      const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(JSON.stringify({ error: 'model returned non-JSON' }), { status: 502 });
    }

    // Server-side first line of defense — client re-validates independently.
    if (!ALLOWED_EVIDENCE_TAGS.includes(parsed.evidenceTag)) {
      parsed.confidence = 'low';
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-insight error:', err);
    return new Response(JSON.stringify({ error: 'internal error' }), { status: 500 });
  }
});
