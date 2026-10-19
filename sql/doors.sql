-- DOORS: run this once in the Supabase SQL editor. It is safe to run more than once.
--
-- WHAT IT DOES: it makes a small table that remembers which closed doors in the illustrated rooms are open to visitors.
-- A door with no row, or a row that says closed, is closed. So if anything ever goes wrong reading this table, every door stays closed.
--
-- WHO CAN DO WHAT: everyone can read it (the website needs to know which doors to show as open). Only the account with the email below
-- can open or close a door, the same rule as your products, posts and photos.
--
-- PERMISSIONS: a table made in the SQL editor cannot be read by the website until it is granted permission, however good its rules are. The two grant lines near
-- the end do that (visitors can read; only a signed-in account can write, and the rules above then limit that to you). Without them the Open a door page says
-- "I could not read the doors".
--
-- BEFORE YOU RUN IT: check the email below is the one you sign in with, the same one as in lock-editing-to-owner.sql.
-- To undo it at any time, run the DROP lines at the very bottom. Nothing else depends on this table.

create table if not exists public.doors (
  room text not null,
  door text not null,
  open boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (room, door)
);

alter table public.doors enable row level security;

drop policy if exists "anyone can see which doors are open" on public.doors;
create policy "anyone can see which doors are open" on public.doors for select to anon, authenticated using (true);

drop policy if exists "only the owner opens doors" on public.doors;
drop policy if exists "only the owner changes doors" on public.doors;
drop policy if exists "only the owner deletes doors" on public.doors;
create policy "only the owner opens doors" on public.doors for insert to authenticated
  with check (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');
create policy "only the owner changes doors" on public.doors for update to authenticated
  using (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com')
  with check (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');
create policy "only the owner deletes doors" on public.doors for delete to authenticated
  using (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');

grant select on public.doors to anon, authenticated;
grant insert, update, delete on public.doors to authenticated;

-- To confirm it worked, run this. It should list 4 rows:
--   select policyname, cmd from pg_policies where tablename = 'doors' order by policyname;
-- And this should show SELECT for both anon and authenticated:
--   select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'doors' order by grantee, privilege_type;

-- TO UNDO (run these lines if you ever need to):
--   drop table if exists public.doors;
