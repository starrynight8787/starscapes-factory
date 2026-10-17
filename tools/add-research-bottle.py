#!/usr/bin/env python3
"""Renames the Nook's More shelves door to Research (with a page ready), and gives Explorer's Bay's message in a bottle its own padlock.

Run it from the project folder, AFTER unzipping starscapes-research-bottle-17oct.zip into it:   python3 tools/add-research-bottle.py

What it does: it makes exact edits to four files that already exist, and retires the two old More shelves pictures (they are renamed, with a copy kept), so the Nook's door is Research and the bottle is for paying visitors.
  src/rooms/roomsGeometry.js, src/rooms/roomsData.js, src/doors/doorsData.js, public/scenes/knowledge-nook/geometry.json

How it keeps you safe:
  - It checks ALL four files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-research-bottle.
  - It is safe to run twice: a file already done is left alone.
  - The new files (public/scenes/knowledge-nook/item-research.svg, public/scenes/knowledge-nook/item-research-open.svg, public/scenes/explorers-bay/item-coming-soon-open.svg) come in the zip itself.
"""
import json
import pathlib
import sys

REMOVE = ['public/scenes/knowledge-nook/item-more-shelves.svg', 'public/scenes/knowledge-nook/item-more-shelves-open.svg']
PATCH = json.loads(r'''{
"src/rooms/roomsGeometry.js": [
[
"    'book-club': { cx: 290, cy: 214, w: 132, h: 190 },\n    'come-read-with-me': { cx: 163, cy: 636, w: 66, h: 172 },\n    'more-shelves': { cx: 233, cy: 649, w: 66, h: 146 },\n    'book-to-screen': { cx: 570, cy: 674, w: 200, h: 96 },\n    'story-ledger': { cx: 901, cy: 630.5, w: 176, h: 188 },\n",
"    'book-club': { cx: 290, cy: 214, w: 132, h: 190 },\n    'come-read-with-me': { cx: 163, cy: 636, w: 66, h: 172 },\n    'research': { cx: 233, cy: 649, w: 66, h: 146 },\n    'book-to-screen': { cx: 570, cy: 674, w: 200, h: 96 },\n    'story-ledger': { cx: 901, cy: 630.5, w: 176, h: 188 },\n"
]
],
"src/rooms/roomsData.js": [
[
"      { ...piece('knowledge-nook', 'book-club'), id: 'book-club', name: 'Book Club', blurb: 'Reading notes and reviews.', kind: 'locked', lock: 'opening soon', labelAt: [286, 56] },\n      { ...piece('knowledge-nook', 'come-read-with-me'), id: 'come-read-with-me', name: 'Come Read With Me', blurb: 'Read alongside me. Starting soon.', kind: 'locked', lock: 'not started yet', labelAt: [400, 540] },\n      { ...piece('knowledge-nook', 'more-shelves'), id: 'more-shelves', name: 'More shelves', blurb: 'More shelves are on their way.', kind: 'locked', lock: 'opening soon', labelAt: [233, 734] },\n      { ...piece('knowledge-nook', 'book-to-screen'), id: 'book-to-screen', name: 'Book to Screen', blurb: 'Books that made it to the screen.', kind: 'locked', lock: 'opening soon', labelAt: [570, 734] },\n      { ...piece('knowledge-nook', 'story-ledger'), id: 'story-ledger', name: 'Story Ledger', blurb: 'Audits of old TV.', kind: 'locked', lock: 'opening soon', labelAt: [901, 734] },\n",
"      { ...piece('knowledge-nook', 'book-club'), id: 'book-club', name: 'Book Club', blurb: 'Reading notes and reviews.', kind: 'locked', lock: 'opening soon', labelAt: [286, 56] },\n      { ...piece('knowledge-nook', 'come-read-with-me'), id: 'come-read-with-me', name: 'Come Read With Me', blurb: 'Read alongside me. Starting soon.', kind: 'locked', lock: 'not started yet', labelAt: [400, 540] },\n      { ...piece('knowledge-nook', 'research'), id: 'research', name: 'Research', blurb: 'A space to test things out.', kind: 'locked', lock: 'opening soon', labelAt: [233, 734] },\n      { ...piece('knowledge-nook', 'book-to-screen'), id: 'book-to-screen', name: 'Book to Screen', blurb: 'Books that made it to the screen.', kind: 'locked', lock: 'opening soon', labelAt: [570, 734] },\n      { ...piece('knowledge-nook', 'story-ledger'), id: 'story-ledger', name: 'Story Ledger', blurb: 'Audits of old TV.', kind: 'locked', lock: 'opening soon', labelAt: [901, 734] },\n"
]
],
"src/doors/doorsData.js": [
[
"// page: { layout } means a plain page of the room's posts that carry this door's tag, as a list or a gallery. It exists now, so the door can be opened.\n// page: null means the page has not been built yet (it needs its own design), so the door cannot be opened until it is.\n// ghost: true means the door's picture is a dotted outline, which is its \"not yet\" look. Opened as it is, it would still look unfinished.\n//\n// The page for a door is at /<room>/<door id>, and the posts on it are the room's posts tagged with the door's id.\nexport const DOORS = [\n  { room: 'idea-hatchery', id: 'come-study-with-me', name: 'Come Study With Me', blurb: 'Study alongside me.', page: { layout: 'list' }, ghost: true },\n  { room: 'leadership-lounge', id: 'free-ebook', name: 'Free Ebook', blurb: 'Download it free.', page: null },\n  { room: 'explorers-bay', id: 'coming-soon', name: 'Something New', blurb: 'A message has arrived.', page: null, ghost: true },\n  { room: 'knowledge-nook', id: 'book-club', name: 'Book Club', blurb: 'Reading notes and reviews.', page: null },\n  { room: 'knowledge-nook', id: 'come-read-with-me', name: 'Come Read With Me', blurb: 'Read alongside me.', page: { layout: 'list' } },\n  { room: 'knowledge-nook', id: 'more-shelves', name: 'More shelves', blurb: 'More shelves have arrived.', page: null },\n  { room: 'knowledge-nook', id: 'book-to-screen', name: 'Book to Screen', blurb: 'Books that made it to the screen.', page: { layout: 'gallery' } },\n  { room: 'knowledge-nook', id: 'story-ledger', name: 'Story Ledger', blurb: 'Audits of old TV.', page: null },\n",
"// page: { layout } means a plain page of the room's posts that carry this door's tag, as a list or a gallery. It exists now, so the door can be opened.\n// page: null means the page has not been built yet (it needs its own design), so the door cannot be opened until it is.\n// paid: true means the page, once it is built, is for pass holders only (testers and teasers for the travel work). The bottle is drawn with its own padlock.\n// ghost: true means the door's picture is a dotted outline, which is its \"not yet\" look. Opened as it is, it would still look unfinished.\n//\n// The page for a door is at /<room>/<door id>, and the posts on it are the room's posts tagged with the door's id.\nexport const DOORS = [\n  { room: 'idea-hatchery', id: 'come-study-with-me', name: 'Come Study With Me', blurb: 'Study alongside me.', page: { layout: 'list' }, ghost: true },\n  { room: 'leadership-lounge', id: 'free-ebook', name: 'Free Ebook', blurb: 'Download it free.', page: null },\n  { room: 'explorers-bay', id: 'coming-soon', name: 'Something New', blurb: 'A message has arrived.', paid: true, page: null },\n  { room: 'knowledge-nook', id: 'book-club', name: 'Book Club', blurb: 'Reading notes and reviews.', page: null },\n  { room: 'knowledge-nook', id: 'come-read-with-me', name: 'Come Read With Me', blurb: 'Read alongside me.', page: { layout: 'list' } },\n  { room: 'knowledge-nook', id: 'research', name: 'Research', blurb: 'A space to test things out.', page: { layout: 'list' } },\n  { room: 'knowledge-nook', id: 'book-to-screen', name: 'Book to Screen', blurb: 'Books that made it to the screen.', page: { layout: 'gallery' } },\n  { room: 'knowledge-nook', id: 'story-ledger', name: 'Story Ledger', blurb: 'Audits of old TV.', page: null },\n"
]
],
"public/scenes/knowledge-nook/geometry.json": [
[
"  \"h\": 172\n },\n \"more-shelves\": {\n  \"cx\": 233,\n  \"cy\": 649,\n",
"  \"h\": 172\n },\n \"research\": {\n  \"cx\": 233,\n  \"cy\": 649,\n"
]
]
}''')
NEW_FILES = ["public/scenes/knowledge-nook/item-research.svg", "public/scenes/knowledge-nook/item-research-open.svg", "public/scenes/explorers-bay/item-coming-soon-open.svg"]

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
    print('Unzip starscapes-research-bottle-17oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-research-bottle').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
retired = []
for rel in REMOVE:
    old_picture = root / rel
    if old_picture.exists():
        old_picture.rename(pathlib.Path(str(old_picture) + '.before-research-bottle'))
        retired.append(rel)
        print('retired       ' + rel + '  (renamed: the pictures now live under the name research)')
for rel in done:
    print('already done  ' + rel)
if not plan and not retired:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
