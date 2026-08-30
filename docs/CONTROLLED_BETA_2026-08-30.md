# PerformanceIQ — Controlled Beta / Real-User Acceptance

Date: 2026-08-30
Owner: Program Manager
Participants: Software Engineering, Product Design, Marketing

## Objective
Move PerformanceIQ from automated release-candidate validation into evidence from real users without weakening production security or contaminating product data.

## In-app feedback system
Authenticated beta users now have a persistent **Beta Feedback** control in the signed-in application.

Each production submission records:
- authenticated `user_id`;
- current role;
- current route/screen;
- category;
- severity/impact;
- user description;
- viewport, path/hash and browser user-agent metadata;
- triage status.

Demo sessions can open and review the feedback interface but are explicitly prevented from writing feedback to production.

## Supabase controls
Table: `public.beta_feedback`

RLS acceptance verified on 2026-08-30:
- authenticated Player can insert feedback for self — PASS;
- Parent attempting to insert feedback for another user — BLOCKED by RLS;
- Admin can read and triage feedback — PASS;
- anonymous access is revoked;
- test rows were transactionally rolled back; live table was confirmed empty after QA.

Migration: `database/migrations/014_add_controlled_beta_feedback.sql`.

## Feedback categories
- `usability` — flow is difficult or slow to understand;
- `bug` — product behavior is broken;
- `confusing` — labels, metrics, or guidance are unclear;
- `feature` — requested improvement/new capability;
- `other` — feedback that does not fit another category.

## Severity definition
- `low` — cosmetic/minor friction, workaround obvious;
- `medium` — meaningful friction but user can continue;
- `high` — major workflow impairment or incorrect result;
- `blocking` — user cannot complete a core task.

## PM triage rule
1. **Blocking / security / data-integrity** feedback is treated as P0 until disproven.
2. **High** feedback affecting a core journey is P1 and blocks broad beta expansion until resolved or explicitly waived.
3. Repeated `confusing` or `usability` reports are routed to Product Design even when the underlying code works.
4. Messaging/positioning feedback is routed to Marketing only when the product behavior itself is correct.
5. Teams do not self-close findings. Program Manager retests and changes `status` only after acceptance evidence exists.

## Controlled-beta test journeys
### Athlete / Player
- signup / confirmation / sign-in / onboarding;
- Today session clarity;
- readiness entry and explanation;
- workout logging;
- progress/PIQ interpretation;
- refresh/relogin persistence.

### Coach
- roster/linked-athlete recognition;
- identifying readiness exceptions;
- assigning a workout;
- verifying athlete completion;
- understanding analytics/action priority.

### Parent
- recognizing the linked athlete;
- reading wellness/readiness without edit capability;
- understanding weekly plan/progress;
- confirming read-only boundaries are intuitive.

### Admin
- role-level product overview;
- organization/team navigation;
- visibility of controlled-beta findings through Supabase during this beta phase;
- verification that admin-only actions remain unavailable to public signup users.

## Automated evidence after implementation
Commit `78f1857e5cc64ad39b323bda64f9aea29102e636`:
- Production Smoke Checks run `33328465238` — PASS;
- Browser Core Journeys run `33328465231` — PASS;
- GitHub Pages deploy run `33328465219` — PASS.

The browser suite specifically protects the Beta Feedback control/dialog and verifies that demo mode does not submit production feedback.

## Remaining real-user acceptance gates
- brand-new public signup → email confirmation → sign-in → onboarding → home;
- production data persistence after refresh/relogin;
- Player Today usability acceptance;
- Coach dashboard/actionability acceptance;
- readiness/PIQ comprehension acceptance;
- error/loading/empty-state findings from real beta usage;
- leaked-password-protection configuration or explicit PM exception;
- resolution/waiver of any beta P0/P1 findings.

## Current decision
**CONTROLLED BETA READY — NOT FINAL GENERAL-AVAILABILITY SIGN-OFF.**

The application is ready to collect structured real-user evidence. General release remains gated by the acceptance items above.
