-- Sprint 2: demo bank connections and sandbox account balances.
create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  bank_id text not null,
  bank_name text not null,
  bank_city text not null default '',
  bank_state text not null default '',
  connected_at timestamptz not null default now(),
  last_refreshed_at timestamptz not null default now(),
  unique (user_id, bank_id)
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.bank_connections(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  external_id text not null,
  name text not null,
  account_type text not null check (
    account_type in ('checking', 'savings', 'investment', 'credit', 'loan')
  ),
  balance_cents integer not null default 0,
  currency text not null default 'USD',
  last_updated_at timestamptz not null default now(),
  unique (connection_id, external_id)
);

create index if not exists bank_connections_user_id_idx
  on public.bank_connections (user_id);
create index if not exists bank_accounts_user_id_idx
  on public.bank_accounts (user_id);
create index if not exists bank_accounts_connection_id_idx
  on public.bank_accounts (connection_id);

alter table public.bank_connections enable row level security;
alter table public.bank_accounts enable row level security;

revoke all on table public.bank_connections from anon, authenticated;
revoke all on table public.bank_accounts from anon, authenticated;
