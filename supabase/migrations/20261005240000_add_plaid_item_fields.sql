-- Plaid-shaped Item fields on bank connections.
alter table public.bank_connections
  add column if not exists item_id text,
  add column if not exists access_token text,
  add column if not exists institution_id text;

create unique index if not exists bank_connections_item_id_uidx
  on public.bank_connections (item_id)
  where item_id is not null;

create index if not exists bank_connections_institution_id_idx
  on public.bank_connections (institution_id);
