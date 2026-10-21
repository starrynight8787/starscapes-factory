-- MEMBERSHIPS: run this once in the Supabase SQL editor (paste the SQL itself, not the file name). It is safe to run more than once.
--
-- WHAT IT DOES: makes the table memberships need.
--   memberships       one row per member: which passes they hold, how they pay, when it renews, whether it is cancelled. The PAYMENT SERVER writes it (when Stripe says
--                     someone paid, changed or cancelled); a member can only READ their own row. Nobody can write it from a browser.
--
-- PERMISSIONS: a table made in the SQL editor cannot be read by the website until it is granted permission, however good its rules are. The grant lines below do that.
-- They are deliberately narrow: members get read-only access to their own row, and only the server's own key may write.
--
-- TO UNDO (run these lines if you ever need to):
--   drop table if exists public.memberships;

create table if not exists public.memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'incomplete' check (status in ('incomplete', 'active', 'trialing', 'past_due', 'unpaid', 'canceled')),
  passes text[] not null default '{}',
  billing_interval text check (billing_interval in ('month', 'year')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  offer_ends_at timestamptz,
  consent_at timestamptz,
  consent_text text,
  offer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- the record of what the customer agreed to at checkout (the tick box wording, and when). Added separately too, so running this file again on a table made earlier adds them.
alter table public.memberships add column if not exists consent_at timestamptz;
alter table public.memberships add column if not exists consent_text text;
-- what a promo code gave this member ("20% off for 3 months"), so My passes can say so. Empty for the launch offer, which has its own date (offer_ends_at).
alter table public.memberships add column if not exists offer_note text;

alter table public.memberships enable row level security;

drop policy if exists "see your own membership" on public.memberships;
create policy "see your own membership" on public.memberships for select to authenticated using (user_id = auth.uid());

grant select on public.memberships to authenticated;
-- The SERVER's key (service_role) writes memberships (when Stripe says someone paid, changed or cancelled) and reads them (to stop a second purchase). Without this line the site cannot even
-- check whether a person already holds passes. A table made in the SQL editor gives that key no permission until it is granted.
grant select, insert, update, delete on public.memberships to service_role;

-- RETIRED 21 October 2026: there is no Founding members tier, so the founding_members table (made for a Founders' wall) is gone. If your database still has it, this line removes it
-- (it held no real data). It is safe to run when the table is not there.
drop table if exists public.founding_members;

-- To confirm it worked, run these. The first should list 1 row, the second should show SELECT for authenticated on memberships:
--   select tablename, policyname, cmd from pg_policies where tablename = 'memberships' order by policyname;
--   select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'memberships' order by grantee, privilege_type;
