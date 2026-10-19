-- MEMBERSHIPS: run this once in the Supabase SQL editor (paste the SQL itself, not the file name). It is safe to run more than once.
--
-- WHAT IT DOES: makes the two tables memberships need.
--   memberships       one row per member: which passes they hold, how they pay, when it renews, whether it is cancelled. The PAYMENT SERVER writes it (when Stripe says
--                     someone paid, changed or cancelled); a member can only READ their own row. Nobody can write it from a browser.
--   founding_members  the early supporters. A founder can see their own row and choose whether their name is shown on the Founders' wall (and what name). Everyone can read
--                     the NAMES of founders who ticked "show my name", and nothing else about them (not even who they are).
--
-- PERMISSIONS: a table made in the SQL editor cannot be read by the website until it is granted permission, however good its rules are. The grant lines below do that.
-- They are deliberately narrow: members get read-only access to their own row; the names on the wall are readable by anyone, one column only.
--
-- TO UNDO (run these lines if you ever need to):
--   drop table if exists public.founding_members;
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.memberships enable row level security;

drop policy if exists "see your own membership" on public.memberships;
create policy "see your own membership" on public.memberships for select to authenticated using (user_id = auth.uid());

grant select on public.memberships to authenticated;

create table if not exists public.founding_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  show_name boolean not null default false,
  created_at timestamptz not null default now(),
  check (not show_name or (display_name is not null and length(btrim(display_name)) > 0))
);

alter table public.founding_members enable row level security;

drop policy if exists "see your own founding status" on public.founding_members;
drop policy if exists "anyone can see the names on the wall" on public.founding_members;
drop policy if exists "choose whether your name shows" on public.founding_members;
create policy "see your own founding status" on public.founding_members for select to authenticated using (user_id = auth.uid());
create policy "anyone can see the names on the wall" on public.founding_members for select to anon, authenticated using (show_name = true);
create policy "choose whether your name shows" on public.founding_members for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select (display_name, show_name, created_at) on public.founding_members to anon, authenticated;
grant update (display_name, show_name) on public.founding_members to authenticated;

-- To confirm it worked, run these. The first should list 4 rows, the second should show SELECT for authenticated on memberships:
--   select tablename, policyname, cmd from pg_policies where tablename in ('memberships', 'founding_members') order by tablename, policyname;
--   select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'memberships' order by grantee, privilege_type;
