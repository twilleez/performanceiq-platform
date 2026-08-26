-- Mirrors production migration: harden_secondary_rls_and_messaging

DROP POLICY IF EXISTS "tm: select" ON public.team_members;
DROP POLICY IF EXISTS "tm: insert self" ON public.team_members;
DROP POLICY IF EXISTS "tm: update coach" ON public.team_members;
DROP POLICY IF EXISTS "tm: delete" ON public.team_members;
CREATE POLICY team_members_select_authorized ON public.team_members FOR SELECT TO authenticated USING (athlete_id=(select auth.uid()) OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id=team_members.team_id AND t.coach_id=(select auth.uid())) OR public.my_role()='admin');
CREATE POLICY team_members_insert_self_or_coach ON public.team_members FOR INSERT TO authenticated WITH CHECK (athlete_id=(select auth.uid()) OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id=team_members.team_id AND t.coach_id=(select auth.uid())) OR public.my_role()='admin');
CREATE POLICY team_members_update_coach ON public.team_members FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id=team_members.team_id AND t.coach_id=(select auth.uid())) OR public.my_role()='admin') WITH CHECK (EXISTS (SELECT 1 FROM public.teams t WHERE t.id=team_members.team_id AND t.coach_id=(select auth.uid())) OR public.my_role()='admin');
CREATE POLICY team_members_delete_authorized ON public.team_members FOR DELETE TO authenticated USING (athlete_id=(select auth.uid()) OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id=team_members.team_id AND t.coach_id=(select auth.uid())) OR public.my_role()='admin');

DROP POLICY IF EXISTS "Anyone authenticated can read templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Coaches can create templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Coaches can update their own templates" ON public.workout_templates;
CREATE POLICY workout_templates_select_authenticated ON public.workout_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY workout_templates_insert_coach ON public.workout_templates FOR INSERT TO authenticated WITH CHECK (created_by=(select auth.uid()) AND public.my_role() IN ('coach','admin'));
CREATE POLICY workout_templates_update_owner ON public.workout_templates FOR UPDATE TO authenticated USING (created_by=(select auth.uid()) OR public.my_role()='admin') WITH CHECK (created_by=(select auth.uid()) OR public.my_role()='admin');
CREATE POLICY workout_templates_delete_owner ON public.workout_templates FOR DELETE TO authenticated USING (created_by=(select auth.uid()) OR public.my_role()='admin');

DROP POLICY IF EXISTS "Team members can read announcements" ON public.team_announcements;
DROP POLICY IF EXISTS "Coaches can post announcements" ON public.team_announcements;
CREATE POLICY announcements_select_team ON public.team_announcements FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id=team_announcements.team_id AND tm.athlete_id=(select auth.uid())) OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id=team_announcements.team_id AND t.coach_id=(select auth.uid())) OR public.my_role()='admin');
CREATE POLICY announcements_insert_coach ON public.team_announcements FOR INSERT TO authenticated WITH CHECK (author_id=(select auth.uid()) AND EXISTS (SELECT 1 FROM public.teams t WHERE t.id=team_announcements.team_id AND t.coach_id=(select auth.uid())));
CREATE POLICY announcements_update_author ON public.team_announcements FOR UPDATE TO authenticated USING (author_id=(select auth.uid()) OR public.my_role()='admin') WITH CHECK (author_id=(select auth.uid()) OR public.my_role()='admin');
CREATE POLICY announcements_delete_author ON public.team_announcements FOR DELETE TO authenticated USING (author_id=(select auth.uid()) OR public.my_role()='admin');

DROP POLICY IF EXISTS "notifications: service insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications: own read" ON public.notifications;
DROP POLICY IF EXISTS "notifications: own update" ON public.notifications;
CREATE POLICY notifications_select_self ON public.notifications FOR SELECT TO authenticated USING (profile_id=(select auth.uid()));
CREATE POLICY notifications_update_self ON public.notifications FOR UPDATE TO authenticated USING (profile_id=(select auth.uid())) WITH CHECK (profile_id=(select auth.uid()));

DROP POLICY IF EXISTS threads_participant ON public.piq_message_threads;
CREATE POLICY threads_select_participant ON public.piq_message_threads FOR SELECT TO authenticated USING (coach_id=(select auth.uid()) OR athlete_id=(select auth.uid()) OR public.my_role()='admin');
CREATE POLICY threads_insert_participant ON public.piq_message_threads FOR INSERT TO authenticated WITH CHECK (coach_id=(select auth.uid()) OR athlete_id=(select auth.uid()) OR public.my_role()='admin');
CREATE POLICY threads_update_participant ON public.piq_message_threads FOR UPDATE TO authenticated USING (coach_id=(select auth.uid()) OR athlete_id=(select auth.uid()) OR public.my_role()='admin') WITH CHECK (coach_id=(select auth.uid()) OR athlete_id=(select auth.uid()) OR public.my_role()='admin');

DROP POLICY IF EXISTS messages_participant ON public.piq_messages;
CREATE POLICY messages_select_participant ON public.piq_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.piq_message_threads t WHERE t.id=piq_messages.thread_id AND (t.coach_id=(select auth.uid()) OR t.athlete_id=(select auth.uid()))) OR public.my_role()='admin');
CREATE POLICY messages_insert_sender ON public.piq_messages FOR INSERT TO authenticated WITH CHECK (sender_id=(select auth.uid()) AND EXISTS (SELECT 1 FROM public.piq_message_threads t WHERE t.id=piq_messages.thread_id AND (t.coach_id=(select auth.uid()) OR t.athlete_id=(select auth.uid()))));
CREATE POLICY messages_update_participant ON public.piq_messages FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.piq_message_threads t WHERE t.id=piq_messages.thread_id AND (t.coach_id=(select auth.uid()) OR t.athlete_id=(select auth.uid()))) OR public.my_role()='admin') WITH CHECK (EXISTS (SELECT 1 FROM public.piq_message_threads t WHERE t.id=piq_messages.thread_id AND (t.coach_id=(select auth.uid()) OR t.athlete_id=(select auth.uid()))) OR public.my_role()='admin');
CREATE POLICY messages_delete_sender ON public.piq_messages FOR DELETE TO authenticated USING (sender_id=(select auth.uid()) OR public.my_role()='admin');
CREATE OR REPLACE FUNCTION public.protect_message_identity() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$ BEGIN IF NEW.thread_id IS DISTINCT FROM OLD.thread_id OR NEW.sender_id IS DISTINCT FROM OLD.sender_id OR NEW.content IS DISTINCT FROM OLD.content OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Message identity and content are immutable after send'; END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_protect_message_identity ON public.piq_messages;
CREATE TRIGGER trg_protect_message_identity BEFORE UPDATE ON public.piq_messages FOR EACH ROW EXECUTE FUNCTION public.protect_message_identity();

ALTER POLICY goals_own ON public.athlete_goals TO authenticated USING ((select auth.uid())=athlete_id) WITH CHECK ((select auth.uid())=athlete_id);
ALTER POLICY cal_participant ON public.coach_athlete_links TO authenticated USING (((select auth.uid())=coach_id) OR ((select auth.uid())=athlete_id)) WITH CHECK (((select auth.uid())=coach_id) OR ((select auth.uid())=athlete_id));
ALTER POLICY pal_participant ON public.parent_athlete_links TO authenticated USING (((select auth.uid())=parent_id) OR ((select auth.uid())=athlete_id)) WITH CHECK (((select auth.uid())=parent_id) OR ((select auth.uid())=athlete_id));
ALTER POLICY audit_log_own ON public.piq_audit_log TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);
ALTER POLICY food_log_own ON public.piq_food_log TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);
ALTER POLICY milestones_own ON public.piq_milestones TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);
ALTER POLICY notif_own ON public.piq_notification_log TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);
ALTER POLICY onboarding_own ON public.piq_onboarding TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);
ALTER POLICY push_own ON public.piq_push_subscriptions TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);
ALTER POLICY report_log_coach ON public.piq_report_log TO authenticated USING ((select auth.uid())=coach_id) WITH CHECK ((select auth.uid())=coach_id);
ALTER POLICY streaks_own ON public.piq_streaks TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);
ALTER POLICY sync_own ON public.piq_sync_state TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);
ALTER POLICY tooltip_own ON public.piq_tooltip_dismissals TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);
ALTER POLICY prefs_own ON public.piq_user_preferences TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);

ALTER POLICY workout_logs_own ON public.workout_logs TO authenticated USING ((select auth.uid())=user_id OR EXISTS (SELECT 1 FROM public.coach_athlete_links l WHERE l.coach_id=(select auth.uid()) AND l.athlete_id=workout_logs.user_id)) WITH CHECK ((select auth.uid())=user_id OR EXISTS (SELECT 1 FROM public.coach_athlete_links l WHERE l.coach_id=(select auth.uid()) AND l.athlete_id=workout_logs.user_id));
ALTER POLICY piq_score_own ON public.piq_score_history TO authenticated USING ((select auth.uid())=user_id OR EXISTS (SELECT 1 FROM public.coach_athlete_links l WHERE l.coach_id=(select auth.uid()) AND l.athlete_id=piq_score_history.user_id) OR EXISTS (SELECT 1 FROM public.parent_athlete_links l WHERE l.parent_id=(select auth.uid()) AND l.athlete_id=piq_score_history.user_id)) WITH CHECK ((select auth.uid())=user_id);

DROP POLICY IF EXISTS "exercises: public read system" ON public.exercises;
DROP POLICY IF EXISTS "exercises: create own" ON public.exercises;
DROP POLICY IF EXISTS "exercises: update own" ON public.exercises;
CREATE POLICY exercises_select_authenticated ON public.exercises FOR SELECT TO authenticated USING (is_system=true OR created_by=(select auth.uid()));
CREATE POLICY exercises_insert_own ON public.exercises FOR INSERT TO authenticated WITH CHECK (created_by=(select auth.uid()) AND is_system=false);
CREATE POLICY exercises_update_own ON public.exercises FOR UPDATE TO authenticated USING (created_by=(select auth.uid()) AND is_system=false) WITH CHECK (created_by=(select auth.uid()) AND is_system=false);
CREATE POLICY exercises_delete_own ON public.exercises FOR DELETE TO authenticated USING (created_by=(select auth.uid()) AND is_system=false);

DROP POLICY IF EXISTS "templates: public read system" ON public.program_templates;
CREATE POLICY program_templates_select_authenticated ON public.program_templates FOR SELECT TO authenticated USING (is_system=true OR created_by=(select auth.uid()));