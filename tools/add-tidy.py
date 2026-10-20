#!/usr/bin/env python3
"""Puts a real space between a room's name and its line in the Rooms dropdown and the phone list, and corrects a comment. (The package also replaces two test files; the install notes remove the old tests and backup files.)

Run it from the project folder, AFTER unzipping starscapes-tidy-20oct.zip into it:   python3 tools/add-tidy.py

What it does: it makes exact edits to three files that already exist (the Rooms dropdown, the room list and the room addresses file) and adds one new file from the zip (the unzip itself also replaces two test files).
  src/components/Navbar.jsx, src/pages/ChannelDirectory.jsx, src/data/roomImages.js

How it keeps you safe:
  - It checks ALL three files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-tidy.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-TIDY.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/components/Navbar.jsx": [
[
"                        <RoomIcon room={c.slug} size={44} />\n                        <span>\n                          <span className=\"sf-rooms__name\">{c.name}</span>\n                          <span className=\"sf-rooms__tag\">{c.tagline}</span>\n                        </span>\n",
"                        <RoomIcon room={c.slug} size={44} />\n                        <span>\n                          <span className=\"sf-rooms__name\">{c.name}</span>{' '}\n                          <span className=\"sf-rooms__tag\">{c.tagline}</span>\n                        </span>\n"
]
],
"src/pages/ChannelDirectory.jsx": [
[
"              <RoomIcon room={c.slug} size={64} />\n              <span>\n                <span className=\"sf-roomcard__name\">{c.name}</span>\n                <span className=\"sf-roomcard__tag\">{c.tagline}</span>\n              </span>\n",
"              <RoomIcon room={c.slug} size={64} />\n              <span>\n                <span className=\"sf-roomcard__name\">{c.name}</span>{' '}\n                <span className=\"sf-roomcard__tag\">{c.tagline}</span>\n              </span>\n"
]
],
"src/data/roomImages.js": [
[
"export const roomImagesSmall = {}\n\n// The page each room opens. The Art Loft and the Factory Floor have their own scenes; every other room uses the general room page for now.\nconst OWN_PAGE = { 'art-loft': '/art-loft', 'factory-floor': '/factory-floor', 'drafting-desk': '/drafting-desk', 'idea-hatchery': '/idea-hatchery', 'leadership-lounge': '/leadership-lounge', 'explorers-bay': '/explorers-bay', 'knowledge-nook': '/knowledge-nook', 'sarah-jrs-den': '/sarah-jrs-den' }\nexport function roomPath(slug) {\n",
"export const roomImagesSmall = {}\n\n// The page each room opens. Every room has its own page now; the general room page (/channel/<room>) is only the fallback for a room that is not listed here.\nconst OWN_PAGE = { 'art-loft': '/art-loft', 'factory-floor': '/factory-floor', 'drafting-desk': '/drafting-desk', 'idea-hatchery': '/idea-hatchery', 'leadership-lounge': '/leadership-lounge', 'explorers-bay': '/explorers-bay', 'knowledge-nook': '/knowledge-nook', 'sarah-jrs-den': '/sarah-jrs-den' }\nexport function roomPath(slug) {\n"
]
]
}''')
NEW_FILES = ["INSTALL-TIDY.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/invoice/InvoicePage.jsx", "src/membership/changeWindow.js"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the earlier packages first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-tidy-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-tidy').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
