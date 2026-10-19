#!/usr/bin/env python3
"""Builds the entry template and puts it on the Writing in Transit page.

Run it from the project folder, AFTER unzipping starscapes-entries-19oct.zip into it:   python3 tools/add-entry-template.py

What it does: it makes one exact edit to a file that already exists: the room routes, so the new page appears at /explorers-bay/writing-in-transit.
  src/rooms/RoomRoutes.jsx

How it keeps you safe:
  - It checks ALL one files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-entry-template.
  - It is safe to run twice: a file already done is left alone.
  - The new files (src/entries/entryRules.js, src/entries/EntryPage.jsx, src/entries/WritingInTransitPage.jsx, src/entries/entries.css) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/rooms/RoomRoutes.jsx": [
[
"import BookClubPage from '../bookclub/BookClubPage'\nimport LeadershipBlogPage from '../leadership/LeadershipBlogPage'\nimport './roompages.css'\n\n",
"import BookClubPage from '../bookclub/BookClubPage'\nimport LeadershipBlogPage from '../leadership/LeadershipBlogPage'\nimport WritingInTransitPage from '../entries/WritingInTransitPage'\nimport './roompages.css'\n\n"
],
[
"const CUSTOM_AREAS = {\n  'leadership-lounge/blog': LeadershipBlogPage,\n}\n\n",
"const CUSTOM_AREAS = {\n  'leadership-lounge/blog': LeadershipBlogPage,\n  'explorers-bay/writing-in-transit': WritingInTransitPage,\n}\n\n"
]
]
}''')
NEW_FILES = ["src/entries/entryRules.js", "src/entries/EntryPage.jsx", "src/entries/WritingInTransitPage.jsx", "src/entries/entries.css"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/leadership/LeadershipBlogPage.jsx", "src/components/PageBanner.jsx"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the Leadership Blog update (it also holds the banner) first. These files from earlier updates are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-entries-19oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-entry-template').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
