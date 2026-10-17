#!/usr/bin/env python3
"""Adds the Book Club page, with its bookshelf, reading goal and Come read with me button, and the Books admin tool.

Run it from the project folder, AFTER unzipping starscapes-book-club-17oct.zip into it:   python3 tools/add-book-club.py

What it does: it makes exact edits to five files that already exist, so the Book Club door has its own page, the admin console has a Books tool at /admin/books, and that page is kept out of search results.
  src/App.jsx, src/admin/adminTools.js, src/data/pageMeta.js, src/doors/doorsData.js, src/rooms/RoomRoutes.jsx

How it keeps you safe:
  - It checks ALL five files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-book-club.
  - It is safe to run twice: a file already done is left alone.
  - The new files (sql/books.sql, src/bookclub/bookRules.js, src/bookclub/bookApi.js, src/bookclub/bookClubData.js, src/bookclub/BookClubPage.jsx, src/bookclub/bookclub.css, src/admin/AdminBooks.jsx) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/App.jsx": [
[
"import OpenDoors from './admin/OpenDoors'\nimport AdminSuggestions from './admin/AdminSuggestions'\nimport ArtLoftRoutes from './artloft/ArtLoftRoutes'\nimport ForgotPassword from './pages/ForgotPassword'\n",
"import OpenDoors from './admin/OpenDoors'\nimport AdminSuggestions from './admin/AdminSuggestions'\nimport AdminBooks from './admin/AdminBooks'\nimport ArtLoftRoutes from './artloft/ArtLoftRoutes'\nimport ForgotPassword from './pages/ForgotPassword'\n"
],
[
"<Route path=\"/admin/doors\" element={ <ProtectedRoute session={session}> <OpenDoors session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/suggestions\" element={ <ProtectedRoute session={session}> <AdminSuggestions session={session} /> </ProtectedRoute> } />\n          <Route\n            path=\"/new\"\n",
"<Route path=\"/admin/doors\" element={ <ProtectedRoute session={session}> <OpenDoors session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/suggestions\" element={ <ProtectedRoute session={session}> <AdminSuggestions session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/books\" element={ <ProtectedRoute session={session}> <AdminBooks session={session} /> </ProtectedRoute> } />\n          <Route\n            path=\"/new\"\n"
]
],
"src/admin/adminTools.js": [
[
"  { group: 'Members', name: 'Promotions', blurb: 'Discount codes for passes and prints, and the half-price first year.' },\n  { group: 'Rooms', name: 'Open a door', to: '/admin/doors', blurb: 'Choose which closed doors in each room are open to visitors.' },\n  { group: 'Rooms', name: 'Suggestions', to: '/admin/suggestions', blurb: 'Switch the suggest and vote boxes on or off, and approve what visitors suggest.' },\n]\n",
"  { group: 'Members', name: 'Promotions', blurb: 'Discount codes for passes and prints, and the half-price first year.' },\n  { group: 'Rooms', name: 'Open a door', to: '/admin/doors', blurb: 'Choose which closed doors in each room are open to visitors.' },\n  { group: 'Rooms', name: 'Books', to: '/admin/books', blurb: 'Add the books you are reading, have read, or will read next, and set the year\\'s reading goal and theme.' },\n  { group: 'Rooms', name: 'Suggestions', to: '/admin/suggestions', blurb: 'Switch the suggest and vote boxes on or off, and approve what visitors suggest.' },\n]\n"
]
],
"src/data/pageMeta.js": [
[
"  '/admin': { title: 'Admin', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/doors': { title: 'Open a door', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/suggestions': { title: 'Suggestions', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/art-loft/admin': { title: 'Manage prints', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n",
"  '/admin': { title: 'Admin', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/doors': { title: 'Open a door', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/books': { title: 'Books', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/suggestions': { title: 'Suggestions', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/art-loft/admin': { title: 'Manage prints', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n"
]
],
"src/doors/doorsData.js": [
[
"  { room: 'leadership-lounge', id: 'free-ebook', name: 'Free Ebook', blurb: 'Download it free.', page: { layout: 'custom' } },\n  { room: 'explorers-bay', id: 'coming-soon', name: 'Something New', blurb: 'A message has arrived.', paid: true, page: null },\n  { room: 'knowledge-nook', id: 'book-club', name: 'Book Club', blurb: 'Reading notes and reviews.', page: null },\n  { room: 'knowledge-nook', id: 'come-read-with-me', name: 'Come Read With Me', blurb: 'Read alongside me.', page: { layout: 'list' } },\n  { room: 'knowledge-nook', id: 'research', name: 'Research', blurb: 'A space to test things out.', page: { layout: 'list' } },\n",
"  { room: 'leadership-lounge', id: 'free-ebook', name: 'Free Ebook', blurb: 'Download it free.', page: { layout: 'custom' } },\n  { room: 'explorers-bay', id: 'coming-soon', name: 'Something New', blurb: 'A message has arrived.', paid: true, page: null },\n  { room: 'knowledge-nook', id: 'book-club', name: 'Book Club', blurb: 'Reading notes and reviews.', page: { layout: 'custom' } },\n  { room: 'knowledge-nook', id: 'come-read-with-me', name: 'Come Read With Me', blurb: 'Read alongside me.', page: { layout: 'list' } },\n  { room: 'knowledge-nook', id: 'research', name: 'Research', blurb: 'A space to test things out.', page: { layout: 'list' } },\n"
]
],
"src/rooms/RoomRoutes.jsx": [
[
"import YouTubeSeriesPage from '../den/YouTubeSeriesPage'\nimport FreeEbookPage from '../ebook/FreeEbookPage'\nimport './roompages.css'\n\n",
"import YouTubeSeriesPage from '../den/YouTubeSeriesPage'\nimport FreeEbookPage from '../ebook/FreeEbookPage'\nimport BookClubPage from '../bookclub/BookClubPage'\nimport './roompages.css'\n\n"
],
[
"  'sarah-jrs-den/youtube-series': YouTubeSeriesPage,\n  'leadership-lounge/free-ebook': FreeEbookPage,\n}\n\n",
"  'sarah-jrs-den/youtube-series': YouTubeSeriesPage,\n  'leadership-lounge/free-ebook': FreeEbookPage,\n  'knowledge-nook/book-club': BookClubPage,\n}\n\n"
]
]
}''')
NEW_FILES = ["sql/books.sql", "src/bookclub/bookRules.js", "src/bookclub/bookApi.js", "src/bookclub/bookClubData.js", "src/bookclub/BookClubPage.jsx", "src/bookclub/bookclub.css", "src/admin/AdminBooks.jsx"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/ebook/FreeEbookPage.jsx", "src/ledger/StoryLedgerPage.jsx"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the ebook and YouTube update first (starscapes-ebook-youtube-17oct.zip). These files from it are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-book-club-17oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-book-club').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
