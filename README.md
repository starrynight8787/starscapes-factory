# Supabase Blog Starter

A minimal React + Vite + Supabase blog: login/signup, published post list, single post view, and a "New Post" form with image upload. Built to stay entirely within Supabase's and Vercel's free tiers.

## Stack
- React 18 + Vite
- react-router-dom for routing
- Supabase: Auth, Postgres (`posts` table), Storage (`post-images` bucket)
- Deploy target: Vercel (free/Hobby plan)

## 1. Create your Supabase project
1. Go to https://supabase.com, sign in, and click "New project".
2. Choose any name/region, set a database password (save it somewhere), and wait for it to finish provisioning.
3. In the dashboard, go to **Project Settings -> API**. Copy the **Project URL** and the **anon public** key.

## 2. Set up the database
1. In the Supabase dashboard, open **SQL Editor -> New query**.
2. Paste the contents of `supabase/schema.sql` (in this project) and run it.
   - This creates the `posts` table with Row Level Security policies.
3. Go to **Storage** in the sidebar, click **New bucket**, name it exactly `post-images`, and toggle it to **Public**.
4. Go back to the SQL editor and run the storage policy statements at the bottom of `schema.sql` (they're included in the same file — just run the whole thing once the bucket exists).

## 3. Configure the app locally
1. Install dependencies:
   ```
   npm install
   ```
2. Copy the env file and fill in your project's values:
   ```
   cp .env.example .env.local
   ```
   Then edit `.env.local`:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
3. Run the dev server:
   ```
   npm run dev
   ```
   Visit the printed local URL (usually http://localhost:5173).

## 4. Try it out
1. Go to **/signup**, create an account. Supabase sends a confirmation email by default — confirm it, then log in at **/login**.
2. Once logged in, click **New Post** in the nav, write something, optionally attach an image, and publish.
3. It should appear on the home page immediately.

## 5. Push to GitHub
```
git init
git add .
git commit -m "Initial commit"
```
Create a new repo on GitHub, then follow its instructions to push (`git remote add origin ...`, `git push -u origin main`).

Note: `.env.local` is already in `.gitignore` — your Supabase keys will NOT be committed. Good.

## 6. Deploy to Vercel
1. Go to https://vercel.com, sign in with GitHub, and import this repository.
2. Vercel will auto-detect it as a Vite project.
3. Before deploying, add your environment variables in the Vercel project settings (**Settings -> Environment Variables**):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Every future push to your main branch will auto-redeploy.

## Notes on staying in the free tier
- Supabase free tier: 500 MB database, 1 GB file storage, 5 GB bandwidth/month, 2 projects. Plenty for a personal blog while learning.
- Free Supabase projects pause after 7 days of inactivity — just click "Restore" in the dashboard if that happens, nothing is lost.
- Resize/compress images before uploading (e.g. under ~1MB each) to stretch your 1GB storage allowance further.
- Vercel's Hobby plan is free for personal projects; you'd move to a paid plan once this becomes a commercial product.

## Where to go from here
- Add pagination or infinite scroll to the home page once you have more posts.
- Add an "edit post" and "delete post" page (the RLS policies already support it — you own your own rows).
- Add categories/tags as a second table.
- When ready to monetize, look at Stripe for payments and Supabase Edge Functions for webhook handling.
