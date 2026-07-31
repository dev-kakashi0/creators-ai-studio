-- 1. credit_transactions: remove write privileges from client roles
REVOKE INSERT, UPDATE, DELETE ON public.credit_transactions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.credit_transactions FROM anon;
REVOKE ALL ON public.credit_transactions FROM anon;
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;

-- Explicit deny policies for writes (defense in depth)
DROP POLICY IF EXISTS "no client insert credit tx" ON public.credit_transactions;
CREATE POLICY "no client insert credit tx" ON public.credit_transactions
  FOR INSERT TO authenticated, anon WITH CHECK (false);
DROP POLICY IF EXISTS "no client update credit tx" ON public.credit_transactions;
CREATE POLICY "no client update credit tx" ON public.credit_transactions
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "no client delete credit tx" ON public.credit_transactions;
CREATE POLICY "no client delete credit tx" ON public.credit_transactions
  FOR DELETE TO authenticated, anon USING (false);

-- 2. SECURITY DEFINER / trigger functions must not be callable by clients
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 3. Harden consume_credits (still callable by signed-in users by design)
CREATE OR REPLACE FUNCTION public.consume_credits(_amount integer, _reason text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  remaining INTEGER;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 1000 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  UPDATE public.profiles SET credits = credits - _amount
  WHERE id = uid AND credits >= _amount
  RETURNING credits INTO remaining;

  IF remaining IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, reason)
  VALUES (uid, -_amount, left(coalesce(_reason, 'usage'), 100));

  RETURN remaining;
END; $function$;

REVOKE ALL ON FUNCTION public.consume_credits(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_credits(integer, text) TO authenticated;