-- Starscapes Factory: Explorer's Bay travel details on posts.
-- Paste all of this into Supabase > SQL Editor and click Run. Safe to run again. It adds three empty columns and changes nothing else.
--
-- country       the two-letter country code in capitals (for example GB, JP). Empty on every post that is not about one place.
-- year_visited  the year Gill visited, four digits. One year for each post.
-- advice_url    the official government travel advice page for that country, a secure address starting with https://
--
-- Row-level security is left as it is: published posts are readable by everyone, drafts only by Gill. These columns follow the post.

alter table public.posts add column if not exists country text;
alter table public.posts add column if not exists year_visited integer;
alter table public.posts add column if not exists advice_url text;

alter table public.posts drop constraint if exists posts_country_check;
alter table public.posts add constraint posts_country_check check (country is null or country ~ '^[A-Z]{2}$');

alter table public.posts drop constraint if exists posts_year_visited_check;
alter table public.posts add constraint posts_year_visited_check check (year_visited is null or (year_visited >= 1950 and year_visited <= 2100));

alter table public.posts drop constraint if exists posts_advice_url_check;
alter table public.posts add constraint posts_advice_url_check check (advice_url is null or advice_url ~ '^https://[^[:space:]]+$');

-- To look at it afterwards (should list the three columns):
--   select column_name from information_schema.columns where table_name = 'posts' and column_name in ('country', 'year_visited', 'advice_url');
-- To undo it (nothing else depends on them):
--   alter table public.posts drop column country, drop column year_visited, drop column advice_url;
