#!/usr/bin/env python3
"""Puts the new room icons into the home page's floor plan, and into the room cards that phones see.

Run it from the project folder:   python3 tools/add-home-icons.py

It changes three places in src/pages/ChannelDirectory.jsx:
  1. brings in the new icon piece and the list of icons (replacing the line that brought in the old room pictures),
  2. draws each room's new icon in the floor plan (keeping the old picture as a backup if a room ever has no icon),
  3. draws the new icon on each room card that phones and small screens see.
It is safe to run twice. If the file does not look the way it expects, it says so and changes NOTHING.
"""
import pathlib
import sys

PATH = 'src/pages/ChannelDirectory.jsx'
CHANGES = [
    ("import RoomTile from '../components/RoomTile'\n",
     "import RoomIcon from '../components/RoomIcon'\nimport { ROOM_ICONS } from '../components/roomIcons'\n"),
    ('href={roomImages[c.slug]}', 'href={ROOM_ICONS[c.slug] || roomImages[c.slug]}'),
    ('<RoomTile slug={c.slug} size={64} />', '<RoomIcon room={c.slug} size={64} />'),
]

p = pathlib.Path(PATH)
if not p.exists():
    print('NOT FOUND  %s (run this from the project folder)' % PATH)
    sys.exit(1)
for needed in ('src/components/RoomIcon.jsx', 'src/components/roomIcons.js'):
    if not pathlib.Path(needed).exists():
        print('WARNING: %s is missing. Unzip starscapes-room-icons.zip first. Nothing changed.' % needed)
        sys.exit(1)
text = p.read_text(encoding='utf-8')
if 'ROOM_ICONS' in text and 'RoomTile' not in text:
    print('already done  %s' % PATH)
    sys.exit(0)
for old, new in CHANGES:
    if text.count(old) != 1:
        print('NOT CHANGED  %s: expected to find the text below once, found it %d times.\n    %s' % (PATH, text.count(old), old.strip()))
        sys.exit(1)
for old, new in CHANGES:
    text = text.replace(old, new, 1)
p.write_text(text, encoding='utf-8')
print('changed %s: the new room icons are in the floor plan and the phone cards (3 small edits)' % PATH)
