-- EMAIL REQUESTS: run this once in the Supabase SQL editor (paste the SQL itself, not the file name). It is safe to run more than once.
--
-- WHAT IT DOES: makes one small table, email_requests, for people who ask for ONE thing by email, such as the free ebook, WITHOUT joining the newsletter.
--   One row for each email address and each purpose (for example 'ebook'). It holds the email, the purpose, whether they have confirmed, a private link code for the confirm email,
--   the exact words they were shown, whether they also ticked the OPTIONAL newsletter box (and the words next to that box), and the dates.
--   Ticking the newsletter box does not put anyone on the newsletter list until they press the confirm link. Only then does the server add them to newsletter_subscribers.
--   A request that is never confirmed is deleted after 30 days by the daily tidy-up.
--
-- WHO CAN SEE IT: nobody on the website. Row level security is on and there are NO policies, so a visitor cannot read or change it, even with the public key.
-- Only the website's server (through its private key) can, and you can read it in the Supabase Table Editor.
--
-- TO UNDO IT at any time, run the DROP line at the very bottom. Nothing else depends on this table.

create table if not exists public.email_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254 and email = lower(email)),
  purpose text not null check (purpose ~ '^[a-z0-9:-]{2,60}$'),
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  token text not null unique check (token ~ '^[a-f0-9]{48}$'),
  consent_text text not null,
  wants_newsletter boolean not null default false,
  newsletter_text text,
  created_at timestamptz not null default now(),
  confirmation_sent_at timestamptz,
  confirmed_at timestamptz,
  unique (email, purpose)
);

alter table public.email_requests enable row level security;
revoke all on public.email_requests from anon, authenticated;

-- Only the SERVER's key (service_role) reads and writes this, and a table made in the SQL editor gives that key no permission until it is granted.
grant select, insert, update, delete on public.email_requests to service_role;

-- To confirm it worked, run these. The first should show email_requests with row level security on (true), and the second should show 0 (no policies is right: no visitor can touch it):
--   select tablename, rowsecurity from pg_tables where tablename = 'email_requests';
--   select count(*) from pg_policies where tablename = 'email_requests';

-- TO UNDO (run this line if you ever need to):
--   drop table if exists public.email_requests;
