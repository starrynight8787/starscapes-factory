-- POST READS: counts how many times each published post has been opened, so Archive Entries can show "Most read". Safe to run more than once.
-- Everyone can see the counts; nobody can edit them directly. Only the function record_post_read adds one, and only for a published post.
-- (Already run on the project on 20 October 2026.) TO UNDO: drop function public.record_post_read(uuid); drop table public.post_reads;

create table if not exists public.post_reads (
  post_id uuid primary key references public.posts(id) on delete cascade,
  reads bigint not null default 0
);
alter table public.post_reads enable row level security;
drop policy if exists "Anyone can see read counts" on public.post_reads;
create policy "Anyone can see read counts" on public.post_reads for select using (true);
-- The rule above says WHO may see a row; this line gives the website's visitors (anon) and signed-in people permission to read the table at all. Without it the "Most read" counts cannot load
-- (a table made in the SQL editor is not readable by the website until this is granted). Added 20 October 2026; run it on a project that already has the table:
--   grant select on public.post_reads to anon, authenticated;
grant select on public.post_reads to anon, authenticated;

create or replace function public.record_post_read(p_id uuid)
returns void language sql security definer set search_path = public as $fn$
  insert into public.post_reads (post_id, reads)
  select p.id, 1 from public.posts p where p.id = p_id and p.published = true
  on conflict (post_id) do update set reads = public.post_reads.reads + 1;
$fn$;
revoke all on function public.record_post_read(uuid) from public;
grant execute on function public.record_post_read(uuid) to anon, authenticated;
