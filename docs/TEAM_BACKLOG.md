# PerformanceIQ Team Backlog

## P0 — Software Engineering

### ENG-001 Role contract unification
Frontend currently uses coach/player/parent/admin/solo while migration artifacts include coach/athlete/parent/solo_athlete/admin. Choose one canonical vocabulary and migrate every layer atomically.

Acceptance: signup, onboarding, login, route guard, profile upsert and role-specific home route pass for all roles.

### ENG-002 Profile schema contract
Create one canonical `profiles` schema that contains the fields actually used by production code. Remove conflicting profile definitions from migration history going forward.

Acceptance: fresh database bootstrap plus existing-database migration both succeed; profile create/read/update tested.

### ENG-003 RLS hardening
Replace broad/incomplete policies with operation-specific policies and ownership/relationship predicates. Add WITH CHECK to writes. Harden privileged functions and views.

Acceptance: negative authorization tests prove cross-user and cross-team access is denied.

## P1 — Software Engineering

### ENG-004 Auth/session convergence
Use Supabase auth session as production source of truth; reserve custom local state for UI/demo state only. Add auth state change handling and expiry behavior.

### ENG-005 Architecture consolidation
Declare either root `js/` or `frontend/` as the production implementation. Archive/remove dead duplicate paths after parity review.

### ENG-006 Automated quality gate
Add smoke tests for boot, role routing, auth, core workflows, and deployment. Add lint/static checks appropriate to the selected architecture.

## P1 — Product Design

### DES-001 Athlete information architecture
Make Today the dominant athlete entry point. Group secondary functions under Progress, Plan, and Profile where appropriate.

### DES-002 Coach exception-first dashboard
Prioritize athletes needing action, readiness changes, missed work, and upcoming assignments over passive metrics.

### DES-003 Trust and explainability
For PIQ/readiness/risk outputs, show inputs, change drivers, confidence/limitations, and actionable next step. Avoid presenting wellness analytics as medical diagnosis.

### DES-004 Accessibility and responsive QA
Standardize focus states, labels, keyboard interactions, motion preferences, touch targets, contrast, loading, empty, and error states.

## P2 — Marketing

### MKT-001 Product positioning
Primary promise: turn daily athlete signals into a clear next training action while giving coaches a team-level decision view. Validate language with coaches, athletes, and parents.

### MKT-002 Persona conversion paths
Build distinct coach/team, athlete/solo, parent, and organization story paths with demo CTAs.

### MKT-003 Proof and measurement
Define activation events, demo completion, onboarding completion, first readiness check, first workout completion, coach roster activation, weekly retention, and conversion metrics.

### MKT-004 Launch trust package
Publish privacy/data-use explanation, analytics limitations, support expectations, and product capability matrix before paid acquisition.

## Program Manager test scenarios
1. New athlete signs up, onboards, completes readiness, receives/starts a workout, logs it, and sees updated progress.
2. Coach signs up, creates/joins a team, sees roster/readiness, assigns work, and reviews completion.
3. Parent can see only linked-athlete information and cannot modify coach-only data.
4. Admin can perform intended organization actions without inheriting unrestricted database access accidentally.
5. Solo athlete completes the full value loop without team dependencies.
6. Unauthorized user attempts direct data access for another athlete and is denied.
7. Refresh, expired session, offline/demo, and network-error paths recover cleanly.
8. Mobile user can complete the athlete core loop with one hand and without horizontal overflow.

Each item remains open until implementation + team QA + PM acceptance are recorded.
