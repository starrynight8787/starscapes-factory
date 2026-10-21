-- BOOK DETAIL PAGES (Book Club): run this once in the Supabase SQL editor (paste the SQL itself, not the file name). It is safe to run more than once.
--
-- WHAT IT DOES: adds the extra details a book's own page shows (year published, part of the year's theme, key characters, your full review, favourite quote,
-- and series details) to the books table, and makes a table for the comments on each book. Comments can be read and written only by Book Club members
-- (and by you, the owner). Everyone can still read the books themselves.
--
-- THE SITE KEEPS WORKING IF YOU INSTALL BEFORE RUNNING THIS: the book pages simply show the older details, and saving the new boxes in Admin says plainly that this step is needed first.
--
-- TO UNDO: drop table if exists public.book_comments; drop function if exists public.is_book_club_member();
--          alter table public.books drop column if exists year_published, drop column if exists theme_book, drop column if exists characters, drop column if exists review,
--          drop column if exists quote, drop column if exists quote_page, drop column if exists series_name, drop column if exists series_number, drop column if exists series_total;

alter table public.books add column if not exists year_published smallint check (year_published is null or year_published between 1000 and 2100);
alter table public.books add column if not exists theme_book boolean not null default false;
alter table public.books add column if not exists characters jsonb not null default '[]'::jsonb check (jsonb_typeof(characters) = 'array' and jsonb_array_length(characters) <= 12);
alter table public.books add column if not exists review text check (review is null or char_length(review) <= 6000);
alter table public.books add column if not exists quote text check (quote is null or char_length(quote) <= 600);
alter table public.books add column if not exists quote_page text check (quote_page is null or char_length(quote_page) <= 60);
alter table public.books add column if not exists series_name text check (series_name is null or char_length(series_name) <= 100);
alter table public.books add column if not exists series_number smallint check (series_number is null or series_number between 1 and 999);
alter table public.books add column if not exists series_total smallint check (series_total is null or series_total between 1 and 999);

-- Is the signed-in person a Book Club member (a Book Club pass that is active, in a trial, or past due while Stripe retries a failed payment: the same rule as every other pass; it ends when Stripe gives up and cancels) or the owner?
create or replace function public.is_book_club_member() returns boolean
language sql stable security definer set search_path = public as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'gillian@gillianbennet.com'
    or exists (select 1 from public.memberships m where m.user_id = auth.uid() and m.status in ('active', 'trialing', 'past_due') and 'book-club' = any (m.passes));
$$;
revoke all on function public.is_book_club_member() from public;
grant execute on function public.is_book_club_member() to authenticated;

create table if not exists public.book_comments (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null check (char_length(btrim(author_name)) between 1 and 60),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists book_comments_book_idx on public.book_comments (book_id, created_at);
alter table public.book_comments enable row level security;

drop policy if exists "members read book comments" on public.book_comments;
drop policy if exists "members add book comments" on public.book_comments;
drop policy if exists "remove your own book comment" on public.book_comments;
create policy "members read book comments" on public.book_comments for select to authenticated using (public.is_book_club_member());
create policy "members add book comments" on public.book_comments for insert to authenticated with check (user_id = auth.uid() and public.is_book_club_member());
create policy "remove your own book comment" on public.book_comments for delete to authenticated
  using (user_id = auth.uid() or lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');

grant select, insert, delete on public.book_comments to authenticated;

-- To confirm it worked, run this. It should list 3 rows:
--   select policyname, cmd from pg_policies where tablename = 'book_comments';
