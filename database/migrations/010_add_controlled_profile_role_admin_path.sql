create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role then
    if coalesce(current_setting('performanceiq.role_change_authorized', true), '') <> 'on' then
      raise exception 'profile role cannot be changed directly';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.set_profile_role_admin(target_user_id uuid, new_role text)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result_row public.profiles;
  caller_is_admin boolean := false;
begin
  if new_role not in ('coach','player','parent','solo','admin') then
    raise exception 'invalid profile role';
  end if;

  if auth.uid() is not null then
    select exists(
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    ) into caller_is_admin;
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
     and not caller_is_admin
     and session_user not in ('postgres','supabase_admin') then
    raise exception 'not authorized to change profile roles';
  end if;

  perform set_config('performanceiq.role_change_authorized', 'on', true);

  update public.profiles
     set role = new_role,
         updated_at = now()
   where id = target_user_id
   returning * into result_row;

  if result_row.id is null then
    raise exception 'profile not found';
  end if;

  return result_row;
end;
$$;

revoke all on function public.set_profile_role_admin(uuid,text) from public;
grant execute on function public.set_profile_role_admin(uuid,text) to authenticated, service_role;