-- STORIES ("Let's write a story"): run this once in the Supabase SQL editor (paste the SQL itself, not the file name). It is safe to run more than once.
-- Run it AFTER sql/locked-posts.sql (which you have already run). Do NOT run locked-posts.sql again afterwards: it would put the old rule back.
--
-- WHAT IT DOES
--   1. stories: one row for each story (its title, the first lines, a picture, whether it is still running or finished).
--   2. story_chapters: links a POST to a story as chapter 1, 2, 3 and so on. A chapter is an ordinary post, written in New post, with its pass set to Come Write With Me, so its words are protected
--      exactly like any other post for a pass.
--   3. Replaces the rule that decides who may read a locked post's words (can_read_post_body) so that EVERY STORY has its own free chapters 1 to 3. Chapters 4 and on need the Come Write With Me pass.
--      Posts of a pass that are not story chapters keep the old rule (the first three published posts of that pass are free), and chapters no longer use up those free places.
--
-- Anyone may READ the stories and which post is which chapter (titles and dates are public anyway); only the owner may change them. The owner is the email in the lines marked OWNER.
-- A table made in the SQL editor cannot be read by the website until it is granted permission, so the grant lines are part of this file.
--
-- TO UNDO: first set every chapter's post back to Free for everyone (Edit post), then run these lines, then run sql/locked-posts.sql again to put the old rule back:
--   drop table if exists public.story_chapters;
--   drop table if exists public.stories;

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  teaser text check (teaser is null or char_length(teaser) <= 300),
  picture_url text check (picture_url is null or picture_url ~ '^https://'),
  status text not null default 'running' check (status in ('running', 'completed')),
  finished_on date,
  created_at timestamptz not null default now(),
  check (status <> 'completed' or finished_on is not null)
);

create table if not exists public.story_chapters (
  story_id uuid not null references public.stories (id) on delete cascade,
  number integer not null check (number between 1 and 200),
  post_id uuid not null unique references public.posts (id) on delete cascade,
  primary key (story_id, number)
);

alter table public.stories enable row level security;
alter table public.story_chapters enable row level security;

drop policy if exists "anyone can read stories" on public.stories;
drop policy if exists "the owner adds stories" on public.stories;
drop policy if exists "the owner changes stories" on public.stories;
drop policy if exists "the owner removes stories" on public.stories;
drop policy if exists "anyone can read chapters" on public.story_chapters;
drop policy if exists "the owner adds chapters" on public.story_chapters;
drop policy if exists "the owner changes chapters" on public.story_chapters;
drop policy if exists "the owner removes chapters" on public.story_chapters;

create policy "anyone can read stories" on public.stories for select to anon, authenticated using (true);
create policy "the owner adds stories" on public.stories for insert to authenticated with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com'); -- OWNER
create policy "the owner changes stories" on public.stories for update to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com') -- OWNER
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com');
create policy "the owner removes stories" on public.stories for delete to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com'); -- OWNER

create policy "anyone can read chapters" on public.story_chapters for select to anon, authenticated using (true);
create policy "the owner adds chapters" on public.story_chapters for insert to authenticated with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com'); -- OWNER
create policy "the owner changes chapters" on public.story_chapters for update to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com') -- OWNER
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com');
create policy "the owner removes chapters" on public.story_chapters for delete to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com'); -- OWNER

grant select on public.stories, public.story_chapters to anon, authenticated;
grant insert, update, delete on public.stories, public.story_chapters to authenticated;
grant select, insert, update, delete on public.stories, public.story_chapters to service_role;

-- The rule for who may read a locked post's words, now knowing about story chapters.
create or replace function public.can_read_post_body(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and p.pass is not null
      and (
        -- OWNER
        lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com'
        -- chapters 1 to 3 of every story are free to read
        or exists (select 1 from public.story_chapters c where c.post_id = p.id and c.number <= 3)
        -- any other post of a pass: the first three published posts of that pass are free (story chapters have their own rule above, and are not counted here)
        or (
          not exists (select 1 from public.story_chapters c where c.post_id = p.id)
          and p.id in (
            select f.id from public.posts f
            where f.pass = p.pass and f.published
              and not exists (select 1 from public.story_chapters c2 where c2.post_id = f.id)
            order by f.created_at asc, f.id asc
            limit 3
          )
        )
        -- someone who holds this pass
        or exists (
          select 1 from public.memberships m
          where m.user_id = auth.uid()
            and m.status in ('active', 'trialing', 'past_due')
            and p.pass = any (m.passes)
        )
      )
  );
$$;

revoke all on function public.can_read_post_body(uuid) from public;
grant execute on function public.can_read_post_body(uuid) to anon, authenticated, service_role;

-- To confirm it worked, run these. The first should list 8 policies; the second should show the function now mentions story_chapters:
--   select tablename, policyname from pg_policies where tablename in ('stories', 'story_chapters') order by tablename, policyname;
--   select position('story_chapters' in prosrc) > 0 as knows_stories from pg_proc where proname = 'can_read_post_body';
