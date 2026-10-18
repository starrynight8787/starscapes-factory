-- HOME PAGE: run this once in the Supabase SQL editor. It is safe to run more than once.
--
-- WHAT IT DOES: it makes two small tables behind the new home page. "events" holds the events you add (the home page shows the next one, and says "No event
-- planned yet" when there isn't one). "site_settings" holds which room is the featured room.
--
-- WHO CAN DO WHAT: everyone can read both (the home page shows them; a hidden event is only visible to you). Only the account with the email below can add,
-- change or delete anything, the same rule as your doors, books and posts.
--
-- BEFORE YOU RUN IT: check the email below is the one you sign in with.
-- To undo it at any time, run the DROP lines at the very bottom. Nothing else depends on these tables.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  starts_at timestamptz not null,
  description text check (description is null or char_length(description) <= 300),
  link_url text check (link_url is null or link_url ~ '^https://'),
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key check (key in ('featured_room')),
  value text not null check (char_length(value) between 1 and 60),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "anyone can see published events" on public.events;
drop policy if exists "only the owner changes events" on public.events;
create policy "anyone can see published events" on public.events for select to anon, authenticated
  using (published or lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');
create policy "only the owner changes events" on public.events for all to authenticated
  using (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com')
  with check (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');

drop policy if exists "anyone can see the site settings" on public.site_settings;
drop policy if exists "only the owner changes the site settings" on public.site_settings;
create policy "anyone can see the site settings" on public.site_settings for select to anon, authenticated using (true);
create policy "only the owner changes the site settings" on public.site_settings for all to authenticated
  using (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com')
  with check (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');

grant select on public.events, public.site_settings to anon, authenticated;
grant insert, update, delete on public.events, public.site_settings to authenticated;

-- To confirm it worked, run this. It should list 4 rows:
--   select tablename, policyname, cmd from pg_policies where tablename in ('events', 'site_settings') order by tablename, policyname;

-- TO UNDO (run these lines if you ever need to):
--   drop table if exists public.events;
--   drop table if exists public.site_settings;
