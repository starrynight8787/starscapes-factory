-- Extra columns for sending orders to Creative Hub. Run this once in Supabase (SQL editor), then press Run.
-- Safe to run again: it does nothing for anything already there.
alter table public.orders add column if not exists creativehub_order_number text;      -- the number Creative Hub gives the order
alter table public.orders add column if not exists creativehub_due text;               -- when Creative Hub expects to finish it (as they give it)
alter table public.orders add column if not exists creativehub_checked_at timestamptz; -- when its progress was last asked for
alter table public.orders add column if not exists sent_at timestamptz;                -- when it was sent

-- One Creative Hub order can belong to only one order in the shop. This is a second safety against the same order being
-- linked twice, whatever the code does.
create unique index if not exists orders_creativehub_order_id_unique
  on public.orders (creativehub_order_id)
  where creativehub_order_id is not null;
