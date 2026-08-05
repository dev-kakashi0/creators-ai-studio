-- Dedicated, least-privilege helper for the client: only answers about the caller.
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated, service_role;

-- has_role stays available to RLS policies (evaluated as table owner context) but
-- is no longer directly callable by signed-in users with arbitrary user ids.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;