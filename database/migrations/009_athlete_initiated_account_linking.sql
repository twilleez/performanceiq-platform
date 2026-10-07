-- PerformanceIQ: athlete-initiated direct sharing
-- Mirrors production migration athlete_initiated_account_linking.

DROP POLICY IF EXISTS cal_participant ON public.coach_athlete_links;
DROP POLICY IF EXISTS pal_participant ON public.parent_athlete_links;

DROP POLICY IF EXISTS cal_select_participants ON public.coach_athlete_links;
DROP POLICY IF EXISTS cal_insert_by_athlete ON public.coach_athlete_links;
DROP POLICY IF EXISTS cal_update_by_athlete ON public.coach_athlete_links;
DROP POLICY IF EXISTS cal_delete_by_athlete ON public.coach_athlete_links;

CREATE POLICY cal_select_participants
ON public.coach_athlete_links
FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = athlete_id
  OR ((SELECT auth.uid()) = coach_id AND private.my_role() = 'coach')
);

CREATE POLICY cal_insert_by_athlete
ON public.coach_athlete_links
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = athlete_id);

CREATE POLICY cal_update_by_athlete
ON public.coach_athlete_links
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = athlete_id)
WITH CHECK ((SELECT auth.uid()) = athlete_id);

CREATE POLICY cal_delete_by_athlete
ON public.coach_athlete_links
FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = athlete_id);

DROP POLICY IF EXISTS pal_select_participants ON public.parent_athlete_links;
DROP POLICY IF EXISTS pal_insert_by_athlete ON public.parent_athlete_links;
DROP POLICY IF EXISTS pal_update_by_athlete ON public.parent_athlete_links;
DROP POLICY IF EXISTS pal_delete_by_athlete ON public.parent_athlete_links;

CREATE POLICY pal_select_participants
ON public.parent_athlete_links
FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = athlete_id
  OR ((SELECT auth.uid()) = parent_id AND private.my_role() = 'parent')
);

CREATE POLICY pal_insert_by_athlete
ON public.parent_athlete_links
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = athlete_id);

CREATE POLICY pal_update_by_athlete
ON public.parent_athlete_links
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = athlete_id)
WITH CHECK ((SELECT auth.uid()) = athlete_id);

CREATE POLICY pal_delete_by_athlete
ON public.parent_athlete_links
FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = athlete_id);

CREATE OR REPLACE FUNCTION private.is_coach_of(p_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.id = (SELECT auth.uid()) AND me.role = 'coach'
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.coach_athlete_links cal
        WHERE cal.coach_id = (SELECT auth.uid())
          AND cal.athlete_id = p_athlete_id
          AND COALESCE(cal.is_active, true) = true
      )
      OR EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.teams t ON t.id = tm.team_id
        WHERE t.coach_id = (SELECT auth.uid())
          AND tm.athlete_id = p_athlete_id
      )
    );
$$;

CREATE OR REPLACE FUNCTION private.is_parent_of(p_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.id = (SELECT auth.uid()) AND me.role = 'parent'
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.linked_athlete_id = p_athlete_id
      )
      OR EXISTS (
        SELECT 1 FROM public.family_links fl
        WHERE fl.parent_id = (SELECT auth.uid())
          AND fl.athlete_id = p_athlete_id
          AND fl.confirmed = true
      )
      OR EXISTS (
        SELECT 1 FROM public.parent_athlete_links pal
        WHERE pal.parent_id = (SELECT auth.uid())
          AND pal.athlete_id = p_athlete_id
      )
    );
$$;

REVOKE ALL ON FUNCTION private.is_coach_of(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_parent_of(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_coach_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_parent_of(uuid) TO authenticated;
