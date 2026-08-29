# PerformanceIQ Release Acceptance Checklist

Updated: 2026-08-29

Legend: `[x]` verified; `[ ]` still requires evidence or explicit PM waiver.

## Software Engineering
- [x] Production source-of-truth architecture identified and documented
- [x] Role names match across UI, auth, services, database constraints, and RLS
- [x] Profile schema matches current frontend read/write fields used by the certified flows
- [ ] Real public sign-up → email confirmation → sign-in → onboarding → home journey verified end-to-end with a newly created user
- [x] Supabase session is authoritative for production users
- [x] RLS behavior tested for the certified Player/Parent/Coach/Admin relationship flows
- [x] No service-role/secret keys shipped to browser in the certified production path
- [x] Database security and performance advisors reviewed
- [x] Route/browser role tests pass for coach/player/parent/admin/solo demo shells
- [ ] Core production data persistence after browser refresh/new authenticated session explicitly regression-tested
- [x] Demo data path is isolated from Supabase production writes in automated browser testing
- [ ] Error/loading/empty states comprehensively verified across all role views
- [x] Deployment workflow succeeds
- [x] Authenticated desktop shell regression test passes

## Product Design
- [x] Public product flow communicates Readiness → Today → Log → Progress
- [ ] Athlete Today journey receives final real-user usability acceptance
- [ ] Coach dashboard receives final real-user usability acceptance for exception/action visibility
- [x] Navigation labels and role hierarchy are automated-test protected
- [x] Representative desktop and phone-width browser layouts are automated-test protected
- [x] Signup keyboard/focus/form semantics are implemented and regression-tested at source/browser level
- [x] Signup forms have labels and validation
- [ ] Readiness/PIQ/risk explanations receive final user-comprehension acceptance
- [x] Reduced-motion preference is supported in the active onboarding/component styles
- [x] Onboarding wizard active-step visibility is regression-tested

## Marketing
- [x] One-sentence value proposition is clear on the public landing experience
- [x] Coach, athlete, parent, and solo benefits are differentiated
- [x] Demo CTA works without requiring production data
- [x] Public claims are constrained to verified product behavior
- [x] Pricing/plan architecture is intentionally deferred until billing/provisioning is tested
- [x] Activation and conversion events required for paid launch are documented
- [x] Wellness/readiness medical-use limitation language is visible publicly
- [ ] Paid pricing, checkout, subscription provisioning, cancellation and renewal are production-tested

## Security
- [x] Public signup cannot self-assign `admin`
- [x] Administrative role-management path is restricted to `service_role`
- [x] Player/Parent/Coach/Admin profile visibility matrix passes against live Supabase Auth users
- [x] Parent read-only and Coach assignment permissions pass against live relationships
- [x] Authenticated-shell regression passed Browser Core Journeys run `33210051614`
- [x] Production Smoke Checks run `33210051589` passed on the shell-fix state
- [x] GitHub Pages deployment run `33210051598` passed on the shell-fix state
- [ ] Supabase leaked-password protection enabled, or an explicit PM exception documented — tracked in GitHub Issue #1

## Program Manager final gate
- [x] No known open application-code P0 issue from the certified regression set
- [ ] No unwaived P1/release-blocking configuration issue
- [x] Five demo role smoke tests pass
- [x] Live Player/Parent/Coach/Admin database authorization certification passes
- [x] Mobile and desktop automated core journeys pass
- [x] Supabase production integration passes for the certified authorization/data flows
- [ ] Final Supabase Auth password-security configuration accepted
- [x] Production deployment verified
- [ ] Real-user/focus-group usability findings resolved or explicitly waived
- [ ] Final release signed off

## Current PM decision
**RELEASE CANDIDATE — FINAL SECURITY CONFIGURATION / REAL-USER ACCEPTANCE PENDING**

The authenticated-shell regression reported on 2026-08-28 is closed. The remaining engineering/security blocker is the Supabase leaked-password configuration tracked in Issue #1. Paid billing remains intentionally outside the current free controlled-beta release until Stripe provisioning is implemented and tested.
