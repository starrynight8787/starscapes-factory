-- ROOM PICTURES (home page featured room): run this once in the Supabase SQL editor. It is safe to run more than once.
--
-- WHAT IT DOES: lets the home page's settings table hold a picture address for each room (the keys room_picture_art-loft and so on), so you can choose your
-- own picture for the featured room box in Admin > Home page. The picture files go in the same storage as your post pictures.
-- Nothing else changes: only you can change settings, and everyone can read them, exactly as before.
--
-- TO UNDO: delete from public.site_settings where key like 'room_picture_%'; then put the old rules back (see sql/home.sql).

alter table public.site_settings drop constraint if exists site_settings_key_check;
alter table public.site_settings add constraint site_settings_key_check check (key = 'featured_room' or key = 'youtube_intro' or key ~ '^room_picture_[a-z-]{1,40}$');
alter table public.site_settings drop constraint if exists site_settings_value_check;
alter table public.site_settings add constraint site_settings_value_check check (char_length(value) between 1 and 600);
