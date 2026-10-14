-- Add optional linked savings account for goal progress (Sprint 2).
alter table public.goals
  add column if not exists linked_account_id text;

comment on column public.goals.linked_account_id is
  'Optional demo bank account id. When set, progress uses that account balance.';
