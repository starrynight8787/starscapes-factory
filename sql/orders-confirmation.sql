-- Extra columns for the customer's confirmation email. Run this once in Supabase (SQL editor), then press Run.
-- Safe to run again: it does nothing for anything already there.
-- (The grant you ran for the orders table already covers new columns, so nothing else is needed.)
alter table public.orders add column if not exists confirmation_status text;        -- 'sent', 'failed' or 'not_sent'
alter table public.orders add column if not exists confirmation_note text;          -- why it did not go, in plain words
alter table public.orders add column if not exists confirmation_sent_at timestamptz; -- when it went
