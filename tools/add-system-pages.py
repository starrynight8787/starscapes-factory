#!/usr/bin/env python3
"""Puts the new 404 page, error page and loading page into the site.

Run it from the project folder:   python3 tools/add-system-pages.py

It changes four places in src/App.jsx:
  1. brings in the three new pieces,
  2. shows the loading page (not a bare "Loading...") while the site gets ready,
  3. wraps the pages in the error catcher, so a broken page shows the error page and not a blank screen,
  4. adds a last route that shows the 404 page for any address the site does not have.
It is safe to run twice. If App.jsx does not look the way it expects, it says so and changes NOTHING.
"""
import pathlib
import sys

PATH = 'src/App.jsx'
CHANGES = [
    ("import RoomRoutes from './rooms/RoomRoutes'\n",
     "import RoomRoutes from './rooms/RoomRoutes'\nimport NotFound from './pages/NotFound'\nimport PageLoading from './components/PageLoading'\nimport ErrorBoundary from './components/ErrorBoundary'\n"),
    ('  if (loading) return <div className="container">Loading...</div>\n',
     '  if (loading) return <div className="container"><PageLoading /></div>\n'),
    ('        <Routes>\n', '        <ErrorBoundary>\n        <Routes>\n'),
    ('        </Routes>\n', '        </Routes>\n        </ErrorBoundary>\n'),
    ('          <Route path="/explorers-bay/*" element={<RoomRoutes room="explorers-bay" />} />\n',
     '          <Route path="/explorers-bay/*" element={<RoomRoutes room="explorers-bay" />} />\n          <Route path="*" element={<NotFound />} />\n'),
]

p = pathlib.Path(PATH)
if not p.exists():
    print('NOT FOUND  %s (run this from the project folder)' % PATH)
    sys.exit(1)
for needed in ('src/pages/NotFound.jsx', 'src/pages/ErrorPage.jsx', 'src/components/PageLoading.jsx', 'src/components/ErrorBoundary.jsx'):
    if not pathlib.Path(needed).exists():
        print('WARNING: %s is missing. Unzip starscapes-system-pages.zip first. Nothing changed.' % needed)
        sys.exit(1)
text = p.read_text(encoding='utf-8')
if 'ErrorBoundary' in text and 'NotFound' in text and 'PageLoading' in text:
    print('already done  %s' % PATH)
    sys.exit(0)
for old, new in CHANGES:
    if text.count(old) != 1:
        print('NOT CHANGED  %s: expected to find the line below once, found it %d times.\n    %s' % (PATH, text.count(old), old.strip()))
        sys.exit(1)
for old, new in CHANGES:
    text = text.replace(old, new, 1)
p.write_text(text, encoding='utf-8')
print('changed %s: the loading page, the error catcher and the 404 page are in (5 small edits)' % PATH)
