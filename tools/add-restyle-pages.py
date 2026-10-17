#!/usr/bin/env python3
"""Restyles the post list, the single post and the plain text pages, and points the footer's social links at the real addresses.

Run it from the project folder, AFTER unzipping starscapes-restyle-pages-17oct.zip into it:   python3 tools/add-restyle-pages.py

What it does: it makes exact edits to four files that already exist, so the post list at /blog, a single post and the text pages use the new look, and the footer's Follow links read from contact.js.
  src/pages/Home.jsx, src/pages/PostPage.jsx, src/pages/StaticPage.jsx, src/data/social.js

How it keeps you safe:
  - It checks ALL four files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-restyle-pages.
  - It is safe to run twice: a file already done is left alone.
  - The new files (src/styles/pages.css) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/pages/Home.jsx": [
[
"import { useEffect, useState } from 'react'\nimport { Link, useSearchParams } from 'react-router-dom'\nimport { supabase } from '../supabaseClient'\nimport '../styles/articles.css'\n\nexport default function Home() {\n  const [posts, setPosts] = useState([])\n  const [loading, setLoading] = useState(true)\n  const [error, setError] = useState(null)\n  const [searchParams, setSearchParams] = useSearchParams()\n  const activeTag = searchParams.get('tag')\n\n  useEffect(() => {\n    async function fetchPosts() {\n      setLoading(true)\n\n      let query = supabase\n        .from('posts')\n        .select('id, title, content, image_url, tags, created_at')\n        .eq('published', true)\n        .order('created_at', { ascending: false })\n\n      if (activeTag) {\n        query = query.contains('tags', [activeTag])\n      }\n\n      const { data, error } = await query\n\n      if (error) {\n        setError(error.message)\n      } else {\n        setPosts(data)\n      }\n      setLoading(false)\n    }\n\n    fetchPosts()\n  }, [activeTag])\n\n  function handleTagClick(tag) {\n    setSearchParams({ tag })\n  }\n\n  function clearFilter() {\n    setSearchParams({})\n  }\n\n  if (loading) return <p>Loading posts...</p>\n  if (error) return <p className=\"error\">{error}</p>\n\n  return (\n    <div>\n      <h1>Latest Posts</h1>\n\n      {activeTag && (\n        <p className=\"muted\">\n          Filtering by tag: <strong>{activeTag}</strong>{' '}\n          <button onClick={clearFilter} style={{ marginLeft: 8 }}>\n            Clear\n          </button>\n        </p>\n      )}\n\n      {posts.length === 0 && <p className=\"muted\">No posts yet. Check back soon!</p>}\n\n      {posts.map((post) => (\n        <div className=\"post-card\" key={post.id}>\n          {post.image_url && <img src={post.image_url} alt={post.title} />}\n          <h2 className=\"sf-article-title\">\n            <Link to={`/post/${post.id}`}>{post.title}</Link>\n          </h2>\n          <p className=\"muted\">{new Date(post.created_at).toLocaleDateString()}</p>\n          <p>{post.content.slice(0, 160)}...</p>\n          {post.tags && post.tags.length > 0 && (\n            <div style={{ marginTop: 8 }}>\n              {post.tags.map((tag) => (\n                <button\n                  key={tag}\n                  onClick={() => handleTagClick(tag)}\n                  style={{\n                    marginRight: 6,\n                    marginBottom: 6,\n                    background: '#eee',\n                    color: '#333',\n                    fontSize: 14,\n                    padding: '6px 12px',\n                    borderRadius: 999,\n                  }}\n                >\n                  {tag}\n                </button>\n              ))}\n            </div>\n          )}\n        </div>\n      ))}\n    </div>\n  )\n}",
"import { useEffect, useMemo, useState } from 'react'\nimport { Link, useLocation, useSearchParams } from 'react-router-dom'\nimport { supabase } from '../supabaseClient'\nimport { formatDate } from '../rooms/postRules'\nimport '../rooms/roompages.css'\nimport '../styles/pages.css'\nimport '../styles/articles.css'\n\n// Every published post from every room, newest first, at /blog. The tags found on the posts become the filter above the list.\n// The rows are the same cards as on the room pages (roompages.css), with the whole row a link.\nexport default function Home() {\n  const [posts, setPosts] = useState([])\n  const [loading, setLoading] = useState(true)\n  const [error, setError] = useState(false)\n  const [searchParams, setSearchParams] = useSearchParams()\n  const activeTag = searchParams.get('tag')\n  const here = useLocation() // remembered, so a post's Back link can return to this exact list\n\n  useEffect(() => {\n    let alive = true\n    async function fetchPosts() {\n      const { data, error: problem } = await supabase\n        .from('posts')\n        .select('id, title, tags, created_at')\n        .eq('published', true)\n        .order('created_at', { ascending: false })\n      if (!alive) return\n      if (problem) setError(true)\n      else setPosts(data || [])\n      setLoading(false)\n    }\n    fetchPosts()\n    return () => {\n      alive = false\n    }\n  }, [])\n\n  const allTags = useMemo(() => [...new Set(posts.flatMap((p) => (Array.isArray(p.tags) ? p.tags : [])))].sort((a, b) => a.localeCompare(b)), [posts])\n  const shown = activeTag ? posts.filter((p) => Array.isArray(p.tags) && p.tags.includes(activeTag)) : posts\n\n  if (loading) return <p className=\"rp-note\">Loading posts…</p>\n  if (error) return <p className=\"rp-note\" role=\"alert\">The posts could not load just now. Please try again in a moment.</p>\n\n  return (\n    <main className=\"pg pg--list\">\n      <header className=\"rp-head\">\n        <h1>All posts</h1>\n        <p className=\"rp-blurb\">Every post from every room, newest first.</p>\n      </header>\n\n      {allTags.length > 0 && (\n        <div className=\"pg-filter\" role=\"group\" aria-label=\"Filter by tag\">\n          <button type=\"button\" className=\"pg-chip\" aria-pressed={!activeTag} onClick={() => setSearchParams({})}>\n            All\n          </button>\n          {allTags.map((tag) => (\n            <button key={tag} type=\"button\" className=\"pg-chip\" aria-pressed={activeTag === tag} onClick={() => setSearchParams({ tag })}>\n              {tag}\n            </button>\n          ))}\n        </div>\n      )}\n\n      {posts.length === 0 && <p className=\"rp-note\">No posts yet. Check back soon!</p>}\n      {posts.length > 0 && shown.length === 0 && <p className=\"rp-note\">No posts have that tag.</p>}\n\n      <ul className=\"rp-entries\">\n        {shown.map((post) => {\n          const date = formatDate(post.created_at)\n          return (\n            <li key={post.id}>\n              <article className=\"rp-entry pg-row\">\n                <h2 className=\"sf-article-title rp-entry__title\">\n                  <Link to={`/post/${post.id}`} state={{ from: here.pathname + here.search }}>\n                    {post.title}\n                  </Link>\n                </h2>\n                {date && <span className=\"rp-entry__date\">{date}</span>}\n              </article>\n            </li>\n          )\n        })}\n      </ul>\n    </main>\n  )\n}\n"
]
],
"src/pages/PostPage.jsx": [
[
"import { supabase } from '../supabaseClient'\nimport BackToPosts from '../components/BackToPosts'\nimport useTitle from './useTitle'\nimport '../styles/articles.css'\n\nexport default function PostPage({ session }) {\n",
"import { supabase } from '../supabaseClient'\nimport BackToPosts from '../components/BackToPosts'\nimport { channels } from '../data/channels'\nimport { safeImage } from '../rooms/postRules'\nimport useTitle from './useTitle'\nimport '../styles/articles.css'\nimport '../rooms/roompages.css'\nimport '../styles/pages.css'\n\nexport default function PostPage({ session }) {\n"
],
[
"      const { data, error } = await supabase\n        .from('posts')\n        .select('id, title, content, image_url, created_at, author_id, tags')\n        .eq('id', id)\n        .single()\n",
"      const { data, error } = await supabase\n        .from('posts')\n        .select('id, title, content, image_url, created_at, author_id, tags, channel')\n        .eq('id', id)\n        .single()\n"
],
[
"\n  const isAuthor = session && session.user.id === post.author_id\n\n  return (\n    <div className=\"post-detail\">\n      <p>\n        <BackToPosts />\n      </p>\n      <h1 className=\"sf-article-title\">{post.title}</h1>\n      <p className=\"muted\">{new Date(post.created_at).toLocaleDateString()}</p>\n      {post.image_url && <img src={post.image_url} alt={post.title} />}\n      <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>\n\n      {post.tags && post.tags.length > 0 && (\n        <div style={{ marginTop: 16 }}>\n          {post.tags.map((tag) => (\n            <Link\n              key={tag}\n              to={`/?tag=${tag}`}\n              style={{\n                display: 'inline-block',\n                marginRight: 6,\n                marginBottom: 6,\n                background: '#eee',\n                color: '#333',\n                fontSize: 14,\n                padding: '6px 12px',\n                borderRadius: 999,\n                textDecoration: 'none',\n              }}\n            >\n              {tag}\n            </Link>\n",
"\n  const isAuthor = session && session.user.id === post.author_id\n  const room = channels.find((c) => c.slug === post.channel)\n  const picture = safeImage(post.image_url)\n  const when = new Date(post.created_at)\n  const date = Number.isNaN(when.getTime()) ? '' : when.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })\n\n  return (\n    <main className=\"pg pg-post\">\n      <p className=\"rp-back\">\n        <BackToPosts />\n      </p>\n      <div className=\"pg-post__meta\">\n        {room && <span className=\"pg-chip\">{room.name}</span>}\n        {date && <time className=\"pg-post__date\" dateTime={when.toISOString()}>{date}</time>}\n      </div>\n      <h1 className=\"sf-article-title\">{post.title}</h1>\n      {picture && (\n        <img\n          className=\"pg-post__image\"\n          src={picture}\n          alt=\"\"\n          onError={(e) => {\n            e.currentTarget.style.display = 'none' // a picture that will not load leaves the page tidy, not broken\n          }}\n        />\n      )}\n      <div className=\"pg-post__body\">{post.content}</div>\n\n      {post.tags && post.tags.length > 0 && (\n        <div className=\"pg-tags\">\n          {post.tags.map((tag) => (\n            <Link key={tag} to={`/blog?tag=${encodeURIComponent(tag)}`} className=\"pg-chip\">\n              {tag}\n            </Link>\n"
],
[
"\n      {isAuthor && (\n        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>\n          <Link to={`/edit/${post.id}`}>\n            <button>Edit</button>\n          </Link>\n          <button onClick={handleDelete} disabled={deleting} style={{ background: '#c0392b' }}>\n            {deleting ? 'Deleting...' : 'Delete'}\n          </button>\n        </div>\n      )}\n    </div>\n  )\n}",
"\n      {isAuthor && (\n        <div className=\"pg-actions\">\n          <Link to={`/edit/${post.id}`}>\n            <button className=\"pg-btn\">Edit</button>\n          </Link>\n          <button className=\"pg-btn pg-btn--danger\" onClick={handleDelete} disabled={deleting}>\n            {deleting ? 'Deleting...' : 'Delete'}\n          </button>\n        </div>\n      )}\n    </main>\n  )\n}\n"
]
],
"src/pages/StaticPage.jsx": [
[
"import { Link, useParams } from 'react-router-dom'\nimport { staticPages } from '../data/staticPages'\n\nexport default function StaticPage() {\n",
"import { Link, useParams } from 'react-router-dom'\nimport { staticPages } from '../data/staticPages'\nimport '../rooms/roompages.css'\nimport '../styles/pages.css'\n\nexport default function StaticPage() {\n"
],
[
"  if (!page) {\n    return (\n      <div>\n        <p>\n          <Link to=\"/\">&larr; Back home</Link>\n        </p>\n        <p>Page not found.</p>\n      </div>\n    )\n  }\n\n  return (\n    <div>\n      <p>\n        <Link to=\"/\">&larr; Back home</Link>\n      </p>\n      <h1>{page.title}</h1>\n      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, maxWidth: 640 }}>\n        {page.content}\n      </div>\n    </div>\n  )\n}",
"  if (!page) {\n    return (\n      <main className=\"pg pg-text\">\n        <p className=\"rp-back\">\n          <Link to=\"/\">&larr; Back home</Link>\n        </p>\n        <h1>Page not found</h1>\n      </main>\n    )\n  }\n\n  return (\n    <main className=\"pg pg-text\">\n      <p className=\"rp-back\">\n        <Link to=\"/\">&larr; Back home</Link>\n      </p>\n      <h1>{page.title}</h1>\n      <div className=\"pg-text__body\">{page.content}</div>\n    </main>\n  )\n}\n"
]
],
"src/data/social.js": [
[
"// Add the address of each account here, and its link appears in the footer.\n// A blank address keeps that link hidden, so nothing broken ever goes live.\nexport const social = [\n  { name: 'YouTube', url: '' },\n  { name: 'Instagram', url: '' },\n  { name: 'TikTok', url: '' },\n  { name: 'Threads', url: '' },\n]\n",
"// The footer's \"Follow\" links. The addresses live in ONE place, src/data/contact.js (SOCIAL_LINKS): change them there.\n// A blank address keeps that link hidden, so nothing broken ever goes live.\nimport { SOCIAL_LINKS } from './contact'\n\nexport const social = [\n  { name: 'YouTube', url: SOCIAL_LINKS.youtube },\n  { name: 'Instagram', url: SOCIAL_LINKS.instagram },\n  { name: 'TikTok', url: SOCIAL_LINKS.tiktok },\n  { name: 'Threads', url: SOCIAL_LINKS.threads },\n]\n"
]
]
}''')
NEW_FILES = ["src/styles/pages.css"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-restyle-pages-17oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
    sys.exit(1)


def splice(text, pairs):
    spans = []
    for old, new in pairs:
        spans.append((text.find(old), old, new))
    spans.sort()
    out, pos = [], 0
    for index, old, new in spans:
        out.append(text[pos:index])
        out.append(new)
        pos = index + len(old)
    out.append(text[pos:])
    return ''.join(out)


plan, problems, done = {}, [], []
for rel, pairs in PATCH.items():
    p = root / rel
    if not p.exists():
        problems.append('%s is missing' % rel)
        continue
    text = p.read_text(encoding='utf-8')
    # each edit is either already in the file, still to do (its "before" text is there exactly once), or neither (not the file expected)
    states = ['done' if new in text else 'todo' if text.count(old) == 1 else 'bad' for old, new in pairs]
    if all(s == 'done' for s in states):
        done.append(rel)
    elif all(s == 'todo' for s in states):
        spans = sorted((text.find(old), text.find(old) + len(old)) for old, new in pairs)
        if any(a2 > b1 for (a1, a2), (b1, b2) in zip(spans, spans[1:])):
            problems.append('%s: the edits would overlap, so it is not the file I expected' % rel)
        else:
            plan[rel] = (text, splice(text, pairs))
    else:
        problems.append('%s is not the way I expected (it may have been changed since the last update)' % rel)

if problems:
    print('NOTHING WAS CHANGED, because:')
    for line in problems:
        print('  - ' + line)
    print('Paste this to me and I will tell you what to do.')
    sys.exit(1)

for rel, (before, after) in plan.items():
    p = root / rel
    pathlib.Path(str(p) + '.before-restyle-pages').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
