-- SUGGEST AND VOTE: run this once in the Supabase SQL editor. It is safe to run more than once.
--
-- WHAT IT DOES: it makes the tables behind the "suggest and vote" box on the Story Ledger page (what to audit next) and, later, the Book Club page
-- (what to read next): the two on/off switches, the suggestions, and the votes.
--
-- WHO CAN DO WHAT:
--   * Everyone can see which spaces are switched on, and the suggestions you have approved, with how many votes each has.
--   * A Book Club member (or you) can suggest something (it starts as "pending": only they and you can see it until you approve it), at most 3 a day,
--     and only while that space is switched on. They can vote once for each approved suggestion, and take the vote back. This is the same on both spaces:
--     suggesting and voting are for Book Club members only (Gill's decision, 21 October 2026). Everyone else can still see what has been suggested and the totals.
--   * Only the account with the email below can switch a space on or off, approve, hide, choose or delete a suggestion. The same rule as your
--     doors, products and posts.
--   * Who voted for what is private: the website only ever sees the totals (the suggestion_tally view), plus each person's own votes.
--
-- BEFORE YOU RUN IT: check the email below is the one you sign in with, the same one as in doors.sql.
-- It also needs sql/book-details.sql to have been run first: that makes the function is_book_club_member(), which the suggest and vote rules below call.
-- Both spaces start SWITCHED OFF, so nothing appears on any page until you turn it on in Admin, Suggestions.
-- To undo it at any time, run the lines at the very bottom. Nothing else depends on these tables.

create table if not exists public.suggestion_spaces (
  space text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.suggestion_spaces (space, enabled) values ('story-ledger', false), ('book-club', false) on conflict (space) do nothing;

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  space text not null references public.suggestion_spaces (space),
  kind text not null check (kind in ('show', 'stat', 'book')),
  title text not null check (char_length(btrim(title)) between 2 and 120),
  why text check (why is null or char_length(why) <= 300),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden', 'chosen')),
  created_at timestamptz not null default now(),
  check ((space = 'story-ledger' and kind in ('show', 'stat')) or (space = 'book-club' and kind = 'book'))
);
create index if not exists suggestions_space_status on public.suggestions (space, status);

create table if not exists public.suggestion_votes (
  suggestion_id uuid not null references public.suggestions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (suggestion_id, user_id)
);

-- The totals, and nothing else: a view that counts the votes for each suggestion without showing who cast them.
create or replace view public.suggestion_tally as
  select suggestion_id, count(*)::int as votes from public.suggestion_votes group by suggestion_id;

alter table public.suggestion_spaces enable row level security;
alter table public.suggestions enable row level security;
alter table public.suggestion_votes enable row level security;

-- the switches
drop policy if exists "anyone can see which spaces are on" on public.suggestion_spaces;
drop policy if exists "only the owner changes the switches" on public.suggestion_spaces;
create policy "anyone can see which spaces are on" on public.suggestion_spaces for select to anon, authenticated using (true);
create policy "only the owner changes the switches" on public.suggestion_spaces for all to authenticated
  using (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com')
  with check (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');

-- the suggestions
drop policy if exists "see approved suggestions, your own, and (as owner) all" on public.suggestions;
drop policy if exists "signed-in people suggest, three a day, while the space is on" on public.suggestions; -- the old name, from before suggesting was for Book Club members only
drop policy if exists "Book Club members suggest, three a day, while the space is on" on public.suggestions;
drop policy if exists "only the owner changes suggestions" on public.suggestions;
drop policy if exists "only the owner deletes suggestions" on public.suggestions;
create policy "see approved suggestions, your own, and (as owner) all" on public.suggestions for select to anon, authenticated
  using (status in ('approved', 'chosen') or user_id = auth.uid() or lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');
create policy "Book Club members suggest, three a day, while the space is on" on public.suggestions for insert to authenticated
  with check (
    public.is_book_club_member()
    and user_id = auth.uid()
    and status = 'pending'
    and exists (select 1 from public.suggestion_spaces s where s.space = suggestions.space and s.enabled)
    and (select count(*) from public.suggestions x where x.user_id = auth.uid() and x.created_at > now() - interval '1 day') < 3
  );
create policy "only the owner changes suggestions" on public.suggestions for update to authenticated
  using (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com')
  with check (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');
create policy "only the owner deletes suggestions" on public.suggestions for delete to authenticated
  using (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');

-- the votes
drop policy if exists "see your own votes" on public.suggestion_votes;
drop policy if exists "vote for an approved suggestion in a space that is on" on public.suggestion_votes; -- the old name, from before voting was for Book Club members only
drop policy if exists "Book Club members vote for an approved suggestion in a space that is on" on public.suggestion_votes;
drop policy if exists "take your own vote back" on public.suggestion_votes;
create policy "see your own votes" on public.suggestion_votes for select to authenticated
  using (user_id = auth.uid() or lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');
create policy "Book Club members vote for an approved suggestion in a space that is on" on public.suggestion_votes for insert to authenticated
  with check (
    public.is_book_club_member()
    and user_id = auth.uid()
    and exists (
      select 1 from public.suggestions g join public.suggestion_spaces s on s.space = g.space
      where g.id = suggestion_votes.suggestion_id and g.status in ('approved', 'chosen') and s.enabled
    )
  );
create policy "take your own vote back" on public.suggestion_votes for delete to authenticated using (user_id = auth.uid());

-- what each kind of person may touch (the policies above are the real lock; these just let the website use the tables)
grant select on public.suggestion_spaces, public.suggestions, public.suggestion_tally to anon, authenticated;
grant insert, update, delete on public.suggestion_spaces, public.suggestions to authenticated;
grant select, insert, delete on public.suggestion_votes to authenticated;

-- To confirm it worked, run this. It should list 9 rows:
--   select tablename, policyname, cmd from pg_policies where tablename like 'suggestion%' order by tablename, policyname;

-- TO UNDO (run these lines if you ever need to):
--   drop view if exists public.suggestion_tally;
--   drop table if exists public.suggestion_votes;
--   drop table if exists public.suggestions;
--   drop table if exists public.suggestion_spaces;
