create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  first_name text not null,
  date_of_birth date not null,
  age_group text not null check (age_group in ('adult', 'minor')),
  status text not null check (status in ('pending_consent', 'active', 'restricted')),
  created_at timestamptz not null default now()
);

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  guardian_email text not null,
  token text unique not null,
  decision text not null check (decision in ('pending', 'approved', 'declined')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  name text not null,
  target_amount_cents integer not null,
  current_amount_cents integer not null default 0,
  target_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consents_user_id_idx on public.consents (user_id);
create index if not exists goals_user_id_idx on public.goals (user_id);

alter table public.app_users enable row level security;
alter table public.consents enable row level security;
alter table public.goals enable row level security;

revoke all on table public.app_users from anon, authenticated;
revoke all on table public.consents from anon, authenticated;
revoke all on table public.goals from anon, authenticated;
