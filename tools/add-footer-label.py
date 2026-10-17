#!/usr/bin/env python3
"""Takes the word Follow off the footer's social links.

Run it from the project folder, AFTER unzipping starscapes-footer-label-17oct.zip into it:   python3 tools/add-footer-label.py

What it does: it removes one line from the footer and one unused style from the stylesheet, so the footer shows YouTube, Instagram and TikTok with no heading word (screen readers still hear the list named).
  src/components/Footer.jsx, src/styles/site.css

How it keeps you safe:
  - It checks ALL two files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-footer-label.
  - It is safe to run twice: a file already done is left alone.
  - The new files (test/footer-nav.test.jsx) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/components/Footer.jsx": [
[
"            {follow.length > 0 && (\n              <nav className=\"sf-footer__follow\" aria-label=\"Follow us\">\n                <span className=\"sf-footer__follow-label\">Follow</span>\n                {follow.map((s) => (\n                  <a\n",
"            {follow.length > 0 && (\n              <nav className=\"sf-footer__follow\" aria-label=\"Follow us\">\n                {follow.map((s) => (\n                  <a\n"
]
],
"src/styles/site.css": [
[
"  margin-top: 4px;\n}\n.sf-footer__follow-label {\n  color: rgba(255, 255, 255, 0.7);\n  font-size: 14px;\n  font-weight: 600;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n}\n.sf-footer__follow a {\n  color: rgba(255, 255, 255, 0.82);\n",
"  margin-top: 4px;\n}\n.sf-footer__follow a {\n  color: rgba(255, 255, 255, 0.82);\n"
]
]
}''')
NEW_FILES = ["test/footer-nav.test.jsx"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-footer-label-17oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    states = ['done' if new in text else 'todo' if text.count(old) == 1 else 'bad' for old, new in pairs]
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
    pathlib.Path(str(p) + '.before-footer-label').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
