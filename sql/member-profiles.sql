-- MEMBER PROFILES: run this once in the Supabase SQL editor (paste the SQL itself, not the file name). Safe to run more than once.
--
-- WHAT IT DOES: gives each signed-in person a small profile for the "My passes" page: their name, a username (shown beside their comments), an icon for the
-- message board, and what email they want (free updates, news about their passes only, or none).
--
-- WHO CAN SEE IT: nobody can read or change the table directly, even with the public key. The page talks to it only through three small functions, and each one
-- can only see or change the signed-in person's OWN row.
--   get_my_profile()          their profile (and their login email); for someone with no profile yet, it works out the newsletter setting from the newsletter list.
--   save_my_profile(...)      checks and saves it. A username must be 3 to 20 letters, numbers or underscores, and unique (capitals do not count: Gill and gill are the same).
--   username_available(text)  true if nobody else has that username.
-- Changing the login email: the page asks Supabase to send a link to the new address (it changes once they press it). Next time they open My passes, get_my_profile moves their
-- newsletter sign-up to the new address.
-- Saving the email choice also updates the newsletter list: "Free updates" adds them as confirmed (they are signed in with a checked email); "News about my passes only"
-- and "No emails" take them off the general newsletter, so the general newsletter never goes to them.
--
-- TO UNDO IT at any time, run the DROP lines at the very bottom.

create table if not exists public.member_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text check (name is null or char_length(name) <= 80),
  username text check (username is null or username ~ '^[A-Za-z0-9_]{3,20}$'),
  icon text check (icon is null or icon in (
    'art-loft', 'drafting-desk', 'explorers-bay', 'factory-floor', 'idea-hatchery', 'knowledge-nook', 'leadership-lounge', 'sarah-jrs-den',
    'comet', 'crescent-moon', 'planets', 'starry-sky', 'cogs', 'hanging-lamp', 'starburst', 'book-stack')),
  newsletter text not null default 'none' check (newsletter in ('free', 'passes', 'none')),
  newsletter_email text, -- the email their newsletter choice was last saved under; if they change their login email, the newsletter list is moved across next time they open My passes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.member_profiles add column if not exists newsletter_email text; -- for a table made by an earlier version of this file
create unique index if not exists member_profiles_username_key on public.member_profiles (lower(username));

alter table public.member_profiles enable row level security;
revoke all on public.member_profiles from anon, authenticated;

create or replace function public.get_my_profile() returns json
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid(); r public.member_profiles; em text; sub text;
begin
  if uid is null then return null; end if;
  select email into em from auth.users where id = uid;
  select * into r from public.member_profiles where user_id = uid;
  if found then
    -- they changed their login email since the newsletter choice was saved: move the newsletter sign-up to the new address (or, if the new address is already on the list, take the old one off)
    if r.newsletter_email is not null and em is not null and r.newsletter_email <> lower(em) then
      if exists (select 1 from public.newsletter_subscribers where email = lower(em)) then
        update public.newsletter_subscribers set status = 'unsubscribed', unsubscribed_at = now() where email = r.newsletter_email and status <> 'unsubscribed';
      else
        update public.newsletter_subscribers set email = lower(em) where email = r.newsletter_email;
      end if;
      update public.member_profiles set newsletter_email = lower(em) where user_id = uid;
    end if;
    return json_build_object('name', r.name, 'username', r.username, 'icon', r.icon, 'newsletter', r.newsletter, 'email', em);
  end if;
  select status into sub from public.newsletter_subscribers where email = lower(em);
  return json_build_object('name', null, 'username', null, 'icon', null, 'newsletter', case when sub = 'confirmed' then 'free' else 'none' end, 'email', em);
end $$;

create or replace function public.username_available(p_username text) returns boolean
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null or p_username is null or p_username !~ '^[A-Za-z0-9_]{3,20}$' then return false; end if;
  return not exists (select 1 from public.member_profiles where lower(username) = lower(p_username) and user_id <> uid);
end $$;

create or replace function public.save_my_profile(p_name text, p_username text, p_icon text, p_newsletter text) returns json
language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
  nm text := nullif(btrim(p_name), '');
  un text := nullif(btrim(p_username), '');
  em text;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'signed_out'); end if;
  if nm is not null and char_length(nm) > 80 then return json_build_object('ok', false, 'error', 'name_long'); end if;
  if un is not null and un !~ '^[A-Za-z0-9_]{3,20}$' then return json_build_object('ok', false, 'error', 'username_invalid'); end if;
  if p_icon is not null and p_icon not in ('art-loft', 'drafting-desk', 'explorers-bay', 'factory-floor', 'idea-hatchery', 'knowledge-nook', 'leadership-lounge', 'sarah-jrs-den',
    'comet', 'crescent-moon', 'planets', 'starry-sky', 'cogs', 'hanging-lamp', 'starburst', 'book-stack') then
    return json_build_object('ok', false, 'error', 'icon_invalid');
  end if;
  if p_newsletter is null or p_newsletter not in ('free', 'passes', 'none') then return json_build_object('ok', false, 'error', 'newsletter_invalid'); end if;
  if un is not null and exists (select 1 from public.member_profiles where lower(username) = lower(un) and user_id <> uid) then
    return json_build_object('ok', false, 'error', 'username_taken');
  end if;
  select email into em from auth.users where id = uid;
  begin
    insert into public.member_profiles (user_id, name, username, icon, newsletter, newsletter_email)
    values (uid, nm, un, p_icon, p_newsletter, lower(em))
    on conflict (user_id) do update set name = excluded.name, username = excluded.username, icon = excluded.icon, newsletter = excluded.newsletter, newsletter_email = excluded.newsletter_email, updated_at = now();
  exception when unique_violation then
    return json_build_object('ok', false, 'error', 'username_taken');
  end;
  if em is not null then
    if p_newsletter = 'free' then
      insert into public.newsletter_subscribers (email, status, token, consent_text, source, confirmed_at)
      values (lower(em), 'confirmed', replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
        'Chose "Free updates" on the My passes page, signed in with this email', 'site', now())
      on conflict (email) do update set status = 'confirmed', confirmed_at = coalesce(public.newsletter_subscribers.confirmed_at, now()), unsubscribed_at = null;
    else
      update public.newsletter_subscribers set status = 'unsubscribed', unsubscribed_at = now() where email = lower(em) and status <> 'unsubscribed';
    end if;
  end if;
  return json_build_object('ok', true);
end $$;

revoke all on function public.get_my_profile() from public, anon;
revoke all on function public.username_available(text) from public, anon;
revoke all on function public.save_my_profile(text, text, text, text) from public, anon;
grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.username_available(text) to authenticated;
grant execute on function public.save_my_profile(text, text, text, text) to authenticated;

-- To confirm it worked, run this. It should show the table with row level security on, and 0 policies (that is right: only the three functions touch it):
--   select tablename, rowsecurity from pg_tables where tablename = 'member_profiles';
--   select count(*) from pg_policies where tablename = 'member_profiles';

-- TO UNDO (run these lines if you ever need to):
--   drop function if exists public.save_my_profile(text, text, text, text);
--   drop function if exists public.username_available(text);
--   drop function if exists public.get_my_profile();
--   drop table if exists public.member_profiles;
