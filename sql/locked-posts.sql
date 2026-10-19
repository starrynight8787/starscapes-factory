-- LOCKED POSTS: run this once in the Supabase SQL editor (paste the SQL itself, not the file name). It is safe to run more than once, and NOTHING on the site changes until you choose a pass on a post.
--
-- WHAT IT DOES
--   1. Adds a "pass" column to your posts, so a post can say which pass it belongs to (empty means free for everyone).
--   2. Makes a table, post_bodies, where the WORDS of a locked post are kept. The words of a locked post are NOT kept in the posts table, because anyone can read that table. The database
--      itself decides who may read a row of post_bodies, so it cannot be got round by the website: you (the owner), anyone who HOLDS that post's pass, and anyone at all for the FIRST THREE
--      published posts of each pass (the three oldest). Everyone else gets nothing back.
--   3. One function, can_read_post_body, holds that rule in a single place.
--
-- WHO HOLDS A PASS: a membership whose status is active, trialing or past_due (while Stripe retries a failed payment, passes stay open; they close when the membership is unpaid or ended) and whose
-- passes list includes the post's pass. A membership set to end keeps its passes until the end of what was paid for (its status stays active until then).
--
-- The owner is the email in the line marked OWNER below (the same one the doors file uses).
--
-- PERMISSIONS: a table made in the SQL editor cannot be read by the website until it is granted permission, however good its rules are. The grant lines below do that: anyone may ASK for a post's words
-- (the rules then decide), only the owner may write them, and the server's own key has full access.
--
-- TO UNDO (run these lines if you ever need to; first put any locked posts' words back into their posts, using Edit post and choosing "Free for everyone"):
--   drop table if exists public.post_bodies;
--   drop function if exists public.can_read_post_body(uuid);
--   alter table public.posts drop column if exists pass;

alter table public.posts add column if not exists pass text;

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
        -- the first three published posts of this pass are free to read
        or p.id in (
          select f.id from public.posts f
          where f.pass = p.pass and f.published
          order by f.created_at asc, f.id asc
          limit 3
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

create table if not exists public.post_bodies (
  post_id uuid primary key references public.posts (id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.post_bodies enable row level security;

drop policy if exists "read the words of a post if you may" on public.post_bodies;
drop policy if exists "the owner adds words" on public.post_bodies;
drop policy if exists "the owner changes words" on public.post_bodies;
drop policy if exists "the owner removes words" on public.post_bodies;

create policy "read the words of a post if you may" on public.post_bodies for select to anon, authenticated using (public.can_read_post_body(post_id));
create policy "the owner adds words" on public.post_bodies for insert to authenticated with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com');
create policy "the owner changes words" on public.post_bodies for update to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com');
create policy "the owner removes words" on public.post_bodies for delete to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com');

grant select on public.post_bodies to anon, authenticated;
grant insert, update, delete on public.post_bodies to authenticated;
grant select, insert, update, delete on public.post_bodies to service_role;

-- To confirm it worked, run these. The first should list 4 policies; the second should return one row naming the function:
--   select policyname, cmd from pg_policies where tablename = 'post_bodies' order by policyname;
--   select proname, prosecdef from pg_proc where proname = 'can_read_post_body';
