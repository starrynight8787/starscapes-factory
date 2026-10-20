#!/usr/bin/env python3
"""Adds the All posts list to Admin: every post from every room, filtered by room, with a plain line on where each one appears.

Run it from the project folder, AFTER unzipping starscapes-admin-posts-20oct.zip into it:   python3 tools/add-admin-posts.py

What it does: it makes exact edits to four files that already exist (the Idea Hatchery's room data, the app's routes, the Admin tools list and the page titles) and adds four new files from the zip.
  src/rooms/roomsData.js, src/App.jsx, src/admin/adminTools.js, src/data/pageMeta.js

How it keeps you safe:
  - It checks ALL four files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-admin-posts.
  - It is safe to run twice: a file already done is left alone.
  - The new files (src/admin/AdminPosts.jsx, src/admin/postsAdminApi.js, src/admin/postsAdminRules.js, src/admin/adminposts.css) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/rooms/roomsData.js": [
[
"    areas: {\n      'stop-motion': { name: 'Stop Motion', blurb: 'Little worlds, one frame at a time.', layout: 'gallery', tags: ['stop-motion'] },\n      'lets-write-a-story': { name: 'Let\\u2019s write a story', blurb: 'I write, you decide where the story goes.', layout: 'list', tags: null }, // its own designed page (src/stories), not a list of posts\n      // The old Short Stories gallery of tagged posts. The beaker no longer leads here, but the address still works, so anything shared or bookmarked keeps working (oldLink: true says it is kept on purpose).\n      'short-stories': { name: 'Short Stories', blurb: 'Small tales you can finish in a sitting.', layout: 'gallery', tags: ['short-stories'], oldLink: true },\n",
"    areas: {\n      'stop-motion': { name: 'Stop Motion', blurb: 'Little worlds, one frame at a time.', layout: 'gallery', tags: ['stop-motion'] },\n      'lets-write-a-story': { name: 'Let\\u2019s write a story', blurb: 'I write, you decide where the story goes.', layout: 'list', tags: null, own: true }, // its own designed page (src/stories), not a list of posts (own: true tells the Admin list of posts not to say posts appear here)\n      // The old Short Stories gallery of tagged posts. The beaker no longer leads here, but the address still works, so anything shared or bookmarked keeps working (oldLink: true says it is kept on purpose).\n      'short-stories': { name: 'Short Stories', blurb: 'Small tales you can finish in a sitting.', layout: 'gallery', tags: ['short-stories'], oldLink: true },\n"
]
],
"src/App.jsx": [
[
"import AdminBooks from './admin/AdminBooks'\nimport AdminStories from './admin/AdminStories'\nimport AdminHome from './admin/AdminHome'\nimport ArtLoftRoutes from './artloft/ArtLoftRoutes'\n",
"import AdminBooks from './admin/AdminBooks'\nimport AdminStories from './admin/AdminStories'\nimport AdminPosts from './admin/AdminPosts'\nimport AdminHome from './admin/AdminHome'\nimport ArtLoftRoutes from './artloft/ArtLoftRoutes'\n"
],
[
"<Route path=\"/admin/books\" element={ <ProtectedRoute session={session}> <AdminBooks session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/stories\" element={ <ProtectedRoute session={session}> <AdminStories session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/home\" element={ <ProtectedRoute session={session}> <AdminHome session={session} /> </ProtectedRoute> } />\n          <Route\n",
"<Route path=\"/admin/books\" element={ <ProtectedRoute session={session}> <AdminBooks session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/stories\" element={ <ProtectedRoute session={session}> <AdminStories session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/posts\" element={ <ProtectedRoute session={session}> <AdminPosts session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/home\" element={ <ProtectedRoute session={session}> <AdminHome session={session} /> </ProtectedRoute> } />\n          <Route\n"
]
],
"src/admin/adminTools.js": [
[
"  { group: 'Rooms', name: 'Home page', to: '/admin/home', blurb: 'Choose the featured room, and add the next event, for the boxes under the floor plan on the home page.' },\n  { group: 'Rooms', name: 'Books', to: '/admin/books', blurb: 'Add the books you are reading, have read, or will read next, and set the year\\'s reading goal and theme.' },\n  { group: 'Rooms', name: 'Stories', to: '/admin/stories', blurb: 'Add a story, say which posts are its chapters, and mark a story finished.' },\n  { group: 'Rooms', name: 'Suggestions', to: '/admin/suggestions', blurb: 'Switch the suggest and vote boxes on or off, and approve what visitors suggest.' },\n",
"  { group: 'Rooms', name: 'Home page', to: '/admin/home', blurb: 'Choose the featured room, and add the next event, for the boxes under the floor plan on the home page.' },\n  { group: 'Rooms', name: 'Books', to: '/admin/books', blurb: 'Add the books you are reading, have read, or will read next, and set the year\\'s reading goal and theme.' },\n  { group: 'Rooms', name: 'All posts', to: '/admin/posts', blurb: 'See every post from every room, filter by room, and see where each one appears.' },\n  { group: 'Rooms', name: 'Stories', to: '/admin/stories', blurb: 'Add a story, say which posts are its chapters, and mark a story finished.' },\n  { group: 'Rooms', name: 'Suggestions', to: '/admin/suggestions', blurb: 'Switch the suggest and vote boxes on or off, and approve what visitors suggest.' },\n"
]
],
"src/data/pageMeta.js": [
[
"  '/admin/doors': { title: 'Open a door', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/home': { title: 'Home page tool', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/stories': { title: 'Stories', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/books': { title: 'Books', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n",
"  '/admin/doors': { title: 'Open a door', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/home': { title: 'Home page tool', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/posts': { title: 'All posts', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/stories': { title: 'Stories', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/books': { title: 'Books', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n"
]
]
}''')
NEW_FILES = ["src/admin/AdminPosts.jsx", "src/admin/postsAdminApi.js", "src/admin/postsAdminRules.js", "src/admin/adminposts.css"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/stories/storiesRules.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print("Install the Let's write a story package first. These files are missing: " + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-admin-posts-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-admin-posts').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
