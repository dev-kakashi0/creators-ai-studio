-- Users can no longer call the SECURITY DEFINER credit function directly
REVOKE ALL ON FUNCTION public.consume_credits(integer, text) FROM PUBLIC, anon, authenticated;

-- Server-only variant, callable exclusively with the service role
CREATE OR REPLACE FUNCTION public.consume_credits_for(_user_id uuid, _amount integer, _reason text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE remaining INTEGER;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 1000 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  UPDATE public.profiles SET credits = credits - _amount
  WHERE id = _user_id AND credits >= _amount
  RETURNING credits INTO remaining;

  IF remaining IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, reason)
  VALUES (_user_id, -_amount, left(coalesce(_reason, 'usage'), 100));

  RETURN remaining;
END; $function$;

REVOKE ALL ON FUNCTION public.consume_credits_for(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credits_for(uuid, integer, text) TO service_role;