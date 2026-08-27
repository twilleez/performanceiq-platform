-- PerformanceIQ release certification fix
-- Direct relationship tables must participate in authorization helpers.

create or replace function private.is_coach_of(p_athlete_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.coach_athlete_links cal
    where cal.coach_id = auth.uid()
      and cal.athlete_id = p_athlete_id
      and coalesce(cal.is_active, true) = true
  ) or exists (
    select 1
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where t.coach_id = auth.uid()
      and tm.athlete_id = p_athlete_id
  );
$$;

create or replace function private.is_parent_of(p_athlete_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and linked_athlete_id = p_athlete_id
  ) or exists (
    select 1 from public.family_links
    where parent_id = auth.uid() and athlete_id = p_athlete_id and confirmed = true
  ) or exists (
    select 1 from public.parent_athlete_links
    where parent_id = auth.uid() and athlete_id = p_athlete_id
  );
$$;
