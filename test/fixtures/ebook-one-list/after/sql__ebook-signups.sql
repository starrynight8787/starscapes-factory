-- RETIRED on 21 October 2026: the free ebook now joins the NEWSLETTER list (newsletter_subscribers, sql/newsletter.sql, source 'ebook'), so this table is no longer used by the site.
-- It had no sign-ups in it. It is safe to leave, or to remove with:  drop table public.ebook_signups;
-- FREE EBOOK SIGN-UPS: run this once in the Supabase SQL editor. It is safe to run more than once.
--
-- WHAT IT DOES: it makes the table that keeps each email address that signed up for the free ebook, with the exact words they agreed to and when.
--
-- WHO CAN SEE IT: nobody on the website. The table has row level security on and NO policies, so a visitor cannot read it or change it, even with the
-- public key. Only the website's server (through its private key) can add a row, and you can read the list in the Supabase Table Editor.
--
-- To undo it at any time, run the DROP line at the very bottom. Nothing else depends on this table.

create table if not exists public.ebook_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 3 and 254 and email = lower(email)),
  consent_text text not null,
  created_at timestamptz not null default now()
);
alter table public.ebook_signups enable row level security;
revoke all on public.ebook_signups from anon, authenticated;

-- Only the SERVER's key (service_role) reads and writes sign-ups, and a table made in the SQL editor gives that key no permission until it is granted.
grant select, insert, update, delete on public.ebook_signups to service_role;

-- To confirm it worked, run this. It should list 0 policies (that is right: no visitor can touch the table):
--   select count(*) from pg_policies where tablename = 'ebook_signups';

-- TO UNDO (run this line if you ever need to):
--   drop table if exists public.ebook_signups;
