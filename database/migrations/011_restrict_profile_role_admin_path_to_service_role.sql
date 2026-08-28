revoke all on function public.set_profile_role_admin(uuid,text) from public;
revoke all on function public.set_profile_role_admin(uuid,text) from anon;
revoke all on function public.set_profile_role_admin(uuid,text) from authenticated;
grant execute on function public.set_profile_role_admin(uuid,text) to service_role;