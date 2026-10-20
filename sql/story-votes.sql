-- STORY VOTES ("Let's write a story", step two): run this once in the Supabase SQL editor (paste the SQL itself, not the file name). It is safe to run more than once.
-- Run it AFTER sql/stories.sql (which you have already run).
--
-- WHAT IT DOES
--   1. story_votes: one row for each vote ("after chapter 10, what happens next?"), with the question and when it closes. A story can have one vote after each chapter.
--   2. story_vote_options: the choices in a vote (A, B, C ...), two to six of them. Anyone can read the question and the choices.
--   3. story_ballots: each member's vote. ONE per member per vote. A member may change it until the vote closes.
--
-- WHO MAY DO WHAT
--   * Anyone may read a vote and its choices. Only the OWNER (the email in the lines marked OWNER) may create, change or delete a vote.
--   * Only someone who HOLDS the Come Write With Me pass may vote, only while the vote is open, and only for one of that vote's own choices, and only as themselves.
--     (The pass counts while the membership is active, trialing or past_due, like everywhere else.)
--   * Nobody can read anybody else's ballot, not even the owner. The only way to see the numbers is the function vote_results, which hands them over ONLY when the vote has closed,
--     or the person asking has voted in it themselves, or it is the owner.
--
-- A table made in the SQL editor cannot be read by the website until it is granted permission, so the grant lines are part of this file.
--
-- TO UNDO (this deletes all votes and ballots):
--   drop table if exists public.story_ballots;
--   drop table if exists public.story_vote_options cascade;
--   drop table if exists public.story_votes cascade;
--   drop function if exists public.vote_results(uuid);
--   drop function if exists public.can_cast_vote(uuid);
--   drop function if exists public.holds_story_pass();

create table if not exists public.story_votes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  after_chapter integer not null check (after_chapter between 1 and 200),
  question text not null default 'What happens next?' check (char_length(btrim(question)) between 1 and 120),
  closes_at timestamptz not null,
  chosen_option_id uuid,
  created_at timestamptz not null default now(),
  unique (story_id, after_chapter)
);

create table if not exists public.story_vote_options (
  id uuid primary key default gen_random_uuid(),
  vote_id uuid not null references public.story_votes (id) on delete cascade,
  position integer not null check (position between 1 and 6),
  label text not null check (char_length(btrim(label)) between 1 and 160),
  unique (vote_id, position),
  unique (vote_id, id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'story_votes_chosen_fk') then
    alter table public.story_votes add constraint story_votes_chosen_fk foreign key (chosen_option_id) references public.story_vote_options (id) on delete set null;
  end if;
end $$;

create table if not exists public.story_ballots (
  vote_id uuid not null references public.story_votes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  option_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (vote_id, user_id),
  foreign key (vote_id, option_id) references public.story_vote_options (vote_id, id) on delete cascade
);

-- Does the person asking hold the Come Write With Me pass?
create or replace function public.holds_story_pass()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.status in ('active', 'trialing', 'past_due')
      and 'come-write-with-me' = any (m.passes)
  );
$$;

-- May the person asking cast (or change) a vote in this vote right now? Signed in, holding the pass, and the vote still open.
create or replace function public.can_cast_vote(p_vote_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and public.holds_story_pass()
    and exists (select 1 from public.story_votes v where v.id = p_vote_id and v.closes_at > now());
$$;

-- The numbers: how many votes each choice has. Handed over only when the vote has closed, or the person asking has voted in it, or it is the owner. Otherwise: nothing.
create or replace function public.vote_results(p_vote_id uuid)
returns table (option_id uuid, votes integer)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, (select count(*)::integer from public.story_ballots b where b.option_id = o.id)
  from public.story_vote_options o
  join public.story_votes v on v.id = o.vote_id
  where o.vote_id = p_vote_id
    and (
      v.closes_at <= now()
      or exists (select 1 from public.story_ballots mine where mine.vote_id = p_vote_id and mine.user_id = auth.uid())
      or lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com' -- OWNER
    )
  order by o.position;
$$;

revoke all on function public.holds_story_pass() from public;
revoke all on function public.can_cast_vote(uuid) from public;
revoke all on function public.vote_results(uuid) from public;
grant execute on function public.holds_story_pass() to anon, authenticated, service_role;
grant execute on function public.can_cast_vote(uuid) to anon, authenticated, service_role;
grant execute on function public.vote_results(uuid) to anon, authenticated, service_role;

alter table public.story_votes enable row level security;
alter table public.story_vote_options enable row level security;
alter table public.story_ballots enable row level security;

drop policy if exists "anyone can read votes" on public.story_votes;
drop policy if exists "the owner adds votes" on public.story_votes;
drop policy if exists "the owner changes votes" on public.story_votes;
drop policy if exists "the owner removes votes" on public.story_votes;
drop policy if exists "anyone can read vote choices" on public.story_vote_options;
drop policy if exists "the owner adds vote choices" on public.story_vote_options;
drop policy if exists "the owner changes vote choices" on public.story_vote_options;
drop policy if exists "the owner removes vote choices" on public.story_vote_options;
drop policy if exists "read your own ballot" on public.story_ballots;
drop policy if exists "cast your own ballot" on public.story_ballots;
drop policy if exists "change your own ballot" on public.story_ballots;

create policy "anyone can read votes" on public.story_votes for select to anon, authenticated using (true);
create policy "the owner adds votes" on public.story_votes for insert to authenticated with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com'); -- OWNER
create policy "the owner changes votes" on public.story_votes for update to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com') -- OWNER
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com');
create policy "the owner removes votes" on public.story_votes for delete to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com'); -- OWNER

create policy "anyone can read vote choices" on public.story_vote_options for select to anon, authenticated using (true);
create policy "the owner adds vote choices" on public.story_vote_options for insert to authenticated with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com'); -- OWNER
create policy "the owner changes vote choices" on public.story_vote_options for update to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com') -- OWNER
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com');
create policy "the owner removes vote choices" on public.story_vote_options for delete to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com'); -- OWNER

-- A ballot can only be read by the person who cast it. Everyone else's is out of reach, so the only numbers anyone sees are the ones vote_results chooses to hand over.
create policy "read your own ballot" on public.story_ballots for select to authenticated using (user_id = auth.uid());
create policy "cast your own ballot" on public.story_ballots for insert to authenticated with check (user_id = auth.uid() and public.can_cast_vote(vote_id));
create policy "change your own ballot" on public.story_ballots for update to authenticated
  using (user_id = auth.uid() and public.can_cast_vote(vote_id))
  with check (user_id = auth.uid() and public.can_cast_vote(vote_id));

grant select on public.story_votes, public.story_vote_options to anon, authenticated;
grant insert, update, delete on public.story_votes, public.story_vote_options to authenticated;
grant select, insert, update on public.story_ballots to authenticated;
grant select, insert, update, delete on public.story_votes, public.story_vote_options, public.story_ballots to service_role;

-- To confirm it worked, run these. The first should list 11 policies; the second should return 3 functions:
--   select tablename, policyname from pg_policies where tablename in ('story_votes', 'story_vote_options', 'story_ballots') order by tablename, policyname;
--   select proname, prosecdef from pg_proc where proname in ('holds_story_pass', 'can_cast_vote', 'vote_results') order by proname;
