# Program Manager Status

Updated: 2026-08-26

## Release decision: NOT SIGNED OFF

PerformanceIQ is materially more secure and consistent than at the start of the audit, but final release acceptance is still blocked by incomplete end-to-end role testing, remaining secondary-table RLS/performance cleanup, UI regression work, and final Design/Marketing acceptance.

### Completed this cycle
- Live Supabase project `jijqjbgmhhlvokgtuema` verified directly.
- Frontend role contract confirmed against live role values: `coach`, `player`, `parent`, `admin`, `solo`.
- Frontend profile write path aligned to the live `team_name` column.
- Supabase browser client moved to the publishable-key path.
- Security-definer search paths hardened for priority functions.
- Anonymous execution removed from privileged security-definer functions.
- `piq_acwr` changed to security-invoker behavior.
- Core RLS consolidated on `profiles`, `teams`, `workouts`, `readiness_logs`, and `nutrition_logs`.
- Priority secondary-table RLS consolidated on `coach_notes`, `family_links`, `personal_records`, and `piq_scores`.
- A broken team-membership RLS comparison was removed during consolidation.
- Missing foreign-key/query-path indexes identified by the Supabase advisor were added.
- Supabase advisor re-run after migrations; the cleaned priority tables no longer appear in duplicate-policy / auth-initplan warnings.
- GitHub migration `database/migrations/004_rls_consolidation_and_indexes.sql` added so repository state records the production changes.

### Current test coverage reality
The live `profiles` table currently contains only one `player` profile and one `solo` profile. There are no live `coach`, `parent`, or `admin` profiles available for truthful end-to-end account testing. Those three role tests remain pending until dedicated test accounts exist or are supplied.

### Blocking PM sign-off
- Live authenticated regression test for Player/Athlete workflow.
- Live authenticated regression test for Solo workflow.
- Dedicated Coach test account and coach→athlete relationship test.
- Dedicated Parent test account and parent→athlete relationship test.
- Dedicated Admin test account and admin authorization test.
- Remaining secondary RLS/performance cleanup (`workout_templates`, `team_announcements`, messaging/notification/support tables and other advisor findings).
- Review remaining authenticated `SECURITY DEFINER` RLS helper exposure and move helpers out of the exposed schema where practical.
- Resolve `pg_trgm` placement warning or document accepted risk.
- Enable leaked-password protection in Supabase Auth if available for the project plan/configuration.
- Production authentication/session and onboarding regression test.
- Duplicate root/frontend architecture must be resolved.
- Automated role and core-journey tests must be added.
- Design/mobile/accessibility acceptance must be completed.
- Marketing conversion/trust layer must be completed and validated.

### PM rule
No team may self-certify completion. Each fix must be retested against the live product or production-equivalent test environment and explicitly accepted by the Program Manager before the release decision changes to SIGNED OFF.
