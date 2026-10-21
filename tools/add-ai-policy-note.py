#!/usr/bin/env python3
"""Adds a short pointer at the end of section 1 of the AI policy, to section 2, about the line-drawn scenes, so the two sections do not seem to clash. The promise is not softened. The new test is only put in place if the edit succeeds.

Run it from the project folder, AFTER unzipping starscapes-ai-policy-note-21oct.zip into it:   python3 tools/add-ai-policy-note.py

What it does: it makes one exact edit to src/data/legalPages.js and, only if it succeeds, puts one new test in place.
  src/data/legalPages.js

How it keeps you safe:
  - It checks ALL one files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-ai-policy-note.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-AI-POLICY-NOTE.txt, tools/ai-policy-note-files/ai-policy-scenes-note.test.js.staged) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/data/legalPages.js": [
[
"          \"The following are my own work, from start to finish. I don't use AI image generators or AI writing tools to create them, or to change them:\",\n          \"* every original artwork, and every print sold in the Art Loft, which is printed from my own artwork files\\n* my photographs\\n* my stories, books and other creative writing, including my courses and leadership material\"\n        ]\n",
"          \"The following are my own work, from start to finish. I don't use AI image generators or AI writing tools to create them, or to change them:\",\n          \"* every original artwork, and every print sold in the Art Loft, which is printed from my own artwork files\\n* my photographs\\n* my stories, books and other creative writing, including my courses and leadership material\",\n          \"The line-drawn scenes that frame the shop, such as the Art Loft, are not on this list. Claude helps me draw those, and the next section, \\\"Where I do use AI\\\", says how. The artwork, photographs and writing above are never made that way.\"\n        ]\n"
]
]
}''')
STAGED = {
    'test/ai-policy-scenes-note.test.js': 'tools/ai-policy-note-files/ai-policy-scenes-note.test.js.staged',
}  # copied into place ONLY after the edit above has succeeded (a refusal exits before this)
NEW_FILES = ["INSTALL-AI-POLICY-NOTE.txt", "tools/ai-policy-note-files/ai-policy-scenes-note.test.js.staged"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-ai-policy-note-21oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-ai-policy-note').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
for target, source in STAGED.items():
    t, src = root / target, root / source
    new_text = src.read_text(encoding='utf-8')
    if t.exists() and t.read_text(encoding='utf-8') == new_text:
        print('already done  ' + target)
        continue
    if t.exists():
        pathlib.Path(str(t) + '.before-ai-policy-note').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)
