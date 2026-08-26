-- Mirrors production migration: move_rls_helpers_private_and_extension

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

ALTER FUNCTION public.get_my_team_ids() SET SCHEMA private;
ALTER FUNCTION public.piq_get_my_team_ids() SET SCHEMA private;
ALTER FUNCTION public.is_coach_of(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_parent_of(uuid) SET SCHEMA private;
ALTER FUNCTION public.my_role() SET SCHEMA private;

GRANT EXECUTE ON FUNCTION private.get_my_team_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION private.piq_get_my_team_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_coach_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_parent_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.my_role() TO authenticated;

CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;