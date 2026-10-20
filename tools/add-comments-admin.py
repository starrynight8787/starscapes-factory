#!/usr/bin/env python3
"""Builds the Manage comments page for the admin (/admin/comments) and its tile. Nothing changes on the server or in the database.

Run it from the project folder, AFTER unzipping starscapes-comments-admin-20oct.zip into it:   python3 tools/add-comments-admin.py

What it does: it makes exact edits to four files that already exist (the app's routes, the admin tile icons, the admin tool list and the page titles) and adds five new files from the zip (the unzip itself also adds three tests).
  src/App.jsx, src/admin/AdminConsole.jsx, src/admin/adminTools.js, src/data/pageMeta.js

How it keeps you safe:
  - It checks ALL four files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-comments-admin.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-COMMENTS-ADMIN.txt, src/admin/AdminComments.jsx, src/admin/admincomments.css, src/admin/commentsAdminApi.js, src/admin/commentsRules.js) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/App.jsx": [
[
"import OpenDoors from './admin/OpenDoors'\nimport AdminSuggestions from './admin/AdminSuggestions'\nimport AdminBooks from './admin/AdminBooks'\nimport AdminStories from './admin/AdminStories'\n",
"import OpenDoors from './admin/OpenDoors'\nimport AdminSuggestions from './admin/AdminSuggestions'\nimport AdminComments from './admin/AdminComments'\nimport AdminBooks from './admin/AdminBooks'\nimport AdminStories from './admin/AdminStories'\n"
],
[
"<Route path=\"/admin/doors\" element={ <ProtectedRoute session={session}> <OpenDoors session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/suggestions\" element={ <ProtectedRoute session={session}> <AdminSuggestions session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/books\" element={ <ProtectedRoute session={session}> <AdminBooks session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/stories\" element={ <ProtectedRoute session={session}> <AdminStories session={session} /> </ProtectedRoute> } />\n",
"<Route path=\"/admin/doors\" element={ <ProtectedRoute session={session}> <OpenDoors session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/suggestions\" element={ <ProtectedRoute session={session}> <AdminSuggestions session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/comments\" element={ <ProtectedRoute session={session}> <AdminComments session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/books\" element={ <ProtectedRoute session={session}> <AdminBooks session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/stories\" element={ <ProtectedRoute session={session}> <AdminStories session={session} /> </ProtectedRoute> } />\n"
]
],
"src/admin/AdminConsole.jsx": [
[
"  hub: <><circle cx=\"12\" cy=\"12\" r=\"3\" /><path d=\"M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1\" /></>,\n  originals: <><rect x=\"4\" y=\"4\" width=\"16\" height=\"13\" rx=\"1.5\" /><path d=\"M6 20l3-3M18 20l-3-3M4 14l4-4 4 4 3-3 5 5\" /></>,\n  passes: <><rect x=\"3\" y=\"6\" width=\"18\" height=\"12\" rx=\"2\" /><path d=\"M3 10h18M7 15h4\" /></>,\n  promo: <><path d=\"M3 12V4h8l10 10-8 8z\" /><circle cx=\"7.5\" cy=\"8.5\" r=\"1.2\" /></>,\n",
"  hub: <><circle cx=\"12\" cy=\"12\" r=\"3\" /><path d=\"M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1\" /></>,\n  originals: <><rect x=\"4\" y=\"4\" width=\"16\" height=\"13\" rx=\"1.5\" /><path d=\"M6 20l3-3M18 20l-3-3M4 14l4-4 4 4 3-3 5 5\" /></>,\n  comments: <><path d=\"M4 5h16v11H9l-5 4z\" /><path d=\"M8 9h8M8 12h5\" /></>,\n  passes: <><rect x=\"3\" y=\"6\" width=\"18\" height=\"12\" rx=\"2\" /><path d=\"M3 10h18M7 15h4\" /></>,\n  promo: <><path d=\"M3 12V4h8l10 10-8 8z\" /><circle cx=\"7.5\" cy=\"8.5\" r=\"1.2\" /></>,\n"
]
],
"src/admin/adminTools.js": [
[
"  { group: 'Rooms', name: 'Stories', to: '/admin/stories', blurb: 'Add a story, say which posts are its chapters, and mark a story finished.', icon: 'stories' },\n  { group: 'Rooms', name: 'Suggestions', to: '/admin/suggestions', blurb: 'Switch the suggest and vote boxes on or off, and approve what visitors suggest.', icon: 'ideas' },\n]\n",
"  { group: 'Rooms', name: 'Stories', to: '/admin/stories', blurb: 'Add a story, say which posts are its chapters, and mark a story finished.', icon: 'stories' },\n  { group: 'Rooms', name: 'Suggestions', to: '/admin/suggestions', blurb: 'Switch the suggest and vote boxes on or off, and approve what visitors suggest.', icon: 'ideas' },\n  { group: 'Rooms', name: 'Manage comments', to: '/admin/comments', blurb: 'Read every comment on the Book Club books, filter by book, and delete one that should not be there.', icon: 'comments' },\n]\n"
]
],
"src/data/pageMeta.js": [
[
"  '/admin': { title: 'Admin', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/doors': { title: 'Open a door', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/home': { title: 'Home page tool', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/posts': { title: 'All posts', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n",
"  '/admin': { title: 'Admin', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/doors': { title: 'Open a door', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/comments': { title: 'Manage comments', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/home': { title: 'Home page tool', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/posts': { title: 'All posts', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n"
]
]
}''')
NEW_FILES = ["INSTALL-COMMENTS-ADMIN.txt", "src/admin/AdminComments.jsx", "src/admin/admincomments.css", "src/admin/commentsAdminApi.js", "src/admin/commentsRules.js"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/admin/AdminStories.jsx", "src/bookclub/bookApi.js", "src/admin/AdminConsole.jsx"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the earlier packages first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-comments-admin-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-comments-admin').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
