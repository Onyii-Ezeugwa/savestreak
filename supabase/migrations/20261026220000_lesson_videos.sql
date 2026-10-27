alter table public.lessons
  add column if not exists youtube_url text not null default '',
  add column if not exists youtube_label text not null default '',
  add column if not exists context_key text not null default '';
