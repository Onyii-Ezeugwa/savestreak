create table if not exists public.password_resets (
  id uuid primary key,
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_resets_user_id_idx
  on public.password_resets (user_id);

alter table public.password_resets enable row level security;

revoke all on table public.password_resets from anon, authenticated;
