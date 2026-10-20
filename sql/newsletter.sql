-- NEWSLETTER: run this once in the Supabase SQL editor (paste the SQL itself, not the file name). It is safe to run more than once.
--
-- WHAT IT DOES: makes three tables.
--   newsletter_subscribers  each person who asked for the newsletter: their email, whether they have confirmed, a private link code for confirming and unsubscribing,
--                           the exact words they agreed to, and when. People who unsubscribe STAY in the table, marked unsubscribed, so nobody who left is ever emailed again.
--   newsletter_issues       each newsletter you write: the subject, the words, and whether it is a draft, being sent, or sent.
--   newsletter_sends        one row for each person each newsletter goes to, so nobody is sent the same newsletter twice, and a send that stops (Resend's daily limit,
--                           say) carries on from where it stopped.
--
-- WHO CAN SEE IT: nobody on the website. Each table has row level security on and NO policies, so a visitor cannot read or change it, even with the public key.
-- Only the website's server (through its private key) can, and you can read it in the Supabase Table Editor.
--
-- TO UNDO IT at any time, run the DROP lines at the very bottom. Nothing else depends on these tables.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 3 and 254 and email = lower(email)),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed')),
  token text not null unique check (token ~ '^[a-f0-9]{48}$'),
  consent_text text not null,
  source text not null default 'site' check (source in ('site', 'ebook')),
  created_at timestamptz not null default now(),
  confirmation_sent_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz
);

create table if not exists public.newsletter_issues (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (char_length(subject) between 1 and 150),
  body text not null check (char_length(body) between 1 and 20000),
  status text not null default 'draft' check (status in ('draft', 'sending', 'sent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_started_at timestamptz,
  sent_at timestamptz,
  total integer not null default 0,
  sent integer not null default 0,
  failed integer not null default 0
);

create table if not exists public.newsletter_sends (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.newsletter_issues (id) on delete cascade,
  subscriber_id uuid not null references public.newsletter_subscribers (id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  error text,
  claimed_at timestamptz,
  sent_at timestamptz,
  unique (issue_id, subscriber_id)
);
create index if not exists newsletter_sends_issue_status on public.newsletter_sends (issue_id, status);

alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_issues enable row level security;
alter table public.newsletter_sends enable row level security;
revoke all on public.newsletter_subscribers from anon, authenticated;
revoke all on public.newsletter_issues from anon, authenticated;
revoke all on public.newsletter_sends from anon, authenticated;

-- Only the SERVER's key (service_role) reads and writes these, and a table made in the SQL editor gives that key no permission until it is granted.
grant select, insert, update, delete on public.newsletter_subscribers to service_role;
grant select, insert, update, delete on public.newsletter_issues to service_role;
grant select, insert, update, delete on public.newsletter_sends to service_role;

-- To confirm it worked, run this. It should list 3 tables with row level security on, and 0 policies (that is right: no visitor can touch them):
--   select tablename, rowsecurity from pg_tables where tablename like 'newsletter_%';
--   select count(*) from pg_policies where tablename like 'newsletter_%';

-- TO UNDO (run these lines if you ever need to):
--   drop table if exists public.newsletter_sends;
--   drop table if exists public.newsletter_issues;
--   drop table if exists public.newsletter_subscribers;
