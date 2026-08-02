-- ROLES
create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "own roles select" on public.user_roles
for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

revoke execute on function public.has_role(uuid, app_role) from public, anon;
grant execute on function public.has_role(uuid, app_role) to authenticated, service_role;

create policy "admins manage roles" on public.user_roles
for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- CREDIT COSTS (admin configurable)
create table public.credit_costs (
  key text primary key,
  label text not null,
  description text,
  credits integer not null default 1 check (credits >= 0 and credits <= 1000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.credit_costs to anon, authenticated;
grant all on public.credit_costs to service_role;

alter table public.credit_costs enable row level security;

create policy "credit costs are public" on public.credit_costs
for select to anon, authenticated using (true);

create policy "admins update credit costs" on public.credit_costs
for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "admins insert credit costs" on public.credit_costs
for insert to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create trigger credit_costs_updated_at before update on public.credit_costs
for each row execute function public.set_updated_at();

insert into public.credit_costs (key, label, description, credits, sort_order) values
  ('outline', 'Plan d''ebook', 'Génération du plan complet', 1, 10),
  ('chapter', 'Chapitre', 'Génération ou régénération d''un chapitre', 2, 20),
  ('ebook_standard', 'Ebook complet (20-50 pages)', 'Génération complète standard', 10, 30),
  ('ebook_premium', 'Ebook premium (100+ pages)', 'Génération complète premium', 20, 40),
  ('cover', 'Couverture', 'Génération ou régénération de la couverture', 2, 50),
  ('illustration', 'Illustration', 'Génération ou régénération d''une illustration', 1, 60),
  ('marketing_pack', 'Pack marketing IA', 'Page de vente + posts sociaux + séquence email', 5, 70),
  ('copy', 'Outil de copywriting', 'Un texte marketing généré', 1, 80);

-- CREDIT TRANSACTIONS enrichment
alter table public.credit_transactions
  add column if not exists kind text not null default 'usage',
  add column if not exists balance_after integer;

create policy "admins read all credit tx" on public.credit_transactions
for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- credits: consume by action key, resolved server-side
create or replace function public.consume_credits_for(_user_id uuid, _amount integer, _reason text)
returns integer language plpgsql security definer set search_path = public as $$
DECLARE remaining INTEGER;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 1000 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

  UPDATE public.profiles SET credits = credits - _amount
  WHERE id = _user_id AND credits >= _amount
  RETURNING credits INTO remaining;

  IF remaining IS NULL THEN RAISE EXCEPTION 'INSUFFICIENT_CREDITS'; END IF;

  INSERT INTO public.credit_transactions (user_id, amount, reason, kind, balance_after)
  VALUES (_user_id, -_amount, left(coalesce(_reason, 'usage'), 100), 'usage', remaining);

  RETURN remaining;
END; $$;

revoke execute on function public.consume_credits_for(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.consume_credits_for(uuid, integer, text) to service_role;

-- add credits (purchase / renewal / bonus)
create or replace function public.add_credits_for(_user_id uuid, _amount integer, _reason text, _kind text)
returns integer language plpgsql security definer set search_path = public as $$
DECLARE remaining INTEGER;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 100000 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

  UPDATE public.profiles SET credits = credits + _amount
  WHERE id = _user_id RETURNING credits INTO remaining;

  IF remaining IS NULL THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;

  INSERT INTO public.credit_transactions (user_id, amount, reason, kind, balance_after)
  VALUES (_user_id, _amount, left(coalesce(_reason, 'credit'), 100), coalesce(_kind, 'purchase'), remaining);

  RETURN remaining;
END; $$;

revoke execute on function public.add_credits_for(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.add_credits_for(uuid, integer, text, text) to service_role;

-- PLANS + PACKS refresh
delete from public.credit_packs;
insert into public.credit_packs (id, name, credits, price, sort_order) values
  ('pack_100', '100 crédits', 100, 9.99, 10),
  ('pack_250', '250 crédits', 250, 19.99, 20),
  ('pack_500', '500 crédits', 500, 34.99, 30),
  ('pack_1000', '1000 crédits', 1000, 59.99, 40);

delete from public.plans;
insert into public.plans (id, name, price_monthly, monthly_credits, tagline, features, sort_order) values
  ('free', 'Free', 0, 5, 'Pour tester la création d''ebooks IA', '["5 crédits","Export PDF","5 projets maximum","Marque Solenya","Éditeur basique"]'::jsonb, 10),
  ('pro', 'Pro', 19, 200, 'Pour les créateurs qui publient régulièrement', '["200 crédits chaque mois","Export PDF","Export DOCX","Projets illimités","Templates de livres premium","Couvertures IA HD","Mise en page premium","Sans marque Solenya","Éditeur avancé","Outils marketing IA"]'::jsonb, 20),
  ('business', 'Business', 49, 1000, 'Pour les équipes et gros volumes', '["1000 crédits chaque mois","Export PDF","Export DOCX","Projets illimités","Génération prioritaire","File d''attente prioritaire","Templates premium","Suite marketing IA","Prêt pour l''API","Fonctions équipe (à venir)","Support prioritaire"]'::jsonb, 30);