#!/usr/bin/env python3
"""Puts the new room icons beside the room names in the site's menu (the Rooms dropdown and the phone menu).

Run it from the project folder:   python3 tools/add-room-icons.py

It changes three lines in src/components/Navbar.jsx: the line that brings in the old room pictures, and the two places they are used.
It is safe to run twice. If the menu does not look the way it expects, it says so and changes NOTHING.
"""
import pathlib
import sys

PATH = 'src/components/Navbar.jsx'
CHANGES = [
    ("import RoomTile from './RoomTile'", "import RoomIcon from './RoomIcon'"),
    ('<RoomTile slug={c.slug} size={48} />', '<RoomIcon room={c.slug} size={44} />'),
    ('<RoomTile slug={c.slug} size={40} />', '<RoomIcon room={c.slug} size={40} />'),
]

p = pathlib.Path(PATH)
if not p.exists():
    print('NOT FOUND  %s (run this from the project folder)' % PATH)
    sys.exit(1)
if not pathlib.Path('src/components/RoomIcon.jsx').exists():
    print('WARNING: src/components/RoomIcon.jsx is missing. Unzip starscapes-room-icons.zip first. Nothing changed.')
    sys.exit(1)
text = p.read_text(encoding='utf-8')
if 'RoomIcon' in text and 'RoomTile' not in text:
    print('already done  %s' % PATH)
    sys.exit(0)
for old, new in CHANGES:
    if text.count(old) != 1:
        print('NOT CHANGED  %s: expected to find  %s  once, found it %d times.' % (PATH, old, text.count(old)))
        sys.exit(1)
for old, new in CHANGES:
    text = text.replace(old, new, 1)
p.write_text(text, encoding='utf-8')
print('changed %s: the room names now have the new icons (3 lines)' % PATH)
