# Program Manager Status

Updated: 2026-08-28

## Release decision: RELEASE CANDIDATE — FINAL SECURITY CONFIGURATION PENDING

PerformanceIQ has passed backend security/performance hardening, rendered-browser core-journey testing, architecture consolidation, commercial-readiness smoke testing, crawler/SEO remediation, and live Player / Parent / Coach / Admin database authorization certification.

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
- Temporary certification readiness/workout rows removed after testing.
- Dedicated confirmed Player QA Auth user created and retained for future regression testing.
- Persistent Parent→Player and Coach→Player QA relationships created for future regression testing.
- Signup/sign-in Quick Demo visibility repaired.
- Demo startup no longer depends on Supabase authentication/network requests.
- Authenticated app defaults to the branded navy/green dark visual system.
- Service worker upgraded from stale cache-first production assets to network-first refresh behavior.
- Production `index.html` includes a crawlable static PerformanceIQ marketing shell, canonical/robots metadata, Open Graph/Twitter metadata and SoftwareApplication JSON-LD before JavaScript executes.
- `robots.txt` and `sitemap.xml` deployed.
- Root static app remains the single authoritative production frontend.
- Automated Playwright browser journeys and production smoke/deployment gates are in place.
- Live role certification evidence recorded in `docs/LIVE_ROLE_CERTIFICATION_2026-08-28.md`.

### Current live role set
- Admin: 1 confirmed Auth/profile account.
- Coach: 1 confirmed Auth/profile account.
- Parent: 1 confirmed Auth/profile account.
- Player: 1 dedicated confirmed QA Auth/profile account.

### Supabase advisor status
- Security advisor: one remaining warning only — leaked-password protection is disabled in Auth configuration.
- Performance advisor: informational unused-index notices only; no actionable RLS/performance errors.

### Remaining PM blocker
- Enable Supabase leaked-password protection if supported by the project plan/configuration, or explicitly document an accepted exception if the feature is unavailable.

### PM rule
No team may self-certify completion. Each change must be retested against the live product or a production-equivalent environment and explicitly accepted by the Program Manager before final release sign-off.
