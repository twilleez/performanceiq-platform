# Live Role Certification — 2026-08-28

## Accounts
- Admin: confirmed Auth account, `admin` profile.
- Coach: confirmed Auth account, `coach` profile.
- Parent: confirmed Auth account, `parent` profile.
- Player QA: confirmed Auth account, `player` profile using the owner's Gmail plus-alias.

## Persistent relationships
- Parent is linked to the Player QA account through `parent_athlete_links` and `profiles.linked_athlete_id`.
- Coach is linked to the Player QA account through `coach_athlete_links`.

## Profile visibility matrix
- Player: sees 1 profile — self only. PASS.
- Parent: sees 2 profiles — self + linked Player. PASS.
- Coach: sees 2 profiles — self + linked Player. PASS.
- Admin: sees all 4 live profiles. PASS.

## Readiness permissions
- Player created a readiness row for self through authenticated RLS. PASS.
- Parent could read the linked Player readiness row. PASS.
- Coach could read the linked Player readiness row. PASS.
- Parent readiness INSERT for the linked Player was rejected by RLS with PostgreSQL 42501. PASS.

## Workout permissions
- Coach assigned a workout to the linked Player through authenticated RLS. PASS.
- Player could see and complete the assigned workout. PASS.
- Parent could read the linked Player workout. PASS.
- Parent update affected zero rows because RLS denies workout mutation. PASS.
- Admin could see all live profiles plus the QA readiness/workout records. PASS.

## Cleanup
The temporary readiness and workout records used for certification were deleted after verification. The QA Player account and Parent/Coach relationships remain intentionally in place for future regression testing.

## Security follow-up
Supabase security advisor reports one remaining warning only: leaked-password protection is disabled in Auth configuration. All role-management `SECURITY DEFINER` exposure warnings are resolved.

## PM result
Live Player / Parent / Coach / Admin database authorization: PASS.

Final release sign-off still requires resolving or explicitly accepting the leaked-password-protection configuration warning and maintaining the existing rendered-browser/production-deployment gates.
