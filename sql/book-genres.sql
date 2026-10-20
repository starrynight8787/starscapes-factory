-- MORE BOOK GENRES: run once in the Supabase SQL editor. Safe to run more than once.
-- The books table only accepts the genres it knows; this widens the list to match the site.
alter table public.books drop constraint if exists books_genre_check;
alter table public.books add constraint books_genre_check check (genre is null or genre in ('leadership', 'fiction', 'memoir', 'self-growth', 'childrens', 'business', 'creativity', 'productivity', 'parenting', 'mindset', 'biography', 'fantasy', 'mystery', 'romance', 'sci-fi', 'historical-fiction', 'classics', 'picture-books', 'history', 'poetry'));
