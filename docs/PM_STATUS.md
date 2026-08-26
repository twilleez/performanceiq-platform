# Program Manager Status

Updated: 2026-08-26

## Release decision: NOT SIGNED OFF

PerformanceIQ has completed the backend security/performance phase, authenticated Player/Solo workflow testing, Design/Browser static QA, architecture consolidation, and automated rendered-browser core-journey testing. Final release acceptance is still blocked by missing Coach/Parent/Admin live-role authorization tests, a real-account authentication/onboarding journey, leaked-password protection configuration, and Marketing conversion/trust acceptance.

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
- Cross-tab sign-out clears both storage and in-memory auth state.
- Email-confirmation signup flow no longer creates a fake local authenticated session when Supabase has not issued a session.
- Signup visibility and contrast are isolated with a final auth stylesheet.
- Active `ob2-*` onboarding wizard has readable text, visible inputs, mobile grids, focus states, safe-area spacing, reduced-motion behavior, and single-active-panel enforcement.
- Signup uses semantic form submission with labels, required/email/password validation, `aria-pressed` role state, live status messages, keyboard-operable sign-in, and busy state.
- Root static smoke suite is exposed as `npm run test:smoke`; smoke run `33011932187` passed on the browser-tested production state.
- Architecture consolidation PASS: root static application is the single authoritative production frontend.
- Root `package.json` no longer treats `frontend/` and `backend/` as active workspaces.
- `frontend/` is documented as legacy/reference code and `backend/` as a non-production server prototype.
- GitHub Pages stages a production-only artifact and explicitly excludes `frontend/`, `backend/`, and `database/`.
- Service worker is scope-aware for GitHub Pages project-path hosting.
- Automated Core-Journey Testing PASS using Playwright/Chromium.
- Browser gate covers public signup, demo onboarding, all five demo role shells, Player core navigation, role-navigation isolation, Solo workout logging, sign-out, and phone-width signup visibility.
- The first browser run correctly failed and exposed real regressions instead of producing a false green result.
- Browser-discovered defects fixed: onboarding displayed multiple steps simultaneously; shared state was missing `getAssignedWorkouts`, `completeAssignment`, `addCheckIn`, and `getUnreadCount`; malformed legacy root TypeScript config/source was removed from the production root and preserved under `legacy/`.
- Production shared state upgraded to v8 with safe v7 migration, assigned-workout state, completion handling, check-in history support, and explicit unread counting.
- Final browser workflow run `33011932128` passed **13/13 tests, 0 failures**.
- GitHub Pages deployment run `33011932130` passed after the same state fixes, including smoke, production staging, staged-artifact verification, upload, and deploy.
- Core-journey QA evidence recorded in `docs/AUTOMATED_CORE_JOURNEYS_2026-08-26.md`.

### Current test coverage reality
The live `profiles` table currently contains one `player` profile and one `solo` profile. There are no live `coach`, `parent`, or `admin` profiles available for truthful end-to-end Supabase authorization tests. Those three live-role tests remain pending until dedicated accounts exist or are supplied.

Player and Solo positive-path database workflows are verified with rollback test rows; no QA data was left behind.

Rendered-browser coverage now exists in CI for desktop Chromium and a representative Chromium-emulated phone viewport. This materially closes the earlier browser-visibility gap, but it does not substitute for a real production account signup/confirmation/sign-in/onboarding journey or dedicated physical-device coverage.

### Remaining PM blockers
- Dedicated Coach account and coach→athlete Supabase relationship/authorization test.
- Dedicated Parent account and parent→athlete Supabase relationship/authorization test.
- Dedicated Admin account and admin authorization test.
- Real-account signup → email confirmation (if enabled) → sign-in → onboarding → home regression test.
- Enable leaked-password protection in Supabase Auth if available for the project plan/configuration.
- Complete Marketing conversion, positioning, pricing/trust, and launch acceptance.

### PM rule
No team may self-certify completion. Each fix must be retested against the live product or a production-equivalent test environment and explicitly accepted by the Program Manager before the release decision changes to SIGNED OFF.
