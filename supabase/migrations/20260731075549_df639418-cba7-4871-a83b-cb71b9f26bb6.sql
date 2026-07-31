-- 1. Crédits : nouveau socle gratuit à 5
ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 5;
UPDATE public.profiles SET credits = 5 WHERE plan = 'free' AND credits > 5;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits_renew_at timestamptz;

-- 2. Offres
CREATE TABLE public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_monthly numeric NOT NULL DEFAULT 0,
  monthly_credits integer NOT NULL DEFAULT 0,
  tagline text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon;
GRANT SELECT ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans are public" ON public.plans FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER plans_set_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.plans (id, name, price_monthly, monthly_credits, tagline, features, sort_order) VALUES
  ('free', 'Free', 0, 5, 'Pour tester Solenya', '["5 crédits offerts","Génération de base","Export PDF avec filigrane optionnel","1 ebook mini"]'::jsonb, 1),
  ('pro', 'Pro', 19, 200, 'Pour les créateurs réguliers', '["200 crédits par mois","Couverture HD","Mise en page premium","Sans filigrane","Export DOCX"]'::jsonb, 2),
  ('business', 'Business', 49, 1000, 'Pour les équipes et agences', '["1000 crédits par mois","Génération prioritaire","Support prioritaire","Toutes les futures fonctions IA incluses"]'::jsonb, 3);

-- 3. Packs de crédits
CREATE TABLE public.credit_packs (
  id text PRIMARY KEY,
  name text NOT NULL,
  credits integer NOT NULL,
  price numeric NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_packs TO anon;
GRANT SELECT ON public.credit_packs TO authenticated;
GRANT ALL ON public.credit_packs TO service_role;
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit packs are public" ON public.credit_packs FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER credit_packs_set_updated_at BEFORE UPDATE ON public.credit_packs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.credit_packs (id, name, credits, price, sort_order) VALUES
  ('pack_50', 'Pack Découverte', 50, 9, 1),
  ('pack_200', 'Pack Créateur', 200, 29, 2),
  ('pack_600', 'Pack Studio', 600, 69, 3);

-- 4. Ebooks enrichis
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS subtitle text;
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS style text NOT NULL DEFAULT 'professionnel';
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS length text NOT NULL DEFAULT 'standard';
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS illustrations jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS published_at timestamptz;