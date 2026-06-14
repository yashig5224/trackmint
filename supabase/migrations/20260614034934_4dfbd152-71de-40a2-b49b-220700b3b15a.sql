
-- 1. Lock down subscriptions: users cannot self-mutate plan/status
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;

-- 2. Lock down payments: only service_role can insert payment rows
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;

-- 3. Defense-in-depth: prevent any non-admin from inserting/updating user_roles rows
--    Admins manage roles policy already restricts ALL, but make intent explicit
--    by ensuring no other policy can grant write access.
DROP POLICY IF EXISTS "Users see their own roles" ON public.user_roles;
CREATE POLICY "Users see their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Trigger: block role escalation even if a future policy regresses
CREATE OR REPLACE FUNCTION public.prevent_role_self_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role bypasses
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  -- Only existing admins may write to user_roles
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can modify user roles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_guard ON public.user_roles;
CREATE TRIGGER user_roles_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_assignment();

-- 4. Revoke EXECUTE on has_role from authenticated users (linter finding).
--    The function is invoked from RLS policies (which run as the policy owner),
--    so authenticated users do not need direct EXECUTE on it.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- 5. Realtime: deny direct subscribes on realtime.messages so users cannot
--    join arbitrary broadcast/presence topics. postgres_changes still works
--    because Realtime enforces the underlying table RLS for row events.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny realtime broadcast/presence" ON realtime.messages;
CREATE POLICY "Deny realtime broadcast/presence"
  ON realtime.messages FOR SELECT TO authenticated, anon
  USING (false);
