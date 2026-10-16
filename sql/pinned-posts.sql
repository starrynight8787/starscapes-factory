-- Starscapes Factory: pinned posts, one for each section of the Factory Floor.
-- Paste all of this into Supabase > SQL Editor and click Run. Safe to run again.
--
-- pinned_in says which section a post is pinned in: story (The Factory Floor) or blueprint (Blueprints).
-- The unique index lets only ONE post be pinned in each section, so pinning another has to unpin the first.

alter table posts add column if not exists pinned_in text;

alter table posts drop constraint if exists posts_pinned_in_check;
alter table posts add constraint posts_pinned_in_check check (pinned_in is null or pinned_in in ('story', 'blueprint'));

create unique index if not exists posts_one_pinned_per_section on posts (pinned_in) where pinned_in is not null;

-- Pin the two chosen posts: Day One for The Factory Floor, Blueprints #1 for Blueprints.
-- (Only if that section has nothing pinned yet. If you have two copies of a post, the oldest one is used.)
update posts set pinned_in = 'story'
where id = (select id from posts where channel = 'factory-floor' and published and title like 'Day One:%' order by created_at limit 1)
  and not exists (select 1 from posts where pinned_in = 'story');

update posts set pinned_in = 'blueprint'
where id = (select id from posts where channel = 'factory-floor' and published and title like 'Blueprints #1:%' order by created_at limit 1)
  and not exists (select 1 from posts where pinned_in = 'blueprint');

-- Check: you should see two rows, one story and one blueprint.
select pinned_in, title from posts where pinned_in is not null order by pinned_in;

-- To unpin a section later:   update posts set pinned_in = null where pinned_in = 'story';
