# PerformanceIQ Release Acceptance Checklist

## Software Engineering
- [ ] Production source-of-truth architecture identified and documented
- [ ] Role names match across UI, auth, services, database constraints, and RLS
- [ ] Profile schema matches every frontend read/write field
- [ ] Real sign-up, email confirmation (when enabled), sign-in, refresh, and sign-out verified
- [ ] Supabase session is authoritative for production users
- [ ] RLS SELECT/INSERT/UPDATE/DELETE behavior tested for every user relationship
- [ ] No service-role/secret keys shipped to browser
- [ ] Database security and performance advisors reviewed
- [ ] Route guard tests pass for coach/player/parent/admin/solo
- [ ] Core data persists after refresh/new session
- [ ] Offline/demo data cannot contaminate production data
- [ ] Error/loading/empty states verified
- [ ] Deployment workflow succeeds

## Product Design
- [ ] Athlete Today journey is the clearest primary action
- [ ] Coach dashboard surfaces exceptions/actionable athletes first
- [ ] Navigation labels and hierarchy are consistent
- [ ] Mobile layout verified at common phone widths
- [ ] Keyboard navigation and visible focus verified
- [ ] Forms have labels, validation, and recoverable error states
- [ ] Readiness/PIQ/risk outputs explain what changed and why
- [ ] Reduced-motion preference respected
- [ ] New-user onboarding reaches first value quickly

## Marketing
- [ ] One-sentence value proposition is clear
- [ ] Coach, athlete, parent, and organization benefits are differentiated
- [ ] Demo CTA works without requiring production data
- [ ] Public claims match product behavior
- [ ] Pricing/plan architecture is documented or intentionally deferred
- [ ] Activation and conversion events are defined
- [ ] Privacy/trust language is visible where sensitive wellness data is used

## Program Manager final gate
- [ ] No open P0 issues
- [ ] No unwaived P1 issues
- [ ] Five role smoke tests pass
- [ ] Mobile and desktop core journeys pass
- [ ] Supabase production integration passes
- [ ] Security/RLS checks pass
- [ ] Production deployment verified
- [ ] Focus-group/usability findings resolved or explicitly waived
- [ ] Final release signed off
