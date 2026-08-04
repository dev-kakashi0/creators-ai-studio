INSERT INTO public.credit_costs (key, label, description, credits, sort_order)
VALUES ('ebook_trial', 'Ebook essai (3 chapitres)', 'Format découverte inclus dans le plan gratuit, filigrane Solenya conservé', 5, 25)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description;