// Mirrors the canonical guardrail module into the Edge Function's _shared dir.
// Supabase bundles each function from supabase/functions/, so the client copy
// in js/services/ is not reachable at deploy time. Run after editing:
//   node scripts/sync-insight-guardrails.mjs
// tests/insightGuardrails.test.mjs fails if the two copies drift.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src  = resolve(root, 'js/services/insightGuardrails.js');
const dest = resolve(root, 'supabase/functions/_shared/insightGuardrails.js');

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`synced ${src} -> ${dest}`);
