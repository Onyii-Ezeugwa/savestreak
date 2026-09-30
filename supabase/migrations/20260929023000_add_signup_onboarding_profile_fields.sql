alter table public.app_users
  add column if not exists last_name text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists street_address text not null default '',
  add column if not exists city text not null default '',
  add column if not exists state text not null default '',
  add column if not exists postal_code text not null default '',
  add column if not exists school_id text not null default '',
  add column if not exists school_name text not null default '',
  add column if not exists school_city text not null default '',
  add column if not exists school_state text not null default '',
  add column if not exists school_kind text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'app_users_school_kind_check'
  ) then
    alter table public.app_users
      add constraint app_users_school_kind_check
      check (school_kind in ('', 'k12', 'college'));
  end if;
end $$;
