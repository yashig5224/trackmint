REVOKE EXECUTE ON FUNCTION public.prevent_role_self_assignment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_role_self_assignment() TO service_role;