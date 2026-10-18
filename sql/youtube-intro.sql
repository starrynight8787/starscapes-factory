-- YOUTUBE INTRO VIDEO: run this once in the Supabase SQL editor, AFTER sql/home.sql. It is safe to run more than once.
--
-- WHAT IT DOES: the site_settings table (made by home.sql) only allowed one setting, the featured room. This lets it hold a second one: the YouTube video you want
-- pinned at the top of the YouTube Series page. Nothing else changes: everyone can still read the settings, and only the owner's account can change them.
--
-- To undo it, run the line at the very bottom.

alter table public.site_settings drop constraint if exists site_settings_key_check;
alter table public.site_settings add constraint site_settings_key_check check (key in ('featured_room', 'youtube_intro'));

-- To confirm it worked, run this. It should show both keys in the definition:
--   select pg_get_constraintdef(oid) from pg_constraint where conname = 'site_settings_key_check';

-- TO UNDO (this puts it back to the featured room only; delete any youtube_intro row first):
--   delete from public.site_settings where key = 'youtube_intro';
--   alter table public.site_settings drop constraint if exists site_settings_key_check;
--   alter table public.site_settings add constraint site_settings_key_check check (key in ('featured_room'));
