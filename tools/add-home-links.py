#!/usr/bin/env python3
"""Adds the "<- Home" link to the front pages of the Art Loft and the Factory Floor.

Run it from the project folder:   python3 tools/add-home-links.py

It changes only two lines in each page (one to bring the link in, one to put it on the page), and it is safe to run twice.
If a page does not look the way it expects, it says so and changes NOTHING in that page.
"""
import pathlib
import re
import sys

PAGES = [
    ('src/artloft/ArtLoftScene.jsx', '<main className="al">', '      <HomeLink className="al-home" />', "import HomeLink from '../components/HomeLink'"),
    ('src/factoryfloor/FactoryFloorHome.jsx', '<div className="ff-inner">', '        <HomeLink className="ff-home" />', "import HomeLink from '../components/HomeLink'"),
]

failed = False
for path, anchor, line, import_line in PAGES:
    p = pathlib.Path(path)
    if not p.exists():
        print('NOT FOUND   %s (run this from the project folder)' % path)
        failed = True
        continue
    text = p.read_text(encoding='utf-8')
    if 'HomeLink' in text:
        print('already done  %s' % path)
        continue
    if text.count(anchor) != 1:
        print('NOT CHANGED   %s: expected to find %s once, found it %d times' % (path, anchor, text.count(anchor)))
        failed = True
        continue
    first_import = re.search(r"^import[\s\S]*?from\s+'[^']+'\s*;?\n", text, re.M)
    if not first_import:
        print('NOT CHANGED   %s: could not find where its imports end' % path)
        failed = True
        continue
    text = text[:first_import.end()] + import_line + '\n' + text[first_import.end():]
    text = text.replace(anchor, anchor + '\n' + line, 1)
    p.write_text(text, encoding='utf-8')
    print('added the link  %s' % path)

if not (pathlib.Path('src/components/HomeLink.jsx').exists()):
    print('\nWARNING: src/components/HomeLink.jsx is missing. Unzip starscapes-home-link.zip first.')
    failed = True
sys.exit(1 if failed else 0)
