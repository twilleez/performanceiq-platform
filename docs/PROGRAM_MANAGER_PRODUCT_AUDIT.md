# PerformanceIQ — Program Manager Product Audit

Date: 2026-08-25
Status: ACTIVE REMEDIATION

## Operating model

The Program Manager (PM) is the release gate and represents QA, usability testing, focus-group feedback, and product acceptance. Findings are routed to one accountable team: Software Engineering, Product Design, or Marketing. A finding is not complete until implementation evidence exists, regression checks pass, and the PM signs it off.

Workflow: DISCOVERED → TRIAGED → IN PROGRESS → TEAM QA → PM ACCEPTANCE → SIGNED OFF.

## Executive assessment

### Strengths to preserve and enhance
- Role-based product architecture for coach, player, parent, admin, and solo experiences.
- Clear athlete workflow concepts: readiness, workouts, progress, PIQ score, nutrition, and team/coach functions.
- Modular JavaScript views and services rather than a single monolithic page.
- Real Supabase client integration plus offline/demo pathways for demos.
- Existing RLS-oriented database migrations and a growing service layer.
- PWA/deployment foundations and GitHub Pages deployment.

### Highest-priority weaknesses
1. **P0 — Frontend/database role contract mismatch.** Frontend uses `player` and `solo`; migration constrains profiles to `athlete` and `solo_athlete`. This can break signup/onboarding/profile writes.
2. **P0 — Profile schema contract mismatch.** Current auth/client code expects fields including `name`, `email`, `onboarded`, `primary_goal`, etc., while the workout-engine migration creates a much smaller profiles schema.
3. **P0 — Authorization policies are too broad/incomplete for production.** Several `FOR ALL USING (...)` policies lack explicit `WITH CHECK`; profiles are broadly readable; privileged signup function needs hardening and explicit execution/search-path controls.
4. **P1 — Session architecture duplicates Supabase auth state in custom localStorage.** This increases stale-session and authorization/UI drift risk.
5. **P1 — Repository architecture contains overlapping implementations** (`js/` app plus `frontend/` tree), increasing maintenance cost and ambiguity about the production source of truth.
6. **P1 — README is not product documentation.** The current README contains database SQL instead of setup, architecture, deployment, testing, product positioning, and contribution guidance.
7. **P1 — UX/navigation density.** Each role exposes many top-level destinations. The strongest product concept—“what should I do today?”—should dominate athlete experiences, with advanced functions progressively disclosed.
8. **P1 — Trust language.** Injury-risk/readiness outputs require clear explanation, data provenance, limitations, and non-medical positioning in the UI.
9. **P2 — Marketing funnel is underdeveloped.** The deployed application is product-first; it needs a conversion-oriented public story, persona-specific benefits, proof/demo paths, pricing/CTA strategy, and analytics instrumentation.
10. **P2 — Automated release evidence is insufficient.** Production sign-off should require smoke tests, role-route tests, auth tests, database/RLS checks, accessibility checks, and deployment verification.

## Team charters

### Software Engineering
Owns auth/session correctness, Supabase schema and RLS, role contracts, data persistence, routing, automated tests, performance, error handling, deployment integrity, and removal/consolidation of duplicate architecture.

Definition of done: reproducible test evidence; no P0/P1 functional/security defects; database advisors reviewed; role-based authorization tests pass; production deployment verified.

### Product Design
Owns information architecture, responsive/mobile UX, accessibility, onboarding, hierarchy, interaction consistency, empty/loading/error states, trust/explanation patterns, and usability testing.

Definition of done: all primary persona journeys can be completed without explanation; WCAG-oriented keyboard/focus/contrast checks; mobile flows verified; PM usability acceptance.

### Marketing
Owns positioning, audience segmentation, public landing/conversion experience, product messaging, demo story, pricing/CTA architecture, onboarding activation messaging, retention messaging, and measurement plan.

Definition of done: clear ICP/persona message, measurable funnel, working CTA/demo paths, product claims aligned with actual capabilities, PM focus-group acceptance.

## Program Manager acceptance gates

A release can be called finished only when:
- Zero open P0 defects.
- Zero open P1 defects unless explicitly waived with documented rationale.
- All five role journeys pass smoke testing.
- Real Supabase authentication and profile persistence pass.
- RLS/authorization tests prove users cannot read/write unauthorized records.
- Core athlete journey (check readiness → see today plan → execute/log → see progress) passes on mobile and desktop.
- Coach journey (roster → athlete status → assign/review work → analytics) passes.
- Parent/admin journeys expose only intended information/actions.
- Accessibility and responsive checks pass.
- Marketing claims match implemented behavior.
- Deployment succeeds and the production URL is smoke-tested after release.

## PM sign-off rule

No issue is signed off because code was written. Sign-off requires evidence that the user-visible behavior works, regression risk is controlled, and the production build reflects the accepted change.
