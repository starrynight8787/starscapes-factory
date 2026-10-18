#!/usr/bin/env python3
"""Changes the browser-tab icon to the shooting star from the banner.

Run it from the project folder, AFTER unzipping starscapes-tab-icon-18oct.zip into it:   python3 tools/add-tab-icon.py

What it does: it makes exact edits to two files that already exist: the page template and the build step that set the icon.
  index.html, scripts/shareHead.mjs

How it keeps you safe:
  - It checks ALL two files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-tab-icon.
  - It is safe to run twice: a file already done is left alone.
  - The new files (public/icons/star.svg, public/icons/star-32.png, public/icons/apple-touch-icon.png) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"index.html": [
[
"    <meta name=\"description\" content=\"A cosy, creative hub for stories, art, ideas and curiosity. Step inside and pick a room: writing, prints, travel, leadership and more.\" />\n    <meta name=\"theme-color\" content=\"#14306A\" />\n    <link rel=\"icon\" type=\"image/png\" href=\"/icons/rooms/factory-floor.png\" />\n    <link rel=\"apple-touch-icon\" href=\"/icons/rooms/factory-floor.png\" />\n  </head>\n  <body>\n",
"    <meta name=\"description\" content=\"A cosy, creative hub for stories, art, ideas and curiosity. Step inside and pick a room: writing, prints, travel, leadership and more.\" />\n    <meta name=\"theme-color\" content=\"#14306A\" />\n    <link rel=\"icon\" type=\"image/svg+xml\" href=\"/icons/star.svg\" />\n    <link rel=\"icon\" type=\"image/png\" sizes=\"32x32\" href=\"/icons/star-32.png\" />\n    <link rel=\"apple-touch-icon\" href=\"/icons/apple-touch-icon.png\" />\n  </head>\n  <body>\n"
]
],
"scripts/shareHead.mjs": [
[
"\nexport const THEME_COLOUR = '#14306A'\nexport const ICON = '/icons/rooms/factory-floor.png'\n\n// meta: { title, description, siteName, url (omit for a page with no address of its own), imageUrl, imageAlt, index }\n",
"\nexport const THEME_COLOUR = '#14306A'\n// The tab icon is the shooting star from the banner (src/components/Logo.jsx), drawn once as star.svg and sized for browsers that need a picture file.\nexport const ICONS = { svg: '/icons/star.svg', png: '/icons/star-32.png', apple: '/icons/apple-touch-icon.png' }\n\n// meta: { title, description, siteName, url (omit for a page with no address of its own), imageUrl, imageAlt, index }\n"
],
[
"    `<meta name=\"description\" content=\"${esc(meta.description)}\" />`,\n    `<meta name=\"theme-color\" content=\"${THEME_COLOUR}\" />`,\n    `<link rel=\"icon\" type=\"image/png\" href=\"${ICON}\" />`,\n    `<link rel=\"apple-touch-icon\" href=\"${ICON}\" />`,\n    ...(closed ? ['<meta name=\"robots\" content=\"noindex, nofollow\" />'] : meta.index === false ? ['<meta name=\"robots\" content=\"noindex\" />'] : []),\n    ...(meta.url ? [`<link rel=\"canonical\" href=\"${esc(meta.url)}\" />`] : []),\n",
"    `<meta name=\"description\" content=\"${esc(meta.description)}\" />`,\n    `<meta name=\"theme-color\" content=\"${THEME_COLOUR}\" />`,\n    `<link rel=\"icon\" type=\"image/svg+xml\" href=\"${ICONS.svg}\" />`,\n    `<link rel=\"icon\" type=\"image/png\" sizes=\"32x32\" href=\"${ICONS.png}\" />`,\n    `<link rel=\"apple-touch-icon\" href=\"${ICONS.apple}\" />`,\n    ...(closed ? ['<meta name=\"robots\" content=\"noindex, nofollow\" />'] : meta.index === false ? ['<meta name=\"robots\" content=\"noindex\" />'] : []),\n    ...(meta.url ? [`<link rel=\"canonical\" href=\"${esc(meta.url)}\" />`] : []),\n"
]
]
}''')
NEW_FILES = ["public/icons/star.svg", "public/icons/star-32.png", "public/icons/apple-touch-icon.png"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/data/siteSettings.js", "src/testers/TestersPage.jsx"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the tester kit first (starscapes-tester-kit-18oct.zip). These files from it are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-tab-icon-18oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-tab-icon').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
