# Program Manager Status

Updated: 2026-08-30

## Release decision: CONTROLLED BETA READY — FINAL SECURITY / REAL-USER ACCEPTANCE PENDING

PerformanceIQ has passed backend security/performance hardening, rendered-browser core-journey testing, architecture consolidation, commercial-readiness smoke testing, crawler/SEO remediation, live Player / Parent / Coach / Admin database authorization certification, authenticated-shell regression testing, and controlled-beta feedback infrastructure validation.

### Completed release gates
- Live Supabase project `jijqjbgmhhlvokgtuema` verified directly.
- Public signup role contract restricted to `coach`, `player`, `parent`, and `solo`; client-controlled `admin` signup blocked.
- Controlled role-management path restricted to `service_role` only.
- Core and secondary RLS policies consolidated and hardened.
- RLS relationship helpers moved to non-exposed `private` schema.
- Player profile isolation PASS.
- Parent profile visibility PASS: self + linked Player only.
- Coach profile visibility PASS: self + linked Player only.
- Admin profile visibility PASS: all live profiles.
- Player readiness write PASS.
- Parent read-only readiness access PASS; Parent write rejected by RLS.
- Coach linked-athlete readiness access PASS.
- Coach workout assignment PASS.
- Player assigned-workout visibility/completion PASS.
- Parent assigned-workout read-only access PASS; Parent update affected zero rows under RLS.
- Admin visibility of QA readiness/workout data PASS.
- Dedicated confirmed Player QA Auth user retained for regression testing.
- Parent→Player and Coach→Player QA relationships retained for regression testing.
- Signup/sign-in Quick Demo visibility repaired.
- Demo startup no longer depends on Supabase authentication/network requests.
- Authenticated app defaults to branded navy/green dark visual system.
- Authenticated production shell regression resolved and protected by Playwright layout/contrast assertions.
- Service worker uses network-first refresh behavior for production assets.
- Production `index.html` includes crawlable static marketing content and SEO metadata before JavaScript executes.
- `robots.txt` and `sitemap.xml` deployed.
- Root static app remains the single authoritative production frontend.

### Controlled-beta infrastructure — PASS
- Added `public.beta_feedback` with RLS, role/category/severity/status fields and device/screen metadata support.
- Authenticated user may submit feedback only for self — PASS.
- Cross-user feedback spoof attempt rejected by RLS — PASS.
- Admin read/triage permission — PASS.
- Anonymous access revoked.
- QA feedback rows were rolled back; production feedback table confirmed empty immediately after validation.
- In-app **Beta Feedback** control is available on signed-in product screens.
- Demo sessions can inspect the feedback UX but do not write to production.
- Controlled-beta browser test added.
- Production Smoke Checks run `33328465238` — PASS.
- Browser Core Journeys run `33328465231` — PASS.
- GitHub Pages deployment run `33328465219` — PASS.
- Full process documented in `docs/CONTROLLED_BETA_2026-08-30.md`.

### Supabase advisor status
- Security advisor: one remaining warning only — leaked-password protection is disabled in Auth configuration.
- Performance advisor: informational unused-index notices only; no actionable RLS/performance errors introduced by controlled-beta migration.

### Active real-user acceptance gates
- GitHub Issue #1 — enable leaked-password protection or document PM exception.
- GitHub Issue #2 — certify brand-new signup → email confirmation → sign-in → onboarding → home.
- GitHub Issue #3 — verify authenticated data persistence after refresh and relogin.
- GitHub Issue #4 — run Player and Coach real-user usability acceptance.
- Resolve or explicitly waive any blocking/high-severity feedback from controlled beta.

### Paid launch boundary
Paid pricing/billing remains outside the current free controlled-beta gate. Stripe checkout, provisioning, renewal, cancellation and entitlement regression testing are required before paid plans are published.

### PM rule
No team may self-certify completion. Each change must be retested against the live product or a production-equivalent environment and explicitly accepted by the Program Manager before final release sign-off.
