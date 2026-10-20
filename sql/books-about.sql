-- WHAT THE BOOK IS ABOUT (Book Club, "Reading now"): run this once in the Supabase SQL editor (paste the SQL itself, not the file name). It is safe to run more than once.
--
-- WHAT IT DOES: adds one optional column, "about", to the books table: a few lines (up to 1,000 letters) about what a book is about. You write it in Admin, Books ("What the book is about"),
-- and the Book Club page shows it under the book you are reading now. Nothing else changes: the existing permissions already cover it (everyone can read the books; only the owner's account can change them).
--
-- THE SITE KEEPS WORKING IF YOU INSTALL BEFORE RUNNING THIS: the Book Club page then simply shows no description, and saving a description in Admin says plainly that this step is needed first.
--
-- TO UNDO (this deletes every description): alter table public.books drop column if exists about;

alter table public.books add column if not exists about text check (about is null or char_length(about) <= 1000);

-- To confirm it worked, run this. It should return one row:
--   select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'books' and column_name = 'about';
