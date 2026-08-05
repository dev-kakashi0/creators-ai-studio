-- 1. Least-privilege admin check, SECURITY INVOKER (no elevated rights).
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated, service_role;

-- 2. Role management is server-side only (service_role bypasses RLS).
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;

-- 3. Swap every admin policy over to the invoker-based check.
DROP POLICY IF EXISTS "admins update credit costs" ON public.credit_costs;
CREATE POLICY "admins update credit costs" ON public.credit_costs FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "admins insert credit costs" ON public.credit_costs;
CREATE POLICY "admins insert credit costs" ON public.credit_costs FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "admins read all credit tx" ON public.credit_transactions;
CREATE POLICY "admins read all credit tx" ON public.credit_transactions FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "admins manage providers" ON public.payment_providers;
CREATE POLICY "admins manage providers" ON public.payment_providers FOR ALL TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "admins manage plan prices" ON public.plan_prices;
CREATE POLICY "admins manage plan prices" ON public.plan_prices FOR ALL TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "admins manage pack prices" ON public.pack_prices;
CREATE POLICY "admins manage pack prices" ON public.pack_prices FOR ALL TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "admins manage plans" ON public.plans;
CREATE POLICY "admins manage plans" ON public.plans FOR ALL TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "admins manage packs" ON public.credit_packs;
CREATE POLICY "admins manage packs" ON public.credit_packs FOR ALL TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "admins manage coupons" ON public.coupons;
CREATE POLICY "admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "admins read subscriptions" ON public.subscriptions;
CREATE POLICY "admins read subscriptions" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "admins read payments" ON public.payments;
CREATE POLICY "admins read payments" ON public.payments FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "admins read invoices" ON public.invoices;
CREATE POLICY "admins read invoices" ON public.invoices FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "admins manage billing settings" ON public.billing_settings;
CREATE POLICY "admins manage billing settings" ON public.billing_settings FOR ALL TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());