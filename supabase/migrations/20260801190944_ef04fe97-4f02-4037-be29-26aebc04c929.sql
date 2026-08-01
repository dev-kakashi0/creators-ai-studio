ALTER TABLE public.ebooks
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS author_bio text,
  ADD COLUMN IF NOT EXISTS author_photo text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS publisher text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'modern',
  ADD COLUMN IF NOT EXISTS quality text NOT NULL DEFAULT 'premium',
  ADD COLUMN IF NOT EXISTS branding jsonb NOT NULL DEFAULT '{}'::jsonb;