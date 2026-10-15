-- ORIGINAL PAINTINGS: run this once in the Supabase SQL editor (Database -> SQL editor -> New query -> paste -> Run).
-- It is safe to run more than once. It only ADDS columns; nothing is removed or changed.
--
-- An original lives in the same products table as the prints, marked fulfilment = 'hand' (you send it yourself).

alter table public.products
  add column if not exists status    text not null default 'available',
  add column if not exists sold_at   timestamptz,
  add column if not exists medium    text,
  add column if not exists width_cm  numeric,
  add column if not exists height_cm numeric,
  add column if not exists depth_cm  numeric,
  add column if not exists year      integer,
  add column if not exists framed    boolean;

-- A piece is either available or sold, nothing else
alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check check (status in ('available', 'sold'));

-- If an earlier check limited what "fulfilment" can say, make sure 'hand' is allowed
alter table public.products drop constraint if exists products_fulfilment_check;

-- To confirm it worked, this should list the new columns:
--   select column_name from information_schema.columns where table_name = 'products' and column_name in ('status','sold_at','medium','width_cm','height_cm','depth_cm','year','framed');
