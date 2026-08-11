INSERT INTO public.payment_providers (id, name, description, region, methods, currencies, enabled, mode, configured, sort_order)
VALUES ('xpaye', 'XPaye Africa', 'Mobile Money et cartes en Afrique (XPaye)', 'africa',
  '["mtn_momo","orange_money","moov_money","wave","visa","mastercard"]'::jsonb,
  '["XOF","XAF"]'::jsonb, false, 'test', false, 2)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, methods = EXCLUDED.methods, currencies = EXCLUDED.currencies;