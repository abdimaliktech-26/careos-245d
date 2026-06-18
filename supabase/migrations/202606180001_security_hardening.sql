-- Security advisor hardening (no function-body changes).
-- Pin search_path on SECURITY DEFINER helpers; revoke public execute on the
-- maintenance purge function (it should only run from the cron via service role).

ALTER FUNCTION public.get_my_org_id() SET search_path = public;
ALTER FUNCTION public.is_super_admin() SET search_path = public;
ALTER FUNCTION public.has_role(public.user_role) SET search_path = public;
ALTER FUNCTION public.get_my_role() SET search_path = public;
ALTER FUNCTION public.get_my_company_id() SET search_path = public;
ALTER FUNCTION public.purge_stale_location_pings() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.purge_stale_location_pings() FROM anon, authenticated;
