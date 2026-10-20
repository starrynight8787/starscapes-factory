-- INSTAGRAM TOKEN: where the site keeps the access code that lets it read the latest pictures of @gill_bennet for the Photography page. Safe to run more than once.
-- Nobody can read or change this table from the website (row security is on and there are no rules); only the site's server can, with its secret key.
-- (The table was already created on 20 October 2026.) To connect Instagram, run the INSERT below ONCE with your own token (see the steps in the chat), in the Supabase SQL editor.
-- TO UNDO: drop table public.instagram_token;

create table if not exists public.instagram_token (
  id int primary key check (id = 1),
  token text not null,
  refreshed_at timestamptz not null default now()
);
alter table public.instagram_token enable row level security;

-- insert into public.instagram_token (id, token) values (1, 'PASTE-YOUR-TOKEN-HERE')
--   on conflict (id) do update set token = excluded.token, refreshed_at = now();
