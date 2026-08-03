-- Providers
CREATE TABLE public.payment_providers (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  region text NOT NULL DEFAULT 'international',
  methods jsonb NOT NULL DEFAULT '[]'::jsonb,
  currencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'test',
  configured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_providers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_providers TO authenticated;
GRANT ALL ON public.payment_providers TO service_role;
ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "providers public read" ON public.payment_providers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage providers" ON public.payment_providers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER payment_providers_updated_at BEFORE UPDATE ON public.payment_providers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Localized plan prices
CREATE TABLE public.plan_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id text NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  region text NOT NULL DEFAULT 'international',
  currency text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  interval text NOT NULL DEFAULT 'month',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, currency, interval)
);
GRANT SELECT ON public.plan_prices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.plan_prices TO authenticated;
GRANT ALL ON public.plan_prices TO service_role;
ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan prices public read" ON public.plan_prices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage plan prices" ON public.plan_prices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER plan_prices_updated_at BEFORE UPDATE ON public.plan_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Localized pack prices
CREATE TABLE public.pack_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id text NOT NULL REFERENCES public.credit_packs(id) ON DELETE CASCADE,
  region text NOT NULL DEFAULT 'international',
  currency text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pack_id, currency)
);
GRANT SELECT ON public.pack_prices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pack_prices TO authenticated;
GRANT ALL ON public.pack_prices TO service_role;
ALTER TABLE public.pack_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pack prices public read" ON public.pack_prices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage pack prices" ON public.pack_prices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER pack_prices_updated_at BEFORE UPDATE ON public.pack_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Admin write access on plans & packs
CREATE POLICY "admins manage plans" ON public.plans FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage packs" ON public.credit_packs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
GRANT INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.credit_packs TO authenticated;

-- Coupons
CREATE TABLE public.coupons (
  code text PRIMARY KEY,
  description text,
  percent_off integer,
  amount_off numeric,
  currency text,
  trial_days integer NOT NULL DEFAULT 0,
  plan_id text REFERENCES public.plans(id) ON DELETE SET NULL,
  max_redemptions integer,
  redeemed_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active coupons readable" ON public.coupons FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'active',
  provider text,
  provider_reference text,
  currency text NOT NULL DEFAULT 'EUR',
  amount numeric NOT NULL DEFAULT 0,
  interval text NOT NULL DEFAULT 'month',
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  grace_until timestamptz,
  coupon_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX subscriptions_one_active_per_user ON public.subscriptions (user_id) WHERE status IN ('active','trialing','past_due');
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  method text,
  kind text NOT NULL DEFAULT 'subscription',
  plan_id text,
  pack_id text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending',
  reference text,
  coupon_code text,
  country text,
  failure_reason text,
  credits_granted integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read payments" ON public.payments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  number text NOT NULL UNIQUE,
  label text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'paid',
  issued_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own invoices" ON public.invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read invoices" ON public.invoices FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Billing settings
CREATE TABLE public.billing_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.billing_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.billing_settings TO authenticated;
GRANT ALL ON public.billing_settings TO service_role;
ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing settings public read" ON public.billing_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage billing settings" ON public.billing_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed providers
INSERT INTO public.payment_providers (id, name, description, region, methods, currencies, enabled, configured, sort_order) VALUES
 ('stripe','Stripe','Cartes internationales, Apple Pay et Google Pay','international','["visa","mastercard","amex","apple_pay","google_pay"]','["EUR","USD","CAD","GBP"]', false, false, 1),
 ('fedapay','FedaPay','Mobile Money et cartes en Afrique de l''Ouest et Centrale','africa','["mtn_momo","orange_money","moov_money","visa","mastercard"]','["XOF","XAF"]', false, false, 2),
 ('cinetpay','CinetPay','Agrégateur Mobile Money multi-pays','africa','["mtn_momo","orange_money","moov_money","wave"]','["XOF","XAF"]', false, false, 3),
 ('paydunya','PayDunya','Paiements mobiles et cartes en Afrique de l''Ouest','africa','["orange_money","wave","visa"]','["XOF"]', false, false, 4),
 ('flutterwave','Flutterwave','Paiements panafricains','africa','["mobile_money","visa","mastercard"]','["XOF","XAF","NGN","USD"]', false, false, 5),
 ('paystack','Paystack','Cartes et transferts en Afrique','africa','["visa","mastercard","bank_transfer"]','["NGN","GHS","ZAR"]', false, false, 6),
 ('paypal','PayPal','Portefeuille international','international','["paypal"]','["EUR","USD"]', false, false, 7);

INSERT INTO public.billing_settings (key, value) VALUES
 ('general', '{"default_currency":"EUR","grace_days":3,"trial_days":0,"invoice_prefix":"SOL"}'::jsonb);

-- Seed localized prices
INSERT INTO public.plan_prices (plan_id, region, currency, amount) VALUES
 ('free','international','EUR',0), ('free','international','USD',0), ('free','international','CAD',0),
 ('free','africa','XOF',0), ('free','africa','XAF',0),
 ('pro','international','EUR',19), ('pro','international','USD',19), ('pro','international','CAD',26),
 ('pro','africa','XOF',12900), ('pro','africa','XAF',12900),
 ('business','international','EUR',49), ('business','international','USD',49), ('business','international','CAD',68),
 ('business','africa','XOF',29900), ('business','africa','XAF',29900);
