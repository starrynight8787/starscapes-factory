#!/usr/bin/env python3
"""Brings the picture checklist and the post_reads SQL file up to date: the two Idea Hatchery pictures changed on 20 October, and post_reads gets the permission line that lets the website read the Most read counts. (The package also replaces six tests.)

Run it from the project folder, AFTER unzipping starscapes-tests-refresh-20oct.zip into it:   python3 tools/add-tests-refresh.py

What it does: it makes exact edits to two files that already exist (the picture checklist and the post reads SQL file) and adds one new file from the zip (the unzip itself also replaces six tests).
  tools/art-manifest.json, sql/post-reads.sql

How it keeps you safe:
  - It checks ALL two files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-tests-refresh.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-TESTS-REFRESH.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"tools/art-manifest.json": [
[
" \"public/scenes/factory-floor/protractor.svg\": \"c89b40e04d020f0a\",\n \"public/scenes/idea-hatchery/base.svg\": \"97c70c31876fdf31\",\n \"public/scenes/idea-hatchery/geometry.json\": \"1eec2c3fcdf742ca\",\n \"public/scenes/idea-hatchery/item-come-study-with-me-open.svg\": \"0cfddababd9c0762\",\n",
" \"public/scenes/factory-floor/protractor.svg\": \"c89b40e04d020f0a\",\n \"public/scenes/idea-hatchery/base.svg\": \"979e7919610b8383\",\n \"public/scenes/idea-hatchery/geometry.json\": \"22b5c548d2bdff69\",\n \"public/scenes/idea-hatchery/item-come-study-with-me-open.svg\": \"0cfddababd9c0762\",\n"
]
],
"sql/post-reads.sql": [
[
"create policy \"Anyone can see read counts\" on public.post_reads for select using (true);\n\n",
"create policy \"Anyone can see read counts\" on public.post_reads for select using (true);\n-- The rule above says WHO may see a row; this line gives the website's visitors (anon) and signed-in people permission to read the table at all. Without it the \"Most read\" counts cannot load\n-- (a table made in the SQL editor is not readable by the website until this is granted). Added 20 October 2026; run it on a project that already has the table:\n--   grant select on public.post_reads to anon, authenticated;\ngrant select on public.post_reads to anon, authenticated;\n\n"
]
]
}''')
NEW_FILES = ["INSTALL-TESTS-REFRESH.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-tests-refresh-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-tests-refresh').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
