#!/usr/bin/env python3
"""Adds the YouTube Series page and the Free Ebook pages behind their doors.

Run it from the project folder, AFTER unzipping starscapes-ebook-youtube-17oct.zip into it:   python3 tools/add-ebook-youtube.py

What it does: it makes exact edits to two files that already exist, so the Den's YouTube Series door and the Lounge's Free Ebook door each have their own page.
  src/doors/doorsData.js, src/rooms/RoomRoutes.jsx

How it keeps you safe:
  - It checks ALL two files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-ebook-youtube.
  - It is safe to run twice: a file already done is left alone.
  - The new files (lib/youtubeFeed.js, lib/ebookSignup.js, api/youtube-series.js, api/youtube-thumb.js, api/ebook-signup.js, sql/ebook-signups.sql, src/den/YouTubeSeriesPage.jsx, src/den/youtube.css, src/ebook/ebookConfig.js, src/ebook/ebookRules.js, src/ebook/FreeEbookPage.jsx, src/ebook/ebook.css) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/doors/doorsData.js": [
[
"export const DOORS = [\n  { room: 'idea-hatchery', id: 'come-study-with-me', name: 'Come Study With Me', blurb: 'Study alongside me.', page: { layout: 'list' }, ghost: true },\n  { room: 'leadership-lounge', id: 'free-ebook', name: 'Free Ebook', blurb: 'Download it free.', page: null },\n  { room: 'explorers-bay', id: 'coming-soon', name: 'Something New', blurb: 'A message has arrived.', paid: true, page: null },\n  { room: 'knowledge-nook', id: 'book-club', name: 'Book Club', blurb: 'Reading notes and reviews.', page: null },\n",
"export const DOORS = [\n  { room: 'idea-hatchery', id: 'come-study-with-me', name: 'Come Study With Me', blurb: 'Study alongside me.', page: { layout: 'list' }, ghost: true },\n  { room: 'leadership-lounge', id: 'free-ebook', name: 'Free Ebook', blurb: 'Download it free.', page: { layout: 'custom' } },\n  { room: 'explorers-bay', id: 'coming-soon', name: 'Something New', blurb: 'A message has arrived.', paid: true, page: null },\n  { room: 'knowledge-nook', id: 'book-club', name: 'Book Club', blurb: 'Reading notes and reviews.', page: null },\n"
],
[
"  { room: 'sarah-jrs-den', id: 'daryls-adventures', name: \"Daryl's Adventures\", blurb: \"Daryl's world, one adventure at a time.\", page: { layout: 'gallery' } },\n  { room: 'sarah-jrs-den', id: 'books', name: 'Books', blurb: 'Stories to read together.', page: { layout: 'gallery' } },\n  { room: 'sarah-jrs-den', id: 'youtube-series', name: 'YouTube Series', blurb: 'Little adventures to watch.', page: null },\n]\n\n",
"  { room: 'sarah-jrs-den', id: 'daryls-adventures', name: \"Daryl's Adventures\", blurb: \"Daryl's world, one adventure at a time.\", page: { layout: 'gallery' } },\n  { room: 'sarah-jrs-den', id: 'books', name: 'Books', blurb: 'Stories to read together.', page: { layout: 'gallery' } },\n  { room: 'sarah-jrs-den', id: 'youtube-series', name: 'YouTube Series', blurb: 'Little adventures to watch.', page: { layout: 'custom' } },\n]\n\n"
]
],
"src/rooms/RoomRoutes.jsx": [
[
"import { doorAreas, findDoor } from '../doors/doorsData'\nimport StoryLedgerPage from '../ledger/StoryLedgerPage'\nimport './roompages.css'\n\n",
"import { doorAreas, findDoor } from '../doors/doorsData'\nimport StoryLedgerPage from '../ledger/StoryLedgerPage'\nimport YouTubeSeriesPage from '../den/YouTubeSeriesPage'\nimport FreeEbookPage from '../ebook/FreeEbookPage'\nimport './roompages.css'\n\n"
],
[
"\n// The pages behind a door that have their own design, by \"room/door\". (The door is listed in src/doors/doorsData.js with layout 'custom'.)\nconst CUSTOM_PAGES = { 'knowledge-nook/story-ledger': StoryLedgerPage }\n\n// One page under a room. If it is the page behind a door, the door's gate decides who sees it.\n",
"\n// The pages behind a door that have their own design, by \"room/door\". (The door is listed in src/doors/doorsData.js with layout 'custom'.)\nconst CUSTOM_PAGES = {\n  'knowledge-nook/story-ledger': StoryLedgerPage,\n  'sarah-jrs-den/youtube-series': YouTubeSeriesPage,\n  'leadership-lounge/free-ebook': FreeEbookPage,\n}\n\n// One page under a room. If it is the page behind a door, the door's gate decides who sees it.\n"
]
]
}''')
NEW_FILES = ["lib/youtubeFeed.js", "lib/ebookSignup.js", "api/youtube-series.js", "api/youtube-thumb.js", "api/ebook-signup.js", "sql/ebook-signups.sql", "src/den/YouTubeSeriesPage.jsx", "src/den/youtube.css", "src/ebook/ebookConfig.js", "src/ebook/ebookRules.js", "src/ebook/FreeEbookPage.jsx", "src/ebook/ebook.css"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/suggest/SuggestPanel.jsx", "src/ledger/StoryLedgerPage.jsx"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the suggest and ledger update first (starscapes-suggest-ledger-17oct.zip). These files from it are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-ebook-youtube-17oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-ebook-youtube').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
