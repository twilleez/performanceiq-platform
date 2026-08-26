# Program Manager Status

Updated: 2026-08-26

## Release decision: NOT SIGNED OFF

PerformanceIQ has completed the backend security/performance phase and has now passed the first authenticated frontend/data workflow phase for the two live roles that currently exist. Final release acceptance is still blocked by missing Coach/Parent/Admin live-role tests, browser-level onboarding/mobile QA, architecture cleanup, automated tests, and Design/Marketing acceptance.

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
- Signup text-visibility hotfix loaded last in the CSS cascade.
- Frontend/auth QA results recorded in `docs/FRONTEND_AUTH_QA_2026-08-26.md`.

### Current test coverage reality
The live `profiles` table currently contains one `player` profile and one `solo` profile. There are no live `coach`, `parent`, or `admin` profiles available for truthful end-to-end account tests. Those three role tests remain pending until dedicated accounts exist or are supplied.

Player and Solo positive-path database workflows are now verified with rollback test rows; no QA data was left behind.

### Remaining PM blockers
- Dedicated Coach account and coach→athlete relationship test.
- Dedicated Parent account and parent→athlete relationship test.
- Dedicated Admin account and admin authorization test.
- Browser-level real-account signup → confirmation (if enabled) → sign-in → onboarding → home regression test.
- Visual regression test of signup/onboarding at phone widths after the contrast fix.
- Enable leaked-password protection in Supabase Auth if available for the project plan/configuration.
- Resolve duplicate root/frontend architecture.
- Add automated role and core-journey tests.
- Complete Design/mobile/accessibility acceptance.
- Complete Marketing conversion/trust-layer validation.

### PM rule
No team may self-certify completion. Each fix must be retested against the live product or a production-equivalent test environment and explicitly accepted by the Program Manager before the release decision changes to SIGNED OFF.
