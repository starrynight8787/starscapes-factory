-- Extra columns for the two short customer notices ("we have received your payment" and "we could not accept your order, you have been refunded") and for when a refund
-- was recorded. Run this once in Supabase (SQL editor), then press Run.
-- Safe to run again: it does nothing for anything already there.
-- (The grant you ran for the orders table already covers new columns, so nothing else is needed.)
-- Without it, the notices still go; only the note of what happened is lost.
alter table public.orders add column if not exists notice_kind text;           -- 'received' or 'refused': the last notice sent
alter table public.orders add column if not exists notice_status text;         -- 'sent', 'failed' or 'not_sent'
alter table public.orders add column if not exists notice_note text;           -- why it did not go, in plain words
alter table public.orders add column if not exists notice_sent_at timestamptz; -- when it went
alter table public.orders add column if not exists refunded_at timestamptz;    -- when you said an order was cancelled and refunded
