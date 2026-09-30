alter table public.app_users drop column if exists password_hash;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_users_auth_user_fkey'
  ) then
    alter table public.app_users
      add constraint app_users_auth_user_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;
