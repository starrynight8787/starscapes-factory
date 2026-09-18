-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. Posts table
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  image_url text,
  author_id uuid references auth.users(id) not null,
  published boolean default true,
  created_at timestamptz default now()
);

-- 2. Enable Row Level Security
alter table posts enable row level security;

-- 3. Anyone (including logged-out visitors) can read published posts
create policy "Public can read published posts"
on posts for select
using (published = true);

-- 4. Logged-in users can insert their own posts
create policy "Authenticated users can create posts"
on posts for insert
with check (auth.uid() = author_id);

-- 5. Users can update only their own posts
create policy "Users can update their own posts"
on posts for update
using (auth.uid() = author_id);

-- 6. Users can delete only their own posts
create policy "Users can delete their own posts"
on posts for delete
using (auth.uid() = author_id);

-- ==========================================================
-- STORAGE SETUP
-- Do this part in the Dashboard UI, then run the policies below:
-- 1. Go to Storage -> Create a new bucket named "post-images"
-- 2. Mark it as a PUBLIC bucket (so images can be viewed by visitors)
-- ==========================================================

-- Allow public read access to files in the post-images bucket
create policy "Public read access for post-images"
on storage.objects for select
using (bucket_id = 'post-images');

-- Allow authenticated users to upload into their own folder
create policy "Authenticated users can upload post-images"
on storage.objects for insert
with check (
  bucket_id = 'post-images'
  and auth.role() = 'authenticated'
);

-- Allow users to delete their own uploaded files
create policy "Users can delete their own post-images"
on storage.objects for delete
using (
  bucket_id = 'post-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
