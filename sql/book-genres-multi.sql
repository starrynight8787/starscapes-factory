-- BOOKS IN MORE THAN ONE GENRE: run once in the Supabase SQL editor. Safe to run more than once.
-- (Already run on the project on 21 October 2026.)
-- WHAT IT DOES: adds two new genres (Thriller, which used to share a shelf with Mystery, and Translated Literature), and lets a book have up to three genres.
-- The old "genre" column stays and holds the book's first (main) genre, so older pages keep working; the new "genres" column holds the whole list.
-- Every book you already have keeps its genre: it is copied into its list.
-- TO UNDO: alter table public.books drop column genres;

alter table public.books drop constraint if exists books_genre_check;
alter table public.books add constraint books_genre_check check (genre is null or genre in ('leadership', 'fiction', 'memoir', 'young-adult', 'childrens', 'business', 'creativity', 'productivity', 'parenting', 'mindset', 'biography', 'fantasy', 'mystery', 'thriller', 'romance', 'sci-fi', 'historical-fiction', 'classics', 'picture-books', 'history', 'poetry', 'translated'));

alter table public.books add column if not exists genres text[] not null default '{}';
update public.books set genres = array[genre] where genre is not null and cardinality(genres) = 0;

alter table public.books drop constraint if exists books_genres_check;
alter table public.books add constraint books_genres_check check (cardinality(genres) <= 3 and genres <@ array['leadership', 'fiction', 'memoir', 'young-adult', 'childrens', 'business', 'creativity', 'productivity', 'parenting', 'mindset', 'biography', 'fantasy', 'mystery', 'thriller', 'romance', 'sci-fi', 'historical-fiction', 'classics', 'picture-books', 'history', 'poetry', 'translated']::text[]);
