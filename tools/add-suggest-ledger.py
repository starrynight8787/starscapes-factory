#!/usr/bin/env python3
"""Adds the shared Suggest and vote box, its admin tool, and the Story Ledger page.

Run it from the project folder, AFTER unzipping starscapes-suggest-ledger-17oct.zip into it:   python3 tools/add-suggest-ledger.py

What it does: it makes exact edits to five files that already exist, so the Story Ledger door has its own page, the admin console has a Suggestions tool at /admin/suggestions, and that page is kept out of search results.
  src/App.jsx, src/admin/adminTools.js, src/data/pageMeta.js, src/doors/doorsData.js, src/rooms/RoomRoutes.jsx

How it keeps you safe:
  - It checks ALL five files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-suggest-ledger.
  - It is safe to run twice: a file already done is left alone.
  - The new files (sql/suggestions.sql, src/suggest/suggestRules.js, src/suggest/suggestApi.js, src/suggest/useUser.js, src/suggest/SuggestPanel.jsx, src/suggest/suggest.css, src/admin/AdminSuggestions.jsx, src/ledger/StoryLedgerPage.jsx, src/ledger/ledgerData.js, src/ledger/ledger.css) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/App.jsx": [
[
"import AdminConsole from './admin/AdminConsole'\nimport OpenDoors from './admin/OpenDoors'\nimport ArtLoftRoutes from './artloft/ArtLoftRoutes'\nimport ForgotPassword from './pages/ForgotPassword'\n",
"import AdminConsole from './admin/AdminConsole'\nimport OpenDoors from './admin/OpenDoors'\nimport AdminSuggestions from './admin/AdminSuggestions'\nimport ArtLoftRoutes from './artloft/ArtLoftRoutes'\nimport ForgotPassword from './pages/ForgotPassword'\n"
],
[
"<Route path=\"/admin\" element={ <ProtectedRoute session={session}> <AdminConsole session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/doors\" element={ <ProtectedRoute session={session}> <OpenDoors session={session} /> </ProtectedRoute> } />\n          <Route\n            path=\"/new\"\n",
"<Route path=\"/admin\" element={ <ProtectedRoute session={session}> <AdminConsole session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/doors\" element={ <ProtectedRoute session={session}> <OpenDoors session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/suggestions\" element={ <ProtectedRoute session={session}> <AdminSuggestions session={session} /> </ProtectedRoute> } />\n          <Route\n            path=\"/new\"\n"
]
],
"src/admin/adminTools.js": [
[
"  { group: 'Members', name: 'Promotions', blurb: 'Discount codes for passes and prints, and the half-price first year.' },\n  { group: 'Rooms', name: 'Open a door', to: '/admin/doors', blurb: 'Choose which closed doors in each room are open to visitors.' },\n]\n",
"  { group: 'Members', name: 'Promotions', blurb: 'Discount codes for passes and prints, and the half-price first year.' },\n  { group: 'Rooms', name: 'Open a door', to: '/admin/doors', blurb: 'Choose which closed doors in each room are open to visitors.' },\n  { group: 'Rooms', name: 'Suggestions', to: '/admin/suggestions', blurb: 'Switch the suggest and vote boxes on or off, and approve what visitors suggest.' },\n]\n"
]
],
"src/data/pageMeta.js": [
[
"  '/admin': { title: 'Admin', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/doors': { title: 'Open a door', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/art-loft/admin': { title: 'Manage prints', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/art-loft/admin/originals': { title: 'Manage originals', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n",
"  '/admin': { title: 'Admin', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/doors': { title: 'Open a door', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/suggestions': { title: 'Suggestions', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/art-loft/admin': { title: 'Manage prints', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/art-loft/admin/originals': { title: 'Manage originals', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n"
]
],
"src/doors/doorsData.js": [
[
"//\n// page: { layout } means a plain page of the room's posts that carry this door's tag, as a list or a gallery. It exists now, so the door can be opened.\n// page: null means the page has not been built yet (it needs its own design), so the door cannot be opened until it is.\n// paid: true means the page, once it is built, is for pass holders only (testers and teasers for the travel work). The bottle is drawn with its own padlock.\n",
"//\n// page: { layout } means a plain page of the room's posts that carry this door's tag, as a list or a gallery. It exists now, so the door can be opened.\n// page: { layout: 'custom' } means the page has its own design and its own component (see CUSTOM_PAGES in src/rooms/RoomRoutes.jsx), not a list of posts.\n// page: null means the page has not been built yet (it needs its own design), so the door cannot be opened until it is.\n// paid: true means the page, once it is built, is for pass holders only (testers and teasers for the travel work). The bottle is drawn with its own padlock.\n"
],
[
"  { room: 'knowledge-nook', id: 'research', name: 'Research', blurb: 'A space to test things out.', page: { layout: 'list' } },\n  { room: 'knowledge-nook', id: 'book-to-screen', name: 'Book to Screen', blurb: 'Books that made it to the screen.', page: { layout: 'gallery' } },\n  { room: 'knowledge-nook', id: 'story-ledger', name: 'Story Ledger', blurb: 'Audits of old TV.', page: null },\n  { room: 'sarah-jrs-den', id: 'blog', name: 'Blog', blurb: 'Little notes from the Den.', page: { layout: 'list' } },\n  { room: 'sarah-jrs-den', id: 'daryls-adventures', name: \"Daryl's Adventures\", blurb: \"Daryl's world, one adventure at a time.\", page: { layout: 'gallery' } },\n",
"  { room: 'knowledge-nook', id: 'research', name: 'Research', blurb: 'A space to test things out.', page: { layout: 'list' } },\n  { room: 'knowledge-nook', id: 'book-to-screen', name: 'Book to Screen', blurb: 'Books that made it to the screen.', page: { layout: 'gallery' } },\n  { room: 'knowledge-nook', id: 'story-ledger', name: 'Story Ledger', blurb: 'Audits of old TV.', page: { layout: 'custom' } },\n  { room: 'sarah-jrs-den', id: 'blog', name: 'Blog', blurb: 'Little notes from the Den.', page: { layout: 'list' } },\n  { room: 'sarah-jrs-den', id: 'daryls-adventures', name: \"Daryl's Adventures\", blurb: \"Daryl's world, one adventure at a time.\", page: { layout: 'gallery' } },\n"
],
[
"export function doorAreas(room) {\n  const areas = {}\n  for (const d of doorsOf(room)) if (d.page) areas[d.id] = { name: d.name, blurb: d.blurb, layout: d.page.layout, tags: [d.id] }\n  return areas\n}\n",
"export function doorAreas(room) {\n  const areas = {}\n  for (const d of doorsOf(room)) if (d.page && d.page.layout !== 'custom') areas[d.id] = { name: d.name, blurb: d.blurb, layout: d.page.layout, tags: [d.id] }\n  return areas\n}\n"
]
],
"src/rooms/RoomRoutes.jsx": [
[
"import DoorGate from '../doors/DoorGate'\nimport { doorAreas, findDoor } from '../doors/doorsData'\nimport './roompages.css'\n\n",
"import DoorGate from '../doors/DoorGate'\nimport { doorAreas, findDoor } from '../doors/doorsData'\nimport StoryLedgerPage from '../ledger/StoryLedgerPage'\nimport './roompages.css'\n\n"
],
[
"}\n\n// One page under a room. If it is the page behind a door, the door's gate decides who sees it.\nfunction AreaRoute({ room }) {\n  const { area } = useParams()\n  const areas = { ...ROOMS[room].areas, ...doorAreas(room) }\n  const page = <RoomAreaPage room={room} areas={areas} />\n  const door = findDoor(room, area)\n  return door && door.page ? <DoorGate room={room} door={door.id}>{page}</DoorGate> : page\n}\n",
"}\n\n// The pages behind a door that have their own design, by \"room/door\". (The door is listed in src/doors/doorsData.js with layout 'custom'.)\nconst CUSTOM_PAGES = { 'knowledge-nook/story-ledger': StoryLedgerPage }\n\n// One page under a room. If it is the page behind a door, the door's gate decides who sees it.\nfunction AreaRoute({ room }) {\n  const { area } = useParams()\n  const areas = { ...ROOMS[room].areas, ...doorAreas(room) }\n  const page = <RoomAreaPage room={room} areas={areas} />\n  const door = findDoor(room, area)\n  const Custom = door && door.page && door.page.layout === 'custom' ? CUSTOM_PAGES[`${room}/${door.id}`] : null\n  if (Custom) return <DoorGate room={room} door={door.id}><Custom /></DoorGate>\n  return door && door.page ? <DoorGate room={room} door={door.id}>{page}</DoorGate> : page\n}\n"
]
]
}''')
NEW_FILES = ["sql/suggestions.sql", "src/suggest/suggestRules.js", "src/suggest/suggestApi.js", "src/suggest/useUser.js", "src/suggest/SuggestPanel.jsx", "src/suggest/suggest.css", "src/admin/AdminSuggestions.jsx", "src/ledger/StoryLedgerPage.jsx", "src/ledger/ledgerData.js", "src/ledger/ledger.css"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/styles/pages.css"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the restyled pages update first (starscapes-restyle-pages-17oct.zip). This file from it is missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-suggest-ledger-17oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-suggest-ledger').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
