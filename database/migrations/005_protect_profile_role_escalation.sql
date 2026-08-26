-- Prevent authenticated users from escalating their own profile role.

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Only an already-existing admin profile may change profile roles.
  if new.role is distinct from old.role then
    if old.role <> 'admin' then
      raise exception 'profile role cannot be changed by this user';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.prevent_profile_role_escalation() from public, anon, authenticated;

drop trigger if exists trg_prevent_profile_role_escalation on public.profiles;
create trigger trg_prevent_profile_role_escalation
before update on public.profiles
for each row execute function public.prevent_profile_role_escalation();
