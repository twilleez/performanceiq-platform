-- Prevent client-controlled signup metadata from creating administrator profiles.
-- Public signup may create coach, player, parent, or solo accounts only.
-- Administrator promotion is server-side only.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'player') IN ('coach','player','parent','solo')
      THEN COALESCE(NEW.raw_user_meta_data->>'role', 'player')
      ELSE 'player'
    END,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.piq_streaks (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.piq_user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.promote_profile_to_admin(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'auth user does not exist';
  END IF;

  ALTER TABLE public.profiles DISABLE TRIGGER trg_prevent_profile_role_escalation;
  UPDATE public.profiles
  SET role = 'admin', updated_at = now()
  WHERE id = p_user_id;
  ALTER TABLE public.profiles ENABLE TRIGGER trg_prevent_profile_role_escalation;
END;
$function$;

REVOKE ALL ON FUNCTION private.promote_profile_to_admin(uuid)
FROM PUBLIC, anon, authenticated;
