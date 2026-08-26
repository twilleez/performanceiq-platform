# Frontend/Auth QA — 2026-08-26

## Scope
Production-equivalent regression testing for Player and Solo roles plus frontend session-flow review.

## Live database role tests
Tests used authenticated JWT context against the live Supabase project and rollback transactions so no QA rows remained in production.

### Player
PASS — can insert own readiness row.
PASS — can insert own nutrition row.
PASS — can insert own workout row.
PASS — can insert own personal-record row.
PASS — cannot insert readiness data for the Solo user; RLS returned permission error.
PASS — own profile visible; Solo profile hidden.

### Solo
PASS — can insert own readiness row.
PASS — can insert own nutrition row.
PASS — can insert own workout row.
PASS — can insert own personal-record row.
PASS — own profile visible; Player profile hidden.

All positive-path writes were executed inside transactions that were rolled back.

## Frontend defects found and fixed
1. Stale production local session could be treated as authenticated before Supabase was checked.
2. Cross-tab `SIGNED_OUT` cleared localStorage but did not clear the in-memory auth session.
3. Sign-up could create a local authenticated session even when Supabase returned no session because email confirmation was required.
4. Signup light-card text visibility was vulnerable to older global dark-auth CSS rules.

## Fixes
- `js/core/auth.js`: Supabase now reconciles restored production sessions before route selection; profile/role is refreshed from the database; expired or mismatched sessions are cleared.
- `js/core/boot.js`: awaits Supabase reconciliation before the app chooses an authenticated route; auth events clear in-memory state correctly.
- `js/views/shared/signup.js`: handles email-confirmation-required signups without creating a fake authenticated state.
- `css/auth-hotfix.css`: final signup-specific contrast rules loaded last by `index.html`.

## Still pending
- Real Coach, Parent, and Admin account workflow tests.
- Browser-level visual confirmation of signup/onboarding at phone widths.
- Full onboarding completion using a newly created real account.
- Automated browser tests for auth, role routing, and critical training flows.
