create table if not exists public.lesson_saves (
  user_id uuid not null references public.app_users(id) on delete cascade,
  lesson_id text not null references public.lessons(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.lesson_saves enable row level security;

revoke all on table public.lesson_saves from anon, authenticated;
