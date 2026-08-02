create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  chapters_allowed integer not null default 0,
  chapters_used integer not null default 0,
  illustrations_allowed integer not null default 0,
  illustrations_used integer not null default 0,
  covers_allowed integer not null default 0,
  covers_used integer not null default 0,
  outline_allowed integer not null default 1,
  outline_used integer not null default 0,
  expires_at timestamptz not null default now() + interval '3 hours',
  created_at timestamptz not null default now()
);

grant all on public.generation_jobs to service_role;

alter table public.generation_jobs enable row level security;

create policy "no client access to generation jobs" on public.generation_jobs
for all to anon, authenticated using (false) with check (false);

create index generation_jobs_user_idx on public.generation_jobs (user_id, created_at desc);