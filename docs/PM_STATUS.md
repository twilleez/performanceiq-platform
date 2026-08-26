# Program Manager Status

Updated: 2026-08-26

## Release decision: NOT SIGNED OFF

PerformanceIQ has completed the backend security/performance phase, authenticated Player/Solo workflow testing, Design/Browser static QA, and architecture consolidation. Final release acceptance is still blocked by missing Coach/Parent/Admin live-role tests, rendered-browser/device verification, broader automated journey tests, leaked-password protection configuration, and Marketing acceptance.

### Completed
- Live Supabase project `jijqjbgmhhlvokgtuema` verified directly.
- Frontend role contract confirmed against live role values: `coach`, `player`, `parent`, `admin`, `solo`.
- Frontend profile writes aligned to the live schema.
- Supabase browser client uses the publishable-key path.
- Core and secondary RLS policies consolidated and hardened.
- Incorrect team-member coach authorization replaced with direct team-ownership checks.
- Messaging sender spoofing and message identity mutation blocked.
- Self-role escalation on `profiles.role` blocked and regression tested.
- RLS helpers moved to non-exposed `private` schema.
- `pg_trgm` moved to `extensions`.
- Supabase performance advisor reports no actionable RLS warnings; only informational unused-index notices remain.
- Supabase security advisor reports one remaining configuration warning: leaked-password protection disabled.
- Player profile isolation PASS.
- Solo profile isolation PASS.
- Player positive-path writes PASS for readiness, nutrition, workouts, and personal records using rollback transactions.
- Solo positive-path writes PASS for readiness, nutrition, workouts, and personal records using rollback transactions.
- Cross-user Player→Solo readiness write correctly denied by RLS.
- Production auth bootstrap hardened so cached local sessions are validated against Supabase before authenticated routing.
- Cross-tab sign-out now clears both storage and in-memory auth state.
- Email-confirmation signup flow no longer creates a fake local authenticated session when Supabase has not issued a session.
- Signup visibility and contrast are isolated with a final auth stylesheet.
- Active `ob2-*` onboarding wizard is isolated with a final production onboarding stylesheet for readable text, visible inputs, mobile grids, focus states, safe-area spacing, and reduced-motion behavior.
- Signup converted to semantic form submission with labels, required/email/password validation, `aria-pressed` role state, live status messages, keyboard-operable sign-in, and busy state.
- Root static smoke suite added at `scripts/smoke-static.mjs` and exposed as `npm run test:smoke` / `npm test`.
- GitHub Actions production smoke workflow passes on the consolidated architecture; run `33002321312` completed successfully.
- Architecture consolidation PASS: the root static application is the single authoritative production frontend.
- Root `package.json` no longer treats `frontend/` and `backend/` as active workspaces.
- `frontend/` is explicitly documented as legacy/reference code and `backend/` as a non-production server prototype.
- GitHub Pages now stages a production-only `.pages/` artifact instead of uploading the entire repository.
- Deployment verification explicitly excludes `frontend/`, `backend/`, and `database/` from the public artifact.
- Service worker upgraded to scope-aware `piq-v7` for GitHub Pages project-path hosting.
- Pages deployment run `33002321306` successfully passed smoke checks, staging, staged-artifact verification, upload, and deployment.
- Architecture contract documented in `docs/ARCHITECTURE.md` and QA evidence in `docs/ARCHITECTURE_CONSOLIDATION_2026-08-26.md`.

### Current test coverage reality
The live `profiles` table currently contains one `player` profile and one `solo` profile. There are no live `coach`, `parent`, or `admin` profiles available for truthful end-to-end account tests. Those three role tests remain pending until dedicated accounts exist or are supplied.

Player and Solo positive-path database workflows are verified with rollback test rows; no QA data was left behind.

Current tooling verifies source, database behavior, CI, and production artifact construction, but does not provide a full interactive physical/mobile browser rendering session. Final visual-device acceptance therefore remains pending.

### Remaining PM blockers
- Dedicated Coach account and coach→athlete relationship test.
- Dedicated Parent account and parent→athlete relationship test.
- Dedicated Admin account and admin authorization test.
- Browser-level real-account signup → confirmation (if enabled) → sign-in → onboarding → home regression test on a rendered browser.
- Rendered visual verification at representative phone widths and desktop.
- Enable leaked-password protection in Supabase Auth if available for the project plan/configuration.
- Add broader automated role/core-journey tests beyond static smoke checks.
- Complete Marketing conversion/trust-layer validation.

### PM rule
No team may self-certify completion. Each fix must be retested against the live product or a production-equivalent test environment and explicitly accepted by the Program Manager before the release decision changes to SIGNED OFF.
