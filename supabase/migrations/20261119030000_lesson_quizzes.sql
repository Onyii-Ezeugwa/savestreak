create table if not exists public.lesson_quizzes (
  id text primary key,
  lesson_id text not null,
  topics text[] not null default '{}',
  pass_percent integer not null default 70
);

create table if not exists public.lesson_quiz_questions (
  id text primary key,
  quiz_id text not null references public.lesson_quizzes(id) on delete cascade,
  position integer not null,
  prompt text not null,
  choices jsonb not null,
  correct_index integer not null,
  explanation text not null,
  unique (quiz_id, position)
);

create table if not exists public.lesson_quiz_attempts (
  id uuid primary key,
  user_id uuid not null references public.app_users(id) on delete cascade,
  lesson_id text not null,
  quiz_id text not null references public.lesson_quizzes(id),
  score integer not null,
  total integer not null,
  passed boolean not null,
  answers jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists lesson_quiz_attempts_user_lesson_idx
  on public.lesson_quiz_attempts (user_id, lesson_id, created_at desc);

alter table public.lesson_quizzes enable row level security;
alter table public.lesson_quiz_questions enable row level security;
alter table public.lesson_quiz_attempts enable row level security;

revoke all on table public.lesson_quizzes from anon, authenticated;
revoke all on table public.lesson_quiz_questions from anon, authenticated;
revoke all on table public.lesson_quiz_attempts from anon, authenticated;
