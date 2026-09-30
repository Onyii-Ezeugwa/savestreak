create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  first_name text not null,
  last_name text not null default '',
  date_of_birth date not null,
  age_group text not null check (age_group in ('adult', 'minor')),
  status text not null check (status in ('pending_consent', 'active', 'restricted')),
  phone text not null default '',
  street_address text not null default '',
  city text not null default '',
  state text not null default '',
  postal_code text not null default '',
  school_id text not null default '',
  school_name text not null default '',
  school_city text not null default '',
  school_state text not null default '',
  school_kind text not null default '' check (school_kind in ('', 'k12', 'college')),
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

-- App access is server-only via the service role, which bypasses RLS.
-- Keep RLS on and revoke Data API roles so anon keys cannot read these tables.
revoke all on table public.app_users from anon, authenticated;
revoke all on table public.consents from anon, authenticated;
revoke all on table public.goals from anon, authenticated;
