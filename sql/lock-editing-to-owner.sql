-- LOCK EDITING TO YOU: run this once in the Supabase SQL editor. It is safe to run more than once.
--
-- WHY: anyone can create a free account on the site, and by default any signed-in account may add rows to the products,
-- product_variants and posts tables and to the photo bucket. That means a stranger could add a fake print or original that
-- shows on your public pages, or publish a blog post, or fill your photo storage.
--
-- WHAT THIS DOES: it adds a RESTRICTIVE rule for each table. A restrictive rule narrows the rules that already exist; it cannot
-- widen them. After this, only the account with the email below can add, change or delete anything in these tables.
-- Visitors and customers can still read everything that is published, exactly as now.
--
-- BEFORE YOU RUN IT: check the email below is the one you sign in with. If it is not, you would lock YOURSELF out of editing.
-- To undo it at any time, run the DROP lines at the very bottom.

do $$
declare
  t text;
  owner_check text := $c$ lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com' $c$;
begin
  foreach t in array array['products', 'product_variants', 'posts'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "only the owner adds rows" on public.%I', t);
      execute format('drop policy if exists "only the owner changes rows" on public.%I', t);
      execute format('drop policy if exists "only the owner deletes rows" on public.%I', t);
      execute format('create policy "only the owner adds rows" on public.%I as restrictive for insert to authenticated with check (%s)', t, owner_check);
      execute format('create policy "only the owner changes rows" on public.%I as restrictive for update to authenticated using (%s) with check (%s)', t, owner_check, owner_check);
      execute format('create policy "only the owner deletes rows" on public.%I as restrictive for delete to authenticated using (%s)', t, owner_check);
    end if;
  end loop;
end $$;

-- Photo uploads: only you may put files in the photo bucket
drop policy if exists "only the owner uploads photos" on storage.objects;
create policy "only the owner uploads photos" on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'post-images' or lower(auth.jwt() ->> 'email') = 'gillian@gillianbennet.com');

-- To confirm it worked, this lists the new rules (look for the three "only the owner" rules, with permissive = false):
--   select tablename, policyname, permissive, cmd from pg_policies where policyname like 'only the owner%' order by tablename;

-- TO UNDO (run these lines if you ever need to):
--   drop policy if exists "only the owner adds rows" on public.products;      drop policy if exists "only the owner changes rows" on public.products;      drop policy if exists "only the owner deletes rows" on public.products;
--   drop policy if exists "only the owner adds rows" on public.product_variants; drop policy if exists "only the owner changes rows" on public.product_variants; drop policy if exists "only the owner deletes rows" on public.product_variants;
--   drop policy if exists "only the owner adds rows" on public.posts;         drop policy if exists "only the owner changes rows" on public.posts;         drop policy if exists "only the owner deletes rows" on public.posts;
--   drop policy if exists "only the owner uploads photos" on storage.objects;
