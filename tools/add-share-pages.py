#!/usr/bin/env python3
"""Adds page titles, descriptions and share pictures to the site.

Run it from the project folder, AFTER unzipping starscapes-share-pages-17oct.zip into it:   python3 tools/add-share-pages.py

What it does: it makes small, exact edits to four files that already exist, so the page shell has a proper title, description and site icon, the build writes each page's own copy with its own words and share picture, the tab title follows you around the site, and a single post sets its own title.
  index.html, package.json, src/App.jsx, src/pages/PostPage.jsx

How it keeps you safe:
  - It checks ALL four files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-share-pages.
  - It is safe to run twice: a file already done is left alone.
  - The new files (src/data/pageMeta.js, src/components/RouteTitle.jsx, scripts/shareHead.mjs, scripts/make-share-pages.mjs, public/robots.txt, public/share/site.png) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"index.html": [
[
"    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title>My Blog</title>\n  </head>\n  <body>\n",
"    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title>Starscapes Factory: where imagination takes shape</title>\n    <meta name=\"description\" content=\"A cosy, creative hub for stories, art, ideas and curiosity. Step inside and pick a room: writing, prints, travel, leadership and more.\" />\n    <meta name=\"theme-color\" content=\"#14306A\" />\n    <link rel=\"icon\" type=\"image/png\" href=\"/icons/rooms/factory-floor.png\" />\n    <link rel=\"apple-touch-icon\" href=\"/icons/rooms/factory-floor.png\" />\n  </head>\n  <body>\n"
]
],
"package.json": [
[
"  \"scripts\": {\n    \"dev\": \"vite\",\n    \"build\": \"vite build\",\n    \"preview\": \"vite preview\"\n  },\n",
"  \"scripts\": {\n    \"dev\": \"vite\",\n    \"build\": \"vite build && node scripts/make-share-pages.mjs\",\n    \"preview\": \"vite preview\"\n  },\n"
]
],
"src/App.jsx": [
[
"import Navbar from './components/Navbar'\nimport SkipLink from './components/SkipLink'\nimport ProtectedRoute from './components/ProtectedRoute'\nimport Home from './pages/Home'\n",
"import Navbar from './components/Navbar'\nimport SkipLink from './components/SkipLink'\nimport RouteTitle from './components/RouteTitle'\nimport ProtectedRoute from './components/ProtectedRoute'\nimport Home from './pages/Home'\n"
],
[
"    <>\n      <SkipLink />\n      <Navbar session={session} />\n      <div className=\"container\" id=\"main-content\" tabIndex={-1}>\n",
"    <>\n      <SkipLink />\n      <RouteTitle />\n      <Navbar session={session} />\n      <div className=\"container\" id=\"main-content\" tabIndex={-1}>\n"
]
],
"src/pages/PostPage.jsx": [
[
"import { supabase } from '../supabaseClient'\nimport BackToPosts from '../components/BackToPosts'\nimport '../styles/articles.css'\n\n",
"import { supabase } from '../supabaseClient'\nimport BackToPosts from '../components/BackToPosts'\nimport useTitle from './useTitle'\nimport '../styles/articles.css'\n\n"
],
[
"  const [error, setError] = useState(null)\n  const [deleting, setDeleting] = useState(false)\n\n  useEffect(() => {\n",
"  const [error, setError] = useState(null)\n  const [deleting, setDeleting] = useState(false)\n  useTitle(post ? post.title : 'Post') // the tab, and a search result, say which post this is\n\n  useEffect(() => {\n"
]
]
}''')
NEW_FILES = ["src/data/pageMeta.js", "src/components/RouteTitle.jsx", "scripts/shareHead.mjs", "scripts/make-share-pages.mjs", "public/robots.txt", "public/share/site.png"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-share-pages-17oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-share-pages').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
