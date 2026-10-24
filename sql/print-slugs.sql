-- PRINT ADDRESSES ("slugs"): run this once in the Supabase SQL editor (Database -> SQL editor -> New query -> paste ALL of it -> Run). It is safe to run more than once.
-- It touches ONLY the products table (the catalogue of prints and originals). No customer, order, member or payment data is read or changed.
--
-- WHAT IT DOES
--   * adds a "slug" column to products: a print's readable address, like behind-the-curtain, used as /art-loft/prints/behind-the-curtain
--   * gives every existing PRINT its slug, made from its title (a second print with the same title gets -2, a third -3)
--   * gives every print added later its slug automatically, so nothing else has to change when a print is synced from Creative Hub
--   * LOCKS each slug once it is set: editing a print's title later never changes its address, and trying to change a slug on purpose is refused
--     (pins and links depend on it staying the same)
--
-- BEFORE YOU RUN IT: correct any spelling mistake in a print's title first (for example "Contempory"), because the slug is made from the title as it is when you run
-- this, and then it is permanent.
--
-- TO CHECK IT WORKED (run this after):
--   select title, slug from public.products where fulfilment = 'creativehub' order by title;
--
-- TO CHANGE ONE ADDRESS ON PURPOSE (this breaks any pin or link that uses the old address, so only do it before pins exist):
--   begin;
--   set local app.allow_slug_change = 'yes';
--   update public.products set slug = 'the-new-address' where id = 'the-print-id';
--   commit;

alter table public.products add column if not exists slug text;

-- only lower-case letters and numbers joined by single hyphens
alter table public.products drop constraint if exists products_slug_format;
alter table public.products add constraint products_slug_format check (slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- no two products share an address
create unique index if not exists products_slug_key on public.products (slug) where slug is not null;

-- a slug from a title: lower case, apostrophes dropped, anything else that is not a letter or number becomes one hyphen
create or replace function public.make_slug(title text) returns text language sql immutable as $$
  select nullif(btrim(regexp_replace(lower(translate(coalesce(title, ''), '’‘''', '')), '[^a-z0-9]+', '-', 'g'), '-'), '')
$$;

-- a slug nobody else has: the plain one, or -2, -3 ... if it is taken
create or replace function public.next_print_slug(title text) returns text language plpgsql as $$
declare
  base text := btrim(left(public.make_slug(title), 70), '-');
  candidate text;
  n integer := 1;
begin
  if base is null or base = '' then return null; end if;
  candidate := base;
  while exists (select 1 from public.products where slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end $$;

-- every print added from now on gets its slug when it is created
create or replace function public.set_print_slug() returns trigger language plpgsql as $$
begin
  if new.fulfilment = 'creativehub' and new.slug is null then
    new.slug := public.next_print_slug(new.title);
  end if;
  return new;
end $$;
drop trigger if exists products_set_slug on public.products;
create trigger products_set_slug before insert on public.products for each row execute function public.set_print_slug();

-- a slug that is set can never be changed or cleared by accident
create or replace function public.keep_print_slug() returns trigger language plpgsql as $$
begin
  if old.slug is not null and new.slug is distinct from old.slug and coalesce(current_setting('app.allow_slug_change', true), '') <> 'yes' then
    raise exception 'A product''s address (slug) cannot be changed once it is set, because pins and links depend on it. To change one on purpose, see the note at the top of sql/print-slugs.sql.';
  end if;
  return new;
end $$;
drop trigger if exists products_keep_slug on public.products;
create trigger products_keep_slug before update of slug on public.products for each row execute function public.keep_print_slug();

-- give every existing print its slug, oldest first
do $$
declare
  r record;
begin
  for r in select id, title from public.products where fulfilment = 'creativehub' and slug is null order by created_at, id loop
    update public.products set slug = public.next_print_slug(r.title) where id = r.id;
  end loop;
end $$;
