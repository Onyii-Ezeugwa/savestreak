create table if not exists public.challenge_participations (
  id uuid primary key,
  user_id uuid not null references public.app_users(id) on delete cascade,
  week_start date not null,
  challenge_id text not null,
  joined_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'completed', 'missed')),
  progress_cents integer not null default 0,
  measured boolean not null default false,
  closed_at timestamptz,
  unique (user_id, week_start, challenge_id)
);

create index if not exists challenge_participations_user_idx
  on public.challenge_participations (user_id, week_start desc);

alter table public.challenge_participations enable row level security;
revoke all on table public.challenge_participations from anon, authenticated;
