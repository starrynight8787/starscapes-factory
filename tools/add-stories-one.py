#!/usr/bin/env python3
"""Adds the Let's write a story page to the Idea Hatchery (step one: the page, the chapters, and the owner's Stories tool), renames the Short Stories beaker, and teaches the pass labels about story chapters.

Run it from the project folder, AFTER unzipping starscapes-stories-one-19oct.zip into it:   python3 tools/add-stories-one.py

What it does: it makes exact edits to six files that already exist (the Idea Hatchery's beakers and routes, the page titles, the app's routes, the Admin tools list and the pass labels' lookup) and adds seven new files from the zip.
  src/rooms/roomsData.js, src/rooms/RoomRoutes.jsx, src/data/pageMeta.js, src/App.jsx, src/admin/adminTools.js, src/membership/passIndex.js

How it keeps you safe:
  - It checks ALL 6 files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-stories-one.
  - It is safe to run twice: a file already done is left alone.
  - The new files (sql/stories.sql, src/stories/storiesData.js, src/stories/storiesRules.js, src/stories/storiesApi.js, src/stories/LetsWriteStoryPage.jsx, src/stories/stories.css, src/admin/AdminStories.jsx) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/rooms/roomsData.js": [
[
"    items: [\n      { ...piece('idea-hatchery', 'writing-prompts'), id: 'writing-prompts', name: 'Writing Prompts', blurb: 'A spark to start something of your own.', kind: 'page', to: '/idea-hatchery/writing-prompts', labelAt: [340, 754] },\n      { ...piece('idea-hatchery', 'short-stories'), id: 'short-stories', name: 'Short Stories', blurb: 'Small tales you can finish in a sitting.', kind: 'page', to: '/idea-hatchery/short-stories', labelAt: [462, 700] },\n      { ...piece('idea-hatchery', 'come-study-with-me'), id: 'come-study-with-me', name: 'Come Study With Me', blurb: 'Study alongside me. Starting soon.', kind: 'locked', lock: 'not started yet', labelAt: [600, 754] },\n      { ...piece('idea-hatchery', 'stop-motion'), id: 'stop-motion', name: 'Stop Motion', blurb: 'Little worlds, one frame at a time.', kind: 'page', to: '/idea-hatchery/stop-motion', labelAt: [847, 700] },\n    ],\n    areas: {\n      'stop-motion': { name: 'Stop Motion', blurb: 'Little worlds, one frame at a time.', layout: 'gallery', tags: ['stop-motion'] },\n      'short-stories': { name: 'Short Stories', blurb: 'Small tales you can finish in a sitting.', layout: 'gallery', tags: ['short-stories'] },\n      'writing-prompts': { name: 'Writing Prompts', blurb: 'A spark to start something of your own.', layout: 'gallery', tags: ['writing-prompts'] },\n    },\n",
"    items: [\n      { ...piece('idea-hatchery', 'writing-prompts'), id: 'writing-prompts', name: 'Writing Prompts', blurb: 'A spark to start something of your own.', kind: 'page', to: '/idea-hatchery/writing-prompts', labelAt: [340, 754] },\n      { ...piece('idea-hatchery', 'short-stories'), id: 'short-stories', name: 'Let\\u2019s write a story', blurb: 'I write, you decide where the story goes.', kind: 'page', to: '/idea-hatchery/lets-write-a-story', labelAt: [462, 700] }, // (the beaker keeps its old internal id, picture and place: only its name and where it leads changed)\n      { ...piece('idea-hatchery', 'come-study-with-me'), id: 'come-study-with-me', name: 'Come Study With Me', blurb: 'Study alongside me. Starting soon.', kind: 'locked', lock: 'not started yet', labelAt: [600, 754] },\n      { ...piece('idea-hatchery', 'stop-motion'), id: 'stop-motion', name: 'Stop Motion', blurb: 'Little worlds, one frame at a time.', kind: 'page', to: '/idea-hatchery/stop-motion', labelAt: [847, 700] },\n    ],\n    areas: {\n      'stop-motion': { name: 'Stop Motion', blurb: 'Little worlds, one frame at a time.', layout: 'gallery', tags: ['stop-motion'] },\n      'lets-write-a-story': { name: 'Let\\u2019s write a story', blurb: 'I write, you decide where the story goes.', layout: 'list', tags: null }, // its own designed page (src/stories), not a list of posts\n      // The old Short Stories gallery of tagged posts. The beaker no longer leads here, but the address still works, so anything shared or bookmarked keeps working (oldLink: true says it is kept on purpose).\n      'short-stories': { name: 'Short Stories', blurb: 'Small tales you can finish in a sitting.', layout: 'gallery', tags: ['short-stories'], oldLink: true },\n      'writing-prompts': { name: 'Writing Prompts', blurb: 'A spark to start something of your own.', layout: 'gallery', tags: ['writing-prompts'] },\n    },\n"
]
],
"src/rooms/RoomRoutes.jsx": [
[
"import LeadershipBlogPage from '../leadership/LeadershipBlogPage'\nimport WritingInTransitPage from '../entries/WritingInTransitPage'\nimport './roompages.css'\n\n",
"import LeadershipBlogPage from '../leadership/LeadershipBlogPage'\nimport WritingInTransitPage from '../entries/WritingInTransitPage'\nimport LetsWriteStoryPage from '../stories/LetsWriteStoryPage'\nimport './roompages.css'\n\n"
],
[
"  'leadership-lounge/blog': LeadershipBlogPage,\n  'explorers-bay/writing-in-transit': WritingInTransitPage,\n}\n\n",
"  'leadership-lounge/blog': LeadershipBlogPage,\n  'explorers-bay/writing-in-transit': WritingInTransitPage,\n  'idea-hatchery/lets-write-a-story': LetsWriteStoryPage,\n}\n\n"
]
],
"src/data/pageMeta.js": [
[
"  '/drafting-desk/come-write-with-me': { title: 'Come Write With Me', description: 'Join me on YouTube while I write. Watch the sessions, newest first, and write along with me at your own desk.', image: 'drafting-desk' },\n\n  '/idea-hatchery': room('idea-hatchery', 'Where ideas get tested. Stop motion, short stories and writing prompts: pick a beaker to see what I am working on.'),\n  '/leadership-lounge': room('leadership-lounge', 'Leading from the middle. A blog, an audio course and an online course for people who lead without authority.'),\n  '/explorers-bay': room('explorers-bay', 'Stories and pictures from the road: writing in transit and travel photography, from the pier.'),\n",
"  '/drafting-desk/come-write-with-me': { title: 'Come Write With Me', description: 'Join me on YouTube while I write. Watch the sessions, newest first, and write along with me at your own desk.', image: 'drafting-desk' },\n\n  '/idea-hatchery': room('idea-hatchery', 'Where ideas get tested. Stop motion, a story we write together and writing prompts: pick a beaker to see what I am working on.'),\n  '/idea-hatchery/lets-write-a-story': { title: 'Stories: let\\u2019s write a story', description: 'A story we write together: I write each chapter, and members vote on where it goes next. The first three chapters are free to read.', image: 'idea-hatchery' },\n  '/leadership-lounge': room('leadership-lounge', 'Leading from the middle. A blog, an audio course and an online course for people who lead without authority.'),\n  '/explorers-bay': room('explorers-bay', 'Stories and pictures from the road: writing in transit and travel photography, from the pier.'),\n"
],
[
"  '/admin/doors': { title: 'Open a door', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/home': { title: 'Home page tool', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/books': { title: 'Books', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/suggestions': { title: 'Suggestions', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n",
"  '/admin/doors': { title: 'Open a door', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/home': { title: 'Home page tool', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/stories': { title: 'Stories', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/books': { title: 'Books', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/suggestions': { title: 'Suggestions', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n"
]
],
"src/App.jsx": [
[
"import AdminSuggestions from './admin/AdminSuggestions'\nimport AdminBooks from './admin/AdminBooks'\nimport AdminHome from './admin/AdminHome'\nimport ArtLoftRoutes from './artloft/ArtLoftRoutes'\n",
"import AdminSuggestions from './admin/AdminSuggestions'\nimport AdminBooks from './admin/AdminBooks'\nimport AdminStories from './admin/AdminStories'\nimport AdminHome from './admin/AdminHome'\nimport ArtLoftRoutes from './artloft/ArtLoftRoutes'\n"
],
[
"<Route path=\"/admin/suggestions\" element={ <ProtectedRoute session={session}> <AdminSuggestions session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/books\" element={ <ProtectedRoute session={session}> <AdminBooks session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/home\" element={ <ProtectedRoute session={session}> <AdminHome session={session} /> </ProtectedRoute> } />\n          <Route\n",
"<Route path=\"/admin/suggestions\" element={ <ProtectedRoute session={session}> <AdminSuggestions session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/books\" element={ <ProtectedRoute session={session}> <AdminBooks session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/stories\" element={ <ProtectedRoute session={session}> <AdminStories session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/home\" element={ <ProtectedRoute session={session}> <AdminHome session={session} /> </ProtectedRoute> } />\n          <Route\n"
]
],
"src/admin/adminTools.js": [
[
"  { group: 'Rooms', name: 'Home page', to: '/admin/home', blurb: 'Choose the featured room, and add the next event, for the boxes under the floor plan on the home page.' },\n  { group: 'Rooms', name: 'Books', to: '/admin/books', blurb: 'Add the books you are reading, have read, or will read next, and set the year\\'s reading goal and theme.' },\n  { group: 'Rooms', name: 'Suggestions', to: '/admin/suggestions', blurb: 'Switch the suggest and vote boxes on or off, and approve what visitors suggest.' },\n]\n",
"  { group: 'Rooms', name: 'Home page', to: '/admin/home', blurb: 'Choose the featured room, and add the next event, for the boxes under the floor plan on the home page.' },\n  { group: 'Rooms', name: 'Books', to: '/admin/books', blurb: 'Add the books you are reading, have read, or will read next, and set the year\\'s reading goal and theme.' },\n  { group: 'Rooms', name: 'Stories', to: '/admin/stories', blurb: 'Add a story, say which posts are its chapters, and mark a story finished.' },\n  { group: 'Rooms', name: 'Suggestions', to: '/admin/suggestions', blurb: 'Switch the suggest and vote boxes on or off, and approve what visitors suggest.' },\n]\n"
]
],
"src/membership/passIndex.js": [
[
"import { supabase } from '../supabaseClient'\nimport { cleanPass } from './lockedPosts'\n\nexport const FREE_SAMPLE = 3\n\nlet loading = null\n\nasync function fetchIndex() {\n  const { data, error } = await supabase.from('posts').select('id, pass, created_at, published').not('pass', 'is', null)\n  if (error || !Array.isArray(data)) return new Map()\n  const byPass = new Map()\n",
"import { supabase } from '../supabaseClient'\nimport { cleanPass } from './lockedPosts'\nimport { FREE_CHAPTERS } from '../stories/storiesRules'\n\nexport const FREE_SAMPLE = 3\n\nlet loading = null\n\n// Which posts are chapters of a story, and which chapter: a story's chapters 1 to 3 are free, and chapters do not use up the pass's other free places (the same rule as the database, sql/stories.sql).\n// If this cannot be found there are simply no chapters, never a broken page.\nasync function fetchChapterNumbers() {\n  try {\n    const result = await supabase.from('story_chapters').select('post_id, number')\n    const rows = result && Array.isArray(result.data) ? result.data : []\n    return new Map(rows.filter((r) => r && r.post_id && Number.isInteger(r.number)).map((r) => [r.post_id, r.number]))\n  } catch (e) {\n    return new Map()\n  }\n}\n\nasync function fetchIndex() {\n  const [{ data, error }, chapters] = await Promise.all([supabase.from('posts').select('id, pass, created_at, published').not('pass', 'is', null), fetchChapterNumbers()])\n  if (error || !Array.isArray(data)) return new Map()\n  const byPass = new Map()\n"
],
[
"    const free = new Set(\n      rows\n        .filter((r) => r.published !== false)\n        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)))\n        .slice(0, FREE_SAMPLE)\n        .map((r) => r.id),\n    )\n    for (const r of rows) index.set(r.id, { pass, free: free.has(r.id) })\n  }\n  return index\n",
"    const free = new Set(\n      rows\n        .filter((r) => r.published !== false && !chapters.has(r.id))\n        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)))\n        .slice(0, FREE_SAMPLE)\n        .map((r) => r.id),\n    )\n    for (const r of rows) index.set(r.id, { pass, free: chapters.has(r.id) ? chapters.get(r.id) <= FREE_CHAPTERS : free.has(r.id) })\n  }\n  return index\n"
]
]
}''')
NEW_FILES = ["sql/stories.sql", "src/stories/storiesData.js", "src/stories/storiesRules.js", "src/stories/storiesApi.js", "src/stories/LetsWriteStoryPage.jsx", "src/stories/stories.css", "src/admin/AdminStories.jsx"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/membership/passIndex.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the pass labels first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-stories-one-19oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-stories-one').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
