#!/usr/bin/env python3
"""Builds the new home page boxes (Next event, Membership, Featured room, Latest post) and the Home page tool in Admin.

Run it from the project folder, AFTER unzipping starscapes-home-18oct.zip into it:   python3 tools/add-home-v2.py

What it does: it makes exact edits to four files that already exist: the home page itself, the routes, the admin console's tool list and the page table.
  src/App.jsx, src/admin/adminTools.js, src/data/pageMeta.js, src/pages/ChannelDirectory.jsx

How it keeps you safe:
  - It checks ALL four files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-home-v2.
  - It is safe to run twice: a file already done is left alone.
  - The new files (sql/home.sql, src/home/homeRules.js, src/home/homeApi.js, src/home/HomeSections.jsx, src/home/homeSections.css, src/data/membership.js, src/admin/AdminHome.jsx) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/App.jsx": [
[
"import AdminSuggestions from './admin/AdminSuggestions'\nimport AdminBooks from './admin/AdminBooks'\nimport ArtLoftRoutes from './artloft/ArtLoftRoutes'\nimport ForgotPassword from './pages/ForgotPassword'\n",
"import AdminSuggestions from './admin/AdminSuggestions'\nimport AdminBooks from './admin/AdminBooks'\nimport AdminHome from './admin/AdminHome'\nimport ArtLoftRoutes from './artloft/ArtLoftRoutes'\nimport ForgotPassword from './pages/ForgotPassword'\n"
],
[
"<Route path=\"/admin/suggestions\" element={ <ProtectedRoute session={session}> <AdminSuggestions session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/books\" element={ <ProtectedRoute session={session}> <AdminBooks session={session} /> </ProtectedRoute> } />\n          <Route\n            path=\"/new\"\n",
"<Route path=\"/admin/suggestions\" element={ <ProtectedRoute session={session}> <AdminSuggestions session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/books\" element={ <ProtectedRoute session={session}> <AdminBooks session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/home\" element={ <ProtectedRoute session={session}> <AdminHome session={session} /> </ProtectedRoute> } />\n          <Route\n            path=\"/new\"\n"
]
],
"src/admin/adminTools.js": [
[
"  { group: 'Members', name: 'Promotions', blurb: 'Discount codes for passes and prints, and the half-price first year.' },\n  { group: 'Rooms', name: 'Open a door', to: '/admin/doors', blurb: 'Choose which closed doors in each room are open to visitors.' },\n  { group: 'Rooms', name: 'Books', to: '/admin/books', blurb: 'Add the books you are reading, have read, or will read next, and set the year\\'s reading goal and theme.' },\n  { group: 'Rooms', name: 'Suggestions', to: '/admin/suggestions', blurb: 'Switch the suggest and vote boxes on or off, and approve what visitors suggest.' },\n",
"  { group: 'Members', name: 'Promotions', blurb: 'Discount codes for passes and prints, and the half-price first year.' },\n  { group: 'Rooms', name: 'Open a door', to: '/admin/doors', blurb: 'Choose which closed doors in each room are open to visitors.' },\n  { group: 'Rooms', name: 'Home page', to: '/admin/home', blurb: 'Choose the featured room, and add the next event, for the boxes under the floor plan on the home page.' },\n  { group: 'Rooms', name: 'Books', to: '/admin/books', blurb: 'Add the books you are reading, have read, or will read next, and set the year\\'s reading goal and theme.' },\n  { group: 'Rooms', name: 'Suggestions', to: '/admin/suggestions', blurb: 'Switch the suggest and vote boxes on or off, and approve what visitors suggest.' },\n"
]
],
"src/data/pageMeta.js": [
[
"  '/admin': { title: 'Admin', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/doors': { title: 'Open a door', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/books': { title: 'Books', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/suggestions': { title: 'Suggestions', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n",
"  '/admin': { title: 'Admin', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/doors': { title: 'Open a door', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/home': { title: 'Home page tool', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/books': { title: 'Books', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/suggestions': { title: 'Suggestions', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n"
]
],
"src/pages/ChannelDirectory.jsx": [
[
"import { useEffect, useState } from 'react'\nimport { Link, useNavigate } from 'react-router-dom'\nimport { supabase } from '../supabaseClient'\nimport { channels } from '../data/channels'\nimport { roomImages, roomPath } from '../data/roomImages'\nimport RoomIcon from '../components/RoomIcon'\nimport { ROOM_ICONS } from '../components/roomIcons'\nimport { StarMark } from '../components/Logo'\nimport '../styles/site.css'\n\n",
"import { useEffect, useState } from 'react'\nimport { Link, useNavigate } from 'react-router-dom'\nimport { channels } from '../data/channels'\nimport { roomImages, roomPath } from '../data/roomImages'\nimport RoomIcon from '../components/RoomIcon'\nimport { ROOM_ICONS } from '../components/roomIcons'\nimport HomeSections from '../home/HomeSections'\nimport { fetchFeaturedSlug, fetchLatestPost, fetchNextEvent } from '../home/homeApi'\nimport '../styles/site.css'\n\n"
],
[
"  const navigate = useNavigate()\n  const [active, setActive] = useState(null)\n  const [posts, setPosts] = useState([])\n\n  // The three newest published posts, for the \"Latest posts\" section\n  useEffect(() => {\n    let cancelled = false\n    async function loadPosts() {\n      const { data, error } = await supabase\n        .from('posts')\n        .select('id, title, content, image_url, channel, created_at')\n        .eq('published', true)\n        .order('created_at', { ascending: false })\n        .limit(3)\n      if (!cancelled && !error && data) setPosts(data)\n    }\n    loadPosts()\n    return () => {\n      cancelled = true\n",
"  const navigate = useNavigate()\n  const [active, setActive] = useState(null)\n  // The three extras under the floor plan. A problem with any of them just means that box has nothing to show.\n  const [extras, setExtras] = useState({ event: null, featured: '', post: null })\n  useEffect(() => {\n    let cancelled = false\n    Promise.all([fetchNextEvent().catch(() => null), fetchFeaturedSlug().catch(() => ''), fetchLatestPost().catch(() => null)]).then(([event, featured, post]) => {\n      if (!cancelled) setExtras({ event, featured, post })\n    })\n    return () => {\n      cancelled = true\n"
],
[
"      </section>\n\n      {/* ---------- Latest posts ---------- */}\n      {posts.length > 0 && (\n        <section className=\"sf-latest\" aria-labelledby=\"sf-latest-title\">\n          <div className=\"sf-latest__head\">\n            <div>\n              <p className=\"sf-eyebrow sf-eyebrow--blue\">Fresh from the Factory</p>\n              <h2 id=\"sf-latest-title\">Latest posts</h2>\n            </div>\n            <Link to=\"/blog\" className=\"sf-morelink\">\n              See all posts →\n            </Link>\n          </div>\n          <div className=\"sf-latest__grid\">\n            {posts.map((post) => {\n              const room = channels.find((c) => c.slug === post.channel)\n              const excerpt = post.content.length > 140 ? post.content.slice(0, 140) + '…' : post.content\n              return (\n                <Link key={post.id} to={`/post/${post.id}`} className=\"sf-post\">\n                  {post.image_url ? (\n                    <img className=\"sf-post__img\" src={post.image_url} alt=\"\" loading=\"lazy\" />\n                  ) : (\n                    <div className=\"sf-post__img sf-post__img--empty\">\n                      <StarMark width={72} color=\"#DCE6FF\" />\n                    </div>\n                  )}\n                  <span className=\"sf-post__chip\">{room ? room.name : 'Blog'}</span>\n                  <span className=\"sf-post__title\">{post.title}</span>\n                  <span className=\"sf-post__ex\">{excerpt}</span>\n                </Link>\n              )\n            })}\n          </div>\n        </section>\n      )}\n    </div>\n  )\n",
"      </section>\n\n      {/* ---------- Next event, membership, the featured room and the latest post ---------- */}\n      <HomeSections event={extras.event} featured={extras.featured} post={extras.post} />\n    </div>\n  )\n"
]
]
}''')
NEW_FILES = ["sql/home.sql", "src/home/homeRules.js", "src/home/homeApi.js", "src/home/HomeSections.jsx", "src/home/homeSections.css", "src/data/membership.js", "src/admin/AdminHome.jsx"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/data/siteSettings.js", "src/admin/AdminBooks.jsx"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the tester kit first (starscapes-tester-kit-18oct.zip). These files from earlier updates are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-home-18oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    def state(old, new):
        # an edit that only ADDS text contains its "before" inside its "after"; one that only REMOVES text has its "after" inside its "before"
        if old in text and not (old in new and new in text):
            return 'todo' if text.count(old) == 1 else 'bad'
        return 'done' if new in text else 'bad'
    states = [state(old, new) for old, new in pairs]
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
    pathlib.Path(str(p) + '.before-home-v2').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
