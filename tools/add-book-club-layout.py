#!/usr/bin/env python3
"""Makes Reading now and Up next horizontal bands on the Book Club page, with the suggest box in two columns, and makes the suggest form's fields wrap by the width of their box.

Run it from the project folder, AFTER unzipping starscapes-book-club-layout-20oct.zip into it:   python3 tools/add-book-club-layout.py

What it does: it makes exact edits to two style files that already exist (the Book Club's and the suggest box's) and adds the instructions from the zip (the unzip itself also replaces two test files).
  src/bookclub/bookclub.css, src/suggest/suggest.css

How it keeps you safe:
  - It checks ALL two files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-book-club-layout.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-BOOK-CLUB-LAYOUT.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/bookclub/bookclub.css": [
[
"/* The Book Club page. Stands on its own: nothing here depends on the old index.css rules. */\n.bc section { margin: 32px 0; }\n",
"/* The Book Club page. On a wide screen Reading now and Up next are horizontal bands, not narrow tall boxes: see the grid, and the two-column suggest box rules, in the wide-screen block further down. */\n/* The Book Club page. Stands on its own: nothing here depends on the old index.css rules. */\n.bc section { margin: 32px 0; }\n"
],
[
"  .bc__intro { grid-template-columns: 2fr 1fr; }\n  .bc__welcome { grid-template-columns: 380px 1fr; }\n  .bc__grid { grid-template-columns: 1fr 1fr 392px; grid-template-areas: 'theme theme come' 'read next shelf'; }\n  .bc__theme { grid-area: theme; }\n  .bc__comecard { grid-area: come; }\n  .bc__reading { grid-area: read; }\n  .bc__next { grid-area: next; }\n  .bc__shelfcard { grid-area: shelf; }\n}\n/* on a phone the books lie flat in a pile, so the names stay readable */\n",
"  .bc__intro { grid-template-columns: 2fr 1fr; }\n  .bc__welcome { grid-template-columns: 380px 1fr; }\n  .bc__grid { grid-template-columns: 1fr 1fr 392px; grid-template-areas: 'theme theme come' 'read read shelf' 'next next next'; }\n  .bc__theme { grid-area: theme; }\n  .bc__comecard { grid-area: come; }\n  .bc__reading { grid-area: read; align-self: start; } /* Reading now and Up next are wide horizontal bands beside the Shelf, not narrow tall boxes: an empty one stays short, and the suggest form gets room to sit in a row */\n  .bc__next { grid-area: next; align-self: start; }\n  .bc__shelfcard { grid-area: shelf; align-self: start; }\n  /* Up next is a full-width band: the suggest box inside it sits in two columns, the form and its words on the left and \"Most wanted\" on the right */\n  .bc__next .sg { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: auto auto 1fr auto; column-gap: 32px; align-items: start; margin: 20px 0 0; }\n  .bc__next .sg > * { grid-column: 1; }\n  .bc__next .sg > .sg__list { grid-column: 2; grid-row: 1 / span 3; margin-top: 0; }\n  .bc__next .sg > .sg__note { grid-column: 2; grid-row: 4; margin-top: 12px; }\n}\n/* on a phone the books lie flat in a pile, so the names stay readable */\n"
]
],
"src/suggest/suggest.css": [
[
"}\n.sg__fields {\n  display: grid;\n  grid-template-columns: 1fr 1fr auto;\n  gap: 16px;\n  align-items: end;\n}\n@media (max-width: 760px) {\n  .sg__fields {\n    grid-template-columns: 1fr;\n  }\n}\n.sg__list {\n",
"}\n.sg__fields {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 16px;\n  align-items: end;\n}\n/* The fields sit side by side when the box is wide enough and wrap onto their own lines when it is not: it depends on the width of the BOX, not of the screen, so it never squeezes into slivers. */\n.sg__fields > * {\n  flex: 1 1 240px;\n  min-width: 0;\n}\n.sg__fields > .sg__submit {\n  flex: 0 0 auto;\n}\n.sg__list {\n"
]
]
}''')
NEW_FILES = ["INSTALL-BOOK-CLUB-LAYOUT.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/bookclub/BookClubPage.jsx", "src/suggest/SuggestPanel.jsx"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the earlier packages first (the Book Club and the suggest box ones). These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-book-club-layout-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-book-club-layout').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
