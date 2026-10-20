-- RENEWAL REMINDERS: run this once in the Supabase SQL editor (paste the SQL itself, not the file name). It is safe to run more than once.
--
-- WHAT IT DOES: makes one small table, membership_notices: a note of each reminder email the daily job sends a member ("your passes renew on ..." or "the price changes on ..."), written down BEFORE the
-- email is sent. It is how the site makes sure a member never gets two reminders for the same renewal date, however many times the job runs, and how it knows when it last reminded a monthly member.
-- Each note holds: who (the account), which kind, the renewal date it was about, the amount and the last amount, whether it was sent, and the time. It holds no email address.
--
-- WHO CAN SEE IT: only the site's own server (and you, in Supabase). No visitor and no signed-in member can read or change it, not even their own notes: there are deliberately no policies for them.
-- A note goes if the account goes (on delete cascade), like a member's other records.
--
-- TO UNDO (this deletes every note, so a member could be reminded again): drop table if exists public.membership_notices;

create table if not exists public.membership_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('renewal', 'price-change')),
  period_end timestamptz not null,
  amount_pence integer check (amount_pence is null or amount_pence >= 0),
  previous_pence integer check (previous_pence is null or previous_pence >= 0),
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  note text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (user_id, period_end)
);

alter table public.membership_notices enable row level security;

-- A table made in the SQL editor cannot be read by the site's server until it is granted permission: only the server (service_role) gets any.
grant select, insert, update, delete on public.membership_notices to service_role;

-- To confirm it worked, run this. It should return one row with rowsecurity = true:
--   select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = 'membership_notices';
