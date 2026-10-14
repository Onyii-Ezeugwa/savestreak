-- Store a saved AI savings plan on each goal.
alter table public.goals
  add column if not exists saved_plan jsonb,
  add column if not exists saved_plan_at timestamptz;
