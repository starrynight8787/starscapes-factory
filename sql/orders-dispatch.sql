-- Extra columns for the "your order has been posted" email. Run this once in Supabase (SQL editor), then press Run.
-- Safe to run again: it does nothing for anything already there.
alter table public.orders add column if not exists dispatch_status text;        -- 'sent', 'failed' or 'not_sent'
alter table public.orders add column if not exists dispatch_note text;          -- why it did not go, in plain words
alter table public.orders add column if not exists dispatch_sent_at timestamptz; -- when it went
alter table public.orders add column if not exists tracking_url text;           -- the tracking link you gave, if any
alter table public.orders add column if not exists tracking_number text;        -- the tracking number you gave, if any
