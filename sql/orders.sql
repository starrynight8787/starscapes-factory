-- Every payment the shop takes becomes one row here. Run this once in Supabase (SQL editor), then press Run.
-- Safe to run again: it does nothing if the table is already there.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  stripe_session_id text not null unique,   -- one payment, one row: a repeated message from Stripe can never make a second order
  stripe_payment_intent text,
  livemode boolean not null default false,  -- false = a test payment
  status text not null default 'paid',      -- test_not_sent | needs_attention | sent
  customer_name text,
  customer_email text,
  customer_phone text,
  shipping jsonb,                           -- the delivery name and address, as Stripe collected them
  amount_total integer,                     -- in pence
  currency text,
  items jsonb not null default '[]'::jsonb, -- what was bought
  creativehub_order_id text,
  creativehub_status text,
  note text
);
-- Row level security on, and NO policies: nobody using the public key can read or write orders.
-- Only your server (with the service key kept in Vercel) can.
alter table public.orders enable row level security;
