alter table public.goal_changes
  add column if not exists note text;

create table if not exists public.goal_suggestions (
  id uuid primary key,
  user_id uuid not null references public.app_users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  kind text not null check (kind in ('weekly', 'date', 'amount')),
  title text not null,
  detail text not null,
  effect text not null,
  weekly_cents integer not null check (weekly_cents > 0),
  target_amount_cents integer,
  target_date date,
  status text not null default 'open' check (status in ('open', 'accepted', 'dismissed')),
  basis text not null,
  created_at timestamptz not null default now()
);

create index if not exists goal_suggestions_goal_idx
  on public.goal_suggestions (goal_id, user_id, created_at);

alter table public.goal_suggestions enable row level security;
revoke all on table public.goal_suggestions from anon, authenticated;
