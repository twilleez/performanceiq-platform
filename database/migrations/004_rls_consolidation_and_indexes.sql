-- PerformanceIQ migration 004
-- Consolidates duplicated RLS policies on core and priority secondary tables,
-- scopes policies to authenticated users, optimizes auth.uid() evaluation,
-- and adds FK/query-path indexes identified by Supabase advisors.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles','teams','workouts','readiness_logs','nutrition_logs',
        'coach_notes','family_links','personal_records','piq_scores'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- PROFILES
CREATE POLICY profiles_select_authenticated ON public.profiles
FOR SELECT TO authenticated
USING (id = (select auth.uid()) OR public.is_coach_of(id) OR public.is_parent_of(id) OR public.my_role() = 'admin');
CREATE POLICY profiles_insert_self ON public.profiles
FOR INSERT TO authenticated WITH CHECK (id = (select auth.uid()));
CREATE POLICY profiles_update_self ON public.profiles
FOR UPDATE TO authenticated
USING (id = (select auth.uid())) WITH CHECK (id = (select auth.uid()));

-- TEAMS
CREATE POLICY teams_select_authenticated ON public.teams
FOR SELECT TO authenticated
USING (coach_id = (select auth.uid()) OR id IN (SELECT public.get_my_team_ids()) OR public.my_role() = 'admin');
CREATE POLICY teams_insert_coach ON public.teams
FOR INSERT TO authenticated
WITH CHECK (coach_id = (select auth.uid()) AND public.my_role() IN ('coach','admin'));
CREATE POLICY teams_update_coach ON public.teams
FOR UPDATE TO authenticated
USING (coach_id = (select auth.uid()) OR public.my_role() = 'admin')
WITH CHECK (coach_id = (select auth.uid()) OR public.my_role() = 'admin');
CREATE POLICY teams_delete_coach ON public.teams
FOR DELETE TO authenticated
USING (coach_id = (select auth.uid()) OR public.my_role() = 'admin');

-- WORKOUTS
CREATE POLICY workouts_select_authenticated ON public.workouts
FOR SELECT TO authenticated
USING (athlete_id = (select auth.uid()) OR assigned_by = (select auth.uid()) OR public.is_coach_of(athlete_id) OR public.is_parent_of(athlete_id) OR public.my_role() = 'admin');
CREATE POLICY workouts_insert_authorized ON public.workouts
FOR INSERT TO authenticated
WITH CHECK (athlete_id = (select auth.uid()) OR public.is_coach_of(athlete_id) OR public.my_role() = 'admin');
CREATE POLICY workouts_update_authorized ON public.workouts
FOR UPDATE TO authenticated
USING (athlete_id = (select auth.uid()) OR public.is_coach_of(athlete_id) OR public.my_role() = 'admin')
WITH CHECK (athlete_id = (select auth.uid()) OR public.is_coach_of(athlete_id) OR public.my_role() = 'admin');
CREATE POLICY workouts_delete_authorized ON public.workouts
FOR DELETE TO authenticated
USING (athlete_id = (select auth.uid()) OR public.is_coach_of(athlete_id) OR public.my_role() = 'admin');

-- READINESS
CREATE POLICY readiness_select_authenticated ON public.readiness_logs
FOR SELECT TO authenticated
USING (athlete_id = (select auth.uid()) OR public.is_coach_of(athlete_id) OR public.is_parent_of(athlete_id) OR public.my_role() = 'admin');
CREATE POLICY readiness_insert_self ON public.readiness_logs
FOR INSERT TO authenticated WITH CHECK (athlete_id = (select auth.uid()));
CREATE POLICY readiness_update_self ON public.readiness_logs
FOR UPDATE TO authenticated
USING (athlete_id = (select auth.uid())) WITH CHECK (athlete_id = (select auth.uid()));
CREATE POLICY readiness_delete_self ON public.readiness_logs
FOR DELETE TO authenticated USING (athlete_id = (select auth.uid()));

-- NUTRITION
CREATE POLICY nutrition_select_authenticated ON public.nutrition_logs
FOR SELECT TO authenticated
USING (athlete_id = (select auth.uid()) OR public.is_coach_of(athlete_id) OR public.is_parent_of(athlete_id) OR public.my_role() = 'admin');
CREATE POLICY nutrition_insert_self ON public.nutrition_logs
FOR INSERT TO authenticated WITH CHECK (athlete_id = (select auth.uid()));
CREATE POLICY nutrition_update_self ON public.nutrition_logs
FOR UPDATE TO authenticated
USING (athlete_id = (select auth.uid())) WITH CHECK (athlete_id = (select auth.uid()));
CREATE POLICY nutrition_delete_self ON public.nutrition_logs
FOR DELETE TO authenticated USING (athlete_id = (select auth.uid()));

-- COACH NOTES
CREATE POLICY coach_notes_select_authenticated ON public.coach_notes
FOR SELECT TO authenticated
USING (author_id = (select auth.uid()) OR athlete_id = (select auth.uid()) OR public.my_role() = 'admin');
CREATE POLICY coach_notes_insert_author ON public.coach_notes
FOR INSERT TO authenticated
WITH CHECK (author_id = (select auth.uid()) AND public.my_role() IN ('coach','admin'));
CREATE POLICY coach_notes_update_author ON public.coach_notes
FOR UPDATE TO authenticated
USING (author_id = (select auth.uid()) OR public.my_role() = 'admin')
WITH CHECK (author_id = (select auth.uid()) OR public.my_role() = 'admin');
CREATE POLICY coach_notes_delete_author ON public.coach_notes
FOR DELETE TO authenticated
USING (author_id = (select auth.uid()) OR public.my_role() = 'admin');

-- FAMILY LINKS
CREATE POLICY family_links_select_participants ON public.family_links
FOR SELECT TO authenticated
USING (parent_id = (select auth.uid()) OR athlete_id = (select auth.uid()) OR public.my_role() = 'admin');
CREATE POLICY family_links_insert_parent ON public.family_links
FOR INSERT TO authenticated
WITH CHECK (parent_id = (select auth.uid()) OR public.my_role() = 'admin');
CREATE POLICY family_links_update_athlete ON public.family_links
FOR UPDATE TO authenticated
USING (athlete_id = (select auth.uid()) OR public.my_role() = 'admin')
WITH CHECK (athlete_id = (select auth.uid()) OR public.my_role() = 'admin');

-- PERSONAL RECORDS
CREATE POLICY personal_records_select_authorized ON public.personal_records
FOR SELECT TO authenticated
USING (athlete_id = (select auth.uid()) OR public.is_coach_of(athlete_id) OR public.my_role() = 'admin');
CREATE POLICY personal_records_insert_self ON public.personal_records
FOR INSERT TO authenticated WITH CHECK (athlete_id = (select auth.uid()));
CREATE POLICY personal_records_update_self ON public.personal_records
FOR UPDATE TO authenticated
USING (athlete_id = (select auth.uid())) WITH CHECK (athlete_id = (select auth.uid()));
CREATE POLICY personal_records_delete_self ON public.personal_records
FOR DELETE TO authenticated USING (athlete_id = (select auth.uid()));

-- PIQ SCORES
-- service_role bypasses RLS; no browser-facing INSERT policy is required.
CREATE POLICY piq_scores_select_authorized ON public.piq_scores
FOR SELECT TO authenticated
USING (athlete_id = (select auth.uid()) OR public.is_coach_of(athlete_id) OR public.is_parent_of(athlete_id) OR public.my_role() = 'admin');

-- FK/query-path indexes
CREATE INDEX IF NOT EXISTS idx_athlete_goals_athlete_id ON public.athlete_goals(athlete_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_profile_id ON public.audit_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_coach_athlete_links_athlete_id ON public.coach_athlete_links(athlete_id);
CREATE INDEX IF NOT EXISTS idx_coach_notes_team_id ON public.coach_notes(team_id);
CREATE INDEX IF NOT EXISTS idx_coach_notes_athlete_id ON public.coach_notes(athlete_id);
CREATE INDEX IF NOT EXISTS idx_coach_notes_author_id ON public.coach_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_exercises_created_by ON public.exercises(created_by);
CREATE INDEX IF NOT EXISTS idx_family_links_athlete_id ON public.family_links(athlete_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_athlete_id ON public.nutrition_logs(athlete_id);
CREATE INDEX IF NOT EXISTS idx_parent_athlete_links_athlete_id ON public.parent_athlete_links(athlete_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_athlete_id ON public.personal_records(athlete_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_workout_id ON public.personal_records(workout_id);
CREATE INDEX IF NOT EXISTS idx_piq_message_threads_athlete_id ON public.piq_message_threads(athlete_id);
CREATE INDEX IF NOT EXISTS idx_piq_messages_sender_id ON public.piq_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_piq_report_log_coach_id ON public.piq_report_log(coach_id);
CREATE INDEX IF NOT EXISTS idx_piq_report_log_athlete_id ON public.piq_report_log(athlete_id);
CREATE INDEX IF NOT EXISTS idx_profiles_linked_athlete_id ON public.profiles(linked_athlete_id);
CREATE INDEX IF NOT EXISTS idx_program_templates_created_by ON public.program_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_team_announcements_team_id ON public.team_announcements(team_id);
CREATE INDEX IF NOT EXISTS idx_team_announcements_author_id ON public.team_announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_team_members_athlete_id ON public.team_members(athlete_id);
CREATE INDEX IF NOT EXISTS idx_teams_coach_id ON public.teams(coach_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_prescribed_by ON public.workout_logs(prescribed_by);
CREATE INDEX IF NOT EXISTS idx_workout_templates_created_by ON public.workout_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_workouts_assigned_by ON public.workouts(assigned_by);
CREATE INDEX IF NOT EXISTS idx_workouts_template_id ON public.workouts(template_id);
