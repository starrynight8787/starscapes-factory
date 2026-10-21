#!/usr/bin/env python3
"""Makes the newsletter sign-up box say that it is free, with no account or pass needed.

Run it from the project folder, AFTER unzipping starscapes-newsletter-free-21oct.zip into it:   python3 tools/add-newsletter-free.py

What it does: it makes one exact edit to the sign-up box and adds two new files from the zip (a test and these notes).
  src/newsletter/NewsletterSignup.jsx

How it keeps you safe:
  - It checks ALL one files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-newsletter-free.
  - It is safe to run twice: a file already done is left alone.
  - The new files (test/newsletter-free.test.jsx, INSTALL-NEWSLETTER-FREE.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/newsletter/NewsletterSignup.jsx": [
[
"      <h2 id=\"nl-signup-title\" className=\"nl-signup__title\">Newsletter</h2>\n      <p className=\"nl-signup__text\">New posts and news from Starscapes Factory, by email.</p>\n      <form className=\"nl-signup__form\" onSubmit={submit} noValidate>\n",
"      <h2 id=\"nl-signup-title\" className=\"nl-signup__title\">Newsletter</h2>\n      <p className=\"nl-signup__text\">Free, with no account or pass needed. New posts and news from Starscapes Factory, by email.</p>\n      <form className=\"nl-signup__form\" onSubmit={submit} noValidate>\n"
]
]
}''')
NEW_FILES = ["test/newsletter-free.test.jsx", "INSTALL-NEWSLETTER-FREE.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-newsletter-free-21oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-newsletter-free').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
