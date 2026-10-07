# PerformanceIQ cloud sync and account sharing

## Account isolation
Signed-in accounts use a per-user local state key. Demo/signed-out mode keeps the demo state. Sample athletes are never used as fallback data for a real signed-in Coach, Parent, or Admin.

## Cloud sync
Player/Solo completed sessions sync to `public.workouts`; readiness check-ins sync to `public.readiness_logs`. Offline writes queue locally and retry on reconnect.

## Athlete-initiated sharing
Coach and Parent access is granted only after the athlete creates the corresponding link from **Settings → Share my data**.

Production RLS was hardened in migration `athlete_initiated_account_linking`:
- only the athlete may INSERT a coach/parent link;
- only the athlete may UPDATE or DELETE the direct link;
- participants may SELECT their relationship row;
- authorization helpers verify the caller has the expected Coach/Parent role before a direct link grants athlete-data access.

This prevents a Coach or Parent from self-authorizing by creating a link to an athlete UUID.

## Real-account views
Real Coach screens show only linked/team athletes returned through RLS. Real Parent screens show only linked athletes. Real Admin accounts receive a clear live-data-not-connected notice instead of demo organization metrics.

## Known limits
Messages remain device-local. Admin organization reporting is not yet cloud-backed. Existing historical sessions in the old shared local blob are not automatically migrated to the cloud.

## Verification
- `npm run test:unit`: consistency + cloud mapping
- `npm run test:load`: unified training load model
- `npm run test:e2e`: browser core journeys
- Production RLS policies must also be tested with separate Athlete, Coach, Parent, and unrelated Athlete identities before final release signoff.
