-- Store institution website domain for logo resolution.
alter table public.bank_connections
  add column if not exists domain text;

create index if not exists bank_connections_domain_idx
  on public.bank_connections (domain);
