-- BOOK CLUB TRACKER: run this once in the Supabase SQL editor. It is safe to run more than once.
--
-- WHAT IT DOES: it makes the two small tables behind the Book Club page: the books (what you are reading, have read, or will read next, with your rating
-- and a link to your review), and your reading goal and theme for each year.
--
-- WHO CAN DO WHAT: everyone can read both tables (the page shows them). Only the account with the email below can add, change or delete anything,
-- the same rule as your doors, products and posts.
--
-- BEFORE YOU RUN IT: check the email below is the one you sign in with, the same one as in doors.sql.
-- To undo it at any time, run the DROP lines at the very bottom. Nothing else depends on these tables.

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 150),
  author text check (author is null or char_length(author) <= 100),
  genre text check (genre is null or genre in ('leadership', 'fiction', 'memoir', 'self-growth', 'childrens', 'business', 'creativity', 'productivity', 'parenting', 'mindset', 'biography', 'fantasy', 'mystery', 'thriller', 'romance', 'sci-fi', 'historical-fiction', 'classics', 'picture-books', 'history', 'poetry', 'translated')),
  status text not null default 'read' check (status in ('reading', 'read', 'upnext')),
  started date,
  finished date,
  rating smallint check (rating is null or rating between 1 and 5),
  cover_url text check (cover_url is null or cover_url ~ '^https://'),
  review_post_id text check (review_post_id is null or review_post_id ~ '^[A-Za-z0-9-]{1,64}$'),
  note text check (note is null or char_length(note) <= 300),
  about text check (about is null or char_length(about) <= 1000),
  created_at timestamptz not null default now(),
  check (status <> 'read' or finished is not null)
);

create table if not exists public.reading_goals (
  year int primary key check (year between 2000 and 2100),
  goal int check (goal is null or goal between 1 and 999),
  theme text check (theme is null or char_length(theme) <= 120),
  updated_at timestamptz not null default now()
);

alter table public.books enable row level security;
alter table public.reading_goals enable row level security;

drop policy if exists "anyone can see the books" on public.books;
drop policy if exists "only the owner changes the books" on public.books;
create policy "anyone can see the books" on public.books for select to anon, authenticated using (true);
create policy "only the owner changes the books" on public.books for all to authenticated
  using (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com')
  with check (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');

drop policy if exists "anyone can see the reading goals" on public.reading_goals;
drop policy if exists "only the owner changes the reading goals" on public.reading_goals;
create policy "anyone can see the reading goals" on public.reading_goals for select to anon, authenticated using (true);
create policy "only the owner changes the reading goals" on public.reading_goals for all to authenticated
  using (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com')
  with check (lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');

grant select on public.books, public.reading_goals to anon, authenticated;
grant insert, update, delete on public.books, public.reading_goals to authenticated;

-- To confirm it worked, run this. It should list 4 rows:
--   select tablename, policyname, cmd from pg_policies where tablename in ('books', 'reading_goals') order by tablename, policyname;

-- TO UNDO (run these lines if you ever need to):
--   drop table if exists public.books;
--   drop table if exists public.reading_goals;
