#!/usr/bin/env python3
"""Builds the new Leadership Blog page.

Run it from the project folder, AFTER unzipping starscapes-leadership-blog-18oct.zip into it:   python3 tools/add-leadership-blog.py

What it does: it makes exact edits to two files that already exist: the room routes, so the page appears at /leadership-lounge/blog, and the room data, which renames the area.
  src/rooms/RoomRoutes.jsx, src/rooms/roomsData.js

How it keeps you safe:
  - It checks ALL two files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-leadership-blog.
  - It is safe to run twice: a file already done is left alone.
  - The new files (src/leadership/leadershipData.js, src/leadership/leadershipRules.js, src/leadership/LeadershipBlogPage.jsx, src/leadership/leadership.css) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/rooms/RoomRoutes.jsx": [
[
"import FreeEbookPage from '../ebook/FreeEbookPage'\nimport BookClubPage from '../bookclub/BookClubPage'\nimport './roompages.css'\n\n",
"import FreeEbookPage from '../ebook/FreeEbookPage'\nimport BookClubPage from '../bookclub/BookClubPage'\nimport LeadershipBlogPage from '../leadership/LeadershipBlogPage'\nimport './roompages.css'\n\n"
],
[
"}\n\n// One page under a room. If it is the page behind a door, the door's gate decides who sees it.\nfunction AreaRoute({ room }) {\n  const { area } = useParams()\n  const areas = { ...ROOMS[room].areas, ...doorAreas(room) }\n  const page = <RoomAreaPage room={room} areas={areas} />\n  const door = findDoor(room, area)\n  const Custom = door && door.page && door.page.layout === 'custom' ? CUSTOM_PAGES[`${room}/${door.id}`] : null\n  if (Custom) return <DoorGate room={room} door={door.id}><Custom /></DoorGate>\n",
"}\n\n// Pages with their own design that are always open (not behind a door), by \"room/page\".\nconst CUSTOM_AREAS = {\n  'leadership-lounge/blog': LeadershipBlogPage,\n}\n\n// One page under a room. If it is the page behind a door, the door's gate decides who sees it.\nfunction AreaRoute({ room }) {\n  const { area } = useParams()\n  const areas = { ...ROOMS[room].areas, ...doorAreas(room) }\n  const page = <RoomAreaPage room={room} areas={areas} />\n  const door = findDoor(room, area)\n  const Own = !door ? CUSTOM_AREAS[`${room}/${area}`] : null\n  if (Own) return <Own />\n  const Custom = door && door.page && door.page.layout === 'custom' ? CUSTOM_PAGES[`${room}/${door.id}`] : null\n  if (Custom) return <DoorGate room={room} door={door.id}><Custom /></DoorGate>\n"
]
],
"src/rooms/roomsData.js": [
[
"    areas: {\n      'leading-from-the-middle': { name: 'Leading from the Middle', blurb: 'The idea behind everything in this room.', layout: 'list', tags: ['leading-from-the-middle'] },\n      blog: { name: 'Blog', blurb: 'Notes on leading from where you are.', layout: 'list', tags: null },\n    },\n  },\n",
"    areas: {\n      'leading-from-the-middle': { name: 'Leading from the Middle', blurb: 'The idea behind everything in this room.', layout: 'list', tags: ['leading-from-the-middle'] },\n      blog: { name: 'Leadership Blog', blurb: 'Notes on leading from where you are.', layout: 'list', tags: null },\n    },\n  },\n"
]
]
}''')
NEW_FILES = ["src/leadership/leadershipData.js", "src/leadership/leadershipRules.js", "src/leadership/LeadershipBlogPage.jsx", "src/leadership/leadership.css"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/home/HomeSections.jsx", "src/data/siteSettings.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the home page update (and the tester kit) first. These files from earlier updates are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-leadership-blog-18oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-leadership-blog').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
