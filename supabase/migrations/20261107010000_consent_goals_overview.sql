alter table public.consents
  add column if not exists sent_at timestamptz,
  add column if not exists expires_at timestamptz;

update public.consents
set sent_at = created_at
where sent_at is null;

update public.consents
set expires_at = created_at + interval '7 days'
where expires_at is null;

alter table public.goals
  add column if not exists plan_stale boolean not null default false;

alter table public.balance_snapshots
  add column if not exists assets_cents integer,
  add column if not exists debts_cents integer,
  add column if not exists net_worth_cents integer;

create table if not exists public.consent_resends (
  id uuid primary key,
  user_id uuid not null references public.app_users(id) on delete cascade,
  consent_id uuid not null references public.consents(id) on delete cascade,
  guardian_email text not null,
  sent_at timestamptz not null default now()
);

create index if not exists consent_resends_user_sent_idx
  on public.consent_resends (user_id, sent_at);

create table if not exists public.goal_changes (
  id uuid primary key,
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  old_target_amount_cents integer not null,
  new_target_amount_cents integer not null,
  old_target_date date not null,
  new_target_date date not null,
  changed_at timestamptz not null default now()
);

create index if not exists goal_changes_user_id_idx
  on public.goal_changes (user_id, changed_at desc);

alter table public.consent_resends enable row level security;
alter table public.goal_changes enable row level security;

revoke all on table public.consent_resends from anon, authenticated;
revoke all on table public.goal_changes from anon, authenticated;
