-- PerformanceIQ production alignment — 2026-08-25
-- Mirrors the verified changes applied to Supabase project jijqjbgmhhlvokgtuema.

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'player';
ALTER VIEW public.piq_acwr SET (security_invoker = true);

ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.piq_update_streak(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.piq_can_send_notification(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.piq_refresh_streak_at_risk(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.my_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_coach_of(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_parent_of(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.compute_readiness() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_acwr(uuid, date) SET search_path = public, pg_temp;
ALTER FUNCTION public.compute_piq_score(uuid, date) SET search_path = public, pg_temp;
ALTER FUNCTION public.upsert_piq_score(uuid, date) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_notification(uuid, text, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_recently_active_athletes(integer) SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'player') IN ('coach','player','parent','admin','solo')
      THEN COALESCE(NEW.raw_user_meta_data->>'role', 'player')
      ELSE 'player'
    END,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.piq_streaks (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.piq_user_preferences (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Remove implicit PUBLIC execution from privileged functions.
REVOKE EXECUTE ON FUNCTION public.compute_piq_score(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_acwr(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_recently_active_athletes(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.piq_can_send_notification(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.piq_refresh_streak_at_risk(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.piq_update_streak(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_piq_score(uuid, date) FROM PUBLIC, anon, authenticated;

-- These helpers are intentionally callable only by authenticated users because
-- they derive their result from auth.uid() and support RLS policy evaluation.
REVOKE EXECUTE ON FUNCTION public.get_my_team_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_coach_of(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_parent_of(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.piq_get_my_team_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_team_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coach_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_parent_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.piq_get_my_team_ids() TO authenticated;
