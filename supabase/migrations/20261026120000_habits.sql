create table if not exists public.statement_transactions (
  id uuid primary key,
  user_id uuid not null references public.app_users(id) on delete cascade,
  merchant text not null,
  purchase_date date not null,
  amount_cents integer not null check (amount_cents > 0),
  category text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.balance_snapshots (
  id uuid primary key,
  user_id uuid not null references public.app_users(id) on delete cascade,
  captured_at timestamptz not null,
  savings_cents integer not null
);

create table if not exists public.streak_weeks (
  user_id uuid not null references public.app_users(id) on delete cascade,
  week_start date not null,
  increased boolean not null,
  start_cents integer not null,
  end_cents integer not null,
  primary key (user_id, week_start)
);

create table if not exists public.savings_streaks (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id text primary key,
  title text not null,
  body text not null,
  takeaway text not null,
  topics text[] not null,
  minutes integer not null
);

create table if not exists public.lesson_reads (
  user_id uuid not null references public.app_users(id) on delete cascade,
  lesson_id text not null references public.lessons(id),
  read_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.user_badges (
  user_id uuid not null references public.app_users(id) on delete cascade,
  badge_id text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table if not exists public.weekly_summaries (
  id uuid primary key,
  user_id uuid not null references public.app_users(id) on delete cascade,
  week_start date not null,
  spending_cents integer not null,
  previous_spending_cents integer,
  top_categories jsonb not null,
  goal_note text not null,
  streak_note text not null,
  tip text not null,
  body text not null,
  had_activity boolean not null,
  source text not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists statement_transactions_user_id_idx
  on public.statement_transactions (user_id, purchase_date);
create index if not exists balance_snapshots_user_id_idx
  on public.balance_snapshots (user_id, captured_at);
create index if not exists weekly_summaries_user_id_idx
  on public.weekly_summaries (user_id, week_start desc);

alter table public.statement_transactions enable row level security;
alter table public.balance_snapshots enable row level security;
alter table public.streak_weeks enable row level security;
alter table public.savings_streaks enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_reads enable row level security;
alter table public.user_badges enable row level security;
alter table public.weekly_summaries enable row level security;

revoke all on table public.statement_transactions from anon, authenticated;
revoke all on table public.balance_snapshots from anon, authenticated;
revoke all on table public.streak_weeks from anon, authenticated;
revoke all on table public.savings_streaks from anon, authenticated;
revoke all on table public.lessons from anon, authenticated;
revoke all on table public.lesson_reads from anon, authenticated;
revoke all on table public.user_badges from anon, authenticated;
revoke all on table public.weekly_summaries from anon, authenticated;
