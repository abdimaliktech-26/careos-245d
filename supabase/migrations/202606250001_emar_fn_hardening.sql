-- ============================================================
-- eMAR helper-function hardening
-- Match the existing RLS-helper baseline: pin search_path and revoke
-- EXECUTE from the anon role on the SECURITY DEFINER pharmacy helpers.
-- (Resolves Supabase advisors function_search_path_mutable +
--  anon_security_definer_function_executable for these functions.)
-- ============================================================

ALTER FUNCTION public.get_my_pharmacy_id()              SET search_path = public;
ALTER FUNCTION public.is_pharmacy_user()                SET search_path = public;
ALTER FUNCTION public.pharmacy_has_org_access(uuid)     SET search_path = public;
ALTER FUNCTION public.pharmacy_has_client_access(uuid)  SET search_path = public;

-- Remove the default PUBLIC grant (covers anon), then grant only authenticated.
REVOKE EXECUTE ON FUNCTION public.get_my_pharmacy_id()             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_pharmacy_user()               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pharmacy_has_org_access(uuid)    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pharmacy_has_client_access(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_my_pharmacy_id()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_pharmacy_user()               TO authenticated;
GRANT EXECUTE ON FUNCTION public.pharmacy_has_org_access(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.pharmacy_has_client_access(uuid) TO authenticated;
